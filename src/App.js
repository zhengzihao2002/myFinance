import React, { useState ,useEffect,createContext,useContext,useRef} from "react"; // Import useState
import { Chart } from "react-google-charts";
import { v4 as uuidv4 } from "uuid"; // Import UUID library
import { BrowserRouter as Router, Route, Routes, Link, useNavigate } from "react-router-dom";
import { Settings, LogOut } from "lucide-react"; // nice modern icons
import "./App.css";
import "./font.css"




// List of categories
let categories = [];
let categoriesTranslation = {};
let language = null;


// This function will load categories data from the JSON file
const loadCategoriesData = async () => {
  try {
    const response = await fetch('http://localhost:5001/api/get-categories');
    const data = await response.json();

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
    categories = ['Other'];
    categoriesTranslation = { Other: 'Other' };
  }
};



const timePeriods = ["按月显示", "按季显示", "按年显示", "前3个月"];
const months = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
const quarters = ["Q1", "Q2", "Q3", "Q4"];
const years = ["2023", "2024"];
const displayTypes = ["Category Sum", "List all Category Expenses", "List all Expenses by Date"];


let positive = "#2fc977";

let negative = "#ff3714";

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
  const day = String(date.getDate()+1).padStart(2, '0');
  
  // Combine everything to form the id
  const id = `${year}${month}${day}_${hours}${minutes}${seconds}${milliseconds}`;
  return id;
}
function getLocalDateString() {
  const now = new Date();
  // Pad month and day to two digits
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
const changeLightMode = (newlightMode) => {
  console.log("CHANGED!");
  
  // store in local storage so it could be accessed in other pages
  localStorage.setItem("lightMode", newlightMode);
  
  if (newlightMode=="dark") {
    // Dark Mode
    document.body.style.backgroundColor = "rgba(28, 28, 30, 0.9)"; // Softer dark background

    document.querySelectorAll(".left-box, .right-box, .bottom-box, .flip-container .front, .flip-container .back").forEach(el => {
      el.style.backgroundColor = "rgba(119, 119, 119, 0.8)";
    });
    document.querySelectorAll('.homepage-container [class^="icon-button"] span').forEach(el => {
      el.style.color = "white";
    });
  } else {
    // Light Mode
    document.body.style.backgroundColor = "";
    document.querySelectorAll(".left-box, .right-box, .bottom-box, .flip-container .front, .flip-container .back").forEach(el => {
      el.style.backgroundColor = "#f8f8f8";
    });
    document.querySelectorAll('.homepage-container [class^="icon-button"] span').forEach(el => {
      el.style.color = "black";
    });
  }
};









const HomePage = () => {
  // Sound Effects
  useEffect(() => {
    fetch("http://localhost:5001/api/get-settings")
      .then((response) => response.json())
      .then((settings) => {
        if (settings.clickEffect) {
          const audio = new Audio(`/soundEffects/${settings.clickEffect}`);
          const handleClick = (e) => {
            if (e.button === 0) {
              audio.currentTime = 0;
              audio.play();
            }
          };
          document.addEventListener("click", handleClick);
          return () => document.removeEventListener("click", handleClick);
        }
      })
      .catch((error) => console.error("Error loading settings:", error));
  }, []);

  

  const { data,addExpense } = useContext(DataContext); // Access global expense data from context
  const [isModalOpenCategory, setIsModalOpenCategory] = useState(false);
  const [modalContentCategory, setModalContentCategory] = useState("");
  const [isModalOpenOther, setIsModalOpenOther] = useState(false);
  const [modalContentOther, setModalContentOther] = useState("");
  const [isModalOpenMiscellaneous, setIsModalOpenMiscellaneous] = useState(false);
  const [modalContentMiscellaneous, setModalContentMiscellaneous] = useState("");
  const [maskNumbers, setMaskNumbers] = useState(() => {
    const stored = localStorage.getItem("maskNumbers");
    const lastChanged = localStorage.getItem("maskNumbersLastChanged");
    // If never set, default to true (masked)
    let value = stored === null ? true : stored === "true";
    // If unmasked, check if over 24 hours since last change
    if (value === false && lastChanged) {
      const now = Date.now();
      const diff = now - Number(lastChanged);
      if (diff > 24 * 60 * 60 * 1000) {
        // Over 24 hours, force mask
        localStorage.setItem("maskNumbers", "true");
        value = true;
      }
    }
    return value;
  });
  const [lightMode, setLightMode] = useState(
    // Read from local Storage once on mount
    ()=>{
      let initialMode =localStorage.getItem("lightMode") || "light"
      return initialMode;
    }
  );
  // Save Whenever light mode changes
  useEffect(() => {      
    changeLightMode(lightMode) // useEffect runs only after DOM is rendered, so the change will be applied after all things load
    localStorage.setItem("lightMode", lightMode);
  },[lightMode])
  useEffect(() => {
    setTimeout(() => {
      document.body.classList.remove("no-transition");
    }, 1);
  }, []); // Runs once after first render
  // Toggle function, triggered by button
  const toggleLightMode = () => {
    const newlightMode = lightMode === "light" ? "dark" : "light";
    setLightMode(newlightMode);
  };
  // When maskNumbers changes, update localStorage and lastChanged date
  const prevMaskNumbers = useRef(maskNumbers);
  useEffect(() => {
    localStorage.setItem("maskNumbers", maskNumbers);
    // Only update the timestamp if the value actually changed
    if (prevMaskNumbers.current !== maskNumbers) {
      localStorage.setItem("maskNumbersLastChanged", Date.now().toString());
      prevMaskNumbers.current = maskNumbers;
    }
  }, [maskNumbers]);

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
  const [chartError, setChartError] = useState(false);
  //reset error when chartData or options change
  const currentYear = new Date().getFullYear(); // Get the current year
  let options = {
    // title: timeRange,
    pieHole: 0.4, // Creates a Donut Chart. Does not do anything when is3D is enabled
    is3D: true, // Enables 3D view
    // pieStartAngle: 100, // Rotates the chart
    sliceVisibilityThreshold: 0.02, // Hides slices smaller than 0.1% (0.001)
    
    legend: {
      position: "right",
      alignment: "bottom",
      textStyle: {
        color: "#233238",
        fontSize: 22,
      },
    },
    tooltip: {
      // trigger: "selection", // Only show tooltip when a slice is clicked
      textStyle: {
        fontSize: 14, // Set your desired tooltip font size here
        color: "#233238", // Optional: tooltip text color
        bold: true, 
      },
      showColorCode: true, // Optional: show color box in tooltip
    },
    // colors: [
    //   "#4B5563", // Slate Gray
    //   "#2563EB", // Blue
    //   "#059669", // Emerald
    //   "#F59E42", // Amber
    //   "#D97706", // Orange
    //   "#A21CAF", // Purple
    //   "#DC2626", // Red
    //   "#0EA5E9", // Sky Blue
    //   "#7C3AED", // Violet
    //   "#F43F5E", // Rose
    //   "#10B981", // Green
    //   "#FBBF24", // Yellow
    // ],
    colors: [
      "#8AD1C2", // Mint
      "#9F8AD1", // Lavender
      "#D18A99", // Rose
      "#BCD18A", // Olive
      "#D1C28A", // Sand
      "#8AC6D1", // Light Teal
      "#8AAAD1", // Soft Blue
      "#D1A88A", // Peach
      "#A3D18A", // Light Green
      "#D18ABF", // Pinkish Lavender
      "#B1D18A", // Light Olive
      "#8AD1A0", // Light Mint
      "#D1B78A", // Tan
      "#8A98D1", // Periwinkle
      "#D18A8A", // Soft Coral
      "#A88AD1", // Soft Purple
      "#8AD1B8", // Aqua
      "#C2D18A", // Light Chartreuse
      "#8AD1C9", // Pale Cyan
      "#D18AC2", // Pastel Magenta
    ],
    backgroundColor: 'transparent', // Set the background color here
  };
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
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
      let monthMapping = null;
      if (subOption.includes("月")==true){
        monthMapping = {
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
      }else{
        monthMapping = {
          January: 0,
          February: 1,
          March: 2,
          April: 3,
          May: 4,
          June: 5,
          July: 6,
          August: 7,
          September: 8,
          October: 9,
          November: 10,
          December: 11,
        };
      }

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
        const response = await fetch("http://localhost:5001/api/get-total-checking")
        const data = await response.json();
        setTotalChecking(data.checking || 0);
      } catch (error) {
        console.error("Error fetching total checking:", error);
      }
    };
    fetchTotalChecking();
  }, []);


  // Fetch the recent transactions from recentTransactions.json
  useEffect(() => {
    const fetchRecentTransactions = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/get-checking-recent100")
        const data = await response.json();
        setLast100Transactions(data.recent100 || []);
      } catch (error) {
        console.error("Error fetching recent transactions:", error);
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
          body: JSON.stringify({ newTransaction,requestId }),
        });
  
        if (last100Response.ok) {
          alert("金额和交易记录更新成功");
          setTotalChecking(newTotal);
          setAdjustAmount(""); // Reset the input
          window.location.reload()
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
          window.location.reload(); // refresh for now
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
  function getMonthlyTotal(records, month,year) {  
    
    
    if (!records || !Array.isArray(records)) {  
        return 0;  
    }  

    var filteredRecords = records.filter(function(record) {          
        return Number(record.date.substring(5, 7)) === month && Number(record.date.substring(0, 4)) === year;  
    });  
    

    var total = filteredRecords.reduce(function(acc, record) {        
        return acc + (Number(record.amount) || Number(record.after_tax)||0);  
    }, 0);  
    
    return total;  
  }


  // Get current date (+1 cuz not index but actual month no)
  const now = new Date();
  const lastMonth = now.getMonth(); // 0-based: 0=Jan, 11=Dec
  const monthBeforeLast = lastMonth - 1 < 0 ? 11 : lastMonth - 1;
  
  
  const lastMonthYear = lastMonth === 0 ? currentYear - 1 : currentYear;
  const monthBeforeLastYear = lastMonth === 0 ? currentYear - 1 : (lastMonth - 1 < 0 ? currentYear - 1 : currentYear);
   


  // Calculate total expenses and income
  // lastMonth and monthBeforeLast are 0-based, but your function expects 1-based months
  const lastMonthExpenses = Number(getMonthlyTotal(data.expenses, lastMonth , lastMonthYear)) || 0;
  const prevMonthExpenses = Number(getMonthlyTotal(data.expenses, monthBeforeLast , monthBeforeLastYear)) || 0;
  const lastMonthIncome = Number(getMonthlyTotal(data.income, lastMonth , lastMonthYear)) || 0;
  const prevMonthIncome = Number(getMonthlyTotal(data.income, monthBeforeLast, monthBeforeLastYear)) || 0;

  console.log("上个月支出",data.expenses.filter(function(record) {          
        return Number(record.date.substring(5, 7)) === lastMonth && Number(record.date.substring(0, 4)) === lastMonthYear;  
    }));
  
  

  // Function to calculate percentage change
  const getChangeIndicator = (current, previous, isExpense = true) => {
    if (previous === 0) return <span style={{ color: "gray" }}> N/A </span>;
    const change = ((current - previous) / previous) * 100;
    const isIncrease = change > 0;
    const color = isExpense
      ? isIncrease
        ? negative
        : positive
      : isIncrease
      ? positive
      : negative;
    const arrow = isIncrease ? "↑" : "↓";
    const arrowClass = isIncrease ? "icon-arrow-up2" : "icon-arrow-down2";

    return (
      <span style={{ color, fontWeight: "bold",height: "31px",
                    lineHeight: "31px",display: "inline-block",
                    overflow: "hidden",}}>
        <span className={arrowClass} style={{height: "31px",lineHeight: "31px",display: "inline-block",  }}></span> {Math.abs(change).toFixed(1)}%
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

  function categoryTotals(records, month,year) {  
      var totals = {};  

      for (var i = 0; i < records.length; i++) {  
          var record = records[i];  
          var recordMonth = Number(record.date.substring(5,7));
          var recordyear = Number(record.date.substring(0,4));

          if (recordMonth === month && recordyear === year) {  
              if (!totals[record.category]) {  
                  totals[record.category] = 0;  
              }  
              totals[record.category] += Number(record.amount);  
          }  
      }  
      
      return totals;  
  }

  // Get category totals for last month and the month before
  var lastMonthCategories = categoryTotals(data.expenses, lastMonth,currentYear);  
  var prevMonthCategories = categoryTotals(data.expenses, monthBeforeLast,currentYear); 
  
  
  

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
      return <p className="panel_font_size" style={{ textAlign: "center", color: "gray" }}>未找到交易</p>;
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
    fetch("http://localhost:5001/api/get-settings")
      .then((response) => response.json())
      .then((data) => {
        setAnimationType(data.animationType || "flip"); // Default to flip
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


  const maskDollar = (str) => {
    if (!maskNumbers) return str;


    // return String(str).replace(/\$[0-9,.]+/g, (match) => {
    //   return "$" + "*".repeat(match.length - 1);
    // });


    if (!maskNumbers) return str;
    // Always output $*******.** (or whatever max length you want)
    // Count the length of the original string (excluding $)
    return "$" + "•".repeat(15);
  };
  




  const [activeTab, setActiveTab] = useState("add")

  const [showButtons, setShowButtons] = useState(true);
  let inactivityTimer = useRef(null);
  useEffect(() => {
    const handleMouseMove = () => {
      setShowButtons(true);

      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        setShowButtons(false);
      }, 6000); // 6 seconds
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(inactivityTimer.current);
    };
  }, []);



  // Prepay Execution:
  const [scheduledPrepays, setScheduledPrepays] = useState([]);
  let hasCheckedDue = false; // Prevent multiple executions
  // 🔁 Fetch all scheduled prepays from backend
  const fetchScheduledPrepays = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/get-prepay");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setScheduledPrepays(data || []);
      return data; // For reuse
    } catch (err) {
      console.error("Error loading scheduled prepays:", err);
      return [];
    }
  };
  // 🔔 On page load: check for due prepays and update if repeating
  useEffect(() => {
    if (totalChecking !== null) {
      const checkAndHandleDuePrepays = async () => {
        if (hasCheckedDue) return;
        hasCheckedDue = true;

        const data = await fetchScheduledPrepays();
        const today = new Date().toISOString().split("T")[0];
        let updated = false;

        for (const prepay of data) {
          if (prepay.date <= today) {
            // Step 1: Convert to real expense
            const formattedAmount = parseFloat(prepay.amount).toFixed(2);
            const id = createId(prepay.date);
            addExpense({
              category: prepay.category,
              amount: formattedAmount,
              description: prepay.description.replace('{MONTH}', new Date().toLocaleString('en-US', { month: 'long' }))+ " (Recurring)",
              date: prepay.date,
              id: id
            });
            
            
            handleAdjustAmountNonManual(id, "subtract", formattedAmount);

            // Step 2: Recurring vs Single-Time
            if (prepay.frequencyMode === "每") {
              // Parse as local time
              const [year, month, day] = prepay.date.split('-').map(Number);
              const current = new Date(year, month - 1, day);
              const next = new Date(current);

              switch (prepay.frequencyUnit) {
                case "天":
                  next.setDate(current.getDate() + parseInt(prepay.frequencyNumber));
                  break;
                case "周":
                  next.setDate(current.getDate() + 7 * parseInt(prepay.frequencyNumber));
                  break;
                case "月":
                  next.setMonth(current.getMonth() + parseInt(prepay.frequencyNumber));
                  break;
                case "年":
                  next.setFullYear(current.getFullYear() + parseInt(prepay.frequencyNumber));
                  break;
              }

              const yearStr = next.getFullYear();
              const monthStr = String(next.getMonth() + 1).padStart(2, '0');
              const dayStr = String(next.getDate()).padStart(2, '0');
              const nextDateStr = `${yearStr}-${monthStr}-${dayStr}`;

              // console.log(666666, prepay, next, nextDateStr);
              // alert(next);
              const res = await fetch("http://localhost:5001/api/update-prepay-date", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: prepay.id, newDate: nextDateStr }),
              });

              if (res.ok) updated = true;
            } else if (prepay.frequencyMode === "单次") {
              // Step 3: DELETE this prepay since it's a one-time
              const res = await fetch("http://localhost:5001/api/delete-prepay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: prepay.id })
              });

              if (res.ok) updated = true;
            }
          }

        }

        // Reload the page after updates are made
      if (updated) {
        window.location.reload();  // This will reload the page
      }

      };

      checkAndHandleDuePrepays();
      }
  }, [totalChecking]); // This ensures the function will run when totalChecking is updated

 
  const handleAdjustAmountNonManual = async (id,adjustType,adjustAmount) => {
    // This is the function that is from hompage load prepay, which does not show manual add/subtract
    const adjustment = adjustType === "add" ? parseFloat(parseFloat(adjustAmount).toFixed(2)) : -parseFloat(adjustAmount).toFixed(2);
    
    
    const newTotal = totalChecking + adjustment;

    // Create a new transaction entry for the last100 transactions
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const newTransaction = [
      localDate,  // Current date in YYYY-MM-DD format (local time)
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


  

  return (
    <div className="homepage-container">
      <button
        className={`icon-button ${!showButtons ? "icon-fade-out" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setMaskNumbers((prev) => !prev);
        }}
      >
        <span
          id="privacy-icon"
          className={maskNumbers ? "icon-eye-blocked" : "icon-eye"}
        ></span>
      </button>

      <button
        className={`icon-button2 ${!showButtons ? "icon-fade-out" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleLightMode();
        }}
      >
        <span
          className={lightMode ? "icon-brightness-contrast" : "icon-sun"}
        ></span>
      </button>



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
              className="panel_title"
              style={{
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
                  width: "40%", // Allocates space for both sections
                }}
              >
                {/* 时间段 Combo Box */}
                <label className="panel_font_size" style={{ width: "100%" }}>
                  时间段:
                  <select
                    className="panel_selector_size"
                    value={timeRangeTopLeft}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setTimeRangeTopLeft(newValue);
                      setSubOptionTopLeft(""); // Reset sub-option when time range changes
                      handleAutoSelectTopLeft(newValue); // Automatically select the current option
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
                <label className="panel_font_size"  style={{ width: "100%" }}>
                  子选项:
                  <select
                    className="panel_selector_size"
                    value={subOptionTopLeft}
                    onChange={(e) => setSubOptionTopLeft(e.target.value)}
                    disabled={["前3个月", "前6个月", "前12个月"].includes(timeRangeTopLeft)}
                  >
                    <option value="">请选择</option>
                    {timeRangeTopLeft === "按月显示" &&
                      [...Array(new Date().getMonth() + 1).keys()].map((month) => {
                        const monthName = new Date(0, month).toLocaleString("default", { month: "long" });
                        return (
                          <option key={month} value={monthName}>
                            {monthName}
                          </option>
                        );
                      })}
                    {timeRangeTopLeft === "按季度显示" &&
                      (() => {
                        const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
                        return Array.from({ length: currentQuarter }, (_, i) => `Q${i + 1}`).map((quarter) => (
                          <option key={quarter} value={quarter}>
                            {quarter}
                          </option>
                        ));
                      })()
                    }
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
                  width: "55%", // Allocates space for this section
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
                      <div
                        style={{
                          display: "flex", // Force horizontal layout
                          flexDirection: "row", // Ensure content stays side by side
                          alignItems: "center", // Vertically center items
                          gap: "8px", // Space between label and number
                          whiteSpace: "nowrap", // Prevent line wrapping
                          overflow: "hidden", // Hide overflow
                          textOverflow: "ellipsis", // Show ellipsis if overflow
                        }}
                      >
                        <span className="panel_font_size" style={{ fontWeight: "bold" }}>
                          {period} 总收入:{" "}
                        </span>
                        <span
                          className={`panel_font_size_enlarged ${
                            !maskNumbers ? "positive" : ""
                          }`}
                        >
                          {/* ${totalIncome.toFixed(2)} */}
                          {maskDollar(`$${totalIncome.toFixed(2)}`)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: "8px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        <span className="panel_font_size" style={{ fontWeight: "bold" }}>
                          {period} 总支出:{" "}
                        </span>
                        <span
                          className={`panel_font_size_enlarged ${
                            !maskNumbers ? "negative" : ""
                          }`}
                        >
                          {/* ${totalExpenses.toFixed(2)} */}
                          {maskDollar(`$${totalExpenses.toFixed(2)}`)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: "8px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        <span className="panel_font_size" style={{ fontWeight: "bold" }}>
                          {period} 净利润:{" "}
                        </span>
                        <span
                          className={`panel_font_size_enlarged ${
                            !maskNumbers ? (netProfit > 0 ? "positive" : "negative") : ""
                          }`}
                        >
                          {/* {netProfit.toFixed(2)<0?"-$"+Math.abs(netProfit.toFixed(2)):"$"+netProfit.toFixed(2)} */}
                          {maskDollar(
                            netProfit.toFixed(2) < 0
                              ? "-$" + Math.abs(netProfit).toFixed(2)
                              : "$" + netProfit.toFixed(2)
                          )}
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
            className="panel_title"
              style={{
                marginBottom: "20px",
                textAlign: "center",
              }}
            >
              上个月概览
            </div>

            {/* Content */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%" }}>
              {/* Expenses */}
              <div className="panel_font_size" style={{ marginBottom: "10px", minHeight: "31px" }}>
                <strong
                  style={{
                    display: "inline-block",
                    height: "31px",
                    lineHeight: "31px",
                    verticalAlign: "middle",
                    // Optionally add minWidth if you want all titles to align
                    marginRight:"15px",
                  }}
                >
                  支出:  
                </strong>
                <span
                  style={{
                    display: "inline-block",
                    minWidth: "90px",
                    height: "31px",
                    lineHeight: "31px",
                    letterSpacing: "1px",
                    verticalAlign: "middle",
                    overflow: "hidden",
                    whiteSpace: "nowrap"
                  }}
                >
                  {maskDollar(`$${lastMonthExpenses.toFixed(2)}`)}
                </span>
                <span
                  style={{
                    display: "inline-block",
                    minWidth: "60px",
                    height: "31px",
                    lineHeight: "31px",
                    verticalAlign: "middle",
                    overflow: "hidden",
                    whiteSpace: "nowrap"
                  }}
                >
                  {maskNumbers ? "•••••" : expenseChange}
                </span>
              </div>

              {/* Income */}
              <div className="panel_font_size" style={{ marginBottom: "10px", minHeight: "31px" }}>
                <strong
                  style={{
                    display: "inline-block",
                    height: "31px",
                    lineHeight: "31px",
                    verticalAlign: "middle",
                    // Optionally add minWidth if you want all titles to align
                    marginRight:"15px",
                  }}
                >
                  收入:
                </strong>
                <span
                  style={{
                    display: "inline-block",
                    minWidth: "90px",
                    height: "31px",
                    lineHeight: "31px",
                    letterSpacing: "1px",
                    verticalAlign: "middle",
                    overflow: "hidden",
                    whiteSpace: "nowrap"
                  }}
                >
                  {maskDollar(`$${lastMonthIncome.toFixed(2)}`)}
                </span>
                <span
                  style={{
                    display: "inline-block",
                    minWidth: "60px",
                    height: "31px",
                    lineHeight: "31px",
                    verticalAlign: "middle",
                    overflow: "hidden",
                    whiteSpace: "nowrap"
                  }}
                >
                  {maskNumbers ? "•••••" : incomeChange}
                </span>
              </div>

              {/* Highest Category Increase */}
              <div className="panel_font_size" style={{ marginBottom: "10px", minHeight: "31px" }}>
                <strong
                  style={{
                    display: "inline-block",
                    height: "31px",
                    lineHeight: "31px",
                    verticalAlign: "middle",
                    // Optionally add minWidth if you want all titles to align
                  }}
                >
                  最大支出增长类别:
                </strong>
                <span
                  style={{
                    display: "inline-block",
                    minWidth: "80px",
                    height: "31px",
                    lineHeight: "31px",
                    textAlign: "center",
                    verticalAlign: "middle",
                    overflow: "hidden",
                    whiteSpace: "nowrap"
                  }}
                >
                  {maskNumbers ? "•••••" : (categoriesTranslation[highestCategory] || highestCategory)}
                </span>
                <span
                  style={{
                    display: "inline-block",
                    minWidth: "60px",
                    height: "31px",
                    lineHeight: "31px",
                    textAlign: "left",
                    verticalAlign: "middle",
                    overflow: "hidden",
                    whiteSpace: "nowrap"
                  }}
                >
                  {maskNumbers ? "•••••" : highestCategoryChange}
                </span>
              </div>

              {/* Highest Category Decrease */}
              <div className="panel_font_size" style={{ marginBottom: "10px", minHeight: "31px" }}>
                <strong
                  style={{
                    display: "inline-block",
                    height: "31px",
                    lineHeight: "31px",
                    verticalAlign: "middle",
                  }}
                >
                  最大支出下降类别:
                </strong>
                <span
                  style={{
                    display: "inline-block",
                    minWidth: "80px",
                    height: "31px",
                    lineHeight: "31px",
                    textAlign: "center",
                    verticalAlign: "middle",
                    overflow: "hidden",
                    whiteSpace: "nowrap"
                  }}
                >
                  {maskNumbers
                    ? "•••••"
                    : (lowestCategory !== "无"
                        ? (categoriesTranslation[lowestCategory] || lowestCategory)
                        : "暂无（消费超过100刀的）最大下降类别")}
                </span>
                <span
                  style={{
                    display: "inline-block",
                    minWidth: "60px",
                    height: "31px",
                    lineHeight: "31px",
                    textAlign: "left",
                    verticalAlign: "middle",
                    overflow: "hidden",
                    whiteSpace: "nowrap"
                  }}
                >
                  {maskNumbers ? "•••••" : lowestCategoryChange}
                </span>
              </div>
            </div>
          </div>

          {/* <div className="right-box">Compare last month to the month before that of income and expense,of each up or down by how many percent and showing the total in dollars. OR which category has gone up highest in percent, if not all has gone down</div> */}
        </div>
        <div className="bottom-box" style={{ display: "flex", flexDirection: "column", height: "100%",position:"relative" }}>
          {/* Title Section */}
          <div
            className="title-section panel_title"
            style={{
              // flex: "0 0 15%", // Takes 15% of height
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "10px",
              // backgroundColor:"lightskyblue", // for testing purposes
              position:"absolute",
              top:"30px",
            }}
          >
            支出概览 ({["按月显示", "按季度显示", "按年显示"].includes(timeRange) ? subOption || "未选择" : timeRange})
          </div>

          {/* Content Section */}
          <div
            className="content-section"
            style={{
              //flex: "0 0 75%", // Takes 75% of height
              height: "100%", // Ensures it fills the remaining space
              display: "flex",
              // gap: "20px",
              padding: "20px",
              width:"100%",
              marginTop:"50px",
              // overflow:"hidden",
              // position:"absolute",
              // top:"10px",
              // backgroundColor: "lightgreen", // Make background transparent
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
                justifyContent: "center",
                alignItems: "flex-start", // Left-aligned horizontally
                overflow: "hidden", // Prevents overflow
                position: "relative",
              }}
            >
              {/* 时间段 Combo Box */}
              <label className="panel_font_size" style={{ width: "100%" }}>
                时间段:
                <select
                  className="panel_selector_size"
                  value={timeRange}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setTimeRange(newValue);
                    setSubOption(""); // Reset sub-option when time range changes
                    handleAutoSelectBottom(newValue); // Automatically select the current option
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
              <label className="panel_font_size" style={{ width: "100%" }}>
                子选项:
                <select
                  className="panel_selector_size"
                  value={subOption}
                  onChange={(e) => {
                    setSubOption(e.target.value);
                  }}
                  disabled={["前3个月", "前6个月", "全部显示"].includes(timeRange)}
                >
                  <option value="">请选择</option>
                  {timeRange === "按月显示" &&
                  [...Array(new Date().getMonth() + 1).keys()].map((month) => {
                    const monthName = new Date(0, month).toLocaleString("default", { month: "long" });
                    return (
                      <option key={month} value={monthName}>
                        {monthName}
                      </option>
                    );
                  })}
                {timeRange === "按季度显示" &&
                  (() => {
                    const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;
                    return Array.from({ length: currentQuarter }, (_, i) => `Q${i + 1}`).map((quarter) => (
                      <option key={quarter} value={quarter}>
                        {quarter}
                      </option>
                    ));
                  })()
                }
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
                flex: "1", // Let this take up the remaining space
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                // position:"absolute",
                // right:"10px",
                // top:"-70px",
                backgroundColor:"transparent",
                overflow:"visible",
              }}
            >
              {(!navigator.onLine || chartError) ? (
                <div>
                  NO INTERNET<br />CHART NOT AVAILABLE
                </div>
              ) : (
                <Chart
                  chartType="PieChart"
                  data={chartData}
                  options={options}
                  width={"700px"}
                  height={"350px"}
                  chartEvents={[
                    {
                      eventName: "error",
                      callback: () => setChartError(true),
                    },
                  ]}
                  onError={() => setChartError(true)}
                />
              )}
            </div>
          </div>
        </div>

      </div>
      <div className="homepage-right" style={{overflow:"hidden"}}>
      <div
        className={`flip-container ${animationType === "flip" ? "flip-mode" : "slide-mode"} ${isFlipped ? "flipped" : ""} ${isReadyToFlip ? "ready-to-flip" : ""}`}
        onClick={handleBoxClick}
        // ref={panelRef}
      >
        {/* Front Side */}
        <div className="front">
          <div style={{ marginBottom: "40px" }}>
            <h2 className="zcool-qingke-huangyou-regular" style={{ fontSize: "50px" }}>
              记账本 v2.1.0
            </h2>
          </div>
          <div className="button-group">
            <Link to="/recordExpense">
              <button className="action-btn1">记录 支出</button>
            </Link>
            <Link to="/recordIncome">
              <button className="action-btn1">记录 收入</button>
            </Link>
          </div>

          <div className="button-group">
            <Link to="/showExpense">
              <button className="action-btn1">显示支出明细</button>
            </Link>
            <Link to="/showIncome">
              <button className="action-btn1">显示收入明细</button>
            </Link>
          </div>

          <div className="button-group">
            <button className="action-btn1" onClick={() => openModalCategory("类别设置")}>
              类别设置
            </button>
            <button className="action-btn1" onClick={() => openModalOther("其他设置")}>
              其他设置
            </button>
          </div>

          <div className="button-group">
            <Link to="/checkPrepay">
              <button className="action-btn1">查看预付款</button>
            </Link>
            <Link to="/checkBudget">
              <button className="action-btn1">财务规划</button>
            </Link>
          </div>

          {/* <div className="button-group">
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent parent click handler
                  setMaskNumbers((prev) => !prev);
                }}
                className="action-btn1"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding:"10px 30px"
                }}
              >
                <span
                  style={{
                    marginRight: "15px",
                    fontSize: "18px",
                    lineHeight: 1,
                  }}
                >
                  隐私按钮
                </span>
                <span
                  id="privacy-icon"
                  className={
                    maskNumbers
                      ? "icon-eye panel_font_size_enlarged"
                      : "icon-eye-blocked panel_font_size_enlarged"
                  }
                  style={{
                    fontSize: "28px",
                    lineHeight: 1,
                    verticalAlign: "middle",
                  }}
                ></span>
              </button>

          </div> */}
        </div>

        {/* Back Side */}
        <div className="back">
          <h2 className="zcool-qingke-huangyou-regular" style={{ fontSize: "40px",marginBottom:"30px" }}>
            总余额
          </h2>
          <p style={{ fontSize: "50px", fontWeight: "bold" }}>
            {maskDollar(totalChecking !== null ? `$${totalChecking.toFixed(2)}` : "加载中...")}
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
              {/* 增减 Section */}
              <div
                className="horizontal-group"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    lineHeight: "1",
                    letterSpacing: "normal",
                    fontFamily: "inherit",
                    verticalAlign: "middle"
                  }}
                >
                  增减:
                </span>
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
                  确认
                </button>
              </div>

              {/* 调整 Section (Centered) */}
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
                <h3 style={{ fontSize: "18px" }}>调整至:</h3>

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
                  确认调整
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
                        {(() => {
                          const [yyyy, mm, dd] = date.split("-");
                          return `${mm}/${dd}/${yyyy.slice(2)}`;
                        })()}

                      </span>
                      <span style={{ width: "14%" }}>
                        {category === "Expense" ? "支出" : category === "Income" ? "收入" : "手动调整"}
                      </span>
                      <span style={{ width: "23%", color: amountColor, fontWeight: "bold" }}>
                        {isExpense ? "-" : isIncome ? "+" : isManual && parseFloat(amount) > 0 ? "+" : "-"}
                        ${Math.abs(parseFloat(amount)).toFixed(2)}
                      </span>
                      <span style={{ width: "23%" }}>
                        {/* ${parseFloat(balance).toFixed(2)} */}
                        {maskDollar(`$${parseFloat(balance).toFixed(2)}`)}
                      </span>
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
            <div className="modal-tabs">
              <div
                className={`modal-tab ${activeTab === "add" ? "active" : ""}`}
                onClick={() => setActiveTab("add")}
              >
                添加类别
              </div>
              <div
                className={`modal-tab ${activeTab === "delete" ? "active" : ""}`}
                onClick={() => setActiveTab("delete")}
              >
                删除类别
              </div>
            </div>
            <div className="modal-body">
              {activeTab === "add" && (
                <div style={{ marginBottom: "20px" }}>
                  <h2 className="modal-title">添加类别</h2>
                  {/* 添加类别内容 */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
                    <p>请输入新类别 英文名</p>
                    <input
                      type="text"
                      id="add-category-input-en"
                      placeholder="English"
                      style={{
                        padding: "8px",
                        width: "100%",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        marginBottom:"30px",
                      }}
                    />
                    <p>请输入新类别 中文名</p>
                    <input
                      type="text"
                      id="add-category-input-zh"
                      placeholder="中文"
                      style={{
                        padding: "8px",
                        width: "100%",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        marginBottom:"30px",
                      }}
                    />
                    <button
                      onClick={async () => {
                        const en = document.getElementById("add-category-input-en").value.trim();
                        const zh = document.getElementById("add-category-input-zh").value.trim();
                        if (!en || !zh) {
                          alert("请输入英文和中文类别名称！");
                          return;
                        }
                        // Send to backend
                        const res = await fetch("http://localhost:5001/api/add-category", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ en, zh }),
                        });
                        if (res.ok) {
                          alert(`添加的类别: ${en} / ${zh}`);
                          document.getElementById("add-category-input-en").value = "";
                          document.getElementById("add-category-input-zh").value = "";
                        } else {
                          alert("添加失败，请重试！");
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      添加
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "delete" && (
                <div>
                  <h3 className="modal-title">删除</h3>
                  {/* 删除类别内容 */}
                  <div style={{ marginBottom: "20px" }}>
                  {categories.map((category, index) => (
                    <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px",marginBottom:"10px"}}>
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
                  onClick={async () => {
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
                      // Send to backend to delete
                      const res = await fetch("http://localhost:5001/api/delete-categories", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ categoriesToDelete: selectedCategories }),
                      });
                      if (res.ok) {
                        alert(`删除的类别: ${selectedCategories.join(", ")}`);
                        // Optionally reload categories here
                        loadCategoriesData();
                      } else {
                        alert("删除失败，请重试！");
                      }
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
              )}
            </div>
            <div style={{padding:"0"}} className="modal-footer">
              {/* <button className="modal-btn" onClick={closeModalCategory}>
                保存
              </button> */}
              <button style={{height:"100%",width:"100%",padding:"20px"}} className="modal-btn" onClick={closeModalCategory}>
                关闭
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
              {/* <button className="modal-btn" onClick={closeModalMiscellaneous}>
                保存
              </button>
              <button className="modal-btn" onClick={closeModalMiscellaneous}>
                退出
              </button> */}
              <button style={{height:"100%",width:"100%",padding:"20px"}} className="modal-btn" onClick={closeModalMiscellaneous}>
                关闭
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
        const response = await fetch("http://localhost:5001/api/get-total-checking")
        const data = await response.json();
        setTotalChecking(data.checking || 0);
      } catch (error) {
        console.error("Error fetching total checking:", error);
      }
    };
    fetchTotalChecking();
  }, []);


  

  const handleSave = () => {
    if (!category || !amount || !description || !date) {
      alert("Please fill in all fields before saving.");
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
  // Add this state near your other search-related states:
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  // Modify your handleSearchChange so that it resets highlightedIndex:
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setHighlightedIndex(-1); // reset when user types
    if (value.trim() === "") {
      setSuggestions([]);
    } else {
      const filtered = categories.filter(cat =>
        cat.toLowerCase().startsWith(value.toLowerCase())
      );
      setSuggestions(filtered);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      // Move highlight down (stop at the last suggestion)
      setHighlightedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      // Move highlight up; if none is highlighted then unhighlight
      setHighlightedIndex(prev =>
        prev > 0 ? prev - 1 : -1
      );
    } else if (e.key === "Enter") {
      // If a suggestion is highlighted, select it; otherwise select the first suggestion
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        setCategory(suggestions[highlightedIndex]);
      } else if (suggestions.length > 0) {
        setCategory(suggestions[0]);
      }
      setSearchTerm("");
      setSuggestions([]);
      setHighlightedIndex(-1);
    }
  };

  // Hit Enter would move from one text box to next
  const handleEnterFocusNext = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.target.form || document;
      const focusable = Array.from(
        form.querySelectorAll('input, select, textarea')
      ).filter(el => !el.disabled && el.type !== 'hidden');
      
      const index = focusable.indexOf(e.target);
      if (index > -1 && index < focusable.length - 1) {
        focusable[index + 1].focus();
      }
    }
  };


  return (
    <div class="body">
      <div className="expense-page">
        <h1 style={{ fontSize: "60px" }}>记录 支出</h1>
        <div className="form-group">
          <label>选择分类</label>
          <div style={{ display: "flex", gap: "10px" }}>
            {/* Left half: Drop-down menu */}
            <select
              style={{ width: "50%" }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onKeyDown={handleEnterFocusNext}
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
                onKeyDown={(e) => {
                  handleSearchKeyDown(e);  // Find our leibie
                  handleEnterFocusNext(e); // Move to next field if just Enter
                }}
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
                      style={{
                        padding: "8px",
                        cursor: "pointer",
                        backgroundColor: index === highlightedIndex ? "#f0f0f0" : "transparent"
                      }}
                      // Use onMouseDown rather than onClick to ensure selection happens before input blur.
                      onMouseDown={() => {
                        setCategory(sugg);
                        setSearchTerm("");
                        setSuggestions([]);
                        setHighlightedIndex(-1);
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
            onKeyDown={handleEnterFocusNext}
          />
        </div>
        <div className="form-group">
          <label>请输入描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleEnterFocusNext}
          />
        </div>
        <div className="form-group">
          <label>输入日期</label>
          <div style={{ display: "flex", gap: "10px", alignItems: "stretch" }}>
          <div style={{ flex: "0 0 80%" }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "100%", height: "42px", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ flex: "0 0 20%" }}>
            <button
              onClick={() => {
                const localDate = getLocalDateString();
                setDate(localDate);
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#eaeaea";
                e.target.style.boxShadow = "0 4px 6px rgba(0,0,0,0.15)";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#f9f9f9";
                e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
              }}
              className="today-btn"
            >
              Today
            </button>
          </div>
          </div>
        </div>
        <div className="button-group">
          <button className="action-btn1" onClick={handleSave}>
            保存
          </button>
          <Link to="/">
            <button className="action-btn1">退出</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

const PrepayPage = () => {
  // 暂存 States: May contain clicked but not saved (means we don't want)
  const [filterOption, setFilterOption] = useState(""); // Combo box value, default all will be set in a usestate hook below somewhere, above return
  const [subOption, setSubOption] = useState(""); // Sub combo box value
  const [sortType,setSortType] = useState("")
  const [showType, setShowType] = useState(""); // Display type combo box value
  const [isSortDialogVisible, setSortDialogVisible] = useState(false); // Dialog visibility
  const [isModifyDialogVisible, setModifyDialogVisible] = useState(false);
  const [isDeleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedPrepay, setSelectedPrepay] = useState(null);







  const [isAddDialogVisible, setAddDialogVisible] = useState(false);
  const [frequencyNumber, setFrequencyNumber] = useState(1);
  const [frequencyMode, setFrequencyMode] = useState("每"); // "每" or "单次"
  const [frequencyUnit, setFrequencyUnit] = useState("天");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");





  const [searchTerm, setSearchTerm] = React.useState("");
  const [suggestions, setSuggestions] = React.useState([]);
  // Add this state near your other search-related states:
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setHighlightedIndex(-1); // reset when user types
    if (value.trim() === "") {
      setSuggestions([]);
    } else {
      const filtered = categories.filter(cat =>
        cat.toLowerCase().startsWith(value.toLowerCase())
      );
      setSuggestions(filtered);
    }
  };
  const handleSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        setSelectedCategory(suggestions[highlightedIndex]);
      } else if (suggestions.length > 0) {
        setSelectedCategory(suggestions[0]);
      }
      setSearchTerm("");
      setSuggestions([]);
      setHighlightedIndex(-1);
    }
  };
  // Hit Enter would move from one text box to next
  const handleEnterFocusNext = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.target.form || document;
      const focusable = Array.from(
        form.querySelectorAll('input, select, textarea')
      ).filter(el => !el.disabled && el.type !== 'hidden');
      
      const index = focusable.indexOf(e.target);
      if (index > -1 && index < focusable.length - 1) {
        focusable[index + 1].focus();
      }
    }
  };


  // const { data, addPrepay } = useContext(DataContext);
  const handleSave = async (frequencyMode,frequencyNumber,frequencyUnit,selectedCategory,nextDate,amount,description) => {
    if (
      !frequencyMode ||
      (frequencyMode === "每" && (!frequencyNumber || !frequencyUnit)) ||
      !selectedCategory ||
      !description ||
      !nextDate ||
      !amount
    ) {
      alert("Please fill in all fields before saving.");
      return;
    }


    // Ensure the amount has two decimal places
    const formattedAmount = parseFloat(amount).toFixed(2);
    const newPrepay = 
      {
        category: selectedCategory,
        amount: formattedAmount,
        description: description,
        date: nextDate,
        frequencyMode: frequencyMode,
        frequencyNumber: frequencyNumber,
        frequencyUnit: frequencyUnit,
      }
    
    // alert(
    //   `Prepay Saved!\n\nDetails:\nCategory: ${selectedCategory}\nAmount: ${amount}\nDescription: ${description}\nDate: ${nextDate}\nFrequency: ${frequencyNumber} ${frequencyUnit} ${frequencyMode}`
    // );



    // Send another request to update CheckingRecent100
    const requestId = uuidv4(); // Generate a unique request ID
    const newPrepayReponse = await fetch("http://localhost:5001/api/add-prepay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newPrepay,requestId }),
    });
    if (newPrepayReponse.ok) {
      console.log("预付款添加成功");
    } else {
      alert("预付款添加失败，请稍后再试");
    }
    
    showCheckmark()
    // navigate("/");
    setTimeout(() => {
      window.location.reload(); // refresh for now
    }, 2500);

    

  };
  const [showCheckmarkOnly, setShowCheckmarkOnly] = useState(false);
  const showCheckmark = () => {
  setShowCheckmarkOnly(true);
  setTimeout(() => {
    setAddDialogVisible(false);
    setShowCheckmarkOnly(false); // Reset for next time
  }, 2500);
};




