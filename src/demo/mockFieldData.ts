export type DemoCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
};

export type DemoJob = {
  id: number;
  code: string;
  customerId: string;
  customerName: string;
  title: string;
  serviceType: string;
  date: string;
  time: string;
  status: 'In Progress' | 'Scheduled' | 'Completed';
  color: 'blue' | 'amber';
  distanceMiles: number;
};

export type DemoInvoice = {
  id: number;
  number: string;
  customerId: string;
  customer: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  jobCodes: string[];
};

export const demoCustomers: DemoCustomer[] = [
  {
    id: 'cust-oak-ridge',
    name: 'Oak Ridge Dental Center',
    email: 'facilities@oakridgedental.com',
    phone: '+1 512 555 0147',
    address: '7821 Medical Parkway, Austin, TX 78759',
  },
  {
    id: 'cust-cedar-grove',
    name: 'Cedar Grove Apartments',
    email: 'ops@cedargroveapartments.com',
    phone: '+1 214 555 0198',
    address: '1450 Cedar Grove Lane, Dallas, TX 75204',
  },
];

export const demoJobs: DemoJob[] = [
  {
    id: 1,
    code: 'JOB-260311-01',
    customerId: 'cust-oak-ridge',
    customerName: 'Oak Ridge Dental Center',
    title: 'Reception light ballast replacement',
    serviceType: 'Electrical Repair',
    date: '2026-03-11',
    time: '08:30 AM',
    status: 'Completed',
    color: 'blue',
    distanceMiles: 3.2,
  },
  {
    id: 2,
    code: 'JOB-260311-02',
    customerId: 'cust-cedar-grove',
    customerName: 'Cedar Grove Apartments',
    title: 'Booster pump pressure inspection',
    serviceType: 'Plumbing Inspection',
    date: '2026-03-11',
    time: '09:00 AM',
    status: 'In Progress',
    color: 'blue',
    distanceMiles: 2.4,
  },
  {
    id: 3,
    code: 'JOB-260311-03',
    customerId: 'cust-oak-ridge',
    customerName: 'Oak Ridge Dental Center',
    title: 'Sterilization room exhaust fan service',
    serviceType: 'HVAC Maintenance',
    date: '2026-03-11',
    time: '10:30 AM',
    status: 'Scheduled',
    color: 'amber',
    distanceMiles: 3.2,
  },
  {
    id: 4,
    code: 'JOB-260311-04',
    customerId: 'cust-cedar-grove',
    customerName: 'Cedar Grove Apartments',
    title: 'Unit 3B garbage disposal replacement',
    serviceType: 'Appliance Repair',
    date: '2026-03-11',
    time: '11:30 AM',
    status: 'Scheduled',
    color: 'amber',
    distanceMiles: 5.1,
  },
  {
    id: 5,
    code: 'JOB-260311-05',
    customerId: 'cust-oak-ridge',
    customerName: 'Oak Ridge Dental Center',
    title: 'Dental chair waterline sanitization',
    serviceType: 'Preventive Maintenance',
    date: '2026-03-11',
    time: '02:00 PM',
    status: 'Scheduled',
    color: 'blue',
    distanceMiles: 3.2,
  },
  {
    id: 6,
    code: 'JOB-260312-01',
    customerId: 'cust-cedar-grove',
    customerName: 'Cedar Grove Apartments',
    title: 'Building B corridor smoke detector test',
    serviceType: 'Safety Compliance',
    date: '2026-03-12',
    time: '09:30 AM',
    status: 'Scheduled',
    color: 'blue',
    distanceMiles: 5.1,
  },
  {
    id: 7,
    code: 'JOB-260312-02',
    customerId: 'cust-oak-ridge',
    customerName: 'Oak Ridge Dental Center',
    title: 'Front desk thermostat calibration',
    serviceType: 'HVAC Service',
    date: '2026-03-12',
    time: '11:00 AM',
    status: 'Scheduled',
    color: 'amber',
    distanceMiles: 3.2,
  },
  {
    id: 8,
    code: 'JOB-260312-03',
    customerId: 'cust-cedar-grove',
    customerName: 'Cedar Grove Apartments',
    title: 'Pool equipment timer reprogramming',
    serviceType: 'Electrical Service',
    date: '2026-03-12',
    time: '01:00 PM',
    status: 'Scheduled',
    color: 'blue',
    distanceMiles: 5.1,
  },
  {
    id: 9,
    code: 'JOB-260312-04',
    customerId: 'cust-oak-ridge',
    customerName: 'Oak Ridge Dental Center',
    title: 'Breakroom sink leak repair',
    serviceType: 'Plumbing Repair',
    date: '2026-03-12',
    time: '03:00 PM',
    status: 'Scheduled',
    color: 'amber',
    distanceMiles: 3.2,
  },
  {
    id: 10,
    code: 'JOB-260312-05',
    customerId: 'cust-cedar-grove',
    customerName: 'Cedar Grove Apartments',
    title: 'Leasing office AC drain line flush',
    serviceType: 'HVAC Maintenance',
    date: '2026-03-12',
    time: '04:30 PM',
    status: 'Scheduled',
    color: 'blue',
    distanceMiles: 5.1,
  },
];

export const demoInvoices: DemoInvoice[] = [
  {
    id: 1,
    number: 'INV-2603-118',
    customerId: 'cust-oak-ridge',
    customer: 'Oak Ridge Dental Center',
    amount: 1840,
    date: '2026-03-12',
    status: 'Unpaid',
    jobCodes: ['JOB-260311-01', 'JOB-260311-03', 'JOB-260311-05'],
  },
  {
    id: 2,
    number: 'INV-2603-121',
    customerId: 'cust-cedar-grove',
    customer: 'Cedar Grove Apartments',
    amount: 2675,
    date: '2026-03-10',
    status: 'Paid',
    jobCodes: ['JOB-260311-02', 'JOB-260311-04', 'JOB-260312-01'],
  },
];
