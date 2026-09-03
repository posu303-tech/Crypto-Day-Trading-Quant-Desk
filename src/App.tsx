import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { DecisionBanner } from "./components/DecisionBanner";
import { MarketChart } from "./components/MarketChart";
import { OrderBookDepth } from "./components/OrderBookDepth";
import { DerivativesPanel } from "./components/DerivativesPanel";
import { MemoView } from "./components/MemoView";
import { RiskCalculator } from "./components/RiskCalculator";
import {
  Candle,
  OrderBookData,
  DerivativesData,
  QuantitativeMetrics,
  TradeSetup,
  ConfluenceScore,
  PreTradeMemo,
} from "./types/trading";
import { LayoutDashboard, FileText, BarChart3, Database, AlertCircle } from "lucide-react";

export default function App() {
  const [currentSymbol, setCurrentSymbol] = useState("BTCUSDT");
  const [symbolsList, setSymbolsList] = useState<
    Array<{ symbol: string; price: number; priceChangePercent: number }>
  >([]);
  const [accountEquity, setAccountEquity] = useState(10000);
  const [riskPct, setRiskPct] = useState(1.0);
  const [autoRefreshSec, setAutoRefreshSec] = useState(30);

  const [activeTab, setActiveTab] = useState<
    "overview" | "memo" | "chart" | "orderbook"
  >("overview");

  const [isLoading, setIsLoading] = useState(true);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);

  // Market structure state
  const [candles15m, setCandles15m] = useState<Candle[]>([]);
  const [candles1h, setCandles1h] = useState<Candle[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [derivatives, setDerivatives] = useState<DerivativesData | null>(null);
  const [metrics, setMetrics] = useState<QuantitativeMetrics | null>(null);
  const [setup, setSetup] = useState<TradeSetup | null>(null);
  const [confluence, setConfluence] = useState<ConfluenceScore | null>(null);
  const [memo, setMemo] = useState<PreTradeMemo | null>(null);

  // Fetch Tickers
  const loadTickers = useCallback(async () => {
    try {
      const res = await fetch("/api/tickers");
      if (res.ok) {
        const data = await res.json();
        setSymbolsList(data.symbols || []);
      }
    } catch (err) {
      console.warn("Tickers load error:", err);
    }
  }, []);

  // Fetch Market Data
  const loadMarketData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/market-data?symbol=${currentSymbol}&equity=${accountEquity}&riskPct=${riskPct}`
      );
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      setCandles15m(data.candles15m || []);
      setCandles1h(data.candles1h || []);
      setOrderBook(data.orderBook || null);
      setDerivatives(data.derivatives || null);
      setMetrics(data.metrics || null);
      setSetup(data.setup || null);
      setConfluence(data.confluence || null);
      setMemo(data.memo || null);
      setHasGeminiKey(Boolean(data.hasGeminiKey));
    } catch (err: any) {
      console.error("Market data fetch failed:", err);
      setError(err.message || "Failed to connect to market data feed");
    } finally {
      setIsLoading(false);
    }
  }, [currentSymbol, accountEquity, riskPct]);

  // Initial load
  useEffect(() => {
    loadTickers();
  }, [loadTickers]);

  useEffect(() => {
    loadMarketData();
  }, [loadMarketData]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      loadMarketData();
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec, loadMarketData]);

  // Generate AI memo
  const handleGenerateAiMemo = async () => {
    setIsAiGenerating(true);
    try {
      const res = await fetch("/api/generate-memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: currentSymbol,
          accountEquity,
          riskPerTradePct: riskPct,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.memo) {
          setMemo(data.memo);
          setActiveTab("memo");
        }
      }
    } catch (err) {
      console.error("Failed to generate AI memo:", err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Copy Memo to clipboard
  const handleCopyMemo = () => {
    if (!memo) return;
    const text = `
# PRE-TRADE DECISION MEMO (${memo.asset})
Generated: ${memo.generatedAtUtc} | Desk: Crypto Intraday Quant

## DECISION: ${memo.decision}
Reason: ${memo.decisionDetails}

## TRADE SETUP
- Entry: $${memo.setup.entry} (${memo.setup.entryCondition})
- Stop Loss: $${memo.setup.stopLoss} (${memo.setup.atrMultipleUsed}x ATR | ${memo.setup.adxValueJustification})
- Target 1: $${memo.setup.target1} (R:R 1:${memo.setup.rrTarget1})
- Target 2: $${memo.setup.target2} (R:R 1:${memo.setup.rrTarget2})
- Max Leverage: ${memo.setup.maxLeverage}x
- Position Size: $${memo.setup.positionSizeUsd.toLocaleString()} (${memo.setup.positionSizePct}% of $${memo.accountEquity.toLocaleString()} equity)
- Invalidation: ${memo.setup.invalidationCondition}
- Partial Take-Profit: ${memo.setup.partialTakeProfitRule}

## CONFLUENCE SCORE: ${memo.confluence.weightedTotal}/10
- Factors Agreeing: ${memo.confluence.factorsAgree.join("; ")}
- Single Biggest Risk: ${memo.confluence.biggestRisk}

## WHAT WOULD CHANGE THE CALL:
${memo.whatWouldChangeTheCall}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans selection:bg-cyan-900 selection:text-cyan-100">
      {/* Top Header with live session context */}
      <Header
        currentSymbol={currentSymbol}
        onSelectSymbol={(sym) => setCurrentSymbol(sym)}
        symbolsList={symbolsList}
        currentSession={metrics?.sessionContext.currentSession || "Market Session"}
        timeSinceOpen={metrics?.sessionContext.timeSinceOpen || "0h 00m"}
        accountEquity={accountEquity}
        onEquityChange={(eq) => setAccountEquity(eq)}
        riskPct={riskPct}
        onRiskPctChange={(r) => setRiskPct(r)}
        onRefresh={loadMarketData}
        isLoading={isLoading}
        hasGeminiKey={hasGeminiKey}
        autoRefreshSec={autoRefreshSec}
        onSetAutoRefresh={(sec) => setAutoRefreshSec(sec)}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 space-y-5">
        {/* Error Notification if any */}
        {error && (
          <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-lg flex items-center justify-between text-xs font-mono text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadMarketData}
              className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 rounded text-rose-100 font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Primary Decision Banner (Instant Binary/Ternary Verdict) */}
        {setup && confluence && (
          <DecisionBanner
            setup={setup}
            confluence={confluence}
            symbol={currentSymbol}
            currentPrice={metrics?.currentPrice || setup.entry}
            onGenerateAiMemo={handleGenerateAiMemo}
            isAiGenerating={isAiGenerating}
            onCopyMemo={handleCopyMemo}
            copied={copied}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
          />
        )}

        {/* Workspace Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition border ${
                activeTab === "overview"
                  ? "bg-slate-850 border-cyan-500 text-cyan-400 font-bold"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Desk Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("memo")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition border ${
                activeTab === "memo"
                  ? "bg-slate-850 border-cyan-500 text-cyan-400 font-bold"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>7-Section Pre-Trade Memo</span>
            </button>

            <button
              onClick={() => setActiveTab("chart")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition border ${
                activeTab === "chart"
                  ? "bg-slate-850 border-cyan-500 text-cyan-400 font-bold"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Market Structure Chart</span>
            </button>

            <button
              onClick={() => setActiveTab("orderbook")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition border ${
                activeTab === "orderbook"
                  ? "bg-slate-850 border-cyan-500 text-cyan-400 font-bold"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Order Book & Liquidity</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span>R:R Min: 1:1.5</span>
            <span>•</span>
            <span>Threshold: 6.0/10</span>
            <span>•</span>
            <span>Max Heat: 3.0%</span>
          </div>
        </div>

        {/* Tab 1: Overview Desk */}
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* Chart + Order Book Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                {metrics && setup && (
                  <MarketChart
                    candles15m={candles15m}
                    candles1h={candles1h}
                    metrics={metrics}
                    setup={setup}
                    symbol={currentSymbol}
                  />
                )}
              </div>

              <div>
                {orderBook && (
                  <OrderBookDepth orderBook={orderBook} symbol={currentSymbol} />
                )}
              </div>
            </div>

            {/* Derivatives Radar Row */}
            {derivatives && metrics && (
              <DerivativesPanel derivatives={derivatives} metrics={metrics} />
            )}

            {/* Risk Sizing & Scenario Calculator */}
            {setup && metrics && (
              <RiskCalculator
                setup={setup}
                metrics={metrics}
                accountEquity={accountEquity}
                onEquityChange={(eq) => setAccountEquity(eq)}
                riskPct={riskPct}
                onRiskPctChange={(r) => setRiskPct(r)}
              />
            )}
          </div>
        )}

        {/* Tab 2: Full 7-Section Decision Memo */}
        {activeTab === "memo" && memo && (
          <MemoView
            memo={memo}
            onGenerateAiMemo={handleGenerateAiMemo}
            isAiGenerating={isAiGenerating}
            onCopyMemo={handleCopyMemo}
            copied={copied}
          />
        )}

        {/* Tab 3: Detailed Chart View */}
        {activeTab === "chart" && metrics && setup && (
          <div className="space-y-5">
            <MarketChart
              candles15m={candles15m}
              candles1h={candles1h}
              metrics={metrics}
              setup={setup}
              symbol={currentSymbol}
            />
            {derivatives && metrics && (
              <DerivativesPanel derivatives={derivatives} metrics={metrics} />
            )}
          </div>
        )}

        {/* Tab 4: Order Book & Liquidity Radar */}
        {activeTab === "orderbook" && orderBook && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <OrderBookDepth orderBook={orderBook} symbol={currentSymbol} />
            {setup && metrics && (
              <RiskCalculator
                setup={setup}
                metrics={metrics}
                accountEquity={accountEquity}
                onEquityChange={(eq) => setAccountEquity(eq)}
                riskPct={riskPct}
                onRiskPctChange={(r) => setRiskPct(r)}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer / Terminal Status Bar */}
      <footer className="border-t border-slate-900 bg-slate-950 py-3 px-4 text-[11px] font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span>INSTITUTIONAL QUANTITATIVE PRE-TRADE MEMO (PROMPT v2)</span>
            <span>•</span>
            <span className="text-slate-400">Zero Fabrication Rule Enforced</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Primary Feed: Binance USD-M</span>
            <span>•</span>
            <span className="text-slate-400">Holding Window: &le; 24h Intraday</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