const [scheduledPrepays, setScheduledPrepays] = useState([]);
  useEffect(() => {
    const fetchScheduledPrepays = async () => {
      try {
        const response = await fetch("http://localhost:5001/api/get-prepay");
        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();
        setScheduledPrepays(data || []);
      } catch (err) {
        console.error("Error loading scheduled prepays:", err);
      }
    };

    fetchScheduledPrepays();
  }, []);
// useEffect(() => {
//   fetch("http://localhost:5001/api/get-prepay")
//     .then((res) => res.json())
//     .then((data) => {
//       // Replace tokens in description
//       const now = new Date();
//       const month = now.getMonth() + 1;
//       const day = now.getDate();
//       const year = now.getFullYear();

//       const tokenReplaced = data.map((item) => ({
//         ...item,
//         description: item.description
//           .replace("{MONTH}", month.toString().padStart(2, "0"))
//           .replace("{DAY}", day.toString().padStart(2, "0"))
//           .replace("{YEAR}", year.toString())
//       }));

//       setScheduledPrepays(tokenReplaced);
//     })
//     .catch((err) => console.error("Error loading scheduled prepays:", err));
// }, []);
  const translateFrequency = (raw) => {
    switch (raw) {
      case "每1月": return "每个月";
      case "每1周": return "每周";
      case "每1年": return "每年";
      case "每1天": return "每天";
      default: return raw;
    }
  };
  const handleModifyClick = (expense) => {    
    setSelectedPrepay(expense);
    setModifyDialogVisible(true);
  };

  const handleDeleteClick = (expense) => {
    setSelectedPrepay(expense);
    setDeleteDialogVisible(true);
  };
  const closeDialogs = () => {
    setModifyDialogVisible(false);
    setDeleteDialogVisible(false);
    setSelectedPrepay(null);
  };
  const handleSaveChanges = async () => {
    const frequencyMode = document.getElementById("edit_frequencyMode").value;
    const frequencyNumber = frequencyMode === "每"
      ? document.getElementById("edit_frequencyNumber").value
      : "";
    const frequencyUnit = frequencyMode === "每"
      ? document.getElementById("edit_frequencyUnit").value
      : "";

    const modified = {
      id: selectedPrepay.id,
      category: document.getElementById("edit_category").value,
      date: document.getElementById("edit_date").value,
      amount: parseFloat(document.getElementById("edit_amount").value).toFixed(2),
      description: document.getElementById("edit_description").value,
      frequencyMode:document.getElementById("edit_frequencyMode").value,
      frequencyNumber: Math.floor(Number(document.getElementById("edit_frequencyNumber").value)) || 0,
      frequencyUnit:document.getElementById("edit_frequencyUnit").value,
    };

    const res = await fetch("http://localhost:5001/api/modify-prepay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modified),
    });

    if (res.ok) {
      alert("修改成功！");
      closeDialogs();
      window.location.reload(); // refresh for now
    } else {
      alert("修改失败！");
    }
  };
  const handleDeleteChanges = async () => {
    fetch("http://localhost:5001/api/delete-prepay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: selectedPrepay.id // 传递要删除的预付款ID aka ID to delete
    })
  })
    .then((res) => {
      if (!res.ok) throw new Error("删除失败");
      return res.text();
    })
    .then((msg) => {
      alert("删除成功");
      closeDialogs();
      window.location.reload(); // refresh for now
    })
    .catch((err) => {
      console.error("删除失败", err);
      alert("删除失败");
    });
  };
