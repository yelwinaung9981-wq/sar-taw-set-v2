import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Mail, Lock, Eye, EyeOff, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmailAndPassword } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { useStore } from '../context/StoreContext';

export default function AdminLoginPage() {
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { t, isAdmin, isAuthLoading, settings } = useStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const signInWithRetry = async (retries = 3): Promise<any> => {
      try {
        return await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } catch (err: any) {
        if (err.code === 'auth/network-request-failed' && retries > 0) {
          console.warn(`Sign-in failed (network error). Retrying in 1s... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return signInWithRetry(retries - 1);
        }
        throw err;
      }
    };

    try {
      await signInWithRetry();
      localStorage.setItem('isAdmin', 'true');
      navigate('/admin'); // Manual redirect after successful login
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/network-request-failed') {
        const isInIframe = window.self !== window.top;
        if (isInIframe) {
          setError('ကွန်ရက်ချိတ်ဆက်မှု ပြတ်တောက်နေပါသည် (Network Error)။ Browser ၏ Privacy settings (သို့မဟုတ်) Ad-blocker ကြောင့် Iframe ထဲတွင် ဝင်၍မရခြင်း ဖြစ်နိုင်ပါသည်။ အပေါ်ညာဘက်ရှိ "Open in new window" (မြှားပုံလေး) ကိုနှိပ်၍ သီးသန့် Tab ဖြင့်ဖွင့်ပြီး ထပ်မံကြိုးစားကြည့်ပါ။');
        } else {
          setError('ကွန်ရက်ချိတ်ဆက်မှု ပြတ်တောက်နေပါသည် (Network Request Failed)။ အင်တာနက်လိုင်းကို စစ်ဆေးပြီး သို့မဟုတ် Ad-blocker များကို ခေတ္တပိတ်၍ ထပ်မံကြိုးစားကြည့်ပါ။');
        }
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်။ (Invalid Email/Password)');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Abstract Background Decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none" />

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

            <div className="z-10 text-center">
              <h1 className="text-2xl md:text-3xl font-black text-white mb-1 tracking-tight">စားတော်ဆက်</h1>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.3em] mt-3">Sar Taw Set ( Royal Caterer )</p>
              
              <div className="mt-10">
                <h2 className="text-sm md:text-base font-black text-white mb-1 tracking-tight opacity-50 uppercase">Admin</h2>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-slate-500 font-bold text-[8px] uppercase tracking-[0.4em]">Admin Restricted Access</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Side (Right) */}
          <div className="md:w-7/12 p-6 sm:p-8 flex flex-col justify-center overflow-y-auto bg-white">
              <div className="mb-6 md:mb-8 text-center md:text-left">
                <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-slate-900">Internal Authentication</h2>
                <p className="text-[11px] md:text-xs font-normal tracking-wide text-slate-400 mt-1.5 leading-relaxed">
                  အီးမေးလ်နှင့် စကားဝှက်ကို မှန်ကန်စွာ ဖြည့်သွင်းပါ
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
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-emerald-500 transition-colors flex items-center justify-center">
                    <Mail size={16} strokeWidth={2.5} />
                  </div>
                  <input 
                    className="w-full bg-slate-100/50 hover:bg-slate-100 focus:bg-white py-2 md:py-2.5 pl-11 pr-4 rounded-xl border border-slate-200 focus:border-emerald-500/20 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 placeholder:italic placeholder:text-[12px] text-sm" 
                    type="email" 
                    placeholder="Authorized Email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    required 
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-emerald-500 transition-colors flex items-center justify-center">
                    <Lock size={16} strokeWidth={2.5} />
                  </div>
                  <input 
                    className="w-full bg-slate-100/50 hover:bg-slate-100 focus:bg-white py-2 md:py-2.5 pl-11 pr-12 rounded-xl border border-slate-200 focus:border-emerald-500/20 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 placeholder:italic placeholder:text-[12px] text-sm" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Admin Password" 
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

              {/* Elegant Subtle Separator */}
              <div className="relative py-2.5">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-[8px] tracking-[0.3em] font-bold text-slate-300">
                    Secure Entry
                  </span>
                </div>
              </div>

              <div className="flex justify-center pt-1">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full max-w-[220px] bg-emerald-600 text-white py-2.5 md:py-3 px-4 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/15 hover:bg-emerald-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In Access
                      <ArrowRight size={12} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <p className="mt-4 md:mt-6 text-center text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] leading-relaxed">
          Powered by Sar Taw Set Infrastructure v3.1<br/>
          © {new Date().getFullYear()} Royal Asset Management
        </p>
      </motion.div>
    </div>

  );
}

