import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  fetchKlines,
  fetchOrderBook,
  fetchDerivativesData,
  fetch24hTicker,
} from "./src/server/binance";
import {
  evaluateMarketStructure,
  buildDeterministicDecisionMemo,
} from "./src/server/quant";
import { generateAiTradeMemo } from "./src/server/gemini";

dotenv.config();

const DEFAULT_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "ADAUSDT",
  "SUIUSDT",
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Tickers list
  app.get("/api/tickers", async (req, res) => {
    try {
      const results = await Promise.all(
        DEFAULT_SYMBOLS.map(async (sym) => {
          try {
            return await fetch24hTicker(sym);
          } catch {
            return {
              symbol: sym,
              price: 0,
              priceChangePercent: 0,
              highPrice: 0,
              lowPrice: 0,
              volume: 0,
              quoteVolume: 0,
            };
          }
        })
      );
      res.json({ symbols: results });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch tickers" });
    }
  });

  // Comprehensive Market Structure & Live Data
  app.get("/api/market-data", async (req, res) => {
    try {
      const symbol = (req.query.symbol as string || "BTCUSDT").toUpperCase();
      const accountEquity = parseFloat((req.query.equity as string) || "10000");
      const riskPct = parseFloat((req.query.riskPct as string) || "1.0");

      const [klines15mRes, klines1hRes, orderBook, derivatives] = await Promise.all([
        fetchKlines(symbol, "15m", 100),
        fetchKlines(symbol, "1h", 100),
        fetchOrderBook(symbol, 20),
        fetchDerivativesData(symbol),
      ]);

      const currentPrice =
        klines15mRes.candles[klines15mRes.candles.length - 1]?.close ||
        orderBook.midPrice;
      derivatives.openInterestUsd = derivatives.openInterest * currentPrice;

      const { metrics, setup, confluence } = evaluateMarketStructure(
        symbol,
        klines15mRes.candles,
        klines1hRes.candles,
        orderBook,
        derivatives,
        accountEquity,
        riskPct
      );

      const memo = buildDeterministicDecisionMemo(
        symbol,
        metrics,
        setup,
        confluence,
        orderBook,
        derivatives
      );

      res.json({
        symbol,
        candles15m: klines15mRes.candles.slice(-60), // send last 60 candles for crisp chart
        candles1h: klines1hRes.candles.slice(-48),
        orderBook,
        derivatives,
        metrics,
        setup,
        confluence,
        memo,
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      });
    } catch (err: any) {
      console.error("Market data error:", err);
      res.status(500).json({ error: err.message || "Failed to fetch market structure" });
    }
  });

  // Generate Institutional Pre-Trade Memo with Gemini AI
  app.post("/api/generate-memo", async (req, res) => {
    try {
      const { symbol = "BTCUSDT", accountEquity = 10000, riskPerTradePct = 1.0 } =
        req.body;

      const [klines15mRes, klines1hRes, orderBook, derivatives] = await Promise.all([
        fetchKlines(symbol, "15m", 100),
        fetchKlines(symbol, "1h", 100),
        fetchOrderBook(symbol, 20),
        fetchDerivativesData(symbol),
      ]);

      const currentPrice =
        klines15mRes.candles[klines15mRes.candles.length - 1]?.close ||
        orderBook.midPrice;
      derivatives.openInterestUsd = derivatives.openInterest * currentPrice;

      const { metrics, setup, confluence } = evaluateMarketStructure(
        symbol,
        klines15mRes.candles,
        klines1hRes.candles,
        orderBook,
        derivatives,
        accountEquity,
        riskPerTradePct
      );

      const memo = buildDeterministicDecisionMemo(
        symbol,
        metrics,
        setup,
        confluence,
        orderBook,
        derivatives
      );

      // Call Gemini 3.8 Flash for AI analyst synthesis if key is present
      const aiResult = await generateAiTradeMemo(memo);
      if (aiResult) {
        memo.aiSynthesisMemo = aiResult.text;
        memo.aiModelUsed = aiResult.model;
      }

      res.json({
        memo,
        metrics,
        setup,
        confluence,
        orderBook,
        derivatives,
        hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      });
    } catch (err: any) {
      console.error("Memo generation error:", err);
      res.status(500).json({ error: err.message || "Failed to generate memo" });
    }
  });

  // --- Vite Middleware setup ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Institutional Crypto Quant Desk running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
