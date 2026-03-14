let DATA = null;
let currentView = "dashboard";
let historyLoaded = false;
const historyCharts = {};
let sortCol = "discount";
let sortDir = -1;
let activeFilter = null;
let showHidden = false;
let hideFavorites = false;

let auctions = [];
let currentAuctionId = null;

function apiUrl(path) {
  return `${path}${path.includes("?") ? "&" : "?"}auction=${currentAuctionId}`;
}

// Per-table sort state and cached data for highlight tables
const tableSorts = {
  "highest-priced-table": { col: "highBid", dir: 1 },
  "over-estimate-table": { col: "overAmount", dir: -1 },
  "underpriced-table": { col: "discount", dir: -1 },
  "favorites-table": { col: "discount", dir: -1 },
};
const tableData = {};

function fmt(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmt2(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}
function pct(n) { return n.toFixed(1) + "%"; }

function fmtClose(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

function discountColor(d) {
  if (d >= 90) return "var(--green)";
  if (d >= 70) return "#4ade80";
  if (d >= 50) return "var(--yellow)";
  if (d >= 30) return "var(--orange)";
  return "var(--red)";
}

function barWidth(d) {
  return Math.min(Math.max(d, 0), 100);
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function lotSortKey(l) {
  const m = l.lotNumber.match(/^(\d+)(.*)/);
  if (m) return [parseInt(m[1]), m[2]];
  return [0, l.lotNumber];
}

function compareLots(a, b, col, dir) {
  if (col === "lotNumber") {
    const ka = lotSortKey(a);
    const kb = lotSortKey(b);
    return (ka[0] - kb[0] || ka[1].localeCompare(kb[1])) * dir;
  }
  if (col === "name") {
    return a.name.localeCompare(b.name) * dir;
  }
  if (col === "closeTime") {
    return ((a.closeTime || "").localeCompare(b.closeTime || "")) * dir;
  }
  return ((a[col] ?? 0) - (b[col] ?? 0)) * dir;
}

function isVisible(l) {
  if (l.hidden && !showHidden) return false;
  if (l.favorited && hideFavorites) return false;
  return true;
}

function hideIcon(l) {
  const cls = l.hidden ? "hide-btn unhide" : "hide-btn";
  const icon = l.hidden
    ? `<svg width="12" height="12" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
    : `<svg width="12" height="12" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="7" r="2" fill="currentColor"/></svg>`;
  return `<button class="${cls}" data-lot="${esc(l.lotNumber)}" title="${l.hidden ? 'Show' : 'Hide'}">${icon}</button>`;
}

function favIcon(l) {
  const cls = l.favorited ? "fav-btn active" : "fav-btn";
  const icon = l.favorited
    ? `<svg width="12" height="12" viewBox="0 0 14 14"><polygon points="7 1 8.8 5.2 13 5.7 9.9 8.4 10.8 13 7 10.7 3.2 13 4.1 8.4 1 5.7 5.2 5.2" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>`
    : `<svg width="12" height="12" viewBox="0 0 14 14"><polygon points="7 1 8.8 5.2 13 5.7 9.9 8.4 10.8 13 7 10.7 3.2 13 4.1 8.4 1 5.7 5.2 5.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  return `<button class="${cls}" data-lot="${esc(l.lotNumber)}" title="${l.favorited ? 'Unfavorite' : 'Favorite'}">${icon}</button>`;
}

function actionsCell(l) {
  return `<td class="actions-col"><span class="lot-actions">${favIcon(l)}${hideIcon(l)}</span></td>`;
}

function nameCell(l) {
  return `<td class="name-col"><a href="${l.url}" target="_blank">${esc(l.lotNumber)} - ${esc(l.name)}</a></td>`;
}

function rowClass(l) {
  return l.hidden ? ' class="hidden-row"' : '';
}

function updateSortIndicators(tableId) {
  const table = document.getElementById(tableId);
  const state = tableId === "all-table" ? { col: sortCol, dir: sortDir } : tableSorts[tableId];
  table.querySelectorAll("thead th[data-col]").forEach(th => {
    const isActive = th.dataset.col === state.col;
    th.classList.toggle("sorted", isActive);
    th.querySelector(".sort-arrow").innerHTML = isActive && state.dir === 1 ? "&#9650;" : "&#9660;";
  });
}

async function toggleHide(lotNumber) {
  const lot = DATA.lots.find(l => l.lotNumber === lotNumber);
  if (!lot) return;

  const method = lot.hidden ? "DELETE" : "POST";
  await fetch(apiUrl("/api/hide"), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lotNumber }),
  });

  lot.hidden = !lot.hidden;
  renderAll();
  if (currentView === "favorites") renderFavorites();
  if (currentView === "untouched") renderUntouched();
}

