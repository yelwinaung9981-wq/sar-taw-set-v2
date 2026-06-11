import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { 
  ChevronLeft, User, Phone, Save, CheckCircle2, Camera, 
  Shield, Mail, Calendar, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadProfileImage } from '../services/uploadService';
import { toast } from 'sonner';

export default function EditProfilePage() {
  const { 
    userName, userPhone, roomNumber, userAvatar, 
    userEmail, userBirthday, updateUserProfile,
    t, darkMode
  } = useStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tempProfile, setTempProfile] = useState({
    name: userName,
    phone: userPhone,
    room: roomNumber,
    avatar: userAvatar,
    email: userEmail,
    birthday: userBirthday
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress with 0.7 quality to stay well under 1MB
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const url = await uploadProfileImage(file, (progress) => {
          setUploadProgress(Math.round(progress));
        });
        setTempProfile(prev => ({ ...prev, avatar: url }));
        toast.success(t('photoUploaded') || 'Photo uploaded successfully!');
      } catch (err: any) {
        console.error("Profile image upload failed:", err);
        toast.error(err.message || 'Failed to upload photo');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSave = () => {
    if (!tempProfile.name.trim()) return;
    
    setIsSaving(true);
    
    // Optimistic update: updateUserProfile updates local state immediately
    // and handles Firestore update in the background
    updateUserProfile({
      name: tempProfile.name,
      phone: tempProfile.phone,
      room: tempProfile.room,
      avatar: tempProfile.avatar,
      email: tempProfile.email,
      birthday: tempProfile.birthday
    });
    
    // Snappy feedback loop
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/profile');
      }, 600);
    }, 400);
  };

  return (
    <div className={`min-h-screen pb-12 overflow-x-hidden selection:bg-primary/10 ${darkMode ? 'bg-surface text-on-surface' : 'bg-surface text-on-surface'}`}>
      {/* Premium Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-50 ${darkMode ? 'bg-primary/10' : 'bg-primary/5'}`} />
        <div className={`absolute top-1/2 -left-24 w-72 h-72 rounded-full blur-3xl opacity-50 ${darkMode ? 'bg-emerald-500/10' : 'bg-emerald-500/5'}`} />
      </div>

      {/* Header */}
      <header className={`fixed top-0 w-full z-50 backdrop-blur-xl px-4 h-[72px] flex items-center justify-between border-b border-on-surface/5 ${darkMode ? 'bg-surface/80' : 'bg-surface/80'}`}>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/profile')}
          className={`relative z-10 -ml-2 p-2 flex items-center justify-center rounded-full transition-all text-on-surface-variant ${darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
        >
          <ChevronLeft size={24} className="stroke-[2.5]" />
        </motion.button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h2 className="text-base font-black tracking-tight text-on-surface">{t('editProfile')}</h2>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving || !tempProfile.name.trim()}
          className="text-primary font-black text-xs uppercase tracking-widest disabled:opacity-30"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : t('save')}
        </button>
      </header>

      <main className="pt-24 px-4 space-y-6 max-w-lg mx-auto relative z-10">
        {/* Success Overlay */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
                <CheckCircle2 size={20} />
                <span className="text-xs font-black uppercase tracking-widest">{t('profileUpdated')}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Avatar Section - More Compact */}
        <section className="flex flex-col items-center justify-center space-y-3">
          <div className="relative group">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="relative w-24 h-24 bg-surface-container-low rounded-xl flex items-center justify-center shadow-xl border border-on-surface/5 overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {isUploading ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center space-y-1"
                  >
                    <Loader2 size={24} className="text-primary animate-spin" />
                    <span className="text-[9px] font-black text-primary">{uploadProgress}%</span>
                  </motion.div>
                ) : tempProfile.avatar ? (
                  <motion.img 
                    key={tempProfile.avatar}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={tempProfile.avatar} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <User size={40} className="text-primary/20" />
                )}
              </AnimatePresence>
              
              <label 
                htmlFor="profile-image-input"
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center cursor-pointer backdrop-blur-[1px]"
              >
                <Camera size={20} className="text-white" />
              </label>
            </motion.div>

            <label 
              htmlFor="profile-image-input" 
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center shadow-lg border-2 border-surface cursor-pointer transform hover:scale-105 active:scale-95 transition-transform"
            >
              <Camera size={13} className="stroke-[2.5]" />
            </label>
          </div>
          <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">{t('changePhoto')}</p>
          
          <input 
            id="profile-image-input"
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImageChange}
          />
        </section>

        {/* Form Section - Grouped and Compact */}
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest px-2">{t('personalInfo')}</p>
            
            {/* Name Input */}
            <div className={`p-4 rounded-xl border transition-all ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
              <label className="text-[8px] font-black text-primary uppercase tracking-widest flex items-center gap-2 mb-1">
                <User size={10} />
                {t('fullName')}
              </label>
              <input 
                className="w-full bg-transparent text-sm font-bold text-on-surface placeholder:text-on-surface-variant/20 outline-none" 
                placeholder={t('enterFullName')} 
                type="text"
                value={tempProfile.name}
                onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
              />
            </div>

            {/* Email Input - New Feature */}
            <div className={`p-4 rounded-xl border transition-all ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
              <label className="text-[8px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                <Mail size={10} />
                {t('emailAddress')}
              </label>
              <input 
                className="w-full bg-transparent text-sm font-bold text-on-surface placeholder:text-on-surface-variant/20 outline-none" 
                placeholder={t('emailPlaceholder')} 
                type="email"
                value={tempProfile.email}
                onChange={(e) => setTempProfile({ ...tempProfile, email: e.target.value })}
              />
            </div>

            {/* Phone Input */}
            <div className={`p-4 rounded-xl border transition-all ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
              <label className="text-[8px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                <Phone size={10} />
                {t('phoneNumber')}
              </label>
              <input 
                className="w-full bg-transparent text-sm font-bold text-on-surface placeholder:text-on-surface-variant/20 outline-none" 
                placeholder={t('phonePlaceholder')} 
                type="tel"
                value={tempProfile.phone}
                onChange={(e) => setTempProfile({ ...tempProfile, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest px-2">{t('additionalDetails')}</p>
            
            {/* Birthday Input - New Feature */}
            <div className={`p-4 rounded-xl border transition-all ${darkMode ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
              <label className="text-[8px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                <Calendar size={10} />
                {t('birthday')}
              </label>
              <input 
                className="w-full bg-transparent text-sm font-bold text-on-surface placeholder:text-on-surface-variant/20 outline-none" 
                type="date"
                value={tempProfile.birthday}
                onChange={(e) => setTempProfile({ ...tempProfile, birthday: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Save Button - Streamlined */}
        <div className="pt-4">
          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={isSaving || !tempProfile.name.trim()}
            className={`w-full py-4 bg-primary text-white rounded-xl font-black text-xs shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 ${isSaving || !tempProfile.name.trim() ? 'opacity-50' : ''}`}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span className="uppercase tracking-widest">{isSaving ? t('saving') : t('saveChanges')}</span>
          </motion.button>
          
          <div className="flex items-center justify-center gap-2 mt-6 opacity-20">
            <Shield size={10} />
            <span className="text-[8px] font-black uppercase tracking-widest">{t('dataSecurelyStored')}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
