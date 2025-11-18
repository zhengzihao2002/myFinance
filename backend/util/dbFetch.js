// dbFetch.js (ESM)
import 'dotenv/config';
import dotenv from "dotenv";
dotenv.config();



import { createClient } from "@supabase/supabase-js";


const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

// -------------------------------
// SAFE GET: Expenses
// -------------------------------
export async function getExpensesFromDB(user_id) {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user_id)
      .order("date", { ascending: true });

    if (error) {
      // If DB rejects the user ID (invalid or non-existing), just log a friendly message
      console.log(`User ${user_id} not found`);
      return [];
    }

    return (data ?? []).map(e => ({
      category: e.category,
      amount: e.amount?.toString() ?? "0",
      description: e.description || "",
      date: e.date,
      id: e.external_id ?? e.id
    }));

  } catch (err) {
    console.error("Expenses exception:", err);
    return [];
  }
}


// -------------------------------
// SAFE GET: Income
// -------------------------------
export async function getIncomeFromDB(user_id) {
  try {
    const { data, error } = await supabase
      .from("incomes")
      .select("*")
      .eq("user_id", user_id)
      .order("date", { ascending: true });

    if (error) {
      // If DB rejects the user ID (invalid or non-existing), just log a friendly message
      console.log(`User ${user_id} not found`);
      return [];
    }

    return (data ?? []).map(i => ({
      before_tax: i.amount?.toString() ?? "0",
      after_tax: i.amount?.toString() ?? "0",
      description: i.description || "",
      tax_percentage: null,
      date: i.date,
      id: i.external_id ?? i.id
    }));

  } catch (err) {
    console.error("Income exception:", err);
    return [];
  }
}


// -------------------------------
// SAFE GET: Prepays
// -------------------------------
export async function getPrepaysFromDB(user_id) {
  try {
    const { data, error } = await supabase
      .from("prepays")
      .select("*")
      .eq("user_id", user_id)
      .order("date", { ascending: true });

    if (error) {
      // If DB rejects the user ID (invalid or non-existing), just log a friendly message
      console.log(`User ${user_id} not found`);
      return [];
    }

    return (data ?? []).map(p => ({
      id: p.external_id ?? p.id,
      category: p.category,
      amount: p.amount?.toString() ?? "0",
      description: p.description || "",
      date: p.date,
      frequencyMode: p.frequency_mode,
      frequencyNumber: p.frequency_number,
      frequencyUnit: p.frequency_unit
    }));

  } catch (err) {
    console.error("Prepays exception:", err);
    return [];
  }
}


// -------------------------------
// SAFE GET: Checking History
// -------------------------------
export async function getCheckingHistoryFromDB(user_id) {
  try {
    const { data, error } = await supabase
      .from("checking_history")
      .select("*")
      .eq("user_id", user_id)
      .order("date", { ascending: false })
      .limit(100);

    if (error) {
      // If DB rejects the user ID (invalid or non-existing), just log a friendly message
      console.log(`User ${user_id} not found`);
      return [];
    }

    return {
      Checking: data?.length ? data[0].total : 0,
      CheckingRecent100: (data ?? []).map(t => ([
        t.date,
        t.transaction_type,
        t.amount,
        t.total?.toString() ?? "0",
        t.external_id ?? t.id
      ]))
    };

  } catch (err) {
    console.error("Checking exception:", err);
    return { Checking: 0, CheckingRecent100: [] };
  }
}


// -------------------------------
// SAFE GET: Categories
// -------------------------------
export async function getCategoriesFromDB(user_id) {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user_id);

    if (error) {
      // If DB rejects the user ID (invalid or non-existing), just log a friendly message
      console.log(`User ${user_id} not found`);
      return [];
    }

    const dict = {};
    for (const c of (data ?? [])) {
      dict[c.name] = c.icon_url || c.name;
    }
    return dict;

  } catch (err) {
    console.error("Categories exception:", err);
    return {};
  }
}
