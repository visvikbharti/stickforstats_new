/**
 * What closing an account does, in one place, for the two pages that describe it: the
 * confirmation dialog of Privacy settings and the Privacy & data page.
 *
 * The dialog said that "all your personal data" and "Account information (email, name)" would be
 * permanently deleted, while the Privacy & data page said that the email address stays. The
 * page was right: core/services/gdpr_service.py (erase_user_data) overwrites the account's email
 * field and leaves its username, and the username of an account is the email address it was
 * registered with (authentication/serializers.py).
 *
 * backend/tests/test_privacy_erasure_matches_the_pages.py runs the erasure and fails when it
 * stops doing what a line here says, or starts doing more.
 */
export const ERASURE_DELETES = [
  'Your analysis sessions and their results',
  'Your consent records',
  'Your organization memberships',
];

export const ERASURE_ANONYMISES = [
  'Your usage records: they are kept without your account, IP address and browser',
  'Your audit entries: they are kept without your account and IP address',
];

export const ERASURE_CHANGES_THE_ACCOUNT =
  'Your name is cleared, your password is disabled and the account is deactivated';

export const EMAIL_ADDRESS_IS_KEPT =
  'Your email address stays in our database, because it is also your username.';

export const ERASURE_KEEPS = [
  EMAIL_ADDRESS_IS_KEPT,
  'Saved projects and receipts are not deleted. They stay linked to the deactivated account.',
];

export const ERASURE_DONE =
  'The data listed were deleted or anonymised, and your account is deactivated. ' +
  'Your email address is still stored as the username of the deactivated account, and saved ' +
  'projects and receipts were not deleted. You will be logged out shortly.';
