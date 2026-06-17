import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/prices/:itemId", async (req, res) => {
  const { itemId } = req.params;

  const cities = [
    "Bridgewatch",
    "Martlock",
    "FortSterling",
    "Lymhurst",
    "Thetford",
    "Caerleon",
  ];

  const url = `https://europe.albion-online-data.com/api/v2/stats/prices/${itemId}.json?locations=${cities.join(",")}`;

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

app.listen(4000, () => {
  console.log("Backend działa na http://localhost:4000");
});

// TEST GIT
