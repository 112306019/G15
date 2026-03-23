// ─────────────────────────────────────────────────────────────────────────────
// mock.js  ·  所有假資料集中管理
//
// 資料關聯：
//   kocApplications.kocId      → kocs.id
//   kocApplications.campaignId → campaigns.id
//   kocApplications.productId  → products.id
//   orders.kocId               → kocs.id
//   orders.appId               → kocApplications.id
//   chatConversations[appId]   → kocApplications.id
// ─────────────────────────────────────────────────────────────────────────────


// ─── 活動 ─────────────────────────────────────────────────────────────────────
export const campaigns = [
  {
    id: 'c1', name: '夏季保養活動', status: 'active',
    budget: 50000, spent: 32000, discount: 15,
    kocCount: 12, orders: 156, gmv: 187200, conversion: 4.2,
    startDate: '2026-01-15', endDate: '2026-04-15',
    description: '主打夏季保濕防曬商品，KOC 以優惠碼推廣。',
  },
  {
    id: 'c2', name: '防曬新品上市', status: 'active',
    budget: 30000, spent: 18500, discount: 20,
    kocCount: 8, orders: 89, gmv: 78320, conversion: 3.8,
    startDate: '2026-02-01', endDate: '2026-05-01',
    description: '全新 SPF50+ 防曬精華上市推廣活動。',
  },
  {
    id: 'c3', name: '秋冬保濕計劃', status: 'draft',
    budget: 40000, spent: 0, discount: 12,
    kocCount: 0, orders: 0, gmv: 0, conversion: 0,
    startDate: '2026-09-01', endDate: '2026-12-01',
    description: '秋冬換季保濕系列商品推廣。',
  },
  {
    id: 'c4', name: '母親節限定', status: 'active',
    budget: 25000, spent: 8200, discount: 10,
    kocCount: 6, orders: 44, gmv: 56320, conversion: 5.1,
    startDate: '2026-03-01', endDate: '2026-05-15',
    description: '母親節限定禮盒專屬活動。',
  },
]


// ─── 商品 ─────────────────────────────────────────────────────────────────────
export const products = [
  {
    id: 'p1', name: '夏季保養旗艦組 Premium', sku: 'SKU-SUM-001',
    category: '保養組合', status: 'listed', thumbnail: '💆',
    price: 1680, originalPrice: 2100, stock: 243, sold: 312,
    kocDiscount: 15, campaigns: ['c1'],
    description: '完整夏季保養五件組。', tags: ['保養', '夏季'], createdAt: '2025-12-01',
  },
  {
    id: 'p2', name: '夏季保養旗艦組 Basic', sku: 'SKU-SUM-002',
    category: '保養組合', status: 'listed', thumbnail: '🧴',
    price: 980, originalPrice: 1200, stock: 118, sold: 156,
    kocDiscount: 15, campaigns: ['c1'],
    description: '入門夏季保養三件組。', tags: ['保養', '入門'], createdAt: '2025-12-01',
  },
  {
    id: 'p3', name: '防曬精華 SPF50+', sku: 'SKU-SUN-001',
    category: '防曬', status: 'listed', thumbnail: '☀️',
    price: 880, originalPrice: 1080, stock: 67, sold: 204,
    kocDiscount: 20, campaigns: ['c1', 'c2'],
    description: 'PA++++ 高效防曬精華。', tags: ['防曬'], createdAt: '2025-11-01',
  },
  {
    id: 'p4', name: '母親節限定禮盒', sku: 'SKU-MTD-001',
    category: '禮盒', status: 'listed', thumbnail: '🎁',
    price: 1280, originalPrice: 1580, stock: 88, sold: 44,
    kocDiscount: 10, campaigns: ['c4'],
    description: '母親節限定精裝禮盒。', tags: ['禮盒', '母親節'], createdAt: '2026-02-15',
  },
  {
    id: 'p5', name: '深層保濕精華液', sku: 'SKU-HYD-001',
    category: '精華液', status: 'draft', thumbnail: '💧',
    price: 1200, originalPrice: 1500, stock: 0, sold: 0,
    kocDiscount: 12, campaigns: [],
    description: '次世代玻尿酸複合精華。', tags: ['精華', '保濕'], createdAt: '2026-03-01',
  },
  {
    id: 'p6', name: '控油毛孔細緻化妝水', sku: 'SKU-TON-001',
    category: '化妝水', status: 'unlisted', thumbnail: '🫙',
    price: 680, originalPrice: 850, stock: 200, sold: 89,
    kocDiscount: 10, campaigns: [],
    description: '水楊酸 2% 控油化妝水。', tags: ['化妝水', '控油'], createdAt: '2025-10-01',
  },
]

