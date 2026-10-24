"""
The genomics endpoint returns the KNOWN fold change on either input scale -- provided the request
says which scale the matrix is on.

Issue #31: the upload screen never sent ``input_scale``, so the API's default, "linear", was applied
to every upload. On an already-log2 matrix that is log2 of a ratio of log-scale means, which is not a
fold change: it shrinks genes with high log-scale means toward zero (the issue's example: a true +2.79
shown as +0.33) and inflates lowly expressed ones. The service has
computed both scales correctly since test_fold_change_is_a_fold_change; what was missing was the
caller saying which one it had. These tests pin the HTTP contract the upload screen now relies on,
using the request shape it actually sends (csv_data + sample_groups + input_scale).

The synthetic matrix is built so the true log2 fold change is known in closed form and is the SAME
on both scales. Every treatment sample is an exact multiple k of the matching control sample, so
    linear:  log2(mean(k * x) / mean(x))        = log2(k)
    log2:    mean(log2(k * x)) - mean(log2(x))  = log2(k)
"""

import math

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

CONTROL = [80.0, 90.0, 100.0, 110.0, 120.0, 100.0]
# gene -> exact fold change (treatment / control)
FOLDS = {"UNCHANGED": 1.0, "UP2": 2.0, "UP4": 4.0, "DOWN8": 0.125}
# log2 of each: 0, +1, +2, -3
KNOWN_LOG2FC = {gene: math.log2(k) for gene, k in FOLDS.items()}
SAMPLES = [f"ctrl_{i}" for i in range(1, 7)] + [f"treat_{i}" for i in range(1, 7)]
GROUPS = ["control"] * 6 + ["treatment"] * 6


def _rows(scale):
    for gene, k in FOLDS.items():
        values = CONTROL + [k * x for x in CONTROL]
        if scale == "log2":
            values = [math.log2(v) for v in values]
        yield gene, values


def _csv(scale):
    lines = ["gene," + ",".join(SAMPLES)]
    lines += [gene + "," + ",".join(repr(v) for v in values) for gene, values in _rows(scale)]
    return "\n".join(lines)


@override_settings(SECURE_SSL_REDIRECT=False)
class TheUploadScreensRequestGetsTheKnownFoldChangeOnBothScales(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _post(self, csv_data, **extra):
        body = {
            "csv_data": csv_data,
            "sample_groups": GROUPS,
            "group1_name": "control",
            "group2_name": "treatment",
            "alpha": 0.05,
            **extra,
        }
        response = self.client.post(reverse("api-v1:genomics-de"), body, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()

    def _fold_changes(self, payload):
        return {g["gene_name"]: g["log2_fold_change"] for g in payload["gene_results"]}

    def test_linear_input_declared_linear_recovers_the_known_fold_changes(self):
        payload = self._post(_csv("linear"), input_scale="linear")
        self.assertEqual(payload["summary"]["input_scale"], "linear")
        for gene, expected in KNOWN_LOG2FC.items():
            with self.subTest(gene=gene):
                self.assertAlmostEqual(self._fold_changes(payload)[gene], expected, places=4)

    def test_log2_input_declared_log2_recovers_the_same_known_fold_changes(self):
        payload = self._post(_csv("log2"), input_scale="log2")
        self.assertEqual(payload["summary"]["input_scale"], "log2")
        for gene, expected in KNOWN_LOG2FC.items():
            with self.subTest(gene=gene):
                self.assertAlmostEqual(self._fold_changes(payload)[gene], expected, places=4)

    def test_the_volcano_x_axis_is_the_same_known_fold_change(self):
        # The volcano plot's x-coordinate is the fold change; it must be the corrected one too.
        for scale in ("linear", "log2"):
            payload = self._post(_csv(scale), input_scale=scale)
            x = {p["gene"]: p["log2fc"] for p in payload["volcano_data"]}
            for gene, expected in KNOWN_LOG2FC.items():
                with self.subTest(scale=scale, gene=gene):
                    self.assertAlmostEqual(x[gene], expected, places=4)

    def test_log2_input_sent_without_a_scale_is_the_bug_the_page_used_to_trigger(self):
        # This is the request the upload screen sent before issue #31: no input_scale, so the API
        # default ("linear") is applied to a log2 matrix. The 4-fold gene (true log2FC +2) comes
        # back shrunk to a fraction of 1. Pinned so the default stays visible: the fix lives in the
        # caller, which must now always say which scale it has.
        payload = self._post(_csv("log2"))
        self.assertEqual(payload["summary"]["input_scale"], "linear")
        shrunk = self._fold_changes(payload)["UP4"]
        self.assertGreater(shrunk, 0.0)
        self.assertLess(shrunk, 1.0)
