# 🔥 Calory Tracker

A sleek, **local-first** web app to track your calories, macros and weight — and visualize your progress with charts and trends.

![stack](https://img.shields.io/badge/React-18-61dafb) ![ts](https://img.shields.io/badge/TypeScript-5-3178c6) ![vite](https://img.shields.io/badge/Vite-5-646cff)

## Features

- **Dashboard** — daily calorie ring, macro bars, calorie split, weekly trend and quick stats.
- **Food** — one tab with two sub-tabs:
  - **Diary** — log foods per meal (breakfast / lunch / dinner / snacks) with calories + protein/carbs/fat, via manual entry, food-database search, AI, or your recipes. Live "macros add up to ~X kcal" sanity check.
  - **Recipes** — build meals you make often from ingredients (via DB search, saved foods, or manual), with automatic per-serving macros, then log them in one tap.
- **Saved foods** — save anything you eat often and re-log it in one tap.
- **Weight** — log weigh-ins (one per day), see your trend vs. a target line, total change and progress to goal.
- **Trends & Stats** — 7/14/30/90-day views: calories over time, stacked macros, calorie distribution donut, weight trend, and average-by-weekday.
- **Fitness** — log workouts with MET-based calorie-burn estimates (from your body weight + duration), and build a weekly **workout plan** of routines with exercises. Calories burned **top up your daily calorie budget** (toggleable in Settings), and scheduled routines can be logged in one tap.
- **Goal Planner** — enter height, age, sex, weight and activity level to compute your **BMR (Mifflin-St Jeor)** and **maintenance calories (TDEE)**. See how each activity level shifts your daily calories, get a recommended intake + timeline to reach your goal weight, and **apply it to your daily goals** in one click.
- **🤖 AI assistant** (optional) — connect an OpenAI-compatible LiteLLM gateway to unlock:
  - **Natural-language food logging** — "2 eggs, toast and a coffee" → parsed into entries with estimated macros you review before logging.
  - **AI coach** — insights on your recent calories, macros and weight trend, right on the dashboard.
  - **AI recipe generator** — describe a meal → get a draft recipe you can edit and save.
- **Settings** — daily macro + weight goals, kg/lb, AI setup, load demo data, and **export / import** your data as JSON.
- **100% local** — everything is saved in your browser (`localStorage`). No account, no server, fully private.

## AI setup (optional)

The AI features talk directly to an **OpenAI-compatible LiteLLM proxy** from the browser
(default: `https://aikeys.maibornwolff.de`). To enable them:

1. Open **Settings → AI assistant**.
2. Paste your **API key** (it's stored only in your browser).
3. Click the **refresh** button to test the connection and load the available **models**, then pick one.

The gateway sends permissive CORS headers, so requests run straight from the browser — no
backend needed. Your tracking data is only sent to the model when you explicitly trigger an
AI action (parsing text, generating insights, or creating a recipe).

## Tech stack

- **React 18 + TypeScript** (Vite)
- **Tailwind CSS** — modern dark theme with green/amber accents
- **Recharts** — charts & diagrams
- **Zustand** — state + persistence
- **date-fns** + **lucide-react**

## Getting started

```bash
npm install
npm run dev      # start dev server (http://localhost:5173)
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
```

> First time? Open **Settings → Load demo data** to populate 30 days of sample
> food + weight entries and explore all the charts.

## Notes

- Calorie estimates from macros use Atwater factors (4 / 4 / 9 kcal per gram of protein / carbs / fat).
- Data lives under the `calory-tracker:v1` key in `localStorage`. Use **Settings → Export JSON** to back it up or move it between browsers.
