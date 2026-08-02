import { RideCategory } from "../types";

export interface LocationSearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  category?: string;
}

export const FAMOUS_LOCATIONS: LocationSearchResult[] = [
  {
    name: "Av. Paulista, 1000",
    address: "Avenida Paulista, 1000 - Bela Vista, São Paulo - SP",
    lat: -23.5615,
    lng: -46.6560,
    category: "Comercial"
  },
  {
    name: "Aeroporto de Guarulhos (GRU)",
    address: "Rod. Hélio Smidt, s/n - Cumbica, Guarulhos - SP",
    lat: -23.4356,
    lng: -46.4731,
    category: "Aeroporto"
  },
  {
    name: "Aeroporto de Congonhas (CGH)",
    address: "Av. Washington Luís, s/n - Vila Congonhas, São Paulo - SP",
    lat: -23.6273,
    lng: -46.6565,
    category: "Aeroporto"
  },
  {
    name: "Shopping Ibirapuera",
    address: "Av. Ibirapuera, 3103 - Moema, São Paulo - SP",
    lat: -23.6080,
    lng: -46.6660,
    category: "Shopping"
  },
  {
    name: "Parque Ibirapuera",
    address: "Av. Pedro Álvares Cabral, s/n - Vila Mariana, São Paulo - SP",
    lat: -23.5874,
    lng: -46.6576,
    category: "Lazer"
  },
  {
    name: "Terminal Rodoviário Tietê",
    address: "Av. Cruzeiro do Sul, 1800 - Santana, São Paulo - SP",
    lat: -23.5164,
    lng: -46.6253,
    category: "Rodoviária"
  },
  {
    name: "Estação da Luz",
    address: "Praça da Luz, 1 - Bom Retiro, São Paulo - SP",
    lat: -23.5365,
    lng: -46.6353,
    category: "Metrô/Trem"
  },
  {
    name: "Allianz Parque",
    address: "Av. Francisco Matarazzo, 1705 - Água Branca, São Paulo - SP",
    lat: -23.5275,
    lng: -46.6785,
    category: "Estádio"
  },
  {
    name: "Morumbi Shopping",
    address: "Av. Roque Petroni Júnior, 1089 - Chácara Santo Antônio, SP",
    lat: -23.6231,
    lng: -46.6989,
    category: "Shopping"
  },
  {
    name: "Hospital Albert Einstein",
    address: "Av. Albert Einstein, 627 - Morumbi, São Paulo - SP",
    lat: -23.5996,
    lng: -46.7153,
    category: "Saúde"
  }
];

// Calculate Haversine distance in KM
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Number(distance.toFixed(1));
}

// Estimate travel duration in minutes
export function calculateDurationMins(distanceKm: number): number {
  const avgSpeedKmH = 28; // Traffic average in city
  const hours = distanceKm / avgSpeedKmH;
  const mins = Math.ceil(hours * 60) + 3; // +3 min buffer
  return Math.max(mins, 4);
}

// Calculate ride estimate for all vehicle categories
export interface FareEstimate {
  category: RideCategory;
  categoryName: string;
  price: number;
  durationMins: number;
  distanceKm: number;
  description: string;
  drivecashPoints: number;
  icon: string;
}

export function calculateFares(originLat: number, originLng: number, destLat: number, destLng: number): FareEstimate[] {
  const dist = calculateDistanceKm(originLat, originLng, destLat, destLng);
  const duration = calculateDurationMins(dist);

  const categories: {
    category: RideCategory;
    name: string;
    basePrice: number;
    perKm: number;
    perMin: number;
    desc: string;
    icon: string;
  }[] = [
    {
      category: "standard",
      name: "DriveCash Padrão",
      basePrice: 5.0,
      perKm: 2.2,
      perMin: 0.35,
      desc: "Corridas do dia a dia com excelente custo-benefício",
      icon: "Car"
    },
    {
      category: "comfort",
      name: "DriveCash Conforto",
      basePrice: 7.5,
      perKm: 2.8,
      perMin: 0.45,
      desc: "Carros mais espaçosos e ar-condicionado garantido",
      icon: "ShieldCheck"
    },
    {
      category: "premium",
      name: "DriveCash Premium",
      basePrice: 12.0,
      perKm: 3.8,
      perMin: 0.65,
      desc: "Veículos executivos de alto padrão e motoristas top 1%",
      icon: "Sparkles"
    },
    {
      category: "moto",
      name: "DriveCash Moto",
      basePrice: 4.0,
      perKm: 1.5,
      perMin: 0.25,
      desc: "Deslocamentos ultra ágeis para fugir do trânsito",
      icon: "Zap"
    }
  ];

  return categories.map((cat) => {
    let price = cat.basePrice + dist * cat.perKm + duration * cat.perMin;
    if (price < 8.0) price = 8.0; // minimum fare
    price = Number(price.toFixed(2));
    const points = Math.round(price * 10);

    return {
      category: cat.category,
      categoryName: cat.name,
      price,
      durationMins: duration,
      distanceKm: dist,
      description: cat.desc,
      drivecashPoints: points,
      icon: cat.icon
    };
  });
}

