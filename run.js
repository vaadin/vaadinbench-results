// One model in one configuration: the row from the leaderboard, opened up into
// the trials behind it.

const query = new URLSearchParams(location.search);
// A run link written by this site always says which effort it means, and leaves
// the level out only when there is none to name -- so a link from before the
// effort field existed asks for exactly the trials it always asked for.
const wanted = {
    model: query.get("model"),
    config: query.get("config"),
    effort: query.get("effort") || DEFAULT_EFFORT,
};

function renderHeader(rows, withEffort) {
    const graded = rows.filter((t) => t.reward !== null && t.reward !== undefined);
    const solved = graded.filter((t) => t.reward >= 1).length;
    const cost = rows.reduce((sum, t) => sum + (t.cost_usd ?? 0), 0);
    const time = rows.reduce((sum, t) => sum + (t.duration_s ?? 0), 0);
    const tasks = new Set(rows.map((t) => t.task));
    const errored = rows.filter((t) => t.error).length;

    return `<h2 class="title">${escapeHtml(shortModel(wanted.model))} ·
            ${escapeHtml(wanted.config)}${
            withEffort ? effortTag(wanted.effort, true) : ""}</h2>
        ${metricsTable([
            ["Score", graded.length ? percent(solved / graded.length) : "—"],
            ["Solved", `${solved}/${graded.length}`],
            ["Tasks", tasks.size],
            ["Trials", rows.length],
            ["Errored", errored || null],
            ["Cost / trial", money(cost / rows.length)],
            ["Time / trial", duration(time / rows.length)],
            ["Total cost", money(cost)],
        ])}
        <h2>Trials</h2>`;
}

function renderTrials(rows) {
    const body = [...rows]
        .sort((a, b) => a.task.localeCompare(b.task)
            || a.job.localeCompare(b.job)
            || a.attempt - b.attempt)
        .map((trial) => `<tr class="pick" data-href="${trialUrl(trial.id, trial.job)}">
            <td class="name"><a href="${trialUrl(trial.id, trial.job)}">${escapeHtml(shortTask(trial.task))}</a>
                <span class="sub">${escapeHtml(trial.job)}</span></td>
            <td class="num">${trial.attempt}</td>
            <td>${outcome(trial)}</td>
            <td class="num">${duration(trial.duration_s)}</td>
            <td class="num">${trial.steps}</td>
            <td class="num">${tokens(trial.output_tokens)}</td>
            <td class="num">${money(trial.cost_usd)}</td>
        </tr>`).join("");

    return `<div class="wrap"><table>
        <thead><tr>
            <th>Task</th><th class="num">Attempt</th><th>Outcome</th>
            <th class="num">Time</th><th class="num">Steps</th>
            <th class="num">Out. tokens</th><th class="num">Cost</th>
        </tr></thead>
        <tbody>${body}</tbody>
    </table></div>`;
}

// A pair whose effort has moved on. Republishing a benchmark that has since
// started naming levels leaves every old link asking for trials that are now
// filed under one, and "nothing here" would read as data that went missing:
// what actually happened is that this pair split into a row per level.
function renderElsewhere(pair) {
    const levels = sortedEfforts(pair);
    return `<p class="empty">No trials for
        ${escapeHtml(shortModel(wanted.model))} in ${escapeHtml(wanted.config)}
        at ${escapeHtml(wanted.effort)} effort. This pair ran at
        ${levels.map((effort) =>
            `<a href="${runUrl(wanted.model, wanted.config, effort)}">${
                escapeHtml(effort)}</a>`).join(", ")}.
        <a href="${leaderboardUrl()}">Back to the leaderboard.</a></p>`;
}

const content = document.getElementById("content");

// The task link stays, so the row is still keyboard-reachable and openable in a
// new tab; the row around it is the target for an ordinary click, since a trial
// is what every cell in the row is about.
content.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    const row = event.target.closest("tr.pick");
    if (row) location.href = row.dataset.href;
});

if (!wanted.model || !wanted.config) {
    content.innerHTML =
        `<p class="empty">No configuration requested. <a href="${leaderboardUrl()}">Back to the leaderboard.</a></p>`;
} else {
    fetchJson(dataUrl("index.json")).then((index) => {
        const runs = index.runs ?? [];
        const all = runs.flatMap((run) => run.trials ?? []);
        // The pair first, then the level within it: what the page has to say
        // when it finds nothing depends on which of the two came up empty.
        const pair = all.filter((trial) =>
            trial.model === wanted.model && configOf(trial.job) === wanted.config);
        const rows = pair.filter((trial) => effortOf(trial) === wanted.effort);

        if (!rows.length) {
            content.innerHTML = pair.length ? renderElsewhere(pair)
                : `<p class="empty">No trials for
                    ${escapeHtml(shortModel(wanted.model))} in
                    ${escapeHtml(wanted.config)}. <a href="${leaderboardUrl()}">Back to the leaderboard.</a></p>`;
        } else {
            // Whether to name the level is the benchmark's question, not this
            // page's: it is worth saying here exactly where the leaderboard
            // says it, so a row and the page it opens agree.
            const withEffort = showsEffort(all);
            content.innerHTML = syntheticBanner(rows.some((t) => t.synthetic))
                + renderHeader(rows, withEffort) + renderTrials(rows);
            document.title = `${shortModel(wanted.model)} · ${wanted.config}${
                withEffort ? ` · ${wanted.effort} effort` : ""} · VaadinBench`;
        }
        renderFooter(index.generated_at);
    }).catch(showError);
}
