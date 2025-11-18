// dbFetch.js (ESM)
import 'dotenv/config';
import dotenv from "dotenv";
dotenv.config();



import { createClient } from "@supabase/supabase-js";


const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

// ----- 1. Expenses -----
export async function getExpensesFromDB(user_id) {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", user_id)
    .order("date", { ascending: true });

  if (error) throw error;

  return data.map(e => ({
    category: e.category,
    amount: e.amount.toString(),
    description: e.description || "",
    date: e.date,
    id: e.external_id ?? e.id
  }));
}

// ----- 2. Income -----
export async function getIncomeFromDB(user_id) {
  const { data, error } = await supabase
    .from("incomes")
    .select("*")
    .eq("user_id", user_id)
    .order("date", { ascending: true });

  if (error) throw error;

  return data.map(i => ({
    before_tax: i.amount.toString(),   // you never stored pre-tax anyway
    after_tax: i.amount.toString(),
    description: i.description || "",
    tax_percentage: null,
    date: i.date,
    id: i.external_id ?? i.id
  }));
}

// ----- 3. Prepay Schedule -----
export async function getPrepaysFromDB(user_id) {
  const { data, error } = await supabase
    .from("prepays")
    .select("*")
    .eq("user_id", user_id)
    .order("date", { ascending: true });

  if (error) throw error;

  return data.map(p => ({
    id: p.external_id ?? p.id,
    category: p.category,
    amount: p.amount.toString(),
    description: p.description,
    date: p.date,
    frequencyMode: p.frequency_mode,
    frequencyNumber: p.frequency_number,
    frequencyUnit: p.frequency_unit
  }));
}

// ----- 4. Checking History / Recent 100 -----
export async function getCheckingHistoryFromDB(user_id) {
  const { data, error } = await supabase
    .from("checking_history")
    .select("*")
    .eq("user_id", user_id)
    .order("date", { ascending: false })  
    .limit(100);

  if (error) throw error;

  return {
    Checking: data.length ? data[0].total : 0,
    CheckingRecent100: data.map(t => ([
      t.date,
      t.transaction_type,
      t.amount,
      t.total.toString(),
      t.external_id ?? t.id
    ]))
  };
}

// ----- 5. Categories -----
export async function getCategoriesFromDB(user_id) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user_id);

  if (error) throw error;

  const dict = {};
  for (const c of data) {
    dict[c.name] = c.icon_url || c.name;
  }
  return dict;
}
