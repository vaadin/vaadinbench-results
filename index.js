// The leaderboard: one row per model and configuration, and the same numbers
// again as a cost/score scatter.

let trials = [];
let runs = [];
const params = new URLSearchParams(location.search);
const state = {
    tab: params.get("tab") === "chart" ? "chart" : "leaderboard",
    models: new Set((params.get("models") ?? "").split(",").filter(Boolean)),
    configs: new Set((params.get("configs") ?? "").split(",").filter(Boolean)),
};

// A configuration is what the run was testing; a model is who was doing it.
// Neither alone is a result, so the pair is the unit the leaderboard ranks.
function summarize(rows) {
    const byPair = new Map();
    for (const trial of rows) {
        const config = configOf(trial.job);
        const key = `${trial.model} ${config}`;
        const row = byPair.get(key) ?? {
            model: trial.model, config, attempts: 0, solved: 0, graded: 0,
            errored: 0, cost: 0, duration: 0, tasks: new Set(),
        };
        row.attempts += 1;
        row.tasks.add(trial.task);
        if (trial.error) row.errored += 1;
        if (trial.reward !== null && trial.reward !== undefined) {
            row.graded += 1;
            if (trial.reward >= 1) row.solved += 1;
        }
        row.cost += trial.cost_usd ?? 0;
        row.duration += trial.duration_s ?? 0;
        byPair.set(key, row);
    }
    return [...byPair.values()]
        .map((row) => ({ ...row, rate: row.graded ? row.solved / row.graded : null }))
        .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1)
            || a.cost / a.attempts - b.cost / b.attempts);
}

function visible() {
    return trials.filter((trial) =>
        (!state.models.size || state.models.has(trial.model))
        && (!state.configs.size || state.configs.has(configOf(trial.job))));
}

// An empty set means no filter rather than nothing selected: a page that opens
// showing everything is the useful default, and clearing the last chip should
// go back to that instead of emptying the table.
function renderFilters() {
    const models = [...new Set(trials.map((t) => t.model))].sort();
    const configs = [...new Set(trials.map((t) => configOf(t.job)))].sort();
    const group = (key, label, values, chosen) => `<div class="filter">
        <span class="key">${label}</span>
        ${values.map((value) => `<button class="chip" data-facet="${key}"
            data-value="${escapeHtml(value)}"
            aria-pressed="${chosen.has(value)}">${escapeHtml(
                key === "models" ? shortModel(value) : value)}</button>`).join("")}
    </div>`;
    return `<div class="filters">
        ${group("models", "Model", models, state.models)}
        ${group("configs", "Config", configs, state.configs)}
    </div>`;
}

function renderTabs() {
    return `<div class="tabs">
        ${[["leaderboard", "Leaderboard"], ["chart", "Chart"]].map(([id, label]) =>
            `<button data-tab="${id}" aria-selected="${state.tab === id}">${label}</button>`
        ).join("")}
    </div>`;
}

function renderLeaderboard(rows, hues) {
    if (!rows.length) return `<p class="empty">Nothing matches this filter.</p>`;
    const body = rows.map((row, i) => {
        // No fill at all at zero: a minimum width keeps a 1% score visible, but
        // it would also draw a coloured nub on a row that solved nothing.
        const fill = row.rate
            ? `<span class="bar-fill" style="width:${row.rate * 100}%;background:${
                hueFill(hues.get(row.model))}"></span>`
            : "";
        const errored = row.errored
            ? ` <span class="note" title="${row.errored} of ${row.attempts} trials reported an error">${row.errored}${NBSP}err</span>`
            : "";
        return `<tr class="pick" data-model="${escapeHtml(row.model)}"
            data-config="${escapeHtml(row.config)}">
            <td class="rank">${i + 1}</td>
            <td class="name">${escapeHtml(shortModel(row.model))}
                <span class="sub">${escapeHtml(row.config)}</span></td>
            <td class="bar"><span class="bar-track">${fill}</span></td>
            <td class="num">${percent(row.rate)}</td>
            <td class="num">${row.solved}/${row.graded}${errored}</td>
            <td class="num">${row.tasks.size}</td>
            <td class="num">${money(row.cost / row.attempts)}</td>
            <td class="num">${duration(row.duration / row.attempts)}</td>
        </tr>`;
    }).join("");

    return `<div class="wrap"><table>
        <thead><tr>
            <th></th><th>Model</th><th></th>
            <th class="num">Score</th><th class="num">Solved</th>
            <th class="num">Tasks</th><th class="num">Cost</th><th class="num">Time</th>
        </tr></thead>
        <tbody>${body}</tbody>
    </table></div>`;
}

// Round tick steps, so the cost axis reads $0.50 rather than $0.4267.
function niceTicks(max, target = 5) {
    if (!(max > 0)) return [0, 1];
    const rough = max / target;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude)
        .find((candidate) => candidate >= rough) ?? 10 * magnitude;
    const ticks = [];
    for (let value = 0; value < max + step; value += step) {
        ticks.push(Number(value.toFixed(10)));
    }
    return ticks;
}

