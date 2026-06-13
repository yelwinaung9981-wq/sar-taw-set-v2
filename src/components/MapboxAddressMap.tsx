import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Loader2 } from 'lucide-react';

interface MapboxAddressMapProps {
  locationToConfirm: {
    latitude: number;
    longitude: number;
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
  setLocationToConfirm: React.Dispatch<React.SetStateAction<any | null>>;
  isReverseGeocoding: boolean;
  setIsReverseGeocoding: (val: boolean) => void;
  darkMode: boolean;
  isMm: boolean;
}

export const MapboxAddressMap: React.FC<MapboxAddressMapProps> = ({
  locationToConfirm,
  setLocationToConfirm,
  isReverseGeocoding,
  setIsReverseGeocoding,
  darkMode,
  isMm
}) => {
  const [token, setToken] = useState<string>('');
  const [loadingToken, setLoadingToken] = useState<boolean>(true);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const markerInstance = useRef<mapboxgl.Marker | null>(null);

  // Fetch Mapbox token from secure backend configuration proxy
  useEffect(() => {
    let active = true;
    const fetchToken = async () => {
      try {
        const res = await fetch('/api/config/mapbox-token');
        if (res.ok) {
          const data = await res.json();
          if (active && data.token) {
            setToken(data.token);
          }
        }
      } catch (err) {
        console.error('Error fetching mapbox token:', err);
      } finally {
        if (active) {
          setLoadingToken(false);
        }
      }
    };
    fetchToken();
    return () => {
      active = false;
    };
  }, []);

  // Initialize Mapbox map instance and register event listeners
  useEffect(() => {
    if (loadingToken || !token || !mapContainer.current) return;

    // Set mapbox-gl access token
    mapboxgl.accessToken = token;

    const initialLng = locationToConfirm.longitude || 101.6869;
    const initialLat = locationToConfirm.latitude || 3.1390;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: darkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
      center: [initialLng, initialLat],
      zoom: 15,
      attributionControl: false
    });

    mapInstance.current = map;

    // Add navigation Zoom controls (top right)
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    // Create Pin marker element
    const el = document.createElement('div');
    el.className = 'custom-mapbox-pin';
    el.style.width = '34px';
    el.style.height = '34px';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    
    const pinColor = darkMode ? '#10b981' : '#368A47';
    el.innerHTML = `
      <div style="position: relative; display: flex; flex-col; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: ${pinColor}; opacity: 0.25; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="padding: 6px; border-radius: 50%; background: ${darkMode ? '#141617' : '#ffffff'}; border: 2px solid ${pinColor}; box-shadow: 0 4px 6px rgba(0,0,0,0.15); display: flex; justify-content: center; align-items: center; color: ${pinColor}; position: relative; z-index: 10;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    `;

    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([initialLng, initialLat])
      .addTo(map);

    markerInstance.current = marker;

    // Register Click listener on map to select and geocode addresses
    map.on('click', async (evt) => {
      const { lng, lat } = evt.lngLat;
      
      // Update marker coordinates instantly
      marker.setLngLat([lng, lat]);
      map.easeTo({ center: [lng, lat] });

      setIsReverseGeocoding(true);

      try {
        const response = await fetch('/api/google/reverse-geocode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ latitude: lat, longitude: lng })
        });

        if (response.ok) {
          const data = await response.json();
          setLocationToConfirm((prev: any) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            name: data.building_name || prev?.name || '',
            street: data.street_address || prev?.street || '',
            city: data.city || prev?.city || '',
            state: data.state || prev?.state || '',
            postcode: data.postcode || prev?.postcode || ''
          }));
        } else {
          setLocationToConfirm((prev: any) => prev ? {
            ...prev,
            latitude: lat,
            longitude: lng
          } : null);
        }
      } catch (err) {
        console.error('Reverse geocoding point error:', err);
        setLocationToConfirm((prev: any) => prev ? {
          ...prev,
          latitude: lat,
          longitude: lng
        } : null);
      } finally {
        setIsReverseGeocoding(false);
      }
    });

    return () => {
      map.remove();
    };
  }, [loadingToken, token]);

  // Sync marker position dynamically helper
  useEffect(() => {
    if (!mapInstance.current || !markerInstance.current) return;
    const { latitude, longitude } = locationToConfirm;
    if (latitude && longitude) {
      markerInstance.current.setLngLat([longitude, latitude]);
      mapInstance.current.easeTo({ center: [longitude, latitude] });
    }
  }, [locationToConfirm.latitude, locationToConfirm.longitude]);

  if (loadingToken) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d0d0d] gap-3 text-zinc-400">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
        <span className="text-xs italic font-semibold">
          {isMm ? 'မြေပုံဖွင့်နေပါသည်...' : 'Streaming map stream...'}
        </span>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d0d0d] p-6 text-center text-zinc-500">
        <MapPin size={34} className="text-zinc-650 animate-bounce mb-2" />
        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
          {isMm ? 'Mapbox Token မတွေ့ရှိပါ' : 'Mapbox Key Missing'}
        </p>
        <p className="text-[11px] leading-relaxed max-w-xs">
          {isMm 
            ? 'ကျေးဇူးပြု၍ စနစ်ထိန်းချုပ်ခန်း (Settings) သို့မဟုတ် .env.example တွင် MAPBOX_ACCESS_TOKEN ကို ထည့်သွင်းပေးပါ။'
            : 'Please configure MAPBOX_ACCESS_TOKEN in your environment or administrative settings.'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" id="mapbox_div_holder">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Floating hints panel */}
      <div className={`absolute bottom-3 left-3 right-3 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md text-center border pointer-events-none select-none z-10 ${
        darkMode 
          ? 'bg-[#0b0d0e]/85 border-zinc-800/80 text-zinc-400' 
          : 'bg-white/85 border-zinc-150 text-zinc-500'
      }`}>
        📍 {isMm ? 'လိပ်စာပြောင်းလဲရန် မြေပုံတည်နေရာကို နှိပ်ပါ' : 'Tap anywhere on the map to set delivery pin'}
      </div>
    </div>
  );
};
