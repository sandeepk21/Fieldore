import { BusinessDetailsResponse, BusinessRegisterRequest, getFieldoreAPI, LoginRequest } from '../api/generated'; // adjust path
import { setActiveCurrency } from '../utils/currency';

const api = getFieldoreAPI();

export const loginApi = async (payload: LoginRequest) => {
  try {
    const response = await api.postApiAuthLogin(payload);

    // AxiosResponse -> actual data
    const result = response.data;

    if (!result.success) {
      throw new Error(result.message || 'Login failed');
    }

    return result.data; // AuthResponse
  } catch (error: any) {
    throw new Error(error?.message || 'Something went wrong');
  }
};
export const RegisterBusinessApi = async (payload: BusinessRegisterRequest) => {
  try {
    const response = await api.postApiAuthBusinessRegister(payload);

    // AxiosResponse -> actual data
    const result = response.data;

    if (!result.success) {
      throw new Error(result.message || 'Business registration failed');
    }

    return result; // AuthResponse
  } catch (error: any) {
    throw new Error(error?.message || 'Something went wrong');
  }
};
export const getBusinessDetailsApi = async (): Promise<BusinessDetailsResponse> => {
  try {
    const response = await api.getApiAuthGetBusinessDetails();

    const result = response.data;

    // ❌ API failure
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch business details');
    }

    // ❌ No data safety
    if (!result.data) {
      throw new Error('No business data found');
    }

    // Cache the business currency for app-wide formatting.
    // (Typed once the orval client is regenerated against the updated Swagger.)
    setActiveCurrency((result.data as { currency?: string }).currency);

    return result.data;
  } catch (error: any) {
    // Axios error handling
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong';

    throw new Error(message);
  }
};