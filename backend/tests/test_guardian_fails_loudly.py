"""
The Guardian must FAIL LOUDLY rather than certify something it never checked.

Two live defects, both found by calling the real GuardianCore:

D4 -- empty input crashed with an uncaught IndexError:

    GuardianCore().check(test_type="t_test", data={"group1": [], "group2": []})
    IndexError: index -1 is out of bounds for axis 0 with size 0
      guardian_core.py:1329 in OutlierDetector.validate  (np.percentile on a
      zero-length array), reached from check() at guardian_core.py:520

    And the neighbouring case was worse than a crash: at n = 1 per group the
    check COMPLETED and recorded variance_homogeneity = "pass" and
    outliers = "pass", because scipy.stats.levene and scipy.stats.zscore return
    NaN for a single observation and ``if p_value < alpha`` is False for NaN.
    A certificate built on statistics that do not exist.

D2 -- an unrecognised test_type silently passed with maximum confidence:

    check(test_type="correlation", ...)          -> assumptions_checked == []
    check(test_type="pearson_correlation", ...)  -> assumptions_checked == []
    check(test_type="welch_t", ...)              -> assumptions_checked == []
        ... all three with zero violations and confidence_score == 1.0

    For a platform whose thesis is that validation is the default rather than
    an opt-in, a plausible-looking test-type string that skips every check and
    reports maximum confidence is the worst possible failure mode.

The fixes: ``GuardianInputError`` for data no validator can compute on, and
``UnknownTestTypeError`` (whose message lists the valid values) for a test the
Guardian does not know. Both subclass ValueError.

Every test here asserts on values produced by running the real GuardianCore in
this process; nothing is hard-coded from a document. Data are generated with an
explicit seed.
"""

import numpy as np
from django.test import Client, SimpleTestCase, override_settings

from core.guardian.guardian_core import (
    GuardianCore,
    GuardianInputError,
    UnknownTestTypeError,
)

SEED = 20260804


def _two_normal_groups(n=40, seed=SEED):
    """Two clean normal groups: the control case that must keep working."""
    rng = np.random.default_rng(seed)
    return {
        "group1": rng.normal(0.0, 1.0, n).tolist(),
        "group2": rng.normal(0.0, 1.0, n).tolist(),
    }


class EmptyAndSingletonInputFailsLoudly(SimpleTestCase):
    """D4: data that cannot be validated must produce no report at all."""

    def setUp(self):
        self.guardian = GuardianCore()

    def test_empty_groups_raise_guardian_input_error_not_indexerror(self):
        with self.assertRaises(GuardianInputError) as ctx:
            self.guardian.check(
                test_type="t_test", data={"group1": [], "group2": []}
            )
        message = str(ctx.exception)
        # The message must be usable by a caller: which group, how many
        # values it had, and how many are required.
        self.assertIn("group_1", message)
        self.assertIn("0", message)
        self.assertIn("at least 2", message)

    def test_guardian_input_error_is_a_value_error(self):
        """Existing `except ValueError` handlers must keep catching it."""
        self.assertTrue(issubclass(GuardianInputError, ValueError))
        with self.assertRaises(ValueError):
            self.guardian.check(test_type="t_test", data={"a": [], "b": []})

    def test_empty_list_payload_also_raises(self):
        with self.assertRaises(GuardianInputError):
            self.guardian.check(test_type="anova", data=[[], [], []])

    def test_no_groups_at_all_raises(self):
        with self.assertRaises(GuardianInputError):
            self.guardian.check(test_type="t_test", data={})

    def test_single_observation_per_group_raises(self):
        """n = 1 used to return can_proceed=False but certify variance/outliers."""
        with self.assertRaises(GuardianInputError):
            self.guardian.check(
                test_type="t_test", data={"group1": [1.0], "group2": [2.0]}
            )

    def test_one_empty_group_among_valid_ones_raises(self):
        data = _two_normal_groups()
        data["group3"] = []
        with self.assertRaises(GuardianInputError) as ctx:
            self.guardian.check(test_type="anova", data=data)
        self.assertIn("group_3", str(ctx.exception))

    def test_all_nan_group_raises_because_nothing_is_computable(self):
        with self.assertRaises(GuardianInputError):
            self.guardian.check(
                test_type="t_test",
                data={
                    "group1": [np.nan] * 5,
                    "group2": [1.0, 2.0, 3.0, 4.0, 5.0],
                },
            )

    def test_paired_design_with_a_single_pair_raises(self):
        """The paired path analyses differences; one pair is one difference."""
        with self.assertRaises(GuardianInputError):
            self.guardian.check(
                test_type="t_test",
                data={"pre": [1.0], "post": [2.0]},
                design="paired",
            )

    def test_two_observations_still_produce_a_report(self):
        """The guard must not become a blanket refusal of small samples."""
        report = self.guardian.check(
            test_type="t_test",
            data={"group1": [1.0, 2.0], "group2": [3.0, 5.0]},
        )
        self.assertIsNotNone(report)
        # ... and n = 2 must not be certified as fine either: Shapiro-Wilk
        # cannot run on n = 2, which the normality check reports as critical.
        self.assertFalse(report.can_proceed)
        self.assertLess(report.confidence_score, 1.0)

    def test_clean_data_is_unaffected_by_the_guard(self):
        report = self.guardian.check(
            test_type="t_test", data=_two_normal_groups()
        )
        self.assertTrue(report.can_proceed)
        self.assertEqual(report.violations, [])
        # `independence` is REQUIRED by a t-test but is not evaluated here: the lag-1
        # autocorrelation test only runs when the caller declares the rows are ordered, and
        # this call does not. It used to be listed as checked anyway, because
        # `assumptions_checked` was the requirements list rather than a record of what ran --
        # so this assertion pinned the defect as the specification. The two lists together
        # still reconstruct the requirements; only the claim about what we DID has changed.
        self.assertEqual(
            report.assumptions_checked,
            ["normality", "variance_homogeneity", "outliers"],
        )
        self.assertEqual(report.assumptions_not_evaluated, ["independence"])


