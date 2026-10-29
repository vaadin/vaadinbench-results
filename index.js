// The leaderboard: one row per model and configuration, and the same numbers
// again as a cost/score scatter.

let trials = [];
let runs = [];
const params = new URLSearchParams(location.search);
const COLUMNS = [
    { key: "model", label: "Model", width: "w-60", dir: "asc",
        value: (row) => `${modelWithEffort(row.model, row.effort)} ${row.config}`.toLowerCase() },
    { key: "score", label: "Score", width: "w-24", num: true, dir: "desc",
        value: (row) => row.rate ?? -1 },
    { key: "solved", label: "Solved", width: "w-28", num: true, dir: "desc", value: (row) => row.solved },
    { key: "tasks", label: "Tasks", width: "w-24", num: true, dir: "desc", value: (row) => row.tasks.size },
    { key: "cost", label: "Cost / trial", width: "w-38", num: true, dir: "asc",
        value: (row) => row.cost / row.attempts },
    { key: "time", label: "Time / trial", width: "w-38", num: true, dir: "asc",
        value: (row) => row.duration / row.attempts },
];

// Score descending is what summarize() already ranks by, so it is the default
// here too: the page opens on the ranking it has always opened on.
const DEFAULT_SORT = COLUMNS.find((column) => column.key === "score");
const sortColumn = COLUMNS.find((column) => column.key === params.get("sort"))
    ?? DEFAULT_SORT;

const state = {
    tab: params.get("tab") === "chart" ? "chart" : "leaderboard",
    sort: sortColumn.key,
    dir: params.get("dir") === "asc" || params.get("dir") === "desc"
        ? params.get("dir") : sortColumn.dir,
    models: new Set((params.get("models") ?? "").split(",").filter(Boolean)),
    // Every configuration now has a full set of runs, so none of them is
    // missing data that a comparison would misread. The filter opens empty,
    // which shows all of them.
    configs: new Set((params.get("configs") ?? "").split(",").filter(Boolean).map(configOf)),
    x: params.get("x") === "tokens" ? "tokens" : "cost",
};

// What the chart plots score against. Cost is the money question; output tokens
// is the same shape of question with the pricing taken out, which is the one to
// ask when comparing how much work two models did rather than what it billed.
const METRICS = {
    cost: {
        label: "cost per trial", axis: "Cost per trial", short: "Cost / trial",
        value: (row) => row.cost / row.attempts,
        tick: (value) => `$${value.toFixed(2)}`, format: money,
    },
    tokens: {
        label: "output tokens per trial", axis: "Output tokens per trial", short: "Out. tokens / trial",
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
        const effort = effortOf(trial);
        const key = JSON.stringify([trial.model, config, effort]);
        const row = byPair.get(key) ?? {
            model: trial.model, config, effort, attempts: 0, solved: 0, graded: 0,
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
            || a.cost / a.attempts - b.cost / b.attempts);
}

function sortRows(rows) {
    const column = COLUMNS.find((entry) => entry.key === state.sort) ?? DEFAULT_SORT;
    const sign = state.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
        const x = column.value(a), y = column.value(b);
        return sign * (typeof x === "string" ? x.localeCompare(y) : x - y);
    });
}

function visible() {
    return trials.filter((trial) =>
        (!state.models.size || state.models.has(trial.model))
        && (!state.configs.size || state.configs.has(configOf(trial.job))));
}

// What a configuration actually gave the agent. The chips name the runs; a
// name alone does not say what was switched on, and that is the whole variable
// the benchmark is measuring. Read from the configs the tasks repo runs --
// `vaadin-bench/configs/*.yaml` -- so this stays a description of them rather
// than a guess. A configuration with no entry here simply goes unglossed.
const CONFIG_NOTES = {
    "vanilla": "The agent without additional Vaadin skills or documentation MCP servers.",
    "vaadin-skills": "The Vaadin skills configured for this benchmark.",
    "vaadin-skills-tools": "Those skills, plus vaadin-agent-tools: a bundled CLI and a theme check that runs after every edit. Claude Code only, since the hook is a Claude Code hook.",
    "vaadin-mcp": "The Vaadin documentation MCP server, without additional Vaadin skills.",
    "vaadin-skills-mcp": "The Vaadin skills and the Vaadin documentation MCP server together.",
    "vaadin-mcp-java": "The newer /docs-java documentation server on its own. Identical to vaadin-mcp but for the URL, so the difference between them is the difference between the servers.",
    "vaadin-skills-mcp-java": "The vaadin-skills setup with the newer /docs-java server in place of /docs.",
};

