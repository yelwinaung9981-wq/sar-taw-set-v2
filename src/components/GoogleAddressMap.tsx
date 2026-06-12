import React, { useEffect, useState } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import { MapPin, AlertTriangle, Loader2, Navigation } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

// Google Maps Night Mode custom styling JSON
const GOOGLE_MAPS_NIGHT_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2f3948" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

interface GoogleAddressMapProps {
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

// Inner Controller component to bind and execute map changes using google.maps.Map instance
const MapEventsAndPanningController: React.FC<{
  locationToConfirm: any;
  setLocationToConfirm: (loc: any) => void;
  setIsReverseGeocoding: (val: boolean) => void;
  isMm: boolean;
}> = ({ locationToConfirm, setLocationToConfirm, setIsReverseGeocoding, isMm }) => {
  const map = useMap();

  // Watch locationToConfirm coordinate changes to pan & sync map center
  useEffect(() => {
    if (!map || !locationToConfirm) return;
    const currentCenter = map.getCenter();
    const targetLat = Number(locationToConfirm.latitude) || 3.1390;
    const targetLng = Number(locationToConfirm.longitude) || 101.6869;

    if (currentCenter) {
      const diffLat = Math.abs(currentCenter.lat() - targetLat);
      const diffLng = Math.abs(currentCenter.lng() - targetLng);
      // Only pan if it's a significant manual location change (e.g. from autocomplete)
      if (diffLat > 0.0001 || diffLng > 0.0001) {
        map.panTo({ lat: targetLat, lng: targetLng });
      }
    } else {
      map.setCenter({ lat: targetLat, lng: targetLng });
    }
  }, [map, locationToConfirm?.latitude, locationToConfirm?.longitude]);

  // Bind dragend listener to execute reverse geocoding on user repositioning
  useEffect(() => {
    if (!map) return;

    const dragendListener = map.addListener('dragend', async () => {
      const center = map.getCenter();
      if (!center) return;

      const newLat = center.lat();
      const newLng = center.lng();

      setIsReverseGeocoding(true);
      
      // Update coordinates without changing the address name
      setTimeout(() => {
        setLocationToConfirm((prev: any) => prev ? {
          ...prev,
          latitude: newLat,
          longitude: newLng
        } : null);
        setIsReverseGeocoding(false);
      }, 500); // Brief visual confirmation
    });

    return () => {
      if (dragendListener) {
        google.maps.event.removeListener(dragendListener);
      }
    };
  }, [map, setLocationToConfirm, setIsReverseGeocoding]);

  return null;
};

export const GoogleAddressMap: React.FC<GoogleAddressMapProps> = ({
  locationToConfirm,
  setLocationToConfirm,
  isReverseGeocoding,
  setIsReverseGeocoding,
  darkMode,
  isMm
}) => {
  const [apiKey, setApiKey] = React.useState<string | null>(null);
  const [isLoadingKey, setIsLoadingKey] = React.useState(true);
  const initialCoordsRef = React.useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (locationToConfirm && !initialCoordsRef.current) {
        initialCoordsRef.current = {
            lat: Number(locationToConfirm.latitude),
            lng: Number(locationToConfirm.longitude)
        };
    }
  }, [locationToConfirm]);

  useEffect(() => {
    // Check locally first
    const localKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY;
    if (localKey && localKey !== 'YOUR_API_KEY' && localKey !== 'MY_GOOGLE_MAPS_PLATFORM_KEY') {
       setApiKey(localKey);
       setIsLoadingKey(false);
       return;
    }

    // Otherwise fetch from the backend configuration endpoint
    fetch('/api/config/google-maps-key')
      .then(r => r.json())
      .then(data => {
         const key = data.key;
         if (key && key !== 'YOUR_API_KEY' && key !== 'MY_GOOGLE_MAPS_PLATFORM_KEY') {
             setApiKey(key);
         }
      })
      .catch(console.error)
      .finally(() => setIsLoadingKey(false));
  }, []);

  if (isLoadingKey) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-zinc-950 text-white z-50">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium">Loading map constraints...</p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 text-white z-50">
        <AlertTriangle className="text-amber-500 w-12 h-12 mb-3 animate-bounce" />
        <h3 className="text-lg font-bold mb-2">Google Maps Key Required</h3>
        <p className="text-xs text-zinc-400 max-w-sm mb-4">
          To verify accurate standard addresses on Google Maps, please add your Google Maps Platform Key to Secrets.
        </p>
        <div className="text-left text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-full max-w-xs space-y-2">
          <p><strong>Step 1:</strong> Settings (⚙️ icon on top right) → <strong>Secrets</strong></p>
          <p><strong>Step 2:</strong> Create key: <code>GOOGLE_MAPS_PLATFORM_KEY</code></p>
          <p><strong>Step 3:</strong> Paste key, press Enter, wait for automatic build.</p>
        </div>
      </div>
    );
  }

  const initialLat = initialCoordsRef.current?.lat || locationToConfirm?.latitude || 3.1390;
  const initialLng = initialCoordsRef.current?.lng || locationToConfirm?.longitude || 101.6869;

  return (
    <APIProvider apiKey={apiKey} version="weekly">
      <div className="relative w-full h-full">
        {/* Hidden CSS Inject to cleanly strip out terms, copyright attribution, keyboard shortcuts and links */}
        <style>{`
          /* Hide bottom-right copyright notice, terms link, and keyboard shortcuts */
          .gm-style-cc { display: none !important; }
          .gmnoprint:not(:first-child) { display: none !important; }
          button[title="Toggle fullscreen view"] { display: none !important; }
        `}</style>

        {/* Google Maps Viewport */}
        <Map
          defaultCenter={{ lat: initialLat, lng: initialLng }}
          defaultZoom={16}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          styles={GOOGLE_MAPS_NIGHT_STYLE}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Inner Geocoding & Pan Sync Controller */}
          <MapEventsAndPanningController
            locationToConfirm={locationToConfirm}
            setLocationToConfirm={setLocationToConfirm}
            setIsReverseGeocoding={setIsReverseGeocoding}
            isMm={isMm}
          />
          
          {/* Inner Re-Center Button Controller */}
          <MapReCenterButton 
              initialCoords={initialCoordsRef.current}
              isMm={isMm} 
          />
        </Map>

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
      </div>
    </APIProvider>
  );
};

// Inner Re-Center Component to bind the camera to the target location
const MapReCenterButton: React.FC<{ 
  initialCoords: { lat: number; lng: number } | null; 
  isMm: boolean;
}> = ({ initialCoords, isMm }) => {
  const map = useMap();
  
  if (!map) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (initialCoords) {
          map.panTo({
            lat: initialCoords.lat,
            lng: initialCoords.lng
          });
          map.setZoom(16);
        }
      }}
      className="absolute bottom-4 right-4 z-40 w-8 h-8 rounded-full flex items-center justify-center bg-[#1a1a1f] border border-zinc-800 text-emerald-400 shadow-2xl active:scale-95 duration-100 transition-transform cursor-pointer hover:bg-zinc-900"
      aria-label="Locate me"
    >
      <Navigation size={13} className="stroke-[2.5] fill-emerald-400/25 shrink-0 select-none" />
    </button>
  );
};
