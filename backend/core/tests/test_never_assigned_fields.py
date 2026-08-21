"""
Fields that are DECLARED, READ TO MAKE A DECISION, and never assigned by anything.

This is the defect shape this project has now shipped five times: `similar_shapes` (declared in
Guardian's requirements with no validator behind it), the `ASSUMPTION_UNREPORTED` verdict
(in the enum, the DB, the migration, the API docstring and the React component, emitted by no
code path), `assumptions_reported_in_text`, `p_match`, and `group_sizes`. The rule learned from
them is: **when you find one, grep the whole dataclass for siblings.**

Doing that on `ClaimDataSpec` turned up `rows_sequential`, which is worse than `group_sizes`
because something actually READS it to make a decision.

WHY THIS FILE IS A TRIPWIRE AND NOT A FIX
-----------------------------------------
`rows_sequential` gates T14: the lag-1 autocorrelation check false-flags cross-sectional and
row-shuffled data, so Guardian's `independence` violations are honoured only when the rows are
genuinely ordered. That design is correct. The problem is that NOTHING EVER SETS THE FLAG, so
the gate is permanently in the "drop the violation" position.

It is currently harmless, and that is precisely what makes it dangerous: a SECOND gate upstream
is also dead. `cascade_engine` calls `guardian.check(data, guardian_type, alpha)` without
`observation_order`, and Guardian only evaluates independence when that argument is supplied.
So Guardian never raises an independence violation on this path, and the never-assigned flag
never has one to swallow. Two dead gates in series.

The hazard is the HALF-FIX. Someone who notices the upstream gap and starts passing
`observation_order` will produce real critical independence violations that `rows_sequential`
then silently discards -- and the assumption report will say independence was evaluated. That
is the `similar_shapes` lie again: a label asserting a check that did not happen.

Fixing it properly means deciding whether a linked table's rows are genuinely sequential, which
is a feature (the linker would have to detect a time/order column), not a one-line change. So
the gap is recorded as an executable tripwire rather than a comment: touch either gate and this
test fails, telling you to deal with both.
"""

import re
from pathlib import Path

from django.test import SimpleTestCase

MANUSCRIPT = Path(__file__).resolve().parent.parent / "manuscript"
CASCADE = Path(__file__).resolve().parent.parent / "services" / "cascade_engine.py"
BACKEND = Path(__file__).resolve().parent.parent.parent

#: ONLY this file is exempt, because its own docstrings quote the assignment they warn about
#: (the first run duly reported that as a violation).
#:
#: `verdicts.py` and `reanalysis_engine.py` are deliberately NOT exempt. They were, in the first
#: draft, on the reasoning that they "legitimately mention the flag" -- but the declaration is
#: `rows_sequential: bool = False` and the reads are `not rows_sequential` /
#: `bool(spec.rows_sequential)`, none of which the pattern matches, so the exemption bought
#: nothing and cost everything: mutation-testing showed that injecting
#: `spec.rows_sequential = True` into reanalysis_engine -- the single most likely place for it
#: to appear -- SURVIVED, because the tripwire had excused the file wholesale. A tripwire that
#: exempts the room the intruder walks through is not a tripwire.
_EXEMPT_FILES = {"test_never_assigned_fields.py"}


def _python_sources():
    for path in BACKEND.rglob("*.py"):
        if "__pycache__" in path.parts or ".venv" in str(path):
            continue
        yield path


class RowsSequentialIsNeverAssignedTests(SimpleTestCase):

    def test_nothing_assigns_rows_sequential(self):
        """The flag that decides whether an independence violation counts is never set.

        If you are here because this test failed, GOOD -- something now assigns it. Before you
        add the file to the allowed set, check the OTHER gate too: `cascade_engine` must pass
        `observation_order` to `guardian.check`, or Guardian never raises the violation your
        newly-populated flag is meant to admit, and you have fixed nothing.

        MUTATION: add `spec.rows_sequential = True` anywhere in the manuscript package -> fails.
        """
        assignments = []
        pattern = re.compile(r"rows_sequential\s*=(?!=)")
        for path in _python_sources():
            for i, line in enumerate(path.read_text(errors="ignore").splitlines(), 1):
                if pattern.search(line) and path.name not in _EXEMPT_FILES:
                    assignments.append(f"{path.relative_to(BACKEND)}:{i}: {line.strip()}")
        self.assertEqual(
            assignments, [],
            "rows_sequential is now assigned somewhere. Read this module's docstring: the "
            "upstream gate in cascade_engine must be opened at the same time, or independence "
            "violations are still never raised.\n" + "\n".join(assignments))

    def test_the_only_assignment_is_the_dataclass_default(self):
        """Pins the fact that the declaration is a default, not a computed value.

        MUTATION: change the ClaimDataSpec declaration to anything other than a bare default
        -> fails.
        """
        from core.manuscript.verdicts import ClaimDataSpec

        self.assertIs(ClaimDataSpec().rows_sequential, False)
        self.assertIs(ClaimDataSpec(groups=[[1.0, 2.0], [3.0, 4.0]]).rows_sequential, False)

    def test_the_upstream_gate_is_also_shut(self):
        """cascade_engine never asks Guardian to evaluate independence.

        This is the other half of the pair, and the reason the first half is currently
        harmless. Asserting it here means the two cannot be changed independently in silence.

        MUTATION: pass `observation_order=...` in cascade_engine's guardian.check call ->
        fails, and correctly, because `rows_sequential` would then discard the result.
        """
        source = CASCADE.read_text()
        calls = re.findall(r"self\.guardian\.check\([^)]*\)", source, re.S)
        self.assertTrue(calls, "cascade_engine no longer calls guardian.check as expected")
        for call in calls:
            self.assertNotIn(
                "observation_order", call,
                "cascade_engine now passes observation_order, so Guardian WILL raise "
                "independence violations -- and reanalysis_engine's T14 gate still drops every "
                "one of them, because rows_sequential is never assigned. Fix both or neither.")

    def test_the_gate_really_does_drop_the_violation(self):
        """Not a source grep: the actual behaviour, so the docstring above is not a story.

        MUTATION: invert the `if not rows_sequential` condition in
        `_critical_after_independence_gate` -> fails.
        """
        from core.manuscript.reanalysis_engine import _critical_after_independence_gate

        report = {"violations": [
            {"assumption": "independence", "severity": "critical", "message": "lag-1 autocorr"},
            {"assumption": "normality", "severity": "critical", "message": "skewed"},
        ]}
        dropped = _critical_after_independence_gate(report, False)   # what production always does
        kept = _critical_after_independence_gate(report, True)       # what nothing can trigger
        self.assertEqual([v["assumption"] for v in dropped], ["normality"])
        self.assertEqual([v["assumption"] for v in kept], ["independence", "normality"])
