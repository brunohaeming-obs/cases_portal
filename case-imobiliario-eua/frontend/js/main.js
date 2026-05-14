import { fetchStoryData, fetchSummary } from "./api.js";
import {
  renderCompletionsSupplyChart,
  renderHousingStartsChart,
  renderMortgageOriginationChart,
  renderMortgageRateChart,
  resizeCharts,
} from "./charts.js";
import { formatDelta, formatFullDate, formatUnit } from "./formatters.js";

const state = {
  period: "2018",
  housingMode: "ma12",
  storyData: null,
  summary: null,
};

const metricLabels = {
  MORTGAGE30US: "Taxa hipotecária atual",
  RCMFLOORIG: "Última originação de hipotecas",
  HOUST1FNSA: "Últimas casas iniciadas unifamiliares",
  MSACSR: "Últimos meses de oferta",
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  registerEvents();
  await loadData();
}

function registerEvents() {
  document.querySelectorAll("[data-period]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveButton("[data-period]", button);
      state.period = button.dataset.period;
      render();
    });
  });

  document.querySelectorAll("[data-housing-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveButton("[data-housing-mode]", button);
      state.housingMode = button.dataset.housingMode;
      render();
    });
  });

  document.getElementById("refresh-data").addEventListener("click", async () => {
    await loadData({ refresh: true });
  });

  window.addEventListener("resize", resizeCharts);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => resizeCharts());
    document.querySelectorAll(".chart").forEach((chart) => observer.observe(chart));
  }
}

async function loadData({ refresh = false } = {}) {
  setLoading(true);
  try {
    const [storyData, summary] = await Promise.all([fetchStoryData({ refresh }), fetchSummary({ refresh })]);
    state.storyData = storyData;
    state.summary = summary;
    document.getElementById("last-updated").textContent = formatFullDate(storyData.last_updated);
    render();
  } catch (error) {
    showError(error);
  } finally {
    setLoading(false);
  }
}

function render() {
  if (!state.storyData || !state.summary) return;

  renderSummaryCards();
  const series = state.storyData.series;
  renderMortgageRateChart(
    document.getElementById("chart-mortgage-rate"),
    filterPeriod(series.MORTGAGE30US),
  );
  renderMortgageOriginationChart(
    document.getElementById("chart-origination"),
    filterPeriod(series.RCMFLOORIG),
  );
  renderHousingStartsChart(
    document.getElementById("chart-housing-starts"),
    filterPeriod(series.HOUSTNSA),
    filterPeriod(series.HOUST1FNSA),
    state.housingMode,
  );
  renderCompletionsSupplyChart(
    document.getElementById("chart-completions-supply"),
    filterPeriod(series.COMPUTSA),
    filterPeriod(series.MSACSR),
  );
}

function renderSummaryCards() {
  document.querySelectorAll("[data-summary-card]").forEach((card) => {
    const code = card.dataset.summaryCard;
    const summary = state.summary[code];
    const metadata = state.storyData.metadata[code];
    const value = formatUnit(summary.latest_value, summary.unit, summary.unit === "%" ? 2 : 1);
    const delta = formatDelta(summary.yoy_change);
    const deltaClass = Number(summary.yoy_change) >= 0 ? "is-up" : "is-down";
    card.innerHTML = `
      <span class="badge">${code}</span>
      <h3>${metricLabels[code]}</h3>
      <div class="metric-card__value">${value}</div>
      <p class="metric-card__delta ${deltaClass}">${delta}</p>
      <p>${metadata.frequency} · ${formatFullDate(summary.latest_date)}</p>
    `;
  });
}

function filterPeriod(records) {
  if (state.period === "all") return records;

  const today = new Date();
  const start = new Date();
  if (state.period === "2018") {
    start.setFullYear(2018, 0, 1);
  } else if (state.period === "2020") {
    start.setFullYear(2020, 0, 1);
  } else {
    start.setFullYear(today.getFullYear() - 5);
  }

  return records.filter((record) => new Date(record.date) >= start);
}

function setActiveButton(selector, activeButton) {
  document.querySelectorAll(selector).forEach((button) => button.classList.remove("is-active"));
  activeButton.classList.add("is-active");
}

function setLoading(isLoading) {
  document.querySelectorAll(".chart").forEach((container) => {
    container.setAttribute("aria-busy", String(isLoading));
    const chart = window.echarts ? echarts.getInstanceByDom(container) : null;
    if (isLoading && chart) {
      chart.showLoading("default", {
        text: "Carregando dados econômicos...",
        color: "#82bdff",
        textColor: "#b8c2d7",
        maskColor: "rgba(13,18,28,0.55)",
      });
    } else if (chart) {
      chart?.hideLoading();
    }
  });
}

function showError(error) {
  document.querySelectorAll(".chart-card__footer").forEach((footer) => {
    const message = document.createElement("div");
    message.className = "state-message";
    message.textContent = `Não foi possível carregar uma ou mais séries. ${error.message}`;
    footer.prepend(message);
  });
}