async function toggleFavorite(lotNumber) {
  const lot = DATA.lots.find(l => l.lotNumber === lotNumber);
  if (!lot) return;

  const method = lot.favorited ? "DELETE" : "POST";
  await fetch(apiUrl("/api/favorite"), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lotNumber }),
  });

  lot.favorited = !lot.favorited;
  renderAll();
  if (currentView === "favorites") renderFavorites();
  if (currentView === "untouched") renderUntouched();
}

function renderFavorites() {
  if (!DATA) return;
  const favs = DATA.lots.filter(l => l.favorited);
  const tbody = document.querySelector("#favorites-table tbody");
  const empty = document.getElementById("favorites-empty");
  document.getElementById("favorites-count").textContent = favs.length;

  if (favs.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  const s = tableSorts["favorites-table"];
  const sorted = [...favs].sort((a, b) => compareLots(a, b, s.col, s.dir));
  tbody.innerHTML = sorted.map(l => `
    <tr${rowClass(l)}>
      ${actionsCell(l)}
      ${nameCell(l)}
      <td class="num">${l.median != null ? fmt2(l.median) : "-"}</td>
      <td class="num" style="color:${l.highBid > 0 ? "var(--text)" : "var(--text2)"}">${fmt2(l.highBid)}</td>
      <td class="num">${l.bidCount}</td>
      <td class="num">
        ${l.highBid > 0 ? `<span class="discount-bar" style="width:${barWidth(l.discount) * 0.6}px;background:${discountColor(l.discount)}"></span>
        <span style="color:${discountColor(l.discount)}">${pct(l.discount)}</span>` : '<span style="color:var(--text2)">-</span>'}
      </td>
      <td class="num">${fmtClose(l.closeTime)}</td>
    </tr>
  `).join("");
  updateSortIndicators("favorites-table");
}

function renderUntouched() {
  if (!DATA) return;
  const untouched = DATA.lots.filter(l => l.highBid <= 0 && isVisible(l));
  const tbody = document.querySelector("#untouched-table tbody");
  document.getElementById("untouched-count").textContent = untouched.length;

  const sorted = [...untouched].sort((a, b) => compareLots(a, b, "lotNumber", 1));
  tbody.innerHTML = sorted.map(l => `
    <tr${rowClass(l)}>
      ${actionsCell(l)}
      ${nameCell(l)}
      <td class="num">${l.median != null ? fmt2(l.median) : "-"}</td>
      <td class="num">${fmtClose(l.closeTime)}</td>
    </tr>
  `).join("");
}

function renderStats(stats) {
  const mostBids = DATA ? [...DATA.lots].sort((a, b) => b.bidCount - a.bidCount)[0] : null;
  const highestPrice = DATA ? [...DATA.lots].sort((a, b) => b.highBid - a.highBid)[0] : null;

  document.getElementById("stats-grid").innerHTML = `
    <div class="stat-card">
      <div class="label">Total Lots</div>
      <div class="value val-accent">${stats.totalLots}</div>
      <div class="sub">${stats.withBids} with bids, ${stats.withoutBids} without</div>
    </div>
    <div class="stat-card">
      <div class="label">Total Median Value</div>
      <div class="value">${fmt(stats.totalMedianValue)}</div>
      <div class="sub">Sum of all median estimates</div>
    </div>
    <div class="stat-card">
      <div class="label">Total High Bids</div>
      <div class="value val-yellow">${fmt(stats.totalHighBids)}</div>
      <div class="sub">Sum of all current bids</div>
    </div>
    <div class="stat-card">
      <div class="label">Value Gap</div>
      <div class="value val-green">${fmt(stats.gap)}</div>
      <div class="sub">Median value minus bids</div>
    </div>
    <div class="stat-card">
      <div class="label">Avg Discount</div>
      <div class="value val-orange">${pct(stats.avgDiscount)}</div>
      <div class="sub">Avg % below median (items w/ bids)</div>
    </div>
    <div class="stat-card clickable" id="stat-untouched">
      <div class="label">Untouched</div>
      <div class="value val-red">${stats.withoutBids}</div>
      <div class="sub">Lots with zero bids</div>
    </div>
  `;
  document.getElementById("bid-stats-grid").innerHTML = `
    <div class="stat-card">
      <div class="label">Total Bids</div>
      <div class="value val-accent">${stats.totalBids}</div>
      <div class="sub">Bids placed across all lots</div>
    </div>
    <div class="stat-card" id="stat-bidders">
      <div class="label">Unique Bidders</div>
      <div class="value val-accent" id="bidder-count">-</div>
      <div class="sub" id="bidder-sub"></div>
    </div>
    <div class="stat-card">
      <div class="label">Active (24h)</div>
      <div class="value val-green" id="bidder-active">-</div>
      <div class="sub">Peak: <span id="bidder-max">-</span></div>
    </div>
    <div class="stat-card">
      <div class="label">Most Contested</div>
      <div class="value val-yellow">${mostBids ? mostBids.bidCount + ' bids' : '-'}</div>
      <div class="sub">${mostBids ? esc(mostBids.lotNumber) + ' - ' + esc(mostBids.name) : ''}</div>
    </div>
    <div class="stat-card">
      <div class="label">Highest Priced</div>
      <div class="value val-yellow">${highestPrice ? fmt2(highestPrice.highBid) : '-'}</div>
      <div class="sub">${highestPrice ? esc(highestPrice.lotNumber) + ' - ' + esc(highestPrice.name) : ''}</div>
    </div>
  `;
}

function renderHighestPriced(lots) {
  const data = lots
    .filter(l => l.highBid > 0 && isVisible(l))
    .slice(0, 10);

  tableData["highest-priced-table"] = data;

  const s = tableSorts["highest-priced-table"];
  const sorted = [...data].sort((a, b) => compareLots(a, b, s.col, s.dir));

  document.querySelector("#highest-priced-table tbody").innerHTML = sorted.map(l => `
    <tr${rowClass(l)}>
      ${actionsCell(l)}
      ${nameCell(l)}
      <td class="num val-yellow">${fmt2(l.highBid)}</td>
      <td class="num">${l.median != null ? fmt2(l.median) : "-"}</td>
      <td class="num">${l.bidCount}</td>
    </tr>
  `).join("");
  updateSortIndicators("highest-priced-table");
}

function renderOverEstimate(lots) {
  const data = lots
    .filter(l => l.highBid > 0 && l.median != null && l.highBid > l.median && isVisible(l))
    .map(l => ({ ...l, overAmount: l.highBid - l.median }))
    .slice(0, 10);

  tableData["over-estimate-table"] = data;

  const tbody = document.querySelector("#over-estimate-table tbody");
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text2);text-align:center;padding:20px">No items currently over estimate</td></tr>';
    return;
  }

  const s = tableSorts["over-estimate-table"];
  const sorted = [...data].sort((a, b) => compareLots(a, b, s.col, s.dir));

  tbody.innerHTML = sorted.map(l => {
    const over = l.highBid - l.median;
    const overPct = (over / l.median * 100);
    return `
    <tr${rowClass(l)}>
      ${actionsCell(l)}
      ${nameCell(l)}
      <td class="num val-yellow">${fmt2(l.highBid)}</td>
      <td class="num">${fmt2(l.median)}</td>
      <td class="num val-red">+${fmt(over)} (+${overPct.toFixed(0)}%)</td>
    </tr>
  `;
  }).join("");
  updateSortIndicators("over-estimate-table");
}

