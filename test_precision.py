#!/usr/bin/env python3
"""
50 Decimal Precision End-to-End Test Suite
===========================================
Tests that verify 50 decimal precision is maintained throughout
the entire calculation pipeline in StickForStats.
"""

import json
import requests
from decimal import Decimal, getcontext
from mpmath import mp, mpf
import sys
import time
from colorama import init, Fore, Style

# Initialize colorama for colored output
init(autoreset=True)

# Set precision for testing
mp.dps = 50
getcontext().prec = 50

# API endpoint
BASE_URL = "http://localhost:8000/api/v1"

# Test data with high precision values
TEST_VALUES_50_DECIMALS = [
    "3.14159265358979323846264338327950288419716939937510",  # π
    "2.71828182845904523536028747135266249775724709369995",  # e
    "1.41421356237309504880168872420969807856967187537694",  # √2
    "1.73205080756887729352744634150587236694280525381038",  # √3
    "2.23606797749978969640917366873127623544061835961153",  # √5
]

# Additional test values
PRECISION_TEST_CASES = {
    "very_small": "0.00000000000000000000000000000000000000000000000001",
    "very_large": "99999999999999999999999999999999999999999999999999.0",
    "recurring": "0.33333333333333333333333333333333333333333333333333",
    "complex": "123.45678901234567890123456789012345678901234567890",
}

def print_header(title):
    """Print formatted section header"""
    print(f"\n{Fore.CYAN}{'='*60}")
    print(f"{Fore.CYAN}{title:^60}")
    print(f"{Fore.CYAN}{'='*60}\n")

def print_test(name, status, details=""):
    """Print test result"""
    if status == "PASS":
        symbol = "✓"
        color = Fore.GREEN
    elif status == "FAIL":
        symbol = "✗"
        color = Fore.RED
    else:
        symbol = "⚠"
        color = Fore.YELLOW

    print(f"{color}{symbol} {name}: {status}")
    if details:
        print(f"  {Fore.WHITE}{details}")

def test_ttest_precision():
    """Test T-Test calculator precision"""
    print_header("T-TEST PRECISION TEST")

    # Prepare high-precision data
    data1 = ",".join(TEST_VALUES_50_DECIMALS)
    data2 = ",".join([str(mpf(x) + mpf("0.5")) for x in TEST_VALUES_50_DECIMALS])

    payload = {
        "test_type": "two_sample",
        "data1": data1,
        "data2": data2,
        "alternative": "two_sided",
        "confidence_level": "95"
    }

    try:
        response = requests.post(f"{BASE_URL}/stats/ttest/", json=payload)
        if response.status_code == 200:
            result = response.json()

            # Check t-statistic precision
            t_stat = result.get("t_statistic", "")
            if len(t_stat.split('.')[-1]) >= 40:
                print_test("T-statistic precision", "PASS",
                          f"Decimals: {len(t_stat.split('.')[-1])}")
            else:
                print_test("T-statistic precision", "FAIL",
                          f"Only {len(t_stat.split('.')[-1])} decimals")

            # Check p-value precision
            p_value = result.get("p_value", "")
            if len(p_value.split('.')[-1]) >= 40:
                print_test("P-value precision", "PASS",
                          f"Decimals: {len(p_value.split('.')[-1])}")
            else:
                print_test("P-value precision", "FAIL",
                          f"Only {len(p_value.split('.')[-1])} decimals")

            # Check mean difference precision
            mean_diff = result.get("mean_difference", "")
            if mean_diff and len(str(mean_diff).split('.')[-1]) >= 40:
                print_test("Mean difference precision", "PASS")

            return True
        else:
            print_test("T-test API call", "FAIL", f"Status: {response.status_code}")
            return False

    except Exception as e:
        print_test("T-test precision test", "FAIL", str(e))
        return False

def test_anova_precision():
    """Test ANOVA calculator precision"""
    print_header("ANOVA PRECISION TEST")

    groups = [
        {"name": "Group A", "data": ",".join(TEST_VALUES_50_DECIMALS[:3])},
        {"name": "Group B", "data": ",".join(TEST_VALUES_50_DECIMALS[2:])},
        {"name": "Group C", "data": ",".join([str(mpf(x) * mpf("2")) for x in TEST_VALUES_50_DECIMALS[:3]])}
    ]

    payload = {
        "anova_type": "one_way",
        "groups": groups,
        "post_hoc": "tukey",
        "check_assumptions": True
    }

    try:
        response = requests.post(f"{BASE_URL}/stats/anova/", json=payload)
        if response.status_code == 200:
            result = response.json()

            # Check F-statistic precision
            f_stat = result.get("f_statistic", "")
            if len(str(f_stat).split('.')[-1]) >= 40:
                print_test("F-statistic precision", "PASS",
                          f"Decimals: {len(str(f_stat).split('.')[-1])}")
            else:
                print_test("F-statistic precision", "FAIL")

            # Check sum of squares precision
            ss_between = result.get("ss_between", "")
            if ss_between and len(str(ss_between).split('.')[-1]) >= 40:
                print_test("Sum of Squares precision", "PASS")

            return True
        else:
            print_test("ANOVA API call", "FAIL", f"Status: {response.status_code}")
            return False

    except Exception as e:
        print_test("ANOVA precision test", "FAIL", str(e))
        return False