//   let hasCheckedDue = false;
//   const fetchScheduledPrepays = async () => {
//   try {
//     const response = await fetch("http://localhost:5001/api/get-prepay");
//     if (!response.ok) throw new Error("Failed to fetch");

//     const data = await response.json();
//     setScheduledPrepays(data || []);
//     return data; // ⬅️ Return data for reuse
//   } catch (err) {
//     console.error("Error loading scheduled prepays:", err);
//     return [];
//   }
// };
// useEffect(() => {
//   const checkAndHandleDuePrepays = async () => {
//     const data = await fetchScheduledPrepays();

//     if (hasCheckedDue) return;
//     hasCheckedDue = true;

//     const today = new Date().toISOString().split("T")[0];
//     let updated = false;

//     for (const prepay of data) {
//       if (prepay.date <= today) {
//         alert(`预付款到期: ${prepay.description} - ${prepay.amount} - ${prepay.date}`);

//         if (prepay.frequencyMode === "每") {
//           const current = new Date(prepay.date);
//           let next = new Date(current);

//           switch (prepay.frequencyUnit) {
//             case "天":
//               next.setDate(current.getDate() + parseInt(prepay.frequencyNumber));
//               break;
//             case "周":
//               next.setDate(current.getDate() + 7 * parseInt(prepay.frequencyNumber));
//               break;
//             case "月":
//               next.setMonth(current.getMonth() + parseInt(prepay.frequencyNumber));
//               break;
//             case "年":
//               next.setFullYear(current.getFullYear() + parseInt(prepay.frequencyNumber));
//               break;
//           }

