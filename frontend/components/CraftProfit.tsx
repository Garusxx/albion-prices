"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  itemName: string;
  itemId: string;
  quality: string;
};

type Material = {
  item_id: string;
  amount: number;
  price: number;
  city: string;
  updated: string;
  total: number;
};

type CraftResult = {
  item_id: string;
  base_item_id: string;
  enchant: string;
  quality: string;
  sellPrice: number;
  sellCity: string;
  sellUpdated: string;
  returnRate: number;
  stationFee: number;
  focusCost: number;
  materials: Material[];
  rawMaterialCost: number;
  returnedValue: number;
  realMaterialCost: number;
  totalCost: number;
  revenue: number;
  profit: number;
  margin: number;
  profitPerFocus: number;
};

type ApiError = {
  error: string;
};

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "-";
  return Math.round(value).toLocaleString("pl-PL");
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pl-PL");
}

function isApiError(data: CraftResult | ApiError): data is ApiError {
  return "error" in data;
}

function recalculateResult(
  baseResult: CraftResult,
  materials: Material[],
  sellPrice: number,
  returnRate: number,
  stationFee: number,
  focusCost: number,
): CraftResult {
  const rawMaterialCost = materials.reduce(
    (sum, material) => sum + material.price * material.amount,
    0,
  );

  const returnedValue = rawMaterialCost * (returnRate / 100);
  const realMaterialCost = rawMaterialCost - returnedValue;
  const totalCost = realMaterialCost + stationFee;
  const revenue = sellPrice;
  const profit = revenue - totalCost;
  const margin = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const profitPerFocus = focusCost > 0 ? profit / focusCost : 0;

  return {
    ...baseResult,
    sellPrice,
    returnRate,
    stationFee,
    focusCost,
    materials,
    rawMaterialCost,
    returnedValue,
    realMaterialCost,
    totalCost,
    revenue,
    profit,
    margin,
    profitPerFocus,
  };
}

