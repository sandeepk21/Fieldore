import {
  CreateInvoiceRequest,
  InvoiceAddressRequest,
  InvoiceLineItemRequest,
  InvoiceResponse,
  UpdateInvoiceRequest,
} from '@/src/api/generated';

export type InvoiceStatus =
  | 'Draft'
  | 'Sent'
  | 'Viewed'
  | 'Partially Paid'
  | 'Paid'
  | 'Overdue'
  | 'Cancelled';

export type InvoiceLineItemFormData = {
  id: string;
  name: string;
  description: string;
  quantity: string;
  unitRate: string;
};

export type InvoiceFormData = {
  customerId: string;
  jobId: string;
  purchaseOrderNumber: string;
  netTerms: string;
  status: InvoiceStatus;
  issuedOn: string;
  dueOn: string;
  taxRate: string;
  discountAmount: string;
  notes: string;
  billingLine1: string;
  billingLine2: string;
  billingCity: string;
  billingStateOrProvince: string;
  billingPostalCode: string;
  billingCountry: string;
  lineItems: InvoiceLineItemFormData[];
};

export type InvoiceFormErrors = Partial<
  Record<
    keyof InvoiceFormData | `lineItem.${string}` | 'lineItems' | 'dueOn' | 'server',
    string
  >
>;

export const INVOICE_STATUS_OPTIONS: InvoiceStatus[] = [
  'Draft',
  'Sent',
  'Viewed',
  'Partially Paid',
  'Paid',
  'Overdue',
  'Cancelled',
];

export const NET_TERMS_OPTIONS = ['Due on receipt', 'Net 7', 'Net 14', 'Net 30', 'Net 45'];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const POSTAL_REGEX = /^[A-Za-z0-9 -]{3,12}$/;

const toSafeString = (value?: string | null) => value?.trim() || '';

