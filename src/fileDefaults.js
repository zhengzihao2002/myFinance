// fileDefaults.js or top of App.js
export const fileConfig = {
  "data.json": {
    content: {
      expenses: [],
      income: [],
      totalChecking: 0
    }
  },
  "categories.json": {
    content: {
      Food: "外出吃饭",
      Transport: "公共交通",
      Entertainment: "娱乐项目",
      Utilities: "水电",
      Groceries: "购买食材",
      Gas: "汽油",
      Rent: "房租",
      Other: "其他"
    }
  },
  "settings.json": {
    content: {
      "Sound Effect": "",
      soundEffects: [""],
      animationType: "slide",
      showTransaction: 100,
      language: "Chinese",
      clickEffect: "",
      clickEffectsList: [""]
    }
  },
  "recentTransactions.json": {
    content: {
      Checking: 0.0,
      CheckingRecent100: [],
      "Visa Credit": 0,
      "Master Credit (Apple)": 0,
      "Visa Costco": 0
    }
  },
  "prepay_schedule.json": {
    content: {}  // Empty object
  }
};
