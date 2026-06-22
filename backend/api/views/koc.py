from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny   # 引入「允許任何人」
# ⚠️ 請確保有引入這三張 Model (名字請對照你們的 models.py)
# from api.models import Order, OrderItem, Campaigns
from api.models import User, Order, OrderItem, Campaigns

# 修改KOC資料 
@api_view(['POST'])
@permission_classes([AllowAny])  # 引入「允許任何人」，登入驗證完成後刪除
def update_koc_profile(request):
    # 1. 取得前端傳過來的參數
    user_id = request.data.get('user_id')
    user_name = request.data.get('user_name')
    phone = request.data.get('phone')
    email = request.data.get('email')
    bank_account = request.data.get('bank_account')
    bank_number = request.data.get('bank_number')
    address = request.data.get('address')

    if not user_id:
        return Response({"success": False, "err": "缺少必要的 user_id 參數", "user_id": None}, status=400)

    try:
        # 2. 首先，去 User 表找到這個使用者，並更新基礎資料
        user_instance = User.objects.get(user_id=user_id)
        user_instance.name = user_name
        user_instance.phone = phone
        user_instance.email = email
        user_instance.save() # 存入 User 表

        # 3. 接著，透過一對一關聯找到該 User 的 KOC 擴充表資料
        # 如果該 User 還沒有 KOC 擴充資料，就幫他自動建立一個
        koc_instance, created = KOC.objects.get_or_create(
            user=user_instance,
            defaults={'koc_id': f"koc_{user_id}"} # 預設一個 koc_id
        )
        
        # 4. 更新 KOC 表的專屬欄位
        koc_instance.bank_account = bank_account
        koc_instance.bank_number = bank_number
        koc_instance.address = address
        koc_instance.save() # 存入 KOC 表

        # 5. 完全成功，回傳符合規格書的 Response
        return Response({
            "success": True,
            "err": "",
            "user_id": user_id
        }, status=200)

    except User.DoesNotExist:
        return Response({
            "success": False,
            "err": "找不到該 user_id 的使用者，請先確保使用者已存在",
            "user_id": user_id
        }, status=404)
        
    except Exception as e:
        return Response({
            "success": False,
            "err": f"系統錯誤: {str(e)}",
            "user_id": user_id
        }, status=500)
    
# 獲取可申請代言列表    
@api_view(['GET'])
@permission_classes([AllowAny])
def get_available_campaign_list(request):
    # 1. 從網址後面取得 User_id (例如: ?User_id=test_koc_001)
    user_id = request.query_params.get('User_id')
    
    if not user_id:
        return Response({
            "success": False,
            "err": "缺少必要參數: User_id",
            "campaigns": []
        }, status=400)
        
    try:
        # 2. 終極連連看：我們直接去查 Order_Item (訂單明細)
        # 條件是：這筆明細所屬的訂單 (Order)，它的 User_id 必須等於前端傳過來的 user_id
        # Django ORM 語法：order__User_id (透過外鍵連到 Order 表的 User_id)
        order_items = OrderItem.objects.filter(order__User_id=user_id)
        
        campaigns_data = []
        
        # 3. 跑迴圈，把買過的每個品項對應的活動撈出來
        for item in order_items:
            # 利用明細裡的 Product_id，去 Campaigns 表撈出對應的活動
            # 根據截圖，Campaigns 表的欄位叫 product_id
            campaign = Campaigns.objects.filter(product_id=item.Product_id).first()
            
            # 如果這個商品剛好有對應的代言活動，我們才放進列表
            if campaign:
                campaigns_data.append({
                    "order_id": str(item.Order_id),              # 來自 Order_Item 的 Order_id
                    "campaign_id": str(campaign.Campaign_id),    # 來自 Campaigns 的 Campaign_id
                    "campaign_name": str(campaign.Name),         # 來自 Campaigns 的 Name
                    
                    # 💡 代言申請狀態：如果目前沒開這欄位，先預設給 0 (尚未申請)
                    # 未來如果有獨立的申請表，可以再透過 order_id 和 campaign_id 去查狀態
                    "apply_status": getattr(item, 'apply_status', 0) 
                })
                
        # 4. 回傳符合規格書的完美 JSON 格式
        return Response({
            "success": True,
            "err": "",
            "campaigns": campaigns_data
        })
        
    except Exception as e:
        return Response({
            "success": False,
            "err": f"伺服器發生錯誤: {str(e)}",
            "campaigns": []
        }, status=500)