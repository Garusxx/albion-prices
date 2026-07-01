import express from "express";
import { cities, items } from "../data/items.js";
import { getNumber } from "../utils/numbers.js";
import {
  fetchAlbionPrices,
  findItemInDump,
  getItemsDump,
  getPriceQualityForItem,
} from "../utils/albionApi.js";

const router = express.Router();

router.get("/scan", async (req, res) => {
  const minProfit = getNumber(req.query.minProfit, 400000);
  const quality = String(req.query.quality || "1");

  const t8Items = items.map((item) => ({
    name: item.name,
    id: `T8_${item.id}`,
  }));

  const results = [];

  try {
    const data = await fetchAlbionPrices(
      t8Items.map((item) => item.id),
      quality,
      cities,
    );

    for (const item of t8Items) {
      const itemPrices = data.filter((price) => price.item_id === item.id);

      const blackMarket = itemPrices.find(
        (price) =>
          price.city === "Black Market" || price.city === "BlackMarket",
      );

      if (!blackMarket || !blackMarket.buy_price_max) continue;

      const cityPrices = itemPrices.filter(
        (price) =>
          price.city !== "Black Market" &&
          price.city !== "BlackMarket" &&
          price.sell_price_min > 0,
      );

      for (const city of cityPrices) {
        const profit = blackMarket.buy_price_max - city.sell_price_min;

        if (profit >= minProfit) {
          results.push({
            item_name: item.name,
            item_id: item.id,
            buy_city: city.city,
            buy_price: city.sell_price_min,
            black_market_price: blackMarket.buy_price_max,
            profit,
          });
        }
      }
    }

    results.sort((a, b) => b.profit - a.profit);

    res.json(results);
  } catch (error) {
    console.error("BLACK MARKET SCAN ERROR:", error);

    res.status(500).json({
      error: "Nie udało się zeskanować Black Market",
    });
  }
});

router.get("/:itemId", async (req, res) => {
  const { itemId } = req.params;
  const quality = String(req.query.quality || "1");
  const baseItemId = decodeURIComponent(itemId).split("@")[0];

  try {
    const itemsDump = await getItemsDump();
    const item = findItemInDump(itemsDump, baseItemId);
    const priceQuality = getPriceQualityForItem(item, quality);
    const url = `https://europe.albion-online-data.com/api/v2/stats/history/${itemId}.json?locations=BlackMarket&qualities=${priceQuality}&time-scale=24`;

    const response = await fetch(url);
    const data = await response.json();

    const history = data[0]?.data || [];
    const last7Days = history.slice(-7);

    const totalSold = last7Days.reduce(
      (sum, day) => sum + getNumber(day.item_count),
      0,
    );

    const totalValue = last7Days.reduce(
      (sum, day) => sum + getNumber(day.avg_price) * getNumber(day.item_count),
      0,
    );

    const avgPrice = totalSold > 0 ? Math.round(totalValue / totalSold) : 0;

    res.json({
      item_id: itemId,
      quality: priceQuality,
      avg_price_7d: avgPrice,
      sold_7d: totalSold,
      days: last7Days,
    });
  } catch (error) {
    console.error("BLACK MARKET HISTORY ERROR:", error);

    res.status(500).json({
      error: "Nie udało się pobrać historii Black Market",
    });
  }
});

export default router;
