// overwriteUserData.js
// Run with: node overwriteUserData.js USER_ID

import dotenv from "dotenv";
dotenv.config();

import {
  getExpensesFromDB,
  getIncomeFromDB,
  getPrepaysFromDB,
  getCheckingHistoryFromDB,
  getCategoriesFromDB
} from "./util/dbFetch.js";

import fs from "fs";
import path from "path";

// -----------------------------------------
// 1. Read USER_ID from command-line argument
// -----------------------------------------
const USER_ID = process.argv[2];

if (!USER_ID) {
  console.error("❌ Error: USER_ID missing.");
  console.error("Usage: node overwriteUserData.js USER_ID");
  process.exit(1);
}

// -----------------------------------------
// 2. userData directory (one level above backend)
// -----------------------------------------
const userDataDir = path.join(process.cwd(), "../userData");

// Write helper
function writeJSON(filename, data) {
  const filePath = path.join(userDataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  console.log("✔ Wrote", filename);
}

// -----------------------------------------
// Main Run
// -----------------------------------------
async function run() {
  console.log(`Fetching data from Supabase for USER_ID = ${USER_ID}…`);

  const expenses = await getExpensesFromDB(USER_ID);
  const income = await getIncomeFromDB(USER_ID);
  const prepays = await getPrepaysFromDB(USER_ID);
  const checking = await getCheckingHistoryFromDB(USER_ID);
  const categories = await getCategoriesFromDB(USER_ID);

  console.log("Fetched all DB rows. Writing files…");

  writeJSON("data.json", { expenses, income });
  writeJSON("prepay_schedule.json", prepays);
  writeJSON("recentTransactions.json", checking);
  writeJSON("categories.json", categories);

  console.log("🎉 All userData files overwritten successfully.");
}

run();
