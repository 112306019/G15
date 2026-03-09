// ─── Campaigns ───────────────────────────────────────────────────────────────
export const campaigns = [
  { id: 'c1', name: '夏季保養活動', status: 'active',  budget: 50000, spent: 32000, discount: 15, kocCount: 12, orders: 156, gmv: 187200, conversion: 4.2, startDate: '2026-01-15', endDate: '2026-04-15', description: '主打夏季保濕防曬商品，KOC 以優惠碼推廣。' },
  { id: 'c2', name: '防曬新品上市', status: 'active',  budget: 30000, spent: 18500, discount: 20, kocCount: 8,  orders: 89,  gmv: 78320,  conversion: 3.8, startDate: '2026-02-01', endDate: '2026-05-01', description: '全新 SPF50+ 防曬精華上市推廣活動。' },
  { id: 'c3', name: '秋冬保濕計劃', status: 'draft',   budget: 40000, spent: 0,     discount: 12, kocCount: 0,  orders: 0,   gmv: 0,      conversion: 0,   startDate: '2026-09-01', endDate: '2026-12-01', description: '秋冬換季保濕系列商品推廣。' },
  { id: 'c4', name: '母親節限定',   status: 'active',  budget: 25000, spent: 8200,  discount: 10, kocCount: 6,  orders: 44,  gmv: 56320,  conversion: 5.1, startDate: '2026-03-01', endDate: '2026-05-15', description: '母親節限定禮盒專屬活動。' },
]

// ─── KOCs ────────────────────────────────────────────────────────────────────
export const kocs = [
  { id: 'k1', name: '林小美', handle: '@beauty_meilin',  avatar: '林', platform: 'Instagram', followers: 45200, posts: 8,  gmv: 52000, status: 'active',   code: 'MEI15',  campaign: 'c1', joinDate: '2026-01-20' },
  { id: 'k2', name: '陳大衛', handle: '@david_skincare', avatar: '陳', platform: 'TikTok',    followers: 128000,posts: 12, gmv: 89300, status: 'active',   code: 'DAV15',  campaign: 'c1', joinDate: '2026-01-18' },
  { id: 'k3', name: '王雅婷', handle: '@yatyng_beauty',  avatar: '王', platform: 'YouTube',   followers: 32000, posts: 5,  gmv: 28400, status: 'active',   code: 'YAT20',  campaign: 'c2', joinDate: '2026-02-05' },
  { id: 'k4', name: '張怡君', handle: '@yijun_glow',     avatar: '張', platform: 'Instagram', followers: 67800, posts: 9,  gmv: 61200, status: 'active',   code: 'YIJ15',  campaign: 'c1', joinDate: '2026-01-22' },
  { id: 'k5', name: '李雨晴', handle: '@yuching_care',   avatar: '李', platform: 'TikTok',    followers: 89400, posts: 15, gmv: 74800, status: 'inactive', code: 'YUC10',  campaign: 'c4', joinDate: '2026-03-01' },
  { id: 'k6', name: '吳品瑄', handle: '@pinxuan_skin',   avatar: '吳', platform: 'Instagram', followers: 23100, posts: 4,  gmv: 19600, status: 'active',   code: 'PIN20',  campaign: 'c2', joinDate: '2026-02-10' },
  { id: 'k7', name: '黃俊彥', handle: '@chunyen_life',   avatar: '黃', platform: 'YouTube',   followers: 54300, posts: 7,  gmv: 43100, status: 'active',   code: 'CHU10',  campaign: 'c4', joinDate: '2026-03-05' },
]

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders = [
  { id: 'ORD-001', kocId: 'k1', kocName: '林小美', code: 'MEI15', product: '夏季保養旗艦組', amount: 1680, date: '2026-03-08', status: 'paid',       campaign: 'c1' },
  { id: 'ORD-002', kocId: 'k2', kocName: '陳大衛', code: 'DAV15', product: '防曬精華 SPF50+', amount: 880,  date: '2026-03-08', status: 'processing', campaign: 'c2' },
  { id: 'ORD-003', kocId: 'k3', kocName: '王雅婷', code: 'YAT20', product: '夏季保養旗艦組', amount: 1680, date: '2026-03-07', status: 'paid',       campaign: 'c1' },
  { id: 'ORD-004', kocId: 'k4', kocName: '張怡君', code: 'YIJ15', product: '母親節限定禮盒',  amount: 1280, date: '2026-03-07', status: 'paid',       campaign: 'c4' },
  { id: 'ORD-005', kocId: 'k1', kocName: '林小美', code: 'MEI15', product: '防曬精華 SPF50+', amount: 880,  date: '2026-03-06', status: 'paid',       campaign: 'c2' },
  { id: 'ORD-006', kocId: 'k5', kocName: '李雨晴', code: 'YUC10', product: '夏季保養旗艦組', amount: 1680, date: '2026-03-06', status: 'refunded',   campaign: 'c1' },
  { id: 'ORD-007', kocId: 'k2', kocName: '陳大衛', code: 'DAV15', product: '母親節限定禮盒',  amount: 1280, date: '2026-03-05', status: 'paid',       campaign: 'c4' },
  { id: 'ORD-008', kocId: 'k6', kocName: '吳品瑄', code: 'PIN20', product: '防曬精華 SPF50+', amount: 880,  date: '2026-03-05', status: 'processing', campaign: 'c2' },
  { id: 'ORD-009', kocId: 'k7', kocName: '黃俊彥', code: 'CHU10', product: '夏季保養旗艦組', amount: 1680, date: '2026-03-04', status: 'paid',       campaign: 'c1' },
  { id: 'ORD-010', kocId: 'k4', kocName: '張怡君', code: 'YIJ15', product: '防曬精華 SPF50+', amount: 880,  date: '2026-03-04', status: 'paid',       campaign: 'c2' },
]

