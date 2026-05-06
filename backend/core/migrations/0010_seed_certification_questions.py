"""Seed the initial certification question bank from the old in-memory dict.

Carries over the 10 questions that were previously hardcoded inside
``backend/core/services/certification_service.py`` (5 foundations,
3 practitioner, 2 expert). Future questions are added through the DB,
not by editing source code.

Operators expanding the bank should add new ``CertificationQuestion``
rows directly (Django admin or a separate data migration). The
``is_active`` flag lets retired questions stay in the database for
audit purposes without showing up in new exams.
"""

from django.db import migrations


_INITIAL_QUESTIONS = {
    "foundations": [
        {
            "id": "f001",
            "question": (
                "Which statistical test is most appropriate for comparing "
                "means of two independent groups with normally distributed data?"
            ),
            "options": [
                "Independent samples t-test",
                "Paired samples t-test",
                "Chi-square test",
                "Mann-Whitney U test",
            ],
            "correct": 0,
            "explanation": (
                "The independent samples t-test compares means of two "
                "unrelated groups when data is normally distributed."
            ),
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
            "explanation": (
                "A p-value represents the probability of observing data as "
                "extreme as the sample data, assuming the null hypothesis is true."
            ),
            "topic": "Hypothesis Testing Fundamentals",
        },
        {
            "id": "f003",
            "question": "Which measure of central tendency is most robust to outliers?",
            "options": ["Mean", "Median", "Mode", "Standard deviation"],
            "correct": 1,
            "explanation": (
                "The median is resistant to extreme values because it depends only on the middle value(s)."
            ),
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
            "explanation": (
                "The NormalityValidator uses the Shapiro-Wilk test (n <= 5000) "
                "or D'Agostino-Pearson test (n > 5000) to check normality."
            ),
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
            "explanation": (
                "The SQS assumption reporting rules verify that authors documented their "
                "assumption checks (normality, homogeneity, etc.)."
            ),
            "topic": "SQS Manuscript Quality Scoring",
        },
        {
            "id": "e002",
            "question": "In the autonomous analysis pipeline, when does the system invoke Claude AI?",
            "options": [
                "For every query",
                "Only when the parser confidence is below 0.6",
                "Only for visualization generation",
                "Never -- all analysis is deterministic",
            ],
            "correct": 1,
            "explanation": (
                "The autonomous pipeline uses template-based parsing first and only calls Claude "
                "when confidence < 0.6, minimizing cost."
            ),
            "topic": "Autonomous Analysis Pipeline",
        },
    ],
}


def seed_questions(apps, schema_editor):
    Question = apps.get_model("core", "CertificationQuestion")
    # Idempotent: only insert if the legacy id (e.g., "f001") has not
    # already been seeded under this topic. We use (level, topic,
    # question_text[:80]) as the natural key since the autogenerated
    # UUIDs differ per run.
    for level, items in _INITIAL_QUESTIONS.items():
        for item in items:
            exists = Question.objects.filter(
                level=level,
                topic=item["topic"],
                question_text=item["question"],
            ).exists()
            if exists:
                continue
            Question.objects.create(
                level=level,
                question_text=item["question"],
                options=item["options"],
                correct_index=item["correct"],
                explanation=item["explanation"],
                topic=item["topic"],
                is_active=True,
            )


def unseed_questions(apps, schema_editor):
    # Reverse migration: only delete rows that match the seed payload
    # so a hand-curated bank isn't wiped out by `migrate core 0009`.
    Question = apps.get_model("core", "CertificationQuestion")
    for level, items in _INITIAL_QUESTIONS.items():
        for item in items:
            Question.objects.filter(
                level=level,
                topic=item["topic"],
                question_text=item["question"],
            ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0009_add_certification_models"),
    ]

    operations = [
        migrations.RunPython(seed_questions, unseed_questions),
    ]
