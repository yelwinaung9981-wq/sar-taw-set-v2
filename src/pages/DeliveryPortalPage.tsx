import React, { useState, useMemo } from 'react';
import { useStore, Order } from '../context/StoreContext';
import { 
  Package, 
  MapPin, 
  Phone, 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  Search,
  Navigation,
  CheckCircle2,
  AlertCircle,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { onSnapshot, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function DeliveryPortalPage() {
  const { 
    adminOrders, 
    updateDeliveryStatus, 
    darkMode, 
    formatPrice, 
    t, 
    authUid, 
    setIsDeliveryPortalActive, 
    settings, 
    riderInfo,
    fetchOrderHistory 
  } = useStore();
  const navigate = useNavigate();

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  React.useEffect(() => {
    setIsDeliveryPortalActive(true);
    const interval = setInterval(() => setLastUpdated(new Date()), 30000); // Pulse every 30s
    return () => {
      setIsDeliveryPortalActive(false);
      clearInterval(interval);
    };
  }, [setIsDeliveryPortalActive]);

  const [activeTab, setActiveTab] = useState<'available' | 'my-tasks' | 'history'>('available');

  // Fetch history specifically when tab changes to history
  React.useEffect(() => {
    if (activeTab === 'history' && authUid) {
      const loadHistory = async () => {
        setIsHistoryLoading(true);
        const history = await fetchOrderHistory(authUid);
        setHistoryOrders(history);
        setIsHistoryLoading(false);
      };
      loadHistory();
    }
  }, [activeTab, authUid, fetchOrderHistory]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isStatsViewOpen, setIsStatsViewOpen] = useState(false);

  const riderId = authUid || 'anonymous_rider';
  const riderName = riderInfo?.name || 'Rider';
  const isOnline = riderInfo?.isOnline ?? false;

  const toggleOnlineStatus = async () => {
    if (!authUid) {
      toast.error('Authentication Error');
      return;
    }
    
    const toastId = toast.loading('Syncing status...', {
      description: `Switching to ${!isOnline ? 'Online' : 'Offline'} mode`
    });

    try {
      const riderRef = doc(db, 'riders', authUid);
      const newStatus = !isOnline;
      
      console.log('Toggling rider status to:', newStatus, 'UID:', authUid);
      
      // Use setDoc with merge: true to ensure the document exists even if not initialized
      await setDoc(riderRef, {
        isOnline: newStatus,
      }, { merge: true });
      
      toast.dismiss(toastId);
      toast.success(newStatus ? 'You are now ONLINE' : 'You are now OFFLINE', {
        description: newStatus ? 'You can now receive and accept order assignments.' : 'Check back later to continue deliveries.',
        icon: newStatus ? '✅' : '💤'
      });
    } catch (error: any) {
      console.error("Status update error:", error);
      toast.dismiss(toastId);
      
      let errorMsg = 'Sync failed. Try again.';
      if (error.code === 'permission-denied') {
        errorMsg = 'Permission Denied: Your account might not be registered as a rider.';
      }
      
      toast.error(errorMsg);
    }
  };

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const riderOrders = adminOrders.filter(o => o.assignedTo === riderId);
    const todayOrders = riderOrders.filter(o => {
      const orderDate = new Date(o.updatedAt || o.timestamp);
      return orderDate >= today && o.deliveryStatus === 'delivered';
    });

    return {
      active: riderOrders.filter(o => o.deliveryStatus === 'picking_up').length,
      completed: riderOrders.filter(o => o.deliveryStatus === 'delivered').length,
      todayCompleted: todayOrders.length,
      todayEarned: todayOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0),
      totalEarned: riderOrders.filter(o => o.deliveryStatus === 'delivered').reduce((sum, o) => sum + (o.deliveryFee || 0), 0)
    };
  }, [adminOrders, riderId]);

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const orders = useMemo(() => {
    const list = activeTab === 'history' ? historyOrders : adminOrders;
    
    return list.filter(order => {
      const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeTab === 'available') {
        return (order.deliveryStatus === 'preparing' || (!order.deliveryStatus && order.status === 'preparing')) && !order.assignedTo && matchesSearch;
      } else if (activeTab === 'my-tasks') {
        return order.assignedTo === riderId && (order.deliveryStatus === 'on_the_way' || order.deliveryStatus === 'accepted') && matchesSearch;
      } else {
        // Tab is history, historyOrders already filtered by assignedTo and status in fetchOrderHistory
        return matchesSearch;
      }
    }).sort((a, b) => {
      const timeA = typeof a.updatedAt === 'number' ? a.updatedAt : 0;
      const timeB = typeof b.updatedAt === 'number' ? b.updatedAt : 0;
      return activeTab === 'history' ? timeB - timeA : b.timestamp - a.timestamp;
    });
  }, [adminOrders, historyOrders, activeTab, searchQuery, riderId]);

  const activeTask = useMemo(() => {
    return adminOrders.find(o => o.assignedTo === riderId && (o.deliveryStatus === 'on_the_way' || o.deliveryStatus === 'accepted'));
  }, [adminOrders, riderId]);

  const handleAccept = async (orderId: string) => {
    if (!isOnline) {
      toast.error('You must be Online to accept tasks');
      return;
    }

    if (activeTask && activeTab === 'available') {
       toast.error('Complete your current task first!', {
         description: 'Focus on your active delivery before taking another.'
       });
       return;
    }

    try {
      await updateDeliveryStatus(orderId, 'accepted', { uid: riderId, name: riderName });
      toast.success('Task Accepted!', {
        description: 'Please proceed to the store to pick up the items.'
      });
      setActiveTab('my-tasks');
    } catch (error: any) {
      console.error("Accept failed:", error);
      toast.error('Task already taken or unavailable');
    }
  };

  const handlePickUp = async (orderId: string) => {
    try {
      await updateDeliveryStatus(orderId, 'picking_up', { uid: riderId, name: riderName });
      toast.success('Goods Picked Up!', {
        description: 'You are now on your way to the customer.'
      });
    } catch (error: any) {
      console.error("Pick up failed:", error);
      toast.error('Failed to update status');
    }
  };

  const handleDelivered = async (orderId: string) => {
    try {
      await updateDeliveryStatus(orderId, 'delivered');
      toast.success('Successfully Delivered!', {
        icon: '🏆'
      });
      // Trigger print dialogue
      window.print();
    } catch (error) {
      toast.error('Sync failed. Please try again.');
    }
  };

  const openInMaps = (address: string) => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/rider/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  return (
    <div className={`min-h-screen pb-20 ${darkMode ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-30 px-5 py-4 border-b backdrop-blur-md ${darkMode ? 'bg-black/90 border-white/10' : 'bg-white/90 border-slate-200 shadow-sm'}`}>
        <div className="flex items-center justify-between">
          {!isSearching ? (
             <>
               <div className="flex items-center gap-3">
                 <div className={`w-8 h-8 shrink-0 flex items-center justify-center`}>
                   {darkMode ? (
                     settings?.logoUrlDark ? (
                       <img src={settings.logoUrlDark} alt="Logo" className="w-full h-full object-contain rounded-lg" referrerPolicy="no-referrer" />
                     ) : (
                       <Package size={18} className="text-blue-500" />
                     )
                   ) : (
                     settings?.logoUrlLight ? (
                       <img src={settings.logoUrlLight} alt="Logo" className="w-full h-full object-contain rounded-lg" referrerPolicy="no-referrer" />
                     ) : (
                       <Package size={18} className="text-slate-600" />
                     )
                   )}
                 </div>
                 <div>
                  <h1 className="text-base font-black tracking-tighter uppercase leading-none">Rider Portal</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <motion.div 
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }} 
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500" 
                    />
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">
                      Sync: {lastUpdated.toLocaleTimeString("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <button 
                  onClick={toggleOnlineStatus}
                  className={`px-3 py-1.5 rounded-full flex items-center gap-2 transition-all border ${
                    isOnline 
                      ? (darkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-emerald-50 border-emerald-100 text-emerald-600')
                      : (darkMode ? 'bg-white/5 border-white/10 text-white/40' : 'bg-slate-100 border-slate-200 text-slate-500')
                  }`}
                 >
                   <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-current animate-pulse' : 'bg-current opacity-40'}`}></div>
                   <span className="text-[9px] font-black uppercase tracking-widest">{isOnline ? 'Online' : 'Offline'}</span>
                 </button>

                 <div onClick={() => setIsSearching(true)} className="cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
                   <Search size={20} />
                 </div>
                 <div onClick={() => setIsStatsViewOpen(!isStatsViewOpen)} className={`cursor-pointer transition-opacity ${isStatsViewOpen ? 'opacity-100 text-primary' : 'opacity-60 hover:opacity-100'}`}>
                   <User size={20} />
                 </div>
              </div>
              
              {/* Stats Popover */}
              <AnimatePresence>
                {isStatsViewOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className={`absolute top-[72px] right-4 w-72 p-5 rounded-[2.5rem] border shadow-2xl z-50 ${darkMode ? 'bg-slate-900 border-white/10 shadow-black' : 'bg-white border-slate-200'}`}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-white/5' : 'bg-slate-100 shadow-inner'}`}>
                        <User className="text-blue-600" size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black tracking-tight">{riderName}</h4>
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Rider Access Level</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                       <div className={`${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'} p-4 rounded-3xl border`}>
                         <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Today Tip</p>
                         <p className={`text-sm font-black tracking-tighter ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatPrice(stats.todayEarned)}</p>
                       </div>
                       <div className={`${darkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'} p-4 rounded-3xl border`}>
                         <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Lifetime</p>
                         <p className={`text-sm font-black tracking-tighter ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatPrice(stats.totalEarned)}</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                       <div className={`py-3 rounded-2xl text-center ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                         <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-40 mb-0.5">Tasks Done</p>
                         <p className="text-xs font-black leading-none">{stats.completed}</p>
                       </div>
                       <div className={`py-3 rounded-2xl text-center ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                         <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-40 mb-0.5">Today Done</p>
                         <p className="text-xs font-black leading-none">{stats.todayCompleted}</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 mb-6">
                      <button 
                        onClick={() => navigate('/rider/profile')}
                        className={`w-full py-4 rounded-2xl border flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all ${darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                      >
                        <User size={16} />
                        Manage Account
                      </button>
                    </div>

                    <button 
                      onClick={handleLogout}
                      className="w-full py-4 rounded-2xl bg-red-500 text-white font-black text-[9px] uppercase tracking-[0.2em] shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                    >
                      Log Out Profile
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
             <div className="w-full flex items-center gap-2">
               <input 
                 type="text"
                 autoFocus
                 placeholder="Search tasks..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className={`flex-1 px-4 py-2 rounded-xl border text-[11px] font-bold outline-none transition-all ${
                   darkMode ? 'bg-white/5 border-white/10 focus:border-blue-500' : 'bg-slate-100 border-slate-200 focus:border-blue-500'
                 }`}
               />
               <button onClick={() => {setIsSearching(false); setSearchQuery('')}} className="text-[10px] uppercase font-black opacity-60">Close</button>
             </div>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className={`sticky top-[68px] z-20 px-5 py-2 backdrop-blur-md transition-colors ${darkMode ? 'bg-black/70' : 'bg-slate-50/70'}`}>
        <div className={`flex p-1 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
          <button 
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-[0.15em] transition-all ${
              activeTab === 'available' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : (darkMode ? 'text-white/40 hover:text-white/60' : 'text-slate-500 hover:text-slate-700')
            }`}
          >
            Available Jobs
          </button>
          <button 
            onClick={() => setActiveTab('my-tasks')}
            className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-[0.15em] transition-all ${
              activeTab === 'my-tasks' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : (darkMode ? 'text-white/40 hover:text-white/60' : 'text-slate-500 hover:text-slate-700')
            }`}
          >
            Active Tasks
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-[0.15em] transition-all ${
              activeTab === 'history' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : (darkMode ? 'text-white/40 hover:text-white/60' : 'text-slate-500 hover:text-slate-700')
            }`}
          >
            History
          </button>
        </div>
      </div>


      {/* Main Content */}
      <div className="px-4 py-5">
        {isHistoryLoading && activeTab === 'history' && (
           <div className="flex justify-center py-10 opacity-50">
             <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
           </div>
        )}
        {/* Active Task Floating Bar */}
      <AnimatePresence>
        {activeTask && activeTab === 'available' && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 z-40"
          >
            <button 
              onClick={() => setActiveTab('my-tasks')}
              className="w-full p-4 rounded-2xl bg-orange-500 text-white shadow-xl flex items-center justify-between border-2 border-white/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                  <Navigation size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-80">You have an active delivery</p>
                  <p className="text-sm font-black tracking-tighter">Deliver to {activeTask.customerName}</p>
                </div>
              </div>
              <ChevronRight size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
          {orders.length > 0 ? (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-3"
            >
              {orders.map((order) => (
                <div 
                  key={order.id}
                  onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                  className={`p-4 rounded-2xl border overflow-hidden relative transition-all active:scale-[0.99] cursor-pointer ${
                    darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                  } ${expandedOrderId === order.id ? (darkMode ? 'ring-1 ring-blue-500/50 shadow-xl' : 'ring-1 ring-blue-500/30 shadow-md' ) : 'hover:shadow-sm'}`}
                >
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5 mb-1.5 opacity-40">
                        <span className="text-[7px] font-black uppercase tracking-[0.2em] leading-none">ORDER ID</span>
                        <ChevronRight size={10} className={`transform transition-transform ${expandedOrderId === order.id ? 'rotate-90' : ''}`} />
                      </div>
                      <span className="text-xs font-black tracking-tight font-mono">{order.id.slice(-8).toUpperCase()}</span>
                    </div>
                    <div className={`px-2.5 py-1 rounded-md text-[7px] font-black uppercase tracking-[0.2em] border shadow-sm ${
                      order.deliveryStatus === 'on_the_way' 
                        ? 'bg-orange-500 border-orange-400 text-white animate-pulse' 
                        : order.deliveryStatus === 'delivered'
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : (darkMode ? 'bg-blue-600 text-white border-blue-500' : 'bg-blue-600 border-blue-500 text-white')
                    }`}>
                      {order.deliveryStatus === 'delivered' ? 'Completed' : (order.deliveryStatus === 'on_the_way' ? 'Active Dispatch' : 'New available')}
                    </div>
                  </div>

                  <hr className={`my-3 border-dashed ${darkMode ? 'border-white/5' : 'border-slate-100'}`} />

                  {/* Customer Info */}
                  <div className="space-y-4 mb-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-white/5' : 'bg-slate-100 shadow-inner'}`}>
                        <MapPin size={18} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-[7px] font-black uppercase tracking-[0.2em] opacity-30 mb-0.5`}>Pick at Market & Deliver to</p>
                        <p className="text-xs font-bold leading-snug">{order.address || 'Central Counter / SAR TAW SET'}</p>
                        {expandedOrderId === order.id && order.address && (
                          <div className="flex gap-2 mt-3">
                            <button 
                              onClick={(e) => { e.stopPropagation(); openInMaps(order.address!); }}
                              className="px-4 py-2.5 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20 text-[9px] font-black uppercase tracking-[0.15em] flex items-center gap-2 hover:bg-blue-600 transition-all active:scale-95"
                            >
                              <Navigation size={12} /> Google Maps
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(order.address!); toast.success('Address copied'); }}
                              className={`px-4 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-[0.15em] hover:bg-white/5 active:scale-95 transition-all ${darkMode ? 'border-white/10' : 'border-slate-200 bg-white'}`}
                            >
                              Copy Path
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-white/5' : 'bg-slate-100 shadow-inner'}`}>
                        <Phone size={18} className="text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-[7px] font-black uppercase tracking-[0.2em] opacity-30 mb-0.5`}>Rider contact customer</p>
                        <div className="flex flex-col">
                           <p className="text-xs font-black mb-1">{order.customerName}</p>
                           <a 
                            href={`tel:${order.customerPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className={`text-sm font-black text-emerald-500 flex items-center gap-1.5`}
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            {order.customerPhone}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedOrderId === order.id && order.note && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`p-4 mb-4 rounded-2xl border-2 border-dashed ${darkMode ? 'bg-amber-500/5 border-amber-500/20 text-amber-500/80' : 'bg-amber-50/50 border-amber-100 text-amber-700/80'}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                           <AlertCircle size={12} />
                           <p className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60">Customer Note / Special Handling</p>
                        </div>
                        <p className="text-xs font-semibold italic italic leading-relaxed">{order.note}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Project Items Summary */}
                  <div className={`rounded-xl transition-all ${expandedOrderId === order.id ? 'mb-0' : (darkMode ? 'bg-black/30 p-2.5' : 'bg-slate-50 p-2.5')}`}>
                    <div className={`flex items-center justify-between ${expandedOrderId === order.id ? 'py-3 border-t border-dashed mt-2' : ''}`}>
                      <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest opacity-40">
                        <Package size={12} />
                        <span>{order.items.length} {order.items.length === 1 ? 'PKG' : 'PKGS'}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-black text-blue-600 tracking-tight">
                          {activeTab === 'history' ? `+ ${formatPrice(order.deliveryFee || 0)}` : formatPrice(order.total)}
                        </p>
                      </div>
                    </div>

                    <motion.div 
                      initial={false}
                      animate={{ height: expandedOrderId === order.id ? 'auto' : 0, opacity: expandedOrderId === order.id ? 1 : 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pb-3">
                        <div className="space-y-2 mb-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center gap-3 text-[10px] font-bold">
                              <div className="flex items-center gap-1.5 flex-1 truncate">
                                <span className={`px-1.5 py-0.5 rounded bg-slate-500/10 text-[7px] font-black tracking-widest`}>X{item.quantity}</span>
                                <span className="opacity-60 truncate">{item.name}</span>
                              </div>
                              <span className="flex-shrink-0 font-mono opacity-40">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                        <div className={`p-2.5 rounded-xl border border-dashed flex justify-between items-center ${darkMode ? 'bg-white/5 border-white/10' : 'bg-blue-50/30 border-blue-100'}`}>
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Collection Amount</span>
                          <span className="text-xs font-black text-blue-600">{formatPrice(order.total)}</span>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Actions Area */}
                  {activeTab !== 'history' && (
                    <div className={`mt-3 py-1 ${expandedOrderId !== order.id ? 'hidden' : 'block'}`}>
                      {activeTab === 'available' ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAccept(order.id); }}
                          disabled={!isOnline}
                          className={`w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                            isOnline 
                              ? 'bg-blue-600 text-white shadow-blue-600/20' 
                              : 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed opacity-50'
                          }`}
                        >
                          <CheckCircle2 size={14} />
                          {isOnline ? 'Accept Task' : 'Go Online to Accept'}
                        </button>
                      ) : (
                        <div className="flex gap-2 w-full">
                          {order.deliveryStatus === 'accepted' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handlePickUp(order.id); }}
                              className="flex-1 py-3.5 rounded-xl bg-orange-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                              <Package size={14} />
                              Pick Up Order
                            </button>
                          )}
                          {order.deliveryStatus === 'on_the_way' && (
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDelivered(order.id); }}
                                className="flex-1 py-3.5 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                              >
                                <CheckCircle2 size={14} />
                                Mark Delivered
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); window.print(); }}
                                className="px-4 py-3.5 rounded-xl bg-slate-700 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-700/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                              >
                                Print Invoice
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center opacity-30"
            >
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-current mb-6 flex items-center justify-center">
                <Clock size={24} />
              </div>
              <p className="text-xs font-black uppercase tracking-widest">No orders found</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Persistence Note */}
      <div className="px-5 mt-8 pb-10">
        <div className={`p-4 rounded-2xl border-2 border-dashed ${darkMode ? 'border-white/5' : 'border-slate-100'}`}>
          <div className="flex gap-2.5">
            <div className="mt-0.5 opacity-30">
              <AlertCircle size={12} />
            </div>
            <p className="text-[7.5px] font-black uppercase tracking-[0.1em] opacity-30 leading-relaxed">
              System active for <span className="text-blue-500">ID:{riderId.slice(-8)}</span>. 
              Contact support if assignments mismatch. Clear cache if portal remains stale.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
