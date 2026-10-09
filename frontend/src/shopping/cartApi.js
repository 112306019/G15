import { API_BASE_URL } from '../config';

// 把商品加入目前登入使用者的購物車（購物車不存在時後端會建立）。
// 成功回傳 true；後端拒絕回傳 false；網路錯誤會丟出例外，由呼叫端顯示提示。
export async function addProductToCart(productId, quantity = 1) {
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const cartRes = await fetch(`${API_BASE_URL}/api/consumer/cart/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ User_id: userId }),
  });
  const cartData = await cartRes.json();

  const addRes = await fetch(`${API_BASE_URL}/api/consumer/cart/item/add`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      Cart_id: cartData.Cart_id,
      Product_id: productId,
      Quantity: quantity,
    }),
  });
  return addRes.ok;
}
