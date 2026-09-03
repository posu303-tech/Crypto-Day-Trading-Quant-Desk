import React from "react";
import { OrderBookData } from "../types/trading";
import { ShieldAlert, CheckCircle2, ArrowUp, ArrowDown } from "lucide-react";

interface OrderBookDepthProps {
  orderBook: OrderBookData;
  symbol: string;
}

export const OrderBookDepth: React.FC<OrderBookDepthProps> = ({
  orderBook,
  symbol,
}) => {
  const isBtc = symbol.startsWith("BTC");
  const spreadThreshold = isBtc ? 0.15 : 0.3;

  // Maximum level total for progress bar scaling
  const maxBidTotal = Math.max(...orderBook.bids.map((b) => b.total), 1);
  const maxAskTotal = Math.max(...orderBook.asks.map((a) => a.total), 1);
  const maxTotal = Math.max(maxBidTotal, maxAskTotal);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-md text-xs font-mono">
      {/* Title & Thin Book Status */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-bold text-slate-200">Order Book & Resting Liquidity</h3>
          <span className="text-[10px] text-slate-500">
            Source: {orderBook.source}
          </span>
        </div>

        {orderBook.isThinBook ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-950/60 border border-rose-700 text-rose-300 text-[11px] font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>THIN BOOK ({orderBook.spreadPct.toFixed(3)}%)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>NORMAL SPREAD ({orderBook.spreadPct.toFixed(3)}%)</span>
          </div>
        )}
      </div>

      {/* Depth Summary Stats */}
      <div className="grid grid-cols-2 gap-2 my-3 p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 text-[11px]">
        <div>
          <span className="text-slate-500 block">Bid Depth (±2% Mid)</span>
          <span className="text-emerald-400 font-bold">
            ${(orderBook.totalBidDepth2Pct / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k USD
          </span>
        </div>
        <div>
          <span className="text-slate-500 block">Ask Depth (±2% Mid)</span>
          <span className="text-rose-400 font-bold">
            ${(orderBook.totalAskDepth2Pct / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k USD
          </span>
        </div>
      </div>

      {/* Top Order Walls */}
      <div className="mb-3 space-y-1 text-[11px]">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
          Key Resting Walls (Invalidation/Target Anchors)
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-rose-950/20 border border-rose-900/40 rounded p-1.5">
            <div className="flex items-center gap-1 text-rose-400 font-semibold mb-0.5">
              <ArrowDown className="w-3 h-3" />
              <span>Ask Wall (Resistance)</span>
            </div>
            {orderBook.topAskWalls[0] ? (
              <span className="text-slate-300">
                ${orderBook.topAskWalls[0].price.toLocaleString()} ($
                {(orderBook.topAskWalls[0].qtyUsd / 1000).toFixed(1)}k)
              </span>
            ) : (
              <span className="text-slate-500">None detected</span>
            )}
          </div>

          <div className="bg-emerald-950/20 border border-emerald-900/40 rounded p-1.5">
            <div className="flex items-center gap-1 text-emerald-400 font-semibold mb-0.5">
              <ArrowUp className="w-3 h-3" />
              <span>Bid Wall (Support)</span>
            </div>
            {orderBook.topBidWalls[0] ? (
              <span className="text-slate-300">
                ${orderBook.topBidWalls[0].price.toLocaleString()} ($
                {(orderBook.topBidWalls[0].qtyUsd / 1000).toFixed(1)}k)
              </span>
            ) : (
              <span className="text-slate-500">None detected</span>
            )}
          </div>
        </div>
      </div>

      {/* Order Book Ladder */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-slate-500 pb-1 border-b border-slate-800">
          <span>Price ($)</span>
          <span>Size (Units)</span>
          <span>Total ($)</span>
        </div>

        {/* Asks (Sell Orders, reversed so lowest ask is closest to mid) */}
        <div className="space-y-0.5">
          {orderBook.asks
            .slice(0, 5)
            .reverse()
            .map((ask) => {
              const depthPct = Math.min(100, (ask.total / maxTotal) * 100);
              return (
                <div
                  key={`ask-${ask.price}`}
                  className="relative flex justify-between items-center py-0.5 px-1 rounded text-[11px]"
                >
                  <div
                    className="absolute inset-y-0 right-0 bg-rose-950/40 rounded"
                    style={{ width: `${depthPct}%` }}
                  />
                  <span className="relative z-10 text-rose-400 font-medium">
                    ${ask.price > 10 ? ask.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ask.price.toFixed(4)}
                  </span>
                  <span className="relative z-10 text-slate-300">
                    {ask.qty > 10 ? ask.qty.toFixed(2) : ask.qty.toFixed(4)}
                  </span>
                  <span className="relative z-10 text-slate-400">
                    ${(ask.total / 1000).toFixed(1)}k
                  </span>
                </div>
              );
            })}
        </div>

        {/* Mid Price Spread Bar */}
        <div className="py-1.5 my-1 px-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px] font-bold">
          <span className="text-slate-400">Mid Price:</span>
          <span className="text-cyan-300">
            ${orderBook.midPrice > 10 ? orderBook.midPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : orderBook.midPrice.toFixed(4)}
          </span>
          <span
            className={
              orderBook.spreadPct > spreadThreshold
                ? "text-rose-400"
                : "text-emerald-400"
            }
          >
            Spread: {orderBook.spreadPct.toFixed(3)}%
          </span>
        </div>

        {/* Bids (Buy Orders) */}
        <div className="space-y-0.5">
          {orderBook.bids.slice(0, 5).map((bid) => {
            const depthPct = Math.min(100, (bid.total / maxTotal) * 100);
            return (
              <div
                key={`bid-${bid.price}`}
                className="relative flex justify-between items-center py-0.5 px-1 rounded text-[11px]"
              >
                <div
                  className="absolute inset-y-0 right-0 bg-emerald-950/40 rounded"
                  style={{ width: `${depthPct}%` }}
                />
                <span className="relative z-10 text-emerald-400 font-medium">
                  ${bid.price > 10 ? bid.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : bid.price.toFixed(4)}
                </span>
                <span className="relative z-10 text-slate-300">
                  {bid.qty > 10 ? bid.qty.toFixed(2) : bid.qty.toFixed(4)}
                </span>
                <span className="relative z-10 text-slate-400">
                  ${(bid.total / 1000).toFixed(1)}k
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
