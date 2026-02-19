# Saif Ramadan Companion (React + Electron)

Desktop app starter built with React and Electron. No Swift is used.

## Features included

- Quran reading timer + local progress graph (last 14 days)
- Journal entries
- Separate checklist pages:
  - Day achievements
  - Evening achievements
  - Weekly achievements
  - Friday achievements
- Daily and weekly checklist reset behavior
- Prayer times:
  - Default location Hong Kong (editable in Settings)
  - Suhoor/Sehar end, Fajr, Sunrise, Dhuhr, Asr, Maghrib/Iftar, Isha
  - Next-event countdown
  - Monthly timetable view with cached month data
  - Last refreshed timestamp
  - Calculation method + madhab selection
- Advanced notifications:
  - Custom reminder offsets per event, including multiple reminders
  - Snooze options (5, 10, 30 minutes)
  - Teaching Mode with weekly class-hour editor
- Spiritual motivation:
  - Daily rotating quote
  - Theme-based quote library
  - Favorite quotes
- Offline-first local persistence, no login required

## Run locally

```bash
cd /Users/julian/Desktop/saif
npm install
npm run dev
```

## Build desktop app (DMG)

```bash
npm run build:desktop
```
