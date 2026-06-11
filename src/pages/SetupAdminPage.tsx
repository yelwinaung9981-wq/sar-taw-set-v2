import React, { useState } from 'react';
import { createUserWithEmailAndPassword, db } from '../lib/firebase';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, ArrowLeft, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SetupAdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Also add to admins collection for rules enforcement (though hardcoded email works too)
      await setDoc(doc(db, 'admins', user.uid), {
        email: email.toLowerCase(),
        name: name || 'Admin User',
        role: 'superadmin',
        uid: user.uid,
        createdAt: serverTimestamp()
      });

      toast.success('Admin account created successfully!');
      navigate('/admin-login');
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      toast.error('Failed to create account: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-emerald-100/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-100/30 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 z-10"
      >
        <div className="flex items-center gap-3 mb-8">
          <button 
            onClick={() => navigate('/admin-login')}
            className="p-2 rounded-full hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
            <ShieldAlert size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none">Setup Root Admin</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Initial configuration</p>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-rose-50 border border-rose-100 p-4 rounded-2xl mb-6 flex items-start gap-3"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
              <p className="text-xs font-bold text-rose-600 line-clamp-2">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Full Name</label>
            <div className="relative group">
              <input 
                type="text" 
                placeholder="Mg Mg" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full bg-slate-50 py-4 px-5 rounded-2xl border-2 border-transparent focus:border-emerald-500/20 focus:bg-white transition-all outline-none font-bold text-sm" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Internal Email</label>
            <div className="relative group">
              <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="email" 
                placeholder="admin@example.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full bg-slate-50 py-4 pl-14 pr-5 rounded-2xl border-2 border-transparent focus:border-emerald-500/20 focus:bg-white transition-all outline-none font-bold text-sm" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Secure Password</label>
            <div className="relative group">
              <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full bg-slate-50 py-4 pl-14 pr-5 rounded-2xl border-2 border-transparent focus:border-emerald-500/20 focus:bg-white transition-all outline-none font-bold text-sm" 
                required 
                minLength={6}
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Authorize Root Admin
                </>
              )}
            </button>
          </div>
        </form>

        <p className="mt-8 text-[9px] font-bold text-center text-slate-400 uppercase tracking-widest leading-relaxed italic">
          This account will have full access to database clusters.<br/>
          Ensure credentials follow security protocols.
        </p>
      </motion.div>
    </div>
  );
}
