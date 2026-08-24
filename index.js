// The leaderboard: one row per model and configuration, and the same numbers
// again as a cost/score scatter.

let trials = [];
let runs = [];
const params = new URLSearchParams(location.search);
const state = {
    tab: params.get("tab") === "chart" ? "chart" : "leaderboard",
    models: new Set((params.get("models") ?? "").split(",").filter(Boolean)),
    // Every configuration now has a full set of runs, so none of them is
    // missing data that a comparison would misread. The filter opens empty,
    // which shows all of them.
    configs: new Set((params.get("configs") ?? "").split(",").filter(Boolean)),
    x: params.get("x") === "tokens" ? "tokens" : "cost",
};

// What the chart plots score against. Cost is the money question; output tokens
// is the same shape of question with the pricing taken out, which is the one to
// ask when comparing how much work two models did rather than what it billed.
// Cost is the total the configuration billed -- the number someone actually
// pays -- and comparable across rows because every configuration has the same
// set of runs behind it.
const METRICS = {
    cost: {
        label: "total cost", axis: "Total cost", unit: "",
        value: (row) => row.cost,
        tick: (value) => `$${value.toFixed(2)}`, format: money,
    },
    tokens: {
        label: "output tokens per trial", axis: "Output tokens per trial", unit: "/trial",
        value: (row) => row.out / row.attempts,
        tick: (value) => tokens(Math.round(value)), format: (value) => tokens(Math.round(value)),
    },
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
            cost: 0, out: 0, duration: 0, tasks: new Set(),
        };
        row.attempts += 1;
        row.tasks.add(trial.task);
        if (trial.reward !== null && trial.reward !== undefined) {
            row.graded += 1;
            if (trial.reward >= 1) row.solved += 1;
        }
        row.cost += trial.cost_usd ?? 0;
        row.out += trial.output_tokens ?? 0;
        row.duration += trial.duration_s ?? 0;
        byPair.set(key, row);
    }
    return [...byPair.values()]
        .map((row) => ({ ...row, rate: row.graded ? row.solved / row.graded : null }))
        .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1)
            || a.cost - b.cost);
}

function visible() {
    return trials.filter((trial) =>
        (!state.models.size || state.models.has(trial.model))
        && (!state.configs.size || state.configs.has(configOf(trial.job))));
}

// An empty set means no filter rather than nothing selected: a page that opens
// showing everything is the useful default, and clearing the last chip should
// go back to that instead of emptying the table.
// Each chip wears the colour its value is drawn in below -- a swatch for a
// model, its shape for a configuration -- so the legend and the filter are the
// same control, and picking a chip needs no cross-referencing.
function renderFilters(hues, configHues, shapes) {
    const models = [...new Set(trials.map((t) => t.model))].sort();
    const configs = [...new Set(trials.map((t) => configOf(t.job)))].sort();
    const chip = (key, value, hue, mark, label) => `<button class="chip"
        data-facet="${key}" data-value="${escapeHtml(value)}"
        style="--chip:${hueFill(hue)};--chip-text:${hueText(hue)}"
        aria-pressed="${state[key].has(value)}">${mark}${escapeHtml(label)}</button>`;
    return `<div class="filters">
        <div class="filter">
            <span class="key">Model</span>
            ${models.map((model) => chip("models", model, hues.get(model),
                `<i class="swatch"></i>`, shortModel(model))).join("")}
        </div>
        <div class="filter">
            <span class="key">Config</span>
            ${configs.map((config) => chip("configs", config, configHues.get(config),
                shapeGlyph(shapes.get(config), configHues.get(config)), config)).join("")}
        </div>
    </div>`;
}

function renderTabs() {
    return `<div class="tabs">
        ${[["leaderboard", "Leaderboard"], ["chart", "Chart"]].map(([id, label]) =>
            `<button data-tab="${id}" aria-selected="${state.tab === id}">${label}</button>`
        ).join("")}
    </div>`;
}

