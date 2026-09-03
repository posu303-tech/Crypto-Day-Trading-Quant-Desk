import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Cpu,
  Sliders,
  DollarSign,
  Percent,
} from "lucide-react";

// Fast live-price ticker: polls a lightweight endpoint every 1s
const LivePrice: React.FC<{ symbol: string }> = ({ symbol }) => {
  const [price, setPrice] = useState<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/live-price?symbol=${encodeURIComponent(symbol)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setPrice((prev) => {
          if (prev !== null && data.price !== prev) {
            setFlash(data.price > prev ? "up" : "down");
          }
          return data.price;
        });
      } catch {
        // keep last price
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [symbol]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [flash]);

  const textColor =
    flash === "up"
      ? "text-emerald-300"
      : flash === "down"
      ? "text-rose-300"
      : "text-slate-100";

  return (
    <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
      <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Live
      </span>
      <span className={`text-sm font-mono font-semibold tabular-nums ${textColor} transition-colors duration-200`}>
        {price != null ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
      </span>
    </div>
  );
};


interface HeaderProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  symbolsList: Array<{
    symbol: string;
    price: number;
    priceChangePercent: number;
  }>;
  currentSession: string;
  timeSinceOpen: string;
  accountEquity: number;
  onEquityChange: (equity: number) => void;
  riskPct: number;
  onRiskPctChange: (risk: number) => void;
  onRefresh: () => void;
  isLoading: boolean;
  hasGeminiKey: boolean;
  autoRefreshSec: number;
  onSetAutoRefresh: (sec: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSymbol,
  onSelectSymbol,
  symbolsList,
  currentSession,
  timeSinceOpen,
  accountEquity,
  onEquityChange,
  riskPct,
  onRiskPctChange,
  onRefresh,
  isLoading,
  hasGeminiKey,
  autoRefreshSec,
  onSetAutoRefresh,
}) => {
  const [utcTime, setUtcTime] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(
        now.toISOString().replace("T", " ").substring(0, 19) + " UTC"
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
      {/* Top Main Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Desk Title & Live Session */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm shadow-sm shadow-cyan-950">
            QT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tracking-wider font-semibold text-cyan-400 uppercase">
                Sell-Side Quant Desk
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                PROMPT v2
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE BINANCE FEED
              </span>
            </div>
            <h1 className="text-sm font-medium text-slate-200">
              Institutional Intraday Pre-Trade Decision Engine
            </h1>
          </div>
        </div>

        {/* Live Session Clock & UTC */}
        <div className="hidden lg:flex items-center gap-4 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-mono text-slate-300">{utcTime}</span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-slate-200">{currentSession}</span>
            <span className="text-[11px] font-mono text-slate-400">
              (Elapsed {timeSinceOpen})
            </span>
          </div>
        </div>

        {/* Global Controls: Equity, Risk, Refresh */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Fast live price ticker */}
          <LivePrice symbol={currentSymbol} />
          {/* AI badge */}
          <div
            title={
              hasGeminiKey
                ? "Gemini 3.8 Flash AI Model Active (Server-Side)"
                : "Deterministic Quant Mode Active (Gemini API Key detected via environment)"
            }
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border ${
              hasGeminiKey
                ? "bg-purple-950/40 border-purple-800/60 text-purple-300"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>{hasGeminiKey ? "Gemini 3.8 Flash" : "Quant Engine"}</span>
          </div>

          {/* Sizing button toggle */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-mono bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition"
            title="Configure Account Equity & Risk %"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Risk:</span>
            <span className="text-cyan-300">${accountEquity.toLocaleString()}</span>
            <span className="text-slate-500">/</span>
            <span className="text-emerald-400">{riskPct}%</span>
          </button>

          {/* Auto Refresh dropdown */}
          <select
            value={autoRefreshSec}
            onChange={(e) => onSetAutoRefresh(Number(e.target.value))}
            className="bg-slate-900 text-slate-300 text-xs font-mono px-2 py-1.5 rounded border border-slate-800 focus:outline-none focus:border-cyan-600"
          >
            <option value={0}>Auto: OFF</option>
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
          </select>

          {/* Manual Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-mono font-medium bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-slate-950 transition disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">{isLoading ? "Fetching" : "Fetch"}</span>
          </button>
        </div>
      </div>

      {/* Sizing & Equity Dropdown Bar if opened */}
      {showConfig && (
        <div className="bg-slate-900 border-t border-slate-800 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-mono flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                  Account Equity ($):
                </span>
                <input
                  type="number"
                  min={100}
                  step={1000}
                  value={accountEquity}
                  onChange={(e) => onEquityChange(Math.max(100, Number(e.target.value) || 1000))}
                  className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[11px] text-slate-500">
                  (Assumed: $10,000 standard)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-mono flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  Risk / Trade (%):
                </span>
                <input
                  type="number"
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  value={riskPct}
                  onChange={(e) => onRiskPctChange(Math.max(0.1, Math.min(3.0, Number(e.target.value) || 1.0)))}
                  className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[11px] text-slate-500">
                  (Default: 1.0%, Max Heat: 3.0%)
                </span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              Dollar Risk:{" "}
              <span className="text-emerald-400 font-semibold">
                ${((accountEquity * riskPct) / 100).toFixed(2)}
              </span>{" "}
              | Max Cap: 5.0x hard leverage limit
            </div>
          </div>
        </div>
      )}

      {/* Asset Switcher Ribbon */}
      <div className="bg-slate-950 border-t border-slate-800/80 px-4 py-2 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center gap-2 min-w-max">
          <span className="text-[10px] font-mono uppercase text-slate-500 mr-1">
            Pairs:
          </span>
          {symbolsList.map((item) => {
            const isSelected = item.symbol === currentSymbol;
            const isUp = item.priceChangePercent >= 0;
            return (
              <button
                key={item.symbol}
                onClick={() => onSelectSymbol(item.symbol)}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono transition border ${
                  isSelected
                    ? "bg-cyan-950/70 border-cyan-600 text-cyan-300 font-semibold shadow-sm shadow-cyan-950"
                    : "bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
                }`}
              >
                <span>{item.symbol.replace("USDT", "")}</span>
                {item.price > 0 && (
                  <span className="text-[11px] text-slate-300">
                    ${item.price > 10 ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : item.price.toFixed(4)}
                  </span>
                )}
                {item.priceChangePercent !== 0 && (
                  <span
                    className={`flex items-center text-[10px] ${
                      isUp ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isUp ? (
                      <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
                    )}
                    {isUp ? "+" : ""}
                    {item.priceChangePercent.toFixed(1)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
