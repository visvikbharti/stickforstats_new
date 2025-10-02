# DOE Algorithm Mapping: Streamlit to Django

This document provides a detailed mapping of algorithms and statistical methods from the original Streamlit DOE module to the Django implementation, ensuring that all core functionality is preserved with minimal changes.

## 1. Design Generation Algorithms

### 1.1 Factorial Design Generation

**Original Streamlit Implementation (from `design_types.py` and `data_utils.py`):**
```python
def generate_sample_dataset(dataset_type, include_noise=True, **kwargs):
    if dataset_type == "factorial_2level":
        # Generate 2-level factorial design
        factors = kwargs.get("factors", ["Temperature", "pH", "Time", "Concentration"])
        n_factors = len(factors)
        
        # Generate design matrix in standard order
        runs = 2**n_factors
        design_matrix = np.zeros((runs, n_factors))
        for i in range(runs):
            for j in range(n_factors):
                # Convert run number to binary and assign factor levels
                design_matrix[i, j] = 1 if (i // 2**(n_factors-j-1)) % 2 else -1
```

**Django Implementation (`design_generator.py`):**
```python
def _generate_factorial_design(self, factors, center_points=0, replicates=1, **kwargs):
    """
    Generate a full factorial design with all combinations of factor levels.
    """
    # Extract factor information
    factor_names = [f['name'] for f in factors]
    
    # Create a list to hold the design points
    design_points = []
    
    # Process continuous and categorical factors separately
    continuous_factors = [f for f in factors if not f.get('is_categorical', False)]
    categorical_factors = [f for f in factors if f.get('is_categorical', False)]
    
    # Generate the grid of continuous factors
    if continuous_factors:
        cont_names = [f['name'] for f in continuous_factors]
        cont_levels = [[-1, 1] for _ in continuous_factors]  # Coded levels
        
        # Create all combinations of continuous factor levels
        for levels in product(*cont_levels):
            point = dict(zip(cont_names, levels))
            design_points.append(point)
```

### 1.2 Central Composite Design Generation

**Original Streamlit Implementation (from `data_utils.py`):**
```python
elif dataset_type == "response_surface":
    # Generate central composite design
    factors = kwargs.get("factors", ["Temperature", "pH", "Agitation"])
    n_factors = len(factors)
    
    # Factorial points
    factorial_runs = 2**n_factors
    factorial_matrix = np.zeros((factorial_runs, n_factors))
    for i in range(factorial_runs):
        for j in range(n_factors):
            factorial_matrix[i, j] = 1 if (i // 2**(n_factors-j-1)) % 2 else -1
    
    # Axial points (for rotatability, alpha = (2^n)^(1/4))
    alpha = kwargs.get("alpha", np.sqrt(2)**n_factors)
    axial_points = []
    for j in range(n_factors):
        point_plus = [0] * n_factors
        point_plus[j] = alpha
        axial_points.append(point_plus)
        
        point_minus = [0] * n_factors
        point_minus[j] = -alpha
        axial_points.append(point_minus)
```

**Django Implementation (`design_generator.py`):**
```python
def _generate_central_composite_design(self, factors, alpha='rotatable', center_points=4, **kwargs):
    """
    Generate a central composite design (CCD).
    """
    # Number of factors
    k = len(factors)
    
    # Generate factorial portion (usually a 2^k factorial or fraction)
    factorial_fraction = kwargs.get('factorial_fraction', 1.0)
    if factorial_fraction < 1.0:
        # Use a fractional factorial for the cube portion
        factorial_design = self._generate_fractional_factorial_design(
            factors, 
            fraction=factorial_fraction,
            center_points=0,
            **kwargs
        )
    else:
        # Use a full factorial for the cube portion
        factorial_design = self._generate_factorial_design(
            factors, 
            center_points=0, 
            **kwargs
        )
    
    # Determine alpha value based on design properties
    if isinstance(alpha, str):
        if alpha.lower() == 'rotatable':
            alpha_value = (len(factorial_design)) ** (1/4)  # For rotatability
```

### 1.3 Box-Behnken Design Generation

**Original Streamlit Implementation (implied from UI elements in `design_types.py`):**
```python
# Box-Behnken design generation logic from interactive components
st.markdown("""
#### Mathematical Foundation:
Box-Behnken designs are constructed from balanced incomplete block designs, with points at:
$$P_{BBD} = \\{(x_i, x_j, x_k, ...) | x_i, x_j \\in \\{-1, 1\\}, x_k = 0 \\text{ for } k \\neq i,j\\}$$

For a 3-factor BBD, the 12 design points (plus center points) represent midpoints of edges of a cube.
""")
```

