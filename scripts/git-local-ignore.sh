#!/bin/bash
git update-index --skip-worktree userData/data.json
git update-index --skip-worktree userData/prepay_schedule.json
git update-index --skip-worktree userData/recentTransactions.json
git update-index --skip-worktree userData/checkingHistory.txt
git update-index --skip-worktree package-lock.json

