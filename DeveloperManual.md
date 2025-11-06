
# 🧑‍💻 MyFinance — Developer Documentation

**Version:** 1.0
**Frontend:** React.js (Vite/CRA)
**Backend:** Node.js (Express)
**Storage:** Local JSON files
**Visualization:** react-google-charts
**Author:** Zihao Zheng

---

## 📚 Overview

`myFinance` is a **full-stack personal finance management system** designed for privacy-first local use.
It provides a **React-based dashboard** for managing income, expenses, recurring (prepay) schedules, and checking balances.
The **backend is an Express server** that reads and writes to local JSON files, creating backups for every operation.

---

## 🧩 System Architecture

```
React Frontend (App.js, BottomPages.js)
        ⬇
   Express Backend (server.js)
        ⬇
 Local JSON Storage (/userData/*.json)
```

### Data Flow

1. User performs action in React (add expense, adjust checking, etc.).
2. React sends a `POST` request to backend API with a `requestId` (UUID).
3. Express validates request, writes changes to JSON, and triggers a backup.
4. Frontend reloads local state and re-renders charts.

---

## 🏗️ Project Structure

```
myFinance/
│
├── App.js                # Main React entrypoint (homepage dashboard)
├── BottomPages.js        # Contains ExpenseSlide and IncomeSlide chart components
├── App.css               # Global styling for pages, modals, and theme transitions
├── server.js             # Express API server with backup logic
│
├── /userData/            # Persistent local data storage
│   ├── data.json               # Main DB: { expenses, income, totalChecking }
│   ├── settings.json           # User preferences (theme, sound, etc.)
│   ├── prepay_schedule.json    # Recurring payment definitions
│   ├── recentTransactions.json # Checking balance & last 100 transactions
│   ├── categories.json         # Category dictionary + translations
│   └── /backup/                # Auto backups (rotating max 100)
│
├── /components/
│   └── BottomPages.js          # Charts, filter panels, and dynamic rendering
│
└── package.json
```

---

## ⚙️ Backend — `server.js`

### 🔩 Core Features

* **Express** server handling all data I/O.
* Creates default JSON files if missing.
* Ensures `/userData/backup` exists and cleans up old backups.
* Plays audio cues for successful updates (Mac-only via `afplay`).
* Prevents duplicate writes with a `processedRequests` `Set`.

### 🔗 API Endpoints

| Route                          | Method | Description                         | Input                         | Output                           |
| ------------------------------ | ------ | ----------------------------------- | ----------------------------- | -------------------------------- |
| `/api/get-categories`          | GET    | Returns categories and translations | —                             | `{Food:"外出吃饭", ...}`             |
| `/api/get-settings`            | GET    | Loads app preferences               | —                             | settings.json                    |
| `/api/get-total-checking`      | GET    | Returns checking balance            | —                             | `{checking: number}`             |
| `/api/get-checking-recent100`  | GET    | Last 100 transactions               | —                             | `{recent100: [...]} `            |
| `/api/update-expenses`         | POST   | Updates expenses and backs up data  | `{expenses, requestId}`       | “Expenses updated successfully.” |
| `/api/update-income`           | POST   | Updates income                      | `{income, requestId}`         | “Income updated successfully.”   |
| `/api/update-total`            | POST   | Sets checking balance               | `{newTotal, requestId}`       | “Total checking amount updated.” |
| `/api/update-checking-last100` | POST   | Adds a new checking transaction     | `{newTransaction, requestId}` | “Checking updated.”              |

### 🗂️ File Creation on Startup

If any core file is missing, the backend automatically generates defaults:

* `data.json`
* `categories.json`
* `settings.json`
* `recentTransactions.json`
* `prepay_schedule.json`

### 🧾 Backup Logic

* Every update to `data.json` triggers a timestamped copy in `/backup`.
* Keeps max 100 backups; deletes oldest first.
* Uses ISO timestamps (`data_YYYY-MM-DD_HH-MM-SS.json`).

---

## 🖥️ Frontend — `App.js`

### 🔍 Key Responsibilities

* Global state: tracks `expenses`, `income`, `checking`, theme, and charts.
* Provides context (`DataContext`) for data sharing between components.
* Handles:

  * Theme switching (`light`/`dark`)
  * Masking sensitive numbers
  * Online/offline detection
  * Sound effects and animation loading

### 🧠 Core Functional Logic

| Function                | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| `loadCategoriesData()`  | Fetches and loads localized category data.            |
| `changeLightMode()`     | Toggles and saves light/dark themes across pages.     |
| `filterExpenses()`      | Filters expenses by selected time range & sub-option. |
| `getMonthlyTotal()`     | Returns sum of all records for given month/year.      |
| `handleAdjustAmount()`  | Adjusts checking balance incrementally.               |
| `handleAdjustAmount2()` | Sets checking balance to new fixed value.             |

