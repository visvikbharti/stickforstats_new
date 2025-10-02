#!/usr/bin/env python
"""
Integration Test Script
Tests the API endpoints with sample data
"""

import requests
import json
import sys
import os
from pathlib import Path

# Configuration
API_BASE_URL = 'http://localhost:8000/api'
TEST_DATA_FILE = Path(__file__).parent.parent / 'test_data' / 'sample_data.csv'

# Test color codes
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_test(name, status, message=""):
    """Print test result with color"""
    if status == 'PASS':
        print(f"{Colors.GREEN}✓{Colors.END} {name}")
    elif status == 'FAIL':
        print(f"{Colors.RED}✗{Colors.END} {name}: {message}")
    elif status == 'INFO':
        print(f"{Colors.BLUE}ℹ{Colors.END} {name}")
    else:
        print(f"{Colors.YELLOW}⚠{Colors.END} {name}")

def test_upload_data():
    """Test data upload endpoint"""
    print("\n" + "="*50)
    print("Testing Data Upload Endpoint")
    print("="*50)
    
    try:
        # Check if test file exists
        if not TEST_DATA_FILE.exists():
            print_test("Test file check", "FAIL", f"File not found: {TEST_DATA_FILE}")
            return None
        
        print_test("Test file found", "PASS")
        
        # Upload file
        with open(TEST_DATA_FILE, 'rb') as f:
            files = {'file': ('sample_data.csv', f, 'text/csv')}
            data = {
                'file_type': 'csv',
                'delimiter': ',',
                'has_header': 'true'
            }
            
            response = requests.post(
                f"{API_BASE_URL}/test-recommender/upload-data/",
                files=files,
                data=data
            )
        
        if response.status_code == 200:
            result = response.json()
            print_test("File upload", "PASS")
            print_test(f"Data ID: {result.get('data_id', 'N/A')}", "INFO")
            print_test(f"Rows: {result.get('n_rows', 0)}", "INFO")
            print_test(f"Columns: {result.get('n_cols', 0)}", "INFO")
            
            # Display variables
            variables = result.get('variables', [])
            if variables:
                print("\nVariables detected:")
                for var in variables:
                    print(f"  - {var['name']}: {var['type']} (missing: {var['missing_count']})")
            
            return result.get('data_id')
        else:
            print_test("File upload", "FAIL", f"Status {response.status_code}: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print_test("Connection", "FAIL", "Cannot connect to backend. Is the server running?")
        return None
    except Exception as e:
        print_test("Upload test", "FAIL", str(e))
        return None

def test_check_assumptions(data_id):
    """Test assumption checking endpoint"""
    print("\n" + "="*50)
    print("Testing Assumption Check Endpoint")
    print("="*50)
    
    if not data_id:
        print_test("Assumption check", "SKIP", "No data ID available")
        return False
    
    try:
        payload = {
            'data_id': data_id,
            'test_type': 'normality',
            'variables': ['pre_score', 'post_score'],
            'alpha': 0.05
        }
        
        response = requests.post(
            f"{API_BASE_URL}/test-recommender/check-assumptions/",
            json=payload
        )
        
        if response.status_code == 200:
            results = response.json()
            print_test("Assumption check", "PASS")
            
            if isinstance(results, list) and len(results) > 0:
                print("\nAssumption results:")
                for result in results:
                    status = "✓" if result.get('passed') else "✗"
                    print(f"  {status} {result.get('test_name', 'Unknown')}: p={result.get('p_value', 0):.4f}")
            
            return True
        else:
            print_test("Assumption check", "FAIL", f"Status {response.status_code}")
            return False
            
    except Exception as e:
        print_test("Assumption test", "FAIL", str(e))
        return False

def test_recommend_test(data_id):
    """Test recommendation endpoint"""
    print("\n" + "="*50)
    print("Testing Test Recommendation Endpoint")
    print("="*50)
    
    if not data_id:
        print_test("Test recommendation", "SKIP", "No data ID available")
        return None
    
    try:
        payload = {
            'data_id': data_id,
            'dependent_var': 'post_score',
            'independent_vars': ['group'],
            'hypothesis_type': 'difference',
            'is_paired': False,
            'alpha': 0.05
        }
        
        response = requests.post(
            f"{API_BASE_URL}/test-recommender/recommend/",
            json=payload
        )
        
        if response.status_code == 200:
            recommendations = response.json()
            print_test("Test recommendation", "PASS")
            
            if isinstance(recommendations, list) and len(recommendations) > 0:
                print("\nRecommended tests:")
                for i, rec in enumerate(recommendations[:3], 1):
                    print(f"  {i}. {rec.get('test_name', 'Unknown')} (score: {rec.get('suitability_score', 0):.2f})")
                    if rec.get('reasons'):
                        for reason in rec['reasons'][:2]:
                            print(f"     - {reason}")
                
                return recommendations[0].get('test_name') if recommendations else None
            
            return None
        else:
            print_test("Test recommendation", "FAIL", f"Status {response.status_code}")
            return None
            
    except Exception as e:
        print_test("Recommendation test", "FAIL", str(e))
        return None

def test_run_test(data_id, test_type):
    """Test execution endpoint"""
    print("\n" + "="*50)
    print("Testing Test Execution Endpoint")
    print("="*50)
    
    if not data_id or not test_type:
        print_test("Test execution", "SKIP", "Missing data ID or test type")
        return False
    
    try:
        payload = {
            'data_id': data_id,
            'test_type': test_type,
            'dependent_var': 'post_score',
            'independent_vars': ['group'],
            'parameters': {},
            'options': {}
        }
        
        response = requests.post(
            f"{API_BASE_URL}/test-recommender/run-test/",
            json=payload
        )
        
        if response.status_code == 200:
            result = response.json()
            print_test("Test execution", "PASS")
            
            print("\nTest results:")
            print(f"  Test: {result.get('test_name', test_type)}")
            print(f"  Statistic: {result.get('statistic', 0):.4f}")
            print(f"  P-value: {result.get('p_value', 1):.4f}")
            
            if result.get('effect_size'):
                print(f"  Effect size: {result['effect_size'].get('value', 0):.3f}")
            
            if result.get('interpretation'):
                print(f"  Interpretation: {result['interpretation']}")
            
            return True
        else:
            print_test("Test execution", "FAIL", f"Status {response.status_code}")
            return False
            
    except Exception as e:
        print_test("Execution test", "FAIL", str(e))
        return False

def main():
    """Run all integration tests"""
    print("\n" + "#"*50)
    print("# StickForStats Integration Test Suite")
    print("#"*50)
    
    # Test sequence
    data_id = test_upload_data()
    
    if data_id:
        test_check_assumptions(data_id)
        test_name = test_recommend_test(data_id)
        if test_name:
            test_run_test(data_id, test_name)
    
    print("\n" + "="*50)
    print("Integration tests completed")
    print("="*50 + "\n")

if __name__ == '__main__':
    main()