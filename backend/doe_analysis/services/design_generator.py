import numpy as np
import pandas as pd
from itertools import combinations, product
import math
from scipy.stats import norm

class DesignGeneratorService:
    """
    Service for generating different types of experimental designs based on user specifications.
    This implementation preserves the core design generation algorithms from the original StickForStats
    DOE Streamlit module.
    """
    
    def generate_design(self, design_type, factors, **kwargs):
        """
        Generate an experimental design matrix based on the specified design type and factors.
        
        Parameters:
        -----------
        design_type : str
            Type of design to generate (FACTORIAL, FRACTIONAL_FACTORIAL, CENTRAL_COMPOSITE, etc.)
        factors : list
            List of factor dictionaries, each containing name, levels, and other properties
        **kwargs : dict
            Additional parameters specific to the design type
            
        Returns:
        --------
        pandas.DataFrame
            A dataframe containing the design matrix
        """
        if design_type == "FACTORIAL":
            return self._generate_factorial_design(factors, **kwargs)
        elif design_type == "FRACTIONAL_FACTORIAL":
            return self._generate_fractional_factorial_design(factors, **kwargs)
        elif design_type == "CENTRAL_COMPOSITE":
            return self._generate_central_composite_design(factors, **kwargs)
        elif design_type == "BOX_BEHNKEN":
            return self._generate_box_behnken_design(factors, **kwargs)
        elif design_type == "PLACKETT_BURMAN":
            return self._generate_plackett_burman_design(factors, **kwargs)
        elif design_type == "LATIN_SQUARE":
            return self._generate_latin_square_design(factors, **kwargs)
        elif design_type == "TAGUCHI":
            return self._generate_taguchi_design(factors, **kwargs)
        elif design_type == "DEFINITIVE_SCREENING":
            return self._generate_definitive_screening_design(factors, **kwargs)
        elif design_type == "MIXTURE":
            return self._generate_mixture_design(factors, **kwargs)
        elif design_type == "OPTIMAL":
            return self._generate_optimal_design(factors, **kwargs)
        else:
            raise ValueError(f"Unsupported design type: {design_type}")
    
    def _generate_factorial_design(self, factors, center_points=0, replicates=1, **kwargs):
        """
        Generate a full factorial design with all combinations of factor levels.
        
        Parameters:
        -----------
        factors : list
            List of factor dictionaries
        center_points : int
            Number of center points to add (for continuous factors)
        replicates : int
            Number of replications of the entire design
        
        Returns:
        --------
        pandas.DataFrame
            A dataframe containing the design matrix
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
        else:
            # If no continuous factors, add a dummy point that will be expanded with categoricals
            design_points.append({})
        
        # Expand with categorical factors
        if categorical_factors:
            expanded_points = []
            for point in design_points:
                # For each existing point, create all combinations with categorical factors
                cat_names = [f['name'] for f in categorical_factors]
                cat_levels = [f.get('categories', []) for f in categorical_factors]
                
                for cat_values in product(*cat_levels):
                    new_point = point.copy()
                    new_point.update(dict(zip(cat_names, cat_values)))
                    expanded_points.append(new_point)
            
            design_points = expanded_points
        
        # Convert to DataFrame
        design_df = pd.DataFrame(design_points)
        
        # Add center points if requested and if we have continuous factors
        if center_points > 0 and continuous_factors:
            center_data = {f['name']: 0 for f in continuous_factors}
            for f in categorical_factors:
                # For categorical factors, use the first category as the "center"
                center_data[f['name']] = f.get('categories', [])[0]
            
            center_df = pd.DataFrame([center_data] * center_points)
            design_df = pd.concat([design_df, center_df], ignore_index=True)
        
        # Replicate the design if requested
        if replicates > 1:
            design_df = pd.concat([design_df] * replicates, ignore_index=True)
        
        # Add run order
        design_df.insert(0, 'run_order', range(1, len(design_df) + 1))
        
        # Convert coded values to actual values for continuous factors
        for factor in continuous_factors:
            name = factor['name']
            if name in design_df.columns:
                low = factor.get('low_level')
                high = factor.get('high_level')
                center = factor.get('center_point')
                
                if low is not None and high is not None:
                    midpoint = (high + low) / 2
                    half_range = (high - low) / 2
                    actual_values = midpoint + design_df[name] * half_range
                    design_df[f"{name}_actual"] = actual_values.round(4)
        
        return design_df
    
    def _generate_fractional_factorial_design(self, factors, fraction=1/2, resolution=None, **kwargs):
        """
        Generate a fractional factorial design.
        
        Parameters:
        -----------
        factors : list
            List of factor dictionaries
        fraction : float
            Fraction of the full factorial design (1/2, 1/4, 1/8, etc.)
        resolution : int
            Minimum resolution of the design (III, IV, V)
        
        Returns:
        --------
        pandas.DataFrame
            A dataframe containing the design matrix
        """
        # Total number of factors
        k = len(factors)
        
        # Determine p for the 2^(k-p) design
        p = int(round(math.log2(1/fraction)))
        
        # Verify that p is not negative or too large
        if p < 0 or p >= k:
            raise ValueError(f"Invalid fraction ({fraction}) for {k} factors")
        
        # Generate a full factorial for the first k-p factors
        base_factors = factors[:k-p]
        base_design = self._generate_factorial_design(base_factors, **kwargs)
        
        # Get the column names for the base design
        base_columns = [f['name'] for f in base_factors]
        
        # Create generator columns for the additional factors
        additional_factors = factors[k-p:]
        
        # If resolution is specified, ensure we use appropriate generators
        # This is a simplified approach
        if resolution and resolution >= 3:
            # For Resolution III or higher, ensure no main effect is aliased with another main effect
            # For Resolution IV or higher, ensure no main effect is aliased with any 2-factor interaction
            # For Resolution V or higher, ensure no 2-factor interaction is aliased with another 2-factor interaction
            
            # Generate all possible 2-factor interaction columns as candidates for generators
            interaction_candidates = []
            for i, j in combinations(range(len(base_columns)), 2):
                col_i = base_design[base_columns[i]].values
                col_j = base_design[base_columns[j]].values
                interaction_candidates.append((f"{base_columns[i]}*{base_columns[j]}", col_i * col_j))
            
            # If resolution is IV or higher, add 3-factor interactions as candidates
            if resolution >= 4 and len(base_columns) >= 3:
                for i, j, l in combinations(range(len(base_columns)), 3):
                    col_i = base_design[base_columns[i]].values
                    col_j = base_design[base_columns[j]].values
                    col_l = base_design[base_columns[l]].values
                    interaction_candidates.append(
                        (f"{base_columns[i]}*{base_columns[j]}*{base_columns[l]}", col_i * col_j * col_l)
                    )
            
            # Select generators based on resolution requirements
            generators = []
            for i, factor in enumerate(additional_factors):
                if i < len(interaction_candidates):
                    generators.append((factor['name'], interaction_candidates[i][1]))
                else:
                    # Fallback to lower resolution if not enough candidates
                    interaction_level = 4
                    while not generators and interaction_level <= len(base_columns):
                        for combo in combinations(range(len(base_columns)), interaction_level):
                            cols = [base_design[base_columns[c]].values for c in combo]
                            generator = cols[0]
                            for col in cols[1:]:
                                generator = generator * col
                            generators.append((factor['name'], generator))
                            break
                        interaction_level += 1
                    
                    if not generators:
                        raise ValueError(f"Could not find suitable generator for factor {factor['name']}")
        else:
            # Simple approach: Use main effects and their interactions as generators
            generators = []
            for i, factor in enumerate(additional_factors):
                if i == 0 and len(base_columns) >= 2:
                    # Use a 2-factor interaction for the first additional factor
                    col_0 = base_design[base_columns[0]].values
                    col_1 = base_design[base_columns[1]].values
                    generators.append((factor['name'], col_0 * col_1))
                elif i == 1 and len(base_columns) >= 3:
                    # Use another 2-factor interaction for the second additional factor
                    col_0 = base_design[base_columns[0]].values
                    col_2 = base_design[base_columns[2]].values
                    generators.append((factor['name'], col_0 * col_2))
                else:
                    # Use higher order interactions for additional factors
                    group_size = min(i + 2, len(base_columns))
                    cols = [base_design[base_columns[c]].values for c in range(group_size)]
                    generator = cols[0]
                    for col in cols[1:]:
                        generator = generator * col
                    generators.append((factor['name'], generator))
        
        # Add the additional columns to the design
        for name, column in generators:
            base_design[name] = column
        
        # Add run order if not already present
        if 'run_order' not in base_design.columns:
            base_design.insert(0, 'run_order', range(1, len(base_design) + 1))
        
        # Convert coded values to actual values for continuous factors
        for factor in factors:
            if not factor.get('is_categorical', False):
                name = factor['name']
                if name in base_design.columns:
                    low = factor.get('low_level')
                    high = factor.get('high_level')
                    center = factor.get('center_point')
                    
                    if low is not None and high is not None:
                        midpoint = (high + low) / 2
                        half_range = (high - low) / 2
                        base_design[f"{name}_actual"] = (midpoint + base_design[name] * half_range).round(4)
        
        return base_design
    
    def _generate_central_composite_design(self, factors, alpha='rotatable', center_points=4, **kwargs):
        """
        Generate a central composite design (CCD).
        
        Parameters:
        -----------
        factors : list
            List of factor dictionaries
        alpha : str or float
            Type of CCD ('rotatable', 'orthogonal', 'spherical') or custom alpha value
        center_points : int
            Number of center points
        
        Returns:
        --------
        pandas.DataFrame
            A dataframe containing the design matrix
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
            elif alpha.lower() == 'orthogonal':
                # Formula for orthogonal design
                n_f = len(factorial_design)
                alpha_value = ((n_f * (1 + center_points / n_f)) ** 0.5) / k ** 0.5
            elif alpha.lower() == 'spherical':
                alpha_value = k ** 0.5  # For spherical design
            else:
                raise ValueError(f"Unknown alpha type: {alpha}")
        else:
            # Use custom alpha value
            alpha_value = float(alpha)
        
        # Generate star points
        star_points = []
        
        for i, factor in enumerate(factors):
            # For each factor, create two star points (one at +alpha, one at -alpha)
            for alpha_level in [-alpha_value, alpha_value]:
                point = {f['name']: 0 for f in factors}  # Initialize all factors at center
                point[factor['name']] = alpha_level  # Set the current factor to alpha level
                star_points.append(point)
        
        star_design = pd.DataFrame(star_points)
        
        # Generate center points
        center_data = [{f['name']: 0 for f in factors} for _ in range(center_points)]
        center_design = pd.DataFrame(center_data)
        
        # Combine all parts
        design_df = pd.concat([factorial_design, star_design, center_design], ignore_index=True)
        
        # Add run order if not already present
        if 'run_order' not in design_df.columns:
            design_df.insert(0, 'run_order', range(1, len(design_df) + 1))
        
        # Convert coded values to actual values for continuous factors
        for factor in factors:
            if not factor.get('is_categorical', False):
                name = factor['name']
                if name in design_df.columns:
                    low = factor.get('low_level')
                    high = factor.get('high_level')
                    center = factor.get('center_point', (low + high) / 2 if low is not None and high is not None else None)
                    
                    if low is not None and high is not None:
                        midpoint = center if center is not None else (high + low) / 2
                        half_range = (high - low) / 2
                        design_df[f"{name}_actual"] = (midpoint + design_df[name] * half_range / alpha_value).round(4)
        
        return design_df
    
    def _generate_box_behnken_design(self, factors, center_points=3, **kwargs):
        """
        Generate a Box-Behnken design.
        
        Parameters:
        -----------
        factors : list
            List of factor dictionaries
        center_points : int
            Number of center points
        
        Returns:
        --------
        pandas.DataFrame
            A dataframe containing the design matrix
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
        
        # Add center points
        center_point = {name: 0 for name in factor_names}
        for _ in range(center_points):
            design_points.append(center_point.copy())
        
        # Convert to DataFrame
        design_df = pd.DataFrame(design_points)
        
        # Add run order
        design_df.insert(0, 'run_order', range(1, len(design_df) + 1))
        
        # Convert coded values to actual values for continuous factors
        for factor in factors:
            if not factor.get('is_categorical', False):
                name = factor['name']
                if name in design_df.columns:
                    low = factor.get('low_level')
                    high = factor.get('high_level')
                    
                    if low is not None and high is not None:
                        midpoint = (high + low) / 2
                        half_range = (high - low) / 2
                        design_df[f"{name}_actual"] = (midpoint + design_df[name] * half_range).round(4)
        
        return design_df
    
    def _generate_plackett_burman_design(self, factors, **kwargs):
        """
        Generate a Plackett-Burman design.
        
        Parameters:
        -----------
        factors : list
            List of factor dictionaries
        
        Returns:
        --------
        pandas.DataFrame
            A dataframe containing the design matrix
        """
        # Number of factors
        k = len(factors)
        
        # Determine the design size (next power of 4 that is >= k+1)
        n = 4
        while n - 1 < k:
            n *= 2
        
        # If n > 100, suggest fractional factorial instead
        if n > 100:
            raise ValueError(f"Design would require {n} runs. Consider using a fractional factorial design instead.")
        
        # Create first row of PB design
        if n == 8:
            first_row = [1, 1, 1, -1, 1, -1, -1]
        elif n == 12:
            first_row = [1, 1, 1, 1, 1, 1, -1, -1, -1, 1, -1]
        elif n == 16:
            first_row = [1, 1, 1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1, -1]
        elif n == 20:
            first_row = [1, 1, 1, 1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
        elif n == 24:
            first_row = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
        else:
            # Fallback to a general algorithm for other sizes
            # In practice, would implement a more sophisticated generator
            raise ValueError(f"Plackett-Burman design size {n} not directly supported")
        
        # Generate the full design matrix by cyclic shifting
        design_matrix = [first_row]
        for i in range(1, n-1):
            # Shift previous row by one position to get new row
            new_row = design_matrix[i-1][n-2:n-1] + design_matrix[i-1][0:n-2]
            design_matrix.append(new_row)
        
        # Add the final row of all -1's
        design_matrix.append([-1] * (n-1))
        
        # Extract columns for our factors
        factor_names = [f['name'] for f in factors]
        design_dict = {factor_names[i]: [row[i] for row in design_matrix] for i in range(min(k, n-1))}
        
        # Create DataFrame
        design_df = pd.DataFrame(design_dict)
        
        # Add run order
        design_df.insert(0, 'run_order', range(1, len(design_df) + 1))
        
        # Convert coded values to actual values for continuous factors
        for factor in factors:
            if not factor.get('is_categorical', False):
                name = factor['name']
                if name in design_df.columns:
                    low = factor.get('low_level')
                    high = factor.get('high_level')
                    
                    if low is not None and high is not None:
                        midpoint = (high + low) / 2
                        half_range = (high - low) / 2
                        design_df[f"{name}_actual"] = (midpoint + design_df[name] * half_range).round(4)
        
        return design_df
    
    def _generate_latin_square_design(self, factors, **kwargs):
        """
        Generate a Latin Square design.
        
        Parameters:
        -----------
        factors : list
            List of factor dictionaries (requires exactly 3 factors)
        
        Returns:
        --------
        pandas.DataFrame
            A dataframe containing the design matrix
        """
        if len(factors) != 3:
            raise ValueError("Latin Square design requires exactly 3 factors")
        
        # Get the number of levels for each factor (should be equal)
        levels = []
        for factor in factors:
            if factor.get('is_categorical', False):
                levels.append(len(factor.get('categories', [])))
            else:
                # For continuous factors, use 2 levels by default
                levels.append(2)
        
        n = levels[0]
        if not all(lev == n for lev in levels):
            raise ValueError("All factors must have the same number of levels in a Latin Square design")
        
        # Generate a standard Latin Square
        base_square = np.array([[(i + j) % n for j in range(n)] for i in range(n)])
        
        # Each row of the Latin Square will be a run in the design
        design_points = []
        for i in range(n):
            for j in range(n):
                point = {
                    factors[0]['name']: i,
                    factors[1]['name']: j,
                    factors[2]['name']: base_square[i, j]
                }
                design_points.append(point)
        
        # Convert to DataFrame
        design_df = pd.DataFrame(design_points)
        
        # Add run order
        design_df.insert(0, 'run_order', range(1, len(design_df) + 1))
        
        # Map factor levels to actual values
        for i, factor in enumerate(factors):
            name = factor['name']
            if factor.get('is_categorical', False):
                # Map to categorical levels
                categories = factor.get('categories', [])
                if categories:
                    design_df[name] = design_df[name].apply(lambda x: categories[int(x % len(categories))])
            else:
                # Map to continuous actual values
                if factor.get('low_level') is not None and factor.get('high_level') is not None:
                    low = factor.get('low_level')
                    high = factor.get('high_level')
                    
                    # Linearly map 0...n-1 to low...high
                    design_df[f"{name}_coded"] = design_df[name].copy()
                    design_df[name] = low + (design_df[name] / (n - 1)) * (high - low)
        
        return design_df
    
    def _generate_taguchi_design(self, factors, **kwargs):
        """
        Generate a Taguchi design using orthogonal arrays.
        
        Parameters:
        -----------
        factors : list
            List of factor dictionaries
        
        Returns:
        --------
        pandas.DataFrame
            A dataframe containing the design matrix
        """
        # Count factors with different numbers of levels
        factor_levels = {}
        for factor in factors:
            if factor.get('is_categorical', False):
                levels = len(factor.get('categories', []))
            else:
                # Default to 2 levels for continuous factors
                levels = 2
            
            if levels not in factor_levels:
                factor_levels[levels] = 0
            factor_levels[levels] += 1
        
        # Determine the appropriate orthogonal array
        # This is a simplified approach - a full implementation would have more arrays
        
        # For 2-level factors only
        if list(factor_levels.keys()) == [2]:
            num_factors = factor_levels[2]
            if num_factors <= 3:
                array_name = "L4"  # L4(2^3)
            elif num_factors <= 7:
                array_name = "L8"  # L8(2^7)
            elif num_factors <= 11:
                array_name = "L12" # L12(2^11)
            elif num_factors <= 15:
                array_name = "L16" # L16(2^15)
            else:
                raise ValueError(f"No suitable orthogonal array for {num_factors} 2-level factors")
        
        # For 3-level factors only
        elif list(factor_levels.keys()) == [3]:
            num_factors = factor_levels[3]
            if num_factors <= 4:
                array_name = "L9"  # L9(3^4)
            elif num_factors <= 13:
                array_name = "L27" # L27(3^13)
            else:
                raise ValueError(f"No suitable orthogonal array for {num_factors} 3-level factors")
        
        # Mixed level designs (simplified)
        elif 2 in factor_levels and 3 in factor_levels:
            if factor_levels[2] <= 3 and factor_levels[3] <= 3:
                array_name = "L18" # L18(2^3 × 3^3)
            else:
                raise ValueError(f"No suitable orthogonal array for {factor_levels[2]} 2-level and {factor_levels[3]} 3-level factors")
        else:
            raise ValueError(f"Unsupported factor level combination: {factor_levels}")
        
        # Generate the orthogonal array
        if array_name == "L4":
            array = [
                [-1, -1, -1],
                [1, -1, 1],
                [-1, 1, 1],
                [1, 1, -1]
            ]
        elif array_name == "L8":
            array = [
                [-1, -1, -1, -1, -1, -1, -1],
                [1, -1, -1, -1, 1, 1, 1],
                [-1, 1, -1, 1, -1, 1, 1],
                [1, 1, -1, 1, 1, -1, -1],
                [-1, -1, 1, 1, 1, -1, 1],
                [1, -1, 1, 1, -1, 1, -1],
                [-1, 1, 1, -1, 1, 1, -1],
                [1, 1, 1, -1, -1, -1, 1]
            ]
        elif array_name == "L9":
            array = [
                [-1, -1, -1, -1],
                [-1, 0, 0, 0],
                [-1, 1, 1, 1],
                [0, -1, 0, 1],
                [0, 0, 1, -1],
                [0, 1, -1, 0],
                [1, -1, 1, 0],
                [1, 0, -1, 1],
                [1, 1, 0, -1]
            ]
        elif array_name == "L12":
            # This is actually a Plackett-Burman design
            array = self._get_plackett_burman_array(12)[:, :11]
        elif array_name == "L16":
            # Simplified 2^4 full factorial with fractional portion
            base = np.array(list(product([-1, 1], repeat=4)))
            array = np.zeros((16, 15))
            array[:, :4] = base
            
            # Generate columns for 2-factor interactions
            for i, (a, b) in enumerate(combinations(range(4), 2)):
                array[:, 4+i] = base[:, a] * base[:, b]
            
            # Generate columns for 3-factor interactions
            for i, (a, b, c) in enumerate(combinations(range(4), 3)):
                array[:, 10+i] = base[:, a] * base[:, b] * base[:, c]
            
            # Add the 4-factor interaction
            array[:, 14] = base[:, 0] * base[:, 1] * base[:, 2] * base[:, 3]
        elif array_name == "L18":
            # Simplified L18 array for mixed 2-level and 3-level factors
            array = np.zeros((18, 6))
            
            # First column for runs
            array[:, 0] = np.repeat([-1, 0, 1], 6)
            
            # Columns for 2-level factors (using only -1 and 1)
            array[:, 1] = [-1, -1, -1, -1, -1, -1, 1, 1, 1, 1, 1, 1, -1, -1, -1, 1, 1, 1]
            array[:, 2] = [-1, -1, -1, 1, 1, 1, -1, -1, -1, 1, 1, 1, -1, -1, 1, -1, 1, 1]
            
            # Columns for 3-level factors
            array[:, 3:6] = np.array([
                [-1, -1, -1], [-1, 0, 1], [-1, 1, 0],
                [0, -1, 1], [0, 0, -1], [0, 1, 0],
                [1, -1, 0], [1, 0, -1], [1, 1, 1],
                [-1, 1, 0], [-1, -1, 1], [-1, 0, -1],
                [0, 0, 0], [0, 1, -1], [0, -1, 1],
                [1, -1, -1], [1, 0, 1], [1, 1, 0]
            ])
        elif array_name == "L27":
            # Simplified 3^3 full factorial expanded with columns for interactions
            base = np.array(list(product([-1, 0, 1], repeat=3)))
            array = np.zeros((27, 13))
            array[:, :3] = base
            
            # Generate columns for 2-factor interactions (simplified)
            for i, (a, b) in enumerate(combinations(range(3), 2)):
                for j in range(9):  # 9 combinations of interactions for 3-level factors
                    # This is a simplification - real L27 would use a more sophisticated mapping
                    pattern = np.array([
                        [-1, -1, -1], [-1, 0, 0], [-1, 1, 1],
                        [0, -1, 0], [0, 0, 1], [0, 1, -1],
                        [1, -1, 1], [1, 0, -1], [1, 1, 0]
                    ])
                    array[:, 3+i*3+j] = pattern[base[:, a]+1, base[:, b]+1]
        else:
            raise ValueError(f"Orthogonal array {array_name} not implemented")
        
        # Convert array to DataFrame
        factor_names = [f['name'] for f in factors]
        design_df = pd.DataFrame(array[:, :len(factors)], columns=factor_names)
        
        # Add run order
        design_df.insert(0, 'run_order', range(1, len(design_df) + 1))
        
        # Convert coded values to actual values
        for i, factor in enumerate(factors):
            name = factor['name']
            if factor.get('is_categorical', False):
                # Map coded values to categories
                categories = factor.get('categories', [])
                if categories:
                    # Map the coded values to the categories
                    if len(np.unique(design_df[name])) == 2:  # Binary factor
                        mapping = {-1: categories[0], 1: categories[1]}
                    elif len(np.unique(design_df[name])) == 3:  # Ternary factor
                        mapping = {-1: categories[0], 0: categories[1], 1: categories[2]}
                    else:
                        # Fallback mapping
                        mapping = {val: categories[min(int((val+1)*len(categories)/2), len(categories)-1)] 
                                for val in np.unique(design_df[name])}
                    
                    design_df[name] = design_df[name].map(mapping)
            else:
                # Convert coded values to actual values for continuous factors
                if factor.get('low_level') is not None and factor.get('high_level') is not None:
                    low = factor.get('low_level')
                    high = factor.get('high_level')
                    
                    # Store the coded values
                    design_df[f"{name}_coded"] = design_df[name].copy()
                    
                    # Map coded values to actual values
                    if len(np.unique(design_df[name])) == 2:  # Binary factor
                        design_df[name] = design_df[name].apply(
                            lambda x: low if x < 0 else high
                        )
                    elif len(np.unique(design_df[name])) == 3:  # Ternary factor
                        midpoint = (high + low) / 2
                        design_df[name] = design_df[name].apply(
                            lambda x: low if x < -0.5 else (midpoint if abs(x) <= 0.5 else high)
                        )
                    else:
                        # Linear mapping from min coded to max coded
                        min_coded = design_df[name].min()
                        max_coded = design_df[name].max()
                        design_df[name] = low + (design_df[name] - min_coded) * (high - low) / (max_coded - min_coded)
        
        return design_df
    
    def _get_plackett_burman_array(self, n):
        """Helper method to generate a Plackett-Burman array of size n"""
        if n == 12:
            first_row = np.array([1, 1, 1, 1, 1, 1, -1, -1, -1, 1, -1])
            array = np.zeros((12, 11))
            array[0, :] = first_row
            
            # Generate remaining rows by cyclic shifting
            for i in range(1, 11):
                array[i, :] = np.roll(array[i-1, :], 1)
            
            # Last row is all -1
            array[11, :] = -1
            
            return array
        else:
            raise ValueError(f"Plackett-Burman array size {n} not implemented")
        
    def _generate_definitive_screening_design(self, factors, center_points=1, **kwargs):
        """
        Generate a Definitive Screening Design (DSD).
        
        Parameters:
        -----------
        factors : list
            List of factor dictionaries
        center_points : int
            Number of center points
        
        Returns:
        --------
        pandas.DataFrame
            A dataframe containing the design matrix
        """
        # Number of factors
        k = len(factors)
        
        if k < 3:
            raise ValueError("Definitive Screening Designs require at least 3 factors")
        
        # A DSD has m factors in 2m+1 runs, with the structure:
        # [ Fm ]
        # [-Fm ]
        # [0...0]
        
        # Generate the first m rows (Fm), where Fm is a m×m fold-over design
        Fm = np.zeros((k, k))
        
        # Fill the diagonal with 1
        np.fill_diagonal(Fm, 1)
        
        # Fill the remaining elements with values from -1 to 1
        if k > 1:
            # Generate the first row of the upper triangle
            first_row = np.linspace(-1, 1, k)[1:-1]
            
            # Fill the upper triangle with a pattern that ensures balance
            idx = 0
            for i in range(k):
                for j in range(i+1, k):
                    if idx < len(first_row):
                        Fm[i, j] = first_row[idx]
                        idx = (idx + 1) % len(first_row)
            
            # Fill the lower triangle with values that make rows orthogonal
            for i in range(k):
                for j in range(i):
                    # Use a pattern that ensures orthogonality
                    # In practice, there are more sophisticated algorithms
                    Fm[i, j] = -Fm[j, i]
        
        # Create the full design matrix
        design_matrix = np.vstack([Fm, -Fm, np.zeros((center_points, k))])
        
        # Convert to a DataFrame
        factor_names = [f['name'] for f in factors]
        design_df = pd.DataFrame(design_matrix, columns=factor_names)
        
        # Add run order
        design_df.insert(0, 'run_order', range(1, len(design_df) + 1))
        
        # Convert coded values to actual values
        for factor in factors:
            name = factor['name']
            if not factor.get('is_categorical', False):
                if factor.get('low_level') is not None and factor.get('high_level') is not None:
                    low = factor.get('low_level')
                    high = factor.get('high_level')
                    
                    # Store the coded values
                    design_df[f"{name}_coded"] = design_df[name].copy()
                    
                    # Map coded values to actual values
                    midpoint = (high + low) / 2
                    half_range = (high - low) / 2
                    design_df[name] = midpoint + design_df[name] * half_range
        
        return design_df
    
    def _generate_mixture_design(self, factors, design_type='simplex_lattice', **kwargs):
        """
        Generate a mixture design for experiments with components whose proportions must sum to 1.
        
        Parameters:
        -----------
        factors : list
            List of factor dictionaries (factors should be components of a mixture)
        design_type : str
            Type of mixture design ('simplex_lattice', 'simplex_centroid', 'extreme_vertices')
        
        Returns:
        --------
        pandas.DataFrame
            A dataframe containing the design matrix
        """
        # Extract component names
        component_names = [f['name'] for f in factors]
        n_components = len(component_names)
        
        if n_components < 2:
            raise ValueError("Mixture designs require at least 2 components")
        
        design_points = []
        
        if design_type == 'simplex_lattice':
            # Simplex lattice design
            # Points are created at evenly spaced positions on the simplex
            degree = kwargs.get('degree', 3)
            
            # Generate all combinations that sum to degree
            for combo in product(range(degree + 1), repeat=n_components):
                if sum(combo) == degree:
                    # Convert to proportions
                    point = {component_names[i]: combo[i] / degree for i in range(n_components)}
                    design_points.append(point)
        
        elif design_type == 'simplex_centroid':
            # Simplex centroid design
            # Contains all permutations where one component is 1 and others are 0,
            # all permutations where two components are 1/2 and others are 0, etc.
            
            for r in range(1, n_components + 1):
                for combo in combinations(range(n_components), r):
                    point = {component_names[i]: 0.0 for i in range(n_components)}
                    for idx in combo:
                        point[component_names[idx]] = 1.0 / r
                    design_points.append(point)
        
        elif design_type == 'extreme_vertices':
            # Extreme vertices design
            # Used when there are constraints on the components
            
            # Get constraints from kwargs
            lower_bounds = kwargs.get('lower_bounds', {})
            upper_bounds = kwargs.get('upper_bounds', {})
            
            # Validate constraints
            if not lower_bounds or not upper_bounds:
                raise ValueError("Extreme vertices design requires lower_bounds and upper_bounds")
            
            # Convert constraints to arrays
            lb = np.array([lower_bounds.get(name, 0.0) for name in component_names])
            ub = np.array([upper_bounds.get(name, 1.0) for name in component_names])
            
            # Check feasibility
            if np.sum(lb) > 1 or any(ub < lb):
                raise ValueError("Infeasible constraints for mixture design")
            
            # Generate extreme vertices (simplified approach)
            # This is a complex algorithm that would be more sophisticated in practice
            
            # Start with pure components where possible
            for i in range(n_components):
                if ub[i] == 1.0:
                    point = {component_names[j]: lb[j] if j != i else 1.0 - sum(lb[j] for j in range(n_components) if j != i) 
                            for j in range(n_components)}
                    design_points.append(point)
            
            # Add binary blends where possible
            for i, j in combinations(range(n_components), 2):
                if lb[i] + lb[j] <= 1.0:
                    # Set i and j to their upper bounds, subject to the sum constraint
                    point = {component_names[k]: lb[k] for k in range(n_components)}
                    remaining = 1.0 - sum(lb[k] for k in range(n_components))
                    
                    # Allocate remaining to i and j proportionally to their ranges
                    range_i = ub[i] - lb[i]
                    range_j = ub[j] - lb[j]
                    total_range = range_i + range_j
                    
                    if total_range > 0:
                        point[component_names[i]] += remaining * range_i / total_range
                        point[component_names[j]] += remaining * range_j / total_range
                        design_points.append(point)
        
        else:
            raise ValueError(f"Unknown mixture design type: {design_type}")
        
        # Add centroid if requested
        if kwargs.get('include_centroid', True):
            # For a standard mixture design, the centroid is 1/n for each component
            if design_type != 'extreme_vertices':
                centroid = {name: 1.0 / n_components for name in component_names}
                design_points.append(centroid)
            else:
                # For constrained designs, the centroid is more complex
                # Here we use a simple average of all design points
                if design_points:
                    centroid = {name: sum(point[name] for point in design_points) / len(design_points) 
                              for name in component_names}
                    
                    # Normalize to ensure the sum is 1
                    total = sum(centroid.values())
                    centroid = {name: value / total for name, value in centroid.items()}
                    
                    design_points.append(centroid)
        
        # Add axial check blends if requested
        if kwargs.get('axial_points', False):
            # Axial points for standard mixture designs
            if design_type != 'extreme_vertices':
                for i in range(n_components):
                    for distance in [0.3, 0.7]:  # Example distances along axial lines
                        point = {component_names[j]: (1.0 - distance) / (n_components - 1) if j != i else distance 
                                for j in range(n_components)}
                        design_points.append(point)
        
        # Convert to DataFrame
        design_df = pd.DataFrame(design_points)
        
        # Add run order
        design_df.insert(0, 'run_order', range(1, len(design_df) + 1))
        
        # Convert proportions to actual component amounts if ranges are provided
        for factor in factors:
            name = factor['name']
            if factor.get('low_level') is not None and factor.get('high_level') is not None:
                low = factor.get('low_level')
                high = factor.get('high_level')
                
                # Map proportions to actual amounts
                design_df[f"{name}_actual"] = low + design_df[name] * (high - low)
        
        return design_df
    
    def _generate_optimal_design(self, factors, criterion='D', **kwargs):
        """
        Generate an optimal design based on a specified optimality criterion.
        
        Parameters:
        -----------
        factors : list
            List of factor dictionaries
        criterion : str
            Optimality criterion ('D', 'A', 'I', 'G', etc.)
        
        Returns:
        --------
        pandas.DataFrame
            A dataframe containing the design matrix
        """
        # Number of factors
        k = len(factors)
        
        # Number of runs
        n_runs = kwargs.get('n_runs', 2 * k)
        
        # Model terms
        model_terms = kwargs.get('model_terms', ['linear', 'interaction'])
        include_quadratic = 'quadratic' in model_terms
        
        # This is a simplified implementation of optimal design generation
        # In practice, this requires sophisticated algorithms for point selection
        
        # For demonstration, we'll generate a candidate set and select "optimal" points
        
        # Generate a candidate set (typically a factorial grid or space-filling design)
        n_candidates = min(1000, 5 ** k)  # Limit for computational feasibility
        
        if k <= 4:
            # For few factors, use a fine grid
            grid_points = 5
            candidate_points = []
            for combo in product(np.linspace(-1, 1, grid_points), repeat=k):
                candidate_points.append(dict(zip([f['name'] for f in factors], combo)))
        else:
            # For many factors, use a random sampling approach
            candidate_points = []
            for _ in range(n_candidates):
                point = {f['name']: np.random.uniform(-1, 1) for f in factors}
                candidate_points.append(point)
        
        # Convert to DataFrame
        candidate_df = pd.DataFrame(candidate_points)
        
        # Create model matrix based on specified terms
        model_columns = []
        
        # Add intercept column
        candidate_df['intercept'] = 1.0
        model_columns.append('intercept')
        
        # Add linear terms
        for name in [f['name'] for f in factors]:
            model_columns.append(name)
        
        # Add interaction terms if requested
        if 'interaction' in model_terms:
            for i, j in combinations(range(k), 2):
                name_i = factors[i]['name']
                name_j = factors[j]['name']
                interaction_name = f"{name_i}*{name_j}"
                candidate_df[interaction_name] = candidate_df[name_i] * candidate_df[name_j]
                model_columns.append(interaction_name)
        
        # Add quadratic terms if requested
        if include_quadratic:
            for name in [f['name'] for f in factors]:
                quad_name = f"{name}^2"
                candidate_df[quad_name] = candidate_df[name] ** 2
                model_columns.append(quad_name)
        
        # Extract the model matrix
        X_candidates = candidate_df[model_columns].values
        
        # Implement a simplified exchange algorithm for D-optimality
        # This is a very basic implementation - real optimal design algorithms are more sophisticated
        
        # Initial design: randomly select n_runs points
        initial_indices = np.random.choice(len(candidate_df), size=n_runs, replace=False)
        current_indices = initial_indices.copy()
        
        # Simple exchange algorithm
        max_iterations = 100
        for iteration in range(max_iterations):
            # Current design matrix
            X_current = X_candidates[current_indices, :]
            
            # Calculate current criterion value
            if criterion == 'D':
                # D-optimality: maximize determinant of X'X
                current_value = np.linalg.det(X_current.T @ X_current)
            elif criterion == 'A':
                # A-optimality: minimize trace of (X'X)^-1
                current_value = -np.trace(np.linalg.inv(X_current.T @ X_current))
            else:
                # Default to D-optimality
                current_value = np.linalg.det(X_current.T @ X_current)
            
            # Track if design improved
            improved = False
            
            # Try exchanging each point
            for i in range(n_runs):
                # Try replacing with each candidate point not in the design
                for j in range(len(candidate_df)):
                    if j not in current_indices:
                        # Create a new design by replacing point i with point j
                        new_indices = current_indices.copy()
                        new_indices[i] = j
                        
                        # New design matrix
                        X_new = X_candidates[new_indices, :]
                        
                        # Calculate new criterion value
                        if criterion == 'D':
                            new_value = np.linalg.det(X_new.T @ X_new)
                        elif criterion == 'A':
                            new_value = -np.trace(np.linalg.inv(X_new.T @ X_new))
                        else:
                            new_value = np.linalg.det(X_new.T @ X_new)
                        
                        # Check if design improved
                        if new_value > current_value:
                            current_indices = new_indices
                            current_value = new_value
                            improved = True
                            break
                
                if improved:
                    break
            
            # Stop if no improvement
            if not improved:
                break
        
        # Extract the optimal design
        optimal_design = candidate_df.iloc[current_indices].reset_index(drop=True)
        
        # Remove the model matrix columns
        for col in model_columns:
            if col in optimal_design.columns and col not in [f['name'] for f in factors]:
                optimal_design.drop(col, axis=1, inplace=True)
        
        # Add run order
        optimal_design.insert(0, 'run_order', range(1, len(optimal_design) + 1))
        
        # Convert coded values to actual values
        for factor in factors:
            name = factor['name']
            if not factor.get('is_categorical', False):
                if factor.get('low_level') is not None and factor.get('high_level') is not None:
                    low = factor.get('low_level')
                    high = factor.get('high_level')
                    
                    # Store the coded values
                    optimal_design[f"{name}_coded"] = optimal_design[name].copy()
                    
                    # Map coded values to actual values
                    midpoint = (high + low) / 2
                    half_range = (high - low) / 2
                    optimal_design[name] = midpoint + optimal_design[name] * half_range
        
        return optimal_design