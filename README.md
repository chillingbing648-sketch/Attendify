# Attendify - FY BSC IT (Sem II) Attendance System

Attendify is a modern, client-side attendance management system designed to track student participation across various academic subjects. Built with a focus on user experience, it features a glassmorphism interface, real-time aggregate percentage calculations, and automated highlighting of defaulter students. 

## Features
* **Dynamic Subject Tracking**: Seamlessly switch between Theory and Practical subjects (e.g., Web Designing, OOP using C++, PL/SQL).
* **Real-Time Analytics**: Automatically calculates aggregate attendance percentages and visually flags defaulters falling below the 75% threshold.
* **Data Persistence**: Utilizes browser `localStorage` to safely save student attendance data between sessions.
* **Comprehensive Roster Management**: Add new students, restore missing students from the master list, or wipe individual attendance records.
* **Monthly Archiving**: Archive current attendance under a specific month (e.g., "Jan 2026") to maintain historical records.
* **Excel Export**: One-click generation of styled `.xls` reports detailing current totals, grand totals, and eligibility status.

## Tech Stack
* **Frontend**: HTML5, CSS3 (Glassmorphism, CSS Animations, Custom Variables).
* **Scripting**: Vanilla JavaScript (ES6+).
* **Database**: Client-side Browser `localStorage`.
* **External Libraries**: Chart.js (CDN), Google Fonts.

## Project Structure
Currently, the application is deployed as a single monolithic file for ease of portability. For future scalability, the recommended structure is:
```text
attendify/
├── index.html          # Main application UI
├── css/
│   └── style.css       # Stylesheets and animations
├── js/
│   ├── app.js          # Core application logic
│   ├── storage.js      # LocalStorage wrapper
│   └── data.js         # Hardcoded MASTER_LIST and subject data
└── README.md# Attendify
