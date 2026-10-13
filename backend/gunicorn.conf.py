# gunicorn 啟動時會自動讀取工作目錄下的這個檔案（Render 的啟動指令不用改）。
#
# 預設是 1 個 sync worker：一次只能處理一個請求，只要有一支比較慢的 API，
# 其他所有請求（包含聊天室每幾秒一次的輪詢）都要排隊等它。
# 改用執行緒後可以同時處理多個請求；大部分時間都在等遠端資料庫回應，
# 用執行緒就夠，記憶體也比開多個 worker 省（Render 免費方案只有 512MB）。
import os

worker_class = "gthread"
workers = int(os.getenv("WEB_CONCURRENCY", "1"))
# 每個執行緒會保留一條資料庫連線（settings 的 CONN_MAX_AGE），不要開太多
threads = int(os.getenv("GUNICORN_THREADS", "4"))
timeout = 60
