# ECPay 付款流程測試說明

涵蓋範圍：`payments` app（`PaymentTransaction` model、`create_payment`、`ecpay_return`、
`ecpay_order_result`、`get_payment_status`）+ 前端 `PaymentResultPage`。
這次串接完全獨立，**沒有動到 `api` app 的 migration、舊版 `Payment` model，也沒有改 `vendor.py` / `platform.py`**，
既有後台功能不受影響。

## 一、本地啟動 + 對外暴露（測試 ReturnURL 用）

ECPay 的 ReturnURL 是「綠界 Server 主動打你的後端」，`localhost` 收不到，本機開發要用 ngrok 轉發：

```bash
# 1. 啟動 Django
cd backend
python manage.py runserver 8000

# 2. 另開一個終端機，用 ngrok 開公網通道
ngrok http 8000
# 會印出類似 https://xxxx-xx-xx-xx-xx.ngrok-free.app 的網址
```

3. 把 ngrok 網址填進 `.env` 的 `ECPAY_RETURN_URL` 和 `ECPAY_ORDER_RESULT_URL`（兩個都要打後端，
   都要能公開訪問），**注意要接到完整路徑、含結尾斜線**：

```
ECPAY_RETURN_URL=https://xxxx-xx-xx-xx-xx.ngrok-free.app/api/payments/ecpay/notify/
ECPAY_ORDER_RESULT_URL=https://xxxx-xx-xx-xx-xx.ngrok-free.app/api/payments/ecpay/result/
```

4. `FRONTEND_BASE_URL` 填前端實際跑起來的網址（本機開發預設就是 Vite 的 `http://localhost:5173`，
   通常不用改）。後端驗證完 `OrderResultURL` 通知後，會把瀏覽器導去
   `{FRONTEND_BASE_URL}/checkout/result?order_id=...`，這個網址不用也不能透過 ngrok，因為使用者的
   瀏覽器本來就在本機開發環境上，只有「綠界主動打你的後端」那段（ReturnURL / OrderResultURL）才需要 ngrok。
5. 改完 `.env` 要重啟 `runserver`（Django 只在啟動時讀一次環境變數）。
6. ngrok 每次重開網址都會變（免費方案），要記得同步更新 `.env` 並重啟。

## 二、自動化測試（`payments/tests.py`）

已經寫好 20 個測試：

| # | 測試類別 | 涵蓋內容 |
|---|---------|---------|
| 1 | `CreatePaymentEndpointTests` | `POST /api/payments/create/`：成功建單（含 `OrderResultURL` 有正確帶入）、缺參數、查無訂單、空訂單、重複付款擋下 |
| 2 | `EcpayReturnCallbackTests` | `POST /api/payments/ecpay/notify/`（ReturnURL）：成功付款、CheckMacValue 被竄改要擋下來、查無訂單、重複送達的冪等性、GET 請求要回 405、付款失敗的狀態記錄 |
| 3 | `EcpayOrderResultViewTests` | `POST /api/payments/ecpay/result/`（OrderResultURL）：驗證成功導回 `{FRONTEND_BASE_URL}/checkout/result?order_id=...`、CheckMacValue 被竄改/查無訂單時導回不帶 order_id 的通用網址、GET 回 405 |
| 4 | `PaymentStatusEndpointTests` | `GET /api/payments/status/`：缺參數、查無訂單、訂單尚無付款紀錄、pending 狀態、多筆付款紀錄時優先回傳已成功的那筆 |

測試用的是綠界公開測試帳號（`3002607` / stage），跟你本機 `.env` 填的正式測試帳號無關，`tests.py` 裡用
`@override_settings` 自己蓋掉，不依賴 `.env` 內容。

### ⚠️ 已知限制：`python manage.py test` 目前跑不動（跟這次改動無關）

跑標準指令會在建測試 DB 時炸掉：

```
django.db.utils.OperationalError: (1364, "Duplicate column name 'ig_url'")
```

原因：`api/migrations/` 底下有兩支**平行、沒有真正合併**的歷史 migration，都對 `Koc` model 加了
`ig_url`（`0013_koc_ig_url_koc_threads_url.py` 與
`0013_koc_fb_url_koc_ig_url_koc_threads_url_loginhistory.py`），`0016_merge_20260809_1522.py`
這支合併 migration 只合併了 `0014` 那兩支，沒處理這組衝突的 `0013`。

