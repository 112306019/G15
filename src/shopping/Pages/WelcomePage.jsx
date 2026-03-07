import React, { useMemo, useState } from "react";

function IconPlaceholder() {
  return (
    <svg
      className="h-16 w-16 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function RoleCard({
  badge,
  title,
  subtitle,
  cta,
  onClick,
  rounded,
  selected,
}) {
  return (
    <div className="relative flex-1">
      {/* selection overlay */}
      {selected && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-orange-600 bg-orange-600/10 text-5xl font-black text-orange-600">
          ✓
        </div>
      )}

      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        className={[
          "group relative min-h-[480px] w-full cursor-pointer overflow-hidden bg-slate-100 p-12 pb-10 transition-all",
          "hover:-translate-y-1.5 hover:bg-slate-200 hover:shadow-2xl active:-translate-y-0.5",
          "focus:outline-none focus:ring-2 focus:ring-orange-500/60",
          rounded,
        ].join(" ")}
      >
        {/* badge */}
        {badge ? (
          <span className="absolute right-5 top-5 z-10 rounded-full bg-orange-600 px-2.5 py-1 font-mono text-[10px] tracking-[0.18em] text-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            {badge}
          </span>
        ) : null}

        {/* image placeholder */}
        <div className="absolute left-1/2 top-10 flex h-40 w-[200px] -translate-x-1/2 items-center justify-center rounded-xl bg-black/5 transition-transform duration-200 group-hover:scale-[1.03]">
          <IconPlaceholder />
        </div>

        {/* content */}
        <div className="relative z-[1] mt-auto pt-[200px] text-center">
          <div className="font-serif text-2xl tracking-wide text-slate-900">
            {title}
          </div>

          {subtitle ? (
            <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
          ) : null}

          <div className="mt-4 inline-flex items-center gap-1.5 text-sm text-slate-600 opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100">
            {cta}
            <ArrowIcon />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WelcomePage({ onSelectSeller, onSelectKoc }) {
  const [selected, setSelected] = useState(null);

  const selectedKey = useMemo(() => selected, [selected]);

  const handleSelect = (role) => {
    setSelected(role);
    setTimeout(() => setSelected(null), 600);

    if (role === "seller") onSelectSeller?.();
    if (role === "koc") onSelectKoc?.();
  };

  return (
    <div className="min-h-screen bg-white px-6 py-12 text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center">
        {/* heading */}
        <div className="mb-12 text-center">
          <h1 className="font-serif text-4xl tracking-wide">歡迎!</h1>
          <p className="mt-2 text-sm tracking-[0.14em] text-slate-500">
            KOC 平台名稱
          </p>
        </div>

        {/* cards */}
        <div className="relative flex w-full max-w-3xl items-stretch">
          {/* center divider */}
          <div className="pointer-events-none absolute left-1/2 top-[5%] h-[90%] w-px -translate-x-1/2 bg-slate-300/60" />

          <RoleCard
            title="我是賣家！"
            cta="進入賣家後台"
            onClick={() => handleSelect("seller")}
            rounded="rounded-l-2xl rounded-r-lg"
            selected={selectedKey === "seller"}
          />

          <RoleCard
            badge="NEW"
            title="我想成為KOC！"
            subtitle="直接購物選這裡！"
            cta="開始購物體驗"
            onClick={() => handleSelect("koc")}
            rounded="rounded-l-lg rounded-r-2xl"
            selected={selectedKey === "koc"}
          />
        </div>
      </div>
    </div>
  );
}