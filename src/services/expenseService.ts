import apiClient from '../api/axiosInstance';

export type ExpenseResponse = {
  id: string;
  businessId: string;
  jobId?: string | null;
  invoiceId?: string | null;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  vendorName?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CategoryBreakdown = {
  category: string;
  label: string;
  amount: number;
  count: number;
};

export type ExpenseSummary = {
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  byCategory: CategoryBreakdown[];
};

export type CreateExpenseRequest = {
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  jobId?: string | null;
  invoiceId?: string | null;
  vendorName?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
};

export type UpdateExpenseRequest = CreateExpenseRequest;

export type GetExpensesParams = {
  jobId?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const EXPENSE_CATEGORIES = [
  { value: 'fuel', label: 'Fuel' },
  { value: 'materials', label: 'Materials' },
  { value: 'labor', label: 'Labour' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'other', label: 'Other' },
] as const;

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string | null;
  data?: T;
};

const getApiErrorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.message || error?.message || fallback;

const unwrapList = async <T>(
  promise: Promise<{ data: ApiEnvelope<T[]> }>,
  fallback: string
): Promise<T[]> => {
  const res = await promise;
  const result = res.data;
  if (!result.success) throw new Error(result.message || fallback);
  return result.data || [];
};

const unwrapOne = async <T>(
  promise: Promise<{ data: ApiEnvelope<T> }>,
  fallback: string
): Promise<T> => {
  const res = await promise;
  const result = res.data;
  if (!result.success || !result.data) throw new Error(result.message || fallback);
  return result.data;
};

export const getExpensesApi = async (params?: GetExpensesParams): Promise<ExpenseResponse[]> => {
  try {
    const query = new URLSearchParams();
    if (params?.jobId) query.set('jobId', params.jobId);
    if (params?.category) query.set('category', params.category);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    const qs = query.toString();
    return await unwrapList<ExpenseResponse>(
      apiClient.get(`/api/Expenses/getAll${qs ? `?${qs}` : ''}`),
      'Failed to fetch expenses'
    );
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to fetch expenses'));
  }
};

export const getExpenseSummaryApi = async (): Promise<ExpenseSummary> => {
  try {
    return await unwrapOne<ExpenseSummary>(
      apiClient.get('/api/Expenses/summary'),
      'Failed to fetch expense summary'
    );
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to fetch expense summary'));
  }
};

export const createExpenseApi = async (payload: CreateExpenseRequest): Promise<ExpenseResponse> => {
  try {
    return await unwrapOne<ExpenseResponse>(
      apiClient.post('/api/Expenses/create', payload),
      'Failed to create expense'
    );
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to create expense'));
  }
};

export const updateExpenseApi = async (
  expenseId: string,
  payload: UpdateExpenseRequest
): Promise<ExpenseResponse> => {
  try {
    return await unwrapOne<ExpenseResponse>(
      apiClient.put(`/api/Expenses/update/${expenseId}`, payload),
      'Failed to update expense'
    );
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to update expense'));
  }
};

export const deleteExpenseApi = async (expenseId: string): Promise<void> => {
  try {
    const res = await apiClient.delete(`/api/Expenses/${expenseId}`);
    const result = res.data as ApiEnvelope<any>;
    if (!result.success) throw new Error(result.message || 'Failed to delete expense');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Failed to delete expense'));
  }
};

export const formatExpenseCategoryLabel = (category: string): string =>
  EXPENSE_CATEGORIES.find(c => c.value === category?.toLowerCase())?.label || category || 'Other';

export const formatExpenseDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  fuel:          { bg: '#fef3c7', text: '#d97706' },
  materials:     { bg: '#dbeafe', text: '#2563eb' },
  labor:         { bg: '#d1fae5', text: '#059669' },
  equipment:     { bg: '#ede9fe', text: '#7c3aed' },
  subcontractor: { bg: '#ffe4e6', text: '#e11d48' },
  other:         { bg: '#f1f5f9', text: '#64748b' },
};
