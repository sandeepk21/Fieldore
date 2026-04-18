import {
  CreateInvoiceRequest,
  InvoiceResponse,
  PostApiInvoicesGetAllInvoicesParams,
  UpdateInvoiceRequest,
  UpdateInvoiceStatusRequest,
  getFieldoreAPI,
} from '@/src/api/generated';

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

const normalizeInvoiceStatusFromApi = (status?: string | null) => {
  if (!status) return status;
  return status.trim() === 'PartiallyPaid' ? 'Partially Paid' : status.trim();
};

const normalizeInvoiceStatusForApi = (status?: string | null) => {
  if (!status) return status;
  return status.trim() === 'Partially Paid' ? 'PartiallyPaid' : status.trim();
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
    const response = await api.postApiInvoicesGetAllInvoices(payload);
    return unwrapPaged(response.data, payload);
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

export const formatInvoiceCurrency = (amount?: number | null) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

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
    default:
      return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
  }
};
