<div align="center">

  <img src="assets/icons/attendify-mark.svg" alt="Attendify Logo" width="72" height="72" />

  # Attendify
  ### Professional Academic Attendance Management & Faculty Workflow Platform

  [![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(Vanilla%20ES6%2B)-51458A?style=for-the-badge)](#-technology-stack)
  [![Test Suite](https://img.shields.io/badge/Tests-23%20Passing%20(100%25)-178568?style=for-the-badge)](#-test-suite--quality-assurance)
  [![Accessibility](https://img.shields.io/badge/Accessibility-WCAG%20AAA%20Contrast-2CD5A4?style=for-the-badge)](#-typography--design-tokens)
  [![Architecture](https://img.shields.io/badge/State-Reactive%20%2B%20Backup%20Rotation-4F5D95?style=for-the-badge)](#-state-engine--data-reliability)
  [![License](https://img.shields.io/badge/License-MIT-F0EDF7?style=for-the-badge&colorA=20243A&colorB=51458A)](#)

  <p align="center">
    <strong>A refined, Apple-inspired academic SaaS application built for university faculty, department coordinators, and proctors to take, manage, analyze, and print attendance for 60 students in under 60 seconds.</strong>
  </p>

  <br />

  <img src="assets/preview.svg" alt="Attendify Interface Preview" width="100%" style="border-radius: 12px; box-shadow: 0 18px 36px rgba(20,23,40,0.18);" />

</div>

---

## 📑 Table of Contents

- [Vision & North-Star Workflow](#-vision--the-under-60-seconds-workflow)
- [Key Features & Modules](#-key-features--modules)
  - [⚡ Rapid Roll Call Studio](#1--rapid-roll-call-studio-new)
  - [Unified Attendance Register](#2-unified-attendance-register)
  - [Students Directory](#3-students-directory)
  - [Curriculum & Subjects](#4-curriculum--course-management)
  - [Audited Attendance History](#5-audited-attendance-history)
  - [Analytics & Defaulter Tracking](#6-analytics--defaulter-tracking)
  - [Printable Practical Ledgers](#7-printable-practical-reports)
  - [Weekly Timetable Engine](#8-weekly-timetable-engine)
- [Design System & UI Tokens](#-design-system--visual-identity)
  - [Color Palette](#color-palette)
  - [Typography Stack](#typography-system)
  - [Motion Design & Micro-Interactions](#motion-design-system)
  - [Animated Scrollbar Architecture](#animated-scrollbar-architecture)
- [State Engine & Data Reliability](#-state-engine--data-reliability)
- [Keyboard Shortcuts Reference](#-keyboard-shortcuts-reference)
- [Local Setup & Deployment](#-local-setup--deployment)
- [Test Suite & Quality Assurance](#-test-suite--quality-assurance)

---

## 🎯 Vision & The Under-60-Seconds Workflow

In university classrooms with 60 students, roll call traditionally consumes 10–15 minutes of lecture time and produces error-prone paper registers.

**Attendify eliminates this friction entirely.** Built around an operational benchmark:
> *"A professor or faculty proctor should be able to mark attendance for 60 students, verify exceptions, and synchronize the entire academic ledger in under 60 seconds."*

### The Core Speed Flow
1. **Open Attendify** → Launch the **⚡ Rapid Roll Call** or **+ Mark Attendance** from the left sidebar.
2. **Select Course & Session Type** (Lecture theory or Laboratory practical).
3. **All 60 enrolled students load pre-reconciled**.
4. **Mark exceptions in seconds**:
   - Use the **Speed Card** with hotkeys (`P`, `A`, `L`, `Space`) with optional sensory sound chimes.
   - Use the **Interactive Seating Grid** to toggle absentees with 1 click.
   - Or use **Absentee Call-Out** to type only absent roll numbers (e.g. `4, 12, 19, 45`).
5. **Real-time Headcount Reconciles**: `Present + Absent + Late = 60`.
6. **Save & Commit**: Synchronizes with localStorage backup rotation, updates batch averages, recalculates defaulters (<75%), and updates printable reports.

---

## 🚀 Key Features & Modules

### 1. ⚡ Rapid Roll Call Studio (`js/rapid-roll.js`)
A next-generation attendance workbench designed for high-turnout university lectures:
* **Mode 1: Speed Roll (Card Flow)**:
  - Displays one student at a time with a massive roll number badge, monogram avatar, full student name, and attendance history.
  - One-tap keyboard controls: `[P] / [Space]` for Present, `[A]` for Absent, `[L]` for Late, `[←] / [→]` to navigate.
  - Auto-advances to the next student immediately upon marking.
  - **Sensory Web Audio Feedback**: Plays a gentle, synthesized chime on marks (zero external audio files, pure Web Audio API oscillator synthesis). Can be toggled ON/OFF.
* **Mode 2: Interactive Seating & Turnout Grid**:
  - Displays all 60 students in an interactive, responsive grid of status tiles.
  - Single click toggles student status (`Present` → `Absent` → `Late` → `Present`).
* **Mode 3: Instant Absentee Call-Out**:
  - In classrooms where 90%+ of students are present, simply type absentee roll numbers separated by commas: `3, 11, 24, 52`.
  - Clicking **Apply Absentees** automatically marks those students as Absent and all remaining 50+ students as Present.
* **Live Reconciled HUD**: Real-time progress bar (e.g. `Student 24 of 60 (40%)`), Present / Absent / Late / Unmarked counts, and projected turnout percentage.
* **Auto-Draft Preservation**: Automatically caches drafting progress in localStorage so accidental page refresh never loses marks.

### 2. Unified Attendance Register (`js/mark-attendance.js`)
* **Lecture & Practical Categorization**: Toggle between standard lectures and lab practicals (with experiment title and journal tracking).
* **Timetable Slot Prefill**: One-click chips to prefill course and timing based on the current day's timetable.
* **Bulk Power Actions**: `All Present`, `Mark Remaining Present`, `Invert Marks`, `Copy Previous Session`, `Reset Register`.
* **Collision Safety**: Warns professors before overwriting an existing session for the same date and time.
* **Full Undo Engine**: Multi-level `Ctrl+Z` undo stack.

### 3. Students Directory (`js/students.js`)
* Complete roster of all **60 enrolled students** (Roll Numbers 1 to 60) in the single SY BSc IT cohort.
* Monogram avatars with deterministic color palette matching student identity.
* Attendance metrics per student: Total Sessions, Attended, Missed, Percentage, and Status Pill.
* University compliance status pills:
  - `SAFE`: $\ge 75\%$
  - `WARNING`: $65\% \le \text{Attendance} < 75\%$
  - `CRITICAL / DEFAULTER`: $< 65\%$
* Interactive filter pills (`All`, `Safe`, `Warning`, `Defaulter`), search box with debounce, and paginated table.
* **Student Detail Drawer**: Breakdown of attendance across every curriculum subject and date log.

### 4. Curriculum & Course Management (`js/subjects.js`)
* Pre-configured with the complete SY BSc IT curriculum:
  - *Python Programming* (PP) — Prof. Deshmukh
  - *Data Structures & Algorithms* (DSA) — Dr. Kulkarni
  - *Computer Networks* (CN) — Prof. Iyer
  - *Database Management Systems* (DBMS) — Dr. Mehta
  - *Software Engineering* (SE) — Prof. Joshi
* Tracks total sessions held, average batch turnout %, and allows editing course codes and teachers.

### 5. Audited Attendance History (`js/history.js`)
* Comprehensive audit ledger of all completed sessions.
* Filter by Subject, Session Type (Lecture / Practical), or Date Range.
* Edit recorded marks or safely delete sessions with state cascade.

### 6. Analytics & Defaulter Tracking (`js/analytics.js`)
* High-density visual breakdown: Safe vs. Warning vs. Defaulter distribution.
* Course comparison bar charts showing subjects with highest and lowest turnout.
* Export Defaulters List CSV for university administration.

### 7. Printable Practical Reports (`js/practical-reports.js`)
* Formats laboratory experiments into official university academic documents.
* Generates printable practical attendance sheets with institution header, experiment titles, roll numbers, attendance checkboxes, and faculty signature blocks.
* CSS print stylesheets optimized for clean black-and-white physical printing.

### 8. Weekly Timetable Engine (`js/timetable.js`)
* Weekly schedule mapping Monday through Saturday with subject and classroom assignments.
* Integrates directly into attendance screens to automatically suggest the current lecture slot.

---

## 🎨 Design System & Visual Identity

Attendify's visual identity balances **refined academic SaaS, Apple-inspired minimalism, and tactile motion design**.

### Color Palette

| Token | Hex | Semantic Usage |
|---|---|---|
| `--bg` | `#F7F5F0` | Warm ivory canvas background |
| `--surface` | `#FFFFFF` | Primary surface for cards, tables, forms |
| `--surface-subtle` | `#F0EDF7` | Soft lavender-tinted secondary regions and headers |
| `--ink` | `#1C1F33` | Primary text: deep, rich, high contrast |
| `--ink-secondary` | `#4E526D` | Descriptions, subtitles, and metadata (WCAG AAA) |
| `--ink-tertiary` | `#787D9C` | Captions, timestamps, and subtle hints |
| `--accent` | `#51458A` | Primary brand accent: buttons and active elements |
| `--accent-hover` | `#40356F` | Primary button hover state |
| `--soft-accent` | `#EAE5F7` | Soft lavender selection highlight |
| `--safe` | `#178568` | Present status, safe attendance ($\ge 75\%$) |
| `--warn` | `#C28A25` | Late status, warning zone ($65\%-74\%$) |
| `--critical` | `#C94B50` | Absent status, critical defaulter ($< 65\%$) |
| `--border` | `#E7E4DE` | Card and divider outlines |
| `--sidebar-bg` | `linear-gradient(#1E2038, #161726)` | Deep-navy sidebar with lavender undertones |

### Typography System
* **Primary Interface Font**: [Quicksand](https://fonts.google.com/specimen/Quicksand) (Weights: `500` normal, `600` labels/nav, `700` titles).
* **Numerical & Data Font**: [DM Sans](https://fonts.google.com/specimen/DM+Sans) (Weights: `500`, `700`) with `font-feature-settings: "tnum" 1` for tabular numeral alignment in attendance counts, percentages, and roll numbers.

### Motion Design System
* `--ease-spring`: `cubic-bezier(0.16, 1, 0.3, 1)` — physics-based spring curve for view entrances and modal popups.
* `--ease-bounce`: `cubic-bezier(0.34, 1.56, 0.64, 1)` — tactile micro-bounce on status buttons and active nav indicators.
* **Tactile Press Feedback**: Buttons physically compress to `scale(0.965)` on active click and snap back smoothly.
* **Card Elevation Lift**: Cards float `-2.5px` on hover with diffuse depth shadows.
* Full `@media (prefers-reduced-motion: reduce)` accessibility compliance.

### Animated Scrollbar Architecture
* Eliminated bulky 17px default OS scrollbars from the shell, sidebar navigation, and toolbars (`scrollbar-width: none`).
* Implemented custom 6px ultra-slim capsule scrollbars on scrollable viewports with translucent lavender thumbs that smoothly expand and glow on hover.

---

## 🔒 State Engine & Data Reliability

Attendify uses a zero-dependency, reactive data store:
* **Reactive Dispatcher**: Views re-render automatically when data changes without full-page reloads.
* **Backup Key Rotation**: Every `State.save()` safely rotates the current working state to `attendify:v2:backup` before writing the primary key. If the primary JSON ever becomes corrupted (e.g. abrupt power outage), the system automatically recovers from the backup key without data loss.
* **Referential Integrity**: Cascading deletes ensure that removing a course cleanly purges corresponding timetable slots and attendance records without leaving orphan pointers.
* **Data Validation**: Strict payload schema validation ensures roll numbers remain within $[1, 60]$, status enums match `present|absent|late|unmarked`, and dates are ISO-compliant.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Scope | Action |
|---|---|---|
| `Ctrl + K` / `Cmd + K` | Global | Open Global Search modal |
| `Escape` | Global | Close any active modal, dialog, or drawer |
| `P` or `Space` | Rapid Roll Call | Mark active student **Present** & advance to next |
| `A` | Rapid Roll Call | Mark active student **Absent** & advance to next |
| `L` | Rapid Roll Call | Mark active student **Late** & advance to next |
| `←` / `→` (Arrows) | Rapid Roll Call | Navigate to Previous / Next student card |
| `Ctrl + Z` / `Cmd + Z` | Mark Attendance | Undo last attendance change |
| `↓` / `↑` (Arrows) | Register Table | Move focus up and down student rows |

---

## 💻 Local Setup & Deployment

Attendify is completely self-contained with **zero npm dependencies**.

### Prerequisites
* [Node.js](https://nodejs.org/) v18.0.0 or higher (or any modern web browser).

### Running Locally
```bash
# 1. Clone the repository
git clone https://github.com/your-username/attendify.git
cd attendify

# 2. Start the local server
npm start
# or directly:
node server.js

# 3. Open your browser
# Navigate to http://localhost:3000
```

### Static Hosting Deployment
Because Attendify is a zero-dependency SPA, it can be deployed to any static host with zero build step:
* **Vercel / Netlify / Cloudflare Pages**: Point to repository root directory (Entry: `index.html`).
* **GitHub Pages**: Enable GitHub Pages from repository settings pointing to `main` branch.

---

## 🧪 Test Suite & Quality Assurance

Attendify includes an automated unit and integration test suite utilizing Node.js native test runner:

```bash
# Run all unit and integration tests
npm test
# or:
node --test tests/*.test.js
```

### Verified Test Assertions (23 Suites / 100% Passing):
* `Utils.safePercent` — boundary values and zero denominators.
* `Integration` — State initialization seeds 60 students and curriculum courses.
* `Integration` — Lecture and Practical sessions share single attendance engine.
* `Integration` — Archival moves sessions safely without data loss.
* `Integration` — Smart admin insights detect defaulters and consecutive absences.
* `Reactivity Dispatcher` — re-renders active view when dependent change fires.
* `Storage.save` — rotates current data to backup key before overwriting.
* `Storage.load` — recovers from corrupted primary JSON via backup key.
* `State.deleteSubject` — cascades correctly to attendance, timetable, and notifications.
* `Validation` — validates student roll numbers $[1, 60]$, status enums, date formats, and timetable validity.

---

<div align="center">
  <sub>Crafted with precision for academic excellence. Attendify © 2026.</sub>
</div>
