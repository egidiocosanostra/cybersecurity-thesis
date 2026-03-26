# 🛡️ Cybersecurity Thesis

**Website for cybersecurity thesis — Incident tracking and analysis**

A full-featured, Apple-style static website built to support a Master's thesis in Cybersecurity. It displays and analyses real cyber incidents from 2025-2026 with interactive filtering, search, charts, and a chronological timeline.

🌐 **Live site**: [https://egidiocosanostra.github.io/cybersecurity-thesis/](https://egidiocosanostra.github.io/cybersecurity-thesis/)

---

## 📁 Project structure

```
cybersecurity-thesis/
├── index.html              # Main dashboard
├── css/
│   └── style.css           # Apple-style design system
├── js/
│   └── main.js             # Filtering, search, stats, dark mode
├── data/
│   └── incidents.json      # 30+ real incidents (2025-2026)
├── pages/
│   ├── analytics.html      # Charts & aggregate statistics
│   ├── timeline.html       # Chronological timeline
│   └── about.html          # Thesis info & sources
├── .github/
│   └── workflows/
│       └── pages.yml       # GitHub Pages auto-deploy
├── _config.yml             # GitHub Pages config
└── README.md
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Dashboard** | Live stats: total incidents, last-30-days count, unique industries, average severity |
| 🔧 **Advanced Filters** | Filter by attack type, severity, industry, and date range — all combined in real time |
| 🔍 **Search** | Real-time company/description search with result highlighting |
| 📈 **Analytics** | Pie chart (by industry), bar charts (attack type, severity), monthly trend line chart, aggregate table |
| 🕐 **Timeline** | Chronological vertical timeline with severity-coloured markers and hover effects |
| 🌙 **Dark mode** | Toggle between light and dark themes, persisted in localStorage |
| 📱 **Responsive** | Mobile-first layout with hamburger nav, fluid grids, and touch-friendly interactions |

---

## 🎨 Design system

- **Palette**: `#000`, `#fff`, `#f5f5f7`, `#1d1d1f`, `#424245`
- **Severity accents**: Critical `#ff3b30` · High `#ff9500` · Medium `#ffcc00` · Low `#34c759`
- **Border radius**: `8px` (small), `12px` (standard), `18px` (large)
- **Shadows**: `0 2px 10px rgba(0,0,0,.10)` — `0 10px 40px rgba(0,0,0,.18)`
- **Font**: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Transitions**: `0.3s ease` throughout

---

## 🚀 Local development

```bash
git clone https://github.com/egidiocosanostra/cybersecurity-thesis.git
cd cybersecurity-thesis
# open index.html in your browser — no build step required
```

> **Note**: The page loads `data/incidents.json` via `fetch()`, so you need to serve the files through a local server (not `file://`).  
> Quick option: `python3 -m http.server 8080` then open `http://localhost:8080`.

---

## 📦 Deployment (GitHub Pages)

1. Push to the `main` branch.
2. The `.github/workflows/pages.yml` workflow automatically uploads and deploys the site.
3. Enable **GitHub Pages** in *Settings → Pages → Source: GitHub Actions* (one-time setup).

---

## 📰 Data sources

- [CISA](https://cisa.gov) — US Cybersecurity & Infrastructure Security Agency
- [BleepingComputer](https://bleepingcomputer.com) — Security news
- [SecurityWeek](https://securityweek.com) — Threat intelligence
- [Have I Been Pwned](https://haveibeenpwned.com) — Breach database
- [Wired Security](https://wired.com/category/security)
- [HHS OCR](https://hhs.gov/hipaa/for-professionals/breach-notification) — Healthcare breach notifications
- [Wiz Research](https://wiz.io/blog) — Cloud security research
- [Mandiant / Google](https://mandiant.com/resources/reports) — Threat intelligence

---

## ⚠️ Disclaimer

All data is collected from public sources for **academic research purposes only**.

