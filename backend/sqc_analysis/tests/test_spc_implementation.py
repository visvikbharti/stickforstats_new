"""
Tests for the SPCImplementationService.

Updated 2026-02-20 to match current service response schemas.
"""
import unittest
from datetime import datetime, timedelta
from sqc_analysis.services.spc_implementation_service import SPCImplementationService


class TestSPCImplementationService(unittest.TestCase):
    """Test cases for the SPCImplementationService."""

    def setUp(self):
        """Set up for the tests."""
        self.service = SPCImplementationService()

    def test_generate_implementation_roadmap(self):
        """Test generating an implementation roadmap."""
        implementation_parameters = {
            "organization_size": "medium",
            "industry": "manufacturing",
            "existing_quality_system": "basic",
            "process_complexity": "medium",
            "implementation_scope": "department",
        }

        result = self.service.generate_implementation_roadmap(implementation_parameters)

        # Check that the result contains the expected keys
        self.assertIn("id", result)
        self.assertIn("parameters", result)
        self.assertIn("phases", result)
        self.assertIn("total_duration", result)
        self.assertIn("start_date", result)
        self.assertIn("end_date", result)
        self.assertIn("industry_recommendations", result)
        self.assertIn("created", result)

        # Check that the phases are properly structured
        phases = result["phases"]
        self.assertGreater(len(phases), 0)

        for phase in phases:
            self.assertIn("name", phase)
            self.assertIn("duration", phase)
            self.assertIn("start_date", phase)
            self.assertIn("end_date", phase)
            self.assertIn("activities", phase)

            # Check that activities are defined
            self.assertGreater(len(phase["activities"]), 0)

            # Check each activity has id, name, description
            for activity in phase["activities"]:
                self.assertIn("id", activity)
                self.assertIn("name", activity)
                self.assertIn("description", activity)

        # Check that the dates are valid
        start_date = datetime.strptime(result["start_date"], "%Y-%m-%d")
        end_date = datetime.strptime(result["end_date"], "%Y-%m-%d")
        self.assertLess(start_date, end_date)

        # Check that total duration is sum of phase durations
        total_from_phases = sum(p["duration"] for p in phases)
        self.assertEqual(result["total_duration"], total_from_phases)

        # Check that the end date matches the duration approximately
        expected_end_date = start_date + timedelta(weeks=result["total_duration"])
        self.assertLessEqual(abs((expected_end_date - end_date).days), 7)

        # Check that parameters echo the input
        self.assertEqual(result["parameters"], implementation_parameters)

        # Check industry recommendations are present
        self.assertGreater(len(result["industry_recommendations"]), 0)

    def test_create_control_plan(self):
        """Test creating a control plan."""
        control_plan_items = [
            {
                "process_step": "Material Receipt",
                "characteristic": "Material Purity",
                "specification": "99.5% min",
                "measurement_method": "XRF Analysis",
                "sample_size": 1,
                "control_method": "Certificate of Analysis Review",
                "reaction_plan": "Reject shipment if below specification",
            },
            {
                "process_step": "Mixing",
                "characteristic": "Mix Temperature",
                "specification": "65°C ± 5°C",
                "measurement_method": "Digital Thermometer",
                "sample_size": "Every batch",
                "control_method": "Process Control Chart",
                "reaction_plan": "Adjust heater if outside control limits",
            },
            {
                "process_step": "Filling",
                "characteristic": "Fill Weight",
                "specification": "500g ± 5g",
                "measurement_method": "Digital Scale",
                "sample_size": "n=5, every hour",
                "control_method": "Xbar-R Chart",
                "reaction_plan": "Stop production if outside control limits, adjust filler",
            },
        ]

        metadata = {
            "plan_name": "Product A Manufacturing Control Plan",
            "plan_owner": "Quality Department",
            "revision": "1.0",
            "approval_date": "2025-01-15",
            "process_name": "Product A Manufacturing Process",
        }

        result = self.service.create_control_plan(control_plan_items=control_plan_items, metadata=metadata)

        # Check that the result contains the expected keys
        self.assertIn("items", result)
        self.assertIn("metadata", result)
        self.assertIn("created", result)
        self.assertIn("id", result)

        # Check that the control plan items are included
        items = result["items"]
        self.assertEqual(len(items), len(control_plan_items))

        for i, item in enumerate(items):
            self.assertEqual(item["process_step"], control_plan_items[i]["process_step"])
            self.assertEqual(item["characteristic"], control_plan_items[i]["characteristic"])
            self.assertEqual(item["specification"], control_plan_items[i]["specification"])
            self.assertEqual(item["measurement_method"], control_plan_items[i]["measurement_method"])
            self.assertEqual(item["control_method"], control_plan_items[i]["control_method"])
            self.assertEqual(item["reaction_plan"], control_plan_items[i]["reaction_plan"])

        # Check that the metadata is included
        result_metadata = result["metadata"]
        self.assertEqual(result_metadata["plan_name"], metadata["plan_name"])
        self.assertEqual(result_metadata["plan_owner"], metadata["plan_owner"])
        self.assertEqual(result_metadata["revision"], metadata["revision"])
        self.assertEqual(result_metadata["approval_date"], metadata["approval_date"])
        self.assertEqual(result_metadata["process_name"], metadata["process_name"])

        # Check that created date is reasonable (format: YYYY-MM-DD HH:MM:SS)
        self.assertIsInstance(result["created"], str)
        created_date = datetime.strptime(result["created"], "%Y-%m-%d %H:%M:%S")
        self.assertLessEqual((datetime.now() - created_date).days, 1)

    def test_evaluate_control_plan(self):
        """Test evaluating a control plan."""
        control_plan = {
            "items": [
                {
                    "process_step": "Material Receipt",
                    "characteristic": "Material Purity",
                    "specification": "99.5% min",
                    "measurement_method": "XRF Analysis",
                    "sample_size": 1,
                    "control_method": "Certificate of Analysis Review",
                    "reaction_plan": "Reject shipment if below specification",
                },
                {
                    "process_step": "Mixing",
                    "characteristic": "Mix Temperature",
                    "specification": "65°C ± 5°C",
                    "measurement_method": "Digital Thermometer",
                    "sample_size": "Every batch",
                    "control_method": "Process Control Chart",
                    "reaction_plan": "Adjust heater if outside control limits",
                },
            ],
            "metadata": {
                "plan_name": "Product A Manufacturing Control Plan",
                "plan_owner": "Quality Department",
                "revision": "1.0",
                "approval_date": "2025-01-15",
            },
        }

        result = self.service.evaluate_control_plan(control_plan)

        # Check that the result contains the expected keys
        self.assertIn("completeness_score", result)
        self.assertIn("quality_score", result)
        self.assertIn("dimension_scores", result)
        self.assertIn("issues", result)
        self.assertIn("recommendations", result)

        # Check that scores are within expected range
        self.assertGreaterEqual(result["completeness_score"], 0)
        self.assertLessEqual(result["completeness_score"], 100)
        self.assertGreaterEqual(result["quality_score"], 0)
        self.assertLessEqual(result["quality_score"], 100)

        # Check dimension scores structure
        dimension_scores = result["dimension_scores"]
        expected_dimensions = {
            "specification_quality",
            "control_method_quality",
            "reaction_plan_quality",
            "sample_plan_quality",
        }
        self.assertEqual(set(dimension_scores.keys()), expected_dimensions)

        for dim, score in dimension_scores.items():
            self.assertGreaterEqual(score, 0)
            self.assertLessEqual(score, 100)

        # Check that issues and recommendations are lists
        self.assertIsInstance(result["issues"], list)
        self.assertIsInstance(result["recommendations"], list)

    def test_assess_implementation_maturity(self):
        """Test assessing SPC implementation maturity."""
        assessment_responses = {
            "leadership_commitment": 3,
            "training_competency": 2,
            "system_infrastructure": 4,
            "methods_techniques": 3,
            "process_management": 2,
            "continuous_improvement": 4,
        }

        result = self.service.assess_implementation_maturity(assessment_responses)

        # Check that the result contains the expected keys
        self.assertIn("id", result)
        self.assertIn("overall_score", result)
        self.assertIn("maturity_level", result)
        self.assertIn("dimension_scores", result)
        self.assertIn("created", result)

        # Check that the overall score is calculated correctly
        self.assertGreaterEqual(result["overall_score"], 0)
        self.assertLessEqual(result["overall_score"], 100)

        # Service uses its own 6 dimensions and only counts matching keys
        total_score = sum(
            assessment_responses.get(d, 0)
            for d in [
                "leadership_commitment",
                "training_competency",
                "system_infrastructure",
                "methods_techniques",
                "process_management",
                "continuous_improvement",
            ]
        )
        max_possible = 5 * 6  # 6 dimensions, max 5 each
        expected_score = 100 * total_score / max_possible
        self.assertAlmostEqual(result["overall_score"], expected_score, places=1)

        # Check that maturity level is assigned
        self.assertIn(
            result["maturity_level"], ["Initial", "Managed", "Defined", "Quantitatively Managed", "Optimizing"]
        )

        # Check dimension scores structure
        dimension_scores = result["dimension_scores"]
        expected_dimensions = {
            "leadership_commitment",
            "training_competency",
            "system_infrastructure",
            "methods_techniques",
            "process_management",
            "continuous_improvement",
        }
        self.assertEqual(set(dimension_scores.keys()), expected_dimensions)

        for dim_key, dim_data in dimension_scores.items():
            self.assertIn("name", dim_data)
            self.assertIn("score", dim_data)
            self.assertIn("level", dim_data)
            self.assertIn("recommendations", dim_data)

    def test_get_case_study(self):
        """Test retrieving a case study."""
        industry = "manufacturing"
        focus_area = "measurement_systems"

        result = self.service.get_case_study(industry=industry, focus_area=focus_area)

        # Check that the result contains the expected keys
        self.assertIn("id", result)
        self.assertIn("title", result)
        self.assertIn("focus_area", result)
        self.assertIn("challenge", result)
        self.assertIn("approach", result)
        self.assertIn("results", result)
        self.assertIn("success_factors", result)

        # Check that the focus area matches
        self.assertEqual(result["focus_area"], focus_area)

        # Check that results are provided
        self.assertGreater(len(result["results"]), 0)
        self.assertGreater(len(result["success_factors"]), 0)

        # Test with different industry
        result2 = self.service.get_case_study(industry="healthcare", focus_area=focus_area)

        # Healthcare falls back to manufacturing (not in case_studies dict)
        self.assertIn("title", result2)

    def test_get_industry_recommendations(self):
        """Test getting industry-specific recommendations."""
        industry = "manufacturing"

        result = self.service.get_industry_recommendations(industry)

        # Check that the result contains the expected category keys
        expected_categories = {"control_charts", "sample_plans", "measurement_systems", "training", "implementation"}
        self.assertEqual(set(result.keys()), expected_categories)

        # Check that each category has recommendations
        for category, recs in result.items():
            self.assertIsInstance(recs, list)
            self.assertGreater(len(recs), 0, f"No recommendations for {category}")

        # Test with different industry
        result2 = self.service.get_industry_recommendations("pharmaceutical")

        # Should get different recommendations
        self.assertNotEqual(result["control_charts"], result2["control_charts"])


if __name__ == "__main__":
    unittest.main()