export default function CraftProfit({ itemName, itemId, quality }: Props) {
  const [returnRate, setReturnRate] = useState(15.2);
  const [stationFee, setStationFee] = useState(0);
  const [focusCost, setFocusCost] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [result, setResult] = useState<CraftResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchRecipeAndCalculate() {
    setLoading(true);
    setError("");
    setResult(null);
    setMaterials([]);

    try {
      const safeItemId = encodeURIComponent(itemId);

      const response = await fetch(
        `http://localhost:4000/api/craft-profit/${safeItemId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            returnRate,
            stationFee,
            focusCost,
            sellPrice,
            quality: 1,
          }),
        },
      );

      const data = (await response.json()) as CraftResult | ApiError;

      if (!response.ok || isApiError(data)) {
        setError(isApiError(data) ? data.error : "Błąd liczenia craft profitu");
        return;
      }

      setResult(data);
      setMaterials(data.materials);
      setSellPrice(data.sellPrice);
    } catch (requestError) {
      console.error("CRAFT PROFIT ERROR:", requestError);
      setError("Nie udało się połączyć z backendem");
    } finally {
      setLoading(false);
    }
  }

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

  function calculateManualProfit() {
    if (!result) return;

    const newResult = recalculateResult(
      result,
      materials,
      sellPrice,
      returnRate,
      stationFee,
      focusCost,
    );

    setResult(newResult);
  }

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="albion-input rounded-xl p-4">
          <label className="text-yellow-100/60 text-sm">Sell price</label>
          <input
            type="number"
            value={sellPrice}
            onChange={(event) => setSellPrice(Number(event.target.value))}
            className="w-full mt-2 bg-transparent text-2xl font-black text-yellow-300 outline-none"
          />
          {result && (
            <p className="text-xs text-yellow-100/50 mt-2">
              Miasto: {result.sellCity}
            </p>
          )}
        </div>

        <div className="albion-input rounded-xl p-4">
          <label className="text-yellow-100/60 text-sm">Zwrot %</label>
          <input
            type="number"
            value={returnRate}
            onChange={(event) => setReturnRate(Number(event.target.value))}
            className="w-full mt-2 bg-transparent text-2xl font-black text-yellow-300 outline-none"
          />
        </div>

        <div className="albion-input rounded-xl p-4">
          <label className="text-yellow-100/60 text-sm">Station fee</label>
          <input
            type="number"
            value={stationFee}
            onChange={(event) => setStationFee(Number(event.target.value))}
            className="w-full mt-2 bg-transparent text-2xl font-black text-yellow-300 outline-none"
          />
        </div>

        <div className="albion-input rounded-xl p-4">
          <label className="text-yellow-100/60 text-sm">Focus cost</label>
          <input
            type="number"
            value={focusCost}
            onChange={(event) => setFocusCost(Number(event.target.value))}
            className="w-full mt-2 bg-transparent text-2xl font-black text-yellow-300 outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={result ? calculateManualProfit : fetchRecipeAndCalculate}
        disabled={loading}
        className="w-full py-4 rounded-xl font-black text-black bg-gradient-to-b from-yellow-300 to-yellow-600 disabled:opacity-60 mb-6"
      >
        {loading
          ? "Pobieram ceny..."
          : result
            ? "Przelicz profit"
            : "Pobierz materiały i oblicz"}
      </button>

      {error && <p className="text-red-400 font-bold mb-5">{error}</p>}

      {!result && !loading && !error && (
        <div className="albion-input rounded-xl p-5 text-yellow-100/60 mb-6">
          Kliknij przycisk, żeby pobrać recepturę, wszystkie materiały,
          najniższe ceny i miasta.
        </div>
      )}

      {materials.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#6f5735]/60 mb-6">
          <table className="w-full">
            <thead className="bg-[#110d0a] text-yellow-100/60">
              <tr>
                <th className="p-3 text-left">Materiał</th>
                <th className="p-3 text-right">Ilość</th>
                <th className="p-3 text-right">Cena / szt.</th>
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
                      onChange={(event) =>
                        updateMaterialPrice(index, Number(event.target.value))
                      }
                      className="albion-input px-3 py-2 rounded-lg w-32 text-right text-yellow-100 outline-none"
                    />
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

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="albion-input rounded-xl p-5">
            <p className="text-yellow-100/60 text-sm">Koszt materiałów</p>
            <p className="text-3xl font-black text-yellow-300">
              {formatNumber(result.rawMaterialCost)}
            </p>
          </div>

          <div className="albion-input rounded-xl p-5">
            <p className="text-yellow-100/60 text-sm">Wartość zwrotu</p>
            <p className="text-3xl font-black text-cyan-300">
              -{formatNumber(result.returnedValue)}
            </p>
          </div>

          <div className="albion-input rounded-xl p-5">
            <p className="text-yellow-100/60 text-sm">Realny koszt</p>
            <p className="text-3xl font-black text-yellow-300">
              {formatNumber(result.totalCost)}
            </p>
          </div>

          <div className="albion-input rounded-xl p-5">
            <p className="text-yellow-100/60 text-sm">Profit</p>
            <p
              className={`text-3xl font-black ${
                result.profit >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {result.profit >= 0 ? "+" : ""}
              {formatNumber(result.profit)}
            </p>
          </div>

          <div className="albion-input rounded-xl p-5">
            <p className="text-yellow-100/60 text-sm">Margin</p>
            <p
              className={`text-3xl font-black ${
                result.margin >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {result.margin.toFixed(1)}%
            </p>
          </div>

          <div className="albion-input rounded-xl p-5">
            <p className="text-yellow-100/60 text-sm">Profit / focus</p>
            <p className="text-3xl font-black text-yellow-300">
              {focusCost > 0 ? result.profitPerFocus.toFixed(2) : "-"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