// Real OpenStreetMap Nominatim Geocoding Search
export async function searchPlacesReal(query: string): Promise<LocationSearchResult[]> {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim();

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=6&countrycodes=br`;
    const res = await fetch(url, {
      headers: {
        "Accept-Language": "pt-BR,pt;q=0.9"
      }
    });

    if (!res.ok) {
      // Fallback attempt without country restriction
      const globalUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=6`;
      const globalRes = await fetch(globalUrl, {
        headers: { "Accept-Language": "pt-BR,pt;q=0.9" }
      });
      if (!globalRes.ok) return searchPlaces(q);
      const data = await globalRes.json();
      return parseNominatimResults(data, q);
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return parseNominatimResults(data, q);
    }

    // Try without country code if Brazil filter yielded empty
    const globalRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=6`, {
      headers: { "Accept-Language": "pt-BR,pt;q=0.9" }
    });
    if (globalRes.ok) {
      const globalData = await globalRes.json();
      if (Array.isArray(globalData) && globalData.length > 0) {
        return parseNominatimResults(globalData, q);
      }
    }

    return searchPlaces(q);
  } catch (err) {
    console.warn("[NOMINATIM GEOCODE NOTICE] Fetch failed, falling back to local search:", err);
    return searchPlaces(q);
  }
}

function parseNominatimResults(data: any[], query: string): LocationSearchResult[] {
  return data.map((item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    // Construct readable short name
    const addr = item.address || {};
    const mainRoad = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || addr.city_district || "";
    const number = addr.house_number ? `, ${addr.house_number}` : "";
    const city = addr.city || addr.town || addr.municipality || addr.state || "";

    const shortName = mainRoad ? `${mainRoad}${number}` : (item.name || item.display_name.split(",")[0]);
    const fullAddress = item.display_name;

    return {
      name: shortName,
      address: fullAddress,
      lat,
      lng,
      category: addr.suburb || addr.city || "Endereço Real"
    };
  });
}

// Reverse Geocode for GPS coordinates
export async function reverseGeocodeReal(lat: number, lng: number): Promise<LocationSearchResult> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      headers: { "Accept-Language": "pt-BR,pt;q=0.9" }
    });
    if (res.ok) {
      const item = await res.json();
      if (item && item.display_name) {
        const addr = item.address || {};
        const mainRoad = addr.road || addr.pedestrian || addr.suburb || "";
        const number = addr.house_number ? `, ${addr.house_number}` : "";
        const name = mainRoad ? `${mainRoad}${number}` : item.display_name.split(",")[0];
        return {
          name,
          address: item.display_name,
          lat,
          lng
        };
      }
    }
  } catch (err) {
    console.warn("Reverse geocode failed:", err);
  }

  return {
    name: "Minha Localização GPS",
    address: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
    lat,
    lng
  };
}

// OSRM Real Road Driving Route Geometry & Precise Distance/Duration
export async function getRouteGeometry(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{ distanceKm: number; durationMins: number; coordinates: [number, number][] }> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const distKm = Number((route.distance / 1000).toFixed(1));
        const durMins = Math.max(Math.ceil(route.duration / 60), 3);
        const coords: [number, number][] = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        return {
          distanceKm: distKm,
          durationMins: durMins,
          coordinates: coords
        };
      }
    }
  } catch (err) {
    console.warn("OSRM Route Fetch Failed:", err);
  }

  // Fallback direct distance
  const fallbackDist = calculateDistanceKm(originLat, originLng, destLat, destLng);
  const fallbackDur = calculateDurationMins(fallbackDist);
  return {
    distanceKm: fallbackDist,
    durationMins: fallbackDur,
    coordinates: [
      [originLat, originLng],
      [destLat, destLng]
    ]
  };
}

export function searchPlaces(query: string): LocationSearchResult[] {
  if (!query || query.trim().length === 0) return FAMOUS_LOCATIONS.slice(0, 5);
  const q = query.toLowerCase().trim();

  const filtered = FAMOUS_LOCATIONS.filter(
    (loc) => loc.name.toLowerCase().includes(q) || loc.address.toLowerCase().includes(q)
  );

  return filtered;
}
