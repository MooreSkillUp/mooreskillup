/**
 * API client for frontend/backend communication
 * Uses NEXT_PUBLIC_API_URL for browser requests
 * Uses API_URL for server-side requests
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

export async function apiCall<T = unknown>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.detail || `API error: ${response.statusText}`,
        status: response.status,
      };
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    };
  }
}

/**
 * Example usage in components:
 *
 * const { data, error } = await apiCall('/api/endpoint/');
 *
 * if (error) {
 *   console.error(error);
 * } else {
 *   console.log(data);
 * }
 */
