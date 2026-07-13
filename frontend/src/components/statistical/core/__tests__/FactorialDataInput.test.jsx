import { parseFactorialText } from '../FactorialDataInput';

/**
 * The k-column DataInput cannot express a factorial design (it has no way to attach a
 * SECOND grouping label to an observation), which is why the ANOVA module never offered
 * two-way ANOVA even though the backend has implemented it all along. This parser is the
 * missing piece: long-format rows in, cells out.
 */
describe('parseFactorialText', () => {
  it('parses a headed CSV and names the columns from the header', () => {
    const { rows, names } = parseFactorialText(
      'yield,fertiliser,irrigation\n21.4,A,low\n27.6,A,high\n18.2,B,low\n30.1,B,high'
    );
    expect(names).toEqual({ value: 'yield', factor1: 'fertiliser', factor2: 'irrigation' });
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({ value: 21.4, factor1: 'A', factor2: 'low' });
  });

  it('parses a headerless table', () => {
    const { rows, names } = parseFactorialText('21.4,A,low\n27.6,A,high\n18.2,B,low');
    expect(rows).toHaveLength(3);
    expect(names.factor1).toBe('Factor A');
  });

  it('finds the value column wherever it sits', () => {
    const { rows } = parseFactorialText('fertiliser,yield,irrigation\nA,21.4,low\nB,18.2,high');
    expect(rows[0]).toEqual({ value: 21.4, factor1: 'A', factor2: 'low' });
  });

  it('accepts tabs and semicolons as well as commas', () => {
    const { rows } = parseFactorialText('21.4\tA\tlow\n18.2\tB\thigh');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({ value: 18.2, factor1: 'B', factor2: 'high' });
  });

  it('rejects ragged rows rather than silently dropping columns', () => {
    expect(() => parseFactorialText('21.4,A,low\n18.2,B')).toThrow(/same number of columns/i);
  });

  it('rejects a table with no numeric column', () => {
    expect(() => parseFactorialText('a,b,c\nx,y,z\np,q,r')).toThrow(/numeric/i);
  });

  it('rejects fewer than three columns', () => {
    expect(() => parseFactorialText('21.4,A\n18.2,B')).toThrow(/three columns/i);
  });

  it('rejects a row missing a factor label', () => {
    expect(() => parseFactorialText('21.4,A,low\n18.2,,high')).toThrow(/label for both factors/i);
  });
});