// Score against cost: the question a ranking cannot answer, because the cheap
// row and the accurate row are never next to each other in one.
function renderChart(rows, hues, shapes) {
    const points = rows.filter((row) => row.rate !== null);
    if (!points.length) return `<p class="empty">Nothing to plot.</p>`;

    const W = 900, H = 380, L = 52, R = 28, T = 34, B = 44;
    const plotW = W - L - R, plotH = H - T - B;
    const xTicks = niceTicks(Math.max(...points.map((p) => p.cost / p.attempts)));
    const xMax = xTicks[xTicks.length - 1];
    const px = (cost) => L + (xMax ? (cost / xMax) * plotW : 0);
    const py = (rate) => T + plotH - rate * plotH;

    const grid = [0, 25, 50, 75, 100].map((value) => `<line class="gridline"
        x1="${L}" x2="${W - R}" y1="${py(value / 100)}" y2="${py(value / 100)}"/>
        <text class="tick" x="${L - 8}" y="${py(value / 100) + 4}"
            text-anchor="end">${value}%</text>`).join("");

    const xAxis = xTicks.map((value) => `<text class="tick" x="${px(value)}"
        y="${T + plotH + 18}" text-anchor="middle">$${value.toFixed(2)}</text>`).join("");

    const names = trimCommonPrefix([...new Set(points.map((p) => p.model))]);

    // Every point keeps its name, coloured to its model. Where they land is
    // settled after the fact by layoutChartLabels(), which can measure the text.
    // Each marker also gets an invisible disc, so a 6px shape is not a 6px target.
    const dots = points.map((row) => {
        const x = px(row.cost / row.attempts), y = py(row.rate);
        const name = `${names.get(row.model)} · ${row.config}`;
        const tip = `${shortModel(row.model)} · ${row.config} — ${percent(row.rate)}`
            + ` (${row.solved}/${row.graded}), ${money(row.cost / row.attempts)}/trial`;
        return `<g data-tip="${escapeHtml(tip)}">
            <circle class="hit" cx="${x}" cy="${y}" r="13"/>
            ${marker(shapes.get(row.config), x, y, `fill:${hueFill(hues.get(row.model))}`)}
            <text class="dot-label" data-cx="${x}" data-cy="${y}" x="${x + 11}"
                y="${y + 4}" style="fill:${hueText(hues.get(row.model))}">${escapeHtml(name)}</text>
        </g>`;
    }).join("");

    const models = [...hues].filter(([model]) => points.some((p) => p.model === model))
        .map(([model, hue]) => `<span><i style="background:${hueFill(hue)}"></i>
            ${escapeHtml(shortModel(model))}</span>`).join("");
    const configs = [...shapes].filter(([config]) => points.some((p) => p.config === config))
        .map(([config, shape]) => `<span><svg viewBox="0 0 14 14" aria-hidden="true">${
            marker(shape, 7, 7, "", "shape", 5)
        }</svg>${escapeHtml(config)}</span>`).join("");

    return `<div class="chart-wrap"><div class="tip" hidden></div>
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img"
        aria-label="Score against cost per trial">
        ${grid}
        <line class="axis" x1="${L}" x2="${W - R}" y1="${T + plotH}" y2="${T + plotH}"/>
        <line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${T + plotH}"/>
        ${xAxis}
        <text class="axis-title" x="${L}" y="${T - 12}">Score</text>
        <text class="axis-title" x="${W - R}" y="${H - 6}" text-anchor="end">Cost / trial</text>
        ${dots}
    </svg></div>
    <div class="legend">${models}</div>
    <div class="legend">${configs}</div>`;
}

function render() {
    const rows = summarize(visible());
    // Both maps are built from every trial, not the filtered set, so a model
    // keeps its colour and a configuration its shape as chips are toggled.
    const hues = hueMap(trials.map((trial) => trial.model));
    const shapes = shapeMap(trials.map((trial) => configOf(trial.job)));
    document.getElementById("content").innerHTML = [
        syntheticBanner(runs.some((run) => run.synthetic)),
        renderTabs(),
        renderFilters(),
        state.tab === "chart"
            ? renderChart(rows, hues, shapes)
            : renderLeaderboard(rows, hues),
    ].join("");
    const content = document.getElementById("content");
    bindTips(content);
    const chart = content.querySelector(".chart");
    layoutChartLabels(chart);
    document.fonts?.ready.then(() => layoutChartLabels(chart));
}

// The whole view is in the URL, so a filtered leaderboard or the chart is a
// link someone can send rather than a set of clicks they have to describe.
function syncUrl() {
    const url = new URL(location.href);
    const set = (key, value) =>
        value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
    set("tab", state.tab === "chart" ? "chart" : "");
    set("models", [...state.models].join(","));
    set("configs", [...state.configs].join(","));
    history.replaceState(null, "", url);
}

document.getElementById("content").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
        state.tab = tab.dataset.tab;
        syncUrl();
        render();
        return;
    }
    const chip = event.target.closest("[data-facet]");
    if (chip) {
        const chosen = state[chip.dataset.facet];
        const value = chip.dataset.value;
        chosen.has(value) ? chosen.delete(value) : chosen.add(value);
        syncUrl();
        render();
        return;
    }
    const row = event.target.closest("tr.pick");
    if (row) location.href = runUrl(row.dataset.model, row.dataset.config);
});

fetchJson("data/index.json").then((index) => {
    runs = index.runs ?? [];
    trials = runs.flatMap((run) => run.trials ?? []);
    if (!trials.length) {
        document.getElementById("content").innerHTML =
            `<p class="empty">No results published yet.</p>`;
    } else {
        render();
    }
    renderFooter(index.generated_at);
}).catch(showError);
