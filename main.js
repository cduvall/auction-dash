let DATA = null;
let sortCol = "discount";
let sortDir = -1;
let activeFilter = null;
let showHidden = false;

// Per-table sort state and cached data for highlight tables
const tableSorts = {
  "highest-priced-table": { col: "highBid", dir: 1 },
  "over-estimate-table": { col: "overAmount", dir: -1 },
  "underpriced-table": { col: "discount", dir: -1 },
};
const tableData = {};

function fmt(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmt2(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}
function pct(n) { return n.toFixed(1) + "%"; }

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
  return ((a[col] ?? 0) - (b[col] ?? 0)) * dir;
}

function isVisible(l) {
  return !l.hidden || showHidden;
}

function hideBtn(l) {
  const icon = l.hidden ? "&#x1F648;" : "&#x1F441;";
  const cls = l.hidden ? "hide-btn unhide" : "hide-btn";
  return `<button class="${cls}" data-lot="${esc(l.lotNumber)}" title="${l.hidden ? 'Show' : 'Hide'}">${icon}</button>`;
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
  await fetch("/api/hide", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lotNumber }),
  });

  lot.hidden = !lot.hidden;
  renderAll();
}

function renderStats(stats) {
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
    <div class="stat-card">
      <div class="label">Untouched</div>
      <div class="value val-red">${stats.withoutBids}</div>
      <div class="sub">Lots with zero bids</div>
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
      <td>${l.lotNumber}</td>
      <td class="name-col"><a href="${l.url}" target="_blank">${esc(l.name)}</a></td>
      <td class="num val-yellow">${fmt2(l.highBid)}</td>
      <td class="num">${l.median != null ? fmt2(l.median) : "-"}</td>
      <td class="num">${l.bidCount}</td>
      <td class="hide-col">${hideBtn(l)}</td>
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
      <td>${l.lotNumber}</td>
      <td class="name-col"><a href="${l.url}" target="_blank">${esc(l.name)}</a></td>
      <td class="num val-yellow">${fmt2(l.highBid)}</td>
      <td class="num">${fmt2(l.median)}</td>
      <td class="num val-red">+${fmt(over)} (+${overPct.toFixed(0)}%)</td>
      <td class="hide-col">${hideBtn(l)}</td>
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
      <td>${l.lotNumber}</td>
      <td class="name-col"><a href="${l.url}" target="_blank">${esc(l.name)}</a></td>
      <td class="num">${l.median != null ? fmt2(l.median) : "-"}</td>
      <td class="num">${fmt2(l.highBid)}</td>
      <td class="num val-green">${l.median != null ? fmt(l.median - l.highBid) : "-"}</td>
      <td class="num">
        <span class="discount-bar" style="width:${barWidth(l.discount)}px;background:${discountColor(l.discount)}"></span>
        <span style="color:${discountColor(l.discount)}">${pct(l.discount)}</span>
      </td>
      <td class="hide-col">${hideBtn(l)}</td>
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
        <td>${l.lotNumber}</td>
        <td class="name-col"><a href="${l.url}" target="_blank">${esc(l.name)}</a></td>
        <td class="num val-yellow">${fmt2(l.highBid)}</td>
        <td class="num">${l.median != null ? fmt2(l.median) : "-"}</td>
        <td class="num">${l.bidCount}</td>
        <td class="hide-col">${hideBtn(l)}</td>
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
        <td>${l.lotNumber}</td>
        <td class="name-col"><a href="${l.url}" target="_blank">${esc(l.name)}</a></td>
        <td class="num val-yellow">${fmt2(l.highBid)}</td>
        <td class="num">${fmt2(l.median)}</td>
        <td class="num val-red">+${fmt(over)} (+${overPct.toFixed(0)}%)</td>
        <td class="hide-col">${hideBtn(l)}</td>
      </tr>
    `;
    }).join("");
  } else if (tableId === "underpriced-table") {
    const s = tableSorts[tableId];
    const sorted = [...data].sort((a, b) => compareLots(a, b, s.col, s.dir));
    document.querySelector("#underpriced-table tbody").innerHTML = sorted.map(l => `
      <tr${rowClass(l)}>
        <td>${l.lotNumber}</td>
        <td class="name-col"><a href="${l.url}" target="_blank">${esc(l.name)}</a></td>
        <td class="num">${l.median != null ? fmt2(l.median) : "-"}</td>
        <td class="num">${fmt2(l.highBid)}</td>
        <td class="num val-green">${l.median != null ? fmt(l.median - l.highBid) : "-"}</td>
        <td class="num">
          <span class="discount-bar" style="width:${barWidth(l.discount)}px;background:${discountColor(l.discount)}"></span>
          <span style="color:${discountColor(l.discount)}">${pct(l.discount)}</span>
        </td>
        <td class="hide-col">${hideBtn(l)}</td>
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
      <td>${l.lotNumber}</td>
      <td class="name-col"><a href="${l.url}" target="_blank">${esc(l.name)}</a></td>
      <td class="num">${l.estimateLow != null ? fmt2(l.estimateLow) + " - " + fmt2(l.estimateHigh) : "-"}</td>
      <td class="num">${l.median != null ? fmt2(l.median) : "-"}</td>
      <td class="num" style="color:${l.highBid > 0 ? "var(--text)" : "var(--text2)"}">${fmt2(l.highBid)}</td>
      <td class="num">${l.bidCount}</td>
      <td class="num">
        ${l.highBid > 0 ? `<span class="discount-bar" style="width:${barWidth(l.discount) * 0.6}px;background:${discountColor(l.discount)}"></span>
        <span style="color:${discountColor(l.discount)}">${pct(l.discount)}</span>` : '<span style="color:var(--text2)">-</span>'}
      </td>
      <td class="hide-col">${hideBtn(l)}</td>
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
      sortDir = col === "name" || col === "lotNumber" ? 1 : -1;
    }
    renderAllTable();
  } else {
    const s = tableSorts[tableId];
    if (s.col === col) {
      s.dir *= -1;
    } else {
      s.col = col;
      s.dir = col === "name" || col === "lotNumber" ? 1 : -1;
    }
    resortHighlightTable(tableId);
  }
}

