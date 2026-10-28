// Every published benchmark, one card each. A benchmark is a folder under
// `data/` with its own index and trials; this page is the only place that shows
// more than one of them, and the only way between them.
//
// It reads `data/benchmarks.json`, which publish.py rebuilds by scanning those
// folders. Nothing here counts anything: the numbers on a card come from the
// same index the benchmark's own leaderboard reads, so the two cannot disagree.

const content = document.getElementById("content");

// What a benchmark is, in the units a reader is choosing between: how much was
// run, and how it went. The score is the same one the leaderboard totals -- the
// share of graded trials that reached reward 1 -- so a card previews the page it
// opens rather than introducing a second number for the same thing.
function renderCard(entry, isDefault) {
    const score = entry.graded
        ? Math.round((entry.solved / entry.graded) * 100) : null;
    const facts = [
        `${entry.models} model${entry.models === 1 ? "" : "s"}`,
        `${entry.configs} configuration${entry.configs === 1 ? "" : "s"}`,
        `${entry.tasks} task${entry.tasks === 1 ? "" : "s"}`,
        `${entry.trials} trial${entry.trials === 1 ? "" : "s"}`,
    ];
    const stamp = entry.generated_at
        ? new Date(entry.generated_at).toISOString().slice(0, 10) : null;
    const url = entry.slug === DEFAULT_BENCHMARK
        ? "index.html" : `index.html?benchmark=${encodeURIComponent(entry.slug)}`;

    return `<li>
        <a class="bg-gray-3 block no-underline p-6 rounded-lg text-gray-12 hover:bg-gray-5" href="${url}">
            <h2 class="flex flex-wrap font-normal gap-2 items-center leading-snug m-0 mb-1 text-lg tracking-1">${escapeHtml(entry.name)}
                ${isDefault ? `<span class="${BADGE.tag}">opens by default</span>` : ""}
                ${entry.synthetic ? `<span class="${BADGE.fail}">synthetic</span>` : ""}
            </h2>
            ${entry.description
                ? `<p class="m-0 max-w-2xl mb-3 text-gray-11">${escapeHtml(entry.description)}</p>` : ""}
            <p class="${NOTE} mb-2">${facts.map(escapeHtml).join(" · ")}</p>
            <p class="flex gap-3 items-baseline m-0">
                ${score === null ? "—" : `<span>${score}% solved</span>
                    <span class="text-2xs text-gray-11">${entry.solved}/${entry.graded}</span>`}
                ${stamp ? `<span class="text-2xs text-gray-11">published ${escapeHtml(stamp)}</span>` : ""}
            </p>
        </a>
    </li>`;
}

fetchJson("data/benchmarks.json").then((registry) => {
    const all = registry.benchmarks ?? [];
    if (!all.length) {
        content.innerHTML = `<p class="${EMPTY}">No benchmarks published yet.</p>`;
        return;
    }
    content.innerHTML = `<h1 class="-tracking-1 font-bold leading-tight m-0 text-3xl mb-2">Benchmarks</h1>
        <p class="leading-snug m-0 max-w-2xl mb-6 text-base text-gray-11 tracking-1">Each one is
        a separate set of runs, with its own leaderboard and its own trials. Nothing
        is compared across them: a different benchmark is a different question.</p>
        <ul class="flex flex-col gap-4 list-none m-0 p-0" role="list">${all.map((entry) =>
            renderCard(entry, entry.slug === (registry.default ?? DEFAULT_BENCHMARK))
        ).join("")}</ul>`;
    // The registry carries no stamp of its own -- each benchmark is published on
    // its own day, and the cards say when.
    renderFooter(null);
}).catch(showError);
