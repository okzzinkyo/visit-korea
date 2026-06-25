declare namespace kakao.maps {
  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    setLevel(level: number): void;
  }

  interface MapOptions {
    center: LatLng;
    level: number;
    mapTypeId?: MapTypeId;
    scrollwheel?: boolean;
    disableDoubleClickZoom?: boolean;
    draggable?: boolean;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class Polygon {
    constructor(options: PolygonOptions);
    setMap(map: Map | null): void;
    setOptions(options: Partial<PolygonOptions>): void;
    getPath(): LatLng[][];
  }

  interface PolygonOptions {
    map?: Map;
    path: LatLng[] | LatLng[][];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: string;
    fillColor?: string;
    fillOpacity?: number;
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions);
    setMap(map: Map | null): void;
    setPosition(latlng: LatLng): void;
    setContent(content: string | HTMLElement): void;
  }

  interface CustomOverlayOptions {
    map?: Map;
    position: LatLng;
    content: string | HTMLElement;
    yAnchor?: number;
    xAnchor?: number;
    zIndex?: number;
  }

  namespace event {
    function addListener(target: object, type: string, handler: (...args: unknown[]) => void): void;
    function removeListener(target: object, type: string, handler: (...args: unknown[]) => void): void;
  }

  enum MapTypeId {
    ROADMAP = 1,
    SKYVIEW = 2,
    HYBRID = 3,
  }
}

declare global {
  interface Window {
    kakao: typeof kakao;
  }
}
