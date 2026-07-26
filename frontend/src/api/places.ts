import { apiGet } from './client';
import type {
  PlaceCongestionPatternResponse,
  PlaceDetailResponse,
  PlaceFestivalResponse,
  PlaceForecastResponse,
  PlaceSearchResponse,
} from '../types/api';

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

export function fetchPlaceDetail(placeId: string | number): Promise<PlaceDetailResponse> {
  return apiGet<PlaceDetailResponse>(`/api/places/${placeId}`);
}

export interface FetchPlaceForecastParams {
  start?: string;
  days?: number;
}

export function fetchPlaceForecast(
  placeId: string | number,
  params: FetchPlaceForecastParams = {},
): Promise<PlaceForecastResponse> {
  const query = new URLSearchParams();
  if (params.start) query.set('start', params.start);
  if (params.days !== undefined) query.set('days', String(params.days));
  const qs = query.toString();
  return apiGet<PlaceForecastResponse>(`/api/places/${placeId}/forecast${qs ? `?${qs}` : ''}`);
}

export function fetchPlaceFestivals(placeId: string | number): Promise<PlaceFestivalResponse> {
  return apiGet<PlaceFestivalResponse>(`/api/places/${placeId}/festivals`);
}

export function fetchPlaceCongestionPattern(placeId: string | number): Promise<PlaceCongestionPatternResponse> {
  return apiGet<PlaceCongestionPatternResponse>(`/api/places/${placeId}/congestion-pattern`);
}
