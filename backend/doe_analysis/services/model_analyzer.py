import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf
from scipy import stats
from scipy import optimize
from itertools import combinations, product

class ModelAnalyzerService:
    """
    Service for analyzing experimental design data, fitting models, and performing
    optimization based on the model results. This implementation preserves the core
    analysis algorithms from the original StickForStats DOE Streamlit module.
    """
    
    def analyze_model(self, design_type, data, factor_names, response_names, analysis_type, **kwargs):
        """
        Analyze experimental data and create statistical models.
        
        Parameters:
        -----------
        design_type : str
            Type of design that generated the data (FACTORIAL, CENTRAL_COMPOSITE, etc.)
        data : pandas.DataFrame
            Dataframe containing experimental data
        factor_names : list
            List of factor column names
        response_names : list
            List of response column names to analyze
        analysis_type : str
            Type of analysis to perform (FACTORIAL, RESPONSE_SURFACE, etc.)
        **kwargs : dict
            Additional parameters for specific analysis types
        
        Returns:
        --------
        dict
            Dictionary containing analysis results including ANOVA tables, 
            model coefficients, model equations, statistics, and plots.
        """
        results = {
            'anova_tables': {},
            'model_coefficients': {},
            'model_equations': {},
            'model_statistics': {},
            'plots': {}
        }
        
        # Prepare data for analysis
        analysis_data = self._prepare_data_for_analysis(data, factor_names, response_names)
        
        # Perform the appropriate analysis based on analysis_type
        if analysis_type == 'FACTORIAL':
            results = self._analyze_factorial_model(analysis_data, factor_names, response_names, **kwargs)
        elif analysis_type == 'RESPONSE_SURFACE':
            results = self._analyze_response_surface_model(analysis_data, factor_names, response_names, **kwargs)
        elif analysis_type == 'SCREENING':
            results = self._analyze_screening_model(analysis_data, factor_names, response_names, **kwargs)
        else:
            raise ValueError(f"Unknown analysis type: {analysis_type}")
        
        return results
    
    def optimize_response(self, model_results, factors, response_goals, constraints=None, optimization_type='DESIRABILITY', **kwargs):
        """
        Optimize responses based on model results and specified goals.
        
        Parameters:
        -----------
        model_results : dict
            Results from the analyze_model method
        factors : list
            List of factor dictionaries with names, ranges, etc.
        response_goals : dict
            Dictionary of response goals with target, bounds, and weight
        constraints : list
            List of constraint dictionaries
        optimization_type : str
            Type of optimization to perform (DESIRABILITY, GRID_SEARCH, etc.)
        **kwargs : dict
            Additional parameters for specific optimization methods
        
        Returns:
        --------
        dict
            Dictionary containing optimization results including optimal factor 
            settings, predicted responses, and desirability.
        """
        if optimization_type == 'DESIRABILITY':
            results = self._optimize_with_desirability(model_results, factors, response_goals, constraints, **kwargs)
        elif optimization_type == 'GRID_SEARCH':
            results = self._optimize_with_grid_search(model_results, factors, response_goals, constraints, **kwargs)
        elif optimization_type == 'DIRECT':
            results = self._optimize_with_direct_search(model_results, factors, response_goals, constraints, **kwargs)
        else:
            raise ValueError(f"Unknown optimization type: {optimization_type}")
        
        return results
    
    def _prepare_data_for_analysis(self, data, factor_names, response_names):
        """Prepare data for analysis by handling missing values, etc."""
        # Make a copy to avoid modifying the original dataframe
        analysis_data = data.copy()
        
        # Check for missing values in responses
        for response in response_names:
            if response in analysis_data.columns and analysis_data[response].isna().any():
                # Handle missing values - for example by removing rows
                analysis_data = analysis_data.dropna(subset=[response])
        
        # Ensure factors are properly formatted for analysis
        for factor in factor_names:
            if factor in analysis_data.columns:
                # Check if factor is numeric
                if not np.issubdtype(analysis_data[factor].dtype, np.number):
                    # Try to convert categorical factors to numeric codes
                    try:
                        analysis_data[f"{factor}_original"] = analysis_data[factor].copy()
                        analysis_data[factor] = pd.Categorical(analysis_data[factor]).codes
                    except Exception as e:
                        # If conversion fails, create a warning in the results
                        print(f"Warning: Could not convert factor {factor} to numeric: {e}")
        
        return analysis_data
    
    def _analyze_factorial_model(self, data, factor_names, response_names, include_interactions=True, **kwargs):
        """Analyze data using a factorial model approach."""
        results = {
            'anova_tables': {},
            'model_coefficients': {},
            'model_equations': {},
            'model_statistics': {},
            'plots': {}
        }
        
        # Default to including 2-factor interactions unless specified otherwise
        max_interaction_order = kwargs.get('max_interaction_order', 2)
        
        for response in response_names:
            if response not in data.columns:
                continue
            
            # Build the formula for the model
            terms = ['1']  # Intercept
            terms.extend([f"C({factor})" if not np.issubdtype(data[factor].dtype, np.number) 
                         else factor for factor in factor_names])
            
            # Add interaction terms if requested
            if include_interactions and max_interaction_order >= 2:
                for i in range(2, min(max_interaction_order + 1, len(factor_names) + 1)):
                    for combo in combinations(factor_names, i):
                        interaction_term = ":".join([f"C({f})" if not np.issubdtype(data[f].dtype, np.number) 
                                                   else f for f in combo])
                        terms.append(interaction_term)
            
            formula = f"{response} ~ {' + '.join(terms)}"
            
            try:
                # Fit the model
                model = smf.ols(formula, data=data).fit()
                
                # Extract ANOVA table
                anova_table = sm.stats.anova_lm(model, typ=2)  # Type II SS
                results['anova_tables'][response] = anova_table.to_dict()
                
                # Extract model coefficients
                coefficients = {}
                for term, value in model.params.items():
                    coefficients[term] = {
                        'estimate': value,
                        'std_error': model.bse[term],
                        't_value': model.tvalues[term],
                        'p_value': model.pvalues[term]
                    }
                results['model_coefficients'][response] = coefficients
                
                # Create model equation
                significant_terms = []
                intercept = model.params['Intercept']
                significant_terms.append(f"{intercept:.4f}")
                
                alpha = kwargs.get('alpha', 0.05)  # Significance level
                
                for term, params in coefficients.items():
                    if term != 'Intercept' and params['p_value'] < alpha:
                        # Format the coefficient with sign
                        coef = params['estimate']
                        if coef >= 0:
                            significant_terms.append(f"+ {coef:.4f}*{term}")
                        else:
                            significant_terms.append(f"- {abs(coef):.4f}*{term}")
                
                model_equation = " ".join(significant_terms)
                results['model_equations'][response] = model_equation
                
                # Model statistics
                results['model_statistics'][response] = {
                    'r_squared': model.rsquared,
                    'adj_r_squared': model.rsquared_adj,
                    'f_value': model.fvalue,
                    'p_value': model.f_pvalue,
                    'rmse': np.sqrt(np.mean(model.resid ** 2)),
                    'aic': model.aic,
                    'bic': model.bic
                }
                
                # Generate diagnostic plots
                # For residual vs predicted
                results['plots'][f"{response}_residual_vs_predicted"] = {
                    'predicted': model.fittedvalues.tolist(),
                    'residuals': model.resid.tolist()
                }
                
                # For normal probability plot
                results['plots'][f"{response}_normal_probability"] = model.resid.tolist()
                
                # For effects plots (limited to max response visualization complexity)
                if len(factor_names) <= 4:  # Limit visualization complexity
                    for factor in factor_names:
                        if np.issubdtype(data[factor].dtype, np.number):
                            # Create effect plot data if factor is numeric
                            x_range = np.linspace(data[factor].min(), data[factor].max(), 30)
                            y_values = []
                            
                            # Set other factors to their mean values
                            fixed_factors = {f: data[f].mean() for f in factor_names if f != factor}
                            
                            for x in x_range:
                                # Create a prediction point
                                pred_point = fixed_factors.copy()
                                pred_point[factor] = x
                                pred_point = pd.DataFrame([pred_point])
                                
                                # Predict the response
                                try:
                                    y_pred = model.predict(pred_point)[0]
                                    y_values.append(y_pred)
                                except Exception as e:
                                    # If prediction fails, skip this point
                                    y_values.append(None)
                            
                            results['plots'][f"{response}_{factor}_effect"] = {
                                'x': x_range.tolist(),
                                'y': y_values
                            }
            
            except Exception as e:
                # Log the error and continue with the next response
                print(f"Error analyzing {response}: {e}")
                results['anova_tables'][response] = {"error": str(e)}
                results['model_coefficients'][response] = {"error": str(e)}
                results['model_equations'][response] = f"Error: {str(e)}"
                results['model_statistics'][response] = {"error": str(e)}
        
        return results
    
    def _analyze_response_surface_model(self, data, factor_names, response_names, **kwargs):
        """Analyze data using a response surface model approach."""
        results = {
            'anova_tables': {},
            'model_coefficients': {},
            'model_equations': {},
            'model_statistics': {},
            'plots': {}
        }
        
        # Include quadratic terms for RSM
        include_quadratic = kwargs.get('include_quadratic', True)
        
        for response in response_names:
            if response not in data.columns:
                continue
            
            # Build the formula for the model
            terms = ['1']  # Intercept
            
            # Add linear terms
            terms.extend(factor_names)
            
            # Add quadratic terms if requested
            if include_quadratic:
                for factor in factor_names:
                    terms.append(f"I({factor}**2)")
            
            # Add two-factor interaction terms
            for i, j in combinations(range(len(factor_names)), 2):
                terms.append(f"{factor_names[i]}:{factor_names[j]}")
            
            formula = f"{response} ~ {' + '.join(terms)}"
            
            try:
                # Fit the model
                model = smf.ols(formula, data=data).fit()
                
                # Extract ANOVA table
                anova_table = sm.stats.anova_lm(model, typ=2)  # Type II SS
                results['anova_tables'][response] = anova_table.to_dict()
                
                # Extract model coefficients
                coefficients = {}
                for term, value in model.params.items():
                    term_name = term
                    if "I(" in term and "**2" in term:
                        # Convert I(X**2) to X^2 for readability
                        term_name = term.replace("I(", "").replace("**2)", "^2")
                    
                    coefficients[term_name] = {
                        'estimate': value,
                        'std_error': model.bse[term],
                        't_value': model.tvalues[term],
                        'p_value': model.pvalues[term]
                    }
                
                results['model_coefficients'][response] = coefficients
                
                # Create model equation
                significant_terms = []
                intercept = model.params['Intercept']
                significant_terms.append(f"{intercept:.4f}")
                
                alpha = kwargs.get('alpha', 0.05)  # Significance level
                
                for term, params in model.params.items():
                    if term != 'Intercept':
                        # Format the coefficient with sign
                        coef = params
                        term_name = term
                        if "I(" in term and "**2" in term:
                            # Convert I(X**2) to X^2 for readability
                            term_name = term.replace("I(", "").replace("**2)", "^2")
                        
                        if coef >= 0:
                            significant_terms.append(f"+ {coef:.4f}*{term_name}")
                        else:
                            significant_terms.append(f"- {abs(coef):.4f}*{term_name}")
                
                model_equation = " ".join(significant_terms)
                results['model_equations'][response] = model_equation
                
                # Model statistics
                results['model_statistics'][response] = {
                    'r_squared': model.rsquared,
                    'adj_r_squared': model.rsquared_adj,
                    'f_value': model.fvalue,
                    'p_value': model.f_pvalue,
                    'rmse': np.sqrt(np.mean(model.resid ** 2)),
                    'aic': model.aic,
                    'bic': model.bic
                }
                
                # Generate diagnostic plots
                # For residual vs predicted
                results['plots'][f"{response}_residual_vs_predicted"] = {
                    'predicted': model.fittedvalues.tolist(),
                    'residuals': model.resid.tolist()
                }
                
                # For normal probability plot
                results['plots'][f"{response}_normal_probability"] = model.resid.tolist()
                
                # Create response surface plots for pairs of factors
                if len(factor_names) >= 2:
                    for i, j in combinations(range(min(len(factor_names), 3)), 2):
                        factor_i = factor_names[i]
                        factor_j = factor_names[j]
                        
                        # Create a grid of points for the surface
                        x_range = np.linspace(data[factor_i].min(), data[factor_i].max(), 20)
                        y_range = np.linspace(data[factor_j].min(), data[factor_j].max(), 20)
                        x_grid, y_grid = np.meshgrid(x_range, y_range)
                        
                        # Set other factors to their mean values
                        fixed_factors = {f: data[f].mean() for f in factor_names if f != factor_i and f != factor_j}
                        
                        # Create prediction points
                        z_values = np.zeros_like(x_grid)
                        for ii in range(len(x_range)):
                            for jj in range(len(y_range)):
                                pred_point = fixed_factors.copy()
                                pred_point[factor_i] = x_grid[jj, ii]
                                pred_point[factor_j] = y_grid[jj, ii]
                                pred_point = pd.DataFrame([pred_point])
                                
                                try:
                                    z_values[jj, ii] = model.predict(pred_point)[0]
                                except Exception as e:
                                    # If prediction fails, use NaN
                                    z_values[jj, ii] = np.nan
                        
                        # Store surface data for plotting
                        results['plots'][f"{response}_surface_{factor_i}_{factor_j}"] = {
                            'x': x_grid.tolist(),
                            'y': y_grid.tolist(),
                            'z': z_values.tolist()
                        }
                        
                        # Store contour data for plotting
                        results['plots'][f"{response}_contour_{factor_i}_{factor_j}"] = {
                            'x': x_range.tolist(),
                            'y': y_range.tolist(),
                            'z': z_values.tolist()
                        }
            
            except Exception as e:
                # Log the error and continue with the next response
                print(f"Error analyzing {response} with RSM: {e}")
                results['anova_tables'][response] = {"error": str(e)}
                results['model_coefficients'][response] = {"error": str(e)}
                results['model_equations'][response] = f"Error: {str(e)}"
                results['model_statistics'][response] = {"error": str(e)}
        
        return results
    
    def _analyze_screening_model(self, data, factor_names, response_names, **kwargs):
        """Analyze data using a screening model approach (main effects only)."""
        # This is a simplified version that focuses only on main effects
        kwargs['include_interactions'] = False
        return self._analyze_factorial_model(data, factor_names, response_names, **kwargs)
    
    def _optimize_with_desirability(self, model_results, factors, response_goals, constraints=None, **kwargs):
        """Optimize responses using the desirability function approach."""
        results = {
            'optimal_solutions': [],
            'plots': {}
        }
        
        # Extract model coefficients and equations
        model_coefficients = model_results.get('model_coefficients', {})
        model_equations = model_results.get('model_equations', {})
        
        if not model_coefficients or not model_equations:
            raise ValueError("Model results must contain coefficients and equations")
        
        # Define the desirability function for each response
        def calculate_desirability(y, goal, target=None, lower=None, upper=None, weight=1.0):
            """Calculate the desirability of a response value based on the goal."""
            if goal == 'MAXIMIZE':
                if upper is None or lower is None:
                    raise ValueError("Upper and lower bounds required for MAXIMIZE goal")
                if y <= lower:
                    return 0.0
                elif y >= upper:
                    return 1.0
                else:
                    return ((y - lower) / (upper - lower)) ** weight
            
            elif goal == 'MINIMIZE':
                if upper is None or lower is None:
                    raise ValueError("Upper and lower bounds required for MINIMIZE goal")
                if y >= upper:
                    return 0.0
                elif y <= lower:
                    return 1.0
                else:
                    return ((upper - y) / (upper - lower)) ** weight
            
            elif goal == 'TARGET':
                if target is None or upper is None or lower is None:
                    raise ValueError("Target, upper, and lower bounds required for TARGET goal")
                if y < lower or y > upper:
                    return 0.0
                elif y <= target:
                    return ((y - lower) / (target - lower)) ** weight
                else:
                    return ((upper - y) / (upper - target)) ** weight
            
            elif goal == 'RANGE':
                if upper is None or lower is None:
                    raise ValueError("Upper and lower bounds required for RANGE goal")
                if y < lower or y > upper:
                    return 0.0
                else:
                    return 1.0
            
            else:
                raise ValueError(f"Unknown goal: {goal}")
        
        # Create prediction functions for each response
        def create_prediction_function(response, coefficients):
            """Create a function that predicts the response value from factor settings."""
            def predict(factor_settings):
                """Predict the response value from factor settings."""
                result = coefficients.get('Intercept', {}).get('estimate', 0.0)
                
                # Add linear terms
                for factor, value in factor_settings.items():
                    if factor in coefficients:
                        result += coefficients[factor]['estimate'] * value
                
                # Add quadratic terms
                for factor, value in factor_settings.items():
                    quad_term = f"{factor}^2"
                    if quad_term in coefficients:
                        result += coefficients[quad_term]['estimate'] * value ** 2
                
                # Add interaction terms
                for i, j in combinations(factor_settings.keys(), 2):
                    interaction_term = f"{i}:{j}"
                    if interaction_term in coefficients:
                        result += coefficients[interaction_term]['estimate'] * factor_settings[i] * factor_settings[j]
                
                return result
            
            return predict
        
        prediction_functions = {}
        for response, coeffs in model_coefficients.items():
            prediction_functions[response] = create_prediction_function(response, coeffs)
        
        # Define the objective function for optimization
        def objective_function(x):
            """Objective function that calculates the overall desirability."""
            # Convert x (array) to factor settings (dict)
            factor_settings = {}
            for i, factor in enumerate(factors):
                factor_settings[factor['name']] = x[i]
            
            # Calculate predicted responses
            predicted_responses = {}
            individual_desirabilities = []
            
            for response, goal_info in response_goals.items():
                if response in prediction_functions:
                    predicted_value = prediction_functions[response](factor_settings)
                    predicted_responses[response] = predicted_value
                    
                    # Calculate individual desirability
                    goal = goal_info.get('goal', 'MAXIMIZE')
                    d = calculate_desirability(
                        predicted_value,
                        goal,
                        target=goal_info.get('target'),
                        lower=goal_info.get('lower_bound'),
                        upper=goal_info.get('upper_bound'),
                        weight=goal_info.get('weight', 1.0)
                    )
                    individual_desirabilities.append(d)
            
            # Calculate overall desirability (geometric mean)
            if individual_desirabilities:
                # Use arithmetic mean if any desirability is 0 (to avoid overall 0)
                if 0.0 in individual_desirabilities:
                    overall_d = sum(individual_desirabilities) / len(individual_desirabilities)
                else:
                    overall_d = np.prod(individual_desirabilities) ** (1.0 / len(individual_desirabilities))
                
                # Return negative since we're minimizing
                return -overall_d
            else:
                return 0.0  # No valid responses
        
        # Define constraint functions if constraints are provided
        constraint_functions = []
        if constraints:
            for i, constraint in enumerate(constraints):
                factor = constraint.get('factor')
                lower = constraint.get('lower_bound')
                upper = constraint.get('upper_bound')
                
                if factor and (lower is not None or upper is not None):
                    # Find the index of the factor
                    factor_idx = next((i for i, f in enumerate(factors) if f['name'] == factor), None)
                    
                    if factor_idx is not None:
                        if lower is not None:
                            # x[factor_idx] >= lower
                            constraint_functions.append({
                                'type': 'ineq',
                                'fun': lambda x, idx=factor_idx, lb=lower: x[idx] - lb
                            })
                        
                        if upper is not None:
                            # x[factor_idx] <= upper
                            constraint_functions.append({
                                'type': 'ineq',
                                'fun': lambda x, idx=factor_idx, ub=upper: ub - x[idx]
                            })
        
        # Set up bounds for optimization
        bounds = []
        for factor in factors:
            if factor.get('is_categorical', False):
                # Categorical factors need more complex handling - simplified for demonstration
                categories = factor.get('categories', [])
                if categories:
                    # Use the index bounds for optimization
                    bounds.append((0, len(categories) - 1))
                else:
                    # Default bounds
                    bounds.append((-1, 1))
            else:
                # Use the factor range for bounds, or default to coded range
                low = factor.get('low_level', -1)
                high = factor.get('high_level', 1)
                bounds.append((low, high))
        
        # Set up initial points for optimization
        n_starts = kwargs.get('n_starts', 10)
        initial_points = []
        
        # First point: center of the design space
        initial_points.append([(b[0] + b[1]) / 2 for b in bounds])
        
        # Add corner points of the design space
        corners = list(product(*[[-1, 1] for _ in range(len(factors))]))
        for corner in corners[:min(len(corners), n_starts - 1)]:
            # Map coded corners to actual bounds
            point = [bounds[i][0] if val == -1 else bounds[i][1] for i, val in enumerate(corner)]
            initial_points.append(point)
        
        # Add random points if needed
        while len(initial_points) < n_starts:
            point = [np.random.uniform(b[0], b[1]) for b in bounds]
            initial_points.append(point)
        
        # Perform optimization from multiple starting points
        optimization_results = []
        
        for start_point in initial_points:
            try:
                if constraint_functions:
                    result = optimize.minimize(
                        objective_function,
                        start_point,
                        method='SLSQP',
                        bounds=bounds,
                        constraints=constraint_functions,
                        options={'maxiter': 1000}
                    )
                else:
                    result = optimize.minimize(
                        objective_function,
                        start_point,
                        method='L-BFGS-B',
                        bounds=bounds,
                        options={'maxiter': 1000}
                    )
                
                if result.success:
                    # Convert optimal point to factor settings
                    factor_settings = {}
                    for i, factor in enumerate(factors):
                        factor_settings[factor['name']] = result.x[i]
                    
                    # Calculate predicted responses
                    predicted_responses = {}
                    for response in response_goals.keys():
                        if response in prediction_functions:
                            predicted_responses[response] = prediction_functions[response](factor_settings)
                    
                    # Calculate desirabilities
                    individual_desirabilities = {}
                    for response, goal_info in response_goals.items():
                        if response in predicted_responses:
                            goal = goal_info.get('goal', 'MAXIMIZE')
                            individual_desirabilities[response] = calculate_desirability(
                                predicted_responses[response],
                                goal,
                                target=goal_info.get('target'),
                                lower=goal_info.get('lower_bound'),
                                upper=goal_info.get('upper_bound'),
                                weight=goal_info.get('weight', 1.0)
                            )
                    
                    # Calculate overall desirability
                    d_values = list(individual_desirabilities.values())
                    if d_values:
                        if 0.0 in d_values:
                            overall_d = sum(d_values) / len(d_values)
                        else:
                            overall_d = np.prod(d_values) ** (1.0 / len(d_values))
                    else:
                        overall_d = 0.0
                    
                    optimization_results.append({
                        'factor_settings': factor_settings,
                        'predicted_responses': predicted_responses,
                        'individual_desirabilities': individual_desirabilities,
                        'desirability': overall_d,
                        'success': result.success,
                        'message': result.message
                    })
            except Exception as e:
                # Log the error and continue with the next starting point
                print(f"Optimization error from starting point {start_point}: {e}")
        
        # Sort solutions by desirability in descending order
        optimization_results.sort(key=lambda x: x.get('desirability', 0.0), reverse=True)
        
        # Add top solutions to results
        max_solutions = kwargs.get('max_solutions', 5)
        for solution in optimization_results[:max_solutions]:
            # Format the solution for the final results
            formatted_solution = {
                'factor_settings': solution['factor_settings'],
                'predicted_responses': solution['predicted_responses'],
                'desirability': solution['desirability']
            }
            results['optimal_solutions'].append(formatted_solution)
        
        # Generate contour plots for the top solution if at least 2 factors
        if results['optimal_solutions'] and len(factors) >= 2:
            top_solution = results['optimal_solutions'][0]
            
            # Generate contour plots for pairs of factors
            for i, j in combinations(range(min(len(factors), 3)), 2):
                factor_i = factors[i]['name']
                factor_j = factors[j]['name']
                
                # Create a grid of points
                x_range = np.linspace(bounds[i][0], bounds[i][1], 20)
                y_range = np.linspace(bounds[j][0], bounds[j][1], 20)
                x_grid, y_grid = np.meshgrid(x_range, y_range)
                
                # Calculate desirability at each grid point
                z_values = np.zeros_like(x_grid)
                
                # Set other factors to their optimal values
                fixed_factors = {f['name']: top_solution['factor_settings'][f['name']] 
                               for f in factors if f['name'] != factor_i and f['name'] != factor_j}
                
                for ii in range(len(x_range)):
                    for jj in range(len(y_range)):
                        # Create a point with varied factors i and j, others fixed at optimal
                        x = np.zeros(len(factors))
                        for k, factor in enumerate(factors):
                            if factor['name'] == factor_i:
                                x[k] = x_range[ii]
                            elif factor['name'] == factor_j:
                                x[k] = y_range[jj]
                            else:
                                x[k] = top_solution['factor_settings'][factor['name']]
                        
                        # Calculate desirability at this point
                        z_values[jj, ii] = -objective_function(x)
                
                # Store the contour data
                results['plots'][f"desirability_contour_{factor_i}_{factor_j}"] = {
                    'x': x_range.tolist(),
                    'y': y_range.tolist(),
                    'z': z_values.tolist(),
                    'optimal_x': top_solution['factor_settings'][factor_i],
                    'optimal_y': top_solution['factor_settings'][factor_j]
                }
        
        return results
    
    def _optimize_with_grid_search(self, model_results, factors, response_goals, constraints=None, **kwargs):
        """Optimize responses using a grid search approach."""
        # Similar to desirability optimization but using a grid search instead of numerical optimization
        
        results = {
            'optimal_solutions': [],
            'plots': {}
        }
        
        # Extract model coefficients
        model_coefficients = model_results.get('model_coefficients', {})
        
        if not model_coefficients:
            raise ValueError("Model results must contain coefficients")
        
        # Create prediction functions for each response
        prediction_functions = {}
        for response, coeffs in model_coefficients.items():
            prediction_functions[response] = self._create_prediction_function(response, coeffs)
        
        # Define desirability function
        calculate_desirability = self._calculate_desirability_function()
        
        # Set up grid for search
        grid_points = kwargs.get('grid_points', 10)
        
        # Create grid for each factor
        factor_grids = []
        for factor in factors:
            if factor.get('is_categorical', False):
                # Use categories directly
                categories = factor.get('categories', [])
                if categories:
                    factor_grids.append((factor['name'], categories))
                else:
                    # Default for categorical with no categories
                    factor_grids.append((factor['name'], [-1, 1]))
            else:
                # Create a linear grid for continuous factors
                low = factor.get('low_level', -1)
                high = factor.get('high_level', 1)
                grid = np.linspace(low, high, grid_points)
                factor_grids.append((factor['name'], grid))
        
        # Generate all combinations of factor settings
        grid_points = []
        
        # Use itertools.product to generate all combinations
        for settings in product(*[grid[1] for grid in factor_grids]):
            factor_settings = {factor_grids[i][0]: settings[i] for i in range(len(factor_grids))}
            grid_points.append(factor_settings)
        
        # Apply constraints to filter grid points
        if constraints:
            filtered_points = []
            for point in grid_points:
                valid = True
                for constraint in constraints:
                    factor = constraint.get('factor')
                    lower = constraint.get('lower_bound')
                    upper = constraint.get('upper_bound')
                    
                    if factor in point:
                        if lower is not None and point[factor] < lower:
                            valid = False
                            break
                        if upper is not None and point[factor] > upper:
                            valid = False
                            break
                
                if valid:
                    filtered_points.append(point)
            
            grid_points = filtered_points
        
        # Evaluate each grid point
        evaluated_points = []
        
        for factor_settings in grid_points:
            # Calculate predicted responses
            predicted_responses = {}
            individual_desirabilities = {}
            
            for response, goal_info in response_goals.items():
                if response in prediction_functions:
                    predicted_value = prediction_functions[response](factor_settings)
                    predicted_responses[response] = predicted_value
                    
                    # Calculate individual desirability
                    goal = goal_info.get('goal', 'MAXIMIZE')
                    d = calculate_desirability(
                        predicted_value,
                        goal,
                        target=goal_info.get('target'),
                        lower=goal_info.get('lower_bound'),
                        upper=goal_info.get('upper_bound'),
                        weight=goal_info.get('weight', 1.0)
                    )
                    individual_desirabilities[response] = d
            
            # Calculate overall desirability
            d_values = list(individual_desirabilities.values())
            if d_values:
                if 0.0 in d_values:
                    overall_d = sum(d_values) / len(d_values)
                else:
                    overall_d = np.prod(d_values) ** (1.0 / len(d_values))
            else:
                overall_d = 0.0
            
            evaluated_points.append({
                'factor_settings': factor_settings,
                'predicted_responses': predicted_responses,
                'individual_desirabilities': individual_desirabilities,
                'desirability': overall_d
            })
        
        # Sort by desirability
        evaluated_points.sort(key=lambda x: x.get('desirability', 0.0), reverse=True)
        
        # Add top solutions to results
        max_solutions = kwargs.get('max_solutions', 5)
        for solution in evaluated_points[:max_solutions]:
            # Format the solution for the final results
            formatted_solution = {
                'factor_settings': solution['factor_settings'],
                'predicted_responses': solution['predicted_responses'],
                'desirability': solution['desirability']
            }
            results['optimal_solutions'].append(formatted_solution)
        
        return results
    
    def _optimize_with_direct_search(self, model_results, factors, response_goals, constraints=None, **kwargs):
        """
        Optimize using direct search methods like Nelder-Mead simplex.
        This method is useful when gradient information is not available.
        """
        # Similar to desirability optimization but using direct search methods
        
        # Define objective function and constraints
        # Perform optimization using Nelder-Mead or similar
        # Return results in the same format as other optimization methods
        
        # For this implementation, we'll use a simplifed approach based on the desirability method
        return self._optimize_with_desirability(
            model_results, 
            factors, 
            response_goals, 
            constraints, 
            **dict(kwargs, method='Nelder-Mead')
        )
    
    def _create_prediction_function(self, response, coefficients):
        """Create a function that predicts a response value from factor settings."""
        def predict(factor_settings):
            """Predict the response value from factor settings."""
            result = coefficients.get('Intercept', {}).get('estimate', 0.0)
            
            # Add linear terms
            for factor, value in factor_settings.items():
                if factor in coefficients:
                    result += coefficients[factor]['estimate'] * value
            
            # Add quadratic terms
            for factor, value in factor_settings.items():
                quad_term = f"{factor}^2"
                if quad_term in coefficients:
                    result += coefficients[quad_term]['estimate'] * value ** 2
            
            # Add interaction terms
            for i, j in combinations(factor_settings.keys(), 2):
                interaction_term = f"{i}:{j}"
                if interaction_term in coefficients:
                    result += coefficients[interaction_term]['estimate'] * factor_settings[i] * factor_settings[j]
            
            return result
        
        return predict
    
    def _calculate_desirability_function(self):
        """Define the desirability function for response optimization."""
        def calculate_desirability(y, goal, target=None, lower=None, upper=None, weight=1.0):
            """Calculate the desirability of a response value based on the goal."""
            if goal == 'MAXIMIZE':
                if upper is None or lower is None:
                    raise ValueError("Upper and lower bounds required for MAXIMIZE goal")
                if y <= lower:
                    return 0.0
                elif y >= upper:
                    return 1.0
                else:
                    return ((y - lower) / (upper - lower)) ** weight
            
            elif goal == 'MINIMIZE':
                if upper is None or lower is None:
                    raise ValueError("Upper and lower bounds required for MINIMIZE goal")
                if y >= upper:
                    return 0.0
                elif y <= lower:
                    return 1.0
                else:
                    return ((upper - y) / (upper - lower)) ** weight
            
            elif goal == 'TARGET':
                if target is None or upper is None or lower is None:
                    raise ValueError("Target, upper, and lower bounds required for TARGET goal")
                if y < lower or y > upper:
                    return 0.0
                elif y <= target:
                    return ((y - lower) / (target - lower)) ** weight
                else:
                    return ((upper - y) / (upper - target)) ** weight
            
            elif goal == 'RANGE':
                if upper is None or lower is None:
                    raise ValueError("Upper and lower bounds required for RANGE goal")
                if y < lower or y > upper:
                    return 0.0
                else:
                    return 1.0
            
            else:
                raise ValueError(f"Unknown goal: {goal}")
        
        return calculate_desirability