"use client";

import Image from "next/image";
import { useState } from "react";

import { API_BASE_URL } from "../lib/api";

type ScanResult = {
  item_name: string;
  item_id: string;
  tier?: number;
  enchant?: string;
  quality?: string;
  buy_city: string;
  buy_price: number;
  buy_city_updated_at?: string;
  black_market_price: number;
  black_market_updated_at?: string;
  black_market_sold_7d?: number;
  profit: number;
};

function formatNumber(value: number) {
  return value.toLocaleString("pl-PL");
}

function parseProfitValue(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s/g, "");

  if (!normalized) return 0;

  const match = normalized.match(/^(\d+(?:[.,]\d+)?)(k|m)?$/);
  if (!match) return null;

  const amount = Number(match[1].replace(",", "."));
  const multiplier = match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;

  return Math.round(amount * multiplier);
}

export default function BlackMarketScanner() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [minProfit, setMinProfit] = useState("400000");
  const [tier, setTier] = useState("8");
  const [maxPriceAgeHours, setMaxPriceAgeHours] = useState("24");
  const [error, setError] = useState("");

  async function scanBlackMarket() {
    setLoading(true);
    setHasSearched(true);
    setError("");
    setResults([]);

    const selectedTier = Number(tier);
    const parsedMinProfit = parseProfitValue(minProfit);

    if (parsedMinProfit === null) {
      setLoading(false);
      setError("Wpisz profit jako liczbe, np. 400000, 400k albo 1.5m");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/black-market/scan?minProfit=${parsedMinProfit}&minTier=${selectedTier}&maxTier=${selectedTier}&maxPriceAgeHours=${maxPriceAgeHours}`,
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Błąd skanowania Black Market");
        setResults([]);
        return;
      }

      setResults(
        Array.isArray(data)
          ? data.filter((result) => result.profit >= parsedMinProfit)
          : [],
      );
    } catch (err) {
      console.error("SCAN ERROR:", err);
      setError("Nie udało się połączyć z backendem");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="metal-panel p-6 mb-6">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 mb-5">
        <div>
          <h3 className="text-2xl font-black text-yellow-300">
            Black Market Scanner
          </h3>

          <p className="text-yellow-100/60 text-sm">
            Skanuje craftowalne itemy z wybranego tieru, które można kupić w
            mieście i sprzedać instant na Black Market.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="albion-input px-3 py-3 rounded-xl w-full sm:w-36 text-yellow-100 outline-none"
          >
            <option value="4">T4</option>
            <option value="5">T5</option>
            <option value="6">T6</option>
            <option value="7">T7</option>
            <option value="8">T8</option>
          </select>

          <input
            type="text"
            inputMode="numeric"
            value={minProfit}
            onChange={(e) => setMinProfit(e.target.value)}
            className="albion-input px-3 py-3 rounded-xl w-full sm:w-44 text-yellow-100 outline-none"
            placeholder="Min profit, np. 400k"
          />

          <select
            value={maxPriceAgeHours}
            onChange={(e) => setMaxPriceAgeHours(e.target.value)}
            className="albion-input px-3 py-3 rounded-xl w-full sm:w-36 text-yellow-100 outline-none"
          >
            <option value="4">Ceny max 4h</option>
            <option value="12">Ceny max 12h</option>
            <option value="24">Ceny max 24h</option>
          </select>

          <button
            type="button"
            onClick={scanBlackMarket}
            disabled={loading}
            className="px-5 py-3 rounded-xl font-black text-black bg-gradient-to-b from-yellow-300 to-yellow-600 disabled:opacity-60"
          >
            {loading ? "Skanuję..." : "Scan Black Market"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="albion-input rounded-xl p-5 mb-4 text-yellow-100/70">
          Szukam okazji na Black Market w T{tier}.0-.3, quality 1-5, ceny max{" "}
          {maxPriceAgeHours}h...
        </div>
      )}

      {!loading && !hasSearched && (
        <div className="albion-input rounded-xl p-5 mb-4 text-yellow-100/60">
          Wpisz minimalny profit i kliknij Scan Black Market.
        </div>
      )}

      {!loading && hasSearched && (
        <p className="text-yellow-100/60 text-sm mb-4">
          Znaleziono: {results.length}
        </p>
      )}

      {error && <p className="text-red-400 font-bold mb-4">{error}</p>}

      {!loading && hasSearched && results.length === 0 && !error && (
        <div className="albion-input rounded-xl p-5 mb-4">
          <p className="text-yellow-300 font-black mb-1">
            Nie znaleziono okazji.
          </p>

          <p className="text-yellow-100/60 text-sm">
            Spróbuj zmniejszyć minimalny profit, np. 10000, 1000 albo 1.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#6f5735]/60">
          <table className="w-full">
            <thead className="bg-[#110d0a] text-yellow-100/60">
              <tr>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Kup w</th>
                <th className="p-3 text-right">Cena kupna</th>
                <th className="p-3 text-right">BM instant</th>
                <th className="p-3 text-right">BM szt. 7d</th>
                <th className="p-3 text-right">Profit</th>
              </tr>
            </thead>

            <tbody>
              {results.map((result, index) => (
                <tr key={index} className="border-t border-[#6f5735]/60">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Image
                        src={`https://render.albiononline.com/v1/item/${result.item_id}.png`}
                        alt={result.item_name}
                        width={40}
                        height={40}
                        unoptimized
                        className="w-10 h-10 bg-[#110d0a] rounded-lg border border-[#8d7248] p-1"
                      />

                      <span className="font-black text-yellow-100">
                        {result.item_name}
                      </span>
                      {result.tier && (
                        <span className="text-xs text-yellow-100/50">
                          T{result.tier}.{result.enchant || "0"}
                          {result.quality ? ` Q${result.quality}` : ""}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3 text-yellow-100/80">{result.buy_city}</td>

                  <td className="p-3 text-right">
                    {formatNumber(result.buy_price)}
                  </td>

                  <td className="p-3 text-right">
                    {formatNumber(result.black_market_price)}
                  </td>

                  <td className="p-3 text-right text-yellow-100/80">
                    {formatNumber(result.black_market_sold_7d || 0)}
                  </td>

                  <td className="p-3 text-right text-green-400 font-black">
                    +{formatNumber(result.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
