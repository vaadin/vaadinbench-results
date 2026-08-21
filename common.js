// Shared helpers. No framework and no build step: the site is a handful of
// static files plus the JSON publish.py writes, which is the whole reason Pages
// can serve it.

const NBSP = " ";

// The Vaadin reindeer, from Font Awesome's brand set (CC BY 4.0). Two subpaths:
// the antlers and the muzzle. It lives here rather than in each page's markup
// so there is one copy of it, and app.css does the drawing.
const REINDEER = "M224.5 140.7c1.5-17.6 4.9-52.7 49.8-52.7h98.6c20.7 0 32.1-7.8 32.1-21.6V54.1c0-12.2 9.3-22.1 21.5-22.1S448 41.9 448 54.1v36.5c0 42.9-21.5 62-66.8 62H280.7c-30.1 0-33 14.7-33 27.1 0 1.3-.1 2.5-.2 3.7-.7 12.3-10.9 22.2-23.4 22.2s-22.7-9.8-23.4-22.2c-.1-1.2-.2-2.4-.2-3.7 0-12.3-3-27.1-33-27.1H66.8c-45.3 0-66.8-19.1-66.8-62V54.1C0 41.9 9.4 32 21.6 32s21.5 9.9 21.5 22.1v12.3C43.1 80.2 54.5 88 75.2 88h98.6c44.8 0 48.3 35.1 49.8 52.7h.9zM224 456c11.5 0 21.4-7 25.7-16.3 1.1-1.8 97.1-169.6 98.2-171.4 11.9-19.6-3.2-44.3-27.2-44.3-13.9 0-23.3 6.4-29.8 20.3L224 362l-66.9-117.7c-6.4-13.9-15.9-20.3-29.8-20.3-24 0-39.1 24.6-27.2 44.3 1.1 1.9 97.1 169.6 98.2 171.4 4.3 9.3 14.2 16.3 25.7 16.3z";

function renderMark() {
    const slot = document.getElementById("mark");
    if (!slot) return;
    slot.innerHTML = `<svg class="mark" viewBox="0 0 448 512" role="img"
        aria-label="Vaadin"><path pathLength="1" d="${REINDEER}"/></svg>`;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[ch]);
}

// Pages serves everything with `max-age=600` and no way to override it, so a
// reader who saw an earlier publish gets that copy back from disk without the
// browser asking us anything -- the reason synthetic numbers outlived the run
// that replaced them. `no-cache` forces a revalidation on every load.
function fetchJson(path) {
    return fetch(path, { cache: "no-cache" }).then((response) => {
        if (!response.ok) {
            throw new Error(`${path}: ${response.status}`);
        }
        return response.json();
    });
}

// A model id is `provider/name`; the provider is noise in a table where every
// row carries one, and the dated Haiku suffix is noise everywhere.
function shortModel(model) {
    const name = String(model ?? "unknown").split("/").pop();
    return name.replace(/-\d{8}$/, "");
}

function shortTask(task) {
    return String(task ?? "").split("/").pop();
}

// Surefire names a suite by its fully qualified class, and the package is the
// same for every suite VaadinBench grades. The full name stays in a tooltip.
function shortSuite(name) {
    return String(name ?? "").split(".").pop();
}

// A job directory is named `<configuration>-<date>-<time>`. The timestamp makes
// each run unique; the prefix is the thing being compared -- which skills and
// tools the agent was given. The leaderboard groups by that prefix, so two runs
// of one configuration on different days land in the same row.
function configOf(job) {
    return String(job ?? "").replace(/-\d{8}-\d{6}$/, "") || "unknown";
}

function duration(seconds) {
    if (seconds === null || seconds === undefined) return "—";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m${NBSP}${String(Math.round(seconds % 60)).padStart(2, "0")}s`;
}

function tokens(count) {
    if (count === null || count === undefined) return "—";
    if (count < 1000) return String(count);
    return `${(count / 1000).toFixed(1)}k`;
}

function money(amount) {
    return amount === null || amount === undefined ? "—" : `$${amount.toFixed(2)}`;
}

function percent(rate) {
    return rate === null || rate === undefined ? "—" : `${Math.round(rate * 100)}%`;
}

// The verifier decides the result. An error in the agent loop is worth flagging
// beside that verdict but never in place of it: a run can lose its API
// connection on the last step and still leave behind a project that grades
// clean, and calling that `error` both hides a real pass and disagrees with the
// leaderboard, which counts the reward. The error stands alone only when there
// is no grade to report.
function outcome(trial) {
    if (trial.reward === null || trial.reward === undefined) {
        return trial.error
            ? `<span class="badge fail">error</span>`
            : `<span class="badge tag">no reward</span>`;
    }
    const badge = trial.reward >= 1
        ? `<span class="badge pass">pass</span>`
        : `<span class="badge fail">fail</span>`;
    if (!trial.error) return badge;
    return `${badge} <span class="note" title="${escapeHtml(trial.error)}">error</span>`;
}

function trialUrl(id) {
    return `trial.html?id=${encodeURIComponent(id)}`;
}

function runUrl(model, config) {
    return `run.html?model=${encodeURIComponent(model)}&config=${encodeURIComponent(config)}`;
}

// One hue per model, from Aura's palette, so a row's bar and its dot in the
// chart are the same colour. Assigned by position in the sorted model list
// rather than by name, so a new model picks up the next hue on its own.
const HUES = ["blue", "purple", "orange", "green", "red", "yellow"];

function hueMap(models) {
    const sorted = [...new Set(models)].sort();
    return new Map(sorted.map((model, i) =>
        [model, `var(--aura-${HUES[i % HUES.length]})`]));
}

// Invented data must never be mistaken for a measurement, so it is called out on
// every page that shows any, not only where it was generated.
function syntheticBanner(isSynthetic) {
    if (!isSynthetic) return "";
    return `<div class="banner"><strong>Synthetic data.</strong> These numbers
        were invented to develop this site, not measured. They disappear the
        first time real results are published.</div>`;
}

function renderFooter(generatedAt) {
    const footer = document.getElementById("footer");
    if (!footer) return;
    // A trial page has no generation stamp of its own; it shows just the links
    // rather than an empty date.
    const stamp = generatedAt
        ? `Generated ${escapeHtml(new Date(generatedAt).toISOString().slice(0, 16).replace("T", " "))} UTC · `
        : "";
    footer.innerHTML = `${stamp}
        <a href="https://github.com/vesanieminen/vaadinbench-results">source</a> ·
        <a href="https://github.com/vesanieminen/vaadinbench">tasks</a>`;
}

function showError(error) {
    document.getElementById("content").innerHTML =
        `<p class="empty">Could not load the data: ${escapeHtml(error.message)}</p>`;
}

renderMark();
