import { CreateJobRequest, JobChecklistItemRequest } from '@/src/api/generated';

export type JobPriority = 'Low' | 'Normal' | 'High' | 'Urgent';
export type JobStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';

export type CreateJobFormData = {
  customerId: string;
  title: string;
  jobType: string;
  priority: JobPriority;
  status: JobStatus;
  scheduledDate: string;
  scheduledTime: string;
  estimatedDurationMinutes: string;
  useCustomerPrimaryAddress: boolean;
  serviceAddress: string;
  serviceCity: string;
  serviceStateCode: string;
  servicePostalCode: string;
  serviceCountryCode: string;
  description: string;
  checklist: string[];
};

export type CreateJobFormErrors = Partial<
  Record<
    keyof CreateJobFormData | 'scheduledAt' | 'checklist' | 'server',
    string
  >
>;

export const JOB_TYPE_OPTIONS = [
  'Inspection',
  'Repair',
  'Maintenance',
  'Installation',
  'Emergency',
  'Follow-up',
];

export const JOB_PRIORITY_OPTIONS: JobPriority[] = ['Low', 'Normal', 'High', 'Urgent'];
export const JOB_STATUS_OPTIONS: JobStatus[] = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
export const DURATION_OPTIONS = ['30', '60', '90', '120', '180', '240'];

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const POSTAL_REGEX = /^[A-Za-z0-9 -]{3,10}$/;

export const createInitialJobFormData = (): CreateJobFormData => ({
  customerId: '',
  title: '',
  jobType: 'Repair',
  priority: 'Normal',
  status: 'Scheduled',
  scheduledDate: '',
  scheduledTime: '',
  estimatedDurationMinutes: '120',
  useCustomerPrimaryAddress: true,
  serviceAddress: '',
  serviceCity: '',
  serviceStateCode: '',
  servicePostalCode: '',
  serviceCountryCode: '',
  description: '',
  checklist: ['Initial inspection', 'Safety check'],
});

export const validateJobField = (
  field: keyof CreateJobFormData,
  value: string | boolean | string[],
  data: CreateJobFormData
): string => {
  switch (field) {
    case 'customerId':
      return String(value).trim() ? '' : 'Customer is required';
    case 'title':
      if (!String(value).trim()) return 'Job title is required';
      if (String(value).trim().length < 3) return 'Job title must be at least 3 characters';
      if (String(value).trim().length > 120) return 'Job title must be 120 characters or less';
      return '';
    case 'jobType':
      return String(value).trim() ? '' : 'Job type is required';
    case 'scheduledDate':
      if (!String(value).trim()) return 'Start date is required';
      if (!ISO_DATE_REGEX.test(String(value).trim())) return 'Use YYYY-MM-DD format';
      return '';
    case 'scheduledTime':
      if (!String(value).trim()) return 'Start time is required';
      if (!TIME_REGEX.test(String(value).trim())) return 'Use HH:mm format';
      return '';
    case 'estimatedDurationMinutes': {
      const duration = Number(String(value).trim());
      if (!String(value).trim()) return 'Duration is required';
      if (!Number.isFinite(duration)) return 'Duration must be a number';
      if (duration < 15) return 'Duration must be at least 15 minutes';
      if (duration > 1440) return 'Duration must be less than 24 hours';
      return '';
    }
    case 'serviceAddress':
      if (data.useCustomerPrimaryAddress) return '';
      if (!String(value).trim()) return 'Service address is required';
      if (String(value).trim().length < 5) return 'Service address looks too short';
      return '';
    case 'serviceCity':
      if (data.useCustomerPrimaryAddress) return '';
      if (!String(value).trim()) return 'City is required';
      return '';
    case 'serviceStateCode':
      if (data.useCustomerPrimaryAddress) return '';
      if (!String(value).trim()) return 'State/Province is required';
      return '';
    case 'servicePostalCode':
      if (data.useCustomerPrimaryAddress) return '';
      if (!String(value).trim()) return 'Postal code is required';
      if (!POSTAL_REGEX.test(String(value).trim())) return 'Enter a valid postal code';
      return '';
    case 'serviceCountryCode':
      if (data.useCustomerPrimaryAddress) return '';
      if (!String(value).trim()) return 'Country is required';
      return '';
    case 'description':
      if (String(value).trim().length > 1000) return 'Description must be 1000 characters or less';
      return '';
    case 'checklist': {
      const items = Array.isArray(value) ? value : [];
      const validItems = items.filter(item => item.trim().length > 0);
      if (validItems.length === 0) return 'Add at least one checklist item';
      if (validItems.some(item => item.trim().length < 2)) return 'Checklist items must be at least 2 characters';
      return '';
    }
    default:
      return '';
  }
};

export const validateCreateJobForm = (data: CreateJobFormData): CreateJobFormErrors => {
  const fields: (keyof CreateJobFormData)[] = [
    'customerId',
    'title',
    'jobType',
    'scheduledDate',
    'scheduledTime',
    'estimatedDurationMinutes',
    'serviceAddress',
    'serviceCity',
    'serviceStateCode',
    'servicePostalCode',
    'serviceCountryCode',
    'description',
    'checklist',
  ];

  for (const field of fields) {
    const error = validateJobField(field, data[field], data);
    if (error) {
      return { [field]: error };
    }
  }

  const scheduledAt = combineJobDateTime(data.scheduledDate, data.scheduledTime);
  if (!scheduledAt) {
    return { scheduledAt: 'Enter a valid start date and time' };
  }

  return {};
};

export const combineJobDateTime = (date: string, time: string) => {
  if (!ISO_DATE_REGEX.test(date.trim()) || !TIME_REGEX.test(time.trim())) {
    return null;
  }

  const parsed = new Date(`${date.trim()}T${time.trim()}:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const buildChecklistPayload = (items: string[]): JobChecklistItemRequest[] =>
  items
    .map(item => item.trim())
    .filter(Boolean)
    .map((taskName, index) => ({
      sortOrder: index + 1,
      taskName,
      isCompleted: false,
    }));

export const buildCreateJobPayload = (data: CreateJobFormData): CreateJobRequest => {
  const scheduledStart = combineJobDateTime(data.scheduledDate, data.scheduledTime);
  const duration = Number(data.estimatedDurationMinutes);
  const scheduledEnd = scheduledStart ? new Date(scheduledStart.getTime() + duration * 60 * 1000) : null;

  return {
    customerId: data.customerId,
    title: data.title.trim(),
    jobType: data.jobType.trim(),
    priority: data.priority,
    status: data.status,
    scheduledStartAt: scheduledStart?.toISOString(),
    scheduledEndAt: scheduledEnd?.toISOString() || null,
    estimatedDurationMinutes: duration,
    useCustomerPrimaryAddress: data.useCustomerPrimaryAddress,
    serviceAddress: data.useCustomerPrimaryAddress
      ? undefined
      : {
          line1: data.serviceAddress.trim(),
          city: data.serviceCity.trim(),
          stateOrProvince: data.serviceStateCode.trim(),
          postalCode: data.servicePostalCode.trim(),
          country: data.serviceCountryCode.trim(),
        },
    description: data.description.trim() || null,
    checklistItems: buildChecklistPayload(data.checklist),
  };
};
