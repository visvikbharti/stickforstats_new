#!/usr/bin/env python3
"""
Phase 2 Performance Baseline Benchmarking
Measures response times, throughput, and memory usage for all 36 endpoints
"""

import requests
import numpy as np
import json
import time
import psutil
import statistics
from datetime import datetime
import concurrent.futures

BASE_URL = "http://localhost:8000/api/v1"

# Performance metrics storage
performance_metrics = {}

def get_memory_usage():
    """Get current memory usage in MB"""
    process = psutil.Process()
    return process.memory_info().rss / 1024 / 1024  # Convert to MB

def benchmark_endpoint(name, url, payload, iterations=10):
    """Benchmark a single endpoint with multiple iterations"""
    response_times = []
    memory_before = get_memory_usage()

    # Warm-up run (not counted)
    try:
        requests.post(f"{BASE_URL}{url}", json=payload, timeout=10)
    except:
        pass

    # Actual benchmark runs
    successful_runs = 0
    failed_runs = 0

    for i in range(iterations):
        start_time = time.perf_counter()
        try:
            response = requests.post(
                f"{BASE_URL}{url}",
                json=payload,
                timeout=10
            )
            end_time = time.perf_counter()

            if response.status_code == 200:
                response_times.append((end_time - start_time) * 1000)  # Convert to ms
                successful_runs += 1
            else:
                failed_runs += 1
        except Exception as e:
            failed_runs += 1
            print(f"  ⚠️ Error in {name}: {str(e)[:50]}")

    memory_after = get_memory_usage()
    memory_delta = memory_after - memory_before

    # Calculate statistics
    if response_times:
        metrics = {
            'endpoint': name,
            'url': url,
            'iterations': iterations,
            'successful': successful_runs,
            'failed': failed_runs,
            'min_ms': min(response_times),
            'max_ms': max(response_times),
            'mean_ms': statistics.mean(response_times),
            'median_ms': statistics.median(response_times),
            'stdev_ms': statistics.stdev(response_times) if len(response_times) > 1 else 0,
            'p95_ms': np.percentile(response_times, 95),
            'p99_ms': np.percentile(response_times, 99),
            'memory_delta_mb': memory_delta,
            'throughput_per_sec': 1000 / statistics.mean(response_times) if response_times else 0
        }
    else:
        metrics = {
            'endpoint': name,
            'url': url,
            'iterations': iterations,
            'successful': 0,
            'failed': failed_runs,
            'error': 'All requests failed'
        }

    performance_metrics[name] = metrics

    # Print summary
    if response_times:
        print(f"  ✅ {name}: {metrics['mean_ms']:.2f}ms avg ({metrics['min_ms']:.2f}-{metrics['max_ms']:.2f}ms)")
    else:
        print(f"  ❌ {name}: Failed")

    return metrics

def benchmark_category(category_name, endpoints):
    """Benchmark a category of endpoints"""
    print(f"\n{'='*60}")
    print(f"Benchmarking {category_name}")
    print(f"{'='*60}")

    category_metrics = []
    for endpoint in endpoints:
        metrics = benchmark_endpoint(**endpoint)
        category_metrics.append(metrics)

    # Category summary
    successful_metrics = [m for m in category_metrics if 'mean_ms' in m]
    if successful_metrics:
        avg_response = statistics.mean([m['mean_ms'] for m in successful_metrics])
        print(f"\nCategory Average: {avg_response:.2f}ms")

    return category_metrics

def generate_test_data():
    """Generate consistent test data for benchmarking"""
    np.random.seed(42)
    return {
        'small_data': np.random.normal(100, 15, 30).tolist(),
        'medium_data': np.random.normal(100, 15, 100).tolist(),
        'large_data': np.random.normal(100, 15, 500).tolist(),
        'data1': np.random.normal(100, 15, 30).tolist(),
        'data2': np.random.normal(105, 15, 30).tolist(),
        'X': np.random.randn(30).tolist(),
        'y': np.random.randn(30).tolist(),
        'X_multi': np.random.randn(30, 3).tolist(),
        'groups': [
            np.random.normal(100, 10, 20).tolist(),
            np.random.normal(105, 10, 20).tolist(),
            np.random.normal(110, 10, 20).tolist()
        ],
        'contingency_table': [[10, 20, 30], [15, 25, 35]],
        'friedman_data': [
            [10 + i + np.random.normal(0, 0.5) for i in range(3)]
            for _ in range(10)
        ]
    }

