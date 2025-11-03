import request from "@/lib/request";
import type {
  PrepareImportRequest,
  PrepareImportResponse,
  StartImportRequest,
  StartImportResponse,
  ImportStatusResponse,
} from "@idea/contracts";

export const importApi = {
  /**
   * Step 1: Prepare import - Get presigned URL for file upload
   */
  prepare: async (data: PrepareImportRequest) => {
    return request.post<PrepareImportRequest, PrepareImportResponse>("/api/imports/prepare", data);
  },

  /**
   * Step 2: Start import - Queue background job
   */
  start: async (data: StartImportRequest) => {
    return request.post<StartImportRequest, StartImportResponse>("/api/imports/start", data);
  },

  /**
   * Step 3: Get import status - Poll for progress
   */
  getStatus: async (importJobId: string) => {
    return request.get<null, ImportStatusResponse>(`/api/imports/${importJobId}/status`);
  },
};
