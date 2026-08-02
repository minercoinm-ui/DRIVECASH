import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { Driver } from "../../types";
import { getRouteGeometry } from "../../lib/mapUtils";

interface MapProps {
  originLat?: number;
  originLng?: number;
  originName?: string;
  destLat?: number;
  destLng?: number;
  destName?: string;
  drivers?: Driver[];
  selectedDriverId?: string;
  onSelectDriver?: (driver: Driver) => void;
  height?: string;
  interactive?: boolean;
  showRoute?: boolean;
  routeCoords?: [number, number][];
}

// Custom Leaflet Icons using SVG Data URIs for clean display without broken assets
const createCustomIcon = (color: string, label: string, isCar: boolean = false) => {
  const svg = isCar
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="${color}" stroke="#0b1329" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="#ffffff"/></svg>`;

  return L.divIcon({
    className: "custom-leaflet-icon",
    html: `<div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
      ${svg}
      ${label ? `<span style="background:#0b1329; color:#ffffff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:10px; margin-top:2px; border:1px solid ${color}; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.4);">${label}</span>` : ""}
    </div>`,
    iconSize: [36, 48],
    iconAnchor: [18, 48]
  });
};

export const MapComponent: React.FC<MapProps> = ({
  originLat = -23.5615,
  originLng = -46.6560,
  originName = "Sua Localização",
  destLat,
  destLng,
  destName,
  drivers = [],
  selectedDriverId,
  onSelectDriver,
  height = "h-[380px]",
  interactive = true,
  showRoute = true,
  routeCoords
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive,
        touchZoom: interactive
      }).setView([originLat, originLng], 14);

      // Dark styled tile layer for premium dark navy UI
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const bounds: L.LatLngBoundsExpression = [];

    // Pickup Pin
    const originMarker = L.marker([originLat, originLng], {
      icon: createCustomIcon("#10b981", originName || "Origem")
    });
    originMarker.bindPopup(`<b>Origem</b><br/>${originName}`);
    layerGroup.addLayer(originMarker);
    bounds.push([originLat, originLng]);

    // Destination Pin
    if (destLat && destLng) {
      const destMarker = L.marker([destLat, destLng], {
        icon: createCustomIcon("#ef4444", destName || "Destino")
      });
      destMarker.bindPopup(`<b>Destino</b><br/>${destName}`);
      layerGroup.addLayer(destMarker);
      bounds.push([destLat, destLng]);

      // Route Polyline
      if (showRoute) {
        if (routeCoords && routeCoords.length > 0) {
          const polyline = L.polyline(routeCoords, {
            color: "#10b981",
            weight: 5,
            opacity: 0.9
          });
          layerGroup.addLayer(polyline);
        } else {
          // Fetch route geometry dynamically
          getRouteGeometry(originLat, originLng, destLat, destLng).then((res) => {
            if (mapInstanceRef.current && layerGroupRef.current && res.coordinates) {
              const polyline = L.polyline(res.coordinates, {
                color: "#10b981",
                weight: 5,
                opacity: 0.9
              });
              layerGroupRef.current.addLayer(polyline);
            }
          });
        }
      }
    }

    // Driver Markers
    drivers.forEach((driver) => {
      if (driver.status === "online") {
        const isSelected = driver.id === selectedDriverId;
        const driverMarker = L.marker([driver.lat, driver.lng], {
          icon: createCustomIcon(isSelected ? "#f59e0b" : "#3b82f6", `${driver.vehicle_model} ⭐${driver.rating}`, true)
        });

        driverMarker.on("click", () => {
          if (onSelectDriver) onSelectDriver(driver);
        });

        driverMarker.bindPopup(`
          <div style="font-family:sans-serif; padding:4px;">
            <b style="color:#0b1329;">${driver.vehicle_model} (${driver.vehicle_color})</b><br/>
            Placa: <b>${driver.plate}</b><br/>
            Nota: ⭐ ${driver.rating}<br/>
            Status: <span style="color:#10b981; font-weight:bold;">Online</span>
          </div>
        `);

        layerGroup.addLayer(driverMarker);
        bounds.push([driver.lat, driver.lng]);
      }
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else {
      map.setView([originLat, originLng], 14);
    }
  }, [originLat, originLng, destLat, destLng, drivers, selectedDriverId, showRoute, interactive, routeCoords]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([originLat, originLng], 15, { animate: true });
    }
  };

  return (
    <div className={`relative ${height} w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-[#0b1329]`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Recenter / Minha Localização Button */}
      {interactive && (
        <button
          onClick={handleRecenter}
          className="absolute bottom-4 right-4 z-10 bg-[#0b1329]/90 hover:bg-[#0b1329] text-emerald-400 hover:text-emerald-300 p-3 rounded-full border border-emerald-500/30 shadow-lg backdrop-blur-md flex items-center gap-2 text-xs font-bold transition-all transform active:scale-95"
          title="Minha Localização"
        >
          <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v3m0 14v3m10-10h-3M5 12H2" />
          </svg>
          <span className="hidden sm:inline">Minha Localização</span>
        </button>
      )}
    </div>
  );
};
