
# myFinance — `App.js` Component Reference

**Source:** App.js (your repository). 

> Note: all endpoint URLs in this file use `http://localhost:5001/api/...` (see server.js). The file defines global helper functions like `createId`, `getLocalDateString`, and `loadCategoriesData` that multiple components depend on. 

---

## Global helpers & constants (top of file)

* **`categories`, `categoriesTranslation`, `language`** — global variables populated by `loadCategoriesData()`; used by many pages for category lists/translations. 
* **`timePeriods`, `months`, `quarters`, `years`, `displayTypes`** — UI option arrays used across charts and selectors. 
* **`positive` / `negative`** — color constants for UI/indicators. 

### `loadCategoriesData()`

* Fetches `/api/get-categories` and sets the global `categories` and `categoriesTranslation`.
* Fallbacks:

  * If fetch fails or returns empty, sets defaults (`['Other']` and `{ Other: '其他' }`).
* Used early on in `App` mounting to prepare category lists for pages such as record pages and Prepay. 

### `createId(dateStr)`

* Produces a timestamp-style unique id from a date string. Format example: `YYYYMMDD_hhmmssSSS`.
* Uses current time + the provided date to guarantee uniqueness for items like transactions and scheduled prepays. 

### `getLocalDateString()`

* Returns `YYYY-MM-DD` for current date. Used to default date inputs. 

### `changeLightMode(newlightMode)`

* Applies light/dark theme by updating `localStorage` and manipulating DOM styles for `.left-box`, `.right-box`, `.bottom-box`, and flip container elements.
* Called when `lightMode` state changes to persist UI preference. 

---

## `DataContext` (global context)

* Created with `createContext()` and exported as `DataContext`.
* The `App` component wraps the Router inside `<DataContext.Provider value={...}>` and supplies functions such as `addExpense`, `updateExpense`, `addIncome`, `updateIncome`, `deleteIncome`, `deleteExpense`, and `reloadData`. Consumers (Show/Record pages) read/write via this context. 

---

## `App()` — root component

**Responsibilities**

* Manages global `data` state: `{ expenses: [], income: [] }`. Fetches initial data from backend `/api/get-data` and sorts both arrays by date on mount. 
* Calls `loadCategoriesData()` on mount to populate global category lists. 
* Provides the `DataContext` (data + CRUD methods) to all child pages and sets up React Router routes for the main pages. 

**Exposed CRUD functions (provided via context)**
All mutate local state optimistically, send updated lists to server endpoints, and include `requestId` (UUID) for dedup protection:

* `addExpense(newExpense)`

  * Appends `newExpense` to `data.expenses`, posts updated array to `/api/update-expenses`. 

* `updateExpense(updatedExpense)`

  * Replaces the expense matching `id` in `data.expenses` and posts the result to `/api/update-expenses`. (Handles missing-id by returning previous state.) 

* `deleteExpense(ExpenseToDelete)`

  * Filters out the expense with `id` and posts new array to `/api/update-expenses`. 

* `addIncome`, `updateIncome`, `deleteIncome` — symmetric operations for `income` array, posting to `/api/update-income`. (You can find similar patterns to expenses elsewhere in the file.) 

* `reloadData()`

  * Re-fetches `/api/get-data`, sorts arrays by date, and sets `data`. Use after server-side changes or category operations. 

**Routing**

* Routes defined:

  * `/` → `<HomePage />`
  * `/recordExpense` → `<RecordExpensePage />`
  * `/recordIncome` → `<RecordIncomePage />`
  * `/showExpense` → `<ShowExpensePage />`
  * `/showIncome` → `<ShowIncomePage />`
  * `/checkPrepay` → `<PrepayPage />`
  * `/checkBudget` → `<BudgetPage />`
    (Router wiring is at the bottom of `App`) 

---

## `HomePage()` — main dashboard (big left/right layout)

**Purpose / What it renders**

* Dashboard layout with top-left and bottom boxes (charts and small widgets) and a right-side action panel with shortcut buttons. Uses `Chart` (react-google-charts) plus small summary cards. 

**Important hooks / state (inside HomePage)**

* `maskNumbers` — controls whether monetary values are masked; persists with `localStorage` and auto-re-enables after 24 hours if unmasked. 
* `lightMode` — read from `localStorage` and passed to `changeLightMode()` via `useEffect` to apply theme. 
* `timeRange`, `subOption` (bottom box filters) and `timeRangeTopLeft`, `subOptionTopLeft` (top-left filters) persist in `localStorage`. These drive `filterExpenses()` logic to build `chartData`. 
* `isOnline` — derived from `navigator.onLine` to fallback charts to “NO INTERNET” when offline. 

**Key behaviors**

