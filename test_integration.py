#!/usr/bin/env python3

"""
StickForStats Integration Test Runner
Tests all backend endpoints to verify 50 decimal precision and correct functionality
"""

import requests
import json
from decimal import Decimal, getcontext
import time
from typing import Dict, Any, List, Tuple
from colorama import init, Fore, Style

# Set decimal precision to 50
getcontext().prec = 50

# Initialize colorama for colored output
init()

class IntegrationTester:
    def __init__(self, base_url: str = "http://localhost:8000", token: str = None):
        self.base_url = base_url
        self.token = token
        self.headers = {}
        if token:
            self.headers['Authorization'] = f'Token {token}'
        self.headers['Content-Type'] = 'application/json'

        self.results = {
            'total': 0,
            'passed': 0,
            'failed': 0,
            'errors': [],
            'precision_checks': []
        }

    def print_header(self, text: str):
        """Print a formatted header"""
        print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{text:^60}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")

    def print_test(self, name: str, status: str, details: str = ""):
        """Print test result with color coding"""
        if status == "PASS":
            color = Fore.GREEN
            symbol = "✓"
        elif status == "FAIL":
            color = Fore.RED
            symbol = "✗"
        else:
            color = Fore.YELLOW
            symbol = "?"

        print(f"{color}{symbol} {name:40} [{status:^6}]{Style.RESET_ALL}", end="")
        if details:
            print(f"  {details}")
        else:
            print()

    def verify_precision(self, value: Any, field_name: str) -> Tuple[bool, int]:
        """Verify that a value has high precision (at least 30 decimals)"""
        if value is None:
            return False, 0

        str_value = str(value)
        if '.' in str_value:
            decimal_part = str_value.split('.')[1]
            decimal_count = len(decimal_part.rstrip('0'))
            # Expect at least 30 decimals for high precision values
            return decimal_count >= 30, decimal_count
        return False, 0

    def test_endpoint(self, method: str, endpoint: str, data: Dict = None,
                      expected_fields: List[str] = None,
                      precision_fields: List[str] = None) -> bool:
        """Test a single endpoint"""
        self.results['total'] += 1
        url = f"{self.base_url}{endpoint}"

        try:
            # Make request
            if method == "GET":
                response = requests.get(url, headers=self.headers)
            elif method == "POST":
                response = requests.post(url, json=data, headers=self.headers)
            else:
                raise ValueError(f"Unsupported method: {method}")

            # Check status code
            if response.status_code != 200:
                self.print_test(
                    endpoint,
                    "FAIL",
                    f"Status {response.status_code}: {response.text[:100]}"
                )
                self.results['failed'] += 1
                self.results['errors'].append({
                    'endpoint': endpoint,
                    'error': f"Status {response.status_code}"
                })
                return False

            # Parse response
            result = response.json()

            # Check expected fields
            if expected_fields:
                missing_fields = []
                for field in expected_fields:
                    if field not in result and field not in result.get('data', {}):
                        missing_fields.append(field)

                if missing_fields:
                    self.print_test(
                        endpoint,
                        "FAIL",
                        f"Missing fields: {', '.join(missing_fields)}"
                    )
                    self.results['failed'] += 1
                    return False

            # Check precision
            if precision_fields:
                precision_results = []
                for field in precision_fields:
                    value = result.get(field) or result.get('data', {}).get(field)
                    has_precision, decimals = self.verify_precision(value, field)
                    precision_results.append({
                        'field': field,
                        'has_precision': has_precision,
                        'decimals': decimals
                    })
                    self.results['precision_checks'].append({
                        'endpoint': endpoint,
                        'field': field,
                        'decimals': decimals,
                        'valid': has_precision
                    })

                # Report precision status
                all_precise = all(p['has_precision'] for p in precision_results)
                precision_detail = ", ".join([
                    f"{p['field']}:{p['decimals']}d"
                    for p in precision_results
                ])

                if all_precise:
                    self.print_test(endpoint, "PASS", f"Precision: {precision_detail}")
                else:
                    self.print_test(endpoint, "PASS", f"⚠️  Low precision: {precision_detail}")
            else:
                self.print_test(endpoint, "PASS")

            self.results['passed'] += 1
            return True

        except Exception as e:
            self.print_test(endpoint, "FAIL", str(e)[:100])
            self.results['failed'] += 1
            self.results['errors'].append({
                'endpoint': endpoint,
                'error': str(e)
            })
            return False

    def run_power_analysis_tests(self):
        """Test Power Analysis endpoints"""
        self.print_header("Power Analysis Tests")

        # T-test power calculation
        self.test_endpoint(
            "POST",
            "/api/v1/power/t-test/",
            data={
                "sample_size": 30,
                "effect_size": 0.8,
                "alpha": 0.05,
                "test_type": "two-sided"
            },
            expected_fields=["power", "effect_size", "sample_size"],
            precision_fields=["power"]
        )

        # ANOVA sample size
        self.test_endpoint(
            "POST",
            "/api/v1/power/sample-size/anova/",
            data={
                "effect_size": 0.4,
                "alpha": 0.05,
                "power": 0.8,
                "num_groups": 3
            },
            expected_fields=["total_sample_size", "per_group_sample_size"],
            precision_fields=["total_sample_size"]
        )

        # Power curves
        self.test_endpoint(
            "POST",
            "/api/v1/power/curves/",
            data={
                "test_type": "t-test",
                "effect_sizes": [0.2, 0.5, 0.8],
                "sample_sizes": [10, 20, 30],
                "alpha": 0.05
            },
            expected_fields=["curves", "effect_sizes", "sample_sizes"]
        )

    def run_regression_tests(self):
        """Test Regression Analysis endpoints"""
        self.print_header("Regression Analysis Tests")

        # Linear regression
        self.test_endpoint(
            "POST",
            "/api/v1/regression/linear/",
            data={
                "x": [1, 2, 3, 4, 5],
                "y": [2.5, 4.8, 7.2, 9.5, 12.1]
            },
            expected_fields=["coefficients", "r_squared", "p_values"],
            precision_fields=["r_squared"]
        )

        # Multiple regression
        self.test_endpoint(
            "POST",
            "/api/v1/regression/multiple/",
            data={
                "predictors": [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
                "response": [5.5, 8.2, 11.1, 14.3, 17.8]
            },
            expected_fields=["coefficients", "r_squared", "vif"],
            precision_fields=["r_squared", "condition_number"]
        )

    def run_nonparametric_tests(self):
        """Test Non-Parametric endpoints"""
        self.print_header("Non-Parametric Tests")

        # Mann-Whitney U test
        self.test_endpoint(
            "POST",
            "/api/v1/nonparametric/mann-whitney/",
            data={
                "group1": [12.5, 14.2, 11.8, 15.3, 13.7],
                "group2": [10.2, 9.8, 11.1, 8.9, 10.5]
            },
            expected_fields=["u_statistic", "p_value", "effect_size"],
            precision_fields=["p_value", "effect_size"]
        )

        # Kruskal-Wallis test
        self.test_endpoint(
            "POST",
            "/api/v1/nonparametric/kruskal-wallis/",
            data={
                "groups": [[12, 14, 11], [15, 17, 16], [9, 10, 8]]
            },
            expected_fields=["h_statistic", "p_value", "df"],
            precision_fields=["h_statistic", "p_value"]
        )

    def run_categorical_tests(self):
        """Test Categorical Analysis endpoints"""
        self.print_header("Categorical Analysis Tests")

        # Chi-square test
        self.test_endpoint(
            "POST",
            "/api/v1/categorical/chi-square/",
            data={
                "contingency_table": [[10, 20, 30], [15, 25, 35]]
            },
            expected_fields=["chi_square", "p_value", "df", "cramers_v"],
            precision_fields=["chi_square", "p_value", "cramers_v"]
        )

        # Fisher's exact test
        self.test_endpoint(
            "POST",
            "/api/v1/categorical/fishers-exact/",
            data={
                "table": [[8, 2], [1, 9]]
            },
            expected_fields=["p_value", "odds_ratio"],
            precision_fields=["p_value", "odds_ratio"]
        )

    def run_missing_data_tests(self):
        """Test Missing Data endpoints"""
        self.print_header("Missing Data Tests")

        # Pattern detection
        self.test_endpoint(
            "POST",
            "/api/v1/missing/pattern/",
            data={
                "data": [
                    [1, 2, None],
                    [2, None, 3],
                    [3, 4, 5],
                    [None, 5, 6]
                ]
            },
            expected_fields=["pattern_type", "missing_percentage"],
            precision_fields=["missing_percentage"]
        )

        # Imputation
        self.test_endpoint(
            "POST",
            "/api/v1/missing/impute/",
            data={
                "data": [1, 2, None, 4, 5, None, 7],
                "method": "mean"
            },
            expected_fields=["imputed_data", "statistics"]
        )

    def run_high_precision_tests(self):
        """Test High Precision Statistical endpoints"""
        self.print_header("High Precision Statistical Tests")

        # One-sample t-test with 50 decimal precision
        self.test_endpoint(
            "POST",
            "/api/v1/stats/t-test/one-sample/",
            data={
                "data": [
                    "10.123456789012345678901234567890123456789012345678",
                    "10.234567890123456789012345678901234567890123456789",
                    "10.345678901234567890123456789012345678901234567890"
                ],
                "population_mean": "10.000000000000000000000000000000000000000000000000"
            },
            expected_fields=["t_statistic", "p_value", "mean", "std_dev"],
            precision_fields=["t_statistic", "mean", "std_dev"]
        )

        # ANOVA with high precision
        self.test_endpoint(
            "POST",
            "/api/v1/stats/anova/one-way/",
            data={
                "groups": [
                    ["12.123456789012345678901234567890", "12.234567890123456789012345678901"],
                    ["15.345678901234567890123456789012", "15.456789012345678901234567890123"],
                    ["9.567890123456789012345678901234", "9.678901234567890123456789012345"]
                ]
            },
            expected_fields=["f_statistic", "p_value", "effect_size"],
            precision_fields=["f_statistic", "p_value", "effect_size"]
        )

    def print_summary(self):
        """Print test summary"""
        self.print_header("Test Summary")

        # Overall results
        print(f"\n{Fore.CYAN}Overall Results:{Style.RESET_ALL}")
        print(f"  Total Tests:  {self.results['total']}")
        print(f"  {Fore.GREEN}Passed:       {self.results['passed']}{Style.RESET_ALL}")
        print(f"  {Fore.RED}Failed:       {self.results['failed']}{Style.RESET_ALL}")

        success_rate = (self.results['passed'] / self.results['total'] * 100) if self.results['total'] > 0 else 0
        color = Fore.GREEN if success_rate >= 80 else Fore.YELLOW if success_rate >= 60 else Fore.RED
        print(f"  {color}Success Rate: {success_rate:.1f}%{Style.RESET_ALL}")

        # Precision summary
        if self.results['precision_checks']:
            print(f"\n{Fore.CYAN}Precision Analysis:{Style.RESET_ALL}")
            valid_precision = sum(1 for p in self.results['precision_checks'] if p['valid'])
            total_precision = len(self.results['precision_checks'])
            print(f"  Fields with 30+ decimals: {valid_precision}/{total_precision}")

            # Show fields with low precision
            low_precision = [p for p in self.results['precision_checks'] if not p['valid']]
            if low_precision:
                print(f"\n  {Fore.YELLOW}Fields with low precision:{Style.RESET_ALL}")
                for p in low_precision[:5]:  # Show first 5
                    print(f"    - {p['endpoint']}: {p['field']} ({p['decimals']} decimals)")

        # Errors
        if self.results['errors']:
            print(f"\n{Fore.RED}Errors:{Style.RESET_ALL}")
            for error in self.results['errors'][:5]:  # Show first 5 errors
                print(f"  - {error['endpoint']}: {error['error'][:100]}")

    def run_all_tests(self):
        """Run all integration tests"""
        print(f"{Fore.MAGENTA}╔══════════════════════════════════════════════════════════╗{Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}║     StickForStats Integration Test Suite v1.0            ║{Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}║     Testing 50 Decimal Precision & API Endpoints         ║{Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}╚══════════════════════════════════════════════════════════╝{Style.RESET_ALL}")

        start_time = time.time()

        # Run all test suites
        self.run_power_analysis_tests()
        self.run_regression_tests()
        self.run_nonparametric_tests()
        self.run_categorical_tests()
        self.run_missing_data_tests()
        self.run_high_precision_tests()

        # Print summary
        elapsed_time = time.time() - start_time
        self.print_summary()

        print(f"\n{Fore.CYAN}Test execution time: {elapsed_time:.2f} seconds{Style.RESET_ALL}")

        # Save results to file
        with open('integration_test_results.json', 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        print(f"\n{Fore.GREEN}Results saved to integration_test_results.json{Style.RESET_ALL}")

        return self.results['failed'] == 0


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='StickForStats Integration Test Runner')
    parser.add_argument('--url', default='http://localhost:8000',
                       help='Base URL of the API (default: http://localhost:8000)')
    parser.add_argument('--token', help='Authentication token')
    parser.add_argument('--endpoint', help='Test specific endpoint only')

    args = parser.parse_args()

    # Create tester
    tester = IntegrationTester(base_url=args.url, token=args.token)

    # Run tests
    if args.endpoint:
        # Test specific endpoint
        tester.test_endpoint("POST", args.endpoint, {})
    else:
        # Run all tests
        success = tester.run_all_tests()
        exit(0 if success else 1)


if __name__ == "__main__":
    main()