/** At least 8 characters (bcrypt only uses the first 72 bytes), with a lowercase letter, an uppercase letter and a digit. */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
export const PASSWORD_MESSAGE = 'Password must be 8-72 characters and include an uppercase letter, a lowercase letter and a number';
