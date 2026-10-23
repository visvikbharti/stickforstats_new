/**
 * The Guardian report must render the violations Guardian actually sends.
 *
 * REPORT below is /api/guardian/check/'s response for three exponential groups of 30 (executed;
 * plot-data arrays trimmed to three values). Its violations carry visual_evidence as plot data
 * (an object), and the outlier violation has p_value and statistic null. ViolationCard rendered
 * the object directly ("Objects are not valid as a React child"), called null.toFixed, and
 * labelled the missing p-value "p = <.001", so the whole report crashed as soon as it showed a
 * real violation, on /modules/anova and everywhere else it is used.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { GuardianReportDisplay } from '..';

const REPORT = {
  "test_type": "anova",
  "can_proceed": true,
  "confidence_score": 0.583,
  "assumptions_checked": [
    "normality",
    "variance_homogeneity",
    "independence",
    "outliers"
  ],
  "alternative_tests": [
    "kruskal_wallis",
    "permutation_anova"
  ],
  "violations": [
    {
      "assumption": "normality",
      "test_name": "Shapiro-Wilk",
      "severity": "warning",
      "p_value": 0.000236,
      "statistic": 0.855498,
      "message": "Normality assumption violated (p=0.0008) (downgraded: N=30 per group; CLT provides robustness \u2014 Lumley et al., 2002)",
      "recommendation": "Consider transformation (log, sqrt) or use non-parametric tests",
      "visual_evidence": {
        "group_1": {
          "qq_plot": {
            "theoretical": [
              -2.326348,
              -1.70827,
              -1.421497
            ],
            "sample": [
              0.0018,
              0.0414,
              0.0663
            ]
          },
          "histogram": {
            "values": [
              0.11,
              0.3897,
              1.3995
            ],
            "bins": 30
          }
        },
        "group_2": {
          "qq_plot": {
            "theoretical": [
              -2.326348,
              -1.70827,
              -1.421497
            ],
            "sample": [
              0.0656,
              0.1254,
              0.1281
            ]
          },
          "histogram": {
            "values": [
              1.4144,
              0.0656,
              1.4574
            ],
            "bins": 30
          }
        },
        "group_3": {
          "qq_plot": {
            "theoretical": [
              -2.326348,
              -1.70827,
              -1.421497
            ],
            "sample": [
              0.0437,
              0.078,
              0.0817
            ]
          },
          "histogram": {
            "values": [
              0.1867,
              1.8017,
              0.4388
            ],
            "bins": 30
          }
        }
      }
    },
    {
      "assumption": "outliers",
      "test_name": "Outlier Detection (IQR + Z-score)",
      "severity": "minor",
      "p_value": null,
      "statistic": null,
      "message": "3.3% of data are outliers",
      "recommendation": "Investigate outliers, consider robust methods or transformation",
      "visual_evidence": {
        "outliers": [
          {
            "group": 1,
            "count": 1,
            "percentage": 3.333333,
            "values": [
              3.3476
            ]
          },
          {
            "group": 2,
            "count": 1,
            "percentage": 3.333333,
            "values": [
              4.4401
            ]
          }
        ]
      }
    }
  ]
};

const renderReport = () =>
  render(
    <GuardianReportDisplay
      guardianReport={REPORT}
      assumptionsChecked={REPORT.assumptions_checked}
      violations={REPORT.violations}
      confidenceScore={REPORT.confidence_score * 100}
      canProceed={REPORT.can_proceed}
      alternativeTests={REPORT.alternative_tests}
    />
  );

test('a real report with plot data and a missing p-value renders', () => {
  renderReport();
  expect(screen.getByText('Guardian Assumption Report')).toBeInTheDocument();
  // Each message appears in its violation card (and again in the raw-details block).
  expect(screen.getAllByText(/Normality assumption violated/).length).toBeGreaterThan(0);
  expect(screen.getAllByText('3.3% of data are outliers').length).toBeGreaterThan(0);
});

test('only the violation that has a p-value shows one, and with its value', () => {
  renderReport();
  expect(screen.getAllByText(/^p = /)).toHaveLength(1);
  expect(screen.getByText('p = <.001')).toBeInTheDocument();
  expect(screen.getAllByText(/^stat = /)).toHaveLength(1);
  expect(screen.getByText('stat = 0.855')).toBeInTheDocument();
});

test('plot data is described, not rendered as an object', () => {
  renderReport();
  expect(screen.getByText(/plot data for group 1, group 2, group 3/)).toBeInTheDocument();
  expect(screen.getByText(/plot data for outliers/)).toBeInTheDocument();
});
