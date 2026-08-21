// The drill-down: what one agent did on one task, in three views.

const KIND_LABELS = {
    prompt: "Prompt", thinking: "Thinking", read: "Reads", search: "Searches",
    edit: "Edits", bash: "Bash", test: "Tests", agent: "Subagents",
    plan: "Plans", message: "Messages", mixed: "Mixed", other: "Other",
};

let trial = null;
let activeTab = new URLSearchParams(location.search).get("tab") ?? "trajectory";
const hiddenKinds = new Set();

// The page title lives in the shell, so the trial names itself one level down
// and the breadcrumb carries the way back to the configuration it came from.
function renderCrumb() {
    const config = configOf(trial.job);
    document.getElementById("crumb").innerHTML =
        `<a href="index.html">Leaderboard</a> ·
         <a href="${runUrl(trial.model, config)}">${escapeHtml(shortModel(trial.model))} ·
            ${escapeHtml(config)}</a>`;
}

function renderHeader() {
    return `${syntheticBanner(trial.synthetic)}
        <h2 class="title">${escapeHtml(shortTask(trial.task))} ·
            ${escapeHtml(shortModel(trial.model))}</h2>
        <p class="lede">
            ${escapeHtml(trial.agent ?? "agent")} ${escapeHtml(trial.agent_version ?? "")}
            · attempt ${trial.attempt} · job ${escapeHtml(trial.job)}
        </p>
        ${metricsTable([
            ["Outcome", outcome(trial)],
            ["Reward", trial.reward ?? "—"],
            ["Duration", duration(trial.duration_s)],
            ["Steps", trial.steps],
            ["Out. tokens", tokens(trial.output_tokens)],
            ["Cost", money(trial.cost_usd)],
            ["Verify", duration(trial.verify_s)],
        ])}`;
}

function renderTabs() {
    const tabs = [
        ["trajectory", `Trajectory (${trial.trajectory.length})`],
        ["changes", "Changes"],
        ["verifier", "Verifier"],
        ["instruction", "Instruction"],
    ];
    return `<div class="tabs">${tabs.map(([id, label]) =>
        `<button data-tab="${id}" aria-selected="${activeTab === id}">${label}</button>`
    ).join("")}</div>`;
}

function renderFacets() {
    const counts = new Map();
    for (const event of trial.trajectory) {
        counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1);
    }
    const chips = [...counts.entries()].map(([kind, count]) =>
        `<button class="chip" data-kind="${kind}" aria-pressed="${!hiddenKinds.has(kind)}">
            ${escapeHtml(KIND_LABELS[kind] ?? kind)} ${count}
        </button>`).join("");
    return `<div class="facets">${chips}</div>`;
}

function renderCall(call) {
    const output = call.output
        ? `<pre>${escapeHtml(call.output)}</pre>${
            call.output_truncated ? `<p class="truncated">Output truncated.</p>` : ""}`
        : `<p class="truncated">No output recorded.</p>`;
    return `<details class="call">
        <summary><span class="tool">${escapeHtml(call.name)}</span>
            ${escapeHtml(call.summary)}</summary>
        ${output}
    </details>`;
}

const LONG_MESSAGE = 700;
const expanded = new Set();

// A long message is clamped with a fade rather than a scrollbar: a scroll
// container nested inside the page scroll is awkward to use and, on the task
// prompt, produced a scrollbar on something nobody asked to scroll.
function renderMessage(event, index) {
    if (!event.message) return "";
    const long = event.message.length > LONG_MESSAGE;
    const open = expanded.has(`m${index}`);
    const cls = long && !open ? "message clamped" : "message";
    const toggle = long
        ? `<button class="more" data-more="m${index}">${open ? "Show less" : "Show more"}</button>`
        : "";
    return `<div class="${cls}">${escapeHtml(event.message)}</div>${toggle}`;
}

function renderThought(event, index) {
    if (!event.reasoning) return "";
    const long = event.reasoning.length > LONG_MESSAGE;
    const open = expanded.has(`t${index}`);
    const cls = long && !open ? "thought-body clamped" : "thought-body";
    const toggle = long
        ? `<button class="more" data-more="t${index}">${open ? "Show less" : "Show more"}</button>`
        : "";
    return `<div class="thought"><span class="thought-label">Thinking</span>
        <div class="${cls}">${escapeHtml(event.reasoning)}</div>${toggle}</div>`;
}

function renderEvent(event, index) {
    const message = renderMessage(event, index);
    const reasoning = renderThought(event, index);
    return `<article class="event" data-kind="${escapeHtml(event.kind)}">
        <header>
            <span class="badge tag">${escapeHtml(KIND_LABELS[event.kind] ?? event.kind)}</span>
            <span class="step">step ${event.step ?? "—"} · ${escapeHtml(event.source)}</span>
        </header>
        ${message}
        ${reasoning}
        ${event.calls.map(renderCall).join("")}
    </article>`;
}

function renderTrajectory() {
    const visible = trial.trajectory.filter((event) => !hiddenKinds.has(event.kind));
    if (!visible.length) {
        return renderFacets() + `<p class="empty">Every event type is hidden.</p>`;
    }
    return renderFacets()
        + visible.map((event, index) => renderEvent(event, index)).join("");
}

// A line's kind is a property of the whole line, so each one is its own block
// and takes a background across the full width rather than a colour on the text.
// Order matters: `+++ b/file` and `--- a/file` start with the same characters as
// an added and a removed line, and are neither.
function lineKind(line) {
    if (line.startsWith("diff --git")) return "file";
    if (line.startsWith("+++") || line.startsWith("---")
        || line.startsWith("index ") || line.startsWith("new file")
        || line.startsWith("deleted file") || line.startsWith("similarity ")
        || line.startsWith("rename ")) return "meta";
    if (line.startsWith("@@")) return "hunk";
    if (line.startsWith("+")) return "add";
    if (line.startsWith("-")) return "del";
    return "";
}

