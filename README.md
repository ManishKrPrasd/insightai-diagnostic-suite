# InsightAI — Automated Data Diagnostic & Boardroom Presentation Engine

A browser-native data diagnostics platform built with React 18 and TypeScript. Upload a CSV or JSON dataset and get instant integrity scoring, statistical diagnostics, and a boardroom-ready presentation deck — all processed client-side with zero data egress.

---

## Features

- **Integrity Completeness Score** — Detects null gaps and duplicate rows across the entire dataset
- **Pearson Bivariate Correlation** — Identifies collinearity between numeric features with scatter plot visualisation
- **Cohort Segment Disparity Analysis** — Surfaces hidden subgroup variations masked by aggregate averages
- **Std Dev Volatility Forensics** — Flags high-leverage outliers using Gaussian dispersion (μ/σ)
- **Boardroom Presentation Generator** — Auto-generates executive slides with speaker notes and adaptive charts
- **Offline HTML Export** — Downloads fully self-contained, zero-dependency HTML reports and slide decks

---

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Lucide Icons

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/ManishKrPrasd/insightai-diagnostic-suite.git

# Navigate into the project
cd insightai-diagnostic-suite

# Install dependencies
npm install

# Start the development server
npm run dev
```

---

## Usage

1. Open the app in your browser
2. Upload a `.csv` or `.json` dataset
3. Review the automated diagnostic dashboard
4. Switch to Presenter View to see the generated slide deck
5. Export your report or presentation as a standalone HTML file

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── AnalysisPanel.tsx       # Core diagnostic panel
│   │   ├── AnalysisResults.tsx     # Results rendering
│   │   ├── ChatWith.tsx            # AI chat interface
│   │   ├── Dashboard.tsx           # Main dashboard view
│   │   ├── DataPreview.tsx         # Dataset preview table
│   │   ├── ExecutiveReport.tsx     # Executive summary view
│   │   ├── LandingPage.tsx         # Upload & landing screen
│   │   ├── PresentationDeck.tsx    # Boardroom slide generator
│   │   ├── SmartCleaning.tsx       # Data cleaning module
│   │   └── Visualization.tsx       # Charts & visual output
│   ├── utils/
│   │   └── dataAnalysis.ts         # Diagnostic computation logic
│   ├── App.tsx                     # Root component
│   ├── main.tsx                    # App entry point
│   ├── index.css                   # Global styles
│   └── types.ts                    # TypeScript type definitions
├── assets/
│   └── .aistudio/
├── index.html
├── server.ts
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Privacy

All computation runs entirely in the browser. No data is sent to any server or external endpoint. No API keys are required.

---

## License

MIT
