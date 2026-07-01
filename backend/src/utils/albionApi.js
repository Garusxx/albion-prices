import { marketCities } from "../data/items.js";
import { getNumber } from "./numbers.js";

const ITEMS_URL =
  "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.json";

export async function fetchAlbionPrices(
  itemIds,
  quality = "1",
  locations = marketCities,
) {
  if (!itemIds.length) return [];

  const url = `https://europe.albion-online-data.com/api/v2/stats/prices/${itemIds.join(
    ",",
  )}.json?locations=${locations.join(",")}&qualities=${quality}`;

  const response = await fetch(url);
  if (!response.ok) return [];

  return response.json();
}

export function getLowestSellOffer(prices, itemId) {
  const validOffers = prices
    .filter((price) => price.item_id === itemId)
    .filter((price) => getNumber(price.sell_price_min) > 0)
    .map((price) => ({
      price: getNumber(price.sell_price_min),
      city: price.city,
      updated: price.sell_price_min_date,
    }))
    .sort((a, b) => a.price - b.price);

  return validOffers[0] || { price: 0, city: "-", updated: "" };
}

export function getHighestBuyOffer(prices, itemId) {
  const validOffers = prices
    .filter((price) => price.item_id === itemId)
    .filter((price) => getNumber(price.buy_price_max) > 0)
    .map((price) => ({
      price: getNumber(price.buy_price_max),
      city: price.city,
      updated: price.buy_price_max_date,
    }))
    .sort((a, b) => b.price - a.price);

  return validOffers[0] || { price: 0, city: "-", updated: "" };
}

function flattenItems(value) {
  const results = [];

  function walk(node) {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (typeof node === "object") {
      if (node["@uniquename"]) results.push(node);
      Object.values(node).forEach(walk);
    }
  }

  walk(value);
  return results;
}

let cachedItems = null;

export async function getItemsDump() {
  if (cachedItems) {
    return cachedItems;
  }

  const response = await fetch(ITEMS_URL);
  if (!response.ok) throw new Error("Nie udało się pobrać items.json");

  const data = await response.json();
  cachedItems = flattenItems(data);

  console.log(`Loaded ${cachedItems.length} Albion items`);

  return cachedItems;
}

export function getItemUniqueName(item) {
  return item?.["@uniquename"] || "";
}

export function findItemInDump(itemsDump, itemId) {
  return itemsDump.find((item) => getItemUniqueName(item) === itemId);
}

export function getCraftResources(item) {
  const requirements = item?.craftingrequirements;
  if (!requirements) return [];

  const resources = requirements.craftresource;
  if (!resources) return [];

  return Array.isArray(resources) ? resources : [resources];
}

export function normalizeResource(resource) {
  const itemId = resource?.["@uniquename"] || "";
  const amount = getNumber(resource?.["@count"], 0);

  if (!itemId || amount <= 0) return null;

  return { item_id: itemId, amount };
}

export function applyEnchantToMaterial(materialId, enchant) {
  if (!enchant || enchant === "0") return materialId;

  if (
    materialId.includes("CLOTH") ||
    materialId.includes("LEATHER") ||
    materialId.includes("METALBAR") ||
    materialId.includes("PLANKS") ||
    materialId.includes("STONEBLOCK")
  ) {
    return `${materialId}_LEVEL${enchant}`;
  }

  return `${materialId}@${enchant}`;
}

export async function getSearchableItems() {
  const dump = await getItemsDump();

  return dump
    .filter((item) => item.Index && item.LocalizedNames?.["EN-US"])
    .map((item) => ({
      id: item.Index,
      name: item.LocalizedNames["EN-US"],
    }));
}
