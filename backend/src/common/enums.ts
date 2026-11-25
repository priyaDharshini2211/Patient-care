export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other',
}

export enum PaymentStatus {
  Pending = 'Pending',
  Paid = 'Paid',
  Failed = 'Failed',
  Cancelled = 'Cancelled',
}

export enum BloodGroup {
  APositive = 'A+',
  ANegative = 'A-',
  BPositive = 'B+',
  BNegative = 'B-',
  ABPositive = 'AB+',
  ABNegative = 'AB-',
  OPositive = 'O+',
  ONegative = 'O-',
}

/** Bill states in which money is still owed. */
export const OPEN_STATUSES = [PaymentStatus.Pending, PaymentStatus.Failed];
