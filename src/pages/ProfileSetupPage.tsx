import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Camera, ChevronLeft, User, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadProfileImage } from '../services/uploadService';
import { toast } from 'sonner';

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { darkMode, userAvatar, setUserAvatar, updateUserProfile, t, userName, userPhone } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tempAvatar, setTempAvatar] = useState(userAvatar);
  
  // If the user lands here but isn't logged in, redirect
  useEffect(() => {
    if (!userName || !userPhone) {
      navigate('/', { replace: true });
    }
  }, [userName, userPhone, navigate]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const url = await uploadProfileImage(file, (progress) => {
          setUploadProgress(Math.round(progress));
        });
        setTempAvatar(url);
        toast.success(t('photoUploaded') || 'Photo uploaded! You look great.');
      } catch (err: any) {
        console.error("Profile image upload failed:", err);
        toast.error(err.message || 'Failed to upload photo');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSaveAndContinue = () => {
    if (tempAvatar) {
      updateUserProfile({ avatar: tempAvatar });
    }
    navigate('/menu', { replace: true });
  };

  const handleSkip = () => {
    navigate('/menu', { replace: true });
  };

  return (
    <div className={`min-h-[100dvh] flex flex-col items-center bg-background text-on-background font-sans ${darkMode ? 'bg-surface text-on-surface' : 'bg-[#F8FAFC] text-slate-900'}`}>
      
      {/* TopAppBar */}
      <header className={`w-full sticky top-0 z-50 flex items-center justify-between px-4 h-[72px] transition-colors border-b backdrop-blur-xl ${darkMode ? 'bg-surface/80 border-white/5' : 'bg-white/80 border-slate-200/50'}`}>
        <button 
          onClick={handleSkip}
          className={`relative z-10 -ml-2 p-2 rounded-full transition-all active:scale-90 ${darkMode ? 'hover:bg-white/5 text-on-surface' : 'hover:bg-black/5 text-slate-600'}`}
        >
          <ChevronLeft size={24} className="stroke-[2.5]" />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className={`text-lg font-black tracking-tight ${darkMode ? 'text-on-surface' : 'text-slate-900'}`}>{t('profileSetup') || 'Profile Setup'}</h1>
        </div>
        <div className="w-10"></div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center w-full max-w-md px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Profile Photo Section */}
        <div 
          className="relative group cursor-pointer mb-8" 
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          {/* Photo Container */}
          <div className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden shadow-sm flex items-center justify-center border-4 transition-transform duration-300 ${darkMode ? 'bg-surface-container-highest border-on-surface/10 group-hover:scale-105' : 'bg-slate-200/50 border-white group-hover:scale-105'}`}>
            <AnimatePresence mode="wait">
              {isUploading ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center space-y-2"
                >
                  <Loader2 size={32} className={`animate-spin text-primary`} />
                  <span className={`text-[10px] font-black tracking-widest text-primary`}>{uploadProgress}%</span>
                </motion.div>
              ) : tempAvatar ? (
                <motion.img 
                  key={tempAvatar}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={tempAvatar} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <User size={48} className={darkMode ? 'text-on-surface/20' : 'text-slate-400'} />
              )}
            </AnimatePresence>
          </div>

          {/* Camera Badge */}
          {!isUploading && (
            <div className={`absolute bottom-0 right-0 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg border-2 group-hover:rotate-12 transition-transform duration-300 bg-primary border-white dark:border-surface`}>
              <Camera size={18} />
            </div>
          )}

          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImageChange}
          />
        </div>

        {/* Text Guidance */}
        <div className="text-center space-y-2">
          <h2 className={`text-xl font-black tracking-tight ${darkMode ? 'text-on-surface' : 'text-slate-900'}`}>Add Profile Photo</h2>
          <p className={`text-xs max-w-[260px] mx-auto font-medium leading-relaxed ${darkMode ? 'text-on-surface-variant/60' : 'text-slate-500'}`}>
            By adding a profile photo, our delivery personnel can identify you more easily.
          </p>
        </div>
      </main>

      {/* Fixed Bottom Actions */}
      <footer className="w-full max-w-md px-4 pb-8 space-y-3 flex flex-col items-center">
        <button 
          onClick={handleSaveAndContinue}
          disabled={isUploading || !tempAvatar}
          className={`w-full h-12 rounded-full font-black text-xs uppercase tracking-widest shadow-lg transition-all duration-200 ${
            !tempAvatar || isUploading
              ? 'opacity-50 cursor-not-allowed bg-primary text-white'
              : 'hover:brightness-110 active:scale-95 bg-primary text-white shadow-primary/30'
          }`}
        >
          {isUploading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Save and Continue'}
        </button>
        
        <button 
          onClick={handleSkip}
          className={`font-black text-xs uppercase tracking-widest px-6 py-3 rounded-full transition-colors ${darkMode ? 'text-primary hover:bg-white/5' : 'text-primary hover:bg-black/5'}`}
        >
          Skip for now
        </button>
      </footer>
    </div>
  );
}
