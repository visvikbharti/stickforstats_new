#!/usr/bin/env python3
"""
StickForStats Basic Usage Examples
==================================

This script demonstrates basic usage of the StickForStats API,
including the Guardian automatic assumption validation system.

Requirements:
    pip install requests

Usage:
    1. Start the StickForStats backend:
       cd backend && python manage.py runserver

    2. Run this script:
       python basic_usage.py
"""

import requests
import json

# API base URL (adjust if running on different host/port)
BASE_URL = "http://localhost:8000/api/v1"


def print_section(title):
    """Print formatted section header."""
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)


def print_json(data):
    """Pretty print JSON data."""
    print(json.dumps(data, indent=2))


# =============================================================================
# Example 1: Independent Samples T-Test
# =============================================================================

def example_ttest():
    """Demonstrate t-test with Guardian validation."""
    print_section("Example 1: Independent Samples T-Test")

    # Sample data: comparing two treatment groups
    data = {
        "data1": [23.5, 25.1, 22.8, 24.3, 26.0, 23.9, 24.7, 25.5, 22.1, 24.8],
        "data2": [28.2, 29.5, 27.8, 30.1, 28.9, 29.3, 27.5, 30.2, 28.6, 29.8],
        "test_type": "independent"
    }

    print("\nInput Data:")
    print(f"  Group 1: {data['data1']}")
    print(f"  Group 2: {data['data2']}")

    response = requests.post(f"{BASE_URL}/stats/ttest/", json=data)

    if response.status_code == 200:
        result = response.json()

        print("\nStatistical Results:")
        print(f"  t-statistic: {result['results']['t_statistic']}")
        print(f"  p-value: {result['results']['p_value']}")
        print(f"  Degrees of freedom: {result['results']['df']}")

        print("\nGuardian Report:")
        guardian = result.get('guardian_report', {})
        print(f"  Assumptions checked: {guardian.get('assumptions_checked', [])}")
        print(f"  Violations: {guardian.get('violations', [])}")
        print(f"  Confidence score: {guardian.get('confidence_score', 'N/A')}")
        print(f"  Can proceed: {guardian.get('can_proceed', 'N/A')}")

        if result['results']['p_value'] < 0.05:
            print("\n  Conclusion: Significant difference between groups (p < 0.05)")
        else:
            print("\n  Conclusion: No significant difference (p >= 0.05)")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)


# =============================================================================
# Example 2: T-Test with Non-Normal Data (Guardian Detection)
# =============================================================================

def example_ttest_nonnormal():
    """Demonstrate Guardian detecting non-normal data."""
    print_section("Example 2: T-Test with Non-Normal Data")

    # Data with extreme outliers (non-normal)
    data = {
        "data1": [1.2, 1.5, 1.8, 2.0, 2.1, 2.3, 2.5, 15.0, 18.0, 25.0],
        "data2": [3.1, 3.5, 3.8, 4.0, 4.2, 4.5, 4.8, 5.0, 5.2, 5.5],
        "test_type": "independent"
    }

    print("\nInput Data (Group 1 contains outliers):")
    print(f"  Group 1: {data['data1']}")
    print(f"  Group 2: {data['data2']}")

    response = requests.post(f"{BASE_URL}/stats/ttest/", json=data)

    if response.status_code == 200:
        result = response.json()

        print("\nGuardian Report:")
        guardian = result.get('guardian_report', {})

        # Check for assumption violations
        assumptions = guardian.get('assumptions', {})
        if assumptions:
            for assumption, status in assumptions.items():
                is_met = status.get('is_met', True)
                p_val = status.get('p_value', 'N/A')
                print(f"  {assumption}: {'Met' if is_met else 'VIOLATED'} (p={p_val})")

        print(f"\n  Confidence score: {guardian.get('confidence_score', 'N/A')}")
        print(f"  Recommended alternatives: {guardian.get('alternatives', [])}")

        print("\n  Note: Guardian detected assumption violations automatically!")
    else:
        print(f"Error: {response.status_code}")


# =============================================================================
# Example 3: One-Way ANOVA
# =============================================================================

def example_anova():
    """Demonstrate one-way ANOVA with Guardian validation."""
    print_section("Example 3: One-Way ANOVA")

    data = {
        "groups": [
            [4.5, 5.2, 4.8, 5.1, 4.9],
            [6.2, 5.8, 6.5, 6.1, 5.9],
            [7.8, 8.2, 7.5, 8.0, 7.9]
        ]
    }

    print("\nInput Data (3 groups):")
    for i, group in enumerate(data['groups'], 1):
        print(f"  Group {i}: {group}")

    response = requests.post(f"{BASE_URL}/stats/anova/", json=data)

    if response.status_code == 200:
        result = response.json()

        print("\nStatistical Results:")
        print(f"  F-statistic: {result['results']['f_statistic']}")
        print(f"  p-value: {result['results']['p_value']}")

        if 'effect_size' in result['results']:
            print(f"  Eta-squared: {result['results']['effect_size'].get('eta_squared', 'N/A')}")

        print("\nGuardian Report:")
        guardian = result.get('guardian_report', {})
        print(f"  Confidence score: {guardian.get('confidence_score', 'N/A')}")
    else:
        print(f"Error: {response.status_code}")


