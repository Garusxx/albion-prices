import express from "express";
import { cities } from "../data/items.js";
import { getNumber } from "../utils/numbers.js";
import {
  fetchAlbionPrices,
  findItemInDump,
  getFormattedItemName,
  getFormattedItemUniqueName,
  getFormattedItemsDump,
  getItemsDump,
  getPriceQualityForItem,
} from "../utils/albionApi.js";

const router = express.Router();
const SCAN_BATCH_SIZE = 100;
const DEFAULT_SCAN_LIMIT = 1200;
const DEFAULT_MAX_PRICE_AGE_HOURS = 24;

function chunkItems(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function getItemTier(itemId, item) {
  const explicitTier = getNumber(item?.["@tier"], 0);
  if (explicitTier > 0) return explicitTier;

  const [, tier] = itemId.match(/^T(\d+)_/) || [];
  return getNumber(tier, 0);
}

function shouldScanBlackMarketItem(item, minTier, maxTier) {
  const itemId = item?.["@uniquename"] || "";
  const tier = getItemTier(itemId, item);

  if (!itemId || tier < minTier || tier > maxTier) return false;
  if (itemId.includes("@")) return false;
  if (item?.["@showinmarketplace"] === "false") return false;
  if (!item?.craftingrequirements) return false;

  return true;
}

function buildEnchantedItemId(baseItemId, enchant) {
  return enchant === "0" ? baseItemId : `${baseItemId}@${enchant}`;
}

function getScanQualities(item) {
  const maxQualityLevel = getNumber(item?.["@maxqualitylevel"], 1);

  if (maxQualityLevel <= 1) return ["1"];

  return Array.from({ length: Math.min(maxQualityLevel, 5) }, (_, index) =>
    String(index + 1),
  );
}

function buildNameLookup(formattedItems) {
  return new Map(
    formattedItems.map((item) => [
      getFormattedItemUniqueName(item),
      getFormattedItemName(item),
    ]),
  );
}

function groupItemsByQuality(items) {
  const groups = new Map();

  for (const item of items) {
    const group = groups.get(item.quality) || [];
    group.push(item);
    groups.set(item.quality, group);
  }

  return groups;
}

function getHistoryLookupKey(itemId, quality) {
  return `${itemId}|${quality}`;
}

function isFreshPrice(priceDate, maxAgeHours) {
  const updatedAt = new Date(priceDate).getTime();

  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return false;

  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  return Date.now() - updatedAt <= maxAgeMs;
}

async function fetchBlackMarketSold7d(results) {
  const soldByItem = new Map();
  const resultsByQuality = groupItemsByQuality(results);

  for (const [quality, qualityResults] of resultsByQuality) {
    const itemIds = [
      ...new Set(qualityResults.map((result) => result.item_id)),
    ];

    for (const batch of chunkItems(itemIds, SCAN_BATCH_SIZE)) {
      const url = `https://europe.albion-online-data.com/api/v2/stats/history/${batch
        .map((itemId) => encodeURIComponent(itemId))
        .join(",")}.json?locations=BlackMarket&qualities=${quality}&time-scale=24`;

      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();
      const historyItems = Array.isArray(data) ? data : [];

      for (const historyItem of historyItems) {
        const itemId = historyItem.item_id;
        const itemQuality = String(historyItem.quality || quality);
        const history = Array.isArray(historyItem.data)
          ? historyItem.data
          : [];
        const sold7d = history
          .slice(-7)
          .reduce((sum, day) => sum + getNumber(day.item_count), 0);

        soldByItem.set(getHistoryLookupKey(itemId, itemQuality), sold7d);
      }
    }
  }

  return soldByItem;
}

router.get("/scan", async (req, res) => {
  const minProfit = getNumber(req.query.minProfit, 400000);
  const maxResults = getNumber(req.query.maxResults, 250);
  const minTier = getNumber(req.query.minTier, 6);
  const maxTier = getNumber(req.query.maxTier, minTier);
  const scanLimit = getNumber(req.query.scanLimit, DEFAULT_SCAN_LIMIT);
  const maxPriceAgeHours = getNumber(
    req.query.maxPriceAgeHours || req.query.maxBmPriceAgeHours,
    DEFAULT_MAX_PRICE_AGE_HOURS,
  );
  const enchants = ["0", "1", "2", "3"];

  const results = [];

  try {
    const [itemsDump, formattedItems] = await Promise.all([
      getItemsDump(),
      getFormattedItemsDump(),
    ]);
    const namesById = buildNameLookup(formattedItems);
    const baseScanItems = itemsDump
      .filter((item) => shouldScanBlackMarketItem(item, minTier, maxTier))
      .sort(
        (a, b) =>
          getItemTier(b["@uniquename"], b) - getItemTier(a["@uniquename"], a) ||
          a["@uniquename"].localeCompare(b["@uniquename"]),
      )
      .slice(0, scanLimit);

    const scanItems = baseScanItems.flatMap((item) => {
      const baseId = item["@uniquename"];
      const baseName = namesById.get(baseId) || baseId;
      const qualities = getScanQualities(item);
      const tier = getItemTier(baseId, item);

      return enchants.flatMap((enchant) =>
        qualities.map((itemQuality) => ({
          id: buildEnchantedItemId(baseId, enchant),
          name: enchant === "0" ? baseName : `${baseName} .${enchant}`,
          quality: itemQuality,
          tier,
          enchant,
        })),
      );
    });

    const itemsByQuality = groupItemsByQuality(scanItems);

    for (const [priceQuality, qualityItems] of itemsByQuality) {
      for (const batch of chunkItems(qualityItems, SCAN_BATCH_SIZE)) {
        const data = await fetchAlbionPrices(
          batch.map((item) => item.id),
          priceQuality,
          cities,
        );

        for (const item of batch) {
          const itemPrices = data.filter((price) => price.item_id === item.id);

          const blackMarket = itemPrices.find(
            (price) =>
              price.city === "Black Market" || price.city === "BlackMarket",
          );

          if (!blackMarket || !blackMarket.buy_price_max) continue;
          if (!isFreshPrice(blackMarket.buy_price_max_date, maxPriceAgeHours)) {
            continue;
          }

          const cityPrices = itemPrices.filter(
            (price) =>
              price.city !== "Black Market" &&
              price.city !== "BlackMarket" &&
              price.sell_price_min > 0 &&
              isFreshPrice(price.sell_price_min_date, maxPriceAgeHours),
          );

          for (const city of cityPrices) {
            const profit = blackMarket.buy_price_max - city.sell_price_min;

            if (profit >= minProfit) {
              results.push({
                item_name: item.name,
                item_id: item.id,
                tier: item.tier,
                enchant: item.enchant,
                quality: priceQuality,
                buy_city: city.city,
                buy_price: city.sell_price_min,
                buy_city_updated_at: city.sell_price_min_date,
                black_market_price: blackMarket.buy_price_max,
                black_market_updated_at: blackMarket.buy_price_max_date,
                profit,
              });
            }
          }
        }
      }
    }

    results.sort((a, b) => b.profit - a.profit);

    const topResults = results.slice(0, maxResults);
    const soldByItem = await fetchBlackMarketSold7d(topResults);

    res.json(
      topResults.map((result) => ({
        ...result,
        black_market_sold_7d:
          soldByItem.get(getHistoryLookupKey(result.item_id, result.quality)) ||
          0,
      })),
    );
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