現有的共用開發資料庫因為欄位已經在、`django_migrations` 也早就記錄兩支都「已套用」，所以平常
`migrate` 不會爆；但只要是**從零建一個全新資料庫**（`manage.py test` 的測試 DB、或任何人重新
clone 專案後第一次 `migrate`）就會踩到這個問題。這是既有 `api` app 的 migration 歷史問題，不是
`payments` app 造成的，這次任務範圍不包含修它，建議另外開票給熟悉那段歷史的人處理。

### 目前驗證方式（繞過上面那個問題）

在修好之前，用下面這段繞過 migration、直接照 `models.py` 建一次性測試 DB 來跑：

```bash
cd backend
python3 -c "
import pymysql
pymysql.install_as_MySQLdb()
pymysql.version_info = (2, 2, 1, 'final', 0)

import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from django.apps import apps
settings.MIGRATION_MODULES = {app.label: None for app in apps.get_app_configs()}

from django.test.utils import get_runner
TestRunner = get_runner(settings)
runner = TestRunner(verbosity=2)
failures = runner.run_tests(['payments'])
raise SystemExit(failures)
"
```

跑完應該是 `Ran 20 tests ... OK`。這個測試 DB 是暫時建立、跑完自動銷毀，不會動到共用的開發資料庫。

## 三、手動端到端測試（真的打一次綠界 stage，從前端結帳頁開始）

前置：`.env` 的 `ECPAY_MERCHANT_ID` / `ECPAY_HASH_KEY` / `ECPAY_HASH_IV` 已填好綠界測試帳號、
`ECPAY_RETURN_URL`、`ECPAY_ORDER_RESULT_URL` 都指到目前的 ngrok 網址，`runserver` 已重啟，
前端 `npm run dev` 也開著。

1. 登入會員帳號，加商品到購物車，進到 `/checkout`，付款方式選「信用卡」，填完配送資訊，按「確認並支付」。
2. 前端會先呼叫 `POST /api/consumer/order/create` 建立訂單，再呼叫 `POST /api/payments/create/`
   拿到 `{action, method, fields}`，動態建立隱藏表單並 `submit()`，瀏覽器整頁跳轉到綠界的信用卡付款頁。
3. **用測試信用卡付款**：卡號 `4311-9522-2222-2222`，任意未來效期，安全碼 `222`，3D 驗證碼 `1234`。
4. 付款完成後綠界會依序（順序不保證）打：
   - **ReturnURL**（Server-to-Server）：看 ngrok 的 Web Inspector（預設 `http://127.0.0.1:4040`）
     確認有一筆 `POST /api/payments/ecpay/notify/`，回應 `200` + `1|OK`。
   - **OrderResultURL**（瀏覽器導向）：瀏覽器應該離開綠界頁面，被導回
     `http://localhost:5173/checkout/result?order_id=<你的訂單 id>`。
5. 確認前端結果頁行為：
   - 頁面先顯示「確認付款結果中」（輪詢 `GET /api/payments/status/`），幾秒內應該變成「付款成功！」。
   - 回到購物車頁確認剛剛結帳的商品已經被移除（`PaymentResultPage` 在確認 `status=paid` 後才會清購物車，
     且只清這筆訂單買過的商品，不是清空整個購物車）。
   - 到 DB 查這筆 `PaymentTransaction`：`status` 應該是 `paid`，`ecpay_trade_no` 有值，
     `raw_response` 有完整的綠界回傳內容。
6. 想測「付款失敗」的路徑，可以在綠界付款頁故意輸入錯誤的信用卡資訊或使用會失敗的測試卡
   （見 ECPay 官方測試帳號文件），確認前端結果頁顯示「付款失敗」、購物車商品沒有被清空。
7. 想測「CheckMacValue 被竄改／查無訂單」這類異常路徑，可以直接用 `curl` 手動 POST 一份竄改過的
   payload 去打 `/api/payments/ecpay/result/`，確認會被導到不帶 `order_id` 的
   `http://localhost:5173/checkout/result`（前端會顯示「網址缺少訂單編號」）。

## 四、回歸確認

這次改動完全侷限在 `payments` app + `config/urls.py`、`config/settings.py` 新增設定，沒有動：
- `api/models.py`、`api/migrations/`
- `api/views/vendor.py`、`api/views/platform.py`
- 舊版 `Payment` model

`python manage.py check` 通過，`vendor.py` / `platform.py` 現有的查詢邏輯完全沒被觸碰，理論上不會有回歸；
但因為 `manage.py test` 目前整個專案都跑不動（上述既有問題），沒辦法用自動化測試證明「其他 app 沒被影響」，
只能用「diff 範圍沒碰到那些檔案」來保證。
