/**
 * The rows of a paired test, read from two columns of a table.
 *
 * In a paired test the two cells of a row are one pair. Each column used to be read by itself and
 * its blank cells dropped: one blank moved every later value of that column one row up, and the
 * test was run on values of different rows.
 *
 * A row is used when both of its cells are numbers. A row with one number only is left out as a
 * whole and counted. A row with no number in either column is not a row of these two columns.
 */
export const pairRows = (rows, column1, column2) => {
  const first = [];
  const second = [];
  let leftOut = 0;
  if (!column1 || !column2 || !Array.isArray(rows)) return { first, second, leftOut };
  rows.forEach((row) => {
    const a = parseFloat(row[column1]);
    const b = parseFloat(row[column2]);
    const hasA = !Number.isNaN(a);
    const hasB = !Number.isNaN(b);
    if (hasA && hasB) {
      first.push(a);
      second.push(b);
    } else if (hasA || hasB) {
      leftOut += 1;
    }
  });
  return { first, second, leftOut };
};

/** What the page says about rows that were left out; null when none was. */
export const rowsLeftOutSentence = ({ first, leftOut }) => {
  if (!leftOut) return null;
  const used = `${first.length} complete ${first.length === 1 ? 'row' : 'rows'}`;
  return leftOut === 1
    ? `1 row was left out: one of its two columns has no value. The paired test uses the ${used}.`
    : `${leftOut} rows were left out: in each, one of the two columns has no value. The paired test uses the ${used}.`;
};
