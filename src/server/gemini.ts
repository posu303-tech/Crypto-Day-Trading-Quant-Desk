import { GoogleGenAI } from "@google/genai";
import { PreTradeMemo } from "../types/trading";

const SYSTEM_PROMPT = `
You are a sell-side quantitative analyst producing a pre-trade decision memo for an intraday crypto desk. Your output is used to place real capital within the current trading session. You are not a chatbot giving opinions — you are a data pipeline that converts live market structure into a binary or ternary trade decision (LONG / SHORT / NO TRADE) with exact, executable parameters.

HARD RULES (NON-NEGOTIABLE):
1. Zero fabrication. Every price, volume, OI, or funding figure must come directly from the provided live dataset. If a data point is unavailable, state "DATA UNAVAILABLE" for that field — never estimate or hallucinate.
2. No vague language. Banned phrases: "could potentially", "might see", "keep an eye on", "generally speaking", "it depends". Every statement must be a number, a level, or a conditional trigger ("IF price closes above X on the 15m, THEN...").
3. Day-trading horizon only. Holding window <= 24 hours, typically 1-8 hours.
4. Every trade idea must include stop loss, target(s), R:R, position size, and leverage — no exceptions.
5. Risk is stated in currency and percentage terms.
6. Execution assumptions: State assumed slippage and order book depth.
7. Confluence score: Minimum 6.0/10 to take a trade. Below 6.0 = NO TRADE regardless of directional bias.

OUTPUT FORMAT (STRICT):
Produce the exact 7-section institutional memo:
1. Snapshot
2. Data Table
3. Correlation & Event Check
4. Decision (LONG / SHORT / NO TRADE - bolded, no hedging)
5. Trade Setup Table
6. Confidence & Confluence (table with weights and factor scores)
7. What Would Change the Call
`;

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export async function generateAiTradeMemo(
  memo: PreTradeMemo
): Promise<{ text: string; model: string } | null> {
  const ai = getGenAI();
  if (!ai) {
    return null;
  }

  const model = "gemini-3.8-flash";
  const userPayload = `
Execute the pre-trade decision memo using this verified live market structure dataset:

ASSET: ${memo.asset}
CURRENT PRICE: $${memo.snapshot.currentPrice}
SESSION: ${memo.snapshot.session} (Elapsed: ${memo.snapshot.timeSinceOpen})
ACCOUNT EQUITY ASSUMPTION: $${memo.accountEquity.toLocaleString()}
RISK PER TRADE: ${memo.riskPerTradePct}% ($${memo.setup.maxAccountRiskUsd})

DATA TABLE:
${memo.dataTable.map((d) => `- [${d.category}] ${d.field}: ${d.value} (Source: ${d.source}, UTC: ${d.timestamp})`).join("\n")}

CALCULATED QUANTITATIVE PARAMETERS:
- Stop Loss: $${memo.setup.stopLoss} (Distance: $${memo.setup.stopDistancePrice}, ${memo.setup.stopDistancePct}% | ATR Multiple: ${memo.setup.atrMultipleUsed}x based on ${memo.setup.adxValueJustification})
- Target 1: $${memo.setup.target1} (Basis: ${memo.setup.target1Basis} | R:R: ${memo.setup.rrTarget1}:1 after ${memo.setup.assumedSlippageBps} bps slippage)
- Target 2: $${memo.setup.target2} (Basis: ${memo.setup.target2Basis} | R:R: ${memo.setup.rrTarget2}:1)
- Max Leverage: ${memo.setup.maxLeverage}x (Formula Basis: ${memo.setup.leverageFormulaBasis})
- Position Size: $${memo.setup.positionSizeUsd} (${memo.setup.positionSizePct}% of equity)
- Invalidation Condition: ${memo.setup.invalidationCondition}
- Partial Take-Profit Rule: ${memo.setup.partialTakeProfitRule}

CONFLUENCE FACTOR BREAKDOWN (Weightings applied):
- Trend alignment (25%): ${memo.confluence.trendAlignment}/10
- Momentum confirmation (20%): ${memo.confluence.momentumConfirmation}/10
- Volume validation (15%): ${memo.confluence.volumeValidation}/10
- Liquidity map clarity (15%): ${memo.confluence.liquidityMapClarity}/10
- Derivatives confirmation (15%): ${memo.confluence.derivativesConfirmation}/10
- Volatility regime suitability (10%): ${memo.confluence.volatilityRegimeSuitability}/10
- Weighted Total: ${memo.confluence.weightedTotal}/10 (Threshold: >=6.0 for trade, <6.0 for NO TRADE)

DECISION: ${memo.decision}
DECISION REASON: ${memo.decisionDetails}

WHAT WOULD CHANGE THE CALL:
${memo.whatWouldChangeTheCall}

Produce the final, rigorous institutional pre-trade decision memo adhering strictly to the 7-section structure. No conversational filler, no polite greetings, no meta commentary.
`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPayload,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2, // Low temperature for high quantitative fidelity and zero hallucination
      },
    });

    const text = response.text || "";
    return { text, model };
  } catch (err) {
    console.error("Gemini API call failed:", err);
    return null;
  }
}
