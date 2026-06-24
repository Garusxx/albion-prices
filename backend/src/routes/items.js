import express from "express";
import { items } from "../data/items.js";

const router = express.Router();

router.get("/search", (req, res) => {
  const q = String(req.query.q || "").toLowerCase();

  if (!q) return res.json([]);

  const results = items
    .filter((item) => item.name.toLowerCase().includes(q))
    .slice(0, 20);

  res.json(results);
});

export default router;