class UnknownTestTypeFailsLoudly(SimpleTestCase):
    """D2: no test_type may yield a zero-check, confidence-1.0 report."""

    def setUp(self):
        self.guardian = GuardianCore()
        self.data = _two_normal_groups()

    def test_unrecognised_test_type_raises(self):
        with self.assertRaises(UnknownTestTypeError):
            self.guardian.check(
                test_type="totally_made_up_test", data=self.data
            )

    def test_unknown_test_type_error_is_a_value_error(self):
        self.assertTrue(issubclass(UnknownTestTypeError, ValueError))
        with self.assertRaises(ValueError):
            self.guardian.check(test_type="not_a_test", data=self.data)

    def test_the_message_lists_the_valid_values(self):
        with self.assertRaises(UnknownTestTypeError) as ctx:
            self.guardian.check(test_type="not_a_test", data=self.data)
        message = str(ctx.exception)
        self.assertIn("not_a_test", message)
        for expected in ("t_test", "anova", "pearson", "regression"):
            self.assertIn(expected, message)

    def test_missing_or_blank_test_type_raises(self):
        for bad in (None, "", "   "):
            with self.assertRaises(UnknownTestTypeError):
                self.guardian.check(test_type=bad, data=self.data)

    #: Test types that examine NOTHING when handed two plain numeric groups with no
    #: observation_order. This is a property of (test type x THIS data), not of the test type
    #: alone -- verified: chi_square on the same numeric groups examines nothing, while
    #: chi_square with a declared {"observed": [[...]]} table examines Cochran's rule at
    #: confidence 1.0. Two distinct causes:
    #:
    #:   * the eight modelling tests whose ONLY declared requirement is `independence`, which
    #:     is evaluated only when the caller declares the rows are ordered. These are a real
    #:     PRODUCT GAP: we offer survival, Cox, IV, PSM and DiD with no assumption validation
    #:     behind them at all.
    #:   * the chi-square / Fisher family, which is being called with the wrong payload here.
    #:     Nothing is wrong with the test; the caller has not supplied a table.
    #:
    #: The set exists so neither cause can grow in silence. Shrinking it is progress.
    EXAMINE_NOTHING_ON_PLAIN_NUMERIC_GROUPS = {
        # no validation behind these at all -- a product gap, not a caller error
        "bayesian_correlation", "cox_regression", "did", "difference_in_differences",
        "iv", "propensity_score", "psm", "survival",
        # need a declared contingency table; correct to examine nothing without one
        "chi2", "chi2_contingency", "chi_square", "chi_squared", "chisquare",
        "chi_square_goodness_of_fit", "chi_square_independence",
        "fisher_exact", "fisher_exact_test", "fishers_exact",
    }

    def test_no_test_type_certifies_without_having_checked(self):
        """The core invariant, restated so it cannot be satisfied by a LABEL.

        The original form asserted ``len(report.assumptions_checked) > 0``. It passed for every
        test type -- including the eight that examine nothing -- because
        ``assumptions_checked`` was populated from the REQUIREMENTS list, so it was never empty
        no matter what ran. **The test written to catch this defect was defeated by the very
        lie it was written to detect.** Its own docstring named the property ("'correlation' was
        accepted and returned assumptions_checked == [] with confidence_score == 1.0") while
        asserting a value that could not express it.

        Now ``assumptions_checked`` records what was EXAMINED, so the honest invariant is: a
        report either examined something, or says so unmistakably. A caller must never be able
        to read an absence of evidence as a clean bill.

        MUTATION: drop the `none_evaluated` warning from guardian_core -> confidence returns to
        1.0 for the eight and this fails. MUTATION: revert `assumptions_checked` to the
        requirements list -> the membership assertion fails, because
        types that examine nothing would once again look as though they had.
        """
        examined_nothing = set()
        for test_type in self.guardian.known_test_types():
            report = self.guardian.check(test_type=test_type, data=self.data)

            # every name we claim to have checked must be backed by a real audit entry
            really_ran = {
                e.assumption for e in report.audit_trail
                if e.result in ("pass", "violation")
            }
            self.assertEqual(
                set(report.assumptions_checked) - really_ran, set(),
                msg=f"test_type={test_type!r} claims a check its audit trail does not record",
            )

            if report.assumptions_checked:
                continue

            examined_nothing.add(test_type)
            # Examined nothing -> this must be unmistakable, in three independent ways.
            self.assertTrue(
                report.assumptions_not_evaluated,
                msg=f"test_type={test_type!r} examined nothing and did not say what it skipped",
            )
            self.assertLess(
                report.confidence_score, 1.0,
                msg=f"test_type={test_type!r} examined nothing at full confidence",
            )
            self.assertTrue(
                any(v.assumption == "none_evaluated" for v in report.violations),
                msg=f"test_type={test_type!r} examined nothing without saying so",
            )

        self.assertEqual(
            examined_nothing, self.EXAMINE_NOTHING_ON_PLAIN_NUMERIC_GROUPS,
            msg="the set of test types with no real assumption validation has CHANGED. If it "
                "shrank, delete the entry and celebrate. If it grew, a test is now offered with "
                "nothing behind it.",
        )

    def test_the_two_strings_the_audit_found_now_run_real_checks(self):
        for test_type in ("correlation", "pearson_correlation"):
            report = self.guardian.check(
                test_type=test_type, data=self.data
            )
            # canonicalised to "pearson", so it gets pearson's requirements
            self.assertEqual(
                report.assumptions_checked,
                ["normality", "linearity", "outliers"],
                msg=f"test_type={test_type!r}",
            )
            # the report still echoes what the caller asked for
            self.assertEqual(report.test_type, test_type)
            tested = {
                e.assumption
                for e in report.audit_trail
                if e.result in ("pass", "violation")
            }
            self.assertIn("normality", tested)

    def test_welch_t_is_a_t_test_not_an_unknown_test(self):
        """The cascade engine and the frontend both send "welch_t"."""
        report = self.guardian.check(test_type="welch_t", data=self.data)
        self.assertEqual(
            report.assumptions_checked,
            ["normality", "variance_homogeneity", "outliers"],
        )
        self.assertEqual(report.assumptions_not_evaluated, ["independence"])

    def test_design_naming_aliases_keep_their_design(self):
        """"paired_t" must not be validated as an independent-samples test."""
        paired = self.guardian.check(
            test_type="paired_t_test", data=_two_normal_groups()
        )
        # variance homogeneity between two independent groups does not apply
        # to a paired test, so it must not be reported as checked.
        self.assertNotIn("variance_homogeneity", paired.assumptions_checked)

        independent = self.guardian.check(
            test_type="independent_t_test", data=_two_normal_groups()
        )
        self.assertIn(
            "variance_homogeneity", independent.assumptions_checked
        )

    def test_an_explicit_design_argument_beats_the_alias(self):
        report = self.guardian.check(
            test_type="paired_t_test",
            data=_two_normal_groups(),
            design="independent",
        )
        self.assertIn("variance_homogeneity", report.assumptions_checked)

    def test_no_alias_shadows_a_canonical_test_name(self):
        """An alias key that equals a canonical key would silently reroute it."""
        collisions = sorted(
            set(self.guardian._TEST_TYPE_ALIASES)
            & set(self.guardian.test_requirements)
        )
        self.assertEqual(collisions, [])

    def test_every_alias_target_is_a_real_canonical_test(self):
        for alias, target in self.guardian._TEST_TYPE_ALIASES.items():
            self.assertTrue(
                target in self.guardian.test_requirements
                or target in self.guardian._CONTINGENCY_TESTS,
                msg=f"alias {alias!r} points at unknown target {target!r}",
            )

    def test_contingency_synonyms_still_route_to_the_table_check(self):
        """Canonicalising must not break the chi-square/Fisher table path."""
        for test_type in ("chi_square", "chi_square_independence", "fisher_exact"):
            report = self.guardian.check(
                test_type=test_type, data={"observed": [[26, 24], [23, 27]]}
            )
            self.assertEqual(report.data_summary["table_shape"], [2, 2])
            self.assertEqual(report.test_type, test_type)


