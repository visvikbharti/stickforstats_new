import { parseNumericTable } from '../NumericTableInput';

/**
 * Several modules called themselves analysis tools while offering no way to supply your own
 * data at all. This parser is what makes "your data" mean your data.
 *
 * The row-correspondence property matters more than it looks: the old correlation matrix
 * correlated four series of DIFFERENT LENGTHS by truncating each pair to the shorter one,
 * which produces a number with no statistical meaning, and then starred it for significance
 * using a hard-coded n = 10. Columns parsed from one table cannot have that problem.
 */
describe('parseNumericTable', () => {
  it('parses a headed CSV into named columns', () => {
    const { columns, n } = parseNumericTable('x,y\n1,2.1\n2,3.9\n3,6.2');
    expect(n).toBe(3);
    expect(columns.map((c) => c.name)).toEqual(['x', 'y']);
    expect(columns[0].values).toEqual([1, 2, 3]);
    expect(columns[1].values).toEqual([2.1, 3.9, 6.2]);
  });

  it('every column has the same number of rows — they line up by construction', () => {
    const { columns, n } = parseNumericTable('a,b,c\n1,2,3\n4,5,6\n7,8,9\n10,11,12');
    columns.forEach((column) => expect(column.values).toHaveLength(n));
  });

  it('synthesises names when there is no header', () => {
    const { columns } = parseNumericTable('1,2.1\n2,3.9\n3,6.2');
    expect(columns.map((c) => c.name)).toEqual(['Column 1', 'Column 2']);
    expect(columns[0].values).toEqual([1, 2, 3]);
  });

  it('drops a non-numeric column but keeps the numeric ones', () => {
    const { columns, droppedColumns } = parseNumericTable(
      'label,x,y\nalpha,1,2\nbeta,2,4\ngamma,3,6'
    );
    expect(droppedColumns).toBe(1);
    expect(columns.map((c) => c.name)).toEqual(['x', 'y']);
  });

  it('accepts tabs and semicolons', () => {
    const { columns } = parseNumericTable('x\ty\n1\t2\n3\t4\n5\t6');
    expect(columns[1].values).toEqual([2, 4, 6]);
  });

  it('rejects a ragged table rather than silently truncating it', () => {
    expect(() => parseNumericTable('x,y\n1,2\n3\n5,6')).toThrow(/has 1 values but the header has 2/i);
  });

  it('requires at least two numeric columns', () => {
    expect(() => parseNumericTable('x,label\n1,a\n2,b\n3,c')).toThrow(/two fully numeric columns/i);
  });

  it('requires at least three rows', () => {
    expect(() => parseNumericTable('x,y\n1,2\n3,4')).toThrow(/at least 3 rows/i);
  });

  it('requires more than a header', () => {
    expect(() => parseNumericTable('x,y')).toThrow(/at least a header row/i);
  });
});
