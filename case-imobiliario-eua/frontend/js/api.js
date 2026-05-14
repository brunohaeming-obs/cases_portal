const headers = { Accept: "application/json" };

export async function fetchStoryData({ refresh = false } = {}) {
  return requestJson(`/api/story-data${refresh ? "?refresh=true" : ""}`);
}

export async function fetchSummary({ refresh = false } = {}) {
  return requestJson(`/api/summary${refresh ? "?refresh=true" : ""}`);
}

async function requestJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Falha na requisicao ${url}`);
  }
  return response.json();
}