// One line per configuration, in a popover on the help icon beside the
// configuration chips. Short on purpose: the point is to say what the agent had,
// not to document the plugins.
function renderConfigNotes(configs) {
    const notes = trials.length && trials.every((trial) => trial.agent === "codex")
        ? { ...CONFIG_NOTES,
            vanilla: "Codex without additional Vaadin skills.",
            "vaadin-skills": "Codex with Vaadin skills." }
        : CONFIG_NOTES;
    const described = configs.filter((config) => notes[config]);
    if (!described.length) return "";
    // A native popover: it opens, closes on Escape or a click elsewhere, and
    // tells assistive technology which, with no script. The script below only
    // places it under its button. It fades and scales in from its top-left
    // corner, the one nearest the button, and back out on close.
    const label = "What each configuration gave the agent";
    return `<button class="bg-transparent border-0 cursor-pointer flex p-0 text-gray-11 hover:text-gray-12"
            popovertarget="config-help" aria-label="${label}" title="${label}">${lucide("circle-help")}</button>
        <div class="bg-white border border-gray-3 box-border inset-auto m-0 opacity-0 origin-top-left p-5 rounded-lg scale-97 shadow-xl text-gray-12 transition-all transition-discrete dark:bg-gray-1 open:opacity-100 open:scale-100 starting:open:opacity-0 starting:open:scale-97 motion-reduce:transition-none"
            id="config-help" popover>
            <p class="${EYEBROW} mb-4">Configurations</p>
            <dl class="flex flex-col gap-4 m-0">${described.map((config) => `
                <div>
                    <dt class="font-medium leading-snug text-base text-gray-12 tracking-1">${escapeHtml(config)}</dt>
                    <dd class="m-0 mt-1 text-gray-11">${escapeHtml(notes[config])}</dd>
                </div>`).join("")}</dl>
        </div>`;
}

// An empty set means no filter rather than nothing selected: a page that opens
// showing everything is the useful default, and clearing the last chip should
// go back to that instead of emptying the table.
// Each chip wears what its value is drawn with below -- a model its vendor's
// mark, a configuration its shape -- so the legend and the filter are the same
// control. A selected chip goes grey. They are toggles rather than actions, so
// they are set in Regular 14, not an action's Mono uppercase.
const CHIP = "border box-border cursor-pointer flex font-normal font-sans gap-2 h-8 items-center leading-snug px-4 rounded-full text-sm tracking-1";

function chipClasses(pressed) {
    return pressed
        ? `${CHIP} bg-gray-3 border-gray-5 text-gray-12`
        : `${CHIP} bg-background border-gray-3 text-gray-11 hover:border-gray-5`;
}

function renderFilters(shapes) {
    const models = [...new Set(trials.map((t) => t.model))].sort();
    const configs = [...new Set(trials.map((t) => configOf(t.job)))].sort();
    // `mark` is the value's icon and `label` its name, both already markup.
    const chip = (key, value, mark, label) => `<button
        class="${chipClasses(state[key].has(value))}"
        data-facet="${key}" data-value="${escapeHtml(value)}"
        aria-pressed="${state[key].has(value)}">${mark}${label}</button>`;
    // Turning a filter off means unpressing every chip you pressed. One button
    // per row, because the two rows filter independently and clearing both when
    // only one is in the way is its own annoyance. It appears only with
    // something to clear: beside an untouched row it would be a control that
    // does nothing.
    //
    // An icon button, so it carries a label for anyone not looking at it.
    const clear = (key) => state[key].size
        ? `<button class="bg-transparent border-0 cursor-pointer flex h-8 items-center justify-center ml-1 p-0 rounded-full text-gray-11 w-8 hover:bg-gray-3 hover:text-gray-12"
            data-clear="${key}"
            title="Clear the ${key === "models" ? "model" : "configuration"} filter"
            aria-label="Clear the ${key === "models" ? "model" : "configuration"} filter"
            >${lucide("x")}</button>`
        : "";
    // Each row is a group of toggle buttons named by its key, so a screen reader
    // announces "Model, group" before the first chip. A <label> would not do:
    // it names a single form control, not a group of buttons. On a phone the
    // name takes a line of its own, above its chips.
    const key = (id, label, extra = "") => `<span class="flex gap-2 items-center mb-1 shrink-0 w-full md:mb-0 md:w-24"><span
        class="${EYEBROW} box-edge-cap-alphabetic box-trim-both" id="${id}">${label}</span>${extra}</span>`;
    return `<div class="flex flex-col gap-2 mb-10">
        <div class="flex flex-wrap gap-1 items-center" role="group" aria-labelledby="filter-models">
            ${key("filter-models", "Model")}
            ${models.map((model) => chip("models", model, modelMark(model, "h-4 shrink-0 w-4"),
                escapeHtml(modelParts(model).name))).join("")}
            ${clear("models")}
        </div>
        <div class="flex flex-wrap gap-1 items-center" role="group" aria-labelledby="filter-configs">
            ${key("filter-configs", "Config", renderConfigNotes(configs))}
            ${configs.map((config) => chip("configs", config,
                shapeGlyph(shapes.get(config), "h-4 w-4"), escapeHtml(config))).join("")}
            ${clear("configs")}
        </div>
    </div>`;
}

