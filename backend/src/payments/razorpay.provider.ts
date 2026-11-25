import { Logger, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';

export const RAZORPAY_CLIENT = Symbol('RAZORPAY_CLIENT');

/**
 * Creates the Razorpay SDK client from backend-only environment variables.
 * Resolves to null (instead of crashing the app) when credentials are missing, so
 * the rest of the system keeps working and payment endpoints respond with a clear 503.
 */
export const razorpayProvider: Provider = {
  provide: RAZORPAY_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Razorpay | null => {
    const keyId = config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      new Logger('Razorpay').warn('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set - payments are disabled');
      return null;
    }
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  },
};
