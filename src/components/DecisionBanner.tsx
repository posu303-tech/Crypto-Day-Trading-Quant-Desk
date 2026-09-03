import React from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Copy,
  Sparkles,
  CheckCircle,
  FileText,
} from "lucide-react";
import { TradeSetup, ConfluenceScore } from "../types/trading";

interface DecisionBannerProps {
  setup: TradeSetup;
  confluence: ConfluenceScore;
  symbol: string;
  currentPrice: number;
  onGenerateAiMemo: () => void;
  isAiGenerating: boolean;
  onCopyMemo: () => void;
  copied: boolean;
  activeTab: "overview" | "memo" | "chart" | "orderbook";
  onTabChange: (tab: "overview" | "memo" | "chart" | "orderbook") => void;
}

export const DecisionBanner: React.FC<DecisionBannerProps> = ({
  setup,
  confluence,
  symbol,
  currentPrice,
  onGenerateAiMemo,
  isAiGenerating,
  onCopyMemo,
  copied,
  activeTab,
  onTabChange,
}) => {
  const isLong = setup.decision === "LONG";
  const isShort = setup.decision === "SHORT";
  const isNoTrade = setup.decision === "NO TRADE";

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 transition-all shadow-lg ${
        isLong
          ? "bg-emerald-950/30 border-emerald-700/60 shadow-emerald-950/20"
          : isShort
          ? "bg-rose-950/30 border-rose-700/60 shadow-rose-950/20"
          : "bg-amber-950/25 border-amber-700/50 shadow-amber-950/10"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        {/* Decision Badge & Summary */}
        <div className="flex items-start sm:items-center gap-4">
          <div
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 font-mono font-black text-xl tracking-wider uppercase shadow-md ${
              isLong
                ? "bg-emerald-500 text-slate-950 shadow-emerald-500/20"
                : isShort
                ? "bg-rose-500 text-slate-950 shadow-rose-500/20"
                : "bg-amber-500 text-slate-950 shadow-amber-500/20"
            }`}
          >
            {isLong && <ArrowUpRight className="w-6 h-6 stroke-[3]" />}
            {isShort && <ArrowDownRight className="w-6 h-6 stroke-[3]" />}
            {isNoTrade && <ShieldAlert className="w-6 h-6 stroke-[3]" />}
            <span>{setup.decision}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-100 font-mono">
                {symbol} @ ${currentPrice > 10 ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : currentPrice.toFixed(4)}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Confluence:{" "}
                <span
                  className={
                    confluence.weightedTotal >= 6
                      ? "text-emerald-400 font-bold"
                      : "text-amber-400 font-bold"
                  }
                >
                  {confluence.weightedTotal}/10
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {isNoTrade
                ? setup.rejectionReason ||
                  "Both long and short entries rejected due to lack of confluence or threshold validation."
                : setup.entryCondition}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onGenerateAiMemo}
            disabled={isAiGenerating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-mono font-semibold bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white transition disabled:opacity-50 shadow-sm shadow-purple-950"
          >
            <Sparkles
              className={`w-4 h-4 ${isAiGenerating ? "animate-spin" : ""}`}
            />
            <span>{isAiGenerating ? "Generating Memo..." : "Run Gemini AI Memo"}</span>
          </button>

          <button
            onClick={onCopyMemo}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
            title="Copy pre-trade memo in standard markdown for trading desks"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-slate-400" />
            )}
            <span>{copied ? "Copied Memo!" : "Copy Memo"}</span>
          </button>

          <button
            onClick={() => onTabChange("memo")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-medium border transition ${
              activeTab === "memo"
                ? "bg-cyan-950 border-cyan-600 text-cyan-300"
                : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Full 7-Sec Memo</span>
          </button>
        </div>
      </div>

      {/* Grid of Key Execution Parameters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
        {/* Entry */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
            Entry Trigger
          </span>
          <div className="text-sm font-bold font-mono text-cyan-300">
            ${setup.entry > 10 ? setup.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : setup.entry.toFixed(4)}
          </div>
          <span className="text-[10px] font-mono text-slate-500 block truncate">
            Slippage: {setup.assumedSlippageBps} bps
          </span>
        </div>

        {/* Stop Loss */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
            Stop Loss ({setup.atrMultipleUsed}x ATR)
          </span>
          <div className="text-sm font-bold font-mono text-rose-400">
            ${setup.stopLoss > 10 ? setup.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : setup.stopLoss.toFixed(4)}
          </div>
          <span className="text-[10px] font-mono text-slate-500 block">
            {setup.stopDistancePct}% (${setup.stopDistancePrice})
          </span>
        </div>

        {/* Target 1 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
            Target 1 (R:R {setup.rrTarget1}:1)
          </span>
          <div className="text-sm font-bold font-mono text-emerald-400">
            ${setup.target1 > 10 ? setup.target1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : setup.target1.toFixed(4)}
          </div>
          <span className="text-[10px] font-mono text-slate-500 block truncate">
            50% TP + BE stop
          </span>
        </div>

        {/* Target 2 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
            Target 2 (R:R {setup.rrTarget2}:1)
          </span>
          <div className="text-sm font-bold font-mono text-emerald-400">
            ${setup.target2 > 10 ? setup.target2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : setup.target2.toFixed(4)}
          </div>
          <span className="text-[10px] font-mono text-slate-500 block truncate">
            1.5x ATR trailing
          </span>
        </div>

        {/* Max Leverage */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
            Max Leverage (5x Cap)
          </span>
          <div className="text-sm font-bold font-mono text-purple-300">
            {setup.maxLeverage}x
          </div>
          <span className="text-[10px] font-mono text-slate-500 block truncate">
            ADX formula cap
          </span>
        </div>

        {/* Position Size */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
            Position Size (${setup.maxAccountRiskUsd} risk)
          </span>
          <div className="text-sm font-bold font-mono text-amber-300">
            ${setup.positionSizeUsd.toLocaleString()}
          </div>
          <span className="text-[10px] font-mono text-slate-500 block truncate">
            {setup.positionSizePct}% equity ({setup.positionSizeUnits} units)
          </span>
        </div>
      </div>
    </div>
  );
};
