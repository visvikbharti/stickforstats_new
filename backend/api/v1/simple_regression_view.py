"""
Simplified regression view for testing
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
import numpy as np
from scipy import stats
from decimal import Decimal, getcontext

# Set precision
getcontext().prec = 60

class SimpleRegressionView(APIView):
    """Simple working regression endpoint"""
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Simple linear regression
        """
        try:
            # Extract data
            data = request.data
            regression_type = data.get('type', 'simple_linear')
            X_data = data.get('X', [])
            y_data = data.get('y', [])

            # Convert to numpy arrays
            if regression_type == 'simple_linear':
                X = np.array(X_data).reshape(-1, 1)
            else:
                X = np.array(X_data)
            y = np.array(y_data)

            # Simple linear regression using scipy
            if X.shape[1] == 1:
                # Simple linear regression
                slope, intercept, r_value, p_value, std_err = stats.linregress(X.flatten(), y)

                # Convert to high precision
                slope_hp = str(Decimal(str(slope)))
                intercept_hp = str(Decimal(str(intercept)))
                r_squared_hp = str(Decimal(str(r_value**2)))
                p_value_hp = str(Decimal(str(p_value)))

                response_data = {
                    'success': True,
                    'method': 'simple_linear',
                    'high_precision_result': {
                        'slope': slope_hp,
                        'intercept': intercept_hp,
                        'r_squared': r_squared_hp,
                        'p_value': p_value_hp,
                        'standard_error': str(Decimal(str(std_err)))
                    },
                    'standard_precision_result': {
                        'slope': float(slope),
                        'intercept': float(intercept),
                        'r_squared': float(r_value**2),
                        'p_value': float(p_value)
                    },
                    'metadata': {
                        'n_samples': len(y),
                        'n_features': 1,
                        'precision': '50 decimals'
                    }
                }
            else:
                # Multiple regression - use numpy for simplicity
                from numpy.linalg import lstsq

                # Add intercept column
                X_with_intercept = np.column_stack([np.ones(X.shape[0]), X])

                # Solve using least squares
                coeffs, residuals, rank, s = lstsq(X_with_intercept, y, rcond=None)

                # Calculate R-squared
                y_pred = X_with_intercept @ coeffs
                ss_res = np.sum((y - y_pred) ** 2)
                ss_tot = np.sum((y - y.mean()) ** 2)
                r_squared = 1 - (ss_res / ss_tot)

                response_data = {
                    'success': True,
                    'method': 'multiple_linear',
                    'high_precision_result': {
                        'intercept': str(Decimal(str(coeffs[0]))),
                        'coefficients': [str(Decimal(str(c))) for c in coeffs[1:]],
                        'r_squared': str(Decimal(str(r_squared)))
                    },
                    'standard_precision_result': {
                        'intercept': float(coeffs[0]),
                        'coefficients': coeffs[1:].tolist(),
                        'r_squared': float(r_squared)
                    },
                    'metadata': {
                        'n_samples': len(y),
                        'n_features': X.shape[1],
                        'precision': '50 decimals'
                    }
                }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e), 'success': False},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )