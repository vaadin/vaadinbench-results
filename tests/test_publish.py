import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import publish


class PublishSelectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.job = self.root / 'job-vanilla-codex-20261021-120000'
        self.output = self.root / 'details'
        self.output.mkdir()

    def trial(self, name):
        directory = self.job / name
        directory.mkdir(parents=True)
        result = {
            'task_name': 'vaadin/flow-new-view',
            'agent_info': {'name': 'codex', 'model_info': {'provider': 'openai', 'name': 'test-model'}},
            'config': {'agent': {'kwargs': {'reasoning_effort': 'medium'}}},
            'finished_at': '2026-10-21T12:00:00Z',
            'verifier_result': {'rewards': {'reward': 0}},
        }
        (directory / 'result.json').write_text(json.dumps(result))
        return directory

    def test_config_names_cover_both_agents_and_mcp(self):
        cases = {
            'batch-vaadin-mcp-claude-code-20261021-120000': 'vaadin-mcp',
            'batch-vaadin-skills-codex-20261021-120000': 'vaadin-skills',
            'batch-vanilla-claude-code-20261021-120000': 'vanilla',
            'vaadin-skills-mcp-codex': 'vaadin-skills-mcp',
            'vanilla-20260821-121445': 'vanilla',
        }
        for job, expected in cases.items():
            with self.subTest(job=job):
                self.assertEqual(publish.configuration_of(job), expected)

    def test_filter_preserves_original_attempt_number(self):
        self.trial('attempt-a')
        second = self.trial('attempt-b')
        with contextlib.redirect_stderr(io.StringIO()):
            run = publish.collect_job(self.job, self.output, selected_results={(second / 'result.json').resolve()})
        self.assertEqual(len(run['trials']), 1)
        row = run['trials'][0]
        self.assertEqual(row['attempt'], 2)
        self.assertEqual(row['id'], publish.trial_id(self.job.name, row['task'], row['model'], 2))

    def test_reads_verifier_patch_and_diffstat(self):
        directory = self.trial('attempt-a')
        verifier = directory / 'verifier'
        verifier.mkdir()
        (verifier / 'agent.patch').write_text('captured verifier patch')
        (verifier / 'agent-diff-stat.txt').write_text('1 file changed')
        with contextlib.redirect_stderr(io.StringIO()):
            row, detail = publish.collect_trial(directory, self.job.name, 1)
        self.assertEqual(detail['changes']['patch'], 'captured verifier patch')
        self.assertEqual(detail['changes']['diffstat'], '1 file changed')
        self.assertNotIn('reconstructed', detail['changes'])

    def test_existing_artifact_patch_keeps_precedence(self):
        directory = self.trial('attempt-a')
        artifact = publish.artifact(directory, 'agent.patch')
        artifact.parent.mkdir(parents=True)
        artifact.write_text('original artifact patch')
        (directory / 'verifier').mkdir()
        (directory / 'verifier/agent.patch').write_text('other patch')
        with contextlib.redirect_stderr(io.StringIO()):
            row, detail = publish.collect_trial(directory, self.job.name, 1)
        self.assertEqual(detail['changes']['patch'], 'original artifact patch')

    def run_selection(self, mapping):
        selection = self.root / 'selection.json'
        selection.write_text(json.dumps({'results_by_row': mapping}))
        data = self.root / 'data'
        with patch.object(publish, 'DATA', data), patch.object(publish, 'REGISTRY', data / 'benchmarks.json'), \
                patch('sys.argv', ['publish.py', '--selection', str(selection), '--benchmark', 'test']), \
                contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return publish.main()

    def test_duplicate_selection_fails_before_writing(self):
        directory = self.trial('attempt-a')
        result = str(directory / 'result.json')
        with self.assertRaises(SystemExit) as caught:
            self.run_selection({'1': result, '2': result})
        self.assertEqual(caught.exception.code, 2)
        self.assertFalse((self.root / 'data').exists())

    def test_completed_reward_zero_is_included(self):
        directory = self.trial('attempt-a')
        self.assertEqual(self.run_selection({'1': str(directory / 'result.json')}), 0)
        index = json.loads((self.root / 'data/test/index.json').read_text())
        self.assertEqual(index['runs'][0]['trials'][0]['reward'], 0)

    def test_ungraded_selection_fails_before_writing(self):
        directory = self.trial('attempt-a')
        result = directory / 'result.json'
        value = json.loads(result.read_text())
        value['verifier_result'] = None
        result.write_text(json.dumps(value))
        with self.assertRaises(SystemExit) as caught:
            self.run_selection({'1': str(result)})
        self.assertEqual(caught.exception.code, 2)
        self.assertFalse((self.root / 'data').exists())


if __name__ == '__main__':
    unittest.main()
