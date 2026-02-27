"""
AI Advisor Service

Production-ready Claude API integration for StickForStats statistical guidance.
Implements scientifically rigorous, ethically sound AI assistance.

Author: StickForStats Team
Version: 1.0.0
"""

import os
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import threading

# Anthropic SDK
try:
    import anthropic

    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    anthropic = None

logger = logging.getLogger(__name__)


class MessageRole(Enum):
    """Message roles in conversation."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


@dataclass
class Message:
    """Represents a single message in conversation."""

    role: MessageRole
    content: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_api_format(self) -> Dict[str, str]:
        """Convert to Anthropic API format."""
        return {"role": self.role.value if self.role != MessageRole.SYSTEM else "user", "content": self.content}

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "role": self.role.value,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata,
        }


@dataclass
class Conversation:
    """Manages a single conversation thread."""

    conversation_id: str
    messages: List[Message] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    data_context: Optional[Dict[str, Any]] = None
    total_tokens_used: int = 0

    def add_message(self, role: MessageRole, content: str, metadata: Dict = None) -> Message:
        """Add a message to the conversation."""
        msg = Message(role=role, content=content, metadata=metadata or {})
        self.messages.append(msg)
        self.last_activity = datetime.now()
        return msg

    def get_messages_for_api(self) -> List[Dict[str, str]]:
        """Get messages in Anthropic API format (excludes system)."""
        return [msg.to_api_format() for msg in self.messages if msg.role != MessageRole.SYSTEM]

    def to_dict(self) -> Dict[str, Any]:
        """Serialize conversation."""
        return {
            "conversation_id": self.conversation_id,
            "messages": [msg.to_dict() for msg in self.messages],
            "created_at": self.created_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "data_context": self.data_context,
            "total_tokens_used": self.total_tokens_used,
        }


class RateLimiter:
    """
    Token bucket rate limiter for API requests.
    Prevents abuse while allowing burst usage.
    """

    def __init__(self, requests_per_minute: int = 20, tokens_per_minute: int = 100000):
        self.requests_per_minute = requests_per_minute
        self.tokens_per_minute = tokens_per_minute
        self.request_timestamps: List[datetime] = []
        self.token_usage: List[Tuple[datetime, int]] = []
        self.lock = threading.Lock()

    def can_make_request(self, estimated_tokens: int = 1000) -> Tuple[bool, Optional[str]]:
        """Check if a request can be made within rate limits."""
        with self.lock:
            now = datetime.now()
            minute_ago = now - timedelta(minutes=1)

            # Clean old entries
            self.request_timestamps = [ts for ts in self.request_timestamps if ts > minute_ago]
            self.token_usage = [(ts, tokens) for ts, tokens in self.token_usage if ts > minute_ago]

            # Check request limit
            if len(self.request_timestamps) >= self.requests_per_minute:
                return False, f"Rate limit exceeded: {self.requests_per_minute} requests/minute"

            # Check token limit
            total_tokens = sum(tokens for _, tokens in self.token_usage)
            if total_tokens + estimated_tokens > self.tokens_per_minute:
                return False, f"Token limit exceeded: {self.tokens_per_minute} tokens/minute"

            return True, None

    def record_request(self, tokens_used: int):
        """Record a completed request."""
        with self.lock:
            now = datetime.now()
            self.request_timestamps.append(now)
            self.token_usage.append((now, tokens_used))


class ConversationManager:
    """
    Manages multiple conversations with automatic cleanup.
    Thread-safe implementation for production use.
    """

    def __init__(self, max_conversations: int = 1000, conversation_ttl_hours: int = 24):
        self.conversations: Dict[str, Conversation] = {}
        self.max_conversations = max_conversations
        self.conversation_ttl = timedelta(hours=conversation_ttl_hours)
        self.lock = threading.Lock()

    def get_or_create(self, conversation_id: str) -> Conversation:
        """Get existing conversation or create new one."""
        with self.lock:
            self._cleanup_old_conversations()

            if conversation_id not in self.conversations:
                if len(self.conversations) >= self.max_conversations:
                    # Remove oldest conversation
                    oldest_id = min(self.conversations.keys(), key=lambda k: self.conversations[k].last_activity)
                    del self.conversations[oldest_id]

                self.conversations[conversation_id] = Conversation(conversation_id=conversation_id)

            return self.conversations[conversation_id]

    def _cleanup_old_conversations(self):
        """Remove conversations older than TTL."""
        now = datetime.now()
        expired = [cid for cid, conv in self.conversations.items() if now - conv.last_activity > self.conversation_ttl]
        for cid in expired:
            del self.conversations[cid]


# The scientifically rigorous system prompt
SYSTEM_PROMPT = """You are StickAI, an expert statistical advisor integrated into StickForStats, a professional statistical analysis platform designed for researchers, scientists, and PhD students.

