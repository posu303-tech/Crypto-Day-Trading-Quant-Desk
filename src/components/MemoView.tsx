import React, { useState } from "react";
import { PreTradeMemo } from "../types/trading";
import {
  FileText,
  Copy,
  CheckCircle,
  Sparkles,
  Download,
  AlertCircle,
  Terminal,
} from "lucide-react";

interface MemoViewProps {
  memo: PreTradeMemo;
  onGenerateAiMemo: () => void;
  isAiGenerating: boolean;
  onCopyMemo: () => void;
  copied: boolean;
}

export const MemoView: React.FC<MemoViewProps> = ({
  memo,
  onGenerateAiMemo,
  isAiGenerating,
  onCopyMemo,
  copied,
}) => {
  const [subTab, setSubTab] = useState<"institutional" | "ai" | "raw">("institutional");

  const isLong = memo.decision === "LONG";
  const isShort = memo.decision === "SHORT";
  const isNoTrade = memo.decision === "NO TRADE";

  // Build plain text markdown export string
  const markdownText = `
# PRE-TRADE INTRADAY DECISION MEMO (PROMPT v2)
Generated UTC: ${memo.generatedAtUtc} | Desk: Crypto Intraday Quant

## 1. SNAPSHOT
- Asset: ${memo.snapshot.asset}
- Timestamp: ${memo.snapshot.timestampUtc}
- Current Price: $${memo.snapshot.currentPrice}
- Session: ${memo.snapshot.session} (Time since open: ${memo.snapshot.timeSinceOpen})
- Session Bias: ${memo.snapshot.sessionBias}

## 2. DATA TABLE
${memo.dataTable
  .map(
    (d) =>
      `| ${d.category} | ${d.field} | ${d.value} | ${d.source} | ${d.timestamp} |`
  )
  .join("\n")}

## 3. CORRELATION & EVENT CHECK
- Correlated Asset Confirmation: ${memo.correlationEventCheck.correlatedAssetConfirmation}
- Scheduled Events Next 4h: ${memo.correlationEventCheck.scheduledEventsNext4h}
- Portfolio Heat: ${memo.correlationEventCheck.portfolioHeat}

## 4. DECISION
**${memo.decision}**
${memo.decisionDetails}

## 5. TRADE SETUP TABLE
- Entry: $${memo.setup.entry} (${memo.setup.entryCondition})
- Stop Loss: $${memo.setup.stopLoss} (${memo.setup.atrMultipleUsed}x ATR, ${memo.setup.adxValueJustification})
- Stop Distance: $${memo.setup.stopDistancePrice} (${memo.setup.stopDistancePct}%)
- Target 1: $${memo.setup.target1} (Basis: ${memo.setup.target1Basis})
- Target 2: $${memo.setup.target2} (Basis: ${memo.setup.target2Basis})
- R:R (T1 / T2): 1:${memo.setup.rrTarget1} / 1:${memo.setup.rrTarget2} (slippage adjusted: ${memo.setup.assumedSlippageBps} bps)
- Max Leverage: ${memo.setup.maxLeverage}x (${memo.setup.leverageFormulaBasis})
- Position Size: $${memo.setup.positionSizeUsd} (${memo.setup.positionSizePct}% equity, ${memo.setup.positionSizeUnits} units | Equity: $${memo.accountEquity.toLocaleString()})
- Max Account Risk: ${memo.riskPerTradePct}% ($${memo.setup.maxAccountRiskUsd})
- Invalidation Condition: ${memo.setup.invalidationCondition}
- Partial Take-Profit Rule: ${memo.setup.partialTakeProfitRule}

## 6. CONFIDENCE & CONFLUENCE
| Factor | Weight | Score |
|---|---|---|
| Trend alignment (1H + 15m) | 25% | ${memo.confluence.trendAlignment}/10 |
| Momentum confirmation | 20% | ${memo.confluence.momentumConfirmation}/10 |
| Volume validation | 15% | ${memo.confluence.volumeValidation}/10 |
| Liquidity map clarity | 15% | ${memo.confluence.liquidityMapClarity}/10 |
| Derivatives confirmation | 15% | ${memo.confluence.derivativesConfirmation}/10 |
| Volatility regime | 10% | ${memo.confluence.volatilityRegimeSuitability}/10 |
| **Weighted Total** | | **${memo.confluence.weightedTotal}/10** |

- Factors Agreeing: ${memo.confluence.factorsAgree.join("; ")}
- Factors Conflicting: ${memo.confluence.factorsConflict.join("; ") || "None"}
- Single Biggest Risk: ${memo.confluence.biggestRisk}

## 7. WHAT WOULD CHANGE THE CALL
${memo.whatWouldChangeTheCall}
`.trim();

  const handleDownload = () => {
    const blob = new Blob([markdownText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MEMO-${memo.asset}-${new Date().toISOString().substring(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:p-6 shadow-xl text-xs font-mono">
      {/* Header bar with tabs and export */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800/60 text-cyan-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>PRE-TRADE DECISION MEMO</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                PROMPT v2 SPEC
              </span>
            </h2>
            <span className="text-[11px] text-slate-500">
              Memo ID: {memo.id} | Generated: {memo.generatedAtUtc}
            </span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setSubTab("institutional")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              subTab === "institutional"
                ? "bg-cyan-600 text-slate-950"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Structured 7-Section
          </button>
          <button
            onClick={() => setSubTab("ai")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              subTab === "ai"
                ? "bg-purple-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>AI Analyst Synthesis</span>
          </button>
          <button
            onClick={() => setSubTab("raw")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              subTab === "raw"
                ? "bg-slate-800 text-slate-200"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span>Markdown / Raw</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCopyMemo}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
          >
            {copied ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{copied ? "Copied" : "Copy Markdown"}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
            title="Download .md file"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Institutional 7-Section Strict Display */}
      {subTab === "institutional" && (
        <div className="mt-6 space-y-6">
          {/* 1. SNAPSHOT */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              1. Snapshot
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 block">Asset:</span>
                <span className="font-bold text-slate-200">{memo.snapshot.asset}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Current Price:</span>
                <span className="font-bold text-cyan-300">${memo.snapshot.currentPrice}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Session:</span>
                <span className="font-bold text-slate-200">{memo.snapshot.session}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Time Since Open:</span>
                <span className="text-slate-300">{memo.snapshot.timeSinceOpen}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Session Bias:</span>
                <span className="text-slate-300">{memo.snapshot.sessionBias}</span>
              </div>
            </div>
          </section>

          {/* 2. DATA TABLE */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              2. Data Table (Live Real Pulled Metrics)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="py-1.5 px-2">Category</th>
                    <th className="py-1.5 px-2">Field</th>
                    <th className="py-1.5 px-2">Live Value</th>
                    <th className="py-1.5 px-2">Source</th>
                    <th className="py-1.5 px-2">Timestamp (UTC)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {memo.dataTable.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-1.5 px-2 text-slate-400 font-semibold">{row.category}</td>
                      <td className="py-1.5 px-2 text-slate-300">{row.field}</td>
                      <td className="py-1.5 px-2 text-cyan-300 font-medium">{row.value}</td>
                      <td className="py-1.5 px-2 text-slate-400">{row.source}</td>
                      <td className="py-1.5 px-2 text-slate-500 text-[10px]">{row.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. CORRELATION & EVENT CHECK */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              3. Correlation & Event Check
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block mb-1">Correlated Majors Direction:</span>
                <span className="text-slate-200 font-medium">
                  {memo.correlationEventCheck.correlatedAssetConfirmation}
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block mb-1">Scheduled Events (Next 4h):</span>
                <span className="text-slate-200 font-medium">
                  {memo.correlationEventCheck.scheduledEventsNext4h}
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-500 block mb-1">Portfolio Heat Allowance:</span>
                <span className="text-emerald-400 font-bold">
                  {memo.correlationEventCheck.portfolioHeat}
                </span>
              </div>
            </div>
          </section>

          {/* 4. DECISION */}
          <section
            className={`border rounded-lg p-5 ${
              isLong
                ? "bg-emerald-950/30 border-emerald-700/80"
                : isShort
                ? "bg-rose-950/30 border-rose-700/80"
                : "bg-amber-950/30 border-amber-700/80"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                4. Pre-Trade Desk Decision:
              </span>
              <span
                className={`text-2xl font-black px-3 py-1 rounded tracking-wider ${
                  isLong
                    ? "bg-emerald-500 text-slate-950"
                    : isShort
                    ? "bg-rose-500 text-slate-950"
                    : "bg-amber-500 text-slate-950"
                }`}
              >
                {memo.decision}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans mt-2">
              {memo.decisionDetails}
            </p>
          </section>

          {/* 5. TRADE SETUP TABLE */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              5. Trade Setup Table
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="py-2 px-3 w-1/3">Parameter</th>
                    <th className="py-2 px-3">Executable Value & Calculation Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-400">Entry</td>
                    <td className="py-2 px-3 text-cyan-300 font-bold">
                      ${memo.setup.entry} — {memo.setup.entryCondition}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-400">Stop Loss</td>
                    <td className="py-2 px-3 text-rose-400 font-bold">
                      ${memo.setup.stopLoss} ({memo.setup.atrMultipleUsed}x ATR multiplier | {memo.setup.adxValueJustification})
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-400">Stop Distance</td>
                    <td className="py-2 px-3 text-slate-200">
                      ${memo.setup.stopDistancePrice} ({memo.setup.stopDistancePct}%)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-400">Target 1 / Target 2</td>
                    <td className="py-2 px-3 text-emerald-400">
                      T1: <b>${memo.setup.target1}</b> ({memo.setup.target1Basis}) <br />
                      T2: <b>${memo.setup.target2}</b> ({memo.setup.target2Basis})
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-400">R:R (T1 / T2)</td>
                    <td className="py-2 px-3 text-slate-200 font-semibold">
                      T1: 1:{memo.setup.rrTarget1} | T2: 1:{memo.setup.rrTarget2} (includes {memo.setup.assumedSlippageBps} bps slippage deduction)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-400">Max Leverage</td>
                    <td className="py-2 px-3 text-purple-300 font-bold">
                      {memo.setup.maxLeverage}x ({memo.setup.leverageFormulaBasis})
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-400">Position Size</td>
                    <td className="py-2 px-3 text-amber-300 font-bold">
                      ${memo.setup.positionSizeUsd.toLocaleString()} ({memo.setup.positionSizePct}% of ${memo.accountEquity.toLocaleString()} equity, {memo.setup.positionSizeUnits} units)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-400">Max Account Risk</td>
                    <td className="py-2 px-3 text-slate-200">
                      {memo.riskPerTradePct}% (${memo.setup.maxAccountRiskUsd} USD)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-400">Assumed Slippage</td>
                    <td className="py-2 px-3 text-slate-400">
                      {memo.setup.assumedSlippageBps} bps (${memo.setup.assumedSlippagePrice}) based on order book depth
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-400">Invalidation Condition</td>
                    <td className="py-2 px-3 text-rose-300">
                      {memo.setup.invalidationCondition}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-400">Partial Take-Profit Rule</td>
                    <td className="py-2 px-3 text-emerald-300">
                      {memo.setup.partialTakeProfitRule}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 6. CONFIDENCE & CONFLUENCE */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                6. Confidence & Confluence Scoring
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Weighted Total:</span>
                <span
                  className={`text-base font-black px-2 py-0.5 rounded ${
                    memo.confluence.weightedTotal >= 6
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-700"
                      : "bg-amber-950 text-amber-400 border border-amber-700"
                  }`}
                >
                  {memo.confluence.weightedTotal} / 10
                </span>
                <span className="text-[10px] text-slate-500">(Min: 6.0/10)</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="py-1.5 px-2">Factor</th>
                    <th className="py-1.5 px-2">Weight</th>
                    <th className="py-1.5 px-2">Agreement Score</th>
                    <th className="py-1.5 px-2">Weighted Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  <tr>
                    <td className="py-1.5 px-2 text-slate-300">Trend alignment (1H + 15m)</td>
                    <td className="py-1.5 px-2 text-slate-500">25%</td>
                    <td className="py-1.5 px-2 text-cyan-300">{memo.confluence.trendAlignment}/10</td>
                    <td className="py-1.5 px-2 text-slate-400">{(memo.confluence.trendAlignment * 0.25).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-slate-300">Momentum confirmation (RSI/MACD/OBV)</td>
                    <td className="py-1.5 px-2 text-slate-500">20%</td>
                    <td className="py-1.5 px-2 text-cyan-300">{memo.confluence.momentumConfirmation}/10</td>
                    <td className="py-1.5 px-2 text-slate-400">{(memo.confluence.momentumConfirmation * 0.2).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-slate-300">Volume validation (POC/VAH/VAL)</td>
                    <td className="py-1.5 px-2 text-slate-500">15%</td>
                    <td className="py-1.5 px-2 text-cyan-300">{memo.confluence.volumeValidation}/10</td>
                    <td className="py-1.5 px-2 text-slate-400">{(memo.confluence.volumeValidation * 0.15).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-slate-300">Liquidity map clarity</td>
                    <td className="py-1.5 px-2 text-slate-500">15%</td>
                    <td className="py-1.5 px-2 text-cyan-300">{memo.confluence.liquidityMapClarity}/10</td>
                    <td className="py-1.5 px-2 text-slate-400">{(memo.confluence.liquidityMapClarity * 0.15).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-slate-300">Derivatives confirmation (funding/OI)</td>
                    <td className="py-1.5 px-2 text-slate-500">15%</td>
                    <td className="py-1.5 px-2 text-cyan-300">{memo.confluence.derivativesConfirmation}/10</td>
                    <td className="py-1.5 px-2 text-slate-400">{(memo.confluence.derivativesConfirmation * 0.15).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-slate-300">Volatility regime suitability</td>
                    <td className="py-1.5 px-2 text-slate-500">10%</td>
                    <td className="py-1.5 px-2 text-cyan-300">{memo.confluence.volatilityRegimeSuitability}/10</td>
                    <td className="py-1.5 px-2 text-slate-400">{(memo.confluence.volatilityRegimeSuitability * 0.1).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-[11px]">
              <div>
                <span className="text-emerald-400 font-bold block mb-1">Factors in Agreement:</span>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                  {memo.confluence.factorsAgree.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-amber-400 font-bold block mb-1">Factors in Conflict:</span>
                {memo.confluence.factorsConflict.length > 0 ? (
                  <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                    {memo.confluence.factorsConflict.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-500">None detected</span>
                )}
              </div>
              <div>
                <span className="text-rose-400 font-bold block mb-1">Single Biggest Risk:</span>
                <p className="text-slate-300 leading-relaxed bg-slate-950 p-2 rounded border border-slate-800">
                  {memo.confluence.biggestRisk}
                </p>
              </div>
            </div>
          </section>

          {/* 7. WHAT WOULD CHANGE THE CALL */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              7. What Would Change The Call
            </h3>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded text-slate-200 text-xs leading-relaxed">
              {memo.whatWouldChangeTheCall}
            </div>
          </section>
        </div>
      )}

      {/* Sub-tab 2: AI Analyst Synthesis */}
      {subTab === "ai" && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Gemini 3.8 Flash Quantitative Analyst Output
              </h3>
              <span className="text-[11px] text-slate-500">
                Model: {memo.aiModelUsed || "gemini-3.8-flash"} | Enforcing Prompt v2 Zero Fabrication Rules
              </span>
            </div>
            <button
              onClick={onGenerateAiMemo}
              disabled={isAiGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white transition disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiGenerating ? "animate-spin" : ""}`} />
              <span>{isAiGenerating ? "Synthesizing..." : "Re-Run Gemini Analysis"}</span>
            </button>
          </div>

          {memo.aiSynthesisMemo ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap selection:bg-purple-900">
              {memo.aiSynthesisMemo}
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-lg p-8 text-center">
              <AlertCircle className="w-8 h-8 text-purple-400 mx-auto mb-2 opacity-80" />
              <h4 className="font-bold text-slate-200 mb-1">
                Gemini AI Synthesis Ready
              </h4>
              <p className="text-slate-400 max-w-md mx-auto mb-4 text-[11px]">
                Click below to have the Gemini 3.8 Flash quantitative analyst review the live data pipeline and format the official sell-side memo.
              </p>
              <button
                onClick={onGenerateAiMemo}
                disabled={isAiGenerating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition"
              >
                <Sparkles className={`w-4 h-4 ${isAiGenerating ? "animate-spin" : ""}`} />
                <span>{isAiGenerating ? "Generating..." : "Generate AI Memo"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 3: Raw Markdown */}
      {subTab === "raw" && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-400 text-[11px]">
              Ready for copy/paste into Bloomberg Chat, Slack, or Trading Terminal:
            </span>
            <button
              onClick={onCopyMemo}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? "Copied" : "Copy to Clipboard"}</span>
            </button>
          </div>
          <pre className="p-4 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-[11px] leading-relaxed text-slate-300 select-all max-h-[600px]">
            {markdownText}
          </pre>
        </div>
      )}
    </div>
  );
};
