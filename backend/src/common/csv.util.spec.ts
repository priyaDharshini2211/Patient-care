import { csvCell, toCsv } from './csv.util';

describe('csv', () => {
  it('quotes cells containing commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('renders null and undefined as empty cells', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it.each(['=cmd|"/c calc"!A1', '+91 98765 43210', '-2+3', '@SUM(A1)'])('neutralises spreadsheet formula %s', (value) => {
    expect(csvCell(value).replace(/^"/, '')).toMatch(/^'/);
  });

  it('builds CRLF separated rows with a trailing newline', () => {
    expect(toCsv(['A', 'B'], [[1, 'x,y']])).toBe('A,B\r\n1,"x,y"\r\n');
  });
});
