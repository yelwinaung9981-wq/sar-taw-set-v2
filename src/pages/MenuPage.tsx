import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { 
  ShoppingCart, Search, Menu as MenuIcon, Plus, Minus, Store, Receipt, User, Settings, X, 
  Sliders, Camera, Heart, Bell, Trash2, CheckCircle2, Sparkles, Zap, LayoutDashboard, 
  Snowflake, Coffee, Cookie, Utensils, Baby, Dog, Home, Briefcase, Pill, Smile,
  Fish, Beef, Carrot, Egg, Soup, Wheat, UtensilsCrossed, Flame, Wine, Candy, MessageCircle,
  QrCode, Share2, Eye
} from 'lucide-react';

import { AddToCartButton } from '../components/AddToCartButton';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PRODUCTS } from '../lib/seed';
import { CATEGORIES } from '../constants';
import { QRCodeModal } from '../components/ui/QRCodeModal';

export default function MenuPage() {
  const [searchParams] = useSearchParams();
  const { 
    setRoomNumber, addToCart, updateQuantity, cartTotal, cart, roomNumber, clearCart,
    favorites, toggleFavorite, notifications, markNotificationAsRead, clearNotifications,
    t, darkMode, language, formatPrice, getMainName, getSecondaryName, getCategoryName, products,
    promotionBanners, categories, deals, bundles, settings, orders
  } = useStore();
  const navigate = useNavigate();

  const [sessionViews, setSessionViews] = useState<Record<string, number>>({});

  const getProductStats = (productId: string) => {
    const product = products.find(p => p.id === productId);
    const dbSold = Math.max(0, product?.soldCount ?? 0);
    const dbLikes = Math.max(0, product?.likesCount ?? 0);
    const dbViews = Math.max(0, product?.viewsCount ?? 0);
    const sessionViewCount = sessionViews[productId] || 0;
    return { 
      purchaseCount: dbSold, 
      likesCount: dbLikes,
      viewsCount: dbViews + sessionViewCount
    };
  };

  const activeBanners = useMemo(() => {
    return [...promotionBanners]
      .filter(b => b.isActive)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [promotionBanners]);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [cols, setCols] = useState(2);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1280) setCols(6);
      else if (width >= 1024) setCols(5);
      else if (width >= 768) setCols(4);
      else if (width >= 640) setCols(3);
      else setCols(2);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [itemRanks, setItemRanks] = useState<Record<string, number>>(() => {
    try {
      const stored = sessionStorage.getItem('sp_item_ranks');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    if (selectedCategory === 'all') {
      setItemRanks(prev => {
        let changed = false;
        const newRanks = { ...prev };
        products.forEach(p => {
          if (newRanks[p.id] === undefined) {
            newRanks[p.id] = Math.random();
            changed = true;
          }
        });
        if (changed) {
          try {
            sessionStorage.setItem('sp_item_ranks', JSON.stringify(newRanks));
          } catch (e) {
            console.error(e);
          }
          return newRanks;
        }
        return prev;
      });
    }
  }, [selectedCategory, products]);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [qrItem, setQrItem] = useState<{ id: string; name: string } | null>(null);
  const productGridRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  useEffect(() => {
    const handleScroll = () => {
      if (searchBoxRef.current) {
        const rect = searchBoxRef.current.getBoundingClientRect();
        // If the bottom of the search box is above the top of the viewport (or header)
        setShowHeaderSearch(rect.bottom < 72);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const room = searchParams.get('room');
    if (room) setRoomNumber(room);
  }, [searchParams, setRoomNumber]);

  const activeBundles = useMemo(() => bundles.filter(b => b.isActive), [bundles]);
  const activeDeals = useMemo(() => deals.filter(d => d.isActive), [deals]);

  const activeCategoryData = useMemo(() => {
    return categories.find(c => c.key === selectedCategory);
  }, [categories, selectedCategory]);

  const handleCategorySupport = () => {
    if (activeCategoryData?.supportPhone) {
      const message = encodeURIComponent(`Hi, I need help with ${activeCategoryData.nameEn} category.`);
      window.open(`https://wa.me/${activeCategoryData.supportPhone}?text=${message}`, '_blank');
    }
  };

  const getCategoryIcon = (id: string) => {
    const category = categories.find(c => c.id === id);
    if (category?.iconUrl) {
      return <img src={category.iconUrl} alt="" className="w-3 h-3 object-contain rounded-sm" referrerPolicy="no-referrer" />;
    }

    const key = (category?.key || id || "").toLowerCase();
    const nameEn = (category?.nameEn || "").toLowerCase();
    const nameMm = (category?.nameMm || "");
    const iconSize = 12;

    const isMatch = (...terms: string[]) => {
      return terms.some(t => {
        const lowerT = t.toLowerCase();
        return (
          key.includes(lowerT) || 
          nameEn.includes(lowerT) ||
          (nameMm && nameMm.includes(t))
        );
      });
    };

    if (key === 'all') return <LayoutDashboard size={iconSize} />;
    if (key === 'deals' || isMatch('deal', 'promo', 'discount', 'အထူး')) return <Zap size={iconSize} className="fill-orange-500 text-orange-500" />;
    if (key === 'bundles' || isMatch('bundle', 'combo', 'pack', 'set', 'တွဲဖက်', 'စုစည်း')) return <Sparkles size={iconSize} className="text-cyan-500" />;

    if (isMatch('meat', 'poultry', 'pork', 'beef', 'lamb', 'mutton', 'chicken', 'အသား', 'ကြက်', 'ဝက်')) {
      return <Beef size={iconSize} />;
    }
    if (isMatch('seafood', 'fish', 'crab', 'shrimp', 'prawn', 'lobster', 'ငါး', 'ပုဇွန်', 'ရေစာ')) {
      return <Fish size={iconSize} />;
    }
    if (isMatch('vegetables', 'fresh-produce', 'fruits', 'fruit', 'vegetable', 'carrot', 'onion', 'garlic', 'သီးနှံ', 'ဟင်းသီးဟင်းရွက်', 'သစ်သီး')) {
      return <Carrot size={iconSize} />;
    }
    if (isMatch('dairy', 'eggs', 'milk', 'cheese', 'butter', 'yogurt', 'cream', 'နို့', 'ဥ')) {
      return <Egg size={iconSize} />;
    }
    if (isMatch('ready-to-eat', 'readyToEat', 'prepared-meals', 'instant', 'soup', 'meal', 'meals', 'စွပ်ပြုတ်', 'အသင့်စား')) {
      return <Soup size={iconSize} />;
    }
    if (isMatch('dry-goods', 'pantry', 'dryGoods', 'rice', 'grains', 'flour', 'spaghetti', 'noodle', 'noodles', 'ဆန်', 'ဂျုံ', 'အခြောက်')) {
      return <Wheat size={iconSize} />;
    }
    if (isMatch('kitchen', 'home-essentials', 'kitchenware', 'utensils', 'utensil', 'plate', 'knife', 'fork', 'cup', 'glass', 'မီးဖိုချောင်')) {
      return <UtensilsCrossed size={iconSize} />;
    }
    if (isMatch('spices', 'seasonings', 'hot', 'chili', 'spicy', 'sauce', 'clove', 'ginger', 'pepper', 'ငရုတ်သီး', 'ဟင်းခတ်')) {
      return <Flame size={iconSize} className="text-orange-600" />;
    }
    if (isMatch('beverages', 'drinks', 'drink', 'juice', 'soda', 'water', 'tea', 'coffee', 'beer', 'wine', 'ဖျော်ရည်', 'ရေသန့်')) {
      return <Wine size={iconSize} />;
    }
    if (isMatch('snacks', 'confectionery', 'sweet', 'sweets', 'dessert', 'desert', 'chocolate', 'biscuit', 'chips', 'cookie', 'cookies', 'မုန့်')) {
      return <Candy size={iconSize} />;
    }
    if (isMatch('frozen-foods', 'frozen', 'ice', 'ice-cream', 'အေးခဲ')) {
      return <Snowflake size={iconSize} />;
    }
    if (isMatch('baby-care', 'baby', 'infant', 'kids', 'diaper', 'diapers', 'ကလေး')) {
      return <Baby size={iconSize} />;
    }
    if (isMatch('pet-care', 'pet', 'cat', 'dog', 'animal', 'pets', 'အိမ်မွေး')) {
      return <Dog size={iconSize} />;
    }
    if (isMatch('household', 'home', 'house', 'cleaning', 'detergent', 'tissue', 'tissues', 'အိမ်သုံး')) {
      return <Home size={iconSize} />;
    }
    if (isMatch('personal-care', 'beauty', 'cosmetics', 'hygiene', 'clean', 'shampoo', 'soap', 'bodywash', 'toothpaste', 'brush', 'ကိုယ်ရေးကိုယ်တာ')) {
      return <Smile size={iconSize} />;
    }
    if (isMatch('health-wellness', 'health', 'medicine', 'supplement', 'vitamins', 'care', 'ဆေး')) {
      return <Pill size={iconSize} />;
    }
    if (isMatch('office-supplies', 'office', 'stationary', 'paper', 'school', 'pen', 'pencil', 'notebook', 'ရုံးသုံး')) {
      return <Briefcase size={iconSize} />;
    }

    return <Store size={iconSize} />;
  };

  const categoriesWithSpecials = useMemo(() => {
    // Start with the 'all' category if it exists, otherwise create it
    const allCat = categories.find(c => c.id === 'all') || { id: 'all', key: 'all', name: 'All Items', isActive: true };
    
    const list = [allCat];
    
    // Add Deals if any are active AND the category itself is active
    const dealsCat = categories.find(c => c.key === 'deals' || c.id === 'deals');
    if (activeDeals.length > 0 && (!dealsCat || dealsCat.isActive !== false)) {
      list.push({ id: 'deals', name: 'Flash Deals', nameMm: 'အထူးဈေး', key: 'deals', isActive: true, translationKey: 'deals' });
    }
    
    // Add Bundles if any are active AND the category itself is active
    const bundlesCat = categories.find(c => c.key === 'bundles' || c.id === 'bundles');
    if (activeBundles.length > 0 && (!bundlesCat || bundlesCat.isActive !== false)) {
      list.push({ id: 'bundles', name: 'Combo Bundles', nameMm: 'တွဲဖက်', key: 'bundles', isActive: true, translationKey: 'bundles' });
    }

    // Add remaining active categories (filtered to avoid duplicates)
    const others = categories.filter(c => 
      c.isActive !== false && 
      c.id !== 'all' && 
      c.id !== 'deals' && 
      c.id !== 'bundles'
    ).sort((a, b) => (a.order || 0) - (b.order || 0));

    return [...list, ...others];
  }, [categories, activeDeals, activeBundles]);

  // Effect to reset selected category if it becomes inactive
  useEffect(() => {
    if (selectedCategory !== 'all' && selectedCategory !== 'deals' && selectedCategory !== 'bundles') {
      const activeCatKeys = categoriesWithSpecials.map(c => c.id);
      if (!activeCatKeys.includes(selectedCategory)) {
        setSelectedCategory('all');
      }
    }
  }, [selectedCategory, categoriesWithSpecials]);

  const filteredItems = useMemo(() => {
    // Get valid keys of active categories for filtering products in 'all' view
    const activeCategoryKeys = new Set(categoriesWithSpecials.map(c => c.key));

    if (selectedCategory === 'deals') {
      return activeDeals.map(d => ({ ...d, isDeal: true }));
    }
    if (selectedCategory === 'bundles') {
      return activeBundles.map(b => ({ ...b, isBundle: true }));
    }
    
    let items = products.filter(product => {
      // 1. Must match selected category (or be 'all')
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      if (!matchesCategory) return false;

      // 2. If viewing 'all', only show products that belong to an ACTIVE category
      if (selectedCategory === 'all') {
        const catObj = categories.find(c => c.id === product.category || c.key === product.category);
        if (catObj && catObj.isActive === false) return false;
      }

      return true;
    });

    if (selectedCategory === 'all') {
      items = [...items].sort((a, b) => (itemRanks[a.id] || 0) - (itemRanks[b.id] || 0));
    }

    return items;
  }, [selectedCategory, products, activeDeals, activeBundles, categoriesWithSpecials, categories, itemRanks]);

  return (
    <div className={`min-h-screen pb-32 transition-colors duration-300 ${darkMode ? 'bg-surface' : 'bg-surface'}`}>
      {/* Top Bar */}
      <header className={`fixed top-0 w-full z-50 px-4 flex flex-col justify-center border-b border-on-surface/5 transition-all duration-300 h-[72px] ${darkMode ? 'bg-surface/80 backdrop-blur-xl' : 'bg-surface/80 backdrop-blur-xl'}`}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 sm:gap-3 max-w-[60%]">
            <div className="flex flex-col min-w-0 py-1">
              <h1 className="text-lg font-black text-primary leading-tight tracking-tight">စားတော်ဆက်</h1>
              <span className={`text-[8px] font-black uppercase tracking-wider truncate transition-colors ${darkMode ? 'text-on-surface-variant/60' : 'text-on-surface-variant/60'}`}>
                Sar Taw Set {t('foodDelivery')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {showHeaderSearch && (
                <motion.button 
                  initial={{ x: 40, opacity: 0, scale: 0.5 }}
                  animate={{ x: 0, opacity: 1, scale: 1 }}
                  exit={{ x: 40, opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  onClick={() => navigate('/search')}
                  className={`p-2 rounded-full transition-colors z-0 ${darkMode ? 'text-on-surface-variant hover:bg-surface-container-high' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                >
                  <Search size={22} />
                </motion.button>
              )}
            </AnimatePresence>
            
            <button 
              onClick={() => navigate('/notifications')}
              className={`p-2 rounded-full transition-all active:scale-90 relative ${darkMode ? 'text-on-surface-variant hover:bg-surface-container-high' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-sm animate-pulse"></span>
              )}
            </button>

            <button 
              onClick={() => navigate('/profile')}
              className={`p-2 rounded-full transition-all active:scale-90 ${darkMode ? 'text-on-surface-variant hover:bg-surface-container-high' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
            >
              <User size={22} />
            </button>
          </div>
        </div>
      </header>

      <main className={`transition-all duration-300 pt-[72px]`}>
        {/* Advertisement Carousel */}
        <AnimatePresence initial={false}>
          <motion.section 
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 8 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="bg-transparent overflow-hidden"
          >
            <div className="flex items-center overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 py-4 scroll-px-4">
              {/* Left Spacer to align with px-4 */}
              <div className="flex-none w-4" />
              
              {(() => {
                const placeholdersCount = Math.max(0, 3 - activeBanners.length);
                const totalItems = activeBanners.length + placeholdersCount;

                return (
                  <>
                    {activeBanners.map((banner, index) => {
                      const BannerWrapper = banner.link ? 'a' : 'div';
                      const wrapperProps = banner.link ? { href: banner.link, target: "_blank", rel: "noreferrer" } : {};
                      
                      return (
                        <BannerWrapper 
                          key={banner.id}
                          {...wrapperProps}
                          className={`relative flex-none w-[300px] h-[150px] ${index === totalItems - 1 ? 'snap-end' : 'snap-start'} overflow-hidden rounded-xl shadow-xl shadow-primary/5 transition-all block`}
                        >
                          <img 
                            className="w-full h-full object-cover" 
                            src={banner.image} 
                            referrerPolicy="no-referrer"
                            alt={banner.title}
                          />
                          {banner.title && (
                            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                              <h3 className="text-white text-xs font-black uppercase tracking-widest drop-shadow-lg">
                                {banner.title}
                              </h3>
                            </div>
                          )}
                        </BannerWrapper>
                      );
                    })}
                    
                    {Array.from({ length: placeholdersCount }).map((_, i) => (
                      <div 
                        key={`placeholder-${i}`} 
                        className={`flex-none w-[280px] ${activeBanners.length + i === totalItems - 1 ? 'snap-end' : 'snap-start'} bg-gray-100 rounded-xl p-5 flex flex-col justify-center min-h-[140px] shadow-sm`}
                      >
                        <p className="text-gray-500 text-sm font-bold text-center">{t('noActivePromotions') || 'No active promotions'}</p>
                      </div>
                    ))}
                  </>
                );
              })()}
              
              {/* Right Spacer to align with px-4 */}
              <div className="flex-none w-4" />
            </div>
          </motion.section>
        </AnimatePresence>

        {/* Search Bar */}
        <div ref={searchBoxRef} className="px-4 -mt-2 cursor-pointer" onClick={() => navigate('/search')}>
          <div className={`relative pointer-events-none flex items-center rounded-full shadow-sm border border-on-surface/5 transition-all ${darkMode ? 'bg-surface-container-high' : 'bg-surface-container-lowest'}`}>
            <div className="pl-5 text-on-surface-variant/50">
              <Search size={16} />
            </div>
            <input 
              type="text"
              placeholder={t('searchPlaceholder')}
              readOnly
              className="w-full bg-transparent py-2.5 pl-3 pr-4 text-xs font-medium outline-none text-on-surface"
            />
            <div className="flex items-center gap-2 pr-5 text-on-surface-variant/50">
              <Sliders size={16} />
              <div className="w-[1px] h-3 bg-on-surface-variant/20" />
              <Camera size={16} />
            </div>
          </div>
        </div>

        <section 
          className="sticky z-40 transition-all duration-300 h-10 flex items-center overflow-hidden bg-transparent"
          style={{ top: '72px' }}
        >
          <div className="flex overflow-x-auto overflow-y-hidden no-scrollbar gap-1.5 px-4 w-full items-center h-full">
            {categoriesWithSpecials.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    productGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`flex-none px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider whitespace-nowrap transition-all duration-300 flex items-center gap-1 border border-transparent ${
                    selectedCategory === cat.id
                      ? 'bg-primary text-white shadow-md shadow-primary/25 border-primary'
                      : `${darkMode ? 'bg-surface-container-high text-white hover:bg-white/5 border-white/5' : 'bg-white text-slate-800 border-slate-200/60 shadow-sm font-semibold'} border`
                  }`}
                >
                  <span className={selectedCategory === cat.id ? 'scale-110' : 'opacity-60'} style={{ transform: 'scale(0.85)' }}>
                    {getCategoryIcon(cat.id)}
                  </span>
                  {getCategoryName(cat.id)}
                </button>
            ))}
          </div>
        </section>

        {/* Support Banner for Categories */}
        <AnimatePresence>
          {activeCategoryData?.supportPhone && selectedCategory !== 'all' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 mb-4"
            >
              <div 
                className={`p-4 rounded-2xl flex items-center justify-between gap-4 border ${
                  darkMode ? 'bg-primary/10 border-primary/20' : 'bg-emerald-50 border-emerald-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${darkMode ? 'text-primary' : 'text-emerald-700'}`}>
                      {t('categoryExpert') || 'Category Expert'}
                    </p>
                    <p className={`text-[9px] font-bold opacity-60 ${darkMode ? 'text-on-surface' : 'text-slate-600'}`}>
                      {t('needHelpWith') || 'Need help with'} {getCategoryName(activeCategoryData.id)}?
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleCategorySupport}
                  className="px-4 py-2 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                  {t('chatNow') || 'Chat Now'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product Grid */}
        <section ref={productGridRef} className="mt-1 px-4 min-h-[70vh] scroll-mt-[112px]">
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredItems.map((item: any, index: number) => {
                const cartItem = cart.find((c: any) => c.id === item.id);
                const quantityInCart = cartItem ? cartItem.quantity : 0;
                const stats = getProductStats(item.id);
                
                const isSelected = selectedProduct?.id === item.id;
                let computedOrder = index;
                if (selectedProduct) {
                  const S = filteredItems.findIndex((x: any) => x.id === selectedProduct.id);
                  if (S !== -1) {
                    const R_S = Math.floor(S / cols);
                    const R_i = Math.floor(index / cols);
                    if (R_i === R_S) {
                      computedOrder = isSelected ? R_S * 100 : R_S * 100 + 1;
                    } else if (R_i < R_S) {
                      computedOrder = R_i * 100;
                    } else {
                      computedOrder = R_i * 100 + 2;
                    }
                  }
                }

                return (
                  <motion.div 
                    onClick={() => {
                      const isExpanding = selectedProduct?.id !== item.id;
                      setSelectedProduct(isExpanding ? item : null);
                      if (isExpanding) {
                        setSessionViews(prev => ({
                          ...prev,
                          [item.id]: (prev[item.id] || 0) + 1
                        }));
                      }
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    key={item.id} 
                    layout
                    transition={{
                      type: "spring",
                      stiffness: 140,
                      damping: 22,
                      mass: 0.8
                    }}
                    style={{ order: computedOrder }}
                    className={`${darkMode ? 'bg-surface-container-high' : 'bg-surface-container-lowest'} rounded-xl overflow-hidden relative group shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)] ${selectedProduct?.id === item.id ? 'col-span-2' : 'flex flex-col h-full'}`}
                  >
                    {selectedProduct?.id === item.id ? (
                      <div className="flex flex-row h-full min-h-[160px]">
                        {/* Left: Image */}
                        <div className={`relative w-2/5 min-w-[120px] overflow-hidden ${darkMode ? 'bg-surface-container-low' : 'bg-[#FDFBF7]'}`}>
                          <img 
                            className={`w-full h-full object-cover ${item.isAvailable === false ? 'opacity-50' : ''}`} 
                            src={item.image} 
                            alt={item.name || item.title}
                            referrerPolicy="no-referrer"
                          />
                          {item.isAvailable === false && (
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                              <div className="bg-black/70 px-2 py-1 rounded-lg">
                                <span className="text-white font-black text-[8px] uppercase tracking-widest">{t('soldOut') || 'Sold Out'}</span>
                              </div>
                            </div>
                          )}
                          {!item.isBundle && (
                            <button 
                              onClick={(e) => {
                                e?.stopPropagation?.();
                                toggleFavorite(item.id);
                              }}
                              className={`absolute top-2 left-2 z-10 w-6 h-6 flex items-center justify-center bg-white/50 backdrop-blur-md rounded-full transition-all duration-300 active:scale-90 ${
                                favorites.includes(item.id) 
                                  ? 'text-rose-500 shadow-sm' 
                                  : 'text-slate-600 hover:text-rose-500'
                              }`}
                            >
                              <Heart size={12} fill={favorites.includes(item.id) ? "currentColor" : "none"} />
                            </button>
                          )}
                        </div>

                        {/* Right: Details */}
                        <div className="flex-1 p-3 flex flex-col h-full overflow-hidden">
                          <div className="space-y-1 relative flex-1 overflow-y-auto no-scrollbar pr-1">
                            <button 
                              onClick={(e) => {
                                e?.stopPropagation?.();
                                setSelectedProduct(null);
                              }}
                              className={`absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center rounded-full transition-colors ${darkMode ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                            >
                              <X size={14} />
                            </button>
                            <div className="pr-6">
                              <h4 className="text-on-surface font-black text-sm leading-tight tracking-tight">
                                {getMainName(item)}
                              </h4>
                              <p className="text-on-surface-variant/70 text-[10px] font-medium mt-0.5">
                                {getSecondaryName(item)}
                              </p>
                            </div>
                            {item.description && (
                              <p className={`text-[10px] leading-relaxed mt-1.5 ${darkMode ? 'text-on-surface-variant/80' : 'text-slate-500'}`}>
                                {item.description}
                              </p>
                            )}
                            <p className="text-on-surface-variant/40 text-[8px] font-bold uppercase tracking-[0.1em] mt-2 pb-1">
                              {item.unit || (item.isBundle ? t('bundle') || 'Bundle' : '')}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1 pb-2">
                              <span className={`inline-flex items-center gap-1 text-[9.5px] font-black px-2 py-1 rounded-lg ${
                                darkMode 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              }`}>
                                <ShoppingCart size={10} strokeWidth={3} />
                                <span>{language === 'mm' ? `ဝယ်ယူမှု: ${stats.purchaseCount} ကြိမ်` : `Purchased: ${stats.purchaseCount} times`}</span>
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between border-t border-on-surface/5 pt-2 flex-shrink-0">
                            <div className="flex flex-col">
                              {item.originalPrice && (
                                <span className="text-[9px] text-on-surface-variant/40 line-through font-bold">
                                  {formatPrice(item.originalPrice * (quantityInCart || 1))}
                                </span>
                              )}
                              <p className="text-primary font-black text-base tracking-tighter">
                                {formatPrice(item.price * (quantityInCart || 1))}
                              </p>
                            </div>
                            
                            {quantityInCart > 0 ? (
                              <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-xl shadow-sm border border-on-surface/5">
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e?.stopPropagation?.();
                                    updateQuantity(item.id, -1);
                                  }}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                    darkMode 
                                      ? 'bg-surface-container hover:bg-white/5 text-primary' 
                                      : 'bg-white hover:bg-slate-50 text-primary shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
                                  }`}
                                >
                                  <Minus size={12} strokeWidth={3} />
                                </motion.button>

                                <span className="text-on-surface font-black text-xs px-1.5 min-w-[16px] text-center">
                                  {quantityInCart}
                                </span>

                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e?.stopPropagation?.();
                                    updateQuantity(item.id, 1);
                                  }}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                    darkMode 
                                      ? 'bg-surface-container hover:bg-white/5 text-primary' 
                                      : 'bg-white hover:bg-slate-50 text-primary shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
                                  }`}
                                >
                                  <Plus size={12} strokeWidth={3} />
                                </motion.button>
                              </div>
                            ) : (
                              <AddToCartButton 
                                onClick={() => addToCart(item)}
                                darkMode={darkMode}
                                disabled={item.isAvailable === false}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div className="flex flex-col h-full">
                      {/* Image Section */}
                      <div className={`relative h-32 w-full overflow-hidden ${darkMode ? 'bg-surface-container-low' : 'bg-[#FDFBF7]'}`}>
                    {!item.isBundle && (
                      <button 
                        onClick={(e) => {
                          e?.stopPropagation?.();
                          toggleFavorite(item.id);
                        }}
                        className={`absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center transition-all duration-300 active:scale-90 ${
                          favorites.includes(item.id) 
                            ? 'text-rose-500 drop-shadow-sm' 
                            : 'text-on-surface-variant/40 hover:text-rose-500/60'
                        }`}
                      >
                        <Heart size={14} fill={favorites.includes(item.id) ? "currentColor" : "none"} />
                      </button>
                    )}
                    <img 
                      className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 ${item.isAvailable === false ? 'opacity-50' : ''}`} 
                      src={item.image} 
                      alt={item.name || item.title}
                      referrerPolicy="no-referrer"
                    />
                    {item.isAvailable === false && (
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="bg-black/70 px-3 py-1 rounded-lg">
                          <span className="text-white font-black text-[10px] uppercase tracking-widest">{t('soldOut') || 'Sold Out'}</span>
                        </div>
                      </div>
                    )}
                    {item.isDeal && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg">{t('deal') || 'Deal'}</div>
                    )}
                    {item.isBundle && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg">{t('bundle') || 'Bundle'}</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  {/* Content Section */}
                  <div className="p-2 flex flex-col flex-1 justify-between gap-1">
                    <div className="space-y-1">
                      <div className="flex flex-col">
                        <h4 className="text-on-surface font-black text-xs leading-tight tracking-tight group-hover:text-primary transition-colors duration-300 truncate max-w-[70%]">
                          {getMainName(item)}
                        </h4>
                        <p className="text-on-surface-variant/60 text-[10px] font-medium leading-tight truncate mt-0.5 max-w-[50%]">
                          {getSecondaryName(item)}
                        </p>
                      </div>
                      <p className="text-on-surface-variant/40 text-[8px] font-bold uppercase tracking-[0.1em]">
                        {item.unit || (t('bundle') || 'Bundle')}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        {item.originalPrice && (
                          <span className="text-[8px] text-on-surface-variant/40 line-through font-bold">
                            {formatPrice(item.originalPrice)}
                          </span>
                        )}
                        <p className="text-primary font-black text-sm tracking-tighter">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                      
                      <AddToCartButton 
                        onClick={() => addToCart(item)}
                        darkMode={darkMode}
                        disabled={item.isAvailable === false}
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
              ); })}
            </div>
          ) : (
            <div className="py-24 text-center space-y-6">
              <div className={`w-20 h-20 rounded-xl flex items-center justify-center mx-auto shadow-inner ${darkMode ? 'bg-surface-container-high' : 'bg-surface-container-low'}`}>
                <Search size={32} className="text-on-surface-variant/20" />
              </div>
              <div className="space-y-2">
                <p className="text-on-surface font-black text-lg tracking-tight">{t('noItemsFound')}</p>
                <p className="text-on-surface-variant/60 text-xs font-medium">{t('trySearchingAgain')}</p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Cart Summary Bar */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-0 right-0 px-4 z-40"
          >
            <div className={`${darkMode ? 'bg-surface-container-high/90' : 'bg-surface-container-lowest/90'} backdrop-blur-2xl rounded-2xl p-2.5 flex items-center justify-between shadow-lg border border-primary/10`}>
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 shrink-0 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
                  <ShoppingCart className="text-white" size={14} />
                </div>
                <div className="flex flex-col overflow-hidden whitespace-nowrap">
                  <span className="text-on-surface-variant text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1 truncate">{t('yourSelection')}</span>
                  <span className="text-on-surface text-sm font-black tracking-tighter truncate">
                    {cart.reduce((a,b) => a + b.quantity, 0)} {t('items')} | {formatPrice(cartTotal)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => clearCart()}
                  className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95 transition-all"
                  aria-label="Clear Cart"
                >
                  <Trash2 size={14} />
                </button>
                <button 
                  onClick={() => navigate('/checkout')}
                  className="bg-primary shrink-0 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-primary/20 whitespace-nowrap"
                >
                  {t('checkout')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <QRCodeModal 
        isOpen={!!qrItem} 
        onClose={() => setQrItem(null)} 
        url={`${settings.productionUrl}/#/search?q=${qrItem ? encodeURIComponent(qrItem.name) : ''}`}
        title={qrItem?.name || 'Product'}
        subtitle="Item QR Code"
        darkMode={darkMode}
      />

    </div>
  );
}
