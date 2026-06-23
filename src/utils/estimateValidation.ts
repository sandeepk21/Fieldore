// Pure, real-time field validators for the estimate creator form.
// Each returns a human-readable message, or null when the value is acceptable.

export type EstimateItemInput = {
  service: string;
  description: string;
  qty: number;
  price: number;
};

export type LineItemErrors = {
  service?: string;
  qty?: string;
  price?: string;
};

export type DiscountKind = 'fixed' | 'percent';
export type DepositKind = 'none' | 'percent' | 'fixed';

// A row the user hasn't meaningfully started — ignored (matches the submit filter).
const isBlankRow = (item: EstimateItemInput): boolean =>
  !item.service.trim() && !item.price && !item.description.trim();

export const validateEstimateLineItem = (item: EstimateItemInput): LineItemErrors => {
  if (isBlankRow(item)) return {};

  const errors: LineItemErrors = {};
  if (!item.service.trim()) errors.service = 'Service name is required';
  if (!(item.qty > 0)) errors.qty = 'Qty must be greater than 0';
  if (item.price < 0) errors.price = 'Price cannot be negative';
  return errors;
};

export const hasValidLineItem = (items: EstimateItemInput[]): boolean =>
  items.some(item => item.service.trim() !== '' && item.qty > 0 && item.price >= 0);

export const validateTaxRate = (value: string): string | null => {
  if (value.trim() === '') return null; // treated as 0
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Enter a valid number';
  if (amount < 0) return 'Tax rate cannot be negative';
  if (amount > 100) return 'Tax rate cannot exceed 100%';
  return null;
};

export const validateDiscount = (
  value: string,
  kind: DiscountKind,
  subtotal: number
): string | null => {
  if (value.trim() === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Enter a valid number';
  if (amount < 0) return 'Discount cannot be negative';
  if (kind === 'percent' && amount > 100) return 'Discount cannot exceed 100%';
  if (kind === 'fixed' && subtotal > 0 && amount > subtotal) return 'Discount cannot exceed the subtotal';
  return null;
};

export const validateDeposit = (value: string, kind: DepositKind): string | null => {
  if (kind === 'none') return null;
  if (value.trim() === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Enter a valid number';
  if (amount < 0) return 'Deposit cannot be negative';
  if (kind === 'percent' && amount > 100) return 'Deposit cannot exceed 100%';
  return null;
};

export const validateEstimateDates = (issuedOn: Date, expiresOn: Date): string | null => {
  if (expiresOn < issuedOn) return 'Valid-until date must be on or after the issue date';
  return null;
};
