// Shared helpers. No framework and no build step: the site is four static files
// plus the JSON publish.py writes, which is the whole reason Pages can serve it.

const NBSP = " ";

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[ch]);
}

// Pages serves everything with `max-age=600` and no way to override it, so a
// reader who saw an earlier publish gets that copy back from disk without the
// browser asking us anything — the reason synthetic numbers outlived the run
// that replaced them. `no-cache` forces a revalidation on every load. Chrome
// then refetches the body outright rather than settling for a 304, so this
// costs a round trip and a couple of gzipped kilobytes per page view.
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

function outcome(trial) {
    if (trial.error) return `<span class="badge fail">error</span>`;
    if (trial.reward === null || trial.reward === undefined) {
        return `<span class="badge tag">no reward</span>`;
    }
    return trial.reward >= 1
        ? `<span class="badge pass">pass</span>`
        : `<span class="badge fail">fail</span>`;
}

function trialUrl(id) {
    return `trial.html?id=${encodeURIComponent(id)}`;
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