function renderTabs() {
    return tabBar([["leaderboard", "Leaderboard"], ["chart", "Chart"]], state.tab);
}

// The sort as it was before a header click, so the arrows can move from it: the
// sorted column's arrow turns over when its direction flips, and fades in on a
// column that has just been picked while the old column's fades out. Cleared
// once drawn, so redraws for any other reason do not animate. The motion is CSS
// and off under reduced motion.
let sortFrom = null;

// One arrow, pointing down; ascending turns it over.
function sortArrow(dir, motion = "") {
    const turned = dir === "asc" ? " rotate-180" : "";
    if (motion === "out") {
        return lucide("arrow-down", `animate-disappear h-4 opacity-0${turned} shrink-0 w-4 motion-reduce:animate-none`);
    }
    const animation = { in: "animate-appear ", up: "animate-turn-up ", down: "animate-turn-down " }[motion] ?? "";
    return lucide("arrow-down", `${animation}h-4${turned} shrink-0 w-4${animation ? " motion-reduce:animate-none" : ""}`);
}

function renderHead() {
    const cell = (column) => {
        const active = state.sort === column.key;
        const order = state.dir === "asc" ? "ascending" : "descending";
        // The arrow alone marks the column being sorted by, and every header
        // keeps a slot for it, so nothing shifts as the sort moves. Label
        // and slot are one centred row, so the arrow sits on the label's middle
        // and every header is the same height. A number column puts the slot
        // first, keeping its label flush right over the numbers.
        const base = column.num ? TH_NUM : TH;
        const was = sortFrom && sortFrom.sort === column.key ? sortFrom : null;
        let arrow = "";
        if (active && !sortFrom) arrow = sortArrow(state.dir);
        else if (active && !was) arrow = sortArrow(state.dir, "in");
        else if (active) arrow = sortArrow(state.dir, was.dir === state.dir ? "" : state.dir === "asc" ? "up" : "down");
        else if (was) arrow = sortArrow(was.dir, "out");
        const slot = `<span class="flex h-4 shrink-0 w-4">${arrow}</span>`;
        // The cell's trim does not reach into the flex row, so the label carries its own.
        const label = `<span class="box-edge-cap-alphabetic box-trim-both">${escapeHtml(column.label)}</span>`;
        return `<th class="${base} ${column.width} cursor-pointer select-none" data-sort="${column.key}"
            aria-sort="${active ? order : "none"}"
            title="Sort by ${escapeHtml(column.label.toLowerCase())}"><span
            class="${column.num ? "flex gap-1 items-center justify-end" : "flex gap-1 items-center"}">${
            column.num ? slot + label : label + slot}</span></th>`;
    };
    const [model, ...rest] = COLUMNS;
    return `<thead><tr>
        <th class="${TH} w-14"></th>${cell(model)}<th class="${TH}"></th>${rest.map(cell).join("")}
    </tr></thead>`;
}

