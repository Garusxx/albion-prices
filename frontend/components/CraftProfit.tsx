"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { CraftData, CraftProfitResult } from "../app/page";

type Props = {
  itemName: string;
  itemId: string;
  quality: string;
  craftData: CraftData | null;
};

type Material = CraftData["materials"][number];

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "-";
  return Math.round(value).toLocaleString("pl-PL");
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pl-PL");
}

function calculateResult({
  materials,
  sellPrice,
  baseReturn,
  focusBonus,
  useFocus,
  marketFeePercent,
}: {
  materials: Material[];
  sellPrice: number;
  baseReturn: number;
  focusBonus: number;
  useFocus: boolean;
  marketFeePercent: number;
}): CraftProfitResult {
  const rawMaterialCost = materials.reduce(
    (sum, material) => sum + material.price * material.amount,
    0,
  );
  const returnableMaterialCost = materials
    .filter((material) => material.returnable !== false)
    .reduce((sum, material) => sum + material.price * material.amount, 0);

  const activeReturn = baseReturn + (useFocus ? focusBonus : 0);
  const returnedValue = returnableMaterialCost * (activeReturn / 100);
  const realMaterialCost = rawMaterialCost - returnedValue;
  const marketFee = sellPrice * (marketFeePercent / 100);
  const totalCost = realMaterialCost + marketFee;
  const revenue = sellPrice;
  const profit = revenue - totalCost;
  const margin = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  return {
    sellPrice,
    sellCity: "-",
    sellUpdated: "",
    rawMaterialCost,
    returnableMaterialCost,
    activeReturn,
    returnedValue,
    realMaterialCost,
    marketFee,
    totalCost,
    revenue,
    profit,
    margin,
  };
}

