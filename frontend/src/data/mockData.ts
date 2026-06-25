import type { Spot } from '../types';
import { getCongestionLevel } from '../utils/congestion';

export interface Festival {
  id: string;
  name: string;
  icon: string;
  place: string;
  districtId: string;
  start: Date;
  end: Date;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(base.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function makeFestivals(): Festival[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return [
    { id: 'f1', name: '해운대 모래축제',     icon: '🏖️', place: '해운대 해수욕장', districtId: '26350', start: addDays(today, 2),  end: addDays(today, 4)  },
    { id: 'f2', name: '광안리 어방축제',     icon: '🎣', place: '광안리 해수욕장', districtId: '26500', start: addDays(today, 5),  end: addDays(today, 6)  },
    { id: 'f3', name: '부산항 대축제',       icon: '⚓', place: '북항 일원',       districtId: '26170', start: addDays(today, 8),  end: addDays(today, 10) },
    { id: 'f4', name: '동래읍성 역사축제',   icon: '🏯', place: '동래읍성',        districtId: '26260', start: addDays(today, 12), end: addDays(today, 14) },
    { id: 'f5', name: '감천문화마을 예술제', icon: '🎨', place: '감천문화마을',    districtId: '26380', start: addDays(today, 3),  end: addDays(today, 5)  },
    { id: 'f6', name: '기장 멸치축제',       icon: '🐟', place: '기장 대변항',     districtId: '26710', start: addDays(today, 7),  end: addDays(today, 9)  },
    { id: 'f7', name: '수영 민속예술축제',   icon: '🎭', place: '수영사적공원',    districtId: '26500', start: addDays(today, 18), end: addDays(today, 20) },
    { id: 'f8', name: '자갈치 수산물 축제',  icon: '🦀', place: '자갈치시장',      districtId: '26110', start: addDays(today, 6),  end: addDays(today, 8)  },
  ];
}

export const FESTIVALS: Festival[] = makeFestivals();

export const DISTRICT_CONGESTION: Record<string, number> = {
  '26110': 78,  // 중구
  '26140': 35,  // 서구
  '26170': 45,  // 동구
  '26200': 28,  // 영도구
  '26230': 55,  // 부산진구
  '26260': 48,  // 동래구
  '26290': 43,  // 남구
  '26320': 31,  // 북구
  '26350': 87,  // 해운대구
  '26380': 33,  // 사하구
  '26410': 29,  // 금정구
  '26440': 18,  // 강서구
  '26470': 41,  // 연제구
  '26500': 71,  // 수영구
  '26530': 38,  // 사상구
  '26710': 22,  // 기장군
};

export const DISTRICT_NAMES: Record<string, string> = {
  '26110': '중구',
  '26140': '서구',
  '26170': '동구',
  '26200': '영도구',
  '26230': '부산진구',
  '26260': '동래구',
  '26290': '남구',
  '26320': '북구',
  '26350': '해운대구',
  '26380': '사하구',
  '26410': '금정구',
  '26440': '강서구',
  '26470': '연제구',
  '26500': '수영구',
  '26530': '사상구',
  '26710': '기장군',
};

function makeSpot(
  id: string,
  name: string,
  districtId: string,
  congestionRate: number,
  description: string,
  tags: string[],
): Spot {
  return {
    id,
    name,
    districtId,
    districtName: DISTRICT_NAMES[districtId],
    address: `부산시 ${DISTRICT_NAMES[districtId]}`,
    description,
    congestionRate,
    level: getCongestionLevel(congestionRate),
    tags,
  };
}

export interface PlaceDisplay {
  spot: Spot;
  bgGradient: string;
  isHidden?: boolean;
  visitorCount: number;
}

export const LIST_SPOTS: Spot[] = [
  // 해운대구 87%
  makeSpot('ls-01', '해운대 해수욕장', '26350', 92, '부산 대표 해수욕장 · 마린시티 뷰', ['해수욕장', '야경', '해변']),
  makeSpot('ls-02', '동백섬', '26350', 84, '마린시티 인근 산책 코스와 조각공원', ['산책', '조각공원']),
  makeSpot('ls-03', '수변공원 달맞이길', '26350', 78, '해운대 해수욕장 동쪽 드라이브 명소', ['드라이브', '카페']),
  makeSpot('ls-04', 'APEC 나루공원', '26350', 81, '누리마루 APEC 하우스 주변 공원', ['공원', '야경']),

  // 중구 78%
  makeSpot('ls-05', '용두산 공원', '26110', 80, '부산타워와 중구 전경을 한눈에', ['전망대', '공원']),
  makeSpot('ls-06', '자갈치시장', '26110', 74, '부산 최대 수산물 시장 · 먹거리 천국', ['시장', '수산물', '먹거리']),
  makeSpot('ls-07', '보수동 책방골목', '26110', 62, '60년 역사의 헌책방 골목 문화거리', ['문화', '역사']),

  // 수영구 71%
  makeSpot('ls-08', '광안리 해수욕장', '26500', 75, '광안대교 야경이 아름다운 도심 해변', ['해수욕장', '야경', '해변']),
  makeSpot('ls-09', '광안대교 전망대', '26500', 68, '광안대교를 가장 가까이 볼 수 있는 뷰포인트', ['전망대', '야경']),
  makeSpot('ls-10', '수영사적공원', '26500', 55, '조선시대 수군 주둔지 역사 공원', ['역사', '문화']),

  // 부산진구 55%
  makeSpot('ls-11', '서면 먹자골목', '26230', 60, '부산 최대 번화가 · 먹거리 및 쇼핑', ['먹거리', '쇼핑']),
  makeSpot('ls-12', '송상현 광장', '26230', 50, '부산진구 중심 문화 광장', ['광장', '문화']),
  makeSpot('ls-13', '부산시민공원', '26230', 48, '미군 기지였던 100만 평방미터 도심 공원', ['공원', '산책', '역사']),

  // 동래구 48%
  makeSpot('ls-14', '동래온천', '26260', 52, '동래온천은 조선시대부터 이어진 역사 깊은 온천지구입니다. 신라시대 때부터 온천이 알려졌으며, 조선 태종과 세종대왕도 요양 목적으로 방문했다는 기록이 남아있습니다. 일제강점기에는 동래별장이 들어서며 근대 온천 문화의 중심지가 되었고, 현재는 동래구 일대에 수십여 개의 온천 호텔과 목욕탕이 밀집해 있습니다. 수온은 약 53도로 유황 성분이 풍부하며 피부 질환과 관절염에 효능이 있는 것으로 알려져 연중 내국인과 외국인 관광객이 꾸준히 찾는 부산의 대표 휴양 명소입니다. 온천 문화뿐 아니라 조선시대 읍성 유적지와 임진왜란 격전지가 가까이 있어 역사 탐방과 함께 즐길 수 있으며, 주변에는 동래시장, 온천천 시민공원, 복천동 고분군 등 볼거리도 풍성합니다.', ['온천', '역사']),
  makeSpot('ls-15', '동래읍성', '26260', 43, '임진왜란 격전지 동래읍성 역사공원', ['역사', '성곽']),

  // 동구 45%
  makeSpot('ls-16', '부산역 차이나타운', '26170', 50, '부산역 인근 차이나타운 특화거리', ['문화', '먹거리']),
  makeSpot('ls-17', '초량 이바구길', '26170', 42, '원도심 산복도로 역사 문화 탐방로', ['역사', '산책', '문화']),

  // 남구 43%
  makeSpot('ls-18', '오륙도 스카이워크', '26290', 55, '바다 위 투명 유리 전망대 · 스릴 만점', ['전망대', '해안']),
  makeSpot('ls-19', '유엔기념공원', '26290', 35, '세계 유일 유엔군 묘지 · 숙연한 분위기', ['역사', '공원']),

  // 연제구 41%
  makeSpot('ls-20', '배산 임도', '26470', 45, '도심 속 트래킹 코스 · 시민 휴식처', ['등산', '산책']),
  makeSpot('ls-21', '황령산 봉수대', '26470', 38, '부산 시내 전경을 360도 감상하는 야경 명소', ['전망대', '야경']),

  // 서구 35%
  makeSpot('ls-22', '송도 해수욕장', '26140', 40, '부산 최초의 공설 해수욕장 · 케이블카', ['해수욕장', '케이블카']),
  makeSpot('ls-23', '암남공원', '26140', 30, '태종대와 쌍벽을 이루는 해안 절경', ['공원', '해안']),

  // 사하구 33%
  makeSpot('ls-24', '감천문화마을', '26380', 53, '부산의 마추픽추 · 형형색색 계단식 마을', ['문화', '사진', '예술']),
  makeSpot('ls-25', '몰운대', '26380', 26, '낙동강 하구 모래사장과 소나무 숲', ['자연', '산책']),

  // 북구 31%
  makeSpot('ls-26', '화명생태공원', '26320', 33, '낙동강변 자전거길과 억새밭 명소', ['자연', '자전거']),

  // 금정구 29%
  makeSpot('ls-27', '범어사', '26410', 29, '신라 문무왕 18년(678년)에 의상대사가 창건한 천년 고찰로, 금정산 자락에 자리한 동남권 3대 사찰 중 하나입니다. 일주문에서 천왕문까지 이어지는 소나무 숲길이 절경이며, 가을 단풍철에는 산사의 고즈넉한 분위기가 절정에 달합니다.', ['사찰', '등산', '역사']),

  // 영도구 28%
  makeSpot('ls-28', '태종대', '26200', 30, '기암절벽과 등대가 어우러진 해안 절경', ['해안', '등대', '절경']),

  // 사상구 38%
  makeSpot('ls-29', '삼락생태공원', '26530', 38, '낙동강 삼락둑 자전거길 · 봄 유채꽃밭', ['자연', '자전거', '공원']),

  // 기장군 22%
  makeSpot('ls-30', '죽성 드림성당', '26710', 20, '드라마 촬영지 · 바다 위 성당 포토스팟', ['사진', '드라이브']),
  makeSpot('ls-31', '기장 해동용궁사', '26710', 25, '바다 위에 세워진 아름다운 사찰', ['사찰', '해안', '사진']),

  // 강서구 18%
  makeSpot('ls-32', '을숙도 생태공원', '26440', 18, '낙동강 하구에 자리한 을숙도는 매년 10만 마리 이상의 철새가 찾는 국내 최대 철새 도래지입니다. 드넓은 갈대밭과 수변 산책로가 잘 조성되어 있어 사계절 내내 자연 속 힐링을 즐길 수 있으며, 방문객 센터에서 철새 관찰 프로그램도 운영합니다.', ['자연', '철새', '생태']),
];

export const HOT_PLACES: PlaceDisplay[] = [
  {
    spot: LIST_SPOTS.find(s => s.id === 'ls-01')!,
    bgGradient: 'linear-gradient(160deg, #f4a94a 0%, #e05c1a 50%, #1a3fa8 100%)',
    visitorCount: 1234,
  },
  {
    spot: LIST_SPOTS.find(s => s.id === 'ls-24')!,
    bgGradient: 'linear-gradient(160deg, #f7b4c2 0%, #e878a0 30%, #a04080 60%, #5040c0 100%)',
    visitorCount: 987,
  },
  {
    spot: LIST_SPOTS.find(s => s.id === 'ls-08')!,
    bgGradient: 'linear-gradient(160deg, #4a90d9 0%, #1a5fa8 50%, #0a2060 100%)',
    visitorCount: 876,
  },
];

export const HIDDEN_PLACES: PlaceDisplay[] = [
  {
    spot: LIST_SPOTS.find(s => s.id === 'ls-27')!,
    bgGradient: 'linear-gradient(160deg, #8db87a 0%, #5a9060 40%, #3a6840 100%)',
    isHidden: true,
    visitorCount: 432,
  },
  {
    spot: LIST_SPOTS.find(s => s.id === 'ls-32')!,
    bgGradient: 'linear-gradient(160deg, #6ab4c8 0%, #3a80a0 50%, #1a5070 100%)',
    isHidden: true,
    visitorCount: 218,
  },
];
