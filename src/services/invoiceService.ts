import {
  CreateInvoiceRequest,
  InvoiceResponse,
  PostApiInvoicesGetAllInvoicesParams,
  UpdateInvoiceRequest,
  UpdateInvoiceStatusRequest,
  getFieldoreAPI,
} from '@/src/api/generated';
import apiClient from '@/src/api/axiosInstance';
import { formatCurrency } from '@/src/utils/currency';

const api = getFieldoreAPI();

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string | null;
  data?: T;
};

type PagedInvoiceResult = {
  data: InvoiceResponse[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
};

// The API stores/returns canonical lowercase snake_case values:
// draft, sent, viewed, partially_paid, paid, overdue, void.
// The app works in display-label space ('Draft', 'Partially Paid', 'Cancelled', ...)
// and converts at the API boundary via these two helpers.
const STATUS_LABEL_BY_VALUE: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Cancelled',
  unpaid: 'Unpaid',
};

const STATUS_VALUE_BY_LABEL: Record<string, string> = {
  Draft: 'draft',
  Sent: 'sent',
  Viewed: 'viewed',
  'Partially Paid': 'partially_paid',
  Paid: 'paid',
  Overdue: 'overdue',
  Cancelled: 'void',
  Void: 'void',
  Unpaid: 'unpaid',
};

const titleCaseFromValue = (value: string) =>
  value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const normalizeInvoiceStatusFromApi = (status?: string | null) => {
  if (!status) return status;
  const trimmed = status.trim();
  return STATUS_LABEL_BY_VALUE[trimmed.toLowerCase()] ?? titleCaseFromValue(trimmed);
};

const normalizeInvoiceStatusForApi = (status?: string | null) => {
  if (!status) return status;
  const trimmed = status.trim();
  return STATUS_VALUE_BY_LABEL[trimmed] ?? trimmed.toLowerCase().replace(/\s+/g, '_');
};

const normalizeInvoiceResponse = (invoice: InvoiceResponse): InvoiceResponse => ({
  ...invoice,
  status: normalizeInvoiceStatusFromApi(invoice.status) || invoice.status,
});

const getApiErrorMessage = (error: any, fallback: string) => {
  const validationErrors = error?.response?.data?.errors;

  if (validationErrors && typeof validationErrors === 'object') {
    const flatErrors = Object.values(validationErrors).flat().filter(Boolean);
    if (flatErrors.length > 0) {
      return flatErrors.join('\n');
    }
  }

  return error?.response?.data?.message || error?.message || fallback;
};

const unwrapRequired = <T>(result: ApiEnvelope<T>, fallback: string): T => {
  if (!result.success) {
    throw new Error(result.message || fallback);
  }

  if (!result.data) {
    throw new Error(fallback);
  }

  return result.data;
};

const unwrapPaged = (
  result: ApiEnvelope<{
    data?: InvoiceResponse[] | null;
    totalRecords?: number;
    pageNumber?: number;
    pageSize?: number;
  }>,
  payload: PostApiInvoicesGetAllInvoicesParams
): PagedInvoiceResult => {
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch invoices');
  }

  return {
    data: (result.data?.data || []).map(normalizeInvoiceResponse),
    totalRecords: result.data?.totalRecords || 0,
    pageNumber: result.data?.pageNumber || payload.PageNumber || 1,
    pageSize: result.data?.pageSize || payload.PageSize || 10,
  };
};

export const getInvoicesApi = async (
  payload: PostApiInvoicesGetAllInvoicesParams
): Promise<PagedInvoiceResult> => {
  try {
    // The Status filter arrives as a display label ('Cancelled', 'Partially Paid');
    // convert it to the canonical API value before querying.
    const normalizedPayload: PostApiInvoicesGetAllInvoicesParams = payload.Status
      ? { ...payload, Status: normalizeInvoiceStatusForApi(payload.Status) ?? payload.Status }
      : payload;
    const response = await api.postApiInvoicesGetAllInvoices(normalizedPayload);
    return unwrapPaged(response.data, normalizedPayload);
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while fetching invoices'));
  }
};

export const getInvoiceByIdApi = async (invoiceId: string): Promise<InvoiceResponse> => {
  try {
    const response = await api.getApiInvoicesGetByIdInvoiceId(invoiceId);
    return normalizeInvoiceResponse(unwrapRequired(response.data, 'Failed to fetch invoice'));
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while fetching the invoice'));
  }
};

export const createInvoiceApi = async (payload: CreateInvoiceRequest): Promise<InvoiceResponse> => {
  try {
    const response = await api.postApiInvoicesCreateInvoice({
      ...payload,
      status: normalizeInvoiceStatusForApi(payload.status),
    });
    return normalizeInvoiceResponse(unwrapRequired(response.data, 'Failed to create invoice'));
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while creating the invoice'));
  }
};

export const updateInvoiceApi = async (
  invoiceId: string,
  payload: UpdateInvoiceRequest
): Promise<InvoiceResponse> => {
  try {
    const response = await api.putApiInvoicesUpdateInvoiceInvoiceId(invoiceId, {
      ...payload,
      status: normalizeInvoiceStatusForApi(payload.status),
    });
    return normalizeInvoiceResponse(unwrapRequired(response.data, 'Failed to update invoice'));
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while updating the invoice'));
  }
};

export const updateInvoiceStatusApi = async (
  invoiceId: string,
  payload: UpdateInvoiceStatusRequest
): Promise<InvoiceResponse> => {
  try {
    const response = await api.patchApiInvoicesUpdateStatusInvoiceId(invoiceId, {
      ...payload,
      status: normalizeInvoiceStatusForApi(payload.status),
    });
    return normalizeInvoiceResponse(unwrapRequired(response.data, 'Failed to update invoice status'));
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while updating invoice status'));
  }
};

export const getInvoiceByJobIdApi = async (jobId: string): Promise<InvoiceResponse | null> => {
  try {
    const res = await apiClient.get(`/api/Invoices/byJob/${jobId}`);
    const result = res.data as ApiEnvelope<InvoiceResponse>;
    if (!result.success) throw new Error(result.message || 'Failed to fetch job invoice');
    return result.data ?? null;
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to fetch job invoice'));
  }
};

export const formatInvoiceCurrency = (amount?: number | null, currencyCode?: string | null) =>
  formatCurrency(amount, currencyCode);

export const formatInvoiceStatusLabel = (status?: string | null) => {
  if (!status) return 'Draft';
  return normalizeInvoiceStatusFromApi(status) || 'Draft';
};

export const getInvoiceStatusTone = (status?: string | null) => {
  const normalized = formatInvoiceStatusLabel(status);

  switch (normalized) {
    case 'Paid':
      return { bg: '#ecfdf5', text: '#059669', border: '#d1fae5' };
    case 'Overdue':
      return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
    case 'Partially Paid':
      return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
    case 'Sent':
    case 'Viewed':
      return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
    case 'Cancelled':
      return { bg: '#f1f5f9', text: '#94a3b8', border: '#e2e8f0' };
    default:
      return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
  }
};
