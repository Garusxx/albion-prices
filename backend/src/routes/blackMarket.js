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
const DEFAULT_MIN_PROFIT = 1;
const DEFAULT_MAX_PRICE_AGE_HOURS = 24;
const BLACK_MARKET_ITEM_PATTERNS = [
  /^T\d+_2H_/,
  /^T\d+_MAIN_/,
  /^T\d+_OFF_/,
  /^T\d+_HEAD_/,
  /^T\d+_ARMOR_/,
  /^T\d+_SHOES_/,
  /^T\d+_BAG$/,
  /^T\d+_CAPE$/,
];

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
  if (!BLACK_MARKET_ITEM_PATTERNS.some((pattern) => pattern.test(itemId))) {
    return false;
  }

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

function isFreshPrice(priceDate, maxAgeHours) {
  const updatedAt = new Date(priceDate).getTime();

  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return false;

  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  return Date.now() - updatedAt <= maxAgeMs;
}

function getProfitNumber(value, fallback = 0) {
  if (typeof value !== "string") return getNumber(value, fallback);

  const normalized = value.trim().toLowerCase().replace(/\s/g, "");
  if (!normalized) return fallback;

  const match = normalized.match(/^(\d+(?:[.,]\d+)?)(k|m)?$/);
  if (!match) return fallback;

  const amount = Number(match[1].replace(",", "."));
  const multiplier =
    match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;

  return Number.isFinite(amount) ? Math.round(amount * multiplier) : fallback;
}

router.get("/scan", async (req, res) => {
  const minProfit = getProfitNumber(req.query.minProfit, DEFAULT_MIN_PROFIT);
  const maxResults = getNumber(req.query.maxResults, 250);
  const minTier = getNumber(req.query.minTier, 6);
  const maxTier = getNumber(req.query.maxTier, minTier);
  const scanLimit = getNumber(req.query.scanLimit, DEFAULT_SCAN_LIMIT);
  const maxPriceAgeHours = getNumber(
    req.query.maxPriceAgeHours || req.query.maxBmPriceAgeHours,
    DEFAULT_MAX_PRICE_AGE_HOURS,
  );
  const enchants = ["0", "1", "2", "3", "4"];

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

    res.json(results.slice(0, maxResults));
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
