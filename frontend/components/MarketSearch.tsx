"use client";

import Image from "next/image";

type ItemResult = {
  name: string;
  id: string;
};

type Props = {
  tier: string;
  setTier: (value: string) => void;
  itemSearch: string;
  searchItems: (value: string) => void;
  itemResults: ItemResult[];
  showItemDropdown: boolean;
  setShowItemDropdown: (value: boolean) => void;
  selectItem: (item: ItemResult) => void;
  enchant: string;
  setEnchant: (value: string) => void;
  quality: string;
  setQuality: (value: string) => void;
  fetchPrices: () => void;
  activeTab: "market" | "scanner";
  buildItemId: (tier: string, itemType: string, enchant: string) => string;
};

const qualities = [
  { value: "1", border: "border-[#d6d6d6]", bg: "bg-[#2b2b2b]" },
  { value: "2", border: "border-[#8b5a2b]", bg: "bg-[#2d2015]" },
  { value: "3", border: "border-[#d8d8d8]", bg: "bg-[#242424]" },
  { value: "4", border: "border-[#f2c14e]", bg: "bg-[#3b2f16]" },
  { value: "5", border: "border-[#f59e0b]", bg: "bg-[#4a2d05]" },
];

export default function MarketSearch({
  tier,
  setTier,
  itemSearch,
  searchItems,
  itemResults,
  showItemDropdown,
  setShowItemDropdown,
  selectItem,
  enchant,
  setEnchant,
  quality,
  setQuality,
  fetchPrices,
  activeTab,
  buildItemId,
}: Props) {
  return (
    <div className="metal-panel sticky top-6 p-6">
      <h2 className="text-2xl font-black mb-6 text-yellow-200">Wyszukiwanie</h2>

      <label className="block text-sm text-yellow-100/70 mb-2">Item</label>

      <div className="relative mb-5">
        <input
          value={itemSearch}
          onChange={(e) => searchItems(e.target.value)}
          onFocus={() => setShowItemDropdown(true)}
          placeholder="Search item..."
          className="w-full albion-input px-3 py-3 rounded-xl text-yellow-100 outline-none"
        />

        {showItemDropdown && itemResults.length > 0 && (
          <div className="absolute z-50 mt-2 w-full max-h-72 overflow-y-auto metal-panel p-2">
            {itemResults.map((item) => {
              const previewId = buildItemId(tier, item.id, enchant);

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-yellow-500/10 text-left transition"
                >
                  <Image
                    src={`https://render.albiononline.com/v1/item/${previewId}.png`}
                    alt={item.name}
                    width={40}
                    height={40}
                    unoptimized
                    className="w-10 h-10 bg-[#110d0a] rounded-lg border border-[#8d7248] p-1"
                  />

                  <div className="min-w-0">
                    <p className="font-black text-yellow-100 truncate">
                      {item.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <label className="block text-sm text-yellow-100/70 mb-2">Tier</label>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {["T3", "T4", "T5", "T6", "T7", "T8"].map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTier(t)}
            className={`h-14 rounded-xl font-black text-lg metal-button transition hover:-translate-y-0.5 ${
              tier === t ? "metal-button-active" : "text-zinc-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <label className="block text-sm text-yellow-100/70 mb-2">Enchant</label>

      <div className="metal-panel flex justify-center gap-6 py-6 mb-5">
        {[1, 2, 3, 4].map((level) => {
          const currentEnchant = Number(enchant);
          const isActive = level <= currentEnchant;

          const activeColor =
            currentEnchant === 1
              ? "bg-emerald-400"
              : currentEnchant === 2
                ? "bg-cyan-400"
                : currentEnchant === 3
                  ? "bg-fuchsia-500"
                  : currentEnchant === 4
                    ? "bg-yellow-400"
                    : "bg-[#4b433d]";

          return (
            <button
              type="button"
              key={level}
              onClick={() =>
                setEnchant(currentEnchant === level ? "0" : String(level))
              }
              className={`relative w-11 h-11 rotate-45 rounded-[6px] border-2 transition-all cursor-pointer ${
                isActive
                  ? `${activeColor} border-white/60 shadow-[0_0_18px_rgba(255,255,255,0.3)]`
                  : "bg-[#4b433d] border-[#8d7248] shadow-[inset_0_2px_6px_rgba(0,0,0,0.75)]"
              }`}
              aria-label={`Enchant ${level}`}
            >
              <div className="absolute top-[4px] left-[4px] w-3 h-3 bg-white/45 rounded-full blur-sm" />
              <div className="absolute inset-[7px] border border-white/15 rounded-[3px]" />
            </button>
          );
        })}
      </div>

      <label className="block text-sm text-yellow-100/70 mb-3">Quality</label>

      <div className="grid grid-cols-5 gap-2 mb-6">
        {qualities.map((q) => (
          <button
            key={q.value}
            type="button"
            onClick={() => setQuality(q.value)}
            className={`h-14 rounded-lg border-[3px] ${q.border} ${q.bg} transition-all ${
              quality === q.value
                ? "scale-105 ring-2 ring-yellow-300"
                : "opacity-90"
            }`}
          >
            <div className="w-full h-full rounded border border-black/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.06),inset_0_-2px_4px_rgba(0,0,0,0.5)]" />
          </button>
        ))}
      </div>

      {activeTab === "market" && (
        <button
          type="button"
          onClick={fetchPrices}
          className="w-full py-4 rounded-xl font-black text-black bg-gradient-to-b from-yellow-300 to-yellow-600 shadow-[0_6px_20px_rgba(250,204,21,0.35)] hover:from-yellow-200 hover:to-yellow-500 transition"
        >
          Szukaj
        </button>
      )}
    </div>
  );
}
