import React from "react";
import { TradeSetup, QuantitativeMetrics } from "../types/trading";
import { Calculator, AlertTriangle, ShieldCheck } from "lucide-react";

interface RiskCalculatorProps {
  setup: TradeSetup;
  metrics: QuantitativeMetrics;
  accountEquity: number;
  onEquityChange: (equity: number) => void;
  riskPct: number;
  onRiskPctChange: (risk: number) => void;
}

export const RiskCalculator: React.FC<RiskCalculatorProps> = ({
  setup,
  metrics,
  accountEquity,
  onEquityChange,
  riskPct,
  onRiskPctChange,
}) => {
  const dollarRisk = (accountEquity * riskPct) / 100;
  const potentialGainT1 = dollarRisk * setup.rrTarget1;
  const potentialGainT2 = dollarRisk * setup.rrTarget2;

  // Approx estimated liquidation distance at max leverage
  const estLiqPct = setup.maxLeverage > 0 ? (100 / setup.maxLeverage) * 0.9 : 50;
  const stopInsideLiq = setup.stopDistancePct < estLiqPct;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-md text-xs font-mono">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="font-bold text-slate-200 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-cyan-400" />
          <span>Execution & Sizing Formula Engine</span>
        </h3>
        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
          Portfolio Heat: {riskPct.toFixed(1)}% / 3.0% Max
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        {/* Left: Input sliders */}
        <div className="space-y-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Account Equity:</span>
              <span className="text-cyan-300 font-bold">${accountEquity.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-4 gap-1 mb-1.5">
              {[5000, 10000, 50000, 100000].map((eq) => (
                <button
                  key={eq}
                  onClick={() => onEquityChange(eq)}
                  className={`py-1 rounded text-[10px] border transition ${
                    accountEquity === eq
                      ? "bg-cyan-600 text-slate-950 font-bold border-cyan-500"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  ${eq / 1000}k
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Risk Per Trade:</span>
              <span className="text-emerald-400 font-bold">{riskPct}% (${dollarRisk.toFixed(2)})</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[0.5, 1.0, 1.5, 2.0].map((r) => (
                <button
                  key={r}
                  onClick={() => onRiskPctChange(r)}
                  className={`py-1 rounded text-[10px] border transition ${
                    riskPct === r
                      ? "bg-emerald-600 text-slate-950 font-bold border-emerald-500"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Calculated Outlays */}
        <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Position Size (Notional):</span>
            <span className="text-amber-300 font-bold">
              ${setup.positionSizeUsd.toLocaleString()} ({setup.positionSizeUnits} units)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Max Volatility Leverage:</span>
            <span className="text-purple-300 font-bold">{setup.maxLeverage}x (Hard cap 5x)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Max Risk Capital:</span>
            <span className="text-rose-400 font-bold">-${dollarRisk.toFixed(2)} (-{riskPct}%)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Target 1 PnL (+{setup.rrTarget1}:1):</span>
            <span className="text-emerald-400 font-bold">+${potentialGainT1.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Target 2 PnL (+{setup.rrTarget2}:1):</span>
            <span className="text-emerald-400 font-bold">+${potentialGainT2.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Safety Validation Badge */}
      <div className="mt-3 p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          {stopInsideLiq ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="text-slate-300">
            Stop distance ({setup.stopDistancePct}%) vs Approx Liquidation distance (~{estLiqPct.toFixed(1)}%)
          </span>
        </div>
        <span
          className={`font-bold ${
            stopInsideLiq ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {stopInsideLiq ? "STOP PRECEDES LIQUIDATION" : "LIQUIDATION HAZARD"}
        </span>
      </div>
    </div>
  );
};
