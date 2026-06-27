from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny   # 引入「允許任何人」
from api.models import User, Order, OrderItem, Campaigns, CampaignProduct, Product, Application, KOC

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
    user_id = request.query_params.get('user_id')
    
    if not user_id:
        return Response({
            "success": False,
            "err": "缺少必要參數: user_id",
            "campaigns": []
        }, status=400)
        
    try:
        # 2. 直接去查 Order_Item (訂單明細)
        order_items = OrderItem.objects.filter(order__user_id=user_id)
        campaigns_data = []
        
        # 3. 跑迴圈，處理使用者購買的每個品項
        for item in order_items:
            # 💡 修改重點：透過中間表 campaign_product 查詢該商品對應的活動
            # 使用 select_related('campaign') 可以順便把活動內容撈出來，不用再查一次
            campaign_products = CampaignProduct.objects.filter(
                product_id=item.product_id
            ).select_related('campaign')
            
            # 因為一個商品可能會對應到多個代言活動（多對多關係）
            # 所以跑迴圈把該商品所有對應的活動都塞進去
            for cp in campaign_products:
                campaign = cp.campaign  # 取得關聯的 Campaigns 物件
                
                if campaign:
                    campaigns_data.append({
                        "order_id": str(item.order_id),              # 來自 Order_Item 的 Order_id
                        "campaign_id": str(campaign.campaign_id),    # 來自 Campaigns 的 Campaign_id
                        "campaign_name": str(campaign.name),         # 來自 Campaigns 的 Name
                        
                        # 代言申請狀態：先預設給 0 (尚未申請)
                        "apply_status": getattr(item, 'apply_status', 0) 
                    })
                
        # 4. 回傳符合規格書的 JSON 格式
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
    
# 代言申請 
# api/views/koc.py
@api_view(['POST'])
@permission_classes([AllowAny])
def apply_mission(request):
    """
    URL: /koc/application/applyMission
    """
    koc_id = request.data.get('koc_id')
    order_id = request.data.get('order_id')
    campaign_id = request.data.get('campaign_id')
    
    if not all([koc_id, order_id, campaign_id]):
        return Response({
            "success": False,
            "err": "缺少必要參數: koc_id, order_id 或 campaign_id",
            "application_id": "",
            "status": "pending" 
        }, status=400)
        
    try:
        koc_profile = KOC.objects.filter(koc_id=koc_id).first()
        if not koc_profile:
            return Response({
                "success": False,
                "err": "找不到該 KOC 帳號，請確認是否已轉換身份",
                "application_id": "",
                "status": "pending"
            }, status=400)
            
        order_items = OrderItem.objects.filter(order_id=order_id)
        if not order_items.exists():
            return Response({
                "success": False,
                "err": "找不到該筆訂單明細",
                "application_id": "",
                "status": "pending"
            }, status=400)
            
        purchased_products = [item.product for item in order_items]
        
        is_valid_campaign = CampaignProduct.objects.filter(
            campaign_id=campaign_id,
            product__in=purchased_products
        ).exists()
        
        if not is_valid_campaign:
            return Response({
                "success": False,
                "err": "該訂單商品並未參與此代言活動，無法申請",
                "application_id": "",
                "status": "pending"
            }, status=400)
            
        # 確保 filter 後面都加上 _id 精準比對外鍵值
        existing_app = Application.objects.filter(
            koc_id=koc_id,
            order_id=order_id,
            campaign_id=campaign_id
        ).first()
        
        if existing_app:
            return Response({
                "success": True,
                "err": "此訂單已申請過該活動",
                "application_id": str(existing_app.application_id),
                "status": str(existing_app.status)  
            })
            
        # 確保 create 後面也加上 _id
        new_application = Application.objects.create(
            koc_id=koc_id,          
            order_id=order_id,      
            campaign_id=campaign_id,
            status="pending"             
        )
        
        return Response({
            "success": True,
            "err": "",
            "application_id": str(new_application.application_id),
            "status": "pending"           
        })
        
    except Exception as e:
        return Response({
            "success": False,
            "err": f"伺服器發生錯誤: {str(e)}",
            "application_id": "",
            "status": "pending"
        }, status=500)