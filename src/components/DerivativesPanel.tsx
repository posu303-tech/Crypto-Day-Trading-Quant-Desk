import React from "react";
import { DerivativesData, QuantitativeMetrics } from "../types/trading";
import { Gauge, TrendingUp, TrendingDown, Users, Flame } from "lucide-react";

interface DerivativesPanelProps {
  derivatives: DerivativesData;
  metrics: QuantitativeMetrics;
}

export const DerivativesPanel: React.FC<DerivativesPanelProps> = ({
  derivatives,
  metrics,
}) => {
  const currentFundingPct = derivatives.currentFundingRate * 100;
  const isFundingPositive = currentFundingPct > 0;
  const isFundingNeutral = Math.abs(currentFundingPct) <= 0.01;
  const isFundingExtreme = Math.abs(currentFundingPct) > 0.05;

  const msToNextFunding = Math.max(0, derivatives.nextFundingTime - Date.now());
  const hoursToNext = Math.floor(msToNextFunding / (3600 * 1000));
  const minsToNext = Math.floor((msToNextFunding % (3600 * 1000)) / 60000);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs font-mono">
      {/* 1. Funding Rate Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              Funding Rate (8h)
            </span>
            <span className="text-[10px] text-slate-500">
              Next in {hoursToNext}h {minsToNext}m
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-black ${
                  isFundingExtreme
                    ? "text-rose-400 animate-pulse"
                    : isFundingPositive
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {isFundingPositive ? "+" : ""}
                {currentFundingPct.toFixed(4)}%
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                {derivatives.fundingClassification}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              {derivatives.fundingImplication}
            </p>
          </div>
        </div>

        {/* History of last 4 periods */}
        {derivatives.fundingRateHistory.length > 0 && (
          <div className="pt-2 border-t border-slate-900">
            <span className="text-[10px] text-slate-500 block mb-1">
              Prior 4 Funding Intervals:
            </span>
            <div className="flex items-center gap-1.5">
              {derivatives.fundingRateHistory.slice(-4).map((item, idx) => {
                const ratePct = item.fundingRate * 100;
                return (
                  <div
                    key={idx}
                    className="flex-1 text-center bg-slate-900/80 rounded py-1 border border-slate-800/80"
                  >
                    <span
                      className={`text-[10px] font-bold block ${
                        ratePct >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {ratePct > 0 ? "+" : ""}
                      {ratePct.toFixed(3)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Open Interest & 24h Delta */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Open Interest (OI)
            </span>
            <span
              className={`flex items-center text-[11px] font-bold ${
                derivatives.openInterestDelta24h >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {derivatives.openInterestDelta24h >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-0.5" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-0.5" />
              )}
              {derivatives.openInterestDelta24h > 0 ? "+" : ""}
              {derivatives.openInterestDelta24h.toFixed(2)}% (24h)
            </span>
          </div>

          <div className="my-3">
            <div className="text-2xl font-black text-slate-100">
              ${(derivatives.openInterestUsd / 1e6).toFixed(1)}M USD
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {derivatives.openInterest.toLocaleString()} contracts
            </span>
            <p className="text-[11px] text-slate-300 mt-2 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800/60">
              {derivatives.openInterestInterpretation}
            </p>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-900">
          OI Delta evaluates positioning aggression vs price momentum
        </div>
      </div>

      {/* 3. Long / Short Account Ratio */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              Long / Short Positioning
            </span>
            <span className="text-[10px] text-slate-500">Global Accounts</span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-emerald-400 font-bold">
                Longs: {derivatives.longAccountPct.toFixed(1)}%
              </span>
              <span className="text-rose-400 font-bold">
                Shorts: {derivatives.shortAccountPct.toFixed(1)}%
              </span>
            </div>

            {/* Split Bar */}
            <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${derivatives.longAccountPct}%` }}
              />
              <div
                className="bg-rose-500 h-full transition-all"
                style={{ width: `${derivatives.shortAccountPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
              <span>Account Ratio: <b className="text-slate-200">{derivatives.longShortRatio.toFixed(2)}</b></span>
              {derivatives.topTraderRatio && (
                <span>Top Traders: <b className="text-cyan-300">{derivatives.topTraderRatio.toFixed(2)}</b></span>
              )}
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-900">
          Ratio &gt; 1.5 indicates long crowding; &lt; 0.8 indicates short crowding
        </div>
      </div>

      {/* 4. Volatility Regime & Decision Multiplier */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <span className="font-bold text-slate-200">
              Volatility Regime & ATR
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300">
              {metrics.volatility.atrMultiplier}x ATR
            </span>
          </div>

          <div className="my-3 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">ATR (15m):</span>
              <span className="text-slate-200 font-bold">
                ${metrics.volatility.atr15m} (Avg: ${metrics.volatility.atr20Avg15m})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ATR (1H):</span>
              <span className="text-slate-200 font-bold">${metrics.volatility.atr1h}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Realized Vol (24h):</span>
              <span className="text-slate-200 font-bold">{metrics.volatility.realizedVol24hPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ADX (15m) Regime:</span>
              <span className="text-amber-400 font-bold">{metrics.volatility.adxRegime}</span>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 bg-slate-900/60 p-1.5 rounded border border-slate-800/80">
          {metrics.volatility.leverageCapAdjustment}
        </div>
      </div>
    </div>
  );
};
