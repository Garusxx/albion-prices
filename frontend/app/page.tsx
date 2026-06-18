"use client";

import Image from "next/image";
import { useState } from "react";

type Price = {
  item_id: string;
  city: string;
  sell_price_min: number;
  sell_price_min_date: string;
  buy_price_max: number;
  buy_price_max_date: string;
};

type BlackMarketStats = {
  item_id: string;
  quality: string;
  avg_price_7d: number;
  sold_7d: number;
};

type ItemResult = {
  name: string;
  id: string;
};

const qualities = [
  { label: "Normal", value: "1" },
  { label: "Good", value: "2" },
  { label: "Outstanding", value: "3" },
  { label: "Excellent", value: "4" },
  { label: "Masterpiece", value: "5" },
];

const cityStyles: Record<string, string> = {
  Bridgewatch: "text-orange-400",
  Martlock: "text-blue-400",
  FortSterling: "text-slate-300",
  Lymhurst: "text-green-400",
  Thetford: "text-purple-400",
  Caerleon: "text-red-400",
  Brecilien: "text-pink-400",
};

function buildItemId(tier: string, itemType: string, enchant: string) {
  const baseId = `${tier}_${itemType}`;
  return enchant === "0" ? baseId : `${baseId}@${enchant}`;
}

function formatNumber(value: number) {
  if (!value) return "-";
  return value.toLocaleString("pl-PL");
}

function formatDate(date: string) {
  if (!date) return "-";
  return new Date(date).toLocaleString("pl-PL");
}

