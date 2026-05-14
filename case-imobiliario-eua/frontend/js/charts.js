import { formatCurrency, formatDate, formatNumber, formatPercent, formatUnit } from "./formatters.js";

const chartInstances = new Map();
const textColor = "#f6f8fc";
const mutedColor = "#b8c2d7";
const subtleColor = "#95a3bd";
const gridColor = "rgba(255,255,255,0.07)";
const primary = "#82bdff";
const primaryStrong = "#0077fc";
const barBlue = "#2f7fd4";
const warning = "#f6b261";

export function disposeCharts() {
  chartInstances.forEach((chart) => chart.dispose());
  chartInstances.clear();
}

export function resizeCharts() {
  chartInstances.forEach((chart) => chart.resize());
}

export function renderMortgageRateChart(container, records) {
  if (!container) return;
  const chart = getChart(container);
  if (!records.length) return renderEmpty(chart, "Série MORTGAGE30US indisponível.");

  const data = records.map((d) => [d.date, d.value, d.yoy_change]);
  const lastPoint = lastValid(records, "value");
  const mean = average(records.map((d) => d.value));
  chart.setOption(baseOption({
    tooltip: tooltip({
      formatter: (params) => {
        const item = params[0].data;
        return tooltipRows(formatDate(item[0]), [
          ["Taxa hipotecária", formatPercent(item[1], 2)],
          ["Variação em 12 meses", formatPercent(item[2], 2)],
        ]);
      },
    }),
    xAxis: timeAxis(),
    yAxis: valueAxis("%"),
    dataZoom: dataZoom(),
    series: [
      {
        name: "Taxa hipotecária",
        type: "line",
        smooth: true,
        showSymbol: false,
        data,
        lineStyle: { width: 2.8, color: primary },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(130,189,255,0.26)" },
            { offset: 1, color: "rgba(130,189,255,0.02)" },
          ]),
        },
        markLine: mean === null ? undefined : {
          symbol: "none",
          label: { color: subtleColor, formatter: "média do período" },
          lineStyle: { color: "rgba(246,178,97,0.82)", type: "dashed", width: 1.4 },
          data: [{ yAxis: mean }],
        },
      },
      {
        name: "Último valor",
        type: "scatter",
        symbolSize: 10,
        data: lastPoint ? [[lastPoint.date, lastPoint.value]] : [],
        itemStyle: { color: "#f6f8fc", borderColor: primary, borderWidth: 3 },
        tooltip: { show: false },
        z: 5,
      },
    ],
  }), true);
}

export function renderMortgageOriginationChart(container, records) {
  if (!container) return;
  const chart = getChart(container);
  if (!records.length) return renderEmpty(chart, "Série RCMFLOORIG indisponível.");

  chart.setOption(baseOption({
    tooltip: tooltip({
      formatter: (params) => {
        const bar = params[0].data;
        const line = params[1]?.data;
        return tooltipRows(formatDate(bar[0]), [
          ["Originação", formatCurrency(bar[1])],
          ["Variação interanual", formatPercent(line?.[1], 1)],
        ]);
      },
    }),
    legend: legend(["Originação", "Var. interanual"]),
    xAxis: timeAxis(),
    yAxis: [valueAxis("US$ bi"), valueAxis("%", true)],
    dataZoom: dataZoom(),
    series: [
      {
        name: "Originação",
        type: "bar",
        data: records.map((d) => [d.date, d.value]),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(47,127,212,0.96)" },
            { offset: 1, color: "rgba(47,127,212,0.48)" },
          ]),
          borderRadius: [6, 6, 0, 0],
        },
        barMaxWidth: 34,
      },
      {
        name: "Var. interanual",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        showSymbol: false,
        data: records.map((d) => [d.date, d.yoy_change]),
        lineStyle: { width: 2.6, color: warning },
      },
    ],
  }), true);
}

export function renderHousingStartsChart(container, totalRecords, singleRecords, mode = "ma12") {
  if (!container) return;
  const chart = getChart(container);
  if (!totalRecords.length && !singleRecords.length) return renderEmpty(chart, "Séries de casas iniciadas indisponíveis.");

  const label = mode === "yoy_change" ? "variação anual" : mode === "ma12" ? "média móvel de 12 meses" : "valor mensal";
  const unit = mode === "yoy_change" ? "%" : "mil unidades";
  chart.setOption(baseOption({
    tooltip: tooltip({
      formatter: (params) => {
        const rows = params.map((param) => [
          param.seriesName,
          mode === "yoy_change" ? formatPercent(param.data[1], 1) : formatNumber(param.data[1], 0),
        ]);
        rows.push(["Leitura", label]);
        return tooltipRows(formatDate(params[0].data[0]), rows);
      },
    }),
    legend: legend(["Total", "Unifamiliares"]),
    xAxis: timeAxis(),
    yAxis: valueAxis(unit),
    dataZoom: dataZoom(),
    series: [
      lineSeries("Total", totalRecords, mode, "#6f86b2", 2),
      lineSeries("Unifamiliares", singleRecords, mode, primary, 3.4),
    ],
  }), true);
}

