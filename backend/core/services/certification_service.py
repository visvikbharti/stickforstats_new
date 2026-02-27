"""
Certification Program Service
==============================
Manages the "StickForStats Certified Analyst" certification program.
Tracks exam attempts, issues certificates, and validates credentials.
"""

import hashlib
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)


# Certification levels
CERTIFICATION_LEVELS = [
    {
        "id": "foundations",
        "name": "StickForStats Foundations",
        "description": "Core statistical concepts, data profiling, basic tests (t-test, ANOVA, chi-square)",
        "passing_score": 70,
        "time_limit_minutes": 60,
        "question_count": 40,
        "validity_years": 2,
        "prerequisites": [],
        "topics": [
            "Descriptive Statistics",
            "Normal Distribution",
            "Hypothesis Testing Fundamentals",
            "t-tests (Independent, Paired, One-Sample)",
            "Chi-Square Test",
            "Correlation (Pearson, Spearman)",
            "Data Types and Measurement Scales",
            "Using StickForStats Interface",
        ],
        "badge_color": "#4CAF50",
    },
    {
        "id": "practitioner",
        "name": "StickForStats Certified Practitioner",
        "description": "ANOVA, regression, non-parametric tests, Guardian system, assumption checking",
        "passing_score": 75,
        "time_limit_minutes": 90,
        "question_count": 50,
        "validity_years": 2,
        "prerequisites": ["foundations"],
        "topics": [
            "One-Way and Two-Way ANOVA",
            "Multiple Regression",
            "Logistic Regression",
            "Non-Parametric Tests (Mann-Whitney, Kruskal-Wallis, Wilcoxon)",
            "Guardian Statistical Protection System",
            "Statistical Assumptions and Validation",
            "Effect Size Interpretation",
            "Power Analysis",
            "Missing Data Handling",
        ],
        "badge_color": "#2196F3",
    },
    {
        "id": "expert",
        "name": "StickForStats Certified Expert",
        "description": "Advanced methods, SQS scoring, manuscript review, autonomous analysis",
        "passing_score": 80,
        "time_limit_minutes": 120,
        "question_count": 60,
        "validity_years": 3,
        "prerequisites": ["practitioner"],
        "topics": [
            "Factor Analysis and PCA",
            "Survival Analysis",
            "Mixed-Effects Models",
            "Meta-Analysis",
            "Bayesian Statistics",
            "Design of Experiments",
            "SQS Manuscript Quality Scoring",
            "Autonomous Analysis Pipeline",
            "Statistical Consulting Best Practices",
            "APA Reporting Standards",
        ],
        "badge_color": "#9C27B0",
    },
]

# Sample question bank (in production this would be database-backed)
QUESTION_BANK = {
    "foundations": [
        {
            "id": "f001",
            "question": "Which statistical test is most appropriate for comparing means of two independent groups with normally distributed data?",
            "options": [
                "Independent samples t-test",
                "Paired samples t-test",
                "Chi-square test",
                "Mann-Whitney U test",
            ],
            "correct": 0,
            "explanation": "The independent samples t-test compares means of two unrelated groups when data is normally distributed.",
            "topic": "Hypothesis Testing Fundamentals",
        },
        {
            "id": "f002",
            "question": "What does a p-value of 0.03 mean?",
            "options": [
                "There is a 3% probability the null hypothesis is true",
                "There is a 3% probability of observing data this extreme if the null hypothesis is true",
                "The effect size is 0.03",
                "The result is 97% accurate",
            ],
            "correct": 1,
            "explanation": "A p-value represents the probability of observing data as extreme as the sample data, assuming the null hypothesis is true.",
            "topic": "Hypothesis Testing Fundamentals",
        },
        {
            "id": "f003",
            "question": "Which measure of central tendency is most robust to outliers?",
            "options": ["Mean", "Median", "Mode", "Standard deviation"],
            "correct": 1,
            "explanation": "The median is resistant to extreme values because it depends only on the middle value(s).",
            "topic": "Descriptive Statistics",
        },
        {
            "id": "f004",
            "question": "What does the Guardian system's NormalityValidator check?",
            "options": [
                "Whether group sizes are equal",
                "Whether variances are homogeneous",
                "Whether data follows a normal distribution",
                "Whether observations are independent",
            ],
            "correct": 2,
            "explanation": "The NormalityValidator uses the Shapiro-Wilk test (n <= 5000) or D'Agostino-Pearson test (n > 5000) to check normality.",
            "topic": "Using StickForStats Interface",
        },
        {
            "id": "f005",
            "question": "When should you use Spearman correlation instead of Pearson?",
            "options": [
                "When both variables are normally distributed",
                "When the relationship is linear",
                "When data is ordinal or the relationship is monotonic but not linear",
                "When sample size is large",
            ],
            "correct": 2,
            "explanation": "Spearman rank correlation handles ordinal data and monotonic non-linear relationships.",
            "topic": "Correlation (Pearson, Spearman)",
        },
    ],
    "practitioner": [
        {
            "id": "p001",
            "question": "What does the Guardian's VarianceHomogeneityValidator use to test equal variances?",
            "options": ["Bartlett's test", "Levene's test (median-based)", "F-test", "Brown-Forsythe test"],
            "correct": 1,
            "explanation": "StickForStats uses Levene's test with the median, which is robust to non-normality.",
            "topic": "Guardian Statistical Protection System",
        },
        {
            "id": "p002",
            "question": "What is Cohen's d = 0.8 generally considered?",
            "options": ["Small effect", "Medium effect", "Large effect", "Very large effect"],
            "correct": 2,
            "explanation": "Cohen's conventions: d = 0.2 (small), d = 0.5 (medium), d = 0.8 (large).",
            "topic": "Effect Size Interpretation",
        },
        {
            "id": "p003",
            "question": "When Guardian blocks a t-test due to non-normality, what alternative does it suggest?",
            "options": ["ANOVA", "Mann-Whitney U test", "Chi-square test", "Linear regression"],
            "correct": 1,
            "explanation": "The Mann-Whitney U test is the non-parametric alternative to the independent t-test.",
            "topic": "Guardian Statistical Protection System",
        },
    ],
    "expert": [
        {
            "id": "e001",
            "question": 'What does the SQS engine check for in the "Assumption Reporting" category?',
            "options": [
                "Whether the paper has an abstract",
                "Whether statistical assumptions were tested and reported",
                "Whether the sample size is adequate",
                "Whether references are formatted correctly",
            ],
            "correct": 1,
            "explanation": "The SQS assumption reporting rules verify that authors documented their assumption checks (normality, homogeneity, etc.).",
            "topic": "SQS Manuscript Quality Scoring",
        },
        {
            "id": "e002",
            "question": "In the autonomous analysis pipeline, when does the system invoke Claude AI?",
            "options": [
                "For every query",
                "Only when the parser confidence is below 0.6",
                "Only for visualization generation",
                "Never — all analysis is deterministic",
            ],
            "correct": 1,
            "explanation": "The autonomous pipeline uses template-based parsing first and only calls Claude when confidence < 0.6, minimizing cost.",
            "topic": "Autonomous Analysis Pipeline",
        },
    ],
}


