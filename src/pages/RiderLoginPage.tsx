import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmailAndPassword } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { useStore } from '../context/StoreContext';

export default function RiderLoginPage() {
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { settings } = useStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      navigate('/delivery');
    } catch (err: any) {
      console.error('Login error:', err);
      setError('အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်။ (Invalid Email/Password)');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Abstract Background Decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[840px] z-10 flex flex-col items-center"
      >
        <div className="w-full bg-white/70 backdrop-blur-3xl rounded-[2rem] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] border border-white overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
          
          {/* Logo/Branding Side (Left) */}
          <div className="md:w-5/12 bg-slate-900 p-6 md:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shrink-0 border-r border-white/5">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
               <div className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] bg-white rounded-full blur-[80px]" />
            </div>

            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-16 h-16 md:w-24 md:h-24 transition-all z-10 shrink-0 flex items-center justify-center p-2"
            >
              {settings?.logoUrlDark ? (
                <img 
                  src={settings.logoUrlDark} 
                  alt="Rider Logo" 
                  className="w-full h-full object-contain rounded-xl" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-white/5 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/10">
                  <Truck size={48} className="text-blue-500" />
                </div>
              )}
            </motion.div>

            <div className="z-10 mt-4">
              <h1 className="text-xl md:text-2xl font-black text-white mb-1 tracking-tight">Rider Portal</h1>
              <div className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-slate-400 font-bold text-[8px] uppercase tracking-[0.3em]">Logistics Managed</p>
              </div>
            </div>

            <button 
              onClick={() => navigate('/')}
              className="mt-6 md:mt-8 text-[9px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-[0.2em] z-10"
            >
              ← Back to Store
            </button>
          </div>

          {/* Form Side (Right) */}
          <div className="md:w-7/12 p-6 sm:p-8 flex flex-col justify-center overflow-y-auto bg-white">
              <div className="mb-6 md:mb-8 text-center md:text-left">
                <h2 className="text-lg md:text-xl font-black text-slate-900 mb-1">Carrier Authentication</h2>
                <p className="text-slate-500 font-bold text-[9px] uppercase tracking-widest leading-relaxed">
                  သတ်မှတ်ထားသော အီးမေးလ်နှင့် စကားဝှက်ကို သုံးပါ
                </p>
              </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full overflow-hidden mb-4"
                >
                  <div className="bg-red-50 border border-red-100 p-2 md:p-3 rounded-lg flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    <p className="text-[9px] md:text-[10px] font-bold text-red-600 line-clamp-2">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} className="w-full space-y-3">
              <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-blue-500 transition-colors flex items-center justify-center">
                    <Mail size={16} strokeWidth={2.5} />
                  </div>
                  <input 
                    className="w-full bg-slate-100/50 hover:bg-slate-100 focus:bg-white py-3 md:py-3.5 pl-11 pr-4 rounded-xl border border-slate-200 focus:border-blue-500/20 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 text-sm" 
                    type="email" 
                    placeholder="Courier Email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    required 
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-blue-500 transition-colors flex items-center justify-center">
                    <Lock size={16} strokeWidth={2.5} />
                  </div>
                  <input 
                    className="w-full bg-slate-100/50 hover:bg-slate-100 focus:bg-white py-3 md:py-3.5 pl-11 pr-12 rounded-xl border border-slate-200 focus:border-blue-500/20 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 text-sm" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Rider Password" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3.5 md:py-4 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Go Online Now
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <p className="mt-4 md:mt-6 text-center text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] leading-relaxed">
          Logistics System v2.4.0<br/>
          © {new Date().getFullYear()} Royal Logistics Management
        </p>
      </motion.div>
    </div>
  );
}
