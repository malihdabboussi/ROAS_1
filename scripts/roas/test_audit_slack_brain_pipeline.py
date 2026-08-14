from __future__ import annotations

import importlib.util
from pathlib import Path
from unittest import TestCase, main

MODULE_PATH = Path(__file__).with_name("audit_slack_brain_pipeline.py")
SPEC = importlib.util.spec_from_file_location("audit_slack_brain_pipeline", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class SlackBrainPipelineAuditTest(TestCase):
    def test_nested_failure_overrides_outer_success(self) -> None:
        result = {
            "status": "completed",
            "output": [
                {
                    "content": [
                        {"type": "output_text", "text": "JOB_STATUS:failed — save rejected"}
                    ]
                }
            ],
        }
        self.assertEqual(MODULE.logical_terminal_status(result), "failed")

    def test_reads_completed_and_skipped_markers(self) -> None:
        self.assertEqual(
            MODULE.logical_terminal_status({"atlasResponse": "JOB_STATUS:completed — saved"}),
            "completed",
        )
        self.assertEqual(
            MODULE.logical_terminal_status({"content": "JOB_STATUS:skipped — no durable facts"}),
            "skipped",
        )
        self.assertEqual(
            MODULE.terminal_summary({"nested": "JOB_STATUS:completed — saved 3 facts\nrest"}),
            "JOB_STATUS:completed — saved 3 facts",
        )

    def test_missing_marker_is_not_treated_as_success(self) -> None:
        self.assertEqual(MODULE.logical_terminal_status({"content": "Looks good"}), "missing")
        self.assertEqual(MODULE.logical_terminal_status({"status": "completed"}), "missing")

    def test_slack_source_prefix_is_exact_to_workspace_and_channel(self) -> None:
        self.assertEqual(
            MODULE.slack_source_prefix(
                {"slack_team_id": "T123", "slack_channel_id": "C456"}
            ),
            "slack:T123:C456:",
        )

    def test_health_fails_closed_on_poisoned_job_and_embedding_gap(self) -> None:
        report = {
            "mappings": [
                {
                    "mapping_id": "mapping-1",
                    "channel": "client",
                    "brain_id": "brain-1",
                    "capture": {"observations": 5},
                    "import": {
                        "cursor": "123.45",
                        "false_successes": 1,
                        "failed_jobs": 0,
                        "failed_jobs_last_48h": 0,
                    },
                    "brain": {"slack_memories": 2, "embedding_coverage": 0.5},
                }
            ],
            "retrieval_probe": {"passed": False},
        }
        self.assertEqual(len(MODULE.health_failures(report)), 3)

    def test_lexical_probe_requires_expected_evidence_when_given(self) -> None:
        class Client:
            def rpc(self, _function, _body):
                return [{"id": "memory-1", "content": "The approved phrase is present"}]

        result = MODULE.probe_lexical_retrieval(
            Client(), "brain-1", "approved phrase", "phrase is present"
        )
        self.assertTrue(result["passed"])
        self.assertEqual(result["lane"], "lexical")

    def test_recovery_selects_only_newest_job_per_user_and_period(self) -> None:
        jobs = [
            {
                "id": "old",
                "user_id": "user-1",
                "dedupe_key": "period-1",
                "status": "succeeded",
                "result": {"status": "completed"},
                "created_at": "2026-08-01T00:00:00+00:00",
            },
            {
                "id": "new",
                "user_id": "user-1",
                "dedupe_key": "period-1",
                "status": "succeeded",
                "result": {"status": "completed"},
                "created_at": "2026-08-02T00:00:00+00:00",
            },
            {
                "id": "active",
                "user_id": "user-1",
                "dedupe_key": "period-2",
                "status": "succeeded",
                "result": {"status": "completed"},
                "created_at": "2026-08-03T00:00:00+00:00",
            },
        ]
        selected = MODULE.select_recovery_candidates(jobs, {"period-2"}, 25)
        self.assertEqual([row["id"] for row in selected], ["new"])


if __name__ == "__main__":
    main()
