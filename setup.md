
---

## ⚠️ Git Setup Instructions (IMPORTANT)

> To keep certain user-specific files **local only** while still keeping the repo’s canonical copies on GitHub, run these commands **immediately after cloning** this repo.

### ✅ Step 1: Clone the Repo

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

---

### ✅ Step 2: Mark Local-Only Files With `skip-worktree`

Run these commands **once on each machine**:

```bash
git update-index --skip-worktree userData/data.json
git update-index --skip-worktree userData/prepay_schedule.json
git update-index --skip-worktree userData/recentTransactions.json
git update-index --skip-worktree userData/checkingHistory.txt
```

### (Optional) Also skip build outputs & env files

```bash
git update-index --skip-worktree node_modules/
git update-index --skip-worktree dist/
git update-index --skip-worktree .env
git update-index --skip-worktree .DS_Store
```

---

### 📌 What This Actually Does

`skip-worktree` tells Git:

* **Keep the file inside the repository** (GitHub still has its own version)
* **Don’t overwrite my local version when I pull**
* **Don’t upload my local changes when I push**
* **Don’t mark it as modified** even if I edit it locally

Perfect for userData files where each machine should have its own private copy.

---

### 🧼 Undoing the Protection (If You Need to)

If you ever *do* want to push an update for one of these files to GitHub:

```bash
git update-index --no-skip-worktree path/to/file
```

Example:

```bash
git update-index --no-skip-worktree userData/data.json
```

Then you may commit & push normally.

---

### 🕵️ Check Which Files Are Skip-Worktree

```bash
git ls-files -v | grep ^S
```

Any file starting with `S` is being ignored locally.

---