// ─── Monthly GMV ──────────────────────────────────────────────────────────────
export const monthlyGmv = [
  { month: '10月', gmv: 42000, orders: 38 },
  { month: '11月', gmv: 58000, orders: 52 },
  { month: '12月', gmv: 91000, orders: 84 },
  { month: '1月',  gmv: 76000, orders: 69 },
  { month: '2月',  gmv: 88000, orders: 79 },
  { month: '3月',  gmv: 103000,orders: 92 },
]

// ─── Platform distribution ───────────────────────────────────────────────────
export const platformDist = [
  { name: 'Instagram', value: 48, color: '#E1306C' },
  { name: 'TikTok',    value: 35, color: '#000000' },
  { name: 'YouTube',   value: 17, color: '#FF0000' },
]

// ─── Content submissions ──────────────────────────────────────────────────────
export const contentSubmissions = [
  { id: 'sub-001', kocId: 'k1', platform: 'Instagram', campaignId: 'c1', submittedAt: '2026-03-08 14:22', status: 'pending',  type: 'image', caption: '入夏必備的完整保養攻略！這組夏季保養旗艦組真的讓我的肌膚整個夏天都水潤透亮✨ 化妝水超好吸收，防曬完全不悶不白。姊妹們快來試試！', hashtags: ['夏季保養','防曬','保濕','skincare'], mentions: ['@brand_official'], revisionCount: 0, reviewNotes: '' },
  { id: 'sub-002', kocId: 'k2', platform: 'TikTok',    campaignId: 'c1', submittedAt: '2026-03-08 10:05', status: 'approved', type: 'video', caption: '測試了三個月的保養品終於可以分享了！這款夏季保養組真的是我今年最愛的發現之一，防曬不悶熱，保濕超持久，用優惠碼可以折扣喔！', hashtags: ['保養測評','夏季必備','skincareroutine'], mentions: ['@brand_official'], revisionCount: 0, reviewNotes: '內容豐富，完全符合品牌調性，核准發布！' },
  { id: 'sub-003', kocId: 'k3', platform: 'YouTube',   campaignId: 'c2', submittedAt: '2026-03-07 18:40', status: 'revision', type: 'video', caption: '全新防曬精華開箱！SPF50保護力超強，質地輕薄完全不黏膩。今天分享我的使用心得給大家！', hashtags: ['防曬','SPF50','開箱'], mentions: [], revisionCount: 1, reviewNotes: '請加入品牌官方帳號 @brand_official 的 mention，並補充優惠碼使用說明。' },
  { id: 'sub-004', kocId: 'k4', platform: 'Instagram', campaignId: 'c4', submittedAt: '2026-03-07 09:15', status: 'pending',  type: 'image', caption: '母親節快到了！這個限定禮盒真的太適合送媽媽了，玫瑰精華水香氣超迷人，包裝也很精緻，收到一定超開心！', hashtags: ['母親節','禮物推薦','skincare'], mentions: ['@brand_official'], revisionCount: 0, reviewNotes: '' },
  { id: 'sub-005', kocId: 'k6', platform: 'Instagram', campaignId: 'c2', submittedAt: '2026-03-06 20:30', status: 'approved', type: 'image', caption: '夏天出門防曬是必須的！這款SPF50+防曬精華讓我整天在外面都不怕曬傷，而且完全不泛白！', hashtags: ['防曬必備','夏天','skincare'], mentions: ['@brand_official'], revisionCount: 0, reviewNotes: '圖片精美，文案清晰，核准！' },
  { id: 'sub-006', kocId: 'k7', platform: 'YouTube',   campaignId: 'c4', submittedAt: '2026-03-05 16:00', status: 'pending',  type: 'video', caption: '幫媽媽選了這個母親節限定禮盒，她超喜歡！裡面有精華水、乳霜還有眼霜，整套用下來皮膚真的有感變好！', hashtags: ['母親節禮物','保養','孝親'], mentions: ['@brand_official'], revisionCount: 0, reviewNotes: '' },
]

