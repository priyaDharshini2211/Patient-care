import { PASSWORD_PATTERN } from './password.rules';

describe('password policy', () => {
  it.each(['Str0ngPassw0rd', 'Abcdefg1', 'Zz9' + 'x'.repeat(60)])('accepts %s', (password) => {
    expect(PASSWORD_PATTERN.test(password)).toBe(true);
  });

  it.each(['short1A', 'alllowercase1', 'ALLUPPERCASE1', 'NoDigitsHere', '', 'A1a' + 'x'.repeat(80)])('rejects %s', (password) => {
    expect(PASSWORD_PATTERN.test(password)).toBe(false);
  });
});
