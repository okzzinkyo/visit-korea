// 백엔드(/v3/api-docs) 스키마와 1:1 대응하는 응답 타입

export interface CongestionResponse {
  score: number;
  levelCode: string;
  label: string;
}

export interface DateRangeResponse {
  startDate: string;
  endDate: string;
}

export interface RecommendedPlaceResponse {
  id: number;
  name: string;
  imageUrl: string;
  congestion: CongestionResponse;
}

export interface DistrictResponse {
  districtCode: string;
  districtName: string;
  congestion: CongestionResponse;
  recommendedPlace: RecommendedPlaceResponse;
}

export interface BattlePlaceResponse {
  rank: number;
  id: number;
  name: string;
  districtName: string;
  imageUrl: string;
  detailViewCount: number;
  congestion: CongestionResponse;
}

export interface BattleResponse {
  period: DateRangeResponse;
  places: BattlePlaceResponse[];
}

export interface HiddenPlaceItemResponse {
  id: number;
  name: string;
  districtName: string;
  address: string;
  imageUrl: string;
  description: string;
  averageCongestion: CongestionResponse;
}

export interface HiddenPlaceResponse {
  period: DateRangeResponse;
  places: HiddenPlaceItemResponse[];
}

export interface MainResponse {
  baseDate: string;
  districts: DistrictResponse[];
  weeklyBattle: BattleResponse;
  monthlyBattle: BattleResponse;
  hiddenPlace: HiddenPlaceResponse;
}

export interface SelectedDistrictResponse {
  districtCode: string;
  districtName: string;
}

export interface PageResponse {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface DistrictFacetResponse {
  districtCode: string | null;
  districtName: string;
  count: number;
  selected: boolean;
}

export interface DistrictCongestionResponse {
  districtCode: string;
  districtName: string;
  congestionScore: number;
  levelCode: string;
}

export interface DistrictSuggestionResponse {
  visible: boolean;
  selectedDistrict: DistrictCongestionResponse | null;
  recommendedDistricts: DistrictCongestionResponse[];
}

export interface PlaceCardResponse {
  id: number;
  name: string;
  districtName: string;
  imageUrl: string;
  last7DaysDetailViewCount: number;
  last7DaysAverageCongestion: CongestionResponse;
}

export interface PlaceSearchResponse {
  keyword: string | null;
  selectedDistrict: SelectedDistrictResponse | null;
  sort: string;
  page: PageResponse;
  districtFacets: DistrictFacetResponse[];
  districtSuggestion: DistrictSuggestionResponse;
  items: PlaceCardResponse[];
}
