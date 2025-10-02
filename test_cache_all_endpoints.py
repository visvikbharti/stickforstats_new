#!/usr/bin/env python3
"""
Cache Performance Test for All Optimized Endpoints
Tests T-Test, Regression, ANOVA, and Polynomial Regression
"""

import requests
import numpy as np
import time
import statistics

BASE_URL = "http://localhost:8000/api/v1"

def test_endpoint_cache(name, url, payload, iterations=3):
    """Test cache performance for a single endpoint"""

    print(f"\n{name}:")

    # First request (cache miss)
    start = time.perf_counter()
    response = requests.post(f"{BASE_URL}{url}", json=payload, timeout=10)
    first_time = (time.perf_counter() - start) * 1000
    first_status = response.status_code
    first_cache = response.json().get('_cache_hit', False) if response.status_code == 200 else None

    # Subsequent requests (cache hits expected)
    cached_times = []
    for _ in range(iterations):
        start = time.perf_counter()
        response = requests.post(f"{BASE_URL}{url}", json=payload, timeout=10)
        cached_times.append((time.perf_counter() - start) * 1000)

    avg_cached = statistics.mean(cached_times) if cached_times else 0
    cache_hit = response.json().get('_cache_hit', False) if response.status_code == 200 else None

    # Calculate improvement
    improvement = ((first_time - avg_cached) / first_time * 100) if first_time > 0 else 0
    speedup = first_time / avg_cached if avg_cached > 0 else 0

    print(f"  First call:  {first_time:.2f}ms (cache={first_cache})")
    print(f"  Cached avg:  {avg_cached:.2f}ms (cache={cache_hit})")
    print(f"  Improvement: {improvement:.1f}%")
    print(f"  Speedup:     {speedup:.1f}x")

    return {
        'name': name,
        'first_time': first_time,
        'cached_avg': avg_cached,
        'improvement': improvement,
        'speedup': speedup,
        'status': first_status
    }

def main():
    print("="*60)
    print("COMPREHENSIVE CACHE PERFORMANCE TEST")
    print("Testing All Optimized Endpoints")
    print("="*60)

    # Generate test data
    np.random.seed(42)

    test_cases = [
        {
            'name': 'T-Test (One-Sample)',
            'url': '/stats/ttest/',
            'payload': {
                'test_type': 'one_sample',
                'data1': np.random.normal(100, 15, 30).tolist(),
                'hypothesized_mean': 100
            }
        },
        {
            'name': 'T-Test (Independent)',
            'url': '/stats/ttest/',
            'payload': {
                'test_type': 'independent',
                'data1': np.random.normal(100, 15, 30).tolist(),
                'data2': np.random.normal(105, 15, 30).tolist()
            }
        },
        {
            'name': 'Simple Linear Regression',
            'url': '/regression/',
            'payload': {
                'X': np.random.randn(30).tolist(),
                'y': np.random.randn(30).tolist(),
                'type': 'simple_linear'
            }
        },
        {
            'name': 'Multiple Linear Regression',
            'url': '/regression/',
            'payload': {
                'X': np.random.randn(30, 3).tolist(),
                'y': np.random.randn(30).tolist(),
                'type': 'multiple_linear'
            }
        },
        {
            'name': 'Polynomial Regression (Degree 2)',
            'url': '/regression/',
            'payload': {
                'X': np.random.randn(20).tolist(),
                'y': [2 * x**2 + x + np.random.normal(0, 0.5) for x in np.random.randn(20)],
                'type': 'polynomial',
                'parameters': {'degree': 2}
            }
        },
        {
            'name': 'Polynomial Regression (Degree 3)',
            'url': '/regression/',
            'payload': {
                'X': np.random.randn(20).tolist(),
                'y': [x**3 + 2*x**2 + x + np.random.normal(0, 0.5) for x in np.random.randn(20)],
                'type': 'polynomial',
                'parameters': {'degree': 3}
            }
        },
        {
            'name': 'Ridge Regression',
            'url': '/regression/',
            'payload': {
                'X': np.random.randn(30, 3).tolist(),
                'y': np.random.randn(30).tolist(),
                'type': 'ridge',
                'parameters': {'alpha': 1.0}
            }
        },
        {
            'name': 'One-Way ANOVA',
            'url': '/stats/anova/',
            'payload': {
                'data': [
                    np.random.normal(100, 10, 15).tolist(),
                    np.random.normal(105, 10, 15).tolist(),
                    np.random.normal(110, 10, 15).tolist()
                ]
            }
        }
    ]

    results = []
    for test_case in test_cases:
        result = test_endpoint_cache(
            test_case['name'],
            test_case['url'],
            test_case['payload']
        )
        results.append(result)
        time.sleep(0.5)  # Brief pause between tests

    # Summary statistics
    print("\n" + "="*60)
    print("PERFORMANCE SUMMARY")
    print("="*60)

    successful = [r for r in results if r['status'] == 200]
    if successful:
        avg_first = statistics.mean([r['first_time'] for r in successful])
        avg_cached = statistics.mean([r['cached_avg'] for r in successful])
        avg_improvement = statistics.mean([r['improvement'] for r in successful])
        avg_speedup = statistics.mean([r['speedup'] for r in successful])

        print(f"\nAverage First Call:     {avg_first:.2f}ms")
        print(f"Average Cached Call:    {avg_cached:.2f}ms")
        print(f"Average Improvement:    {avg_improvement:.1f}%")
        print(f"Average Speedup:        {avg_speedup:.1f}x")

        # Find best and worst performers
        best = max(successful, key=lambda x: x['improvement'])
        worst = min(successful, key=lambda x: x['improvement'])

        print(f"\nBest Cache Performance:  {best['name']} ({best['improvement']:.1f}%)")
        print(f"Worst Cache Performance: {worst['name']} ({worst['improvement']:.1f}%)")

    # Final assessment
    print("\n" + "="*60)
    print("CACHE IMPLEMENTATION ASSESSMENT")
    print("="*60)

    if avg_improvement > 90:
        print("✅ OUTSTANDING: Cache providing >90% improvement")
        print("   Platform is now lightning fast!")
    elif avg_improvement > 70:
        print("✅ EXCELLENT: Cache providing >70% improvement")
        print("   Significant performance gains achieved!")
    elif avg_improvement > 50:
        print("⚠️ GOOD: Cache providing >50% improvement")
        print("   Solid performance improvement!")
    else:
        print("🔴 NEEDS ATTENTION: Cache providing <50% improvement")
        print("   Further optimization may be needed")

if __name__ == "__main__":
    # Wait for server to be ready
    time.sleep(3)
    main()