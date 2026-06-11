import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  User, 
  Phone, 
  Bike, 
  Truck, 
  Footprints, 
  Camera,
  Save,
  ShieldCheck,
  AlertCircle,
  Hash
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { toast } from 'sonner';

export default function RiderProfilePage() {
  const { riderInfo, updateRiderProfile, darkMode, authUid } = useStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: riderInfo?.name || '',
    phone: riderInfo?.phone || '',
    vehicleType: riderInfo?.vehicleType || 'Motorbike',
    vehiclePlate: riderInfo?.vehiclePlate || '',
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (riderInfo) {
      setFormData({
        name: riderInfo.name || '',
        phone: riderInfo.phone || '',
        vehicleType: riderInfo.vehicleType || 'Motorbike',
        vehiclePlate: riderInfo.vehiclePlate || '',
      });
    }
  }, [riderInfo]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Name and Phone are required');
      return;
    }

    setIsSaving(true);
    try {
      await updateRiderProfile(formData);
      // Optional: Navigation back or stay
    } catch (error) {
      // Error handled in store
    } finally {
      setIsSaving(false);
    }
  };

  const vehicleTypes = [
    { id: 'Motorbike', icon: Bike, label: 'Motorbike' },
    { id: 'Bike', icon: Bike, label: 'Bicycle' },
    { id: 'Car', icon: Truck, label: 'Car' },
    { id: 'Walk', icon: Footprints, label: 'On Foot' },
  ];

  if (!authUid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-black opacity-40">Authenticating...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 ${darkMode ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 px-4 py-6 border-b backdrop-blur-xl flex items-center justify-between ${darkMode ? 'bg-black/80 border-white/10' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
        <button 
          onClick={() => navigate(-1)}
          className={`relative z-10 -ml-2 p-2 rounded-full flex items-center justify-center transition-all active:scale-95 text-on-surface-variant ${darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
        >
          <ChevronLeft size={24} className="stroke-[2.5]" />
        </button>
        <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
          <h1 className="text-xl font-black tracking-tighter">Delivery Account</h1>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Manage your identity & vehicle</p>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        {/* Profile Punch Card */}
        <section className={`mb-8 p-6 rounded-[2.5rem] border relative overflow-hidden ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xl'}`}>
           <div className="flex items-center gap-5 relative z-10">
              <div className="relative group">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center overflow-hidden ${darkMode ? 'bg-white/10' : 'bg-slate-100 shadow-inner'}`}>
                  {riderInfo?.photoUrl ? (
                    <img src={riderInfo.photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={32} className="opacity-30" />
                  )}
                </div>
                <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg border-4 border-white dark:border-black active:scale-95 transition-all">
                  <Camera size={14} />
                </button>
              </div>
              <div>
                 <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-black tracking-tight">{riderInfo?.name || 'Rider Name'}</h2>
                    <ShieldCheck size={16} className="text-emerald-500" />
                 </div>
                 <p className="text-xs font-bold opacity-60 mb-2">{riderInfo?.email}</p>
                 <div className="flex items-center gap-1.5">
                    <div className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase tracking-widest border border-blue-500/20">
                      ID: {authUid.slice(-6).toUpperCase()}
                    </div>
                    <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                      riderInfo?.isOnline 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                        : 'bg-slate-500/10 border-slate-500/20 text-slate-500'
                    }`}>
                      {riderInfo?.isOnline ? 'Online' : 'Offline'}
                    </div>
                 </div>
              </div>
           </div>

           {/* Decorative Background Glow */}
           <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none"></div>
        </section>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <label className="block px-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Full Legal Name</span>
              <div className={`mt-1.5 flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all ${
                darkMode ? 'bg-white/5 border-white/10 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10' : 'bg-white border-slate-200 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5'
              }`}>
                <User size={18} className="opacity-30" />
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                  className="bg-transparent border-none outline-none w-full text-sm font-bold placeholder:opacity-30"
                />
              </div>
            </label>

            <label className="block px-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Contact Phone</span>
              <div className={`mt-1.5 flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all ${
                darkMode ? 'bg-white/5 border-white/10 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10' : 'bg-white border-slate-200 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5'
              }`}>
                <Phone size={18} className="opacity-30" />
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+95 9..."
                  className="bg-transparent border-none outline-none w-full text-sm font-bold placeholder:opacity-30"
                />
              </div>
            </label>
          </div>

          {/* Vehicle Setup */}
          <div className="space-y-4">
            <h3 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Transport Method</h3>
            <div className="grid grid-cols-2 gap-3">
              {vehicleTypes.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, vehicleType: v.id })}
                  className={`p-4 rounded-3xl border flex flex-col items-center gap-3 transition-all active:scale-[0.97] ${
                    formData.vehicleType === v.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20'
                      : (darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 hover:shadow-md')
                  }`}
                >
                  <v.icon size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{v.label}</span>
                </button>
              ))}
            </div>

            {formData.vehicleType !== 'Walk' && (
              <label className="block px-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">License Plate Number</span>
                <div className={`mt-1.5 flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all ${
                  darkMode ? 'bg-white/5 border-white/10 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10' : 'bg-white border-slate-200 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5'
                }`}>
                  <Hash size={18} className="opacity-30" />
                  <input 
                    type="text" 
                    value={formData.vehiclePlate}
                    onChange={e => setFormData({ ...formData, vehiclePlate: e.target.value })}
                    placeholder="ABC-1234"
                    className="bg-transparent border-none outline-none w-full text-sm font-bold placeholder:opacity-30 uppercase"
                  />
                </div>
              </label>
            )}
          </div>

          <div className={`p-4 rounded-3xl border-2 border-dashed flex gap-3 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-blue-50 border-blue-100'}`}>
            <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold leading-relaxed opacity-60 italic">
              Keep your profile updated so customers can identify you during delivery drop-offs.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className={`w-full py-5 rounded-3xl bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100`}
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </form>

        <div className="mt-12 pt-12 border-t border-dashed border-white/10">
          <button className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-500/5'}`}>
             <ShieldCheck size={16} />
             Identity Verification Status
          </button>
        </div>
      </main>
    </div>
  );
}