class CascadeEngineMustNotFailOpenTests(SimpleTestCase):
    """A Guardian failure must never be recorded as a Guardian pass.

    ``AutonomousCascadeEngine.execute_with_cascade`` wrapped its Guardian call
    in ``except Exception -> guardian_report = None`` and then read the report
    behind ``if guardian_report:``. Because ``passed`` was initialised to True
    and only lowered inside that branch, any Guardian failure produced a
    CascadeStep with ``guardian_passed=True`` and ran the test anyway. The user
    was told the assumptions had been checked and had held, when in fact the
    checker had crashed.

    This is the same defect class as an unknown test_type returning confidence
    1.0, one layer up, and it had no test at all -- it survived a mutation run
    that reinstated it. Hence these.
    """

    def setUp(self):
        from core.services.cascade_engine import AutonomousCascadeEngine

        self.engine = AutonomousCascadeEngine()

    def test_uncheckable_data_propagates_instead_of_being_certified(self):
        """A single observation per group cannot support any assumption check."""
        with self.assertRaises(GuardianInputError):
            self.engine.execute_with_cascade(
                data={"group1": [1.0], "group2": [2.0]},
                intended_test="t_test",
            )

    def test_an_internal_guardian_failure_is_never_reported_as_passed(self):
        """Force Guardian to raise and inspect what the cascade records.

        The failure is injected rather than waited for: the point is what the
        engine does with an exception, not which validator might produce one.
        """
        from unittest.mock import patch

        rng = np.random.default_rng(4242)
        data = {
            "group1": rng.normal(0, 1, 40).tolist(),
            "group2": rng.normal(0.5, 1, 40).tolist(),
        }

        with patch.object(
            self.engine.guardian, "check", side_effect=RuntimeError("validator blew up")
        ):
            result = self.engine.execute_with_cascade(
                data=data, intended_test="t_test"
            )

        self.assertFalse(
            result.assumptions_satisfied,
            "a Guardian crash was reported as satisfied assumptions",
        )
        self.assertTrue(
            all(not step.guardian_passed for step in result.cascade_path),
            "a cascade step recorded guardian_passed=True after Guardian raised",
        )
        self.assertEqual(
            result.confidence_score,
            0.0,
            "an unvalidated result carried non-zero confidence",
        )
        # The reason must reach the user, not just the log.
        self.assertTrue(
            any(
                "NOT verified" in v
                for step in result.cascade_path
                for v in step.violations
            ),
            f"nothing in the cascade path tells the user the assumptions were "
            f"never checked: {[s.violations for s in result.cascade_path]}",
        )


