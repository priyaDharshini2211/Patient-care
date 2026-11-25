const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+\-\s()]{7,20}$/;
const hasMoreThanTwoDecimals = (value) => !/^\d+(\.\d{1,2})?$/.test(String(value));

/** Each validator returns an object of { field: message }. Empty object means valid. */

/** The rules shown (and checked) while choosing a password; they mirror the backend policy. */
export const PASSWORD_RULES = [
  { id: 'length', label: '8+ characters', test: (value) => value.length >= 8 && value.length <= 72 },
  { id: 'upper', label: 'Uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'Lowercase letter', test: (value) => /[a-z]/.test(value) },
  { id: 'digit', label: 'A number', test: (value) => /\d/.test(value) },
];

/** 0-4 for the strength meter: how many rules pass, with the top level reserved for a symbol or 12+ characters. */
export const passwordStrength = (value) => {
  const passed = PASSWORD_RULES.filter((rule) => rule.test(value)).length;
  if (passed < PASSWORD_RULES.length) return passed === 0 ? 0 : Math.min(passed, 2);
  return /[^A-Za-z0-9]/.test(value) || value.length >= 12 ? 4 : 3;
};

const passwordError = (value) => (PASSWORD_RULES.every((rule) => rule.test(value)) ? null : 'Password does not meet the requirements');

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Password is required';
  return errors;
}

export function validateRegister({ name, email, password, confirmPassword, accepted }) {
  const errors = {};
  if (name.trim().length < 2) errors.name = 'Enter your full name';
  if (!email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Choose a password';
  else if (passwordError(password)) errors.password = passwordError(password);
  if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match';
  if (!accepted) errors.accepted = 'Please accept the terms to continue';
  return errors;
}

export function validateProfile({ name }) {
  const errors = {};
  if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  return errors;
}

export function validatePasswordChange({ currentPassword, newPassword, confirmPassword }) {
  const errors = {};
  if (!currentPassword) errors.currentPassword = 'Enter your current password';
  if (!newPassword) errors.newPassword = 'Choose a new password';
  else if (passwordError(newPassword)) errors.newPassword = passwordError(newPassword);
  else if (newPassword === currentPassword) errors.newPassword = 'New password must be different';
  if (confirmPassword !== newPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

export function validatePatient({ name, age, gender, phone, email, address }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Name is required';
  if (String(age).trim() === '') errors.age = 'Age is required';
  else if (!Number.isInteger(Number(age)) || Number(age) < 0 || Number(age) > 150) {
    errors.age = 'Age must be a whole number between 0 and 150';
  }
  if (!gender) errors.gender = 'Gender is required';
  if (!phone.trim()) errors.phone = 'Phone number is required';
  else if (!PHONE_PATTERN.test(phone.trim())) errors.phone = 'Enter a valid phone number (7-20 digits)';
  if (!email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!address.trim()) errors.address = 'Address is required';
  return errors;
}

export function validateBill({ patientId, description, amount, tax }) {
  const errors = {};
  if (!patientId) errors.patientId = 'Select a patient';
  if (!description.trim()) errors.description = 'Service / description is required';
  if (String(amount).trim() === '') errors.amount = 'Amount is required';
  else if (Number.isNaN(Number(amount)) || Number(amount) <= 0) errors.amount = 'Amount must be greater than 0';
  else if (hasMoreThanTwoDecimals(amount)) errors.amount = 'Amount can have at most 2 decimal places';
  if (String(tax).trim() !== '') {
    if (Number.isNaN(Number(tax)) || Number(tax) < 0) errors.tax = 'Tax cannot be negative';
    else if (hasMoreThanTwoDecimals(tax)) errors.tax = 'Tax can have at most 2 decimal places';
  }
  return errors;
}
