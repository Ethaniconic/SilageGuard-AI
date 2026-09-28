/**
 * SILAGEGUARD AI V4 — REST API Endpoints Service
 * High-level typed wrappers for consuming FastAPI backend routes.
 */

import { apiClient, ApiResponse } from "./client";
import { API_CONFIG } from "../../constants/api";
import { BatchSyncDTO, VerificationReportDTO, ModelMetadataDTO } from "../../types/backend";

export const endpoints = {
  // System Health
  async checkHealth(): Promise<ApiResponse<{ status: string; version: string }>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.HEALTH);
  },

  // Batch Ingestion & Sync
  async syncBatch(dto: BatchSyncDTO): Promise<ApiResponse<{ inserted: boolean; client_batch_id: string }>> {
    return apiClient.post(API_CONFIG.ENDPOINTS.BATCH_SYNC, dto);
  },

  async syncBulkBatches(dtos: BatchSyncDTO[]): Promise<ApiResponse<{ count: number; synced: string[] }>> {
    return apiClient.post(API_CONFIG.ENDPOINTS.BATCH_SYNC_BULK, { batches: dtos });
  },

  async listRemoteBatches(limit = 50): Promise<ApiResponse<any[]>> {
    return apiClient.get(`${API_CONFIG.ENDPOINTS.BATCHES_LIST}?limit=${limit}`);
  },

  async getRemoteBatchDetail(batchId: string): Promise<ApiResponse<any>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.BATCH_DETAIL(batchId));
  },

  // QR Verification
  async verifyQr(token: string): Promise<ApiResponse<VerificationReportDTO>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.QR_VERIFY(token));
  },

  async getQrReport(token: string): Promise<ApiResponse<any>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.QR_REPORT(token));
  },

  // Model Registry
  async checkModelRegistry(): Promise<ApiResponse<ModelMetadataDTO[]>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.MODELS_REGISTRY);
  },

  async getModelFamilyStatus(family: string): Promise<ApiResponse<any>> {
    return apiClient.get(API_CONFIG.ENDPOINTS.MODELS_READY(family));
  },
};
