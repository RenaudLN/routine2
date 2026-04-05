# Routine Tracker

A private, client-side routine and habit tracker built with React, TypeScript, and Vite.

## User Guide

### 🛡️ Privacy First: Fully Client-Side
Routine Tracker is designed with privacy as its core principle. Unlike most habit trackers:
- **No data is stored on a server**: All your routines, history, and notes stay on your device.
- **IndexedDB Storage**: We use your browser's local database (IndexedDB) to store everything securely.
- **No Account Needed**: Start tracking immediately without creating an account or providing an email address.
- **Offline Capable**: Works perfectly without an internet connection as a Progressive Web App (PWA).

### Key Features
- **Flexible Routines**: Create routines with custom fields like Text, Numbers, Ratings, and Options.
- **Versioning**: Edit your routines without losing past data. The app tracks different versions of your routine definitions over time.
- **Activity Logging**: Quick and easy recording of your daily habits.
- **Progressive Web App (PWA)**: Install it on your phone or desktop for an app-like experience and offline access.
- **Smart Notifications**: Get reminders for your routines directly on your device.

### How to Use
1. **Create a Routine**: Click "New Routine" and define what you want to track. Add fields like "Morning Meditation" (Rating) or "Glass of Water" (Number).
2. **Set Reminders**: Add times for notifications to help you stay on track.
3. **Record Progress**: On the home screen, tap a routine to log your activity for the day.
4. **View History**: Check your past logs and see your consistency over time.

---

## API & Contribution

### Architecture & Tech Stack
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **UI Library**: [Mantine 8](https://mantine.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **PWA**: [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- **Testing**: [Vitest](https://vitest.dev/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Data Model
The application uses three primary entities:
- **Routine**: The stable identity of a habit.
- **RoutineVersion**: An immutable snapshot of a routine's definition (title, fields, frequency, reminders). Every time a routine's structure changes, a new version is created to preserve historical data integrity.
- **Activity**: A logged instance of a routine on a specific date, linked to the routine version that was active at the time of recording.

### State Management (Stores)
- `useRoutineStore`: Manages routine definitions, versions, and CRUD operations.
- `useActivityStore`: Manages activity logging and history retrieval.

### Local Development

#### Prerequisites
- [Node.js](https://nodejs.org/) (latest LTS recommended)
- [pnpm](https://pnpm.io/)

#### Setup
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Lint and type-check
pnpm lint
```

### Contributing
Contributions are welcome! Please ensure that:
1. New features follow the privacy-first, client-side-only architecture.
2. Code is written in TypeScript with proper type definitions.
3. UI components use Mantine for consistency.
4. Logic is covered by unit tests where appropriate.
5. All tests pass and linting is clean before submitting a PR.

