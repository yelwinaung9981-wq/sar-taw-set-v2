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

// Helper to merge building details and street addresses beautifully and without duplication
const mergeBuildingAndStreet = (building: string | undefined, street: string | undefined): string => {
  const b = (building || '').trim();
  const s = (street || '').trim();

  if (!b) return s;
  if (!s) return b;

  const isGeneric = (str: string) => {
    const lower = str.toLowerCase();
    return lower === 'selected location' || lower === 'ရွေးချယ်ထားသော တည်နေရာ' || lower === 'current location' || lower === 'လက်ရှိတည်နေရာ';
  };

  if (isGeneric(b)) return s;
  if (isGeneric(s)) return b;

  const bLower = b.toLowerCase();
  const sLower = s.toLowerCase();

  if (sLower.includes(bLower)) {
    return s;
  }
  if (bLower.includes(sLower)) {
    return b;
  }

  return `${b}, ${s}`;
};

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
    selectPostcode: "Select Postcode",
    placeholderName: "Enter recipient's name",
    placeholderPhone: "Enter phone number",
    placeholderAddress: "E.g. No. 12, Jalan SS21/37, Damansara Utama",
    placeholderCity: "E.g. Petaling Jaya",
    placeholderState: "E.g. Selangor",
    placeholderPostcode: "E.g. 47300"
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
    selectPostcode: "စာတိုက်ကုဒ်ကို ရွေးချယ်ပါ",
    placeholderName: "လိပ်စာလက်ခံမည့်သူအမည်",
    placeholderPhone: "ဖုန်းနံပါတ်ထည့်သွင်းပါ",
    placeholderAddress: "ဥပမာ - No. 12, Jalan SS21/37, Damansara Utama",
    placeholderCity: "ဥပမာ - Petaling Jaya သို့မဟုတ် Kuala Lumpur",
    placeholderState: "ဥပမာ - Selangor သို့မဟုတ် Wilayah Persekutuan",
    placeholderPostcode: "ဥပမာ - 47300"
  }
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



  // Form State Variables
  const [name, setName] = useState(userName || '');
  const [countryCode, setCountryCode] = useState(() => {
    let p = userPhone || '';
    if (p.startsWith('+60')) return '+60';
    if (p.startsWith('+95')) return '+95';
    if (p.startsWith('+65')) return '+65';
    if (p.startsWith('+66')) return '+66';
    return '+60';
  });
  const [phone, setPhone] = useState(() => {
    let p = userPhone || '';
    if (p.startsWith('+60')) return p.substring(3).trim();
    if (p.startsWith('+95')) return p.substring(3).trim();
    if (p.startsWith('+65')) return p.substring(3).trim();
    if (p.startsWith('+66')) return p.substring(3).trim();
    return p.trim();
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
        
        // Strip country prefix and select correct countryCode
        let ph = existing.phone || '';
        if (ph.startsWith('+60')) {
          setCountryCode('+60');
          ph = ph.replace('+60', '').replace(/\s+/g, '').replace(/^60/, '').trim();
        } else if (ph.startsWith('+95')) {
          setCountryCode('+95');
          ph = ph.replace('+95', '').replace(/\s+/g, '').replace(/^95/, '').trim();
        } else if (ph.startsWith('+65')) {
          setCountryCode('+65');
          ph = ph.replace('+65', '').replace(/\s+/g, '').replace(/^65/, '').trim();
        } else if (ph.startsWith('+66')) {
          setCountryCode('+66');
          ph = ph.replace('+66', '').replace(/\s+/g, '').replace(/^66/, '').trim();
        } else {
          setCountryCode('+60');
        }
        setPhone(ph);
      }
    }
  }, [editId, addresses]);



  // Validation Flags
  const isNameInvalid = triedSubmit && !name.trim();
  const isPhoneInvalid = triedSubmit && (!phone.trim() || phone.trim().length < 7 || phone.trim().length > 11);
  const isAddressInvalid = triedSubmit && (!chosenState || !chosenCity || !chosenPostcode);

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
        
        const stateInfo = resolved.state || "Selangor";
        const cityInfo = resolved.city || "Petaling Jaya";
        const postcodeInfo = resolved.postcode || "47300";
        
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
        
        toast.success(isMm ? "ရှာဖွေမှု အောင်မြင်ပါသည်" : "Location detected successfully!");
      } catch (err) {
        console.warn("Reverse-geocoding fallback failed:", err);
        setChosenState("WP Kuala Lumpur");
        setChosenCity("Kuala Lumpur");
        setChosenPostcode("50000");
        setDisplayAddress("Kuala Lumpur");
        setBuildingName("");
        setChosenLatitude(latitude);
        setChosenLongitude(longitude);
      } finally {
        setDetectingGps(false);
      }
    };

    navigator.geolocation.getCurrentPosition(
      onResolveSuccess,
      (err) => {
        console.warn("[GPS] First GPS accuracy attempt failed, retrying:", err);
        navigator.geolocation.getCurrentPosition(
          onResolveSuccess,
          (err2) => {
            setDetectingGps(false);
            if (err2.code === 1) {
              toast.error(isMm 
                ? "တည်နေရာခွင့်ပြုချက် (Location Permission) ပိတ်ထားပါသဖြင့် ကိုယ်တိုင်ရိုက်ထည့်ပါ။" 
                : "Location permission denied. Please allow map/GPS access or fill manually."
              );
            } else {
              toast.error(isMm
                ? "အချက်အလက် မရရှိပါသဖြင့် ကိုယ်တိုင်ရိုက်ထည့်ပေးပါ။"
                : "GPS access unavailable. Please search or fill manually."
              );
            }
          },
          { timeout: 8000, enableHighAccuracy: false }
        );
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTriedSubmit(true);

    if (!name.trim() || !phone.trim() || phone.trim().length < 7 || phone.trim().length > 11 || !chosenState || !chosenCity || !chosenPostcode) {
      toast.error(lexicon.mandatoryToast);
      return;
    }

    setIsSaving(true);

    const payload = {
      name: name.trim(),
      phone: `${countryCode} ${phone.trim()}`,
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
                placeholder={lexicon.placeholderName}
                className={`w-full h-full text-[13px] font-medium px-4 bg-transparent outline-none border-none placeholder-zinc-400 placeholder:italic placeholder:text-[13px] focus:ring-0 ${
                  darkMode ? 'text-white' : 'text-[#111111]'
                }`}
                id="recipient_name_input"
              />
            </div>
          </div>

          {/* Normalized Phone Input with Country code selection */}
          <div className="space-y-1">
            <label className={`text-xs font-bold ${darkMode ? 'text-zinc-500' : 'text-[#7D7D7D]'}`}>
              {lexicon.fieldPhone}
            </label>
            <div className={`w-full h-10 rounded-xl flex items-center overflow-hidden transition-all relative ${
              darkMode ? 'bg-[#181A1B]' : 'bg-[#F5F5F5]'
            } ${isPhoneInvalid ? 'border border-red-500' : ''}`}>
              
              <div className="relative shrink-0 h-full flex items-center pl-3.5 pr-2 gap-1">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className={`h-full bg-transparent outline-none text-[13px] font-bold tracking-tight appearance-none cursor-pointer pr-4 select-none focus:ring-0 ${
                    darkMode ? 'text-zinc-300' : 'text-[#555555]'
                  }`}
                  style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                >
                  <option value="+60" className={darkMode ? 'bg-[#0B0D0E] text-white' : 'bg-white text-black'}>MY +60</option>
                  <option value="+95" className={darkMode ? 'bg-[#0B0D0E] text-white' : 'bg-white text-black'}>MM +95</option>
                  <option value="+65" className={darkMode ? 'bg-[#0B0D0E] text-white' : 'bg-white text-black'}>SG +65</option>
                  <option value="+66" className={darkMode ? 'bg-[#0B0D0E] text-white' : 'bg-white text-black'}>TH +66</option>
                </select>
                <ChevronDown size={11} className="text-zinc-500 shrink-0 absolute right-2 pointer-events-none" />
              </div>

              {/* Vertical Divider */}
              <div className={`h-4 w-[1px] shrink-0 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

              <input 
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder={lexicon.placeholderPhone}
                className={`w-full h-full text-[13px] font-medium px-3 bg-transparent outline-none border-none placeholder-zinc-400 placeholder:italic placeholder:text-[13px] focus:ring-0 ${
                  darkMode ? 'text-white' : 'text-[#111111]'
                }`}
                id="phone_number_input"
              />
            </div>
          </div>

          {/* Address Line 1 */}
          <div className="space-y-1 pt-2 animate-fadeIn">
            <label className={`text-xs font-bold ${darkMode ? 'text-zinc-500' : 'text-[#7D7D7D]'}`}>
              {lexicon.fieldAddress}
            </label>
            <div className={`w-full h-10 rounded-xl overflow-hidden transition-all ${
              darkMode ? 'bg-[#181A1B]' : 'bg-[#F5F5F5]'
            } ${isAddressInvalid && !displayAddress.trim() ? 'border border-red-500' : ''}`}>
              <input 
                type="text"
                value={displayAddress}
                onChange={(e) => setDisplayAddress(e.target.value)}
                placeholder={lexicon.placeholderAddress}
                className={`w-full h-full text-[13px] font-medium px-4 bg-transparent outline-none border-none placeholder-zinc-400 placeholder:italic placeholder:text-[13px] focus:ring-0 ${
                  darkMode ? 'text-white' : 'text-[#111111]'
                }`}
              />
            </div>
          </div>

          {/* City */}
          <div className="space-y-1">
            <label className={`text-xs font-bold ${darkMode ? 'text-zinc-500' : 'text-[#7D7D7D]'}`}>
              {isMm ? "မြို့နယ် / မြို့" : "City"}
            </label>
            <div className={`w-full h-10 rounded-xl overflow-hidden transition-all ${
              darkMode ? 'bg-[#181A1B]' : 'bg-[#F5F5F5]'
            } ${isAddressInvalid && !chosenCity.trim() ? 'border border-red-500' : ''}`}>
              <input 
                type="text"
                value={chosenCity}
                onChange={(e) => setChosenCity(e.target.value)}
                placeholder={lexicon.placeholderCity}
                className={`w-full h-full text-[13px] font-medium px-4 bg-transparent outline-none border-none placeholder-zinc-400 placeholder:italic placeholder:text-[13px] focus:ring-0 ${
                  darkMode ? 'text-white' : 'text-[#111111]'
                }`}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
              {/* State Input */}
              <div className="space-y-1">
                <label className={`text-xs font-bold ${darkMode ? 'text-zinc-500' : 'text-[#7D7D7D]'}`}>
                  {isMm ? "ပြည်နယ် / တိုင်း" : "State"}
                </label>
                <div className={`w-full h-10 rounded-xl overflow-hidden transition-all ${
                  darkMode ? 'bg-[#181A1B]' : 'bg-[#F5F5F5]'
                } ${isAddressInvalid && !chosenState.trim() ? 'border border-red-500' : ''}`}>
                  <input 
                    type="text"
                    value={chosenState}
                    onChange={(e) => setChosenState(e.target.value)}
                    placeholder={lexicon.placeholderState}
                    className={`w-full h-full text-[13px] font-medium px-4 bg-transparent outline-none border-none placeholder-zinc-400 placeholder:italic placeholder:text-[13px] focus:ring-0 ${
                      darkMode ? 'text-white' : 'text-[#111111]'
                    }`}
                  />
                </div>
              </div>

              {/* Postcode Input */}
              <div className="space-y-1">
                <label className={`text-xs font-bold ${darkMode ? 'text-zinc-500' : 'text-[#7D7D7D]'}`}>
                  {isMm ? "စာပို့သင်္ကေတ" : "Postcode"}
                </label>
                <div className={`w-full h-10 rounded-xl overflow-hidden transition-all ${
                  darkMode ? 'bg-[#181A1B]' : 'bg-[#F5F5F5]'
                } ${isAddressInvalid && !chosenPostcode.trim() ? 'border border-red-500' : ''}`}>
                  <input 
                    type="text"
                    value={chosenPostcode}
                    onChange={(e) => setChosenPostcode(e.target.value.replace(/\D/g, ''))}
                    placeholder={lexicon.placeholderPostcode}
                    maxLength={10}
                    className={`w-full h-full text-[13px] font-medium px-4 bg-transparent outline-none border-none placeholder-zinc-400 placeholder:italic placeholder:text-[13px] focus:ring-0 ${
                      darkMode ? 'text-white' : 'text-[#111111]'
                    }`}
                  />
                </div>
              </div>
          </div>

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
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
            className="w-full bg-[#529960] hover:bg-[#438350] disabled:opacity-50 text-white py-2.5 px-4 rounded-xl font-bold text-xs tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.985]"
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
                    darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-650'
                  }`}
                >
                  {lexicon.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAddress}
                  className="py-2 px-3 bg-red-650 hover:bg-red-750 font-bold text-xs text-white rounded-lg active:scale-95 transition-all"
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