@override_settings(SECURE_SSL_REDIRECT=False)
class GuardianHttpStatusTests(SimpleTestCase):
    """A bad request must read as a bad request, not as a broken server.

    Once GuardianCore started raising on uncheckable data and unknown test
    types, the check endpoint's blanket ``except Exception`` turned both into
    HTTP 500. That is wrong in both directions: it tells the client developer
    the server is at fault when the payload is, and it buries genuine server
    faults in the same bucket as typos.
    """

    URL = "/api/guardian/check/"

    def setUp(self):
        self.client = Client()
        rng = np.random.default_rng(31337)
        self.ok_data = {
            "group1": rng.normal(0, 1, 30).tolist(),
            "group2": rng.normal(0, 1, 30).tolist(),
        }

    def _post(self, payload):
        return self.client.post(
            self.URL, payload, content_type="application/json"
        )

    def test_unknown_test_type_is_400_with_an_actionable_message(self):
        r = self._post({"data": self.ok_data, "test_type": "definitely_not_a_test"})
        self.assertEqual(r.status_code, 400, r.content[:400])
        body = r.json()
        self.assertEqual(body["error_type"], "UnknownTestTypeError")
        self.assertIn("t_test", body["error"], "the message must list valid values")

    def test_uncheckable_data_is_400(self):
        r = self._post({"data": {"group1": [1.0], "group2": [2.0]}, "test_type": "t_test"})
        self.assertEqual(r.status_code, 400, r.content[:400])
        self.assertEqual(r.json()["error_type"], "GuardianInputError")

    def test_the_screens_that_broke_now_work(self):
        """Regression for two live interfaces.

        'manova' had no entry in test_requirements, so before it was added the
        MANOVA screen received a report with zero checks and confidence 1.0 --
        an all-clear having verified nothing -- and then, once unknown test
        types began raising, an HTTP 500. Neither is acceptable. It must return
        a real report listing the assumptions actually evaluated.
        """
        for test_type in ("manova", "mann_whitney", "welch_t", "repeated_measures"):
            with self.subTest(test_type=test_type):
                r = self._post({"data": self.ok_data, "test_type": test_type})
                self.assertEqual(r.status_code, 200, r.content[:300])
                checked = r.json()["assumptions_checked"]
                self.assertTrue(
                    checked, f"{test_type} returned an empty assumptions_checked"
                )


