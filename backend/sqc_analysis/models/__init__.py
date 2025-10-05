"""
Models for the SQC Analysis module.
"""

from sqc_analysis.models.models import (
    ControlChartAnalysis,
    ProcessCapabilityAnalysis,
    AcceptanceSamplingPlan,
    MeasurementSystemAnalysis,
    SPCImplementationPlan
)

from sqc_analysis.models.economic_design import EconomicDesignAnalysis

# For backwards compatibility
from sqc_analysis.models.models import EconomicDesign