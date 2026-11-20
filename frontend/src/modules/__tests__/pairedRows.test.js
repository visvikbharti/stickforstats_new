/**
 * A paired test is computed on rows. Entry i of the first sample belongs to entry i of the second.
 */
import { entriesOf, pairedRows, leftOutSentence } from '../pairedRows';

const SAMPLE_1 = '5.1, 6.3, , 4.4, 8.0, 5.5, 6.1, 7.7, 5.9, 6.6';      // the third entry is blank
const SAMPLE_2 = '5.4, 6.0, 7.5, 4.7, 8.3, 5.2, , 8.1, 6.3, 6.5';     // the seventh entry is blank

test('an entry keeps its position', () => {
  expect(entriesOf(SAMPLE_1)).toEqual([5.1, 6.3, null, 4.4, 8.0, 5.5, 6.1, 7.7, 5.9, 6.6]);
  expect(entriesOf('1, x, 3,')).toEqual([1, null, 3, null]);
  expect(entriesOf('')).toEqual([]);
  expect(entriesOf('   ')).toEqual([]);
  expect(entriesOf(undefined)).toEqual([]);
});

test('a row with one value only is left out as a whole', () => {
  const rows = pairedRows(SAMPLE_1, SAMPLE_2);
  expect(rows.data1).toEqual([5.1, 6.3, 4.4, 8.0, 5.5, 7.7, 5.9, 6.6]);
  expect(rows.data2).toEqual([5.4, 6.0, 4.7, 8.3, 5.2, 8.1, 6.3, 6.5]);
  expect(rows.leftOut).toBe(2);
  // each sample read by itself gives nine values, and the third of the first then meets the third of the second
  expect(SAMPLE_1.split(',').map(parseFloat).filter((v) => !Number.isNaN(v))[2]).toBe(4.4);
  expect(SAMPLE_2.split(',').map(parseFloat).filter((v) => !Number.isNaN(v))[2]).toBe(7.5);
});

test('complete samples lose nothing', () => {
  expect(pairedRows('1, 2, 3', '4, 5, 6')).toEqual({ data1: [1, 2, 3], data2: [4, 5, 6], leftOut: 0 });
});

test('a position that is empty in both samples is not a row', () => {
  expect(pairedRows('1, 2, 3,', '4, 5, 6,')).toEqual({ data1: [1, 2, 3], data2: [4, 5, 6], leftOut: 0 });
  expect(pairedRows('1, , 3', '4, , 6')).toEqual({ data1: [1, 3], data2: [4, 6], leftOut: 0 });
});

test('a sample that is shorter leaves the other one\'s last rows without a partner', () => {
  expect(pairedRows('1, 2, 3, 4', '5, 6')).toEqual({ data1: [1, 2], data2: [5, 6], leftOut: 2 });
  expect(pairedRows('1, 2', '5, 6, 7')).toEqual({ data1: [1, 2], data2: [5, 6], leftOut: 1 });
  expect(pairedRows('1, 2', '')).toEqual({ data1: [], data2: [], leftOut: 2 });
});

test('the sentence the page shows', () => {
  expect(leftOutSentence(pairedRows('1, 2, 3', '4, 5, 6'))).toBeNull();
  expect(leftOutSentence(pairedRows(SAMPLE_1, SAMPLE_2))).toBe(
    '2 rows were left out: in each, one of the two values is missing. The paired test uses the 8 complete pairs.'
  );
  expect(leftOutSentence(pairedRows('1, 2, 3', '4, , 6'))).toBe(
    '1 row was left out: one of its two values is missing. The paired test uses the 2 complete pairs.'
  );
  expect(leftOutSentence(pairedRows('1, , ', ' , 5, 6'))).toBe(
    '3 rows were left out: in each, one of the two values is missing. The paired test uses the 0 complete pairs.'
  );
});
