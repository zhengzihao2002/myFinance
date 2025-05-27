import React, { useState ,useEffect,createContext,useContext,useRef} from "react"; // Import useState
import { Chart } from "react-google-charts";
import { v4 as uuidv4 } from "uuid"; // Import UUID library
import { BrowserRouter as Router, Route, Routes, Link, useNavigate } from "react-router-dom";
import "./App.css";
import "./font.css"


// List of categories
let categories = [];
let categoriesTranslation = {};



// This function will load categories data from the JSON file
const loadCategoriesData = async () => {
  try {
    const response = await fetch('/categories.json');
    const data = await response.json();

    // Ensure the data is valid and not empty
    if (!data || Object.keys(data).length === 0) {
      console.warn('Categories data is empty. Using default category "Other".');
      categories = ['Other'];
      categoriesTranslation = { Other: '其他' };
    } else {
      categories = Object.keys(data);
      categoriesTranslation = data;
    }

    console.log('Loaded Categories:', categories);
    console.log('Loaded Categories Translations:', categoriesTranslation);
  } catch (error) {
    console.error('Error loading categories data:', error);
    // Handle fetch failure by setting default category
    categories = ['Other'];
    categoriesTranslation = { Other: 'Other' };
  }
};


const timePeriods = ["按月显示", "按季显示", "按年显示", "前3个月"];
const months = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
const quarters = ["Q1", "Q2", "Q3", "Q4"];
const years = ["2023", "2024"];
const displayTypes = ["Category Sum", "List all Category Expenses", "List all Expenses by Date"];


function createId(dateStr) {
  // Parse the date string into a Date object
  const date = new Date(dateStr);
  
  // Get current time in hhmmssSSS format (milliseconds added)
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0'); // Ensures 3 digits for ms
  
  // Format the date as YYYYMMDD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const day = String(date.getDate()).padStart(2, '0');
  
  // Combine everything to form the id
  const id = `${year}${month}${day}_${hours}${minutes}${seconds}${milliseconds}`;
  
  return id;
}











