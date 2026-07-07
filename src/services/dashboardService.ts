import apiClient from '@/src/api/axiosInstance';
import { formatCurrency } from '@/src/utils/currency';

export type DashboardJobItem = {
  id: string;
  jobNumber: string;
  customerName: string;
  scheduledAt: string;
  jobType: string | null;
  status: string;
};

export type DashboardInvoiceItem = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  balanceDue: number;
  status: string;
};

export type DashboardSummary = {
  businessName: string;
  currency: string;
  todayJobsCount: number;
  todayJobsCompleted: number;
  todayJobsInProgress: number;
  todayJobsScheduled: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  revenueChangePercent: number;
  outstandingAmount: number;
  overdueInvoicesCount: number;
  netProfitThisMonth: number;
  activeJobsCount: number;
  todayJobs: DashboardJobItem[];
  recentInvoices: DashboardInvoiceItem[];
  weeklyRevenue: number[];
};

export const getDashboardSummaryApi = async (): Promise<DashboardSummary> => {
  const res = await apiClient.get('/api/Dashboard/summary');
  const result = res.data as { success: boolean; message?: string; data?: DashboardSummary };
  if (!result.success || !result.data) throw new Error(result.message || 'Failed to load dashboard');
  return result.data;
};

export const getJobStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'inprogress': return { bg: '#eff6ff', text: '#2563eb', dot: '#2563eb', label: 'In Progress' };
    case 'completed':  return { bg: '#ecfdf5', text: '#059669', dot: '#059669', label: 'Completed' };
    case 'scheduled':  return { bg: '#f8fafc', text: '#64748b', dot: '#94a3b8', label: 'Scheduled' };
    case 'cancelled':  return { bg: '#fef2f2', text: '#dc2626', dot: '#dc2626', label: 'Cancelled' };
    default:           return { bg: '#f8fafc', text: '#64748b', dot: '#94a3b8', label: status };
  }
};

export const getInvoiceStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':           return { bg: '#ecfdf5', text: '#059669' };
    case 'overdue':        return { bg: '#fef2f2', text: '#dc2626' };
    case 'partially_paid': return { bg: '#eff6ff', text: '#2563eb' };
    case 'sent':
    case 'viewed':         return { bg: '#f0fdf4', text: '#16a34a' };
    case 'void':           return { bg: '#f1f5f9', text: '#94a3b8' };
    default:               return { bg: '#fffbeb', text: '#d97706' };
  }
};

export const getInvoiceStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: 'Draft', sent: 'Sent', viewed: 'Viewed',
    partially_paid: 'Partial', paid: 'Paid',
    overdue: 'Overdue', void: 'Void',
  };
  return map[status.toLowerCase()] ?? status;
};

export const formatDashboardCurrency = (amount: number, currency: string) =>
  formatCurrency(amount, currency);
