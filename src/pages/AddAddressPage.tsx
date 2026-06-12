import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { 
  ChevronLeft, 
  MapPin, 
  Search, 
  Check, 
  AlertTriangle, 
  Trash2, 
  Loader2, 
  X, 
  ChevronRight,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { HybridAddressMap } from '../components/HybridAddressMap';
import { MALAYSIA_LOCATION_DATA } from '../data/malaysiaData';

// High-fidelity Malaysian Landmarks for instant complete address auto-fills
const MALAYSIAN_LANDMARKS = [
  { name: "11, Lorong 5/4b", street: "11, Lorong 5/4b", city: "Petaling Jaya", state: "Selangor", postcode: "46000" },
  { name: "Arte Mont Kiara Complex", street: "Arte Mont Kiara, Jalan Dutamas 1", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "50480" },
  { name: "Arte Cheras Condominium", street: "Arte Cheras, Persiaran Midah Utama, Taman Midah", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "56000" },
  { name: "Pavilion Kuala Lumpur Mall", street: "Pavilion KL, 168, Jalan Bukit Bintang", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "55100" },
  { name: "Suria KLCC Landmark", street: "Lot 241, Suria KLCC, City Centre", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "50088" },
  { name: "Mid Valley Megamall", street: "Mid Valley Megamall, Lingkaran Syed Putra", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "59200" },
  { name: "1 Utama Shopping Centre", street: "1 Utama, 1, Lebuh Bandar Utama, Bandar Utama", city: "Petaling Jaya", state: "Selangor", postcode: "47800" },
  { name: "Sunway Pyramid Mall", street: "Sunway Pyramid, 3, Jalan PJS 11/15, Bandar Sunway", city: "Subang Jaya", state: "Selangor", postcode: "47500" },
  { name: "Tropicana Gardens Mall", street: "Tropicana Gardens Mall, 29, Jalan PJU 5/1, Kota Damansara", city: "Petaling Jaya", state: "Selangor", postcode: "47810" },
  { name: "The Gardens Mall KL", street: "The Gardens Mall, Lingkaran Syed Putra, Mid Valley City", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "59200" },
  { name: "Mont Kiara Pines Condominium", street: "Mont Kiara Pines, Jalan Kiara, Mont Kiara", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "50480" },
  { name: "KL Gateway Premium Residences", street: "KL Gateway, Jalan Kerinchi, Bangsar South", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "59200" },
  { name: "Sunsuria City Celebration", street: "Persiaran Sunsuria, Bandar Sunsuria", city: "Sepang", state: "Selangor", postcode: "43900" },
  { name: "Gurney Plaza Penang", street: "Gurney Plaza, Persiaran Gurney", city: "George Town", state: "Penang", postcode: "10250" },
  { name: "Queensbay Mall Penang", street: "Queensbay Mall, 100, Persiaran Bayan Indah", city: "Bayan Lepas", state: "Penang", postcode: "11900" },
  { name: "The Mall Southkey Mid Valley", street: "The Mall, Mid Valley Southkey, Jalan Bakar Batu", city: "Johor Bahru", state: "Johor", postcode: "80150" },
  { name: "Johor Bahru City Square Mall", street: "JB City Square, 106, Jalan Wong Ah Fook", city: "Johor Bahru", state: "Johor", postcode: "80000" },
  { name: "Sutera Mall Johor", street: "Sutera Mall, 1, Jalan Sutera Tanjung 8/4, Taman Sutera Utama", city: "Skudai", state: "Johor", postcode: "81300" },
  { name: "KSL City Mall JB", street: "KSL City, 33, Jalan Seladang, Taman Abad", city: "Johor Bahru", state: "Johor", postcode: "80250" },
  { name: "IOI City Mall Putrajaya", street: "IOI City Mall, Lebuh IRC, IOI Resort City", city: "Putrajaya", state: "WP Putrajaya", postcode: "62502" },
  { name: "Empire Shopping Gallery Subang", street: "Empire Gallery, Jalan SS 16/1", city: "Subang Jaya", state: "Selangor", postcode: "47500" },
  { name: "Subang Parade Shopping Mall", street: "Subang Parade, Jalan SS 16/1", city: "Subang Jaya", state: "Selangor", postcode: "47500" },
  { name: "Sunway Velocity Mall", street: "Sunway Velocity, Lingkaran SV2", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "55100" },
  { name: "MyTOWN Shopping Centre KL", street: "MyTOWN, Jalan Cochrane, Seksyen 90", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "55100" },
  { name: "Quill City Mall KL", street: "Quill City Mall, Jalan Sultan Ismail", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "50250" },
  { name: "Nu Sentral Mall", street: "Nu Sentral, 201, Jalan Tun Sambanthan, Brickfields", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "50470" },
  { name: "Berjaya Times Square Mall", street: "Berjaya Times Square, 1, Jalan Imbi", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "55100" },
  { name: "Lalaport BBCC Mitsui Park", street: "Lalaport BBCC, 2, Jalan Hang Tuah", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "55100" },
  { name: "The Link 2 Residences", street: "The Link 2, Jalan Jalil Perkasa 1, Bukit Jalil", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "57000" },
  { name: "Parkhill Residence Bukit Jalil", street: "Parkhill Residence, Jalan Teknologi 1, Bukit Jalil", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "57000" },
  { name: "The Fennel Sentul East Residences", street: "The Fennel, Jalan Sentul, Sentul", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "51000" },
  { name: "The Capers Sentul East Condominium", street: "The Capers, Lorong Sentul East, Sentul East", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "51000" },
  { name: "Setia City Mall Shah Alam", street: "Setia City Mall, Persiaran Setia Dagang, Setia Alam", city: "Shah Alam", state: "Selangor", postcode: "40170" },
  { name: "The Hamilton Wangsa Maju", street: "The Hamilton, Jalan Wangsa Delima 7, Wangsa Maju", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "53300" },
  { name: "Verve Suites Mont Kiara", street: "Verve Suites, Jalan Kiara 5, Mont Kiara", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "50480" },
  { name: "Kiara 163 Retail Park Complex", street: "163 Retail Park, 8, Jalan Kiara, Mont Kiara", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "50480" },
  { name: "Plaza Mont Kiara Office Block", street: "Plaza Mont Kiara, 2, Jalan Kiara, Mont Kiara", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "50480" },
  { name: "Bangsar Shopping Centre Mall", street: "BSC, 285, Jalan Maarof, Bangsar", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "59000" },
  { name: "Bangsar Village Mall Complex", street: "Bangsar Village, Jalan Ara, Bangsar Baru", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "59100" },
  { name: "Nadi Bangsar Service Residence", street: "Nadi Bangsar, 6, Jalan Tandok, Bangsar", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "59100" },
  { name: "Star Residences KLCC Complex", street: "Star Residences, Jalan Yap Kwan Seng, City Centre", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "50450" },
  { name: "Zus Coffee Bangsar Outpost", street: "Zus Coffee, Jalan Telawi 3, Bangsar", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "59150" },
  { name: "Gigi Coffee Mega Branch", street: "Gigi Coffee, Lot S-032, Second Floor, Mid Valley Megamall", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "59200" },
  { name: "Starbucks Reserve Premier Bukit Bintang", street: "Starbucks Reserve, Ansara Bukit Bintang, Jalan Bukit Bintang", city: "Kuala Lumpur", state: "WP Kuala Lumpur", postcode: "55100" }
];

// Premium Country/Regional Language Lexicon for all of Malaysia
const LEXICON = {
  en: {
    titleAdd: "Add new address",
    titleEdit: "Edit address",
    sectionContact: "Contact Details",
    fieldName: "Name",
    fieldPhone: "Phone number",
    fieldAddress: "Address",
    selectAddressText: "Select address",
    fieldAddressDetails: "Address details",
    addressDetailsPlaceholder: "Enter apartment, room, floor, etc.",
    setDefaultLabel: "Set as default",
    addressLabelLabel: "Address label",
    home: "Home",
    work: "Work",
    other: "Other",
    saveAddress: "Save",
    deleteAddress: "Delete Address",
    deleteTitle: "Delete this address?",
    deleteConfirm: "This action cannot be undone. Are you sure you want to delete this address?",
    cancel: "Cancel",
    delete: "Delete",
    noResults: "No locations found",
    searchPlaceholder: "Search state, city, or postcode...",
    searchHeader: "Select Address",
    mandatoryToast: "Please fill in all required fields.",
    saveSuccess: "Address saved successfully.",
    saveError: "Failed to save address.",
    deleteSuccess: "Address deleted successfully.",
    deleteError: "Failed to delete address.",
    changeSuccess: "Address chosen: ",
    currentLocationLabel: "CURRENT LOCATION",
    useCurrentLocation: "Use current location",
    gpsAutoSelected: "GPS detected nearest Malaysian delivery hub!",
    selectState: "Select State",
    selectCity: "Select City",
    selectPostcode: "Select Postcode"
  },
  mm: {
    titleAdd: "လိပ်စာအသစ်ထည့်ရန်",
    titleEdit: "လိပ်စာပြင်ဆင်ရန်",
    sectionContact: "ဆက်သွယ်ရန်အချက်အလက်",
    fieldName: "အမည်",
    fieldPhone: "ဖုန်းနံပါတ်",
    fieldAddress: "လိပ်စာ",
    selectAddressText: "လိပ်စာရွေးချယ်ပါ",
    fieldAddressDetails: "လိပ်စာအသေးစိတ်",
    addressDetailsPlaceholder: "အခန်းနံပါတ်၊ တိုက်ခန်း၊ ထပ်။ (ဥပမာ - အခန်း ၁၀၁၊ တိုက်ခန်း ၂)",
    setDefaultLabel: "မူလပုံသေလိပ်စာအဖြစ်သတ်မှတ်မည်",
    addressLabelLabel: "လိပ်စာအမျိုးအစား",
    home: "အိမ်",
    work: "အလုပ်",
    other: "အခြား",
    saveAddress: "သိမ်းဆည်းမည်",
    deleteAddress: "လိပ်စာဖျက်မည်",
    deleteTitle: "လိပ်စာကို ဖျက်မလား။",
    deleteConfirm: "ဤလုပ်ဆောင်ချက်ကို ပြန်ပြင်၍မရပါ။ လိပ်စာကို ဖျက်ရန် သေချာပါသလား။",
    cancel: "မလုပ်တော့ပါ",
    delete: "ဖျက်မည်",
    noResults: "ရှာဖွေမှုမတွေ့ပါ",
    searchPlaceholder: "ပြည်နယ်၊ မြို့ သို့မဟုတ် စာတိုက်ကုဒ် ရှာပါ...",
    searchHeader: "လိပ်စာရွေးချယ်ရန်",
    mandatoryToast: "လိုအပ်သော အကွက်များအားလုံး ဖြည့်သွင်းပေးပါ။",
    saveSuccess: "လိပ်စာသိမ်းဆည်းခြင်း အောင်မြင်ပါသည်။",
    saveError: "သိမ်းဆည်း၍မရပါ။ ထပ်စမ်းကြည့်ပါ။",
    deleteSuccess: "လိပ်စာဖျက်သိမ်းပြီးပါပြီ။",
    deleteError: "မဖျက်နိုင်ပါ။",
    changeSuccess: "ရွေးချယ်ထားသောလိပ်စာ - ",
    currentLocationLabel: "လက်ရှိတည်နေရာ",
    useCurrentLocation: "လက်ရှိတည်နေရာကို အသုံးပြုမည်",
    gpsAutoSelected: "လက်ရှိ GPS တည်နေရာအနီးရှိ ဝန်ဆောင်မှုဗဟိုကို ရွေးချယ်ပြီးပါပြီ။",
    selectState: "ပြည်နယ်ကို ရွေးချယ်ပါ",
    selectCity: "မြို့ကို ရွေးချယ်ပါ",
    selectPostcode: "စာတိုက်ကုဒ်ကို ရွေးချယ်ပါ"
  }
};

// Helper to merge building details and street addresses beautifully and without duplication
const mergeBuildingAndStreet = (building: string, street: string): string => {
  const b = (building || '').trim();
  const s = (street || '').trim();

  // If either is empty, return the other
  if (!b) return s;
  if (!s) return b;

  // Filter out dummy/generic values
  const isGeneric = (str: string) => {
    const lower = str.toLowerCase();
    return lower === 'selected location' || lower === 'ရွေးချယ်ထားသော တည်နေရာ' || lower === 'current location' || lower === 'လက်ရှိတည်နေရာ';
  };

  if (isGeneric(b)) return s;
  if (isGeneric(s)) return b;

  // Case-insensitive inclusion checks
  const bLower = b.toLowerCase();
  const sLower = s.toLowerCase();

  if (sLower.includes(bLower)) {
    return s;
  }
  if (bLower.includes(sLower)) {
    return b;
  }

  // Check prefix redundancies (e.g. "Arte Cheras Condominium" and "Arte Cheras, Persiaran Midah")
  const bWords = b.split(/[\s,]+/);
  if (bWords.length >= 2) {
    const prefix = bWords.slice(0, 2).join(' ').toLowerCase();
    if (sLower.startsWith(prefix) || sLower.includes(prefix)) {
      // Find the prefix boundaries in s to strip duplicate prefix
      const index = sLower.indexOf(prefix);
      if (index !== -1) {
        const remainder = s.substring(index + prefix.length).replace(/^[,\s\-/]+/, '');
        return b + (remainder ? `, ${remainder}` : '');
      }
    }
  }

  return `${b}, ${s}`;
};

export default function AddAddressPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const { 
    addresses, 
    addAddress, 
    updateAddress, 
    removeAddress, 
    darkMode, 
    language,
    t,
    userName,
    userPhone
  } = useStore();

  const isMm = language === 'mm';
  const lexicon = isMm ? LEXICON.mm : LEXICON.en;

  // Multi-step Malaysia Picker State variables
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [pickerStep, setPickerStep] = useState<'state' | 'city' | 'postcode'>('state');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedPostcode, setSelectedPostcode] = useState<string | null>(null);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [apiResults, setApiResults] = useState<any[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [apiSource, setApiSource] = useState<string>('');
  const [locationToConfirm, setLocationToConfirm] = useState<any | null>(null);

  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Form State Variables
  const [name, setName] = useState(userName || '');
  const [phone, setPhone] = useState(() => {
    let p = userPhone || '';
    if (p.startsWith('+95')) return p.substring(3);
    if (p.startsWith('+60')) return p.substring(3);
    if (p.startsWith('+65')) return p.substring(3);
    if (p.startsWith('+66')) return p.substring(3);
    return p;
  });
  const [chosenState, setChosenState] = useState('');
  const [chosenCity, setChosenCity] = useState('');
  const [chosenPostcode, setChosenPostcode] = useState('');
  const [street, setStreet] = useState(''); // Textarea Detail input (optional details)
  const [displayAddress, setDisplayAddress] = useState(''); // Address display in field 3
  const [buildingName, setBuildingName] = useState(''); // Building name track for detail ordering
  const [chosenLatitude, setChosenLatitude] = useState<number | undefined>(undefined);
  const [chosenLongitude, setChosenLongitude] = useState<number | undefined>(undefined);
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [isDefault, setIsDefault] = useState(false);

  // Controls & Validation
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  // Hydrate address details if in edit mode
  useEffect(() => {
    if (editId && addresses.length > 0) {
      const existing = addresses.find(a => a.id === editId);
      if (existing) {
        setName(existing.name || '');
        setChosenState(existing.region || '');
        setChosenCity(existing.city || '');
        setChosenPostcode(existing.township || '');
        setStreet(existing.room || '');
        setDisplayAddress(existing.street || '');
        setBuildingName(existing.building || '');
        setChosenLatitude(existing.latitude);
        setChosenLongitude(existing.longitude);
        
        if (existing.label === 'Office') {
          setAddressLabel('Office');
        } else if (existing.label === 'Other') {
          setAddressLabel('Other');
        } else {
          setAddressLabel('Home');
        }
        
        setIsDefault(!!existing.isDefault);
        
        // Strip Malaysian prefix for phone number field
        let ph = existing.phone || '';
        if (ph.startsWith('+60')) {
          ph = ph.replace('+60', '').replace(/\s+/g, '').replace(/^60/, '').trim();
        }
        setPhone(ph);
      }
    }
  }, [editId, addresses]);

  // Real-time debounce autocomplete fetching from Gemini/Google Maps Search proxy route
  useEffect(() => {
    const trimmed = pickerSearchQuery.trim();
    if (!trimmed) {
      setApiResults([]);
      setIsSearchingApi(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const response = await fetch("/api/gemini/autocomplete-address", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ query: trimmed })
        });
        
        if (!response.ok) {
          throw new Error('Autocomplete API query failed');
        }
        
        const data = await response.json();
        
        if (data && Array.isArray(data.results)) {
            const formatted = data.results.map((item: any) => {
              return {
                name: item.building_name || item.street_address,
                street: item.street_address,
                city: item.city || '',
                state: item.state || '',
                postcode: item.postcode || '',
                latitude: item.latitude,
                longitude: item.longitude
              };
            });
            setApiResults(formatted);
            setApiSource(data.source || 'proxy');
        }
      } catch (error) {
        console.error("Autocomplete Mapbox fetch error:", error);
      } finally {
        setIsSearchingApi(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [pickerSearchQuery]);

  // Validation Flags
  const isNameInvalid = triedSubmit && !name.trim();
  const isPhoneInvalid = triedSubmit && (!phone.trim() || phone.trim().length < 8 || phone.trim().length > 11);
  const isAddressInvalid = triedSubmit && (!chosenState || !chosenCity || !chosenPostcode);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTriedSubmit(true);

    if (!name.trim() || !phone.trim() || phone.trim().length < 8 || !chosenState || !chosenCity || !chosenPostcode) {
      toast.error(lexicon.mandatoryToast);
      return;
    }

    setIsSaving(true);

    const payload = {
      name: name.trim(),
      phone: `+60 ${phone.trim()}`,
      region: chosenState,        
      city: chosenCity,            
      township: chosenPostcode, // Stores Postcode    
      street: displayAddress.trim(), 
      building: buildingName.trim(), 
      room: street.trim(), // Stores detailed street/room other details         
      label: addressLabel,
      isDefault: isDefault,
      latitude: chosenLatitude,
      longitude: chosenLongitude,
    };

    try {
      if (editId) {
        await updateAddress(editId, payload);
      } else {
        await addAddress(payload);
      }
      toast.success(lexicon.saveSuccess);
      navigate(-1);
    } catch (err: any) {
      console.error(err);
      toast.error(lexicon.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async () => {
    if (editId) {
      try {
        await removeAddress(editId);
        toast.success(lexicon.deleteSuccess);
        navigate(-1);
      } catch (err) {
        console.error(err);
        toast.error(lexicon.deleteError);
      }
    }
  };

  // GPS intelligent regional detection matching actual coordinates across Malaysian states
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setChosenState("Selangor");
      setChosenCity("Petaling Jaya");
      setChosenPostcode("47300");
      setDisplayAddress("Damansara Utama, Petaling Jaya");
      setBuildingName("");
      setStreet("");
      setChosenLatitude(3.1390);
      setChosenLongitude(101.6869);
      return;
    }

    setDetectingGps(true);

    const onResolveSuccess = async (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      console.log(`[GPS Detect] Browser resolved coordinates: ${latitude}, ${longitude}`);
      try {
        const response = await fetch("/api/google/reverse-geocode", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ latitude, longitude })
        });

        if (!response.ok) {
          throw new Error("Reverse geocoding failed");
        }

        const resolved = await response.json();
        
        const stateInfo = resolved.state || '';
        const cityInfo = resolved.city || '';
        const postcodeInfo = resolved.postcode || '';
        
        // Construct display name ensuring we don't include extra descriptive text if not needed
        // Only concatenate if name/street are distinct
        const streetInfo = resolved.street_address || "";
        const nameInfo = resolved.building_name || "";
        
        const displayName = mergeBuildingAndStreet(nameInfo, streetInfo);

        setChosenState(stateInfo);
        setChosenCity(cityInfo);
        setChosenPostcode(postcodeInfo);
        setDisplayAddress(displayName);
        setBuildingName(nameInfo || '');
        setStreet("");
        setChosenLatitude(latitude);
        setChosenLongitude(longitude);
        
        setLocationToConfirm({
          name: nameInfo,
          street: streetInfo,
          city: cityInfo,
          state: stateInfo,
          postcode: postcodeInfo,
          latitude: latitude,
          longitude: longitude,
        });
      } catch (err) {
        console.warn("Reverse-geocoding fallback failed, reverting to defaults:", err);
        // Fallback to basic location
        const hubs = [
          { state: "WP Kuala Lumpur", city: "Kuala Lumpur", postcode: "50000", lat: 3.139, lng: 101.686 },
          { state: "Selangor", city: "Petaling Jaya", postcode: "46000", lat: 3.107, lng: 101.606 },
        ];
        
        const matchedHub = hubs[0];
        setChosenState(matchedHub.state);
        setChosenCity(matchedHub.city);
        setChosenPostcode(matchedHub.postcode);
        setDisplayAddress(matchedHub.city);
        setBuildingName("");
        setChosenLatitude(latitude);
        setChosenLongitude(longitude);
      } finally {
        setDetectingGps(false);
      }
    };

    // First attempt with high accuracy
    navigator.geolocation.getCurrentPosition(
      onResolveSuccess,
      (err) => {
        console.warn("[GPS] High accuracy failed, retrying with standard accuracy:", err);
        // Second attempt with low accuracy, useful inside iframe constraints or when GPS signals are weak
        navigator.geolocation.getCurrentPosition(
          onResolveSuccess,
          (err2) => {
            setDetectingGps(false);
            console.error("[GPS] Standard accuracy failed as well:", err2);
            
            // Standard fallback
            setChosenState("WP Kuala Lumpur");
            setChosenCity("Kuala Lumpur");
            setChosenPostcode("50000");
            setStreet("");
            setChosenLatitude(3.1390);
            setChosenLongitude(101.6869);
            
            if (err2.code === 1) {
              // Permission Denied
              toast.error(isMm 
                ? "တည်နေရာခွင့်ပြုချက် (Location Permission) ပိတ်ထားသည့်အတွက် မူလလိပ်စာကို ပြသပေးထားပါသည်။ ခွင့်ပြုချက်ဖွင့်ပေးပါ သို့မဟုတ် ကိုယ်တိုင်ရိုက်ရှာပါ။" 
                : "Location permission denied. Showing default center of KL. Please allow coordinates access or input manually."
              );
            } else {
              toast.error(isMm
                ? "GPS တည်နေရာရှာဖွေရန်မရရှိပါသဖြင့် (Bukit Bintang) ကို မူလပြသပေးထားသည်။ ကျေးဇူးပြု၍ ကိုယ်တိုင်ရိုက်ရှာပေးပါရန်။"
                : "High-accuracy GPS request timed out or unavailable. Defaulting to Bukit Bintang, Kuala Lumpur."
              );
            }
          },
          { timeout: 8000, enableHighAccuracy: false }
        );
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  };

  // Flatten location data on load for fast, unified search like TikTok Shop
  const allMalaysiaLocations = useMemo(() => {
    const list: { state: string; city: string; postcode: string }[] = [];
    Object.entries(MALAYSIA_LOCATION_DATA).forEach(([state, cities]) => {
      Object.entries(cities).forEach(([city, postcodes]) => {
        postcodes.forEach((postcode) => {
          list.push({ state, city, postcode });
        });
      });
    });
    return list;
  }, []);

  // Filter dynamically based on search query prioritizing API results, landmarks then fallback to regional locations
  const activePickerResults = useMemo(() => {
    const query = pickerSearchQuery.trim().toLowerCase();
    if (!query) {
      // If query is empty, return initial list representing "Nearby locations"
      return MALAYSIAN_LANDMARKS.slice(0, 10);
    }
    
    // If we have API results, prioritize displaying them!
    if (apiResults.length > 0) {
      return apiResults;
    }
    
    // Filter matching landmarks
    const matchedLandmarks = MALAYSIAN_LANDMARKS.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.street.toLowerCase().includes(query) ||
      item.city.toLowerCase().includes(query) ||
      item.state.toLowerCase().includes(query) ||
      item.postcode.toLowerCase().includes(query)
    );

    if (matchedLandmarks.length > 0) {
      return matchedLandmarks;
    }

    // Fallback to general regions if no specific landmarks are matched
    const matchedRegions = allMalaysiaLocations.filter(item => 
      item.state.toLowerCase().includes(query) ||
      item.city.toLowerCase().includes(query) ||
      item.postcode.toLowerCase().includes(query)
    ).slice(0, 30);

    return matchedRegions.map(item => ({
      name: `${item.city}, ${item.state}`,
      street: `${item.city}, ${item.state}`,
      city: item.city,
      state: item.state,
      postcode: item.postcode
    }));
  }, [allMalaysiaLocations, pickerSearchQuery, apiResults]);

  return (
    <div className={`min-h-screen font-sans selection:bg-emerald-500/10 transition-colors duration-200 relative pb-28 ${
      darkMode ? 'bg-[#0B0D0E] text-[#E3E5E6]' : 'bg-white text-[#111111]'
    }`}>
      
      {/* Sleek, flat Header mirroring the reference picture */}
      <header className={`sticky top-0 z-40 px-4 h-14 flex items-center justify-between border-b ${
        darkMode ? 'bg-[#0B0D0E]/95 border-zinc-800' : 'bg-white border-[#F0F0F0]'
      }`}>
        <button 
          onClick={() => navigate(-1)}
          className={`-ml-2 p-2 rounded-full flex items-center justify-center transition-all ${
            darkMode ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-[#111111]'
          }`}
          aria-label="Back"
          id="back_btn"
        >
          <ChevronLeft size={24} className="stroke-[2.5]" />
        </button>
        
        <h1 className={`text-[17px] font-bold text-center flex-1 pr-6 ${
          darkMode ? 'text-white' : 'text-[#111111]'
        }`}>
          {editId ? lexicon.titleEdit : lexicon.titleAdd}
        </h1>

        <div className="absolute right-4">
          {editId && (
            <button
               type="button"
               onClick={() => setShowDeleteModal(true)}
               className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                 darkMode ? 'text-red-400 hover:bg-zinc-900' : 'text-red-650 hover:bg-zinc-100'
               }`}
               title={lexicon.delete}
               id="delete_btn"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Main Address Form */}
      <main className="max-w-md mx-auto px-5 py-2 space-y-2.5">
        
        {/* Error Notification Alert */}
        {triedSubmit && (isNameInvalid || isPhoneInvalid || isAddressInvalid) && (
          <div className="p-3 text-xs rounded-xl bg-red-500/5 text-red-500 border border-red-500/20 flex gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span className="font-semibold">{lexicon.mandatoryToast}</span>
          </div>
        )}

        {/* Form Inputs Container - with tight spacing between rows but keeping nice, big inputs inside */}
        <div className="space-y-2.5">
          
          {/* Recipient Name Input */}
          <div className="space-y-1 animate-fadeIn">
            <label className={`text-xs font-bold ${darkMode ? 'text-zinc-500' : 'text-[#7D7D7D]'}`}>
              {lexicon.fieldName}
            </label>
            <div className={`w-full h-10 rounded-xl overflow-hidden transition-all ${
              darkMode ? 'bg-[#181A1B]' : 'bg-[#F5F5F5]'
            } ${isNameInvalid ? 'border border-red-500' : ''}`}>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className={`w-full h-full text-[13px] font-medium px-4 bg-transparent outline-none border-none placeholder-zinc-400 placeholder:italic placeholder:text-[13px] focus:ring-0 ${
                  darkMode ? 'text-white' : 'text-[#111111]'
                }`}
                id="recipient_name_input"
              />
            </div>
          </div>

          {/* Malaysian Format Phone Input with Country dropdown */}
          <div className="space-y-1">
            <label className={`text-xs font-bold ${darkMode ? 'text-zinc-500' : 'text-[#7D7D7D]'}`}>
              {lexicon.fieldPhone}
            </label>
            <div className={`w-full h-10 rounded-xl flex items-center overflow-hidden transition-all ${
              darkMode ? 'bg-[#181A1B]' : 'bg-[#F5F5F5]'
            } ${isPhoneInvalid ? 'border border-red-500' : ''}`}>
              
              <div className="flex items-center gap-1 pl-3.5 pr-2 h-full select-none shrink-0 whitespace-nowrap">
                <span className={`text-[13px] font-medium leading-none whitespace-nowrap ${darkMode ? 'text-zinc-300' : 'text-[#555555]'}`}>
                  MY +60
                </span>
                <ChevronDown size={12} className="text-zinc-500 shrink-0" />
              </div>

              {/* Vertical Divider */}
              <div className={`h-4 w-[1px] shrink-0 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

              <input 
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter phone number"
                className={`w-full h-full text-[13px] font-medium px-3 bg-transparent outline-none border-none placeholder-zinc-400 placeholder:italic placeholder:text-[13px] focus:ring-0 ${
                  darkMode ? 'text-white' : 'text-[#111111]'
                }`}
                id="phone_number_input"
              />
            </div>
          </div>

          {/* Address Trigger + Slick Inline Map Preview */}
          <div className="space-y-1 pt-2">
            <label className={`text-xs font-bold ${darkMode ? 'text-zinc-505' : 'text-[#7D7D7D]'}`}>
              {lexicon.fieldAddress}
            </label>
            
            {!chosenState ? (
              // If no address selected, show a beautiful, clean select button
              <button 
                type="button"
                onClick={() => {
                  setPickerSearchQuery('');
                  setSelectedState(null);
                  setSelectedCity(null);
                  setSelectedPostcode(null);
                  setLocationToConfirm(null);
                  setPickerStep('state');
                  setShowAddressPicker(true);
                }}
                className={`w-full h-11 flex justify-between items-center px-4 rounded-xl transition-all text-left border ${
                  darkMode 
                    ? 'bg-[#181A1B] border-zinc-900 text-zinc-500 hover:bg-[#1f2122]' 
                    : 'bg-[#F5F5F5] border-[#EAEAEA] text-zinc-400 hover:bg-[#ECECEC]'
                } ${isAddressInvalid ? 'border-red-500' : ''}`}
                id="area_picker_trigger"
              >
                <span className="text-[13.5px] font-medium italic">
                  {lexicon.selectAddressText}
                </span>
                <ChevronRight size={18} className="text-zinc-400 shrink-0 ml-1" />
              </button>
            ) : (
              // If an address is selected, show a high-fidelity card + integrated map preview!
              <div 
                onClick={() => {
                  setPickerSearchQuery('');
                  setLocationToConfirm({
                    name: "",
                    street: displayAddress || "",
                    city: chosenCity,
                    state: chosenState,
                    postcode: chosenPostcode,
                    latitude: chosenLatitude || 3.1390,
                    longitude: chosenLongitude || 101.6869
                  });
                  setPickerStep('state');
                  setShowAddressPicker(true);
                }}
                className={`w-full rounded-2xl overflow-hidden border cursor-pointer group transition-all text-left ${
                  darkMode 
                    ? 'bg-[#181A1B] border-zinc-800/85 hover:border-zinc-700/80' 
                    : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'
                }`}
              >
                {/* Upper Text Details Portion */}
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className={`text-[13.5px] font-bold leading-snug break-words ${
                      darkMode ? 'text-zinc-100' : 'text-zinc-900'
                    }`}>
                      {displayAddress || street || lexicon.selectAddressText}
                    </p>
                    <p className={`text-[11.5px] font-semibold tracking-wide ${
                      darkMode ? 'text-zinc-500' : 'text-zinc-500'
                    }`}>
                      {chosenPostcode ? `${chosenPostcode}, ` : ''}{chosenCity}, {chosenState}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-zinc-400 mt-1 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>

                {/* Inline Map Preview */}
                <div className={`w-full h-40 relative border-t ${
                  darkMode ? 'border-zinc-800/60' : 'border-zinc-100'
                }`}>
                  <HybridAddressMap
                    locationToConfirm={{
                      name: "",
                      street: displayAddress || "",
                      city: chosenCity,
                      state: chosenState,
                      postcode: chosenPostcode,
                      latitude: chosenLatitude || 3.1390,
                      longitude: chosenLongitude || 101.6869
                    }}
                    setLocationToConfirm={() => {}} // passive inline preview
                    isReverseGeocoding={false}
                    setIsReverseGeocoding={() => {}}
                    darkMode={darkMode}
                    isMm={isMm}
                  />
                  {/* Overlay blocking events so clicks bubble up to container to trigger the picker */}
                  <div className="absolute inset-0 z-30" />
                </div>
              </div>
            )}
          </div>

          {/* Premium GPS Position Auto Detection Card (only visible if address is not selected) */}
          {!chosenState && (
            <div className={`border p-4 rounded-[16px] space-y-3 transition-all ${
              darkMode ? 'bg-[#141617] border-zinc-800/85' : 'bg-white border-[#E8E8E8]'
            }`}>
              <span className={`text-[10px] font-bold tracking-wider block ${darkMode ? 'text-zinc-500' : 'text-[#9A9A9A]'}`}>
                {lexicon.currentLocationLabel}
              </span>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EAF2FF] flex items-center justify-center text-[#2F80ED] shrink-0">
                  <MapPin size={21} className="stroke-[2.5]" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className={`text-[13px] font-bold truncate ${darkMode ? 'text-zinc-100' : 'text-[#333333]'}`}>
                    {chosenCity ? `${chosenCity}, ${chosenState}` : "Bukit Kerinchi, Kuala Lumpur, Federal Ter..."}
                  </p>
                  <p className={`text-[11px] ${darkMode ? 'text-zinc-500' : 'text-[#9A9A9A]'}`}>
                    Malaysia, {chosenPostcode || '50000'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={detectingGps}
                className={`w-full py-2.5 rounded-xl font-bold text-xs text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  darkMode 
                    ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-55' 
                    : 'bg-[#F5F5F5] text-zinc-500 hover:bg-[#EBEBEB] disabled:opacity-55'
                }`}
              >
                {detectingGps && <Loader2 size={13} className="animate-spin text-zinc-400" />}
                {lexicon.useCurrentLocation}
              </button>
            </div>
          )}

          {/* Detailed Street/Building Details (Optional input) */}
          <div className="space-y-1">
            <label className={`text-xs font-bold ${darkMode ? 'text-zinc-500' : 'text-[#7D7D7D]'}`}>
              {lexicon.fieldAddressDetails}
            </label>
            <div className={`w-full rounded-xl overflow-hidden ${
              darkMode ? 'bg-[#181A1B]' : 'bg-[#F5F5F5]'
            }`}>
              <textarea 
                rows={2}
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder={lexicon.addressDetailsPlaceholder}
                className={`w-full text-[13px] font-medium py-3 px-4 bg-transparent outline-none border-none placeholder-zinc-400 placeholder:italic placeholder:text-[13px] focus:ring-0 resize-none ${
                  darkMode ? 'text-white' : 'text-[#111111]'
                }`}
                id="room_input"
              />
            </div>
          </div>

          {/* TikTok-Style Set Default Switch Toggle */}
          <div className="flex items-center justify-between py-1 select-none">
            <span className={`text-[14px] font-semibold ${darkMode ? 'text-zinc-200' : 'text-[#111111]'}`}>
              {lexicon.setDefaultLabel}
            </span>
            <button
              type="button"
              onClick={() => setIsDefault(!isDefault)}
              className={`w-11 h-[25px] rounded-full transition-colors relative cursor-pointer outline-none ${
                isDefault 
                  ? 'bg-[#368A47]' 
                  : (darkMode ? 'bg-zinc-800' : 'bg-zinc-200')
              }`}
              aria-label="Toggle Default Address State"
              id="default_toggle_switch"
            >
              <div 
                className={`w-[21px] h-[21px] rounded-full bg-white transition-transform duration-200 absolute top-[2px] ${
                  isDefault ? 'right-[2px]' : 'left-[2px]'
                }`}
              />
            </button>
          </div>

          {/* Address Tag Selection */}
          <div className="space-y-1">
            <label className={`text-xs font-bold ${darkMode ? 'text-zinc-500' : 'text-[#7D7D7D]'}`}>
              {lexicon.addressLabelLabel}
            </label>
            <div className="flex gap-2.5">
              
              <button
                type="button"
                onClick={() => setAddressLabel('Home')}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  addressLabel === 'Home' 
                    ? 'bg-[#368A47] text-white shadow-xs' 
                    : (darkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-[#F5F5F5] text-zinc-700 hover:bg-zinc-200')
                }`}
                id="category_home_btn"
              >
                {lexicon.home}
              </button>
              
              <button
                type="button"
                onClick={() => setAddressLabel('Office')}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  addressLabel === 'Office' 
                    ? 'bg-[#368A47] text-white shadow-xs' 
                    : (darkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-[#F5F5F5] text-zinc-700 hover:bg-zinc-200')
                }`}
                id="category_office_btn"
              >
                {lexicon.work}
              </button>

              <button
                type="button"
                onClick={() => setAddressLabel('Other')}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  addressLabel === 'Other' 
                    ? 'bg-[#368A47] text-white shadow-xs' 
                    : (darkMode ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-[#F5F5F5] text-zinc-700 hover:bg-zinc-200')
                }`}
                id="category_other_btn"
              >
                {lexicon.other}
              </button>
            </div>
          </div>

        </div>

        {/* Privacy Policy disclaimer centered at structural bottom */}
        <div className="pt-2 text-center px-4">
          <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-zinc-500' : 'text-[#9A9A9A]'}`}>
            By clicking 'Save', you acknowledge that you have read the<br />
            <span className={`font-bold uppercase ${darkMode ? 'text-zinc-300' : 'text-[#333333]'}`}>
              SARTAWSET Privacy Policy.
            </span>
          </p>
        </div>

      </main>

      {/* Floating Save button held at fixed footer */}
      <footer className={`fixed bottom-0 left-0 right-0 p-3 z-30 border-t ${
        darkMode ? 'bg-[#0B0D0E]/95 border-zinc-800 backdrop-blur-md' : 'bg-white/95 border-[#F0F0F0] backdrop-blur-md'
      }`}>
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="w-full bg-[#529960] hover:bg-[#438350] disabled:opacity-50 text-white py-2.5 px-4 rounded-full font-bold text-xs tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.985]"
            id="save_address_button"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <Check size={14} strokeWidth={3} className="text-white" />
            )}
            <span>{lexicon.saveAddress}</span>
          </button>
        </div>
      </footer>

      {/* Interactive Full-Screen Pure Black Address Search Page Overlay */}
      <AnimatePresence>
        {showAddressPicker && (
          <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-200 ${
            darkMode 
              ? 'bg-[#000000] text-white' 
              : 'bg-white text-zinc-900 border-t border-zinc-100'
          }`}>
            
            {locationToConfirm ? (
              /* High-Fidelity Interactive Map Location Confirmation Page */
              <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
                
                {/* Top Navigation Row (Screenshot Look&Feel) */}
                <div className={`px-3.5 py-2 flex items-center justify-between shrink-0 border-b ${
                  darkMode ? 'bg-black border-zinc-900 text-white' : 'bg-white border-zinc-150 text-zinc-900'
                }`}>
                  <button
                    type="button"
                    onClick={() => setLocationToConfirm(null)}
                    className={`w-10 h-10 flex items-center justify-center active:scale-95 rounded-full transition-all cursor-pointer ${
                      darkMode ? 'hover:bg-zinc-900 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                    }`}
                    aria-label="Go Back"
                  >
                    <ChevronLeft size={26} className="stroke-[2.5]" />
                  </button>
                  
                  <h2 className={`text-[17px] font-bold text-center flex-1 pr-10 ${
                    darkMode ? 'text-white' : 'text-zinc-900'
                  }`}>
                    {isMm ? "မြေပုံတည်နေရာအတည်ပြုရန်" : "Confirm map location"}
                  </h2>
                </div>

                {/* Real-World High-Fidelity Interactive Map Area */}
                <div className="relative flex-1 overflow-hidden flex items-center justify-center bg-black">
                  <HybridAddressMap
                    locationToConfirm={locationToConfirm}
                    setLocationToConfirm={setLocationToConfirm}
                    isReverseGeocoding={isReverseGeocoding}
                    setIsReverseGeocoding={setIsReverseGeocoding}
                    darkMode={darkMode}
                    isMm={isMm}
                  />
                </div>

                {/* Bottom confirmation drawer details */}
                <div className={`px-4.5 pt-5 pb-7 shrink-0 rounded-t-none border-t shadow-[0_-12px_30px_rgba(0,0,0,0.15)] flex flex-col gap-4.5 ${
                  darkMode ? 'bg-[#0a0d0e] border-zinc-900 text-white' : 'bg-white border-zinc-100 text-zinc-900'
                }`}>
                  
                  {/* Address Display Box */}
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[11px] font-black uppercase tracking-[0.16em] ${
                      darkMode ? 'text-[#8e8e93]' : 'text-zinc-500'
                    }`}>
                      {lexicon.fieldAddress}
                    </label>
                    <button
                      type="button"
                      onClick={() => setLocationToConfirm(null)}
                      className={`w-full p-4 rounded-xl flex items-center justify-between text-left border cursor-pointer active:scale-[0.99] transition-all ${
                        darkMode 
                          ? 'bg-[#1e1e1e] border-zinc-900/80 text-zinc-200 hover:bg-[#252525]' 
                          : 'bg-zinc-50 border-zinc-200/60 text-zinc-800 hover:bg-zinc-100/50'
                      }`}
                    >
                      {isReverseGeocoding ? (
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Loader2 size={16} className="animate-spin text-emerald-400" />
                          <span className="text-[13px] italic">{isMm ? "လိပ်စာပြန်လည်တွက်ချက်နေပါသည်..." : "Recalculating address..."}</span>
                        </div>
                      ) : (
                        <span className="text-[13.5px] font-bold truncate pr-3 select-all">
                          {mergeBuildingAndStreet(locationToConfirm.name, locationToConfirm.street)}
                        </span>
                      )}
                      <ChevronRight size={18} className="text-zinc-400 shrink-0" />
                    </button>
                  </div>

                  {/* Region Information */}
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[11px] font-black uppercase tracking-[0.16em] ${
                      darkMode ? 'text-[#8e8e93]' : 'text-zinc-500'
                    }`}>
                      {isMm ? "ဒေသတွင်းသတ်မှတ်ချက်" : "Region"}
                    </label>
                    <div className={`w-full p-4 rounded-xl flex items-center justify-between text-left border ${
                      darkMode ? 'bg-[#1e1e1e] border-zinc-900/80 text-zinc-100' : 'bg-zinc-50 border-zinc-200/60 text-zinc-800'
                    }`}>
                      {isReverseGeocoding ? (
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Loader2 size={16} className="animate-spin text-emerald-400" />
                          <span className="text-[13px] italic">{isMm ? "ဒေသအချက်အလက်ရှာဖွေနေပါသည်..." : "Detecting region..."}</span>
                        </div>
                      ) : (
                        <span className="text-[13.5px] font-semibold truncate pr-3 select-all">
                          {locationToConfirm.postcode ? `${locationToConfirm.postcode}, ` : ''}{locationToConfirm.city}, {locationToConfirm.state}
                        </span>
                      )}
                      <ChevronDown size={18} className="text-zinc-400 shrink-0" />
                    </div>
                  </div>

                  {/* Vibrant Green App-branded Confirmation Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setChosenState(locationToConfirm.state);
                      setChosenCity(locationToConfirm.city);
                      setChosenPostcode(locationToConfirm.postcode);
                      setDisplayAddress(mergeBuildingAndStreet(locationToConfirm.name, locationToConfirm.street));
                      setBuildingName(locationToConfirm.name || '');
                      setStreet("");
                      
                      setChosenLatitude(locationToConfirm.latitude);
                      setChosenLongitude(locationToConfirm.longitude);

                      setSelectedState(locationToConfirm.state);
                      setSelectedCity(locationToConfirm.city);
                      setSelectedPostcode(locationToConfirm.postcode);
                      
                      setShowAddressPicker(false);
                      setPickerSearchQuery('');
                      setLocationToConfirm(null);
                    }}
                    className="w-full bg-[#368A47] hover:bg-[#2d733b] active:scale-[0.985] text-white font-bold py-2.5 px-5 rounded-full text-[14px] tracking-wider transition-all shadow-[0_5px_15px_rgba(54,138,71,0.3)] text-center cursor-pointer select-none"
                  >
                    {isMm ? "တည်နေရာအတည်ပြုမည်" : "Confirm"}
                  </button>

                </div>

              </div>
            ) : (
              /* Regular Address Autocomplete Search Keyboard Input View */
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                
                {/* Top Navigation Row (Screenshot Look&Feel) */}
                <div className="px-3.5 py-3 flex items-center gap-2.5 shrink-0">
                  {/* Back active arrow button */}
                  <button
                    type="button"
                    onClick={() => setShowAddressPicker(false)}
                    className={`w-10 h-10 flex items-center justify-center active:scale-95 rounded-full transition-all cursor-pointer ${
                      darkMode ? 'hover:bg-zinc-900 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                    }`}
                    aria-label="Go Back"
                  >
                    <ChevronLeft size={26} className="stroke-[2.5]" />
                  </button>

                  {/* Capsule Search Box */}
                  <div className={`flex-1 rounded-xl flex items-center gap-2 px-3 py-2 border shadow-inner ${
                    darkMode ? 'bg-[#1A1D1E] border-zinc-900' : 'bg-zinc-150 border-zinc-200'
                  }`}>
                    <Search size={16} className="text-[#8e8e93] shrink-0" />
                    <input
                      type="text"
                      value={pickerSearchQuery}
                      onChange={(e) => setPickerSearchQuery(e.target.value)}
                      placeholder="Search location"
                      className={`w-full bg-transparent text-[13.5px] font-medium outline-none border-none p-0 focus:ring-0 ${
                        darkMode ? 'text-white placeholder-zinc-500' : 'text-zinc-900 placeholder-zinc-400'
                      } placeholder:not-italic`}
                      id="area_picker_search_input"
                      autoFocus
                    />
                    {pickerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setPickerSearchQuery('')}
                        className={`p-0.5 rounded-full ${
                          darkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* List Header Segment */}
                <div className="px-4.5 pt-4 pb-1.5 shrink-0 flex items-center justify-between">
                  <span className={`text-[13px] font-bold uppercase tracking-wider ${
                    darkMode ? 'text-[#8e8e93]' : 'text-zinc-500'
                  }`}>
                    {pickerSearchQuery.trim() !== '' 
                      ? (isMm ? "ရှာဖွေတွေ့ရှိသည့်တည်နေရာများ" : "Search locations")
                      : (isMm ? "အနီးအနားရှိ တည်နေရာများ" : "Nearby locations")}
                  </span>
                  {isSearchingApi && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                      <Loader2 size={13} className="animate-spin" />
                      <span className="animate-pulse">{isMm ? "ရှာဖွေနေသည်..." : "Searching..."}</span>
                    </div>
                  )}
                  {!isSearchingApi && pickerSearchQuery.trim() !== '' && apiSource && (
                    <div className={`flex items-center gap-1 py-0.5 px-2 rounded-full border text-[11px] font-medium select-none anim-fade-in ${
                      darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                    }`}>
                      <span className="scale-90 inline-block">
                        {apiSource === 'google' 
                          ? "🗺️ Google Maps" 
                          : apiSource === 'gemini' 
                            ? "🤖 Gemini" 
                            : "🗺️ Mapbox"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Simulated Tactile Content List */}
                <div className="flex-1 overflow-y-auto px-1.5 pb-6 space-y-0.5 no-scrollbar">
                  {activePickerResults.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500 text-xs font-semibold italic">
                      {lexicon.noResults}
                    </div>
                  ) : (
                    activePickerResults.map((item, idx) => (
                      <button
                        key={`${item.state}-${item.city}-${item.postcode}-${idx}`}
                        type="button"
                        onClick={() => {
                          // Deterministic coordinate lookup based on selected building
                          let lat = item.latitude || 3.1390;
                          let lng = item.longitude || 101.6869;

                          if (!item.latitude || item.latitude === 3.1390) {
                            const str = item.name + (item.city || '');
                            if (str.toLowerCase().includes("pavilion")) { lat = 3.1488; lng = 101.7135; }
                            else if (str.toLowerCase().includes("klcc") || str.toLowerCase().includes("suria")) { lat = 3.1579; lng = 101.7116; }
                            else if (str.toLowerCase().includes("1 utama")) { lat = 3.1502; lng = 101.6152; }
                            else if (str.toLowerCase().includes("mid valley")) { lat = 3.1186; lng = 101.6761; }
                            else if (str.toLowerCase().includes("sunway pyramid")) { lat = 3.0731; lng = 101.6078; }
                            else if (str.toLowerCase().includes("kuchai") || str.toLowerCase().includes("baan thai")) { lat = 3.0906; lng = 101.6775; }
                            else {
                              // Deterministic hash coordinates offset around Kuala Lumpur center
                              let hash = 0;
                              for (let i = 0; i < str.length; i++) {
                                hash = str.charCodeAt(i) + ((hash << 5) - hash);
                              }
                              const latOffset = (Math.abs(hash) % 150) / 2500 - 0.03;
                              const lngOffset = (Math.abs(hash >> 3) % 150) / 2500 - 0.03;
                              lat = 3.1390 + latOffset;
                              lng = 101.6869 + lngOffset;
                            }
                          }

                          setLocationToConfirm({
                            name: item.name,
                            street: item.street || "",
                            city: item.city || '',
                            state: item.state || '',
                            postcode: item.postcode || '',
                            latitude: lat,
                            longitude: lng
                          });
                        }}
                        className={`w-full p-3.5 px-4 rounded-2xl text-left flex items-start gap-4 transition-all duration-150 cursor-pointer ${
                          darkMode 
                            ? 'active:bg-[#1C1C1E] hover:bg-zinc-950/80 text-white' 
                            : 'active:bg-zinc-200/60 hover:bg-zinc-100 text-zinc-900'
                        }`}
                      >
                        <div className={`w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                          darkMode 
                            ? 'bg-zinc-900 border-zinc-800/60 text-[#8e8e93]' 
                            : 'bg-zinc-100 border-zinc-200/80 text-zinc-500'
                        }`}>
                          <MapPin size={17} className="stroke-[2.5]" />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <p className={`text-[14.5px] font-bold truncate tracking-wide ${
                            darkMode ? 'text-zinc-100' : 'text-zinc-900'
                          }`}>
                            {mergeBuildingAndStreet(item.name, item.street)}
                          </p>
                          <p className={`text-[12.5px] font-medium truncate mt-0.5 ${
                            darkMode ? 'text-[#8e8e93]' : 'text-zinc-500'
                          }`}>
                            {item.city ? `${item.city}, ${item.state}` : item.state} {item.postcode ? `, ${item.postcode}` : ''}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>

              </div>
            )}

          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/50"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative max-w-sm w-full p-5 rounded-2xl shadow-xl z-20 text-center border ${
                darkMode ? 'bg-[#121415] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-slate-900'
              }`}
            >
              <h4 className="text-sm font-bold mb-1">{lexicon.deleteTitle}</h4>
              <p className={`text-xs mb-4 leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {lexicon.deleteConfirm}
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className={`py-2 px-3 rounded-lg font-bold text-xs border ${
                    darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                  }`}
                >
                  {lexicon.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAddress}
                  className="py-2 px-3 bg-red-600 hover:bg-red-700 font-bold text-xs text-white rounded-lg active:scale-95 transition-all"
                  id="confirm_delete_btn"
                >
                  {lexicon.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
