import {
  ConvertEstimateToJobRequest,
  CreateEstimateRequest,
  EstimateAttachmentResponse,
  EstimateResponse,
  PostApiEstimatesGetAllEstimatesParams,
  UpdateEstimateRequest,
  UpdateEstimateStatusRequest,
  getFieldoreAPI,
} from '@/src/api/generated';
import { axiosInstance } from '@/src/api/axiosInstance';
import { formatCurrency } from '@/src/utils/currency';

const api = getFieldoreAPI();

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string | null;
  data?: T;
};

type PagedEstimateResult = {
  data: EstimateResponse[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
};

// Canonical API values are lowercase: draft, sent, approved, rejected, expired, converted.
const STATUS_LABEL_BY_VALUE: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
  converted: 'Converted',
};

const STATUS_VALUE_BY_LABEL: Record<string, string> = {
  Draft: 'draft',
  Sent: 'sent',
  Approved: 'approved',
  Rejected: 'rejected',
  Expired: 'expired',
  Converted: 'converted',
};

const titleCaseFromValue = (value: string) =>
  value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const formatEstimateStatusLabel = (status?: string | null) => {
  if (!status) return 'Draft';
  const trimmed = status.trim();
  return STATUS_LABEL_BY_VALUE[trimmed.toLowerCase()] ?? titleCaseFromValue(trimmed);
};

const normalizeEstimateStatusForApi = (status?: string | null) => {
  if (!status) return status;
  const trimmed = status.trim();
  return STATUS_VALUE_BY_LABEL[trimmed] ?? trimmed.toLowerCase().replace(/\s+/g, '_');
};

export const getEstimateStatusTone = (status?: string | null) => {
  switch (formatEstimateStatusLabel(status)) {
    case 'Approved':
    case 'Converted':
      return { bg: '#ecfdf5', text: '#059669', border: '#d1fae5' };
    case 'Rejected':
    case 'Expired':
      return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
    case 'Sent':
      return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
    default:
      return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
  }
};

export const formatEstimateCurrency = (amount?: number | null, currencyCode?: string | null) =>
  formatCurrency(amount, currencyCode);

// Absolute URL of the public, client-facing quote page served by the backend.
export const buildPublicQuoteUrl = (token?: string | null) => {
  if (!token) return '';
  const base = (axiosInstance.defaults.baseURL || '').replace(/\/+$/, '');
  return `${base}/quote/${token}`;
};

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

export const getEstimatesApi = async (
  payload: PostApiEstimatesGetAllEstimatesParams
): Promise<PagedEstimateResult> => {
  try {
    const normalizedPayload: PostApiEstimatesGetAllEstimatesParams = payload.Status
      ? { ...payload, Status: normalizeEstimateStatusForApi(payload.Status) ?? payload.Status }
      : payload;
    const response = await api.postApiEstimatesGetAllEstimates(normalizedPayload);
    const result = response.data;
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch estimates');
    }
    return {
      data: result.data?.data || [],
      totalRecords: result.data?.totalRecords || 0,
      pageNumber: result.data?.pageNumber || payload.PageNumber || 1,
      pageSize: result.data?.pageSize || payload.PageSize || 10,
    };
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while fetching estimates'));
  }
};

export const getEstimateByIdApi = async (estimateId: string): Promise<EstimateResponse> => {
  try {
    const response = await api.getApiEstimatesGetByIdEstimateId(estimateId);
    return unwrapRequired(response.data, 'Failed to fetch estimate');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while fetching the estimate'));
  }
};

export const createEstimateApi = async (payload: CreateEstimateRequest): Promise<EstimateResponse> => {
  try {
    const response = await api.postApiEstimatesCreateEstimate({
      ...payload,
      status: normalizeEstimateStatusForApi(payload.status),
    });
    return unwrapRequired(response.data, 'Failed to create estimate');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while creating the estimate'));
  }
};

export const updateEstimateApi = async (
  estimateId: string,
  payload: UpdateEstimateRequest
): Promise<EstimateResponse> => {
  try {
    const response = await api.putApiEstimatesUpdateEstimateEstimateId(estimateId, {
      ...payload,
      status: normalizeEstimateStatusForApi(payload.status),
    });
    return unwrapRequired(response.data, 'Failed to update estimate');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while updating the estimate'));
  }
};

export const updateEstimateStatusApi = async (
  estimateId: string,
  payload: UpdateEstimateStatusRequest
): Promise<EstimateResponse> => {
  try {
    const response = await api.patchApiEstimatesUpdateStatusEstimateId(estimateId, {
      ...payload,
      status: normalizeEstimateStatusForApi(payload.status),
    });
    return unwrapRequired(response.data, 'Failed to update estimate status');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while updating estimate status'));
  }
};

export const markEstimateConvertedApi = async (estimateId: string, convertedJobId: string): Promise<void> => {
  try {
    await axiosInstance.patch(`/api/Estimates/update-status/${estimateId}`, {
      status: 'converted',
      convertedJobId,
    });
  } catch {
    // best-effort — job already created, don't fail the whole flow
  }
};

// Marks the quote as sent and (re)issues a public token. Returns the estimate (with publicToken).
export const sendEstimateApi = async (estimateId: string): Promise<EstimateResponse> => {
  try {
    const response = await api.postApiEstimatesSendEstimateId(estimateId);
    return unwrapRequired(response.data, 'Failed to send estimate');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while sending the estimate'));
  }
};

export const convertEstimateToJobApi = async (
  estimateId: string,
  payload: ConvertEstimateToJobRequest = {}
): Promise<{ estimateId?: string; jobId?: string; message?: string | null }> => {
  try {
    const response = await api.postApiEstimatesConvertToJobEstimateId(estimateId, payload);
    return unwrapRequired(response.data, 'Failed to convert estimate to job');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while converting the estimate'));
  }
};

export const deleteEstimateApi = async (estimateId: string): Promise<void> => {
  try {
    const response = await api.deleteApiEstimatesDeleteEstimateEstimateId(estimateId);
    const result = response.data as ApiEnvelope<unknown>;
    if (!result.success) {
      throw new Error(result.message || 'Failed to delete estimate');
    }
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while deleting the estimate'));
  }
};

// Absolute URL for an attachment served by the backend's /uploads static files.
export const buildAttachmentUrl = (storagePath?: string | null) => {
  if (!storagePath) return '';
  const base = (axiosInstance.defaults.baseURL || '').replace(/\/+$/, '');
  return `${base}/${storagePath.replace(/^\/+/, '')}`;
};

export type EstimateAttachmentFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

// Multipart upload of a single file to an existing estimate (React Native form-data).
export const uploadEstimateAttachmentApi = async (
  estimateId: string,
  file: EstimateAttachmentFile
): Promise<EstimateAttachmentResponse> => {
  try {
    const formData = new FormData();
    formData.append('File', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
    } as any);

    const response = await axiosInstance.post(
      `/api/Estimates/add-attachment/${estimateId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return unwrapRequired(response.data, 'Failed to upload attachment');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while uploading the attachment'));
  }
};

export const deleteEstimateAttachmentApi = async (
  estimateId: string,
  attachmentId: string
): Promise<void> => {
  try {
    const response = await api.deleteApiEstimatesDeleteAttachmentEstimateIdAttachmentId(estimateId, attachmentId);
    const result = response.data as ApiEnvelope<unknown>;
    if (!result.success) {
      throw new Error(result.message || 'Failed to delete attachment');
    }
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while deleting the attachment'));
  }
};
