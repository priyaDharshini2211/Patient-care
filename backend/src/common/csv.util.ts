const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Serialises one CSV cell. Values that spreadsheets would interpret as a formula (=, +, -, @) get a leading
 * apostrophe (OWASP "CSV injection" guidance) so exported patient data can never execute in Excel/Sheets.
 */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