export default function Home() {
  const [tier, setTier] = useState("T4");
  const [itemType, setItemType] = useState("BAG");
  const [itemSearch, setItemSearch] = useState("Bag");
  const [itemResults, setItemResults] = useState<ItemResult[]>([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedItemName, setSelectedItemName] = useState("Bag");

  const [enchant, setEnchant] = useState("0");
  const [quality, setQuality] = useState("1");

  const [prices, setPrices] = useState<Price[]>([]);
  const [blackMarket, setBlackMarket] = useState<BlackMarketStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchedItem, setSearchedItem] = useState("T4_BAG");

  async function searchItems(value: string) {
    setItemSearch(value);
    setShowItemDropdown(true);

    if (value.trim().length < 2) {
      setItemResults([]);
      return;
    }

    const response = await fetch(
      `http://localhost:4000/api/items/search?q=${encodeURIComponent(value)}`,
    );

    const data = await response.json();
    setItemResults(data);
  }

  function selectItem(item: ItemResult) {
    setItemType(item.id);
    setItemSearch(item.name);
    setSelectedItemName(item.name);

    setItemResults([]);
    setShowItemDropdown(false);
  }

  async function fetchPrices() {
    const itemId = buildItemId(tier, itemType, enchant);

    setLoading(true);
    setSearchedItem(itemId);

    const [pricesResponse, blackMarketResponse] = await Promise.all([
      fetch(`http://localhost:4000/api/prices/${itemId}?quality=${quality}`),
      fetch(
        `http://localhost:4000/api/black-market/${itemId}?quality=${quality}`,
      ),
    ]);

    const pricesData = await pricesResponse.json();
    const blackMarketData = await blackMarketResponse.json();

    setPrices(pricesData.filter((p: Price) => p.city !== "BlackMarket"));
    setBlackMarket(blackMarketData);
    setLoading(false);
  }

  return (
    <main className="min-h-screen text-white p-6 bg-gradient-to-b from-[#241a13] via-[#15100c] to-[#090706]">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-black mb-6 text-yellow-300 drop-shadow">
          Albion Market Prices
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3">
            <div className="metal-panel sticky top-6 p-6">
              <h2 className="text-2xl font-black mb-6 text-yellow-200">
                Wyszukiwanie
              </h2>

              <label className="block text-sm text-yellow-100/70 mb-2">
                Item
              </label>

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

              <label className="block text-sm text-yellow-100/70 mb-2">
                Tier
              </label>
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

              <label className="block text-sm text-yellow-100/70 mb-2">
                Enchant
              </label>

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
                        setEnchant(
                          currentEnchant === level ? "0" : String(level),
                        )
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

              <label className="block text-sm text-yellow-100/70 mb-3">
                Quality
              </label>

              <div className="grid grid-cols-5 gap-2 mb-6">
                {[
                  {
                    value: "1",
                    border: "border-[#d6d6d6]",
                    bg: "bg-[#2b2b2b]",
                  },
                  {
                    value: "2",
                    border: "border-[#8b5a2b]",
                    bg: "bg-[#2d2015]",
                  },
                  {
                    value: "3",
                    border: "border-[#d8d8d8]",
                    bg: "bg-[#242424]",
                  },
                  {
                    value: "4",
                    border: "border-[#f2c14e]",
                    bg: "bg-[#3b2f16]",
                  },
                  {
                    value: "5",
                    border: "border-[#f59e0b]",
                    bg: "bg-[#4a2d05]",
                  },
                ].map((q) => (
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

              <button
                type="button"
                onClick={fetchPrices}
                className="w-full py-4 rounded-xl font-black text-black bg-gradient-to-b from-yellow-300 to-yellow-600 shadow-[0_6px_20px_rgba(250,204,21,0.35)] hover:from-yellow-200 hover:to-yellow-500 transition"
              >
                Szukaj
              </button>
            </div>
          </aside>

          <section className="lg:col-span-9">
            <div className="metal-panel p-6 mb-6">
              <div className="flex items-center gap-5">
                <Image
                  src={`https://render.albiononline.com/v1/item/${searchedItem}.png`}
                  alt={searchedItem}
                  width={96}
                  height={96}
                  unoptimized
                  className="w-24 h-24 bg-[#110d0a] rounded-xl border-2 border-[#8d7248] p-2 shadow-inner"
                />

                <div>
                  <h2 className="text-3xl font-black text-yellow-200">
                    {tier} {selectedItemName}
                    {enchant !== "0" && ` .${enchant}`}
                  </h2>
                  <p className="text-yellow-100/60">
                    Quality: {qualities.find((q) => q.value === quality)?.label}
                  </p>
                </div>
              </div>
            </div>

            {loading && <p className="text-yellow-100/70">Ładowanie...</p>}

            {blackMarket && (
              <div className="metal-panel p-6 mb-6 border-yellow-500">
                <h3 className="text-2xl font-black text-yellow-300 mb-5">
                  Black Market — ostatnie 7 dni
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="albion-input rounded-xl p-5">
                    <p className="text-yellow-100/60 text-sm">Średnia cena</p>
                    <p className="text-4xl font-black text-yellow-300">
                      {formatNumber(blackMarket.avg_price_7d)}
                    </p>
                  </div>

                  <div className="albion-input rounded-xl p-5">
                    <p className="text-yellow-100/60 text-sm">
                      Sprzedane sztuki
                    </p>
                    <p className="text-4xl font-black text-yellow-300">
                      {formatNumber(blackMarket.sold_7d)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {prices.length > 0 && (
              <div className="metal-panel overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#110d0a] text-yellow-100/60">
                    <tr>
                      <th className="p-4 text-left">Miasto</th>
                      <th className="p-4 text-right">Sell min</th>
                      <th className="p-4 text-right">Buy max</th>
                      <th className="p-4 text-right">Aktualizacja</th>
                    </tr>
                  </thead>

                  <tbody>
                    {prices.map((price, index) => (
                      <tr key={index} className="border-t border-[#6f5735]/60">
                        <td
                          className={`p-4 font-black ${
                            cityStyles[price.city] || ""
                          }`}
                        >
                          {price.city}
                        </td>
                        <td className="p-4 text-right font-bold">
                          {formatNumber(price.sell_price_min)}
                        </td>
                        <td className="p-4 text-right font-bold">
                          {formatNumber(price.buy_price_max)}
                        </td>
                        <td className="p-4 text-right text-yellow-100/50">
                          {formatDate(
                            price.sell_price_min_date ||
                              price.buy_price_max_date,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
