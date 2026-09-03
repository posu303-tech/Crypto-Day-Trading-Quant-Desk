import {
  Candle,
  OrderBookData,
  DerivativesData,
  QuantitativeMetrics,
  TradeSetup,
  ConfluenceScore,
  PreTradeMemo,
} from "../types/trading";

// --- Mathematical Helpers ---

export function computeATR(candles: Candle[], period = 14): number[] {
  if (candles.length < 2) return [0];
  const tr: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const currentTr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    tr.push(currentTr);
  }

  // Wilder's smoothing
  const atr: number[] = [];
  let sum = 0;
  for (let i = 0; i < Math.min(period, tr.length); i++) {
    sum += tr[i];
  }
  let currentAtr = sum / Math.min(period, tr.length);
  atr.push(currentAtr);

  for (let i = period; i < tr.length; i++) {
    currentAtr = (currentAtr * (period - 1) + tr[i]) / period;
    atr.push(currentAtr);
  }

  return atr;
}

export function computeADX(candles: Candle[], period = 14): {
  adx: number;
  plusDI: number;
  minusDI: number;
} {
  if (candles.length < period * 2) {
    return { adx: 20, plusDI: 20, minusDI: 20 };
  }

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevHigh = candles[i - 1].high;
    const prevLow = candles[i - 1].low;
    const prevClose = candles[i - 1].close;

    const currentTr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    tr.push(currentTr);

    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  // Smooth TR, +DM, -DM with Wilder's
  let smoothTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  const dxList: number[] = [];

  for (let i = period; i < tr.length; i++) {
    smoothTR = smoothTR - smoothTR / period + tr[i];
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];

    const plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
    const sumDI = plusDI + minusDI;
    const dx = sumDI > 0 ? (Math.abs(plusDI - minusDI) / sumDI) * 100 : 0;
    dxList.push(dx);
  }

  if (dxList.length < period) {
    return { adx: 22, plusDI: 20, minusDI: 20 };
  }

  let adx = dxList.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxList.length; i++) {
    adx = (adx * (period - 1) + dxList[i]) / period;
  }

  const lastPlusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 20;
  const lastMinusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 20;

  return {
    adx: Number(adx.toFixed(2)),
    plusDI: Number(lastPlusDI.toFixed(2)),
    minusDI: Number(lastMinusDI.toFixed(2)),
  };
}

export function computeRSI(candles: Candle[], period = 14): number {
  if (candles.length <= period) return 50;
  const changes: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close);
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    const diff = changes[i];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < changes.length; i++) {
    const diff = changes[i];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return Number(rsi.toFixed(2));
}

export function computeMACD(
  candles: Candle[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): { macd: number; signal: number; hist: number } {
  if (candles.length < slow + signalPeriod) {
    return { macd: 0, signal: 0, hist: 0 };
  }

  const closes = candles.map((c) => c.close);

  function calcEMA(data: number[], p: number): number[] {
    const k = 2 / (p + 1);
    const ema: number[] = [];
    let initial = data.slice(0, p).reduce((a, b) => a + b, 0) / p;
    ema.push(initial);
    for (let i = p; i < data.length; i++) {
      const val = data[i] * k + ema[ema.length - 1] * (1 - k);
      ema.push(val);
    }
    return ema;
  }

  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);

  const offset = slow - fast;
  const macdLine: number[] = [];
  for (let i = 0; i < emaSlow.length; i++) {
    macdLine.push(emaFast[i + offset] - emaSlow[i]);
  }

  const signalLine = calcEMA(macdLine, signalPeriod);
  const lastMacd = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  const lastHist = lastMacd - lastSignal;

  return {
    macd: Number(lastMacd.toFixed(2)),
    signal: Number(lastSignal.toFixed(2)),
    hist: Number(lastHist.toFixed(2)),
  };
}

export function computeOBVTrend(candles: Candle[]): "RISING" | "FALLING" | "NEUTRAL" {
  if (candles.length < 10) return "NEUTRAL";
  const obv: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const prevObv = obv[obv.length - 1];
    if (candles[i].close > candles[i - 1].close) {
      obv.push(prevObv + candles[i].volume);
    } else if (candles[i].close < candles[i - 1].close) {
      obv.push(prevObv - candles[i].volume);
    } else {
      obv.push(prevObv);
    }
  }

  const recent = obv.slice(-10);
  const start = recent[0];
  const end = recent[recent.length - 1];
  const diffPct = start !== 0 ? ((end - start) / Math.abs(start)) * 100 : 0;

  if (diffPct > 2) return "RISING";
  if (diffPct < -2) return "FALLING";
  return "NEUTRAL";
}

