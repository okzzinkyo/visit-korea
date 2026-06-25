export type CongestionLevel = 1 | 2 | 3 | 4 | 5;

export interface District {
  id: string;
  name: string;
  congestionRate: number;
  level: CongestionLevel;
}

export interface Spot {
  id: string;
  name: string;
  districtId: string;
  districtName: string;
  address: string;
  description: string;
  imageUrl?: string;
  congestionRate: number;
  level: CongestionLevel;
  tags: string[];
}

export interface CongestionForecast {
  date: string;
  congestionRate: number;
  level: CongestionLevel;
}
