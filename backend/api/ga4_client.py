"""
GA4 Data API 串接：查詢 KOC 優惠碼帶來的電商漏斗數據。

憑證與資源 ID 都從環境變數讀取，不放進程式碼／git：
    GA4_CREDENTIALS_JSON  服務帳號金鑰的整份 JSON 內容（字串）
    GA4_PROPERTY_ID       GA4 資源 ID（純數字）
"""

import json
import os
from datetime import timedelta

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Filter,
    FilterExpression,
    FilterExpressionList,
    Metric,
    RunReportRequest,
)
from google.oauth2 import service_account


class GA4NotConfigured(Exception):
    pass


def friendly_error(error, context):
    """
    把 GA4 API 的錯誤轉成廠商看得懂的訊息，原始錯誤印到 server log 方便除錯。
    最常見的是 GA4 後台還沒註冊對應的自訂維度（例如 link_ref），
    這是平台端的設定問題，廠商自己無法處理。
    """
    print(f"GA4 {context}讀取失敗: {error}")
    if "is not a valid dimension" in str(error):
        return f"GA4 尚未完成{context}追蹤設定，請聯絡平台管理員"
    return f"{context}數據暫時無法讀取，請稍後再試"


def _get_client():
    raw = os.getenv("GA4_CREDENTIALS_JSON", "")
    if not raw or not os.getenv("GA4_PROPERTY_ID"):
        print("GA4 未設定：缺少環境變數 GA4_CREDENTIALS_JSON 或 GA4_PROPERTY_ID")
        raise GA4NotConfigured("GA4 尚未完成設定，請聯絡平台管理員")

    info = json.loads(raw)
    credentials = service_account.Credentials.from_service_account_info(
        info,
        scopes=["https://www.googleapis.com/auth/analytics.readonly"],
    )
    return BetaAnalyticsDataClient(credentials=credentials)


def _event_count_by_code(client, property_id, event_name, dimension_name, codes, start_date, end_date):
    """
    回傳 {優惠碼: {"events": 事件次數, "users": 不重複人數}}。
    dimension_name 是 GA4 自訂維度名稱，格式為 customEvent:<參數名稱>。
    """
    if not codes:
        return {}

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name=dimension_name)],
        metrics=[Metric(name="eventCount"), Metric(name="totalUsers")],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
        dimension_filter=FilterExpression(
            and_group=FilterExpressionList(
                expressions=[
                    FilterExpression(
                        filter=Filter(
                            field_name="eventName",
                            string_filter=Filter.StringFilter(
                                value=event_name,
                                match_type=Filter.StringFilter.MatchType.EXACT,
                            ),
                        )
                    ),
                    FilterExpression(
                        filter=Filter(
                            field_name=dimension_name,
                            in_list_filter=Filter.InListFilter(values=list(codes)),
                        )
                    ),
                ]
            )
        ),
    )

    response = client.run_report(request)
    result = {}
    for row in response.rows:
        code = row.dimension_values[0].value
        result[code] = {
            "events": int(row.metric_values[0].value),
            "users": int(row.metric_values[1].value),
        }
    return result


def _purchase_stats_by_code(client, property_id, dimension_name, codes, start_date, end_date):
    """回傳 {優惠碼: {"purchases": 購買次數, "users": 不重複人數, "revenue": 營收}}。"""
    if not codes:
        return {}

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name=dimension_name)],
        metrics=[
            Metric(name="eventCount"),
            Metric(name="totalUsers"),
            Metric(name="purchaseRevenue"),
        ],
        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
        dimension_filter=FilterExpression(
            and_group=FilterExpressionList(
                expressions=[
                    FilterExpression(
                        filter=Filter(
                            field_name="eventName",
                            string_filter=Filter.StringFilter(
                                value="purchase",
                                match_type=Filter.StringFilter.MatchType.EXACT,
                            ),
                        )
                    ),
                    FilterExpression(
                        filter=Filter(
                            field_name=dimension_name,
                            in_list_filter=Filter.InListFilter(values=list(codes)),
                        )
                    ),
                ]
            )
        ),
    )

    response = client.run_report(request)
    result = {}
    for row in response.rows:
        code = row.dimension_values[0].value
        result[code] = {
            "purchases": int(row.metric_values[0].value),
            "users": int(row.metric_values[1].value),
            "revenue": float(row.metric_values[2].value),
        }
    return result


def _build_funnel(codes, first_step, checkouts, purchases):
    """
    把三個步驟的查詢結果組成每碼明細與總計。first_step 是漏斗第一步。

    開始結帳與完成購買同時保留「人數」與「次數」：同一個人付款失敗後重新結帳
    會建立新訂單、多送一次 begin_checkout，所以轉換率用人數計算才不會被重試灌低。
    總計是各優惠碼人數相加，同一個人用了兩組優惠碼會被算兩次。
    """
    by_code = []
    totals = {
        "first_step": 0,
        "begin_checkout_users": 0,
        "begin_checkout_events": 0,
        "purchase_users": 0,
        "purchases": 0,
        "revenue": 0.0,
    }

    for code in codes:
        checkout = checkouts.get(code, {})
        purchase = purchases.get(code, {})
        row = {
            "first_step": first_step.get(code, {}).get("events", 0),
            "begin_checkout_users": checkout.get("users", 0),
            "begin_checkout_events": checkout.get("events", 0),
            "purchase_users": purchase.get("users", 0),
            "purchases": purchase.get("purchases", 0),
            "revenue": purchase.get("revenue", 0.0),
        }
        for key, value in row.items():
            totals[key] += value
        by_code.append({"code": code, **row})

    # 結帳轉換率 = 完成購買人數 ÷ 開始結帳人數；結帳未完成率 = 1 − 轉換率
    checkout_users = totals["begin_checkout_users"]
    checkout_cvr = (
        min(totals["purchase_users"] / checkout_users, 1.0) if checkout_users else None
    )
    abandonment_rate = (1 - checkout_cvr) if checkout_cvr is not None else None

    return {
        "summary": {
            **totals,
            "checkout_cvr": checkout_cvr,
            "abandonment_rate": abandonment_rate,
        },
        "by_code": by_code,
    }


