import express from "express";
import { getItemsDump } from "../utils/albionApi.js";

const router = express.Router();

function getItemName(item) {
  return (
    item?.localizednames?.["EN-US"] ||
    item?.LocalizedNames?.["EN-US"] ||
    item?.LocalizationNameVariable ||
    item?.["@uniquename"] ||
    item?.UniqueName ||
    item?.Index ||
    ""
  );
}

function getItemId(item) {
  return item?.["@uniquename"] || item?.UniqueName || item?.Index || "";
}

function getItemType(itemId) {
  return itemId.replace(/^T\d+_/, "").replace(/(@\d+|_LEVEL\d+)$/, "");
}

router.get("/name/:itemId", async (req, res) => {
  try {
    const itemId = decodeURIComponent(req.params.itemId);
    const items = await getItemsDump();
    const item = items.find((currentItem) => getItemId(currentItem) === itemId);

    if (!item) {
      return res.status(404).json({
        error: "Nie znaleziono itemu",
      });
    }

    res.json({
      id: getItemType(itemId),
      uniqueName: itemId,
      name: getItemName(item),
    });
  } catch (error) {
    console.error("ITEM NAME ERROR:", error);

    res.status(500).json({
      error: "Nie udało się pobrać nazwy itemu",
    });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").toLowerCase();
    const tier = String(req.query.tier || "T4").toUpperCase();

    if (q.length < 2) return res.json([]);

    const items = await getItemsDump();

    const resultsByType = new Map();

    for (const item of items) {
      const itemId = getItemId(item);
      const isSelectedTier = itemId.startsWith(`${tier}_`);
      const isBaseItem = !itemId.includes("@") && !itemId.includes("_LEVEL");
      const itemType = getItemType(itemId);
      const name = getItemName(item);
      const searchableText = `${name} ${itemId} ${itemType}`.toLowerCase();

      if (!isSelectedTier || !isBaseItem) continue;
      if (!itemType || !name || !searchableText.includes(q)) continue;
      if (resultsByType.has(itemType)) continue;

      resultsByType.set(itemType, {
        id: itemType,
        name,
      });
    }

    const results = [...resultsByType.values()].slice(0, 30);

    res.json(results);
  } catch (error) {
    console.error("ITEM SEARCH ERROR:", error);

    res.status(500).json({
      error: "Nie udało się wyszukać itemów",
    });
  }
});

export default router;