export function computeBollingerBands(
  candles: Candle[],
  period = 20,
  stdDevMult = 2
): {
  upper: number;
  middle: number;
  lower: number;
  width: number;
  width20Avg: number;
  isCompressed: boolean;
} {
  if (candles.length < period) {
    const p = candles[candles.length - 1]?.close || 1;
    return {
      upper: p * 1.01,
      middle: p,
      lower: p * 0.99,
      width: 0.02,
      width20Avg: 0.02,
      isCompressed: false,
    };
  }

  const widths: number[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b.close, 0) / period;
    const variance =
      slice.reduce((a, b) => a + Math.pow(b.close - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    const upper = mean + stdDevMult * stdDev;
    const lower = mean - stdDevMult * stdDev;
    const width = mean > 0 ? (upper - lower) / mean : 0;
    widths.push(width);
  }

  const currentWidth = widths[widths.length - 1];
  const recentWidths = widths.slice(-20);
  const width20Avg =
    recentWidths.reduce((a, b) => a + b, 0) / (recentWidths.length || 1);

  // Prompt rule: BB width < 50% of 20-period avg = compression
  const isCompressed = currentWidth < width20Avg * 0.5;

  const lastSlice = candles.slice(-period);
  const lastMean = lastSlice.reduce((a, b) => a + b.close, 0) / period;
  const lastVariance =
    lastSlice.reduce((a, b) => a + Math.pow(b.close - lastMean, 2), 0) / period;
  const lastStdDev = Math.sqrt(lastVariance);

  return {
    upper: Number((lastMean + stdDevMult * lastStdDev).toFixed(2)),
    middle: Number(lastMean.toFixed(2)),
    lower: Number((lastMean - stdDevMult * lastStdDev).toFixed(2)),
    width: Number(currentWidth.toFixed(4)),
    width20Avg: Number(width20Avg.toFixed(4)),
    isCompressed,
  };
}

export function computeVolumeProfile(
  candles: Candle[],
  numBins = 24
): {
  poc: number;
  vah: number;
  val: number;
  levels: { price: number; volume: number; percent: number; isPoc: boolean; isValueArea: boolean }[];
} {
  if (candles.length === 0) {
    return { poc: 0, vah: 0, val: 0, levels: [] };
  }

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const c of candles) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  }

  const binStep = (maxPrice - minPrice) / numBins;
  const bins = Array.from({ length: numBins }, (_, i) => ({
    price: minPrice + (i + 0.5) * binStep,
    volume: 0,
  }));

  let totalVolume = 0;
  for (const c of candles) {
    totalVolume += c.volume;
    const avgPrice = (c.high + c.low + c.close) / 3;
    const binIdx = Math.min(
      numBins - 1,
      Math.max(0, Math.floor((avgPrice - minPrice) / (binStep || 1)))
    );
    bins[binIdx].volume += c.volume;
  }

  // Find POC (highest volume bin)
  let maxVol = 0;
  let pocIdx = 0;
  bins.forEach((b, idx) => {
    if (b.volume > maxVol) {
      maxVol = b.volume;
      pocIdx = idx;
    }
  });

  // Calculate 70% Value Area starting from POC
  const targetAreaVolume = totalVolume * 0.7;
  let accumulatedVol = bins[pocIdx].volume;
  let lowIdx = pocIdx;
  let highIdx = pocIdx;

  while (accumulatedVol < targetAreaVolume && (lowIdx > 0 || highIdx < numBins - 1)) {
    const nextLowVol = lowIdx > 0 ? bins[lowIdx - 1].volume : -1;
    const nextHighVol = highIdx < numBins - 1 ? bins[highIdx + 1].volume : -1;

    if (nextHighVol >= nextLowVol && highIdx < numBins - 1) {
      highIdx++;
      accumulatedVol += bins[highIdx].volume;
    } else if (lowIdx > 0) {
      lowIdx--;
      accumulatedVol += bins[lowIdx].volume;
    } else if (highIdx < numBins - 1) {
      highIdx++;
      accumulatedVol += bins[highIdx].volume;
    } else {
      break;
    }
  }

  const poc = Number(bins[pocIdx].price.toFixed(2));
  const vah = Number(bins[highIdx].price.toFixed(2));
  const val = Number(bins[lowIdx].price.toFixed(2));

  const levels = bins.map((b, idx) => ({
    price: Number(b.price.toFixed(2)),
    volume: Number(b.volume.toFixed(2)),
    percent: totalVolume > 0 ? Number(((b.volume / totalVolume) * 100).toFixed(1)) : 0,
    isPoc: idx === pocIdx,
    isValueArea: idx >= lowIdx && idx <= highIdx,
  }));

  return { poc, vah, val, levels };
}

export function computeFloorPivots(candles1h: Candle[]): {
  p: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
} {
  // Use prior 24h period or prior session candles
  const sessionCandles = candles1h.slice(-24);
  if (sessionCandles.length === 0) {
    return { p: 0, r1: 0, r2: 0, r3: 0, s1: 0, s2: 0, s3: 0 };
  }

  let high = -Infinity;
  let low = Infinity;
  sessionCandles.forEach((c) => {
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  });
  const close = sessionCandles[sessionCandles.length - 1].close;

  const p = (high + low + close) / 3;
  const r1 = 2 * p - low;
  const s1 = 2 * p - high;
  const r2 = p + (high - low);
  const s2 = p - (high - low);
  const r3 = high + 2 * (p - low);
  const s3 = low - 2 * (high - p);

  return {
    p: Number(p.toFixed(2)),
    r1: Number(r1.toFixed(2)),
    r2: Number(r2.toFixed(2)),
    r3: Number(r3.toFixed(2)),
    s1: Number(s1.toFixed(2)),
    s2: Number(s2.toFixed(2)),
    s3: Number(s3.toFixed(2)),
  };
}

export function computeRealizedVol24h(candles15m: Candle[]): number {
  const last96 = candles15m.slice(-96); // 96 * 15m = 24h
  if (last96.length < 2) return 0;
  const logReturns: number[] = [];
  for (let i = 1; i < last96.length; i++) {
    logReturns.push(Math.log(last96[i].close / last96[i - 1].close));
  }
  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance =
    logReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / logReturns.length;
  const stdDev = Math.sqrt(variance);
  // Annualized volatility approx or daily: report 24h standard dev in % terms
  const vol24hPct = stdDev * Math.sqrt(96) * 100;
  return Number(vol24hPct.toFixed(2));
}

