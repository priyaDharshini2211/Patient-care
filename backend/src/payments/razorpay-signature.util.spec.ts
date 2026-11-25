import { createHmac } from 'crypto';
import { isValidRazorpaySignature } from './razorpay-signature.util';

describe('isValidRazorpaySignature', () => {
  const secret = 'test_secret';
  const sign = (orderId: string, paymentId: string) =>
    createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  it('accepts a correctly signed payload', () => {
    expect(isValidRazorpaySignature('order_1', 'pay_1', sign('order_1', 'pay_1'), secret)).toBe(true);
  });

  it('rejects a tampered payment id', () => {
    expect(isValidRazorpaySignature('order_1', 'pay_2', sign('order_1', 'pay_1'), secret)).toBe(false);
  });

  it('rejects a signature produced with a different secret', () => {
    const forged = createHmac('sha256', 'other').update('order_1|pay_1').digest('hex');
    expect(isValidRazorpaySignature('order_1', 'pay_1', forged, secret)).toBe(false);
  });

  it('rejects signatures of the wrong length without throwing', () => {
    expect(isValidRazorpaySignature('order_1', 'pay_1', 'short', secret)).toBe(false);
  });
});
