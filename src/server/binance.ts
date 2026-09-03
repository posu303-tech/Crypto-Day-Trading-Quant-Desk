import { Candle, OrderBookData, DerivativesData } from "../types/trading";

const BINANCE_FUTURES_BASE = "https://fapi.binance.com";
const BINANCE_SPOT_BASE = "https://api.binance.com";

interface RawKline {
  [key: number]: string | number;
}

export async function fetchKlines(
  symbol: string,
  interval: "1m" | "5m" | "15m" | "1h",
  limit = 100
): Promise<{ candles: Candle[]; source: string; timestamp: string }> {
  try {
    const url = `${BINANCE_FUTURES_BASE}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url, { headers: { "User-Agent": "quant-desk/1.0" } });
    if (!res.ok) {
      throw new Error(`Futures klines failed with status ${res.status}`);
    }
    const data = (await res.json()) as (string | number)[][];
    const candles: Candle[] = data.map((item) => ({
      timestamp: Number(item[0]),
      open: parseFloat(String(item[1])),
      high: parseFloat(String(item[2])),
      low: parseFloat(String(item[3])),
      close: parseFloat(String(item[4])),
      volume: parseFloat(String(item[5])),
    }));
    return {
      candles,
      source: "Binance USD-M Futures",
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // Fallback to Spot klines
    const spotUrl = `${BINANCE_SPOT_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const spotRes = await fetch(spotUrl, { headers: { "User-Agent": "quant-desk/1.0" } });
    if (!spotRes.ok) {
      throw new Error(`Failed to fetch klines from Binance: ${err}`);
    }
    const data = (await spotRes.json()) as (string | number)[][];
    const candles: Candle[] = data.map((item) => ({
      timestamp: Number(item[0]),
      open: parseFloat(String(item[1])),
      high: parseFloat(String(item[2])),
      low: parseFloat(String(item[3])),
      close: parseFloat(String(item[4])),
      volume: parseFloat(String(item[5])),
    }));
    return {
      candles,
      source: "Binance Spot (Fallback)",
      timestamp: new Date().toISOString(),
    };
  }
}

export async function fetchOrderBook(
  symbol: string,
  limit = 20
): Promise<OrderBookData> {
  const url = `${BINANCE_FUTURES_BASE}/fapi/v1/depth?symbol=${symbol}&limit=${limit}`;
  let data: { bids: [string, string][]; asks: [string, string][] };
  let source = "Binance USD-M Futures Depth";

  try {
    const res = await fetch(url, { headers: { "User-Agent": "quant-desk/1.0" } });
    if (!res.ok) throw new Error(`Futures depth failed`);
    data = await res.json();
  } catch {
    const spotRes = await fetch(`${BINANCE_SPOT_BASE}/api/v3/depth?symbol=${symbol}&limit=${limit}`);
    data = await spotRes.json();
    source = "Binance Spot Depth (Fallback)";
  }

  const bids = (data.bids || []).map(([p, q]) => ({
    price: parseFloat(p),
    qty: parseFloat(q),
    total: parseFloat(p) * parseFloat(q),
  }));

  const asks = (data.asks || []).map(([p, q]) => ({
    price: parseFloat(p),
    qty: parseFloat(q),
    total: parseFloat(p) * parseFloat(q),
  }));

  const bestBid = bids[0]?.price || 0;
  const bestAsk = asks[0]?.price || 0;
  const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;
  const spread = Math.max(0, bestAsk - bestBid);
  const spreadPct = midPrice > 0 ? (spread / midPrice) * 100 : 0;

  // Thin book check: >0.15% for BTC, >0.30% for alts
  const isBtc = symbol.startsWith("BTC");
  const isThinBook = isBtc ? spreadPct > 0.15 : spreadPct > 0.3;

  // Depth within +- 2%
  const lower2Pct = midPrice * 0.98;
  const upper2Pct = midPrice * 1.02;

  const totalBidDepth2Pct = bids
    .filter((b) => b.price >= lower2Pct)
    .reduce((acc, curr) => acc + curr.total, 0);

  const totalAskDepth2Pct = asks
    .filter((a) => a.price <= upper2Pct)
    .reduce((acc, curr) => acc + curr.total, 0);

  // Top resting order book walls (largest notional orders)
  const topBidWalls = [...bids]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((b) => ({ price: b.price, qtyUsd: b.total }));

  const topAskWalls = [...asks]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map((a) => ({ price: a.price, qtyUsd: a.total }));

  return {
    bids: bids.slice(0, 10),
    asks: asks.slice(0, 10),
    bestBid,
    bestAsk,
    midPrice,
    spread,
    spreadPct,
    isThinBook,
    totalBidDepth2Pct,
    totalAskDepth2Pct,
    topBidWalls,
    topAskWalls,
    timestamp: Date.now(),
    source,
  };
}

export async function fetchDerivativesData(symbol: string): Promise<DerivativesData> {
  const timestamp = Date.now();
  let currentFundingRate = 0;
  let nextFundingTime = timestamp + 8 * 3600 * 1000;
  let fundingRateHistory: { fundingTime: number; fundingRate: number }[] = [];
  let openInterest = 0;
  let openInterestDelta24h = 0;
  let longShortRatio = 1.0;
  let longAccountPct = 50;
  let shortAccountPct = 50;
  let topTraderRatio: number | undefined = undefined;

  try {
    // 1. Premium index (funding rate)
    const premRes = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/premiumIndex?symbol=${symbol}`);
    if (premRes.ok) {
      const prem = await premRes.json();
      currentFundingRate = parseFloat(prem.lastFundingRate || "0");
      nextFundingTime = Number(prem.nextFundingTime || nextFundingTime);
    }

    // 2. Funding history (last 4 periods = 32 hours)
    const fundRes = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/fundingRate?symbol=${symbol}&limit=4`);
    if (fundRes.ok) {
      const hist = await fundRes.json();
      fundingRateHistory = hist.map((h: any) => ({
        fundingTime: Number(h.fundingTime),
        fundingRate: parseFloat(h.fundingRate),
      }));
    }

    // 3. Open interest current
    const oiRes = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/openInterest?symbol=${symbol}`);
    if (oiRes.ok) {
      const oiData = await oiRes.json();
      openInterest = parseFloat(oiData.openInterest || "0");
    }

    // 4. Open interest 24h change
    const oiHistRes = await fetch(
      `${BINANCE_FUTURES_BASE}/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=25`
    );
    if (oiHistRes.ok) {
      const oiHist = await oiHistRes.json();
      if (Array.isArray(oiHist) && oiHist.length >= 2) {
        const oldestOi = parseFloat(oiHist[0].sumOpenInterest || "0");
        const newestOi = parseFloat(oiHist[oiHist.length - 1].sumOpenInterest || "0");
        if (oldestOi > 0) {
          openInterestDelta24h = ((newestOi - oldestOi) / oldestOi) * 100;
        }
      }
    }

    // 5. Global long short account ratio
    const lsRes = await fetch(
      `${BINANCE_FUTURES_BASE}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=15m&limit=1`
    );
    if (lsRes.ok) {
      const lsData = await lsRes.json();
      if (Array.isArray(lsData) && lsData.length > 0) {
        longShortRatio = parseFloat(lsData[0].longShortRatio || "1.0");
        longAccountPct = parseFloat(lsData[0].longAccount || "0.5") * 100;
        shortAccountPct = parseFloat(lsData[0].shortAccount || "0.5") * 100;
      }
    }

    // 6. Top trader ratio
    const ttRes = await fetch(
      `${BINANCE_FUTURES_BASE}/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=15m&limit=1`
    );
    if (ttRes.ok) {
      const ttData = await ttRes.json();
      if (Array.isArray(ttData) && ttData.length > 0) {
        topTraderRatio = parseFloat(ttData[0].longShortRatio || "1.0");
      }
    }
  } catch (err) {
    console.warn(`Derivatives data partial fetch failed for ${symbol}:`, err);
  }

  // Funding rate reference thresholds per Prompt v2:
  // < -0.05%: Extreme negative | Heavy short crowding, squeeze risk to upside
  // -0.05% to -0.01%: Moderately negative | Short bias, but not extreme
  // -0.01% to +0.01%: Neutral | Balanced positioning, move is likely spot-led
  // +0.01% to +0.05%: Moderately positive | Mild long bias
  // +0.05% to +0.10%: Elevated | Leveraged long crowding, funding cost becoming a drag
  // > +0.10%: Extreme positive | Squeeze risk to downside, high leverage long crowding
  const frPct = currentFundingRate * 100;
  let fundingClassification = "Neutral";
  let fundingImplication = "Balanced positioning, move is likely spot-led";

  if (frPct < -0.05) {
    fundingClassification = "Extreme negative (< -0.05%)";
    fundingImplication = "Heavy short crowding, squeeze risk to upside";
  } else if (frPct < -0.01) {
    fundingClassification = "Moderately negative (-0.05% to -0.01%)";
    fundingImplication = "Short bias, but not extreme";
  } else if (frPct <= 0.01) {
    fundingClassification = "Neutral (-0.01% to +0.01%)";
    fundingImplication = "Balanced positioning, move is likely spot-led";
  } else if (frPct <= 0.05) {
    fundingClassification = "Moderately positive (+0.01% to +0.05%)";
    fundingImplication = "Mild long bias";
  } else if (frPct <= 0.1) {
    fundingClassification = "Elevated (+0.05% to +0.10%)";
    fundingImplication = "Leveraged long crowding, funding cost becoming a drag";
  } else {
    fundingClassification = "Extreme positive (> +0.10%)";
    fundingImplication = "Squeeze risk to downside, high leverage long crowding";
  }

  // OI interpretation per Prompt v2:
  let openInterestInterpretation = "OI stable; monitor price flow";
  if (openInterestDelta24h > 1.5) {
    openInterestInterpretation = "OI rising (+Δ24h): new positions entering market";
  } else if (openInterestDelta24h < -1.5) {
    openInterestInterpretation = "OI falling (-Δ24h): position closure / liquidation / covering";
  }

  return {
    currentFundingRate,
    fundingRateHistory,
    nextFundingTime,
    fundingClassification,
    fundingImplication,
    openInterest,
    openInterestUsd: 0, // filled by quant engine with current mark price
    openInterestDelta24h,
    openInterestInterpretation,
    longShortRatio,
    longAccountPct,
    shortAccountPct,
    topTraderRatio,
    timestamp,
    source: "Binance Futures API (USD-M)",
  };
}

export async function fetch24hTicker(symbol: string): Promise<{
  symbol: string;
  price: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
}> {
  try {
    const res = await fetch(`${BINANCE_FUTURES_BASE}/fapi/v1/ticker/24hr?symbol=${symbol}`);
    if (res.ok) {
      const data = await res.json();
      return {
        symbol: data.symbol,
        price: parseFloat(data.lastPrice),
        priceChangePercent: parseFloat(data.priceChangePercent),
        highPrice: parseFloat(data.highPrice),
        lowPrice: parseFloat(data.lowPrice),
        volume: parseFloat(data.volume),
        quoteVolume: parseFloat(data.quoteVolume),
      };
    }
  } catch {}

  // Fallback to spot
  const spotRes = await fetch(`${BINANCE_SPOT_BASE}/api/v3/ticker/24hr?symbol=${symbol}`);
  const data = await spotRes.json();
  return {
    symbol: data.symbol,
    price: parseFloat(data.lastPrice),
    priceChangePercent: parseFloat(data.priceChangePercent),
    highPrice: parseFloat(data.highPrice),
    lowPrice: parseFloat(data.lowPrice),
    volume: parseFloat(data.volume),
    quoteVolume: parseFloat(data.quoteVolume),
  };
}
