"""
SPC Implementation Service for Statistical Quality Control (SQC) Analysis.

This module provides services for SPC implementation strategies, control plans,
case studies, and roadmaps for successful statistical process control deployment.
Adapted from the original Streamlit implementation to work with Django/React architecture.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Union, Any
import uuid
import json
import datetime

class SPCImplementationService:
    """
    Service for SPC implementation strategies and control plans.
    """
    
    def __init__(self):
        """Initialize the SPC implementation service."""
        pass
    
    def create_control_plan(
        self,
        control_plan_items: List[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a control plan for SPC implementation.
        
        Args:
            control_plan_items: List of control plan elements with process characteristics and control methods
            metadata: Optional metadata for the control plan (title, owner, etc.)
            
        Returns:
            Dictionary with the created control plan
        """
        if metadata is None:
            metadata = {}
        
        # Add default metadata if not provided
        if 'title' not in metadata:
            metadata['title'] = "SPC Control Plan"
        
        if 'created_date' not in metadata:
            metadata['created_date'] = datetime.datetime.now().strftime("%Y-%m-%d")
        
        if 'revision' not in metadata:
            metadata['revision'] = "1.0"
        
        if 'owner' not in metadata:
            metadata['owner'] = "SQC Analysis Module"
        
        # Process control plan items
        processed_items = []
        for i, item in enumerate(control_plan_items):
            processed_item = dict(item)  # Create a copy
            
            # Add ID if not present
            if 'id' not in processed_item:
                processed_item['id'] = str(uuid.uuid4())
            
            # Add index if not present
            if 'index' not in processed_item:
                processed_item['index'] = i + 1
            
            # Ensure required fields are present
            required_fields = [
                'process_step', 'characteristic', 'specification', 
                'measurement_method', 'sample_plan', 'control_method', 'reaction_plan'
            ]
            
            for field in required_fields:
                if field not in processed_item:
                    processed_item[field] = ""
            
            processed_items.append(processed_item)
        
        # Create control plan
        control_plan = {
            'id': str(uuid.uuid4()),
            'metadata': metadata,
            'items': processed_items,
            'created': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return control_plan
    
    def evaluate_control_plan(
        self,
        control_plan: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate the completeness and quality of a control plan.
        
        Args:
            control_plan: Control plan dictionary
            
        Returns:
            Dictionary with evaluation results
        """
        # Extract control plan items
        items = control_plan.get('items', [])
        
        if not items:
            return {
                'completeness_score': 0,
                'quality_score': 0,
                'issues': ["Control plan has no items"],
                'recommendations': ["Add process characteristics to the control plan"]
            }
        
        # Evaluate completeness
        max_completeness_score = 7  # One point for each required field
        completeness_scores = []
        
        # Check required fields for each item
        required_fields = [
            'process_step', 'characteristic', 'specification', 
            'measurement_method', 'sample_plan', 'control_method', 'reaction_plan'
        ]
        
        # Track issues and recommendations
        issues = []
        recommendations = []
        
        for item in items:
            item_score = 0
            for field in required_fields:
                if field in item and item[field]:
                    item_score += 1
            
            completeness_scores.append(item_score / max_completeness_score)
        
        # Overall completeness score (0-100)
        completeness_score = 100 * sum(completeness_scores) / len(completeness_scores)
        
        # Evaluate quality
        quality_score = 0
        max_quality_score = 10
        
        # Check for quality elements
        # 1. Specification clarity (numeric vs. vague)
        specification_quality = 0
        for item in items:
            spec = item.get('specification', '')
            if spec and any(c.isdigit() for c in spec):
                specification_quality += 1
        
        specification_quality = 100 * specification_quality / len(items)
        
        # 2. Control method appropriateness
        control_method_quality = 0
        preferred_methods = [
            'x-bar', 'xbar', 'r chart', 'range chart', 's chart', 'i-mr', 'imr',
            'p chart', 'np chart', 'c chart', 'u chart', 'cusum', 'ewma'
        ]
        
        for item in items:
            method = item.get('control_method', '').lower()
            if any(preferred in method for preferred in preferred_methods):
                control_method_quality += 1
            elif 'chart' in method or 'spc' in method or 'control' in method:
                control_method_quality += 0.5
        
        control_method_quality = 100 * control_method_quality / len(items)
        
        # 3. Reaction plan specificity
        reaction_plan_quality = 0
        for item in items:
            plan = item.get('reaction_plan', '')
            if len(plan.split()) >= 5:  # At least 5 words
                reaction_plan_quality += 1
            elif plan:
                reaction_plan_quality += 0.5
        
        reaction_plan_quality = 100 * reaction_plan_quality / len(items)
        
        # 4. Sample plan clarity
        sample_plan_quality = 0
        for item in items:
            plan = item.get('sample_plan', '')
            if plan and any(c.isdigit() for c in plan):
                sample_plan_quality += 1
            elif plan:
                sample_plan_quality += 0.5
        
        sample_plan_quality = 100 * sample_plan_quality / len(items)
        
        # Overall quality score (0-100)
        quality_score = (specification_quality + control_method_quality + 
                        reaction_plan_quality + sample_plan_quality) / 4
        
        # Generate specific issues and recommendations
        if completeness_score < 70:
            issues.append("Control plan is incomplete - missing required information")
            recommendations.append("Fill in all required fields for each control plan item")
        
        if specification_quality < 60:
            issues.append("Specifications lack numerical values or clear criteria")
            recommendations.append("Define specific, measurable specifications with numeric values where applicable")
        
        if control_method_quality < 60:
            issues.append("Control methods may not be appropriate or specific enough")
            recommendations.append("Use specific control chart types (X-bar, I-MR, etc.) where applicable")
        
        if reaction_plan_quality < 60:
            issues.append("Reaction plans lack detail or clarity")
            recommendations.append("Create detailed reaction plans that specify who does what when control is lost")
        
        if sample_plan_quality < 60:
            issues.append("Sample plans lack specific sample sizes or frequencies")
            recommendations.append("Specify exact sample sizes and frequencies in the sampling plan")
        
        # Create evaluation result
        evaluation = {
            'completeness_score': round(completeness_score, 1),
            'quality_score': round(quality_score, 1),
            'dimension_scores': {
                'specification_quality': round(specification_quality, 1),
                'control_method_quality': round(control_method_quality, 1),
                'reaction_plan_quality': round(reaction_plan_quality, 1),
                'sample_plan_quality': round(sample_plan_quality, 1)
            },
            'issues': issues,
            'recommendations': recommendations
        }
        
        return evaluation
    
    def generate_implementation_roadmap(
        self,
        implementation_parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate an SPC implementation roadmap.
        
        Args:
            implementation_parameters: Parameters for implementation planning
            
        Returns:
            Dictionary with implementation roadmap
        """
        # Extract implementation parameters
        organization_size = implementation_parameters.get('organization_size', 'medium')
        industry = implementation_parameters.get('industry', 'manufacturing')
        existing_quality_system = implementation_parameters.get('existing_quality_system', 'basic')
        process_complexity = implementation_parameters.get('process_complexity', 'medium')
        implementation_scope = implementation_parameters.get('implementation_scope', 'department')
        
        # Define phase durations based on parameters
        if organization_size == 'small':
            base_duration = {'assessment': 4, 'planning': 4, 'pilot': 6, 'deployment': 8, 'sustainment': 8}
        elif organization_size == 'medium':
            base_duration = {'assessment': 6, 'planning': 8, 'pilot': 8, 'deployment': 12, 'sustainment': 12}
        else:  # large
            base_duration = {'assessment': 8, 'planning': 12, 'pilot': 12, 'deployment': 16, 'sustainment': 16}
        
        # Adjust durations based on other factors
        if process_complexity == 'high':
            base_duration = {k: v * 1.5 for k, v in base_duration.items()}
        elif process_complexity == 'low':
            base_duration = {k: v * 0.8 for k, v in base_duration.items()}
        
        if existing_quality_system == 'advanced':
            base_duration = {k: v * 0.8 for k, v in base_duration.items()}
        elif existing_quality_system == 'none':
            base_duration = {k: v * 1.3 for k, v in base_duration.items()}
        
        if implementation_scope == 'enterprise':
            base_duration = {k: v * 1.5 for k, v in base_duration.items()}
        elif implementation_scope == 'process':
            base_duration = {k: v * 0.7 for k, v in base_duration.items()}
        
        # Round durations to whole weeks
        phase_durations = {k: round(v) for k, v in base_duration.items()}
        
        # Create phases with activities
        phases = []
        
        # Assessment Phase
        assessment_activities = [
            {"id": str(uuid.uuid4()), "name": "Process Mapping", "description": "Document process flows and identify key inputs and outputs"},
            {"id": str(uuid.uuid4()), "name": "Critical Parameter Identification", "description": "Identify critical-to-quality characteristics"},
            {"id": str(uuid.uuid4()), "name": "Measurement System Evaluation", "description": "Assess current measurement systems and identify improvement needs"},
            {"id": str(uuid.uuid4()), "name": "Data Collection Review", "description": "Evaluate existing data collection methods"},
            {"id": str(uuid.uuid4()), "name": "Organizational Readiness Assessment", "description": "Assess statistical knowledge and skill gaps"}
        ]
        
        # Planning Phase
        planning_activities = [
            {"id": str(uuid.uuid4()), "name": "Implementation Strategy Development", "description": "Define implementation scope, scale, and timeline"},
            {"id": str(uuid.uuid4()), "name": "Control Plan Development", "description": "Create control plans for critical processes"},
            {"id": str(uuid.uuid4()), "name": "Training Program Design", "description": "Develop role-specific training materials"},
            {"id": str(uuid.uuid4()), "name": "Infrastructure Preparation", "description": "Select and implement SPC software and data management systems"},
            {"id": str(uuid.uuid4()), "name": "Change Management Planning", "description": "Develop communication strategy and stakeholder engagement"}
        ]
        
        # Pilot Phase
        pilot_activities = [
            {"id": str(uuid.uuid4()), "name": "Pilot Area Selection", "description": "Identify receptive areas with clear metrics and strong leadership"},
            {"id": str(uuid.uuid4()), "name": "Pilot Implementation", "description": "Train personnel and deploy initial control charts"},
            {"id": str(uuid.uuid4()), "name": "Evaluation & Feedback", "description": "Assess effectiveness and identify barriers"},
            {"id": str(uuid.uuid4()), "name": "Methodology Refinement", "description": "Adjust control plans and methods based on feedback"},
            {"id": str(uuid.uuid4()), "name": "Success Demonstration", "description": "Document improvements and create case studies"}
        ]
        
        # Deployment Phase
        deployment_activities = [
            {"id": str(uuid.uuid4()), "name": "Rollout Planning", "description": "Prioritize processes and develop implementation schedule"},
            {"id": str(uuid.uuid4()), "name": "Organization-wide Training", "description": "Deliver training and develop SPC champions"},
            {"id": str(uuid.uuid4()), "name": "System Integration", "description": "Integrate SPC with other quality systems"},
            {"id": str(uuid.uuid4()), "name": "Full Implementation", "description": "Deploy control plans and monitoring systems"},
            {"id": str(uuid.uuid4()), "name": "Compliance Verification", "description": "Audit implementation and verify consistent application"}
        ]
        
        # Sustainment Phase
        sustainment_activities = [
            {"id": str(uuid.uuid4()), "name": "Regular Audits & Reviews", "description": "Conduct periodic system audits and effectiveness reviews"},
            {"id": str(uuid.uuid4()), "name": "Continuous Improvement", "description": "Revise control plans and improve methods"},
            {"id": str(uuid.uuid4()), "name": "Knowledge Management", "description": "Document lessons learned and share success stories"},
            {"id": str(uuid.uuid4()), "name": "Advanced Methods Integration", "description": "Implement multivariate methods and process capability studies"},
            {"id": str(uuid.uuid4()), "name": "Organizational Development", "description": "Develop advanced statistical skills and analytical thinking"}
        ]
        
        # Combine phases
        phases = [
            {
                "name": "Assessment",
                "duration": phase_durations['assessment'],
                "activities": assessment_activities
            },
            {
                "name": "Planning",
                "duration": phase_durations['planning'],
                "activities": planning_activities
            },
            {
                "name": "Pilot",
                "duration": phase_durations['pilot'],
                "activities": pilot_activities
            },
            {
                "name": "Deployment",
                "duration": phase_durations['deployment'],
                "activities": deployment_activities
            },
            {
                "name": "Sustainment",
                "duration": phase_durations['sustainment'],
                "activities": sustainment_activities
            }
        ]
        
        # Calculate total duration and timeline
        total_duration = sum(phase_durations.values())
        
        # Calculate start and end dates for each phase
        start_date = datetime.datetime.now()
        current_date = start_date
        
        for phase in phases:
            phase['start_date'] = current_date.strftime("%Y-%m-%d")
            current_date = current_date + datetime.timedelta(weeks=phase['duration'])
            phase['end_date'] = current_date.strftime("%Y-%m-%d")
        
        # Industry-specific recommendations
        industry_recommendations = []
        
        if industry == 'pharmaceutical':
            industry_recommendations = [
                "Integrate SPC with GMP and validation documentation",
                "Consider regulatory requirements for data integrity and traceability",
                "Focus on process validation connection to SPC implementation",
                "Establish clear connections to CAPA system",
                "Implement review by quality assurance for all control plans"
            ]
        elif industry == 'medical_devices':
            industry_recommendations = [
                "Align SPC implementation with ISO 13485 requirements",
                "Establish clear procedures for handling of SPC data as quality records",
                "Include risk management considerations in control plan development",
                "Consider Design Controls integration with SPC",
                "Implement appropriate validation of SPC software"
            ]
        elif industry == 'food':
            industry_recommendations = [
                "Integrate SPC with HACCP monitoring systems",
                "Focus on critical control points from food safety perspective",
                "Consider sanitation and environmental monitoring in SPC scope",
                "Implement appropriate training for seasonal workers",
                "Focus on weight control and label compliance monitoring"
            ]
        elif industry == 'electronics':
            industry_recommendations = [
                "Implement electrostatic controls for measurement devices",
                "Focus on first-pass yield and defects per million opportunities",
                "Consider automated data collection where possible",
                "Integrate with functional testing systems",
                "Implement traceability to specific manufacturing equipment"
            ]
        else:  # manufacturing or others
            industry_recommendations = [
                "Focus on process capability for critical dimensions",
                "Implement clear procedures for reaction to out-of-control conditions",
                "Consider integration with maintenance management systems",
                "Establish regular management review of SPC data",
                "Create clear connection to continuous improvement initiatives"
            ]
        
        # Create the implementation roadmap
        roadmap = {
            'id': str(uuid.uuid4()),
            'parameters': implementation_parameters,
            'phases': phases,
            'total_duration': total_duration,
            'start_date': start_date.strftime("%Y-%m-%d"),
            'end_date': (start_date + datetime.timedelta(weeks=total_duration)).strftime("%Y-%m-%d"),
            'industry_recommendations': industry_recommendations,
            'created': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return roadmap
    
    def assess_implementation_maturity(
        self,
        assessment_responses: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Assess SPC implementation maturity level.
        
        Args:
            assessment_responses: Dictionary with maturity assessment responses
            
        Returns:
            Dictionary with maturity assessment results
        """
        # Define maturity dimensions and scoring
        dimensions = [
            'leadership_commitment',
            'training_competency',
            'system_infrastructure',
            'methods_techniques',
            'process_management',
            'continuous_improvement'
        ]
        
        dimension_names = {
            'leadership_commitment': 'Leadership Commitment',
            'training_competency': 'Training & Competency',
            'system_infrastructure': 'System Infrastructure',
            'methods_techniques': 'Methods & Techniques',
            'process_management': 'Process Management',
            'continuous_improvement': 'Continuous Improvement'
        }
        
        # Extract responses for each dimension
        scores = {}
        for dimension in dimensions:
            # Get score from responses (1-5 scale)
            score = assessment_responses.get(dimension, 0)
            scores[dimension] = score
        
        # Calculate overall maturity score
        total_score = sum(scores.values())
        max_possible = 5 * len(dimensions)
        overall_score = 100 * total_score / max_possible if max_possible > 0 else 0
        
        # Determine maturity level
        maturity_level = ""
        if overall_score >= 90:
            maturity_level = "Optimizing"
        elif overall_score >= 70:
            maturity_level = "Quantitatively Managed"
        elif overall_score >= 50:
            maturity_level = "Defined"
        elif overall_score >= 30:
            maturity_level = "Managed"
        else:
            maturity_level = "Initial"
        
        # Generate recommendations for each dimension
        recommendations = {}
        
        # Leadership recommendations
        if scores.get('leadership_commitment', 0) < 3:
            recommendations['leadership_commitment'] = [
                "Increase management visibility in SPC reviews",
                "Link SPC metrics to strategic objectives",
                "Include SPC effectiveness in management reviews",
                "Provide resources for advanced training",
                "Recognize and reward data-driven improvements"
            ]
        elif scores.get('leadership_commitment', 0) < 5:
            recommendations['leadership_commitment'] = [
                "Develop strategic alignment of SPC with business goals",
                "Implement regular executive review of SPC metrics",
                "Create structured SPC governance system",
                "Integrate SPC results with performance management"
            ]
        
        # Training recommendations
        if scores.get('training_competency', 0) < 3:
            recommendations['training_competency'] = [
                "Develop role-specific competency models",
                "Implement basic statistical training for all relevant staff",
                "Create internal SPC certification program",
                "Establish mentoring for statistical methods",
                "Develop internal experts and champions"
            ]
        elif scores.get('training_competency', 0) < 5:
            recommendations['training_competency'] = [
                "Implement advanced statistical training",
                "Create career paths for statistical specialists",
                "Develop coaching and mentoring programs",
                "Establish knowledge management system for SPC"
            ]
        
        # System infrastructure recommendations
        if scores.get('system_infrastructure', 0) < 3:
            recommendations['system_infrastructure'] = [
                "Implement dedicated SPC software",
                "Create standardized data collection methods",
                "Establish data storage and retrieval systems",
                "Develop basic reporting capabilities",
                "Implement data validation procedures"
            ]
        elif scores.get('system_infrastructure', 0) < 5:
            recommendations['system_infrastructure'] = [
                "Integrate SPC with other business systems",
                "Implement real-time data collection",
                "Develop automated reporting capabilities",
                "Create central repository for SPC knowledge",
                "Implement advanced analytics capabilities"
            ]
        
        # Methods recommendations
        if scores.get('methods_techniques', 0) < 3:
            recommendations['methods_techniques'] = [
                "Implement basic control chart methods",
                "Establish standard procedures for chart selection",
                "Implement basic capability analysis",
                "Develop guidelines for sample size determination",
                "Create standard operating procedures for SPC"
            ]
        elif scores.get('methods_techniques', 0) < 5:
            recommendations['methods_techniques'] = [
                "Implement more advanced statistical methods",
                "Add multivariate techniques where appropriate",
                "Incorporate process capability analysis",
                "Develop predictive modeling capabilities",
                "Integrate with design of experiments (DOE)"
            ]
        
        # Process management recommendations
        if scores.get('process_management', 0) < 3:
            recommendations['process_management'] = [
                "Create control plans for critical processes",
                "Implement out-of-control action plans",
                "Establish regular process performance reviews",
                "Define clear process ownership",
                "Create process documentation including control charts"
            ]
        elif scores.get('process_management', 0) < 5:
            recommendations['process_management'] = [
                "Implement statistical process optimization",
                "Create dynamic control plans",
                "Establish process performance baselines",
                "Develop advanced process monitoring strategies",
                "Implement risk-based control plan adjustments"
            ]
        
        # Continuous improvement recommendations
        if scores.get('continuous_improvement', 0) < 3:
            recommendations['continuous_improvement'] = [
                "Establish basic improvement methodology",
                "Create mechanism for improvement suggestions",
                "Implement regular reviews of control chart effectiveness",
                "Establish process for updating control plans",
                "Create system for sharing best practices"
            ]
        elif scores.get('continuous_improvement', 0) < 5:
            recommendations['continuous_improvement'] = [
                "Integrate SPC with structured improvement methods",
                "Implement trend analysis for process improvement",
                "Create knowledge sharing for SPC insights",
                "Develop systematic control chart review process",
                "Integrate SPC with innovation processes"
            ]
        
        # Format dimension scores for results
        dimension_scores = {}
        for dimension in dimensions:
            score = scores.get(dimension, 0)
            name = dimension_names.get(dimension, dimension)
            level = ""
            
            if score == 5:
                level = "Optimizing"
            elif score == 4:
                level = "Quantitatively Managed"
            elif score == 3:
                level = "Defined"
            elif score == 2:
                level = "Managed"
            else:
                level = "Initial"
            
            dimension_scores[dimension] = {
                'name': name,
                'score': score,
                'level': level,
                'recommendations': recommendations.get(dimension, [])
            }
        
        # Create assessment result
        result = {
            'id': str(uuid.uuid4()),
            'overall_score': round(overall_score, 1),
            'maturity_level': maturity_level,
            'dimension_scores': dimension_scores,
            'created': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return result
    
    def get_case_study(
        self,
        industry: str,
        focus_area: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get a relevant SPC implementation case study.
        
        Args:
            industry: Industry sector (pharmaceutical, medical_devices, food, etc.)
            focus_area: Optional specific focus area for the case study
            
        Returns:
            Dictionary with case study information
        """
        # Initialize case study library by industry
        case_studies = {
            'pharmaceutical': [
                {
                    'id': 'pharma_001',
                    'title': 'Tablet Compression Process Optimization',
                    'focus_area': 'process_capability',
                    'challenge': 'A pharmaceutical manufacturer experienced inconsistent tablet weight leading to dissolution failures and batch rejections.',
                    'approach': 'Implemented X-bar & R charts for tablet weight, hardness, and thickness. Applied process capability analysis to identify improvement opportunities.',
                    'results': [
                        'Reduced dissolution failures from 4.2% to 0.3%',
                        'Improved tablet weight consistency with Cpk from 0.8 to 1.7',
                        'Decreased in-process adjustments by 84%',
                        'Reduced batch release time by 4 days',
                        'Annual savings of approximately $1.2 million'
                    ],
                    'success_factors': [
                        'Integration of SPC with equipment automation',
                        'Cross-functional team including formulation and production',
                        'Visual management of SPC results',
                        'Regular management review and continuous improvement'
                    ]
                },
                {
                    'id': 'pharma_002',
                    'title': 'Cell Culture Process Improvement',
                    'focus_area': 'control_charts',
                    'challenge': 'A biopharmaceutical company faced high variability in cell culture performance leading to inconsistent product yield and quality.',
                    'approach': 'Implemented multivariate SPC for monitoring critical process parameters (pH, DO, temperature, glucose) with custom control limits based on process phases.',
                    'results': [
                        'Reduced batch-to-batch titer variability from 25% to 8%',
                        'Improved product quality consistency by 45%',
                        'Early detection of process deviations (12 hours vs. 36 hours previously)',
                        'Annual cost savings of $2.8 million through reduced batch failures'
                    ],
                    'success_factors': [
                        'Phase-appropriate control limits for different stages of the culture',
                        'Integration with process analytical technology (PAT)',
                        'Automated data collection and analysis',
                        'Clear action plans for out-of-control conditions'
                    ]
                }
            ],
            'medical_devices': [
                {
                    'id': 'med_001',
                    'title': 'Precision Component Manufacturing Improvement',
                    'focus_area': 'measurement_systems',
                    'challenge': 'A medical device manufacturer experienced high rejection rates for precision components due to dimensional accuracy issues.',
                    'approach': 'Started with measurement system analysis (MSA), then implemented SPC with automated measurement and real-time feedback to operators.',
                    'results': [
                        'Reduced component rejection rate from 5.6% to 0.8%',
                        'Improved first-pass yield by 4.5%',
                        'Decreased quality inspection costs by 37%',
                        'Documented annual savings of $875,000'
                    ],
                    'success_factors': [
                        'Focus on measurement system capability before SPC implementation',
                        'Operator ownership of process control',
                        'Visual management of SPC data',
                        'Integration with production systems'
                    ]
                },
                {
                    'id': 'med_002',
                    'title': 'Catheter Extrusion Process Control',
                    'focus_area': 'control_charts',
                    'challenge': 'A catheter manufacturer struggled with diameter consistency and material property variations.',
                    'approach': 'Implemented real-time SPC on extrusion line with automated laser measurement and control systems.',
                    'results': [
                        'Reduced dimensional variability by 68%',
                        'Decreased material waste by 42%',
                        'Improved yield from 89% to 97%',
                        'Reduced customer complaints by 75%'
                    ],
                    'success_factors': [
                        'Real-time monitoring and feedback system',
                        'Operator training and engagement',
                        'Integration with process control systems',
                        'Supplier quality monitoring'
                    ]
                }
            ],
            'food': [
                {
                    'id': 'food_001',
                    'title': 'Fill Weight Control in Beverage Production',
                    'focus_area': 'control_charts',
                    'challenge': 'A beverage producer experienced excessive product giveaway and occasional underfills leading to regulatory concerns.',
                    'approach': 'Implemented X-bar & R charts for fill weights with automated measurement and control systems.',
                    'results': [
                        'Reduced overfill from 3.2% to 0.7%',
                        'Eliminated regulatory underfill concerns',
                        'Decreased line adjustments by 68%',
                        'Annual savings of $450,000 in reduced product giveaway'
                    ],
                    'success_factors': [
                        'Real-time feedback to filling equipment',
                        'Operator training and engagement',
                        'Visual management boards',
                        'Integration with quality management system'
                    ]
                },
                {
                    'id': 'food_002',
                    'title': 'Baking Process Temperature Control',
                    'focus_area': 'process_capability',
                    'challenge': 'A commercial bakery struggled with inconsistent product quality due to oven temperature variations.',
                    'approach': 'Implemented SPC for oven temperature zones with I-MR charts and pre-control for critical parameters.',
                    'results': [
                        'Reduced burned product by 82%',
                        'Decreased energy consumption by 12%',
                        'Improved consistency of baked goods appearance by 40%',
                        'Reduced customer complaints about quality by 65%'
                    ],
                    'success_factors': [
                        'Zone-specific control charts',
                        'Preventive maintenance integration',
                        'Operator training on process physics',
                        'Visual management of process performance'
                    ]
                }
            ],
            'manufacturing': [
                {
                    'id': 'mfg_001',
                    'title': 'CNC Machining Precision Improvement',
                    'focus_area': 'measurement_systems',
                    'challenge': 'A precision parts manufacturer faced inconsistent dimensional quality in machined components.',
                    'approach': 'Implemented comprehensive MSA followed by SPC deployment with operator-led data collection and analysis.',
                    'results': [
                        'Improved Cpk from 0.9 to 1.8 for critical dimensions',
                        'Reduced scrap by 47%',
                        'Decreased inspection costs by 35%',
                        'Improved on-time delivery from 87% to 96%'
                    ],
                    'success_factors': [
                        'Focus on measurement system improvement',
                        'Tool wear monitoring integration',
                        'Operator-owned SPC system',
                        'Visual management and immediate feedback'
                    ]
                },
                {
                    'id': 'mfg_002',
                    'title': 'Injection Molding Process Optimization',
                    'focus_area': 'process_capability',
                    'challenge': 'A plastic parts manufacturer struggled with dimensional stability and high rejection rates.',
                    'approach': 'Implemented SPC with DOE to optimize process parameters, followed by control chart monitoring of critical dimensions.',
                    'results': [
                        'Reduced dimensional variability by 65%',
                        'Decreased cycle time by 12%',
                        'Improved first-pass yield from 92% to 98.5%',
                        'Annual savings of $380,000 in reduced scrap and rework'
                    ],
                    'success_factors': [
                        'Integration of SPC with process parameter optimization',
                        'Material variation monitoring',
                        'Mold temperature and pressure monitoring',
                        'Operator training and engagement'
                    ]
                }
            ]
        }
        
        # Default to manufacturing if industry not found
        if industry not in case_studies:
            industry = 'manufacturing'
        
        available_studies = case_studies[industry]
        
        # Filter by focus area if provided
        if focus_area:
            filtered_studies = [study for study in available_studies if study['focus_area'] == focus_area]
            if filtered_studies:
                available_studies = filtered_studies
        
        # Return first available case study or empty dict if none found
        if available_studies:
            return available_studies[0]
        else:
            return {}
    
    def get_industry_recommendations(
        self,
        industry: str
    ) -> Dict[str, List[str]]:
        """
        Get industry-specific SPC implementation recommendations.
        
        Args:
            industry: Industry sector (pharmaceutical, medical_devices, food, etc.)
            
        Returns:
            Dictionary with industry-specific recommendations
        """
        # Industry-specific recommendations by implementation area
        recommendations = {
            'pharmaceutical': {
                'control_charts': [
                    'Focus on multivariate monitoring for complex processes',
                    'Implement risk-based control limits based on process impact',
                    'Ensure data integrity and audit trail compliance (21 CFR Part 11)',
                    'Include control charts in validation documentation',
                    'Develop clear connections to CAPA system for out-of-control conditions'
                ],
                'sample_plans': [
                    'Implement bracketing/matrixing approaches for sampling when appropriate',
                    'Use stratified sampling to address multiple sources of variation',
                    'Ensure sampling procedures maintain product sterility where required',
                    'Document statistical rationale for sample sizes in validation protocols',
                    'Consider skip-lot testing for stable, validated processes'
                ],
                'measurement_systems': [
                    'Validate analytical methods before implementing SPC',
                    'Perform method transfer validation for multi-site testing',
                    'Include robustness testing in measurement system analysis',
                    'Document measurement uncertainties for all test methods',
                    'Establish regular verification of reference standards'
                ],
                'training': [
                    'Include regulatory context in SPC training',
                    'Train on data integrity requirements specific to GMP',
                    'Develop role-based training with different depth for operators vs. analysts',
                    'Ensure training documentation meets regulatory requirements',
                    'Include specific training on handling out-of-specification results'
                ],
                'implementation': [
                    'Integrate SPC with process validation phases',
                    'Connect SPC implementation to Pharmaceutical Quality System',
                    'Document statistical rationale for all control limits',
                    'Establish clear procedures for method/control chart changes',
                    'Implement appropriate review and approval workflow for SPC data'
                ]
            },
            'medical_devices': {
                'control_charts': [
                    'Focus on critical quality attributes from risk analysis',
                    'Implement design tolerance-based control limits where appropriate',
                    'Ensure traceability between batches/lots and control charts',
                    'Develop connections between control charts and DHF/DMR documentation',
                    'Establish clear procedures for design/specification changes'
                ],
                'sample_plans': [
                    'Base sample sizes on risk classification of device',
                    'Implement sampling procedures for device history records',
                    'Create attribute plans for critical visual defects',
                    'Document sampling rationale in design transfer documentation',
                    'Consider AQL-based sampling for final inspection'
                ],
                'measurement_systems': [
                    'Validate test methods according to ISO 13485 requirements',
                    'Establish traceability to national standards for critical measurements',
                    'Perform detailed measurement uncertainty analysis',
                    'Create procedures for calibration review and impact assessment',
                    'Implement appropriate software validation for measurement systems'
                ],
                'training': [
                    'Include regulatory context in SPC training (FDA, ISO 13485)',
                    'Train on UDI system connection to quality data',
                    'Develop specific training for complaint handling connection to SPC',
                    'Create training on design control connections to SPC',
                    'Train on risk management integration with SPC'
                ],
                'implementation': [
                    'Integrate SPC with design control processes',
                    'Connect SPC to risk management file',
                    'Document SPC implementation in quality system procedures',
                    'Establish clear connections to CAPA system',
                    'Implement appropriate management reviews of SPC data'
                ]
            },
            'food': {
                'control_charts': [
                    'Focus on food safety critical control points',
                    'Implement appropriate charts for microbiological testing',
                    'Connect control charts to HACCP documentation',
                    'Develop weight control specific charts for label compliance',
                    'Create appropriate control charts for sensory attributes'
                ],
                'sample_plans': [
                    'Base sample sizes on lot size and risk category',
                    'Create appropriate environmental monitoring sample plans',
                    'Implement time-based sampling for continuous processes',
                    'Document statistical rationale for sample sizes',
                    'Consider international standards for food testing sampling'
                ],
                'measurement_systems': [
                    'Validate methods according to food industry standards',
                    'Establish measurement systems for rapid microbiological testing',
                    'Implement appropriate calibration procedures for food testing equipment',
                    'Create verification procedures for organoleptic testing',
                    'Develop control programs for reference materials'
                ],
                'training': [
                    'Include food safety regulation context in SPC training',
                    'Develop training specific to HACCP connection with SPC',
                    'Create training on handling out-of-specification results',
                    'Implement appropriate training for temporary/seasonal workers',
                    'Develop visual aids for shop floor operators'
                ],
                'implementation': [
                    'Integrate SPC with HACCP system',
                    'Connect SPC to food safety management system',
                    'Establish clear procedures for product holds/releases',
                    'Document SPC implementation in food safety procedures',
                    'Implement appropriate review of control charts during audits'
                ]
            },
            'manufacturing': {
                'control_charts': [
                    'Implement machine-specific control charts where appropriate',
                    'Develop short-run SPC techniques for high-mix production',
                    'Create appropriate charts for tool wear monitoring',
                    'Implement multi-stage process monitoring techniques',
                    'Develop appropriate control charts for automated inspection data'
                ],
                'sample_plans': [
                    'Base sample sizes on production volume and criticality',
                    'Implement layer auditing techniques for stable processes',
                    'Create stratified sampling plans for multiple machines/tools',
                    'Document rationale for sample timing and frequency',
                    'Consider automation of sampling where feasible'
                ],
                'measurement_systems': [
                    'Validate measurement systems before implementing SPC',
                    'Establish regular gage R&R studies for critical measurements',
                    'Implement appropriate calibration procedures and schedules',
                    'Create verification procedures for automated inspection systems',
                    'Develop monitoring of measurement system performance'
                ],
                'training': [
                    'Create role-based training for operators vs. engineers',
                    'Develop specific training for interpreting control charts',
                    'Implement visual management training',
                    'Create practical exercises for control chart use',
                    'Develop troubleshooting guides for common issues'
                ],
                'implementation': [
                    'Integrate SPC with lean manufacturing system',
                    'Connect SPC to preventive maintenance system',
                    'Establish clear escalation procedures for out-of-control conditions',
                    'Document integration with APQP/PPAP processes if applicable',
                    'Implement regular management reviews of SPC effectiveness'
                ]
            }
        }
        
        # Default to manufacturing if industry not found
        if industry not in recommendations:
            industry = 'manufacturing'
        
        return recommendations[industry]