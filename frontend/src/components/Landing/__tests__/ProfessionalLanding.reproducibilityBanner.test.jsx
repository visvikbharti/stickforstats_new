/**
 * The landing page's reproducibility banner must say what the source says, and cite it
 * (issue #31 item 3).
 *
 * It read "Over 70% of researchers fail to reproduce published findings". The source is Baker M.,
 * "1,500 scientists lift the lid on reproducibility", Nature 533, 452-454 (2016),
 * doi:10.1038/533452a, which reports that "More than 70% of researchers have tried and failed to
 * reproduce another scientist's experiments" among the 1,576 who answered Nature's online survey:
 * a self-report about other people's experiments, not a rate at which published findings fail.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ProfessionalLanding from '../ProfessionalLanding';

const renderLanding = () => render(<ProfessionalLanding onEnter={() => {}} />);

test('the banner states the survey finding as the source reports it', () => {
  renderLanding();
  // The sentence spans several elements (<em>Nature</em>, the citation link), so match the
  // banner's whole text rather than a single text node.
  const banner = screen.getByText(
    (_content, el) => el.tagName === 'SPAN' && /More than 70% of 1,576/.test(el.textContent)
  );
  expect(banner).toHaveTextContent(
    "More than 70% of 1,576 researchers in a Nature survey said they had tried and failed to " +
      "reproduce another scientist's experiments (Baker 2016, Nature 533:452–454)"
  );
  expect(screen.queryByText(/fail to reproduce published findings/i)).not.toBeInTheDocument();
});

test('the banner cites Baker 2016, Nature 533:452-454, by its DOI', () => {
  renderLanding();
  const citation = screen.getByRole('link', { name: /Baker 2016, Nature 533:452–454/ });
  expect(citation).toHaveAttribute('href', 'https://doi.org/10.1038/533452a');
  expect(citation).toHaveAttribute('rel', 'noopener noreferrer');
  expect(citation.getAttribute('title')).toContain(
    'Baker M. 1,500 scientists lift the lid on reproducibility. Nature 533, 452–454 (2016).'
  );
});
