import React, { useRef, useState, useEffect } from "react";
import { Chart } from "react-google-charts"; // use react-google-charts for both charts to avoid extra deps

// ExpenseSlide: thin wrapper to render existing pie chart area
export function ExpenseSlide({
  timeRange,
  subOption,
  setTimeRange,
  setSubOption,
  handleAutoSelectBottom,
  availableYears,
  chartData,
  options,
  chartError,
  setChartError,
}) {
  return (
    <>
      <div
        className="filter-controls"
        style={{
          flex: "0 0 30%",
          display: "flex",
          flexDirection: "row",
          gap: "15px",
          justifyContent: "flex-start",
          alignItems: "center",
          overflow: "hidden",
          position: "relative",
          width: "100%"
        }}
      >
        <div style={{ width: "20%" }}></div>
        <div style={{ 
          width: "50%",
          display: "flex",
          flexDirection: "column",
          gap: "15px"
        }}>
          <label className="panel_font_size">
          时间段:
          <select
            className="panel_selector_size"
            value={timeRange}
            onChange={(e) => {
              const newValue = e.target.value;
              setTimeRange(newValue);
              setSubOption("");
              handleAutoSelectBottom(newValue);
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

          <label className="panel_font_size">
            子选项:
            <select
              className="panel_selector_size"
              value={subOption}
              onChange={(e) => setSubOption(e.target.value)}
              disabled={["前3个月", "前6个月", "全部显示"].includes(timeRange)}
            >
              <option value="">请选择</option>
              {timeRange === "按月显示" &&
                [...Array(new Date().getMonth() + 1).keys()].map((month) => {
                  // const monthName = new Date(0, month).toLocaleString("default", { month: "long" });
                  const monthName = new Date(0, month).toLocaleString("zh-CN", { month: "long" });
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
                })()}
              {timeRange === "按年显示" &&
                availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </div>

      <div
        className="chart-container"
        style={{
          flex: "0 0 70%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "transparent",
          overflow: "visible",
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
            options={{ 
              ...options, 
              backgroundColor: 'transparent',
              chartArea: { 
                left: '10%',
                top: '5%',
                width: '70%',
                height: '90%'
              },
              tooltip: { trigger: 'selection' }, // ✅ click-to-show tooltip (no flicker)
              legend: {
                alignment: 'center',
                position: 'right',
                textStyle: {
                  fontSize: 20
                }
              },
              pieSliceText: 'percentage'  // Remove text from pie slices to reduce clutter
            }}
            width={"100%"}
            height={"100%"}
            chartEvents={[{ eventName: "error", callback: () => setChartError(true) }]}
            onError={() => setChartError(true)}
          />
        )}
      </div>
    </>
  );
}

// IncomeSlide: simple line chart using react-google-charts to avoid extra deps
export function IncomeSlide({ seriesData, rawIncome = null,rawExpenses = null, height = null, onViewModeChange = null }) {
  
  // Local view mode: either 按月显示 or 按年显示
  const [viewMode, setViewMode] = useState('按月显示');

  // If rawIncome is provided, derive a base monthly series (last 12 months excluding current)
  const buildBaseSeriesFromRaw = (income) => {
    const labels = [];
    const values = [];
    const now = new Date();
    for (let i = 12; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      labels.push(label);
      const total = (income || []).reduce((sum, rec) => {
        if (!rec || !rec.date) return sum;
        const [y, m] = rec.date.split('-').map(Number);
        if (y === d.getFullYear() && m === d.getMonth() + 1) {
          return sum + (Number(rec.after_tax ?? rec.amount ?? 0) || 0);
        }
        return sum;
      }, 0);
      values.push(total);
    }
    return { labels, values };
  };

  const baseSeries = rawIncome && Array.isArray(rawIncome) ? buildBaseSeriesFromRaw(rawIncome) : seriesData;



  // Build expense data (monthly or yearly)
  // const buildExpenseSeries = (expenses) => {
  //   if (!Array.isArray(expenses)) return { labels: [], values: [] };

  //   const now = new Date();
  //   if (viewMode === "按月显示") {
  //     const labels = [];
  //     const values = [];
  //     for (let i = 12; i >= 1; i--) {
  //       const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
  //       const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  //       labels.push(label);

  //       const total = expenses.reduce((sum, rec) => {
  //         if (!rec?.date) return sum;
  //         const [y, m] = rec.date.split("-").map(Number);
  //         if (y === d.getFullYear() && m === d.getMonth() + 1) {
  //           return sum + (Number(rec.amount ?? 0) || 0);
  //         }
  //         return sum;
  //       }, 0);
  //       values.push(total);
  //     }
  //     return { labels, values };
  //   } else if (viewMode === "按年显示") {
  //     const yearlyTotals = {};
  //     expenses.forEach((rec) => {
  //       if (!rec?.date) return;
  //       const [y] = rec.date.split("-").map(Number);
  //       if (!isNaN(y)) yearlyTotals[y] = (yearlyTotals[y] || 0) + (Number(rec.amount ?? 0) || 0);
  //     });
  //     const years = Object.keys(yearlyTotals).sort((a, b) => a - b);
  //     return { labels: years, values: years.map((y) => yearlyTotals[y]) };
  //   }
  //   return { labels: [], values: [] };
  // };

  // const expenseSeries = buildExpenseSeries(rawExpenses || []);




  // Transform data based on view mode
  const transformData = (rawData, mode) => {
    if (mode === '按年显示') {
      const currentYear = new Date().getFullYear();
      const yearlyTotals = {};

      // Prefer aggregating from rawIncome if available (more robust)
      if (rawIncome && Array.isArray(rawIncome) && rawIncome.length > 0) {
        rawIncome.forEach((rec) => {
          if (!rec) return;
          // Try to get year from rec.date (YYYY or YYYY-MM or YYYY-MM-DD)
          let year = null;
          if (rec.date && typeof rec.date === 'string') {
            const parts = rec.date.split('-');
            const y = parseInt(parts[0], 10);
            if (!isNaN(y)) year = y;
          }
          // Fallback: try parse leading YYYY from id (if id like 20230512_xxx)
          if (!year && rec.id && typeof rec.id === 'string') {
            const m = rec.id.match(/^(\d{4})/);
            if (m) year = parseInt(m[1], 10);
          }
          if (!year) return;
          // Exclude current year — we show through previous year
          if (year >= currentYear) return;
          const amount = Number(rec.after_tax ?? rec.amount ?? 0) || 0;
          yearlyTotals[year] = (yearlyTotals[year] || 0) + amount;
        });

        const yearsRecorded = Object.keys(yearlyTotals).map((y) => parseInt(y, 10)).sort((a, b) => a - b);
        if (yearsRecorded.length === 0) return rawData;

        // Start from first recorded year, end at previous year
        const startYear = yearsRecorded[0];
        const endYear = Math.min(Math.max(...yearsRecorded), currentYear - 1);

        const years = [];
        for (let y = startYear; y <= endYear; y++) years.push(y);

        return {
          labels: years.map(String),
          values: years.map((y) => yearlyTotals[y] || 0),
        };
      }

      // Fallback: aggregate from provided labels (expect YYYY or YYYY-MM)
      rawData.labels.forEach((label, idx) => {
        const value = rawData.values && rawData.values[idx] != null ? rawData.values[idx] : 0;
        let year = null;
        if (typeof label === 'string') {
          const maybeYear = parseInt(label.split('-')[0], 10);
          if (!isNaN(maybeYear)) year = maybeYear;
        }
        if (year && year < currentYear) {
          yearlyTotals[year] = (yearlyTotals[year] || 0) + value;
        }
      });

      const years = Object.keys(yearlyTotals)
        .map((y) => parseInt(y, 10))
        .sort((a, b) => a - b);

      if (years.length === 0) return rawData;

      return {
        labels: years.map(String),
        values: years.map((year) => yearlyTotals[year] || 0),
      };
    }
    return rawData;
  };

  const displayData = transformData(baseSeries || { labels: [], values: [] }, viewMode);
  
  // Build chart data rows
  // Compute simple moving average for smoothing
  const computeMovingAverage = (values, windowSize = 3) => {
    const result = [];
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const subset = values.slice(start, i + 1);
      const avg = subset.reduce((sum, v) => sum + v, 0) / subset.length;
      result.push(avg);
    }
    return result;
  };
  const smoothedValues = computeMovingAverage(displayData.values || [], 3);
  // const data = [
  //   ["Month", "收入"],
  //   ...displayData.labels.map((label, idx) => [label, displayData.values[idx] || 0]),
  // ];
  const data = [
  ["Month", "收入", "平均增长趋势"],
    ...displayData.labels.map((label, idx) => [
      label,
      displayData.values[idx] || 0,
      smoothedValues[idx] || null,
    ]),
  ];
//   const data = [
//   ["Month", "收入", "平均增长趋势", "支出"],
//   ...displayData.labels.map((label, idx) => {
//     const expenseIndex = expenseSeries.labels.indexOf(label);
//     const expenseValue = expenseIndex >= 0 ? expenseSeries.values[expenseIndex] : null;
//     return [
//       label,
//       displayData.values[idx] || 0,     // income
//       smoothedValues[idx] || null,      // moving avg
//       expenseValue || 0,                // expenses
//     ];
//   }),
// ];


  // Container ref for measuring available space so chart can size to the section
  const containerRef = useRef(null);
  const [chartHeightPx, setChartHeightPx] = useState(height || 350);

  // Remove the ResizeObserver since we're using 100% height for the chart
  useEffect(() => {
    // Only handle window resize for IE11 or other browsers that don't support 100% height properly
    if (!CSS.supports('height', '100%')) {
      const handleResize = () => {
        if (!containerRef.current) return;
        const height = containerRef.current.getBoundingClientRect().height;
        setChartHeightPx(Math.max(120, height - 100)); // account for title and combo box
      };
      
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Determine trend color like Robinhood: green if increasing, red if decreasing
  const getTrendColor = (values) => {
    if (!values || values.length === 0) return '#1976d2';
    const first = values.find((v) => v != null) ?? 0;
    const last = [...values].reverse().find((v) => v != null) ?? 0;
    if (last > first) return '#00C805'; // green-ish
    if (last < first) return '#FF5000'; // red-ish
    return '#1976d2'; // neutral blue fallback
  };

  const trendColor = getTrendColor(displayData.values || []);

const options = {
  legend: {
    position: 'bottom', // ✅ show legend below chart
    textStyle: { fontSize: 12 },
  },
  backgroundColor: 'transparent',
  hAxis: {
    title: viewMode === '按年显示' ? '年份' : '月份',
    slantedText: false,
    textStyle: { fontSize: 16 }, 
  },
  vAxis: {
    title: '收入',
    showTextEvery: 1,
    textStyle: { fontSize: 16 }, 
    titleTextStyle: { fontSize: 12 },
    textPosition: 'out', // ✅ ensures y-axis labels always drawn
  },
  colors: [trendColor, '#88bfff'],
  pointSize: 4,
  chartArea: {
    left: 90,   // ✅ give room for y-axis numbers
    right: 20,
    top: 20,
    bottom: 60, // ✅ extra space for legend
  },
};

// const options = {
//   legend: {
//     position: 'bottom',
//     textStyle: { fontSize: 12 },
//   },
//   backgroundColor: 'transparent',
//   hAxis: {
//     title: viewMode === '按年显示' ? '年份' : '月份',
//     slantedText: false,
//     textStyle: { fontSize: 14 },
//   },
//   vAxis: {
//     title: '金额',
//     showTextEvery: 1,
//     textStyle: { fontSize: 14 },
//     titleTextStyle: { fontSize: 12 },
//     textPosition: 'out',
//   },
//   colors: [trendColor, '#88bfff', '#ff4444'], // ✅ income, avg, expense
//   pointSize: 4,
//   chartArea: { left: 90, right: 20, top: 20, bottom: 60 },
// };







  const handleViewChange = (e) => {
    const v = e.target.value;
    setViewMode(v);
    if (onViewModeChange) onViewModeChange(v);
  };

  // Inform parent about current view and labels when displayData changes
  useEffect(() => {
    if (onViewModeChange) onViewModeChange(viewMode, displayData.labels || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, JSON.stringify(displayData.labels || [])]);





  


  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >

      {/* Chart section with fixed ratio */}
      <div style={{ 
        flex: 1,
        minHeight: 200,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}>
        {!navigator.onLine ? (
          <div>NO INTERNET<br />CHART NOT AVAILABLE</div>
        ) : (
          <div style={{ width: '100%', height: '100%', maxWidth: 980 }}>
            <Chart 
              chartType="LineChart" 
              data={data} 
              options={options} 
              width={'100%'} 
              height={'100%'} 
            />
          </div>
        )}
      </div>

      {/* Bottom section with combo box */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 300 }}>
          <select 
            value={viewMode} 
            onChange={handleViewChange} 
            style={{ 
              width: '100%',
              height: '32px',
              padding: '4px 8px'
            }}
          >
            <option value="按月显示">按月显示</option>
            <option value="按年显示">按年显示</option>
          </select>
        </div>
      </div>
    </div>
  );
}
export function IncomeExpenseCompare({ rawIncome = [], rawExpenses = [], height = 350 }) {
  const [viewMode, setViewMode] = useState("按月显示");

  // --- Aggregate data ---
  const buildSeries = (records, field = "amount", mode = "按月显示") => {
    const now = new Date();
    if (mode === "按年显示") {
      const yearlyTotals = {};
      records.forEach((rec) => {
        if (!rec?.date) return;
        const [y] = rec.date.split("-").map(Number);
        if (!isNaN(y)) yearlyTotals[y] = (yearlyTotals[y] || 0) + (Number(rec[field]) || 0);
      });
      const years = Object.keys(yearlyTotals).sort((a, b) => a - b);
      return { labels: years.map(String), values: years.map((y) => yearlyTotals[y]) };
    } else {
      const labels = [];
      for (let i = 12; i >= 1; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
      const values = labels.map((label) => {
        const [y, m] = label.split("-").map(Number);
        return records.reduce((sum, rec) => {
          if (!rec?.date) return sum;
          const [ry, rm] = rec.date.split("-").map(Number);
          if (ry === y && rm === m) return sum + (Number(rec[field]) || 0);
          return sum;
        }, 0);
      });
      return { labels, values };
    }
  };

  const incomeSeries = buildSeries(rawIncome, "after_tax", viewMode);
  const expenseSeries = buildSeries(rawExpenses, "amount", viewMode);

  // --- Chart data ---
  const data = [
    [viewMode === "按年显示" ? "年份" : "月份", "收入", "支出"],
    ...incomeSeries.labels.map((label, idx) => [
      label,
      incomeSeries.values[idx] || 0,
      expenseSeries.values[idx] || 0,
    ]),
  ];

  // --- Chart options ---
  const options = {
    legend: { position: "bottom", textStyle: { fontSize: 12 } },
    backgroundColor: "transparent",
    hAxis: {
      title: viewMode === "按年显示" ? "年份" : "月份",
      textStyle: { fontSize: 14 },
    },
    vAxis: {
      title: "金额",
      textStyle: { fontSize: 14 },
      titleTextStyle: { fontSize: 12 },
      textPosition: "out",
    },
    colors: ["#00C805", "#FF4444"], // 收入=绿, 支出=红
    chartArea: { left: 90, right: 20, top: 20, bottom: 60 },
    lineWidth: 2,
    pointSize: 4,
  };

  // --- Handle toggle ---
  const handleViewChange = (e) => {
    setViewMode(e.target.value);
  };

  // --- Responsive container (same as IncomeSlide) ---
  const containerRef = useRef(null);
  const [chartHeightPx, setChartHeightPx] = useState(height || 350);
  useEffect(() => {
    if (!CSS.supports("height", "100%")) {
      const handleResize = () => {
        if (!containerRef.current) return;
        const h = containerRef.current.getBoundingClientRect().height;
        setChartHeightPx(Math.max(120, h - 100));
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Chart section (same as IncomeSlide) */}
      <div
        style={{
          flex: 1,
          minHeight: 200,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <div style={{ width: "100%", height: "100%", maxWidth: 980 }}>
          <Chart
            chartType="LineChart"
            data={data}
            options={options}
            width={"100%"}
            height={"100%"}
          />
        </div>
      </div>

      {/* Combo box section (same style as IncomeSlide) */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 300 }}>
          <select
            value={viewMode}
            onChange={handleViewChange}
            style={{
              width: "100%",
              height: "32px",
              padding: "4px 8px",
            }}
          >
            <option value="按月显示">按月显示</option>
            <option value="按年显示">按年显示</option>
          </select>
        </div>
      </div>
    </div>
  );
}




export default { ExpenseSlide, IncomeSlide, IncomeExpenseCompare };