## Your Core Identity
You are a knowledgeable, patient, and scientifically rigorous statistical consultant. You combine deep expertise in statistical methodology with the ability to explain complex concepts accessibly.

## Your Expertise Areas
- **Statistical Test Selection**: Choosing appropriate tests based on research questions, data types, and assumptions
- **Assumption Checking**: Normality, homogeneity of variance, independence, linearity
- **Effect Size Interpretation**: Cohen's d, eta-squared, r, odds ratios, and their practical significance
- **Power Analysis**: Sample size determination, power calculations, minimum detectable effects
- **Result Interpretation**: P-values, confidence intervals, Bayesian perspectives
- **APA Reporting**: Publication-ready statistical reporting formats
- **Research Design**: Between/within subjects, factorial designs, repeated measures

## Scientific Integrity Principles (CRITICAL)

### What You MUST Do:
1. **Be Accurate**: Only provide information you are confident is statistically correct
2. **Cite Conventions**: Reference established benchmarks (Cohen 1988, etc.) when relevant
3. **State Assumptions**: Always clarify what assumptions apply to your recommendations
4. **Acknowledge Uncertainty**: If unsure, say so. Recommend consulting additional resources
5. **Promote Best Practices**: Emphasize pre-registration, effect sizes, confidence intervals
6. **Warn Against Malpractice**: Actively discourage p-hacking, HARKing, selective reporting

### What You MUST NOT Do:
1. **Never recommend p-hacking**: Don't suggest running multiple tests to find significance
2. **Never encourage HARKing**: Don't help users fabricate hypotheses after seeing results
3. **Never downplay null results**: Null findings are valid scientific outcomes
4. **Never oversimplify dangerously**: Accuracy over accessibility when they conflict
5. **Never provide medical/clinical advice**: Refer to domain experts for applied decisions

## Response Guidelines

### Format Your Responses:
- Start with a **direct answer** to the question
- Follow with **explanation and context**
- Provide **practical next steps**
- Use **markdown formatting** for readability
- Include **formulas** when helpful (use standard notation)

### When Recommending Statistical Tests:
1. Ask clarifying questions if needed:
   - What is your research question?
   - What type of data do you have (continuous, categorical, ordinal)?
   - How many groups/conditions?
   - Are observations independent or related?
   - What is your sample size?

