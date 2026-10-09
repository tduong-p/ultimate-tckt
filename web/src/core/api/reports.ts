import { apiClient } from '../../shared/utils/api';
import type { ReportExportParams } from './types';
import { ApiError, translateServerError } from './errors';

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function reportExportParams(params: ReportExportParams): Record<string, string> {
  const query: Record<string, string> = { start: params.start, end: params.end };
  if (
    params.team_id !== undefined &&
    params.team_id !== null &&
    params.team_id !== '' &&
    params.team_id !== 'all' &&
    params.team_id !== 0 &&
    params.team_id !== '0'
  ) {
    query.team_id = String(params.team_id);
  }
  query.lang = params.lang || 'vi';
  return query;
}

/**
 * Generate direct download URL for exporting reports in Excel format.
 * Endpoint: GET /api/reports/export
 */
export function getReportExportUrl(params: ReportExportParams): string {
  return `/api/reports/export?${new URLSearchParams(reportExportParams(params)).toString()}`;
}

/**
 * Download the Excel report as a Blob so the caller can surface server errors (400/403)
 * instead of silently saving a JSON error body as a file.
 * Endpoint: GET /api/reports/export
 */
export async function downloadReportExport(params: ReportExportParams): Promise<Blob> {
  try {
    const response = await apiClient.get<Blob>('/reports/export', {
      params: reportExportParams(params),
      responseType: 'blob',
    });
    return response.data;
  } catch (err) {
    const res = (err as { response?: { status?: number; data?: unknown } })?.response;
    let message = 'Không xuất được báo cáo. Vui lòng thử lại.';
    if (res?.data instanceof Blob) {
      try {
        const parsed = JSON.parse(await readBlobText(res.data));
        if (parsed?.error) message = translateServerError(String(parsed.error));
      } catch {
        // body is not JSON; keep the generic message
      }
    }
    throw new ApiError(message, res?.status);
  }
}