function toggleFilter(f) {
  activeFilter = activeFilter === f ? null : f;
  document.getElementById("filter-bids").classList.toggle("active", activeFilter === "bids");
  document.getElementById("filter-nobids").classList.toggle("active", activeFilter === "nobids");
  renderAllTable();
}

async function loadData() {
  const btn = document.getElementById("refresh-btn");
  const loading = document.getElementById("loading");

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Refreshing...';
  if (!DATA) loading.style.display = "flex";

  try {
    const res = await fetch("/api/lots");
    DATA = await res.json();
    renderStats(DATA.stats);
    renderAll();

    const t = new Date(DATA.fetchedAt);
    document.getElementById("fetched-at").textContent =
      "Updated " + t.toLocaleTimeString();
  } catch (e) {
    alert("Failed to fetch data: " + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Refresh";
    loading.style.display = "none";
  }
}

// Wire up event listeners
document.getElementById("refresh-btn").addEventListener("click", loadData);
document.getElementById("search").addEventListener("input", renderAllTable);
document.getElementById("filter-bids").addEventListener("click", () => toggleFilter("bids"));
document.getElementById("filter-nobids").addEventListener("click", () => toggleFilter("nobids"));

document.getElementById("toggle-hidden").addEventListener("click", () => {
  showHidden = !showHidden;
  const btn = document.getElementById("toggle-hidden");
  btn.textContent = showHidden ? "Hide Hidden" : "Show Hidden";
  btn.classList.toggle("active", showHidden);
  renderAll();
});

// Sort handlers for all tables with data-col headers
document.querySelectorAll("table.sortable thead th[data-col], #all-table thead th[data-col]").forEach(th => {
  const table = th.closest("table");
  th.addEventListener("click", () => sortTable(table.id, th.dataset.col));
});

// Delegate hide button clicks
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("hide-btn")) {
    toggleHide(e.target.dataset.lot);
  }
});

loadData();
