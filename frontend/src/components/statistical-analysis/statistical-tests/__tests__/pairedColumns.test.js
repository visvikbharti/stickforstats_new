/**
 * A paired test is computed on rows of the table: the two cells of a row are one pair.
 */
import { pairRows, rowsLeftOutSentence } from '../pairedColumns';

// ten rows; the third has no "before" and the seventh has no "after"
const BEFORE = [5.1, 6.3, '', 4.4, 8.0, 5.5, 6.1, 7.7, 5.9, 6.6];
const AFTER = [5.4, 6.0, 7.5, 4.7, 8.3, 5.2, '', 8.1, 6.3, 6.5];
const ROWS = BEFORE.map((before, i) => ({ before, after: AFTER[i] }));

test('a row with one value only is left out as a whole', () => {
  expect(pairRows(ROWS, 'before', 'after')).toEqual({
    first: [5.1, 6.3, 4.4, 8.0, 5.5, 7.7, 5.9, 6.6],
    second: [5.4, 6.0, 4.7, 8.3, 5.2, 8.1, 6.3, 6.5],
    leftOut: 2,
  });
});

test('a complete table loses nothing, and numbers typed as text are numbers', () => {
  const rows = [{ a: '1.5', b: 2 }, { a: 3, b: '4.25' }];
  expect(pairRows(rows, 'a', 'b')).toEqual({ first: [1.5, 3], second: [2, 4.25], leftOut: 0 });
});

test('a row with no number in either column is not a row of these columns', () => {
  const rows = [{ a: 1, b: 2 }, { a: '', b: null }, { a: 'n/a', b: undefined }, { a: 3, b: 4 }];
  expect(pairRows(rows, 'a', 'b')).toEqual({ first: [1, 3], second: [2, 4], leftOut: 0 });
});

test('without two columns, or without a table, there are no pairs', () => {
  const empty = { first: [], second: [], leftOut: 0 };
  expect(pairRows(ROWS, 'before', '')).toEqual(empty);
  expect(pairRows(ROWS, '', 'after')).toEqual(empty);
  expect(pairRows(null, 'before', 'after')).toEqual(empty);
  expect(pairRows(undefined, 'before', 'after')).toEqual(empty);
});

test('the sentence the page shows', () => {
  expect(rowsLeftOutSentence(pairRows(ROWS, 'before', 'after'))).toBe(
    '2 rows were left out: in each, one of the two columns has no value. The paired test uses the 8 complete rows.'
  );
  expect(rowsLeftOutSentence(pairRows([{ a: 1, b: 2 }, { a: 3, b: '' }], 'a', 'b'))).toBe(
    '1 row was left out: one of its two columns has no value. The paired test uses the 1 complete row.'
  );
  expect(rowsLeftOutSentence(pairRows([{ a: 1, b: 2 }, { a: 3, b: 4 }], 'a', 'b'))).toBeNull();
});
