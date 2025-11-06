
# 📘 MyFinance — Personal Finance Dashboard User Manual

**Version:** 1.0
**Author:** Zihao Zheng
**Platform:** React + Node.js (Express)
**Database:** JSON-based local storage (no cloud dependencies)

---

## 🌟 Overview

**myFinance** is your personal financial control center — a self-hosted, offline-first app that allows you to **track, visualize, and manage your income, expenses, recurring payments, and checking balance** all in one intuitive dashboard.

Designed for simplicity and power, it combines **modern UI, interactive charts**, and **automated backups** to give you full visibility into your financial life — without giving up your privacy.

---

## 🧭 Key Features

### 💰 **Expense & Income Tracking**

* Record daily **expenses** and **income** with categories, amounts, and descriptions.
* Data is saved locally in `/userData/data.json` — no cloud upload.
* Automatically sorts and visualizes spending by **month**, **quarter**, or **year**.
* Switch between **支出 (Expense)** and **收入 (Income)** with keyboard arrows or swipes.

### 📊 **Interactive Charts**

* Uses **Google Charts** to display spending and income trends.
* Supports multiple views:

  * **Pie chart:** Expense distribution by category.
  * **Line chart:** Income trend over time (monthly or yearly).
* Offline mode gracefully displays “NO INTERNET — CHART NOT AVAILABLE.”

### 🔁 **Scheduled Prepayments**

* Add recurring or future payments (e.g., rent, subscriptions) in the **预付款 (Prepay)** page.
* Configure **frequency**, **amount**, **category**, and **description**.
* The system automatically checks for due prepayments and records them as expenses.

### 💳 **Checking Account Management**

* Tracks your real-time balance in **Checking**.
* Update balances manually or by transaction adjustments:

  * Add/Subtract mode for flexible editing.
  * Automatically logs recent 100 transactions to `/userData/recentTransactions.json`.
* Each update creates a **timestamped transaction entry** and **backup**.

### 🌓 **Light / Dark Mode**

* Switch seamlessly between light and dark modes.
* Your preference is stored in `localStorage` and remembered across sessions.
* Transitions are smooth, with background color and text color adjusting dynamically.

### 🔒 **Privacy & Local Control**

* All data is stored **locally on your machine** — never uploaded to the cloud.
* The backend runs on **Node.js** using local JSON files as storage.
* Includes **automatic backup rotation** (up to 100 latest backups).
* Prevents double-submission using unique `requestId` for every write operation.

### 🕹️ **Sound Effects & Interaction**

* Optional sound feedback for clicks and successful saves.
* Configurable via `/userData/settings.json`.
* Customize animations, display preferences, and number masking.

---

## 🧩 File Structure

```
myFinance/
│
├── /client/
│   ├── App.js                # Main React app logic (home page, charts, modals)
│   ├── BottomPages.js        # Expense and Income chart components
│   ├── App.css               # Custom styling for layout, modals, and prepay dialogs
│   ├── font.css              # Font imports (ZCOOL family)
│   └── ...
│
├── /server/
│   └── server.js             # Express backend for handling API routes and backups
│
├── /userData/
│   ├── data.json             # Stores all income/expense records
│   ├── prepay_schedule.json  # Stores recurring payment schedules
│   ├── recentTransactions.json # Last 100 checking transactions
│   ├── settings.json         # UI settings (theme, sound, etc.)
│   ├── categories.json       # Expense category translations
│   └── /backup/              # Automatic backups of data.json
│
└── package.json
```

---

## ⚙️ Setup Instructions

### 1. **Install Dependencies**

```bash
npm install
```

### 2. **Start the Backend Server**

```bash
node server.js
```

* Default API runs on: `http://localhost:5001`
* This manages your data files and backups automatically.

### 3. **Run the Frontend**

```bash
npm start
```

* Opens `http://localhost:3000` in your browser.

---

## 🧠 Understanding How It Works

### Data Flow

```
Frontend (React)  →  Backend (Express API)  →  Local JSON Files
```

* The frontend calls `/api/update-expenses`, `/api/update-income`, etc.
* Server updates JSON files and creates a **timestamped backup**.
* UI automatically reloads and updates charts.

### Backups

