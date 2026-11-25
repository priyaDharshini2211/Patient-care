const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise;

/** Loads Razorpay Checkout once. Rejects with a friendly message if it cannot be downloaded. */
export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SRC;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = undefined; // allow a retry
        reject(new Error('Could not load Razorpay Checkout. Check your internet connection.'));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * Opens Razorpay Checkout for an order created by the backend.
 * Resolves with { razorpay_order_id, razorpay_payment_id, razorpay_signature } on success,
 * rejects with { message, dismissed?, failure? } when the user closes the dialog or the payment fails.
 */
export function openCheckout({ order, onPaymentFailed }) {
  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: order.keyId, // public key id only - the secret never leaves the backend
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'Patient Management System',
      description: order.bill.description,
      prefill: { name: order.patient.name, email: order.patient.email, contact: order.patient.phone },
      theme: { color: '#2563eb' },
      handler: resolve,
      modal: { ondismiss: () => reject({ message: 'Payment was cancelled', dismissed: true }) },
    });

    checkout.on('payment.failed', (response) => {
      const { description, metadata } = response.error ?? {};
      onPaymentFailed?.({ reason: description, paymentId: metadata?.payment_id });
      checkout.close();
      reject({ message: description || 'Payment failed', failure: true });
    });

    checkout.open();
  });
}