export const productCategories = ['保養組合', '防曬', '禮盒', '精華液', '化妝水', '乳液', '潔顏', '面膜']


// ─── KOC ──────────────────────────────────────────────────────────────────────
// 注意：優惠碼與對應商品已移至 kocApplications，這裡只存 KOC 基本資料
export const kocs = [
  { id: 'k1', name: '林小美', handle: '@beauty_meilin',  platform: 'Instagram', followers: 45200,  posts: 8,  gmv: 52000, status: 'active',   joinDate: '2026-01-20' },
  { id: 'k2', name: '陳大衛', handle: '@david_skincare', platform: 'TikTok',    followers: 128000, posts: 12, gmv: 89300, status: 'active',   joinDate: '2026-01-18' },
  { id: 'k3', name: '王雅婷', handle: '@yatyng_beauty',  platform: 'YouTube',   followers: 32000,  posts: 5,  gmv: 28400, status: 'active',   joinDate: '2026-02-05' },
  { id: 'k4', name: '張怡君', handle: '@yijun_glow',     platform: 'Instagram', followers: 67800,  posts: 9,  gmv: 61200, status: 'active',   joinDate: '2026-01-22' },
  { id: 'k5', name: '李雨晴', handle: '@yuching_care',   platform: 'TikTok',    followers: 89400,  posts: 15, gmv: 74800, status: 'inactive', joinDate: '2026-03-01' },
  { id: 'k6', name: '吳品瑄', handle: '@pinxuan_skin',   platform: 'Instagram', followers: 23100,  posts: 4,  gmv: 19600, status: 'active',   joinDate: '2026-02-10' },
  { id: 'k7', name: '黃俊彥', handle: '@chunyen_life',   platform: 'YouTube',   followers: 54300,  posts: 7,  gmv: 43100, status: 'active',   joinDate: '2026-03-05' },
]