// ─── Chat conversations ───────────────────────────────────────────────────────
export const chatConversations = {
  k1: { unread: 2, messages: [
    { id: 1, sender: 'koc',    text: '你好！我已經收到商品了，品質很棒！', time: '09:30' },
    { id: 2, sender: 'vendor', text: '太好了！期待看到你的貼文 😊', time: '09:45' },
    { id: 3, sender: 'koc',    text: '文案我昨天提交了，麻煩幫忙審核一下！', time: '14:20' },
    { id: 4, sender: 'koc',    text: '請問審核大概要多久呢？', time: '14:22' },
  ]},
  k2: { unread: 0, messages: [
    { id: 1, sender: 'vendor', text: '大衛你好，感謝你加入我們的活動！', time: '昨天' },
    { id: 2, sender: 'koc',    text: '謝謝！商品超好用，我會好好推廣的！', time: '昨天' },
    { id: 3, sender: 'vendor', text: '你的文案已通過審核，可以發布了！', time: '10:05' },
  ]},
  k3: { unread: 1, messages: [
    { id: 1, sender: 'koc',    text: '你好，關於文案審核的問題想請教一下', time: '18:40' },
    { id: 2, sender: 'koc',    text: '我的文案被退回了，請問要怎麼修改比較好？', time: '18:41' },
  ]},
  k4: { unread: 0, messages: [
    { id: 1, sender: 'vendor', text: '怡君你好！母親節活動商品已寄出囉', time: '09:00' },
    { id: 2, sender: 'koc',    text: '收到！超期待，謝謝你們的速度', time: '11:30' },
  ]},
  k6: { unread: 0, messages: [
    { id: 1, sender: 'vendor', text: '品瑄你好，你的防曬文案已通過！', time: '20:30' },
    { id: 2, sender: 'koc',    text: '太好了！我今天就發布！', time: '20:45' },
  ]},
  k7: { unread: 0, messages: [
    { id: 1, sender: 'koc',    text: '你好，商品已收到，感謝！', time: '16:00' },
  ]},
}

// ─── Products ─────────────────────────────────────────────────────────────────
export const products = [
  { id: 'p1', name: '夏季保養旗艦組 Premium', sku: 'SKU-SUM-001', category: '保養組合', status: 'listed',   price: 1680, originalPrice: 2100, stock: 243, sold: 312, thumbnail: '💆', description: '完整夏季保養五件組。', specs: [], campaigns: ['c1'], kocDiscount: 15, createdAt: '2025-12-01', tags: ['保養','夏季'] },
  { id: 'p2', name: '夏季保養旗艦組 Basic',   sku: 'SKU-SUM-002', category: '保養組合', status: 'listed',   price: 980,  originalPrice: 1200, stock: 118, sold: 156, thumbnail: '🧴', description: '入門夏季保養三件組。',   specs: [], campaigns: ['c1'], kocDiscount: 15, createdAt: '2025-12-01', tags: ['保養','入門'] },
  { id: 'p3', name: '防曬精華 SPF50+',        sku: 'SKU-SUN-001', category: '防曬',     status: 'listed',   price: 880,  originalPrice: 1080, stock: 67,  sold: 204, thumbnail: '☀️', description: 'PA++++ 高效防曬精華。',    specs: [], campaigns: ['c1','c2'], kocDiscount: 20, createdAt: '2025-11-01', tags: ['防曬'] },
  { id: 'p4', name: '母親節限定禮盒',         sku: 'SKU-MTD-001', category: '禮盒',     status: 'listed',   price: 1280, originalPrice: 1580, stock: 88,  sold: 44,  thumbnail: '🎁', description: '母親節限定精裝禮盒。',     specs: [], campaigns: ['c4'], kocDiscount: 10, createdAt: '2026-02-15', tags: ['禮盒','母親節'] },
  { id: 'p5', name: '深層保濕精華液',         sku: 'SKU-HYD-001', category: '精華液',   status: 'draft',    price: 1200, originalPrice: 1500, stock: 0,   sold: 0,   thumbnail: '💧', description: '次世代玻尿酸複合精華。',   specs: [], campaigns: [], kocDiscount: 12, createdAt: '2026-03-01', tags: ['精華','保濕'] },
  { id: 'p6', name: '控油毛孔細緻化妝水',     sku: 'SKU-TON-001', category: '化妝水',   status: 'unlisted', price: 680,  originalPrice: 850,  stock: 200, sold: 89,  thumbnail: '🫙', description: '水楊酸 2% 控油化妝水。',  specs: [], campaigns: [], kocDiscount: 10, createdAt: '2025-10-01', tags: ['化妝水','控油'] },
]

export const productCategories = ['保養組合','防曬','禮盒','精華液','化妝水','乳液','潔顏','面膜']
