import apiClient from '../api/axiosInstance';
import {
  AddJobNoteRequest,
  CreateJobRequest,
  DeleteJobNoteResponse,
  DeleteJobPhotoResponse,
  DeleteJobResponse,
  JobAssignmentRequest,
  JobChecklistItemRequest,
  JobNoteResponse,
  JobPhotoResponse,
  JobResponse,
  PostApiJobsAddPhotoJobIdBody,
  PostApiJobsGetAllJobsParams,
  ReorderJobChecklistRequest,
  ReplaceJobAssignmentsRequest,
  ReplaceJobChecklistRequest,
  UpdateJobNoteRequest,
  UpdateJobRequest,
  UpdateJobStatusRequest,
  getFieldoreAPI,
} from '../api/generated';

const api = getFieldoreAPI();

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string | null;
  data?: T;
};

type PagedJobResult = {
  data: JobResponse[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
};

const normalizeJobStatusFromApi = (status?: string | null) => {
  if (!status) return status;
  return status.trim() === 'InProgress' ? 'In Progress' : status;
};

const normalizeJobStatusForApi = (status?: string | null) => {
  if (!status) return status;
  return status.trim() === 'In Progress' ? 'InProgress' : status;
};

const normalizeJobResponse = (job: JobResponse): JobResponse => ({
  ...job,
  status: normalizeJobStatusFromApi(job.status) || job.status,
});

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

const unwrapPaged = (result: ApiEnvelope<{ data?: JobResponse[] | null; totalRecords?: number; pageNumber?: number; pageSize?: number }>, payload: PostApiJobsGetAllJobsParams): PagedJobResult => {
  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch jobs');
  }

  return {
    data: (result.data?.data || []).map(normalizeJobResponse),
    totalRecords: result.data?.totalRecords || 0,
    pageNumber: result.data?.pageNumber || payload.PageNumber || 1,
    pageSize: result.data?.pageSize || payload.PageSize || 10,
  };
};

export const getJobsApi = async (
  payload: PostApiJobsGetAllJobsParams
): Promise<PagedJobResult> => {
  try {
    const response = await api.postApiJobsGetAllJobs(payload);
    return unwrapPaged(response.data, payload);
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while fetching jobs'));
  }
};

export const getJobByIdApi = async (jobId: string): Promise<JobResponse> => {
  try {
    const response = await api.getApiJobsGetByIdJobId(jobId);
    return normalizeJobResponse(unwrapRequired(response.data, 'Failed to fetch job'));
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while fetching the job'));
  }
};

export const createJobApi = async (payload: CreateJobRequest): Promise<JobResponse> => {
  try {
    const response = await api.postApiJobsCreateJob({
      ...payload,
      status: normalizeJobStatusForApi(payload.status),
    });
    return normalizeJobResponse(unwrapRequired(response.data, 'Failed to create job'));
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while creating the job'));
  }
};

export const updateJobApi = async (jobId: string, payload: UpdateJobRequest): Promise<JobResponse> => {
  try {
    const response = await api.putApiJobsUpdateJobJobId(jobId, {
      ...payload,
      status: normalizeJobStatusForApi(payload.status),
    });
    return normalizeJobResponse(unwrapRequired(response.data, 'Failed to update job'));
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while updating the job'));
  }
};

export const deleteJobApi = async (jobId: string): Promise<DeleteJobResponse> => {
  try {
    const response = await api.deleteApiJobsDeleteJobJobId(jobId);
    return unwrapRequired(response.data, 'Failed to delete job');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while deleting the job'));
  }
};

export const updateJobStatusApi = async (
  jobId: string,
  payload: UpdateJobStatusRequest
): Promise<JobResponse> => {
  try {
    const response = await api.patchApiJobsUpdateStatusJobId(jobId, {
      ...payload,
      status: normalizeJobStatusForApi(payload.status),
    });
    return normalizeJobResponse(unwrapRequired(response.data, 'Failed to update job status'));
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while updating job status'));
  }
};

