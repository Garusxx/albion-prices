"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import BlackMarketScanner from "../components/BlackMarketScanner";
import MarketSearch from "../components/MarketSearch";
import MarketPrices from "../components/MarketPrices";
import BlackMarketStatsBox from "../components/BlackMarketStatsBox";
import CraftProfit from "../components/CraftProfit";
import { API_BASE_URL } from "../lib/api";

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

export type CraftProfitResult = {
  sellPrice: number;
  sellCity: string;
  sellUpdated: string;
  rawMaterialCost: number;
  returnableMaterialCost: number;
  activeReturn: number;
  returnedValue: number;
  realMaterialCost: number;
  marketFee: number;
  totalCost: number;
  revenue: number;
  profit: number;
  margin: number;
};

export type CraftData = {
  item_id: string;
  base_item_id: string;
  enchant: string;
  quality: string;

  useFocus: boolean;
  baseReturn: number;
  focusBonus: number;
  activeReturn: number;
  marketFeePercent: number;
  specLevel: number;

  materials: {
    item_id: string;
    amount: number;
    returnable: boolean;
    price: number;
    city: string;
    updated: string;
    total: number;
  }[];

  missingMaterialPrices: boolean;
  selectedRecipeIndex?: number;
  recipeOptionsCount?: number;

  market: CraftProfitResult | null;
  blackMarket: CraftProfitResult | null;
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
  const [selectedItemName, setSelectedItemName] = useState("Adept's Bag");
  const [itemSearch, setItemSearch] = useState("Adept's Bag");
  const [itemResults, setItemResults] = useState<ItemResult[]>([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  const [enchant, setEnchant] = useState("0");
  const [quality, setQuality] = useState("1");

  const [prices, setPrices] = useState<Price[]>([]);
  const [blackMarket, setBlackMarket] = useState<BlackMarketStats | null>(null);
  const [craftData, setCraftData] = useState<CraftData | null>(null);

  const [loading, setLoading] = useState(false);
  const [searchedItem, setSearchedItem] = useState("T4_BAG");
  const [error, setError] = useState("");

  useEffect(() => {
    let ignoreResult = false;

    async function fetchSelectedItemName() {
      try {
        const itemId = `${tier}_${itemType}`;
        const response = await fetch(
          `${API_BASE_URL}/api/items/name/${encodeURIComponent(itemId)}`,
        );

        if (!response.ok) return;

        const data = await response.json();
        if (ignoreResult || typeof data.name !== "string") return;

        setSelectedItemName(data.name);
        setItemSearch(data.name);
      } catch (requestError) {
        console.error("ITEM NAME ERROR:", requestError);
      }
    }

    fetchSelectedItemName();

    return () => {
      ignoreResult = true;
    };
  }, [tier, itemType]);

  async function searchItems(value: string) {
    setItemSearch(value);
    setShowItemDropdown(true);

    if (value.trim().length < 2) {
      setItemResults([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/items/search?q=${encodeURIComponent(value)}&tier=${tier}`,
      );

      const data = await response.json();

      if (!response.ok) {
        setItemResults([]);
        return;
      }

      setItemResults(Array.isArray(data) ? data : []);
    } catch (requestError) {
      console.error("ITEM SEARCH ERROR:", requestError);
      setItemResults([]);
    }
  }

  function selectItem(item: ItemResult) {
    setItemType(item.id);
    setItemSearch(item.name);
    setSelectedItemName(item.name);
    setItemResults([]);
    setShowItemDropdown(false);
  }

  async function fetchItemData() {
    const itemId = buildItemId(tier, itemType, enchant);

    setLoading(true);
    setError("");
    setSearchedItem(itemId);
    setPrices([]);
    setBlackMarket(null);
    setCraftData(null);

    try {
      const safeItemId = encodeURIComponent(itemId);

      const [pricesResponse, blackMarketResponse, craftResponse] =
        await Promise.all([
          fetch(
            `${API_BASE_URL}/api/prices/${safeItemId}?quality=${quality}`,
          ),
          fetch(
            `${API_BASE_URL}/api/black-market/${safeItemId}?quality=${quality}`,
          ),
          fetch(`${API_BASE_URL}/api/craft-profit/${safeItemId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              useFocus: false,
              baseReturn: 15.2,
              focusBonus: 28.3,
              marketFeePercent: 0,
              specLevel: 0,
              quality,
            }),
          }),
        ]);

      const pricesData = await pricesResponse.json();
      const blackMarketData = await blackMarketResponse.json();
      const craftResult = await craftResponse.json();

      if (pricesResponse.ok && Array.isArray(pricesData)) {
        setPrices(pricesData.filter((p: Price) => p.city !== "BlackMarket"));
      }

      if (blackMarketResponse.ok) {
        setBlackMarket(blackMarketData);
      }

      if (craftResponse.ok) {
        setCraftData(craftResult);
      }
    } catch (requestError) {
      console.error("FETCH ITEM DATA ERROR:", requestError);
      setError("Nie udało się pobrać danych z backendu");
    } finally {
      setLoading(false);
    }
  }

  const selectedQualityLabel = qualities.find(
    (q) => q.value === quality,
  )?.label;

  const displayItemName = `${selectedItemName}${enchant !== "0" ? ` .${enchant}` : ""}`;

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
                fetchPrices={fetchItemData}
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

              {error && <p className="text-red-400 font-bold mb-4">{error}</p>}

              {loading && (
                <p className="text-yellow-100/70 mb-4">
                  Pobieram ceny, Black Market i materiały...
                </p>
              )}

              {albionTab === "prices" && (
                <>
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
                  craftData={craftData}
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