function renderUnderpricedTable(lots) {
  const data = lots
    .filter(l => l.highBid > 0 && l.discount > 0 && isVisible(l))
    .map(l => ({ ...l, savings: l.median != null ? l.median - l.highBid : 0 }))
    .slice(0, 20);

  tableData["underpriced-table"] = data;

  document.getElementById("underpriced-count").textContent = "Top " + data.length;

  const s = tableSorts["underpriced-table"];
  const sorted = [...data].sort((a, b) => compareLots(a, b, s.col, s.dir));

  document.querySelector("#underpriced-table tbody").innerHTML = sorted.map(l => `
    <tr${rowClass(l)}>
      ${actionsCell(l)}
      ${nameCell(l)}
      <td class="num">${l.median != null ? fmt2(l.median) : "-"}</td>
      <td class="num">${fmt2(l.highBid)}</td>
      <td class="num val-green">${l.median != null ? fmt(l.median - l.highBid) : "-"}</td>
      <td class="num">
        <span class="discount-bar" style="width:${barWidth(l.discount)}px;background:${discountColor(l.discount)}"></span>
        <span style="color:${discountColor(l.discount)}">${pct(l.discount)}</span>
      </td>
    </tr>
  `).join("");
  updateSortIndicators("underpriced-table");
}

function resortHighlightTable(tableId) {
  const data = tableData[tableId];
  if (!data) return;
  if (tableId === "highest-priced-table") {
    const s = tableSorts[tableId];
    const sorted = [...data].sort((a, b) => compareLots(a, b, s.col, s.dir));
    document.querySelector("#highest-priced-table tbody").innerHTML = sorted.map(l => `
      <tr${rowClass(l)}>
        ${actionsCell(l)}
        ${nameCell(l)}
        <td class="num val-yellow">${fmt2(l.highBid)}</td>
        <td class="num">${l.median != null ? fmt2(l.median) : "-"}</td>
        <td class="num">${l.bidCount}</td>
      </tr>
    `).join("");
  } else if (tableId === "over-estimate-table") {
    if (data.length === 0) return;
    const s = tableSorts[tableId];
    const sorted = [...data].sort((a, b) => compareLots(a, b, s.col, s.dir));
    document.querySelector("#over-estimate-table tbody").innerHTML = sorted.map(l => {
      const over = l.highBid - l.median;
      const overPct = (over / l.median * 100);
      return `
      <tr${rowClass(l)}>
        ${actionsCell(l)}
        ${nameCell(l)}
        <td class="num val-yellow">${fmt2(l.highBid)}</td>
        <td class="num">${fmt2(l.median)}</td>
        <td class="num val-red">+${fmt(over)} (+${overPct.toFixed(0)}%)</td>
      </tr>
    `;
    }).join("");
  } else if (tableId === "underpriced-table") {
    const s = tableSorts[tableId];
    const sorted = [...data].sort((a, b) => compareLots(a, b, s.col, s.dir));
    document.querySelector("#underpriced-table tbody").innerHTML = sorted.map(l => `
      <tr${rowClass(l)}>
        ${actionsCell(l)}
        ${nameCell(l)}
        <td class="num">${l.median != null ? fmt2(l.median) : "-"}</td>
        <td class="num">${fmt2(l.highBid)}</td>
        <td class="num val-green">${l.median != null ? fmt(l.median - l.highBid) : "-"}</td>
        <td class="num">
          <span class="discount-bar" style="width:${barWidth(l.discount)}px;background:${discountColor(l.discount)}"></span>
          <span style="color:${discountColor(l.discount)}">${pct(l.discount)}</span>
        </td>
      </tr>
    `).join("");
  }
  updateSortIndicators(tableId);
}