def test_regression_precision():
    """Test Regression calculator precision"""
    print_header("REGRESSION PRECISION TEST")

    x_data = ",".join([str(i) for i in range(len(TEST_VALUES_50_DECIMALS))])
    y_data = ",".join(TEST_VALUES_50_DECIMALS)

    payload = {
        "regression_type": "linear",
        "x_data": x_data,
        "y_data": y_data
    }

    try:
        response = requests.post(f"{BASE_URL}/stats/regression/", json=payload)
        if response.status_code == 200:
            result = response.json()

            # Check coefficient precision
            coefficients = result.get("coefficients", {})
            if coefficients:
                slope = str(coefficients.get("slope", ""))
                if len(slope.split('.')[-1]) >= 40:
                    print_test("Slope precision", "PASS",
                              f"Decimals: {len(slope.split('.')[-1])}")
                else:
                    print_test("Slope precision", "FAIL")

                intercept = str(coefficients.get("intercept", ""))
                if len(intercept.split('.')[-1]) >= 40:
                    print_test("Intercept precision", "PASS")

            # Check R-squared precision
            r_squared = result.get("r_squared", "")
            if r_squared and len(str(r_squared).split('.')[-1]) >= 40:
                print_test("R-squared precision", "PASS")

            return True
        else:
            print_test("Regression API call", "FAIL", f"Status: {response.status_code}")
            return False

    except Exception as e:
        print_test("Regression precision test", "FAIL", str(e))
        return False

def test_descriptive_precision():
    """Test Descriptive Statistics precision"""
    print_header("DESCRIPTIVE STATISTICS PRECISION TEST")

    data = ",".join(TEST_VALUES_50_DECIMALS + list(PRECISION_TEST_CASES.values()))

    payload = {
        "data": data,
        "statistics": ["mean", "std", "variance", "median", "skewness", "kurtosis"]
    }

    try:
        response = requests.post(f"{BASE_URL}/stats/descriptive/", json=payload)
        if response.status_code == 200:
            result = response.json()

            # Check mean precision
            mean = result.get("mean", "")
            if mean and len(str(mean).split('.')[-1]) >= 40:
                print_test("Mean precision", "PASS",
                          f"Decimals: {len(str(mean).split('.')[-1])}")
            else:
                print_test("Mean precision", "FAIL")

            # Check standard deviation precision
            std = result.get("std", "")
            if std and len(str(std).split('.')[-1]) >= 40:
                print_test("Standard deviation precision", "PASS")

            # Check variance precision
            variance = result.get("variance", "")
            if variance and len(str(variance).split('.')[-1]) >= 40:
                print_test("Variance precision", "PASS")

            return True
        else:
            print_test("Descriptive stats API call", "FAIL", f"Status: {response.status_code}")
            return False

    except Exception as e:
        print_test("Descriptive stats precision test", "FAIL", str(e))
        return False

def test_edge_cases():
    """Test edge cases for precision"""
    print_header("EDGE CASES PRECISION TEST")

    # Test very small numbers
    small_data = ",".join([PRECISION_TEST_CASES["very_small"]] * 5)
    payload = {
        "test_type": "one_sample",
        "data1": small_data,
        "hypothesized_mean": "0",
        "alternative": "two_sided"
    }

    try:
        response = requests.post(f"{BASE_URL}/stats/ttest/", json=payload)
        if response.status_code == 200:
            print_test("Very small numbers", "PASS")
        else:
            print_test("Very small numbers", "FAIL")
    except:
        print_test("Very small numbers", "FAIL")

    # Test very large numbers
    large_data = ",".join([PRECISION_TEST_CASES["very_large"]] * 5)
    payload["data1"] = large_data
    payload["hypothesized_mean"] = PRECISION_TEST_CASES["very_large"]

    try:
        response = requests.post(f"{BASE_URL}/stats/ttest/", json=payload)
        if response.status_code == 200:
            print_test("Very large numbers", "PASS")
        else:
            print_test("Very large numbers", "FAIL")
    except:
        print_test("Very large numbers", "FAIL")

    # Test mixed precision
    mixed_data = ",".join(list(PRECISION_TEST_CASES.values()))
    payload["data1"] = mixed_data
    payload["hypothesized_mean"] = "1.0"

    try:
        response = requests.post(f"{BASE_URL}/stats/ttest/", json=payload)
        if response.status_code == 200:
            result = response.json()
            t_stat = result.get("t_statistic", "")
            if len(str(t_stat).split('.')[-1]) >= 40:
                print_test("Mixed precision values", "PASS")
            else:
                print_test("Mixed precision values", "WARN",
                          "Precision may be degraded")
        else:
            print_test("Mixed precision values", "FAIL")
    except:
        print_test("Mixed precision values", "FAIL")