const createLineItemId = () => `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createEmptyInvoiceLineItem = (): InvoiceLineItemFormData => ({
  id: createLineItemId(),
  name: '',
  description: '',
  quantity: '1',
  unitRate: '0',
});

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createInitialInvoiceFormData = (): InvoiceFormData => {
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 14);

  return {
    customerId: '',
    jobId: '',
    purchaseOrderNumber: '',
    netTerms: 'Net 14',
    status: 'Draft',
    issuedOn: toIsoDate(today),
    dueOn: toIsoDate(dueDate),
    taxRate: '0',
    discountAmount: '0',
    notes: '',
    billingLine1: '',
    billingLine2: '',
    billingCity: '',
    billingStateOrProvince: '',
    billingPostalCode: '',
    billingCountry: '',
    lineItems: [createEmptyInvoiceLineItem()],
  };
};

export const validateInvoiceField = (
  field: keyof InvoiceFormData,
  value: string | InvoiceLineItemFormData[],
  data: InvoiceFormData
): string => {
  switch (field) {
    case 'customerId':
      return String(value).trim() ? '' : 'Customer is required';
    case 'issuedOn':
      if (!String(value).trim()) return 'Issue date is required';
      if (!DATE_REGEX.test(String(value).trim())) return 'Use YYYY-MM-DD format';
      return '';
    case 'dueOn':
      if (!String(value).trim()) return 'Due date is required';
      if (!DATE_REGEX.test(String(value).trim())) return 'Use YYYY-MM-DD format';
      if (DATE_REGEX.test(data.issuedOn.trim()) && String(value).trim() < data.issuedOn.trim()) {
        return 'Due date cannot be before issue date';
      }
      return '';
    case 'taxRate': {
      const amount = Number(String(value).trim());
      if (String(value).trim() === '') return 'Tax rate is required';
      if (!Number.isFinite(amount)) return 'Tax rate must be a number';
      if (amount < 0) return 'Tax rate cannot be negative';
      if (amount > 100) return 'Tax rate cannot exceed 100%';
      return '';
    }
    case 'discountAmount': {
      const amount = Number(String(value).trim());
      if (String(value).trim() === '') return 'Discount is required';
      if (!Number.isFinite(amount)) return 'Discount must be a number';
      if (amount < 0) return 'Discount cannot be negative';
      return '';
    }
    case 'notes':
      if (String(value).trim().length > 1000) return 'Notes must be 1000 characters or less';
      return '';
    case 'purchaseOrderNumber':
      if (String(value).trim().length > 80) return 'PO number must be 80 characters or less';
      return '';
    case 'netTerms':
      return String(value).trim() ? '' : 'Net terms are required';
    case 'billingLine1':
      if (!String(value).trim()) return 'Billing address line 1 is required';
      if (String(value).trim().length < 5) return 'Billing address looks too short';
      return '';
    case 'billingCity':
      return String(value).trim() ? '' : 'Billing city is required';
    case 'billingStateOrProvince':
      return String(value).trim() ? '' : 'Billing state/province is required';
    case 'billingPostalCode':
      if (!String(value).trim()) return 'Billing postal code is required';
      if (!POSTAL_REGEX.test(String(value).trim())) return 'Enter a valid postal code';
      return '';
    case 'billingCountry':
      return String(value).trim() ? '' : 'Billing country is required';
    case 'lineItems': {
      const items = Array.isArray(value) ? value : [];
      if (items.length === 0) return 'Add at least one line item';
      if (items.some(item => !item.name.trim())) return 'Each item needs a name';
      if (items.some(item => item.name.trim().length < 2)) return 'Item names must be at least 2 characters';
      if (items.some(item => !item.quantity.trim() || !Number.isFinite(Number(item.quantity)))) {
        return 'Each item quantity must be a valid number';
      }
      if (items.some(item => Number(item.quantity) <= 0)) return 'Each item quantity must be greater than 0';
      if (items.some(item => !item.unitRate.trim() || !Number.isFinite(Number(item.unitRate)))) {
        return 'Each item rate must be a valid number';
      }
      if (items.some(item => Number(item.unitRate) < 0)) return 'Each item rate cannot be negative';
      return '';
    }
    default:
      return '';
  }
};

export const validateInvoiceLineItemField = (
  item: InvoiceLineItemFormData,
  field: 'name' | 'description' | 'quantity' | 'unitRate'
) => {
  switch (field) {
    case 'name':
      if (!item.name.trim()) return 'Item name is required';
      if (item.name.trim().length < 2) return 'Item name must be at least 2 characters';
      if (item.name.trim().length > 120) return 'Item name must be 120 characters or less';
      return '';
    case 'description':
      if (item.description.trim().length > 250) return 'Description must be 250 characters or less';
      return '';
    case 'quantity': {
      const quantity = Number(item.quantity);
      if (!item.quantity.trim()) return 'Quantity is required';
      if (!Number.isFinite(quantity)) return 'Quantity must be a number';
      if (quantity <= 0) return 'Quantity must be greater than 0';
      return '';
    }
    case 'unitRate': {
      const rate = Number(item.unitRate);
      if (!item.unitRate.trim()) return 'Rate is required';
      if (!Number.isFinite(rate)) return 'Rate must be a number';
      if (rate < 0) return 'Rate cannot be negative';
      return '';
    }
    default:
      return '';
  }
};

export const validateInvoiceForm = (data: InvoiceFormData): InvoiceFormErrors => {
  const fields: (keyof InvoiceFormData)[] = [
    'customerId',
    'purchaseOrderNumber',
    'netTerms',
    'issuedOn',
    'dueOn',
    'taxRate',
    'discountAmount',
    'notes',
    'billingLine1',
    'billingCity',
    'billingStateOrProvince',
    'billingPostalCode',
    'billingCountry',
    'lineItems',
  ];

  for (const field of fields) {
    const error = validateInvoiceField(field, data[field], data);
    if (error) {
      return { [field]: error };
    }
  }

  for (const item of data.lineItems) {
    const nameError = validateInvoiceLineItemField(item, 'name');
    if (nameError) return { [`lineItem.${item.id}.name`]: nameError };

    const descriptionError = validateInvoiceLineItemField(item, 'description');
    if (descriptionError) return { [`lineItem.${item.id}.description`]: descriptionError };

    const quantityError = validateInvoiceLineItemField(item, 'quantity');
    if (quantityError) return { [`lineItem.${item.id}.quantity`]: quantityError };

    const unitRateError = validateInvoiceLineItemField(item, 'unitRate');
    if (unitRateError) return { [`lineItem.${item.id}.unitRate`]: unitRateError };
  }

  const subtotal = getInvoiceSubtotal(data.lineItems);
  const discountAmount = Number(data.discountAmount);

  if (discountAmount > subtotal) {
    return { discountAmount: 'Discount cannot exceed subtotal' };
  }

  return {};
};

export const getInvoiceSubtotal = (items: InvoiceLineItemFormData[]) =>
  items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    const unitRate = Number(item.unitRate);
    return sum + (Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitRate) ? unitRate : 0);
  }, 0);

export const getInvoiceTaxAmount = (items: InvoiceLineItemFormData[], taxRate: string) =>
  (getInvoiceSubtotal(items) * (Number(taxRate) || 0)) / 100;

export const getInvoiceGrandTotal = (
  items: InvoiceLineItemFormData[],
  taxRate: string,
  discountAmount: string
) => getInvoiceSubtotal(items) + getInvoiceTaxAmount(items, taxRate) - (Number(discountAmount) || 0);

export const buildInvoiceAddressPayload = (data: InvoiceFormData): InvoiceAddressRequest => ({
  line1: data.billingLine1.trim(),
  line2: data.billingLine2.trim() || null,
  city: data.billingCity.trim(),
  stateOrProvince: data.billingStateOrProvince.trim(),
  postalCode: data.billingPostalCode.trim(),
  country: data.billingCountry.trim(),
});

export const buildInvoiceLineItemsPayload = (items: InvoiceLineItemFormData[]): InvoiceLineItemRequest[] =>
  items.map((item, index) => ({
    sortOrder: index + 1,
    name: item.name.trim(),
    description: item.description.trim() || null,
    quantity: Number(item.quantity),
    unitRate: Number(item.unitRate),
  }));

const buildInvoicePayload = (data: InvoiceFormData): CreateInvoiceRequest | UpdateInvoiceRequest => ({
  customerId: data.customerId,
  jobId: data.jobId.trim() || null,
  purchaseOrderNumber: data.purchaseOrderNumber.trim() || null,
  netTerms: data.netTerms.trim(),
  status: data.status,
  issuedOn: data.issuedOn,
  dueOn: data.dueOn,
  taxRate: Number(data.taxRate),
  discountAmount: Number(data.discountAmount),
  notes: data.notes.trim() || null,
  billingAddress: buildInvoiceAddressPayload(data),
  lineItems: buildInvoiceLineItemsPayload(data.lineItems),
});

export const buildCreateInvoicePayload = (data: InvoiceFormData): CreateInvoiceRequest =>
  buildInvoicePayload(data);

export const buildUpdateInvoicePayload = (data: InvoiceFormData): UpdateInvoiceRequest =>
  buildInvoicePayload(data);

export const mapInvoiceResponseToFormData = (invoice: InvoiceResponse): InvoiceFormData => ({
  customerId: invoice.customerId || '',
  jobId: invoice.jobId || '',
  purchaseOrderNumber: toSafeString(invoice.purchaseOrderNumber),
  netTerms: toSafeString(invoice.netTerms) || 'Net 14',
  status: (toSafeString(invoice.status) || 'Draft') as InvoiceStatus,
  issuedOn: toSafeString(invoice.issuedOn).slice(0, 10),
  dueOn: toSafeString(invoice.dueOn).slice(0, 10),
  taxRate: String(invoice.taxRate ?? 0),
  discountAmount: String(invoice.discountAmount ?? 0),
  notes: toSafeString(invoice.notes),
  billingLine1: toSafeString(invoice.billingAddress?.line1),
  billingLine2: toSafeString(invoice.billingAddress?.line2),
  billingCity: toSafeString(invoice.billingAddress?.city),
  billingStateOrProvince: toSafeString(invoice.billingAddress?.stateOrProvince),
  billingPostalCode: toSafeString(invoice.billingAddress?.postalCode),
  billingCountry: toSafeString(invoice.billingAddress?.country),
  lineItems:
    invoice.lineItems?.length
      ? invoice.lineItems.map(item => ({
          id: item.id || createLineItemId(),
          name: toSafeString(item.name),
          description: toSafeString(item.description),
          quantity: String(item.quantity ?? 1),
          unitRate: String(item.unitRate ?? 0),
        }))
      : [createEmptyInvoiceLineItem()],
});
