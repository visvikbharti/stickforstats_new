"""
Economic Design Service for Statistical Quality Control (SQC) Analysis.

This module provides services for economic design of control charts and cost optimization
for statistical process control implementation.
Adapted from the original Streamlit implementation to work with Django/React architecture.
"""

import numpy as np
import pandas as pd
import scipy.stats as stats
from scipy import optimize
from typing import Dict, List, Optional, Tuple, Union, Any
import math

class EconomicDesignService:
    """
    Service for economic design of control charts and SPC implementation.
    """
    
    def __init__(self):
        """Initialize the economic design service."""
        pass
    
    def calculate_optimal_design_parameters(
        self,
        process_parameters: Dict[str, Any],
        cost_parameters: Dict[str, Any],
        chart_type: str = "xbar",
        constraints: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Calculate optimal control chart parameters using economic design.
        
        Args:
            process_parameters: Dictionary of process parameters
            cost_parameters: Dictionary of cost parameters
            chart_type: Type of control chart (xbar, p, u, etc.)
            constraints: Optional constraints on the design
            
        Returns:
            Dictionary with optimal design parameters and expected costs
        """
        # Extract process parameters
        mean_time_to_failure = process_parameters.get('mean_time_to_failure', 100)  # Hours until process goes OOC
        shift_size = process_parameters.get('shift_size', 2.0)  # Size of shift in std_dev units
        std_dev = process_parameters.get('std_dev', 1.0)  # Process standard deviation
        hourly_production = process_parameters.get('hourly_production', 100)  # Units produced per hour
        
        # Extract cost parameters
        sampling_cost = cost_parameters.get('sampling_cost', 5.0)  # Cost per unit sampled
        fixed_sampling_cost = cost_parameters.get('fixed_sampling_cost', 10.0)  # Fixed cost per sampling occasion
        false_alarm_cost = cost_parameters.get('false_alarm_cost', 200.0)  # Cost per false alarm
        hourly_defect_cost = cost_parameters.get('hourly_defect_cost', 500.0)  # Hourly cost when process is OOC
        finding_cost = cost_parameters.get('finding_cost', 250.0)  # Cost to find and fix assignable cause
        
        # Extract constraints (if provided)
        if constraints is None:
            constraints = {}
        
        min_sample_size = constraints.get('min_sample_size', 1)
        max_sample_size = constraints.get('max_sample_size', 15)
        min_sampling_interval = constraints.get('min_sampling_interval', 0.25)  # In hours
        max_sampling_interval = constraints.get('max_sampling_interval', 8.0)  # In hours
        min_detection_power = constraints.get('min_detection_power', 0.9)
        max_false_alarm_rate = constraints.get('max_false_alarm_rate', 0.01)
        
        # Initial estimates for optimal parameters
        # (For X-bar chart, typical values from literature)
        if chart_type == "xbar":
            initial_sample_size = 5
            initial_sampling_interval = 1.0  # Hours
            initial_k_factor = 3.0  # Control limit widths in sigma units
        elif chart_type in ["p", "np"]:
            initial_sample_size = 100
            initial_sampling_interval = 1.0
            initial_k_factor = 3.0
        elif chart_type in ["c", "u"]:
            initial_sample_size = 1
            initial_sampling_interval = 1.0
            initial_k_factor = 3.0
        else:
            initial_sample_size = 5
            initial_sampling_interval = 1.0
            initial_k_factor = 3.0
        
        # Define the economic model (expected hourly cost function)
        def expected_hourly_cost(params):
            n, h, k = params
            
            # Round sample size to nearest integer
            n = round(n)
            
            # Ensure parameters are within constraints
            if n < min_sample_size or n > max_sample_size:
                return float('inf')
            if h < min_sampling_interval or h > max_sampling_interval:
                return float('inf')
            if k < 2 or k > 4:  # Reasonable k-factor range
                return float('inf')
            
            # Calculate probabilities for false alarms and detection
            false_alarm_prob = 2 * (1 - stats.norm.cdf(k))
            
            # For X-bar chart, detection probability depends on sample size
            if chart_type == "xbar":
                detection_prob = 1 - stats.norm.cdf(k - shift_size * math.sqrt(n)) + stats.norm.cdf(-k - shift_size * math.sqrt(n))
            else:
                # For attributes charts, use approximation
                detection_prob = 1 - stats.norm.cdf(k - shift_size) + stats.norm.cdf(-k - shift_size)
            
            # Check if detection power constraint is met
            if detection_prob < min_detection_power:
                return float('inf')
            
            # Check if false alarm rate constraint is met
            if false_alarm_prob > max_false_alarm_rate:
                return float('inf')
            
            # Calculate ARL (Average Run Length) values
            arl_0 = 1 / false_alarm_prob  # In-control ARL
            arl_1 = 1 / detection_prob  # Out-of-control ARL
            
            # Expected time to detect shift after it occurs
            detection_delay = h * (arl_1 - 0.5)
            
            # Calculate expected number of false alarms
            expected_false_alarms = false_alarm_prob * (mean_time_to_failure / h)
            
            # Calculate expected costs
            # 1. Sampling cost per hour
            hourly_sampling_cost = (fixed_sampling_cost + n * sampling_cost) / h
            
            # 2. False alarm cost per hour
            hourly_false_alarm_cost = false_alarm_cost * expected_false_alarms / mean_time_to_failure
            
            # 3. Cost of operating out of control
            ooc_fraction = detection_delay / (mean_time_to_failure + detection_delay)
            hourly_ooc_cost = hourly_defect_cost * ooc_fraction
            
            # 4. Cost of finding assignable cause
            hourly_finding_cost = finding_cost / (mean_time_to_failure + detection_delay)
            
            # Total expected hourly cost
            total_hourly_cost = hourly_sampling_cost + hourly_false_alarm_cost + hourly_ooc_cost + hourly_finding_cost
            
            return total_hourly_cost
        
        # Optimize using grid search followed by local optimization
        best_cost = float('inf')
        best_params = [initial_sample_size, initial_sampling_interval, initial_k_factor]
        
        # Grid search for good starting points
        sample_sizes = np.arange(min_sample_size, min(max_sample_size + 1, 16))
        sampling_intervals = np.linspace(min_sampling_interval, max_sampling_interval, 10)
        k_factors = np.linspace(2.5, 3.5, 5)
        
        for n in sample_sizes:
            for h in sampling_intervals:
                for k in k_factors:
                    cost = expected_hourly_cost([n, h, k])
                    if cost < best_cost:
                        best_cost = cost
                        best_params = [n, h, k]
        
        # Local optimization from best grid point
        result = optimize.minimize(expected_hourly_cost, best_params, 
                                 method='Nelder-Mead',
                                 bounds=[(min_sample_size, max_sample_size), 
                                        (min_sampling_interval, max_sampling_interval),
                                        (2.0, 4.0)])
        
        if result.success and result.fun < best_cost:
            n_opt, h_opt, k_opt = result.x
            n_opt = round(n_opt)  # Round to nearest integer
            total_cost = result.fun
        else:
            n_opt, h_opt, k_opt = best_params
            total_cost = best_cost
        
        # Calculate additional performance metrics for the optimal design
        false_alarm_prob = 2 * (1 - stats.norm.cdf(k_opt))
        
        if chart_type == "xbar":
            detection_prob = 1 - stats.norm.cdf(k_opt - shift_size * math.sqrt(n_opt)) + stats.norm.cdf(-k_opt - shift_size * math.sqrt(n_opt))
        else:
            detection_prob = 1 - stats.norm.cdf(k_opt - shift_size) + stats.norm.cdf(-k_opt - shift_size)
        
        # Calculate ARL values
        arl_0 = 1 / false_alarm_prob  # In-control ARL
        arl_1 = 1 / detection_prob  # Out-of-control ARL
        
        # Expected time to detect shift after it occurs
        detection_delay = h_opt * (arl_1 - 0.5)
        
        # Calculate expected number of false alarms
        expected_false_alarms = false_alarm_prob * (mean_time_to_failure / h_opt)
        
        # Calculate expected costs for optimal design
        # 1. Sampling cost per hour
        hourly_sampling_cost = (fixed_sampling_cost + n_opt * sampling_cost) / h_opt
        
        # 2. False alarm cost per hour
        hourly_false_alarm_cost = false_alarm_cost * expected_false_alarms / mean_time_to_failure
        
        # 3. Cost of operating out of control
        ooc_fraction = detection_delay / (mean_time_to_failure + detection_delay)
        hourly_ooc_cost = hourly_defect_cost * ooc_fraction
        
        # 4. Cost of finding assignable cause
        hourly_finding_cost = finding_cost / (mean_time_to_failure + detection_delay)
        
        # Create upper and lower control limits
        if chart_type == "xbar":
            center_line = process_parameters.get('mean', 0)
            ucl = center_line + k_opt * std_dev / math.sqrt(n_opt)
            lcl = center_line - k_opt * std_dev / math.sqrt(n_opt)
        else:
            # For attributes charts, control limits depend on specific chart type
            # Simplified version for now
            center_line = process_parameters.get('p', 0.05) if chart_type in ["p", "np"] else process_parameters.get('c', 5)
            ucl = center_line + k_opt * math.sqrt(center_line / n_opt)
            lcl = max(0, center_line - k_opt * math.sqrt(center_line / n_opt))
        
        # Compare with traditional design
        traditional_n = 5 if chart_type == "xbar" else (100 if chart_type in ["p", "np"] else 1)
        traditional_h = 1.0
        traditional_k = 3.0
        
        traditional_cost = expected_hourly_cost([traditional_n, traditional_h, traditional_k])
        cost_savings = (traditional_cost - total_cost) / traditional_cost * 100 if traditional_cost > 0 else 0
        
        # Prepare result
        result = {
            'optimal_design': {
                'sample_size': int(n_opt),
                'sampling_interval': float(h_opt),
                'k_factor': float(k_opt),
                'lcl': float(lcl),
                'center_line': float(center_line),
                'ucl': float(ucl)
            },
            'performance_metrics': {
                'in_control_arl': float(arl_0),
                'out_of_control_arl': float(arl_1),
                'false_alarm_probability': float(false_alarm_prob),
                'detection_probability': float(detection_prob),
                'average_time_to_detect': float(detection_delay)
            },
            'cost_analysis': {
                'total_hourly_cost': float(total_cost),
                'hourly_sampling_cost': float(hourly_sampling_cost),
                'hourly_false_alarm_cost': float(hourly_false_alarm_cost),
                'hourly_ooc_cost': float(hourly_ooc_cost),
                'hourly_finding_cost': float(hourly_finding_cost),
                'traditional_design_cost': float(traditional_cost),
                'cost_savings_percent': float(cost_savings)
            },
            'inputs': {
                'process_parameters': process_parameters,
                'cost_parameters': cost_parameters,
                'chart_type': chart_type,
                'constraints': constraints
            }
        }
        
        return result
    
    def compare_design_alternatives(
        self,
        process_parameters: Dict[str, Any],
        cost_parameters: Dict[str, Any],
        alternatives: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compare multiple control chart design alternatives.
        
        Args:
            process_parameters: Dictionary of process parameters
            cost_parameters: Dictionary of cost parameters
            alternatives: List of design alternatives to compare
            
        Returns:
            Dictionary with comparison results
        """
        # Extract process parameters
        mean_time_to_failure = process_parameters.get('mean_time_to_failure', 100)  # Hours until process goes OOC
        shift_size = process_parameters.get('shift_size', 2.0)  # Size of shift in std_dev units
        std_dev = process_parameters.get('std_dev', 1.0)  # Process standard deviation
        hourly_production = process_parameters.get('hourly_production', 100)  # Units produced per hour
        
        # Extract cost parameters
        sampling_cost = cost_parameters.get('sampling_cost', 5.0)  # Cost per unit sampled
        fixed_sampling_cost = cost_parameters.get('fixed_sampling_cost', 10.0)  # Fixed cost per sampling occasion
        false_alarm_cost = cost_parameters.get('false_alarm_cost', 200.0)  # Cost per false alarm
        hourly_defect_cost = cost_parameters.get('hourly_defect_cost', 500.0)  # Hourly cost when process is OOC
        finding_cost = cost_parameters.get('finding_cost', 250.0)  # Cost to find and fix assignable cause
        
        comparison_results = []
        
        for i, alternative in enumerate(alternatives):
            # Extract design parameters
            chart_type = alternative.get('chart_type', 'xbar')
            sample_size = alternative.get('sample_size', 5)
            sampling_interval = alternative.get('sampling_interval', 1.0)
            k_factor = alternative.get('k_factor', 3.0)
            
            # Calculate false alarm and detection probabilities
            false_alarm_prob = 2 * (1 - stats.norm.cdf(k_factor))
            
            if chart_type == "xbar":
                detection_prob = 1 - stats.norm.cdf(k_factor - shift_size * math.sqrt(sample_size)) + stats.norm.cdf(-k_factor - shift_size * math.sqrt(sample_size))
            else:
                detection_prob = 1 - stats.norm.cdf(k_factor - shift_size) + stats.norm.cdf(-k_factor - shift_size)
            
            # Calculate ARL values
            arl_0 = 1 / false_alarm_prob if false_alarm_prob > 0 else float('inf')
            arl_1 = 1 / detection_prob if detection_prob > 0 else float('inf')
            
            # Expected time to detect shift after it occurs
            detection_delay = sampling_interval * (arl_1 - 0.5)
            
            # Calculate expected number of false alarms
            expected_false_alarms = false_alarm_prob * (mean_time_to_failure / sampling_interval)
            
            # Calculate expected costs
            # 1. Sampling cost per hour
            hourly_sampling_cost = (fixed_sampling_cost + sample_size * sampling_cost) / sampling_interval
            
            # 2. False alarm cost per hour
            hourly_false_alarm_cost = false_alarm_cost * expected_false_alarms / mean_time_to_failure
            
            # 3. Cost of operating out of control
            ooc_fraction = detection_delay / (mean_time_to_failure + detection_delay)
            hourly_ooc_cost = hourly_defect_cost * ooc_fraction
            
            # 4. Cost of finding assignable cause
            hourly_finding_cost = finding_cost / (mean_time_to_failure + detection_delay)
            
            # Total expected hourly cost
            total_hourly_cost = hourly_sampling_cost + hourly_false_alarm_cost + hourly_ooc_cost + hourly_finding_cost
            
            # Create result for this alternative
            result = {
                'name': alternative.get('name', f"Alternative {i+1}"),
                'design': {
                    'chart_type': chart_type,
                    'sample_size': int(sample_size),
                    'sampling_interval': float(sampling_interval),
                    'k_factor': float(k_factor)
                },
                'performance': {
                    'in_control_arl': float(arl_0),
                    'out_of_control_arl': float(arl_1),
                    'false_alarm_probability': float(false_alarm_prob),
                    'detection_probability': float(detection_prob),
                    'average_time_to_detect': float(detection_delay)
                },
                'costs': {
                    'total_hourly_cost': float(total_hourly_cost),
                    'hourly_sampling_cost': float(hourly_sampling_cost),
                    'hourly_false_alarm_cost': float(hourly_false_alarm_cost),
                    'hourly_ooc_cost': float(hourly_ooc_cost),
                    'hourly_finding_cost': float(hourly_finding_cost)
                }
            }
            
            comparison_results.append(result)
        
        # Sort results by total hourly cost
        comparison_results.sort(key=lambda x: x['costs']['total_hourly_cost'])
        
        # Calculate cost differences relative to the best alternative
        if comparison_results:
            best_cost = comparison_results[0]['costs']['total_hourly_cost']
            for result in comparison_results:
                result['costs']['cost_difference'] = result['costs']['total_hourly_cost'] - best_cost
                result['costs']['cost_difference_percent'] = (result['costs']['cost_difference'] / best_cost * 100) if best_cost > 0 else 0
        
        # Create comparison summary
        comparison_summary = {
            'alternatives': comparison_results,
            'best_alternative': comparison_results[0]['name'] if comparison_results else None,
            'process_parameters': process_parameters,
            'cost_parameters': cost_parameters
        }
        
        return comparison_summary
    
    def calculate_cost_of_quality(
        self,
        quality_parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate Cost of Quality metrics.
        
        Args:
            quality_parameters: Dictionary of quality cost parameters
            
        Returns:
            Dictionary with Cost of Quality analysis
        """
        # Extract cost parameters
        # Prevention costs
        training_cost = quality_parameters.get('training_cost', 0)
        planning_cost = quality_parameters.get('planning_cost', 0)
        preventive_maintenance = quality_parameters.get('preventive_maintenance', 0)
        process_improvement = quality_parameters.get('process_improvement', 0)
        supplier_quality = quality_parameters.get('supplier_quality', 0)
        other_prevention = quality_parameters.get('other_prevention', 0)
        
        # Appraisal costs
        inspection_cost = quality_parameters.get('inspection_cost', 0)
        testing_cost = quality_parameters.get('testing_cost', 0)
        audit_cost = quality_parameters.get('audit_cost', 0)
        calibration_cost = quality_parameters.get('calibration_cost', 0)
        other_appraisal = quality_parameters.get('other_appraisal', 0)
        
        # Internal failure costs
        scrap_cost = quality_parameters.get('scrap_cost', 0)
        rework_cost = quality_parameters.get('rework_cost', 0)
        downtime_cost = quality_parameters.get('downtime_cost', 0)
        yield_loss_cost = quality_parameters.get('yield_loss_cost', 0)
        other_internal = quality_parameters.get('other_internal', 0)
        
        # External failure costs
        warranty_cost = quality_parameters.get('warranty_cost', 0)
        returns_cost = quality_parameters.get('returns_cost', 0)
        complaint_cost = quality_parameters.get('complaint_cost', 0)
        liability_cost = quality_parameters.get('liability_cost', 0)
        lost_sales_cost = quality_parameters.get('lost_sales_cost', 0)
        other_external = quality_parameters.get('other_external', 0)
        
        # Total revenue (for calculating percentages)
        total_revenue = quality_parameters.get('total_revenue', 0)
        
        # Calculate category totals
        prevention_total = (training_cost + planning_cost + preventive_maintenance +
                           process_improvement + supplier_quality + other_prevention)
        
        appraisal_total = (inspection_cost + testing_cost + audit_cost +
                          calibration_cost + other_appraisal)
        
        internal_failure_total = (scrap_cost + rework_cost + downtime_cost +
                                 yield_loss_cost + other_internal)
        
        external_failure_total = (warranty_cost + returns_cost + complaint_cost +
                                 liability_cost + lost_sales_cost + other_external)
        
        # Calculate CoQ totals
        conformance_cost = prevention_total + appraisal_total
        nonconformance_cost = internal_failure_total + external_failure_total
        total_coq = conformance_cost + nonconformance_cost
        
        # Calculate percentages of total CoQ and total revenue
        if total_coq > 0:
            prevention_pct = prevention_total / total_coq * 100
            appraisal_pct = appraisal_total / total_coq * 100
            internal_failure_pct = internal_failure_total / total_coq * 100
            external_failure_pct = external_failure_total / total_coq * 100
            
            conformance_pct = conformance_cost / total_coq * 100
            nonconformance_pct = nonconformance_cost / total_coq * 100
        else:
            prevention_pct = appraisal_pct = internal_failure_pct = external_failure_pct = 0
            conformance_pct = nonconformance_pct = 0
        
        if total_revenue > 0:
            coq_revenue_pct = total_coq / total_revenue * 100
        else:
            coq_revenue_pct = 0
        
        # Create detailed breakdown of cost categories
        prevention_costs = {
            'training': float(training_cost),
            'planning': float(planning_cost),
            'preventive_maintenance': float(preventive_maintenance),
            'process_improvement': float(process_improvement),
            'supplier_quality': float(supplier_quality),
            'other': float(other_prevention),
            'total': float(prevention_total),
            'percent_of_coq': float(prevention_pct)
        }
        
        appraisal_costs = {
            'inspection': float(inspection_cost),
            'testing': float(testing_cost),
            'audit': float(audit_cost),
            'calibration': float(calibration_cost),
            'other': float(other_appraisal),
            'total': float(appraisal_total),
            'percent_of_coq': float(appraisal_pct)
        }
        
        internal_failure_costs = {
            'scrap': float(scrap_cost),
            'rework': float(rework_cost),
            'downtime': float(downtime_cost),
            'yield_loss': float(yield_loss_cost),
            'other': float(other_internal),
            'total': float(internal_failure_total),
            'percent_of_coq': float(internal_failure_pct)
        }
        
        external_failure_costs = {
            'warranty': float(warranty_cost),
            'returns': float(returns_cost),
            'complaints': float(complaint_cost),
            'liability': float(liability_cost),
            'lost_sales': float(lost_sales_cost),
            'other': float(other_external),
            'total': float(external_failure_total),
            'percent_of_coq': float(external_failure_pct)
        }
        
        # Create summary with analysis and insights
        summary = {
            'total_coq': float(total_coq),
            'conformance_cost': float(conformance_cost),
            'nonconformance_cost': float(nonconformance_cost),
            'conformance_percent': float(conformance_pct),
            'nonconformance_percent': float(nonconformance_pct),
            'coq_as_percent_of_revenue': float(coq_revenue_pct),
            'prevention_percent': float(prevention_pct),
            'appraisal_percent': float(appraisal_pct),
            'internal_failure_percent': float(internal_failure_pct),
            'external_failure_percent': float(external_failure_pct)
        }
        
        # Provide maturity assessment
        maturity_level = "Initial"
        if prevention_pct > 25 and conformance_pct > 60:
            maturity_level = "World-Class"
        elif prevention_pct > 15 and conformance_pct > 50:
            maturity_level = "Mature"
        elif prevention_pct > 10 and conformance_pct > 40:
            maturity_level = "Intermediate"
        elif prevention_pct > 5:
            maturity_level = "Basic"
        
        # Recommendations based on current state
        recommendations = []
        
        if prevention_pct < 15:
            recommendations.append("Increase investment in prevention activities to reduce overall quality costs")
        
        if appraisal_pct > 40:
            recommendations.append("Consider optimizing inspection strategies to reduce excessive appraisal costs")
        
        if internal_failure_pct > 30:
            recommendations.append("Focus on reducing internal failures through process improvement and error-proofing")
        
        if external_failure_pct > 20:
            recommendations.append("Prioritize reducing external failures as they have the highest impact on customers")
        
        if nonconformance_pct > 70:
            recommendations.append("Shift investment from failure costs to prevention and appraisal")
        
        # Create result
        result = {
            'summary': summary,
            'prevention_costs': prevention_costs,
            'appraisal_costs': appraisal_costs,
            'internal_failure_costs': internal_failure_costs,
            'external_failure_costs': external_failure_costs,
            'maturity_level': maturity_level,
            'recommendations': recommendations
        }
        
        return result
    
    def calculate_spc_roi(
        self,
        initial_investment: float,
        monthly_costs: List[float],
        monthly_benefits: List[float],
        time_horizon: int = 24  # Months
    ) -> Dict[str, Any]:
        """
        Calculate Return on Investment (ROI) for SPC implementation.
        
        Args:
            initial_investment: Initial implementation cost
            monthly_costs: List of ongoing monthly costs
            monthly_benefits: List of monthly benefits from implementation
            time_horizon: Analysis time horizon in months
            
        Returns:
            Dictionary with ROI analysis
        """
        # Pad or truncate monthly lists to match time_horizon
        if len(monthly_costs) < time_horizon:
            monthly_costs = monthly_costs + [monthly_costs[-1]] * (time_horizon - len(monthly_costs))
        else:
            monthly_costs = monthly_costs[:time_horizon]
        
        if len(monthly_benefits) < time_horizon:
            monthly_benefits = monthly_benefits + [monthly_benefits[-1]] * (time_horizon - len(monthly_benefits))
        else:
            monthly_benefits = monthly_benefits[:time_horizon]
        
        # Calculate cumulative costs and benefits
        cumulative_costs = [initial_investment]
        for cost in monthly_costs:
            cumulative_costs.append(cumulative_costs[-1] + cost)
        
        cumulative_benefits = [0]  # No benefits in month 0
        for benefit in monthly_benefits:
            cumulative_benefits.append(cumulative_benefits[-1] + benefit)
        
        # Calculate net benefits
        net_benefits = [b - c for b, c in zip(cumulative_benefits, cumulative_costs)]
        
        # Calculate ROI for each month
        monthly_roi = []
        for i in range(len(net_benefits)):
            if cumulative_costs[i] > 0:
                roi = 100 * net_benefits[i] / cumulative_costs[i]
                monthly_roi.append(roi)
            else:
                monthly_roi.append(0)
        
        # Find break-even point
        break_even_month = None
        for i in range(len(net_benefits)):
            if net_benefits[i] >= 0:
                break_even_month = i
                break
        
        # Calculate final ROI
        final_roi = monthly_roi[-1] if monthly_roi else 0
        
        # Calculate payback period (interpolated)
        payback_period = None
        if break_even_month is not None:
            if break_even_month == 0:
                payback_period = 0
            else:
                # Interpolate between months for more accurate payback period
                prev_net = net_benefits[break_even_month - 1]
                curr_net = net_benefits[break_even_month]
                fraction = -prev_net / (curr_net - prev_net) if curr_net != prev_net else 0
                payback_period = break_even_month - 1 + fraction
        
        # Calculate NPV (Net Present Value) with 10% annual discount rate
        monthly_discount_rate = 0.10 / 12  # 10% annual rate converted to monthly
        
        npv = -initial_investment
        for i in range(len(monthly_benefits)):
            net_cashflow = monthly_benefits[i] - monthly_costs[i]
            npv += net_cashflow / ((1 + monthly_discount_rate) ** (i + 1))
        
        # Calculate IRR (Internal Rate of Return)
        # Approximate IRR using cash flows
        cash_flows = [-initial_investment]
        for i in range(len(monthly_benefits)):
            cash_flows.append(monthly_benefits[i] - monthly_costs[i])
        
        # Function for NPV at a given discount rate
        def npv_at_rate(rate):
            result = cash_flows[0]  # Initial investment
            for i in range(1, len(cash_flows)):
                result += cash_flows[i] / ((1 + rate) ** i)
            return result
        
        # Find IRR using bisection method
        irr = None
        try:
            # Check if IRR calculation is feasible
            if npv_at_rate(0) * npv_at_rate(1) < 0:
                # Use optimization to find IRR
                def objective(rate):
                    return abs(npv_at_rate(rate))
                
                result = optimize.minimize_scalar(objective, bounds=(0, 1), method='bounded')
                if result.success:
                    irr = result.x * 12  # Convert monthly to annual rate
            else:
                # Can't find IRR in range [0, 1]
                if npv_at_rate(0) > 0:
                    irr = 1.0 * 12  # IRR is very high (>100% annual)
                else:
                    irr = 0.0  # IRR is negative
        except:
            irr = None
        
        # Prepare ROI data
        roi_data = {
            'months': list(range(len(monthly_roi))),
            'cumulative_costs': [float(c) for c in cumulative_costs],
            'cumulative_benefits': [float(b) for b in cumulative_benefits],
            'net_benefits': [float(n) for n in net_benefits],
            'monthly_roi': [float(r) for r in monthly_roi]
        }
        
        # Create result
        result = {
            'initial_investment': float(initial_investment),
            'total_costs': float(cumulative_costs[-1]),
            'total_benefits': float(cumulative_benefits[-1]),
            'net_benefit': float(net_benefits[-1]),
            'roi_percent': float(final_roi),
            'break_even_month': int(break_even_month) if break_even_month is not None else None,
            'payback_period': float(payback_period) if payback_period is not None else None,
            'npv': float(npv),
            'irr_annual': float(irr) if irr is not None else None,
            'time_horizon': time_horizon,
            'roi_data': roi_data
        }
        
        return result