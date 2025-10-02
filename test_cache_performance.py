#!/usr/bin/env python3
"""
Cache Performance Test
Measures response time improvement with Redis caching
"""

import requests
import numpy as np
import time
import statistics

BASE_URL = "http://localhost:8000/api/v1"

def test_ttest_performance(iterations=5):
    """Test T-Test endpoint performance with caching"""

    print("="*60)
    print("T-TEST CACHE PERFORMANCE MEASUREMENT")
    print("="*60)

    # Generate consistent test data
    np.random.seed(42)
    test_data = {
        "test_type": "one_sample",
        "data1": np.random.normal(100, 15, 30).tolist(),
        "hypothesized_mean": 100
    }

    # First request (cache miss)
    print("\n1. INITIAL REQUEST (Cache Miss Expected)")
    cache_miss_times = []

    for i in range(iterations):
        start = time.perf_counter()
        response = requests.post(
            f"{BASE_URL}/stats/ttest/",
            json=test_data
        )
        end = time.perf_counter()

        response_time_ms = (end - start) * 1000
        cache_miss_times.append(response_time_ms)

        # Check for cache metadata
        if response.status_code == 200:
            cache_hit = response.json().get('_cache_hit', False)
            print(f"  Run {i+1}: {response_time_ms:.2f}ms (cache_hit={cache_hit})")
        else:
            print(f"  Run {i+1}: Failed with status {response.status_code}")

    avg_cache_miss = statistics.mean(cache_miss_times)
    print(f"\nAverage (cache miss): {avg_cache_miss:.2f}ms")

    # Subsequent requests (cache hits expected)
    print("\n2. SUBSEQUENT REQUESTS (Cache Hits Expected)")
    cache_hit_times = []

    for i in range(iterations):
        start = time.perf_counter()
        response = requests.post(
            f"{BASE_URL}/stats/ttest/",
            json=test_data
        )
        end = time.perf_counter()

        response_time_ms = (end - start) * 1000
        cache_hit_times.append(response_time_ms)

        # Check for cache metadata
        if response.status_code == 200:
            cache_hit = response.json().get('_cache_hit', False)
            print(f"  Run {i+1}: {response_time_ms:.2f}ms (cache_hit={cache_hit})")
        else:
            print(f"  Run {i+1}: Failed with status {response.status_code}")

    avg_cache_hit = statistics.mean(cache_hit_times)
    print(f"\nAverage (cache hit): {avg_cache_hit:.2f}ms")

    # Calculate improvement
    improvement = ((avg_cache_miss - avg_cache_hit) / avg_cache_miss) * 100
    speedup = avg_cache_miss / avg_cache_hit if avg_cache_hit > 0 else 0

    print("\n" + "="*60)
    print("PERFORMANCE IMPROVEMENT SUMMARY")
    print("="*60)
    print(f"Cache Miss Average: {avg_cache_miss:.2f}ms")
    print(f"Cache Hit Average:  {avg_cache_hit:.2f}ms")
    print(f"Improvement:        {improvement:.1f}%")
    print(f"Speedup Factor:     {speedup:.1f}x")

    # Test different T-Test types
    print("\n" + "="*60)
    print("TESTING ALL T-TEST VARIATIONS")
    print("="*60)

    test_cases = [
        {
            "name": "One-Sample T-Test",
            "data": {
                "test_type": "one_sample",
                "data1": np.random.normal(100, 15, 30).tolist(),
                "mu": 100
            }
        },
        {
            "name": "Independent T-Test",
            "data": {
                "test_type": "independent",
                "data1": np.random.normal(100, 15, 30).tolist(),
                "data2": np.random.normal(105, 15, 30).tolist()
            }
        },
        {
            "name": "Paired T-Test",
            "data": {
                "test_type": "paired",
                "data1": np.random.normal(100, 15, 20).tolist(),
                "data2": np.random.normal(102, 15, 20).tolist()
            }
        }
    ]

    for test_case in test_cases:
        print(f"\n{test_case['name']}:")

        # First request (cache miss)
        start = time.perf_counter()
        response = requests.post(f"{BASE_URL}/stats/ttest/", json=test_case['data'])
        first_time = (time.perf_counter() - start) * 1000
        first_cache = response.json().get('_cache_hit', False) if response.status_code == 200 else None

        # Second request (cache hit)
        start = time.perf_counter()
        response = requests.post(f"{BASE_URL}/stats/ttest/", json=test_case['data'])
        second_time = (time.perf_counter() - start) * 1000
        second_cache = response.json().get('_cache_hit', False) if response.status_code == 200 else None

        improvement = ((first_time - second_time) / first_time) * 100 if first_time > 0 else 0

        print(f"  First call:  {first_time:.2f}ms (cache={first_cache})")
        print(f"  Second call: {second_time:.2f}ms (cache={second_cache})")
        print(f"  Improvement: {improvement:.1f}%")

    print("\n" + "="*60)
    print("CACHE TEST COMPLETE")
    print("="*60)

    if improvement > 50:
        print("✅ EXCELLENT: Cache providing >50% improvement")
    elif improvement > 20:
        print("⚠️ GOOD: Cache providing 20-50% improvement")
    else:
        print("🔴 NEEDS ATTENTION: Cache providing <20% improvement")

if __name__ == "__main__":
    test_ttest_performance()