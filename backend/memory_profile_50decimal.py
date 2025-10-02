#!/usr/bin/env python3
"""
StickForStats v1.0 - Memory Profile for 50-Decimal Precision Calculations
==========================================================================
Analyzes memory usage patterns for high-precision decimal calculations
"""

import requests
import numpy as np
import psutil
import json
import gc
import tracemalloc
from datetime import datetime
from decimal import Decimal, getcontext
import sys

# Set precision for comparison
getcontext().prec = 60

class MemoryProfiler50Decimal:
    def __init__(self):
        self.base_url = "http://localhost:8000/api/v1"
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'memory_profiles': {},
            'precision_analysis': {},
            'summary': {}
        }

    def profile_memory_usage(self, endpoint, payload, label):
        """Profile detailed memory usage for a request"""
        # Force garbage collection before measurement
        gc.collect()

        # Start memory tracing
        tracemalloc.start()

        # Get process memory before
        process = psutil.Process()
        mem_info_before = process.memory_info()

        # Make request
        try:
            response = requests.post(f"{self.base_url}/{endpoint}", json=payload)

            if response.status_code == 200:
                result = response.json()

                # Analyze precision in result
                precision_stats = self.analyze_precision(result)
            else:
                precision_stats = None

        except Exception as e:
            precision_stats = None
            print(f"Error: {e}")

        # Get memory snapshot
        snapshot = tracemalloc.take_snapshot()
        top_stats = snapshot.statistics('lineno')

        # Get process memory after
        mem_info_after = process.memory_info()

        # Stop tracing
        tracemalloc.stop()

        # Calculate memory usage
        memory_used = {
            'rss_mb': (mem_info_after.rss - mem_info_before.rss) / 1024 / 1024,
            'vms_mb': (mem_info_after.vms - mem_info_before.vms) / 1024 / 1024,
            'top_allocations': []
        }

        # Get top 10 memory allocations
        for stat in top_stats[:10]:
            memory_used['top_allocations'].append({
                'file': stat.traceback.format()[0] if stat.traceback else 'unknown',
                'size_kb': stat.size / 1024
            })

        # Force garbage collection
        gc.collect()

        return {
            'label': label,
            'memory_used': memory_used,
            'precision_stats': precision_stats
        }

    def analyze_precision(self, result):
        """Analyze the precision of numbers in the result"""
        precision_stats = {
            'decimal_places': [],
            'has_high_precision': False,
            'fields_analyzed': 0
        }

        if 'high_precision_result' in result:
            precision_stats['has_high_precision'] = True

            for key, value in result['high_precision_result'].items():
                if isinstance(value, (str, float, int)):
                    try:
                        # Count decimal places
                        str_value = str(value)
                        if '.' in str_value:
                            decimal_places = len(str_value.split('.')[-1])
                            precision_stats['decimal_places'].append({
                                'field': key,
                                'decimals': min(decimal_places, 50)
                            })
                            precision_stats['fields_analyzed'] += 1
                    except:
                        pass

        return precision_stats

    def run_memory_profiling(self):
        """Run comprehensive memory profiling"""
        print("\n" + "="*80)
        print("MEMORY PROFILING FOR 50-DECIMAL PRECISION CALCULATIONS")
        print("="*80)

        # Test configurations with varying complexity
        test_configs = [
            {
                'name': 'Small Dataset (10 values)',
                'data_size': 10
            },
            {
                'name': 'Medium Dataset (100 values)',
                'data_size': 100
            },
            {
                'name': 'Large Dataset (1000 values)',
                'data_size': 1000
            },
            {
                'name': 'Very Large Dataset (5000 values)',
                'data_size': 5000
            }
        ]

        # T-Test endpoint (supports 50-decimal precision)
        endpoint = 'stats/ttest/'

        print(f"\n📊 Profiling Memory Usage for T-Test with 50-Decimal Precision")
        print("-" * 60)

        profiles = []

        for config in test_configs:
            print(f"\n  Testing: {config['name']}")

            # Generate test data
            np.random.seed(42)
            data1 = np.random.normal(100, 15, config['data_size']).tolist()
            data2 = np.random.normal(110, 15, config['data_size']).tolist()

            payload = {
                'data1': data1,
                'data2': data2,
                'test_type': 'two_sample'
            }

            # Profile memory
            profile = self.profile_memory_usage(endpoint, payload, config['name'])

            # Print results
            print(f"    Memory Used (RSS): {profile['memory_used']['rss_mb']:.3f} MB")
            print(f"    Memory Used (VMS): {profile['memory_used']['vms_mb']:.3f} MB")

            if profile['precision_stats']:
                print(f"    High Precision: {'✅' if profile['precision_stats']['has_high_precision'] else '❌'}")
                if profile['precision_stats']['decimal_places']:
                    avg_decimals = np.mean([d['decimals'] for d in profile['precision_stats']['decimal_places']])
                    print(f"    Average Decimal Places: {avg_decimals:.1f}")

            profiles.append(profile)

        self.results['memory_profiles']['ttest'] = profiles

        # Compare memory usage: 50-decimal vs standard precision
        self.compare_precision_memory()

        # Generate summary
        self.generate_summary()

        # Save results
        self.save_results()

        return self.results

    def compare_precision_memory(self):
        """Compare memory usage between high and standard precision"""
        print("\n📊 Comparing Memory Usage: 50-Decimal vs Standard Precision")
        print("-" * 60)

        comparison_results = []

        test_data = {
            'data1': np.random.normal(100, 15, 100).tolist(),
            'data2': np.random.normal(110, 15, 100).tolist()
        }

        # Test with Python Decimal (50 precision)
        print("\n  Testing Python Decimal (50 precision)...")
        gc.collect()
        process = psutil.Process()
        mem_before = process.memory_info().rss / 1024 / 1024

        # Simulate 50-decimal calculation
        getcontext().prec = 50
        decimal_data1 = [Decimal(str(x)) for x in test_data['data1']]
        decimal_data2 = [Decimal(str(x)) for x in test_data['data2']]

        # Perform calculations
        mean1 = sum(decimal_data1) / len(decimal_data1)
        mean2 = sum(decimal_data2) / len(decimal_data2)
        diff = mean1 - mean2

        mem_after = process.memory_info().rss / 1024 / 1024
        decimal_memory = mem_after - mem_before

        print(f"    Memory used: {decimal_memory:.3f} MB")

        # Test with NumPy float64 (standard precision)
        print("\n  Testing NumPy float64 (standard precision)...")
        gc.collect()
        mem_before = process.memory_info().rss / 1024 / 1024

        # Standard calculation
        np_data1 = np.array(test_data['data1'])
        np_data2 = np.array(test_data['data2'])
        np_mean1 = np.mean(np_data1)
        np_mean2 = np.mean(np_data2)
        np_diff = np_mean1 - np_mean2

        mem_after = process.memory_info().rss / 1024 / 1024
        numpy_memory = mem_after - mem_before

        print(f"    Memory used: {numpy_memory:.3f} MB")

        # Calculate overhead
        overhead = (decimal_memory / max(numpy_memory, 0.001) - 1) * 100 if numpy_memory > 0 else 0

        print(f"\n  📈 Memory Overhead for 50-Decimal Precision: {overhead:.1f}%")

        self.results['precision_analysis'] = {
            'decimal_50_memory_mb': decimal_memory,
            'numpy_float64_memory_mb': numpy_memory,
            'overhead_percentage': overhead
        }

    def generate_summary(self):
        """Generate summary of memory profiling"""
        all_memory_rss = []
        all_memory_vms = []
        high_precision_count = 0

        for endpoint, profiles in self.results['memory_profiles'].items():
            for profile in profiles:
                all_memory_rss.append(profile['memory_used']['rss_mb'])
                all_memory_vms.append(profile['memory_used']['vms_mb'])
                if profile['precision_stats'] and profile['precision_stats']['has_high_precision']:
                    high_precision_count += 1

        self.results['summary'] = {
            'tests_run': len(all_memory_rss),
            'high_precision_tests': high_precision_count,
            'avg_memory_rss_mb': np.mean(all_memory_rss) if all_memory_rss else 0,
            'max_memory_rss_mb': np.max(all_memory_rss) if all_memory_rss else 0,
            'min_memory_rss_mb': np.min(all_memory_rss) if all_memory_rss else 0,
            'avg_memory_vms_mb': np.mean(all_memory_vms) if all_memory_vms else 0,
            'memory_efficiency': self.calculate_efficiency(all_memory_rss)
        }

    def calculate_efficiency(self, memory_values):
        """Calculate memory efficiency rating"""
        avg_memory = np.mean(memory_values) if memory_values else 0

        if avg_memory < 1:
            return "EXCELLENT (< 1MB avg)"
        elif avg_memory < 10:
            return "GOOD (< 10MB avg)"
        elif avg_memory < 50:
            return "ACCEPTABLE (< 50MB avg)"
        elif avg_memory < 100:
            return "MODERATE (< 100MB avg)"
        else:
            return "NEEDS OPTIMIZATION (> 100MB avg)"

    def save_results(self):
        """Save profiling results"""
        filename = f"memory_profile_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)

        print("\n" + "="*80)
        print("MEMORY PROFILING SUMMARY")
        print("="*80)

        summary = self.results['summary']
        print(f"Tests Run: {summary['tests_run']}")
        print(f"High Precision Tests: {summary['high_precision_tests']}")
        print(f"\nMemory Usage (RSS):")
        print(f"  Average: {summary['avg_memory_rss_mb']:.3f} MB")
        print(f"  Maximum: {summary['max_memory_rss_mb']:.3f} MB")
        print(f"  Minimum: {summary['min_memory_rss_mb']:.3f} MB")
        print(f"\n🎯 Memory Efficiency: {summary['memory_efficiency']}")

        if 'precision_analysis' in self.results:
            pa = self.results['precision_analysis']
            print(f"\n50-DECIMAL PRECISION OVERHEAD:")
            print(f"  50-Decimal Memory: {pa['decimal_50_memory_mb']:.3f} MB")
            print(f"  Standard Memory: {pa['numpy_float64_memory_mb']:.3f} MB")
            print(f"  Overhead: {pa['overhead_percentage']:.1f}%")

        # Performance assessment
        print("\n📊 PERFORMANCE ASSESSMENT:")

        if summary['avg_memory_rss_mb'] < 10:
            print("✅ Memory usage is EXCELLENT (< 10MB average)")
        elif summary['avg_memory_rss_mb'] < 50:
            print("✅ Memory usage is GOOD (< 50MB average)")
        else:
            print("⚠️  Memory usage could be optimized")

        if 'precision_analysis' in self.results:
            if self.results['precision_analysis']['overhead_percentage'] < 200:
                print("✅ 50-decimal overhead is REASONABLE (< 200%)")
            else:
                print("⚠️  50-decimal overhead is HIGH (> 200%)")

        print(f"\n✅ Results saved to: {filename}")
        print("="*80)

if __name__ == "__main__":
    print("\n🚀 Starting Memory Profiling for 50-Decimal Precision...")
    print("This will analyze memory usage patterns for high-precision calculations")

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

    # Run memory profiling
    profiler = MemoryProfiler50Decimal()
    results = profiler.run_memory_profiling()

    print("\n✅ Memory profiling complete!")