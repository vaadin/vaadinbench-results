# VaadinBench results

**[https://vaadin.github.io/vaadinbench-results/](https://vaadin.github.io/vaadinbench-results/)**

The published results for [VaadinBench](https://github.com/vaadin/vaadinbench):
a leaderboard, and behind every trial the trajectory the agent actually produced.

That repository is only the tasks. This one is only the results, so a run never
touches the thing being measured.

## Benchmarks

The site holds more than one benchmark, and each is a folder under `data/`:

```text
data/benchmarks.json                 the registry the list page reads
data/release-20261021/                the benchmark the site opens on
data/default/                        the original August results, retained
data/<slug>/index.json                   one row per trial
data/<slug>/trials/<id>.json             one file per trial
data/<slug>/benchmark.json               what it is called
```

A benchmark is a set of runs asking one question, and **nothing is compared
across them** — different models, different tasks, different months. The pages
show one at a time: `?benchmark=<slug>` selects it, `benchmarks.html` lists them
all, and the current default is left out of the query string entirely. Historical
results remain available through their benchmark cards and explicit slugs,
including `?benchmark=default` for the original August results.

`benchmarks.json` is rebuilt by scanning `data/`, never edited. Deleting a
folder unpublishes it; `./publish.py --registry` rebuilds the list after one.
Everything on a card is counted from the benchmark's own index, so the list
cannot disagree with the page it links to — the one thing a scan cannot infer is
the name, which is why each folder carries a `benchmark.json`.

### Current default: October 21, 2026 release

`release-20261021` contains 648 accepted trials: nine Flow tasks, three attempts
for each model/effort/configuration pairing, and three configurations (`vanilla`,
`vaadin-skills`, `vaadin-mcp`). The eight model/effort settings are Astra medium,
Luna medium/xhigh and Sol medium on Codex, plus Haiku 5.5 medium/xhigh,
Sonnet 5.5 medium and Opus 5.5 medium on Claude Code.

The exact selection is frozen in `releases/2026-10-21/selection.json`, copied
from the completed suite's accepted-results list. The adjacent `manifest.json`
records the planned slot, source result hash and reward for every trial.
It contains one accepted source result per planned slot. Thirty-two externally
interrupted attempts were excluded and replaced under the suite's quality policy;
ordinary task, compiler and test failures remain included. The publisher rejects
duplicate, incomplete, ungraded or errored selected results before writing data.

Rebuild the release with:

```bash
python3 publish.py --selection releases/2026-10-21/selection.json
```

The manifest points to source jobs in
`/home/orca/code/vaadinbench/vaadinbench/jobs/`. Only those selected trials are
imported, even when a source job also contains excluded attempts. Original
within-job attempt numbers are retained so trial links remain stable.
All 648 trials carry captured `verifier/agent.patch` files, which are published
without baseline reconstruction. The benchmark metadata records selection hashes,
quality policy and agent versions: 190 reused Codex trials on 0.162.1, 134 on
0.163.0, and 324 Claude Code trials on 2.1.303. Original costs and timings are kept.

The original August results (`default`), September results (`all` and
`vaadin-mcp-vs-java-mcp`) and the earlier October Codex set (`codex-202610`)
remain on the benchmarks page. The root URL now opens `release-20261021`.

### October 15, 2026 snapshot (retained)

The October jobs are published separately from the existing August and September
benchmarks. Only jobs with a non-null `finished_at` and all expected trial
results are included. The earlier setup diagnostics report has been removed.

Release grading review (October 19): all 24 published Orders submissions were
replayed against the grading code at `df7a933` using their saved patches. Scores
remain 19/24 and no individual test pass/fail outcomes changed. The replay used
the original pinned runtime with verifier image
`sha256:5fe465c0f4e72c10a00d2fa2515019edd5eb916cd1ec6c161d293d483cb60a56`;
all grading files match that checkout. Original results and verifier reports are
backed up under
`/home/orca/code/vaadinbench/regrades/orders-release-20261019-182018/originals`.
The adjacent `comparison.json` records the replay outcomes. No model calls were
made; all other trial results, agent timings, token counts and costs are retained.
The benchmark metadata records the verifier revision and replay summary.

| Benchmark folder | Completed jobs | Trials | Solved / graded |
| --- | --- | --- | --- |
| `codex-202610` | Complete Luna, Sol and Astra suites | 192 | 106 / 192 |

The medium suites use GPT-6 Luna, GPT-6.1 Sol and GPT-6 Astra;
the xhigh suite uses GPT-6 Luna at xhigh effort. All use Codex 0.162.1, eight
Flow tasks and three attempts per task/model/configuration. The medium suite
scores 25/48 with skills and 22/48 with vanilla. The xhigh suite is now complete
and scores 14/24 with skills and 14/24 with vanilla. All four
model/effort sets appear on the same `codex-202610` leaderboard. The `suite-*`
jobs are medium effort and the `luna-xhigh-*` job is xhigh. Configurations are
named `vanilla` and `vaadin-skills`; reasoning effort is shown beside
the model and remains part of the aggregation and drill-down key. Configuration
markers use a uniform neutral color and distinct symbols.
`publish.py` writes configuration data to JSON; `index.js` and `common.js`
render it, styled by `utilities.css`. All generated reports use the same fixed neutral styling
for configuration labels and glyphs, with no per-configuration color map.
The Astra suite is complete: its six passing Orders trials and 42 remaining-task
trials now cover all eight tasks with three attempts each per configuration.
Astra scores 16/24 with skills and 15/24 with vanilla. The data was regenerated
from the current job artifacts, including the trajectory and verifier output;
publishing does not rerun grading.

Sources are under `/home/orca/code/vaadinbench/vaadinbench/jobs/`:

- `suite-20261014-191912-{vaadin-skills,vanilla}-codex-20261014-191912`
- `luna-xhigh-20261015-023824-{vaadin-skills,vanilla}-codex-20261015-023824`
- `orders-astra-20261015-054815-vanilla-codex-20261015-054815`
- `orders-astra-skills-20261015-064238-vaadin-skills-codex-20261015-064238`
- `orders-astra-extra-20261015-081235-{vaadin-skills,vanilla}-codex-20261015-081235`
- `astra-remaining-20261015-082920-{vaadin-skills,vanilla}-codex-20261015-083120`

Diffs were rebuilt using the unchanged task environments from checkout
`d515b87` (skills pinned to `641ff1ecfce9d8065b940a84ca5044af83d472b5`).
The `--baselines` directory was an absolute path to
`.baselines/tasks-20261015`, containing symlinks to only `flow-grid-filtering`,
`flow-new-project`, `flow-new-view` and `flow-polymer-to-lit` in that checkout.
This reconstructs 96 trial diffs. The four `*-lenient` UI tasks also copy design
files into the starting project; the publisher does not reproduce that step,
so their 96 trials deliberately have no reconstructed diff. Trajectories and
verifier output are still included.

To refresh a benchmark, pass its source job directories to `publish.py` with
the same `--benchmark` slug and the curated absolute `--baselines` path above.
For `codex-202610`, pass all ten completed job directories together,
or use `--keep` to refresh individual jobs while retaining the other runs.

## Publishing a run

A run happens on the machine with Docker and the model credentials. This repo
turns its output into the site:

```bash
./publish.py --baselines ../vaadin-bench/tasks ../vaadin-bench/jobs/new-project-3models
git add data && git commit -m "Publish new-project-3models" && git push
```

That publishes into the current default, `release-20261021`. A run that belongs somewhere else names it, and
names the benchmark the first time it is published:

```bash
./publish.py --benchmark mcp-servers --name "MCP servers, head to head" \
    --baselines ../vaadin-bench/tasks ../vaadin-bench/jobs/mcp-*
```

The name and description stick: later publishes into the same benchmark keep
them unless they are given again.

The push *is* the deploy: GitHub Pages serves `main` from the repository root,
so there is no workflow and nothing to build. Pass several job directories at
once, or `--keep` to add a run without republishing the ones already there.

`--baselines` is temporary and is explained under [Rebuilt diffs](#rebuilt-diffs).
Without it a run from after the container split publishes with an empty Changes
tab.

## What gets published

`publish.py` copies fields **by allowlist**, one at a time. A Harbor trial
directory holds much more than this — the agent's whole file tree, recordings,
raw logs — and none of it appears here unless someone adds it to that list. What
goes out today, per trial:

| Published | Read from |
| --- | --- |
| Task, agent, model, attempt, reward, duration, tokens, cost | `result.json` |
| The prompt the agent was given | first user step of the trajectory |
| Every step: message, reasoning, tool calls and their output | `agent/trajectory.json` |
| Reward, graded suites, failed test names | `verifier/reward.txt`, `verifier/TEST-*.xml` |
| The verifier's console output, last 40 KB | `verifier/test-stdout.txt` |
| Generated-project report | `verifier/structure.txt` |
| Diffstat and patch, when a run has them | `artifacts/logs/artifacts/agent-diff-stat.txt`, `agent.patch`; otherwise `verifier/agent-diff-stat.txt`, `verifier/agent.patch` |

Harbor collects a container's `/logs` verbatim, so everything a task writes to
`/logs/artifacts` sits at `artifacts/logs/artifacts/` and everything the verifier
writes to `/logs/verifier` sits at `verifier/` — the paths above are the real
ones, and reading the shallower `artifacts/` finds nothing.

The last row is conditional, and the next section is why.

### Rebuilt diffs

Since the tasks repo split the agent and verifier into separate containers,
nothing writes `agent.patch`: the verifier imports the finished `/app` rather
than diffing it. Runs from before the split have their patches and keep them;
runs from after arrive with none, and the whole Changes tab goes blank —
`vaadinbench#27` is the fix, and `#7` is the issue that deletes what this
section describes once that lands.

Until then, `--baselines` rebuilds the diff from what a run *does* still carry:
`artifacts/app`, the agent's finished project. It is compared against the tree
the task's environment starts the agent from, read from the task's own
Dockerfile:

| Task | Baseline |
| --- | --- |
| `flow-grid-filtering` | `environment/app/`, copied into the image verbatim |
| `flow-new-view` | the upstream project at the pinned `BASE_SHA`, plus `pom-additions.patch` — cloned once into `.baselines/` |
| `flow-new-project` | an empty directory, by design: creating the project is the task |

Three things to know before trusting one.

It **fails closed**. Each of those shapes is recognised explicitly, and a task
whose environment does not match one produces no diff rather than a wrong one. A
diff against the wrong baseline is worse than an empty tab, because it reads as
a measurement — which is also why it is only correct while the tasks checkout
sits at the commit the run used.

It is **not complete**. Harbor's capture of `/app` holds no dotfiles, so
`.classpath`, `.settings/` and anything else beginning with a dot is outside it.
They come off the baseline side too, or every trial would appear to have deleted
them; the cost is that a dotfile the agent really wrote is not in the diff.

It is **never preferred**. A patch a task wrote is the measurement and is used
whenever there is one. Only a trial with none gets a rebuilt diff, and the trial
page names the baseline it was rebuilt against rather than letting it pass for a
captured one.

`test-stdout.txt` is the verifier script's own stdout and stderr, and it is the
only place that says *why* a trial scored what it did: a reward of 0 with no
graded suite means the verifier never compiled against the project, which reads
as a broken page unless the log is there to explain it. The tail is published
rather than the head, because Maven's output is long and the verdict is at the
end.

Two things worth being deliberate about. Publishing a trajectory publishes the
task's `instruction.md` verbatim, canary line and all — that is the trade for a
drill-down anyone can read, and it is the same trade ReactBench makes. And tool
output is capped per call, the patch as a whole; the page says when it truncated
something rather than quietly showing less than there was.

## How it works

There is no build step and no framework. The site is a handful of static files —
three pages and the CSS and JS beside them — reading JSON that `publish.py`
wrote:

```text
index.html          leaderboard: one row per model and configuration, plus a chart
run.html            one configuration: its trials
trial.html          one trial: trajectory, changes, verifier, instruction
benchmarks.html     every published benchmark, one card each
```

Each page reads the benchmark named in its own query string, and every link it
writes carries that name onward — a click that dropped it would land on the same
model and configuration in another benchmark, which reads as the data changing
rather than the benchmark.

A **configuration** is a job name with its timestamp stripped —
`vaadin-skills-20260820-171844` is one run of the `vaadin-skills`
configuration. It is what a run was testing, which skills and tools the agent
had, so `(model, configuration)` is the pair the leaderboard ranks and repeated
runs of one configuration collapse into a single row.

The styling follows Vaadin's brand guidelines, as on the Vaadin MCP landing page.
Elements are styled only with utility classes named after Tailwind's, which
`utilities.css` hand-writes without a Tailwind install: one property per class,
grouped by property, and only the classes the pages use. Colours are 12-step
scales written as `light-dark()` on `html`; type is Regular and Mono, with Bold
only for page titles, and no font files are shipped. Most markup is built in
the page scripts, so that is where most classes live. `tests/test_styles.py` fails on an unused utility, a
class with no definition, any rule that is not a utility, or a page that loads
another stylesheet.

They live at the repository root because that is where Pages serves this branch
from; `.nojekyll` turns off the Jekyll pass, since there is nothing to render.

A trial's id is `base64(job|task|model|attempt)`, so a link to a trial survives a
republish. The job is part of it because it has to be: without it, one task and
model run in three configurations produced three trials sharing a single id, so
`data/trials/<id>.json` was written three times and only the last job survived
— the index still listed all three rows, and two of them opened another run's
trajectory, reward and diff. `trial.html?id=…&tab=verifier` opens straight to a tab, and the
leaderboard keeps its tab and both filters in the query string, so
`index.html?tab=chart&models=anthropic/claude-opus-5` is a link rather than a
set of clicks to describe.

Harbor writes the trajectory as **ATIF** (Agent Trajectory Interchange Format), a
versioned schema whose steps carry `source`, `message`, `reasoning_content` and
`tool_calls[]`. `publish.py` flattens that into events and sorts tool calls into
the buckets the page offers as filters — reads, searches, edits, bash, tests. It
is the one place that guesses: an unknown tool name becomes "other" rather than
being forced into a bucket it does not belong in.

Codex needs one step more, because it has a single tool. Reading a file, running
Maven and writing a class all arrive as `exec`, carrying a snippet of JavaScript
that calls the harness's own functions — `tools.exec_command`, `tools.apply_patch`,
`tools.update_plan`. On the tool name alone a Codex trial is two thousand
identical `other` steps with every filter empty, so the snippet is read for what
it calls and the command inside it, which is also what the step is labelled with.

## Working on the site

```bash
python3 -m http.server 8000
```

To develop without a benchmark run, write a synthetic job first. It is built by
Harbor's own pydantic models, so it validates against the same schemas a real run
produces — and it needs Harbor, which the tasks repo already has installed:

```bash
../vaadin-bench/.venv/bin/python fixtures/make_fixture.py
./publish.py --benchmark scratch --name Scratch fixtures/jobs/example-3models
```

Into its own benchmark, not over `release-20261021`: publishing without `--benchmark`
replaces the front page with the fixture.

That job carries a `SYNTHETIC` marker. `publish.py` copies the flag into the data
and every page it reaches says so, so invented numbers cannot be mistaken for
measurements. Publishing a real run replaces them.
