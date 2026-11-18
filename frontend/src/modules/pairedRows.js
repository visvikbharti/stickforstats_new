/**
 * The rows of a paired design, read from two comma-separated texts.
 *
 * In a paired test, entry i of the first sample and entry i of the second are one pair. Each text
 * used to be read by itself, and every blank or unreadable entry was dropped: one blank moved every
 * later value of that sample one position up and paired it with the value of another row.
 *
 * Here an entry keeps its position. A row is used when both of its entries are numbers. A row with
 * one number and no partner is left out and counted. A position that is empty in both texts (a
 * comma at the end of each) is not a row.
 */

/** The entries of one text by position: a number, or null for a blank or an entry that is not a number. */
export const entriesOf = (text) => {
  if (typeof text !== 'string' || text.trim() === '') return [];
  return text.split(',').map((raw) => {
    const value = parseFloat(raw.trim());
    return Number.isNaN(value) ? null : value;
  });
};

/** The complete pairs of two texts, and how many rows had one value only. */
export const pairedRows = (text1, text2) => {
  const first = entriesOf(text1);
  const second = entriesOf(text2);
  const data1 = [];
  const data2 = [];
  let leftOut = 0;
  for (let i = 0; i < Math.max(first.length, second.length); i += 1) {
    const a = i < first.length ? first[i] : null;
    const b = i < second.length ? second[i] : null;
    if (a !== null && b !== null) {
      data1.push(a);
      data2.push(b);
    } else if (a !== null || b !== null) {
      leftOut += 1;
    }
  }
  return { data1, data2, leftOut };
};

/** What the page says about rows that were left out; null when none was. */
export const leftOutSentence = ({ data1, leftOut }) => {
  if (!leftOut) return null;
  const pairs = `${data1.length} complete ${data1.length === 1 ? 'pair' : 'pairs'}`;
  return leftOut === 1
    ? `1 row was left out: one of its two values is missing. The paired test uses the ${pairs}.`
    : `${leftOut} rows were left out: in each, one of the two values is missing. The paired test uses the ${pairs}.`;
};
