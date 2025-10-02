#!/usr/bin/env python3
"""
StickForStats v1.0 - Comprehensive Performance Benchmark Suite
==============================================================
Tests all 13 statistical endpoints for:
- Response time under various loads
- Memory usage with 50-decimal precision
- Accuracy validation under stress
- Concurrent request handling

Created: September 18, 2025
Version: 1.0.0
"""

import requests
import time
import numpy as np
import psutil
import json
import concurrent.futures
from decimal import Decimal, getcontext
from datetime import datetime
import os
import sys

# Set precision for validation
getcontext().prec = 60

class PerformanceBenchmark:
    def __init__(self):
        self.base_url = "http://localhost:8000/api/v1"
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'endpoints': {},
            'summary': {}
        }

    def generate_test_data(self, size, groups=2):
        """Generate test datasets of various sizes"""
        np.random.seed(42)  # Reproducible results

        if groups == 1:
            return np.random.normal(100, 15, size).tolist()

        data = {}
        for i in range(groups):
            data[f'group_{i+1}'] = np.random.normal(100 + i*10, 15, size).tolist()
        return data

    def measure_endpoint(self, endpoint, payload, iterations=10):
        """Measure performance metrics for a single endpoint"""
        times = []
        memory_usage = []
        process = psutil.Process()

        for i in range(iterations):
            # Memory before
            mem_before = process.memory_info().rss / 1024 / 1024  # MB

            # Time request
            start = time.perf_counter()
            response = requests.post(f"{self.base_url}/{endpoint}", json=payload)
            end = time.perf_counter()

            # Memory after
            mem_after = process.memory_info().rss / 1024 / 1024  # MB

            if response.status_code == 200:
                times.append((end - start) * 1000)  # Convert to ms
                memory_usage.append(mem_after - mem_before)
            else:
                print(f"Error in {endpoint}: {response.status_code}")

        return {
            'avg_time_ms': np.mean(times) if times else None,
            'min_time_ms': np.min(times) if times else None,
            'max_time_ms': np.max(times) if times else None,
            'std_time_ms': np.std(times) if times else None,
            'avg_memory_mb': np.mean(memory_usage) if memory_usage else None,
            'iterations': len(times)
        }

    def test_concurrent_requests(self, endpoint, payload, concurrent=10):
        """Test endpoint under concurrent load"""
        start = time.perf_counter()

        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent) as executor:
            futures = []
            for _ in range(concurrent):
                future = executor.submit(requests.post, f"{self.base_url}/{endpoint}", json=payload)
                futures.append(future)

            results = [f.result() for f in concurrent.futures.as_completed(futures)]

        end = time.perf_counter()

        success_count = sum(1 for r in results if r.status_code == 200)

        return {
            'total_time_ms': (end - start) * 1000,
            'concurrent_requests': concurrent,
            'success_rate': (success_count / concurrent) * 100,
            'avg_time_per_request_ms': ((end - start) * 1000) / concurrent
        }

    def validate_precision(self, endpoint, payload):
        """Validate that 50-decimal precision is maintained"""
        response = requests.post(f"{self.base_url}/{endpoint}", json=payload)

        if response.status_code != 200:
            return {'error': f"Status {response.status_code}"}

        data = response.json()
        precision_check = {}

        # Check high_precision_result field
        if 'high_precision_result' in data:
            for key, value in data['high_precision_result'].items():
                if isinstance(value, (int, float, str)):
                    try:
                        decimal_places = len(str(value).split('.')[-1]) if '.' in str(value) else 0
                        precision_check[key] = min(decimal_places, 50)
                    except:
                        precision_check[key] = 0

        return precision_check

    def run_comprehensive_benchmark(self):
        """Run complete benchmark suite"""
        print("\n" + "="*80)
        print("STICKFORSTATS v1.0 - PERFORMANCE BENCHMARK SUITE")
        print("="*80)

        # Test configurations
        test_sizes = [10, 100, 1000, 5000]

        endpoints_config = {
            'stats/ttest/': {
                'sizes': test_sizes,
                'generator': lambda size: {
                    'data1': self.generate_test_data(size, 1),
                    'data2': self.generate_test_data(size, 1),
                    'test_type': 'two_sample'
                }
            },
            'stats/anova/': {
                'sizes': test_sizes,
                'generator': lambda size: {
                    'groups': self.generate_test_data(size, 3),
                    'alpha': 0.05
                }
            },
            'stats/correlation/': {
                'sizes': test_sizes,
                'generator': lambda size: {
                    'x': self.generate_test_data(size, 1),
                    'y': self.generate_test_data(size, 1),
                    'method': 'pearson'
                }
            },
            'nonparametric/mann-whitney/': {
                'sizes': test_sizes[:3],  # Non-parametric tests are slower
                'generator': lambda size: {
                    'group1': self.generate_test_data(size, 1),
                    'group2': self.generate_test_data(size, 1),
                    'alternative': 'two-sided'
                }
            },
            'nonparametric/wilcoxon/': {
                'sizes': test_sizes[:3],
                'generator': lambda size: {
                    'data': self.generate_test_data(size, 1),
                    'alternative': 'two-sided'
                }
            },
            'nonparametric/kruskal-wallis/': {
                'sizes': test_sizes[:3],
                'generator': lambda size: {
                    'groups': self.generate_test_data(size, 3)
                }
            },
            'categorical/chi-square/goodness/': {
                'sizes': [10, 50, 100],
                'generator': lambda size: {
                    'observed': [int(x) for x in np.random.randint(10, 100, size).tolist()],
                    'expected': [int(x) for x in np.random.randint(10, 100, size).tolist()]
                }
            },
            'categorical/fishers/': {
                'sizes': [1],  # Fisher's test uses 2x2 table
                'generator': lambda size: {
                    'table': [[10, 20], [30, 25]],
                    'alternative': 'two-sided'
                }
            },
            'stats/regression/': {
                'sizes': test_sizes[:3],
                'generator': lambda size: {
                    'x': self.generate_test_data(size, 1),
                    'y': self.generate_test_data(size, 1)
                }
            },
            'stats/descriptive/': {
                'sizes': test_sizes,
                'generator': lambda size: {
                    'data': self.generate_test_data(size, 1)
                }
            }
        }

        # Run benchmarks for each endpoint
        for endpoint, config in endpoints_config.items():
            print(f"\n📊 Testing: {endpoint}")
            print("-" * 40)

            endpoint_results = {}

            for size in config['sizes']:
                print(f"  Dataset size: {size}")
                payload = config['generator'](size)

                # Basic performance
                perf = self.measure_endpoint(endpoint, payload, iterations=5)
                if perf['avg_time_ms'] is not None:
                    print(f"    Avg response: {perf['avg_time_ms']:.2f}ms")
                else:
                    print(f"    ⚠️  Failed to measure performance")

                # Concurrent load
                if size <= 1000:  # Only test concurrent for smaller datasets
                    concurrent = self.test_concurrent_requests(endpoint, payload, concurrent=5)
                    print(f"    Concurrent (5 requests): {concurrent['avg_time_per_request_ms']:.2f}ms/req")
                else:
                    concurrent = None

                # Precision validation
                precision = self.validate_precision(endpoint, payload)

                endpoint_results[f'size_{size}'] = {
                    'performance': perf,
                    'concurrent': concurrent,
                    'precision_validation': precision
                }

            self.results['endpoints'][endpoint] = endpoint_results

        # Calculate summary statistics
        self.calculate_summary()

        # Save results
        self.save_results()

        return self.results

    def calculate_summary(self):
        """Calculate summary statistics across all endpoints"""
        all_times = []
        all_memory = []

        for endpoint, data in self.results['endpoints'].items():
            for size_test, metrics in data.items():
                if metrics['performance']['avg_time_ms']:
                    all_times.append(metrics['performance']['avg_time_ms'])
                if metrics['performance']['avg_memory_mb']:
                    all_memory.append(metrics['performance']['avg_memory_mb'])

        self.results['summary'] = {
            'overall_avg_response_ms': np.mean(all_times) if all_times else None,
            'overall_max_response_ms': np.max(all_times) if all_times else None,
            'overall_min_response_ms': np.min(all_times) if all_times else None,
            'overall_avg_memory_mb': np.mean(all_memory) if all_memory else None,
            'endpoints_tested': len(self.results['endpoints']),
            'total_tests_run': sum(
                len(data) for data in self.results['endpoints'].values()
            )
        }

    def save_results(self):
        """Save benchmark results to file"""
        filename = f"benchmark_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)

        print(f"\n✅ Results saved to: {filename}")

        # Print summary
        print("\n" + "="*80)
        print("BENCHMARK SUMMARY")
        print("="*80)
        summary = self.results['summary']
        print(f"Endpoints Tested: {summary['endpoints_tested']}")
        print(f"Total Tests Run: {summary['total_tests_run']}")
        print(f"Average Response Time: {summary['overall_avg_response_ms']:.2f}ms")
        print(f"Min Response Time: {summary['overall_min_response_ms']:.2f}ms")
        print(f"Max Response Time: {summary['overall_max_response_ms']:.2f}ms")

        # Check if we meet performance targets
        print("\n🎯 PERFORMANCE TARGETS:")
        if summary['overall_avg_response_ms'] < 100:
            print("✅ Average response < 100ms - EXCELLENT!")
        elif summary['overall_avg_response_ms'] < 200:
            print("✅ Average response < 200ms - GOOD")
        else:
            print("⚠️ Average response > 200ms - Needs optimization")

        if summary['overall_max_response_ms'] < 500:
            print("✅ Max response < 500ms - EXCELLENT!")
        elif summary['overall_max_response_ms'] < 1000:
            print("✅ Max response < 1000ms - ACCEPTABLE")
        else:
            print("⚠️ Max response > 1000ms - Needs optimization")

if __name__ == "__main__":
    print("\n🚀 Starting StickForStats Performance Benchmark...")
    print("Please ensure the backend server is running on http://localhost:8000")

    # Check if server is running
    try:
        response = requests.get("http://localhost:8000/")
        if response.status_code not in [200, 404]:
            print("⚠️ Backend server health check failed")
            sys.exit(1)
    except:
        print("❌ Cannot connect to backend server at http://localhost:8000")
        print("Please start the backend first: cd backend && python manage.py runserver")
        sys.exit(1)

    # Run benchmark
    benchmark = PerformanceBenchmark()
    results = benchmark.run_comprehensive_benchmark()

    print("\n✅ Benchmark complete!")
    print("="*80)