* Loads success sounds and registers global click sound if `clickEffect` set in settings (loaded from `/api/get-settings`). 
* `filterExpenses()` — filters `data.expenses` based on selected `timeRange`/`subOption` and aggregates category sums (uses integer cents arithmetic to avoid float issues). The result populates `chartData` for the pie chart. (This function runs inside `useEffect` keyed on `data`, `timeRange`, `subOption`.) 
* Keyboard and touch handlers: left/right arrow keys and swipe detection to switch bottom pages (支出 / 收入). Implemented with `useEffect` and `touchStartX` `useRef`. 
* Checking account integration: fetches total checking and last 100 transactions from `/api/get-total-checking` and `/api/get-checking-recent100`. There are two adjustment flows:

  * `handleAdjustAmount` — add/subtract a small delta and log a transaction via `/api/update-total` and `/api/update-checking-last100`. 
  * `handleAdjustAmount2` — set the checking balance directly (absolute override) and log the difference. 

**Modals & UI**

* Category modal (add/delete categories), miscellaneous modal (transaction details), save/modify/delete dialogs for expenses/income — all implemented inside `HomePage` and controlled by booleans like `isModalOpenCategory`, `isModalOpenOther`, `isModalOpenMiscellaneous`. Category add/delete calls `/api/add-category`, `/api/change-category`, and `/api/delete-categories`. After category operations, `loadCategoriesData()` and `reloadData()` are invoked. 

---

## `RecordExpensePage()` — add/edit expenses

**Purpose**

* Page-level form to create a new expense (fields: amount, description, category, date); uses `DataContext.addExpense` to save.

**State & hooks**

* Local controlled inputs: `amount`, `description`, `category`, `date`.
* Uses `useContext(DataContext)` to get `data` and `addExpense`.
* Calls `navigate()` (React Router) to return to home after save. 

**Save flow**

1. Prepare `newExpense` (ensures `id` via `createId`, `amount` normalized).
2. Call `addExpense(newExpense)` — adds to local state and posts to `/api/update-expenses`. (The provider function handles backend POST and requestId). 

**Other**

* There is UI for “Today” shortcut and probably validation to ensure a number is entered (see code for exact checks). 

---

## `RecordIncomePage()` — add/edit income

**Purpose**

* Symmetric to `RecordExpensePage` but for income entries; fields include before_tax / after_tax, date, category, description.

**State & hooks**

* Local inputs: `before_tax`, `after_tax`, `date`, `description`, `category`.
* Uses `useContext(DataContext)` to call `addIncome()` or `updateIncome()`. (Context functions send data to `/api/update-income`.) 

**Save flow**

* Validate amounts, set `id` via `createId`, then call context `addIncome` which posts to server and updates in-memory `data`. 

---

## `ShowExpensePage()` — expense visualization & management

**Purpose**

* The detailed expense analysis page: filter controls (time range/suboption), chart rendering (via `ExpenseSlide` from `BottomPages.js`), and lists showing individual expenses.

**State & hooks**

* Local filter state: `timeRange`, `subOption`, `chartData`, `chartTitle`, `chartError`.
* Saves `timeRange`/`subOption` to `localStorage`.

**Behavior**

* Calls `filterExpenses()` similar to HomePage to build `chartData`.
* Presents chart with click-to-tooltip and legend; handles offline & chart error fallback. (The `ExpenseSlide` component handles Chart rendering; `ShowExpensePage` passes `chartData` and options.) 

**Actions**

* Edit/Modify/Delete buttons for each expense row open modals. On delete, calls `deleteExpense()` from `DataContext`, which posts new expenses to `/api/update-expenses`. Save/Modify uses `updateExpense()` in context. 

---

## `ShowIncomePage()` — income visualization & management

**Purpose**

* The detailed income page: filterable list and `IncomeSlide` chart (monthly/yearly views). Also supports modify/delete for income items.

**State & hooks**

* Multi-field filter UI (filterOption, subOption, amountThreshold, showAboveThreshold, sortType, showType).
* Dialog controls for sorting, modifying, and deleting (booleans and selectedIncome state).
* Uses `DataContext` for `data`, `updateIncome`, `deleteIncome`. 

**Behavior**

* Builds an aggregated monthly or yearly series for `IncomeSlide`.
* Dialogs to edit an income item call `updateIncome` and to delete call `deleteIncome` (server POST to `/api/update-income` handled by context). 

---

## `PrepayPage()` — scheduled / recurring payments

**Purpose**

* Manage scheduled/prepay items: list current scheduled items, add new scheduled items, modify or delete them, and run due checks to convert due prepayments into real expense records.

**State & hooks**

* `scheduledPrepays` (loaded from `/api/get-prepay-schedule` or similar), `isAddDialogVisible`, `isSortDialogVisible`, `hasCheckedDue` (to prevent duplicate due-checks), and other dialog state. 

**Key behaviors & flows**