function renderAllTable() {
  if (!DATA) return;
  const search = document.getElementById("search").value.toLowerCase();
  let filtered = DATA.lots.filter(l => {
    if (!isVisible(l)) return false;
    if (search && !l.name.toLowerCase().includes(search) && !l.lotNumber.toLowerCase().includes(search)) return false;
    if (activeFilter === "bids" && l.highBid <= 0) return false;
    if (activeFilter === "nobids" && l.highBid > 0) return false;
    return true;
  });

  filtered.sort((a, b) => compareLots(a, b, sortCol, sortDir));

  document.getElementById("all-lots-count").textContent = DATA.lots.length + " lots";
  document.getElementById("visible-count").textContent = filtered.length + " shown";

  document.querySelector("#all-table tbody").innerHTML = filtered.map(l => `
    <tr${rowClass(l)}>
      ${actionsCell(l)}
      ${nameCell(l)}
      <td class="num">${l.estimateLow != null ? fmt2(l.estimateLow) + " - " + fmt2(l.estimateHigh) : "-"}</td>
      <td class="num">${l.median != null ? fmt2(l.median) : "-"}</td>
      <td class="num" style="color:${l.highBid > 0 ? "var(--text)" : "var(--text2)"}">${fmt2(l.highBid)}</td>
      <td class="num">${l.bidCount}</td>
      <td class="num">
        ${l.highBid > 0 ? `<span class="discount-bar" style="width:${barWidth(l.discount) * 0.6}px;background:${discountColor(l.discount)}"></span>
        <span style="color:${discountColor(l.discount)}">${pct(l.discount)}</span>` : '<span style="color:var(--text2)">-</span>'}
      </td>
      <td class="num">${fmtClose(l.closeTime)}</td>
    </tr>
  `).join("");
  updateSortIndicators("all-table");
}

