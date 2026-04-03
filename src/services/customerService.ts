import {
  CreateCustomerRequest,
  GetCustomersRequest,
  CustomerAddressResponse,
  CustomerResponse,
  getFieldoreAPI,
  UpdateCustomerRequest,
} from '../api/generated';

const api = getFieldoreAPI();

export const createCustomerApi = async (
  payload: CreateCustomerRequest
): Promise<CustomerResponse> => {
  try {
    const response = await api.postApiCustomersCreateCustomer(payload);
    const result = response.data;

    if (!result.success) {
      throw new Error(result.message || 'Failed to create customer');
    }

    if (!result.data) {
      throw new Error('Customer created but no customer data was returned');
    }

    return result.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong while creating the customer';

    throw new Error(message);
  }
};

export const getCustomersApi = async (
  payload: GetCustomersRequest
): Promise<{ data: CustomerResponse[]; totalRecords: number; pageNumber: number; pageSize: number }> => {
  try {
    const response = await api.postApiCustomersGetAllCustomers(payload);
    const result = response.data;

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch customers');
    }

    return {
      data: result.data?.data || [],
      totalRecords: result.data?.totalRecords || 0,
      pageNumber: result.data?.pageNumber || payload.pageNumber || 1,
      pageSize: result.data?.pageSize || payload.pageSize || 10,
    };
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong while fetching customers';

    throw new Error(message);
  }
};

export const getCustomerByIdApi = async (
  customerId: string
): Promise<CustomerResponse> => {
  try {
    const response = await api.getApiCustomersGetByIdCustomerId(customerId);
    const result = response.data;

    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch customer');
    }

    if (!result.data) {
      throw new Error('Customer not found');
    }

    return result.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong while fetching the customer';

    throw new Error(message);
  }
};

export const updateCustomerApi = async (
  customerId: string,
  payload: UpdateCustomerRequest
): Promise<CustomerResponse> => {
  try {
    const response = await api.putApiCustomersUpdateCustomerCustomerId(customerId, payload);
    const result = response.data;

    if (!result.success) {
      throw new Error(result.message || 'Failed to update customer');
    }

    if (!result.data) {
      throw new Error('Customer updated but no customer data was returned');
    }

    return result.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong while updating the customer';

    throw new Error(message);
  }
};

export const getCustomerDisplayName = (customer?: CustomerResponse | null) => {
  if (!customer) return 'Unnamed Customer';

  return (
    customer.displayName?.trim() ||
    [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() ||
    customer.companyName?.trim() ||
    'Unnamed Customer'
  );
};

export const getCustomerInitials = (customer?: CustomerResponse | null) => {
  const source = getCustomerDisplayName(customer);
  const parts = source.split(/\s+/).slice(0, 2);
  return parts.map(part => part[0]?.toUpperCase() || '').join('') || 'CU';
};

export const getPrimaryCustomerAddress = (customer?: CustomerResponse | null) =>
  customer?.addresses?.find(address => address?.isPrimary) ||
  customer?.addresses?.find(Boolean) ||
  null;

export const getBillingCustomerAddress = (customer?: CustomerResponse | null) =>
  customer?.addresses?.find(address => address?.isBilling && !address?.isPrimary) ||
  customer?.addresses?.find(address => address?.isBilling) ||
  null;

export const formatCustomerAddress = (address?: CustomerAddressResponse | null) => {
  if (!address) return 'No address';

  const parts = [
    address.line1?.trim(),
    address.city?.trim(),
    address.stateOrProvince?.trim(),
    address.postalCode?.trim(),
    address.country?.trim(),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'No address';
};
