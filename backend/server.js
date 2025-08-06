const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { exec } = require("child_process");
const { log } = require("console");


const app = express();
app.use(cors());
app.use(express.json());

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
  exec(`afplay "${successAudioPath}"`, (err) => {
    if (err) {
      console.error("Failed to play success audio:", err);
    } else {
      console.log("Success audio played.");
    }
  });
};

// Endpoint to update expenses
app.post("/api/update-expenses", (req, res) => {
  const { expenses, requestId } = req.body;

  if (processedRequests.has(requestId)) {
    console.log(`Request with ID ${requestId} already processed.${processedRequests}`);
    return res.status(200).send("Request already processed.");
  }

  processedRequests.add(requestId); // Mark request as processed

  createBackup((backupError) => {
    if (backupError) return res.status(500).send("Failed to create backup.");

    fs.readFile(dataFilePath, "utf8", (err, data) => {
      if (err) return res.status(500).send("Failed to read file.");

      const jsonData = JSON.parse(data);
      jsonData.expenses = expenses;

      fs.writeFile(dataFilePath, JSON.stringify(jsonData, null, 2), (writeErr) => {
        if (writeErr) return res.status(500).send("Failed to write file.");

        playSuccessAudio();
        console.log("Played at update expense");
        res.status(200).send("Expenses updated successfully.");
      });
    });
  });
});

// Endpoint to update income
app.post("/api/update-income", (req, res) => {
  const { income, requestId } = req.body;

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
});

// Endpoint to update total checking amount
app.post("/api/update-total", (req, res) => {
  const { newTotal, requestId } = req.body;  
  console.log(req.body);
  

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
});

// Endpoint to update CheckingLast100 transactions
app.post("/api/update-checking-last100", (req, res) => {
  console.log("Received request at update-checking-last100");
  console.log("Request body:", req.body); 

  const { newTransaction,requestId } = req.body;

  if (processedRequests.has(requestId)) {
    console.log(`Request with ID ${requestId} already processed.`);
    return res.status(200).send("Request already processed.");
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


});

app.post("/api/add-prepay", (req, res) => {
  const { newPrepay, requestId } = req.body;

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
});


app.post("/api/add-category", (req, res) => {
  const { en, zh } = req.body;
  if (!en || !zh) {
    return res.status(400).send("Missing category name(s).");
  }

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
});

app.post("/api/delete-categories", (req, res) => {
  const { categoriesToDelete } = req.body;
  if (!Array.isArray(categoriesToDelete) || categoriesToDelete.length === 0) {
    return res.status(400).send("No categories specified.");
  }

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
});

// Endpoint to fetch total checking amount
app.get("/api/get-total-checking", (req, res) => {
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
});
// Endpoint to fetch CheckingRecent100
app.get("/api/get-checking-recent100", (req, res) => {
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
app.get("/api/get-data", (req, res) => {
  fs.readFile(dataFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Failed to read data.json:", err);
      return res.status(500).send("Failed to read data file.");
    }

    try {
      const jsonData = JSON.parse(data);
      res.status(200).json(jsonData);
    } catch (parseErr) {
      console.error("Error parsing data.json:", parseErr);
      return res.status(500).send("Invalid JSON format.");
    }
  });
});
app.get("/api/get-categories", (req, res) => {
  fs.readFile(categoriesFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading categories.json:", err);
      return res.status(500).send("Failed to read categories.json");
    }

    try {
      const jsonData = JSON.parse(data);
      res.status(200).json(jsonData);
    } catch (parseErr) {
      console.error("Invalid JSON in categories.json:", parseErr);
      return res.status(500).send("Invalid JSON format.");
    }
  });
});
app.get("/api/get-prepay", (req, res) => {
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
});
app.post("/api/modify-prepay", (req, res) => {
  const { id, category, amount, description, date, frequencyMode, frequencyNumber, frequencyUnit } = req.body;

  fs.readFile(prepayFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading prepay file:", err);
      return res.status(502).send("读取失败");
    }

    let json = [];
    try {
      json = JSON.parse(data);
    } catch (parseErr) {
      return res.status(501).send("JSON格式错误");
    }

    const index = json.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).send("未找到预付款");
    }

    json[index] = {
      id,
      category,
      amount,
      description,
      date,
      frequencyMode,
      frequencyNumber,
      frequencyUnit
    };

    fs.writeFile(prepayFilePath, JSON.stringify(json, null, 2), (writeErr) => {
      if (writeErr) {
        return res.status(500).send("保存失败");
      }
      res.status(200).send("修改成功");
    });
  });
});
app.post("/api/delete-prepay", (req, res) => {
  const { id } = req.body;
  

  fs.readFile(prepayFilePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading prepay file:", err);
      return res.status(500).send("读取失败");
    }

    let json;
    try {
      json = JSON.parse(data); // should be an array, NOT object with scheduledPrepays key
    } catch (parseErr) {
      console.error("Error parsing prepay file:", parseErr);
      return res.status(500).send("JSON格式错误");
    }

    // Ensure it's an array
    if (!Array.isArray(json)) {
      return res.status(500).send("数据结构错误");
    }

    const updated = json.filter(p => p.id !== id);

    if (updated.length === json.length) {
      return res.status(404).send("未找到该预付款");
    }

    fs.writeFile(prepayFilePath, JSON.stringify(updated, null, 2), (writeErr) => {
      if (writeErr) {
        console.error("Error writing prepay file:", writeErr);
        return res.status(500).send("保存失败");
      }

      res.status(200).send("删除成功");
    });
  });
});
app.post("/api/update-prepay-date", (req, res) => {
  const { id, newDate } = req.body;

  fs.readFile(prepayFilePath, "utf8", (err, data) => {
    if (err) return res.status(500).send("读取失败");

    let json;
    try {
      json = JSON.parse(data);
    } catch {
      return res.status(500).send("JSON格式错误");
    }

    if (!Array.isArray(json)) {
      return res.status(500).send("预付款数据格式应为数组");
    }

    const index = json.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).send("未找到预付款");

    json[index].date = newDate;

    fs.writeFile(prepayFilePath, JSON.stringify(json, null, 2), (err) => {
      if (err) return res.status(500).send("保存失败");
      res.status(200).send("更新成功");
    });
  });
});






app.listen(5001, () => {
  ensureBackupFolder()
  console.log("Server running on port 5001");
});
