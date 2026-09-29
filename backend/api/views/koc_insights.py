# api/views/koc_insights.py
#
# KOC 個人帶貨洞察：
#   1. koc_top_products        個人熱銷爆款榜 + 購買力最高的商品分類
#   2. koc_recommended_products 智慧選品推薦（相似粉絲群 KOC 近期推什麼賺最多）
#
# 歸屬規則：訂單的 Order.promotion_code == CouponNew.promotion_code，
# 再經 CouponNew.kocmission -> KOCMissionNew.koc 找到 KOC；只算該任務活動
# （CampaignProduct）裡的商品，同一張訂單裡順便買的其他商品不算這個 KOC 帶的。
#
# 有效訂單：payment_status 為 paid/completed、未取消、沒有退款完成的退貨單；
# 分潤一律讀 Earnings 且排除 status='cancelled'（退款收回的分潤）。
#
# 獨立成一個檔案而不是塞進 koc.py，減少跟隊友改 koc.py 時的合併衝突。

import math
from collections import defaultdict
from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone
from rest_framework import status as http_status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from api.models import (
    KOC,
    Order,
    OrderItem,
    CouponNew,
    CampaignProduct,
    Product,
    Vendor,
    Application,
    Earnings,
)
from .constants import STAGE_CODE_MAP

PAID_STATUSES = ["paid", "completed"]
TOP_PRODUCTS_LIMIT = 10
RECOMMEND_LIMIT = 6
RECENT_DAYS = 30                 # 推薦只看相似 KOC 近 30 天的分潤
PROFILE_DAYS = 180               # 用近 180 天的帶貨紀錄描述每位 KOC 的粉絲偏好
SIMILAR_KOC_LIMIT = 10
SIMILARITY_THRESHOLD = 0.3       # 低於這個相似度就不算「相似粉絲群」
UNCATEGORIZED = "other"


def _get_koc_or_error(user_id):
    if not user_id:
        return None, Response(
            {"success": False, "err": "user_id 為必填"},
            status=http_status.HTTP_400_BAD_REQUEST,
        )
    koc = KOC.objects.filter(user_id=user_id).first()
    if not koc:
        return None, Response(
            {"success": False, "err": "找不到對應的 KOC"},
            status=http_status.HTTP_404_NOT_FOUND,
        )
    return koc, None


def _coupon_context(koc_ids=None):
    """
    回傳 {promotion_code: (koc_id, kocmission_id, campaign_id)}。
    koc_ids=None 代表全平台所有 KOC 的優惠碼。
    """
    qs = CouponNew.objects.filter(kocmission__koc__isnull=False)
    if koc_ids is not None:
        qs = qs.filter(kocmission__koc_id__in=koc_ids)
    rows = qs.values_list(
        "promotion_code",
        "kocmission__koc_id",
        "kocmission_id",
        "kocmission__application__campaign_id",
    )
    return {code: (k, m, c) for code, k, m, c in rows}


def _campaign_product_map(campaign_ids):
    """{campaign_id: set(product_id)}"""
    result = defaultdict(set)
    for cid, pid in CampaignProduct.objects.filter(
        campaign_id__in=campaign_ids
    ).values_list("campaign_id", "product_id"):
        result[cid].add(pid)
    return result


