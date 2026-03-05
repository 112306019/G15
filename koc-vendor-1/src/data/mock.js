// ─── Campaigns ──────────────────────────────────────────────────────────────
export const campaigns = [
  {
    id: 'c1',
    name: '夏季保養旗艦組',
    status: 'active',
    budget: 80000,
    spent: 51200,
    discount: 15,
    kocCount: 24,
    orders: 186,
    gmv: 246800,
    conversion: 18.2,
    startDate: '2026-02-01',
    endDate: '2026-04-30',
    description: '主打夏季全效保養，邀請 KOC 以購物體驗為核心發文。',
  },
  {
    id: 'c2',
    name: '防曬新品上市',
    status: 'ended',
    budget: 50000,
    spent: 50000,
    discount: 20,
    kocCount: 18,
    orders: 98,
    gmv: 128600,
    conversion: 14.5,
    startDate: '2026-01-01',
    endDate: '2026-02-28',
    description: '全新 SPF50+ 防曬系列首波推廣，限時 8 折優惠碼。',
  },
  {
    id: 'c3',
    name: '秋冬保濕深層系列',
    status: 'draft',
    budget: 120000,
    spent: 0,
    discount: 12,
    kocCount: 0,
    orders: 0,
    gmv: 0,
    conversion: 0,
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    description: '秋冬主打深層補水，規劃 50 位 KOC 聯合推廣。',
  },
  {
    id: 'c4',
    name: '母親節禮盒限定',
    status: 'active',
    budget: 40000,
    spent: 12000,
    discount: 10,
    kocCount: 10,
    orders: 44,
    gmv: 68400,
    conversion: 21.3,
    startDate: '2026-03-01',
    endDate: '2026-05-15',
    description: '母親節限定禮盒組合，主打情感溫度內容創作。',
  },
]

// ─── KOCs ────────────────────────────────────────────────────────────────────
export const kocs = [
  { id: 'k1', name: '小柔日常',   handle: '@jou_daily',    avatar: '柔', platform: 'TikTok',    followers: 128000, posts: 15, gmv: 88600, status: 'active',   code: 'JOU128',  campaign: 'c1', joinDate: '2026-01-15' },
  { id: 'k2', name: 'Mia Chen',   handle: '@mia.skin',     avatar: 'M',  platform: 'Instagram', followers: 42000,  posts: 8,  gmv: 32400, status: 'active',   code: 'MIA042',  campaign: 'c1', joinDate: '2026-01-20' },
  { id: 'k3', name: 'BeautyJen',  handle: '@beautyjen_tw', avatar: 'B',  platform: 'YouTube',   followers: 85000,  posts: 4,  gmv: 19800, status: 'pending',  code: 'JEN085',  campaign: 'c1', joinDate: '2026-02-01' },
  { id: 'k4', name: 'Lala Life',  handle: '@lala_life31',  avatar: 'L',  platform: 'Instagram', followers: 31000,  posts: 11, gmv: 26700, status: 'active',   code: 'LAL031',  campaign: 'c4', joinDate: '2026-02-10' },
  { id: 'k5', name: '陳小美',     handle: '@mei_beauty67', avatar: '美', platform: 'TikTok',    followers: 67000,  posts: 0,  gmv: 0,     status: 'inactive', code: 'CME067',  campaign: 'c2', joinDate: '2026-01-05' },
  { id: 'k6', name: 'EvaGlow',    handle: '@eva.glow',     avatar: 'E',  platform: 'Instagram', followers: 56000,  posts: 9,  gmv: 41200, status: 'active',   code: 'EVA056',  campaign: 'c1', joinDate: '2026-02-18' },
  { id: 'k7', name: '美妝日記',   handle: '@mz_diary',     avatar: '記', platform: 'YouTube',   followers: 210000, posts: 6,  gmv: 72000, status: 'active',   code: 'MZD210',  campaign: 'c1', joinDate: '2026-01-28' },
]

// ─── Orders ──────────────────────────────────────────────────────────────────
export const orders = [
  { id: 'ORD-2847', kocId: 'k1', kocName: '小柔日常', code: 'JOU128', product: '夏季保養旗艦組 Premium', amount: 1680, date: '2026-03-06', status: 'paid',       campaign: 'c1' },
  { id: 'ORD-2846', kocId: 'k2', kocName: 'Mia Chen', code: 'MIA042', product: '防曬精華 SPF50+',        amount: 880,  date: '2026-03-06', status: 'paid',       campaign: 'c1' },
  { id: 'ORD-2845', kocId: 'k4', kocName: 'Lala Life', code: 'LAL031', product: '母親節禮盒 Standard',   amount: 1280, date: '2026-03-05', status: 'processing', campaign: 'c4' },
  { id: 'ORD-2844', kocId: 'k3', kocName: 'BeautyJen', code: 'JEN085', product: '夏季保養旗艦組 Premium',amount: 1680, date: '2026-03-05', status: 'paid',       campaign: 'c1' },
  { id: 'ORD-2843', kocId: 'k1', kocName: '小柔日常', code: 'JOU128', product: '防曬精華 SPF50+',        amount: 880,  date: '2026-03-04', status: 'refunded',   campaign: 'c1' },
  { id: 'ORD-2842', kocId: 'k6', kocName: 'EvaGlow',   code: 'EVA056', product: '夏季保養旗艦組 Basic',  amount: 980,  date: '2026-03-04', status: 'paid',       campaign: 'c1' },
  { id: 'ORD-2841', kocId: 'k7', kocName: '美妝日記',  code: 'MZD210', product: '夏季保養旗艦組 Premium',amount: 1680, date: '2026-03-03', status: 'paid',       campaign: 'c1' },
  { id: 'ORD-2840', kocId: 'k2', kocName: 'Mia Chen',  code: 'MIA042', product: '母親節禮盒 Premium',    amount: 1980, date: '2026-03-03', status: 'paid',       campaign: 'c4' },
  { id: 'ORD-2839', kocId: 'k4', kocName: 'Lala Life', code: 'LAL031', product: '防曬精華 SPF50+',        amount: 880,  date: '2026-03-02', status: 'processing', campaign: 'c1' },
  { id: 'ORD-2838', kocId: 'k6', kocName: 'EvaGlow',   code: 'EVA056', product: '夏季保養旗艦組 Basic',  amount: 980,  date: '2026-03-01', status: 'paid',       campaign: 'c1' },
]

// ─── Monthly GMV chart ────────────────────────────────────────────────────────
export const monthlyGmv = [
  { month: 'Oct', gmv: 68000 },
  { month: 'Nov', gmv: 95000 },
  { month: 'Dec', gmv: 142000 },
  { month: 'Jan', gmv: 108000 },
  { month: 'Feb', gmv: 128600 },
  { month: 'Mar', gmv: 246800 },
]

// ─── Platform distribution ───────────────────────────────────────────────────
export const platformDist = [
  { platform: 'Instagram', pct: 44, color: '#E1306C' },
  { platform: 'TikTok',    pct: 33, color: '#2DD4BF' },
  { platform: 'YouTube',   pct: 23, color: '#EF4444' },
]