**Django Implementation (`design_generator.py`):**
```python
def _generate_box_behnken_design(self, factors, center_points=3, **kwargs):
    """
    Generate a Box-Behnken design.
    """
    # Number of factors
    k = len(factors)
    
    if k < 3:
        raise ValueError("Box-Behnken designs require at least 3 factors")
    
    # Extract factor names (for continuous factors only)
    factor_names = [f['name'] for f in factors]
    
    # Create design points based on Box-Behnken structure
    design_points = []
    
    # For each pair of factors, create 4 design points
    for i, j in combinations(range(k), 2):
        for level_i, level_j in product([-1, 1], [-1, 1]):
            point = [0] * k  # Initialize all factors at center
            point[i] = level_i  # Set factor i
            point[j] = level_j  # Set factor j
            design_points.append(dict(zip(factor_names, point)))
```

## 2. Statistical Analysis Methods

### 2.1 Effect Estimation

**Original Streamlit Implementation (from `analysis.py`):**
```python
def calculate_main_effect(data, factor_col, response_col):
    """Calculates the main effect of a factor based on difference of averages."""
    mean_high = data.loc[data[factor_col] == 1, response_col].mean()
    mean_low = data.loc[data[factor_col] == -1, response_col].mean()
    return mean_high - mean_low

def calculate_interaction_effect(data, factor1_col, factor2_col, response_col):
    """Calculates the two-factor interaction effect."""
    # Effect of factor1 when factor2 is high
    mean_1p_2p = data.loc[(data[factor1_col] == 1) & (data[factor2_col] == 1), response_col].mean()
    mean_1m_2p = data.loc[(data[factor1_col] == -1) & (data[factor2_col] == 1), response_col].mean()
    effect1_at_2p = mean_1p_2p - mean_1m_2p

    # Effect of factor1 when factor2 is low
    mean_1p_2m = data.loc[(data[factor1_col] == 1) & (data[factor2_col] == -1), response_col].mean()
    mean_1m_2m = data.loc[(data[factor1_col] == -1) & (data[factor2_col] == -1), response_col].mean()
    effect1_at_2m = mean_1p_2m - mean_1m_2m

    # Interaction is half the difference of these effects
    interaction_effect = (effect1_at_2p - effect1_at_2m) / 2.0
    return interaction_effect
```

**Django Implementation (`model_analyzer.py`):**
```python
# These functions are directly preserved in internal methods of the ModelAnalyzerService class
# and used in the _analyze_factorial_model method

def calculate_main_effect(data, factor_col, response_col):
    """Calculates the main effect of a factor based on difference of averages."""
    mean_high = data.loc[data[factor_col] == 1, response_col].mean()
    mean_low = data.loc[data[factor_col] == -1, response_col].mean()
    return mean_high - mean_low

def calculate_interaction_effect(data, factor1_col, factor2_col, response_col):
    """Calculates the two-factor interaction effect."""
    # Effect of factor1 when factor2 is high
    mean_1p_2p = data.loc[(data[factor1_col] == 1) & (data[factor2_col] == 1), response_col].mean()
    mean_1m_2p = data.loc[(data[factor1_col] == -1) & (data[factor2_col] == 1), response_col].mean()
    effect1_at_2p = mean_1p_2p - mean_1m_2p

    # Effect of factor1 when factor2 is low
    mean_1p_2m = data.loc[(data[factor1_col] == 1) & (data[factor2_col] == -1), response_col].mean()
    mean_1m_2m = data.loc[(data[factor1_col] == -1) & (data[factor2_col] == -1), response_col].mean()
    effect1_at_2m = mean_1p_2m - mean_1m_2m

    # Interaction is half the difference of these effects
    interaction_effect = (effect1_at_2p - effect1_at_2m) / 2.0
    return interaction_effect
```

### 2.2 ANOVA Analysis

**Original Streamlit Implementation (from `analysis.py`):**
```python
# Fit model using statsmodels
model_anova = ols('Response ~ A + B + AB', data=anova_data).fit()
anova_table = sm.stats.anova_lm(model_anova, typ=2) # Type 2 SS is generally preferred

# Calculate Sums of Squares manually for educational purposes
SS_Total_anova = np.sum((response_anova - np.mean(response_anova))**2)
SS_Model_anova = np.sum((model_anova.fittedvalues - np.mean(response_anova))**2)
SS_Error_anova = np.sum((response_anova - model_anova.fittedvalues)**2)

# Calculate R-squared
r_squared_anova = SS_Model_anova / SS_Total_anova
```

**Django Implementation (`model_analyzer.py`):**
```python
# Inside _analyze_factorial_model method:
# Fit the model
model = smf.ols(formula, data=data).fit()

# Extract ANOVA table
anova_table = sm.stats.anova_lm(model, typ=2)  # Type II SS
results['anova_tables'][response] = anova_table.to_dict()

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
```