2. Consider assumptions:
   - Normality (Shapiro-Wilk, Q-Q plots)
   - Homogeneity of variance (Levene's test)
   - Independence (study design)
   - Linearity (for regression/correlation)

3. Provide alternatives:
   - Primary recommended test with justification
   - Non-parametric alternative if assumptions violated
   - Robust methods if appropriate

### When Interpreting Results:
1. **Statistical Significance**: Explain p-value in context, not just "significant/not significant"
2. **Effect Size**: Always emphasize practical significance
3. **Confidence Intervals**: Explain what they represent
4. **Limitations**: What can and cannot be concluded

### Effect Size Benchmarks (Cohen, 1988):
- Cohen's d: Small = 0.2, Medium = 0.5, Large = 0.8
- Eta-squared: Small = 0.01, Medium = 0.06, Large = 0.14
- Pearson's r: Small = 0.1, Medium = 0.3, Large = 0.5
- Odds Ratio: Small = 1.5, Medium = 2.5, Large = 4.0

## User Data Context
When users share their data context (variables, sample sizes, data types), use this information to provide personalized recommendations. The data context will be provided in the user's message when available.

Remember: Your goal is to help researchers make sound statistical decisions while maintaining the highest standards of scientific integrity. You are not just answering questions - you are contributing to the quality of scientific research."""


class AIAdvisorService:
    """
    Production-ready AI Statistical Advisor Service.

    Features:
    - Claude API integration with error handling
    - Conversation management with history
    - Rate limiting for abuse prevention
    - Data context injection for personalized advice
    - Structured response parsing
    """

    # Model configuration
    DEFAULT_MODEL = "claude-sonnet-4-20250514"
    FALLBACK_MODEL = "claude-3-5-sonnet-20241022"
    MAX_TOKENS = 4096
    TEMPERATURE = 0.3  # Lower temperature for more consistent, factual responses

    def __init__(self):
        """Initialize the AI Advisor Service."""
        self.api_key = os.environ.get("ANTHROPIC_API_KEY")
        self.client = None
        self.conversation_manager = ConversationManager()
        self.rate_limiter = RateLimiter(
            requests_per_minute=30, tokens_per_minute=150000  # Generous for single-user development
        )

        if ANTHROPIC_AVAILABLE and self.api_key:
            try:
                self.client = anthropic.Anthropic(api_key=self.api_key)
                logger.info("AI Advisor Service initialized with Claude API")
            except Exception as e:
                logger.error(f"Failed to initialize Anthropic client: {e}")
                self.client = None
        else:
            if not ANTHROPIC_AVAILABLE:
                logger.warning("Anthropic SDK not installed. Install with: pip install anthropic")
            if not self.api_key:
                logger.warning("ANTHROPIC_API_KEY not set. AI features will be limited.")

    @property
    def is_available(self) -> bool:
        """Check if AI service is available."""
        return self.client is not None

    def chat(self, message: str, conversation_id: str, data_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Send a message and get AI response.

        Args:
            message: User's message
            conversation_id: Unique conversation identifier
            data_context: Optional data context (variables, sample sizes, etc.)

        Returns:
            Dictionary with response and metadata
        """
        # Check availability
        if not self.is_available:
            return self._unavailable_response()

        # Check rate limits
        can_proceed, error_msg = self.rate_limiter.can_make_request(estimated_tokens=2000)
        if not can_proceed:
            return {"success": False, "error": error_msg, "error_type": "rate_limit", "retry_after_seconds": 60}

        # Get or create conversation
        conversation = self.conversation_manager.get_or_create(conversation_id)

        # Update data context if provided
        if data_context:
            conversation.data_context = data_context

        # Build user message with data context
        enriched_message = self._build_enriched_message(message, conversation.data_context)

        # Add user message to conversation
        conversation.add_message(MessageRole.USER, enriched_message)

        try:
            # Call Claude API
            start_time = time.time()

            response = self.client.messages.create(
                model=self.DEFAULT_MODEL,
                max_tokens=self.MAX_TOKENS,
                temperature=self.TEMPERATURE,
                system=SYSTEM_PROMPT,
                messages=conversation.get_messages_for_api(),
            )

            elapsed_time = time.time() - start_time

            # Extract response content
            assistant_content = response.content[0].text

            # Record token usage
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            total_tokens = input_tokens + output_tokens

            self.rate_limiter.record_request(total_tokens)
            conversation.total_tokens_used += total_tokens

            # Add assistant message to conversation
            conversation.add_message(
                MessageRole.ASSISTANT,
                assistant_content,
                metadata={
                    "model": response.model,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "response_time_ms": int(elapsed_time * 1000),
                },
            )

            # Parse for recommendations
            recommendations = self._extract_recommendations(assistant_content)

            return {
                "success": True,
                "content": assistant_content,
                "conversation_id": conversation_id,
                "recommendations": recommendations,
                "metadata": {
                    "model": response.model,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": total_tokens,
                    "response_time_ms": int(elapsed_time * 1000),
                    "conversation_length": len(conversation.messages),
                },
            }

        except anthropic.APIConnectionError as e:
            logger.error(f"API Connection Error: {e}")
            return {
                "success": False,
                "error": "Unable to connect to AI service. Please check your internet connection.",
                "error_type": "connection",
            }
        except anthropic.RateLimitError as e:
            logger.error(f"Rate Limit Error: {e}")
            return {
                "success": False,
                "error": "AI service rate limit reached. Please try again in a few minutes.",
                "error_type": "rate_limit",
                "retry_after_seconds": 60,
            }
        except anthropic.APIStatusError as e:
            logger.error(f"API Status Error: {e}")
            return {"success": False, "error": f"AI service error: {e.message}", "error_type": "api_error"}
        except Exception as e:
            logger.exception(f"Unexpected error in AI chat: {e}")
            return {
                "success": False,
                "error": "An unexpected error occurred. Please try again.",
                "error_type": "unknown",
            }

    def _build_enriched_message(self, message: str, data_context: Optional[Dict[str, Any]]) -> str:
        """Build message with data context if available."""
        if not data_context:
            return message

        context_parts = []

        # Add variable information
        if "variables" in data_context:
            vars_info = []
            for var in data_context["variables"]:
                var_str = f"- {var.get('name', 'Unknown')}: {var.get('type', 'unknown')} type"
                if var.get("n"):
                    var_str += f", n={var['n']}"
                if var.get("missing"):
                    var_str += f", {var['missing']} missing values"
                vars_info.append(var_str)

            if vars_info:
                context_parts.append("**My Data Variables:**\n" + "\n".join(vars_info))

        # Add sample size
        if "sample_size" in data_context:
            context_parts.append(f"**Total Sample Size:** {data_context['sample_size']}")

        # Add group information
        if "groups" in data_context:
            groups_info = data_context["groups"]
            if isinstance(groups_info, dict):
                groups_str = ", ".join([f"{k}: n={v}" for k, v in groups_info.items()])
                context_parts.append(f"**Groups:** {groups_str}")
            elif isinstance(groups_info, int):
                context_parts.append(f"**Number of Groups:** {groups_info}")

        # Add Guardian warnings if present
        if "guardian_warnings" in data_context and data_context["guardian_warnings"]:
            warnings = data_context["guardian_warnings"]
            context_parts.append("**Data Quality Warnings:**\n" + "\n".join([f"- {w}" for w in warnings]))

        # Add assumption check results if present
        if "assumptions" in data_context:
            assumptions = data_context["assumptions"]
            assumption_strs = []
            for name, result in assumptions.items():
                status = "✓ Met" if result.get("passed") else "✗ Violated"
                assumption_strs.append(f"- {name}: {status}")
            if assumption_strs:
                context_parts.append("**Assumption Checks:**\n" + "\n".join(assumption_strs))

        if context_parts:
            context_block = "\n\n".join(context_parts)
            return f"[DATA CONTEXT]\n{context_block}\n\n[MY QUESTION]\n{message}"

        return message

    def _extract_recommendations(self, content: str) -> List[Dict[str, Any]]:
        """Extract test recommendations from response content."""
        recommendations = []

        # Pattern matching for common test mentions
        test_patterns = {
            "independent-t-test": [
                r"independent[- ]?samples?\s*t[- ]?test",
                r"two[- ]?sample\s*t[- ]?test",
                r"unpaired\s*t[- ]?test",
            ],
            "paired-t-test": [
                r"paired[- ]?samples?\s*t[- ]?test",
                r"dependent\s*t[- ]?test",
                r"repeated\s*measures\s*t[- ]?test",
            ],
            "one-sample-t-test": [r"one[- ]?sample\s*t[- ]?test", r"single[- ]?sample\s*t[- ]?test"],
            "mann-whitney": [r"mann[- ]?whitney", r"wilcoxon\s*rank[- ]?sum"],
            "wilcoxon": [r"wilcoxon\s*signed[- ]?rank", r"wilcoxon\s*test"],  # Be more specific in context
            "one-way-anova": [r"one[- ]?way\s*anova", r"single[- ]?factor\s*anova"],
            "two-way-anova": [r"two[- ]?way\s*anova", r"factorial\s*anova"],
            "repeated-measures-anova": [r"repeated[- ]?measures\s*anova", r"within[- ]?subjects?\s*anova"],
            "kruskal-wallis": [r"kruskal[- ]?wallis"],
            "friedman": [r"friedman\s*test"],
            "pearson-correlation": [r"pearson[\'s]?\s*(?:correlation|r)", r"pearson\s*product[- ]?moment"],
            "spearman-correlation": [r"spearman[\'s]?\s*(?:correlation|rho|ρ)"],
            "chi-square": [r"chi[- ]?square", r"χ²\s*test"],
            "fisher-exact": [r"fisher[\'s]?\s*exact"],
            "linear-regression": [r"(?:simple|linear)\s*regression", r"ols\s*regression"],
            "logistic-regression": [r"logistic\s*regression", r"binary\s*logistic"],
        }

        import re

        content_lower = content.lower()

        # Test name to display name mapping
        display_names = {
            "independent-t-test": "Independent Samples t-test",
            "paired-t-test": "Paired Samples t-test",
            "one-sample-t-test": "One-Sample t-test",
            "mann-whitney": "Mann-Whitney U Test",
            "wilcoxon": "Wilcoxon Signed-Rank Test",
            "one-way-anova": "One-Way ANOVA",
            "two-way-anova": "Two-Way ANOVA",
            "repeated-measures-anova": "Repeated Measures ANOVA",
            "kruskal-wallis": "Kruskal-Wallis H Test",
            "friedman": "Friedman Test",
            "pearson-correlation": "Pearson Correlation",
            "spearman-correlation": "Spearman Correlation",
            "chi-square": "Chi-Square Test",
            "fisher-exact": "Fisher's Exact Test",
            "linear-regression": "Linear Regression",
            "logistic-regression": "Logistic Regression",
        }

        found_tests = set()

        for test_id, patterns in test_patterns.items():
            for pattern in patterns:
                if re.search(pattern, content_lower):
                    if test_id not in found_tests:
                        found_tests.add(test_id)
                        recommendations.append(
                            {
                                "test_id": test_id,
                                "name": display_names.get(test_id, test_id),
                                "confidence": 80,  # Default confidence
                            }
                        )
                    break

        # Boost confidence for tests mentioned with "recommend" or "suggest"
        recommend_patterns = [
            r"(?:recommend|suggest|use)\s+(?:an?\s+)?(\w+[- ]?\w*\s*(?:t[- ]?test|anova|test|correlation|regression))",
        ]

        for pattern in recommend_patterns:
            matches = re.findall(pattern, content_lower)
            for match in matches:
                for rec in recommendations:
                    if match in rec["name"].lower():
                        rec["confidence"] = min(95, rec["confidence"] + 15)

        return recommendations[:5]  # Limit to top 5 recommendations

    def _unavailable_response(self) -> Dict[str, Any]:
        """Return response when AI is not available."""
        return {
            "success": False,
            "error": "AI Advisor is not available. Please set ANTHROPIC_API_KEY environment variable.",
            "error_type": "configuration",
            "fallback_content": """I'm currently unable to provide AI-powered responses because the service is not configured.

**To enable AI features:**
1. Get an API key from https://console.anthropic.com/
2. Set the ANTHROPIC_API_KEY environment variable
3. Restart the server

**In the meantime, you can:**
- Use our statistical test selector wizard
- Check our educational modules for guidance
- Review the Power Analysis learning hub
- Consult our assumption checking tools""",
        }

    def get_conversation_history(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation history."""
        conversation = self.conversation_manager.conversations.get(conversation_id)
        if conversation:
            return conversation.to_dict()
        return None

    def clear_conversation(self, conversation_id: str) -> bool:
        """Clear a conversation."""
        with self.conversation_manager.lock:
            if conversation_id in self.conversation_manager.conversations:
                del self.conversation_manager.conversations[conversation_id]
                return True
        return False

    def get_service_status(self) -> Dict[str, Any]:
        """Get service health status."""
        return {
            "available": self.is_available,
            "api_key_configured": bool(self.api_key),
            "sdk_installed": ANTHROPIC_AVAILABLE,
            "model": self.DEFAULT_MODEL,
            "active_conversations": len(self.conversation_manager.conversations),
            "rate_limit": {
                "requests_per_minute": self.rate_limiter.requests_per_minute,
                "tokens_per_minute": self.rate_limiter.tokens_per_minute,
            },
        }


# Singleton instance
_service_instance = None
_service_lock = threading.Lock()


def get_ai_advisor_service() -> AIAdvisorService:
    """Get or create the AI Advisor service singleton."""
    global _service_instance

    if _service_instance is None:
        with _service_lock:
            if _service_instance is None:
                _service_instance = AIAdvisorService()

    return _service_instance