// The leaderboard's columns are fixed (table-fixed, widths on the header), so
// filtering, which changes which names and ranks are in the table, cannot move
// them. The score bar takes what is left, and the minimum width keeps it room
// on a narrow screen, where the table scrolls instead.
//
// A row names its configuration in words, under the model and indented to line
// up with its name, so it needs no shape: shapes are for the chart, where points
// have no room for words.
function renderLeaderboard(rows) {
    if (!rows.length) return `<p class="${EMPTY}">Nothing matches this filter.</p>`;
    const body = sortRows(rows).map((row, i) => {
        // No fill at all at zero: a minimum width keeps a 1% score visible, but
        // it would also draw a coloured nub on a row that solved nothing. The
        // width is data, so it is the one inline style.
        const fill = row.rate
            ? `<span class="${vendorBar(row.model)} block h-full min-w-1 rounded-full"
                style="width:${row.rate * 100}%"></span>`
            : "";
        // The model's name is the link, so the row is reachable by keyboard and
        // announced as one; the rest of the row is a mouse convenience for the
        // same place, so it takes the hover tint.
        return `<tr class="cursor-pointer h-18 hover:bg-gray-2" data-model="${escapeHtml(row.model)}"
            data-config="${escapeHtml(row.config)}"
            data-effort="${escapeHtml(row.effort)}">
            <td class="${TD_NUM} text-gray-11">${i + 1}</td>
            <td class="${TD}"><span class="flex gap-2 items-center">${
                modelMark(row.model, "h-4 shrink-0 w-4")}<a class="font-normal leading-snug no-underline text-base text-gray-12 tracking-1 hover:underline"
                href="${escapeHtml(runUrl(row.model, row.config, row.effort))}">${
                escapeHtml(modelParts(row.model).name)}</a>${effortBadge(row.effort)}</span>
                <span class="block mt-0.5 pl-6 text-2xs text-gray-11">${escapeHtml(row.config)}</span></td>
            <td class="${TD}"><span
                class="bg-gray-3 block h-2 overflow-hidden rounded-full">${fill}</span></td>
            <td class="${TD_NUM}">${percent(row.rate)}</td>
            <td class="${TD_NUM}">${row.solved}/${row.graded}</td>
            <td class="${TD_NUM}">${row.tasks.size}</td>
            <td class="${TD_NUM}">${money(row.cost / row.attempts)}</td>
            <td class="${TD_NUM}">${duration(row.duration / row.attempts)}</td>
        </tr>`;
    }).join("");

    return `<div class="${TABLE_WRAP}"><table class="border-collapse min-w-256 table-fixed w-full">
        ${renderHead()}
        <tbody class="${TBODY}">${body}</tbody>
    </table></div>`;
}

// The chart says what it is plotting and lets that be changed, because the two
// x axes answer different questions and neither is the obvious default. The
// switch is a segmented control: one visually hidden radio per option.
function renderChartHead(metric) {
    const options = [["cost", "Cost"], ["tokens", "Output tokens"]];
    return `<div class="flex flex-wrap gap-3 items-center justify-between mb-4">
        <h2 class="font-normal leading-snug m-0 text-xl tracking-1">Score vs ${escapeHtml(metric.label)}</h2>
        <fieldset class="border-0 m-0 p-0">
            <legend class="sr-only">X axis</legend>
            <div class="bg-gray-3 box-border flex h-10 p-1 rounded-lg w-fit">
                ${options.map(([id, label]) => `<label class="cursor-pointer flex font-mono items-center leading-tight px-4 rounded text-gray-11 text-xs tracking-0 uppercase has-checked:bg-white has-checked:text-gray-12 has-focus-visible:outline-2 has-focus-visible:outline-gray-12 dark:has-checked:bg-gray-1"><input
                    class="sr-only" type="radio" name="x" value="${id}"${
                    state.x === id ? " checked" : ""}><span class="box-edge-cap-alphabetic box-trim-both">${label}</span></label>`).join("")}
            </div>
        </fieldset>
    </div>`;
}

const last = (values) => values[values.length - 1];

// A pair with nothing graded has no score, so it is a row but not a point.
const plottable = (rows) => rows.filter((row) => row.rate !== null);

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

// Where the good corner is, drawn rather than left to the reader. One line
// each way, so the two shaded corners meet and every point is on one side of
// both: solving more than half the graded trials for less than half of what the
// heaviest run in the benchmark spends, or the opposite of that, with the two
// trade-off corners left plain because a trade-off is exactly what they are.
// Neither line is a median: a median in a field where half the models are
// nearly free would shrink the good corner to a sliver.
//
// The x line is half of the *whole* field, not half of what is on screen,
// so hiding an unrelated model cannot move a result from one quadrant to the
// other -- which is the point of shading them at all. That does mean a filter
// can leave the line off the right of a rescaled axis; there it is clamped to
// the edge, which is the truth of that view: everything still shown is on the
// cheap side of it.
const QUADRANT = { score: 0.5 };

