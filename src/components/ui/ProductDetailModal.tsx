import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
}

export function ProductDetailModal({ isOpen, onClose, product }: ProductDetailModalProps) {
  const { 
    darkMode, 
    language, 
    t, 
    addToCart, 
    favorites, 
    toggleFavorite,
    formatPrice,
    getMainName,
    getSecondaryName
  } = useStore();

  const [quantity, setQuantity] = useState(1);

  // Reset quantity when product changes
  useEffect(() => {
    setQuantity(1);
  }, [product]);

  if (!product) return null;

  const isFavorite = favorites.includes(product.id);

  const handleAddToCart = () => {
    // Add multiple quantities
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              className={`w-full max-w-sm overflow-hidden rounded-2xl pointer-events-auto flex flex-col shadow-2xl ${
                darkMode ? 'bg-surface-container-highest text-white border border-white/10' : 'bg-white text-slate-900'
              }`}
            >
              {/* Header Image */}
              <div className="relative h-64 w-full bg-slate-100 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="absolute top-4 left-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md hover:bg-black/40 transition-colors"
                >
                  <X size={18} strokeWidth={3} />
                </button>
                
                {!product.isBundle && (
                  <button
                    onClick={() => toggleFavorite(product.id)}
                    className={`absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-md transition-colors ${
                      isFavorite ? 'bg-white text-rose-500 shadow-md' : 'bg-black/20 text-white hover:bg-black/40'
                    }`}
                  >
                    <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
                  </button>
                )}

                <img 
                  src={product.image} 
                  alt={getMainName(product)} 
                  className="w-full h-full object-cover"
                />

                {product.isAvailable === false && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-black text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest">
                      {t('soldOut') || 'Sold Out'}
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col flex-1 max-h-[50vh] overflow-y-auto no-scrollbar">
                <div className="space-y-4">
                  {/* Title and Price */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-black leading-tight tracking-tight">
                        {getMainName(product)}
                      </h3>
                      <p className={`text-sm font-medium mt-1 ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>
                        {getSecondaryName(product)}
                      </p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${darkMode ? 'text-white/40' : 'text-slate-400'}`}>
                        {product.unit || (product.isBundle ? t('bundle') || 'Bundle' : '')}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {product.originalPrice && (
                        <p className={`text-xs line-through font-bold ${darkMode ? 'text-white/40' : 'text-slate-400'}`}>
                          {formatPrice(product.originalPrice)}
                        </p>
                      )}
                      <p className="text-primary font-black text-2xl tracking-tighter">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {product.description && (
                    <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                      <p className={`text-sm leading-relaxed ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>
                        {product.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              {product.isAvailable !== false && (
                <div className={`p-6 pt-4 border-t flex flex-col gap-4 flex-shrink-0 ${darkMode ? 'border-white/10 bg-surface-container-high' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${darkMode ? 'text-white/60' : 'text-slate-500'}`}>Quantity</span>
                    <div className={`flex items-center gap-4 px-4 py-2 rounded-full ${darkMode ? 'bg-black/40' : 'bg-white shadow-sm border border-slate-200'}`}>
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ${darkMode ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
                      >
                        <Minus size={18} strokeWidth={3} />
                      </button>
                      <span className="font-black text-lg w-4 text-center">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(quantity + 1)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors active:scale-95 ${darkMode ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
                      >
                        <Plus size={18} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleAddToCart}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:opacity-90"
                  >
                    <ShoppingCart size={18} strokeWidth={2.5} />
                    {t('addToCart') || 'Add to Cart'} • {formatPrice(product.price * quantity)}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
