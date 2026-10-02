"""
回傳給前端的錯誤訊息。

非預期的例外（資料庫錯誤、外部 API 斷線等）原文是英文技術訊息，不能直接
回傳給使用者看；完整內容寫進 server log 供除錯，前端只拿到中文訊息。
"""

import logging

logger = logging.getLogger("api")


def internal_error_message(action):
    """
    在 except 區塊裡呼叫：記錄完整 traceback，回傳「<action>，請稍後再試」。
    action 例如「圖片上傳失敗」。
    """
    logger.exception(action)
    return f"{action}，請稍後再試"


def serializer_error_message(errors):
    """
    把 DRF serializer.errors（{"欄位": ["訊息", ...]} 或巢狀結構）攤平成
    「訊息1；訊息2」，不顯示欄位名稱與 list 的方括號。
    """
    messages = []

    def collect(value):
        if isinstance(value, dict):
            for item in value.values():
                collect(item)
        elif isinstance(value, (list, tuple)):
            for item in value:
                collect(item)
        elif value:
            messages.append(str(value))

    collect(errors)
    return "；".join(messages) or "資料格式有誤，請檢查後再送出"
