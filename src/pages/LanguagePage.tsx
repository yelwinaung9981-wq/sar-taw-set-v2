import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../context/StoreContext';

export default function LanguagePage() {
  const navigate = useNavigate();
  const { darkMode, t, language, setLanguage } = useStore();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ms', name: 'Malay', flag: '🇲🇾' },
    { code: 'th', name: 'Thai', flag: '🇹🇭' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'my', name: 'Myanmar', flag: '🇲🇲' },
  ];

  return (
    <div className={`min-h-screen pb-24 font-sans selection:bg-primary/20 transition-colors duration-300 ${darkMode ? 'bg-surface text-on-surface' : 'bg-[#F8FAFC] text-slate-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b px-4 h-[72px] flex items-center justify-between transition-colors duration-300 ${darkMode ? 'bg-surface/80 border-white/5' : 'bg-white/80 border-slate-200/50'}`}>
        <button
          onClick={() => navigate(-1)}
          className={`relative z-10 -ml-2 p-2 rounded-full flex items-center justify-center transition-all active:scale-90 ${darkMode ? 'hover:bg-white/5 text-on-surface' : 'hover:bg-black/5 text-slate-600'}`}
        >
          <ChevronLeft size={24} className="stroke-[2.5]" />
        </button>
        <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
          <h2 className={`text-lg font-black tracking-tight leading-tight ${darkMode ? 'text-on-surface' : 'text-slate-900'}`}>{t('language')}</h2>
          <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-on-surface-variant/60' : 'text-slate-400'}`}>{t('selectPreference')}</p>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="p-4 space-y-4 mt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 gap-3"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                // Optionally navigate back after language selection
                // navigate(-1);
              }}
              className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                language === lang.code 
                  ? `${darkMode ? 'border-primary bg-primary/10' : 'border-primary bg-primary/5'}` 
                  : `${darkMode ? 'border-surface-container-high bg-surface-container-low/30 hover:border-surface-container-highest' : 'border-slate-200/60 bg-white hover:border-slate-300'}`
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{lang.flag}</span>
                <span className={`text-sm font-bold ${language === lang.code ? 'text-primary' : (darkMode ? 'text-on-surface' : 'text-slate-900')}`}>
                  {lang.name}
                </span>
              </div>
              {language === lang.code && (
                <CheckCircle2 size={18} className="text-primary" />
              )}
            </button>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
