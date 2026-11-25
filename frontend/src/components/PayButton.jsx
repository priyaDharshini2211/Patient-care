import { CreditCard, RotateCcw } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { payBill } from '../store/paymentsSlice';
import { showToast } from '../store/uiSlice';
import { Spinner } from './common';

const BUSY_LABELS = {
  creating_order: 'Creating order...',
  awaiting_payment: 'Awaiting payment...',
  verifying: 'Verifying...',
};

/** "Pay" button. Drives the whole Razorpay flow through the payBill thunk and reports the outcome as a toast. */
export default function PayButton({ bill, small = true }) {
  const dispatch = useDispatch();
  const { loading, status, activeBillId } = useSelector((state) => state.payments);

  const payable = bill.paymentStatus === 'Pending' || bill.paymentStatus === 'Failed';
  const thisBillBusy = loading && activeBillId === bill.id;

  const handleClick = async (event) => {
    event.stopPropagation();
    const result = await dispatch(payBill(bill.id));
    if (payBill.fulfilled.match(result)) {
      dispatch(showToast({ message: `Payment received for ${bill.invoiceNumber ?? `bill #${bill.id}`}` }));
    } else {
      const { message, cancelled } = result.payload ?? { message: result.error.message };
      dispatch(showToast({ type: cancelled ? 'info' : 'error', message }));
    }
  };

  if (!payable) return null;
  const retry = bill.paymentStatus === 'Failed';
  return (
    <button type="button" className={`btn ${small ? 'btn-sm' : ''} btn-success`} onClick={handleClick} disabled={loading}>
      {thisBillBusy ? <Spinner size={14} /> : retry ? <RotateCcw size={14} /> : <CreditCard size={14} />}
      {thisBillBusy ? BUSY_LABELS[status] ?? 'Processing...' : retry ? 'Retry' : 'Pay'}
    </button>
  );
}
