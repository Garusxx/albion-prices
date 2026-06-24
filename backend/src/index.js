import express from "express";
import cors from "cors";

import pricesRouter from "./routes/prices.js";
import itemsRouter from "./routes/items.js";
import blackMarketRouter from "./routes/blackMarket.js";
import craftProfitRouter from "./routes/craftProfit.js";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/prices", pricesRouter);
app.use("/api/items", itemsRouter);
app.use("/api/black-market", blackMarketRouter);
app.use("/api/craft-profit", craftProfitRouter);

app.listen(PORT, () => {
  console.log(`Backend działa na http://localhost:${PORT}`);
});
