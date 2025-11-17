// migrateToSupabase.js (ES module)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Fix __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent folder
dotenv.config({ path: path.resolve(__dirname, "../.env") });
console.log("Loaded Supabase URL:", process.env.SUPABASE_URL);




/* ====== CONFIG - EDIT IF NEEDED ====== */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY; // Service role key - server only
const USER_ID = process.env.USER_ID; // target user UUID in your Supabase

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing Supabase credentials. Check your .env file.");
  process.exit(1);
}

// Create client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

/* ====== helpers ====== */
function safeParseJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed parsing ${filePath}:`, err.message);
    return null;
  }
}

function toNumber(val, defaultVal = null) {
  if (val === undefined || val === null || val === "") return defaultVal;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/,/g, "").trim();
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : defaultVal;
}

// batch chunks
function chunkArray(array, size = 50) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

/* Check whether a column exists by attempting a select on that column.
   If the column doesn't exist, Postgres/Supabase returns an error.
*/
async function columnExists(table, column) {
  try {
    // Request one row with that column — if column missing, this errors
    const { error } = await supabase.from(table).select(column).limit(1);
    if (error) {
      // If error mentions column, return false; otherwise rethrow
      if (/column .* does not exist/i.test(String(error.message))) return false;
      // fallback: treat other errors as 'exists unknown' -> but log
      console.warn(`Warning checking column ${table}.${column}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`columnExists fallback for ${table}.${column}:`, err.message);
    return false;
  }
}

/* Check existing external_id values for a table (if column exists) */
async function fetchExistingExternalIds(table, externalIds) {
  if (!externalIds || externalIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from(table)
      .select("external_id")
      .in("external_id", externalIds)
      .limit(1000);

    if (error) {
      // If column doesn't exist, error will happen; caller should handle
      // Return empty to indicate "no existing"
      return [];
    }
    return data?.map((r) => r.external_id).filter(Boolean) || [];
  } catch (err) {
    console.error("fetchExistingExternalIds error:", err.message);
    return [];
  }
}

/* Safe batch insert — returns { inserted, error } */
async function batchInsert(table, rows) {
  if (!rows || rows.length === 0) return { inserted: 0 };
  for (const chunk of chunkArray(rows, 100)) {
    const { data, error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`❌ ${table} insert error:`, error);
      return { inserted: 0, error };
    }
  }
  return { inserted: rows.length };
}

/* ====== MIGRATION LOGIC for each collection ====== */

async function migrateExpenses(expenses, user_id) {
  console.log(`\n--- Migrating ${expenses.length} expenses ---`);
  const rows = [];

  for (const e of expenses) {
    const amount = toNumber(e.amount);
    if (amount === null) {
      console.warn("Skipping expense (invalid amount):", e);
      continue;
    }

    rows.push({
      user_id,
      category: e.category || "Other",
      amount,
      description: e.description || "",
      date: e.date || new Date().toISOString().slice(0, 10),
      external_id: e.id || null,
      created_at: e.created_at || undefined,
    });
  }

  // detect external_id column
  const extExists = await columnExists("expenses", "external_id");
  if (extExists) {
    const extList = rows.map((r) => r.external_id).filter(Boolean);
    const already = await fetchExistingExternalIds("expenses", extList);
    const toInsert = rows.filter((r) => !r.external_id || !already.includes(r.external_id));
    console.log(`Inserting ${toInsert.length} new expenses (skipping ${rows.length - toInsert.length} existing).`);
    return batchInsert("expenses", toInsert);
  } else {
    console.warn("expenses.external_id column NOT found — inserting without external_id. Consider ALTER TABLE to add external_id for future id-preservation.");
    // Remove external_id key if present to avoid SQL errors
    const sanitized = rows.map(({ external_id, ...rest }) => rest);
    return batchInsert("expenses", sanitized);
  }
}

async function migrateIncomes(incomes, user_id) {
  console.log(`\n--- Migrating ${incomes.length} incomes ---`);
  const rows = [];
  let skipped = 0;

  for (const inc of incomes) {
    // Prefer after_tax, fallback to before_tax, fallback to amount
    const rawAmount = inc.after_tax ?? inc.before_tax ?? inc.amount ?? null;
    const amount = toNumber(rawAmount);

    if (amount === null) {
      skipped++;
      console.warn("Skipping income (invalid amount):", inc);
      continue;
    }

    rows.push({
      user_id,
      category: inc.category || inc.description || "Income",
      amount,
      description: inc.description || "",
      date: inc.date || new Date().toISOString().slice(0, 10),
      external_id: inc.id || null,
      created_at: inc.created_at || undefined,
    });
  }

  const extExists = await columnExists("incomes", "external_id");
  if (extExists) {
    const extList = rows.map((r) => r.external_id).filter(Boolean);
    const already = await fetchExistingExternalIds("incomes", extList);
    const toInsert = rows.filter((r) => !r.external_id || !already.includes(r.external_id));
    console.log(`Inserting ${toInsert.length} new incomes (skipping ${rows.length - toInsert.length} existing). Skipped-invalid: ${skipped}`);
    return batchInsert("incomes", toInsert);
  } else {
    console.warn("incomes.external_id column NOT found — inserting without external_id. Consider ALTER TABLE to add external_id for future id-preservation.");
    const sanitized = rows.map(({ external_id, ...rest }) => rest);
    console.log(`Inserting ${sanitized.length} incomes. Skipped-invalid: ${skipped}`);
    return batchInsert("incomes", sanitized);
  }
}

