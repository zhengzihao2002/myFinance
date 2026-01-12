import 'dotenv/config';
import dotenv from "dotenv";

import os from "os";
import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { exec } from "child_process";
import { log } from "console";
import { fileURLToPath } from "url";


import {
  getExpensesFromDB,
  getIncomeFromDB,
  getPrepaysFromDB,
  getCheckingHistoryFromDB,
  getCategoriesFromDB
} from "./util/dbFetch.js";

dotenv.config();

// Recreate __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());


import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY; // service role
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);




// TIME HERE IS IN UTC

const dataFilePath = path.join(__dirname, "../userData/data.json");
const settingsFilePath = path.join(__dirname, "../userData/settings.json");
const recentTransactionsFilePath = path.join(__dirname, "../userData/recentTransactions.json");
const prepayFilePath = path.join(__dirname, "../userData/prepay_schedule.json");
const backupFolderPath = path.join(__dirname, "../userData/backup");
const successAudioPath = path.join(__dirname, "../userData/soundEffects/success.mp3");
const categoriesFilePath = path.join(__dirname, "../userData/categories.json");
const userDataDir = path.join(__dirname, "../userData");


const processedRequests = new Set(); // Store processed request IDs
const maxBackupFiles = 100; // Maximum number of backup files


const filesToCreate = [
  {
    filename: "data.json",
    content: {
      expenses: [],
      income: [],
      totalChecking: 0,
    },
  },
  {
    filename: "categories.json",
    content: {
      Food: "外出吃饭",
      Transport: "公共交通",
      Entertainment: "娱乐项目",
      Utilities: "水电",
      Groceries: "购买食材",
      Gas: "汽油",
      Rent: "房租",
      Other: "其他",
    },
  },
  {
    filename: "settings.json",
    content: {
      "Sound Effect": "",
      soundEffects: [""],
      animationType: "slide",
      showTransaction: 100,
      language: "Chinese",
      clickEffect: "",
      clickEffectsList: [""],
    },
  },
  {
    filename: "recentTransactions.json",
    content: {
      Checking: 0.0,
      CheckingRecent100: [],
      "Visa Credit": 0,
      "Master Credit (Apple)": 0,
      "Visa Costco": 0,
    },
  },
  {
    filename: "prepay_schedule.json",
    content: {}, // Empty object since you said it's an empty file
  },
];
// ✅ Create files if missing
filesToCreate.forEach(({ filename, content }) => {
  const fullPath = path.join(userDataDir, filename);

  if (!fs.existsSync(fullPath)) {
    fs.writeFile(fullPath, JSON.stringify(content, null, 2), (err) => {
      if (err) {
        console.error(`❌ Failed to create ${filename}:`, err);
      } else {
        console.log(`✅ Created ${filename}`);
      }
    });
  } else {
    console.log(`✅ ${filename} already exists`);
  }
});
function generateTimestampId() {
  const now = new Date();
  const pad = (n, len = 2) => n.toString().padStart(len, "0");

  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`;

  return `${date}_${time}`;
}
function resolveDatePlaceholders(description) {
  const now = new Date();

  const pad = (n, len = 2) => n.toString().padStart(len, "0");

  const replacements = {
    "{YEAR}": now.getFullYear(),
    "{MONTH}": pad(now.getMonth() + 1),
    "{DAY}": pad(now.getDate()),
    "{HOUR}": pad(now.getHours()),
    "{MINUTE}": pad(now.getMinutes()),
    "{SECOND}": pad(now.getSeconds()),
    "{MS}": pad(now.getMilliseconds(), 3)
  };

  let result = description;

  for (const [key, value] of Object.entries(replacements)) {
    result = result.replaceAll(key, value);
  }

  return result;
}




// ✅ Ensure backup folder exists
const ensureBackupFolder = () => {
  if (!fs.existsSync(backupFolderPath)) {
    fs.mkdirSync(backupFolderPath, { recursive: true });
    console.log("✅ Backup folder created:", backupFolderPath);
  }
};

// ✅ Manage backup folder size
const manageBackupFolderSize = () => {
  ensureBackupFolder(); // <-- Make sure folder exists

  fs.readdir(backupFolderPath, (err, files) => {
    if (err) {
      return console.error("Failed to read backup folder:", err);
    }

    const jsonFiles = files
      .filter((file) => file.endsWith(".json"))
      .map((file) => ({
        name: file,
        time: fs.statSync(path.join(backupFolderPath, file)).mtime.getTime(),
      }))
      .sort((a, b) => a.time - b.time); // Sort by modification time

    while (jsonFiles.length >= maxBackupFiles) {
      const oldestFile = jsonFiles.shift();
      fs.unlink(path.join(backupFolderPath, oldestFile.name), (unlinkErr) => {
        if (unlinkErr) {
          console.error("Failed to delete file:", oldestFile.name, unlinkErr);
        } else {
          console.log("🗑️ Deleted oldest backup file:", oldestFile.name);
        }
      });
    }
  });
};

// ✅ Create backup
const createBackup = (callback) => {
  ensureBackupFolder(); // <-- Ensure folder before backup

  const now = new Date();
  const timestamp = now.toISOString().replace("T", "_").replace(/:/g, "-").split(".")[0];
  const backupFileName = `data_${timestamp}.json`;
  const backupFilePath = path.join(backupFolderPath, backupFileName);

  manageBackupFolderSize(); // Cleanup old files if needed

  fs.copyFile(dataFilePath, backupFilePath, (err) => {
    if (err) {
      console.error("❌ Failed to create backup:", err);
      return callback(err);
    }
    console.log("✅ Backup created successfully:", backupFileName);
    callback(null);
  });
};

// Helper function to play success audio
const playSuccessAudio = () => {
  const platform = os.platform();
  let command;

  if (platform === "darwin") {
    // macOS
    command = `afplay "${successAudioPath}"`;
  } else if (platform === "win32") {
    // Windows
    command = `powershell -c (New-Object Media.SoundPlayer "${successAudioPath}").PlaySync();`;
  } else {
    // Linux
    command = `aplay "${successAudioPath}" || paplay "${successAudioPath}"`;
  }

  exec(command, (err) => {
    if (err) {
      console.error("Failed to play success audio:", err);
    } else {
      console.log("Success audio played.");
    }
  });
};









// expenses
export async function upsertExpensesToDB(user_id, expenses) {
  await supabase
    .from("expenses")
    .delete()
    .eq("user_id", user_id);

  if (expenses.length > 0) {
    await supabase
      .from("expenses")
      .insert(
        expenses.map(e => ({
          user_id,
          category: e.category,
          amount: e.amount,
          description: e.description,
          date: e.date,
          external_id: e.id
        }))
      );
  }
}
async function isProcessed(requestId) {
  const { data } = await supabase
    .from("processed_requests")
    .select("request_id")
    .eq("request_id", requestId)
    .single();

  return !!data;
}
function isLocalSource(req) {
  return req.body?.source === "local";
}
async function checkAndInsertRequest(requestId, userId) {
  const { data: existing } = await supabase
    .from("processed_requests")
    .select("request_id")
    .eq("request_id", requestId)
    .maybeSingle();

  if (existing) return false;

  await supabase.from("processed_requests").insert({
    request_id: requestId,
    user_id: userId,
  });

  return true;
}




// Endpoint to update expenses
app.post("/api/update-expenses", async (req, res) => {
  const { source, user_id, expenses, requestId } = req.body;

  // ---------------- LOCAL ----------------
  if (source === "local") {
    if (processedRequests.has(requestId)) {
      return res.status(200).send("Already processed");
    }
    processedRequests.add(requestId);

    createBackup((backupError) => {
      if (backupError) return res.status(500).send("Backup failed");

      fs.readFile(dataFilePath, "utf8", (err, data) => {
        if (err) return res.status(500).send("Read failed");

        const json = JSON.parse(data);
        json.expenses = expenses;

        fs.writeFile(dataFilePath, JSON.stringify(json, null, 2), () => {
          playSuccessAudio();
          res.status(200).send("Expenses updated (local)");
        });
      });
    });
    return;
  }

  // ---------------- DB ----------------
  if (source === "db") {
    if (!(await checkAndInsertRequest(requestId, user_id))) {
      return res.status(200).send("Request already processed.");
    }

    const { error: delErr } = await supabase
      .from("expenses")
      .delete()
      .eq("user_id", user_id);

    if (delErr) return res.status(500).send("Failed to clear expenses");

    const rows = expenses.map(e => ({ ...e, user_id }));

    const { error: insErr } = await supabase
      .from("expenses")
      .insert(rows);

    if (insErr) return res.status(500).send("Failed to insert expenses");

    return res.status(200).send("Expenses updated (DB).");
  }

  res.status(400).send("Invalid source");
});


// Endpoint to update income
app.post("/api/update-income", async (req, res) => {
  const { income, requestId, user_id, source } = req.body;
  
  if (source === "db") {
    if (!(await checkAndInsertRequest(requestId, user_id))) {
      return res.status(200).send("Request already processed.");
    }

    await supabase.from("income").delete().eq("user_id", user_id);

    const rows = income.map(i => ({ ...i, user_id }));
    await supabase.from("income").insert(rows);

    return res.status(200).send("Income updated (DB).");
  }

  if (source === "local") {
    if (processedRequests.has(requestId)) {
    console.log(`Request with ID ${requestId} already processed.`);
    return res.status(200).send("Request already processed.");
  }

  processedRequests.add(requestId); // Mark request as processed

  createBackup((backupError) => {
    if (backupError) return res.status(500).send("Failed to create backup.");

    fs.readFile(dataFilePath, "utf8", (err, data) => {
      if (err) return res.status(500).send("Failed to read file.");

      const jsonData = JSON.parse(data);
      jsonData.income = income;

      fs.writeFile(dataFilePath, JSON.stringify(jsonData, null, 2), (writeErr) => {
        if (writeErr) return res.status(500).send("Failed to write file.");

        playSuccessAudio();
        console.log("Played at update income");
        res.status(200).send("Income updated successfully.");
      });
    });
  });
  }

  res.status(400).send("Invalid source");

  
});

// Endpoint to update total checking amount
app.post("/api/update-total", async (req, res) => {
  const { newTotal, requestId, user_id, source } = req.body;
  console.log(req.body);

  if (source === "db") {
    if (!(await checkAndInsertRequest(requestId, user_id))) {
      return res.status(200).send("Already processed");
    }

    await supabase
      .from("accounts")
      .upsert({
        user_id,
        checking: newTotal,
      });

    return res.status(200).send("Checking total updated (DB)");
  }
  
  if (source === "local") {
    if (processedRequests.has(requestId)) {
      console.log(`Request with ID ${requestId} already processed.`);
      return res.status(200).send("Request already processed.");
    }

    processedRequests.add(requestId); // Mark request as processed

    fs.readFile(recentTransactionsFilePath, "utf8", (err, data) => {
      if (err) {
        return res.status(500).send("Failed to read file.");
      }

      const jsonData = JSON.parse(data);
      jsonData.Checking = newTotal;

      fs.writeFile(recentTransactionsFilePath, JSON.stringify(jsonData, null, 2), (writeErr) => {
        if (writeErr) {
          return res.status(500).send("Failed to write file.");
        }

        res.status(200).send(`Total checking amount ${newTotal} updated successfully.`);
      });
    });
  }
  res.status(400).send("Invalid source");

});

// Endpoint to update CheckingLast100 transactions
app.post("/api/update-checking-last100", async (req, res) => {
  const { newTransaction, requestId, user_id, source } = req.body;

  if (source === "db") {
    if (!(await checkAndInsertRequest(requestId, user_id))) {
      return res.status(200).send("Already processed");
    }

    await supabase.from("checking_transactions").insert({
      user_id,
      date: newTransaction[0],
      description: newTransaction[1],
      amount: newTransaction[2],
      balance: newTransaction[3],
    });

    // prune old rows
    const { data: rows } = await supabase
      .from("checking_transactions")
      .select("id")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .range(100, 1000);

    if (rows?.length) {
      await supabase
        .from("checking_transactions")
        .delete()
        .in("id", rows.map(r => r.id));
    }

    return res.status(200).send("Checking updated (DB)");
  }

  if (source === "local") {
    if (processedRequests.has(requestId)) {
      console.log(`Request with ID ${requestId} already processed.`);
      return res.status(500).send("Request already processed. Last 100 Not updated.");
    }

    processedRequests.add(requestId);

    fs.readFile(recentTransactionsFilePath, "utf8", (err, data) => {
      if (err) {
        console.error("Failed to read file.");
        return res.status(500).send("Failed to read file.");
      }

      let jsonData;
      try {
        jsonData = JSON.parse(data);
      } catch (parseErr) {
        console.error("Error parsing JSON:", parseErr);
        return res.status(500).send("Invalid JSON data.");
      }
      jsonData.Checking = parseFloat(parseFloat(newTransaction[3]).toFixed(2));
      console.log(`Updating jsonData.Checking to ${parseFloat(parseFloat(newTransaction[3]).toFixed(2))}`,newTransaction[3]);
      

      // Add the new transaction to the front of the array
      jsonData.CheckingRecent100.unshift(newTransaction);

      // Ensure the length of CheckingLast100 does not exceed 100
      if (jsonData.CheckingRecent100.length > 100) {
        jsonData.CheckingRecent100.pop();
      }


      // Write the updated data back to recentTransactions.json
      fs.writeFile(recentTransactionsFilePath, JSON.stringify(jsonData, null, 2), (writeErr) => {
        if (writeErr) {
          console.error("Failed to write file.");
          return res.status(500).send("Failed to write file.");
        }
        console.log("New Checking",jsonData.Checking);
        
        return res.status(200).send(`Transaction successfully updated. Total checking amount ${jsonData.Checking} updated successfully.`);
      });
    });
  }

  res.status(400).send("Invalid source");
});

app.post("/api/add-prepay", async (req, res) => {
  const { newPrepay, requestId, user_id, source } = req.body;
  if (source === "db") {
    if (!(await checkAndInsertRequest(requestId, user_id))) {
      return res.status(200).send("Already processed");
    }

    await supabase.from("prepays").insert({
      user_id,
      ...newPrepay,
    });

    return res.status(200).send("Prepay added (DB)");
  }

  if (source === "local") {
    if (processedRequests.has(requestId)) {
      console.log(`Duplicate request: ${requestId}`);
      return res.status(200).send("Already processed.");
    }
    processedRequests.add(requestId);

    fs.readFile(prepayFilePath, "utf8", (err, data) => {
      let allPrepay = [];

      if (!err && data) {
        try {
          allPrepay = JSON.parse(data);
        } catch {
          allPrepay = [];
        }
      }

      // Append ID here
      const prepayWithId = {
        id: generateTimestampId(),
        ...newPrepay,
      };

      allPrepay.push(prepayWithId);

      fs.writeFile(prepayFilePath, JSON.stringify(allPrepay, null, 2), (err) => {
        if (err) {
          console.error("Write failed:", err);
          return res.status(500).send("Failed to save.");
        }

        res.status(200).send("Prepay added successfully.");
      });
    });
  }
  res.status(400).send("Invalid source");
});


app.post("/api/add-category", async (req, res) => {
  const { en, zh, user_id, source } = req.body;
  if (!en || !zh) {
    return res.status(400).send("Missing category name(s).");
  }

  if (source == "db") {
    await supabase.from("categories").insert({
      user_id,
      en,
      zh,
    });
    return res.status(200).send("Category added (DB)");
  }
  if (source == "local") {
    fs.readFile(categoriesFilePath, "utf8", (err, data) => {
    if (err) return res.status(500).send("Failed to read categories file.");

    let categories;
    try {
      categories = JSON.parse(data);
    } catch (e) {
      return res.status(500).send("Invalid categories file.");
    }

    if (categories[en]) {
      return res.status(400).send("Category already exists.");
    }

    categories[en] = zh;

    fs.writeFile(categoriesFilePath, JSON.stringify(categories, null, 2), (err) => {
      if (err) return res.status(500).send("Failed to write categories file.");
      res.status(200).send("Category added successfully.");
    });
  });
  }
  res.status(400).send("Invalid source");
});
app.post("/api/change-category", async (req, res) => {
  const { source, user_id, from, to } = req.body;

  if (!source) return res.status(400).send("Missing source");
  if (!from || !to) return res.status(400).send("Missing 'from' or 'to' category.");

  // ---------- LOCAL ----------
  if (source === "local") {
    fs.readFile(dataFilePath, "utf8", (err, data) => {
      if (err) {
        console.error("❌ Failed to read data.json:", err);
        return res.status(500).send("Failed to read data file.");
      }

      let jsonData;
      try {
        jsonData = JSON.parse(data);
      } catch (parseErr) {
        console.error("❌ Invalid JSON in data.json:", parseErr);
        return res.status(500).send("Invalid JSON format.");
      }

      let changedCount = 0;
      ["expenses", "income"].forEach((section) => {
        if (Array.isArray(jsonData[section])) {
          jsonData[section] = jsonData[section].map((item) => {
            if (item.category === from) {
              changedCount++;
              return { ...item, category: to };
            }
            return item;
          });
        }
      });

      fs.writeFile(dataFilePath, JSON.stringify(jsonData, null, 2), (writeErr) => {
        if (writeErr) {
          console.error("❌ Failed to write updated data.json:", writeErr);
          return res.status(500).send("Failed to write file.");
        }

        console.log(`✅ Changed ${changedCount} transactions from '${from}' to '${to}'.`);
        res.status(200).send(`Successfully changed ${changedCount} transactions from '${from}' to '${to}'.`);
      });
    });
    return;
  }

  // ---------- DB ----------
  if (source === "db") {
    if (!user_id) return res.status(400).send("Missing user_id");

    try {
      const tables = ["expenses", "income"];
      let totalChanged = 0;

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("user_id", user_id)
          .eq("category", from);

        if (error) throw error;

        if (data.length > 0) {
          totalChanged += data.length;
          const { error: updError } = await supabase
            .from(table)
            .update({ category: to })
            .eq("user_id", user_id)
            .eq("category", from);
          if (updError) throw updError;
        }
      }

      res.status(200).send(`Successfully changed ${totalChanged} transactions from '${from}' to '${to}' (DB).`);
    } catch (err) {
      console.error("DB change-category error:", err);
      res.status(500).send("Failed to update categories in DB.");
    }
  }
});


app.post("/api/delete-categories", async (req, res) => {
  const { categoriesToDelete, user_id, source } = req.body;
  if (!Array.isArray(categoriesToDelete) || categoriesToDelete.length === 0) {
    return res.status(400).send("No categories specified.");
  }

  if (source === "db") {
    await supabase
      .from("categories")
      .delete()
      .eq("user_id", user_id)
      .in("en", categoriesToDelete);

    return res.status(200).send("Categories deleted (DB)");
  }

  if (source === "local") {
    fs.readFile(categoriesFilePath, "utf8", (err, data) => {
      if (err) return res.status(500).send("Failed to read categories file.");

      let categories;
      try {
        categories = JSON.parse(data);
      } catch (e) {
        return res.status(500).send("Invalid categories file.");
      }

      // Remove each category
      categoriesToDelete.forEach((cat) => {
        if (cat !== "Other") {
          delete categories[cat];
        }
      });

      fs.writeFile(categoriesFilePath, JSON.stringify(categories, null, 2), (err) => {
        if (err) return res.status(500).send("Failed to write categories file.");
        res.status(200).send("Categories deleted successfully.");
      });
    });
  }
  res.status(400).send("Invalid source");
});

// Endpoint to fetch total checking amount
app.post("/api/get-total-checking", async (req, res) => {
  const { source, user_id } = req.body;

  if (!source) return res.status(400).send("Missing source");

  // ---------- LOCAL ----------
  if (source === "local") {
    fs.readFile(recentTransactionsFilePath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading recentTransactions.json:", err);
        return res.status(500).send("Failed to read total checking.");
      }
      try {
        const jsonData = JSON.parse(data);
        const checking = jsonData.Checking || 0;
        res.status(200).json({ checking });
      } catch (parseErr) {
        console.error("Error parsing recentTransactions.json:", parseErr);
        res.status(500).send("Invalid JSON format.");
      }
    });
    return;
  }

  // ---------- DB ----------
  if (source === "db") {
    if (!user_id) return res.status(400).send("Missing user_id");
    try {
      const { data, error } = await supabase
        .from("checking")
        .select("amount");

      if (error) throw error;

      const total = data.reduce((sum, item) => sum + (item.amount || 0), 0);
      res.status(200).json({ checking: total });
    } catch (err) {
      console.error("DB get-total-checking error:", err);
      res.status(500).send("Failed to calculate total checking from DB.");
    }
  }
});


// Endpoint to fetch CheckingRecent100
app.post("/api/get-checking-recent100", async (req, res) => {
  const { source, user_id } = req.body;

  if (!source) return res.status(400).send("Missing source");

  // ---------- LOCAL ----------
  if (source === "local") {
    fs.readFile(recentTransactionsFilePath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading recentTransactions.json:", err);
        return res.status(500).send("Failed to read recent transactions.");
      }
      try {
        const jsonData = JSON.parse(data);
        const recent100 = jsonData.CheckingRecent100 || [];
        res.status(200).json({ recent100 });
      } catch (parseErr) {
        console.error("Error parsing recentTransactions.json:", parseErr);
        res.status(500).send("Invalid JSON format.");
      }
    });
    return;
  }

  // ---------- DB ----------
  if (source === "db") {
    if (!user_id) return res.status(400).send("Missing user_id");
    try {
      const { data, error } = await supabase
        .from("checking")
        .select("*")
        .eq("user_id", user_id)
        .order("date", { ascending: false })
        .limit(100);

      if (error) throw error;

      res.status(200).json({ recent100: data || [] });
    } catch (err) {
      console.error("DB get-checking-recent100 error:", err);
      res.status(500).send("Failed to fetch recent checking transactions from DB.");
    }
  }
});


// Endpoint to get settings.json
app.get("/api/get-settings", (req, res) => {
  fs.readFile(settingsFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading settings.json:", err);
      return res.status(500).send("Failed to read settings.");
    }

    try {
      const settings = JSON.parse(data);
      res.status(200).json(settings);
    } catch (parseErr) {
      console.error("Error parsing settings.json:", parseErr);
      return res.status(500).send("Invalid JSON in settings.");
    }
  });
});
app.post("/api/get-data", async (req, res) => {
  const { source, user_id } = req.body;

  try {
    // -------------------------------
    // LOCAL JSON MODE
    // -------------------------------
    if (source === "local") {
      fs.readFile(dataFilePath, "utf8", (err, data) => {
        if (err) {
          console.error("Failed to read data.json:", err);
          return res.status(500).send("Failed to read data file.");
        }

        try {
          const jsonData = JSON.parse(data);
          return res.status(200).json(jsonData);
        } catch (parseErr) {
          console.error("Invalid JSON:", parseErr);
          return res.status(500).send("Invalid JSON format.");
        }
      });

      return;
    }

    // -------------------------------
    // DATABASE MODE
    // -------------------------------
    if (source === "db") {
      if (!user_id) {
        return res.status(400).json({ error: "Missing user_id" });
      }

      const [
        expenses,
        income,
        prepays,
        checking,
        categories
      ] = await Promise.all([
        getExpensesFromDB(user_id),
        getIncomeFromDB(user_id),
        getPrepaysFromDB(user_id),
        getCheckingHistoryFromDB(user_id),
        getCategoriesFromDB(user_id)
      ]);

      return res.status(200).json({
        expenses,
        income,
        prepays,
        checking,
        categories
      });
    }

    // -------------------------------
    // INVALID SOURCE
    // -------------------------------
    return res.status(400).json({
      error: "Invalid data source. Use 'local' or 'db'."
    });

  } catch (err) {
    console.error("get-data fatal error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/api/get-categories", async (req, res) => {
  const { source, user_id } = req.body;

  try {
    // -------------------------------
    // LOCAL JSON MODE
    // -------------------------------
    if (source === "local") {
      fs.readFile(categoriesFilePath, "utf8", (err, data) => {
        if (err) {
          console.error("Error reading categories.json:", err);
          return res.status(500).send("Failed to read categories.json");
        }

        try {
          const jsonData = JSON.parse(data);
          return res.status(200).json(jsonData);
        } catch (parseErr) {
          console.error("Invalid JSON in categories.json:", parseErr);
          return res.status(500).send("Invalid JSON format.");
        }
      });

      return;
    }

    // -------------------------------
    // DATABASE MODE
    // -------------------------------
    if (source === "db") {
      if (!user_id) {
        return res.status(400).json({ error: "Missing user_id" });
      }

      const categories = await getCategoriesFromDB(user_id);

      return res.status(200).json(categories);
    }

    // -------------------------------
    // INVALID SOURCE
    // -------------------------------
    return res.status(400).json({
      error: "Invalid data source. Use 'local' or 'db'."
    });

  } catch (err) {
    console.error("get-categories fatal error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/api/get-prepay", async (req, res) => {
  const { source, user_id } = req.body;

  if (!source) return res.status(400).send("Missing source");

  // ---------- LOCAL ----------
  if (source === "local") {
    fs.readFile(prepayFilePath, "utf8", (err, data) => {
      if (err) {
        console.error("Failed to read scheduled_prepay.json:", err);
        return res.status(500).send("Failed to load prepay data.");
      }
      try {
        const prepayList = JSON.parse(data);
        res.status(200).json(prepayList);
      } catch (e) {
        console.error("Invalid JSON in prepay file:", e);
        res.status(500).send("Malformed prepay data.");
      }
    });
    return;
  }

  // ---------- DB ----------
  if (source === "db") {
    if (!user_id) return res.status(400).send("Missing user_id");
    try {
      const { data: prepays, error } = await supabase
        .from("prepays")
        .select("*")
        .eq("user_id", user_id);

      if (error) throw error;

      return res.status(200).json(prepays || []);
    } catch (err) {
      console.error("DB get-prepay error:", err);
      return res.status(500).send("Failed to fetch prepay data from DB.");
    }
  }

  res.status(400).send("Invalid source");
});


app.post("/api/modify-prepay", async (req, res) => {
  const { source, user_id, id, category, amount, description, date, frequencyMode, frequencyNumber, frequencyUnit } = req.body;

  if (!source) return res.status(400).send("Missing source");

  // ---------- LOCAL ----------
  if (source === "local") {
    fs.readFile(prepayFilePath, "utf8", (err, data) => {
      if (err) return res.status(502).send("读取失败");

      let json = [];
      try {
        json = JSON.parse(data);
      } catch {
        return res.status(501).send("JSON格式错误");
      }

      const index = json.findIndex(p => p.id === id);
      if (index === -1) return res.status(404).send("未找到预付款");

      json[index] = { id, category, amount, description, date, frequencyMode, frequencyNumber, frequencyUnit };

      fs.writeFile(prepayFilePath, JSON.stringify(json, null, 2), (writeErr) => {
        if (writeErr) return res.status(500).send("保存失败");
        res.status(200).send("修改成功 (local)");
      });
    });
    return;
  }

  // ---------- DB ----------
  if (source === "db") {
    if (!user_id) return res.status(400).send("Missing user_id");

    try {
      const { error } = await supabase
        .from("prepays")
        .update({ category, amount, description, date, frequencyMode, frequencyNumber, frequencyUnit })
        .eq("id", id)
        .eq("user_id", user_id);

      if (error) throw error;

      return res.status(200).send("修改成功 (DB)");
    } catch (err) {
      console.error("DB modify-prepay error:", err);
      return res.status(500).send("DB 修改失败");
    }
  }

  res.status(400).send("Invalid source");
});

app.post("/api/delete-prepay", async (req, res) => {
  const { source, user_id, id } = req.body;

  if (!source) return res.status(400).send("Missing source");

  // ---------- LOCAL ----------
  if (source === "local") {
    fs.readFile(prepayFilePath, "utf8", (err, data) => {
      if (err) return res.status(500).send("读取失败");

      let json;
      try {
        json = JSON.parse(data);
      } catch {
        return res.status(500).send("JSON格式错误");
      }

      if (!Array.isArray(json)) return res.status(500).send("数据结构错误");

      const updated = json.filter(p => p.id !== id);
      if (updated.length === json.length) return res.status(404).send("未找到该预付款");

      fs.writeFile(prepayFilePath, JSON.stringify(updated, null, 2), (writeErr) => {
        if (writeErr) return res.status(500).send("保存失败");
        res.status(200).send("删除成功 (local)");
      });
    });
    return;
  }

  // ---------- DB ----------
  if (source === "db") {
    if (!user_id) return res.status(400).send("Missing user_id");

    try {
      const { error } = await supabase
        .from("prepays")
        .delete()
        .eq("id", id)
        .eq("user_id", user_id);

      if (error) throw error;

      return res.status(200).send("删除成功 (DB)");
    } catch (err) {
      console.error("DB delete-prepay error:", err);
      return res.status(500).send("DB 删除失败");
    }
  }

  res.status(400).send("Invalid source");
});

app.post("/api/update-prepay-date", async (req, res) => {
  const { source, user_id, id, newDate } = req.body;

  if (!source) return res.status(400).send("Missing source");

  // ---------- LOCAL ----------
  if (source === "local") {
    fs.readFile(prepayFilePath, "utf8", (err, data) => {
      if (err) return res.status(500).send("读取失败");

      let json;
      try {
        json = JSON.parse(data);
      } catch {
        return res.status(500).send("JSON格式错误");
      }

      if (!Array.isArray(json)) return res.status(500).send("预付款数据格式应为数组");

      const index = json.findIndex(p => p.id === id);
      if (index === -1) return res.status(404).send("未找到预付款");

      json[index].date = newDate;

      fs.writeFile(prepayFilePath, JSON.stringify(json, null, 2), (writeErr) => {
        if (writeErr) return res.status(500).send("保存失败");
        res.status(200).send("更新成功 (local)");
      });
    });
    return;
  }

  // ---------- DB ----------
  if (source === "db") {
    if (!user_id) return res.status(400).send("Missing user_id");

    try {
      const { error } = await supabase
        .from("prepays")
        .update({ date: newDate })
        .eq("id", id)
        .eq("user_id", user_id);

      if (error) throw error;

      return res.status(200).send("更新成功 (DB)");
    } catch (err) {
      console.error("DB update-prepay-date error:", err);
      return res.status(500).send("DB 更新失败");
    }
  }

  res.status(400).send("Invalid source");
});














// 🔥 One endpoint returns all local-format data
app.get("/api/fullData", async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: "Missing user_id" });

    const [expenses, income, prepay_schedule, checking, categories] =
      await Promise.all([
        getExpensesFromDB(userId),
        getIncomeFromDB(userId),
        getPrepaysFromDB(userId),
        getCheckingHistoryFromDB(userId),
        getCategoriesFromDB(userId)
      ]);

    res.json({
      categories,
      data: {
        expenses,
        income
      },
      prepay_schedule,
      recentTransactions: checking
    });

  } catch (err) {
    console.error("DB fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});
// -------------------------------------------------------
// 🔥 Compare DB vs Local JSON
// GET /api/diff?user_id=xxxx
// -------------------------------------------------------
app.get("/api/diff", async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: "Missing user_id" });

    // -----------------------
    // 1. Fetch DB data
    // -----------------------
    const [dbExpenses, dbIncome, dbPrepays, dbChecking, dbCategories] =
      await Promise.all([
        getExpensesFromDB(userId),
        getIncomeFromDB(userId),
        getPrepaysFromDB(userId),
        getCheckingHistoryFromDB(userId),
        getCategoriesFromDB(userId)
      ]);

    // -----------------------
    // 2. Load Local JSON
    // -----------------------
    const localData = JSON.parse(fs.readFileSync(dataFilePath, "utf8"));
    const localCategories = JSON.parse(fs.readFileSync(categoriesFilePath, "utf8"));
    const localPrepay = JSON.parse(fs.readFileSync(prepayFilePath, "utf8"));
    const localChecking = JSON.parse(fs.readFileSync(recentTransactionsFilePath, "utf8"));

    const localExpenses = localData.expenses || [];
    const localIncome = localData.income || [];

    // -----------------------------------------------------
    // Helper to compare by ALL attributes
    // -----------------------------------------------------
    const indexById = arr => {
      const map = {};
      arr.forEach(item => { map[item.id] = item; });
      return map;
    };

    const normalizeForComparison = (obj) => {
      const normalized = {};
      
      // Sort keys alphabetically
      const sortedKeys = Object.keys(obj).sort();
      
      sortedKeys.forEach(key => {
        let value = obj[key];
        
        // Normalize all numeric strings to numbers
        if (typeof value === 'string') {
          value = value.trim();
          // If it's a numeric string, convert to number
          const num = parseFloat(value);
          if (!isNaN(num) && value !== '') {
            value = num;
          }
        }
        
        normalized[key] = value;
      });
      
      return normalized;
    };

    const areEqual = (obj1, obj2) => {
      const norm1 = normalizeForComparison(obj1);
      const norm2 = normalizeForComparison(obj2);
      return JSON.stringify(norm1) === JSON.stringify(norm2);
    };

    const compareArrays = (localArr, dbArr) => {
      const localMap = indexById(localArr);
      const dbMap = indexById(dbArr);

      const onlyLocal = [];
      const onlyDB = [];
      const modified = [];

      // Check local items
      for (const id in localMap) {
        if (!dbMap[id]) {
          onlyLocal.push(localMap[id]);
        } else {
          if (!areEqual(localMap[id], dbMap[id])) {
            modified.push({
              id,
              local: localMap[id],
              db: dbMap[id]
            });
          }
        }
      }

      // Check DB items missing in local
      for (const id in dbMap) {
        if (!localMap[id]) {
          onlyDB.push(dbMap[id]);
        }
      }

      return { onlyLocal, onlyDB, modified };
    };

    // -----------------------------
    // 3. Build diffs
    // -----------------------------
    const expensesDiff = compareArrays(localExpenses, dbExpenses);
    const incomeDiff = compareArrays(localIncome, dbIncome);
    const prepaysDiff = compareArrays(localPrepay, dbPrepays);

    // Checking
    const formatCheckingLocal = (ch) =>
      (ch.CheckingRecent100 || []).map(t => ({
        date: t[0],
        type: t[1],
        amount: t[2],
        total: t[3],
        id: t[4]
      }));

    const checkingLocal = formatCheckingLocal(localChecking);
    const checkingDB = dbChecking.CheckingRecent100.map(t => ({
      date: t[0],
      type: t[1],
      amount: t[2],
      total: t[3],
      id: t[4]
    }));

    const checkingDiff = compareArrays(checkingLocal, checkingDB);

    // Categories
    const categoryKeysLocal = new Set(Object.keys(localCategories));
    const categoryKeysDB = new Set(Object.keys(dbCategories));

    const categoriesOnlyLocal = [...categoryKeysLocal].filter(k => !categoryKeysDB.has(k));
    const categoriesOnlyDB = [...categoryKeysDB].filter(k => !categoryKeysLocal.has(k));
    const categoriesModified = [];

    for (const key of categoryKeysLocal) {
      if (categoryKeysDB.has(key)) {
        if (!areEqual(localCategories[key], dbCategories[key])) {
          categoriesModified.push({
            key,
            local: localCategories[key],
            db: dbCategories[key]
          });
        }
      }
    }

    // -----------------------------
    // 4. Format human-readable output
    // -----------------------------
    let output = [];
    let hasDifferences = false;

    // Helper to find differences between two objects
    const findDifferences = (local, db) => {
      const diffs = [];
      const allKeys = new Set([...Object.keys(local), ...Object.keys(db)]);
      
      for (const key of allKeys) {
        if (key === 'id') continue; // Skip id field
        
        const localVal = local[key];
        const dbVal = db[key];
        
        // Normalize for comparison
        const normLocal = typeof localVal === 'string' ? localVal.trim() : localVal;
        const normDB = typeof dbVal === 'string' ? dbVal.trim() : dbVal;
        
        if (JSON.stringify(normLocal) !== JSON.stringify(normDB)) {
          diffs.push(`  ${key}: "${normDB}" → "${normLocal}"`);  // DB → Local (was → now)
        }
      }
      
      return diffs;
    };

    // Expenses
    if (expensesDiff.onlyLocal.length > 0) {
      hasDifferences = true;
      output.push("📍 EXPENSES - Only in Local:");
      expensesDiff.onlyLocal.forEach(exp => {
        output.push(`  • ${exp.date} - ${exp.description} ($${exp.amount}) [${exp.category}]`);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    if (expensesDiff.onlyDB.length > 0) {
      hasDifferences = true;
      output.push("💾 EXPENSES - Only in Database:");
      expensesDiff.onlyDB.forEach(exp => {
        output.push(`  • ${exp.date} - ${exp.description} ($${exp.amount}) [${exp.category}]`);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    if (expensesDiff.modified.length > 0) {
      hasDifferences = true;
      output.push("✏️  EXPENSES - Modified:");
      expensesDiff.modified.forEach(mod => {
        output.push(`  • ${mod.local.date} - ${mod.local.description}`);
        const diffs = findDifferences(mod.local, mod.db);
        output.push(...diffs);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    // Income
    if (incomeDiff.onlyLocal.length > 0) {
      hasDifferences = true;
      output.push("📍 INCOME - Only in Local:");
      incomeDiff.onlyLocal.forEach(inc => {
        output.push(`  • ${inc.date} - ${inc.description} ($${inc.after_tax})`);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    if (incomeDiff.onlyDB.length > 0) {
      hasDifferences = true;
      output.push("💾 INCOME - Only in Database:");
      incomeDiff.onlyDB.forEach(inc => {
        output.push(`  • ${inc.date} - ${inc.description} ($${inc.after_tax})`);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    if (incomeDiff.modified.length > 0) {
      hasDifferences = true;
      output.push("✏️  INCOME - Modified:");
      incomeDiff.modified.forEach(mod => {
        output.push(`  • ${mod.local.date} - ${mod.local.description}`);
        const diffs = findDifferences(mod.local, mod.db);
        output.push(...diffs);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    // Prepays
    if (prepaysDiff.onlyLocal.length > 0) {
      hasDifferences = true;
      output.push("📍 PREPAYS - Only in Local:");
      prepaysDiff.onlyLocal.forEach(prep => {
        output.push(`  • ${prep.id}: $${prep.amount}`);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    if (prepaysDiff.onlyDB.length > 0) {
      hasDifferences = true;
      output.push("💾 PREPAYS - Only in Database:");
      prepaysDiff.onlyDB.forEach(prep => {
        output.push(`  • ${prep.id}: $${prep.amount}`);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    if (prepaysDiff.modified.length > 0) {
      hasDifferences = true;
      output.push("✏️  PREPAYS - Modified:");
      prepaysDiff.modified.forEach(mod => {
        output.push(`  • ${mod.id}`);
        const diffs = findDifferences(mod.local, mod.db);
        output.push(...diffs);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    // Checking
    if (checkingDiff.onlyLocal.length > 0) {
      hasDifferences = true;
      output.push("📍 CHECKING - Only in Local:");
      checkingDiff.onlyLocal.forEach(chk => {
        output.push(`  • ${chk.date} - ${chk.type}: $${chk.amount} (Total: $${chk.total})`);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    if (checkingDiff.onlyDB.length > 0) {
      hasDifferences = true;
      output.push("💾 CHECKING - Only in Database:");
      checkingDiff.onlyDB.forEach(chk => {
        output.push(`  • ${chk.date} - ${chk.type}: $${chk.amount} (Total: $${chk.total})`);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    if (checkingDiff.modified.length > 0) {
      hasDifferences = true;
      output.push("✏️  CHECKING - Modified:");
      checkingDiff.modified.forEach(mod => {
        output.push(`  • ${mod.local.date} - ${mod.local.type}`);
        const diffs = findDifferences(mod.local, mod.db);
        output.push(...diffs);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    // Categories
    if (categoriesOnlyLocal.length > 0) {
      hasDifferences = true;
      output.push("📍 CATEGORIES - Only in Local:");
      categoriesOnlyLocal.forEach(cat => {
        output.push(`  • ${cat}`);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    if (categoriesOnlyDB.length > 0) {
      hasDifferences = true;
      output.push("💾 CATEGORIES - Only in Database:");
      categoriesOnlyDB.forEach(cat => {
        output.push(`  • ${cat}`);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    if (categoriesModified.length > 0) {
      hasDifferences = true;
      output.push("✏️  CATEGORIES - Modified:");
      categoriesModified.forEach(mod => {
        output.push(`  • ${mod.key}`);
        output.push(`    Local: ${JSON.stringify(mod.local)}`);
        output.push(`    DB: ${JSON.stringify(mod.db)}`);
      });
      output.push("");
      output.push("");
      output.push("");
      output.push("");
    }

    // Final output
    if (!hasDifferences) {
      res.send(`
        <html>
          <head>
            <style>
              body {
                background-color: #1e1e1e;
                color: #ffffff;
                font-family: 'Consolas', 'Monaco', monospace;
                padding: 20px;
                margin: 0;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
              }
            </style>
          </head>
          <body>
            <pre>✅ Everything is in sync! Local and database match perfectly.</pre>
          </body>
        </html>
      `);
    } else {
      res.send(`
        <html>
          <head>
            <style>
              body {
                background-color: #1e1e1e;
                color: #ffffff;
                font-family: 'Consolas', 'Monaco', monospace;
                padding: 20px;
                margin: 0;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
              }
            </style>
          </head>
          <body>
            <pre>${output.join("\n")}</pre>
          </body>
        </html>
      `);
    }

  } catch (err) {
    console.error("DIFF ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});








app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});











// http://localhost:5001/api/test/expenses?user_id=XXXXX
// http://localhost:5001/api/test/income?user_id=XXXXX
// http://localhost:5001/api/test/prepays?user_id=XXXXX
// http://localhost:5001/api/test/checking?user_id=XXXXX
// http://localhost:5001/api/test/categories?user_id=XXXXX
app.get("/api/test/expenses", async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: "Missing user_id" });

  // print out
  res.json(await getExpensesFromDB(userId));
});

app.get("/api/test/income", async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: "Missing user_id" });

  res.json(await getIncomeFromDB(userId));
});

app.get("/api/test/prepays", async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: "Missing user_id" });

  res.json(await getPrepaysFromDB(userId));
});

app.get("/api/test/checking", async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: "Missing user_id" });

  res.json(await getCheckingHistoryFromDB(userId));
});

app.get("/api/test/categories", async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: "Missing user_id" });

  res.json(await getCategoriesFromDB(userId));
});


app.listen(5001, () => {
  ensureBackupFolder()
  console.log("Server running on port 5001");
});