export const replaceJobAssignmentsApi = async (
  jobId: string,
  assignments: JobAssignmentRequest[]
): Promise<JobResponse> => {
  const payload: ReplaceJobAssignmentsRequest = {
    assignments,
  };

  try {
    const response = await api.putApiJobsReplaceAssignmentsJobId(jobId, payload);
    return normalizeJobResponse(unwrapRequired(response.data, 'Failed to update job assignments'));
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while updating job assignments'));
  }
};

export const replaceJobChecklistApi = async (
  jobId: string,
  checklistItems: JobChecklistItemRequest[]
): Promise<JobResponse> => {
  const payload: ReplaceJobChecklistRequest = {
    checklistItems,
  };

  try {
    const response = await api.putApiJobsReplaceChecklistJobId(jobId, payload);
    return normalizeJobResponse(unwrapRequired(response.data, 'Failed to update checklist'));
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while updating the checklist'));
  }
};

export const addJobNoteApi = async (
  jobId: string,
  payload: AddJobNoteRequest
): Promise<JobNoteResponse> => {
  try {
    const response = await api.postApiJobsAddNoteJobId(jobId, payload);
    return unwrapRequired(response.data, 'Failed to add note');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while adding a note'));
  }
};

export const addJobPhotoApi = async (
  jobId: string,
  payload: PostApiJobsAddPhotoJobIdBody
): Promise<JobPhotoResponse> => {
  try {
    const formData = new FormData();

    if (payload.File) {
      formData.append('File', payload.File as any);
    }

    if (payload.Caption) {
      formData.append('Caption', payload.Caption);
    }

    if (payload.TakenAt) {
      formData.append('TakenAt', payload.TakenAt);
    }

    const response = await apiClient.post(`/api/Jobs/add-photo/${jobId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Accept: 'application/json',
      },
    });

    return unwrapRequired(response.data, 'Failed to add photo');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while adding a photo'));
  }
};

export const editJobNoteApi = async (
  jobId: string,
  noteId: string,
  payload: UpdateJobNoteRequest
): Promise<JobNoteResponse> => {
  try {
    const response = await api.putApiJobsEditNoteJobIdNoteId(jobId, noteId, payload);
    return unwrapRequired(response.data, 'Failed to update note');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while updating the note'));
  }
};

export const deleteJobNoteApi = async (
  jobId: string,
  noteId: string
): Promise<DeleteJobNoteResponse> => {
  try {
    const response = await api.deleteApiJobsDeleteNoteJobIdNoteId(jobId, noteId);
    return unwrapRequired(response.data, 'Failed to delete note');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while deleting the note'));
  }
};

export const deleteJobPhotoApi = async (
  jobId: string,
  photoId: string
): Promise<DeleteJobPhotoResponse> => {
  try {
    const response = await api.deleteApiJobsDeletePhotoJobIdPhotoId(jobId, photoId);
    return unwrapRequired(response.data, 'Failed to delete photo');
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while deleting the photo'));
  }
};

export const reorderJobChecklistApi = async (
  jobId: string,
  checklistItemIds: string[]
): Promise<JobResponse> => {
  const payload: ReorderJobChecklistRequest = {
    checklistItemIds,
  };

  try {
    const response = await api.putApiJobsReorderChecklistJobId(jobId, payload);
    return normalizeJobResponse(unwrapRequired(response.data, 'Failed to reorder checklist'));
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'Something went wrong while reordering the checklist'));
  }
};

export const getJobDisplayTitle = (job?: JobResponse | null) =>
  job?.title?.trim() || job?.jobNumber?.trim() || 'Untitled Job';

export const getJobCustomerName = (job?: JobResponse | null) =>
  job?.customer?.displayName?.trim() || 'Unknown Customer';

export const getJobAddressText = (job?: JobResponse | null) => {
  const address = job?.serviceAddress;
  if (!address) {
    return 'No address available';
  }

  const parts = [
    address.line1?.trim(),
    address.city?.trim(),
    address.stateOrProvince?.trim(),
    address.postalCode?.trim(),
    address.country?.trim(),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'No address available';
};

export const getJobInitials = (job?: JobResponse | null) => {
  const name = getJobCustomerName(job);
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'JB';
};