function renderQuadrants(metric, xCut, px, py, box) {
    const x = Math.min(px(xCut), box.right), y = py(QUADRANT.score);
    if (!(x > box.left + 1)) return { bands: "", legend: "", note: "" };
    // Named for what each band means, not for which corner it sits in: the good
    // corner is at the left only because cheaper is better on that axis.
    const BANDS = {
        good: { fill: "fill-teal-3", swatch: "bg-teal-3" },
        poor: { fill: "fill-red-3", swatch: "bg-red-3" },
    };
    const band = (kind, x1, y1, x2, y2) => `<rect class="${BANDS[kind].fill}"
        x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}"/>`;
    // With the line off the right edge, nothing on screen is on the dear side
    // of it: there is no unattractive corner, so neither the band nor its
    // legend entry claims one.
    const poor = x < box.right - 1;
    // The wash is faint by design, so its swatch needs an edge of its own.
    const swatch = (kind, label) => `<span class="flex gap-2 items-center"><span
        class="${BANDS[kind].swatch} border border-gray-5 box-border h-2.5 rounded-xs w-3.5"></span>${label}</span>`;
    return {
        bands: band("good", box.left, box.top, x, y)
            + (poor ? band("poor", x, y, box.right, box.bottom) : ""),
        legend: `<div class="${LEGEND}">
            ${swatch("good", "Most attractive quadrant")}
            ${poor ? swatch("poor", "Least attractive") : ""}
        </div>`,
        note: `<p class="${NOTE} mt-3">Teal: more than ${percent(QUADRANT.score)} of the
            graded trials solved, for under ${escapeHtml(metric.format(xCut))} a trial.${
            poor ? ` Red: less than that, for more than that. The other two corners
            are the trade-off.` : " Nothing left on screen is above that."}</p>`,
    };
}

const LEGEND = "flex flex-wrap gap-x-4 gap-y-2 mt-4 text-gray-11";

// The card a chart point opens: who (vendor mark, model, effort), in which
// configuration, and the two numbers the point is plotted from.
let chartCards = [];

// The configuration's shape sits in the mark's 16px column, so its name lines
// up under the model's.
function pointCard(row, metric, shapes) {
    // Labelled like the KPI cards and the table headings: 13 Mono uppercase.
    const line = (label, value) => `<div class="flex gap-6 items-baseline justify-between">
        <dt class="font-mono leading-tight text-gray-11 text-xs tracking-0 uppercase">${label}</dt><dd class="m-0">${value}</dd></div>`;
    return `<div class="flex gap-2 items-center">${modelMark(row.model, "h-4 shrink-0 w-4")}<span
            class="font-bold leading-snug text-base tracking-1">${escapeHtml(modelParts(row.model).name)}</span>${
            effortBadge(row.effort)}</div>
        <div class="flex gap-2 items-center mt-2 text-gray-11"><span class="flex justify-center shrink-0 w-4">${
            shapeGlyph(shapes.get(row.config))}</span>${escapeHtml(row.config)}</div>
        <dl class="border-gray-3 border-t flex flex-col gap-3 m-0 mt-4 pt-4">
            ${line("Score", `${percent(row.rate)} <span class="text-gray-11">${row.solved}/${row.graded}</span>`)}
            ${line(metric.short, escapeHtml(metric.format(metric.value(row))))}
        </dl>`;
}

