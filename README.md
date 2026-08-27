# VaadinBench results

**[vesanieminen.github.io/vaadinbench-results](https://vesanieminen.github.io/vaadinbench-results/)**

The published results for [VaadinBench](https://github.com/vesanieminen/vaadinbench):
a leaderboard, and behind every trial the trajectory the agent actually produced.

That repository is only the tasks. This one is only the results, so a run never
touches the thing being measured.

## Publishing a run

A run happens on the machine with Docker and the model credentials. This repo
turns its output into the site:

```bash
./publish.py ../vaadin-bench/jobs/new-project-3models
git add data && git commit -m "Publish new-project-3models" && git push
```

The push *is* the deploy: GitHub Pages serves `main` from the repository root,
so there is no workflow and nothing to build. Pass several job directories at
once, or `--keep` to add a run without republishing the ones already there.

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
| Diffstat and patch, when a run has them | `artifacts/logs/artifacts/agent-diff-stat.txt`, `agent.patch` |

Harbor collects a container's `/logs` verbatim, so everything a task writes to
`/logs/artifacts` sits at `artifacts/logs/artifacts/` and everything the verifier
writes to `/logs/verifier` sits at `verifier/` — the paths above are the real
ones, and reading the shallower `artifacts/` finds nothing.

The last row is conditional because since the tasks repo split the agent and
verifier into separate containers, nothing writes `agent.patch`: the verifier
imports the finished `/app` rather than diffing it. Runs from before the split
have their patches and keep them; runs from after arrive with none, and the
Changes tab says so rather than showing a blank. `publish.py` reports the count
per job, so a run that lost one file is distinguishable from a run that never
had any.

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
data/index.json         one row per trial
data/trials/<id>.json   one file per trial
```

A **configuration** is a job name with its timestamp stripped —
`vaadin-skills-20260820-171844` is one run of the `vaadin-skills`
configuration. It is what a run was testing, which skills and tools the agent
had, so `(model, configuration)` is the pair the leaderboard ranks and repeated
runs of one configuration collapse into a single row.

The colours are Vaadin's Aura theme. Aura computes nearly everything at runtime
from `--aura-background-color`, using relative-colour syntax that needs Aura's
own stylesheet, so `app.css` carries its formulas evaluated at Aura's defaults
and written out as literal `oklch()`. The header comment names the source files
to diff against when Aura moves.

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
./publish.py fixtures/jobs/example-3models
```

That job carries a `SYNTHETIC` marker. `publish.py` copies the flag into the data
and every page it reaches says so, so invented numbers cannot be mistaken for
measurements. Publishing a real run replaces them.
