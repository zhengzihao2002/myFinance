import React from "react";
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
          flex: "0 0 20%",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          justifyContent: "center",
          alignItems: "flex-start",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <label className="panel_font_size" style={{ width: "100%" }}>
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

        <label className="panel_font_size" style={{ width: "100%" }}>
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

      <div
        className="chart-container"
        style={{
          flex: 1,
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
            options={{ ...options, backgroundColor: 'transparent' }}
            width={"700px"}
            height={"350px"}
            chartEvents={[{ eventName: "error", callback: () => setChartError(true) }]}
            onError={() => setChartError(true)}
          />
        )}
      </div>
    </>
  );
}

// IncomeSlide: simple line chart using react-google-charts to avoid extra deps
export function IncomeSlide({ seriesData, height = 350 }) {
  const data = [
    ["Month", "收入"],
    ...seriesData.labels.map((label, idx) => [label, seriesData.values[idx] || 0]),
  ];

  const options = {
    legend: 'none',
    backgroundColor: 'transparent',
    hAxis: { title: 'Month' },
    vAxis: { title: '收入' },
    colors: ['#1976d2'],
    pointSize: 4,
    chartArea: { left: 60, right: 20, top: 20, bottom: 40 },
  };

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {!navigator.onLine ? (
        <div>NO INTERNET<br/>CHART NOT AVAILABLE</div>
      ) : (
        <div style={{ width: 720 }}>
          <Chart chartType="LineChart" data={data} options={options} height={height} />
        </div>
      )}
    </div>
  );
}

export default { ExpenseSlide, IncomeSlide };