const HomePage = () => {
  const { data } = useContext(DataContext); // Access global expense data from context
  const [isModalOpenCategory, setIsModalOpenCategory] = useState(false);
  const [modalContentCategory, setModalContentCategory] = useState("");
  const [isModalOpenOther, setIsModalOpenOther] = useState(false);
  const [modalContentOther, setModalContentOther] = useState("");
  const [isModalOpenMiscellaneous, setIsModalOpenMiscellaneous] = useState(false);
  const [modalContentMiscellaneous, setModalContentMiscellaneous] = useState("");

  const openModalCategory = (content) => {
    setModalContentCategory(content);
    setIsModalOpenCategory(true);
  };

  const closeModalCategory = () => {
    setIsModalOpenCategory(false);
    setModalContentCategory("");
  };

  const openModalOther = (content) => {
    setModalContentOther(content);
    setIsModalOpenOther(true);
  };

  const closeModalOther = () => {
    setIsModalOpenOther(false);
    setModalContentOther("");
  };

  const openModalMiscellaneous = (content) => {
    setModalContentMiscellaneous(content);
    setIsModalOpenMiscellaneous(true);
  };

  const closeModalMiscellaneous = () => {
    setIsModalOpenMiscellaneous(false);
    setModalContentMiscellaneous("");
  };

  // Initialize states with localStorage values or defaults （Bottom）
  const [timeRange, setTimeRange] = useState(
    localStorage.getItem("timeRange") || "全部显示"
  );
  const [subOption, setSubOption] = useState(
    localStorage.getItem("subOption") || ""
  );

  // Initialize states with localStorage values or defaults (Top left)
  const [timeRangeTopLeft, setTimeRangeTopLeft] = useState(
    localStorage.getItem("timeRangeTopLeft") || "按月显示"
  );
  const [subOptionTopLeft, setSubOptionTopLeft] = useState(
    localStorage.getItem("subOptionTopLeft") || ""
  );

  // State for the filters
  const [filteredExpenses, setFilteredExpenses] = useState(data.expenses);
  const [chartData, setChartData] = useState([["Expenses", "Dollars"]]);
  const [chartTitle, setChartTitle] = useState("支出概览 - 全部显示");
  const currentYear = new Date().getFullYear(); // Get the current year

  const options = {
    //title: chartTitle,
    //pieHole: 0.4, // Creates a Donut Chart. Does not do anything when is3D is enabled
    is3D: true, // Enables 3D view
    // pieStartAngle: 100, // Rotates the chart
    sliceVisibilityThreshold: 0.02, // Hides slices smaller than 0.1% (0.001)
    
    legend: {
      position: "right",
      alignment: "bottom",
      textStyle: {
        color: "#233238",
        fontSize: 14,
      },
    },
    // colors: [
    //   "#FF5733", // Red
    //   "#33FF57", // Green
    //   "#3357FF", // Blue
    //   "#FF33A1", // Pink
    //   "#FF8C00", // Orange
    //   "#9B30FF", // Purple
    //   "#00CED1", // Turquoise
    //   "#FFD700", // Yellow
    //   "#8B4513", // Brown
    //   "#ADFF2F", // Green-Yellow
    //   "#FF1493", // Deep Pink
    //   "#00BFFF", // Deep Sky Blue
    // ],
    backgroundColor: 'transparent', // Set the background color here
  };

  // Available years for "按年显示"
  const availableYears = [...new Set(data.expenses.map((exp) => exp.date.substring(0,4)))].sort();

  // Save selected options of bottom box to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("timeRange", timeRange);
    localStorage.setItem("subOption", subOption);
  }, [timeRange, subOption]);

  // Save selected options of top left box to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("timeRangeTopLeft", timeRangeTopLeft);
    localStorage.setItem("subOptionTopLeft", subOptionTopLeft);
  }, [timeRangeTopLeft, subOptionTopLeft]);

  // Helper function to filter expenses based on time range and sub-option
  const filterExpenses = () => {
    
    let filtered = [];
  
    if (["按月显示", "按季度显示", "按年显示"].includes(timeRange) && !subOption) {
      // If subOption is required but not selected, show no data
      setFilteredExpenses([]);
      setChartData([["Expenses", "Dollars"]]); // Reset chart data
      setChartTitle(`支出概览 - ${timeRange} (无数据)`); // Update title with no data
      return;
    }
  
    filtered = data.expenses;
  
    if (timeRange == "按月显示" && subOption) {
      filtered = filtered.filter(
        (exp) =>{
          return exp.date.substring(0,4) == currentYear &&
          new Date(exp.date).toLocaleString("default", { month: "long" }) == subOption
        }
      );
    } else if (timeRange == "按季度显示" && subOption) {
      const quarterMonths = {
        Q1: [0, 1, 2],
        Q2: [3, 4, 5],
        Q3: [6, 7, 8],
        Q4: [9, 10, 11],
      };
      const selectedQuarter = quarterMonths[subOption];
      filtered = filtered.filter(
        (exp) =>
          // before: new Date(exp.date).getFullYear(), after:exp.date.substring(0,4)
          exp.date.substring(0,4) == currentYear &&
          selectedQuarter.includes(new Date(exp.date).getMonth())
      );
    } else if (timeRange == "按年显示" && subOption) {
      filtered = filtered.filter(
        (exp) => exp.date.substring(0,4).toString() == subOption
      );
    } else if (timeRange == "前3个月") {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      filtered = filtered.filter((exp) => new Date(exp.date) >= threeMonthsAgo);
    } else if (timeRange == "前6个月") {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      filtered = filtered.filter((exp) => new Date(exp.date) >= sixMonthsAgo);
    }
  
    setFilteredExpenses(filtered);
  
    // Calculate and log category sums using integer arithmetic (cents)
    const categorySumsCents = filtered.reduce((acc, expense) => {
      const { category, amount } = expense;
      const numericAmount = Math.round(parseFloat(amount) * 100); // Convert to cents
      if (!isNaN(numericAmount)) {
        acc[category] = (acc[category] || 0) + numericAmount;
      }
      return acc;
    }, {});
  
    // Convert back to dollars for chart data
    const chartDataPrepared = [["Expenses", "Dollars"]];
    for (const [category, sumCents] of Object.entries(categorySumsCents)) {
      chartDataPrepared.push([categoriesTranslation[category] || category, sumCents / 100]);
    }
  
    setChartData(chartDataPrepared);
  
    // Log the category totals formatted to two decimal places
    const formattedCategoryTotals = {};
    for (const [category, sumCents] of Object.entries(categorySumsCents)) {
      formattedCategoryTotals[category] = (sumCents / 100).toFixed(2);
    }
    console.log("Filtered Category Totals:", formattedCategoryTotals);
  
    // Set chart title
    const newTitle = subOption
      ? `支出概览 - ${timeRange} ${subOption}`
      : `支出概览 - ${timeRange}`;
    setChartTitle(newTitle);
    console.log(newTitle);
    
  };
  

  useEffect(() => {
    //When you define functions inside JSX or as part of the render logic, like in the code you provided, you do not need useEffect to make them run. if a function does not directly return JSX and you want it to run only when certain state or props change, then you should use useEffect for handling side effects
    filterExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, timeRange, subOption]); // All dependencies in a single useEffect

  const isDateInRange = (dateString, timeRange, subOption) => {
    // Get current date components
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based index
    const currentDay = now.getDate();
  
    // Parse the income date from the format YYYY-MM-DD
    const [incomeYear,incomeMonth, incomeDay] = dateString.split('-').map(Number);
    const incomeDateMonth = incomeMonth - 1; // Adjust for 0-based month index (1-12 -> 0-11)
  
    if (timeRange === "按月显示") {
      const monthMapping = {
        一月: 0,
        二月: 1,
        三月: 2,
        四月: 3,
        五月: 4,
        六月: 5,
        七月: 6,
        八月: 7,
        九月: 8,
        十月: 9,
        十一月: 10,
        十二月: 11,
      };

      return incomeYear === currentYear && incomeDateMonth === monthMapping[subOption];
    } else if (timeRange === "按季度显示") {
      const quarterMapping = {
        Q1: [0, 1, 2],
        Q2: [3, 4, 5],
        Q3: [6, 7, 8],
        Q4: [9, 10, 11],
      };
      return incomeYear === currentYear && quarterMapping[subOption]?.includes(incomeDateMonth);
    } else if (timeRange === "按年显示") {
      return incomeYear === Number(subOption);
    } else if (["前3个月", "前6个月", "前12个月"].includes(timeRange)) {
      const monthsToSubtract =
        timeRange === "前3个月"
          ? 3
          : timeRange === "前6个月"
          ? 6
          : 12;
      const startDate = new Date();
      startDate.setMonth(currentMonth - monthsToSubtract);
  
      // Convert startDate to MM-DD-yyyy for comparison
      const startDateYear = startDate.getFullYear();
      const startDateMonth = startDate.getMonth();
      const startDateDay = startDate.getDate();
  
      return (
        (incomeYear > startDateYear || (incomeYear === startDateYear && incomeDateMonth >= startDateMonth) || (incomeYear === startDateYear && incomeDateMonth === startDateMonth && incomeDay >= startDateDay)) &&
        (incomeYear < currentYear || (incomeYear === currentYear && incomeDateMonth <= currentMonth) || (incomeYear === currentYear && incomeDateMonth === currentMonth && incomeDay <= currentDay))
      );
    }
  
    return true; // Default: include all if no specific range applies
  };
  
  const handleAutoSelectTopLeft = (range) => {
    if (range === "按月显示") {
      const currentMonth = new Date().toLocaleString("default", { month: "long" });
      setSubOptionTopLeft(currentMonth);
    } else if (range === "按季度显示") {
      const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
      setSubOptionTopLeft(currentQuarter);
    } else if (range === "按年显示") {
      const currentYear = new Date().getFullYear().toString();
      setSubOptionTopLeft(currentYear);
    }
  };
  const handleAutoSelectBottom = (range) => {
    if (range === "按月显示") {
      const currentMonth = new Date().toLocaleString("default", { month: "long" });
      setSubOption(currentMonth);
    } else if (range === "按季度显示") {
      const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
      setSubOption(currentQuarter);
    } else if (range === "按年显示") {
      const currentYear = new Date().getFullYear().toString();
      setSubOption(currentYear);
    }
  };


  const [isFlipped, setIsFlipped] = useState(false);
  const [totalChecking, setTotalChecking] = useState(null);
  const [last100Transactions,setLast100Transactions] = useState([])
  const [isReadyToFlip, setIsReadyToFlip] = useState(false); // To track if flip transition should be enabled


  // Fetch the total amount from recentTransactions.json
  useEffect(() => {
    const fetchTotalChecking = async () => {
      try {
        const response = await fetch("/recentTransactions.json");
        const data = await response.json();
        setTotalChecking(data.Checking || 0);
      } catch (error) {
        console.error("Error fetching recentTransactions.json:", error);
      }
    };
    fetchTotalChecking();
  }, []);

  // Fetch the total amount from recentTransactions.json
  useEffect(() => {
    const fetchRecentTransactions = async () => {
      try {
        const response = await fetch("/recentTransactions.json");
        const data = await response.json();
        setLast100Transactions(data.CheckingRecent100||[])
      } catch (error) {
        console.error("Error fetching recentTransactions.json:", error);
      }
    };
    fetchRecentTransactions();
  }, []);

  // Load flip status from localStorage on page load
  useEffect(() => {
    const savedFlipStatus = localStorage.getItem("isFlipped");
    
    if (savedFlipStatus !== null) {
      setTimeout(() => {
        setIsFlipped(JSON.parse(savedFlipStatus)); // Delay flip state application
      }, 1); // Small delay prevents instant flip before transition is active
    }
  
    // Enable transition after state has been set
    const timer = setTimeout(() => {
      setIsReadyToFlip(true); 
    }, 100); // Ensures no transition at startup
  
    return () => clearTimeout(timer);
  }, []);
  // Flip the box on click
  // const handleBoxClick = (e) => {
  //   if (e.target.tagName !== "BUTTON" && e.target.tagName !== "H2") {
  //     const newFlipStatus = !isFlipped;
  //     setIsFlipped(newFlipStatus);  // Update flip status
  //     localStorage.setItem("isFlipped", JSON.stringify(newFlipStatus)); // Save to localStorage
  //     setIsFlipped(!isFlipped);
  //   }
  // };

  const [adjustType, setAdjustType] = useState("add"); // 'add' or 'subtract'
  const [adjustAmount, setAdjustAmount] = useState("");

  const handleAdjustAmount = async () => {
    if (!adjustAmount || isNaN(adjustAmount)) {
      alert(`请输入有效的金额！您输入了: ${adjustAmount}`);
      return;
    }
  
    const adjustment = adjustType === "add" ? parseFloat(adjustAmount) : -parseFloat(adjustAmount);
    const newTotal = totalChecking + adjustment;
  
    // Create a new transaction entry for the last100 transactions
    const newTransaction = [
      new Date().toISOString().slice(0, 10),  // Current date in YYYY-MM-DD format
      "Manual",  // Category
      adjustment,  // The amount
      newTotal.toFixed(2),  // The updated balance
      createId(new Date().toISOString())
    ];
  
    try {
      const requestId = uuidv4(); // Generate a unique request ID
  
      // Send update request to update total checking
      const response = await fetch("http://localhost:5001/api/update-total", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newTotal, requestId }),
      });
  
      if (response.ok) {
        // Send another request to update CheckingRecent100
        const requestId = uuidv4(); // Generate a unique request ID
        const last100Response = await fetch("http://localhost:5001/api/update-checking-last100", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ newTransaction }),
        });
  
        if (last100Response.ok) {
          alert("金额和交易记录更新成功");
          setTotalChecking(newTotal);
          setAdjustAmount(""); // Reset the input
        } else {
          alert("更新交易记录失败，请稍后再试");
        }
      } else {
        alert("更新失败，请稍后再试");
      }
    } catch (error) {
      console.error("Error updating total:", error);
      alert("更新失败，请检查您的网络连接。后台已崩溃");
    }
  };
  
  const handleRadioChange = (e) => {
    setAdjustType(e.target.value); // Update the adjustment type state
  };

  const handleInputChange = (e) => {
    setAdjustAmount(e.target.value); // Update the adjustment amount state
  };

  const [adjustAmount2, setAdjustAmount2] = useState("");
  const handleInputChange2 = (e) => {
    setAdjustAmount2(e.target.value); // Update the adjustment amount state
  };
  const handleAdjustAmount2 = async () => {
    if (!adjustAmount2 || isNaN(adjustAmount2)) {
      alert(`请输入有效的金额！您输入了: ${adjustAmount2}`);
      return;
    }
  

    const newTotal = parseFloat(adjustAmount2);
  
    // Create a new transaction entry for the last100 transactions
    const newTransaction = [
      new Date().toISOString().slice(0, 10),  // Current date in YYYY-MM-DD format
      "Manual",  // Category
      parseFloat(newTotal.toFixed(2))-totalChecking,  // The amount
      newTotal.toFixed(2),  // The updated balance
      createId(new Date().toISOString())
    ];
  
    try {
      const requestId = uuidv4(); // Generate a unique request ID
  
      // Send update request to update total checking
      const response = await fetch("http://localhost:5001/api/update-total", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newTotal, requestId }),
      });
  
      if (response.ok) {
        // Send another request to update CheckingRecent100
        const requestId = uuidv4(); // Generate a unique request ID
        const last100Response = await fetch("http://localhost:5001/api/update-checking-last100", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ newTransaction }),
        });
  
        if (last100Response.ok) {
          alert("金额和交易记录更新成功");
          setTotalChecking(newTotal);
          setAdjustAmount(""); // Reset the input
        } else {
          alert("更新交易记录失败，请稍后再试");
        }
      } else {
        alert("更新失败，请稍后再试");
      }
    } catch (error) {
      console.error("Error updating total:", error);
      alert("更新失败，请检查您的网络连接。后台已崩溃");
    }
  };


  
  // Helper function to get total amounts for a given month
  // const getMonthlyTotal = (records, month) => {
  //   if (!records || !Array.isArray(records)) return 0;
    
  //   return records
  //     .filter((record) => record.date.substring(5,7) === month)
  //     .reduce((total, record) => total + (record.amount || 0), 0);
  // };
  function getMonthlyTotal(records, month) {  
    
    
    if (!records || !Array.isArray(records)) {  
        return 0;  
    }  

    var filteredRecords = records.filter(function(record) {          
        return Number(record.date.substring(5, 7)) === month;  
    });  
    

    var total = filteredRecords.reduce(function(acc, record) {        
        return acc + (Number(record.amount) || Number(record.after_tax)||0);  
    }, 0);  
    
    return total;  
}


  // Get current date (+1 cuz not index but actual month no)
  const now = new Date();
  const lastMonth = (now.getMonth() - 1 < 0 ? 11 : now.getMonth() - 1)+1;
  const monthBeforeLast = (lastMonth - 1 <= 0 ? 12 : lastMonth - 1);
  
  
  

  // Calculate total expenses and income
  const lastMonthExpenses = Number(getMonthlyTotal(data.expenses, lastMonth)) || 0;
  const prevMonthExpenses = Number(getMonthlyTotal(data.expenses, monthBeforeLast)) || 0;
  const lastMonthIncome = Number(getMonthlyTotal(data.income, lastMonth)) || 0;
  const prevMonthIncome = Number(getMonthlyTotal(data.income, monthBeforeLast)) || 0;

  

  // Function to calculate percentage change
  const getChangeIndicator = (current, previous, isExpense = true) => {
    if (previous === 0) return <span style={{ color: "gray" }}> N/A </span>;
    const change = ((current - previous) / previous) * 100;
    const isIncrease = change > 0;
    const color = isExpense
      ? isIncrease
        ? "red"
        : "green"
      : isIncrease
      ? "green"
      : "red";
    const arrow = isIncrease ? "↑" : "↓";

    return (
      <span style={{ color, fontWeight: "bold" }}>
        {arrow} {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  // Calculate changes
  const expenseChange = getChangeIndicator(lastMonthExpenses, prevMonthExpenses, true);
  const incomeChange = getChangeIndicator(lastMonthIncome, prevMonthIncome, false);

  // Finding the highest increasing category
  let highestCategory = "无";
  let highestIncrease = 0;
  let highestCategoryChange = null;

  // Finding the highest decreasing category
  let lowestCategory = "无";
  let highestDecrease = 0;
  let lowestCategoryChange = null;

  function categoryTotals(records, month) {  
      var totals = {};  

      for (var i = 0; i < records.length; i++) {  
          var record = records[i];  
          var recordMonth = Number(record.date.substring(5,7));

          if (recordMonth === month) {  
              if (!totals[record.category]) {  
                  totals[record.category] = 0;  
              }  
              totals[record.category] += Number(record.amount);  
          }  
      }  
      
      return totals;  
  }

  // Get category totals for last month and the month before
  var lastMonthCategories = categoryTotals(data.expenses, lastMonth);  
  var prevMonthCategories = categoryTotals(data.expenses, monthBeforeLast);  

  // Filter out categories that don't exceed 100 in both months
  var filteredCategories = Object.keys(lastMonthCategories).filter(function(category) {  
      return lastMonthCategories[category] > 100 && (prevMonthCategories[category] || 0) > 100;  
  });  
  let all = {}

  // Process only the filtered categories
  for (var i = 0; i < filteredCategories.length; i++) {  
      var category = filteredCategories[i];  
      var lastMonthAmount = lastMonthCategories[category] || 0;  
      var prevMonthAmount = prevMonthCategories[category] || 0;  

      if (prevMonthAmount > 0) {  
          var percentChange = ((lastMonthAmount - prevMonthAmount) / prevMonthAmount) * 100;  

          all[category] = parseFloat(percentChange.toFixed(2));
          
          // Check for the highest increase
          if (percentChange > highestIncrease) {  
              highestIncrease = percentChange;  
              highestCategory = category;  
              highestCategoryChange = getChangeIndicator(lastMonthAmount, prevMonthAmount, true);  
          }

          // Check for the highest decrease (most negative percent change)
          if (percentChange < highestDecrease) {  
              highestDecrease = percentChange;  
              lowestCategory = category;                
              lowestCategoryChange = getChangeIndicator(lastMonthAmount, prevMonthAmount, true);  
          }
      }  
  }
  console.log("all categories: ",all);
  


  function TransactionDetails({ transaction }) {
    if (!transaction) {
      return <p style={{ textAlign: "center", fontSize: "18px", color: "gray" }}>未找到交易</p>;
    }
  
    return (
      <div className="transaction-details" style={{
        // padding: "20px",
        // borderRadius: "10px",
        // backgroundColor: "#f9f9f9",
        // boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)"
      }}>
        {/* <h3 style={{ textAlign: "center", marginBottom: "15px" }}>
          {transaction.type === "Expense" ? "支出详情" : "收入详情"}
        </h3> */}
        
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {Object.entries(transaction).map(([key, value]) => {
          if (key === "type") return null; // Skip type field

          let formattedValue = value;

          // Format tax percentage to 2 decimal places
          if (key === "tax_percentage" && !isNaN(parseFloat(value))) {
            formattedValue = `${parseFloat(value).toFixed(2)}%`;
          }

          // Add dollar sign to any amount values
          if (["amount", "before_tax", "after_tax", "余额"].some(field => key.includes(field)) && !isNaN(parseFloat(value))) {
            formattedValue = `$${parseFloat(value).toFixed(2)}`;
          }

          return (
            <div 
              key={key} 
              style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                padding: "5px 10px", 
                borderBottom: "1px solid lightgray", 
                wordBreak: "break-word", // Ensure long words wrap
                whiteSpace: "pre-wrap"  // Preserve newlines + auto-wrap long text
              }}
            >
              <span style={{ fontWeight: "bold", color: "#555" }}>{formatKey(key)}</span>
              <span style={{ color: "#222", maxWidth: "60%" }}>{formattedValue}</span>
            </div>
          );
        })}
      </div>
      </div>
    );
  }
  
  // Helper function to format keys into readable text
  function formatKey(key) {
    const mapping = {
      category: "类别",
      amount: "金额",
      description: "描述",
      date: "日期",
      id: "交易编号",
      before_tax: "税前收入",
      after_tax: "税后收入",
      tax_percentage: "税率"
    };
    return mapping[key] || key;
  }

  function findTransactionById(data, id) {
    // Search in expenses
    const expense = data.expenses.find(transaction => transaction.id === id);
    if (expense) {
        return { type: "Expense", ...expense };
    }

    // Search in income
    const income = data.income.find(transaction => transaction.id === id);
    if (income) {
        return { type: "Income", ...income };
    }

    // If not found
    return null;
  }


  const [animationType, setAnimationType] = useState(""); // Flip,Slide,Drag
  // get the animation type from settings file
  useEffect(() => {
    fetch("/settings.json")
      .then((response) => response.json())
      .then((data) => {
        setAnimationType(data.animationType || "flip"); // Default to slide if no value found
      })
      .catch((error) => console.error("Failed to load settings:", error));
  }, []);
  // const [dragStartY, setDragStartY] = useState(null);
  // //let [dragDistance, setDragDistance] = useState(0);
  // const dragDistance = useRef(0);
  // const panelRef = useRef(null);
  // const [currentPanel, setCurrentPanel] = useState("front"); // Track whether we're showing the front or back panel



  const handleBoxClick = (e) => {
    if (e.target.tagName !== "BUTTON" && e.target.tagName !== "H2") {
      const newFlipStatus = !isFlipped;
      setIsFlipped(newFlipStatus);  // Update flip status
      localStorage.setItem("isFlipped", JSON.stringify(newFlipStatus)); // Save to localStorage
    }
  };

  // Drag Handlers (Only for drag Mode)
  // const handleMouseDown = (e) => {
  //   // Click motion downwards  
  //   if (animationType !== "drag") return; // Only allow dragging in drag mode
  //   setDragStartY(e.clientY);
  //   dragDistance.current = 0;
  // };

  // const handleMouseMove = (e) => {
  //   if (dragStartY !== null) {
  //     let distance = e.clientY - dragStartY; // Calculate vertical drag
  //     console.log(distance);
      
  //     dragDistance.current = distance;
  //     panelRef.current.style.transform = `translateY(${distance}px)`; // Move panel in real time
  //   }
  // };

  // const handleMouseUp = () => {
  //   if (animationType === "drag") {
  //     console.log(`Dragged ${dragDistance.current}px vertically`);
  
  //     if (Math.abs(dragDistance.current) > 250) {
  //       if (panelRef.current) {
  //         panelRef.current.style.transition = "transform 0.8s ease-out";
  
  //         if (dragDistance.current < 0) {
  //           // 🔹 Dragged UP → Move to bottom panel
  //           panelRef.current.style.transform = `translateY(-100%)`; 
            
  //           setTimeout(() => {
  //             //setIsFlipped(true); // 🔥 Switch panel state only after transition
  //             // panelRef.current.style.transition = ""; // Remove transition
  //             // panelRef.current.style.transform = "translateY(0)"; // Reset for next transition
  //           }, 801);
  //         } else {
  //           // 🔹 Dragged DOWN → Move to top panel
  //           panelRef.current.style.transform = `translateY(100%)`;
  
  //           setTimeout(() => {
  //             setIsFlipped(false);
  //             panelRef.current.style.transition = "";
  //             panelRef.current.style.transform = "translateY(0)";
  //           }, 800);
  //         }
  //       }
  //     } else {
  //       // 🔹 If drag was too small, smoothly return to original position
  //       if (panelRef.current) {
  //         console.log("Revert to original");
          
  //         panelRef.current.style.transition = "transform 0.8s ease-out";
  //         panelRef.current.style.transform = "translateY(0)";
  //       }
  //     }
  
  //     dragDistance.current = 0;
  //   }
  
  //   setDragStartY(null);
  // };
  
  
  
  
  
  

  // Attach event listeners for dragging
  // useEffect(() => {
  //   if (animationType === "drag") {
  //     window.addEventListener("mousedown", handleMouseDown);
  //     window.addEventListener("mousemove", handleMouseMove);
  //     window.addEventListener("mouseup", handleMouseUp);
  //   }
  //   return () => {
  //     window.removeEventListener("mousedown", handleMouseDown);
  //     window.removeEventListener("mousemove", handleMouseMove);
  //     window.removeEventListener("mouseup", handleMouseUp);
  //   };
  // }, [animationType, dragStartY]);










  

  return (
    <div className="homepage-container">
      <div className="homepage-left">
        <div className="top-boxes">
          {/* Filter Option + Sub Option combo boxes , and total income + expense of that , and a 净利润 of that */}
          <div className="left-box"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "20px",
              borderRadius: "10px",
              width: "400px", // Adjust width as needed
            }}
          >
            {/* Title */}
            <div
              style={{
                fontWeight: "bold",
                fontSize: "24px",
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              净利润
            </div>

            {/* Content */}
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              {/* Left Side: Combo Boxes */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "15px", // Adds vertical space between items
                  width: "45%", // Allocates space for both sections
                }}
              >
                {/* 时间段 Combo Box */}
                <label style={{ width: "100%" }}>
                  时间段:
                  <select
                    value={timeRangeTopLeft}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setTimeRangeTopLeft(newValue);
                      setSubOptionTopLeft(""); // Reset sub-option when time range changes
                      handleAutoSelectTopLeft(newValue); // Automatically select the current option
                    }}
                    style={{
                      width: "100%",
                      marginTop: "5px",
                      padding: "5px",
                    }}
                  >
                    <option value="按月显示">按月显示</option>
                    <option value="按季度显示">按季度显示</option>
                    <option value="按年显示">按年显示</option>
                    <option value="前3个月">前3个月</option>
                    <option value="前6个月">前6个月</option>
                    <option value="前12个月">前12个月</option>
                  </select>
                </label>

                {/* 子选项 Combo Box */}
                <label style={{ width: "100%" }}>
                  子选项:
                  <select
                    value={subOptionTopLeft}
                    onChange={(e) => setSubOptionTopLeft(e.target.value)}
                    disabled={["前3个月", "前6个月", "前12个月"].includes(timeRangeTopLeft)}
                    style={{
                      width: "100%",
                      marginTop: "5px",
                      padding: "5px",
                    }}
                  >
                    <option value="">请选择</option>
                    {timeRangeTopLeft === "按月显示" &&
                      [...Array(12).keys()].map((month) => {
                        const monthName = new Date(0, month).toLocaleString("default", { month: "long" });
                        return (
                          <option key={month} value={monthName}>
                            {monthName}
                          </option>
                        );
                      })}
                    {timeRangeTopLeft === "按季度显示" &&
                      ["Q1", "Q2", "Q3", "Q4"].map((quarter) => (
                        <option key={quarter} value={quarter}>
                          {quarter}
                        </option>
                      ))}
                    {timeRangeTopLeft === "按年显示" &&
                      availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              {/* Right Side: Income, Expense, and Profit Summary */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start", // Ensures items are aligned to the left horizontally
                  justifyContent: "center", // Centers content vertically within the container
                  gap: "15px", // Adds vertical spacing between items
                  fontSize: "16px",
                  width: "45%", // Allocates space for this section
                  height: "100%", // Ensures it stretches to fill parent container's height
                }}
              >
                {(() => {
                  // Whenever timeRangeTopLeft/subOptionTopLeft state changes, this function gets called!
                  const calculatePeriod = () => {
                    if (["按月显示", "按季度显示", "按年显示"].includes(timeRangeTopLeft)) {
                      return subOptionTopLeft || "未选择";
                    }
                    return timeRangeTopLeft;
                  };

                  const period = calculatePeriod();

                  // Filter and calculate income
                  const filteredIncome = data.income.filter((income) =>
                    isDateInRange(income.date, timeRangeTopLeft, subOptionTopLeft)
                  );
                  const totalIncome = filteredIncome.reduce(
                    (sum, income) => sum + parseFloat(income.after_tax),
                    0
                  );

                  // Filter and calculate expenses
                  const filteredExpenses = data.expenses.filter((expense) =>
                    isDateInRange(expense.date, timeRangeTopLeft, subOptionTopLeft)
                  );
                  
                  
                  const totalExpenses = filteredExpenses.reduce(
                    (sum, expense) => sum + parseFloat(expense.amount),
                    0
                  );

                  const netProfit = totalIncome - totalExpenses;

                  return (
                    <>
                      <div>
                        <span style={{ fontWeight: "bold", fontSize: "18px" }}>{period} 总收入: </span>
                        <span style={{ color: "green", fontSize: "20px" }}>
                          ${totalIncome.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontWeight: "bold", fontSize: "18px" }}>{period} 总支出: </span>
                        <span style={{ color: "red", fontSize: "20px" }}>
                          ${totalExpenses.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontWeight: "bold", fontSize: "18px" }}>{period} 净利润: </span>
                        <span
                          style={{
                            color: netProfit > 0 ? "green" : "red",
                            fontSize: "20px",
                          }}
                        >
                          {netProfit.toFixed(2)<0?"-$"+Math.abs(netProfit.toFixed(2)):"$"+netProfit.toFixed(2)}
                          
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

            </div>
          </div>

          <div
            className="right-box"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "20px",
              borderRadius: "10px",
              width: "400px",
            }}
          >
            {/* Title */}
            <div
              style={{
                fontWeight: "bold",
                fontSize: "24px",
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              上个月概览
            </div>

            {/* Content */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
              {/* Expenses */}
              <div style={{ fontSize: "18px", marginBottom: "10px" }}>
                <strong>支出:</strong> ${lastMonthExpenses.toFixed(2)} {expenseChange}
              </div>

              {/* Income */}
              <div style={{ fontSize: "18px", marginBottom: "10px" }}>
                <strong>收入:</strong> ${lastMonthIncome.toFixed(2)} {incomeChange}
              </div>

              {/* Highest Category Increase */}
              <div style={{ fontSize: "18px", marginBottom: "10px" }}>
                <strong>最大支出增长类别:</strong> {categoriesTranslation[highestCategory]} {highestCategoryChange}
              </div>

              {/* Highest Category Decrease */}
              <div style={{ fontSize: "18px", marginBottom: "10px" }}>
                <strong>最大支出下降类别:</strong> {lowestCategory!="无"?categoriesTranslation[lowestCategory]:"暂无（消费超过100刀的）最大下降类别"} {lowestCategoryChange}
              </div>
            </div>
          </div>

          {/* <div className="right-box">Compare last month to the month before that of income and expense,of each up or down by how many percent and showing the total in dollars. OR which category has gone up highest in percent, if not all has gone down</div> */}
        </div>
        <div className="bottom-box" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Title Section */}
          <div
            className="title-section"
            style={{
              flex: "0 0 15%", // Takes 15% of height
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "24px",
              fontWeight: "bold",
              marginBottom: "10px",
            }}
          >
            支出概览 ({["按月显示", "按季度显示", "按年显示"].includes(timeRange) ? subOption || "未选择" : timeRange})
          </div>

          {/* Content Section */}
          <div
            className="content-section"
            style={{
              flex: "0 0 75%", // Takes 75% of height
              display: "flex",
              gap: "20px",
              padding: "20px",
              width:"100%",
              overflow:"visible",
              position:"relative"
            }}
          >
            {/* Left Side: Filters and Button */}
            <div
              className="filter-controls"
              style={{
                flex: "0 0 20%", // Takes 20% of width
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                justifyContent: "flex-start", // Aligns items at the top
                alignItems: "flex-start", // Left-aligned horizontally
              }}
            >
              {/* 时间段 Combo Box */}
              <label style={{ width: "100%", fontSize: "16px" }}>
                时间段:
                <select
                  value={timeRange}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setTimeRange(newValue);
                    setSubOption(""); // Reset sub-option when time range changes
                    handleAutoSelectBottom(newValue); // Automatically select the current option
                  }}
                  style={{
                    width: "100%",
                    marginTop: "5px",
                    padding: "8px",
                  }}
                >
                  <option value="全部显示">全部显示</option>
                  <option value="按月显示">按月显示</option>
                  <option value="按季度显示">按季度显示</option>
                  <option value="按年显示">按年显示</option>
                  <option value="前3个月">前3个月</option>
                  <option value="前6个月">前6个月</option>
                </select>
              </label>

              {/* 子选项 Combo Box */}
              <label style={{ width: "100%", fontSize: "16px" }}>
                子选项:
                <select
                  value={subOption}
                  onChange={(e) => {
                    setSubOption(e.target.value);
                  }}
                  disabled={["前3个月", "前6个月", "全部显示"].includes(timeRange)}
                  style={{
                    width: "100%",
                    marginTop: "5px",
                    padding: "8px",
                  }}
                >
                  <option value="">请选择</option>
                  {timeRange === "按月显示" &&
                    [...Array(12).keys()].map((month) => {
                      const monthName = new Date(0, month).toLocaleString("default", { month: "long" });
                      return (
                        <option key={month} value={monthName}>
                          {monthName}
                        </option>)
                      })}
                  {timeRange === "按季度显示" &&
                    ["Q1", "Q2", "Q3", "Q4"].map((quarter) => (
                      <option key={quarter} value={quarter}>
                        {quarter}
                      </option>
                    ))}
                  {timeRange === "按年显示" &&
                    availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                </select>
              </label>

              {/* 筛选 Button */}
              {/* <button
                onClick={filterExpenses}
                style={{
                  backgroundColor: "#4CAF50",
                  color: "white",
                  padding: "10px 20px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  border: "none",
                  borderRadius: "5px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  cursor: "pointer",
                  transition: "background-color 0.3s ease, transform 0.2s ease",
                  width: "100%",
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#45A049";
                  e.target.style.transform = "scale(1.05)";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "#4CAF50";
                  e.target.style.transform = "scale(1)";
                }}
              >
                筛选
              </button> */}
            </div>

            {/* Right Side: Pie Chart */}
            <div
              className="chart-container"
              style={{
                flex: "0 0 80%", // Takes 70% of width
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow:"visible",
                position:"absolute",
                right:"10px",
                top:"-70px",
                backgroundColor:"transparent"
              }}
            >
              <Chart
                chartType="PieChart"
                data={chartData}
                options={options}
                width={"700px"}
                height={"350px"}
              />
            </div>
          </div>
        </div>

      </div>
      <div className="homepage-right">
      <div
        className={`flip-container ${animationType === "flip" ? "flip-mode" : "slide-mode"} ${isFlipped ? "flipped" : ""} ${isReadyToFlip ? "ready-to-flip" : ""}`}
        onClick={handleBoxClick}
        // ref={panelRef}
      >
        {/* Front Side */}
        <div className="front">
          <div style={{ marginBottom: "40px" }}>
            <h2 className="zcool-qingke-huangyou-regular" style={{ fontSize: "50px" }}>
              记账本 v2.0 内测版
            </h2>
          </div>
          <div className="button-group">
            <Link to="/recordExpense">
              <button className="action-btn">记录 支出</button>
            </Link>
            <Link to="/recordIncome">
              <button className="action-btn">记录 收入</button>
            </Link>
          </div>

          <div className="button-group">
            <Link to="/showExpense">
              <button className="action-btn">显示支出明细</button>
            </Link>
            <Link to="/showIncome">
              <button className="action-btn">显示收入明细</button>
            </Link>
          </div>

          <div className="button-group">
            <button className="action-btn" onClick={() => openModalCategory("类别设置")}>
              类别设置
            </button>
            <button className="action-btn" onClick={() => openModalOther("其他设置")}>
              其他设置
            </button>
          </div>
        </div>

        {/* Back Side */}
        <div className="back">
          <h2 className="zcool-qingke-huangyou-regular" style={{ fontSize: "40px" }}>
            总金额
          </h2>
          <p style={{ fontSize: "30px", fontWeight: "bold" }}>
            ${totalChecking !== null ? totalChecking.toFixed(2) : "加载中..."}
          </p>

          {/* Adjustment Section */}
          <div className="adjustment-section" onClick={(e) => e.stopPropagation()}>
            {/* Wrap everything in a column layout */}
            <div
              className="adjustment-container"
              style={{
                margin: "0 10px",
                padding: "10px",
                display: "flex",
                flexDirection: "column", // Stack items vertically
                gap: "20px", // Space between sections
                alignItems: "center", // Center both sections horizontally
              }}
            >
              {/* 手动增减 Section */}
              <div
                className="horizontal-group"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <h3 style={{ fontSize: "18px" }}>手动增减:</h3>

                <label style={{ display: "flex", alignItems: "center", fontSize: "20px" }}>
                  <input
                    type="radio"
                    name="adjustment"
                    value="add"
                    checked={adjustType === "add"}
                    onChange={handleRadioChange}
                    style={{ transform: "scale(1.2)", marginRight: "5px" }}
                  />
                  +
                </label>
                <label style={{ display: "flex", alignItems: "center", fontSize: "20px" }}>
                  <input
                    type="radio"
                    name="adjustment"
                    value="subtract"
                    checked={adjustType === "subtract"}
                    onChange={handleRadioChange}
                    style={{ transform: "scale(1.2)", marginRight: "5px" }}
                  />
                  -
                </label>

                <input
                  type="number"
                  className="amount-input"
                  placeholder="输入调整金额"
                  value={adjustAmount}
                  onChange={handleInputChange}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: "10px",
                    height: "42px",
                    width: "135px",
                    textAlign: "center",
                  }}
                />

                <button
                  className="adjust-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdjustAmount(adjustType, parseFloat(adjustAmount));
                  }}
                  style={{
                    padding: "10px 20px",
                    cursor: "pointer",
                    width: "120px",
                  }}
                >
                  确认调整
                </button>
              </div>

              {/* 手动更改 Section (Centered) */}
              <div
                className="manual-adjust-group"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center", // Center everything horizontally
                  gap: "10px",
                  width: "100%", // Ensure full width for centering effect
                }}
              >
                <h3 style={{ fontSize: "18px" }}>手动更改:</h3>

                <input
                  type="number"
                  className="amount-input"
                  placeholder="输入最终金额"
                  value={adjustAmount2}
                  onChange={handleInputChange2}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: "10px",
                    height: "42px",
                    width: "150px",
                    textAlign: "center",
                  }}
                />

                <button
                  className="adjust-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdjustAmount2(parseFloat(adjustAmount2));
                  }}
                  style={{
                    padding: "10px 20px",
                    cursor: "pointer",
                    width: "120px",
                  }}
                >
                  确认更改
                </button>
              </div>
            </div>
          </div>



          {/* Transactions Section */}
          <div className="transactions-section" onClick={(e) => e.stopPropagation()}>
            <div style={{ margin: "20px 10px", boxSizing: "border-box", position: "relative" }}>
              
              <h3 style={{ textAlign: "center", marginBottom: "10px" }}>最近 100 笔交易</h3>

              <div style={{
                display: "flex",
                padding: "5px 10px",
                justifyContent: "space-between",
                fontWeight: "bold",
                borderBottom: "2px solid black",
              }}>
                <span style={{ width: "20%" }}>日期</span>
                <span style={{ width: "14%" }}>类别</span>
                <span style={{ width: "23%" }}>金额</span>
                <span style={{ width: "23%" }}>余额</span>
                <span style={{ width: "20%" }}>操作</span>
              </div>

              <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                {last100Transactions.map((expense, index) => {
                  const [date, category, amount, balance, id_no] = expense;
                  const isExpense = category === "Expense";
                  const isIncome = category === "Income";
                  const isManual = category === "Manual";
                  const amountColor = isExpense ? "red" : isIncome ? "green" : "black";

                  return (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "5px 10px",
                        borderBottom: "1px solid lightgray",
                      }}
                    >
                      <span style={{ width: "20%" }}>
                        {new Date(date).toLocaleDateString("en-US", {
                          year: "2-digit",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </span>
                      <span style={{ width: "14%" }}>
                        {category === "Expense" ? "支出" : category === "Income" ? "收入" : "手动调整"}
                      </span>
                      <span style={{ width: "23%", color: amountColor, fontWeight: "bold" }}>
                        {isExpense ? "-" : isIncome ? "+" : isManual && parseFloat(amount) > 0 ? "+" : "-"}
                        ${Math.abs(parseFloat(amount)).toFixed(2)}
                      </span>
                      <span style={{ width: "23%" }}>${parseFloat(balance).toFixed(2)}</span>
                      <a
                        onClick={() => category === "Manual" ? null : openModalMiscellaneous(id_no)}
                        id={id_no}
                        style={{ width: "20%", color: category === "Manual" ? "gray" : "blue", pointerEvents: category === "Manual" ? "none" : "auto" }}
                      >
                        {category === "Manual" ? "暂无" : "查看详情"}
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
      </div>

      {isModalOpenCategory && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>{modalContentCategory}</h2>
            </div>
            <div className="modal-body">
              {/* Section 1: Add Category */}
              <div style={{ marginBottom: "20px" }}>
                <h3>添加类别</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="text"
                    id="add-category-input"
                    placeholder="输入新类别"
                    style={{
                      padding: "8px",
                      width: "70%",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  />
                  <button
                    onClick={() => {
                      const newCategory = document.getElementById("add-category-input").value;
                      if (newCategory.trim() === "") {
                        alert("请输入有效的类别名称！");
                      } else {
                        alert(`添加的类别: ${newCategory}`);
                      }
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#4CAF50",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    添加
                  </button>
                </div>
              </div>

              {/* Section 2: Delete Categories */}
              <div>
                <h3>删除</h3>
                <div style={{ marginBottom: "20px" }}>
                  {categories.map((category, index) => (
                    <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="checkbox"
                        id={`delete-category-${index}`}
                        value={category}
                        style={{ transform: "scale(1.2)" }}
                      />
                      <label htmlFor={`delete-category-${index}`} style={{ fontSize: "16px" }}>
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const selectedCategories = categories.filter((_, index) =>
                      document.getElementById(`delete-category-${index}`).checked
                    );

                    if (selectedCategories.includes("Other")) {
                      alert("Other 无法被删除。请检查您的选项！");
                      return;
                    }

                    if (selectedCategories.length === 0) {
                      alert("请选择要删除的类别！");
                    } else {
                      alert(`删除的类别: ${selectedCategories.join(", ")}`);
                    }
                  }}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f44336",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  删除
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn" onClick={closeModalCategory}>
                保存
              </button>
              <button className="modal-btn" onClick={closeModalCategory}>
                退出
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpenOther && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>{modalContentOther}</h2>
            </div>
            <div className="modal-body">
              正在努力的开发中！2
              修改成功提示音 radio button
              更改语言
            </div>
            <div className="modal-footer">
              <button className="modal-btn" onClick={closeModalOther}>
                保存
              </button>
              <button className="modal-btn" onClick={closeModalOther}>
                退出
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpenMiscellaneous && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>{findTransactionById(data,modalContentMiscellaneous).type == "Expense"?"支出详情":"收入详情"}</h2>
            </div>
            <div className="modal-body">
              <TransactionDetails transaction={findTransactionById(data, modalContentMiscellaneous)} />
            </div>
            <div className="modal-footer">
              <button className="modal-btn" onClick={closeModalMiscellaneous}>
                保存
              </button>
              <button className="modal-btn" onClick={closeModalMiscellaneous}>
                退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};





const RecordExpensePage = () => {
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [date, setDate] = React.useState("");
  const [totalChecking, setTotalChecking] = useState(null);
  const navigate = useNavigate();

  const { data, addExpense } = useContext(DataContext); // Access global data and updater

  let adjustAmount = 0
  let adjustType = "subtract"

  const handleAdjustAmount = async (id) => {
    const adjustment = adjustType === "add" ? parseFloat(parseFloat(adjustAmount).toFixed(2)) : -parseFloat(adjustAmount).toFixed(2);
    
    const newTotal = totalChecking + adjustment;

    // Create a new transaction entry for the last100 transactions
    const newTransaction = [
      new Date().toISOString().slice(0, 10),  // Current date in YYYY-MM-DD format
      "Expense",  // Category
      adjustment,  // The amount
      newTotal.toFixed(2),  // The updated balance
      id
    ];


    // Send another request to update CheckingRecent100
    const requestId = uuidv4(); // Generate a unique request ID
    const last100Response = await fetch("http://localhost:5001/api/update-checking-last100", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newTransaction,requestId }),
    });
    if (last100Response.ok) {
      console.log("金额和交易记录更新成功");
    } else {
      alert("更新交易记录失败，请稍后再试");
    }

    // const requestId = uuidv4(); // Generate a unique request ID
    // // Send update request to update total checking
    // const response = await fetch("http://localhost:5001/api/update-total", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ newTotal, requestId }),
    // });
    // alert(response)
    setTotalChecking(newTotal);
  };
  // Fetch the total amount from recentTransactions.json
  useEffect(() => {
    const fetchTotalChecking = async () => {
      try {
        const response = await fetch("/recentTransactions.json");
        const data = await response.json();
        setTotalChecking(data.Checking || 0);
      } catch (error) {
        console.error("Error fetching recentTransactions.json:", error);
      }
    };
    fetchTotalChecking();
  }, []);
  

  const handleSave = () => {
    if (!category || !amount || !description || !date) {
      alert("Please fill in all fields before saving.");
      console.log(data.expenses[data.expenses.length-1]," not saved ",data.expenses.length);
      return;
    }

    // Ensure the amount has two decimal places
    const formattedAmount = parseFloat(amount).toFixed(2);
    const id = createId(date)
    addExpense(
      {
        category: category,
        amount: formattedAmount,
        description: description,
        date: date,
        id:id
      }
    )
    adjustAmount = formattedAmount;
    handleAdjustAmount(id);
    console.log(data.expenses.length,"saved");
    alert(
      `Expense Saved!\n\nDetails:\nCategory: ${category}\nAmount: ${amount}\nDescription: ${description}\nDate: ${date}`
    );

    
    
    navigate("/");
  };

  const [searchTerm, setSearchTerm] = React.useState("");
const [suggestions, setSuggestions] = React.useState([]);

const handleSearchChange = (e) => {
  const value = e.target.value;
  setSearchTerm(value);
  if (value.trim() === "") {
    setSuggestions([]);
  } else {
    // Filter categories (case-insensitive)
    const filtered = categories.filter(cat =>
      cat.toLowerCase().includes(value.toLowerCase())
    );
    setSuggestions(filtered);
  }
};

const handleSearchKeyDown = (e) => {
  if (e.key === "Enter" && suggestions.length > 0) {
    // Automatically select the closest match (the first suggestion)
    setCategory(suggestions[0]);
    setSearchTerm("");
    setSuggestions([]);
  }
};

  return (
    <div class="body">
      <div className="expense-page">
        <h1>记录 支出</h1>
        <div className="form-group">
          <label>选择分类</label>
          <div style={{ display: "flex", gap: "10px" }}>
            {/* Left half: Drop-down menu */}
            <select
              style={{ width: "50%" }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">请选择...</option>
              {categories.map((cat, index) => (
                <option key={index} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {/* Right half: Search bar with suggestions */}
            <div style={{ width: "50%", position: "relative" }}>
              <input
                type="text"
                placeholder="搜索分类"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                style={{ width: "100%", paddingRight: "30px" }} // extra space for the icon
              />
              <button
                onClick={() => {
                    if (suggestions.length > 0) {
                        setCategory(suggestions[0]);
                        setSearchTerm("");
                        setSuggestions([]);
                    }
                }}
                style={{
                    position: "absolute",
                    right: "5px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    cursor: "pointer",
                    fontSize: "20px",
                    marginTop:"4px",
                    marginRight:"4px"
                }}
                aria-label="搜索"
            >
                <span className="icon-search"></span>
            </button>
              {suggestions.length > 0 && (
                <ul
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "white",
                    border: "1px solid #ccc",
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    maxHeight: "150px",
                    overflowY: "auto",
                    zIndex: 10
                  }}
                >
                  {suggestions.slice(0, 5).map((sugg, index) => (
                    <li
                      key={index}
                      style={{ padding: "8px", cursor: "pointer" }}
                      onMouseDown={() => {
                        setCategory(sugg);
                        setSearchTerm("");
                        setSuggestions([]);
                      }}
                    >
                      {sugg}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="form-group">
          <label>请输入金额</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>请输入描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>输入日期</label>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ flex: "0 0 80%" }}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ flex: "0 0 20%" }}>
              <button
                onClick={() => setDate(new Date().toISOString().slice(0, 10))}
                style={{
                  width: "100%",
                  padding: "8px",
                  backgroundColor: "#ccc",
                  color: "black",
                  border: "1px solid #999",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Today
              </button>
            </div>
          </div>
        </div>
        <div className="button-group">
          <button className="action-btn" onClick={handleSave}>
            保存
          </button>
          <Link to="/">
            <button className="action-btn">退出</button>
          </Link>
        </div>
      </div>
    </div>
  );
};


const RecordIncomePage = () => {
  const [preTaxAmount, setPreTaxAmount] = React.useState("");
  const [postTaxAmount, setPostTaxAmount] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [date, setDate] = React.useState("");
  const [totalChecking, setTotalChecking] = useState(null);
  const navigate = useNavigate();

  const { data, addIncome } = useContext(DataContext); // Access global data and updater

  let adjustAmount = 0
  let adjustType = "add"

  const handleAdjustAmount = async (id) => {
    const adjustment = adjustType === "add" ? parseFloat(parseFloat(adjustAmount).toFixed(2)) : -parseFloat(adjustAmount).toFixed(2);
    const newTotal = totalChecking + adjustment;
    
    // Create a new transaction entry for the last100 transactions
    const newTransaction = [
      new Date().toISOString().slice(0, 10),  // Current date in YYYY-MM-DD format
      "Income",  // Category
      adjustment,  // The amount
      newTotal.toFixed(2),  // The updated balance
      id
    ];

    // Send another request to update CheckingRecent100
    const requestId = uuidv4(); // Generate a unique request ID
    const last100Response = await fetch("http://localhost:5001/api/update-checking-last100", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newTransaction,requestId }),
    });
    if (last100Response.ok) {
      console.log("金额和交易记录更新成功");
    } else {
      console.log("更新交易记录失败，请稍后再试");
    }

    // const requestId = uuidv4(); // Generate a unique request ID
    // // Send update request to update total checking
    // const response = await fetch("http://localhost:5001/api/update-total", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({ newTotal, requestId }),
    // });
    setTotalChecking(newTotal);

    
  };
  // Fetch the total amount from recentTransactions.json
  useEffect(() => {
    const fetchTotalChecking = async () => {
      try {
        const response = await fetch("/recentTransactions.json");
        const data = await response.json();
        setTotalChecking(data.Checking || 0);
      } catch (error) {
        console.error("Error fetching recentTransactions.json:", error);
      }
    };
    fetchTotalChecking();
    
  }, []);

  const handleSave = () => {
    if (!preTaxAmount || !postTaxAmount || !notes || !date) {
      alert("请填写所有字段后再保存。");
      console.log(data.income[data.income.length - 1], " not saved ", data.income.length);
      return;
    }

    // Ensure the amount has two decimal places
    const formattedAmount = parseFloat(postTaxAmount).toFixed(2);
    let id = createId(date);

    // Update the data.json
    addIncome({
      before_tax: preTaxAmount,
      after_tax: postTaxAmount,
      description: notes,
      date: date,
      id:id,
      tax_percentage:((parseFloat(preTaxAmount)-parseFloat(postTaxAmount))/parseFloat(preTaxAmount))*100
    });

    // Update recentTransactons.json
    adjustAmount = formattedAmount;
    handleAdjustAmount(id);

    console.log(data.income.length, "saved");
    alert(
      `收入已保存！\n\n详细信息:\n税前金额: ${preTaxAmount}\n税后金额: ${postTaxAmount}\n税收百分比:${((parseFloat(preTaxAmount)-parseFloat(postTaxAmount))/parseFloat(preTaxAmount))*100}\n注释: ${notes}\n日期: ${date}`
    );

    navigate("/");
  };

  return (
    <div className="body">
      <div className="income-page">
        <h1>记录 收入</h1>
        <div className="form-group">
          <label>请输入 税前 总额</label>
          <input
            type="number"
            value={preTaxAmount}
            onChange={(e) => setPreTaxAmount(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>请输入 税后 总额</label>
          <input
            type="number"
            value={postTaxAmount}
            onChange={(e) => setPostTaxAmount(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>请输入 注释</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>输入日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="button-group">
          <button className="action-btn" onClick={handleSave}>
            保存
          </button>
          <Link to="/">
            <button className="action-btn">退出</button>
          </Link>
        </div>
      </div>
    </div>
  );
};



const ShowExpensePage = () => {
  const { data, updateExpense,deleteExpense } = useContext(DataContext); // Access global data and updater

  // 暂存 States: May contain clicked but not saved (means we don't want)
  const [filterOption, setFilterOption] = useState(""); // Combo box value, default all will be set in a usestate hook below somewhere, above return
  const [subOption, setSubOption] = useState(""); // Sub combo box value
  const [amountThreshold, setAmountThreshold] = useState(""); // Text box value
  const [showAboveThreshold, setShowAboveThreshold] = useState(false); // Checkbox value
  const [sortType,setSortType] = useState("")
  const [showType, setShowType] = useState(""); // Display type combo box value


  const [isSortDialogVisible, setSortDialogVisible] = useState(false); // Dialog visibility
  const [isModifyDialogVisible, setModifyDialogVisible] = useState(false);
  const [isDeleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const handleModifyClick = (expense) => {    
    setSelectedExpense(expense);
    setModifyDialogVisible(true);
  };

  const handleDeleteClick = (expense) => {
    setSelectedExpense(expense);
    setDeleteDialogVisible(true);
  };

  const closeDialogs = () => {
    setModifyDialogVisible(false);
    setDeleteDialogVisible(false);
    setSelectedExpense(null);
  };
  
  // the saved state, state we actually want and render
  const [appliedFilters, setAppliedFilters] = useState({
    filterOption: "",
    subOption: "",
    amountThreshold: "",
    showAboveThreshold: false,
    showType: ""
  });

  const years = [...new Set(data.expenses.map(expense => new Date(expense.date).getFullYear()))];

  // Use localStorage value as initial state
  const [autoApplyChanges, setAutoApplyChanges] = useState(() => {
    const storedAutoApply = localStorage.getItem("autoApplyChanges");
    return storedAutoApply !== null ? JSON.parse(storedAutoApply) : false;
  });

  // Save the state of "直接显示" to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("autoApplyChanges", JSON.stringify(autoApplyChanges));
  }, [autoApplyChanges]);


  const filterExpensesORIGINAL = () => {    
    const now = new Date();
    const currentYear = now.getFullYear();
    let sortType = appliedFilters.sortType; // we need this. directly using sortType hook (aka not thru applied filters) will do immediate render bypassing save
  
    return data.expenses
      .filter((expense) => {
        let include = true;
        
        // Apply filters based on saved state (appliedFilters)
        const {
          filterOption,
          subOption,
          amountThreshold,
          showAboveThreshold,
          showType,
          sortType
        } = appliedFilters;
        
        // Handle showType = "Category sum" or "List all Category Expenses"
        if (showType == "Category sum" || showType == "List all Category Expenses") {
          return false; // Do not include any expenses YET
        }
  
        // Handle filterOption logic
        if (filterOption == "显示全部") {
          include = true; // Include all expenses
        } else if (filterOption == "按月显示") {
          const monthMapping = {// originally used for .getFullYear() etc functions so we need to +1 to it below
            "一月": 0,
            "二月": 1,
            "三月": 2,
            "四月": 3,
            "五月": 4,
            "六月": 5,
            "七月": 6,
            "八月": 7,
            "九月": 8,
            "十月": 9,
            "十一月": 10,
            "十二月": 11,
          };
          
          if (subOption in monthMapping) {
            const targetMonth = monthMapping[subOption];
            //const expenseDate = new Date(expense.date);
            const expenseDate = expense.date;  // Assuming expense.date is in 'YYYY-MM-DD' format
            const year = expenseDate.substring(0, 4);  // Extract the year (first 4 characters)
            const month = expenseDate.substring(5, 7); // Extract the month (characters at positions 5-6)

            include =
              include &&
              year == currentYear &&
              month == targetMonth+1;
          } else {
            include = false; // Invalid subOption
          }
        } else if (filterOption == "按季度显示") {
          const quarterMapping = {
            Q1: [0, 1, 2],
            Q2: [3, 4, 5],
            Q3: [6, 7, 8],
            Q4: [9, 10, 11],
          };
  
          if (subOption in quarterMapping) {
            const targetMonths = quarterMapping[subOption];
            //const expenseDate = new Date(expense.date);
            const expenseDate = expense.date;  // Assuming expense.date is in 'YYYY-MM-DD' format
            const year = expenseDate.substring(0, 4);  // Extract the year (first 4 characters)
            const month = expenseDate.substring(5, 7); // Extract the month (characters at positions 5-6)
            include =
              include &&
              year == currentYear &&
              targetMonths.includes(month+1);
          } else {
            include = false; // Invalid subOption
          }
        } else if (filterOption == "按年份显示") {
          const targetYear = parseInt(subOption, 10);
          const expenseDate = expense.date;  // Assuming expense.date is in 'YYYY-MM-DD' format
          const year = expenseDate.substring(0, 4);  // Extract the year (first 4 characters)

          include =
            include &&
            !isNaN(targetYear) &&
            year == targetYear;
        }else if (
          filterOption == "前3个月" ||
          filterOption == "前12个月" || 
          filterOption === "前6个月"
        ) {
          // TODO: might have bugs on time periods
          const monthsToSubtract = filterOption == "前3个月" ? 3 
                        : filterOption == "前6个月" ? 6 
                        :12;
          const targetDate = new Date();
          targetDate.setMonth(now.getMonth() - monthsToSubtract);
  
          const expenseDate = new Date(expense.date);
                    
          // Ensure the expense date is within the range
          include = include && expenseDate >= targetDate && expenseDate <= now;
        }
  
        // Filter by amountThreshold if applicable
        if (showAboveThreshold && amountThreshold) {
          include =
            include &&
            parseFloat(expense.amount) > parseFloat(amountThreshold);
        }
  
        return include;
      })
      .sort((a, b) => {
        // Sort expenses by date based on sortType
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortType === "ascending" ? dateA - dateB : dateB - dateA;
      }); 
      //.sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort expenses by date ascending
  };
  

  const filterExpenses = () => {
    /* ---------- CONSTANTS ---------- */
    const now = new Date();
    const currentYear = now.getFullYear();

    const {
      filterOption,
      subOption,
      amountThreshold,
      showAboveThreshold,
      showType,
      sortType,
    } = appliedFilters;

    console.log("Loading the following:", appliedFilters);

    /* ---------- HELPERS ---------- */
    // Check whether an expense’s date passes the active date-range filter
    const isDateInRange = (expenseDate) => {
      const expenseYear = parseInt(expenseDate.substring(0, 4), 10);
      const expenseMonth = parseInt(expenseDate.substring(5, 7), 10) - 1;

      if (filterOption === "按月显示") {
        const monthMapping = {
          一月: 0,
          二月: 1,
          三月: 2,
          四月: 3,
          五月: 4,
          六月: 5,
          七月: 6,
          八月: 7,
          九月: 8,
          十月: 9,
          十一月: 10,
          十二月: 11,
        };
        return (
          expenseYear === currentYear &&
          expenseMonth === monthMapping[subOption]
        );
      } else if (filterOption === "按季度显示") {
        const quarterMapping = {
          Q1: [0, 1, 2],
          Q2: [3, 4, 5],
          Q3: [6, 7, 8],
          Q4: [9, 10, 11],
        };
        return (
          expenseYear === currentYear &&
          quarterMapping[subOption]?.includes(expenseMonth)
        );
      } else if (filterOption === "按年份显示") {
        return expenseYear === parseInt(subOption, 10);
      } else if (
        filterOption === "前3个月" ||
        filterOption === "前6个月" ||
        filterOption === "前12个月"
      ) {
        const monthsToSubtract =
          filterOption === "前3个月"
            ? 3
            : filterOption === "前6个月"
            ? 6
            : 12;

        const targetDate = new Date();
        targetDate.setMonth(now.getMonth() - monthsToSubtract);

        const expenseDateObj = new Date(expenseDate);
        return expenseDateObj >= targetDate && expenseDateObj <= now;
      }

      return true; // Default: include all expenses
    };

    /* ---------- CATEGORY-SUM MODE ---------- */
    if (showType === "Category sum") {
      let categorySums = {};

      data.expenses.forEach((expense) => {
        const expenseDate = expense.date;
        if (isDateInRange(expenseDate)) {
          const category = expense.category;
          const amount = parseFloat(expense.amount);

          categorySums[category] = (categorySums[category] || 0) + amount;
        }
      });

      console.log("Category Sums:", categorySums);

      // Translate category keys
      categorySums = Object.keys(categorySums).reduce((acc, key) => {
        const translatedKey = categoriesTranslation[key] || key;
        acc[translatedKey] = categorySums[key];
        return acc;
      }, {});

      // Total of all categories
      const totalSum = Object.values(categorySums).reduce(
        (sum, amount) => sum + amount,
        0
      );

      // Convert to row objects and sort
      const sortedCategories = Object.entries(categorySums)
        .sort(([, a], [, b]) =>
          sortType === "ascending" ? a - b : b - a
        )
        .map(([category, amount]) => ({
          category,
          amount: amount.toFixed(2),
          date: "",
          description: "",
          actions: null,
        }));

      console.log("sorted categories", sortedCategories);

      // Add empty spacer rows + grand total
      return [
        ...sortedCategories,
        { category: "", amount: "", date: "", description: "", actions: null },
        { category: "", amount: "", date: "", description: "", actions: null },
        {
          category: "总和",
          amount: totalSum.toFixed(2),
          date: "",
          description: "",
          actions: null,
        },
      ];
    }

    /* ---------- LIST-ALL-CATEGORY EXPENSES MODE ---------- */
    if (showType === "List all Category Expenses") {
      let categoryExpenses = {};

      // 1) Bucket every expense into its category
      data.expenses.forEach((expense) => {
        const expenseDate = expense.date;
        if (isDateInRange(expenseDate)) {
          const category = expense.category;
          (categoryExpenses[category] ||= []).push(expense);
        }
      });

      // 2) Sort each bucket by date
      Object.keys(categoryExpenses).forEach((category) =>
        categoryExpenses[category].sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return sortType === "ascending" ? dateA - dateB : dateB - dateA;
        })
      );

      console.log("Category Expenses:", categoryExpenses);

      // 3) Order the buckets themselves by total amount
      const categoryTotals = Object.keys(categoryExpenses).map((category) => {
        const totalAmount = categoryExpenses[category].reduce(
          (sum, item) => sum + parseFloat(item.amount),
          0
        );
        return { category, totalAmount };
      });

      categoryTotals.sort((a, b) =>
        appliedFilters.sortType === "ascending"
          ? a.totalAmount - b.totalAmount
          : b.totalAmount - a.totalAmount
      );

      // 4) Re-insert buckets in the new order
      const sortedData = {};
      categoryTotals.forEach(({ category }) => {
        sortedData[category] = categoryExpenses[category];
      });
      categoryExpenses = sortedData;
      
      /* ---------- Build the final, flattened table ---------- */
      let finalExpenses = [];
      let totalExpenses = 0;

      Object.entries(categoryExpenses).forEach(([category, expenses]) => {
        // Category subtotal
        const categoryTotal = expenses.reduce(
          (sum, expense) => sum + parseFloat(expense.amount),
          0
        );
        totalExpenses += categoryTotal;

        // Title row for this category
        finalExpenses.push({
          category: `${
            categoriesTranslation[category] || category
          }  总消费: $${categoryTotal.toFixed(2)}`,
          amount: "",
          date: "",
          description: "",
          actions: null,
        });

        // Add individual expenses here if desired
        expenses.forEach((exp) =>
          finalExpenses.push({
            category: categoriesTranslation[exp.category] || exp.category,
            amount: parseFloat(exp.amount).toFixed(2),
            date: exp.date,
            description: exp.description || "",
            actions: "yes",
          })
        );

        // ----------------------------------------------------
      }); // <— end of Object.entries  forEach

      console.log("FINAL:", finalExpenses);

      const totalExpensesRow = {
        category: `总共消费: $${totalExpenses.toFixed(2)}`,
        amount: "",
        date: "",
        description: "",
        actions: null,
      };

      // Mirror the grand-total row at top *and* bottom
      finalExpenses.unshift(totalExpensesRow); // Top
      finalExpenses.push(totalExpensesRow);   // Bottom

      return finalExpenses;
    }

    /* ---------- DEFAULT: plain list (date-sorted) ---------- */
    console.log(showType);

    return data.expenses
      .filter((expense) => {
        let include = true;

        const expenseDate = expense.date;

        // Date range
        include = include && isDateInRange(expenseDate);

        // Amount threshold
        if (showAboveThreshold && amountThreshold) {
          include =
            include &&
            parseFloat(expense.amount) > parseFloat(amountThreshold);
        }

        return include;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortType === "ascending" ? dateA - dateB : dateB - dateA;
      });
  }; // <— end filterExpenses

  


  // Load filters from local storage on page load
  useEffect(() => {
    const savedFilters = localStorage.getItem("expenseFilters");
    
    if (savedFilters) {
      const parsedFilters = JSON.parse(savedFilters);
      console.log("Loaded filters from local storage:", parsedFilters);

      // only this DOES NOT WORK because filterExpenses does not use these directly, but therefore updating these individual one will not trigger react reload. filterExpenses uses only setAppliedFilters directly ,therefore when executing until here, will trigger reload
      // Update state with loaded filters
      setFilterOption(parsedFilters.filterOption || "");
      setSubOption(parsedFilters.subOption || "");
      setAmountThreshold(parsedFilters.amountThreshold || 0);
      setShowAboveThreshold(parsedFilters.showAboveThreshold ?? false);
      setShowType(parsedFilters.showType || "");
      setSortType(parsedFilters.sortType || "ascending");

      // need this
      const filtersToSave = {
        filterOption:parsedFilters.filterOption || "",
        subOption:parsedFilters.subOption || "",
        amountThreshold:parsedFilters.amountThreshold || 0,
        showAboveThreshold:parsedFilters.showAboveThreshold ?? false,
        showType:parsedFilters.showType || "",
        sortType:parsedFilters.sortType || "ascending"
      };
      setAppliedFilters(filtersToSave);
    }else{
      // default


      // set states
      setFilterOption( "显示全部");
      setSubOption("");
      setAmountThreshold(0);
      setShowAboveThreshold(false);
      setShowType("");
      setSortType("ascending");

      // set obj of states (filterExpenses called cuz of this)
      const filtersToSave = {
        filterOption:"显示全部",
        subOption:"",
        amountThreshold: 0,
        showAboveThreshold:false,
        showType: "",
        sortType:"ascending"
      };
      setAppliedFilters(filtersToSave);
    }
    
  }, []); // Empty dependency array ensures it runs only on the first render



  const handleSaveFilters = () => {
    // put 暂存 state into ready to render state
    const filtersToSave = {
      filterOption:filterOption,
      subOption:subOption,
      amountThreshold:amountThreshold,
      showAboveThreshold:showAboveThreshold,
      showType:showType,
      sortType:sortType
    };
    setAppliedFilters(filtersToSave);
    setSortDialogVisible(false); // Close the modal

    // Save to local storage
    localStorage.setItem("expenseFilters", JSON.stringify(filtersToSave));
    console.log("Filters saved to local storage:", filtersToSave);
  };



  // Only when "Save" is clicked, update selectedExpense
  const handleSaveChanges = () => {
    // Find the original selected expense (in case we need to compare)
    const original = {
      ...data.expenses.find(item => item.id === selectedExpense.id)
    };
    
    // Prepare the updated selectedExpense by pulling values from inputs
    const updatedExpense = {
      ...selectedExpense,
      category: document.getElementById("category_select").value,
      date: document.getElementById("date_input").value,
      amount: document.getElementById("amount_input").value,
      description: document.getElementById("description_input").value
    };
    
    const modifiedFields = [];

    // Check for modifications
    if (updatedExpense.category !== original.category) {
      modifiedFields.push(`类别: ${original.category} to ${updatedExpense.category}`);
    }
    if (updatedExpense.date !== original.date) {
      modifiedFields.push(`日期: ${original.date} to ${updatedExpense.date}`);
    }
    if (updatedExpense.amount !== original.amount) {
      modifiedFields.push(`金额: ${original.amount} to ${updatedExpense.amount}`);
    }
    if (updatedExpense.description !== original.description) {
      modifiedFields.push(`描述: ${original.description} to ${updatedExpense.description}`);
    }

    if (modifiedFields.length > 0) {
      console.log("Modified fields: ", modifiedFields.join(", "));
      // Update the global expense data
      updateExpense(updatedExpense);
    } else {
      console.log("No modifications made.");
    }

    // Close dialogs after saving
    closeDialogs();
  };
  
  return (
    <div className="modify-expense-container">
      {/* Header Section */}
      <div className="modify-expense-header">
        <div className="header-left">
          <h2>支出明细</h2>
        </div>
        <div className="header-right">
          <button
            className="sort-btn"
            onClick={() => setSortDialogVisible(true)}
          >
            排序
          </button>
          <Link to="/">
            <button className="exit-btn">退出</button>
          </Link>
        </div>
      </div>

      {/* Sort Dialog */}
      {isSortDialogVisible && (
        <div className="modal-overlay">
          <div className="sort-dialog">
            <div className="dialog-content">
              <h3>排序选项</h3>

              {/* 各种选项 */}
              <div className="dialog-body">
                {/* Row for Time Range */}
                <div className="row">
                  <label htmlFor="filter-combo" className="inline-label">
                    时间范围
                  </label>
                  <select
                    id="filter-combo"
                    value={filterOption}
                    onChange={(e) => {
                      const newFilterOption = e.target.value;
                      setFilterOption(newFilterOption);

                      // Update `subOption` etc with a default based on the new `filterOption`
                      // no need to update sortType since if unclicked default ascending, exactly which default radio is, once click desc, state updates.
                      if (newFilterOption == "按月显示") {
                        const currentMonth = new Date().toLocaleString("default", { month: "long" });
                        
                        setSubOption(currentMonth); // Default to "一月" for months, backend ONLY
                        setShowType("Category sum")
                      } else if (newFilterOption == "按季度显示") {
                        setSubOption("Q1"); // Default to "Q1" for quarters
                        setShowType("Category sum")
                      } else if (newFilterOption == "按年份显示") {
                        setSubOption(years[0]?.toString() || ""); // Default to the first year or empty
                        setShowType("Category sum")
                      }else if(newFilterOption == "前3个月" ||newFilterOption == "前12个月"||newFilterOption == "前6个月" ){
                        setSubOption("");
                        setShowType("Category sum")
                      } else {
                        setSubOption(""); // Clear `subOption` for other cases
                        setShowType("")
                      }

                      if (autoApplyChanges) {
                        setAppliedFilters({
                          filterOption: newFilterOption,
                          subOption: subOption, // Update this to reflect the new `subOption`
                          amountThreshold,
                          showAboveThreshold,
                          showType
                        });
                      }
                    }}
                    className="filter-combo"
                  >
                    <option value="显示全部">显示全部</option>
                    <option value="按月显示">按月显示</option>
                    <option value="按季度显示">按季度显示</option>
                    <option value="按年份显示">按年份显示</option>
                    <option value="前3个月">前3个月</option>
                    <option value="前12个月">前12个月</option>
                    <option value="前6个月">前6个月</option>
                  </select>

                </div>
                

                {/* Sub Option for Time Range */}
                <div className="row">
                  <label htmlFor="sub-option-combo" className="inline-label">
                    子选项
                  </label>
                  <select
                    id="sub-option-combo"
                    value={subOption}
                    onChange={(e) => {
                      setSubOption(e.target.value);
                      if (autoApplyChanges) {
                        setAppliedFilters({
                          filterOption,
                          subOption: e.target.value,
                          amountThreshold,
                          showAboveThreshold,
                          showType
                        });
                      }
                    }}
                    className="filter-combo"
                    disabled={filterOption == "前3个月" || filterOption == "前12个月" || filterOption == "前6个月"|| filterOption == "显示全部"}
                  >
                    {filterOption == "按月显示" && (
                      <>
                        <option value="一月">一月</option>
                        <option value="二月">二月</option>
                        <option value="三月">三月</option>
                        <option value="四月">四月</option>
                        <option value="五月">五月</option>
                        <option value="六月">六月</option>
                        <option value="七月">七月</option>
                        <option value="八月">八月</option>
                        <option value="九月">九月</option>
                        <option value="十月">十月</option>
                        <option value="十一月">十一月</option>
                        <option value="十二月">十二月</option>
                      </>
                    )}
                    {filterOption == "按季度显示" && (
                      <>
                        <option value="Q1">Q1</option>
                        <option value="Q2">Q2</option>
                        <option value="Q3">Q3</option>
                        <option value="Q4">Q4</option>
                      </>
                    )}
                    {filterOption == "按年份显示" && years.map((year) => (
                      <option value={year} key={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Row for Show Type */}
                <div className="row">
                  <label htmlFor="show-type-combo" className="inline-label">
                    显示类型
                  </label>
                  <select
                    id="show-type-combo"
                    value={showType}
                    onChange={(e) => {
                      setShowType(e.target.value);
                      if (autoApplyChanges) {
                        setAppliedFilters({
                          filterOption,
                          subOption,
                          amountThreshold,
                          showAboveThreshold,
                          showType: e.target.value
                        });
                      }
                    }}
                    className="filter-combo"
                    disabled={filterOption == "显示全部"}
                  >
                    {filterOption !="显示全部" && (
                      <>
                      <option value="Category sum">类别总和</option>
                      <option value="List all Category Expenses">列出所有类别支出</option>
                      <option value="List all Expenses by Date">按日期列出所有支出</option>
                      </>
                    )}
                    
                  </select>
                </div>

                {/* Row for Sort Type */}
                <div className="row">
                  <label className="inline-label">显示类型</label>

                  <div>
                    <label style={{ display: "inline-flex", alignItems: "center", marginRight: "10px" }}>
                      <input
                        type="radio"
                        name="sortType"
                        style={{ height: "20px", width: "20px", marginRight: "5px" }}
                        value="ascending"
                        checked={sortType === "ascending"}
                        onChange={(e) => {
                          setSortType(e.target.value);
                          console.log("Selected Order: ", e.target.value);
                          if (autoApplyChanges) {
                            setAppliedFilters({
                              filterOption,
                              subOption,
                              amountThreshold,
                              showAboveThreshold,
                              showType,
                              sortType: e.target.value,
                            });
                          }
                        }}
                      />
                      升序
                    </label>

                    <label style={{ display: "inline-flex", alignItems: "center", marginRight: "10px" }}>
                      <input
                        type="radio"
                        name="sortType"
                        value="descending"
                        style={{ height: "20px", width: "20px", marginRight: "5px" }}
                        checked={sortType === "descending"}
                        onChange={(e) => {
                          setSortType(e.target.value);
                          console.log("Selected Order: ", e.target.value);
                          if (autoApplyChanges) {
                            setAppliedFilters({
                              filterOption,
                              subOption,
                              amountThreshold,
                              showAboveThreshold,
                              showType,
                              sortType: e.target.value,
                            });
                          }
                        }}
                      />
                      降序
                    </label>
                  </div>
                </div>


                {/* Row for Checkbox and Textbox */}
                <div className="row">
                  <input
                    type="checkbox"
                    id="amount-checkbox"
                    checked={showAboveThreshold}
                    onChange={(e) => {
                      setShowAboveThreshold(e.target.checked);
                      if (autoApplyChanges) {
                        setAppliedFilters({
                          filterOption,
                          subOption,
                          amountThreshold,
                          showAboveThreshold: e.target.checked,
                          showType
                        });
                      }
                    }}
                    disabled={!amountThreshold || isNaN(amountThreshold)}
                    className="amount-checkbox"
                  />
                  <label htmlFor="amount-checkbox" className="inline-label">
                    仅显示金额超过
                  </label>
                  <input
                    type="text"
                    value={amountThreshold}
                    onChange={(e) => {
                      setAmountThreshold(e.target.value);
                      if (autoApplyChanges) {
                        setAppliedFilters({
                          filterOption,
                          subOption,
                          amountThreshold: e.target.value,
                          showAboveThreshold,
                          showType
                        });
                      }
                    }}
                    placeholder="金额"
                    className="amount-input"
                  />
                  <label>块</label>
                </div>

                

              </div>

              {/* Row for "直接显示" */}
              <div className="row">
                  <input
                    type="checkbox"
                    id="auto-apply-checkbox"
                    checked={autoApplyChanges}
                    onChange={(e) => {
                      setAutoApplyChanges(e.target.checked);
                      if (e.target.checked) {
                        setAppliedFilters({ filterOption, amountThreshold, showAboveThreshold });
                      }
                    }}
                    className="auto-apply-checkbox"
                    disabled
                  />
                  <label htmlFor="auto-apply-checkbox" className="inline-label">
                    直接显示
                  </label>
              </div>
              

              {/* 保存退出按钮 */}
              <div className="dialog-actions">
                {!autoApplyChanges && (
                  <button className="save-btn" onClick={handleSaveFilters}>
                    保存
                  </button>
                )}
                <button
                  className="exit-btn"
                  onClick={() => setSortDialogVisible(false)}
                >
                  退出
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Display Section */}
      <div className="expense-display">
        {/* Table Header */}
        <div className="table-header">
          <div>编号</div>
          <div>类别</div>
          <div>日期</div>
          <div>金额</div>
          <div>描述</div>
          <div>操作</div>
        </div>

        {/* Expense Rows */}
        <div className="table-body">
          {filterExpenses().map((expense, index) => (
            <div className="table-row" key={index}>
              {/* Hide index for Category sum */}
              <div>
                {appliedFilters.showType === "Category sum" || appliedFilters.showType === "List all Category Expenses" 
                  ? "" 
                  : (index + 1)}
              </div>
              <div 
                style={{
                  ...(
                    appliedFilters.showType === "List all Category Expenses" && expense.actions == null 
                    ? { overflow: "visible", fontWeight: "bold", fontSize: "25px" } 
                    : {}
                  ),
                  color: (
                    expense.category && // Ensure category is defined
                    (expense.category.startsWith("总共消费") || expense.category.startsWith("Total Expenses"))
                  ) ? "red" : ""
                }}
              >
                {categoriesTranslation[expense.category]||expense.category}
              </div>


              <div>{expense.date}</div>

              {/* Only show amount if it's not the empty rows */}
              <div>
                {(appliedFilters.showType === "List all Category Expenses" && expense.actions !== null && categories.includes(expense.category)) || (expense.category !== "" && appliedFilters.showType === "Category sum")||(appliedFilters.showType === "List all Expenses by Date")||(appliedFilters.filterOption === "显示全部")
                  ? `$${expense.amount}` 
                  : ("")}
              </div>



              <div>{expense.description}</div>
              <div>
              {expense.actions !== null && (
                <>
                  <button className="action-btn" onClick={() => handleModifyClick(expense)}>
                    修改
                  </button>
                  <button className="action-btn" onClick={() => handleDeleteClick(expense)}>
                    删除
                  </button>
                </>
              )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="popups_modify_delete">
        {/* Modify Dialog */}
        {isModifyDialogVisible && selectedExpense && (
          <div className="modal-overlay">
            <div className="modal-dialog">
              <h3>修改支出</h3>
              <p>
                确认要修改支出吗？（编号：{selectedExpense.id}）
              </p>
              
              <div className="form-group">
                <label>类别</label>
                <select
                  id="category_select"
                  defaultValue={selectedExpense.category} // Set the default value here
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>日期</label>
                <input
                  id="date_input"
                  type="date"
                  defaultValue={selectedExpense.date} // Set the default value here
                />
              </div>

              <div className="form-group">
                <label>金额</label>
                <input
                  id="amount_input"
                  type="text"
                  defaultValue={selectedExpense.amount} // Set the default value here
                />
              </div>

              <div className="form-group">
                <label>描述</label>
                <textarea
                  id="description_input"
                  defaultValue={selectedExpense.description} // Set the default value here
                />
              </div>

              <div className="dialog-actions">
                <button
                  className="confirm-btn"
                  onClick={handleSaveChanges} // Only save when clicked
                >
                  保存
              </button>
                <button className="exit-btn" onClick={closeDialogs}>
                  退出
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Delete Dialog */}
        {isDeleteDialogVisible && selectedExpense && (
          <div className="modal-overlay">
            <div className="modal-dialog">
              <h3>删除支出</h3>
              <p>
                确认要删除支出吗？（编号：{selectedExpense.id} 类别：
                {selectedExpense.category} 日期：{selectedExpense.date} 金额：
                {selectedExpense.amount} 描述：{selectedExpense.description}）
              </p>
              <div className="dialog-actions">
                <button 
                  className="confirm-btn" 
                  onClick={() => {
                    // Call deleteExpense function
                    deleteExpense(selectedExpense); // Pass selectedIncome or selectedExpense, depending on the context

                    // Close the dialog after the income has been deleted
                    closeDialogs();
                  }}
                >
                  确认
                </button>
                <button className="exit-btn" onClick={closeDialogs}>
                  退出
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};


const ShowIncomePage = () => {  
  const { data, updateIncome,deleteIncome } = useContext(DataContext); // Access global data and updater

  // 暂存 States: May contain clicked but not saved (means we don't want)
  const [filterOption, setFilterOption] = useState(""); // Combo box value, default all will be set in a usestate hook below somewhere, above return
  const [subOption, setSubOption] = useState(""); // Sub combo box value
  const [amountThreshold, setAmountThreshold] = useState(""); // Text box value
  const [showAboveThreshold, setShowAboveThreshold] = useState(false); // Checkbox value
  const [sortType,setSortType] = useState("")
  const [showType, setShowType] = useState(""); // Display type combo box value


  const [isSortDialogVisible, setSortDialogVisible] = useState(false); // Dialog visibility
  const [isModifyDialogVisible, setModifyDialogVisible] = useState(false);
  const [isDeleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState(null);

  const handleModifyClick = (income) => {    
    setSelectedIncome(income);
    setModifyDialogVisible(true);
  };

  const handleDeleteClick = (income) => {
    setSelectedIncome(income);
    setDeleteDialogVisible(true);
  };

  const closeDialogs = () => {
    setModifyDialogVisible(false);
    setDeleteDialogVisible(false);
    setSelectedIncome(null);
  };
  
  // the saved state, state we actually want and render
  const [appliedFilters, setAppliedFilters] = useState({
    filterOption: "",
    subOption: "",
    amountThreshold: "",
    showAboveThreshold: false,
    showType: ""
  });

  const years = [...new Set(data.income.map(income => new Date(income.date).getFullYear()))];

  // Use localStorage value as initial state
  const [autoApplyChanges, setAutoApplyChanges] = useState(() => {
    const storedAutoApply = localStorage.getItem("autoApplyChanges");
    return storedAutoApply !== null ? JSON.parse(storedAutoApply) : false;
  });

  // Save the state of "直接显示" to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("autoApplyChanges", JSON.stringify(autoApplyChanges));
  }, [autoApplyChanges]);


  const filterIncome = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const {
        filterOption,
        subOption,
        amountThreshold,
        showAboveThreshold,
        showType,
        sortType
    } = appliedFilters;

    let title = "总收入";

    // Helper function to calculate the date range for "前3个月", "前6个月", or "前12个月"
    const calculateDateRange = (monthsToSubtract) => {
        const startDate = new Date(now);
        startDate.setMonth(now.getMonth() - monthsToSubtract);
        
        const startDateString = `${startDate.getMonth() + 1}/${startDate.getDate()}/${startDate.getFullYear()}`;
        const endDateString = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
        
        return `${startDateString} - ${endDateString}`;
    };

    // Helper function to check if an income date is within the target range
    const isDateInRange = (incomeDate) => {
        const incomeYear = parseInt(incomeDate.substring(0, 4), 10);
        const incomeMonth = parseInt(incomeDate.substring(5, 7), 10) - 1;

        if (filterOption === "按月显示") {
            const monthMapping = {
                一月: 0,
                二月: 1,
                三月: 2,
                四月: 3,
                五月: 4,
                六月: 5,
                七月: 6,
                八月: 7,
                九月: 8,
                十月: 9,
                十一月: 10,
                十二月: 11,
            };
            return incomeYear === currentYear && incomeMonth === monthMapping[subOption];
        } else if (filterOption === "按季度显示") {
            const quarterMapping = {
                Q1: [0, 1, 2],
                Q2: [3, 4, 5],
                Q3: [6, 7, 8],
                Q4: [9, 10, 11],
            };
            return incomeYear === currentYear && quarterMapping[subOption]?.includes(incomeMonth);
        } else if (filterOption === "按年份显示") {
            return incomeYear === parseInt(subOption, 10);
        } else if (filterOption === "前3个月" || filterOption === "前12个月" || filterOption === "前6个月") {
            const monthsToSubtract = filterOption === "前3个月" ? 3 
                                    : filterOption === "前6个月" ? 6 
                                    : 12;
            const targetDate = new Date();
            targetDate.setMonth(now.getMonth() - monthsToSubtract);

            const incomeDateObj = new Date(incomeDate);
            return incomeDateObj >= targetDate && incomeDateObj <= now;
        }
        return true; // Default: include all
    };

    // Calculate the title based on the filter options
    if (filterOption === "显示全部") {
        title = "全部记录的收入";
    } else if (filterOption === "按月显示" || filterOption === "按季度显示" || filterOption === "按年份显示") {
        title = `${subOption} 总收入`;
    } else if (filterOption === "前3个月" || filterOption === "前6个月" || filterOption === "前12个月") {
        const dateRange = calculateDateRange(
            filterOption === "前3个月" ? 3 : (filterOption === "前6个月" ? 6 : 12)
        );
        title = `${dateRange} 总收入`;
    }

    // Filter incomes based on date range and thresholds
    const filteredIncomes = data.income
      .filter((income) => {
          let include = true;

          const incomeDate = income.date;

          // Apply date range filter
          include = include && isDateInRange(incomeDate);

          // Filter by amountThreshold if applicable
          if (showAboveThreshold && amountThreshold) {
              include = include && parseFloat(income.amount) > parseFloat(amountThreshold);
          }

          return include;
      })
      .sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return sortType === "ascending" ? dateA - dateB : dateB - dateA;
      });

    // Calculate total after-tax income
    const totalAfterTax = filteredIncomes.reduce((sum, income) => {
        return sum + parseFloat(income.after_tax || 0);
    }, 0).toFixed(2);

    // Add the title row with the total after-tax income
    const titleRow = {
        date: `${title}: $${totalAfterTax}`,  // Append the total amount to the title
        before_tax: null,
        after_tax: null,
        description: null,
        tax_percentage: null,
        id: null,
        actions: "none",  // Add actions as "none"
    };

    // Return the updated array with the title row at the top
    return [titleRow, ...filteredIncomes];
};



  useEffect(() => {
    console.log("filterOption updated:", filterOption);
  }, [filterOption]);
  
  useEffect(() => {
    console.log("subOption updated:", subOption);
  }, [subOption]);
  
  useEffect(() => {
    console.log("appliedFilters updated:", appliedFilters);
  }, [appliedFilters]);
  
  useEffect(() => {
    console.log("isModifyDialogVisible updated:", isModifyDialogVisible);
  }, [isModifyDialogVisible]);
  
  useEffect(() => {
    console.log("isDeleteDialogVisible updated:", isDeleteDialogVisible);
  }, [isDeleteDialogVisible]);
  
  useEffect(() => {
    console.log("selectedIncome updated:", selectedIncome);
  }, [selectedIncome]);
  

  const handleSaveFilters = () => {
    // put 暂存 state into ready to render state
    const filtersToSave = {
      filterOption:filterOption,
      subOption:subOption,
      amountThreshold:amountThreshold,
      showAboveThreshold:showAboveThreshold,
      showType:showType,
      sortType:sortType
    };
    setAppliedFilters(filtersToSave);
    setSortDialogVisible(false); // Close the modal

    // Save to local storage
    localStorage.setItem("incomeFilters", JSON.stringify(filtersToSave));
    console.log("Filters saved to local storage:", filtersToSave);
  };

  // Load filters from local storage on page load
  useEffect(() => {
    const savedFilters = localStorage.getItem("incomeFilters");

    if (savedFilters) {
      const parsedFilters = JSON.parse(savedFilters);
      console.log("Loaded filters from local storage:", parsedFilters);

      // only this DOES NOT WORK because filterIncomes does not use these directly, but therefore updating these individual one will not trigger react reload. filterIncomes uses only setAppliedFilters directly ,therefore when executing until here, will trigger reload
      // Update state with loaded filters
      setFilterOption(parsedFilters.filterOption || "");
      setSubOption(parsedFilters.subOption || "");
      setAmountThreshold(parsedFilters.amountThreshold || 0);
      setShowAboveThreshold(parsedFilters.showAboveThreshold ?? false);
      setShowType(parsedFilters.showType || "");
      setSortType(parsedFilters.sortType || "ascending");

      // need this
      const filtersToSave = {
        filterOption:parsedFilters.filterOption || "",
        subOption:parsedFilters.subOption || "",
        amountThreshold:parsedFilters.amountThreshold || 0,
        showAboveThreshold:parsedFilters.showAboveThreshold ?? false,
        showType:parsedFilters.showType || "",
        sortType:parsedFilters.sortType || "ascending"
      };
      setAppliedFilters(filtersToSave);
    }else{
      // default


      // set states
      setFilterOption( "显示全部");
      setSubOption("");
      setAmountThreshold(0);
      setShowAboveThreshold(false);
      setShowType("");
      setSortType("ascending");

      // set obj of states (filterIncomes called cuz of this)
      const filtersToSave = {
        filterOption:"显示全部",
        subOption:"",
        amountThreshold: 0,
        showAboveThreshold:false,
        showType: "",
        sortType:"ascending"
      };
      setAppliedFilters(filtersToSave);
    }
  }, []); // Empty dependency array ensures it runs only on the first render

  


  // Only when "Save" is clicked, update selectedIncome
  const handleSaveChanges = () => {
    // Find the original selected income (in case we need to compare)
    const original = {
      ...data.income.find(item => item.id === selectedIncome.id)
    };
    
    // Prepare the updated selectedIncome by pulling values from inputs
    const updatedIncome = {
      ...selectedIncome,
      before_tax: document.getElementById("before_tax_input").value,
      after_tax: document.getElementById("after_tax_input").value,
      date: document.getElementById("date_input").value,
      description: document.getElementById("description_input").value
    };
    
    const modifiedFields = [];
    let updateTaxPercentage = false;

    // Check for modifications
    if (updatedIncome.before_tax !== original.before_tax) {
      modifiedFields.push(`税前: ${original.before_tax} to ${updatedIncome.before_tax}`);
      updateTaxPercentage = true;
    }
    if (updatedIncome.after_tax !== original.after_tax) {
      modifiedFields.push(`税后: ${original.after_tax} to ${updatedIncome.after_tax}`);
      updateTaxPercentage = true;
    }
    if (updatedIncome.date !== original.date) {
      modifiedFields.push(`日期: ${original.date} to ${updatedIncome.date}`);
    }
    if (updatedIncome.description !== original.description) {
      modifiedFields.push(`描述: ${original.description} to ${updatedIncome.description}`);
    }

    if (modifiedFields.length > 0 || updateTaxPercentage) {
      console.log("Modified fields: ", modifiedFields.join(", "));
      if (updateTaxPercentage) {
        updatedIncome.tax_percentage = ((updatedIncome.before_tax - updatedIncome.after_tax) / updatedIncome.before_tax) * 100;
      }

      // Update the global income data
      updateIncome(updatedIncome);
    } else {
      console.log("No modifications made.");
    }

    // Close dialogs after saving
    closeDialogs();
  };
  
  return (
    <div className="modify-income-container">
      {/* Header Section */}
      <div className="modify-income-header">
        <div className="header-left">
          <h2>收入明细</h2>
        </div>
        <div className="header-right">
        <button
            className="sort-btn"
            onClick={() => setSortDialogVisible(true)}
          >
            排序
          </button>
          <Link to="/">
            <button className="exit-btn">退出</button>
          </Link>
        </div>
      </div>

      {/* Sort Dialog */}
      {isSortDialogVisible && (
        <div className="modal-overlay">
          <div className="sort-dialog">
            <div className="dialog-content">
              <h3>排序选项</h3>

              {/* 各种选项 */}
              <div className="dialog-body">
                {/* Row for Time Range */}
                <div className="row">
                  <label htmlFor="filter-combo" className="inline-label">
                    时间范围
                  </label>
                  <select
                    id="filter-combo"
                    value={filterOption}
                    onChange={(e) => {
                      const newFilterOption = e.target.value;
                      setFilterOption(newFilterOption);

                      // Update `subOption` etc with a default based on the new `filterOption`
                      // no need to update sortType since if unclicked default ascending, exactly which default radio is, once click desc, state updates.
                      if (newFilterOption == "按月显示") {
                        setSubOption("一月"); // Default to "一月" for months, backend ONLY
                        setShowType("Category sum")
                      } else if (newFilterOption == "按季度显示") {
                        setSubOption("Q1"); // Default to "Q1" for quarters
                        setShowType("Category sum")
                      } else if (newFilterOption == "按年份显示") {
                        setSubOption(years[0]?.toString() || ""); // Default to the first year or empty
                        setShowType("Category sum")
                      }else if(newFilterOption == "前3个月" ||newFilterOption == "前12个月"||newFilterOption == "前6个月" ){
                        setSubOption("");
                        setShowType("Category sum")
                      } else {
                        setSubOption(""); // Clear `subOption` for other cases
                        setShowType("")
                      }

                      if (autoApplyChanges) {
                        setAppliedFilters({
                          filterOption: newFilterOption,
                          subOption: subOption, // Update this to reflect the new `subOption`
                          amountThreshold,
                          showAboveThreshold,
                          showType
                        });
                      }
                    }}
                    className="filter-combo"
                  >
                    <option value="显示全部">显示全部</option>
                    <option value="按月显示">按月显示</option>
                    <option value="按季度显示">按季度显示</option>
                    <option value="按年份显示">按年份显示</option>
                    <option value="前3个月">前3个月</option>
                    <option value="前12个月">前12个月</option>
                    <option value="前6个月">前6个月</option>
                  </select>

                </div>
                

                {/* Sub Option for Time Range */}
                <div className="row">
                  <label htmlFor="sub-option-combo" className="inline-label">
                    子选项
                  </label>
                  <select
                    id="sub-option-combo"
                    value={subOption}
                    onChange={(e) => {
                      setSubOption(e.target.value);
                      if (autoApplyChanges) {
                        setAppliedFilters({
                          filterOption,
                          subOption: e.target.value,
                          amountThreshold,
                          showAboveThreshold,
                          showType
                        });
                      }
                    }}
                    className="filter-combo"
                    disabled={filterOption == "前3个月" || filterOption == "前12个月" || filterOption == "前6个月"|| filterOption == "显示全部"}
                  >
                    {filterOption == "按月显示" && (
                      <>
                        <option value="一月">一月</option>
                        <option value="二月">二月</option>
                        <option value="三月">三月</option>
                        <option value="四月">四月</option>
                        <option value="五月">五月</option>
                        <option value="六月">六月</option>
                        <option value="七月">七月</option>
                        <option value="八月">八月</option>
                        <option value="九月">九月</option>
                        <option value="十月">十月</option>
                        <option value="十一月">十一月</option>
                        <option value="十二月">十二月</option>
                      </>
                    )}
                    {filterOption == "按季度显示" && (
                      <>
                        <option value="Q1">Q1</option>
                        <option value="Q2">Q2</option>
                        <option value="Q3">Q3</option>
                        <option value="Q4">Q4</option>
                      </>
                    )}
                    {filterOption == "按年份显示" && years.map((year) => (
                      <option value={year} key={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Row for Show Type */}
                <div className="row">
                  <label htmlFor="show-type-combo" className="inline-label">
                    显示类型
                  </label>
                  <select
                    id="show-type-combo"
                    value={showType}
                    onChange={(e) => {
                      setShowType(e.target.value);
                      if (autoApplyChanges) {
                        setAppliedFilters({
                          filterOption,
                          subOption,
                          amountThreshold,
                          showAboveThreshold,
                          showType: e.target.value
                        });
                      }
                    }}
                    className="filter-combo"
                    disabled={filterOption == "显示全部"}
                  >
                    {filterOption !="显示全部" && (
                      <>
                      <option value="List all income by Date">按日期列出所有收入</option>
                      </>
                    )}
                    
                  </select>
                </div>

                {/* Row for Sort Type */}
                <div className="row">
                  <label className="inline-label">显示类型</label>

                  <div>
                    <label style={{ display: "inline-flex", alignItems: "center", marginRight: "10px" }}>
                      <input
                        type="radio"
                        name="sortType"
                        style={{ height: "20px", width: "20px", marginRight: "5px" }}
                        value="ascending"
                        checked={sortType === "ascending"}
                        onChange={(e) => {
                          setSortType(e.target.value);
                          console.log("Selected Order: ", e.target.value);
                          if (autoApplyChanges) {
                            setAppliedFilters({
                              filterOption,
                              subOption,
                              amountThreshold,
                              showAboveThreshold,
                              showType,
                              sortType: e.target.value,
                            });
                          }
                        }}
                      />
                      升序
                    </label>

                    <label style={{ display: "inline-flex", alignItems: "center", marginRight: "10px" }}>
                      <input
                        type="radio"
                        name="sortType"
                        value="descending"
                        style={{ height: "20px", width: "20px", marginRight: "5px" }}
                        checked={sortType === "descending"}
                        onChange={(e) => {
                          setSortType(e.target.value);
                          console.log("Selected Order: ", e.target.value);
                          if (autoApplyChanges) {
                            setAppliedFilters({
                              filterOption,
                              subOption,
                              amountThreshold,
                              showAboveThreshold,
                              showType,
                              sortType: e.target.value,
                            });
                          }
                        }}
                      />
                      降序
                    </label>
                  </div>
                </div>


                {/* Row for Checkbox and Textbox */}
                <div className="row">
                  <input
                    type="checkbox"
                    id="amount-checkbox"
                    checked={showAboveThreshold}
                    onChange={(e) => {
                      setShowAboveThreshold(e.target.checked);
                      if (autoApplyChanges) {
                        setAppliedFilters({
                          filterOption,
                          subOption,
                          amountThreshold,
                          showAboveThreshold: e.target.checked,
                          showType
                        });
                      }
                    }}
                    disabled={!amountThreshold || isNaN(amountThreshold)}
                    className="amount-checkbox"
                  />
                  <label htmlFor="amount-checkbox" className="inline-label">
                    仅显示金额超过
                  </label>
                  <input
                    type="text"
                    value={amountThreshold}
                    onChange={(e) => {
                      setAmountThreshold(e.target.value);
                      if (autoApplyChanges) {
                        setAppliedFilters({
                          filterOption,
                          subOption,
                          amountThreshold: e.target.value,
                          showAboveThreshold,
                          showType
                        });
                      }
                    }}
                    placeholder="金额"
                    className="amount-input"
                  />
                  <label>块</label>
                </div>

                

              </div>

              {/* Row for "直接显示" */}
              <div className="row">
                  <input
                    type="checkbox"
                    id="auto-apply-checkbox"
                    checked={autoApplyChanges}
                    onChange={(e) => {
                      setAutoApplyChanges(e.target.checked);
                      if (e.target.checked) {
                        setAppliedFilters({ filterOption, amountThreshold, showAboveThreshold });
                      }
                    }}
                    className="auto-apply-checkbox"
                    disabled
                  />
                  <label htmlFor="auto-apply-checkbox" className="inline-label">
                    直接显示
                  </label>
              </div>
              

              {/* 保存退出按钮 */}
              <div className="dialog-actions">
                {!autoApplyChanges && (
                  <button className="save-btn" onClick={handleSaveFilters}>
                    保存
                  </button>
                )}
                <button
                  className="exit-btn"
                  onClick={() => setSortDialogVisible(false)}
                >
                  退出
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Income Display Section */}
      <div className="income-display">
        {/* Table Header */}
        <div className="table-header">
          <div>编号</div>
          <div>日期</div>
          <div>税前 金额</div>
          <div>税后 金额</div>
          <div>税百分比</div>
          <div>注释</div>
          <div>操作</div>
        </div>

        {/* Income Rows */}
        <div className="table-body">
          {filterIncome().map((income, index) => (
            <div className="table-row" key={index}>
              {/* Show index only if actions is not "none" */}
              <div>{income.actions !== "none" ? index : ""}</div> {/* Adjust index calculation */}

              {/* Title Row (Date) with custom styles only if actions is "none" */}
              <div
                style={{
                  ...(income.actions === "none" && {
                    overflow: "visible",
                    fontWeight: "bold",
                    fontSize: "25px",
                  }),
                }}
              >
                {income.actions === "none" && income.date && income.date.includes("$") ? (
                  <>
                    <span style={{ color: "red" }}>
                      {income.date.split("$")[0]} {/* Text before the dollar sign */}
                    </span>
                    <span style={{ color: "green" }}>
                      {"$" + income.date.split("$")[1]} {/* Text including and after the dollar sign */}
                    </span>
                  </>
                ) : (
                  // Apply only the red color if actions is not "none"
                  <span style={{ color: income.actions === "none" ? "red" : "inherit" }}>
                    {income.date}
                  </span>
                )}
              </div>



              {/* Display empty rows for all other fields if actions is "none" */}
              <div>{income.actions === "none" ? "" : `$${income.before_tax}`}</div>
              <div>{income.actions === "none" ? "" : `$${income.after_tax}`}</div>
              <div>{income.actions === "none" ? "" : (Math.ceil(income.tax_percentage * 100) / 100).toFixed(2) + "%"}</div>
              <div>{income.actions === "none" ? "" : income.description}</div>

              <div>
                {income.actions !== "none" && (
                  <>
                    <button className="action-btn" onClick={() => handleModifyClick(income)}>
                      修改
                    </button>
                    <button className="action-btn" onClick={() => handleDeleteClick(income)}>
                      删除
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>



      </div>

      <div className="popups_modify_delete">
        {/* Modify Dialog */}
        {isModifyDialogVisible && selectedIncome && (
          <div className="modal-overlay">
            <div className="modal-dialog">
              <h3>修改收入</h3>
              <p>
                确认要修改收入吗？（编号：{selectedIncome.id}）
              </p>
              

              <div className="form-group">
                <label>日期</label>
                <input
                  id="date_input"
                  type="date"
                  defaultValue={selectedIncome.date}
                />
              </div>

              <div className="form-group">
                <label>税前 金额</label>
                <input
                  id="before_tax_input"
                  type="text"
                  defaultValue={selectedIncome.before_tax}
                />
              </div>

              <div className="form-group">
                <label>税后 金额</label>
                <input
                  id="after_tax_input"
                  type="text"
                  defaultValue={selectedIncome.after_tax}
                />
              </div>

              <div className="form-group">
                <label>描述</label>
                <textarea
                  id="description_input"
                  defaultValue={selectedIncome.description}
                />
              </div>

              <div className="dialog-actions">
              <button
                className="confirm-btn"
                onClick={handleSaveChanges} // Only save when clicked
              >
                保存
              </button>
                <button className="exit-btn" onClick={closeDialogs}>
                  退出
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Delete Dialog */}
        {isDeleteDialogVisible && selectedIncome && (
          <div className="modal-overlay">
            <div className="modal-dialog">
              <h3>删除收入</h3>
              <p>
                确认要删除收入吗？（编号：{selectedIncome.id} 
                税前 金额：{selectedIncome.before_tax}
                税后 金额：{selectedIncome.after_tax}
                日期：{selectedIncome.date} 
                描述：{selectedIncome.description}）
              </p>
              <div className="dialog-actions">
              <button 
                className="confirm-btn" 
                onClick={() => {
                  // Call deleteIncome function
                  deleteIncome(selectedIncome); // Pass selectedIncome or selectedExpense, depending on the context

                  // Close the dialog after the income has been deleted
                  closeDialogs();
                }}
              >
                确认
              </button>

                <button className="exit-btn" onClick={closeDialogs}>
                  退出
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};


// Create a Context for the global data
export const DataContext = createContext();

const App = () => {
  const [data, setData] = useState({ expenses: [], income: [] }); // Initial state

  // Fetch and initialize data
  useEffect(() => {
    fetch("/data.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        return response.json();
      })
      .then((jsonData) => {
        const sortedData = {
          ...jsonData,
          expenses: jsonData.expenses.sort((a, b) => new Date(a.date) - new Date(b.date)),
          income: jsonData.income.sort((a, b) => new Date(a.date) - new Date(b.date)),
        };
        setData(sortedData); // Update state with sorted data
      })
      .catch((error) => {
        console.error("Error fetching the JSON data:", error);
      });
  }, []);
  // Call loadCategoriesData when the component mounts
  useEffect(() => {
    loadCategoriesData(); // This will fetch and load the categories into global variables
  }, []); // Empty dependency array ensures it runs only once after mount

  const addExpense = (newExpense) => {
    const requestId = uuidv4(); // Generate a unique request ID
  
    setData((prevData) => {
      const updatedExpenses = [...prevData.expenses, newExpense]; // Append new expense
  
      // Save updated expenses to the backend
      fetch("http://localhost:5001/api/update-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses: updatedExpenses, requestId }), // Include the requestId
      })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to update expenses");
          console.log("Expenses updated successfully on the server.");
        })
        .catch((error) => console.error("Error updating expenses:", error));
  
      return { ...prevData, expenses: updatedExpenses };
    });
  };
  const updateExpense = (updatedExpense) => {
    const requestId = uuidv4(); // Generate a unique request ID
    const { id, category, description, amount, date } = updatedExpense; // Destructure the expense attributes
  
    setData((prevData) => {
      // Find the index of the expense to update
      const expenseIndex = prevData.expenses.findIndex((expense) => expense.id === id);
  
      if (expenseIndex !== -1) {
        // Update the expense in the array
        const updatedExpenses = [...prevData.expenses];
        updatedExpenses[expenseIndex] = {
          ...updatedExpenses[expenseIndex], // Retain the old values that are not being updated
          category,
          description,
          amount,
          date,
        };
  
        // Save updated expenses to the backend (or save it to a file if needed)
        fetch("http://localhost:5001/api/update-expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expenses: updatedExpenses,requestId }),
        })
          .then((response) => {
            if (!response.ok) throw new Error("Failed to update expenses");
            console.log("Expense updated successfully on the server.");
          })
          .catch((error) => console.error("Error updating expense:", error));
  
        return { ...prevData, expenses: updatedExpenses };
      } else {
        console.error("Expense not found with the provided ID:", id);
        return prevData; // Return the data as is if no expense with the given ID is found
      }
    });
  };


  // add income function
  const addIncome = (newIncome) => {
    const requestId = uuidv4(); // Generate a unique request ID

    setData((prevData) => {
      const updatedIncome = [...prevData.income, newIncome]; // Append new income

      // Save updated income to the backend
      fetch("http://localhost:5001/api/update-income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ income: updatedIncome, requestId }), // Include the requestId
      })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to update income");
          console.log("Income updated successfully on the server.");
        })
        .catch((error) => console.error("Error updating income:", error));

      return { ...prevData, income: updatedIncome };
    });
  };
  const updateIncome = (updatedIncome) => {
    const requestId = uuidv4(); // Generate a unique request ID
    const { id, before_tax,after_tax,tax_percentage, description, date } = updatedIncome; // Destructure the expense attributes
  
    setData((prevData) => {
      // Find the index of the income to update
      const incomeIndex = prevData.income.findIndex((income) => income.id === id);
  
      if (incomeIndex !== -1) {
        // Update the income in the array
        const updatedIncome = [...prevData.income];
        updatedIncome[incomeIndex] = {
          ...updatedIncome[incomeIndex], // Retain the old values that are not being updated
          before_tax,
          after_tax,
          description,
          tax_percentage,
          date,
        };
  
        // Save updated expenses to the backend (or save it to a file if needed)
        fetch("http://localhost:5001/api/update-income", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ income: updatedIncome,requestId }),
        })
          .then((response) => {
            if (!response.ok) throw new Error("Failed to update expenses");
            console.log("Expense updated successfully on the server.");
          })
          .catch((error) => console.error("Error updating expense:", error));
  
        return { ...prevData, income: updatedIncome };
      } else {
        console.error("Expense not found with the provided ID:", id);
        return prevData; // Return the data as is if no expense with the given ID is found
      }
    });
  };

  const deleteIncome = (IncomeToDelete) => {
    const requestId = uuidv4(); // Generate a unique request ID
    const { id } = IncomeToDelete; // Extract the income ID to identify which one to delete
    
    setData((prevData) => {
      // Filter out the income that needs to be deleted based on its ID
      const updatedIncome = prevData.income.filter((income) => income.id !== id);
      
      // Send the updated income list to the backend
      fetch("http://localhost:5001/api/update-income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ income: updatedIncome, requestId }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to delete income");
          console.log("Income deleted successfully on the server.");
        })
        .catch((error) => console.error("Error deleting income:", error));
  
      // Return the updated state with the income removed
      return { ...prevData, income: updatedIncome };
    });
  };
  const deleteExpense = (ExpenseToDelete) => {
    const requestId = uuidv4(); // Generate a unique request ID
    const { id } = ExpenseToDelete; // Extract the income ID to identify which one to delete
    
    setData((prevData) => {
      // Filter out the expense that needs to be deleted based on its ID
      const updatedExpenses = prevData.expenses.filter((expense) => expense.id !== id);
      
      // Send the updated expense list to the backend
      fetch("http://localhost:5001/api/update-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses: updatedExpenses, requestId }),
      })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to delete expense");
          console.log("Expense deleted successfully on the server.");
        })
        .catch((error) => console.error("Error deleting expense:", error));
  
      // Return the updated state with the income removed
      return { ...prevData, expenses: updatedExpenses };
    });
  };


  return (
    <DataContext.Provider value={{ data, addExpense, updateExpense, addIncome,updateIncome,deleteIncome,deleteExpense }}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/recordExpense" element={<RecordExpensePage />} />
          <Route path="/recordIncome" element={<RecordIncomePage />} />

          <Route path="/showExpense" element={<ShowExpensePage />} />
          <Route path="/showIncome" element={<ShowIncomePage />} />
        </Routes>
      </Router>
    </DataContext.Provider>
  );
};



export default App;
