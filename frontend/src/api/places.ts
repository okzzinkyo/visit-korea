import { apiGet } from './client';
import type { PlaceSearchResponse } from '../types/api';

export interface FetchPlacesParams {
  keyword?: string;
  districtCode?: string;
  sort?: string;
  page?: number;
  size?: number;
}

export function fetchPlaces(params: FetchPlacesParams): Promise<PlaceSearchResponse> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.districtCode) query.set('districtCode', params.districtCode);
  if (params.sort) query.set('sort', params.sort);
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.size !== undefined) query.set('size', String(params.size));
  const qs = query.toString();
  return apiGet<PlaceSearchResponse>(`/api/places${qs ? `?${qs}` : ''}`);
}