### 🕹️ Interactive Behavior

* Left/Right arrow keys → switch between “支出” (expenses) and “收入” (income).
* Touch swipe (mobile) → same navigation.
* LocalStorage saves filter choices (`timeRange`, `subOption`).
* Data automatically re-filters and updates charts when backend changes.

---

## 📊 Charts — `BottomPages.js`

### Components

#### `ExpenseSlide`

* Renders **donut-style 3D pie chart** for expenses by category.
* Filters by **month**, **quarter**, **year**, or **last 3/6 months**.
* Uses Google Charts (`react-google-charts`).
* Displays `"NO INTERNET"` fallback when offline.

#### `IncomeSlide`

* Renders **line chart** comparing income trends.
* Supports two modes:

  * 按月显示 (Monthly)
  * 按年显示 (Yearly)
* Can optionally display combined income & expenses (if data provided).
* Automatically aggregates totals from raw income data.

---

## 🎨 Styling — `App.css`

### Highlights

* Smooth color transitions via CSS variables (`--bgc-duration`, `--bgc-ease`).
* ZCOOL QingKe HuangYou + KuaiLe fonts.
* Modal/dialog designs for:

  * Adding & editing prepay entries
  * Confirm dialogs
* Dynamic theme adjustment tied to React’s `lightMode` state.
* Distinct grid layouts for tables:

  * `.prepay-display .table-header`
  * `.budget-page .table-row`
* Animations for checkmarks, transitions, and chart elements.

---

## 💾 Data Models

### `data.json`

```json
{
  "expenses": [
    { "id": "20240515_134512123", "category": "Food", "amount": 22.5, "date": "2024-05-15", "description": "Lunch" }
  ],
  "income": [
    { "id": "20240512_103022543", "category": "Salary", "after_tax": 2400.00, "date": "2024-05-12" }
  ],
  "totalChecking": 2500.75
}
```

### `recentTransactions.json`

```json
{
  "Checking": 2500.75,
  "CheckingRecent100": [
    ["2024-05-15", "Manual", -50, 2450.75, "20240515_140011222"]
  ]
}
```

### `prepay_schedule.json`

```json
{
  "rent": {
    "amount": 1200,
    "frequencyMode": "monthly",
    "description": "Apartment Rent",
    "nextDue": "2024-06-01"
  }
}
```

### `settings.json`

```json
{
  "language": "Chinese",
  "animationType": "slide",
  "clickEffect": "click.mp3",
  "showTransaction": 100
}
```

---

## 🧠 Developer Notes

### ✅ Request Deduplication

Each modification call includes a `requestId` (UUIDv4).
If the server has already processed that ID, it ignores duplicates to avoid race conditions.

### ✅ Resiliency

* Missing files → auto-generated.
* Invalid JSON → server logs error and keeps prior copy.
* Backup and restore fully local; no internet dependency.

### ✅ Offline Handling

* Charts degrade gracefully with text fallback.
* Expense and income data cached in memory.

### ✅ Light/Dark Mode Propagation

Applies theme instantly and stores value in `localStorage`, affecting:

* `.left-box`, `.right-box`, `.bottom-box`, `.flip-container` elements.
* Icon colors adjust dynamically (`white` ↔ `black`).

---

## 🧪 Running Locally

### Start Server

```bash
node server.js
```

(Default: [http://localhost:5001](http://localhost:5001))

### Start Frontend

```bash
npm start
```

(Default: [http://localhost:3000](http://localhost:3000))

### API Test Example

```bash
curl -X POST http://localhost:5001/api/update-expenses \
-H "Content-Type: application/json" \
-d '{"expenses":[{"category":"Food","amount":10,"date":"2025-05-01"}],"requestId":"abc123"}'
```

---

## 🧰 Recommended Tools

| Purpose         | Tool                      |
| --------------- | ------------------------- |
| HTTP Testing    | Postman / cURL            |
| Logs Watching   | nodemon server.js         |
| Debugging       | React Developer Tools     |
| File Management | VSCode JSON Previewer     |
| Sound Testing   | macOS Terminal (`afplay`) |

---

## 🧱 Extending the System

| Extension                        | Approach                                                 |
| -------------------------------- | -------------------------------------------------------- |
| Add database (Supabase / SQLite) | Replace JSON read/write logic with ORM models.           |
| Add user accounts                | Extend `settings.json` to hold user profiles and tokens. |
| Add remote sync                  | Push backups to S3 or Google Drive.                      |
| Add analytics                    | Integrate Chart.js or D3.js for richer visuals.          |

---

## 🧩 Summary

`myFinance` is a modular and extendable system with clear separation between:

* **UI (React)** for visualization and interaction.
* **Logic (Express)** for safe, validated persistence.
* **Data (JSON)** for local, offline-first storage.

The architecture favors transparency and simplicity — perfect for small-scale deployment, hobby projects, or educational use.

---

