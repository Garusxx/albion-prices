import express from "express";
import { getNumber } from "../utils/numbers.js";
import {
  getItemsDump,
  findItemInDump,
  getCraftResourceOptions,
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

function applyTierAndEnchantToMaterial(materialId, enchant) {
  if (!enchant || enchant === "0") return materialId;

  if (isRefinedMaterial(materialId)) {
    return `${materialId}_LEVEL${enchant}@${enchant}`;
  }

  return materialId;
}

function calculateProfit({
  materials,
  sellPrice,
  baseReturn,
  focusBonus,
  useFocus,
  marketFeePercent,
}) {
  const rawMaterialCost = materials.reduce(
    (sum, material) => sum + material.total,
    0,
  );
  const returnableMaterialCost = materials
    .filter((material) => material.returnable)
    .reduce((sum, material) => sum + material.total, 0);

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

function getRecipeResources(item, baseItemId, enchant) {
  return getCraftResourceOptions(item)
    .map((resources) =>
      resources
        .map(normalizeResource)
        .filter((resource) => resource !== null)
        .map((resource) => ({
          ...resource,
          item_id: applyTierAndEnchantToMaterial(resource.item_id, enchant),
        })),
    )
    .filter((resources) => resources.length > 0);
}

function buildPricedMaterials(resources, prices) {
  return resources.map((resource) => {
    const offer = getLowestSellOffer(prices, resource.item_id);

    return {
      item_id: resource.item_id,
      amount: resource.amount,
      returnable: resource.returnable,
      price: offer.price,
      city: offer.price > 0 ? offer.city : "brak ceny",
      updated: offer.updated,
      total: offer.price * resource.amount,
    };
  });
}

function chooseBestRecipe(recipeOptions, prices) {
  const pricedRecipes = recipeOptions.map((resources, index) => {
    const materials = buildPricedMaterials(resources, prices);
    const missingPrices = materials.filter((material) => material.price <= 0);
    const rawMaterialCost = materials.reduce(
      (sum, material) => sum + material.total,
      0,
    );

    return {
      index,
      materials,
      missingPriceCount: missingPrices.length,
      rawMaterialCost,
    };
  });

  return pricedRecipes.sort((a, b) => {
    if (a.missingPriceCount !== b.missingPriceCount) {
      return a.missingPriceCount - b.missingPriceCount;
    }

    return a.rawMaterialCost - b.rawMaterialCost;
  })[0];
}

async function calculateCraftProfitForItem({
  itemId,
  baseReturn,
  focusBonus,
  useFocus,
  marketFeePercent,
  specLevel,
  quality,
}) {
  const baseItemId = itemId.split("@")[0];
  const enchant = itemId.includes("@") ? itemId.split("@")[1] : "0";

  const itemsDump = await getItemsDump();
  const item = findItemInDump(itemsDump, baseItemId);

  if (!item) return null;

  const recipeOptions = getRecipeResources(item, baseItemId, enchant);

  if (!recipeOptions.length) return null;

  const priceItemIds = [
    ...new Set(
      recipeOptions.flatMap((resources) =>
        resources.map((resource) => resource.item_id),
      ),
    ),
    itemId,
  ];

  console.log("CRAFT ITEM:", itemId);
  console.log("PRICE IDS:", priceItemIds);

  const prices = await fetchAlbionPrices(priceItemIds, quality);
  const selectedRecipe = chooseBestRecipe(recipeOptions, prices);
  const materials = selectedRecipe?.materials || [];

  const marketOffer = getHighestBuyOffer(prices, itemId);

  const blackMarketPrices = await fetchAlbionPrices([itemId], quality, [
    "BlackMarket",
  ]);

  const blackMarketOffer = getHighestBuyOffer(blackMarketPrices, itemId);

  const missingMaterialPrices = materials.some(
    (material) => material.price <= 0,
  );

  const marketResult = calculateProfit({
    materials,
    sellPrice: marketOffer.price,
    baseReturn,
    focusBonus,
    useFocus,
    marketFeePercent,
  });

  const blackMarketResult = calculateProfit({
    materials,
    sellPrice: blackMarketOffer.price,
    baseReturn,
    focusBonus,
    useFocus,
    marketFeePercent,
  });

  return {
    item_id: itemId,
    base_item_id: baseItemId,
    enchant,
    quality,

    useFocus,
    baseReturn,
    focusBonus,
    activeReturn: baseReturn + (useFocus ? focusBonus : 0),
    marketFeePercent,
    specLevel,
    selectedRecipeIndex: selectedRecipe?.index || 0,
    recipeOptionsCount: recipeOptions.length,

    materials,
    missingMaterialPrices,

    market: {
      sellCity: marketOffer.price > 0 ? marketOffer.city : "brak ceny",
      sellUpdated: marketOffer.updated,
      ...marketResult,
      profit: missingMaterialPrices ? 0 : marketResult.profit,
      margin: missingMaterialPrices ? 0 : marketResult.margin,
    },

    blackMarket: {
      sellCity:
        blackMarketOffer.price > 0 ? blackMarketOffer.city : "BlackMarket",
      sellUpdated: blackMarketOffer.updated,
      ...blackMarketResult,
      profit: missingMaterialPrices ? 0 : blackMarketResult.profit,
      margin: missingMaterialPrices ? 0 : blackMarketResult.margin,
    },
  };
}

router.post("/:itemId", async (req, res) => {
  try {
    const itemId = decodeURIComponent(req.params.itemId);
    const baseItemId = itemId.split("@")[0];

    const useFocus = Boolean(req.body.useFocus);
    const baseReturn = getNumber(req.body.baseReturn, 15.2);
    const focusBonus = getNumber(req.body.focusBonus, 28.3);
    const marketFeePercent = getNumber(req.body.marketFeePercent, 0);
    const specLevel = getNumber(req.body.specLevel, 0);
    const quality = String(req.body.quality || "1");

    let result = await calculateCraftProfitForItem({
      itemId,
      baseReturn,
      focusBonus,
      useFocus,
      marketFeePercent,
      specLevel,
      quality,
    });

    if (!result && itemId !== baseItemId) {
      result = await calculateCraftProfitForItem({
        itemId: baseItemId,
        baseReturn,
        focusBonus,
        useFocus,
        marketFeePercent,
        specLevel,
        quality,
      });
    }

    if (!result) {
      return res.json({
        item_id: itemId,
        base_item_id: baseItemId,
        enchant: itemId.includes("@") ? itemId.split("@")[1] : "0",
        quality,
        useFocus,
        baseReturn,
        focusBonus,
        activeReturn: baseReturn + (useFocus ? focusBonus : 0),
        marketFeePercent,
        specLevel,
        materials: [],
        missingMaterialPrices: true,
        market: null,
        blackMarket: null,
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
