"""Integrity audit for the live ROAS Company Wiki records."""

from __future__ import annotations

import sys
from collections.abc import Callable
from typing import Any


def audit_rows(
    rows: list[dict[str, Any]],
    import_version: str,
    validate_html: Callable[[str], list[str]],
    strip_html: Callable[[str], str],
) -> int:
    roots = [row for row in rows if not row.get("parent_item_id")]
    processes = [row for row in rows if row.get("parent_item_id")]
    failures: list[str] = []
    for row in processes:
        metadata = row.get("custom_data") or {}
        errors = validate_html(row.get("doc_body") or "")
        if metadata.get("import_version") != import_version:
            errors.append("wrong import version")
        if metadata.get("content_quality") != "executable_sop":
            errors.append("wrong content quality")
        if errors:
            failures.append(f"{row['title']}: {'; '.join(errors)}")
    for row in roots:
        metadata = row.get("custom_data") or {}
        body = row.get("doc_body") or ""
        if metadata.get("content_quality") != "task_navigation" or "<table" not in body or "<ol" not in body:
            failures.append(f"{row['title']}: incomplete task navigation")
    if len(processes) != 84 or len(roots) != 6:
        failures.append(f"unexpected topology: processes={len(processes)} roots={len(roots)}")
    if failures:
        for failure in failures:
            print(f"FAIL {failure}", file=sys.stderr)
        return 1
    lengths = [len(strip_html(row.get("doc_body") or "")) for row in processes]
    print(
        f"AUDIT PASS records={len(rows)} processes={len(processes)} navigation={len(roots)} "
        f"min_chars={min(lengths)} avg_chars={sum(lengths) // len(lengths)} "
        f"ordered_procedures={len(processes)}"
    )
    return 0
