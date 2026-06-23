import apiClient from '../api/axiosInstance';

export type WorkerResponse = {
  id: string;
  membershipId?: string | null;
  displayName: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export type CreateWorkerRequest = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  role: string;
};

export type UpdateWorkerRequest = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  role: string;
};

export const WORKER_ROLES = [
  { value: 'technician', label: 'Technician' },
  { value: 'staff', label: 'Staff' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
] as const;

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string | null;
  data?: T;
};

const getApiErrorMessage = (error: any, fallback: string): string => {
  return error?.response?.data?.message || error?.message || fallback;
};

const unwrapList = async <T>(promise: Promise<{ data: ApiEnvelope<T[]> }>, fallback: string): Promise<T[]> => {
  const res = await promise;
  const result = res.data;
  if (!result.success) throw new Error(result.message || fallback);
  return result.data || [];
};

const unwrapOne = async <T>(promise: Promise<{ data: ApiEnvelope<T> }>, fallback: string): Promise<T> => {
  const res = await promise;
  const result = res.data;
  if (!result.success || !result.data) throw new Error(result.message || fallback);
  return result.data;
};

export const getWorkersApi = async (params?: { isActive?: boolean; search?: string }): Promise<WorkerResponse[]> => {
  try {
    const query = new URLSearchParams();
    if (params?.isActive !== undefined) query.set('IsActive', String(params.isActive));
    if (params?.search) query.set('Search', params.search);
    return await unwrapList<WorkerResponse>(
      apiClient.get(`/api/Workers/getAll?${query.toString()}`),
      'Failed to fetch workers'
    );
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to fetch workers'));
  }
};

export const getAssignableWorkersApi = async (): Promise<WorkerResponse[]> => {
  try {
    return await unwrapList<WorkerResponse>(
      apiClient.get('/api/Workers/getAssignable'),
      'Failed to fetch assignable workers'
    );
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to fetch assignable workers'));
  }
};

export const createWorkerApi = async (payload: CreateWorkerRequest): Promise<WorkerResponse> => {
  try {
    return await unwrapOne<WorkerResponse>(
      apiClient.post('/api/Workers/create', payload),
      'Failed to create worker'
    );
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to create worker'));
  }
};

export const updateWorkerApi = async (workerId: string, payload: UpdateWorkerRequest): Promise<WorkerResponse> => {
  try {
    return await unwrapOne<WorkerResponse>(
      apiClient.put(`/api/Workers/update/${workerId}`, payload),
      'Failed to update worker'
    );
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to update worker'));
  }
};

export const deactivateWorkerApi = async (workerId: string): Promise<WorkerResponse> => {
  try {
    return await unwrapOne<WorkerResponse>(
      apiClient.put(`/api/Workers/deactivate/${workerId}`),
      'Failed to deactivate worker'
    );
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to deactivate worker'));
  }
};

export const getWorkerInitials = (worker: WorkerResponse): string => {
  const first = worker.firstName?.[0] || '';
  const last = worker.lastName?.[0] || '';
  return (first + last).toUpperCase() || 'W';
};

export const formatWorkerRoleLabel = (role: string): string => {
  return WORKER_ROLES.find(r => r.value === role?.toLowerCase())?.label || role || 'Staff';
};
