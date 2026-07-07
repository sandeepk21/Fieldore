import apiClient from '@/src/api/axiosInstance';

// ─── Types (mirror backend SubscriptionResponses) ───────────────────────────────
export type SubscriptionFeature = {
  featureKey: string;
  enabled: boolean;
  limit: number | null;
  label: string | null;
};

export type SubscriptionUsage = {
  completedJobs: number;
  jobLimit: number | null;       // null = unlimited
  remainingJobs: number | null;  // null = unlimited
  invoicesCreated: number;
  customersAdded: number;
  employees: number;
};

export type MySubscription = {
  planName: string;
  planSlug: string | null;
  status: string;
  billingCycle: string;
  isActive: boolean;
  renewsOn: string | null;
  trialEndsOn: string | null;
  usage: SubscriptionUsage;
  features: SubscriptionFeature[];
};

export type PlanPrice = { billingCycle: string; amount: number; currency: string };
export type PlanFeatureRow = {
  featureKey: string;
  isEnabled: boolean;
  limitValue: number | null;
  label: string | null;
  displayOrder: number;
};
export type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  currency: string;
  badge: string | null;
  isRecommended: boolean;
  buttonText: string;
  color: string | null;
  trialDays: number;
  displayOrder: number;
  prices: PlanPrice[];
  features: PlanFeatureRow[];
};

// ─── API calls (direct axios — these endpoints aren't in the orval client) ───────
export const getMySubscriptionApi = async (): Promise<MySubscription> => {
  const res = await apiClient.get('/api/subscription/me');
  const r = res.data as { success: boolean; message?: string; data?: MySubscription };
  if (!r.success || !r.data) throw new Error(r.message || 'Failed to load subscription');
  return r.data;
};

export const getPlansApi = async (): Promise<Plan[]> => {
  const res = await apiClient.get('/api/plans');
  const r = res.data as { success: boolean; message?: string; data?: Plan[] };
  if (!r.success || !r.data) throw new Error(r.message || 'Failed to load plans');
  return r.data;
};

/** Returns a Stripe Checkout URL. Opened in the browser — the app never takes payment. */
export const createBillingCheckoutApi = async (planPriceId: string): Promise<string> => {
  const res = await apiClient.post('/api/billing/checkout-session', { planPriceId });
  const r = res.data as { success: boolean; message?: string; data?: { url: string } };
  if (!r.success || !r.data?.url) throw new Error(r.message || 'Failed to start checkout');
  return r.data.url;
};

// ─── Billing gate helpers ───────────────────────────────────────────────────────
export const SUBSCRIPTION_LIMIT_CODE = 'SUBSCRIPTION_LIMIT_REACHED';
export const SUBSCRIPTION_INACTIVE_CODE = 'SUBSCRIPTION_INACTIVE';

/** True if an API error message is a subscription gate (limit reached / inactive). */
export const isSubscriptionGateError = (message?: string): boolean =>
  !!message &&
  (message.startsWith(SUBSCRIPTION_LIMIT_CODE) || message.startsWith(SUBSCRIPTION_INACTIVE_CODE));

/** Strip the machine code prefix for display. */
export const cleanGateMessage = (message?: string): string =>
  (message ?? '').replace(/^SUBSCRIPTION_[A-Z_]+:\s*/, '') || 'Please upgrade your plan to continue.';

/**
 * Where the provider goes to buy/manage a plan. Mobile never processes payments
 * (App Store / Play compliance) — purchases happen on the website.
 * TODO: move to env config alongside the API base URL.
 */
export const WEB_BASE_URL = 'http://localhost:3000';
export const WEB_PRICING_URL = `${WEB_BASE_URL}/pricing`;

export const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    trial: 'Trial', active: 'Active', past_due: 'Past due', pending: 'Pending',
    suspended: 'Suspended', cancelled: 'Cancelled', expired: 'Expired', failed: 'Payment failed',
  };
  return map[status?.toLowerCase()] ?? status;
};

export const getStatusColor = (status: string): { bg: string; text: string } => {
  switch (status?.toLowerCase()) {
    case 'active': return { bg: '#ecfdf5', text: '#059669' };
    case 'trial': return { bg: '#eff6ff', text: '#2563eb' };
    case 'past_due':
    case 'pending': return { bg: '#fffbeb', text: '#d97706' };
    case 'suspended':
    case 'cancelled':
    case 'expired':
    case 'failed': return { bg: '#fef2f2', text: '#dc2626' };
    default: return { bg: '#f1f5f9', text: '#64748b' };
  }
};
