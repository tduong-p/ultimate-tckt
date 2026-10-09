import { VI_ERROR_MESSAGES } from './errorMessages';

export const NETWORK_ERROR_MESSAGE = 'Không kết nối được máy chủ. Vui lòng thử lại.';
export const DEFAULT_ERROR_MESSAGE = 'Không thực hiện được thao tác. Vui lòng thử lại.';

/** Lỗi API đã có thông điệp tiếng Việt, vẫn giữ `response.status` để lớp phiên nhận ra 401. */
export class ApiError extends Error {
  response: { status?: number };

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.response = { status };
  }
}

export function translateServerError(message: string): string {
  return VI_ERROR_MESSAGES[message] ?? message;
}

/** Câu lỗi tiếng Việt để hiện cho người dùng từ một lỗi axios/ApiError bất kỳ. */
export function apiErrorMessage(err: unknown, fallback: string = DEFAULT_ERROR_MESSAGE): string {
  if (err instanceof ApiError) return err.message;
  const response = (err as { response?: { data?: { error?: unknown } } } | null)?.response;
  if (!response) return NETWORK_ERROR_MESSAGE;
  const serverError = response.data?.error;
  return typeof serverError === 'string' && serverError.trim() ? translateServerError(serverError) : fallback;
}