* Every modification triggers a backup of `data.json` into `/userData/backup`.
* Oldest backups auto-delete beyond 100 files.
* Backups ensure full recoverability even after crashes.

---

## 🪄 UI Overview

| Section                     | Description                                                        |
| --------------------------- | ------------------------------------------------------------------ |
| **Home Dashboard**          | Displays income vs expenses overview and checking account summary. |
| **支出明细 (Expense Overview)** | Interactive pie chart filtered by time and category.               |
| **收入趋势 (Income Overview)**  | Line chart view of income over months or years.                    |
| **预付款 (Prepay Page)**       | Manage upcoming or recurring payments.                             |
| **设置 (Settings)**           | Adjust sound effects, theme, and preferences.                      |

---

## ⚡ API Endpoints

| Endpoint                       | Method | Description                              |
| ------------------------------ | ------ | ---------------------------------------- |
| `/api/get-categories`          | GET    | Fetches category names and translations. |
| `/api/update-expenses`         | POST   | Saves updated expenses.                  |
| `/api/update-income`           | POST   | Saves updated income.                    |
| `/api/update-total`            | POST   | Updates checking balance.                |
| `/api/update-checking-last100` | POST   | Logs a new transaction.                  |
| `/api/get-total-checking`      | GET    | Returns current checking balance.        |
| `/api/get-checking-recent100`  | GET    | Returns latest 100 transactions.         |
| `/api/get-settings`            | GET    | Returns user interface settings.         |

---

## 🎨 Design & User Experience

* **Fonts:** ZCOOL QingKe HuangYou & KuaiLe (for elegant Chinese/English support)
* **Charts:** react-google-charts (3D donut and line charts)
* **Animations:** Smooth transition for dark/light mode and modal dialogs
* **Sound:** Configurable click & success audio (`/userData/soundEffects/`)

---

## 🔔 Tips for Use

* Use **“Today”** buttons to auto-fill current dates when adding records.
* Switch views quickly using **left/right arrow keys** or **swipe gestures**.
* If charts fail to load, check that your **Google Charts** scripts can access the internet.
* For long-term storage, backup your `/userData` folder manually or sync it to a secure drive.

---

## 🧩 Advanced Features

* **Mask sensitive numbers** — Hides financial values automatically for privacy.
* **24-hour safety mask reset** — If unmasked, the system re-enables masking after 24 hours.
* **Automatic frequency conversion** — Converts repeating payment intervals (e.g., 每1月 → 每个月).
* **Manual override for Checking balance** — Enter a new total directly instead of adding/subtracting.

---

## 🔄 Troubleshooting

| Issue                               | Cause                       | Solution                                            |
| ----------------------------------- | --------------------------- | --------------------------------------------------- |
| “Backend crashed”                   | Node.js not running         | Restart with `node server.js`                       |
| “NO INTERNET – CHART NOT AVAILABLE” | Google Charts offline       | Check network or ignore (data unaffected)           |
| “Failed to write file”              | Permission issue            | Run as admin or check `userData` folder permissions |
| Numbers disappeared after a day     | Privacy auto-mask activated | Unmask manually from settings                       |

---

## 🧰 Tech Stack

| Layer             | Technology                          |
| ----------------- | ----------------------------------- |
| **Frontend**      | React, React Router, Lucide Icons   |
| **Backend**       | Node.js, Express.js, CORS           |
| **Visualization** | react-google-charts                 |
| **Storage**       | Local JSON files                    |
| **Styling**       | CSS3, Animations, Responsive Layout |

---

## 🛡️ Data Safety

* Every update triggers a **local backup**.
* Backup folder retains last 100 copies of `data.json`.
* Prevents duplicate writes using **UUID request IDs**.
* Data never leaves your machine — **100% offline security**.

---

## 💬 Final Notes

myFinance is built to **empower you to manage your money visually and safely** — without subscriptions, tracking, or data mining.

Whether you’re budgeting monthly, comparing income trends, or logging your expenses after a trip — myFinance keeps your financial world transparent, private, and simple.

---

Would you like me to generate a **developer-focused version** of the README (explaining component architecture and API structure for contributors)? It would complement this consumer-facing manual perfectly.
