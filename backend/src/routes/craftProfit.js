import express from "express";
import { items } from "../data/items.js";
import { getNumber } from "../utils/numbers.js";
import {
  getItemsDump,
  findItemInDump,
  getCraftResources,
  normalizeResource,
  fetchAlbionPrices,
  getLowestSellOffer,
  getHighestBuyOffer,
} from "../utils/albionApi.js";

const router = express.Router();

function isRefinedMaterial(materialId) {
  return (
    materialId.includes("_CLOTH") ||
    materialId.includes("_LEATHER") ||
    materialId.includes("_METALBAR") ||
    materialId.includes("_PLANKS") ||
    materialId.includes("_STONEBLOCK")
  );
}

function applyTierAndEnchantToMaterial(materialId, craftedItemId, enchant) {
  const tier = craftedItemId.split("_")[0];
  const fixedMaterialId = materialId.replace(/^T\d+_/, `${tier}_`);

  if (!enchant || enchant === "0") {
    return fixedMaterialId;
  }

  if (isRefinedMaterial(fixedMaterialId)) {
    return `${fixedMaterialId}_LEVEL${enchant}`;
  }

  return `${fixedMaterialId}@${enchant}`;
}

async function calculateCraftProfitForItem({
  itemId,
  returnRate,
  stationFee,
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
      item_id: applyTierAndEnchantToMaterial(
        resource.item_id,
        baseItemId,
        enchant,
      ),
    }));

  if (!resources.length) return null;

  const priceItemIds = [
    ...resources.map((resource) => resource.item_id),
    itemId,
  ];

  console.log("CRAFT ITEM:", itemId);
  console.log("PRICE IDS:", priceItemIds);

  const prices = await fetchAlbionPrices(priceItemIds, quality);

  const materials = resources.map((resource) => {
    const offer = getLowestSellOffer(prices, resource.item_id);

    return {
      item_id: resource.item_id,
      amount: resource.amount,
      price: offer.price,
      city: offer.price > 0 ? offer.city : "brak ceny",
      updated: offer.updated,
      total: offer.price * resource.amount,
    };
  });

  const sellOffer = getHighestBuyOffer(prices, itemId);
  const missingMaterialPrices = materials.some(
    (material) => material.price <= 0,
  );

  const rawMaterialCost = materials.reduce(
    (sum, material) => sum + material.total,
    0,
  );

  const returnedValue = rawMaterialCost * (returnRate / 100);
  const realMaterialCost = rawMaterialCost - returnedValue;
  const fee = sellOffer.price * (feePercent / 100);
  const totalCost = realMaterialCost + stationFee + fee;
  const revenue = sellOffer.price;

  const profit = missingMaterialPrices ? 0 : revenue - totalCost;
  const margin =
    !missingMaterialPrices && totalCost > 0 ? (profit / totalCost) * 100 : 0;
  const profitPerFocus =
    !missingMaterialPrices && focusCost > 0 ? profit / focusCost : 0;

  return {
    item_id: itemId,
    base_item_id: baseItemId,
    enchant,
    quality,
    sellPrice: sellOffer.price,
    sellCity: sellOffer.price > 0 ? sellOffer.city : "brak ceny",
    sellUpdated: sellOffer.updated,
    returnRate,
    stationFee,
    feePercent,
    fee,
    focusCost,
    materials,
    missingMaterialPrices,
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
    const stationFee = getNumber(req.query.stationFee, 0);
    const feePercent = getNumber(req.query.feePercent, 0);
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
        stationFee,
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
    const baseItemId = itemId.split("@")[0];

    const returnRate = getNumber(req.body.returnRate, 15.2);
    const stationFee = getNumber(req.body.stationFee, 0);
    const feePercent = getNumber(req.body.feePercent, 0);
    const focusCost = getNumber(req.body.focusCost, 0);
    const quality = String(req.body.quality || "1");

    let result = await calculateCraftProfitForItem({
      itemId,
      returnRate,
      stationFee,
      feePercent,
      focusCost,
      quality,
    });

    if (!result && itemId !== baseItemId) {
      result = await calculateCraftProfitForItem({
        itemId: baseItemId,
        returnRate,
        stationFee,
        feePercent,
        focusCost,
        quality,
      });
    }

    if (!result) {
      return res.json({
        item_id: itemId,
        base_item_id: baseItemId,
        enchant: itemId.includes("@") ? itemId.split("@")[1] : "0",
        quality,
        sellPrice: 0,
        sellCity: "-",
        sellUpdated: "",
        returnRate,
        stationFee,
        feePercent,
        fee: 0,
        focusCost,
        materials: [],
        missingMaterialPrices: true,
        rawMaterialCost: 0,
        returnedValue: 0,
        realMaterialCost: 0,
        totalCost: 0,
        revenue: 0,
        profit: 0,
        margin: 0,
        profitPerFocus: 0,
        warning: `Brak danych craftingu dla: ${itemId}`,
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
