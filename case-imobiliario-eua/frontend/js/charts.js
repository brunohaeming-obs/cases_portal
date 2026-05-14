import { formatCurrency, formatDate, formatNumber, formatPercent, formatUnit } from "./formatters.js";

const chartInstances = new Map();
const textColor = "#f6f8fc";
const mutedColor = "#95a3bd";
const gridColor = "rgba(255,255,255,0.08)";
const primary = "#82bdff";
const primaryStrong = "#0077fc";
const warning = "#f6b261";

export function disposeCharts() {
  chartInstances.forEach((chart) => chart.dispose());
  chartInstances.clear();
}

export function resizeCharts() {
  chartInstances.forEach((chart) => chart.resize());
}

export function renderMortgageRateChart(container, records) {
  const data = records.map((d) => [d.date, d.value, d.yoy_change]);
  const mean = average(records.map((d) => d.value));
  const chart = getChart(container);
  chart.setOption(baseOption({
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const item = params[0].data;
        return `<strong>${formatDate(item[0])}</strong><br>Taxa: ${formatPercent(item[1], 2)}<br>Variação em 12 meses: ${formatPercent(item[2], 2)}`;
      },
    },
    xAxis: timeAxis(),
    yAxis: valueAxis("%"),
    dataZoom: dataZoom(),
    series: [{
      name: "Taxa hipotecária",
      type: "line",
      smooth: true,
      showSymbol: false,
      data,
      lineStyle: { width: 3, color: primary },
      areaStyle: { color: "rgba(130,189,255,0.14)" },
      markLine: {
        symbol: "none",
        label: { color: mutedColor, formatter: "média do período" },
        lineStyle: { color: "rgba(246,178,97,0.86)", type: "dashed" },
        data: [{ yAxis: mean }],
      },
    }],
  }));
}

export function renderMortgageOriginationChart(container, records) {
  const chart = getChart(container);
  chart.setOption(baseOption({
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const bar = params[0].data;
        const line = params[1]?.data;
        return `<strong>${formatDate(bar[0])}</strong><br>Originação: ${formatCurrency(bar[1])}<br>Variação interanual: ${formatPercent(line?.[1], 1)}`;
      },
    },
    legend: legend(["Originação", "Var. interanual"]),
    xAxis: timeAxis(),
    yAxis: [valueAxis("US$ bi"), valueAxis("%", true)],
    dataZoom: dataZoom(),
    series: [
      {
        name: "Originação",
        type: "bar",
        data: records.map((d) => [d.date, d.value]),
        itemStyle: { color: primaryStrong, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 32,
      },
      {
        name: "Var. interanual",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        showSymbol: false,
        data: records.map((d) => [d.date, d.yoy_change]),
        lineStyle: { width: 3, color: warning },
      },
    ],
  }));
}

export function renderHousingStartsChart(container, totalRecords, singleRecords, mode = "ma12") {
  const label = mode === "yoy_change" ? "variação interanual" : mode === "ma12" ? "média móvel 12m" : "valor mensal";
  const unit = mode === "yoy_change" ? "%" : "mil unidades";
  const chart = getChart(container);
  chart.setOption(baseOption({
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const rows = params.map((param) => {
          const value = param.data[1];
          return `${param.marker}${param.seriesName}: ${mode === "yoy_change" ? formatPercent(value, 1) : formatNumber(value, 0)}`;
        });
        return `<strong>${formatDate(params[0].data[0])}</strong><br>${rows.join("<br>")}<br><span style="color:${mutedColor}">Indicador em ${label}</span>`;
      },
    },
    legend: legend(["Total", "Unifamiliares"]),
    xAxis: timeAxis(),
    yAxis: valueAxis(unit),
    dataZoom: dataZoom(),
    series: [
      lineSeries("Total", totalRecords, mode, "#6f86b2", 2),
      lineSeries("Unifamiliares", singleRecords, mode, primary, 4),
    ],
    graphic: [{
      type: "text",
      right: 28,
      top: 18,
      style: {
        text: "sinal antecedente da demanda futura",
        fill: "#b8c2d7",
        font: "700 12px Open Sans",
      },
    }],
  }));
}

export function renderCompletionsSupplyChart(container, completions, supply) {
  const chart = getChart(container);
  chart.setOption(baseOption({
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const bar = params.find((p) => p.seriesName === "Casas concluídas")?.data;
        const line = params.find((p) => p.seriesName === "Meses de oferta")?.data;
        return `<strong>${formatDate(params[0].axisValue)}</strong><br>Casas concluídas: ${formatUnit(bar?.[1], "mil unidades", 0)}<br>Oferta: ${formatUnit(line?.[1], "meses", 1)}`;
      },
    },
    legend: legend(["Casas concluídas", "Meses de oferta"]),
    xAxis: timeAxis(),
    yAxis: [valueAxis("mil unidades"), valueAxis("meses", true)],
    dataZoom: dataZoom(),
    series: [
      {
        name: "Casas concluídas",
        type: "bar",
        data: completions.map((d) => [d.date, d.value]),
        itemStyle: { color: "#55698d", borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 28,
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
          itemStyle: { opacity: 0.12 },
          data: [
            [{ yAxis: 0, itemStyle: { color: "#46d48f" }, name: "oferta baixa" }, { yAxis: 4 }],
            [{ yAxis: 4, itemStyle: { color: "#82bdff" }, name: "oferta normal" }, { yAxis: 7 }],
            [{ yAxis: 7, itemStyle: { color: "#f28c8c" }, name: "oferta elevada" }, { yAxis: 14 }],
          ],
        },
      },
    ],
  }));
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
    backgroundColor: "transparent",
    grid: { left: 54, right: 54, top: 58, bottom: 74 },
    textStyle: { color: textColor, fontFamily: "Open Sans" },
    ...option,
  };
}

function timeAxis() {
  return {
    type: "time",
    axisLine: { lineStyle: { color: gridColor } },
    axisLabel: { color: mutedColor },
    splitLine: { show: false },
  };
}

function valueAxis(name, right = false) {
  return {
    type: "value",
    name,
    nameTextStyle: { color: mutedColor },
    position: right ? "right" : "left",
    axisLabel: { color: mutedColor },
    splitLine: { lineStyle: { color: gridColor } },
  };
}

function dataZoom() {
  return [
    { type: "inside", filterMode: "none" },
    {
      type: "slider",
      height: 22,
      bottom: 22,
      borderColor: "rgba(164,184,214,0.16)",
      fillerColor: "rgba(130,189,255,0.14)",
      handleStyle: { color: primary },
      textStyle: { color: mutedColor },
    },
  ];
}

function legend(names) {
  return {
    data: names,
    top: 10,
    textStyle: { color: mutedColor },
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
  };
}

function average(values) {
  const valid = values.filter((value) => value !== null && value !== undefined && !Number.isNaN(Number(value)));
  return valid.reduce((sum, value) => sum + Number(value), 0) / valid.length;
}
