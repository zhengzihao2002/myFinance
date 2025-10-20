#!/bin/bash
git update-index --assume-unchanged userData/backup*
git update-index --assume-unchanged userData/data.json
git update-index --assume-unchanged userData/prepay_schedule.json
git update-index --assume-unchanged userData/recentTransactions.json
git update-index --assume-unchanged userData/checkingHistory.txt
git update-index --assume-unchanged node_modules/
git update-index --assume-unchanged dist/
git update-index --assume-unchanged .env
git update-index --assume-unchanged .DS_Store