* `fetchScheduledPrepays()` → GET scheduled prepay file (endpoint in server).
* **On mount**: checks for due prepay items once (guarded by `hasCheckedDue`) and for each due item:

  1. Calls `addExpense(...)` to record it as an actual expense (so it shows in `data.expenses` and gets saved to `data.json`). This uses `createId(prepay.date)` for the new id. 
  2. Calls `handleAdjustAmountNonManual(id, "subtract", amount)` — to subtract the amount from checking and log transaction (this function exists in `HomePage`/`App` scope; it sends `/api/update-total` and `/api/update-checking-last100`). 
  3. If recurring, computes the next due date by adding frequency units (day/week/month/year) to current date and posts `/api/update-prepay-date` to update the schedule; if single-use, posts `/api/delete-prepay` to remove the schedule. This logic is implemented in an async loop and sets `updated = true` if any server updates succeed. 

**UI**

* Table of scheduled items with columns: id, category, date, amount, description, actions (`修改` / `删除`).
* Add dialog supports selecting `frequencyMode`, `frequencyNumber`, `frequencyUnit` and translating frequencies for display. Styling & dialog layout in `App.css`.

---

## `BudgetPage()` — budget view (per-category budgets)

**Purpose**

* Shows budgets/targets by category and a progress visualization (mini progress bars). (The CSS for budget UI is in `App.css` under `.budget-page`.)

**Behavior**

* Calculates monthly totals per category (re-uses `getMonthlyTotal`-style helper from `App`) and computes `% used` vs budget.
* Enables adjusting budgets and saving them with a backend update (likely stored either inside `data.json` or a separate budget file — examine how you persist budget values; currently the CSS and layout exist but exact storage may be in `data.json` or not fully implemented). 

---

## Important UI & Data patterns used across pages

* **Optimistic state updates**: most writes update local `data` first (via `setData`) then POST to server. Each write includes `requestId` (UUID) to avoid server double-processing. Example: `addExpense`, `updateExpense`, `deleteExpense`.
* **Local persistence of UI controls**: many UI filters and selected options persist to `localStorage` to preserve user choices across reloads. Examples: `timeRange`, `subOption`, `timeRangeTopLeft`, `subOptionTopLeft`, `maskNumbersLastChanged`. 
* **Sound effects**: `get-settings` fetch populates `clickEffect` and sound list; HomePage registers a document `click` handler to play a sound on left (primary) clicks if enabled. 
* **Offline chart fallback**: Chart components show “NO INTERNET / CHART NOT AVAILABLE” if `!navigator.onLine` or `chartError` flagged. This is implemented in `BottomPages` and used by `ShowExpensePage`/`HomePage`. 
* **Category management**: Add category posts to `/api/add-category`. Delete uses `/api/change-category` to convert transactions to “Other” then `/api/delete-categories` to remove categories from categories.json; `loadCategoriesData()` is called after operations to refresh.

---

## Quick mapping: component → server endpoints used

* `App` / context: `/api/get-data`, `/api/update-expenses`, `/api/update-income`. 
* `HomePage`: `/api/get-settings`, `/api/get-total-checking`, `/api/get-checking-recent100` and the various update endpoints for checking adjustments. 
* `RecordExpensePage` / `RecordIncomePage`: call context `addExpense` / `addIncome` which POST to `/api/update-expenses` or `/api/update-income`. 
* `PrepayPage`: GET scheduled prepays and POST `/api/update-prepay-date`, `/api/delete-prepay` and uses `addExpense` to convert due prepays into actual expenses. 
* Category operations: `/api/add-category`, `/api/change-category`, `/api/delete-categories`.

---

## Suggested small refactors (practical, low-risk)

1. **Split `App.js` into sub-files**

   * `AppRouter.js` (routing + provider)
   * `HomePage.js`, `ShowExpensePage.js`, `ShowIncomePage.js`, `RecordExpensePage.js`, `RecordIncomePage.js`, `PrepayPage.js`, `BudgetPage.js`
     This reduces file size and makes unit testing easier. (You already use `BottomPages.js` for chart components.)

2. **Move global helper functions into `utils/`**

   * `createId`, `getLocalDateString`, `loadCategoriesData`, `changeLightMode` → `utils/date.js`, `utils/categories.js`, `utils/theme.js`. That will make unit-testable pure functions.

3. **Centralize API calls**

   * Add an `api.js` with functions like `getData()`, `updateExpenses(expenses, requestId)`, `getSettings()`, `getTotalChecking()`. This reduces repeated fetch code and eases error handling / retry logic.

4. **Use a single source of truth for category list**

   * Currently `categories` and `categoriesTranslation` are global mutable values — consider putting them into React state (e.g., in `App` or a CategoriesContext) to ensure consistent reactivity.

---

## Where I pulled the facts from (for traceability)

* Helper functions and constants, plus `loadCategoriesData`, `createId`, `getLocalDateString`, `changeLightMode` — see top of App.js. 
* `App` data fetch, CRUD context functions and routing — see `App` provider and bottom of file. 
* HomePage logic: masking, theme, sound, filterExpenses and chart data generation — see `HomePage` section earlier in file. 
* Prepay due-check and conversion code (adding expenses and updating prepay dates) — see Prepay-related code and comments.
* Category add/delete UI and server calls — see category modal handlers.

---