async function migratePrepays(prepays, user_id) {
  console.log(`\n--- Migrating ${prepays.length} prepays ---`);
  const rows = [];

  for (const p of prepays) {
    const amount = toNumber(p.amount ?? p.after_tax ?? p.before_tax, 0.0);
    // normalize frequency
    const frequency_mode = p.frequencyMode ?? p.frequency_mode ?? (p.frequencyNumber ? "每" : "单次");
    const frequency_number = Number.isFinite(Number(p.frequencyNumber ?? p.frequency_number)) ? Number(p.frequencyNumber ?? p.frequency_number) : 1;
    const frequency_unit = p.frequencyUnit ?? p.frequency_unit ?? (p.frequencyUnit ? p.frequencyUnit : "月");

    rows.push({
      user_id,
      category: p.category || "Other",
      amount,
      description: (p.description || "").toString(),
      date: p.date || p.next_due || p.nextDate || new Date().toISOString().slice(0,10),
      frequency_mode,
      frequency_number,
      frequency_unit,
      external_id: p.id || null,
      created_at: p.created_at || undefined,
    });
  }

  const extExists = await columnExists("prepays", "external_id");
  if (extExists) {
    const extList = rows.map((r) => r.external_id).filter(Boolean);
    const already = await fetchExistingExternalIds("prepays", extList);
    const toInsert = rows.filter((r) => !r.external_id || !already.includes(r.external_id));
    console.log(`Inserting ${toInsert.length} new prepays (skipping ${rows.length - toInsert.length} existing).`);
    return batchInsert("prepays", toInsert);
  } else {
    console.warn("prepays.external_id column NOT found — inserting without external_id.");
    const sanitized = rows.map(({ external_id, ...rest }) => rest);
    return batchInsert("prepays", sanitized);
  }
}

async function migrateCheckingHistory(transactionsObj, user_id) {
  console.log(`\n--- Migrating checking history ---`);
  const rows = [];
  const arr = transactionsObj?.CheckingRecent100 ?? [];
  for (const t of arr) {
    // Expected t = [ date, type, amount, total, idOrRef ]
    const date = t[0];
    const transaction_type = t[1];
    const amount = toNumber(t[2]);
    const total = toNumber(t[3]) ?? 0;
    const external_id = t[4] ?? null;
    const description = t[5] ?? "";

    if (amount === null) {
      console.warn("Skipping checking tx (invalid amount):", t);
      continue;
    }

    rows.push({
      user_id,
      transaction_type: transaction_type || "Manual",
      amount,
      total,
      date: date || new Date().toISOString().slice(0,10),
      description,
      external_id,
      created_at: undefined,
    });
  }

  const extExists = await columnExists("checking_history", "external_id");
  if (extExists) {
    const extList = rows.map((r) => r.external_id).filter(Boolean);
    const already = await fetchExistingExternalIds("checking_history", extList);
    const toInsert = rows.filter((r) => !r.external_id || !already.includes(r.external_id));
    console.log(`Inserting ${toInsert.length} new checking rows (skipping ${rows.length - toInsert.length} existing).`);
    return batchInsert("checking_history", toInsert);
  } else {
    console.warn("checking_history.external_id column NOT found — inserting without external_id.");
    const sanitized = rows.map(({ external_id, ...rest }) => rest);
    return batchInsert("checking_history", sanitized);
  }
}

async function migrateCategories(categoriesObj, user_id) {
  console.log(`\n--- Migrating categories ---`);
  const rows = [];
  for (const [name, zh] of Object.entries(categoriesObj || {})) {
    rows.push({
      user_id,
      name,
      icon_url: null,
      type: "Expense",
    });
  }
  // We don't check duplicates here — rely on unique constraint if set; log errors
  return batchInsert("categories", rows);
}

/* ====== CLEAR EXISTING TABLES ====== */
async function clearTables() {
  console.log("\n⚠️  Clearing existing data from tables...");

  // Order matters due to foreign key dependencies (child → parent)
  const tables = [
    "expenses",
    "incomes",
    "prepays",
    "checking_history",
    "categories",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      console.error(`❌ Failed clearing ${table}:`, error.message);
    } else {
      console.log(`✅ Cleared table: ${table}`);
    }
  }

  console.log("✅ All target tables cleared.\n");
}
/* ====== main migrate() ====== */
async function migrate() {
  console.log("🚀 Starting migration...");

  const baseDir = path.join(__dirname, "../UserData");
  const dataFile = path.join(baseDir, "data.json");
  const prepayFile = path.join(baseDir, "prepay_schedule.json");
  const recentFile = path.join(baseDir, "recentTransactions.json");
  const categoriesFile = path.join(baseDir, "categories.json");

  const data = safeParseJSON(dataFile) || {};
  const prepays = safeParseJSON(prepayFile) || [];
  const transactions = safeParseJSON(recentFile) || { CheckingRecent100: [] };
  const categories = safeParseJSON(categoriesFile) || {};

  /* 🔥 CLEAR OLD DATA FIRST */
  await clearTables();

  /* 🧩 MIGRATE NEW DATA */
  await migrateExpenses(data.expenses || [], USER_ID);
  await migrateIncomes(data.income || [], USER_ID);
  await migratePrepays(prepays || [], USER_ID);
  await migrateCheckingHistory(transactions, USER_ID);
  await migrateCategories(categories || {}, USER_ID);

  console.log("🎉 Migration complete!");
}

migrate().catch((err) => {
  console.error("Migration fatal error:", err);
});