class ChiSquareWithoutATableMustNotCertifyItTests(SimpleTestCase):
    """The expected-frequency rule must not be reported as checked when it wasn't.

    ``expected_frequencies`` is the one requirement in ``test_requirements`` with
    no registered validator: it is evaluated by ``_check_contingency``, which
    runs only when a table is DECLARED under an explicit key. When no table is
    declared the request falls through to the numeric path, the dispatch loop
    skips the requirement -- and ``assumptions_checked``, built from the
    requirements list, still named it.

    Measured before the fix, on the same 2x2 table both ways:

        check([[[1, 2], [3, 4]]], "chi_square_independence")
            -> assumptions_checked ['expected_frequencies', 'independence'],
               0 violations, confidence 1.000, can_proceed True
        check({"observed": [[1, 2], [3, 4]]}, "chi_square_independence")
            -> 1 critical violation, confidence 0.167, can_proceed False

    Every expected count in that table is about 2.5, so Cochran's rule is
    grossly violated. The careless payload got the cleaner report, and
    ``ClaimDataSpec.as_engine_data()`` produces exactly the careless shape, so
    the manuscript verifier certified Cochran-violating chi-squares as clean.
    """

    def setUp(self):
        self.guardian = GuardianCore()
        self.bad_table = [[1, 2], [3, 4]]

    def test_undeclared_table_does_not_claim_the_check_ran(self):
        report = self.guardian.check([self.bad_table], "chi_square_independence")
        self.assertNotIn(
            "expected_frequencies", report.assumptions_checked,
            "the report lists an assumption that no code evaluated",
        )

    def test_undeclared_table_says_so_rather_than_returning_a_clean_report(self):
        report = self.guardian.check([self.bad_table], "chi_square_independence")
        self.assertLess(
            report.confidence_score, 1.0,
            "an unevaluated assumption produced full confidence, which is "
            "indistinguishable from a table that genuinely passed",
        )
        notes = [v for v in report.violations if v.assumption == "expected_frequencies"]
        self.assertTrue(notes, "nothing told the caller the rule was not applied")
        self.assertIn("NOT evaluated", notes[0].message)
        self.assertIn("observed", notes[0].recommendation)

    def test_it_warns_rather_than_blocks(self):
        """The cascade engine legitimately passes two raw 0/1 code vectors for
        chi_square_independence, and blocking those would be wrong."""
        report = self.guardian.check([self.bad_table], "chi_square_independence")
        self.assertTrue(report.can_proceed)

    def test_a_declared_table_still_gets_the_real_check(self):
        """Guard against 'fixing' this by disabling the contingency path."""
        report = self.guardian.check(
            {"observed": self.bad_table}, "chi_square_independence"
        )
        self.assertIn("expected_frequencies", report.assumptions_checked)
        self.assertFalse(report.can_proceed, "Cochran's rule should block this table")
        self.assertAlmostEqual(report.confidence_score, 0.167, places=3)

    def test_a_healthy_declared_table_is_still_clean(self):
        report = self.guardian.check({"observed": [[26, 24], [23, 27]]}, "chi_square")
        self.assertEqual(len(report.violations), 0)
        self.assertEqual(report.confidence_score, 1.0)


