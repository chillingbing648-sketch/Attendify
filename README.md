# Attendify

### FY BSc IT · Semester II Attendance Management System

> A lightweight, browser-based attendance management dashboard for tracking subject-wise attendance, identifying defaulters, maintaining monthly records, and exporting reports.

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=111111)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chart.js](https://img.shields.io/badge/Charts-Chart.js-FF6384)](https://www.chartjs.org/)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-222222?logo=github)](https://pages.github.com/)

## Overview

Attendify is a client-side attendance system built for the **FY BSc IT Semester II** workflow. It replaces repetitive manual calculations with a responsive dashboard that keeps attendance data, subject selection, student records and eligibility calculations in one place.

The current repository is intentionally portable: the application is contained in a single `index.html` file with no framework or build step. fileciteturn13file0L2-L10

## Core Features

### 📊 Attendance Analytics

- Real-time present/absent attendance tracking
- Automatic percentage calculation
- Aggregate attendance calculation
- 75% eligibility/defaulter threshold
- Visual identification of students below the threshold
- Subject-wise attendance views

### 📚 Subject Management

- Switch between theory and practical subjects
- Designed around FY BSc IT Semester II subjects
- Dynamic total-lecture handling
- Subject-specific attendance records

### 👥 Roster Management

- Add students to the working roster
- Restore students from the master list
- Remove/reset individual attendance records
- Search the student roster

### 🗓️ Records & Reporting

- Monthly attendance archiving
- Historical month-based records
- Current and aggregate totals
- Eligibility status reporting
- Excel-compatible `.xls` export

### 💾 Local-First Storage

Attendance data is persisted through browser `localStorage`, allowing the dashboard to retain records between sessions without requiring a backend or database.

### ✨ User Experience

- Glassmorphism visual system
- Animated gradient background
- Responsive layout for desktop and mobile
- Large touch-friendly controls
- Sticky table headers
- Search and filtering
- Chart.js-powered visual analytics
- Google Fonts / Plus Jakarta Sans typography

The current UI uses CSS variables, glass effects, responsive viewport handling and mobile tap-target improvements. fileciteturn6file0L2-L2

## How It Works

```text
Select Subject
      ↓
Set / Review Total Lectures
      ↓
Manage Student Roster
      ↓
Mark Attendance
      ↓
Calculate Percentages
      ↓
Identify < 75% Students
      ↓
Archive / Export Report
```

## Attendance Logic

For each student:

```text
Attendance % = Present Lectures / Total Lectures × 100
```

The dashboard also provides aggregate attendance across the selected academic context and visually highlights students who fall below the configured **75% threshold**.

> Attendance eligibility is an administrative indicator. Institutional attendance rules should always take precedence over application calculations.

## Technology Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 + CSS Variables |
| UI Effects | Glassmorphism, gradients, transitions, animations |
| Logic | Vanilla JavaScript (ES6+) |
| Persistence | Browser `localStorage` |
| Charts | Chart.js via CDN |
| Typography | Google Fonts — Plus Jakarta Sans |
| Reporting | Browser-generated Excel-compatible `.xls` output |
| Deployment | Static hosting / GitHub Pages |

## Architecture

```text
┌─────────────────────────────────────┐
│             index.html              │
│                                     │
│  UI + CSS + JavaScript application  │
│            │                        │
│     ┌──────┴──────┐                 │
│     │             │                 │
│ localStorage   Chart.js             │
│     │             │                 │
│ attendance      analytics            │
│ records                              │
└─────────────────────────────────────┘
```

There is currently **no server, API or external database**. This makes Attendify easy to deploy and use, but also means data is tied to the browser/device where it is stored.

## Project Structure

```text
Attendify/
├── .gitignore
├── README.md
└── index.html
```

The repository currently contains exactly these project-level files on `main`. fileciteturn13file0L2-L10

## Run Locally

No dependency installation is required.

### Option 1 — Open directly

Open `index.html` in a modern browser.

### Option 2 — Use a local server

From the repository directory:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

Using a local server is recommended for more predictable browser behavior with external resources.

## Deployment

Attendify is a static application and can be deployed directly to GitHub Pages or another static hosting provider.

```text
Git Push
   ↓
GitHub Repository
   ↓
GitHub Pages / Static Host
   ↓
Attendify
```

No Node.js runtime, database server or build pipeline is required for the current implementation.

## Data & Privacy Considerations

Because attendance records are stored in browser `localStorage`:

- Clearing browser/site data can remove stored attendance records.
- Data does not automatically synchronize between devices.
- Different browsers maintain separate local storage.
- A backend/database would be required for centralized multi-user records.
- Export important records if they need to be retained independently of the browser.

## Current Engineering State

| Area | Status |
|---|:---:|
| Attendance calculations | 🟢 |
| Subject switching | 🟢 |
| Student roster | 🟢 |
| Search/filtering | 🟢 |
| Local persistence | 🟢 |
| Monthly archiving | 🟢 |
| Excel-compatible export | 🟢 |
| Responsive UI | 🟢 |
| Visual analytics | 🟢 |
| Backend synchronization | ⚪ Not implemented |
| Authentication | ⚪ Not implemented |
| Automated test suite | ⚪ Not implemented |

## Roadmap

- [ ] Modularize HTML, CSS and JavaScript into separate files
- [ ] Add automated calculation/regression tests
- [ ] Add import/export backup in JSON/CSV format
- [ ] Add configurable attendance thresholds
- [ ] Add richer monthly analytics and trends
- [ ] Add secure backend synchronization
- [ ] Add authentication and role-based access
- [ ] Add database-backed multi-device support
- [ ] Improve accessibility and keyboard navigation
- [ ] Add print-optimized attendance reports

## Design Philosophy

**Fast enough for attendance. Clear enough for administration. Simple enough to carry anywhere.**

Attendify prioritizes quick data entry and immediate feedback over unnecessary complexity. The local-first architecture keeps the application usable even without a backend while leaving a clear path toward a scalable multi-user system.

## Author

**Harsh Dubey** · [GitHub](https://github.com/chillingbing648-sketch)

---

*Attendify is an academic project focused on practical frontend engineering, client-side state management, responsive UI design and attendance workflow automation.*