// ─── KOC 任務申請 ─────────────────────────────────────────────────────────────
// qualificationStatus: 'pending_qualification' | 'approved' | 'rejected'
// contentStatus:       null | 'pending_content' | 'submitted' | 'content_approved' | 'content_revision'
// couponCode 只有 qualificationStatus === 'approved' 後才存在
export const kocApplications = [
  {
    id: 'app-001',
    kocId: 'k1', campaignId: 'c1', productId: 'p1',
    appliedAt: '2026-03-05 10:20',
    qualificationStatus: 'pending_qualification', qualificationNote: '',
    couponCode: null,
    contentStatus: null, contentNote: '',
    caption: '', hashtags: [], mentions: [], submittedAt: null,
  },
  {
    id: 'app-002',
    kocId: 'k2', campaignId: 'c2', productId: 'p3',
    appliedAt: '2026-03-04 14:33',
    qualificationStatus: 'approved', qualificationNote: '粉絲數及互動率符合要求',
    couponCode: 'DAV15',
    contentStatus: 'submitted', contentNote: '',
    caption: '測試了三個月的保養品終於可以分享了！這款防曬精華真的是我今年最愛的發現之一，防曬不悶熱，保濕超持久，用優惠碼 DAV15 可以折扣喔！',
    hashtags: ['保養測評', '夏季必備', 'skincareroutine'],
    mentions: ['@brand_official'],
    submittedAt: '2026-03-08 10:05',
  },
  {
    id: 'app-003',
    kocId: 'k3', campaignId: 'c2', productId: 'p3',
    appliedAt: '2026-03-03 09:00',
    qualificationStatus: 'approved', qualificationNote: 'YouTube 頻道內容優質',
    couponCode: 'YAT20',
    contentStatus: 'content_revision', contentNote: '請加入品牌官方帳號 @brand_official 的 mention，並補充優惠碼使用說明。',
    caption: '全新防曬精華開箱！SPF50保護力超強，質地輕薄完全不黏膩。今天分享我的使用心得給大家！',
    hashtags: ['防曬', 'SPF50', '開箱'],
    mentions: [],
    submittedAt: '2026-03-07 18:40',
  },
  {
    id: 'app-004',
    kocId: 'k4', campaignId: 'c4', productId: 'p4',
    appliedAt: '2026-03-06 16:45',
    qualificationStatus: 'pending_qualification', qualificationNote: '',
    couponCode: null,
    contentStatus: null, contentNote: '',
    caption: '', hashtags: [], mentions: [], submittedAt: null,
  },
  {
    id: 'app-005',
    kocId: 'k5', campaignId: 'c1', productId: 'p1',
    appliedAt: '2026-03-02 11:10',
    qualificationStatus: 'rejected', qualificationNote: '近期互動率偏低，不符合本次活動標準',
    couponCode: null,
    contentStatus: null, contentNote: '',
    caption: '', hashtags: [], mentions: [], submittedAt: null,
  },
  {
    id: 'app-006',
    kocId: 'k6', campaignId: 'c2', productId: 'p3',
    appliedAt: '2026-03-01 08:30',
    qualificationStatus: 'approved', qualificationNote: '',
    couponCode: 'PIN20',
    contentStatus: 'content_approved', contentNote: '圖片精美，文案清晰，核准！',
    caption: '夏天出門防曬是必須的！這款SPF50+防曬精華讓我整天在外面都不怕曬傷！用優惠碼 PIN20 享折扣！',
    hashtags: ['防曬必備', '夏天', 'skincare'],
    mentions: ['@brand_official'],
    submittedAt: '2026-03-06 20:30',
  },
  {
    id: 'app-007',
    kocId: 'k7', campaignId: 'c4', productId: 'p4',
    appliedAt: '2026-03-07 13:00',
    qualificationStatus: 'approved', qualificationNote: '',
    couponCode: 'CHU10',
    contentStatus: 'pending_content', contentNote: '',
    caption: '', hashtags: [], mentions: [], submittedAt: null,
  },
  {
    // 陳大衛 (k2) 的第二個任務：母親節活動 × 母親節禮盒，優惠碼不同
    id: 'app-008',
    kocId: 'k2', campaignId: 'c4', productId: 'p4',
    appliedAt: '2026-03-05 09:00',
    qualificationStatus: 'approved', qualificationNote: '',
    couponCode: 'MTD10',
    contentStatus: 'submitted', contentNote: '',
    caption: '媽媽節快到了！這個限定禮盒包裝超精緻，裡面有精華水、乳霜還有眼霜，一整套送媽媽最適合！用優惠碼 MTD10 享優惠！',
    hashtags: ['母親節', '禮物推薦', 'skincare'],
    mentions: ['@brand_official'],
    submittedAt: '2026-03-08 11:32',
  },
]


// ─── 訂單 ─────────────────────────────────────────────────────────────────────
// appId 對應 kocApplications.id，可追蹤是哪個任務帶入的訂單
export const orders = [
  { id: 'ORD-001', kocId: 'k1', kocName: '林小美', appId: null,      couponCode: 'MEI15', productId: 'p1', productName: '夏季保養旗艦組 Premium', amount: 1680, date: '2026-03-08', status: 'paid',       campaignId: 'c1' },
  { id: 'ORD-002', kocId: 'k2', kocName: '陳大衛', appId: 'app-002', couponCode: 'DAV15', productId: 'p3', productName: '防曬精華 SPF50+',        amount: 880,  date: '2026-03-08', status: 'processing', campaignId: 'c2' },
  { id: 'ORD-003', kocId: 'k3', kocName: '王雅婷', appId: 'app-003', couponCode: 'YAT20', productId: 'p3', productName: '防曬精華 SPF50+',        amount: 880,  date: '2026-03-07', status: 'paid',       campaignId: 'c2' },
  { id: 'ORD-004', kocId: 'k4', kocName: '張怡君', appId: null,      couponCode: 'YIJ15', productId: 'p4', productName: '母親節限定禮盒',          amount: 1280, date: '2026-03-07', status: 'paid',       campaignId: 'c4' },
  { id: 'ORD-005', kocId: 'k1', kocName: '林小美', appId: null,      couponCode: 'MEI15', productId: 'p3', productName: '防曬精華 SPF50+',        amount: 880,  date: '2026-03-06', status: 'paid',       campaignId: 'c2' },
  { id: 'ORD-006', kocId: 'k5', kocName: '李雨晴', appId: 'app-005', couponCode: 'YUC10', productId: 'p1', productName: '夏季保養旗艦組 Premium', amount: 1680, date: '2026-03-06', status: 'refunded',   campaignId: 'c1' },
  { id: 'ORD-007', kocId: 'k2', kocName: '陳大衛', appId: 'app-008', couponCode: 'MTD10', productId: 'p4', productName: '母親節限定禮盒',          amount: 1280, date: '2026-03-05', status: 'paid',       campaignId: 'c4' },
  { id: 'ORD-008', kocId: 'k6', kocName: '吳品瑄', appId: 'app-006', couponCode: 'PIN20', productId: 'p3', productName: '防曬精華 SPF50+',        amount: 880,  date: '2026-03-05', status: 'processing', campaignId: 'c2' },
  { id: 'ORD-009', kocId: 'k7', kocName: '黃俊彥', appId: 'app-007', couponCode: 'CHU10', productId: 'p4', productName: '母親節限定禮盒',          amount: 1280, date: '2026-03-04', status: 'paid',       campaignId: 'c4' },
  { id: 'ORD-010', kocId: 'k6', kocName: '吳品瑄', appId: 'app-006', couponCode: 'PIN20', productId: 'p3', productName: '防曬精華 SPF50+',        amount: 880,  date: '2026-03-04', status: 'paid',       campaignId: 'c2' },
]


