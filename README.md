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
| Diffstat and patch | `artifacts/logs/artifacts/agent-diff-stat.txt`, `agent.patch` |
| Reward, graded suites, failed test names | `verifier/reward.txt`, `verifier/TEST-*.xml` |
| The verifier's console output, last 40 KB | `verifier/test-stdout.txt` |
| Generated-project report | `artifacts/logs/artifacts/structure.txt` |

Harbor collects the container's `/logs` into `artifacts/logs`, so everything a
task writes to `/logs/artifacts` sits at `artifacts/logs/artifacts/` — the paths
above are the real ones, and reading the shallower `artifacts/` finds nothing.

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
`index.html`, `trial.html`, and the CSS and JS beside them — reading JSON that
`publish.py` wrote:

```text
index.html          leaderboard: a summary per model, then every trial
trial.html          one trial: trajectory, changes, verifier, instruction
data/index.json         one row per trial
data/trials/<id>.json   one file per trial
```

They live at the repository root because that is where Pages serves this branch
from; `.nojekyll` turns off the Jekyll pass, since there is nothing to render.

A trial's id is `base64(task|model|attempt)`, so a link to a trial survives a
republish. `trial.html?id=…&tab=verifier` opens straight to a tab.

Harbor writes the trajectory as **ATIF** (Agent Trajectory Interchange Format), a
versioned schema whose steps carry `source`, `message`, `reasoning_content` and
`tool_calls[]`. `publish.py` flattens that into events and sorts tool calls into
the buckets the page offers as filters — reads, searches, edits, bash, tests. It
is the one place that guesses: an unknown tool name becomes "other" rather than
being forced into a bucket it does not belong in.

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