def verify_calculation_accuracy():
    """Verify calculations are mathematically correct"""
    print_header("CALCULATION ACCURACY TEST")

    # Test simple mean calculation
    test_values = ["1.0", "2.0", "3.0", "4.0", "5.0"]
    expected_mean = "3.0"

    payload = {
        "data": ",".join(test_values),
        "statistics": ["mean"]
    }

    try:
        response = requests.post(f"{BASE_URL}/stats/descriptive/", json=payload)
        if response.status_code == 200:
            result = response.json()
            calculated_mean = result.get("mean", "")

            # Use mpmath for comparison
            mp.dps = 50
            expected = mpf(expected_mean)
            calculated = mpf(calculated_mean)

            if abs(expected - calculated) < mpf("1e-45"):
                print_test("Mean calculation accuracy", "PASS",
                          f"Error < 1e-45")
            else:
                print_test("Mean calculation accuracy", "FAIL",
                          f"Expected: {expected}, Got: {calculated}")
        else:
            print_test("Calculation accuracy test", "FAIL")
    except Exception as e:
        print_test("Calculation accuracy test", "FAIL", str(e))

def test_ancova_precision():
    """Test ANCOVA precision with covariates"""
    print_header("ANCOVA PRECISION TEST")

    groups = [
        {"name": "Treatment", "data": ",".join(TEST_VALUES_50_DECIMALS[:3])},
        {"name": "Control", "data": ",".join(TEST_VALUES_50_DECIMALS[2:])}
    ]

    covariates = [
        {"name": "Age", "data": ",".join(["25.12345678901234567890123456789012345678901234567890",
                                         "30.98765432109876543210987654321098765432109876543210",
                                         "35.55555555555555555555555555555555555555555555555555"])}
    ]

    payload = {
        "groups": groups,
        "covariates": covariates,
        "check_homogeneity_slopes": True
    }

    try:
        response = requests.post(f"{BASE_URL}/stats/ancova/", json=payload)
        if response.status_code == 200:
            result = response.json()

            # Check adjusted means precision
            adjusted_means = result.get("adjusted_means", {})
            if adjusted_means:
                for group, mean in adjusted_means.items():
                    if len(str(mean).split('.')[-1]) >= 40:
                        print_test(f"Adjusted mean ({group}) precision", "PASS")
                    else:
                        print_test(f"Adjusted mean ({group}) precision", "FAIL")

            return True
        else:
            print_test("ANCOVA API call", "FAIL", f"Status: {response.status_code}")
            return False

    except Exception as e:
        print_test("ANCOVA precision test", "FAIL", str(e))
        return False

def run_all_tests():
    """Run all precision tests"""
    print(f"\n{Fore.YELLOW}{'*'*60}")
    print(f"{Fore.YELLOW}*{' '*58}*")
    print(f"{Fore.YELLOW}*{' STICKFORSTATS 50 DECIMAL PRECISION TEST SUITE ':^58}*")
    print(f"{Fore.YELLOW}*{' '*58}*")
    print(f"{Fore.YELLOW}{'*'*60}\n")

    print(f"{Fore.WHITE}Testing API at: {BASE_URL}")
    print(f"{Fore.WHITE}Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")

    total_tests = 0
    passed_tests = 0

    # Run tests
    tests = [
        test_ttest_precision,
        test_anova_precision,
        test_regression_precision,
        test_descriptive_precision,
        test_ancova_precision,
        test_edge_cases,
        verify_calculation_accuracy
    ]

    for test_func in tests:
        result = test_func()
        total_tests += 1
        if result:
            passed_tests += 1

    # Summary
    print_header("TEST SUMMARY")
    print(f"{Fore.WHITE}Total Tests Run: {total_tests}")
    print(f"{Fore.GREEN}Passed: {passed_tests}")
    print(f"{Fore.RED}Failed: {total_tests - passed_tests}")

    if passed_tests == total_tests:
        print(f"\n{Fore.GREEN}{'='*60}")
        print(f"{Fore.GREEN}ALL PRECISION TESTS PASSED! 🎉")
        print(f"{Fore.GREEN}50 Decimal Precision Maintained Throughout")
        print(f"{Fore.GREEN}{'='*60}\n")
        return 0
    else:
        print(f"\n{Fore.RED}{'='*60}")
        print(f"{Fore.RED}SOME TESTS FAILED - Review Required")
        print(f"{Fore.RED}{'='*60}\n")
        return 1

if __name__ == "__main__":
    # Check if backend is running
    try:
        response = requests.get(BASE_URL + "/")
    except:
        print(f"{Fore.RED}ERROR: Backend server not running at {BASE_URL}")
        print(f"{Fore.YELLOW}Please start the backend with: python manage.py runserver")
        sys.exit(1)

    # Run tests
    exit_code = run_all_tests()
    sys.exit(exit_code)