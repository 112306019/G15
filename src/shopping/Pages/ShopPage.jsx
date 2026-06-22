import React, { useMemo, useState } from "react";

function IconImage() {
  return (
    <svg
      className="h-9 w-9 text-white/60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function BagIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function UserIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="18" x2="12" y2="18" />
    </svg>
  );
}

function ArrowLeft() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function StarRow({ stars = "★★★★★", count = 120 }) {
  return (
    <div className="flex items-center gap-1 text-[11px] text-slate-500">
      <span className="tracking-[-1px] text-[#B89B6A]">{stars}</span>
      <span>({count})</span>
    </div>
  );
}

function ProductCard({ name, price, gradient, onAdd }) {
  return (
    <div className="group overflow-hidden rounded-xl border border-[#E2DDD4] bg-[#FDFAF6] transition-all hover:-translate-y-1 hover:border-[#E8C4B4] hover:shadow-[0_16px_40px_rgba(26,26,24,0.10)]">
      <div
        className="relative flex aspect-[4/3] items-center justify-center"
        style={{ background: gradient }}
      >
        <IconImage />
        <div className="absolute inset-0 bg-[#1A1A18]/0 transition-colors group-hover:bg-[#1A1A18]/5" />
      </div>

      <div className="p-4">
        <div className="mb-2 text-sm tracking-wide text-[#1A1A18]">{name}</div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="font-mono text-base font-bold text-[#1A1A18]">{price}</div>
            <StarRow />
          </div>

          <button
            type="button"
            onClick={onAdd}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#1A1A18] text-[#F5F0E8] transition-all hover:scale-110 hover:bg-[#C8522A] active:scale-95"
            aria-label="Add to cart"
          >
            <BagIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DotGroup({ activeIndex, onChange }) {
  return (
    <div className="flex justify-center gap-2 py-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={[
            "h-1.5 rounded-full transition-all",
            i === activeIndex ? "w-5 bg-[#1A1A18]" : "w-1.5 bg-[#E2DDD4]",
          ].join(" ")}
          aria-label={`dot-${i + 1}`}
        />
      ))}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="mb-7 flex items-baseline justify-between">
      <h2 className="relative font-serif text-[28px] text-[#1A1A18]">
        {title}
        <span className="absolute left-0 top-full mt-1 h-0.5 w-8 rounded bg-[#C8522A]" />
      </h2>

      <div className="flex gap-2">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full border border-[#E2DDD4] bg-white text-[#1A1A18] transition-all hover:border-[#1A1A18] hover:bg-[#1A1A18] hover:text-[#F5F0E8]"
          aria-label="prev"
        >
          <ArrowLeft />
        </button>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full border border-[#E2DDD4] bg-white text-[#1A1A18] transition-all hover:border-[#1A1A18] hover:bg-[#1A1A18] hover:text-[#F5F0E8]"
          aria-label="next"
        >
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}

export default function ShopPage() {
  const [search, setSearch] = useState("");
  const [heroDots, setHeroDots] = useState(0);
  const [recDots, setRecDots] = useState(0);
  const [bestDots, setBestDots] = useState(0);

  const [cartCount, setCartCount] = useState(2);
  const [badgePop, setBadgePop] = useState(false);

  const products = useMemo(
    () => [
      { name: "T-shirt", price: "$20.99", gradient: "linear-gradient(135deg,#D8D4CC,#C4BDB4)" },
      { name: "T-shirt", price: "$20.99", gradient: "linear-gradient(135deg,#C4C8D4,#A8AEBB)" },
      { name: "T-shirt", price: "$20.99", gradient: "linear-gradient(135deg,#C8D4C4,#B0BBA8)" },
      { name: "T-shirt", price: "$20.99", gradient: "linear-gradient(135deg,#D4C8C4,#BBA8A0)" },
    ],
    []
  );

  const bestSellers = useMemo(
    () => [
      { name: "Hoodies", price: "$20.99", gradient: "linear-gradient(135deg,#C8BEB4,#A89E94)" },
      { name: "Hoodies", price: "$20.99", gradient: "linear-gradient(135deg,#B4C8C4,#94A8A4)" },
      { name: "Hoodies", price: "$20.99", gradient: "linear-gradient(135deg,#C8C4B4,#A8A494)" },
      { name: "Hoodies", price: "$20.99", gradient: "linear-gradient(135deg,#BEC8C4,#9EA8A4)" },
    ],
    []
  );

  const allProducts = useMemo(
    () => [
      { name: "T-shirt Premium", price: "$24.99", gradient: "linear-gradient(135deg,#D4C8C0,#B8ACA4)" },
      { name: "Hoodie Classic", price: "$39.99", gradient: "linear-gradient(135deg,#C0C8D4,#A4ACB8)" },
      { name: "Jacket Slim", price: "$59.99", gradient: "linear-gradient(135deg,#C8D4C0,#ACB8A4)" },
      { name: "Pants Comfort", price: "$34.99", gradient: "linear-gradient(135deg,#D4C0C0,#B8A4A4)" },
    ],
    []
  );

  const handleAdd = () => {
    setCartCount((c) => c + 1);
    setBadgePop(true);
    window.setTimeout(() => setBadgePop(false), 200);
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18]">

      {/* FILTERS */}
      <div className="border-b border-[#E2DDD4] bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-transparent px-3.5 py-1.5 text-[13px] text-[#8C8880] transition-all hover:border-[#E2DDD4] hover:text-[#1A1A18]"
          >
            <span className="grid h-4 w-4 place-items-center">
              <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="h-4 w-4">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
              </svg>
            </span>
            城市
            <ChevronDown />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-transparent px-3.5 py-1.5 text-[13px] text-[#8C8880] transition-all hover:border-[#E2DDD4] hover:text-[#1A1A18]"
          >
            <span className="grid h-4 w-4 place-items-center">
              <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="h-4 w-4">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </span>
            價格由低到高
            <ChevronDown />
          </button>

          <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#E2DDD4] bg-[#F5F0E8] px-4 py-2">
            <SearchIcon />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#8C8880]"
              placeholder="搜尋"
            />
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg bg-[#1A1A18] text-[#F5F0E8] transition-colors hover:bg-[#C8522A]"
            aria-label="filter"
          >
            <FilterIcon />
          </button>
        </div>
      </div>

      {/* HERO */}
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:gap-16">
        <div className="relative h-60 w-full max-w-[300px] flex-shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#D4CFC6] to-[#B8B0A4]">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/10" />
          <div className="relative grid h-full w-full place-items-center">
            <div className="flex flex-col items-center gap-2 text-white/70">
              <svg className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-4 font-mono text-[11px] tracking-[0.18em] text-[#C8522A]">本季精選 · Featured</div>
          <h1 className="font-serif text-5xl leading-[1.05]">本期主打<br />商品</h1>
          <p className="mt-6 text-sm leading-7 text-[#8C8880]">
            精心挑選的當季好物，品質保證<br />每一件都值得擁有。
          </p>

          <button
            type="button"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1A1A18] px-7 py-3 text-sm tracking-[0.05em] text-[#F5F0E8] transition-all hover:-translate-y-0.5 hover:bg-[#C8522A] active:translate-y-0"
          >
            商品介紹
            <ArrowRight />
          </button>
        </div>
      </div>

      <DotGroup activeIndex={heroDots} onChange={setHeroDots} />

      {/* RECOMMENDED */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <SectionHeader title="推薦商品" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p, idx) => (
            <ProductCard key={idx} name={p.name} price={p.price} gradient={p.gradient} onAdd={handleAdd} />
          ))}
        </div>
        <div className="mt-5">
          <DotGroup activeIndex={recDots} onChange={setRecDots} />
        </div>
      </div>

      {/* BEST SELLERS */}
      <div className="border-y border-[#E2DDD4] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <SectionHeader title="本期最熱賣" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {bestSellers.map((p, idx) => (
              <ProductCard key={idx} name={p.name} price={p.price} gradient={p.gradient} onAdd={handleAdd} />
            ))}
          </div>
          <div className="mt-5">
            <DotGroup activeIndex={bestDots} onChange={setBestDots} />
          </div>
        </div>
      </div>

      {/* ALL PRODUCTS */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="relative inline-block font-serif text-[28px]">
          所有商品
          <span className="absolute left-0 top-full mt-1 h-0.5 w-8 rounded bg-[#B89B6A]" />
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {allProducts.map((p, idx) => (
            <ProductCard key={idx} name={p.name} price={p.price} gradient={p.gradient} onAdd={handleAdd} />
          ))}
        </div>
      </div>
    </div>
  );
}