function renderAll() {
  if (!DATA) return;
  DATA.lots.sort((a, b) => a.highBid - b.highBid);
  renderHighestPriced(DATA.lots);
  DATA.lots.sort((a, b) => (b.highBid - (b.median ?? 0)) - (a.highBid - (a.median ?? 0)));
  renderOverEstimate(DATA.lots);
  DATA.lots.sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0));
  renderUnderpricedTable(DATA.lots);
  renderAllTable();
}

function sortTable(tableId, col) {
  if (tableId === "all-table") {
    if (sortCol === col) {
      sortDir *= -1;
    } else {
      sortCol = col;
      sortDir = col === "name" || col === "lotNumber" || col === "closeTime" ? 1 : -1;
    }
    renderAllTable();
  } else {
    const s = tableSorts[tableId];
    if (s.col === col) {
      s.dir *= -1;
    } else {
      s.col = col;
      s.dir = col === "name" || col === "lotNumber" || col === "closeTime" ? 1 : -1;
    }
    if (tableId === "favorites-table") {
      renderFavorites();
    } else {
      resortHighlightTable(tableId);
    }
  }
}

function toggleFilter(f) {
  activeFilter = activeFilter === f ? null : f;
  document.getElementById("filter-bids").classList.toggle("active", activeFilter === "bids");
  document.getElementById("filter-nobids").classList.toggle("active", activeFilter === "nobids");
  renderAllTable();
}

function makeChart(canvasId, datasets, tickFmt) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (historyCharts[canvasId]) {
    const chart = historyCharts[canvasId];
    chart.data.labels = datasets[0]._labels;
    chart.data.datasets.forEach((ds, i) => { ds.data = datasets[i].data; });
    chart.update();
    return;
  }

  historyCharts[canvasId] = new Chart(ctx, {
    type: "line",
    data: { labels: datasets[0]._labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "#8b90a0", font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label(tip) { return tip.dataset.label + ": " + tickFmt(tip.parsed.y); },
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: { unit: "hour", tooltipFormat: "MMM d, h:mm a", displayFormats: { hour: "MMM d ha" } },
          ticks: { color: "#8b90a0", font: { size: 11 }, maxTicksLimit: 10, maxRotation: 45 },
          grid: { color: "rgba(45,50,68,0.5)" },
        },
        y: {
          ticks: { color: "#8b90a0", font: { size: 11 }, callback: v => tickFmt(v) },
          grid: { color: "rgba(45,50,68,0.3)" },
        },
      },
    },
  });
}

