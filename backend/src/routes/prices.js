import express from "express";
import { cities } from "../data/items.js";

const router = express.Router();

router.get("/:itemId", async (req, res) => {
  const { itemId } = req.params;
  const quality = String(req.query.quality || "1");

  const url = `https://europe.albion-online-data.com/api/v2/stats/prices/${itemId}.json?locations=${cities.join(
    ",",
  )}&qualities=${quality}`;

  try {
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