def _attributed_items(code_ctx, since=None):
    """
    撈出由 code_ctx 裡這些優惠碼帶出的有效訂單明細（只含活動商品）。
    回傳 list[dict]：koc_id, kocmission_id, order_id, product_id, product_name,
    category, image_url, quantity, subtotal
    """
    if not code_ctx:
        return []

    orders = (
        Order.objects.filter(
            promotion_code__in=list(code_ctx.keys()),
            payment_status__in=PAID_STATUSES,
        )
        .exclude(order_status="cancelled")
        .exclude(return_requests__status="refunded")
    )
    if since is not None:
        orders = orders.filter(created_at__gte=since)

    order_code = dict(orders.values_list("order_id", "promotion_code"))
    if not order_code:
        return []

    cp_map = _campaign_product_map({ctx[2] for ctx in code_ctx.values()})

    items = OrderItem.objects.filter(order_id__in=list(order_code.keys())).values(
        "order_id",
        "product_id",
        "product__product_name",
        "product__category",
        "product__image_url",
        "quantity",
        "subtotal",
    )

    result = []
    for it in items:
        koc_id, mission_id, campaign_id = code_ctx[order_code[it["order_id"]]]
        if it["product_id"] not in cp_map.get(campaign_id, ()):
            continue
        result.append({
            "koc_id": koc_id,
            "kocmission_id": mission_id,
            "order_id": it["order_id"],
            "product_id": it["product_id"],
            "product_name": it["product__product_name"],
            "category": it["product__category"] or UNCATEGORIZED,
            "image_url": it["product__image_url"],
            "quantity": it["quantity"] or 0,
            "subtotal": float(it["subtotal"] or 0),
        })
    return result


# ==============================================================================
# 1. 個人熱銷爆款榜
# URL: GET /koc/insights/topProducts?user_id=xxx
#
# 轉化率 = 帶出的訂單數 ÷ 短連結點擊數（CouponNew.click_count）。
# 點擊是記在優惠碼（任務）上，不是記在商品上，所以一個商品／分類的點擊數
# = 推過它的那些任務的點擊數加總。點擊數低於 MIN_CLICKS_FOR_RATE 時不算轉化率，
# 避免 1 次點擊 1 張訂單就變成 100%；這時頂部提示改用「平均每檔帶幾單」。
# ==============================================================================
MIN_CLICKS_FOR_RATE = 20
ANALYTICS_STAGES = ["promoting", "completed"]   # 只有這兩個階段的任務頁有成效分析


def _conversion_rate(orders, clicks):
    return round(orders / clicks * 100, 1) if clicks else None


