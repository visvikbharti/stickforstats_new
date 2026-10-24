"""The landing page's validator count must equal the number of validators Guardian registers.

The page said "8 validators" while GuardianCore registered 9 (similar_shapes was the ninth),
because nothing tied the copy to the code. This test reads the page's source and compares
every validator count in it with the registry, so the next validator added or removed makes
it fail until the page is updated too.
"""

import re
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

from core.guardian.guardian_core import GuardianCore

LANDING = Path(settings.BASE_DIR).parent / "frontend" / "src" / "components" / "Landing" / "ProfessionalLanding.jsx"


class LandingValidatorCountTest(SimpleTestCase):
    def test_every_validator_count_on_the_landing_page_matches_the_registry(self):
        source = LANDING.read_text(encoding="utf-8")
        registered = len(GuardianCore().validators)

        # "9 assumption validators guard ..." (hero) and "9 Validators" (documentation heading)
        counts = [int(n) for n in re.findall(r"(\d+)\s+(?:assumption\s+)?validators\b", source, flags=re.IGNORECASE)]
        # the trust indicator: <span className="trust-number">9</span> ... Guardian Validators
        counts += [
            int(n)
            for n in re.findall(
                r'trust-number">(\d+)</span>\s*<span className="trust-label">Guardian Validators', source
            )
        ]

        self.assertEqual(len(counts), 3, f"expected the hero, trust indicator and heading counts, found {counts}")
        self.assertEqual(set(counts), {registered}, f"landing page says {counts}; GuardianCore registers {registered}")
