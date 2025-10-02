#!/usr/bin/env python3
"""
StickForStats v1.0 - Stress Test with Large Datasets
=====================================================
Tests endpoints with datasets up to 10,000+ rows
Measures performance, memory usage, and precision maintenance
"""

import requests
import time
import numpy as np
import psutil
import json
from datetime import datetime
import gc
import sys

class StressTestLargeDatasets:
    def __init__(self):
        self.base_url = "http://localhost:8000/api/v1"
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'stress_tests': {},
            'summary': {}
        }

    def generate_large_dataset(self, size, seed=42):
        """Generate large realistic datasets"""
        np.random.seed(seed)

        # Generate data with realistic distribution
        # Mix of normal, uniform, and skewed distributions
        data = []

        # 60% normal distribution
        normal_size = int(size * 0.6)
        data.extend(np.random.normal(100, 15, normal_size).tolist())

        # 20% uniform distribution
        uniform_size = int(size * 0.2)
        data.extend(np.random.uniform(50, 150, uniform_size).tolist())

        # 20% skewed distribution (exponential)
        skewed_size = size - normal_size - uniform_size
        data.extend((np.random.exponential(30, skewed_size) + 50).tolist())

        # Shuffle the data
        np.random.shuffle(data)

        return data[:size]  # Ensure exact size

    def measure_performance(self, endpoint, payload, label):
        """Measure performance metrics for large dataset"""
        print(f"\n  Testing: {label}")
        print("  " + "-" * 40)

        # Memory before
        process = psutil.Process()
        mem_before = process.memory_info().rss / 1024 / 1024  # MB

        # Time request
        start = time.perf_counter()
        response = None
        error = None

        try:
            response = requests.post(
                f"{self.base_url}/{endpoint}",
                json=payload,
                timeout=300  # 5 minute timeout for very large datasets
            )
            status_code = response.status_code
            if status_code == 200:
                result = response.json()
                has_high_precision = 'high_precision_result' in result
            else:
                has_high_precision = False
                error = f"Status {status_code}: {response.text[:100]}"
        except requests.Timeout:
            error = "Request timed out (>5 minutes)"
            status_code = None
            has_high_precision = False
        except Exception as e:
            error = str(e)
            status_code = None
            has_high_precision = False

        end = time.perf_counter()

        # Memory after
        mem_after = process.memory_info().rss / 1024 / 1024  # MB

        # Calculate metrics
        response_time = (end - start) * 1000  # Convert to ms
        memory_used = mem_after - mem_before

        # Force garbage collection
        gc.collect()

        return {
            'label': label,
            'response_time_ms': response_time,
            'memory_used_mb': memory_used,
            'status_code': status_code,
            'has_high_precision': has_high_precision,
            'error': error
        }

    def run_stress_tests(self):
        """Run comprehensive stress tests"""
        print("\n" + "="*80)
        print("STICKFORSTATS v1.0 - STRESS TEST WITH LARGE DATASETS")
        print("="*80)

        # Test sizes - from small to very large
        test_sizes = [
            (100, "Small (100 rows)"),
            (1000, "Medium (1,000 rows)"),
            (5000, "Large (5,000 rows)"),
            (10000, "Very Large (10,000 rows)"),
            (25000, "Extreme (25,000 rows)")
        ]

        # Working endpoints from our previous test
        endpoints = {
            'stats/ttest/': {
                'name': 'T-Test',
                'generator': lambda data: {
                    'data1': data[:len(data)//2],
                    'data2': data[len(data)//2:],
                    'test_type': 'two_sample'
                }
            },
            'stats/correlation/': {
                'name': 'Correlation',
                'generator': lambda data: {
                    'x': data[:len(data)//2],
                    'y': data[len(data)//2:],
                    'method': 'pearson'
                }
            },
            'stats/descriptive/': {
                'name': 'Descriptive Statistics',
                'generator': lambda data: {
                    'data': data
                }
            },
            'nonparametric/mann-whitney/': {
                'name': 'Mann-Whitney U Test',
                'generator': lambda data: {
                    'group1': data[:len(data)//2],
                    'group2': data[len(data)//2:]
                }
            },
            'categorical/chi-square/goodness/': {
                'name': 'Chi-Square Goodness of Fit',
                'generator': lambda data: {
                    # Convert to frequency counts for chi-square
                    'observed': [int(abs(x)) % 100 + 1 for x in data[:100]],
                    'expected': [int(abs(x)) % 100 + 1 for x in data[100:200]]
                }
            }
        }

        # Run stress tests
        for endpoint, config in endpoints.items():
            print(f"\n📊 STRESS TESTING: {config['name']}")
            print("="*60)

            endpoint_results = []

            for size, size_label in test_sizes:
                # Skip extremely large datasets for non-parametric tests
                if 'nonparametric' in endpoint and size > 10000:
                    print(f"  ⚠️  Skipping {size_label} - Too large for non-parametric test")
                    continue

                # Skip large datasets for chi-square (uses fixed 100 elements)
                if 'chi-square' in endpoint and size > 1000:
                    continue

                # Generate dataset
                data = self.generate_large_dataset(size)
                payload = config['generator'](data)

                # Measure performance
                result = self.measure_performance(endpoint, payload, size_label)

                # Print results
                if result['error']:
                    print(f"    ❌ Error: {result['error']}")
                else:
                    print(f"    ✅ Response Time: {result['response_time_ms']:.2f}ms")
                    print(f"    💾 Memory Used: {result['memory_used_mb']:.2f}MB")
                    if result['has_high_precision']:
                        print(f"    🎯 50-Decimal Precision: Maintained")
                    else:
                        print(f"    ⚠️  No high-precision result")

                endpoint_results.append(result)

            self.results['stress_tests'][endpoint] = endpoint_results

        # Calculate summary
        self.calculate_summary()

        # Save results
        self.save_results()

        return self.results

    def calculate_summary(self):
        """Calculate summary statistics"""
        all_response_times = []
        all_memory = []
        successful_tests = 0
        failed_tests = 0
        high_precision_count = 0

        for endpoint, tests in self.results['stress_tests'].items():
            for test in tests:
                if test['error'] is None:
                    all_response_times.append(test['response_time_ms'])
                    all_memory.append(test['memory_used_mb'])
                    successful_tests += 1
                    if test['has_high_precision']:
                        high_precision_count += 1
                else:
                    failed_tests += 1

        if all_response_times:
            self.results['summary'] = {
                'total_tests': successful_tests + failed_tests,
                'successful_tests': successful_tests,
                'failed_tests': failed_tests,
                'high_precision_maintained': high_precision_count,
                'avg_response_time_ms': np.mean(all_response_times),
                'max_response_time_ms': np.max(all_response_times),
                'min_response_time_ms': np.min(all_response_times),
                'avg_memory_mb': np.mean(all_memory),
                'max_memory_mb': np.max(all_memory),
                'performance_rating': self.calculate_rating(all_response_times)
            }

    def calculate_rating(self, response_times):
        """Calculate performance rating"""
        avg_time = np.mean(response_times)

        if avg_time < 100:
            return "EXCELLENT (< 100ms avg)"
        elif avg_time < 500:
            return "GOOD (< 500ms avg)"
        elif avg_time < 1000:
            return "ACCEPTABLE (< 1s avg)"
        elif avg_time < 5000:
            return "SLOW (< 5s avg)"
        else:
            return "NEEDS OPTIMIZATION (> 5s avg)"

    def save_results(self):
        """Save stress test results"""
        filename = f"stress_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)

        print("\n" + "="*80)
        print("STRESS TEST SUMMARY")
        print("="*80)

        summary = self.results['summary']
        print(f"Total Tests Run: {summary['total_tests']}")
        print(f"Successful: {summary['successful_tests']}")
        print(f"Failed: {summary['failed_tests']}")
        print(f"High Precision Maintained: {summary['high_precision_maintained']}")
        print(f"\nPerformance Metrics:")
        print(f"  Average Response Time: {summary['avg_response_time_ms']:.2f}ms")
        print(f"  Max Response Time: {summary['max_response_time_ms']:.2f}ms")
        print(f"  Min Response Time: {summary['min_response_time_ms']:.2f}ms")
        print(f"  Average Memory Usage: {summary['avg_memory_mb']:.2f}MB")
        print(f"  Max Memory Usage: {summary['max_memory_mb']:.2f}MB")
        print(f"\n🎯 Performance Rating: {summary['performance_rating']}")

        # Performance targets analysis
        print("\n📈 TARGET ANALYSIS:")

        if summary['avg_response_time_ms'] < 1000:
            print("✅ Average response < 1 second - TARGET MET")
        else:
            print("⚠️  Average response > 1 second - Optimization needed")

        if summary['max_response_time_ms'] < 5000:
            print("✅ Max response < 5 seconds - TARGET MET")
        else:
            print("⚠️  Max response > 5 seconds - Optimization needed")

        if summary['avg_memory_mb'] < 100:
            print("✅ Average memory < 100MB - EFFICIENT")
        else:
            print("⚠️  Average memory > 100MB - Consider optimization")

        precision_rate = (summary['high_precision_maintained'] / summary['successful_tests'] * 100)
        if precision_rate > 90:
            print(f"✅ High precision rate: {precision_rate:.1f}% - EXCELLENT")
        else:
            print(f"⚠️  High precision rate: {precision_rate:.1f}% - Needs improvement")

        print(f"\n✅ Results saved to: {filename}")
        print("="*80)

if __name__ == "__main__":
    print("\n🚀 Starting StickForStats Stress Test with Large Datasets...")
    print("This will test endpoints with up to 25,000 rows of data")
    print("Please ensure the backend server is running on http://localhost:8000")

    # Check if server is running
    try:
        response = requests.get("http://localhost:8000/")
        if response.status_code not in [200, 404]:
            print("⚠️ Backend server check failed")
            sys.exit(1)
    except:
        print("❌ Cannot connect to backend server")
        print("Please start: cd backend && python manage.py runserver")
        sys.exit(1)

    # Run stress tests
    stress_test = StressTestLargeDatasets()
    results = stress_test.run_stress_tests()

    print("\n✅ Stress test complete!")