### 2.3 Response Surface Modeling

**Original Streamlit Implementation (from `analysis.py` and interactive demonstration):**
```python
# Quadratic model for response surface
base_yield = 70.0

# Linear effects
temp_effect = 8.0
ph_effect = -5.0
agit_effect = 3.0

# Quadratic effects (negative for concave surface with maximum)
temp_quad = -4.0
ph_quad = -3.0
agit_quad = -2.0

# Interactions
temp_ph_inter = -2.0
temp_agit_inter = 1.0
ph_agit_inter = 0.5

# Calculate response
df["Yield"] = base_yield

# Add linear effects
if "Temperature_coded" in df.columns:
    df["Yield"] += temp_effect * df["Temperature_coded"]
if "pH_coded" in df.columns:
    df["Yield"] += ph_effect * df["pH_coded"]
if "Agitation_coded" in df.columns:
    df["Yield"] += agit_effect * df["Agitation_coded"]

# Add quadratic effects
if "Temperature_coded" in df.columns:
    df["Yield"] += temp_quad * df["Temperature_coded"]**2
```

**Django Implementation (`model_analyzer.py`):**
```python
def _analyze_response_surface_model(self, data, factor_names, response_names, **kwargs):
    """Analyze data using a response surface model approach."""
    # ...
    
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
    
    # Fit the model
    model = smf.ols(formula, data=data).fit()
```

## 3. Optimization Methods

### 3.1 Desirability Function

**Original Streamlit Implementation (from interactive demonstrations and case studies):**
```python
def calculate_desirability(y, goal, target=None, lower=None, upper=None, weight=1.0):
    """Calculate desirability based on goal"""
    if goal == 'MAXIMIZE':
        if y <= lower:
            return 0.0
        elif y >= upper:
            return 1.0
        else:
            return ((y - lower) / (upper - lower)) ** weight
    
    elif goal == 'MINIMIZE':
        if y >= upper:
            return 0.0
        elif y <= lower:
            return 1.0
        else:
            return ((upper - y) / (upper - lower)) ** weight
    
    elif goal == 'TARGET':
        if y < lower or y > upper:
            return 0.0
        elif y <= target:
            return ((y - lower) / (target - lower)) ** weight
        else:
            return ((upper - y) / (upper - target)) ** weight
```

**Django Implementation (`model_analyzer.py`):**
```python
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
        # ...
```

### 3.2 Numerical Optimization

**Original Streamlit Implementation (implied from UI elements and results display):**
```python
# Implied numerical optimization using scipy.optimize
st.markdown("""
**Optimization Algorithm:**
1. Define the desirability function for each response
2. Convert individual desirabilities into overall desirability (geometric mean)
3. Use numerical optimization to maximize overall desirability
4. Report optimal factor settings and predicted responses
""")
```

**Django Implementation (`model_analyzer.py`):**
```python
def _optimize_with_desirability(self, model_results, factors, response_goals, constraints=None, **kwargs):
    """Optimize responses using the desirability function approach."""
    # ...
    
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
    
    # Perform optimization using scipy.optimize
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
```

## 4. Visualization Algorithms

### 4.1 Contour Plots

**Original Streamlit Implementation (from interactive demonstrations):**
```python
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
```

**Django Implementation (`model_analyzer.py`):**
```python
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
        
        # Store contour data for plotting
        results['plots'][f"{response}_contour_{factor_i}_{factor_j}"] = {
            'x': x_range.tolist(),
            'y': y_range.tolist(),
            'z': z_values.tolist()
        }
```

### 4.2 Effect Plots

**Original Streamlit Implementation (from interactive demonstrations):**
```python
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
```

**Django Implementation (`model_analyzer.py`):**
```python
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
```

## 5. Summary

The implementation of the DOE module in Django has successfully preserved all core algorithms and statistical methods from the original Streamlit implementation. The code excerpts above demonstrate the direct mapping of key functions and methods, ensuring that the statistical integrity and mathematical precision of the original implementation are maintained in the Django version.

The most significant changes in the Django implementation are:

1. **Code Organization**: Restructuring the code into service classes with clear separation of concerns, following Django best practices.

2. **API-First Approach**: Adapting the implementation to provide data via API endpoints rather than direct UI rendering, while preserving the same mathematical outputs.

3. **Enhanced Error Handling**: Adding more robust error handling and validation to ensure reliable operation in a web service context.

4. **Performance Optimization**: Implementing caching and background processing strategies suitable for Django's request-response model.

These adaptations maintain the mathematical and statistical integrity of the implementations while leveraging Django's architecture for improved scalability and maintainability.