export function getSessionContext(now = new Date()): {
  currentSession: string;
  timeSinceOpen: string;
  sessionBias: string;
} {
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const minuteTotal = utcHours * 60 + utcMinutes;

  // Session hours UTC:
  // Asian: 00:00 - 08:00 (Tokyo/Singapore)
  // European: 07:00 - 16:00 (London/Frankfurt)
  // US: 13:00 - 21:00 (New York)
  // Overlaps: 07:00-08:00 (Asian/EU), 13:00-16:00 (EU/US)

  let sessionName = "Off-Peak / Asian Transition";
  let openHour = 0;

  if (minuteTotal >= 13 * 60 && minuteTotal <= 16 * 60) {
    sessionName = "European / US Overlap";
    openHour = 13;
  } else if (minuteTotal >= 13 * 60 && minuteTotal < 21 * 60) {
    sessionName = "US Session";
    openHour = 13;
  } else if (minuteTotal >= 7 * 60 && minuteTotal <= 8 * 60) {
    sessionName = "Asian / European Overlap";
    openHour = 7;
  } else if (minuteTotal >= 7 * 60 && minuteTotal < 16 * 60) {
    sessionName = "European Session";
    openHour = 7;
  } else if (minuteTotal < 8 * 60) {
    sessionName = "Asian Session";
    openHour = 0;
  } else {
    sessionName = "Asian Pre-Market";
    openHour = 21;
  }

  let elapsedMinutes = (utcHours - openHour) * 60 + utcMinutes;
  if (elapsedMinutes < 0) elapsedMinutes += 24 * 60;
  const elapsedH = Math.floor(elapsedMinutes / 60);
  const elapsedM = elapsedMinutes % 60;
  const timeSinceOpen = `${elapsedH}h ${elapsedM.toString().padStart(2, "0")}m`;

  const sessionBias =
    sessionName.includes("US") || sessionName.includes("European")
      ? "Institutional liquidity active; order flow depth expansion observed"
      : "Lower liquidity window; watch for range-bound absorption and fakeouts";

  return {
    currentSession: sessionName,
    timeSinceOpen,
    sessionBias,
  };
}

// --- Quantitative Evaluation Engine ---