@override_settings(SECURE_SSL_REDIRECT=False)
class PdfExportMustSurviveValidatorProseTests(SimpleTestCase):
    """Validator prose reaches reportlab's mini-XML parser unescaped.

    ``report_generator.py`` interpolates ``violation.test_name``,
    ``violation.message`` and ``violation.recommendation`` straight into a
    reportlab ``Paragraph``, which parses its input as XML. A bare ``<`` is
    therefore a syntax error that aborts the whole render.

    Executed before the fix: a recommendation reading "P(X<Y) != 0.5" made
    ``POST /api/guardian/export/pdf/`` return **HTTP 500**
    ("paraparser: syntax error: parse ended with 1 unclosed tags") for every
    Mann-Whitney or Kruskal-Wallis with a group below n = 5. The same data with
    test_type="t_test" returned 200, and the JSON export returned 200, which is
    what localised it to the PDF path.

    This endpoint had **no test anywhere in the repository**, so the suite went
    green with it broken. That absence is the reason the string shipped.
    """

    URL = "/api/guardian/export/pdf/"

    def _post(self, payload):
        return Client().post(self.URL, payload, content_type="application/json")

    def test_rank_test_below_the_shape_minimum_still_renders(self):
        r = self._post({"data": {"a": [1, 2, 3], "b": [9, 8, 7]},
                        "test_type": "mann_whitney"})
        self.assertEqual(r.status_code, 200, r.content[:300])
        self.assertGreater(len(r.content), 1000, "an empty PDF is not a PDF")

    def test_every_size_around_the_shape_minimum_renders(self):
        for n in (2, 3, 4, 5, 6):
            with self.subTest(n=n):
                a = list(range(1, n + 1))
                b = [x + 10 for x in a]
                r = self._post({"data": {"a": a, "b": b}, "test_type": "mann_whitney"})
                self.assertEqual(r.status_code, 200, f"n={n}: {r.content[:200]}")

    def test_markup_characters_in_validator_prose_do_not_break_the_render(self):
        """Directly pin the escaping, not just the one string that exposed it.

        Any future validator message containing < > or & must not be able to
        500 this endpoint. Asserted against the generator rather than through a
        payload, because reaching it through data would require a validator
        that happens to emit those characters -- which is exactly the fragile
        coupling being removed.
        """
        from core.guardian.guardian_core import AssumptionViolation, GuardianCore
        from core.guardian.report_generator import GuardianReportGenerator

        rng = np.random.default_rng(808)
        # These are the shapes that actually break reportlab, established by
        # feeding candidates to a bare Paragraph. It tolerates a CLOSED unknown
        # tag ("A <test> & another" renders fine) and a lone "< " with a space,
        # so a synthetic-looking string proves nothing -- an earlier version of
        # this test used exactly such a string and the mutation survived it.
        # What raises is "<" immediately followed by text and never closed:
        # "P(X<Y) != 0.5" -> "parse ended with 1 unclosed tags", and a real tag
        # name left open, "the <b thing" -> 2 unclosed.
        for field, text in (
            ("message", "P(X<Y) != 0.5 for the two groups"),
            ("recommendation", "Report the shift, not the <b median"),
            ("test_name", "Kolmogorov-Smirnov (P(X<Y) form)"),
        ):
            with self.subTest(field=field):
                kwargs = dict(
                    assumption="normality",
                    test_name="Shapiro-Wilk",
                    severity="warning",
                    p_value=0.01,
                    statistic=1.0,
                    message="m",
                    recommendation="r",
                )
                kwargs[field] = text
                probe = GuardianCore().check(
                    {"a": rng.normal(0, 1, 30).tolist(),
                     "b": rng.normal(0, 5, 30).tolist()},
                    "t_test",
                )
                probe.violations.append(AssumptionViolation(**kwargs))
                pdf = GuardianReportGenerator().generate_pdf(probe)
                self.assertTrue(pdf.startswith(b"%PDF"), "output is not a PDF")
                self.assertGreater(len(pdf), 1000)
