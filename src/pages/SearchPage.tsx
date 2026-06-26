import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, ArrowLeft, Plus, Minus, SlidersHorizontal, Camera, Clock, 
  TrendingUp, Check, ScanLine, ShoppingCart, Heart, Trash2,
  LayoutDashboard, Zap, Sparkles, Beef, Fish, Carrot, Egg, 
  Soup, Wheat, UtensilsCrossed, Flame, Wine, Candy, Snowflake, 
  Baby, Dog, Home, Smile, Pill, Briefcase, Store, Eye
} from 'lucide-react';
import { AddToCartButton } from '../components/AddToCartButton';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

const POPULAR_SEARCHES = ['Fresh Milk', 'Organic Eggs', 'Salmon', 'Avocado', 'Bread'];

const SORT_OPTIONS = [
  { id: 'relevance', key: 'relevance' },
  { id: 'price_asc', key: 'priceLowToHigh' },
  { id: 'price_desc', key: 'priceHighToLow' },
  { id: 'name_asc', key: 'nameAToZ' }
];

export default function SearchPage() {
  const navigate = useNavigate();
  const { 
    addToCart, 
    updateQuantity,
    cart, 
    cartTotal, 
    clearCart, 
    favorites, 
    toggleFavorite, 
    t, 
    darkMode, 
    formatPrice, 
    getMainName, 
    getSecondaryName, 
    getCategoryName,
    products,
    categories,
    language,
    orders
  } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
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
  
  // Filter & Sort State
  const [showFilters, setShowFilters] = useState(false);
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

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  
  // Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState(t('positionBarcode'));
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentSearches');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const getCategoryIcon = (keyOrId: string) => {
    const category = categories.find(c => c.key === keyOrId || c.id === keyOrId);
    if (category?.iconUrl) {
      return <img src={category.iconUrl} alt="" className="w-3 h-3 object-contain rounded-sm" referrerPolicy="no-referrer" />;
    }

    const key = (category?.key || keyOrId || "").toLowerCase();
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
    // Check if 'all' is already in categories from store
    const hasAll = categories.some(c => c.id === 'all');
    const baseCategories = hasAll ? categories : [{ id: 'all', key: 'all' }, ...categories];
    
    return baseCategories.filter(c => c.isActive !== false);
  }, [categories]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() && !recentSearches.includes(query.trim())) {
      const updated = [query.trim(), ...recentSearches].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  const removeRecentSearch = (query: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(q => q !== query);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const resetFilters = () => {
    setSelectedCategory('all');
    setSortBy('relevance');
  };

  const handleCameraClick = () => {
    // Open the native file picker with camera capture option
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data:image/jpeg;base64, part
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setShowScanner(true);
      setIsScanning(true);
      setScanStatus(t('analyzingProduct'));
      
      try {
        const base64Data = await fileToBase64(file);
        
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          console.warn("GEMINI_API_KEY is not set. Image scanning will be disabled.");
          setScanStatus(t('error'));
          setIsScanning(false);
          setShowScanner(false);
          return;
        }
        
        const ai = new GoogleGenAI({ apiKey });
        
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          config: {
            maxOutputTokens: 100,
          },
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64Data,
                },
              },
              {
                text: "Identify the main grocery or food product in this image. Return ONLY the name of the product in a few words, suitable for a search query. Do not include any other text.",
              },
            ],
          },
        });

        const resultText = response.text?.trim();
        
        if (resultText) {
          setScanStatus(`${t('found')}: ${resultText}`);
          setIsScanning(false);
          
          setTimeout(() => {
            setShowScanner(false);
            handleSearch(resultText);
          }, 1500);
        } else {
          throw new Error("No text returned from AI");
        }

      } catch (error) {
        console.error("Error analyzing image:", error);
        setScanStatus("Failed to recognize product. Please try again.");
        setIsScanning(false);
        
        setTimeout(() => {
          setShowScanner(false);
        }, 2000);
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (selectedCategory !== 'all') {
      const activeCatKeys = categoriesWithSpecials.map(c => c.id);
      if (!activeCatKeys.includes(selectedCategory)) {
        setSelectedCategory('all');
      }
    }
  }, [selectedCategory, categoriesWithSpecials]);

  // Apply Search, Filter, and Sort
  let filteredProducts = searchQuery.trim() === '' 
    ? [] 
    : products.filter(product => {
        const cat = categories.find(c => c.id === product.category || c.key === product.category);
        if (cat && cat.isActive === false) return false;
        
        return getMainName(product).toLowerCase().includes(searchQuery.toLowerCase()) || 
               getSecondaryName(product).toLowerCase().includes(searchQuery.toLowerCase());
      });

  if (selectedCategory !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
  }

  if (sortBy === 'price_asc') {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price_desc') {
    filteredProducts.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'name_asc') {
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className={`min-h-screen pb-4 ${darkMode ? 'bg-surface text-on-surface' : 'bg-surface text-on-surface'}`}>
      {/* Hidden File Input for Camera */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef}
        onChange={handleImageCapture}
        className="hidden" 
      />

      <div className={`sticky top-0 backdrop-blur-sm z-40 px-4 h-[72px] flex items-center border-b border-on-surface/5 ${darkMode ? 'bg-surface/95' : 'bg-surface/95'}`}>
        <div className="flex items-center gap-3 w-full">
          <button 
            onClick={() => navigate(-1)} 
            className={`flex-none w-10 h-10 border border-on-surface/5 shadow-sm rounded-full flex items-center justify-center hover:bg-surface-container-low transition-colors ${darkMode ? 'bg-surface-container-high' : 'bg-white'}`}
          >
            <ArrowLeft size={20} className="text-on-surface" />
          </button>
          <div className={`flex-1 border border-on-surface/5 rounded-full flex items-center px-4 py-2.5 ${darkMode ? 'bg-surface-container-high' : 'bg-surface-container-low'}`}>
            <Search size={20} className="text-on-surface-variant/50 mr-3" />
            <input 
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50"
              autoFocus
            />
            <div className="flex items-center gap-3 ml-2">
              {searchQuery ? (
                <button onClick={() => setSearchQuery('')} className="text-on-surface-variant/50 hover:text-on-surface">
                  <X size={20} />
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setShowFilters(true)}
                    className="text-on-surface-variant/50 hover:text-on-surface transition-colors relative"
                  >
                    <SlidersHorizontal size={18} />
                    {(selectedCategory !== 'all' || sortBy !== 'relevance') && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
                    )}
                  </button>
                  <div className="w-[1px] h-4 bg-on-surface-variant/20"></div>
                  <div className="text-on-surface-variant/50 cursor-default">
                    <Camera size={18} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Quick Links (Only show when typing) */}
      {searchQuery.trim() !== '' && (
        <div className={`sticky top-[72px] z-30 h-10 flex items-center bg-transparent`}>
          <div className="flex overflow-x-auto no-scrollbar gap-1.5 px-4 w-full items-center">
            {categoriesWithSpecials.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-none px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-wider whitespace-nowrap transition-all duration-300 flex items-center gap-1 border border-transparent ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-white shadow-md shadow-primary/25 border-primary'
                    : `${darkMode ? 'bg-surface-container-high text-white hover:bg-white/5 border-white/5' : 'bg-white text-slate-800 border-slate-200/60 shadow-sm font-semibold'} border`
                }`}
              >
                <span className={selectedCategory === cat.id ? 'scale-110' : 'opacity-60'} style={{ transform: 'scale(0.85)' }}>
                  {getCategoryIcon(cat.key || cat.id)}
                </span>
                {getCategoryName(cat.id)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        {loading ? (
          <div className="text-center py-20 text-on-surface-variant font-black text-sm uppercase tracking-widest animate-pulse">{t('loading')}</div>
        ) : searchQuery.trim() === '' ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 mt-2"
          >
            {recentSearches.length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-sm text-on-surface">{t('recentSearches')}</h3>
                  <button 
                    onClick={clearAllRecent} 
                    className="text-[10px] text-primary font-bold uppercase tracking-widest hover:bg-primary/10 px-2 py-1 rounded-md transition-colors"
                  >
                    {t('clearAll')}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map(q => (
                    <button 
                      key={q} 
                      onClick={() => handleSearch(q)} 
                      className={`flex items-center gap-1.5 border border-on-surface/5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm hover:shadow-md transition-shadow text-on-surface ${darkMode ? 'bg-surface-container-high' : 'bg-white'}`}
                    >
                      <Clock size={12} className="text-on-surface-variant/50" />
                      {q}
                      <X 
                        size={14} 
                        className="ml-1 text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-container-low rounded-full p-0.5 transition-colors" 
                        onClick={(e) => removeRecentSearch(q, e)} 
                      />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="font-black text-sm mb-4 flex items-center gap-2 text-on-surface">
                <TrendingUp size={16} className="text-primary" /> 
                {t('popularSearches')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map(q => (
                  <button 
                    key={q} 
                    onClick={() => handleSearch(q)} 
                    className={`${darkMode ? 'bg-surface-container-high' : 'bg-surface-container-low'} px-4 py-2 rounded-full text-xs font-medium text-on-surface-variant hover:bg-primary hover:text-white transition-colors shadow-sm`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </section>
          </motion.div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredProducts.map((product, index) => {
              const cartItem = cart.find(c => c.id === product.id);
              const quantityInCart = cartItem ? cartItem.quantity : 0;
              const stats = getProductStats(product.id);

              const isSelected = selectedProduct?.id === product.id;
              let computedOrder = index;
              if (selectedProduct) {
                const S = filteredProducts.findIndex((x: any) => x.id === selectedProduct.id);
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
                    const isExpanding = selectedProduct?.id !== product.id;
                    setSelectedProduct(isExpanding ? product : null);
                    if (isExpanding) {
                      setSessionViews(prev => ({
                        ...prev,
                        [product.id]: (prev[product.id] || 0) + 1
                      }));
                    }
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  key={product.id} 
                  layout
                  transition={{
                    type: "spring",
                    stiffness: 140,
                    damping: 22,
                    mass: 0.8
                  }}
                  style={{ order: computedOrder }}
                  className={`${darkMode ? 'bg-surface-container-high' : 'bg-white'} rounded-[1.5rem] overflow-hidden relative group shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)] ${selectedProduct?.id === product.id ? 'col-span-2' : 'flex flex-col h-full'}`}
                >
                  {selectedProduct?.id === product.id ? (
                    <div className="flex flex-row h-full min-h-[160px]">
                      {/* Left: Image */}
                      <div className="relative w-2/5 min-w-[120px] overflow-hidden bg-[#FDFBF7]">
                        <img 
                          className={`w-full h-full object-cover ${product.isAvailable === false ? 'opacity-50' : ''}`} 
                          src={product.image} 
                          alt={product.name || product.title}
                          referrerPolicy="no-referrer"
                        />
                        {product.isAvailable === false && (
                          <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="bg-black/70 px-2 py-1 rounded-lg">
                              <span className="text-white font-black text-[8px] uppercase tracking-widest">{t('soldOut') || 'Sold Out'}</span>
                            </div>
                          </div>
                        )}
                        {!product.isBundle && (
                          <button 
                            onClick={(e) => {
                              e?.stopPropagation?.();
                              toggleFavorite(product.id);
                            }}
                            className={`absolute top-2 left-2 z-10 w-6 h-6 flex items-center justify-center bg-white/50 backdrop-blur-md rounded-full transition-all duration-300 active:scale-90 ${
                              favorites.includes(product.id) 
                                ? 'text-rose-500 shadow-sm' 
                                : 'text-slate-600 hover:text-rose-500'
                            }`}
                          >
                            <Heart size={12} fill={favorites.includes(product.id) ? "currentColor" : "none"} />
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
                              {getMainName(product)}
                            </h4>
                            <p className="text-on-surface-variant/70 text-[10px] font-medium mt-0.5">
                              {getSecondaryName(product)}
                            </p>
                          </div>
                          {product.description && (
                            <p className={`text-[10px] leading-relaxed mt-1.5 ${darkMode ? 'text-on-surface-variant/80' : 'text-slate-500'}`}>
                              {product.description}
                            </p>
                          )}
                          <p className="text-on-surface-variant/40 text-[8px] font-bold uppercase tracking-[0.1em] mt-2 pb-1">
                            {product.unit || (product.isBundle ? t('bundle') || 'Bundle' : '')}
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
                            {product.originalPrice && (
                              <span className="text-[9px] text-on-surface-variant/40 line-through font-bold">
                                {formatPrice(product.originalPrice * (quantityInCart || 1))}
                              </span>
                            )}
                            <p className="text-primary font-black text-base tracking-tighter">
                              {formatPrice(product.price * (quantityInCart || 1))}
                            </p>
                          </div>
                          
                          {quantityInCart > 0 ? (
                            <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-xl shadow-sm border border-on-surface/5">
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e?.stopPropagation?.();
                                  updateQuantity(product.id, -1);
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
                                  updateQuantity(product.id, 1);
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
                              onClick={() => addToCart(product)}
                              darkMode={darkMode}
                              disabled={product.isAvailable === false}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                  <div className="flex flex-col h-full">
                    {/* Image Section - Reduced height for compact look */}
                    <div className="relative h-32 w-full overflow-hidden bg-[#FDFBF7]">
                  <button 
                    onClick={(e) => {
                      e?.stopPropagation?.();
                      toggleFavorite(product.id);
                    }}
                    className={`absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center transition-all duration-300 active:scale-90 ${
                      favorites.includes(product.id) 
                        ? 'text-rose-500 drop-shadow-sm' 
                        : 'text-on-surface-variant/40 hover:text-rose-500/60'
                    }`}
                  >
                    <Heart size={14} fill={favorites.includes(product.id) ? "currentColor" : "none"} />
                  </button>
                  <img 
                    className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 ${product.isAvailable === false ? 'opacity-50' : ''}`} 
                    src={product.image} 
                    alt={product.name}
                    referrerPolicy="no-referrer"
                  />
                  {product.isAvailable === false && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      <div className="bg-black/70 px-3 py-1 rounded-lg">
                        <span className="text-white font-black text-[10px] uppercase tracking-widest">Sold Out</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>

                {/* Content Section - Compact and single-line price */}
                <div className="p-2 flex flex-col flex-1 justify-between gap-1">
                  <div className="space-y-1">
                    <div className="flex flex-col">
                      <h4 className="text-on-surface font-black text-xs leading-tight tracking-tight group-hover:text-primary transition-colors duration-300 truncate max-w-[70%]">
                        {getMainName(product)}
                      </h4>
                      <p className="text-on-surface-variant/60 text-[10px] font-medium leading-tight truncate mt-0.5 max-w-[50%]">
                        {getSecondaryName(product)}
                      </p>
                    </div>
                    <p className="text-on-surface-variant/40 text-[8px] font-bold uppercase tracking-[0.1em]">
                      {product.unit}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-primary font-black text-sm tracking-tighter">
                      {formatPrice(product.price)}
                    </p>
                    
                    <AddToCartButton 
                      onClick={() => addToCart(product)}
                      darkMode={darkMode}
                      disabled={product.isAvailable === false}
                    />
                  </div>
                </div>
              </div>
              )}
              </motion.div>
            ); })}
          </div>
        ) : (
          <div className="text-center py-20 text-on-surface-variant">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium text-on-surface">{t('noItemsFound')}</p>
            <p className="text-xs mt-1">{t('trySearchingAgain')}</p>
          </div>
        )}
      </div>

      {/* Filter Bottom Sheet */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-[2rem] z-50 p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-on-surface">{t('filterAndSort')}</h2>
                <button onClick={() => setShowFilters(false)} className="p-2 bg-surface-container-low rounded-full hover:bg-on-surface/5">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Sort By */}
                <section>
                  <h3 className="text-sm font-black text-on-surface mb-3 uppercase tracking-widest">{t('sortBy')}</h3>
                  <div className="space-y-2">
                    {SORT_OPTIONS.map(option => (
                      <button
                        key={option.id}
                        onClick={() => setSortBy(option.id)}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors"
                      >
                        <span className={`text-sm font-medium ${sortBy === option.id ? 'text-primary' : 'text-on-surface'}`}>
                          {t(option.key)}
                        </span>
                        {sortBy === option.id && <Check size={18} className="text-primary" />}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Categories */}
                <section>
                  <h3 className="text-sm font-black text-on-surface mb-3 uppercase tracking-widest">{t('category')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {categoriesWithSpecials.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all duration-300 shadow-sm flex items-center gap-1.5 border ${
                          selectedCategory === cat.id
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                            : `${darkMode ? 'bg-surface-container-high text-on-surface-variant' : 'bg-white text-on-surface-variant'} border-on-surface/5 hover:bg-on-surface/5`
                        }`}
                      >
                        <span className={selectedCategory === cat.id ? 'scale-110' : 'opacity-60'}>
                          {getCategoryIcon(cat.key || cat.id)}
                        </span>
                        {getCategoryName(cat.id)}
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={resetFilters}
                  className="flex-1 py-4 rounded-2xl font-black text-sm bg-surface-container-low text-on-surface hover:bg-on-surface/5 transition-colors"
                >
                  {t('reset')}
                </button>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="flex-[2] py-4 rounded-2xl font-black text-sm bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
                >
                  {t('applyFilters')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Scanner UI Overlay */}
      <AnimatePresence>
        {showScanner && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
          >
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
              <button 
                onClick={() => { setShowScanner(false); setIsScanning(false); }}
                className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <X size={24} />
              </button>
              <span className="text-white font-black tracking-widest uppercase text-sm">{t('productScanner')}</span>
              <div className="w-10"></div> {/* Spacer for centering */}
            </div>

            {/* Scanner Frame */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80">
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-2xl"></div>
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-2xl"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-2xl"></div>

              {/* Scanning Animation */}
              {isScanning && (
                <>
                  <motion.div 
                    animate={{ y: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 left-0 right-0 h-1 bg-primary shadow-[0_0_15px_rgba(var(--color-primary),0.8)] z-10"
                  />
                  <div className="absolute inset-0 bg-primary/10 animate-pulse rounded-xl"></div>
                </>
              )}

              {/* Center Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <ScanLine size={48} className="text-white/30" />
              </div>
            </div>

            {/* Status Text */}
            <div className="absolute bottom-24 left-0 right-0 text-center px-6">
              <p className="text-white/80 text-sm font-medium">
                {scanStatus === "Analyzing product image with AI..." ? t('analyzingProduct') : scanStatus.startsWith('Found:') ? `${t('found')}: ${scanStatus.split(': ')[1]}` : scanStatus === "Failed to recognize product. Please try again." ? t('failedToRecognize') : scanStatus}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Summary Bar */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-0 right-0 px-4 z-40"
          >
            <div className={`${darkMode ? 'bg-surface-container-high/90' : 'bg-white/90'} backdrop-blur-2xl rounded-2xl p-2.5 flex items-center justify-between shadow-lg border border-primary/10`}>
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


    </div>
  );
}