// Score against cost: the question a ranking cannot answer, because the cheap
// row and the accurate row are never next to each other in one.
function renderChart(rows, shapes, field) {
    const metric = METRICS[state.x] ?? METRICS.cost;
    const head = renderChartHead(metric);
    const points = plottable(rows);
    if (!points.length) return `${head}<p class="${EMPTY}">Nothing to plot.</p>`;

    const W = 900, H = 380, L = 52, R = 28, T = 34, B = 44;
    const plotW = W - L - R, plotH = H - T - B;
    const xTicks = niceTicks(Math.max(...points.map(metric.value)));
    const xMax = last(xTicks);
    const px = (value) => L + (xMax ? (value / xMax) * plotW : 0);
    const py = (rate) => T + plotH - rate * plotH;

    // Half of the whole field's axis, which is the visible one only when
    // nothing is filtered out. niceTicks() twice over so a filtered view keeps
    // the round number the unfiltered one showed.
    const xCut = last(niceTicks(Math.max(...field.map(metric.value)))) / 2;
    const bands = renderQuadrants(metric, xCut, px, py,
        { left: L, right: W - R, top: T, bottom: T + plotH });

    // Ticks and axis titles carry `data-tick`, which makes them obstacles for
    // layoutChartLabels(): no label settles on top of "100%" or "$2.00".
    const TICK = "-tracking-4 fill-gray-11 font-mono tabular-nums text-2xs";
    const grid = [0, 25, 50, 75, 100].map((value) => `<line class="stroke-alpha-10"
        x1="${L}" x2="${W - R}" y1="${py(value / 100)}" y2="${py(value / 100)}"/>
        <text class="${TICK}" data-tick x="${L - 8}" y="${py(value / 100) + 4}"
            text-anchor="end">${value}%</text>`).join("");

    const xAxis = xTicks.map((value) => `<text class="${TICK}" data-tick x="${px(value)}"
        y="${T + plotH + 18}" text-anchor="middle">${escapeHtml(metric.tick(value))}</text>`)
        .join("");

    const modelCount = new Set(points.map((p) => p.model)).size;
    const efforts = new Map();
    for (const p of points) efforts.set(p.model, (efforts.get(p.model) ?? new Set()).add(p.effort));

    // A point says who and how by itself: its colour is the vendor's and its
    // shape the configuration. So a label is only the model name, with the
    // effort where that model appears at more than one; with one model in the
    // plot, whose name the chip above already says, it is effort and
    // configuration. The rest is in the point's card. Where labels land is
    // settled after the fact by layoutChartLabels(), which can measure the text.
    // Each marker also gets an invisible disc, so a 6px shape is not a 6px
    // target, and each point is focusable, so the cards are not mouse-only.
    const cards = [];
    const dots = points.map((row, i) => {
        const x = px(metric.value(row)), y = py(row.rate);
        const name = modelCount > 1
            ? [modelParts(row.model).name, efforts.get(row.model).size > 1 ? row.effort : ""].filter(Boolean).join(" ")
            : [row.effort, row.config].filter(Boolean).join(" · ");
        const spoken = `${modelWithEffort(row.model, row.effort)}, ${row.config}: ${percent(row.rate)}`
            + ` (${row.solved}/${row.graded}), ${metric.format(metric.value(row))} ${metric.label}`;
        cards.push(pointCard(row, metric, shapes));
        return `<g class="cursor-pointer" data-tip="${i}" role="img" aria-label="${escapeHtml(spoken)}" tabindex="0">
            <circle class="fill-transparent" cx="${x}" cy="${y}" r="13"/>
            ${marker(shapes.get(row.config), x, y, vendorText(row.model))}
            <text class="fill-gray-11 text-2xs" data-label data-cx="${x}" data-cy="${y}"
                x="${x + 11}" y="${y + 4}">${escapeHtml(name)}</text>
        </g>`;
    }).join("");
    chartCards = cards;

    const configs = [...shapes].filter(([config]) => points.some((p) => p.config === config))
        .map(([config, shape]) => `<span class="flex gap-2 items-center">${
            shapeGlyph(shape)}${escapeHtml(config)}</span>`).join("");

    const AXIS_TITLE = "-tracking-4 fill-gray-11 font-mono text-2xs uppercase";
    return `${head}<div class="bg-gray-1 border border-gray-3 pb-2 pt-4 px-4 relative rounded-lg"><div
        class="absolute bg-white border border-gray-3 box-border p-4 pointer-events-none rounded-lg shadow-xl tabular-nums text-gray-12 whitespace-nowrap z-10 dark:bg-gray-1"
        data-tooltip hidden></div>
    <svg class="block h-auto overflow-visible w-full" data-chart viewBox="0 0 ${W} ${H}" role="group"
        aria-label="Score against cost per trial">
        ${bands.bands}
        ${grid}
        <line class="stroke-alpha-10" x1="${L}" x2="${W - R}" y1="${T + plotH}" y2="${T + plotH}"/>
        <line class="stroke-alpha-10" x1="${L}" x2="${L}" y1="${T}" y2="${T + plotH}"/>
        ${xAxis}
        <text class="${AXIS_TITLE}" data-tick x="${L}" y="${T - 12}">Score</text>
        <text class="${AXIS_TITLE}" data-tick x="${W - R}" y="${H - 6}"
            text-anchor="end">${escapeHtml(metric.axis)}</text>
        ${dots}
    </svg></div>
    ${bands.legend}
    <p class="${NOTE} mt-3">Shape = configuration</p>
    <div class="${LEGEND}">${configs}</div>
    ${bands.note}`;
}

