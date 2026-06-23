import {
  CreateServiceCatalogItemRequest,
  PostApiServiceCatalogGetAllItemsParams,
  ServiceCatalogItemResponse,
  UpdateServiceCatalogItemRequest,
  getFieldoreAPI,
} from '@/src/api/generated';

const api = getFieldoreAPI();

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string | null;
  data?: T;
};

type PagedCatalogResult = {
  data: ServiceCatalogItemResponse[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
};

const getApiErrorMessage = (error: any, fallback: string) => {
  const validationErrors = error?.response?.data?.errors;
  if (validationErrors && typeof validationErrors === 'object') {
    const flatErrors = Object.values(validationErrors).flat().filter(Boolean);
    if (flatErrors.length > 0) {
      return flatErrors.join('\n');
    }
  }
  return error?.response?.data?.message || error?.message || fallback;
};

const unwrapRequired = <T>(result: ApiEnvelope<T>, fallback: string): T => {
  if (!result.success) {
    throw new Error(result.message || fallback);
  }
  if (!result.data) {
    throw new Error(fallback);
  }
  return result.data;
};

export const getServiceCatalogApi = async (
  params: PostApiServiceCatalogGetAllItemsParams = {}
): Promise<PagedCatalogResult> => {
  try {
    const response = await api.postApiServiceCatalogGetAllItems({
      PageNumber: 1,
      PageSize: 200,
      IsActive: true,
      ...params,
    });
    const result = response.data;
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch service items');
    }
    return {
      data: result.data?.data || [],
      totalRecords: result.data?.totalRecords || 0,
      pageNumber: result.data?.pageNumber || params.PageNumber || 1,
      pageSize: result.data?.pageSize || params.PageSize || 200,
    };
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while fetching the catalog'));
  }
};

export const createServiceCatalogItemApi = async (
  payload: CreateServiceCatalogItemRequest
): Promise<ServiceCatalogItemResponse> => {
  try {
    const response = await api.postApiServiceCatalogCreateItem(payload);
    return unwrapRequired(response.data, 'Failed to create service item');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while creating the service item'));
  }
};

export const updateServiceCatalogItemApi = async (
  itemId: string,
  payload: UpdateServiceCatalogItemRequest
): Promise<ServiceCatalogItemResponse> => {
  try {
    const response = await api.putApiServiceCatalogUpdateItemItemId(itemId, payload);
    return unwrapRequired(response.data, 'Failed to update service item');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while updating the service item'));
  }
};

export const deleteServiceCatalogItemApi = async (itemId: string): Promise<void> => {
  try {
    const response = await api.deleteApiServiceCatalogDeleteItemItemId(itemId);
    const result = response.data as ApiEnvelope<unknown>;
    if (!result.success) {
      throw new Error(result.message || 'Failed to delete service item');
    }
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while deleting the service item'));
  }
};
