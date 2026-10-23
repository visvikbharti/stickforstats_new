/**
 * The landing page must not claim to be "the first" platform of its kind (issue #31 item 4).
 * Priority cannot be demonstrated, so the claim is not made.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ProfessionalLanding from '../ProfessionalLanding';

test('the value proposition makes no claim to be the first such platform', () => {
  render(<ProfessionalLanding onEnter={() => {}} />);
  expect(
    screen.getByText(/A statistical analysis platform with built-in Guardian protection/)
  ).toBeInTheDocument();
  expect(screen.queryByText(/\bthe first\b/i)).not.toBeInTheDocument();
});