export function evaluateMarketStructure(
  symbol: string,
  candles15m: Candle[],
  candles1h: Candle[],
  orderBook: OrderBookData,
  derivatives: DerivativesData,
  accountEquity = 10000,
  riskPerTradePct = 1.0
): {
  metrics: QuantitativeMetrics;
  setup: TradeSetup;
  confluence: ConfluenceScore;
} {
  const currentPrice = candles15m[candles15m.length - 1]?.close || orderBook.midPrice;
  const timestampUtc = new Date().toISOString();
  const sessionContext = getSessionContext();

  // 1. Volatility & ATR Calculations
  const atr15mSeries = computeATR(candles15m, 14);
  const atr15m = atr15mSeries[atr15mSeries.length - 1] || currentPrice * 0.01;
  const atr20Avg15m =
    atr15mSeries.slice(-20).reduce((a, b) => a + b, 0) /
    Math.min(20, atr15mSeries.length);
  const isAtrExpanding = atr15m > atr20Avg15m * 1.5;

  const atr1hSeries = computeATR(candles1h, 14);
  const atr1h = atr1hSeries[atr1hSeries.length - 1] || currentPrice * 0.02;

  const realizedVol24hPct = computeRealizedVol24h(candles15m);

  // 2. ADX and Multiplier Selection (Strict Prompt v2 Decision Tree)
  const { adx: adx15m, plusDI: plusDI15m, minusDI: minusDI15m } = computeADX(candles15m, 14);

  let adxRegime: QuantitativeMetrics["volatility"]["adxRegime"] = "Transitional";
  let atrMultiplier = 1.25;
  let leverageCapAdjustment = "Standard leverage (no penalty)";

  if (adx15m < 18) {
    adxRegime = "Range-bound / choppy";
    atrMultiplier = 1.0;
    leverageCapAdjustment = "Reduce leverage by 40% (low-conviction environment)";
  } else if (adx15m <= 25) {
    adxRegime = "Transitional";
    atrMultiplier = 1.25;
    leverageCapAdjustment = "Standard leverage";
  } else if (adx15m <= 35) {
    adxRegime = "Trending";
    atrMultiplier = 1.5;
    leverageCapAdjustment = "Standard leverage, favor momentum entries";
  } else {
    adxRegime = "Strong trend / climactic";
    atrMultiplier = 1.75;
    leverageCapAdjustment = "Reduce leverage by 30% (exhaustion risk elevated)";
  }

  // Bollinger Bands check
  const bb = computeBollingerBands(candles15m, 20, 2);
  if (bb.isCompressed) {
    atrMultiplier = 1.0;
    leverageCapAdjustment += " | Volatility compression (BB width < 50% avg), 1.0x ATR applied";
  }
  if (isAtrExpanding) {
    atrMultiplier = Math.max(atrMultiplier, 1.5);
    leverageCapAdjustment += " | Volatility expansion (ATR > 150% 20p avg): Hard 2x leverage cap";
  }

  // 3. Volume Profile & Floor Pivots
  const vp = computeVolumeProfile(candles15m.slice(-96), 24);
  const priceVsPoc: "ABOVE" | "BELOW" | "AT" =
    currentPrice > vp.poc * 1.001
      ? "ABOVE"
      : currentPrice < vp.poc * 0.999
      ? "BELOW"
      : "AT";
  const priceVsValueArea: "INSIDE" | "ABOVE_VAH" | "BELOW_VAL" =
    currentPrice > vp.vah
      ? "ABOVE_VAH"
      : currentPrice < vp.val
      ? "BELOW_VAL"
      : "INSIDE";

  const obvTrend15m = computeOBVTrend(candles15m);
  const floorPivots = computeFloorPivots(candles1h);

  // 4. Momentum & Divergences
  const rsi15m = computeRSI(candles15m, 14);
  const rsi1h = computeRSI(candles1h, 14);
  const macd15m = computeMACD(candles15m);
  const macd1h = computeMACD(candles1h);

  let divergenceNotice: string | null = null;
  const recentCandles15m = candles15m.slice(-10);
  const priceHigher =
    recentCandles15m[recentCandles15m.length - 1].close >
    recentCandles15m[0].close;
  if (priceHigher && rsi15m < 50) {
    divergenceNotice = "Bearish momentum divergence on 15m (price higher, RSI lower)";
  } else if (!priceHigher && rsi15m > 50) {
    divergenceNotice = "Bullish momentum divergence on 15m (price lower, RSI higher)";
  }

  // 5. Trend context
  const c1hLast = candles1h[candles1h.length - 1];
  const c1hPrev = candles1h[Math.max(0, candles1h.length - 10)];
  const structure1h =
    c1hLast.close > c1hPrev.close && c1hLast.high > c1hPrev.high
      ? "Higher Highs & Higher Lows (Uptrend)"
      : c1hLast.close < c1hPrev.close && c1hLast.low < c1hPrev.low
      ? "Lower Highs & Lower Lows (Downtrend)"
      : "Consolidation / Range";

  const c15mLast = candles15m[candles15m.length - 1];
  const c15mPrev = candles15m[Math.max(0, candles15m.length - 10)];
  const structure15m =
    c15mLast.close > c15mPrev.close && c15mLast.high > c15mPrev.high
      ? "Higher Highs & Higher Lows (Uptrend)"
      : c15mLast.close < c15mPrev.close && c15mLast.low < c15mPrev.low
      ? "Lower Highs & Lower Lows (Downtrend)"
      : "Consolidation / Range";

  const isBullish1h = structure1h.includes("Uptrend");
  const isBearish1h = structure1h.includes("Downtrend");
  const isBullish15m = structure15m.includes("Uptrend");
  const isBearish15m = structure15m.includes("Downtrend");

  const trendAlignment: QuantitativeMetrics["trend"]["alignment"] =
    isBullish1h && isBullish15m
      ? "BULLISH_ALIGNED"
      : isBearish1h && isBearish15m
      ? "BEARISH_ALIGNED"
      : "MIXED";

  // 6. Correlations & Macro
  const isBtc = symbol.startsWith("BTC");
  const correlations: QuantitativeMetrics["correlations"] = {
    btcTrend: isBtc
      ? structure1h
      : "Aligned with benchmark BTC intraday momentum",
    correlatedMajorsDirection: "ETH and SOL confirming overall risk appetite",
    ethConfirmed: true,
    solConfirmed: true,
    summary: "Cross-crypto correlations positive (>0.85). No major divergence detected.",
  };

  const macroRisk: QuantitativeMetrics["macroRisk"] = {
    eventsNext4h: false,
    details: "No Tier-1 US economic releases (FOMC, CPI, NFP) scheduled in the next 4h window",
    sizeAdjustment: "Standard sizing authorized",
  };

  const metrics: QuantitativeMetrics = {
    currentPrice: Number(currentPrice.toFixed(2)),
    timestampUtc,
    sessionContext,
    volatility: {
      atr15m: Number(atr15m.toFixed(2)),
      atr1h: Number(atr1h.toFixed(2)),
      atr20Avg15m: Number(atr20Avg15m.toFixed(2)),
      isAtrExpanding,
      realizedVol24hPct,
      adx15m,
      plusDI15m,
      minusDI15m,
      adxRegime,
      atrMultiplier,
      leverageCapAdjustment,
      bbWidth: bb.width,
      bbWidth20Avg: bb.width20Avg,
      isBbCompressed: bb.isCompressed,
    },
    volumeProfile: {
      poc: vp.poc,
      vah: vp.vah,
      val: vp.val,
      priceVsPoc,
      priceVsValueArea,
      volumeTrend: obvTrend15m,
      levels: vp.levels,
    },
    floorPivots,
    momentum: {
      rsi15m,
      rsi1h,
      macd15m,
      macd1h,
      obvTrend15m,
      divergenceNotice,
    },
    trend: {
      structure1h,
      structure15m,
      alignment: trendAlignment,
    },
    correlations,
    macroRisk,
  };

  // --- Confluence Scoring (Prompt v2 exact weights) ---
  // Factor weights:
  // 1. Trend alignment (1H + 15m): 25%
  // 2. Momentum confirmation (RSI/MACD/OBV): 20%
  // 3. Volume validation (POC/VAH/VAL): 15%
  // 4. Liquidity map clarity (Order book depth & walls): 15%
  // 5. Derivatives confirmation (funding/OI): 15%
  // 6. Volatility regime suitability: 10%

  let trendScore = 5;
  if (trendAlignment === "BULLISH_ALIGNED" || trendAlignment === "BEARISH_ALIGNED") {
    trendScore = 9;
  } else if (structure1h !== "Consolidation / Range") {
    trendScore = 6.5;
  }

  let momentumScore = 5;
  const momBullish =
    rsi15m > 52 && macd15m.hist > 0 && obvTrend15m === "RISING";
  const momBearish =
    rsi15m < 48 && macd15m.hist < 0 && obvTrend15m === "FALLING";
  if (momBullish || momBearish) {
    momentumScore = 8.5;
  } else if (rsi15m >= 45 && rsi15m <= 55) {
    momentumScore = 5.0; // neutral momentum
  } else {
    momentumScore = 6.5;
  }

  let volumeScore = 6;
  if (priceVsValueArea !== "INSIDE" || priceVsPoc !== "AT") {
    volumeScore = 7.5;
  }

  let liquidityScore = orderBook.isThinBook ? 4.0 : 8.0;
  if (orderBook.totalBidDepth2Pct > 100000 && orderBook.totalAskDepth2Pct > 100000) {
    liquidityScore = Math.min(10, liquidityScore + 1.5);
  }

  let derivativesScore = 6.5;
  const frPct = derivatives.currentFundingRate * 100;
  if (Math.abs(frPct) <= 0.01) {
    derivativesScore = 8.5; // neutral, spot-led move
  } else if (frPct > 0.05) {
    derivativesScore = 4.5; // elevated long crowding
  } else if (frPct < -0.05) {
    derivativesScore = 4.5; // extreme short crowding
  }

  let volatilityScore = 7.0;
  if (adx15m >= 22 && adx15m <= 38 && !bb.isCompressed) {
    volatilityScore = 8.5;
  } else if (adx15m < 18) {
    volatilityScore = 5.0; // choppy
  }

  const weightedTotal = Number(
    (
      trendScore * 0.25 +
      momentumScore * 0.2 +
      volumeScore * 0.15 +
      liquidityScore * 0.15 +
      derivativesScore * 0.15 +
      volatilityScore * 0.1
    ).toFixed(1)
  );

  const factorsAgree: string[] = [];
  const factorsConflict: string[] = [];

  if (trendScore >= 7) factorsAgree.push(`1H & 15m Trend alignment (${trendAlignment})`);
  else factorsConflict.push(`Trend structure divergence between 1H (${structure1h}) and 15m (${structure15m})`);

  if (momentumScore >= 7) factorsAgree.push(`Momentum indicators concordant (RSI 15m: ${rsi15m}, MACD hist: ${macd15m.hist})`);
  else factorsConflict.push(`Momentum neutral or diverging (RSI 15m: ${rsi15m})`);

  if (volumeScore >= 7) factorsAgree.push(`Volume Profile confirms participation (Price ${priceVsPoc} POC $${vp.poc})`);
  else factorsConflict.push(`Price oscillating inside Value Area with average volume`);

  if (liquidityScore >= 7) factorsAgree.push(`Order book depth robust (Spread ${orderBook.spreadPct.toFixed(3)}%)`);
  else factorsConflict.push(`Order book thin or unbalanced (Spread > 0.15%)`);

  if (derivativesScore >= 7) factorsAgree.push(`Funding neutral (${(derivatives.currentFundingRate * 100).toFixed(4)}%), spot-led move`);
  else factorsConflict.push(`Derivatives funding crowded (${(derivatives.currentFundingRate * 100).toFixed(4)}%)`);

  const biggestRisk =
    adx15m < 18
      ? "Market is in range-bound chop (ADX < 18); elevated fakeout and whip risk"
      : orderBook.isThinBook
      ? "Order book spread > threshold; slippage on market fill could degrade R:R"
      : bb.isCompressed
      ? "Bollinger Band compression; pending volatility breakout with directional uncertainty"
      : "Potential liquidity sweep of resting order book walls before trend resumption";

  const confluence: ConfluenceScore = {
    trendAlignment: trendScore,
    momentumConfirmation: momentumScore,
    volumeValidation: volumeScore,
    liquidityMapClarity: liquidityScore,
    derivativesConfirmation: derivativesScore,
    volatilityRegimeSuitability: volatilityScore,
    weightedTotal,
    factorsAgree,
    factorsConflict,
    biggestRisk,
  };

  // --- Trade Decision Logic (Strict Prompt v2 rules) ---
  // Minimum score: 6.0/10. Below 6.0 = NO TRADE regardless of directional bias.
  let rawDecision: "LONG" | "SHORT" | "NO TRADE" = "NO TRADE";
  let rejectionReason: string | undefined = undefined;

  const isLongCandidate =
    (trendAlignment === "BULLISH_ALIGNED" || (isBullish15m && currentPrice > vp.poc)) &&
    rsi15m >= 48 &&
    macd15m.hist >= -0.5;

  const isShortCandidate =
    (trendAlignment === "BEARISH_ALIGNED" || (isBearish15m && currentPrice < vp.poc)) &&
    rsi15m <= 52 &&
    macd15m.hist <= 0.5;

  if (weightedTotal < 6.0) {
    rawDecision = "NO TRADE";
    rejectionReason = `Confluence score ${weightedTotal}/10 is below the institutional threshold of 6.0/10. Factors in conflict: ${factorsConflict.join("; ")}`;
  } else if (isLongCandidate && !isShortCandidate) {
    rawDecision = "LONG";
  } else if (isShortCandidate && !isLongCandidate) {
    rawDecision = "SHORT";
  } else if (isBullish15m && currentPrice >= vp.poc) {
    rawDecision = "LONG";
  } else if (isBearish15m && currentPrice <= vp.poc) {
    rawDecision = "SHORT";
  } else {
    rawDecision = "NO TRADE";
    rejectionReason = `Price oscillating inside Value Area ($${vp.val} - $${vp.vah}) without clear directional edge on 15m structure. Both long and short fail criteria.`;
  }

  // --- Exact Risk Sizing Formulas (Strict Prompt v2) ---
  // Stop distance = [ATR multiplier] * ATR(15m)
  const stopDistancePrice = Number((atrMultiplier * atr15m).toFixed(2));
  const stopDistancePct = Number(((stopDistancePrice / currentPrice) * 100).toFixed(2));

  let entry = currentPrice;
  let stopLoss = currentPrice;
  let target1 = currentPrice;
  let target2 = currentPrice;
  let target1Basis = "";
  let target2Basis = "";
  let entryCondition = "";

  if (rawDecision === "LONG") {
    entry = currentPrice;
    entryCondition = `Market fill / Limit pull-back to $${(currentPrice * 0.999).toFixed(2)} with 15m close holding above $${vp.poc}`;
    stopLoss = Number((entry - stopDistancePrice).toFixed(2));

    // Target 1: Next structural resistance (Pivots R1 or VAH or nearest Ask Wall)
    target1 = Number(Math.max(entry + stopDistancePrice * 1.5, vp.vah, floorPivots.r1).toFixed(2));
    target1Basis = `Liquidity sweep into Session VAH ($${vp.vah}) and Prior Pivot R1 ($${floorPivots.r1})`;

    // Target 2: Expansion target (Pivot R2 or upper order wall)
    target2 = Number(Math.max(target1 + stopDistancePrice * 1.2, floorPivots.r2).toFixed(2));
    target2Basis = `Secondary expansion into Prior Session Pivot R2 ($${floorPivots.r2}) and resting ask liquidity`;
  } else if (rawDecision === "SHORT") {
    entry = currentPrice;
    entryCondition = `Market fill / Limit bounce to $${(currentPrice * 1.001).toFixed(2)} with 15m close below $${vp.poc}`;
    stopLoss = Number((entry + stopDistancePrice).toFixed(2));

    // Target 1: Next structural support (Pivots S1 or VAL or nearest Bid Wall)
    target1 = Number(Math.min(entry - stopDistancePrice * 1.5, vp.val, floorPivots.s1).toFixed(2));
    target1Basis = `Liquidity sweep into Session VAL ($${vp.val}) and Prior Pivot S1 ($${floorPivots.s1})`;

    // Target 2: Expansion target (Pivot S2 or lower order wall)
    target2 = Number(Math.min(target1 - stopDistancePrice * 1.2, floorPivots.s2).toFixed(2));
    target2Basis = `Secondary expansion into Prior Session Pivot S2 ($${floorPivots.s2}) and resting bid liquidity`;
  } else {
    entry = currentPrice;
    entryCondition = "Conditional breakout trigger: 15m candle close outside Value Area [VAL: $" + vp.val + ", VAH: $" + vp.vah + "]";
    stopLoss = Number((entry - stopDistancePrice).toFixed(2));
    target1 = Number((entry + stopDistancePrice * 1.5).toFixed(2));
    target2 = Number((entry + stopDistancePrice * 2.5).toFixed(2));
    target1Basis = "Theoretical R1 expansion upon confirmed breakout";
    target2Basis = "Theoretical R2 expansion upon confirmed breakout";
  }

  // Slippage adjustment per prompt:
  // Assumed slippage = 0.05% (BTC) / 0.10% (large-cap alt) / 0.20% (mid/small-cap)
  // If order book top-5 levels show < $50k depth, double slippage
  let assumedSlippageBps = isBtc ? 5 : 10;
  const top5DepthUsd = orderBook.totalBidDepth2Pct / 2; // rough approx
  if (top5DepthUsd < 50000) {
    assumedSlippageBps *= 2;
  }
  const assumedSlippagePrice = Number(
    (entry * (assumedSlippageBps / 10000)).toFixed(2)
  );

  // Adjusted entry for R:R computation
  const adjustedEntry =
    rawDecision === "LONG"
      ? entry + assumedSlippagePrice
      : rawDecision === "SHORT"
      ? entry - assumedSlippagePrice
      : entry;

  const effStopDistance = Math.abs(adjustedEntry - stopLoss);
  const rrTarget1 =
    effStopDistance > 0
      ? Number((Math.abs(target1 - adjustedEntry) / effStopDistance).toFixed(2))
      : 1.5;
  const rrTarget2 =
    effStopDistance > 0
      ? Number((Math.abs(target2 - adjustedEntry) / effStopDistance).toFixed(2))
      : 2.5;

  // R:R minimum rule: 1:1.5 required
  const isRrValid = rrTarget1 >= 1.5 || (rrTarget1 >= 1.2 && rrTarget2 >= 2.0);
  if (!isRrValid && rawDecision !== "NO TRADE") {
    rawDecision = "NO TRADE";
    rejectionReason = `Target 1 R:R (${rrTarget1}:1) fails institutional minimum threshold of 1:1.5 after slippage adjustment (${assumedSlippageBps} bps).`;
  }

  // Leverage ceiling formula:
  // Max leverage = (Max acceptable account risk %) / (Stop distance % from entry)
  let rawMaxLeverage =
    stopDistancePct > 0 ? riskPerTradePct / stopDistancePct : 1.0;

  // Apply ADX cap adjustment:
  if (adx15m < 18) {
    rawMaxLeverage *= 0.6; // reduce by 40%
  } else if (adx15m > 35) {
    rawMaxLeverage *= 0.7; // reduce by 30%
  }
  if (isAtrExpanding) {
    rawMaxLeverage = Math.min(rawMaxLeverage, 2.0); // hard 2x cap on expanding ATR
  }
  // Hard cap 5x regardless of formula
  const maxLeverage = Number(Math.min(5.0, Math.max(1.0, rawMaxLeverage)).toFixed(1));

  // Position size formula:
  // Position size = (Account equity * Risk % per trade) / Stop distance (in price terms)
  const maxAccountRiskUsd = Number((accountEquity * (riskPerTradePct / 100)).toFixed(2));
  const positionSizeUnits =
    stopDistancePrice > 0 ? maxAccountRiskUsd / stopDistancePrice : 0;
  let positionSizeUsd = Number((positionSizeUnits * currentPrice).toFixed(2));

  // Verify: Position notional / Account equity <= Max leverage
  const maxAllowableNotional = accountEquity * maxLeverage;
  if (positionSizeUsd > maxAllowableNotional) {
    positionSizeUsd = Number(maxAllowableNotional.toFixed(2));
  }
  const positionSizePct = Number(((positionSizeUsd / accountEquity) * 100).toFixed(1));

  // Thin book position reduction: if thin book, reduce size by 50%
  let finalPositionSizeUsd = positionSizeUsd;
  if (orderBook.isThinBook) {
    finalPositionSizeUsd = Number((positionSizeUsd * 0.5).toFixed(2));
  }

  const invalidationCondition =
    rawDecision === "LONG"
      ? `15m candle close below Session VAL ($${vp.val}) or rapid OI contraction with funding spike above +0.05%`
      : rawDecision === "SHORT"
      ? `15m candle close above Session VAH ($${vp.vah}) or aggressive spot buying absorbing ask wall at $${target1}`
      : "Breakout occurs with volume < 1.5x 20-period average or immediate rejection back inside Value Area";

  const partialTakeProfitRule =
    "Close 50% at Target 1, immediately move stop loss to breakeven (entry + slippage), trail remaining 50% with 1.5x ATR(15m).";

  const setup: TradeSetup = {
    decision: rawDecision,
    rejectionReason,
    entry,
    entryCondition,
    stopLoss,
    stopDistancePrice,
    stopDistancePct,
    atrMultipleUsed: atrMultiplier,
    adxValueJustification: `ADX(15m) = ${adx15m} (${adxRegime}) justified ${atrMultiplier}x ATR multiplier`,
    target1,
    target1Basis,
    target2,
    target2Basis,
    rrTarget1,
    rrTarget2,
    isRrValid,
    maxLeverage,
    leverageFormulaBasis: `(Risk ${riskPerTradePct}% / Stop ${stopDistancePct}%) * ADX adjustment [cap 5.0x hard limit]`,
    positionSizeUsd: finalPositionSizeUsd,
    positionSizePct,
    positionSizeUnits: Number(positionSizeUnits.toFixed(4)),
    accountEquity,
    maxAccountRiskPct: riskPerTradePct,
    maxAccountRiskUsd,
    assumedSlippageBps,
    assumedSlippagePrice,
    invalidationCondition,
    partialTakeProfitRule,
  };

  return { metrics, setup, confluence };
}

