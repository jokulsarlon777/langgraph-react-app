/**
 * 에러 타입 정의 및 에러 처리 유틸리티
 */

export enum ErrorType {
  NETWORK = "NETWORK",
  TIMEOUT = "TIMEOUT",
  API_ERROR = "API_ERROR",
  VALIDATION = "VALIDATION",
  UNKNOWN = "UNKNOWN",
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
  retryable: boolean;
  statusCode?: number;
}

/**
 * 에러를 분석하여 타입을 결정
 */
export function classifyError(error: any): AppError {
  // 네트워크 오류
  if (
    error instanceof TypeError &&
    (error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("Failed to fetch"))
  ) {
    return {
      type: ErrorType.NETWORK,
      message: "네트워크 연결을 확인할 수 없습니다. 인터넷 연결을 확인해주세요.",
      originalError: error,
      retryable: true,
    };
  }

  // 타임아웃 오류
  if (
    error?.message?.includes("timeout") ||
    error?.message?.includes("timed out") ||
    error?.name === "TimeoutError"
  ) {
    return {
      type: ErrorType.TIMEOUT,
      message: "요청 시간이 초과되었습니다. 다시 시도해주세요.",
      originalError: error,
      retryable: true,
    };
  }

  // API 오류 (HTTP 상태 코드)
  if (error?.status || error?.statusCode || error?.response?.status) {
    const statusCode =
      error.status || error.statusCode || error.response?.status;
    let message = "서버 오류가 발생했습니다.";

    if (statusCode === 401) {
      message = "인증이 필요합니다. API 키를 확인해주세요.";
    } else if (statusCode === 403) {
      message = "접근 권한이 없습니다.";
    } else if (statusCode === 404) {
      message = "요청한 리소스를 찾을 수 없습니다.";
    } else if (statusCode === 422) {
      message = "요청 데이터가 올바르지 않습니다.";
    } else if (statusCode === 429) {
      message = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
    } else if (statusCode >= 500) {
      message = "서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    }

    return {
      type: ErrorType.API_ERROR,
      message,
      originalError: error,
      retryable: statusCode >= 500 || statusCode === 429,
      statusCode,
    };
  }

  // 기타 알려진 에러 메시지
  if (error?.message) {
    const errorMessage = String(error.message).toLowerCase();
    
    if (errorMessage.includes("unauthorized") || errorMessage.includes("authentication")) {
      return {
        type: ErrorType.API_ERROR,
        message: "인증이 필요합니다. API 키를 확인해주세요.",
        originalError: error,
        retryable: false,
      };
    }

    if (errorMessage.includes("forbidden")) {
      return {
        type: ErrorType.API_ERROR,
        message: "접근 권한이 없습니다.",
        originalError: error,
        retryable: false,
      };
    }

    if (errorMessage.includes("not found")) {
      return {
        type: ErrorType.API_ERROR,
        message: "요청한 리소스를 찾을 수 없습니다.",
        originalError: error,
        retryable: false,
      };
    }
  }

  // 알 수 없는 오류
  return {
    type: ErrorType.UNKNOWN,
    message: error?.message || "알 수 없는 오류가 발생했습니다.",
    originalError: error,
    retryable: true,
  };
}

/**
 * 에러 메시지를 사용자 친화적으로 변환
 */
export function getErrorMessage(error: any): string {
  const appError = classifyError(error);
  return appError.message;
}

/**
 * 에러가 재시도 가능한지 확인
 */
export function isRetryable(error: any): boolean {
  const appError = classifyError(error);
  return appError.retryable;
}

