import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 4000;

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

const marketCities = cities.filter((city) => city !== "BlackMarket");

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

const ITEMS_URL =
  "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.json";

let cachedItems = null;

function getNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getItemUniqueName(item) {
  return item?.["@uniquename"] || "";
}

function getCraftResources(item) {
  const requirements = item?.craftingrequirements;
  if (!requirements) return [];

  const resources = requirements.craftresource;
  if (!resources) return [];

  return Array.isArray(resources) ? resources : [resources];
}

function normalizeResource(resource) {
  const itemId = resource?.["@uniquename"] || "";
  const amount = getNumber(resource?.["@count"], 0);

  if (!itemId || amount <= 0) return null;

  return {
    item_id: itemId,
    amount,
  };
}

async function getItemsDump() {
  if (cachedItems) return cachedItems;

  const response = await fetch(ITEMS_URL);

  if (!response.ok) {
    throw new Error("Nie udało się pobrać items.json");
  }

  const data = await response.json();
  cachedItems = Array.isArray(data) ? data : Object.values(data);

  return cachedItems;
}

function findItemInDump(itemsDump, itemId) {
  return itemsDump.find((item) => getItemUniqueName(item) === itemId);
}

async function fetchAlbionPrices(
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

function getLowestSellOffer(prices, itemId) {
  const validOffers = prices
    .filter((price) => price.item_id === itemId)
    .filter((price) => getNumber(price.sell_price_min) > 0)
    .map((price) => ({
      price: getNumber(price.sell_price_min),
      city: price.city,
      updated: price.sell_price_min_date,
    }))
    .sort((a, b) => a.price - b.price);

  if (!validOffers.length) {
    return {
      price: 0,
      city: "-",
      updated: "",
    };
  }

  return validOffers[0];
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/items/search", (req, res) => {
  const q = String(req.query.q || "").toLowerCase();

  if (!q) return res.json([]);

  const results = items
    .filter((item) => item.name.toLowerCase().includes(q))
    .slice(0, 20);

  res.json(results);
});

app.get("/api/prices/:itemId", async (req, res) => {
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

app.post("/api/craft-profit/:itemId", async (req, res) => {
  try {
    const { itemId } = req.params;

    const returnRate = getNumber(req.body.returnRate);
    const stationFee = getNumber(req.body.stationFee);
    const focusCost = getNumber(req.body.focusCost);
    const customSellPrice = getNumber(req.body.sellPrice);
    const quality = String(req.body.quality || "1");

    const itemsDump = await getItemsDump();
    const item = findItemInDump(itemsDump, itemId);

    if (!item) {
      return res.status(404).json({
        error: `Nie znaleziono itemu: ${itemId}`,
      });
    }

    const resources = getCraftResources(item)
      .map(normalizeResource)
      .filter((resource) => resource !== null);

    if (!resources.length) {
      return res.status(404).json({
        error: `Brak receptury craftingu dla: ${itemId}`,
      });
    }

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

    const sellOffer = getLowestSellOffer(prices, itemId);

    const sellPrice = customSellPrice > 0 ? customSellPrice : sellOffer.price;

    const rawMaterialCost = materials.reduce(
      (sum, material) => sum + material.total,
      0,
    );

    const returnedValue = rawMaterialCost * (returnRate / 100);
    const realMaterialCost = rawMaterialCost - returnedValue;
    const totalCost = realMaterialCost + stationFee;
    const revenue = sellPrice;
    const profit = revenue - totalCost;
    const margin = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const profitPerFocus = focusCost > 0 ? profit / focusCost : 0;

    res.json({
      item_id: itemId,
      quality,
      sellPrice,
      sellCity: customSellPrice > 0 ? "manual" : sellOffer.city,
      sellUpdated: sellOffer.updated,
      returnRate,
      stationFee,
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
    });
  } catch (error) {
    console.error("CRAFT PROFIT ERROR:", error);

    res.status(500).json({
      error: "Nie udało się obliczyć craft profitu",
    });
  }
});

app.get("/api/black-market/scan", async (req, res) => {
  const minProfit = getNumber(req.query.minProfit, 400000);
  const quality = String(req.query.quality || "1");

  const t8Items = items.map((item) => ({
    name: item.name,
    id: `T8_${item.id}`,
  }));

  const results = [];

  try {
    const data = await fetchAlbionPrices(
      t8Items.map((item) => item.id),
      quality,
      cities,
    );

    for (const item of t8Items) {
      const itemPrices = data.filter((price) => price.item_id === item.id);

      const blackMarket = itemPrices.find(
        (price) =>
          price.city === "Black Market" || price.city === "BlackMarket",
      );

      if (!blackMarket || !blackMarket.buy_price_max) continue;

      const cityPrices = itemPrices.filter(
        (price) =>
          price.city !== "Black Market" &&
          price.city !== "BlackMarket" &&
          price.sell_price_min > 0,
      );

      for (const city of cityPrices) {
        const profit = blackMarket.buy_price_max - city.sell_price_min;

        if (profit >= minProfit) {
          results.push({
            item_name: item.name,
            item_id: item.id,
            buy_city: city.city,
            buy_price: city.sell_price_min,
            black_market_price: blackMarket.buy_price_max,
            profit,
          });
        }
      }
    }

    results.sort((a, b) => b.profit - a.profit);

    res.json(results);
  } catch (error) {
    console.error("BLACK MARKET SCAN ERROR:", error);

    res.status(500).json({
      error: "Nie udało się zeskanować Black Market",
    });
  }
});

app.get("/api/black-market/:itemId", async (req, res) => {
  const { itemId } = req.params;
  const quality = String(req.query.quality || "1");

  const url = `https://europe.albion-online-data.com/api/v2/stats/history/${itemId}.json?locations=BlackMarket&qualities=${quality}&time-scale=24`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const history = data[0]?.data || [];
    const last7Days = history.slice(-7);

    const totalSold = last7Days.reduce(
      (sum, day) => sum + getNumber(day.item_count),
      0,
    );

    const totalValue = last7Days.reduce(
      (sum, day) => sum + getNumber(day.avg_price) * getNumber(day.item_count),
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
    console.error("BLACK MARKET HISTORY ERROR:", error);

    res.status(500).json({
      error: "Nie udało się pobrać historii Black Market",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend działa na http://localhost:${PORT}`);
});