def _product_payloads(product_ids):
    """回傳 {product_id: dict}，key 跟 /consumer/products 一樣，前端可以直接丟給商品頁。"""
    products = list(Product.objects.filter(product_id__in=list(product_ids)))
    vendor_names = dict(
        Vendor.objects.filter(
            vendor_id__in={p.vendor_id for p in products}
        ).values_list("vendor_id", "company_name")
    )
    return {
        p.product_id: {
            "Product_id": p.product_id,
            "product_id": p.product_id,
            "Product_name": p.product_name,
            "price": p.price,
            "discounted_price": p.discounted_price,
            "stock": p.stock,
            "category": p.category,
            "image_url": p.image_url,
            "description": p.description or "",
            "status": p.status,
            "Vendor_id": p.vendor_id,
            "Vendor_name": vendor_names.get(p.vendor_id, ""),
        }
        for p in products
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def koc_top_products(request):
    koc, err = _get_koc_or_error(request.query_params.get("user_id"))
    if err:
        return err

    try:
        code_ctx = _coupon_context([koc.koc_id])
        items = _attributed_items(code_ctx)
        cp_map = _campaign_product_map({ctx[2] for ctx in code_ctx.values()})

        # --- 每個任務的點擊數，以及「商品 -> 最新一筆優惠碼的任務」---
        coupons = list(
            CouponNew.objects.filter(kocmission__koc=koc).values(
                "coupon_id",
                "promotion_code",
                "click_count",
                "kocmission_id",
                "kocmission__stage",
                "kocmission__application__campaign_id",
                "kocmission__application__campaign__name",
                "kocmission__application__campaign__end_date",
                "kocmission__application__campaign__vendor__company_name",
            )
        )
        mission_clicks = defaultdict(int)
        for c in coupons:
            mission_clicks[c["kocmission_id"]] += c["click_count"] or 0

        latest_task_by_product = {}
        for c in sorted(coupons, key=lambda c: c["coupon_id"], reverse=True):
            if c["kocmission__stage"] not in ANALYTICS_STAGES:
                continue
            end_date = c["kocmission__application__campaign__end_date"]
            # key 跟 HomePage 帶進 TaskDetailPage 的 task 物件一致
            task = {
                "id": str(c["kocmission_id"]),
                "stage": STAGE_CODE_MAP[c["kocmission__stage"]],
                "vendor": c["kocmission__application__campaign__vendor__company_name"],
                "productName": c["kocmission__application__campaign__name"],
                "deadline": end_date.strftime("%Y-%m-%d") if end_date else None,
                "promoCode": c["promotion_code"],
                "openAnalytics": True,
            }
            for pid in cp_map.get(c["kocmission__application__campaign_id"], ()):
                latest_task_by_product.setdefault(pid, task)

        # --- 分潤：Earnings 是訂單層級，依該訂單內活動商品的小計比例分攤到各商品 ---
        earnings_by_order = dict(
            Earnings.objects.filter(
                kocmission__koc=koc,
                order_id__in=list({it["order_id"] for it in items}),
            )
            .exclude(status="cancelled")
            .values("order_id")
            .annotate(total=Sum("amount"))
            .values_list("order_id", "total")
        )
        order_subtotal = defaultdict(float)
        for it in items:
            order_subtotal[it["order_id"]] += it["subtotal"]

        products = {}
        for it in items:
            p = products.setdefault(it["product_id"], {
                "product_id": it["product_id"],
                "product_name": it["product_name"],
                "category": it["category"],
                "image_url": it["image_url"],
                "orders": set(),
                "units": 0,
                "sales": 0.0,
                "commission": 0.0,
            })
            p["orders"].add(it["order_id"])
            p["units"] += it["quantity"]
            p["sales"] += it["subtotal"]
            base = order_subtotal[it["order_id"]]
            if base > 0:
                p["commission"] += float(earnings_by_order.get(it["order_id"]) or 0) * it["subtotal"] / base

        # 商品的點擊數 = 推過這個商品的任務點擊數加總
        product_missions = defaultdict(set)
        for _, mission_id, campaign_id in code_ctx.values():
            for pid in cp_map.get(campaign_id, ()):
                product_missions[pid].add(mission_id)

        ranked = sorted(
            products.values(),
            key=lambda p: (len(p["orders"]), p["sales"]),
            reverse=True,
        )[:TOP_PRODUCTS_LIMIT]
        payloads = _product_payloads(p["product_id"] for p in ranked)

        top_products = []
        for i, p in enumerate(ranked):
            clicks = sum(mission_clicks[m] for m in product_missions[p["product_id"]])
            top_products.append({
                "rank": i + 1,
                "product_id": p["product_id"],
                "product_name": p["product_name"],
                "category": p["category"],
                "image_url": p["image_url"],
                "order_count": len(p["orders"]),
                "units_sold": p["units"],
                "sales": round(p["sales"]),
                "commission": round(p["commission"]),
                "click_count": clicks,
                "conversion_rate": _conversion_rate(len(p["orders"]), clicks) if clicks >= MIN_CLICKS_FOR_RATE else None,
                "latest_task": latest_task_by_product.get(p["product_id"]),
                "product": payloads.get(p["product_id"]),
            })

        # --- 分類購買力 ---
        product_category = dict(
            Product.objects.filter(
                product_id__in={pid for s in cp_map.values() for pid in s}
            ).values_list("product_id", "category")
        )
        missions_by_cat = defaultdict(set)
        for _, mission_id, campaign_id in code_ctx.values():
            for pid in cp_map.get(campaign_id, ()):
                missions_by_cat[product_category.get(pid) or UNCATEGORIZED].add(mission_id)

        orders_by_cat = defaultdict(set)
        sales_by_cat = defaultdict(float)
        for it in items:
            orders_by_cat[it["category"]].add(it["order_id"])
            sales_by_cat[it["category"]] += it["subtotal"]

        category_stats = []
        for cat, missions in missions_by_cat.items():
            n_orders = len(orders_by_cat.get(cat, ()))
            clicks = sum(mission_clicks[m] for m in missions)
            category_stats.append({
                "category": cat,
                "mission_count": len(missions),
                "order_count": n_orders,
                "click_count": clicks,
                "conversion_rate": _conversion_rate(n_orders, clicks) if clicks >= MIN_CLICKS_FOR_RATE else None,
                "sales": round(sales_by_cat.get(cat, 0)),
                "avg_orders_per_mission": round(n_orders / len(missions), 1),
            })

        # 頂部提示：有足夠點擊數的分類用轉化率比；都不夠就退回平均每檔帶單數
        with_rate = [c for c in category_stats if c["conversion_rate"] is not None and c["order_count"] > 0]
        if with_rate:
            best = max(with_rate, key=lambda c: (c["conversion_rate"], c["order_count"]))
            best_category = {**best, "metric": "conversion_rate"}
        else:
            with_orders = [c for c in category_stats if c["order_count"] > 0]
            best = max(
                with_orders,
                key=lambda c: (c["avg_orders_per_mission"], c["order_count"]),
                default=None,
            )
            best_category = {**best, "metric": "orders_per_mission"} if best else None

        category_stats.sort(key=lambda c: (c["order_count"], c["sales"]), reverse=True)

        return Response({
            "success": True,
            "err": "",
            "top_products": top_products,
            "category_stats": category_stats,
            "best_category": best_category,
            "min_clicks_for_rate": MIN_CLICKS_FOR_RATE,
        }, status=http_status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"success": False, "err": f"伺服器發生錯誤: {str(e)}"},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

# ==============================================================================
# 2. 智慧選品推薦
# URL: GET /koc/insights/recommendations?user_id=xxx
#
# 做法（純數據，不呼叫 LLM，結果可解釋、可重現）：
#   a. 每位 KOC 用近 PROFILE_DAYS 天「各分類帶貨金額」組成向量，代表粉絲偏好
#   b. 用 cosine similarity 找出跟自己最像的 KOC
#   c. 看這些 KOC 近 RECENT_DAYS 天在各活動的實際分潤（Earnings），算每位 KOC 平均賺多少
#   d. 只推「上架中、進行中、未額滿、有庫存、自己沒申請過也沒買過」的活動商品
#   e. 自己還沒帶貨紀錄（冷啟動）或找不到相似 KOC 時，退回全平台近期平均分潤最高的
# ==============================================================================
def _cosine(a, b):
    dot = sum(v * b.get(k, 0) for k, v in a.items())
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


@api_view(["GET"])
@permission_classes([AllowAny])
def koc_recommended_products(request):
    koc, err = _get_koc_or_error(request.query_params.get("user_id"))
    if err:
        return err

    try:
        now = timezone.now()

        # --- a. 全平台 KOC 的分類偏好向量 ---
        all_ctx = _coupon_context()
        profile_items = _attributed_items(all_ctx, since=now - timedelta(days=PROFILE_DAYS))
        vectors = defaultdict(lambda: defaultdict(float))
        for it in profile_items:
            vectors[it["koc_id"]][it["category"]] += it["subtotal"]

        # --- b. 相似 KOC ---
        my_vec = vectors.get(koc.koc_id, {})
        similar = []
        if my_vec:
            for other_id, vec in vectors.items():
                if other_id == koc.koc_id:
                    continue
                sim = _cosine(my_vec, vec)
                if sim >= SIMILARITY_THRESHOLD:
                    similar.append((other_id, sim))
            similar.sort(key=lambda x: x[1], reverse=True)
            similar = similar[:SIMILAR_KOC_LIMIT]
        similar_ids = [k for k, _ in similar]

        # --- 可推薦的活動商品 ---
        applied_campaign_ids = set(
            Application.objects.filter(koc=koc).values_list("campaign_id", flat=True)
        )
        # KOC 自己買過的商品不再推薦（付款成功且未取消；退款的不算買過，可以再推）
        purchased_product_ids = set(
            OrderItem.objects.filter(
                order__user_id=koc.user_id,
                order__payment_status__in=PAID_STATUSES,
            )
            .exclude(order__order_status="cancelled")
            .values_list("product_id", flat=True)
        )
        running_cps = list(
            CampaignProduct.objects.filter(
                campaign__status="active",
                campaign__start_date__lte=now,
                campaign__end_date__gte=now,
                product__stock__gt=0,
                product__status="active",   # 只推上架中的商品（廠商下架是 inactive）
            )
            .exclude(campaign_id__in=applied_campaign_ids)
            .exclude(product_id__in=purchased_product_ids)
            .select_related("campaign", "product")
        )
        candidate_campaign_ids = {cp.campaign_id for cp in running_cps}

        approved_counts = defaultdict(int)
        for cid in Application.objects.filter(
            campaign_id__in=candidate_campaign_ids, status="approved"
        ).values_list("campaign_id", flat=True):
            approved_counts[cid] += 1

        def _earning_stats(koc_ids):
            """{campaign_id: (平均每位 KOC 分潤, KOC 人數)}，只算候選活動、近 RECENT_DAYS 天"""
            qs = (
                Earnings.objects.filter(
                    created_at__gte=now - timedelta(days=RECENT_DAYS),
                    kocmission__application__campaign_id__in=candidate_campaign_ids,
                    kocmission__koc__isnull=False,
                )
                .exclude(status="cancelled")
                .exclude(kocmission__koc=koc)
            )
            if koc_ids is not None:
                qs = qs.filter(kocmission__koc_id__in=koc_ids)
            per_koc = qs.values(
                "kocmission__application__campaign_id", "kocmission__koc_id"
            ).annotate(total=Sum("amount"))
            agg = defaultdict(list)
            for row in per_koc:
                agg[row["kocmission__application__campaign_id"]].append(row["total"] or 0)
            return {cid: (sum(v) / len(v), len(v)) for cid, v in agg.items()}

        source = "similar"
        stats = _earning_stats(similar_ids) if similar_ids else {}
        if not stats:
            source = "platform"
            stats = _earning_stats(None)

        best_cat = max(my_vec, key=my_vec.get) if my_vec else None

        recommendations = []
        seen_products = set()
        for cp in running_cps:
            if cp.campaign_id not in stats or cp.product_id in seen_products:
                continue
            campaign = cp.campaign
            if (
                campaign.recruit_limit is not None
                and approved_counts[cp.campaign_id] >= campaign.recruit_limit
            ):
                continue
            avg_earning, koc_count = stats[cp.campaign_id]
            if avg_earning <= 0:
                continue
            seen_products.add(cp.product_id)
            product = cp.product
            recommendations.append({
                "product_id": product.product_id,
                "product_name": product.product_name,
                "category": product.category or UNCATEGORIZED,
                "image_url": product.image_url,
                "price": product.price,
                "discounted_price": product.discounted_price,
                "stock": product.stock,
                "campaign_id": str(campaign.campaign_id),
                "campaign_name": campaign.name,
                "campaign_end_date": campaign.end_date,
                "koc_commission_rate": float(cp.koc_commission_rate or 0),
                "avg_earning": round(avg_earning),
                "koc_count": koc_count,
                "match_my_top_category": bool(best_cat) and (product.category or UNCATEGORIZED) == best_cat,
            })

        # 平台熱門模式下，優先顯示自己主力分類的商品
        recommendations.sort(
            key=lambda r: (
                r["match_my_top_category"] if source == "platform" else 0,
                r["avg_earning"],
            ),
            reverse=True,
        )

        recommendations = recommendations[:RECOMMEND_LIMIT]
        payloads = _product_payloads(r["product_id"] for r in recommendations)
        for r in recommendations:
            r["product"] = payloads.get(r["product_id"])

        return Response({
            "success": True,
            "err": "",
            "source": source,              # similar：相似粉絲群 KOC；platform：全平台近期熱門
            "similar_koc_count": len(similar_ids),
            "recent_days": RECENT_DAYS,
            "recommendations": recommendations,
        }, status=http_status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"success": False, "err": f"伺服器發生錯誤: {str(e)}"},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )