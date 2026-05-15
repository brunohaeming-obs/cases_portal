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

const metricCodeLabels = {
  HOUST1FNSA: "HOUSTNSA | HOUST1FNSA",
  MSACSR: "COMPUTSA | MSACSR",
};

const metricInsights = {
  MORTGAGE30US: {
    variable: "Condições financeiras do mercado imobiliário.",
    decision: "A elevação dos juros pode encarecer o financiamento, reduzir a acessibilidade e adiar parte da demanda.",
  },
  RCMFLOORIG: {
    variable: "Transformação das condições financeiras em comportamento efetivo do mercado.",
    decision: "Quando a originação perde força, o mercado residencial pode sinalizar enfraquecimento.",
  },
  HOUST1FNSA: {
    variable: "Atividade da construção residencial.",
    decision: "Novas construções podem sinalizar demanda futura por componentes, acabamentos e materiais.",
  },
  MSACSR: {
    variable: "Equilíbrio entre produção imobiliária e absorção da demanda.",
    decision: "Aumento simultâneo de conclusões e oferta em meses pode indicar acúmulo de estoque e exigir cautela.",
  },
};

const summarySectionMap = {
  problema: "problema",
  metodo: "metodo",
  "grafico-juros": "grafico-juros",
  "grafico-hipotecas": "grafico-hipotecas",
  "grafico-casas": "grafico-hipotecas",
  "grafico-oferta": "grafico-oferta",
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  registerEvents();
  registerSummaryObserver();
  await waitForECharts();
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

  document.querySelectorAll("[data-summary-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSummary(link.dataset.summaryLink);
    });
  });

  document.getElementById("refresh-data")?.addEventListener("click", async () => {
    await loadData({ refresh: true });
  });

  window.addEventListener("resize", resizeCharts);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => resizeCharts());
    document.querySelectorAll(".chart").forEach((chart) => observer.observe(chart));
  }
}

function registerSummaryObserver() {
  if (!("IntersectionObserver" in window)) return;

  const sections = Object.keys(summarySectionMap)
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) {
        setActiveSummary(summarySectionMap[visible.target.id]);
      }
    },
    { rootMargin: "-30% 0px -55% 0px", threshold: [0.12, 0.28, 0.45] },
  );

  sections.forEach((section) => observer.observe(section));
}

async function loadData({ refresh = false } = {}) {
  clearError();
  setLoading(true);
  try {
    const [storyData, summary] = await Promise.all([fetchStoryData({ refresh }), fetchSummary({ refresh })]);
    state.storyData = storyData;
    state.summary = summary;
    const lastUpdated = document.getElementById("last-updated");
    if (lastUpdated) {
      lastUpdated.textContent = formatFullDate(storyData.last_updated);
    }
    render();
    showSeriesWarnings(storyData.errors || {});
  } catch (error) {
    showError(`Não foi possível carregar os dados econômicos. ${error.message}`);
  } finally {
    setLoading(false);
  }
}

function render() {
  if (!state.storyData || !state.summary) return;

  renderSummaryCards();
  const series = state.storyData.series;
  renderMortgageRateChart(document.getElementById("chart-mortgage-rate"), filterPeriod(series.MORTGAGE30US || []));
  renderMortgageOriginationChart(document.getElementById("chart-origination"), filterPeriod(series.RCMFLOORIG || []));
  renderHousingStartsChart(
    document.getElementById("chart-housing-starts"),
    filterPeriod(series.HOUSTNSA || []),
    filterPeriod(series.HOUST1FNSA || []),
    state.housingMode,
  );
  renderCompletionsSupplyChart(
    document.getElementById("chart-completions-supply"),
    filterPeriod(series.COMPUTSA || []),
    filterPeriod(series.MSACSR || []),
  );
}

function renderSummaryCards() {
  document.querySelectorAll("[data-summary-card]").forEach((card) => {
    const code = card.dataset.summaryCard;
    const summary = state.summary[code] || {};
    const metadata = state.storyData.metadata[code] || {};
    const insight = metricInsights[code];
    const value = formatUnit(summary.latest_value, summary.unit, summary.unit === "%" ? 2 : 1);
    const delta = formatDelta(summary.yoy_change);
    const deltaClass = Number(summary.yoy_change) >= 0 ? "is-up" : "is-down";
    card.innerHTML = `
      <span class="badge">${metricCodeLabels[code] || code}</span>
      <h3>${metricLabels[code]}</h3>
      <div class="metric-card__value">${value}</div>
      <p class="metric-card__delta ${deltaClass}">${delta}</p>
      <p class="metric-card__date">${metadata.frequency || "frequência n.d."} · ${formatFullDate(summary.latest_date)}</p>
      ${
        insight
          ? `<div class="metric-card__insight">
              <h4>Interpretação Estratégica</h4>
              <dl>
              <dt>Variável → leitura</dt>
              <dd>${insight.variable}</dd>
              <dt>Leitura → decisão</dt>
              <dd>${insight.decision}</dd>
              </dl>
            </div>`
          : ""
      }
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

  return records.filter((record) => new Date(`${record.date}T12:00:00`) >= start);
}

function setActiveButton(selector, activeButton) {
  document.querySelectorAll(selector).forEach((button) => button.classList.remove("is-active"));
  activeButton.classList.add("is-active");
}

function setActiveSummary(key) {
  document.querySelectorAll("[data-summary-link]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.summaryLink === key);
  });
}

function setLoading(isLoading) {
  document.body.classList.toggle("is-loading", isLoading);
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
      chart.hideLoading();
    }
  });
}

function showSeriesWarnings(errors) {
  const codes = Object.keys(errors);
  if (codes.length) {
    showError(`Algumas séries estão indisponíveis no momento: ${codes.join(", ")}. A página permanece com os dados disponíveis.`);
  }
}

function showError(message) {
  const target = document.getElementById("page-state");
  if (!target) return;
  target.textContent = message;
  target.classList.remove("is-hidden");
}

function clearError() {
  const target = document.getElementById("page-state");
  if (!target) return;
  target.textContent = "";
  target.classList.add("is-hidden");
}

function waitForECharts() {
  if (window.echarts) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (window.echarts) {
        window.clearInterval(timer);
        resolve();
      } else if (attempts > 80) {
        window.clearInterval(timer);
        reject(new Error("Biblioteca de gráficos indisponível."));
      }
    }, 50);
  });
}
