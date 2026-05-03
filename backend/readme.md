## 後端啟動方式
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

## 之後要加東西，流程就是：寫在 model → makemigrations → migrate → 寫 view → 加到 urls。
改完 model (for 資料庫表) 之後，一定要在 terminal 跑：
python manage.py makemigrations
python manage.py migrate

## 串前端
寫在 views，儲存即可，不用額外在terminal跑其他的