import React, { useEffect, useState, useRef } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, AlertTriangle, Navigation } from 'lucide-react';
import { motion } from 'motion/react';

interface MapboxAddressMapProps {
  locationToConfirm: {
    name: string;
    street: string;
    city: string;
    state: string;
    postcode: string;
    latitude: number;
    longitude: number;
  } | null;
  setLocationToConfirm: React.Dispatch<React.SetStateAction<any>>;
  isReverseGeocoding: boolean;
  setIsReverseGeocoding: React.Dispatch<React.SetStateAction<boolean>>;
  darkMode: boolean;
  isMm: boolean;
}

export const MapboxAddressMap: React.FC<MapboxAddressMapProps> = ({
  locationToConfirm,
  setLocationToConfirm,
  isReverseGeocoding,
  setIsReverseGeocoding,
  darkMode,
  isMm,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const mapRef = useRef<any>(null);
  const initialCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const [viewState, setViewState] = useState({
    longitude: locationToConfirm?.longitude || 101.6869,
    latitude: locationToConfirm?.latitude || 3.1390,
    zoom: 15
  });

  useEffect(() => {
    if (locationToConfirm && !initialCoordsRef.current) {
      initialCoordsRef.current = {
        lat: Number(locationToConfirm.latitude) || 3.1390,
        lng: Number(locationToConfirm.longitude) || 101.6869
      };
    }
  }, [locationToConfirm]);

  useEffect(() => {
    if (locationToConfirm && mapRef.current) {
      const { longitude, latitude } = locationToConfirm;
      if (longitude && latitude) {
         setViewState((prev) => ({
             ...prev,
             longitude: Number(longitude),
             latitude: Number(latitude)
         }));
      }
    }
  }, [locationToConfirm?.latitude, locationToConfirm?.longitude]);

  useEffect(() => {
    const localKey = (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN;
    if (localKey && localKey !== 'YOUR_API_KEY') {
      setToken(localKey);
      setIsLoadingToken(false);
      return;
    }

    fetch('/api/config/mapbox-token')
      .then((r) => r.json())
      .then((data) => {
        const key = data.token;
        if (key && key !== 'YOUR_API_KEY') {
          setToken(key);
        }
      })
      .catch((err) => {
         console.log("no backend mapbox config");
      })
      .finally(() => setIsLoadingToken(false));
  }, []);

  const handleDragEnd = async (evt: any) => {
      const lngLat = evt.viewState;
      if (!lngLat) return;
      setIsReverseGeocoding(true);
      
      setViewState(evt.viewState);

      try {
        const response = await fetch("/api/google/reverse-geocode", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ latitude: lngLat.latitude, longitude: lngLat.longitude })
        });
        
        if (response.ok) {
          const data = await response.json();
          setLocationToConfirm((prev: any) => ({
            ...prev,
            latitude: lngLat.latitude,
            longitude: lngLat.longitude,
            name: data.building_name || prev?.name || "",
            street: data.street_address || prev?.street || "",
            city: data.city || prev?.city || "",
            state: data.state || prev?.state || "",
            postcode: data.postcode || prev?.postcode || ""
          }));
        } else {
          setLocationToConfirm((prev: any) => prev ? {
            ...prev,
            latitude: lngLat.latitude,
            longitude: lngLat.longitude
          } : null);
        }
      } catch (err) {
        setLocationToConfirm((prev: any) => prev ? {
          ...prev,
          latitude: lngLat.latitude,
          longitude: lngLat.longitude
        } : null);
      } finally {
        setIsReverseGeocoding(false);
      }
  };


  if (isLoadingToken) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-zinc-950 text-white z-50">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium">Loading map config...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 text-white z-50">
        <AlertTriangle className="text-emerald-500 w-12 h-12 mb-3 animate-bounce" />
        <h3 className="text-lg font-bold mb-2">Mapbox Access Token Required</h3>
        <p className="text-xs text-zinc-400 max-w-sm mb-4">
          Please provide a Mapbox Access token to render the Mapbox map.
        </p>
        <div className="text-left text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-full max-w-xs space-y-2">
          <p><strong>Step 1:</strong> Settings (⚙️ icon on top right) → <strong>Secrets</strong></p>
          <p><strong>Step 2:</strong> Create key: <code>VITE_MAPBOX_ACCESS_TOKEN</code></p>
          <p><strong>Step 3:</strong> Paste your Mapbox default public token, press Enter.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onMoveEnd={handleDragEnd}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={token}
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Ground pinpoint indicator halos at screen center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center animate-ping absolute duration-1000" />
        <div className="w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
      </div>

      {/* Stationary Pin Drop on Screen Center */}
      <div className="absolute top-[calc(50%-22px)] left-1/2 -translate-x-1/2 -translate-y-1/2 z-25 pointer-events-none flex flex-col items-center select-none">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2.0, ease: "easeInOut" }}
          className="flex flex-col items-center"
        >
          <div className="w-[36px] h-[36px] rounded-full bg-[#E53E3E] border-2 border-white flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.5)] relative z-20">
            <MapPin size={20} className="text-white fill-white stroke-[2.5]" strokeWidth={3} />
          </div>
          <div className="w-2 h-4 bg-white -mt-1.5 shadow-[0_2px_4px_rgba(0,0,0,0.4)] rounded-full relative z-10" />
        </motion.div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (initialCoordsRef.current) {
            setViewState({
                longitude: initialCoordsRef.current.lng,
                latitude: initialCoordsRef.current.lat,
                zoom: 16
            });
          }
        }}
        className="absolute bottom-4 right-4 z-40 w-8 h-8 rounded-full flex items-center justify-center bg-[#1a1a1f] border border-zinc-800 text-emerald-400 shadow-2xl active:scale-95 duration-100 transition-transform cursor-pointer hover:bg-zinc-900"
        aria-label="Locate me"
      >
        <Navigation size={13} className="stroke-[2.5] fill-emerald-400/25 shrink-0 select-none" />
      </button>
    </div>
  );
};
