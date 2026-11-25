import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Razorpay signs `<order_id>|<payment_id>` with HMAC-SHA256 using the key secret.
 * Compared in constant time to avoid timing attacks.
 */
export function isValidRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  const expected = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(signature, 'utf8');
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}