def _rename_first_step(funnel, key):
    funnel["summary"][key] = funnel["summary"].pop("first_step")
    for row in funnel["by_code"]:
        row[key] = row.pop("first_step")
    return funnel


def get_coupon_funnel(codes, start_date="30daysAgo", end_date="today"):
    """
    查詢一組優惠碼的兩條漏斗：
    - coupon：手動套用優惠碼（select_promotion → begin_checkout → purchase，依 coupon 參數）
    - link：從推廣連結進站（koc_link_landing → begin_checkout → purchase，依 link_ref 參數）
    回傳：
    {
      "summary": {...}, "by_code": [...],          # 優惠碼漏斗（沿用原本欄位）
      "link": {"summary": {...}, "by_code": [...]} 或 None,
      "link_error": 連結漏斗查詢失敗的原因（例如 GA4 尚未註冊 link_ref 自訂維度）
    }
    """
    client = _get_client()
    property_id = os.getenv("GA4_PROPERTY_ID")

    uses = _event_count_by_code(
        client, property_id, "select_promotion", "customEvent:promotion_id",
        codes, start_date, end_date,
    )
    checkouts = _event_count_by_code(
        client, property_id, "begin_checkout", "customEvent:coupon",
        codes, start_date, end_date,
    )
    purchases = _purchase_stats_by_code(
        client, property_id, "customEvent:coupon", codes, start_date, end_date,
    )
    funnel = _rename_first_step(
        _build_funnel(codes, uses, checkouts, purchases), "promotion_uses"
    )

    # 連結漏斗獨立查詢：link_ref 是後來才加的自訂維度，GA4 後台還沒註冊時
    # 查詢會報錯，這種情況只讓連結區塊顯示錯誤，不影響原本的優惠碼漏斗。
    try:
        landings = _event_count_by_code(
            client, property_id, "koc_link_landing", "customEvent:promotion_id",
            codes, start_date, end_date,
        )
        link_checkouts = _event_count_by_code(
            client, property_id, "begin_checkout", "customEvent:link_ref",
            codes, start_date, end_date,
        )
        link_purchases = _purchase_stats_by_code(
            client, property_id, "customEvent:link_ref", codes, start_date, end_date,
        )
        funnel["link"] = _rename_first_step(
            _build_funnel(codes, landings, link_checkouts, link_purchases), "landings"
        )
        funnel["link_error"] = ""
    except Exception as error:
        funnel["link"] = None
        funnel["link_error"] = friendly_error(error, "推廣連結")

    return funnel


def get_site_traffic(start_date, end_date):
    """
    全站流量（平台總覽的趨勢圖用）。start_date / end_date 是 datetime.date。
    回傳：
    {
      "daily": [{"date": "YYYY-MM-DD", "page_views": 瀏覽量, "visitors": 訪客數}, ...],
      "totals": {"page_views": 期間總瀏覽量, "visitors": 期間不重複訪客數}
    }
    GA4 不會回傳沒有資料的日期，這裡補 0，讓折線圖的日期是連續的。
    """
    client = _get_client()
    property_id = os.getenv("GA4_PROPERTY_ID")
    date_range = DateRange(
        start_date=start_date.isoformat(), end_date=end_date.isoformat()
    )
    metrics = [Metric(name="screenPageViews"), Metric(name="activeUsers")]

    daily_response = client.run_report(RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="date")],
        metrics=metrics,
        date_ranges=[date_range],
    ))
    by_date = {}
    for row in daily_response.rows:
        raw = row.dimension_values[0].value  # GA4 的 date 維度格式是 YYYYMMDD
        by_date[f"{raw[:4]}-{raw[4:6]}-{raw[6:]}"] = (
            int(row.metric_values[0].value),
            int(row.metric_values[1].value),
        )

    daily = []
    day = start_date
    while day <= end_date:
        key = day.isoformat()
        page_views, visitors = by_date.get(key, (0, 0))
        daily.append({"date": key, "page_views": page_views, "visitors": visitors})
        day += timedelta(days=1)

    # 期間訪客數要另外查：每日訪客相加會把連續幾天都來的人重複計算
    total_response = client.run_report(RunReportRequest(
        property=f"properties/{property_id}",
        metrics=metrics,
        date_ranges=[date_range],
    ))
    total_row = total_response.rows[0] if total_response.rows else None
    totals = {
        "page_views": int(total_row.metric_values[0].value) if total_row else 0,
        "visitors": int(total_row.metric_values[1].value) if total_row else 0,
    }

    return {"daily": daily, "totals": totals}