function render() {
    const rows = summarize(visible());
    // Built from every trial, not the filtered set, so a configuration keeps its
    // shape as chips are toggled.
    const shapes = shapeMap(trials.map((trial) => configOf(trial.job)));
    showContent([
        syntheticBanner(runs.some((run) => run.synthetic)),
        renderTabs(),
        renderFilters(shapes),
        tabPanel(state.tab, state.tab === "chart"
            // The chart is drawn from the filtered rows but shades its quadrants
            // against the whole field, so the same result keeps the same verdict
            // however the chips are set.
            ? renderChart(rows, shapes, plottable(summarize(trials)))
            : renderLeaderboard(rows)),
    ].join(""));
    const content = document.getElementById("content");
    bindTips(content, (point) => chartCards[Number(point.dataset.tip)] ?? "");
    const chart = content.querySelector("[data-chart]");
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
    const column = COLUMNS.find((entry) => entry.key === state.sort) ?? DEFAULT_SORT;
    const isDefault = column === DEFAULT_SORT && state.dir === DEFAULT_SORT.dir;
    set("sort", isDefault ? "" : column.key);
    set("dir", state.dir === column.dir ? "" : state.dir);
    history.replaceState(null, "", url);
}

document.getElementById("content").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
        const id = tab.dataset.tab;
        switchTab(id, () => {
            state.tab = id;
            syncUrl();
            render();
        });
        return;
    }
    const sort = event.target.closest("[data-sort]");
    if (sort) {
        const column = COLUMNS.find((entry) => entry.key === sort.dataset.sort);
        if (column) {
            sortFrom = { sort: state.sort, dir: state.dir };
            state.dir = state.sort === column.key
                ? (state.dir === "asc" ? "desc" : "asc")
                : column.dir;
            state.sort = column.key;
            syncUrl();
            render();
            sortFrom = null;
        }
        return;
    }
    const reset = event.target.closest("[data-clear]");
    if (reset) {
        state[reset.dataset.clear].clear();
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
    const row = event.target.closest("tr[data-model]");
    if (row && !event.target.closest("a")) location.href = runUrl(row.dataset.model, row.dataset.config, row.dataset.effort);
});

// Places the configuration help under the button that opens it, inside the
// page's 16px gutters, before it opens; and closes it on scroll rather than
// leaving it behind. The width is set here, not by a class: a popover left to
// size itself takes all the room to the right of where it is placed, so it
// could never be pulled back inside the gutter. 24rem, or the viewport less
// its gutters where that is narrower.
function placePopover(popover) {
    const button = document.querySelector(`[popovertarget="${popover.id}"]`);
    if (!button) return;
    const at = button.getBoundingClientRect();
    const gutter = 16;
    const width = Math.min(384, innerWidth - gutter * 2);
    popover.style.width = `${width}px`;
    popover.style.top = `${at.bottom + 8}px`;
    popover.style.left = `${Math.max(gutter, Math.min(at.left, innerWidth - gutter - width))}px`;
}

// Toggle events do not bubble, so this listens in the capture phase.
document.getElementById("content").addEventListener("beforetoggle", (event) => {
    if (event.newState === "open") placePopover(event.target);
}, true);
addEventListener("scroll", () => {
    document.querySelectorAll(":popover-open").forEach((popover) => popover.hidePopover());
}, { passive: true });

// The x-axis switch is a radio group, so it reports a change rather than a click.
document.getElementById("content").addEventListener("change", (event) => {
    if (event.target.name !== "x") return;
    state.x = event.target.value;
    syncUrl();
    render();
});

fetchJson(dataUrl("index.json")).then((index) => {
    runs = index.runs ?? [];
    trials = runs.flatMap((run) => run.trials ?? []);
    if (!trials.length) {
        showContent(`<p class="${EMPTY}">No results published yet.</p>`);
    } else {
        render();
    }
    renderFooter(index.generated_at);
}).catch(showError);
