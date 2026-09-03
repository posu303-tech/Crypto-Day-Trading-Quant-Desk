# Binance Futures Quantitative Execution & Market Structure Desk

An institutional-grade crypto market structure analyzer and decision desk powered by real-time Binance USD-M Futures data and the Google Gemini API.

## Features

- **Live Market Structure**: 15m & 1H multi-timeframe candle analysis, swing high/low identification, and trend alignment.
- **Session Volume Profile**: High-resolution volume binning, Value Area High (VAH), Value Area Low (VAL), and Point of Control (POC).
- **Floor Pivots & Order Book Depth**: Floor trader pivot calculation (P, R1-R3, S1-S3) and bid/ask depth walls with spread monitoring.
- **Derivatives & Positioning**: Real-time funding rates, 24h open interest delta, global long/short account ratios, and top trader positioning.
- **Confluence Scoring & Trade Setups**: Automated quantitative rule evaluation enforcing strict 1.5:1+ reward-to-risk, dynamic ATR-based stops, and position sizing.
- **Institutional Trading Memo**: Exportable audit trail and decision memorandum with one-click Markdown & JSON clipboard copy.
- **AI Desk Debrief**: Deep narrative trade evaluation generated via Gemini 2.5 Flash.

## Quick Start

### Prerequisites
- Node.js >= 18.0.0
- (Optional) `GEMINI_API_KEY` for AI narrative trade debriefs

### Installation & Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional)
cp .env.example .env

# 3. Start development server
npm run dev
```

The application will be live at `http://localhost:3000`.

### Production Build & Run

```bash
# Compile client and bundle Express server into dist/server.cjs
npm run build

# Start production server
npm start
```

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json bun.lock ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Pushing to GitHub

The repository is pre-initialized on the `main` branch. To push to your GitHub repository:

```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```