async function loadHistory() {
  const res = await fetch(apiUrl("/api/history"));
  const history = await res.json();

  if (history.length === 0) {
    document.querySelectorAll(".chart-section").forEach(el => el.style.display = "none");
    document.getElementById("history-empty").style.display = "block";
    return;
  }

  const labels = history.map(h => h.timestamp);
  function ds(label, data, color) {
    return { label, data, _labels: labels, borderColor: color, backgroundColor: color + "1a", tension: 0.3, pointRadius: 4, borderWidth: 2 };
  }

  makeChart("chart-dollar", [
    ds("Total High Bids", history.map(h => h.totalHighBids), "#fbbf24"),
    ds("Value Gap", history.map(h => h.gap), "#34d399"),
  ], fmt);

  makeChart("chart-pct", [
    ds("Avg Discount", history.map(h => h.avgDiscount), "#fb923c"),
    ds("Max Discount", history.map(h => h.maxDiscount), "#60a5fa"),
  ], pct);

  makeChart("chart-count", [
    ds("With Bids", history.map(h => h.withBids), "#34d399"),
    ds("Without Bids", history.map(h => h.withoutBids), "#f87171"),
  ], v => String(v));
}

function switchView(view) {
  currentView = view;
  document.getElementById("view-dashboard").style.display = view === "dashboard" ? "" : "none";
  document.getElementById("view-favorites").style.display = view === "favorites" ? "" : "none";
  document.getElementById("view-untouched").style.display = view === "untouched" ? "" : "none";
  document.getElementById("view-history").style.display = view === "history" ? "" : "none";
  document.querySelectorAll(".nav-link[data-view]").forEach(a => {
    a.classList.toggle("active", a.dataset.view === view);
  });
  if (view === "history" && !historyLoaded) {
    historyLoaded = true;
    loadHistory();
  }
  if (view === "favorites") renderFavorites();
  if (view === "untouched") renderUntouched();
  window.location.hash = view === "dashboard" ? "" : view;
}

function showData() {
  renderStats(DATA.stats);
  renderAll();
  if (currentView === "favorites") renderFavorites();
  if (currentView === "untouched") renderUntouched();
  document.getElementById("loading").style.display = "none";
}

function updateBidderCard(stats) {
  const el = document.getElementById("bidder-count");
  const sub = document.getElementById("bidder-sub");
  const active = document.getElementById("bidder-active");
  const max = document.getElementById("bidder-max");
  if (el) el.textContent = stats.uniqueBidders;
  if (active && stats.activeLast24h != null) active.textContent = stats.activeLast24h;
  if (max && stats.maxActiveBidders) max.textContent = stats.maxActiveBidders;
  if (sub && stats.lotsRefreshed != null) {
    sub.textContent = `${stats.lotsRefreshed} lots updated`;
  }
}

async function loadBiddersCached() {
  try {
    const res = await fetch(apiUrl("/api/bidders/cached"));
    if (res.ok) {
      const stats = await res.json();
      updateBidderCard(stats);
    }
  } catch {}
}

async function refreshBidders() {
  try {
    const sub = document.getElementById("bidder-sub");
    if (sub) sub.textContent = "refreshing...";
    const res = await fetch(apiUrl("/api/bidders"));
    if (res.ok) {
      const stats = await res.json();
      updateBidderCard(stats);
    }
  } catch {}
}

async function loadCached() {
  try {
    const res = await fetch(apiUrl("/api/lots/cached"));
    if (!res.ok) return loadData();
    DATA = await res.json();
    showData();
    loadBiddersCached();
    scheduleAutoRefresh();
  } catch {
    return loadData();
  }
}