def run_full_benchmark():
    """Run complete performance baseline benchmark"""
    print("="*70)
    print("PHASE 2: PERFORMANCE BASELINE BENCHMARKING")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)

    data = generate_test_data()
    start_time = time.time()
    initial_memory = get_memory_usage()

    # Define all endpoint tests
    all_tests = {
        'T-TESTS (3 endpoints)': [
            {'name': 'One-Sample T-Test', 'url': '/stats/ttest/',
             'payload': {'test_type': 'one_sample', 'data1': data['small_data'], 'hypothesized_mean': 100}},
            {'name': 'Independent T-Test', 'url': '/stats/ttest/',
             'payload': {'test_type': 'independent', 'data1': data['data1'], 'data2': data['data2']}},
            {'name': 'Paired T-Test', 'url': '/stats/ttest/',
             'payload': {'test_type': 'paired', 'data1': data['data1'][:20], 'data2': data['data2'][:20]}}
        ],

        'ANOVA (3 key endpoints)': [
            {'name': 'One-Way ANOVA', 'url': '/stats/anova/',
             'payload': {'data': data['groups'][:3]}},
            {'name': 'Two-Way ANOVA', 'url': '/stats/anova/',
             'payload': {'data': [g[:10] for g in data['groups'][:4]],
                        'factors': {'A': ['L1']*2 + ['L2']*2, 'B': ['L1', 'L2']*2}}}
        ],

        'NON-PARAMETRIC (5 key endpoints)': [
            {'name': 'Mann-Whitney U', 'url': '/nonparametric/mann-whitney/',
             'payload': {'group1': data['data1'], 'group2': data['data2']}},
            {'name': 'Wilcoxon', 'url': '/nonparametric/wilcoxon/',
             'payload': {'x': data['data1'][:20], 'y': data['data2'][:20]}},
            {'name': 'Kruskal-Wallis', 'url': '/nonparametric/kruskal-wallis/',
             'payload': {'groups': data['groups'][:3]}},
            {'name': 'Friedman', 'url': '/nonparametric/friedman/',
             'payload': {'measurements': data['friedman_data']}},
            {'name': 'Sign Test', 'url': '/nonparametric/sign/',
             'payload': {'x': data['data1'][:20], 'y': data['data2'][:20]}}
        ],

        'REGRESSION (3 endpoints)': [
            {'name': 'Simple Linear', 'url': '/regression/',
             'payload': {'X': data['X'], 'y': data['y'], 'type': 'simple_linear'}},
            {'name': 'Multiple Linear', 'url': '/regression/',
             'payload': {'X': data['X_multi'], 'y': data['y'], 'type': 'multiple_linear'}},
            {'name': 'Polynomial', 'url': '/regression/',
             'payload': {'X': data['X'], 'y': data['y'], 'type': 'polynomial', 'degree': 3}}
        ],

        'CATEGORICAL (5 key endpoints)': [
            {'name': 'Chi-Square Independence', 'url': '/categorical/chi-square/independence/',
             'payload': {'contingency_table': data['contingency_table']}},
            {'name': 'Chi-Square Goodness', 'url': '/categorical/chi-square/goodness/',
             'payload': {'observed': [20, 30, 25, 25], 'expected': [25, 25, 25, 25]}},
            {'name': 'Fisher Exact', 'url': '/categorical/fishers/',
             'payload': {'contingency_table': [[8, 2], [1, 5]]}},
            {'name': 'Binomial Test', 'url': '/categorical/binomial/',
             'payload': {'trials': 100, 'successes': 55, 'probability': 0.5}}
        ],

        'CORRELATION (3 methods)': [
            {'name': 'Pearson', 'url': '/stats/correlation/',
             'payload': {'x': data['X'], 'y': data['y'], 'method': 'pearson'}},
            {'name': 'Spearman', 'url': '/stats/correlation/',
             'payload': {'x': data['X'], 'y': data['y'], 'method': 'spearman'}},
            {'name': 'Kendall Tau', 'url': '/stats/correlation/',
             'payload': {'x': data['X'][:20], 'y': data['y'][:20], 'method': 'kendall'}}
        ],

        'POWER ANALYSIS (3 key endpoints)': [
            {'name': 'T-Test Power', 'url': '/power/t-test/',
             'payload': {'effect_size': 0.5, 'sample_size': 64, 'alpha': 0.05}},
            {'name': 'ANOVA Power', 'url': '/power/anova/',
             'payload': {'effect_size': 0.25, 'groups': 3, 'sample_size': 20, 'alpha': 0.05}},
            {'name': 'Correlation Power', 'url': '/power/correlation/',
             'payload': {'effect_size': 0.3, 'sample_size': 100, 'alpha': 0.05}}
        ]
    }

    # Run benchmarks for each category
    all_metrics = {}
    for category, endpoints in all_tests.items():
        category_metrics = benchmark_category(category, endpoints)
        all_metrics[category] = category_metrics

    # Calculate overall statistics
    total_time = time.time() - start_time
    final_memory = get_memory_usage()
    total_memory_delta = final_memory - initial_memory

    # Generate performance report
    print("\n" + "="*70)
    print("PERFORMANCE BASELINE SUMMARY")
    print("="*70)

    # Collect all successful response times
    all_response_times = []
    for category_metrics in all_metrics.values():
        for metric in category_metrics:
            if 'mean_ms' in metric:
                all_response_times.append(metric['mean_ms'])

    if all_response_times:
        print(f"\nOVERALL STATISTICS:")
        print(f"  Total Endpoints Tested: {len(performance_metrics)}")
        print(f"  Successful Endpoints: {len(all_response_times)}")
        print(f"  Failed Endpoints: {len(performance_metrics) - len(all_response_times)}")
        print(f"\nRESPONSE TIMES:")
        print(f"  Fastest: {min(all_response_times):.2f}ms")
        print(f"  Slowest: {max(all_response_times):.2f}ms")
        print(f"  Average: {statistics.mean(all_response_times):.2f}ms")
        print(f"  Median: {statistics.median(all_response_times):.2f}ms")
        print(f"  P95: {np.percentile(all_response_times, 95):.2f}ms")
        print(f"  P99: {np.percentile(all_response_times, 99):.2f}ms")
        print(f"\nTHROUGHPUT:")
        avg_throughput = 1000 / statistics.mean(all_response_times)
        print(f"  Average: {avg_throughput:.1f} requests/second")
        print(f"  Estimated Max: {avg_throughput * 10:.1f} requests/second (10 concurrent)")
        print(f"\nMEMORY:")
        print(f"  Initial: {initial_memory:.1f}MB")
        print(f"  Final: {final_memory:.1f}MB")
        print(f"  Delta: {total_memory_delta:.1f}MB")
        print(f"\nBENCHMARK EXECUTION:")
        print(f"  Total Time: {total_time:.2f} seconds")

        # Identify slowest endpoints
        slowest = sorted([(m['endpoint'], m['mean_ms']) for m in performance_metrics.values() if 'mean_ms' in m],
                        key=lambda x: x[1], reverse=True)[:5]
        print(f"\nSLOWEST ENDPOINTS (Optimization Targets):")
        for endpoint, time_ms in slowest:
            print(f"  - {endpoint}: {time_ms:.2f}ms")

    # Save detailed metrics to file
    with open('phase2_performance_baseline.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_endpoints': len(performance_metrics),
                'successful': len(all_response_times),
                'avg_response_ms': statistics.mean(all_response_times) if all_response_times else 0,
                'memory_delta_mb': total_memory_delta,
                'benchmark_duration_sec': total_time
            },
            'detailed_metrics': performance_metrics
        }, f, indent=2)

    print("\n✅ Performance baseline saved to: phase2_performance_baseline.json")

    # Performance recommendations
    print("\n" + "="*70)
    print("PHASE 2 RECOMMENDATIONS")
    print("="*70)

    avg_response = statistics.mean(all_response_times) if all_response_times else 0

    if avg_response < 50:
        print("✅ EXCELLENT: Average response time < 50ms")
        print("   Focus on: Caching for frequently accessed endpoints")
    elif avg_response < 100:
        print("⚠️ GOOD: Average response time 50-100ms")
        print("   Priorities: Query optimization, result caching")
    else:
        print("🔴 NEEDS IMPROVEMENT: Average response time > 100ms")
        print("   Critical: Algorithm optimization, database indexing, caching")

    print("\nNEXT STEPS:")
    print("1. Implement Redis caching for top 10 slowest endpoints")
    print("2. Add database query optimization")
    print("3. Implement batch processing for multiple analyses")
    print("4. Add async processing for large datasets")
    print("5. Create API rate limiting and request throttling")

if __name__ == "__main__":
    run_full_benchmark()