export function renderCompletionsSupplyChart(container, completions, supply) {
  if (!container) return;
  const chart = getChart(container);
  if (!completions.length && !supply.length) return renderEmpty(chart, "Séries de conclusão e oferta indisponíveis.");

  chart.setOption(baseOption({
    tooltip: tooltip({
      formatter: (params) => {
        const bar = params.find((p) => p.seriesName === "Casas concluídas")?.data;
        const line = params.find((p) => p.seriesName === "Meses de oferta")?.data;
        return tooltipRows(formatDate(params[0].axisValue), [
          ["Casas concluídas", formatUnit(bar?.[1], "mil unidades", 0)],
          ["Meses de oferta", formatUnit(line?.[1], "meses", 1)],
        ]);
      },
    }),
    legend: legend(["Casas concluídas", "Meses de oferta"]),
    xAxis: timeAxis(),
    yAxis: [valueAxis("mil unidades"), valueAxis("meses", true)],
    dataZoom: dataZoom(),
    series: [
      {
        name: "Casas concluídas",
        type: "bar",
        data: completions.map((d) => [d.date, d.value]),
        itemStyle: { color: "rgba(47,127,212,0.62)", borderRadius: [6, 6, 0, 0] },
        barMaxWidth: 30,
      },
      {
        name: "Meses de oferta",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        showSymbol: false,
        data: supply.map((d) => [d.date, d.value]),
        lineStyle: { width: 3, color: warning },
        markArea: {
          silent: true,
          itemStyle: { opacity: 0.1 },
          data: [
            [{ yAxis: 0, itemStyle: { color: "#46d48f" }, name: "oferta baixa" }, { yAxis: 4 }],
            [{ yAxis: 4, itemStyle: { color: "#82bdff" }, name: "oferta normal" }, { yAxis: 7 }],
            [{ yAxis: 7, itemStyle: { color: "#f28c8c" }, name: "oferta elevada" }, { yAxis: 14 }],
          ],
        },
      },
    ],
  }), true);
}

function getChart(container) {
  if (!chartInstances.has(container.id)) {
    chartInstances.set(container.id, echarts.init(container, null, { renderer: "canvas" }));
  }
  return chartInstances.get(container.id);
}

function baseOption(option) {
  return {
    aria: { enabled: true },
    animationDuration: 700,
    animationEasing: "cubicOut",
    backgroundColor: "transparent",
    grid: { left: 52, right: 32, top: 58, bottom: 72, containLabel: true },
    textStyle: { color: textColor, fontFamily: "Open Sans" },
    ...option,
  };
}

function tooltip(extra = {}) {
  return {
    trigger: "axis",
    confine: true,
    backgroundColor: "rgba(13, 18, 28, 0.96)",
    borderColor: "rgba(130, 189, 255, 0.34)",
    borderWidth: 1,
    padding: [12, 14],
    textStyle: { color: textColor, fontFamily: "Open Sans", fontSize: 12 },
    axisPointer: {
      type: "line",
      lineStyle: { color: "rgba(130, 189, 255, 0.48)", width: 1.2 },
      crossStyle: { color: "rgba(130, 189, 255, 0.38)" },
    },
    ...extra,
  };
}

function tooltipRows(title, rows) {
  const content = rows
    .map(([label, value]) => `<div style="display:flex;gap:18px;justify-content:space-between;"><span style="color:${mutedColor}">${label}</span><strong>${value}</strong></div>`)
    .join("");
  return `<div style="min-width:220px"><div style="margin-bottom:8px;font-weight:800">${title}</div>${content}</div>`;
}

function renderEmpty(chart, message) {
  chart.clear();
  chart.setOption(baseOption({
    graphic: [{
      type: "text",
      left: "center",
      top: "middle",
      style: {
        text: message,
        fill: mutedColor,
        font: "700 14px Open Sans",
      },
    }],
    xAxis: { show: false },
    yAxis: { show: false },
    series: [],
  }), true);
}

function timeAxis() {
  return {
    type: "time",
    axisLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
    axisTick: { show: false },
    axisLabel: { color: mutedColor, hideOverlap: true, fontSize: 11 },
    splitLine: { show: false },
  };
}

function valueAxis(name, right = false) {
  return {
    type: "value",
    name,
    nameTextStyle: { color: subtleColor, padding: [0, 0, 8, 0], fontWeight: 700 },
    position: right ? "right" : "left",
    axisTick: { show: false },
    axisLine: { show: false },
    axisLabel: { color: mutedColor, fontSize: 11 },
    splitLine: { lineStyle: { color: gridColor } },
  };
}

function dataZoom() {
  return [
    { type: "inside", filterMode: "none" },
    {
      type: "slider",
      height: 20,
      bottom: 22,
      borderColor: "rgba(164,184,214,0.14)",
      backgroundColor: "rgba(9,14,22,0.3)",
      fillerColor: "rgba(130,189,255,0.13)",
      handleStyle: { color: primary, borderColor: "rgba(246,248,252,0.5)" },
      moveHandleStyle: { color: primary },
      dataBackground: {
        lineStyle: { color: "rgba(130,189,255,0.28)" },
        areaStyle: { color: "rgba(130,189,255,0.06)" },
      },
      selectedDataBackground: {
        lineStyle: { color: "rgba(130,189,255,0.46)" },
        areaStyle: { color: "rgba(130,189,255,0.12)" },
      },
      textStyle: { color: subtleColor },
    },
  ];
}

function legend(names) {
  return {
    data: names,
    top: 8,
    right: 18,
    itemWidth: 16,
    itemHeight: 8,
    textStyle: { color: mutedColor, fontSize: 11, fontWeight: 700 },
  };
}

function lineSeries(name, records, key, color, width) {
  return {
    name,
    type: "line",
    smooth: true,
    showSymbol: false,
    data: records.map((d) => [d.date, d[key]]),
    lineStyle: { width, color },
    emphasis: { focus: "series" },
  };
}

function average(values) {
  const valid = values.filter((value) => value !== null && value !== undefined && !Number.isNaN(Number(value)));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + Number(value), 0) / valid.length;
}

function lastValid(records, key) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index];
    if (record?.[key] !== null && record?.[key] !== undefined && !Number.isNaN(Number(record[key]))) {
      return record;
    }
  }
  return null;
}
