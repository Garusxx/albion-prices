import express from "express";
import {
  getFormattedItemName,
  getFormattedItemsDump,
  getFormattedItemUniqueName,
} from "../utils/albionApi.js";

const router = express.Router();

function getItemName(item) {
  return getFormattedItemName(item);
}

function getItemId(item) {
  return getFormattedItemUniqueName(item);
}

function getItemType(itemId) {
  return itemId.replace(/^T\d+_/, "").replace(/(@\d+|_LEVEL\d+)$/, "");
}

function normalizeSearchText(value) {
  return String(value)
    .toLowerCase()
    .replace(/\bresitance\b/g, "resistance")
    .replace(/['’]/g, "")
    .replace(/[_-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesSearch(searchableText, query) {
  const normalizedSearchableText = normalizeSearchText(searchableText);
  const normalizedQuery = normalizeSearchText(query);
  const queryWords = normalizedQuery.split(" ").filter(Boolean);

  return queryWords.every((word) => normalizedSearchableText.includes(word));
}

router.get("/name/:itemId", async (req, res) => {
  try {
    const itemId = decodeURIComponent(req.params.itemId);
    const items = await getFormattedItemsDump();
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

    const items = await getFormattedItemsDump();

    const resultsByType = new Map();

    for (const item of items) {
      const itemId = getItemId(item);
      const isSelectedTier = itemId.startsWith(`${tier}_`);
      const isBaseItem = !itemId.includes("@") && !itemId.includes("_LEVEL");
      const itemType = getItemType(itemId);
      const name = getItemName(item);
      const searchableText = `${name} ${itemId} ${itemType}`;

      if (!isSelectedTier || !isBaseItem) continue;
      if (!itemType || !name || !matchesSearch(searchableText, q)) continue;
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
