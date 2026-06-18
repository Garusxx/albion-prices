import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const items = [
  { name: "Bag", id: "BAG" },
  { name: "Cape", id: "CAPE" },
  { name: "Broadsword", id: "MAIN_SWORD" },
  { name: "Claymore", id: "2H_CLAYMORE" },
  { name: "Bow", id: "2H_BOW" },
  { name: "Warbow", id: "2H_WARBOW" },
  { name: "Nature Staff", id: "2H_NATURESTAFF" },
  { name: "Holy Staff", id: "2H_HOLYSTAFF" },
  { name: "Fire Staff", id: "2H_FIRESTAFF" },
  { name: "Crossbow", id: "2H_CROSSBOW" },
];

app.get("/api/items/search", (req, res) => {
  const q = (req.query.q || "").toString().toLowerCase();

  if (!q) {
    return res.json([]);
  }

  const results = items
    .filter((item) => item.name.toLowerCase().includes(q))
    .slice(0, 20);

  res.json(results);
});

app.get("/api/prices/:itemId", async (req, res) => {
  const { itemId } = req.params;
  const quality = req.query.quality || "1";

  const cities = [
    "Bridgewatch",
    "Martlock",
    "FortSterling",
    "Lymhurst",
    "Thetford",
    "Caerleon",
    "Brecilien",
    "BlackMarket",
  ];

  const url = `https://europe.albion-online-data.com/api/v2/stats/prices/${itemId}.json?locations=${cities.join(",")}&qualities=${quality}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: "Nie udało się pobrać cen z Albion API",
    });
  }
});

app.get("/api/black-market/:itemId", async (req, res) => {
  const { itemId } = req.params;
  const quality = req.query.quality || "1";

  const url = `https://europe.albion-online-data.com/api/v2/stats/history/${itemId}.json?locations=BlackMarket&qualities=${quality}&time-scale=24`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const history = data[0]?.data || [];
    const last7Days = history.slice(-7);

    const totalSold = last7Days.reduce((sum, day) => sum + day.item_count, 0);

    const totalValue = last7Days.reduce(
      (sum, day) => sum + day.avg_price * day.item_count,
      0,
    );

    const avgPrice = totalSold > 0 ? Math.round(totalValue / totalSold) : 0;

    res.json({
      item_id: itemId,
      quality,
      avg_price_7d: avgPrice,
      sold_7d: totalSold,
      days: last7Days,
    });
  } catch (error) {
    res.status(500).json({
      error: "Nie udało się pobrać historii Black Market",
    });
  }
});

app.listen(4000, () => {
  console.log("Backend działa na http://localhost:4000");
});