async function loadData() {
  const btn = document.getElementById("refresh-btn");
  const loading = document.getElementById("loading");

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Refreshing...';
  if (!DATA) loading.style.display = "flex";

  try {
    const lotsRes = await fetch(apiUrl("/api/lots"));
    DATA = await lotsRes.json();
    showData();
    refreshBidders();
  } catch (e) {
    alert("Failed to fetch data: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Refresh";
    loading.style.display = "none";
    scheduleAutoRefresh();
  }
}

// Auto-refresh every 5 minutes
const AUTO_REFRESH_MS = 5 * 60 * 1000;
let autoRefreshTimer = null;
let nextRefreshAt = null;

function scheduleAutoRefresh() {
  clearTimeout(autoRefreshTimer);
  nextRefreshAt = Date.now() + AUTO_REFRESH_MS;
  autoRefreshTimer = setTimeout(() => {
    loadData();
  }, AUTO_REFRESH_MS);
  updateCountdown();
}

function updateCountdown() {
  const el = document.getElementById("fetched-at");
  if (!el || !nextRefreshAt) return;
  const remaining = Math.max(0, nextRefreshAt - Date.now());
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const timeStr = DATA ? "Updated " + new Date(DATA.fetchedAt).toLocaleTimeString() : "";
  el.textContent = `${timeStr} (next in ${mins}:${secs.toString().padStart(2, "0")})`;
  if (remaining > 0) requestAnimationFrame(updateCountdown);
}

// Wire up event listeners
document.getElementById("refresh-btn").addEventListener("click", () => {
  loadData();
});
document.getElementById("search").addEventListener("input", renderAllTable);
document.getElementById("filter-bids").addEventListener("click", () => toggleFilter("bids"));
document.getElementById("filter-nobids").addEventListener("click", () => toggleFilter("nobids"));

document.getElementById("toggle-hidden").addEventListener("click", () => {
  showHidden = !showHidden;
  const btn = document.getElementById("toggle-hidden");
  btn.textContent = showHidden ? "Hide Hidden" : "Show Hidden";
  btn.classList.toggle("active", showHidden);
  renderAll();
  if (currentView === "untouched") renderUntouched();
});

document.getElementById("toggle-favs").addEventListener("click", () => {
  hideFavorites = !hideFavorites;
  const btn = document.getElementById("toggle-favs");
  btn.textContent = hideFavorites ? "Show Favorites" : "Hide Favorites";
  btn.classList.toggle("active", hideFavorites);
  renderAll();
  if (currentView === "untouched") renderUntouched();
});

// Sort handlers for all tables with data-col headers
document.querySelectorAll("table.sortable thead th[data-col], #all-table thead th[data-col]").forEach(th => {
  const table = th.closest("table");
  th.addEventListener("click", () => sortTable(table.id, th.dataset.col));
});

// Delegate clicks
document.addEventListener("click", (e) => {
  const hideBtn = e.target.closest(".hide-btn");
  if (hideBtn) return toggleHide(hideBtn.dataset.lot);
  const favBtn = e.target.closest(".fav-btn");
  if (favBtn) return toggleFavorite(favBtn.dataset.lot);
  if (e.target.closest("#stat-untouched")) return switchView("untouched");
});

// View switching
document.querySelectorAll(".nav-link[data-view]").forEach(a => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    switchView(a.dataset.view);
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && currentView !== "dashboard") switchView("dashboard");
});

// Auction switching
function resetAuctionState() {
  DATA = null;
  historyLoaded = false;
  for (const [key, chart] of Object.entries(historyCharts)) {
    chart.destroy();
    delete historyCharts[key];
  }
  document.querySelectorAll(".chart-section").forEach(el => el.style.display = "");
  document.getElementById("history-empty").style.display = "none";
}

function renderAuctionSelect() {
  const select = document.getElementById("auction-select");
  select.innerHTML = auctions.map(a =>
    `<option value="${a.id}"${a.id === currentAuctionId ? " selected" : ""}>${esc(a.title)}</option>`
  ).join("");
  select.style.display = auctions.length > 1 ? "" : "none";
}

function setAuctionTitle() {
  const auction = auctions.find(a => a.id === currentAuctionId);
  document.title = auction ? auction.title + " - AuctionDash" : "AuctionDash";
}

document.getElementById("auction-select").addEventListener("change", (e) => {
  currentAuctionId = parseInt(e.target.value);
  resetAuctionState();
  setAuctionTitle();
  if (currentView === "history") {
    historyLoaded = true;
    loadHistory();
  }
  loadCached();
});

// Init: load auctions, then data
async function init() {
  const hash = window.location.hash.slice(1);
  const initView = ["history", "favorites", "untouched"].includes(hash) ? hash : "dashboard";
  if (initView !== "dashboard") switchView(initView);

  try {
    const res = await fetch("/api/auctions");
    auctions = await res.json();
  } catch {
    auctions = [];
  }

  if (auctions.length > 0) {
    currentAuctionId = auctions[0].id;
    renderAuctionSelect();
    setAuctionTitle();
    loadCached();
  }
}

init();
