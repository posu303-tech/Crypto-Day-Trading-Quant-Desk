export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  qty: number;
  total: number;
}

export interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  spread: number;
  spreadPct: number;
  isThinBook: boolean;
  totalBidDepth2Pct: number; // in USD
  totalAskDepth2Pct: number; // in USD
  topBidWalls: { price: number; qtyUsd: number }[];
  topAskWalls: { price: number; qtyUsd: number }[];
  timestamp: number;
  source: string;
}

export interface DerivativesData {
  currentFundingRate: number;
  fundingRateHistory: { fundingTime: number; fundingRate: number }[];
  nextFundingTime: number;
  fundingClassification: string;
  fundingImplication: string;
  openInterest: number;
  openInterestUsd: number;
  openInterestDelta24h: number; // percentage change
  openInterestInterpretation: string;
  longShortRatio: number;
  longAccountPct: number;
  shortAccountPct: number;
  topTraderRatio?: number;
  timestamp: number;
  source: string;
}

export interface VolumeProfileLevel {
  price: number;
  volume: number;
  percent: number;
  isPoc: boolean;
  isValueArea: boolean;
}

export interface QuantitativeMetrics {
  currentPrice: number;
  timestampUtc: string;
  sessionContext: {
    currentSession: string;
    timeSinceOpen: string;
    sessionBias: string;
  };
  volatility: {
    atr15m: number;
    atr1h: number;
    atr20Avg15m: number;
    isAtrExpanding: boolean;
    realizedVol24hPct: number;
    adx15m: number;
    plusDI15m: number;
    minusDI15m: number;
    adxRegime: "Range-bound / choppy" | "Transitional" | "Trending" | "Strong trend / climactic";
    atrMultiplier: number;
    leverageCapAdjustment: string;
    bbWidth: number;
    bbWidth20Avg: number;
    isBbCompressed: boolean;
  };
  volumeProfile: {
    poc: number;
    vah: number;
    val: number;
    priceVsPoc: "ABOVE" | "BELOW" | "AT";
    priceVsValueArea: "INSIDE" | "ABOVE_VAH" | "BELOW_VAL";
    volumeTrend: "RISING" | "FALLING" | "NEUTRAL";
    levels: VolumeProfileLevel[];
  };
  floorPivots: {
    p: number;
    r1: number;
    r2: number;
    r3: number;
    s1: number;
    s2: number;
    s3: number;
  };
  momentum: {
    rsi15m: number;
    rsi1h: number;
    macd15m: { macd: number; signal: number; hist: number };
    macd1h: { macd: number; signal: number; hist: number };
    obvTrend15m: "RISING" | "FALLING" | "NEUTRAL";
    divergenceNotice: string | null;
  };
  trend: {
    structure1h: "Higher Highs & Higher Lows (Uptrend)" | "Lower Highs & Lower Lows (Downtrend)" | "Consolidation / Range";
    structure15m: "Higher Highs & Higher Lows (Uptrend)" | "Lower Highs & Lower Lows (Downtrend)" | "Consolidation / Range";
    alignment: "BULLISH_ALIGNED" | "BEARISH_ALIGNED" | "MIXED";
  };
  correlations: {
    btcTrend: string;
    correlatedMajorsDirection: string;
    ethConfirmed: boolean;
    solConfirmed: boolean;
    summary: string;
  };
  macroRisk: {
    eventsNext4h: boolean;
    details: string;
    sizeAdjustment: string;
  };
}

export interface TradeSetup {
  decision: "LONG" | "SHORT" | "NO TRADE";
  rejectionReason?: string;
  entry: number;
  entryCondition: string;
  stopLoss: number;
  stopDistancePrice: number;
  stopDistancePct: number;
  atrMultipleUsed: number;
  adxValueJustification: string;
  target1: number;
  target1Basis: string;
  target2: number;
  target2Basis: string;
  rrTarget1: number;
  rrTarget2: number;
  isRrValid: boolean;
  maxLeverage: number;
  leverageFormulaBasis: string;
  positionSizeUsd: number;
  positionSizePct: number;
  positionSizeUnits: number;
  accountEquity: number;
  maxAccountRiskPct: number;
  maxAccountRiskUsd: number;
  assumedSlippageBps: number;
  assumedSlippagePrice: number;
  invalidationCondition: string;
  partialTakeProfitRule: string;
}

export interface ConfluenceScore {
  trendAlignment: number; // weight 25%
  momentumConfirmation: number; // weight 20%
  volumeValidation: number; // weight 15%
  liquidityMapClarity: number; // weight 15%
  derivativesConfirmation: number; // weight 15%
  volatilityRegimeSuitability: number; // weight 10%
  weightedTotal: number; // out of 10
  factorsAgree: string[];
  factorsConflict: string[];
  biggestRisk: string;
}

export interface PreTradeMemo {
  id: string;
  asset: string;
  generatedAtUtc: string;
  accountEquity: number;
  riskPerTradePct: number;
  snapshot: {
    asset: string;
    timestampUtc: string;
    currentPrice: number;
    session: string;
    timeSinceOpen: string;
    sessionBias: string;
  };
  dataTable: Array<{
    category: string;
    field: string;
    value: string;
    source: string;
    timestamp: string;
  }>;
  correlationEventCheck: {
    correlatedAssetConfirmation: string;
    scheduledEventsNext4h: string;
    portfolioHeat: string;
  };
  decision: "LONG" | "SHORT" | "NO TRADE";
  decisionDetails: string;
  setup: TradeSetup;
  confluence: ConfluenceScore;
  whatWouldChangeTheCall: string;
  aiSynthesisMemo?: string;
  aiModelUsed?: string;
}
