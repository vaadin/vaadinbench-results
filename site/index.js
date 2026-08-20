// The leaderboard: one summary per model, then every trial behind it.

function summarize(trials) {
    const byModel = new Map();
    for (const trial of trials) {
        const key = trial.model;
        const row = byModel.get(key) ?? {
            model: key, attempts: 0, solved: 0, graded: 0, cost: 0, duration: 0, tasks: new Set(),
        };
        row.attempts += 1;
        row.tasks.add(trial.task);
        if (trial.reward !== null && trial.reward !== undefined) {
            row.graded += 1;
            if (trial.reward >= 1) row.solved += 1;
        }
        row.cost += trial.cost_usd ?? 0;
        row.duration += trial.duration_s ?? 0;
        byModel.set(key, row);
    }
    return [...byModel.values()].sort((a, b) => {
        const rateA = a.graded ? a.solved / a.graded : -1;
        const rateB = b.graded ? b.solved / b.graded : -1;
        return rateB - rateA || a.cost - b.cost;
    });
}

function renderSummary(rows) {
    const body = rows.map((row) => {
        const rate = row.graded ? Math.round((row.solved / row.graded) * 100) : null;
        return `<tr>
            <td>${escapeHtml(shortModel(row.model))}</td>
            <td class="num">${rate === null ? "—" : `${rate}%`}</td>
            <td class="num">${row.solved}/${row.graded}</td>
            <td class="num">${row.tasks.size}</td>
            <td class="num">${money(row.cost / row.attempts)}</td>
            <td class="num">${duration(row.duration / row.attempts)}</td>
        </tr>`;
    }).join("");

    return `<div class="wrap"><table>
        <thead><tr>
            <th>Model</th>
            <th class="num">Pass rate</th>
            <th class="num">Solved</th>
            <th class="num">Tasks</th>
            <th class="num">Cost / trial</th>
            <th class="num">Time / trial</th>
        </tr></thead>
        <tbody>${body}</tbody>
    </table></div>`;
}

function renderTrials(run) {
    const rows = [...run.trials]
        .sort((a, b) => a.task.localeCompare(b.task)
            || a.model.localeCompare(b.model)
            || a.attempt - b.attempt)
        .map((trial) => `<tr>
            <td><a href="${trialUrl(trial.id)}">${escapeHtml(shortTask(trial.task))}</a></td>
            <td>${escapeHtml(shortModel(trial.model))}</td>
            <td class="num">${trial.attempt}</td>
            <td>${outcome(trial)}</td>
            <td class="num">${duration(trial.duration_s)}</td>
            <td class="num">${trial.steps}</td>
            <td class="num">${tokens(trial.output_tokens)}</td>
            <td class="num">${money(trial.cost_usd)}</td>
        </tr>`).join("");

    return `<h2>${escapeHtml(run.job)}</h2>
        <div class="wrap"><table>
        <thead><tr>
            <th>Task</th><th>Model</th><th class="num">Attempt</th><th>Outcome</th>
            <th class="num">Time</th><th class="num">Steps</th>
            <th class="num">Out. tokens</th><th class="num">Cost</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table></div>`;
}

fetchJson("data/index.json").then((index) => {
    const runs = index.runs ?? [];
    const trials = runs.flatMap((run) => run.trials ?? []);
    const content = document.getElementById("content");

    if (!trials.length) {
        content.innerHTML = `<p class="empty">No results published yet.</p>`;
        renderFooter(index.generated_at);
        return;
    }

    content.innerHTML = [
        syntheticBanner(runs.some((run) => run.synthetic)),
        `<h2>By model</h2>`,
        renderSummary(summarize(trials)),
        ...runs.map(renderTrials),
    ].join("");
    renderFooter(index.generated_at);
}).catch(showError);
