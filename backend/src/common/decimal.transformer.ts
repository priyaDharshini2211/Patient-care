import { ValueTransformer } from 'typeorm';

/** PostgreSQL returns NUMERIC as string; convert to number in JS. */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : parseFloat(value)),
};

export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