//           const nextDateStr = next.toISOString().split("T")[0];

//           const res = await fetch("http://localhost:5001/api/update-prepay-date", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ id: prepay.id, newDate: nextDateStr })
//           });

//           if (res.ok) updated = true;
//         }
//       }
//     }

//     if (updated) {
//       // ⬅️ If any updates happened, reload the table
//       await fetchScheduledPrepays();
//     }
//   };

//   checkAndHandleDuePrepays();
// }, []);






  /* all prepay scheduled here, can be canceled, can be modified. every time run app, we need to run all prepay first to see anything due*/

  
  return (
    <div className="modify-expense-container">
      {/* Header Section */}
      <div className="modify-expense-header">
        <div className="header-left">
          <h2>Scheduled/Reaccurring Payments</h2>
        </div>
        <div className="header-right">
          <button
            onClick={() => setSortDialogVisible(true)}
            className="sort-btn"
            disabled={true}
          >
            排序
          </button>
          <button
            className="add-prepay-btn"
            onClick={() => setAddDialogVisible(true)}
          >
            添加
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
                          
                        }}
                      />
                      降序
                    </label>
                  </div>
                </div>

                

              </div>

              
              

              {/* 保存退出按钮 */}
              <div className="dialog-actions">
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

      {isAddDialogVisible && (
        <div className="modal-overlay">
          

          <div className="add-prepay-dialog">
            {showCheckmarkOnly ? (
              <svg className="checkmark" viewBox="0 0 52 52">
                <path d="M14 27l10 10 18-20" />
              </svg>
            ) : (
              <>
                <h3>添加预付款</h3>
                <div className="dialog-body">

                  <div className="row">
                    <label>频率:</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <select
                        value={frequencyMode}
                        onChange={(e) => {
                          const mode = e.target.value;
                          setFrequencyMode(mode);

                          // ⛔️ If switched to 单次, clear the other two
                          if (mode === "单次") {
                            setFrequencyNumber("");
                            setFrequencyUnit(""); // or default like "天"
                          }
                        }}
                        onKeyDown={handleEnterFocusNext}
                      >
                        <option value="每">每</option>
                        <option value="单次">单次</option>
                      </select>

                      {frequencyMode === "每" && (
                        <>
                          <input
                            type="number"
                            value={frequencyNumber}
                            onChange={(e) => setFrequencyNumber(e.target.value)}
                            style={{ width: "60px" }}
                            onKeyDown={handleEnterFocusNext}
                          />
                          <select
                            value={frequencyUnit}
                            onChange={(e) => setFrequencyUnit(e.target.value)}
                            onKeyDown={handleEnterFocusNext}
                          >
                            <option value="天">天</option>
                            <option value="周">周</option>
                            <option value="月">月</option>
                            <option value="年">年</option>
                          </select>
                        </>
                      )}
                    </div>
                  </div>



                  <div className="row">
                    <label>类别:</label>
                    <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                      {/* Dropdown select */}
                      <select
                        className="styled-select"
                        style={{ width: "50%" }}
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        onKeyDown={handleEnterFocusNext}
                      >
                        <option value="">--请选择--</option>
                        {categories.map((cat, index) => (
                          <option key={index} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      {/* Search input + suggestions */}
                      <div style={{ width: "50%", position: "relative" }}>
                        <input
                          type="text"
                          placeholder="搜索分类"
                          value={searchTerm}
                          onChange={handleSearchChange}
                          onKeyDown={(e) => {
                            handleSearchKeyDown(e);
                            // optionally: focus next if Enter is pressed
                            handleEnterFocusNext(e);
                          }}
                          style={{ width: "100%", paddingRight: "30px" }}
                        />
                        <button
                          onClick={() => {
                            if (suggestions.length > 0) {
                              setSelectedCategory(suggestions[0]);
                              setSearchTerm("");
                              setSuggestions([]);
                            }
                          }}
                          style={{
                            position: "absolute",
                            right: "5px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "18px",
                          }}
                        >
                          🔍
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
                              zIndex: 100,
                            }}
                          >
                            {suggestions.slice(0, 5).map((sugg, index) => (
                              <li
                                key={index}
                                style={{
                                  padding: "8px",
                                  cursor: "pointer",
                                  backgroundColor: index === highlightedIndex ? "#f0f0f0" : "transparent",
                                }}
                                onMouseDown={() => {
                                  setSelectedCategory(sugg);
                                  setSearchTerm("");
                                  setSuggestions([]);
                                  setHighlightedIndex(-1);
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


                  <div className="row">
                    <label>{frequencyMode === "每" ? "下个日期:" : "日期:"}</label>
                    <input
                      type="date"
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                      onKeyDown={handleEnterFocusNext}
                    />
                  </div>

                  <div className="row">
                    <label>金额:</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onKeyDown={handleEnterFocusNext}
                    />
                  </div>

                  <div className="row description-row">
                    <label>描述:</label>
                    <textarea
                      rows="3"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="dialog-actions">
                  <button
                    className="exit-btn"
                    onClick={() => setAddDialogVisible(false)}
                  >
                    退出
                  </button>
                  <button
                    className="save-btn"
                    onClick={() => {
                      // alert(
                      //   `频率: ${frequencyMode === "每" ? `每 ${frequencyNumber} ${frequencyUnit}` : "单次"}\n类别: ${selectedCategory}\n日期: ${nextDate}\n金额: ${amount}\n描述: ${description}`
                      // );
                      handleSave(frequencyMode,frequencyNumber,frequencyUnit,selectedCategory,nextDate,amount,description);
                      // setAddDialogVisible(false);
                    }}
                  >
                    保存
                  </button>
                </div>
              </>
            )}
          </div>

        </div>
      )}




      {/* Scheduled Payments Display Section */}
      <div className="expense-display">
          {/* Table Header */}
          <div className="table-header">
            <div>频率</div> 
            <div>类别</div>
            <div>下个日期</div>
            <div>金额</div>
            <div>描述</div>
            <div>操作</div>
          </div>

          {/* Payment Rows */}
          {/* <div className="table-body">
            {scheduledPrepays.map((item, index) => (
              <div className="table-row" key={item.id}>
                <div>{translateFrequency(item.frequency)}</div>
                <div>{item.category}</div>
                <div>{item.nextDate}</div>
                <div>${item.amount}</div>
                <div className="description" data-fulltext={item.description}>{item.description}</div>
                <div>
                  <button className="action-btn" onClick={() => handleModifyClick(item)}>修改</button>
                  <button className="action-btn" onClick={() => handleDeleteClick(item)}>删除</button>
                </div>
              </div>
            ))}
          </div> */}
          <div className="table-body">
            {scheduledPrepays.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>
                暂无预付款
              </div>
            ) : (
              scheduledPrepays.map((item, index) => (
                <div className="table-row" key={index}>
                  <div>
                    {item.frequencyMode === "每"
                      ? `每 ${item.frequencyNumber} ${item.frequencyUnit}`
                      : "单次"}
                  </div>
                  <div>{categoriesTranslation[item.category]}</div>
                  <div>{item.date}</div>
                  <div>{parseFloat(item.amount).toFixed(2)}</div>
                  <div>{item.description}</div>
                  <div>
                    <button className="action-btn" onClick={() => handleModifyClick(item)}>修改</button>
                    <button className="action-btn" onClick={() => handleDeleteClick(item)}>删除</button>
                  </div>
                </div>
              ))
            )}
          </div>



      </div>

      <div className="popups_modify_delete">
        {/* Modify Dialog */}
        {isModifyDialogVisible && selectedPrepay && (
          <div className="modal-overlay">
            <div className="modal-dialog">
              <h3>修改支出</h3>
              <p>
                确认要修改此预定付款吗？（编号：{selectedPrepay.id}）
              </p>
              
              <div className="form-group">
                <label>频率</label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <select
                    id="edit_frequencyMode"
                    defaultValue={selectedPrepay.frequencyMode}
                  >
                    <option value="每">每</option>
                    <option value="单次">单次</option>
                  </select>
                  
                  {selectedPrepay.frequencyMode === "每" && (
                    <>
                      <input
                        type="number"
                        id="edit_frequencyNumber"
                        defaultValue={selectedPrepay.frequencyNumber}
                        style={{ width: "60px" }}
                      />
                      <select
                        id="edit_frequencyUnit"
                        defaultValue={selectedPrepay.frequencyUnit}
                      >
                        <option value="天">天</option>
                        <option value="周">周</option>
                        <option value="月">月</option>
                        <option value="年">年</option>
                      </select>
                    </>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>类别</label>
                <select id="edit_category" defaultValue={selectedPrepay.category}>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{selectedPrepay.frequencyMode === "每" ? "下个日期" : "日期"}</label>
                <input
                  id="edit_date"
                  type="date"
                  defaultValue={selectedPrepay.date}
                />
              </div>

              <div className="form-group">
                <label>金额</label>
                <input
                  id="edit_amount"
                  type="number"
                  step="0.01"
                  defaultValue={selectedPrepay.amount}
                />
              </div>

              <div className="form-group">
                <label>描述</label>
                <textarea
                  id="edit_description"
                  defaultValue={selectedPrepay.description}
                />
              </div>


              <div className="dialog-actions">
                <button
                  className="confirm-btn"
                  onClick={handleSaveChanges}

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
        {isDeleteDialogVisible && selectedPrepay && (
          <div className="modal-overlay">
            <div className="modal-dialog delete-dialog">
              <h3 style={{ color: "#b30000" }}>⚠️ 删除确认</h3>
              <div className="delete-summary">
                <div><strong>编号:</strong> {selectedPrepay.id}</div>
                <div><strong>类别:</strong> {selectedPrepay.category}</div>
                <div><strong>日期:</strong> {selectedPrepay.date}</div>
                <div><strong>金额:</strong> ${parseFloat(selectedPrepay.amount).toFixed(2)}</div>
                <div><strong>描述:</strong> {selectedPrepay.description}</div>
              </div>

              <div className="dialog-actions" style={{ marginTop: "20px" }}>
                <button
                  className="confirm-btn danger"
                  onClick={() => {
                    // Delete logic goes here
                    handleDeleteChanges();
                    closeDialogs();
                  }}
                >
                  确认删除
                </button>
                <button className="exit-btn" onClick={closeDialogs}>
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

// const BudgetPage = () => {
//   /* shows budget  */

//   return (
//     <div class="body">
//       <div className="expense-page page_bigger">
//         <h1 className="h-nobold" style={{ fontSize: "60px" }}>财务规划</h1>
//         Under construction, please check back later.
//         <div className="button-group">
//           <Link to="/">
//             <button className="action-btn1">退出</button>
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// };
const BudgetPage = () => {
  return (
    <div className="budget-page">
      {/* Header */}
      <div className="budget-header">
        <h1 className="budget-title">财务规划</h1>
        <div className="budget-header-actions">
          <button className="header-btn settings-btn">
            <Settings size={22} />
          </button>
          <Link to="/">
            <button className="header-btn exit-btn">
              <LogOut size={22} />
              <span>退出</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Status */}
      <div className="budget-status">
        <p className="status-text on-track">你相当牛逼</p>
      </div>

      {/* Progress Overview WRAPPER */}
      <div className="budget-overview-wrapper">
        {/* Expenses vs Budget */}
        <div className="budget-progress">
          <div className="budget-progress-info">
            <span className="spent">$500 Spent</span>
            <span className="percent">50% of Total Budget</span>
          </div>
          <div className="progress-bar large">
            <div className="progress-fill" style={{ width: "50%" }}></div>
          </div>
          <p className="budget-total">Total Budget: $1000</p>
        </div>

        {/* Income vs Expenses */}
        <div className="income-expense-overview">
          <div className="budget-progress-info">
            <span className="spent">Income: $6000</span>
            <span className="percent">Expenses: $500</span>
          </div>
          <div className="progress-bar large income-bar">
            <div className="progress-fill income" style={{ width: "25%" }}></div>
          </div>
          <p className="budget-total">Remaining Income: $5500</p>
        </div>
      </div>

      {/* Scrollable Category Table */}
      <div className="budget-table-wrapper">
        <div className="budget-table">
          <div className="table-header">
            <span>Category</span>
            <span>Progress</span>
            <span>Budgeted</span>
            <span>Spent</span>
            <span>Remaining</span>
          </div>

          {/* Expanded Categories */}
          {[
            { icon: "shopping-cart", name: "Shopping", budget: 200, spent: 130 },
            { icon: "car", name: "Car", budget: 300, spent: 280 },
            { icon: "food", name: "Food", budget: 150, spent: 45 },
            { icon: "home", name: "Housing", budget: 1000, spent: 700 },
            { icon: "bus", name: "Transport", budget: 150, spent: 90 },
            { icon: "movie", name: "Entertainment", budget: 120, spent: 110 },
            { icon: "gym", name: "Fitness", budget: 80, spent: 40 },
            { icon: "education", name: "Education", budget: 300, spent: 50 },
            { icon: "medical", name: "Healthcare", budget: 200, spent: 60 },
            { icon: "gift", name: "Gifts", budget: 100, spent: 70 },
            { icon: "travel", name: "Travel", budget: 500, spent: 300 },
            { icon: "investment", name: "Investments", budget: 400, spent: 200 },
            { icon: "savings", name: "Savings", budget: 600, spent: 300 },
          ].map((cat, i) => {
            const remaining = cat.budget - cat.spent;
            const percent = Math.min(100, (cat.spent / cat.budget) * 100);
            let color = "green";
            if (percent > 80) color = "red";
            else if (percent > 50) color = "yellow";

            return (
              <div className="table-row" key={i}>
                <div className="table-category">
                  <img
                    src={`https://img.icons8.com/fluency/48/${cat.icon}.png`}
                    alt={cat.name}
                  />
                  <span>{cat.name}</span>
                </div>
                <div className="table-progress">
                  <div className="mini-bar short">
                    <div
                      className={`mini-fill ${color}`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
                <span>${cat.budget}</span>
                <span>${cat.spent}</span>
                <span className={`remaining ${color}`}>
                  {remaining >= 0 ? `$${remaining}` : `-$${Math.abs(remaining)}`}
                </span>
              </div>
            );
          })}
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
    console.log(123123123123,newTransaction);
    

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
        const response = await fetch("http://localhost:5001/api/get-total-checking")
        const data = await response.json();
        setTotalChecking(data.checking || 0);
      } catch (error) {
        console.error("Error fetching total checking:", error);
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

  const handleEnterFocusNext = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const form = e.target.form || document;
    const focusable = Array.from(
      form.querySelectorAll('input, select, textarea')
    ).filter(el => !el.disabled && el.type !== 'hidden');
    
    const index = focusable.indexOf(e.target);
    if (index > -1 && index < focusable.length - 1) {
      focusable[index + 1].focus();
    }
  }
};


  return (
    <div className="body">
      <div className="income-page">
        <h1 className="" style={{ fontSize: "60px" }}>记录 收入</h1>
        <div className="form-group">
          <label>请输入 税前 总额</label>
          <input
            type="number"
            value={preTaxAmount}
            onChange={(e) => setPreTaxAmount(e.target.value)}
            onKeyDown={handleEnterFocusNext}

          />
        </div>
        <div className="form-group">
          <label>请输入 税后 总额</label>
          <input
            type="number"
            value={postTaxAmount}
            onChange={(e) => setPostTaxAmount(e.target.value)}
            onKeyDown={handleEnterFocusNext}
          />
        </div>
        <div className="form-group">
          <label>请输入 注释</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={handleEnterFocusNext}
          />
        </div>
        
       <div className="form-group">
          <label>输入日期</label>
          <div style={{ display: "flex", gap: "10px", alignItems: "stretch" }}>
          <div style={{ flex: "0 0 80%" }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "100%", height: "42px", boxSizing: "border-box" }}
              onKeyDown={handleEnterFocusNext}
            />
          </div>
          <div style={{ flex: "0 0 20%" }}>
            <button
              className="today-btn"
              onClick={() => {
                const localDate = getLocalDateString();
                setDate(localDate);
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#eaeaea";
                e.target.style.boxShadow = "0 4px 6px rgba(0,0,0,0.15)";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#f9f9f9";
                e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
              }}
            >
              Today
            </button>
          </div>
          </div>
        </div>
        <div className="button-group">
          <button className="action-btn1" onClick={handleSave}>
            保存
          </button>
          <Link to="/">
            <button className="action-btn1">退出</button>
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
        // Category subtotal: calculate total for this category
        const categoryTotal = expenses.reduce(
          (sum, expense) => sum + parseFloat(expense.amount),
          0
        );
        totalExpenses += categoryTotal;

        // Title row for this category (id is set to null or you may choose an identifier)
        finalExpenses.push({
          id: null,
          category: `${categoriesTranslation[category] || category}  总消费: $${categoryTotal.toFixed(2)}`,
          amount: "",
          date: "",
          description: "",
          actions: null,
        });

        // For each expense, include all attributes by spreading exp; override amount formatting if needed.
        expenses.forEach((exp) =>
          finalExpenses.push({
            ...exp, // preserve all attributes (including id)
            amount: parseFloat(exp.amount).toFixed(2),
            description: exp.description || "",
            actions: "yes",
          })
        );
      });
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

  // Tooltip for description
  useEffect(() => {
    let currentTooltip = null;

    const adjustTooltipPosition = (e) => {
      if (currentTooltip) {
        let x = e.clientX + 10;
        let y = e.clientY + 10;
        
        // Use getBoundingClientRect to measure tooltip dimensions
        const tooltipRect = currentTooltip.getBoundingClientRect();
        
        // If the tooltip would overflow to the right, adjust x
        if (x + tooltipRect.width > window.innerWidth) {
          x = window.innerWidth - tooltipRect.width - 10;
        }
        
        // If the tooltip would overflow to the bottom, position it above the mouse
        if (y + tooltipRect.height > window.innerHeight) {
          y = e.clientY - tooltipRect.height - 10;
        }
        
        currentTooltip.style.left = x + "px";
        currentTooltip.style.top = y + "px";
      }
    };

    const handleMouseMove = (e) => {
      adjustTooltipPosition(e);
    };

    const handleMouseOver = (e) => {
      if (e.target.classList.contains("description")) {
        // Only show tooltip if text is actually truncated
        const el = e.target;
        // For single-line ellipsis (white-space: nowrap)
        const isOverflowing = el.scrollWidth > el.clientWidth;
        // For multi-line ellipsis (white-space: normal, overflow-y)
        // const isOverflowing = el.scrollHeight > el.clientHeight;

        if (!isOverflowing) return;

        const descText = el.getAttribute("data-fulltext");
        if (!descText) return;
        currentTooltip = document.createElement("div");
        currentTooltip.className = "description-tooltip";
        currentTooltip.innerText = descText;
        document.body.appendChild(currentTooltip);
        adjustTooltipPosition(e);
      }
    };

    const handleMouseOut = (e) => {
      if (e.target.classList.contains("description") && currentTooltip) {
        document.body.removeChild(currentTooltip);
        currentTooltip = null;
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);



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
            <div className="table-row" key={index}
              data-has-actions={expense.actions !== null ? "true" : undefined}
            >
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



              <div className="description" data-fulltext={expense.description}>
                {expense.description}
              </div>

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
    const totalBeforeTax = filteredIncomes.reduce((sum, income) => {
        return sum + parseFloat(income.before_tax || 0);
    }, 0).toFixed(2);

    // Add the title row with the total after-tax income
    const titleRow = {
        date: `${title}: $${totalAfterTax}`,  // Append the total amount to the title
        before_tax: null,
        after_tax: null,
        description: null,
        tax_percentage: null,
        id: null,
        actions: null,  // Add actions as "none"
        type: "total_before_tax"
    };
    let endingLabel = "年收入（税前）";
    if (filterOption === "按月显示") {
      endingLabel = `${subOption}收入（税前）`;
    } else if (filterOption === "按季度显示") {
      endingLabel = `${subOption}收入（税前）`;
    } else if (filterOption === "按年份显示") {
      endingLabel = `${subOption}年收入（税前）`;
    } else if (["前3个月", "前6个月", "前12个月"].includes(filterOption)) {
      endingLabel = `${filterOption}收入（税前）`;
    }else{
      endingLabel = `总收入（税前）`;
    }

    const endingRow = {
      date: `${endingLabel}: $${totalBeforeTax}`,
      before_tax: null,
      after_tax: null,
      description: null,
      tax_percentage: null,
      id: null,
      actions: null,
      type: "total_after_tax"
    };

    // Return the updated array with the title row at the top
    return [titleRow, ...filteredIncomes,endingRow];
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

  // Tooltip for description
  useEffect(() => {
    let currentTooltip = null;

    const adjustTooltipPosition = (e) => {
      if (currentTooltip) {
        let x = e.clientX + 10;
        let y = e.clientY + 10;
        
        // Use getBoundingClientRect to measure tooltip dimensions
        const tooltipRect = currentTooltip.getBoundingClientRect();
        
        // If the tooltip would overflow to the right, adjust x
        if (x + tooltipRect.width > window.innerWidth) {
          x = window.innerWidth - tooltipRect.width - 10;
        }
        
        // If the tooltip would overflow to the bottom, position it above the mouse
        if (y + tooltipRect.height > window.innerHeight) {
          y = e.clientY - tooltipRect.height - 10;
        }
        
        currentTooltip.style.left = x + "px";
        currentTooltip.style.top = y + "px";
      }
    };

    const handleMouseMove = (e) => {
      adjustTooltipPosition(e);
    };

    const handleMouseOver = (e) => {
      if (e.target.classList.contains("description")) {
        // Only show tooltip if text is actually truncated
        const el = e.target;
        // For single-line ellipsis (white-space: nowrap)
        const isOverflowing = el.scrollWidth > el.clientWidth;
        // For multi-line ellipsis (white-space: normal, overflow-y)
        // const isOverflowing = el.scrollHeight > el.clientHeight;

        if (!isOverflowing) return;

        const descText = el.getAttribute("data-fulltext");
        if (!descText) return;
        currentTooltip = document.createElement("div");
        currentTooltip.className = "description-tooltip";
        currentTooltip.innerText = descText;
        document.body.appendChild(currentTooltip);
        adjustTooltipPosition(e);
      }
    };

    const handleMouseOut = (e) => {
      if (e.target.classList.contains("description") && currentTooltip) {
        document.body.removeChild(currentTooltip);
        currentTooltip = null;
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);
  
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
                        const currentMonth = new Date().toLocaleString("default", { month: "long" });
                        setSubOption(currentMonth); // Default to current month
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
            <div className="table-row" key={index}
              data-has-actions={income.actions !== null ? "true" : undefined}
            >
              {/* Show index only if actions is not "none" */}
              <div>{income.actions !== null ? index : ""}</div> {/* Adjust index calculation */}

              {/* Title Row (Date) with custom styles only if actions is "none" */}
              <div
                style={{
                  ...(income.actions === null && {
                    overflow: "visible",
                    fontWeight: "bold",
                    fontSize: "25px",
                  }),
                }}
              >
                {income.actions === null && income.type=="total_before_tax" && income.date && income.date.includes("$") ? (
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
                  <span style={{ color: income.actions === null&& income.type=="total_before_tax" ? "red" : "inherit" }}>
                    {income.date}
                  </span>
                )}
              </div>



              {/* Display empty rows for all other fields if actions is "none" */}
              <div>{income.actions === null ? "" : `$${income.before_tax}`}</div>
              <div>{income.actions === null ? "" : `$${income.after_tax}`}</div>
              <div>{income.actions === null ? "" : (Math.ceil(income.tax_percentage * 100) / 100).toFixed(2) + "%"}</div>
                <div className="description" data-fulltext={income.description}>
                  {income.description}
                </div>
              <div>
                {income.actions !== null && (
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
    fetch("http://localhost:5001/api/get-data")
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

  const addPrepay = () =>{

  }


  return (
    <DataContext.Provider value={{ data, addExpense, updateExpense, addIncome,updateIncome,deleteIncome,deleteExpense }}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/recordExpense" element={<RecordExpensePage />} />
          <Route path="/recordIncome" element={<RecordIncomePage />} />

          <Route path="/showExpense" element={<ShowExpensePage />} />
          <Route path="/showIncome" element={<ShowIncomePage />} />

          <Route path="/checkPrepay" element={<PrepayPage />} />
          <Route path="/checkBudget" element={<BudgetPage />} />
        </Routes>
      </Router>
    </DataContext.Provider>
  );
};



export default App;