function ProfitBox({
  title,
  result,
}: {
  title: string;
  result: CraftProfitResult | null;
}) {
  if (!result) {
    return (
      <div className="albion-input rounded-xl p-5 text-yellow-100/60">
        Brak danych.
      </div>
    );
  }

  return (
    <div className="albion-input rounded-xl p-5">
      <h4 className="text-xl font-black text-yellow-300 mb-4">{title}</h4>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <p className="text-yellow-100/60">Sell price</p>
        <p className="text-right font-bold">{formatNumber(result.sellPrice)}</p>

        <p className="text-yellow-100/60">Material cost</p>
        <p className="text-right font-bold">
          {formatNumber(result.rawMaterialCost)}
        </p>

        <p className="text-yellow-100/60">Returnable cost</p>
        <p className="text-right font-bold">
          {formatNumber(result.returnableMaterialCost)}
        </p>

        <p className="text-yellow-100/60">Return</p>
        <p className="text-right font-bold">
          {result.activeReturn.toFixed(1)}%
        </p>

        <p className="text-yellow-100/60">Return value</p>
        <p className="text-right font-bold text-cyan-300">
          -{formatNumber(result.returnedValue)}
        </p>

        <p className="text-yellow-100/60">Market fee</p>
        <p className="text-right font-bold">{formatNumber(result.marketFee)}</p>

        <p className="text-yellow-100/60">Total cost</p>
        <p className="text-right font-bold">{formatNumber(result.totalCost)}</p>

        <p className="text-yellow-100/60">Profit</p>
        <p
          className={`text-right font-black ${
            result.profit >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {result.profit >= 0 ? "+" : ""}
          {formatNumber(result.profit)}
        </p>

        <p className="text-yellow-100/60">Margin</p>
        <p
          className={`text-right font-black ${
            result.margin >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {result.margin.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

function CraftProfitContent({ craftData }: { craftData: CraftData }) {
  const [materials, setMaterials] = useState<Material[]>(craftData.materials);
  const [lastCalculatedAt, setLastCalculatedAt] = useState("");

  const [marketSellPrice, setMarketSellPrice] = useState(
    craftData.market?.sellPrice || 0,
  );

  const [blackMarketSellPrice, setBlackMarketSellPrice] = useState(
    craftData.blackMarket?.sellPrice || 0,
  );

  const [useFocus, setUseFocus] = useState(craftData.useFocus);
  const [specLevel, setSpecLevel] = useState(craftData.specLevel);
  const [marketFeePercent, setMarketFeePercent] = useState(
    craftData.marketFeePercent,
  );

  const [baseReturn, setBaseReturn] = useState(craftData.baseReturn);
  const [focusBonus, setFocusBonus] = useState(craftData.focusBonus);

  const marketResult = useMemo(() => {
    const nextMarket = calculateResult({
      materials,
      sellPrice: marketSellPrice,
      baseReturn,
      focusBonus,
      useFocus,
      marketFeePercent,
    });

    return {
      ...nextMarket,
      sellCity: craftData.market?.sellCity || "-",
      sellUpdated: craftData.market?.sellUpdated || "",
    };
  }, [
    baseReturn,
    craftData.market?.sellCity,
    craftData.market?.sellUpdated,
    focusBonus,
    marketFeePercent,
    marketSellPrice,
    materials,
    useFocus,
  ]);

  const blackMarketResult = useMemo(() => {
    const nextBlackMarket = calculateResult({
      materials,
      sellPrice: blackMarketSellPrice,
      baseReturn,
      focusBonus,
      useFocus,
      marketFeePercent,
    });

    return {
      ...nextBlackMarket,
      sellCity: craftData.blackMarket?.sellCity || "BlackMarket",
      sellUpdated: craftData.blackMarket?.sellUpdated || "",
    };
  }, [
    baseReturn,
    blackMarketSellPrice,
    craftData.blackMarket?.sellCity,
    craftData.blackMarket?.sellUpdated,
    focusBonus,
    marketFeePercent,
    materials,
    useFocus,
  ]);

  function updateMaterialPrice(index: number, value: number) {
    setMaterials((prev) =>
      prev.map((material, currentIndex) =>
        currentIndex === index
          ? {
              ...material,
              price: value,
              total: value * material.amount,
              city: "manual",
            }
          : material,
      ),
    );
  }

  function calculateProfit() {
    setLastCalculatedAt(new Date().toLocaleTimeString("pl-PL"));
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="albion-input rounded-xl p-4">
          <label className="text-yellow-100/60 text-sm">Market buy offer</label>
          <input
            type="number"
            value={marketSellPrice}
            onChange={(e) => setMarketSellPrice(Number(e.target.value))}
            className="w-full mt-2 bg-transparent text-2xl font-black text-yellow-300 outline-none"
          />
          <p className="text-xs text-yellow-100/50 mt-2">
            Miasto: {craftData.market?.sellCity || "-"}
          </p>
        </div>

        <div className="albion-input rounded-xl p-4">
          <label className="text-yellow-100/60 text-sm">Black Market buy</label>
          <input
            type="number"
            value={blackMarketSellPrice}
            onChange={(e) => setBlackMarketSellPrice(Number(e.target.value))}
            className="w-full mt-2 bg-transparent text-2xl font-black text-yellow-300 outline-none"
          />
          <p className="text-xs text-yellow-100/50 mt-2">BlackMarket</p>
        </div>

        <div className="albion-input rounded-xl p-4">
          <label className="flex items-center gap-2 text-yellow-100/70 text-sm">
            <input
              type="checkbox"
              checked={useFocus}
              onChange={(e) => setUseFocus(e.target.checked)}
            />
            Use focus
          </label>
          <p className="text-xs text-yellow-100/50 mt-3">
            Focus dodaje bonus do returnu.
          </p>
        </div>

        <div className="albion-input rounded-xl p-4">
          <label className="text-yellow-100/60 text-sm">Spec level</label>
          <input
            type="number"
            value={specLevel}
            onChange={(e) => setSpecLevel(Number(e.target.value))}
            className="w-full mt-2 bg-transparent text-2xl font-black text-yellow-300 outline-none"
          />
          <p className="text-xs text-yellow-100/50 mt-2">
            Specki = większa szansa na lepszą quality.
          </p>
        </div>

        <div className="albion-input rounded-xl p-4">
          <label className="text-yellow-100/60 text-sm">Market fee %</label>
          <input
            type="number"
            value={marketFeePercent}
            onChange={(e) => setMarketFeePercent(Number(e.target.value))}
            className="w-full mt-2 bg-transparent text-2xl font-black text-yellow-300 outline-none"
          />
        </div>

        <div className="albion-input rounded-xl p-4">
          <label className="text-yellow-100/60 text-sm">Base return %</label>
          <input
            type="number"
            value={baseReturn}
            onChange={(e) => setBaseReturn(Number(e.target.value))}
            className="w-full mt-2 bg-transparent text-2xl font-black text-yellow-300 outline-none"
          />
        </div>

        <div className="albion-input rounded-xl p-4">
          <label className="text-yellow-100/60 text-sm">Focus bonus %</label>
          <input
            type="number"
            value={focusBonus}
            disabled={!useFocus}
            onChange={(e) => setFocusBonus(Number(e.target.value))}
            className="w-full mt-2 bg-transparent text-2xl font-black text-yellow-300 outline-none disabled:opacity-40"
          />
        </div>
      </div>

      {materials.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#6f5735]/60 mb-6">
          <table className="w-full">
            <thead className="bg-[#110d0a] text-yellow-100/60">
              <tr>
                <th className="p-3 text-left">Materiał</th>
                <th className="p-3 text-right">Ilość</th>
                <th className="p-3 text-right">Cena / szt.</th>
                <th className="p-3 text-center">Zwrot</th>
                <th className="p-3 text-left">Miasto</th>
                <th className="p-3 text-right">Suma</th>
                <th className="p-3 text-right">Update</th>
              </tr>
            </thead>

            <tbody>
              {materials.map((material, index) => (
                <tr
                  key={`${material.item_id}-${index}`}
                  className="border-t border-[#6f5735]/60"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Image
                        src={`https://render.albiononline.com/v1/item/${material.item_id}.png`}
                        alt={material.item_id}
                        width={40}
                        height={40}
                        unoptimized
                        className="w-10 h-10 bg-[#110d0a] rounded-lg border border-[#8d7248] p-1"
                      />
                      <span className="font-black text-yellow-100">
                        {material.item_id}
                      </span>
                    </div>
                  </td>

                  <td className="p-3 text-right text-yellow-100">
                    {material.amount}
                  </td>

                  <td className="p-3 text-right">
                    <input
                      type="number"
                      value={material.price}
                      onChange={(e) =>
                        updateMaterialPrice(index, Number(e.target.value))
                      }
                      className="albion-input px-3 py-2 rounded-lg w-32 text-right text-yellow-100 outline-none"
                    />
                  </td>

                  <td className="p-3 text-center text-yellow-100/70">
                    {material.returnable === false ? "nie" : "tak"}
                  </td>

                  <td className="p-3 text-yellow-100/80">{material.city}</td>

                  <td className="p-3 text-right font-bold text-yellow-100">
                    {formatNumber(material.price * material.amount)}
                  </td>

                  <td className="p-3 text-right text-yellow-100/50 text-sm">
                    {formatDate(material.updated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={calculateProfit}
        className="w-full py-4 rounded-xl font-black text-black bg-gradient-to-b from-yellow-300 to-yellow-600 mb-6"
      >
        Oblicz / Przelicz profit
      </button>

      {lastCalculatedAt && (
        <p className="text-yellow-100/50 text-sm mb-4">
          Przeliczono: {lastCalculatedAt}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProfitBox title="Market Profit" result={marketResult} />
        <ProfitBox title="Black Market Profit" result={blackMarketResult} />
      </div>
    </>
  );
}

export default function CraftProfit({
  itemName,
  itemId,
  quality,
  craftData,
}: Props) {
  return (
    <div className="metal-panel p-6">
      <div className="flex items-center gap-5 mb-6">
        <Image
          src={`https://render.albiononline.com/v1/item/${itemId}.png`}
          alt={itemName}
          width={72}
          height={72}
          unoptimized
          className="w-18 h-18 bg-[#110d0a] rounded-xl border-2 border-[#8d7248] p-2"
        />

        <div>
          <h3 className="text-2xl font-black text-yellow-300">Craft Profit</h3>
          <p className="text-yellow-100/60">
            {itemName} / Quality: {quality}
          </p>
        </div>
      </div>

      {!craftData && (
        <div className="albion-input rounded-xl p-5 text-yellow-100/60">
          Kliknij <b>Szukaj</b> po lewej stronie.
        </div>
      )}

      {craftData && (
        <CraftProfitContent
          key={`${craftData.item_id}-${craftData.market?.sellPrice}-${craftData.blackMarket?.sellPrice}`}
          craftData={craftData}
        />
      )}
    </div>
  );
}
