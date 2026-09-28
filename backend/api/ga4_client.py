"""
GA4 Data API 串接：查詢 KOC 優惠碼帶來的電商漏斗數據。

憑證與資源 ID 都從環境變數讀取，不放進程式碼／git：
    GA4_CREDENTIALS_JSON  服務帳號金鑰的整份 JSON 內容（字串）
    GA4_PROPERTY_ID       GA4 資源 ID（純數字）
"""

import json
import os

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


def _get_client():
    raw = os.getenv("GA4_CREDENTIALS_JSON", "")
    if not raw or not os.getenv("GA4_PROPERTY_ID"):
        raise GA4NotConfigured("尚未設定 GA4_CREDENTIALS_JSON 或 GA4_PROPERTY_ID")

    info = json.loads(raw)
    credentials = service_account.Credentials.from_service_account_info(
        info,
        scopes=["https://www.googleapis.com/auth/analytics.readonly"],
    )
    return BetaAnalyticsDataClient(credentials=credentials)


def _event_count_by_code(client, property_id, event_name, dimension_name, codes, start_date, end_date):
    """
    回傳 {優惠碼: 事件次數}。
    dimension_name 是 GA4 自訂維度名稱，格式為 customEvent:<參數名稱>。
    """
    if not codes:
        return {}

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name=dimension_name)],
        metrics=[Metric(name="eventCount")],
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
        result[code] = int(row.metric_values[0].value)
    return result


def _purchase_stats_by_code(client, property_id, codes, start_date, end_date):
    """回傳 {優惠碼: {"purchases": 購買次數, "revenue": 營收}}。"""
    if not codes:
        return {}

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="customEvent:coupon")],
        metrics=[Metric(name="eventCount"), Metric(name="purchaseRevenue")],
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
                            field_name="customEvent:coupon",
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
            "revenue": float(row.metric_values[1].value),
        }
    return result


def get_coupon_funnel(codes, start_date="30daysAgo", end_date="today"):
    """
    查詢一組優惠碼的漏斗數據，回傳：
    {
      "summary": {...總計與比例...},
      "by_code": [{code, promotion_uses, begin_checkout, purchases, revenue}, ...]
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
    purchases = _purchase_stats_by_code(client, property_id, codes, start_date, end_date)

    by_code = []
    total_uses = total_checkouts = total_purchases = 0
    total_revenue = 0.0

    for code in codes:
        u = uses.get(code, 0)
        c = checkouts.get(code, 0)
        p = purchases.get(code, {}).get("purchases", 0)
        r = purchases.get(code, {}).get("revenue", 0.0)
        by_code.append({
            "code": code,
            "promotion_uses": u,
            "begin_checkout": c,
            "purchases": p,
            "revenue": r,
        })
        total_uses += u
        total_checkouts += c
        total_purchases += p
        total_revenue += r

    # 結帳轉換率 = 購買 ÷ 開始結帳；棄單率 = 1 − 轉換率
    checkout_cvr = (total_purchases / total_checkouts) if total_checkouts else None
    abandonment_rate = (1 - checkout_cvr) if checkout_cvr is not None else None

    return {
        "summary": {
            "promotion_uses": total_uses,
            "begin_checkout": total_checkouts,
            "purchases": total_purchases,
            "revenue": total_revenue,
            "checkout_cvr": checkout_cvr,
            "abandonment_rate": abandonment_rate,
        },
        "by_code": by_code,
    }
