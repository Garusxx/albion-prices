import express from "express";
import { items } from "../data/items.js";
import { getNumber } from "../utils/numbers.js";
import {
  getItemsDump,
  findItemInDump,
  getCraftResources,
  normalizeResource,
  applyEnchantToMaterial,
  fetchAlbionPrices,
  getLowestSellOffer,
  getHighestBuyOffer,
} from "../utils/albionApi.js";

const router = express.Router();

async function calculateCraftProfitForItem({
  itemId,
  returnRate,
  feePercent,
  focusCost,
  quality,
}) {
  const baseItemId = itemId.split("@")[0];
  const enchant = itemId.includes("@") ? itemId.split("@")[1] : "0";

  const itemsDump = await getItemsDump();
  const item = findItemInDump(itemsDump, baseItemId);

  if (!item) return null;

  const resources = getCraftResources(item)
    .map(normalizeResource)
    .filter((resource) => resource !== null)
    .map((resource) => ({
      ...resource,
      item_id: applyEnchantToMaterial(resource.item_id, enchant),
    }));

  if (!resources.length) return null;

  const priceItemIds = [
    ...resources.map((resource) => resource.item_id),
    itemId,
  ];
  const prices = await fetchAlbionPrices(priceItemIds, quality);

  const materials = resources.map((resource) => {
    const offer = getLowestSellOffer(prices, resource.item_id);

    return {
      item_id: resource.item_id,
      amount: resource.amount,
      price: offer.price,
      city: offer.city,
      updated: offer.updated,
      total: offer.price * resource.amount,
    };
  });

  const missingPrices = materials.some((material) => material.price <= 0);
  if (missingPrices) return null;

  const sellOffer = getHighestBuyOffer(prices, itemId);
  if (sellOffer.price <= 0) return null;

  const rawMaterialCost = materials.reduce(
    (sum, material) => sum + material.total,
    0,
  );

  const returnedValue = rawMaterialCost * (returnRate / 100);
  const realMaterialCost = rawMaterialCost - returnedValue;
  const fee = sellOffer.price * (feePercent / 100);
  const totalCost = realMaterialCost + fee;
  const revenue = sellOffer.price;
  const profit = revenue - totalCost;
  const margin = totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const profitPerFocus = focusCost > 0 ? profit / focusCost : 0;

  return {
    item_id: itemId,
    sellPrice: sellOffer.price,
    sellCity: sellOffer.city,
    fee,
    returnRate,
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

router.get("/scan", async (req, res) => {
  try {
    const tier = String(req.query.tier || "T4");
    const enchant = String(req.query.enchant || "0");
    const quality = String(req.query.quality || "1");
    const returnRate = getNumber(req.query.returnRate, 15.2);
    const feePercent = getNumber(req.query.feePercent, 6.5);
    const focusCost = getNumber(req.query.focusCost, 0);

    const candidateItems = items.map((item) => {
      const baseId = `${tier}_${item.id}`;
      return enchant === "0" ? baseId : `${baseId}@${enchant}`;
    });

    const results = [];

    for (const itemId of candidateItems) {
      const result = await calculateCraftProfitForItem({
        itemId,
        returnRate,
        feePercent,
        focusCost,
        quality,
      });

      if (result) results.push(result);
    }

    results.sort((a, b) => b.profit - a.profit);

    res.json(results);
  } catch (error) {
    console.error("CRAFT PROFIT SCAN ERROR:", error);

    res.status(500).json({
      error: "Nie udało się zeskanować craft profitu",
    });
  }
});

router.post("/:itemId", async (req, res) => {
  try {
    const itemId = decodeURIComponent(req.params.itemId);
    const returnRate = getNumber(req.body.returnRate);
    const feePercent = getNumber(req.body.feePercent, 0);
    const focusCost = getNumber(req.body.focusCost);
    const quality = String(req.body.quality || "1");

    const result = await calculateCraftProfitForItem({
      itemId,
      returnRate,
      feePercent,
      focusCost,
      quality,
    });

    if (!result) {
      return res.status(404).json({
        error: `Nie udało się obliczyć profitu dla: ${itemId}`,
      });
    }

    res.json(result);
  } catch (error) {
    console.error("CRAFT PROFIT ERROR:", error);

    res.status(500).json({
      error: "Nie udało się obliczyć craft profitu",
    });
  }
});

export default router;