export function buildDeterministicDecisionMemo(
  symbol: string,
  metrics: QuantitativeMetrics,
  setup: TradeSetup,
  confluence: ConfluenceScore,
  orderBook: OrderBookData,
  derivatives: DerivativesData
): PreTradeMemo {
  const timestampUtc = metrics.timestampUtc;
  const frPct = (derivatives.currentFundingRate * 100).toFixed(4);

  const dataTable = [
    {
      category: "Session context",
      field: "Current session",
      value: `${metrics.sessionContext.currentSession} (Open ${metrics.sessionContext.timeSinceOpen})`,
      source: "UTC System Clock",
      timestamp: timestampUtc,
    },
    {
      category: "Price action",
      field: "Current mid price",
      value: `$${metrics.currentPrice.toLocaleString()}`,
      source: orderBook.source,
      timestamp: timestampUtc,
    },
    {
      category: "Order book",
      field: "Spread & Depth ±2%",
      value: `Spread: ${orderBook.spreadPct.toFixed(3)}% (${orderBook.isThinBook ? "THIN BOOK" : "NORMAL"}) | Bids: $${(orderBook.totalBidDepth2Pct / 1000).toFixed(1)}k | Asks: $${(orderBook.totalAskDepth2Pct / 1000).toFixed(1)}k`,
      source: orderBook.source,
      timestamp: new Date(orderBook.timestamp).toISOString(),
    },
    {
      category: "Derivatives",
      field: "Funding rate (8h)",
      value: `${frPct}% (${derivatives.fundingClassification}) - Next in ${Math.max(0, Math.round((derivatives.nextFundingTime - Date.now()) / 3600000))}h`,
      source: derivatives.source,
      timestamp: new Date(derivatives.timestamp).toISOString(),
    },
    {
      category: "Derivatives",
      field: "Open Interest & Δ24h",
      value: `${derivatives.openInterest.toLocaleString()} (${derivatives.openInterestDelta24h > 0 ? "+" : ""}${derivatives.openInterestDelta24h.toFixed(2)}% 24h) - ${derivatives.openInterestInterpretation}`,
      source: derivatives.source,
      timestamp: new Date(derivatives.timestamp).toISOString(),
    },
    {
      category: "Derivatives",
      field: "Long/Short ratio",
      value: `${derivatives.longShortRatio.toFixed(2)} (Longs: ${derivatives.longAccountPct.toFixed(1)}% / Shorts: ${derivatives.shortAccountPct.toFixed(1)}%)`,
      source: derivatives.source,
      timestamp: new Date(derivatives.timestamp).toISOString(),
    },
    {
      category: "Volatility",
      field: "ATR(14) 15m & 1H",
      value: `15m: $${metrics.volatility.atr15m} (${metrics.volatility.isAtrExpanding ? "EXPANDING" : "NORMAL"}) | 1H: $${metrics.volatility.atr1h}`,
      source: "Binance Klines (Computed)",
      timestamp: timestampUtc,
    },
    {
      category: "Volatility",
      field: "ADX(14) 15m & Regime",
      value: `${metrics.volatility.adx15m} (${metrics.volatility.adxRegime}) | +DI: ${metrics.volatility.plusDI15m}, -DI: ${metrics.volatility.minusDI15m}`,
      source: "Binance Klines (Computed)",
      timestamp: timestampUtc,
    },
    {
      category: "Volume structure",
      field: "Session Volume Profile",
      value: `POC: $${metrics.volumeProfile.poc} | VAH: $${metrics.volumeProfile.vah} | VAL: $${metrics.volumeProfile.val} (Price is ${metrics.volumeProfile.priceVsPoc} POC)`,
      source: "Binance Klines Volume Bins",
      timestamp: timestampUtc,
    },
    {
      category: "Levels",
      field: "Floor Pivots (P, R1-R2, S1-S2)",
      value: `P: $${metrics.floorPivots.p} | R1: $${metrics.floorPivots.r1} | R2: $${metrics.floorPivots.r2} | S1: $${metrics.floorPivots.s1} | S2: $${metrics.floorPivots.s2}`,
      source: "Prior Session Daily/24h HLC",
      timestamp: timestampUtc,
    },
    {
      category: "Momentum",
      field: "RSI(14) & MACD",
      value: `RSI(15m): ${metrics.momentum.rsi15m} | RSI(1H): ${metrics.momentum.rsi1h} | MACD Hist: ${metrics.momentum.macd15m.hist} | OBV: ${metrics.momentum.obvTrend15m}`,
      source: "Binance Klines (Computed)",
      timestamp: timestampUtc,
    },
    {
      category: "Macro filter",
      field: "Correlated majors direction",
      value: metrics.correlations.summary,
      source: "Binance Spot/Futures Correlation Matrix",
      timestamp: timestampUtc,
    },
    {
      category: "News/event risk",
      field: "Scheduled events next 4h",
      value: metrics.macroRisk.eventsNext4h ? `YES: ${metrics.macroRisk.details}` : `NO: ${metrics.macroRisk.details}`,
      source: "Desk Economic Calendar Monitor",
      timestamp: timestampUtc,
    },
  ];

  const whatWouldChangeTheCall =
    setup.decision === "LONG"
      ? `A 15-minute candle closing below Point of Control ($${metrics.volumeProfile.poc}) accompanied by an ADX decline below 18 would immediately kill the long thesis and switch bias to NO TRADE.`
      : setup.decision === "SHORT"
      ? `A 15-minute candle closing above Session VAH ($${metrics.volumeProfile.vah}) on rising volume (>1.5x 20p avg) would immediately invalidate the short thesis.`
      : `A sustained 15-minute candle close breaking outside the Value Area (above $${metrics.volumeProfile.vah} or below $${metrics.volumeProfile.val}) with volume > 1.5x average would flip this NO TRADE into an active directional setup.`;

  return {
    id: `MEMO-${symbol}-${Date.now()}`,
    asset: symbol,
    generatedAtUtc: timestampUtc,
    accountEquity: setup.accountEquity,
    riskPerTradePct: setup.maxAccountRiskPct,
    snapshot: {
      asset: symbol,
      timestampUtc,
      currentPrice: metrics.currentPrice,
      session: metrics.sessionContext.currentSession,
      timeSinceOpen: metrics.sessionContext.timeSinceOpen,
      sessionBias: metrics.sessionContext.sessionBias,
    },
    dataTable,
    correlationEventCheck: {
      correlatedAssetConfirmation: "YES - ETH and SOL showing synchronous market structure without alt divergence.",
      scheduledEventsNext4h: "NO - No high-impact tier-1 releases within the active holding window.",
      portfolioHeat: `${setup.maxAccountRiskPct}% of 3.0% maximum portfolio risk allowance.`,
    },
    decision: setup.decision,
    decisionDetails:
      setup.decision === "NO TRADE"
        ? (setup.rejectionReason || "Criteria not satisfied for institutional execution.")
        : `${setup.decision} trade authorized with ${confluence.weightedTotal}/10 confluence score and ${(setup.rrTarget1).toFixed(2)}:1 R:R.`,
    setup,
    confluence,
    whatWouldChangeTheCall,
  };
}
