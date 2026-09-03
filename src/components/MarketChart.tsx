import React, { useState, useRef } from "react";
import { Candle, QuantitativeMetrics, TradeSetup } from "../types/trading";
import { BarChart2, Eye, EyeOff, Layers } from "lucide-react";

interface MarketChartProps {
  candles15m: Candle[];
  candles1h: Candle[];
  metrics: QuantitativeMetrics;
  setup: TradeSetup;
  symbol: string;
}

export const MarketChart: React.FC<MarketChartProps> = ({
  candles15m,
  candles1h,
  metrics,
  setup,
  symbol,
}) => {
  const [timeframe, setTimeframe] = useState<"15m" | "1h">("15m");
  const [activeSubIndicator, setActiveSubIndicator] = useState<"adx" | "rsi" | "macd">("adx");
  const [showVolumeProfile, setShowVolumeProfile] = useState(true);
  const [showPivots, setShowPivots] = useState(true);
  const [showTradeLevels, setShowTradeLevels] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const rawCandles = timeframe === "15m" ? candles15m : candles1h;
  const candles = rawCandles.slice(-48); // last 48 candles for clear spacing

  if (candles.length === 0) {
    return (
      <div className="h-96 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-center text-slate-500 font-mono text-xs">
        Loading chart candles...
      </div>
    );
  }

  // Calculate chart boundaries
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  candles.forEach((c) => {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  });

  // Include trade levels and pivots in scale if enabled
  if (showTradeLevels && setup.stopLoss > 0) {
    minPrice = Math.min(minPrice, setup.stopLoss * 0.998);
    maxPrice = Math.max(maxPrice, setup.target2 * 1.002, setup.target1 * 1.002);
  }
  if (showPivots && metrics.floorPivots.p > 0) {
    minPrice = Math.min(minPrice, metrics.floorPivots.s2 * 0.998);
    maxPrice = Math.max(maxPrice, metrics.floorPivots.r2 * 1.002);
  }

  const pricePadding = (maxPrice - minPrice) * 0.06;
  const chartMin = minPrice - pricePadding;
  const chartMax = maxPrice + pricePadding;
  const priceRange = chartMax - chartMin || 1;

  // Chart dimensions in SVG coordinates
  const width = 800;
  const height = 340;
  const priceAxisWidth = 80;
  const chartAreaWidth = width - priceAxisWidth;

  const candleSpacing = chartAreaWidth / candles.length;
  const candleWidth = Math.max(3, candleSpacing * 0.65);

  const getY = (price: number) => {
    return height - ((price - chartMin) / priceRange) * height;
  };

  const hoveredCandle =
    hoverIndex !== null && hoverIndex >= 0 && hoverIndex < candles.length
      ? candles[hoverIndex]
      : candles[candles.length - 1];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-md">
      {/* Chart Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-200">{symbol}</span>
          <div className="flex items-center bg-slate-900 rounded p-0.5 border border-slate-800">
            <button
              onClick={() => setTimeframe("15m")}
              className={`px-2 py-0.5 rounded ${
                timeframe === "15m"
                  ? "bg-cyan-600 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              15m
            </button>
            <button
              onClick={() => setTimeframe("1h")}
              className={`px-2 py-0.5 rounded ${
                timeframe === "1h"
                  ? "bg-cyan-600 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              1H
            </button>
          </div>

          {/* O H L C Hover Inspector */}
          {hoveredCandle && (
            <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400 ml-2">
              <span>
                O: <b className="text-slate-200">${hoveredCandle.open}</b>
              </span>
              <span>
                H: <b className="text-emerald-400">${hoveredCandle.high}</b>
              </span>
              <span>
                L: <b className="text-rose-400">${hoveredCandle.low}</b>
              </span>
              <span>
                C: <b className="text-slate-200">${hoveredCandle.close}</b>
              </span>
              <span>
                Vol: <b className="text-slate-300">{hoveredCandle.volume.toFixed(1)}</b>
              </span>
            </div>
          )}
        </div>

        {/* Toggle Overlays */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVolumeProfile(!showVolumeProfile)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition ${
              showVolumeProfile
                ? "bg-amber-950/60 border-amber-700/60 text-amber-300"
                : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
            title="Toggle Session Volume Profile (POC/VAH/VAL)"
          >
            <BarChart2 className="w-3 h-3" />
            <span>Vol Profile</span>
          </button>

          <button
            onClick={() => setShowPivots(!showPivots)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition ${
              showPivots
                ? "bg-purple-950/60 border-purple-700/60 text-purple-300"
                : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
            title="Toggle Floor Pivots (P, R1-R2, S1-S2)"
          >
            <Layers className="w-3 h-3" />
            <span>Pivots</span>
          </button>

          <button
            onClick={() => setShowTradeLevels(!showTradeLevels)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition ${
              showTradeLevels
                ? "bg-cyan-950/60 border-cyan-700/60 text-cyan-300"
                : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
            title="Toggle Active Trade Setup Levels (Entry, SL, T1, T2)"
          >
            {showTradeLevels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>Trade Setup</span>
          </button>
        </div>
      </div>

      {/* Main SVG Candlestick Chart */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden mt-2 select-none"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[320px] sm:h-[360px] block"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * width;
            if (x >= 0 && x <= chartAreaWidth) {
              const idx = Math.min(
                candles.length - 1,
                Math.max(0, Math.floor(x / candleSpacing))
              );
              setHoverIndex(idx);
            }
          }}
        >
          <defs>
            {/* Grid line pattern */}
            <linearGradient id="vahGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eab308" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Background Grid */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
            const y = height * ratio;
            const p = chartMax - ratio * priceRange;
            return (
              <g key={ratio}>
                <line
                  x1="0"
                  y1={y}
                  x2={chartAreaWidth}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={chartAreaWidth + 8}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  ${p > 10 ? p.toFixed(1) : p.toFixed(4)}
                </text>
              </g>
            );
          })}

          {/* Volume Profile 70% Value Area Shading & Horizontal Lines */}
          {showVolumeProfile && metrics.volumeProfile.vah > 0 && (
            <g>
              {/* Value Area Rectangle (VAL to VAH) */}
              <rect
                x="0"
                y={getY(metrics.volumeProfile.vah)}
                width={chartAreaWidth}
                height={Math.max(
                  2,
                  getY(metrics.volumeProfile.val) - getY(metrics.volumeProfile.vah)
                )}
                fill="url(#vahGradient)"
              />

              {/* VAH line */}
              <line
                x1="0"
                y1={getY(metrics.volumeProfile.vah)}
                x2={chartAreaWidth}
                y2={getY(metrics.volumeProfile.vah)}
                stroke="#eab308"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x="6"
                y={getY(metrics.volumeProfile.vah) - 4}
                fill="#eab308"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                VAH ${metrics.volumeProfile.vah}
              </text>

              {/* POC Line (Gold, prominent) */}
              <line
                x1="0"
                y1={getY(metrics.volumeProfile.poc)}
                x2={chartAreaWidth}
                y2={getY(metrics.volumeProfile.poc)}
                stroke="#f59e0b"
                strokeWidth="2"
              />
              <text
                x="6"
                y={getY(metrics.volumeProfile.poc) - 4}
                fill="#f59e0b"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                POC (Volume Point of Control) ${metrics.volumeProfile.poc}
              </text>

              {/* VAL line */}
              <line
                x1="0"
                y1={getY(metrics.volumeProfile.val)}
                x2={chartAreaWidth}
                y2={getY(metrics.volumeProfile.val)}
                stroke="#eab308"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x="6"
                y={getY(metrics.volumeProfile.val) + 12}
                fill="#eab308"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                VAL ${metrics.volumeProfile.val}
              </text>
            </g>
          )}

          {/* Floor Pivots (P, R1, R2, S1, S2) */}
          {showPivots && metrics.floorPivots.p > 0 && (
            <g opacity="0.75">
              <line
                x1="0"
                y1={getY(metrics.floorPivots.p)}
                x2={chartAreaWidth}
                y2={getY(metrics.floorPivots.p)}
                stroke="#a855f7"
                strokeWidth="1"
                strokeDasharray="5 3"
              />
              <text
                x={chartAreaWidth - 85}
                y={getY(metrics.floorPivots.p) - 3}
                fill="#a855f7"
                fontSize="9"
                fontFamily="monospace"
              >
                PIVOT P ${metrics.floorPivots.p}
              </text>

              <line
                x1="0"
                y1={getY(metrics.floorPivots.r1)}
                x2={chartAreaWidth}
                y2={getY(metrics.floorPivots.r1)}
                stroke="#ec4899"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={chartAreaWidth - 65}
                y={getY(metrics.floorPivots.r1) - 3}
                fill="#ec4899"
                fontSize="9"
                fontFamily="monospace"
              >
                R1 ${metrics.floorPivots.r1}
              </text>

              <line
                x1="0"
                y1={getY(metrics.floorPivots.s1)}
                x2={chartAreaWidth}
                y2={getY(metrics.floorPivots.s1)}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={chartAreaWidth - 65}
                y={getY(metrics.floorPivots.s1) + 10}
                fill="#38bdf8"
                fontSize="9"
                fontFamily="monospace"
              >
                S1 ${metrics.floorPivots.s1}
              </text>
            </g>
          )}

          {/* Active Trade Setup Lines: Entry (Cyan), Stop Loss (Red), Target 1 & 2 (Green) */}
          {showTradeLevels && setup.stopLoss > 0 && (
            <g>
              {/* Stop Loss */}
              <line
                x1="0"
                y1={getY(setup.stopLoss)}
                x2={chartAreaWidth}
                y2={getY(setup.stopLoss)}
                stroke="#f43f5e"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
              <rect
                x={chartAreaWidth + 2}
                y={getY(setup.stopLoss) - 10}
                width="74"
                height="18"
                rx="3"
                fill="#f43f5e"
              />
              <text
                x={chartAreaWidth + 6}
                y={getY(setup.stopLoss) + 3}
                fill="#020617"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                SL ${setup.stopLoss > 10 ? setup.stopLoss.toFixed(0) : setup.stopLoss.toFixed(2)}
              </text>

              {/* Target 1 */}
              <line
                x1="0"
                y1={getY(setup.target1)}
                x2={chartAreaWidth}
                y2={getY(setup.target1)}
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
              <rect
                x={chartAreaWidth + 2}
                y={getY(setup.target1) - 10}
                width="74"
                height="18"
                rx="3"
                fill="#10b981"
              />
              <text
                x={chartAreaWidth + 6}
                y={getY(setup.target1) + 3}
                fill="#020617"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                T1 ${setup.target1 > 10 ? setup.target1.toFixed(0) : setup.target1.toFixed(2)}
              </text>

              {/* Target 2 */}
              <line
                x1="0"
                y1={getY(setup.target2)}
                x2={chartAreaWidth}
                y2={getY(setup.target2)}
                stroke="#059669"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <rect
                x={chartAreaWidth + 2}
                y={getY(setup.target2) - 9}
                width="74"
                height="16"
                rx="3"
                fill="#059669"
              />
              <text
                x={chartAreaWidth + 6}
                y={getY(setup.target2) + 3}
                fill="#020617"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                T2 ${setup.target2 > 10 ? setup.target2.toFixed(0) : setup.target2.toFixed(2)}
              </text>

              {/* Entry Level */}
              <line
                x1="0"
                y1={getY(setup.entry)}
                x2={chartAreaWidth}
                y2={getY(setup.entry)}
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <rect
                x={chartAreaWidth + 2}
                y={getY(setup.entry) - 9}
                width="74"
                height="16"
                rx="3"
                fill="#06b6d4"
              />
              <text
                x={chartAreaWidth + 6}
                y={getY(setup.entry) + 3}
                fill="#020617"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                ENTRY ${setup.entry > 10 ? setup.entry.toFixed(0) : setup.entry.toFixed(2)}
              </text>
            </g>
          )}

          {/* Candlesticks Rendering */}
          {candles.map((candle, idx) => {
            const x = idx * candleSpacing + candleSpacing / 2;
            const isUp = candle.close >= candle.open;
            const openY = getY(candle.open);
            const closeY = getY(candle.close);
            const highY = getY(candle.high);
            const lowY = getY(candle.low);
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(2, Math.abs(openY - closeY));

            const color = isUp ? "#10b981" : "#f43f5e";

            return (
              <g key={candle.timestamp}>
                {/* Wick */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="1.2"
                />
                {/* Real Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={color}
                  rx="1"
                />
              </g>
            );
          })}

          {/* Interactive Crosshair */}
          {hoverIndex !== null && hoverIndex >= 0 && hoverIndex < candles.length && (
            <g>
              <line
                x1={hoverIndex * candleSpacing + candleSpacing / 2}
                y1="0"
                x2={hoverIndex * candleSpacing + candleSpacing / 2}
                y2={height}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Indicator Sub-Panel Switcher */}
      <div className="mt-3 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between gap-2 mb-2 text-xs font-mono">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveSubIndicator("adx")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                activeSubIndicator === "adx"
                  ? "bg-slate-800 text-cyan-400 border border-cyan-800/60"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ADX(14): {metrics.volatility.adx15m} [{metrics.volatility.adxRegime}]
            </button>
            <button
              onClick={() => setActiveSubIndicator("rsi")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                activeSubIndicator === "rsi"
                  ? "bg-slate-800 text-cyan-400 border border-cyan-800/60"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              RSI(14): {metrics.momentum.rsi15m}
            </button>
            <button
              onClick={() => setActiveSubIndicator("macd")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                activeSubIndicator === "macd"
                  ? "bg-slate-800 text-cyan-400 border border-cyan-800/60"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              MACD: {metrics.momentum.macd15m.hist}
            </button>
          </div>

          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Multiplier:{" "}
            <b className="text-cyan-300">{metrics.volatility.atrMultiplier}x ATR</b> | Stop
            Distance: <b className="text-rose-400">${setup.stopDistancePrice}</b>
          </span>
        </div>

        {/* Dynamic Indicator Visualizer Strip */}
        <div className="h-14 bg-slate-900/90 rounded-lg p-2 flex items-center justify-between border border-slate-800 text-xs font-mono">
          {activeSubIndicator === "adx" && (
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 block">ADX(14)</span>
                  <span className="text-sm font-bold text-amber-400">
                    {metrics.volatility.adx15m}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">+DI / -DI</span>
                  <span className="text-xs text-slate-300">
                    <span className="text-emerald-400">+{metrics.volatility.plusDI15m}</span> /{" "}
                    <span className="text-rose-400">-{metrics.volatility.minusDI15m}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Regime Rule</span>
                  <span className="text-xs text-slate-200 font-semibold">
                    {metrics.volatility.adxRegime} ({metrics.volatility.atrMultiplier}x multiplier)
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 max-w-sm text-right hidden sm:inline">
                {metrics.volatility.leverageCapAdjustment}
              </span>
            </div>
          )}

          {activeSubIndicator === "rsi" && (
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 block">RSI (15m)</span>
                  <span
                    className={`text-sm font-bold ${
                      metrics.momentum.rsi15m > 70
                        ? "text-rose-400"
                        : metrics.momentum.rsi15m < 30
                        ? "text-emerald-400"
                        : "text-slate-200"
                    }`}
                  >
                    {metrics.momentum.rsi15m}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">RSI (1H)</span>
                  <span className="text-xs text-slate-300 font-bold">
                    {metrics.momentum.rsi1h}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Status</span>
                  <span className="text-xs text-slate-300">
                    {metrics.momentum.rsi15m > 60
                      ? "Bullish Momentum"
                      : metrics.momentum.rsi15m < 40
                      ? "Bearish Momentum"
                      : "Neutral Mean-Reversion"}
                  </span>
                </div>
              </div>
              {metrics.momentum.divergenceNotice ? (
                <span className="text-[11px] text-amber-400 font-medium">
                  {metrics.momentum.divergenceNotice}
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">
                  No momentum divergence detected on 15m
                </span>
              )}
            </div>
          )}

          {activeSubIndicator === "macd" && (
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 block">Histogram</span>
                  <span
                    className={`text-sm font-bold ${
                      metrics.momentum.macd15m.hist >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {metrics.momentum.macd15m.hist > 0 ? "+" : ""}
                    {metrics.momentum.macd15m.hist}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">MACD Line</span>
                  <span className="text-xs text-slate-300">
                    {metrics.momentum.macd15m.macd}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Signal Line</span>
                  <span className="text-xs text-slate-300">
                    {metrics.momentum.macd15m.signal}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400">
                OBV Trend:{" "}
                <b
                  className={
                    metrics.momentum.obvTrend15m === "RISING"
                      ? "text-emerald-400"
                      : metrics.momentum.obvTrend15m === "FALLING"
                      ? "text-rose-400"
                      : "text-slate-400"
                  }
                >
                  {metrics.momentum.obvTrend15m}
                </b>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
