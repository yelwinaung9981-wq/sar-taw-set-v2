import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ChevronLeft, Heart, Plus, Minus, ShoppingCart, Search, Trash2, Eye, X } from 'lucide-react';
import { AddToCartButton } from '../components/AddToCartButton';
import { motion, AnimatePresence } from 'motion/react';
import { collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function FavoritesPage() {
  const { favorites, toggleFavorite, addToCart, updateQuantity, cart, cartTotal, clearCart, t, darkMode, formatPrice, getMainName, getSecondaryName, getCategoryName, isProfileLoaded, products } = useStore();
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const handleBack = () => {
    navigate(-1);
  };

  const favoriteProducts = products.filter(p => favorites.includes(p.id) && p.isAvailable !== false);
  const isLoading = !isProfileLoaded;

  return (
    <div className={`min-h-screen pb-32 transition-colors duration-300 ${darkMode ? 'bg-surface' : 'bg-surface'}`}>
      <header className={`fixed top-0 w-full z-50 backdrop-blur-xl px-4 h-[72px] flex items-center justify-between border-b transition-colors duration-300 ${darkMode ? 'bg-surface/80 border-on-surface/5' : 'bg-surface/80 border-on-surface/5'}`}>
        <button 
          onClick={handleBack}
          className={`relative z-10 -ml-2 p-2 rounded-full flex items-center justify-center transition-all active:scale-90 text-on-surface-variant ${darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
        >
          <ChevronLeft size={24} className="stroke-[2.5]" />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h2 className="text-lg font-black text-on-surface tracking-tight">{t('myFavorites')}</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="pt-24 px-4">
        {isLoading ? (
          <div className="py-24 text-center space-y-6">
            <div className="flex justify-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
              />
            </div>
            <p className="text-on-surface-variant font-black text-xs uppercase tracking-widest animate-pulse">Restoring Favorites...</p>
          </div>
        ) : favoriteProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 grid-flow-row-dense">
            {favoriteProducts.map(product => {
              const cartItem = cart.find(c => c.id === product.id);
              const quantityInCart = cartItem ? cartItem.quantity : 0;
              return (
                <motion.div 
                  onClick={() => setSelectedProduct(selectedProduct?.id === product.id ? null : product)}
                  layout
                  transition={{
                    type: "spring",
                    stiffness: 140,
                    damping: 22,
                    mass: 0.8
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={product.id} 
                  className={`rounded-xl overflow-hidden relative shadow-sm ${darkMode ? 'bg-surface-container-high' : 'bg-surface-container-lowest'} ${selectedProduct?.id === product.id ? 'col-span-2' : 'flex flex-col h-full'}`}
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
                          <p className="text-on-surface-variant/40 text-[8px] font-bold uppercase tracking-[0.1em] mt-2 pb-2">
                            {product.unit || (product.isBundle ? t('bundle') || 'Bundle' : '')}
                          </p>
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
                  <button 
                  onClick={() => toggleFavorite(product.id)}
                  className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center transition-all duration-300 active:scale-90 text-rose-500 drop-shadow-sm"
                >
                  <Heart size={14} fill="currentColor" />
                </button>

                <div className={`h-32 w-full ${darkMode ? 'bg-surface-container-low' : 'bg-[#FDFBF7]'} relative`}>
                  <img 
                    className={`w-full h-full object-cover ${product.isAvailable === false ? 'opacity-50' : ''}`} 
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
                </div>

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
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-primary font-black text-sm tracking-tighter">{formatPrice(product.price)}</p>
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
          <div className="py-24 text-center space-y-6">
            <div className={`w-20 h-20 rounded-xl flex items-center justify-center mx-auto shadow-sm ${darkMode ? 'bg-surface-container-high' : 'bg-surface-container-lowest'}`}>
              <Heart size={32} className="text-rose-200" />
            </div>
            <div className="space-y-2">
              <p className="text-on-surface font-black text-lg tracking-tight">{t('noFavoritesYet')}</p>
              <p className="text-on-surface-variant/60 text-xs font-medium">{t('noFavoritesDescription')}</p>
              <button 
                onClick={() => navigate('/menu')}
                className="mt-4 px-6 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
              >
                {t('exploreMenu')}
              </button>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-0 right-0 px-4 z-40"
          >
            <div className={`backdrop-blur-2xl rounded-2xl p-2.5 flex items-center justify-between shadow-lg border border-primary/10 ${darkMode ? 'bg-surface-container-high/90' : 'bg-surface-container-lowest/90'}`}>
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