function renderLeaderboard(rows, hues, configHues, shapes) {
    if (!rows.length) return `<p class="empty">Nothing matches this filter.</p>`;
    const body = rows.map((row, i) => {
        // No fill at all at zero: a minimum width keeps a 1% score visible, but
        // it would also draw a coloured nub on a row that solved nothing.
        const fill = row.rate
            ? `<span class="bar-fill" style="width:${row.rate * 100}%;background:${
                hueFill(hues.get(row.model))}"></span>`
            : "";
        const configHue = configHues.get(row.config);
        return `<tr class="pick" data-model="${escapeHtml(row.model)}"
            data-config="${escapeHtml(row.config)}"
            style="--row:${hueFill(hues.get(row.model))};--cfg:${hueText(configHue)}">
            <td class="rank">${i + 1}</td>
            <td class="name"><span class="who"><i class="swatch"></i>${
                escapeHtml(shortModel(row.model))}</span>
                <span class="sub">${shapeGlyph(shapes.get(row.config), configHue)}${
                    escapeHtml(row.config)}</span></td>
            <td class="bar"><span class="bar-track">${fill}</span></td>
            <td class="num">${percent(row.rate)}</td>
            <td class="num">${row.solved}/${row.graded}</td>
            <td class="num">${row.tasks.size}</td>
            <td class="num">${money(row.cost)}</td>
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

// The chart says what it is plotting and lets that be changed, because the two
// x axes answer different questions and neither is the obvious default.
function renderChartHead(metric) {
    const options = [["cost", "Cost"], ["tokens", "Output tokens"]];
    return `<div class="chart-head">
        <h2 class="title">Score vs ${escapeHtml(metric.label)}</h2>
        <div class="seg" role="group" aria-label="X axis">
            ${options.map(([id, label]) => `<button data-x="${id}"
                aria-pressed="${state.x === id}">${label}</button>`).join("")}
        </div>
    </div>`;
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
function renderChart(rows, hues, shapes, configHues) {
    const metric = METRICS[state.x] ?? METRICS.cost;
    const head = renderChartHead(metric);
    const points = rows.filter((row) => row.rate !== null);
    if (!points.length) return `${head}<p class="empty">Nothing to plot.</p>`;

    const W = 900, H = 380, L = 52, R = 28, T = 34, B = 44;
    const plotW = W - L - R, plotH = H - T - B;
    const xTicks = niceTicks(Math.max(...points.map(metric.value)));
    const xMax = xTicks[xTicks.length - 1];
    const px = (value) => L + (xMax ? (value / xMax) * plotW : 0);
    const py = (rate) => T + plotH - rate * plotH;

    const grid = [0, 25, 50, 75, 100].map((value) => `<line class="gridline"
        x1="${L}" x2="${W - R}" y1="${py(value / 100)}" y2="${py(value / 100)}"/>
        <text class="tick" x="${L - 8}" y="${py(value / 100) + 4}"
            text-anchor="end">${value}%</text>`).join("");

    const xAxis = xTicks.map((value) => `<text class="tick" x="${px(value)}"
        y="${T + plotH + 18}" text-anchor="middle">${escapeHtml(metric.tick(value))}</text>`)
        .join("");

    const names = trimCommonPrefix([...new Set(points.map((p) => p.model))]);

    // Every point keeps its name, coloured to its model. Where they land is
    // settled after the fact by layoutChartLabels(), which can measure the text.
    // Each marker also gets an invisible disc, so a 6px shape is not a 6px target.
    const dots = points.map((row) => {
        const x = px(metric.value(row)), y = py(row.rate);
        // With one model in the plot trimCommonPrefix leaves nothing useful of
        // its name, and the chip above already says which model this is.
        const name = names.size > 1 ? `${names.get(row.model)} · ${row.config}` : row.config;
        const tip = `${shortModel(row.model)} · ${row.config} — ${percent(row.rate)}`
            + ` (${row.solved}/${row.graded}), ${metric.format(metric.value(row))}${metric.unit}`;
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
    // In the plot a shape is filled by model, but in its own legend it carries
    // the configuration's hue -- the same pairing the chips and the rows use.
    const configs = [...shapes].filter(([config]) => points.some((p) => p.config === config))
        .map(([config, shape]) => `<span style="color:${hueText(configHues.get(config))}">${
            shapeGlyph(shape, configHues.get(config))}${escapeHtml(config)}</span>`).join("");

    return `${head}<div class="chart-wrap"><div class="tip" hidden></div>
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img"
        aria-label="Score against ${escapeHtml(metric.label)}">
        ${grid}
        <line class="axis" x1="${L}" x2="${W - R}" y1="${T + plotH}" y2="${T + plotH}"/>
        <line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${T + plotH}"/>
        ${xAxis}
        <text class="axis-title" x="${L}" y="${T - 12}">Score</text>
        <text class="axis-title" x="${W - R}" y="${H - 6}"
            text-anchor="end">${escapeHtml(metric.axis)}</text>
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
    const configHues = configHueMap(trials.map((trial) => configOf(trial.job)));
    document.getElementById("content").innerHTML = [
        syntheticBanner(runs.some((run) => run.synthetic)),
        renderTabs(),
        renderFilters(hues, configHues, shapes),
        state.tab === "chart"
            ? renderChart(rows, hues, shapes, configHues)
            : renderLeaderboard(rows, hues, configHues, shapes),
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
    set("x", state.x === "tokens" ? "tokens" : "");
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
    const axis = event.target.closest("[data-x]");
    if (axis) {
        state.x = axis.dataset.x;
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
