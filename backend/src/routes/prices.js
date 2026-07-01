import express from "express";
import { cities } from "../data/items.js";
import {
  findItemInDump,
  getItemsDump,
  getPriceQualityForItem,
} from "../utils/albionApi.js";

const router = express.Router();

router.get("/:itemId", async (req, res) => {
  const { itemId } = req.params;
  const quality = String(req.query.quality || "1");
  const baseItemId = decodeURIComponent(itemId).split("@")[0];

  try {
    const itemsDump = await getItemsDump();
    const item = findItemInDump(itemsDump, baseItemId);
    const priceQuality = getPriceQualityForItem(item, quality);

    const url = `https://europe.albion-online-data.com/api/v2/stats/prices/${itemId}.json?locations=${cities.join(
      ",",
    )}&qualities=${priceQuality}`;

    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error("PRICE ERROR:", error);

    res.status(500).json({
      error: "Nie udało się pobrać cen z Albion API",
    });
  }
});

export default router;
