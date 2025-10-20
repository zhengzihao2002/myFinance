## ⚠️ Git Setup Instructions (IMPORTANT)

> To protect local user data and prevent sensitive files from being accidentally pushed or deleted from GitHub, follow these steps **immediately after cloning** this repo.

### ✅ Step 1: Clone the Repo

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

---

### ✅ Step 2: Tell Git to Ignore Local Changes to Certain Files

Run the following commands **once** on your machine.
These will prevent Git from uploading or overwriting sensitive or user-specific files:

```bash
git update-index --assume-unchanged userData/backup*
git update-index --assume-unchanged userData/data.json
git update-index --assume-unchanged userData/prepay_schedule.json
git update-index --assume-unchanged userData/recentTransactions.json
git update-index --assume-unchanged userData/checkingHistory.txt
git update-index --assume-unchanged node_modules/
git update-index --assume-unchanged dist/
git update-index --assume-unchanged .env
git update-index --assume-unchanged .DS_Store
```

---

### 📌 Why This Matters

These files:

* Contain **personal or machine-specific data**
* Should **stay on GitHub**, but **should not be changed or deleted** by accident
* Will still exist when you clone the project, but your local changes to them will be **ignored by Git**

---

### 🧼 Reminder

If you **ever need to push changes to these files intentionally**, you must undo the protection with:

```bash
git update-index --no-assume-unchanged path/to/file
```

Example:

```bash
git update-index --no-assume-unchanged userData/data.json
```


