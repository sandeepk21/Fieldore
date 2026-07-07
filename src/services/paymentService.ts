import apiClient from '../api/axiosInstance';

export type PaymentRecord = {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  paidAt: string;
  referenceNumber?: string | null;
  notes?: string | null;
  isStripePayment: boolean;
  isRefund: boolean;
  refundedPaymentId?: string | null;
  createdAt: string;
};

export type RecordPaymentRequest = {
  amount: number;
  method: string;
  paidAt: string;
  referenceNumber?: string | null;
  notes?: string | null;
};

export type StripeStatus = {
  isConnected: boolean;
  onboardingComplete: boolean;
  accountId?: string | null;
};

export const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'card',          label: 'Card' },
  { value: 'credit_card',   label: 'Credit Card' },
  { value: 'debit_card',    label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online',        label: 'Online' },
  { value: 'check',         label: 'Check' },
  { value: 'other',         label: 'Other' },
] as const;

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string | null;
  data?: T;
};

const getApiErrorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.message || error?.message || fallback;

const unwrapOne = async <T>(promise: Promise<{ data: ApiEnvelope<T> }>, fallback: string): Promise<T> => {
  const res = await promise;
  const result = res.data;
  if (!result.success || !result.data) throw new Error(result.message || fallback);
  return result.data;
};

export const recordPaymentApi = async (
  invoiceId: string,
  payload: RecordPaymentRequest
): Promise<PaymentRecord> => {
  try {
    return await unwrapOne<PaymentRecord>(
      apiClient.post(`/api/Payments/record/${invoiceId}`, payload),
      'Failed to record payment'
    );
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to record payment'));
  }
};

export type SendInvoiceResult = {
  invoiceId: string;
  invoiceNumber: string;
  publicToken: string;
  publicUrl: string;
};

export const sendInvoiceApi = async (invoiceId: string): Promise<SendInvoiceResult> => {
  try {
    return await unwrapOne<SendInvoiceResult>(
      apiClient.post(`/api/Invoices/send/${invoiceId}`),
      'Failed to send invoice'
    );
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to send invoice'));
  }
};

export type RefundRequest = { paymentId: string; amount: number; notes?: string | null };

export const refundPaymentApi = async (invoiceId: string, payload: RefundRequest): Promise<PaymentRecord> => {
  try {
    return await unwrapOne<PaymentRecord>(
      apiClient.post(`/api/Payments/refund/${invoiceId}`, payload),
      'Failed to record refund'
    );
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to record refund'));
  }
};

export const deletePaymentApi = async (invoiceId: string, paymentId: string): Promise<void> => {
  try {
    const res = await apiClient.delete(`/api/Payments/${invoiceId}/${paymentId}`);
    const result = res.data as ApiEnvelope<any>;
    if (!result.success) throw new Error(result.message || 'Failed to delete payment');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to delete payment'));
  }
};

export const getStripeStatusApi = async (): Promise<StripeStatus> => {
  try {
    return await unwrapOne<StripeStatus>(
      apiClient.get('/api/stripe/status'),
      'Failed to fetch Stripe status'
    );
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to fetch Stripe status'));
  }
};

export const startStripeOnboardingApi = async (): Promise<{
  onboardingUrl?: string | null;
  alreadyConnected: boolean;
  accountId?: string | null;
}> => {
  try {
    return await unwrapOne(
      apiClient.post('/api/stripe/connect/onboarding', {
        returnUrl: 'fieldore://stripe-return',
        refreshUrl: 'fieldore://stripe-refresh',
      }),
      'Failed to start Stripe onboarding'
    );
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to start Stripe onboarding'));
  }
};

export const formatPaymentMethodLabel = (method: string): string =>
  PAYMENT_METHODS.find(m => m.value === method?.toLowerCase())?.label || method || 'Other';

export const formatPaymentDate = (paidAt: string): string => {
  const date = new Date(paidAt);
  if (isNaN(date.getTime())) return paidAt;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};
