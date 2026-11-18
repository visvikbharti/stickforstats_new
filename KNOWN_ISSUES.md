# Known issues

This file lists what StickForStats shows or does today that a user should know about and that is
not repaired yet. Each entry says where it is, what happens, and what to do until it is fixed.

## The question page (`/smart-analysis`)

### Degrees of freedom and the confidence interval read "N/A"

- **Where:** the Researcher View of an answer.
- **What happens:** the cards "Degrees of Freedom" and "Confidence Interval" show "N/A" for every
  answer. The server sends the degrees of freedom as `degrees_of_freedom`; the page looks for them
  under another name. The server sends no confidence interval with these answers.
- **Until it is fixed:** take the degrees of freedom from the answer of
  `POST /api/v1/autonomous/query/` (`cascade_result.result.degrees_of_freedom`).

### A Guardian confidence score although nothing was said about the design

- **Where:** "Guardian Confidence Score" under an answer.
- **What happens:** a score is shown with every answer. The page sends the file and the question
  and nothing else: it does not ask whether the rows are independent subjects or repeated
  measurements of the same ones, and the score is computed without that information.
- **Until it is fixed:** do not read the score as a statement about the design of the study. Judge
  the unit of analysis yourself.

## Closing an account

### The e-mail address is kept

- **Where:** "Close my account" on `/privacy-settings`.
- **What happens:** the account is closed and its data are deleted or anonymised as the dialog
  lists. The e-mail address stays in the database, because it is also the username. The dialog and
  the Privacy & data page say so.
- **Until it is fixed:** the software has no tool that removes the address. One is planned for
  after version 1.3.0.
