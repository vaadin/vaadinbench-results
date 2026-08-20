// The drill-down: what one agent did on one task, in three views.

const KIND_LABELS = {
    prompt: "Prompt", thinking: "Thinking", read: "Reads", search: "Searches",
    edit: "Edits", bash: "Bash", test: "Tests", agent: "Subagents",
    plan: "Plans", message: "Messages", mixed: "Mixed", other: "Other",
};

let trial = null;
let activeTab = new URLSearchParams(location.search).get("tab") ?? "trajectory";
const hiddenKinds = new Set();

function metric(label, value) {
    return `<div class="metric"><span class="label">${escapeHtml(label)}</span>
        <span class="value">${value}</span></div>`;
}

function renderHeader() {
    return `${syntheticBanner(trial.synthetic)}
        <h1>${escapeHtml(shortTask(trial.task))} · ${escapeHtml(shortModel(trial.model))}</h1>
        <p class="lede">
            ${escapeHtml(trial.agent ?? "agent")} ${escapeHtml(trial.agent_version ?? "")}
            · attempt ${trial.attempt} · job ${escapeHtml(trial.job)}
        </p>
        <div class="metrics">
            ${metric("Outcome", outcome(trial))}
            ${metric("Reward", trial.reward ?? "—")}
            ${metric("Duration", duration(trial.duration_s))}
            ${metric("Steps", trial.steps)}
            ${metric("Out. tokens", tokens(trial.output_tokens))}
            ${metric("Cost", money(trial.cost_usd))}
            ${metric("Verify", duration(trial.verify_s))}
        </div>`;
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
        `<button data-kind="${kind}" aria-pressed="${!hiddenKinds.has(kind)}">
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

function renderEvent(event) {
    const message = event.message
        ? `<div class="message">${escapeHtml(event.message)}</div>` : "";
    const reasoning = event.reasoning
        ? `<div class="reasoning">${escapeHtml(event.reasoning)}</div>` : "";
    return `<article class="event">
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
    return renderFacets() + visible.map(renderEvent).join("");
}

// A patch is easier to read with the three line kinds coloured, and that is all
// the highlighting it needs — anything more would be a diff viewer.
function renderPatch(patch) {
    return patch.split("\n").map((line) => {
        const cls = line.startsWith("+") ? "add"
            : line.startsWith("-") ? "del"
            : line.startsWith("@@") || line.startsWith("diff ") ? "hunk" : "";
        const text = escapeHtml(line) || "&nbsp;";
        return cls ? `<span class="${cls}">${text}</span>` : text;
    }).join("\n");
}

function renderChanges() {
    const changes = trial.changes ?? {};
    if (!changes.patch && !changes.diffstat) {
        return `<p class="empty">The agent changed nothing, or no patch was captured.</p>`;
    }
    return `${changes.diffstat ? `<pre>${escapeHtml(changes.diffstat)}</pre>` : ""}
        ${changes.patch ? `<pre class="diff">${renderPatch(changes.patch)}</pre>` : ""}
        ${changes.patch_truncated ? `<p class="truncated">Patch truncated.</p>` : ""}`;
}

function renderVerifier() {
    const verifier = trial.verifier ?? {};
    const failures = verifier.failures?.length
        ? `<h2>Failed tests</h2><ul>${verifier.failures
            .map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>`
        : "";
    const structure = verifier.structure
        ? `<h2>Generated project</h2><pre class="wrapped">${escapeHtml(verifier.structure)}</pre>`
        : "";
    if (!failures && !structure) {
        return `<p class="empty">Reward ${escapeHtml(verifier.reward_text ?? "—")},
            with no further output recorded.</p>`;
    }
    return failures + structure;
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
