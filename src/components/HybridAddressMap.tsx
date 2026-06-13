import React, { useEffect, useState } from 'react';
import { GoogleAddressMap } from './GoogleAddressMap';
import { MapboxAddressMap } from './MapboxAddressMap';
import { AlertTriangle } from 'lucide-react';

interface HybridAddressMapProps {
  locationToConfirm: any;
  setLocationToConfirm: React.Dispatch<React.SetStateAction<any>>;
  isReverseGeocoding: boolean;
  setIsReverseGeocoding: React.Dispatch<React.SetStateAction<boolean>>;
  darkMode: boolean;
  isMm: boolean;
}

export const HybridAddressMap: React.FC<HybridAddressMapProps> = (props) => {
  const [googleKey, setGoogleKey] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchKeys = async () => {
      let gKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY;
      if (!gKey || gKey === 'YOUR_API_KEY') {
        try {
          const res = await fetch('/api/config/google-maps-key');
          const data = await res.json();
          if (data.key && data.key !== 'YOUR_API_KEY') {
            gKey = data.key;
          }
        } catch (err) {}
      }
      
      let mToken = (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN;
      if (!mToken || mToken === 'YOUR_API_KEY') {
        try {
          const res = await fetch('/api/config/mapbox-token');
          const data = await res.json();
          if (data.token && data.token !== 'YOUR_API_KEY') {
            mToken = data.token;
          }
        } catch (err) {}
      }

      setGoogleKey(gKey || null);
      setMapboxToken(mToken || null);
      setIsLoading(false);
    };

    fetchKeys();
  }, []);

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-zinc-950 text-white z-50">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium">Loading maps engine...</p>
      </div>
    );
  }

  // Mapbox is Primary
  if (mapboxToken) {
    return <MapboxAddressMap {...props} />;
  }

  // Google Maps is Fallback
  if (googleKey) {
    return <GoogleAddressMap {...props} />;
  }

  // No maps configured
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 text-white z-50">
      <AlertTriangle className="text-emerald-500 w-12 h-12 mb-3 animate-bounce" />
      <h3 className="text-lg font-bold mb-2">Map API Key Required</h3>
      <p className="text-xs text-zinc-400 max-w-sm mb-4">
        Please configure either Google Maps or Mapbox mapping services.
      </p>
      <div className="text-left text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-full max-w-xs flex flex-col gap-2">
        <p><strong>Primary:</strong> Set <code>GOOGLE_MAPS_PLATFORM_KEY</code> in Secrets.</p>
        <p><strong>Fallback:</strong> Set <code>VITE_MAPBOX_ACCESS_TOKEN</code> in Secrets.</p>
        <p>A configured map provides real-world coordinate adjustments.</p>
      </div>
    </div>
  );
};