class CertificationService:
    """Manages certification exams, scoring, and credential issuance."""

    @classmethod
    def get_certification_levels(cls):
        """Return all available certification levels."""
        return CERTIFICATION_LEVELS

    @classmethod
    def get_level_details(cls, level_id):
        """Get details for a specific certification level."""
        for level in CERTIFICATION_LEVELS:
            if level["id"] == level_id:
                return level
        return None

    @classmethod
    def check_prerequisites(cls, user, level_id):
        """Check if user meets prerequisites for a certification level."""
        level = cls.get_level_details(level_id)
        if not level:
            return {"met": False, "error": "Level not found"}

        # In production, check CertificationRecord model
        # For now, return prerequisite info
        return {
            "met": True,
            "prerequisites": level["prerequisites"],
            "message": "Prerequisites met"
            if not level["prerequisites"]
            else f"Requires: {', '.join(level['prerequisites'])}",
        }

    @classmethod
    def generate_exam(cls, level_id, seed=None):
        """Generate an exam with randomized questions for a level."""
        level = cls.get_level_details(level_id)
        if not level:
            return None

        questions = QUESTION_BANK.get(level_id, [])

        # In production, randomly select question_count from a larger bank
        exam_id = str(uuid.uuid4())

        return {
            "exam_id": exam_id,
            "level": level_id,
            "level_name": level["name"],
            "question_count": len(questions),
            "time_limit_minutes": level["time_limit_minutes"],
            "passing_score": level["passing_score"],
            "questions": [
                {
                    "id": q["id"],
                    "question": q["question"],
                    "options": q["options"],
                    "topic": q["topic"],
                    # Don't include correct answer!
                }
                for q in questions
            ],
        }

    @classmethod
    def grade_exam(cls, level_id, answers):
        """
        Grade a submitted exam.
        answers: dict mapping question_id -> selected_option_index
        """
        questions = QUESTION_BANK.get(level_id, [])
        level = cls.get_level_details(level_id)
        if not level or not questions:
            return {"error": "Invalid level"}

        correct = 0
        total = len(questions)
        results = []

        for q in questions:
            user_answer = answers.get(q["id"])
            is_correct = user_answer == q["correct"]
            if is_correct:
                correct += 1
            results.append(
                {
                    "question_id": q["id"],
                    "correct": is_correct,
                    "your_answer": user_answer,
                    "correct_answer": q["correct"],
                    "explanation": q["explanation"],
                    "topic": q["topic"],
                }
            )

        score = round((correct / max(total, 1)) * 100, 1)
        passed = score >= level["passing_score"]

        # Generate certificate ID if passed
        certificate_id = None
        if passed:
            raw = f"{level_id}-{datetime.utcnow().isoformat()}-{uuid.uuid4()}"
            certificate_id = f"SFS-{level_id[:3].upper()}-{hashlib.sha256(raw.encode()).hexdigest()[:12].upper()}"

        return {
            "score": score,
            "passing_score": level["passing_score"],
            "passed": passed,
            "correct": correct,
            "total": total,
            "certificate_id": certificate_id,
            "level": level_id,
            "level_name": level["name"],
            "validity_years": level["validity_years"] if passed else None,
            "results": results,
            "topic_breakdown": cls._topic_breakdown(results),
        }

    @classmethod
    def _topic_breakdown(cls, results):
        """Calculate score breakdown by topic."""
        topics = {}
        for r in results:
            topic = r["topic"]
            if topic not in topics:
                topics[topic] = {"correct": 0, "total": 0}
            topics[topic]["total"] += 1
            if r["correct"]:
                topics[topic]["correct"] += 1

        return [
            {
                "topic": topic,
                "correct": data["correct"],
                "total": data["total"],
                "percentage": round((data["correct"] / data["total"]) * 100, 1),
            }
            for topic, data in sorted(topics.items())
        ]

    @classmethod
    def verify_certificate(cls, certificate_id):
        """Verify a certificate ID is valid."""
        if not certificate_id or not certificate_id.startswith("SFS-"):
            return {"valid": False, "error": "Invalid certificate format"}

        # In production, look up in CertificationRecord model
        return {
            "valid": True,
            "certificate_id": certificate_id,
            "message": "Certificate verification would check the database in production",
        }
