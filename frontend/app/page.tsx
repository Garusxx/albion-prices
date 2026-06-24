"use client";

import Image from "next/image";
import { useState } from "react";

import BlackMarketScanner from "../components/BlackMarketScanner";
import MarketSearch from "../components/MarketSearch";
import MarketPrices from "../components/MarketPrices";
import BlackMarketStatsBox from "../components/BlackMarketStatsBox";
import CraftProfit from "../components/CraftProfit";

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

export function buildItemId(tier: string, itemType: string, enchant: string) {
  const baseId = `${tier}_${itemType}`;
  return enchant === "0" ? baseId : `${baseId}@${enchant}`;
}

export default function Home() {
  const [mainTab, setMainTab] = useState<"albion" | "blackMarket">("albion");
  const [albionTab, setAlbionTab] = useState<"prices" | "craft">("prices");

  const [tier, setTier] = useState("T4");
  const [itemType, setItemType] = useState("BAG");
  const [selectedItemName, setSelectedItemName] = useState("Bag");
  const [itemSearch, setItemSearch] = useState("Bag");
  const [itemResults, setItemResults] = useState<ItemResult[]>([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);

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

  const selectedQualityLabel = qualities.find(
    (q) => q.value === quality,
  )?.label;

  const displayItemName = `${tier} ${selectedItemName}${
    enchant !== "0" ? ` .${enchant}` : ""
  }`;

  return (
    <main className="min-h-screen text-white p-6 bg-gradient-to-b from-[#241a13] via-[#15100c] to-[#090706]">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-black mb-6 text-yellow-300 drop-shadow">
          Albion Tools
        </h1>

        <div className="metal-panel p-2 mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setMainTab("albion")}
            className={`flex-1 py-4 rounded-xl font-black transition ${
              mainTab === "albion"
                ? "metal-button-active"
                : "metal-button text-yellow-100/70"
            }`}
          >
            Albion Market
          </button>

          <button
            type="button"
            onClick={() => setMainTab("blackMarket")}
            className={`flex-1 py-4 rounded-xl font-black transition ${
              mainTab === "blackMarket"
                ? "metal-button-active"
                : "metal-button text-yellow-100/70"
            }`}
          >
            Black Market Scanner
          </button>
        </div>

        {mainTab === "albion" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <aside className="lg:col-span-3">
              <MarketSearch
                tier={tier}
                setTier={setTier}
                itemSearch={itemSearch}
                searchItems={searchItems}
                itemResults={itemResults}
                showItemDropdown={showItemDropdown}
                setShowItemDropdown={setShowItemDropdown}
                selectItem={selectItem}
                enchant={enchant}
                setEnchant={setEnchant}
                quality={quality}
                setQuality={setQuality}
                fetchPrices={fetchPrices}
                activeTab="market"
                buildItemId={buildItemId}
              />
            </aside>

            <section className="lg:col-span-9">
              <div className="metal-panel p-2 mb-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAlbionTab("prices")}
                  className={`flex-1 py-3 rounded-xl font-black transition ${
                    albionTab === "prices"
                      ? "metal-button-active"
                      : "metal-button text-yellow-100/70"
                  }`}
                >
                  Market Prices
                </button>

                <button
                  type="button"
                  onClick={() => setAlbionTab("craft")}
                  className={`flex-1 py-3 rounded-xl font-black transition ${
                    albionTab === "craft"
                      ? "metal-button-active"
                      : "metal-button text-yellow-100/70"
                  }`}
                >
                  Craft Profit
                </button>
              </div>

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
                      {displayItemName}
                    </h2>
                    <p className="text-yellow-100/60">
                      Quality: {selectedQualityLabel}
                    </p>
                  </div>
                </div>
              </div>

              {albionTab === "prices" && (
                <>
                  {loading && (
                    <p className="text-yellow-100/70 mb-4">Ładowanie...</p>
                  )}

                  {blackMarket && (
                    <BlackMarketStatsBox blackMarket={blackMarket} />
                  )}

                  {prices.length > 0 && <MarketPrices prices={prices} />}

                  {!loading && prices.length === 0 && !blackMarket && (
                    <div className="metal-panel p-6 text-yellow-100/60">
                      Wybierz item po lewej stronie i kliknij Szukaj.
                    </div>
                  )}
                </>
              )}

              {albionTab === "craft" && (
                <CraftProfit
                  itemName={displayItemName}
                  itemId={searchedItem}
                  quality={selectedQualityLabel || "Normal"}
                />
              )}
            </section>
          </div>
        )}

        {mainTab === "blackMarket" && <BlackMarketScanner />}
      </div>
    </main>
  );
}