// ─── 圖表資料 ─────────────────────────────────────────────────────────────────
export const monthlyGmv = [
  { month: '10月', gmv: 42000,  orders: 38 },
  { month: '11月', gmv: 58000,  orders: 52 },
  { month: '12月', gmv: 91000,  orders: 84 },
  { month: '1月',  gmv: 76000,  orders: 69 },
  { month: '2月',  gmv: 88000,  orders: 79 },
  { month: '3月',  gmv: 103000, orders: 92 },
]

export const platformDist = [
  { name: 'Instagram', value: 48, color: '#E1306C' },
  { name: 'TikTok',    value: 35, color: '#000000' },
  { name: 'YouTube',   value: 17, color: '#FF0000' },
]


// ─── 聊天對話 ─────────────────────────────────────────────────────────────────
// key 為 kocApplications.id（每個任務各自有獨立對話）
export const chatConversations = {
  'app-002': {
    kocId: 'k2', unread: 0,
    messages: [
      { id: 1, sender: 'vendor', text: '大衛你好，感謝你加入防曬新品活動！', time: '昨天' },
      { id: 2, sender: 'koc',    text: '謝謝！防曬精華超好用，我會好好推廣的！', time: '昨天' },
      { id: 3, sender: 'vendor', text: '你的文案已收到，審核中，優惠碼 DAV15 記得放在文案裡喔', time: '10:05' },
    ],
  },
  'app-003': {
    kocId: 'k3', unread: 1,
    messages: [
      { id: 1, sender: 'koc',    text: '你好，關於防曬精華的文案審核問題想請教一下', time: '18:40' },
      { id: 2, sender: 'koc',    text: '我的文案被退回了，請問要怎麼修改比較好？', time: '18:41' },
    ],
  },
  'app-006': {
    kocId: 'k6', unread: 0,
    messages: [
      { id: 1, sender: 'vendor', text: '品瑄你好，你的防曬文案已通過，可以發布了！', time: '20:30' },
      { id: 2, sender: 'koc',    text: '太好了！我今天就發布！', time: '20:45' },
    ],
  },
  'app-007': {
    kocId: 'k7', unread: 0,
    messages: [
      { id: 1, sender: 'koc',    text: '你好，母親節禮盒商品已收到，感謝！', time: '16:00' },
      { id: 2, sender: 'vendor', text: '收到囉！期待你的文案，有問題隨時詢問 😊', time: '16:10' },
    ],
  },
  'app-008': {
    // 陳大衛的第二個任務（母親節禮盒），與 app-002 的對話完全獨立
    kocId: 'k2', unread: 2,
    messages: [
      { id: 1, sender: 'vendor', text: '大衛你好，母親節活動商品已為你備妥！', time: '09:00' },
      { id: 2, sender: 'koc',    text: '收到！這次禮盒很精緻，我媽媽也很喜歡！', time: '09:15' },
      { id: 3, sender: 'koc',    text: '文案初稿寫好了，等我整理一下再提交', time: '11:30' },
      { id: 4, sender: 'koc',    text: '優惠碼 MTD10 已放進文案了，請確認', time: '11:32' },
    ],
  },
}
