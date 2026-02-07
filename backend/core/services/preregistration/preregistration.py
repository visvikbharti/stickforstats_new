"""
Pre-Registration Core Module
============================

Main pre-registration document creation and export.

Features:
- Complete pre-registration builder
- Export to OSF JSON format
- Export to Markdown
- Export to PDF-ready format

Created: December 26, 2025
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
import json
import uuid

from .templates import PreRegistrationTemplate, get_template, TemplateSection
from .hypothesis import Hypothesis, HypothesisFormulator
from .sample_size import SampleSizeJustification
from .analysis_plan import AnalysisPlan


@dataclass
class PreRegistration:
    """Complete pre-registration document."""
    id: str
    title: str
    template_name: str
    created_at: datetime
    updated_at: datetime
    status: str = "draft"  # draft, submitted, registered
    authors: List[str] = field(default_factory=list)
    affiliations: List[str] = field(default_factory=list)
    hypotheses: List[Hypothesis] = field(default_factory=list)
    sample_justification: Optional[SampleSizeJustification] = None
    analysis_plan: Optional[AnalysisPlan] = None
    template_data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'title': self.title,
            'template_name': self.template_name,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'status': self.status,
            'authors': self.authors,
            'affiliations': self.affiliations,
            'hypotheses': [h.to_dict() for h in self.hypotheses],
            'sample_justification': self.sample_justification.to_dict() if self.sample_justification else None,
            'analysis_plan': self.analysis_plan.to_dict() if self.analysis_plan else None,
            'template_data': self.template_data,
            'metadata': self.metadata
        }

    def validate(self) -> Dict[str, List[str]]:
        """Validate the pre-registration completeness."""
        errors = {}
        warnings = {}

        # Required fields
        if not self.title:
            errors['title'] = ["Title is required"]

        if not self.hypotheses:
            warnings['hypotheses'] = ["No hypotheses specified"]

        if not self.sample_justification:
            warnings['sample_size'] = ["No sample size justification provided"]

        if not self.analysis_plan:
            warnings['analysis_plan'] = ["No analysis plan specified"]

        # Validate against template
        template = get_template(self.template_name)
        template_errors = template.validate(self.template_data)
        if template_errors:
            errors['template'] = template_errors

        # Validate analysis plan
        if self.analysis_plan:
            plan_warnings = self.analysis_plan.validate()
            if plan_warnings:
                warnings['analysis_plan_warnings'] = plan_warnings

        return {'errors': errors, 'warnings': warnings}

    def get_completion_percentage(self) -> float:
        """Calculate completion percentage."""
        template = get_template(self.template_name)
        required_fields = template.get_required_fields()

        if not required_fields:
            return 100.0

        completed = sum(1 for f in required_fields if f.id in self.template_data)
        return (completed / len(required_fields)) * 100


class PreRegistrationBuilder:
    """
    Builder for creating pre-registrations step by step.

    Guides users through the pre-registration process with
    validation and suggestions at each step.
    """

    def __init__(self, template_name: str = "osf"):
        self.template = get_template(template_name)
        self.prereg = PreRegistration(
            id=str(uuid.uuid4()),
            title="",
            template_name=template_name,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        self.hypothesis_formulator = HypothesisFormulator()
        self._current_section = 0

    def set_title(self, title: str) -> 'PreRegistrationBuilder':
        """Set the study title."""
        self.prereg.title = title
        self.prereg.template_data['study_title'] = title
        self.prereg.updated_at = datetime.now()
        return self

    def set_authors(self, authors: List[str], affiliations: List[str] = None) -> 'PreRegistrationBuilder':
        """Set authors and affiliations."""
        self.prereg.authors = authors
        if affiliations:
            self.prereg.affiliations = affiliations

        # Format for template
        author_text = "\n".join([
            f"{author} ({aff})" if affiliations and i < len(affiliations) else author
            for i, (author, aff) in enumerate(zip(authors, affiliations or []))
        ])
        self.prereg.template_data['authors'] = author_text
        self.prereg.updated_at = datetime.now()
        return self

    def add_hypothesis(self, **kwargs) -> Hypothesis:
        """Add a hypothesis using the formulator."""
        hypothesis = self.hypothesis_formulator.create_hypothesis(**kwargs)
        self.prereg.hypotheses.append(hypothesis)
        self.prereg.updated_at = datetime.now()
        return hypothesis

    def set_sample_justification(self, justification: SampleSizeJustification) -> 'PreRegistrationBuilder':
        """Set sample size justification."""
        self.prereg.sample_justification = justification
        self.prereg.template_data['sample_size'] = justification.target_n
        self.prereg.template_data['sample_size_rationale'] = justification.strategy.value
        self.prereg.template_data['power_analysis'] = justification.generate_text()
        self.prereg.updated_at = datetime.now()
        return self

    def set_analysis_plan(self, plan: AnalysisPlan) -> 'PreRegistrationBuilder':
        """Set the analysis plan."""
        self.prereg.analysis_plan = plan
        self.prereg.template_data['statistical_analyses'] = plan.generate_text()
        self.prereg.updated_at = datetime.now()
        return self

    def set_field(self, field_id: str, value: Any) -> 'PreRegistrationBuilder':
        """Set a template field value."""
        self.prereg.template_data[field_id] = value
        self.prereg.updated_at = datetime.now()
        return self

    def get_next_section(self) -> Optional[TemplateSection]:
        """Get the next section to complete."""
        if self._current_section < len(self.template.sections):
            return self.template.sections[self._current_section]
        return None

    def get_section_fields(self, section: TemplateSection) -> List[Dict[str, Any]]:
        """Get fields for a specific section."""
        fields = self.template.get_fields_by_section(section)
        return [
            {
                'id': f.id,
                'label': f.label,
                'description': f.description,
                'required': f.required,
                'field_type': f.field_type,
                'options': f.options,
                'placeholder': f.placeholder,
                'help_text': f.help_text,
                'current_value': self.prereg.template_data.get(f.id, ''),
                'completed': f.id in self.prereg.template_data
            }
            for f in fields
        ]

    def advance_section(self) -> bool:
        """Move to the next section."""
        if self._current_section < len(self.template.sections) - 1:
            self._current_section += 1
            return True
        return False

    def build(self) -> PreRegistration:
        """Build and return the pre-registration."""
        # Update hypotheses section in template data
        if self.prereg.hypotheses:
            hypotheses_text = self.hypothesis_formulator.generate_hypotheses_section()
            self.prereg.template_data['hypotheses'] = hypotheses_text

        self.prereg.updated_at = datetime.now()
        return self.prereg

    def get_progress(self) -> Dict[str, Any]:
        """Get current progress information."""
        return {
            'completion_percentage': self.prereg.get_completion_percentage(),
            'current_section': self.template.sections[self._current_section].value if self._current_section < len(self.template.sections) else None,
            'sections_completed': self._current_section,
            'total_sections': len(self.template.sections),
            'validation': self.prereg.validate()
        }


def export_to_osf_json(prereg: PreRegistration) -> str:
    """
    Export pre-registration to OSF-compatible JSON format.

    Args:
        prereg: PreRegistration object

    Returns:
        JSON string in OSF format
    """
    osf_data = {
        'schema_version': '1.0',
        'registered': datetime.now().isoformat(),
        'registration_type': prereg.template_name,
        'data': {
            'q1': {  # Study Information
                'question': 'Study Title',
                'value': prereg.title
            },
            'q2': {
                'question': 'Authors',
                'value': ', '.join(prereg.authors)
            },
            'q3': {
                'question': 'Hypotheses',
                'value': '\n\n'.join([h.to_formal_statement() for h in prereg.hypotheses])
            },
            'q4': {
                'question': 'Sample Size',
                'value': prereg.sample_justification.generate_text() if prereg.sample_justification else ''
            },
            'q5': {
                'question': 'Analysis Plan',
                'value': prereg.analysis_plan.generate_text() if prereg.analysis_plan else ''
            }
        },
        'additional_data': prereg.template_data,
        'metadata': {
            'created_at': prereg.created_at.isoformat(),
            'updated_at': prereg.updated_at.isoformat(),
            'status': prereg.status,
            'prereg_id': prereg.id
        }
    }

    return json.dumps(osf_data, indent=2)


def export_to_markdown(prereg: PreRegistration) -> str:
    """
    Export pre-registration to Markdown format.

    Args:
        prereg: PreRegistration object

    Returns:
        Markdown string
    """
    md = f"# Pre-Registration: {prereg.title}\n\n"
    md += f"**Template:** {prereg.template_name}\n"
    md += f"**Created:** {prereg.created_at.strftime('%Y-%m-%d')}\n"
    md += f"**Status:** {prereg.status}\n\n"

    # Authors
    if prereg.authors:
        md += "## Authors\n\n"
        for i, author in enumerate(prereg.authors):
            affiliation = prereg.affiliations[i] if i < len(prereg.affiliations) else ""
            md += f"- {author}"
            if affiliation:
                md += f" ({affiliation})"
            md += "\n"
        md += "\n"

    # Hypotheses
    if prereg.hypotheses:
        md += "## Hypotheses\n\n"
        for h in prereg.hypotheses:
            md += h.to_formal_statement()
            md += "\n---\n\n"

    # Sample Size
    if prereg.sample_justification:
        md += "## Sample Size Justification\n\n"
        md += prereg.sample_justification.generate_text()
        md += "\n"

    # Analysis Plan
    if prereg.analysis_plan:
        md += prereg.analysis_plan.generate_text()

    # Additional Template Data
    template = get_template(prereg.template_name)
    md += "## Additional Information\n\n"

    for field_def in template.fields:
        if field_def.id in prereg.template_data:
            value = prereg.template_data[field_def.id]
            if value:
                md += f"### {field_def.label}\n\n"
                md += f"{value}\n\n"

    return md


def export_to_pdf_data(prereg: PreRegistration) -> Dict[str, Any]:
    """
    Generate data structure for PDF generation.

    This can be used with a PDF library (e.g., reportlab, weasyprint)
    to generate a PDF document.

    Args:
        prereg: PreRegistration object

    Returns:
        Dictionary with structured data for PDF generation
    """
    sections = []

    # Title page
    sections.append({
        'type': 'title_page',
        'title': prereg.title,
        'subtitle': f'Pre-Registration ({prereg.template_name})',
        'authors': prereg.authors,
        'affiliations': prereg.affiliations,
        'date': prereg.created_at.strftime('%B %d, %Y')
    })

    # Hypotheses section
    if prereg.hypotheses:
        hypothesis_content = []
        for h in prereg.hypotheses:
            hypothesis_content.append({
                'id': h.id,
                'description': h.description,
                'null': h.null_hypothesis,
                'alternative': h.alternative_hypothesis,
                'test': h.recommended_test
            })
        sections.append({
            'type': 'hypotheses',
            'title': 'Hypotheses',
            'content': hypothesis_content
        })

    # Sample Size section
    if prereg.sample_justification:
        sections.append({
            'type': 'sample_size',
            'title': 'Sample Size Justification',
            'content': prereg.sample_justification.generate_text()
        })

    # Analysis Plan section
    if prereg.analysis_plan:
        sections.append({
            'type': 'analysis_plan',
            'title': 'Analysis Plan',
            'content': prereg.analysis_plan.generate_text()
        })

    # Additional sections from template data
    template = get_template(prereg.template_name)
    for section in template.sections:
        fields = template.get_fields_by_section(section)
        section_content = []
        for field_def in fields:
            if field_def.id in prereg.template_data:
                section_content.append({
                    'label': field_def.label,
                    'value': prereg.template_data[field_def.id]
                })
        if section_content:
            sections.append({
                'type': 'template_section',
                'title': section.value.replace('_', ' ').title(),
                'content': section_content
            })

    return {
        'prereg_id': prereg.id,
        'sections': sections,
        'metadata': {
            'created': prereg.created_at.isoformat(),
            'updated': prereg.updated_at.isoformat(),
            'template': prereg.template_name,
            'status': prereg.status
        }
    }
