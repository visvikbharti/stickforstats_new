"""
AI Advisor API Views

REST API endpoints for StickForStats AI Statistical Advisor.
Provides Claude-powered statistical guidance with scientific integrity.

Author: StickForStats Team
Version: 1.0.0
"""

import logging
import uuid
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

# Import AI service
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ai_advisor.services import get_ai_advisor_service
from ai_advisor.services.nlp_enhanced import (
    get_query_parser,
    get_plan_generator,
    get_report_generator,
    StatisticalResult,
    StatisticalTest
)

logger = logging.getLogger(__name__)


class AIAdvisorChatView(APIView):
    """Allow public access for AI advisor (rate limited by service)"""
    permission_classes = [AllowAny]
    """
    Main chat endpoint for AI Statistical Advisor.

    POST /api/v1/ai-advisor/chat/
    {
        "message": "What statistical test should I use?",
        "conversation_id": "optional-uuid",
        "data_context": {
            "variables": [...],
            "sample_size": 100,
            ...
        }
    }
    """

    def post(self, request):
        """Handle chat message."""
        try:
            # Extract parameters
            message = request.data.get('message', '').strip()
            conversation_id = request.data.get('conversation_id')
            data_context = request.data.get('data_context')

            # Validate message
            if not message:
                return Response(
                    {
                        'success': False,
                        'error': 'Message is required',
                        'error_type': 'validation'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Message length limit (prevent abuse)
            if len(message) > 10000:
                return Response(
                    {
                        'success': False,
                        'error': 'Message too long. Maximum 10,000 characters.',
                        'error_type': 'validation'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Generate conversation ID if not provided
            if not conversation_id:
                conversation_id = str(uuid.uuid4())

            # Get AI service and send message
            service = get_ai_advisor_service()
            result = service.chat(
                message=message,
                conversation_id=conversation_id,
                data_context=data_context
            )

            # Return appropriate status based on result
            if result.get('success'):
                return Response(result, status=status.HTTP_200_OK)
            else:
                error_type = result.get('error_type', 'unknown')
                if error_type == 'rate_limit':
                    return Response(result, status=status.HTTP_429_TOO_MANY_REQUESTS)
                elif error_type == 'configuration':
                    return Response(result, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                else:
                    return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            logger.exception(f"Error in AI Advisor chat: {e}")
            return Response(
                {
                    'success': False,
                    'error': 'An unexpected error occurred',
                    'error_type': 'server_error'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AIAdvisorStatusView(APIView):
    """
    Service status endpoint.

    GET /api/v1/ai-advisor/status/
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """Get AI Advisor service status."""
        try:
            service = get_ai_advisor_service()
            status_info = service.get_service_status()

            return Response({
                'success': True,
                **status_info
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(f"Error getting AI Advisor status: {e}")
            return Response(
                {
                    'success': False,
                    'error': 'Failed to get service status'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AIAdvisorConversationView(APIView):
    """
    Conversation management endpoint.

    GET /api/v1/ai-advisor/conversation/<id>/
    DELETE /api/v1/ai-advisor/conversation/<id>/
    """
    permission_classes = [AllowAny]

    def get(self, request, conversation_id):
        """Get conversation history."""
        try:
            service = get_ai_advisor_service()
            history = service.get_conversation_history(conversation_id)

            if history:
                return Response({
                    'success': True,
                    'conversation': history
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'error': 'Conversation not found'
                }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.exception(f"Error getting conversation: {e}")
            return Response(
                {
                    'success': False,
                    'error': 'Failed to get conversation'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, conversation_id):
        """Clear a conversation."""
        try:
            service = get_ai_advisor_service()
            success = service.clear_conversation(conversation_id)

            if success:
                return Response({
                    'success': True,
                    'message': 'Conversation cleared'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'error': 'Conversation not found'
                }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.exception(f"Error clearing conversation: {e}")
            return Response(
                {
                    'success': False,
                    'error': 'Failed to clear conversation'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([AllowAny])
def quick_recommendation(request):
    """
    Quick test recommendation without full conversation.

    POST /api/v1/ai-advisor/quick-recommend/
    {
        "research_question": "compare two groups",
        "dv_type": "continuous",
        "iv_type": "categorical",
        "num_groups": 2,
        "independent": true,
        "sample_size": 50
    }
    """
    try:
        # Extract parameters
        research_question = request.data.get('research_question', '')
        dv_type = request.data.get('dv_type', 'continuous')
        iv_type = request.data.get('iv_type', 'categorical')
        num_groups = request.data.get('num_groups', 2)
        independent = request.data.get('independent', True)
        sample_size = request.data.get('sample_size')
        normality_met = request.data.get('normality_met', True)
        homogeneity_met = request.data.get('homogeneity_met', True)

        # Build structured prompt
        prompt = f"""Based on the following research context, recommend the most appropriate statistical test:

**Research Question**: {research_question or 'Compare groups/test relationships'}
**Dependent Variable Type**: {dv_type}
**Independent Variable Type**: {iv_type}
**Number of Groups**: {num_groups}
**Groups are Independent**: {'Yes' if independent else 'No (paired/repeated)'}
**Sample Size**: {sample_size or 'Not specified'}
**Normality Assumption**: {'Met' if normality_met else 'Violated'}
**Homogeneity of Variance**: {'Met' if homogeneity_met else 'Violated'}

Please provide:
1. Primary recommended test with justification
2. Alternative test if assumptions are violated
3. Key considerations for this analysis
4. Recommended effect size measure"""

        # Use a temporary conversation for this request
        temp_conversation_id = f"quick-{uuid.uuid4()}"

        service = get_ai_advisor_service()
        result = service.chat(
            message=prompt,
            conversation_id=temp_conversation_id
        )

        # Clean up temporary conversation
        service.clear_conversation(temp_conversation_id)

        return Response(result, status=status.HTTP_200_OK if result.get('success') else status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.exception(f"Error in quick recommendation: {e}")
        return Response(
            {
                'success': False,
                'error': 'Failed to generate recommendation'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def interpret_results(request):
    """
    Interpret statistical results.

    POST /api/v1/ai-advisor/interpret/
    {
        "test_name": "Independent t-test",
        "test_statistic": 2.45,
        "p_value": 0.023,
        "effect_size": {"name": "Cohen's d", "value": 0.65},
        "sample_size": 50,
        "confidence_interval": [0.12, 1.18],
        "context": "Comparing treatment vs control group anxiety scores"
    }
    """
    try:
        # Extract parameters
        test_name = request.data.get('test_name', 'Statistical test')
        test_statistic = request.data.get('test_statistic')
        p_value = request.data.get('p_value')
        effect_size = request.data.get('effect_size')
        sample_size = request.data.get('sample_size')
        confidence_interval = request.data.get('confidence_interval')
        df = request.data.get('degrees_of_freedom')
        context = request.data.get('context', '')
        group_means = request.data.get('group_means')

        # Validate required fields
        if p_value is None:
            return Response(
                {
                    'success': False,
                    'error': 'p_value is required'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Build interpretation prompt
        prompt_parts = [
            "Please interpret the following statistical results in plain English:",
            f"\n**Test Performed**: {test_name}",
        ]

        if test_statistic is not None:
            prompt_parts.append(f"**Test Statistic**: {test_statistic}")
        if df is not None:
            prompt_parts.append(f"**Degrees of Freedom**: {df}")
        prompt_parts.append(f"**P-value**: {p_value}")

        if effect_size:
            if isinstance(effect_size, dict):
                prompt_parts.append(f"**Effect Size**: {effect_size.get('name', 'Effect')} = {effect_size.get('value')}")
            else:
                prompt_parts.append(f"**Effect Size**: {effect_size}")

        if confidence_interval:
            prompt_parts.append(f"**95% CI**: [{confidence_interval[0]}, {confidence_interval[1]}]")

        if sample_size:
            prompt_parts.append(f"**Sample Size**: {sample_size}")

        if group_means:
            prompt_parts.append(f"**Group Means**: {group_means}")

        if context:
            prompt_parts.append(f"\n**Research Context**: {context}")

        prompt_parts.extend([
            "\nPlease provide:",
            "1. **Plain English Interpretation** (1-2 sentences anyone can understand)",
            "2. **Statistical Significance Assessment**",
            "3. **Practical Significance Assessment** (effect size interpretation)",
            "4. **APA-Format Result Statement** (publication-ready)",
            "5. **Limitations and Caveats**",
            "6. **Recommended Next Steps**"
        ])

        prompt = "\n".join(prompt_parts)

        # Use a temporary conversation
        temp_conversation_id = f"interpret-{uuid.uuid4()}"

        service = get_ai_advisor_service()
        result = service.chat(
            message=prompt,
            conversation_id=temp_conversation_id
        )

        # Clean up
        service.clear_conversation(temp_conversation_id)

        return Response(result, status=status.HTTP_200_OK if result.get('success') else status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.exception(f"Error interpreting results: {e}")
        return Response(
            {
                'success': False,
                'error': 'Failed to interpret results'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_methods_section(request):
    """
    Generate publication-ready methods section.

    POST /api/v1/ai-advisor/methods-section/
    {
        "design": "Between-subjects experimental",
        "participants": {"n": 120, "description": "University students"},
        "variables": [...],
        "tests_used": [
            {"name": "Independent t-test", "purpose": "Compare group means"}
        ],
        "software": "StickForStats v1.0",
        "results_summary": "..."
    }
    """
    try:
        # Extract parameters
        design = request.data.get('design', 'Not specified')
        participants = request.data.get('participants', {})
        variables = request.data.get('variables', [])
        tests_used = request.data.get('tests_used', [])
        software = request.data.get('software', 'StickForStats v1.0')
        results_summary = request.data.get('results_summary', '')
        alpha_level = request.data.get('alpha_level', 0.05)
        corrections = request.data.get('corrections', [])

        # Build methods generation prompt
        prompt_parts = [
            "Generate a publication-ready statistical methods section (APA 7th edition format):",
            f"\n**Study Design**: {design}",
        ]

        # Participants info
        if participants:
            if isinstance(participants, dict):
                n = participants.get('n', 'Not specified')
                desc = participants.get('description', '')
                prompt_parts.append(f"**Participants**: N = {n}. {desc}")
            else:
                prompt_parts.append(f"**Participants**: {participants}")

        # Variables
        if variables:
            vars_str = "\n".join([f"  - {v.get('name', 'Variable')}: {v.get('type', 'unknown')} ({v.get('role', 'unknown role')})" for v in variables])
            prompt_parts.append(f"**Variables**:\n{vars_str}")

        # Tests used
        if tests_used:
            tests_str = "\n".join([f"  - {t.get('name', 'Test')}: {t.get('purpose', '')}" for t in tests_used])
            prompt_parts.append(f"**Statistical Tests**:\n{tests_str}")

        prompt_parts.append(f"**Alpha Level**: {alpha_level}")

        if corrections:
            prompt_parts.append(f"**Multiple Comparison Corrections**: {', '.join(corrections)}")

        prompt_parts.append(f"**Software**: {software}")

        if results_summary:
            prompt_parts.append(f"\n**Key Results**: {results_summary}")

        prompt_parts.extend([
            "\nGenerate a complete Methods section including:",
            "1. **Participants** subsection",
            "2. **Statistical Analysis** subsection",
            "3. Include assumption checks performed",
            "4. Cite software appropriately",
            "\nFormat as clean markdown ready to copy into a manuscript."
        ])

        prompt = "\n".join(prompt_parts)

        # Use temporary conversation
        temp_conversation_id = f"methods-{uuid.uuid4()}"

        service = get_ai_advisor_service()
        result = service.chat(
            message=prompt,
            conversation_id=temp_conversation_id
        )

        # Clean up
        service.clear_conversation(temp_conversation_id)

        return Response(result, status=status.HTTP_200_OK if result.get('success') else status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.exception(f"Error generating methods section: {e}")
        return Response(
            {
                'success': False,
                'error': 'Failed to generate methods section'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def assumption_guidance(request):
    """
    Get guidance for assumption violations.

    POST /api/v1/ai-advisor/assumption-guidance/
    {
        "assumption": "normality",
        "test_used": "Shapiro-Wilk",
        "test_statistic": 0.92,
        "p_value": 0.003,
        "planned_analysis": "Independent t-test",
        "sample_size": 45,
        "severity": "moderate"
    }
    """
    try:
        # Extract parameters
        assumption = request.data.get('assumption', 'Statistical assumption')
        test_used = request.data.get('test_used', 'Unknown')
        test_statistic = request.data.get('test_statistic')
        p_value = request.data.get('p_value')
        planned_analysis = request.data.get('planned_analysis', 'Statistical test')
        sample_size = request.data.get('sample_size')
        severity = request.data.get('severity', 'unknown')
        data_characteristics = request.data.get('data_characteristics', {})

        # Build guidance prompt
        prompt_parts = [
            "An assumption violation has been detected. Please provide guidance:",
            f"\n**Assumption Violated**: {assumption}",
            f"**Test Used to Check**: {test_used}",
        ]

        if test_statistic is not None:
            prompt_parts.append(f"**Test Statistic**: {test_statistic}")
        if p_value is not None:
            prompt_parts.append(f"**P-value**: {p_value}")

        prompt_parts.extend([
            f"**Severity**: {severity}",
            f"**Planned Analysis**: {planned_analysis}",
        ])

        if sample_size:
            prompt_parts.append(f"**Sample Size**: {sample_size}")

        if data_characteristics:
            char_str = ", ".join([f"{k}: {v}" for k, v in data_characteristics.items()])
            prompt_parts.append(f"**Data Characteristics**: {char_str}")

        prompt_parts.extend([
            "\nPlease provide:",
            "1. **What This Violation Means** (simple explanation)",
            "2. **Severity Assessment** (how serious for my planned analysis?)",
            "3. **Recommended Solutions** (in order of preference)",
            "4. **Non-Parametric Alternative** (if applicable, with differences)",
            "5. **If Using Transformation** (which one, how to interpret)",
            "6. **Reporting Guidance** (how to report this in my paper)"
        ])

        prompt = "\n".join(prompt_parts)

        # Use temporary conversation
        temp_conversation_id = f"assumption-{uuid.uuid4()}"

        service = get_ai_advisor_service()
        result = service.chat(
            message=prompt,
            conversation_id=temp_conversation_id
        )

        # Clean up
        service.clear_conversation(temp_conversation_id)

        return Response(result, status=status.HTTP_200_OK if result.get('success') else status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.exception(f"Error getting assumption guidance: {e}")
        return Response(
            {
                'success': False,
                'error': 'Failed to get assumption guidance'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =============================================================================
# NLP ENHANCED ENDPOINTS
# =============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def parse_query(request):
    """
    Parse a complex statistical query.

    POST /api/v1/ai-advisor/parse-query/
    {
        "query": "First check normality, then compare treatment vs control group scores, and finally calculate effect size",
        "data_context": {
            "variables": [
                {"name": "score", "type": "continuous"},
                {"name": "group", "type": "categorical"}
            ]
        }
    }

    Returns:
        Parsed query with intents, variables, steps, and analysis types
    """
    try:
        query = request.data.get('query', '').strip()
        data_context = request.data.get('data_context')

        if not query:
            return Response(
                {
                    'success': False,
                    'error': 'Query is required'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse the query
        parser = get_query_parser()
        parsed = parser.parse(query, data_context)

        return Response({
            'success': True,
            'parsed_query': parsed.to_dict()
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception(f"Error parsing query: {e}")
        return Response(
            {
                'success': False,
                'error': f'Failed to parse query: {str(e)}'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_analysis_plan(request):
    """
    Generate a structured analysis plan from a query.

    POST /api/v1/ai-advisor/analysis-plan/
    {
        "query": "Compare treatment and control groups on anxiety scores, checking assumptions first",
        "data_context": {
            "variables": [...],
            "sample_size": 100
        }
    }

    Returns:
        Complete analysis plan with steps, assumptions, and alternatives
    """
    try:
        query = request.data.get('query', '').strip()
        data_context = request.data.get('data_context')

        if not query:
            return Response(
                {
                    'success': False,
                    'error': 'Query is required'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse the query first
        parser = get_query_parser()
        parsed = parser.parse(query, data_context)

        # Generate the analysis plan
        planner = get_plan_generator()
        plan = planner.generate_plan(parsed, data_context)

        return Response({
            'success': True,
            'analysis_plan': plan.to_dict(),
            'parsed_query': parsed.to_dict()
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception(f"Error generating analysis plan: {e}")
        return Response(
            {
                'success': False,
                'error': f'Failed to generate analysis plan: {str(e)}'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_apa_report(request):
    """
    Generate APA-formatted statistical report.

    POST /api/v1/ai-advisor/apa-report/
    {
        "test_type": "independent_t_test",
        "results": {
            "test_statistic": 2.45,
            "p_value": 0.023,
            "effect_size": 0.65,
            "ci_lower": 0.12,
            "ci_upper": 1.18,
            "df": 48,
            "mean_1": 25.4,
            "mean_2": 21.2,
            "sd_1": 5.2,
            "sd_2": 4.8
        },
        "sample_info": {
            "n_total": 50,
            "groups": {"treatment": 25, "control": 25}
        },
        "variables": {
            "dependent": "anxiety_score",
            "grouping": "treatment_condition"
        },
        "assumptions_checked": ["normality", "homogeneity of variance"]
    }

    Returns:
        APA-formatted Methods and Results sections
    """
    try:
        test_type_str = request.data.get('test_type', 'independent_t_test')
        results = request.data.get('results', {})
        sample_info = request.data.get('sample_info', {})
        variables = request.data.get('variables', {})
        assumptions_checked = request.data.get('assumptions_checked', [])
        descriptives = request.data.get('descriptives')

        # Map test type string to enum
        test_type_map = {
            'independent_t_test': StatisticalTest.T_TEST_INDEPENDENT,
            'paired_t_test': StatisticalTest.T_TEST_PAIRED,
            'one_sample_t_test': StatisticalTest.T_TEST_ONE_SAMPLE,
            'one_way_anova': StatisticalTest.ANOVA_ONE_WAY,
            'two_way_anova': StatisticalTest.ANOVA_TWO_WAY,
            'pearson_correlation': StatisticalTest.CORRELATION_PEARSON,
            'spearman_correlation': StatisticalTest.CORRELATION_SPEARMAN,
            'linear_regression': StatisticalTest.REGRESSION_LINEAR,
            'chi_square': StatisticalTest.CHI_SQUARE,
            'mann_whitney': StatisticalTest.MANN_WHITNEY,
            'mediation': StatisticalTest.MEDIATION,
            'difference_in_differences': StatisticalTest.DID
        }

        test_type = test_type_map.get(test_type_str, StatisticalTest.T_TEST_INDEPENDENT)

        # Create StatisticalResult
        stat_result = StatisticalResult(
            test_type=test_type,
            test_statistic=results.get('test_statistic', 0),
            test_statistic_name=results.get('test_statistic_name', 't'),
            df=results.get('df'),
            p_value=results.get('p_value', 1.0),
            effect_size=results.get('effect_size'),
            effect_size_name=results.get('effect_size_name', 'd'),
            mean_1=results.get('mean_1'),
            mean_2=results.get('mean_2'),
            sd_1=results.get('sd_1'),
            sd_2=results.get('sd_2'),
            ci_lower=results.get('ci_lower'),
            ci_upper=results.get('ci_upper'),
            n_total=sample_info.get('n_total')
        )

        # Generate report
        reporter = get_report_generator()
        report = reporter.generate_full_report(
            results=[stat_result],
            sample_info=sample_info,
            variables=variables,
            assumptions_checked=assumptions_checked,
            descriptives=descriptives
        )

        return Response({
            'success': True,
            'report': {
                'methods': {
                    'content': report['methods'].content,
                    'formatting_notes': report['methods'].formatting_notes
                },
                'results': {
                    'content': report['results'].content,
                    'formatting_notes': report['results'].formatting_notes
                }
            },
            'formatted_statistic': reporter.format_statistic(stat_result)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception(f"Error generating APA report: {e}")
        return Response(
            {
                'success': False,
                'error': f'Failed to generate APA report: {str(e)}'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def enhanced_chat(request):
    """
    Enhanced chat with query parsing and plan generation.

    POST /api/v1/ai-advisor/enhanced-chat/
    {
        "message": "I want to compare two groups and check if there's a significant difference",
        "conversation_id": "optional",
        "data_context": {...},
        "include_plan": true,
        "include_parse": true
    }

    Returns:
        AI response with parsed query and analysis plan
    """
    try:
        message = request.data.get('message', '').strip()
        conversation_id = request.data.get('conversation_id')
        data_context = request.data.get('data_context')
        include_plan = request.data.get('include_plan', True)
        include_parse = request.data.get('include_parse', True)

        if not message:
            return Response(
                {
                    'success': False,
                    'error': 'Message is required'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not conversation_id:
            conversation_id = str(uuid.uuid4())

        response_data = {
            'success': True,
            'conversation_id': conversation_id
        }

        # Parse query if requested
        if include_parse:
            parser = get_query_parser()
            parsed = parser.parse(message, data_context)
            response_data['parsed_query'] = parsed.to_dict()

            # Generate plan if requested and query is substantive
            if include_plan and parsed.confidence_score > 0.3:
                planner = get_plan_generator()
                plan = planner.generate_plan(parsed, data_context)
                response_data['analysis_plan'] = plan.to_dict()

        # Also get AI response
        service = get_ai_advisor_service()
        ai_result = service.chat(
            message=message,
            conversation_id=conversation_id,
            data_context=data_context
        )

        if ai_result.get('success'):
            response_data['ai_response'] = ai_result.get('content')
            response_data['recommendations'] = ai_result.get('recommendations', [])
            response_data['metadata'] = ai_result.get('metadata')
        else:
            response_data['ai_response'] = None
            response_data['ai_error'] = ai_result.get('error')

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception(f"Error in enhanced chat: {e}")
        return Response(
            {
                'success': False,
                'error': f'Enhanced chat failed: {str(e)}'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
