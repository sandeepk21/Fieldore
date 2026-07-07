import apiClient from '@/src/api/axiosInstance';
import { formatCurrency } from '@/src/utils/currency';

export type RevenueChartPoint = { label: string; revenue: number; expenses: number };
export type ExpenseCategoryBreakdown = { category: string; label: string; amount: number; percent: number };
export type TopCustomerItem = { name: string; revenue: number; jobCount: number };

export type AnalyticsSummary = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueChangePercent: number;
  totalJobs: number;
  completedJobs: number;
  newCustomers: number;
  avgJobValue: number;
  scheduledJobs: number;
  inProgressJobs: number;
  cancelledJobs: number;
  revenueChart: RevenueChartPoint[];
  expensesByCategory: ExpenseCategoryBreakdown[];
  topCustomers: TopCustomerItem[];
};

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'year';

export const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: '7d',   label: '7D' },
  { key: '30d',  label: '30D' },
  { key: '90d',  label: '90D' },
  { key: 'year', label: 'Year' },
];

export const getAnalyticsSummaryApi = async (period: AnalyticsPeriod): Promise<AnalyticsSummary> => {
  const res = await apiClient.get(`/api/Analytics/summary?period=${period}`);
  const result = res.data as { success: boolean; message?: string; data?: AnalyticsSummary };
  if (!result.success || !result.data) throw new Error(result.message || 'Failed to load analytics');
  return result.data;
};

export const CATEGORY_COLORS: Record<string, string> = {
  fuel:          '#f59e0b',
  materials:     '#2563eb',
  labor:         '#7c3aed',
  equipment:     '#059669',
  subcontractor: '#dc2626',
  other:         '#64748b',
};

export const fmt = (n: number, currency = 'USD') => formatCurrency(n, currency);