function renderPatch(patch) {
    const rows = patch.split("\n").map((line) => {
        // `diff --git a/x b/x` names the file twice; once is enough for a header.
        const text = line.startsWith("diff --git")
            ? line.replace(/^diff --git a\/(.*) b\/.*$/, "$1")
            : line;
        return `<span class="dl ${lineKind(line)}">${escapeHtml(text) || " "}</span>`;
    }).join("");
    return `<div class="diff"><div class="rows">${rows}</div></div>`;
}

function renderChanges() {
    const changes = trial.changes ?? {};
    if (!changes.patch && !changes.diffstat) {
        return `<p class="empty">The agent changed nothing, or no patch was captured.</p>`;
    }
    return `${changes.diffstat ? `<pre>${escapeHtml(changes.diffstat)}</pre>` : ""}
        ${changes.patch ? renderPatch(changes.patch) : ""}
        ${changes.patch_truncated ? `<p class="truncated">Patch truncated.</p>` : ""}`;
}

// Unit suites finish in well under a second, and `duration` rounds those to
// `0s`. Surefire reports the decimal, so keep it until the shared format has
// something to say.
function suiteTime(seconds) {
    if (seconds === null || seconds === undefined) return "—";
    return seconds < 10 ? `${seconds.toFixed(1)}s` : duration(seconds);
}

// What the reward was measured against. A passing trial has no failures to list,
// and `reward 1` on its own does not say whether that was three suites or none,
// so the counts are the only thing standing between a pass and an empty tab.
function renderSuites(suites) {
    if (!suites?.length) return "";
    const rows = suites.map((suite) => `<tr>
        <td title="${escapeHtml(suite.name)}">${escapeHtml(shortSuite(suite.name))}</td>
        <td class="num">${suite.tests}</td>
        <td class="num">${suite.failures}</td>
        <td class="num">${suite.skipped}</td>
        <td class="num">${suiteTime(suite.time_s)}</td>
    </tr>`).join("");

    return `<h2>Graded suites</h2><div class="wrap"><table>
        <thead><tr>
            <th>Suite</th><th class="num">Tests</th><th class="num">Failed</th>
            <th class="num">Skipped</th><th class="num">Time</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table></div>`;
}

function renderVerifier() {
    const verifier = trial.verifier ?? {};
    const failures = verifier.failures?.length
        ? `<h2>Failed tests</h2><ul>${verifier.failures
            .map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>`
        : "";
    const suites = renderSuites(verifier.suites);
    // A graded trial reports one suite per graded class. None at all is a
    // different outcome from a test that ran and failed -- the verifier never got
    // that far — and saying so is the difference between a page that explains a
    // 0 and a page that looks broken.
    const ungraded = Array.isArray(verifier.suites) && !verifier.suites.length
        ? `<div class="banner"><strong>No graded suite ran.</strong> The verifier
            produced no test report, so nothing about the application's behaviour
            was measured.${verifier.log ? " The log below is where the reason is." : ""}</div>`
        : "";
    const structure = verifier.structure
        ? `<h2>Generated project</h2><pre class="wrapped">${escapeHtml(verifier.structure)}</pre>`
        : "";
    const log = verifier.log
        ? `<h2>Verifier log</h2>
            ${verifier.log_truncated ? `<p class="truncated">Earlier output truncated; this is the end of the log.</p>` : ""}
            <pre class="wrapped">${escapeHtml(verifier.log)}</pre>`
        : "";
    if (!failures && !suites && !structure && !log) {
        return `<p class="empty">Reward ${escapeHtml(verifier.reward_text ?? "—")},
            with no further output recorded.</p>`;
    }
    return ungraded + failures + suites + structure + log;
}

function renderInstruction() {
    return trial.instruction
        ? `<pre class="wrapped">${escapeHtml(trial.instruction)}</pre>`
        : `<p class="empty">No prompt was recorded in the trajectory.</p>`;
}

function render() {
    const views = {
        trajectory: renderTrajectory,
        changes: renderChanges,
        verifier: renderVerifier,
        instruction: renderInstruction,
    };
    const view = views[activeTab] ?? views.trajectory;
    document.getElementById("content").innerHTML =
        renderHeader() + renderTabs() + view();
    renderCrumb();
    document.title = `${shortTask(trial.task)} · ${shortModel(trial.model)} · VaadinBench`;
}

// One listener on the container, so re-rendering never leaves listeners behind.
document.getElementById("content").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (tab) {
        activeTab = tab.dataset.tab;
        // Keep the tab in the URL, so a link to a trial can point at the diff or
        // the verifier output rather than always landing on the trajectory.
        const url = new URL(location.href);
        url.searchParams.set("tab", activeTab);
        history.replaceState(null, "", url);
        render();
        return;
    }
    const more = event.target.closest("[data-more]");
    if (more) {
        const key = more.dataset.more;
        expanded.has(key) ? expanded.delete(key) : expanded.add(key);
        render();
        return;
    }
    const facet = event.target.closest("[data-kind]");
    if (facet) {
        const kind = facet.dataset.kind;
        hiddenKinds.has(kind) ? hiddenKinds.delete(kind) : hiddenKinds.add(kind);
        render();
    }
});

const id = new URLSearchParams(location.search).get("id");
if (!id) {
    document.getElementById("content").innerHTML =
        `<p class="empty">No trial requested. <a href="index.html">Back to the results.</a></p>`;
} else {
    fetchJson(`data/trials/${encodeURIComponent(id)}.json`).then((loaded) => {
        trial = loaded;
        render();
        renderFooter(null);
    }).catch(showError);
}
