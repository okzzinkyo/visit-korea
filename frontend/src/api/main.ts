import { apiGet } from './client';
import type { MainResponse } from '../types/api';

export function fetchMainData(): Promise<MainResponse> {
  return apiGet<MainResponse>('/api/main');
}