# =============================================================================
# Example 4: Pearson Correlation
# =============================================================================

def example_correlation():
    """Demonstrate Pearson correlation with Guardian validation."""
    print_section("Example 4: Pearson Correlation")

    data = {
        "x": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "y": [2.1, 4.2, 5.8, 8.1, 9.9, 12.2, 14.0, 16.1, 17.9, 20.2],
        "method": "pearson"
    }

    print("\nInput Data:")
    print(f"  X: {data['x']}")
    print(f"  Y: {data['y']}")

    response = requests.post(f"{BASE_URL}/stats/correlation/", json=data)

    if response.status_code == 200:
        result = response.json()

        print("\nStatistical Results:")
        print(f"  Pearson r: {result['results']['r']}")
        print(f"  p-value: {result['results']['p_value']}")
        print(f"  R-squared: {result['results'].get('r_squared', 'N/A')}")

        print("\nGuardian Report:")
        guardian = result.get('guardian_report', {})
        print(f"  Linearity check: {'Passed' if guardian.get('can_proceed', True) else 'Warning'}")
    else:
        print(f"Error: {response.status_code}")


# =============================================================================
# Example 5: Power Analysis
# =============================================================================

def example_power_analysis():
    """Demonstrate power analysis."""
    print_section("Example 5: Power Analysis")

    data = {
        "effect_size": 0.5,  # Cohen's d
        "alpha": 0.05,
        "sample_size": 30,
        "test_type": "independent"  # Two-sample t-test
    }

    print("\nInput Parameters:")
    print(f"  Effect size (d): {data['effect_size']}")
    print(f"  Alpha: {data['alpha']}")
    print(f"  Sample size per group: {data['sample_size']}")
    print(f"  Test type: {data['test_type']}")

    response = requests.post(f"{BASE_URL}/power/", json=data)

    if response.status_code == 200:
        result = response.json()

        print("\nPower Analysis Results:")
        print(f"  Statistical power: {result.get('power', 'N/A')}")
        print(f"  Critical t-value: {result.get('critical_t', 'N/A')}")

        power = result.get('power', 0)
        if power < 0.8:
            print(f"\n  Warning: Power ({power:.2f}) is below recommended 0.80")
            print("  Consider increasing sample size")
    else:
        print(f"Error: {response.status_code}")


# =============================================================================
# Example 6: Meta-Analysis
# =============================================================================

def example_meta_analysis():
    """Demonstrate meta-analysis."""
    print_section("Example 6: Meta-Analysis (Random Effects)")

    data = {
        "studies": [
            {"effect_size": 0.50, "se": 0.10, "name": "Study A"},
            {"effect_size": 0.60, "se": 0.12, "name": "Study B"},
            {"effect_size": 0.55, "se": 0.11, "name": "Study C"},
            {"effect_size": 0.45, "se": 0.15, "name": "Study D"},
            {"effect_size": 0.52, "se": 0.13, "name": "Study E"}
        ],
        "method": "random"
    }

    print("\nInput Studies:")
    for study in data['studies']:
        print(f"  {study['name']}: effect={study['effect_size']}, SE={study['se']}")

    response = requests.post(f"{BASE_URL}/meta-analysis/", json=data)

    if response.status_code == 200:
        result = response.json()

        print("\nMeta-Analysis Results:")
        print(f"  Pooled effect: {result.get('pooled_effect', 'N/A')}")
        print(f"  95% CI: [{result.get('ci_lower', 'N/A')}, {result.get('ci_upper', 'N/A')}]")
        print(f"  Q statistic: {result.get('q_statistic', 'N/A')}")
        print(f"  I-squared: {result.get('i_squared', 'N/A')}%")
        print(f"  Tau-squared: {result.get('tau_squared', 'N/A')}")
    else:
        print(f"Error: {response.status_code}")


# =============================================================================
# Main
# =============================================================================

def main():
    """Run all examples."""
    print("\n" + "=" * 60)
    print(" STICKFORSTATS BASIC USAGE EXAMPLES")
    print(" Demonstrating Guardian Automatic Assumption Validation")
    print("=" * 60)

    try:
        # Test connection
        response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health/")
        if response.status_code != 200:
            print(f"\nError: Cannot connect to StickForStats backend at {BASE_URL}")
            print("Please ensure the server is running: python manage.py runserver")
            return
    except requests.exceptions.ConnectionError:
        print(f"\nError: Cannot connect to StickForStats backend at {BASE_URL}")
        print("Please ensure the server is running: python manage.py runserver")
        return

    # Run examples
    example_ttest()
    example_ttest_nonnormal()
    example_anova()
    example_correlation()
    example_power_analysis()
    example_meta_analysis()

    print("\n" + "=" * 60)
    print(" All examples completed!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
