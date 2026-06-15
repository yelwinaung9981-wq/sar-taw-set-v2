import React, { useState, useEffect } from 'react';
import { ChevronRight, FileText, Printer, ArrowLeft, Phone, MessageCircle, Truck, User, Check, ShoppingBag, Package, Bike, Home, XCircle, RotateCw, ExternalLink, X, Eye, Receipt, ZoomIn, ZoomOut } from 'lucide-react';
import { Order, useStore } from '../../context/StoreContext';
import { getWhatsAppLink } from '../../lib/messaging';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const parseOrderDate = (createdAt: any, timestamp?: any): Date => {
  if (!createdAt) {
    if (timestamp) return new Date(timestamp);
    return new Date();
  }
  if (typeof createdAt === "string" || typeof createdAt === "number") {
    return new Date(createdAt);
  }
  if (createdAt instanceof Date) {
    return createdAt;
  }
  if (typeof createdAt === "object") {
    if (typeof createdAt.toDate === "function") {
      return createdAt.toDate();
    }
    if (typeof createdAt.seconds === "number") {
      return new Date(createdAt.seconds * 1000);
    }
  }
  return new Date();
};

export default function OrderDetailsView({
  order,
  darkMode,
  formatPrice,
  t,
  onClose,
  handlePrint,
  updateStatus
}: {
  order: Order;
  darkMode: boolean;
  formatPrice: (p: number) => string;
  t: (key: string) => string;
  onClose: () => void;
  handlePrint: (order: Order, format: 'a4' | 'thermal' | 'pdf') => void;
  updateStatus: (id: string, s: string, reason?: string) => void;
}) {
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';
  const isPending = order.status === 'pending';
  
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Items out of stock");
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [itemToCancel, setItemToCancel] = useState<{ id: string; index: number; name: string } | null>(null);

  useEffect(() => {
    if (isReceiptModalOpen) {
      document.body.classList.add('receipt-lightbox-open');
    } else {
      document.body.classList.remove('receipt-lightbox-open');
    }
    return () => {
      document.body.classList.remove('receipt-lightbox-open');
    };
  }, [isReceiptModalOpen]);

  const handleCancelClick = () => {
    setIsCancelModalOpen(true);
  };
  
  const submitCancellation = () => {
    updateStatus(order.id, 'cancelled', cancelReason);
    setIsCancelModalOpen(false);
  };
  
  const { updateDeliveryStatus, cancelOrderItem } = useStore();
  const handleSendToWhatsApp = () => {
    let itemsStr = order.items.map(i => `- ${i.quantity} x ${i.name}`).join('\n');
    let msg = `*NEW DELIVERY ORDER*\n\n`;
    msg += `*Order ID:* #${order.id.slice(-6).toUpperCase()}\n`;
    msg += `*Customer:* ${order.customerName}\n`;
    msg += `*Phone:* ${order.customerPhone}\n\n`;
    
    msg += `*DELIVERY LOCATION*\n`;
    if (order.roomNumber) {
      msg += `${order.roomNumber.replace(/^(Apt\\.?\\s*|Apartment\\s*|Room\\s*)/i, '')}\n`;
    }
    if (order.address) {
      msg += `${order.address.replace(/^(Apt\\.?\\s*|Apartment\\s*|Room\\s*)/i, '')}\n`;
    }
    
    msg += `\n*ORDER ITEMS*\n${itemsStr}\n\n`;
    msg += `*Total Amount:* ${formatPrice(order.total)}\n`;
    if (order.paymentMethod) {
       msg += `*Payment Method:* ${order.paymentMethod.replace(/_/g, ' ').toUpperCase()}\n`;
    }

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className={`p-2.5 rounded-full transition-all hover:-translate-x-1 active:scale-95 ${
              darkMode
                ? "bg-white/5 hover:bg-white/10 text-primary"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100"
            }`}
          >
            <ChevronRight size={18} className="rotate-180" />
          </button>
          <div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  darkMode ? "text-on-surface" : "text-emerald-900"
                }`}
              >
                Order ID: #{order.id.slice(-8).padStart(8, '0')}
              </h2>
              <span
                className={`text-xs font-bold uppercase tracking-widest ${
                  darkMode ? "text-on-surface-variant/40" : "text-gray-400"
                }`}
              >
                {parseOrderDate(order.createdAt, order.timestamp).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className={`text-sm sm:text-base font-black ${
                  darkMode ? "text-primary" : "text-emerald-600"
                }`}
              >
                {order.customerName} ({order.customerPhone})
              </span>
              <div className="flex items-center gap-1 ml-2">
                <a 
                  href={`tel:${order.customerPhone}`}
                  className={`p-1.5 rounded-full transition-all ${
                    darkMode ? "bg-white/5 hover:bg-white/10 text-on-surface-variant" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  }`}
                  title="Call Customer"
                >
                  <Phone size={14} />
                </a>
                <a 
                  href={getWhatsAppLink(order.customerPhone, `Hi ${order.customerName}, about your order #ID: ${order.id.slice(-8).padStart(8, '0')}...`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1.5 rounded-full transition-all bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20`}
                  title="WhatsApp Customer"
                >
                  <MessageCircle size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Grid Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Customer & Location */}
        <div
          className={`p-4 rounded-xl border flex flex-col gap-2 ${
            darkMode ? "bg-surface-container-high/40 border-white/5" : "bg-white border-gray-100 shadow-sm"
          }`}
        >
          <p
            className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
              darkMode ? "text-on-surface-variant/40" : "text-gray-400"
            }`}
          >
            Delivery Location
          </p>
            <div className="flex flex-col break-words whitespace-normal">
              <span className={`text-sm md:text-base font-black break-words whitespace-normal ${darkMode ? "text-on-surface" : "text-emerald-950"}`}>
                {order.roomNumber?.replace(/^(Apt\.?\s*|Apartment\s*|Room\s*)/i, '')}
              </span>
              {order.address && (
                  <span className={`text-[10px] md:text-xs font-bold mt-0.5 leading-tight break-words whitespace-normal ${
                    darkMode ? "text-on-surface/70" : "text-slate-700"
                  }`}>
                      {order.address.replace(/^(Apt\.?\s*|Apartment\s*|Room\s*)/i, '')}
                  </span>
              )}
          </div>
          {(order.deliveryDate || order.deliveryDay) && (
            <div className={`mt-auto pt-3 border-t ${darkMode ? 'border-white/5' : 'border-gray-50'}`}>
                <span className={`text-xs font-bold ${darkMode ? "text-primary" : "text-emerald-600"}`}>
                  {order.deliveryDay} {order.deliveryDate ? `(${order.deliveryDate})` : ''}
                </span>
            </div>
          )}
        </div>

        {/* Order Info */}
        <div
          className={`p-4 rounded-xl border flex flex-col gap-2 ${
            darkMode ? "bg-surface-container-high/40 border-white/5" : "bg-white border-gray-100 shadow-sm"
          }`}
        >
          <div className="flex justify-between items-start">
             <div>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
                  darkMode ? "text-on-surface-variant/40" : "text-gray-400"
                }`}>
                  Total Amount
                </p>
                <p className={`text-xl font-black ${darkMode ? "text-primary" : "text-emerald-600"}`}>
                  {formatPrice(order.total)}
                </p>
             </div>
             <div className="text-right">
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
                  darkMode ? "text-on-surface-variant/40" : "text-gray-400"
                }`}>
                  Items
                </p>
                <p className={`text-xl font-black ${darkMode ? "text-on-surface" : "text-emerald-950"}`}>
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                </p>
             </div>
          </div>
          <div className={`mt-auto pt-3 border-t flex justify-between items-center ${darkMode ? 'border-white/5' : 'border-gray-50'}`}>
              <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-on-surface-variant/40" : "text-gray-400"}`}>
                Payment
              </span>
              <span className={`text-xs font-bold uppercase ${darkMode ? "text-on-surface" : "text-emerald-900"}`}>
                {order.paymentMethod}
              </span>
          </div>
        </div>

        {/* Order Status Tracker & Note */}
        <div className={`p-4 rounded-xl border flex flex-col gap-4 col-span-1 lg:col-span-2 ${
          darkMode ? "bg-surface-container-high/40 border-white/5" : "bg-white border-gray-100 shadow-sm"
        }`}>
          <div className="flex justify-between items-center">
            <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-on-surface-variant/50" : "text-gray-400"}`}>
              {order.status === 'cancelled' ? 'Order Cancelled' : 'Order Status'}
            </span>
            {!isCancelled && order.status !== 'delivered' && (
              <button
                onClick={handleCancelClick}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  darkMode ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                }`}
              >
                <XCircle size={12} />
                Cancel Order
              </button>
            )}
          </div>

          {!isCancelled ? (
            <div className="flex items-center w-full mt-4 mb-6 px-1 lg:px-4">
              {['pending', 'preparing', 'on_the_way', 'delivered'].map((s, idx, arr) => {
                const isActive = 
                  (s === 'pending') ||
                  (s === 'preparing' && ['preparing', 'on_the_way', 'delivered'].includes(order.status)) ||
                  (s === 'on_the_way' && ['on_the_way', 'delivered'].includes(order.status)) ||
                  (s === 'delivered' && order.status === 'delivered');

                const isCurrent = order.status === s;
                const isLast = idx === arr.length - 1;

                const getIcon = () => {
                   if (s === 'pending') return <ShoppingBag size={14} />;
                   if (s === 'preparing') return <Package size={14} />;
                   if (s === 'on_the_way') return <Bike size={14} />;
                   return <Home size={14} />;
                };

                return (
                  <React.Fragment key={s}>
                    <button 
                      onClick={() => updateStatus(order.id, s)}
                      className="flex flex-col items-center gap-2 relative group focus:outline-none"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all ${
                        isActive 
                          ? (isCurrent 
                              ? (darkMode ? "bg-primary border-primary text-surface shadow-lg shadow-primary/20 scale-110" : "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-110")
                              : (darkMode ? "bg-primary/20 border-primary/50 text-primary" : "bg-emerald-100 border-emerald-300 text-emerald-600"))
                          : (darkMode ? "bg-white/5 border-white/10 text-on-surface-variant/40 group-hover:bg-white/10" : "bg-gray-50 border-gray-200 text-gray-400 group-hover:bg-gray-100")
                      }`}>
                        {getIcon()}
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest absolute -bottom-6 whitespace-nowrap transition-all ${
                        isCurrent 
                           ? (darkMode ? "text-primary" : "text-emerald-700")
                           : isActive 
                               ? (darkMode ? "text-on-surface" : "text-gray-900") 
                               : (darkMode ? "text-on-surface-variant/40" : "text-gray-400")
                      }`}>
                        {s === 'pending' ? 'Placed' : s === 'preparing' ? 'Preparing' : s === 'on_the_way' ? 'On Way' : 'Delivered'}
                      </span>
                    </button>
                    {!isLast && (
                      <div className={`flex-1 h-1 mx-2 rounded-full transition-colors ${
                        isActive && arr[idx + 1] && (
                          (arr[idx + 1] === 'preparing' && ['preparing', 'on_the_way', 'delivered'].includes(order.status)) ||
                          (arr[idx + 1] === 'on_the_way' && ['on_the_way', 'delivered'].includes(order.status)) ||
                          (arr[idx + 1] === 'delivered' && order.status === 'delivered')
                        )
                          ? (darkMode ? "bg-primary" : "bg-emerald-500")
                          : (darkMode ? "bg-white/5" : "bg-gray-100")
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
             <div className="py-4 flex flex-col items-center justify-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500">
                <XCircle size={24} />
                <span className="text-xs font-black uppercase tracking-widest">Order Cancelled</span>
             </div>
          )}

          {/* Note & Attachment */}
          {(order.note || order.paymentScreenshot) && (
            <div className={`mt-auto pt-3 border-t flex flex-col gap-3 ${darkMode ? 'border-white/5' : 'border-gray-50'}`}>
               {order.note && (
                 <div>
                   <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Customer Note</p>
                   <p className="text-xs font-medium leading-relaxed italic opacity-80">"{order.note}"</p>
                 </div>
               )}
                {order.paymentScreenshot && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Payment Receipt</p>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => {
                          setRotation(0);
                          setZoomLevel(1);
                          setIsReceiptModalOpen(true);
                        }}
                        className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full ${
                          darkMode ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        } transition-colors`}
                      >
                        <Eye size={12} />
                        View Built-in Receipt
                      </button>
                      <button 
                        onClick={() => window.open(order.paymentScreenshot, '_blank')}
                        className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full ${
                          darkMode ? "bg-white/5 text-on-surface-variant hover:bg-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        } transition-colors`}
                        title="Open image in separate window"
                      >
                        <ExternalLink size={12} />
                        Open Original Tab
                      </button>
                    </div>
                  </div>
               )}
            </div>
          )}
        </div>
      </div>

      {/* Delivery Assignment via WhatsApp Section */}
      <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
        darkMode ? "bg-surface-container-high/40 border-white/5" : "bg-white border-gray-100 shadow-sm"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? "bg-primary/10 text-primary" : "bg-emerald-50 text-emerald-600"}`}>
              <MessageCircle size={16} />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-on-surface-variant/50" : "text-gray-400"}`}>
                Delivery Assignment
              </p>
              <p className={`text-sm font-black ${darkMode ? "text-on-surface" : "text-gray-900"}`}>
                Share via WhatsApp
              </p>
            </div>
          </div>
        </div>

        {!isDelivered && !isCancelled && (
          <div className={`pt-3 border-t ${darkMode ? 'border-white/5' : 'border-gray-50'} flex flex-col gap-2`}>
            <button
              onClick={handleSendToWhatsApp}
              className={`py-2 px-4 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                darkMode ? "bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30" : "bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20"
              }`}
            >
              <MessageCircle size={14} /> Send to Delivery Driver
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div
        className={`rounded-xl border overflow-hidden ${
          darkMode ? "bg-surface-container-high/40 border-white/5" : "bg-white border-gray-100 shadow-sm"
        }`}
      >
        <div
          className={`px-5 py-3 flex items-center justify-between ${
            darkMode ? "bg-white/[0.03]" : "bg-gray-50/80 border-b border-gray-100"
          }`}
        >
          <h3
            className={`text-[9px] font-black uppercase tracking-[0.25em] ${
              darkMode ? "text-primary" : "text-emerald-600"
            }`}
          >
            ORDER ITEMS
          </h3>
          <span
            className={`text-[9px] font-black px-2.5 py-1 rounded-md ${
              darkMode
                ? "bg-white/5 text-on-surface-variant/50"
                : "bg-white border border-gray-100 text-gray-400 shadow-sm uppercase tracking-tighter"
            }`}
          >
            {order.items.length} Unique Items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr
                className={`border-b ${
                  darkMode ? "border-white/5" : "border-gray-50"
                }`}
              >
                <th className="py-3 px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 w-[40px] sm:w-[50px] text-center">
                  #
                </th>
                <th className="py-3 px-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {t("itemName")}
                </th>
                <th className="py-3 px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 text-right w-[80px] sm:w-[100px]">
                  {t("price")}
                 </th>
                <th className="py-3 px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 text-center w-[60px] sm:w-[80px]">
                  QTY
                </th>
                <th className="py-3 px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 text-right w-[80px] sm:w-[100px]">
                  TOTAL
                </th>
                {!isCancelled && !isDelivered && (
                  <th className="py-3 px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 text-center w-[80px] sm:w-[100px]">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <React.Fragment key={item.id ? `item-f-${item.id}-${i}` : `item-f-idx-${i}`}>
                  <tr
                    className={`group border-b last:border-0 transition-colors ${
                      darkMode
                        ? "border-white/5 hover:bg-white/5"
                        : "border-gray-50 hover:bg-emerald-50/30"
                    } ${item.isCancelled ? 'opacity-50' : ''}`}
                  >
                    <td
                      className={`py-3 px-4 text-[10px] sm:text-[11px] font-black text-center ${
                        darkMode ? "text-on-surface-variant/40" : "text-gray-400"
                      } ${item.isCancelled ? 'line-through opacity-50' : ''}`}
                    >
                      {i + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        {/* Product Thumbnail Image */}
                        <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border bg-slate-50 dark:bg-black/20 ${darkMode ? 'border-white/5' : 'border-slate-100'}`}>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] opacity-40 font-bold uppercase tracking-widest">
                              No Img
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`text-xs sm:text-sm font-bold truncate ${
                              item.isCancelled ? 'line-through text-on-surface-variant/60' : (darkMode ? "text-on-surface" : "text-gray-900")
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.isCancelled ? (
                            <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">
                              Cancelled / Out of Stock
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td
                      className={`py-3 px-4 text-[10px] sm:text-xs font-bold text-right ${
                        darkMode ? "text-on-surface-variant/70" : "text-gray-500"
                      } ${item.isCancelled ? 'line-through opacity-50' : ''}`}
                    >
                      <span className="opacity-70">{formatPrice(item.price)}</span>
                    </td>
                    <td
                      className={`py-3 px-4 text-xs sm:text-sm font-black text-center ${
                        darkMode ? "text-on-surface" : "text-emerald-950"
                      } ${item.isCancelled ? 'line-through opacity-50' : ''}`}
                    >
                      x{item.quantity}
                    </td>
                    <td
                      className={`py-3 px-4 text-[10px] sm:text-xs font-black text-right ${
                        darkMode ? "text-primary" : "text-emerald-600"
                      } ${item.isCancelled ? 'line-through opacity-50' : ''}`}
                    >
                      {formatPrice(item.price * item.quantity)}
                    </td>
                    {!isCancelled && !isDelivered && (
                      <td className="py-3 px-4 text-center">
                        {item.isCancelled ? (
                          <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider block">
                            ဖျက်ပြီး
                          </span>
                        ) : (
                          <button
                            onClick={() => setItemToCancel({ id: item.id || '', index: i, name: item.name })}
                            className={`p-1.5 rounded-lg border transition-all hover:bg-rose-500 hover:text-white ${
                              darkMode 
                                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                                : 'bg-rose-50 border-rose-100 text-rose-600'
                            }`}
                            title="ဖျက်ရန် (Cancel specific item)"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>

                  {itemToCancel && itemToCancel.id === item.id && itemToCancel.index === i && (
                    <tr className="animate-fade-in bg-rose-500/[0.04] dark:bg-rose-500/[0.08]">
                      <td colSpan={(!isCancelled && !isDelivered) ? 6 : 5} className="p-0 border-b border-rose-500/20">
                        <div className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          darkMode ? 'text-on-surface' : 'text-slate-800'
                        }`}>
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-full flex-shrink-0 mt-0.5 animate-pulse">
                              <XCircle size={18} />
                            </div>
                            <div className="space-y-1 text-left">
                              <h4 className="text-xs sm:text-xs font-black uppercase tracking-wider text-rose-500">
                                ပါဝင်ပစ္စည်း ဖျက်သိမ်းခြင်း (Cancel Specific Item)
                              </h4>
                              <p className={`text-xs sm:text-xs leading-relaxed max-w-xl opacity-90 font-medium`}>
                                ယခုအော်ဒါထဲမှ သင်ရွေးချယ်ထားသော <span className="font-extrabold text-rose-500">"{item.name}"</span> ကို ဖျက်သိမ်းရန် သေချာပါသလား? ဤလုပ်ဆောင်ချက်သည် စုစုပေါင်းကျသင့်ငွေကို အလိုအလျောက် ပြန်လည်တွက်ချက်ပေးမည်ဖြစ်သည်။
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => setItemToCancel(null)}
                              className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-black transition-all ${
                                darkMode
                                  ? 'bg-slate-800 hover:bg-slate-700 text-white border border-white/5'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              မလုပ်တော့ပါ (Keep)
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await cancelOrderItem(order.id, itemToCancel.id, itemToCancel.index, `Cancelled: ${itemToCancel.name}`);
                                } catch (e) {
                                  console.error(e);
                                } finally {
                                  setItemToCancel(null);
                                }
                              }}
                              className="px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-black text-white bg-rose-500 hover:bg-rose-600 transition-all shadow-md shadow-rose-500/15"
                            >
                              ဖျက်သိမ်းမည် (Cancel)
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div className={`p-4 flex flex-col items-end border-t ${darkMode ? "border-white/5 bg-white/[0.02]" : "border-gray-100 bg-gray-50"}`}>
             <div className="flex items-center gap-4 text-sm">
                <span className={`font-bold ${darkMode ? "text-on-surface-variant/60" : "text-gray-500"}`}>Subtotal</span>
                <span className={`font-black ${darkMode ? "text-on-surface" : "text-gray-900"}`}>{formatPrice(order.total - (order.deliveryFee || 0) + (order.pointDiscount || 0))}</span>
             </div>
             {order.deliveryFee > 0 && (
                 <div className="flex items-center gap-4 text-sm mt-1">
                    <span className={`font-bold ${darkMode ? "text-on-surface-variant/60" : "text-gray-500"}`}>Delivery Fee</span>
                    <span className={`font-black ${darkMode ? "text-on-surface" : "text-gray-900"}`}>{formatPrice(order.deliveryFee)}</span>
                 </div>
             )}
             {order.pointDiscount && order.pointDiscount > 0 ? (
                 <div className="flex items-center gap-4 text-sm mt-1">
                    <span className={`font-bold text-amber-500`}>Points Discount ({order.pointsUsed || 0} pts)</span>
                    <span className={`font-black text-amber-500`}>-{formatPrice(order.pointDiscount)}</span>
                 </div>
             ) : null}
             <div className="flex items-center gap-4 text-lg sm:text-xl mt-3 pt-3 border-t border-dashed border-gray-300 dark:border-white/20 w-fit self-end">
                <span className={`font-black uppercase tracking-widest text-[10px] ${darkMode ? "text-on-surface-variant/60" : "text-gray-500"}`}>Total</span>
                <span className={`font-black ${darkMode ? "text-primary" : "text-emerald-600"}`}>{formatPrice(order.total)}</span>
             </div>
             {order.earnedPoints && order.earnedPoints > 0 ? (
               <div className="flex items-center gap-2 mt-1 w-fit self-end text-xs">
                   <span className={`font-black uppercase tracking-widest text-[10px] ${darkMode ? "text-on-surface-variant/40" : "text-gray-400"}`}>
                     Points Earned:
                   </span>
                   <span className={`font-black ${darkMode ? "text-primary" : "text-emerald-600"}`}>
                     +{order.earnedPoints} pts
                   </span>
               </div>
             ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
         <button
          onClick={() => handlePrint(order, 'thermal')}
          className={`flex-1 py-4 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all active:scale-95 ${
            darkMode
              ? "bg-primary text-surface shadow-lg shadow-primary/20 hover:bg-primary/90 border-transparent"
              : "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 border-transparent"
          }`}
        >
          <Printer size={16} />
          <span className="text-xs font-black uppercase tracking-widest">
            Print Thermal Receipt
          </span>
        </button>
        <button
          onClick={() => handlePrint(order, 'a4')}
          className={`flex-1 py-4 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all active:scale-95 ${
            darkMode
              ? "bg-white/5 border-white/10 hover:bg-white/10 text-on-surface"
              : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm"
          }`}
        >
          <Printer size={16} />
          <span className="text-xs font-black uppercase tracking-widest">
            Print A4 Invoice
          </span>
        </button>
      </div>

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCancelModalOpen(false)}
          />
          <div className={`relative w-full max-w-sm rounded-2xl p-6 shadow-2xl ${darkMode ? 'bg-surface-container-high' : 'bg-white'}`}>
            <h3 className={`text-lg font-black mb-4 ${darkMode ? 'text-on-surface' : 'text-gray-900'}`}>
              Cancel Order
            </h3>
            <p className={`text-sm mb-4 ${darkMode ? 'text-on-surface-variant' : 'text-gray-600'}`}>
              Please provide a reason for cancelling this order. The customer will be able to see this reason.
            </p>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Items out of stock"
              className={`w-full p-3 rounded-xl mb-6 text-sm outline-none transition-all ${
                darkMode
                  ? 'bg-black/20 text-on-surface focus:bg-black/40 border border-white/5 focus:border-primary/50'
                  : 'bg-gray-50 text-gray-900 focus:bg-white border border-gray-200 focus:border-emerald-500'
              }`}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  darkMode
                    ? 'bg-white/5 hover:bg-white/10 text-on-surface'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Back
              </button>
              <button
                onClick={submitCancellation}
                disabled={!cancelReason.trim()}
                className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all ${
                  !cancelReason.trim()
                    ? 'bg-rose-400 opacity-50 cursor-not-allowed'
                    : 'bg-rose-500 shadow-lg shadow-rose-500/20 hover:bg-rose-600'
                }`}
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Image Lightbox Modal */}
      {isReceiptModalOpen && order.paymentScreenshot && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 md:p-[2vh]">
          <div 
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => {
              setIsReceiptModalOpen(false);
              setRotation(0);
              setZoomLevel(1);
            }}
          />
          
          {/* Main Lightbox Box Container */}
          <div className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[calc(100vh-100px)] border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Light-Themed Header Controls */}
            <div className="relative w-full flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Receipt size={18} />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 leading-none">Bank Receipt Preview</h4>
                  <p className="text-[10px] font-black tracking-tighter text-slate-400 uppercase mt-1">Order #{order.id.slice(-6).toUpperCase()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Zoom Buttons */}
                <button
                  onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                  title="Zoom Out"
                  className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-30"
                  disabled={zoomLevel <= 0.5}
                >
                  <ZoomOut size={16} />
                </button>
                
                <span className="text-xs font-mono text-slate-600 min-w-12 text-center select-none font-bold">
                  {Math.round(zoomLevel * 100)}%
                </span>

                <button
                  onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                  title="Zoom In"
                  className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-30"
                  disabled={zoomLevel >= 3}
                >
                  <ZoomIn size={16} />
                </button>

                <div className="w-px h-6 bg-slate-200 mx-1" />

                {/* Rotate Left */}
                <button
                  onClick={() => setRotation(prev => (prev - 90) % 360)}
                  title="Rotate Left"
                  className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
                >
                  <div className="-scale-x-100">
                    <RotateCw size={16} />
                  </div>
                </button>
                
                {/* Rotate Right */}
                <button
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  title="Rotate Right"
                  className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
                >
                  <RotateCw size={16} />
                </button>

                <div className="w-px h-6 bg-slate-200 mx-1" />

                {/* Open in New Tab */}
                <a
                  href={order.paymentScreenshot}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center"
                  title="Open original in new tab"
                >
                  <ExternalLink size={16} />
                </a>

                {/* Close Button */}
                <button
                  onClick={() => {
                    setIsReceiptModalOpen(false);
                    setRotation(0);
                    setZoomLevel(1);
                  }}
                  className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 transition-all"
                  title="Close receipt preview"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Light-Themed Image Canvas Box Below Header */}
            <div className="relative w-full flex-1 bg-slate-100/70 overflow-auto flex items-center justify-center p-6 md:p-10 min-h-[460px] max-h-[64vh]">
              <div 
                className="transition-all duration-300 ease-out flex items-center justify-center min-w-full min-h-full"
                style={{ 
                  transform: `rotate(${rotation}deg) scale(${zoomLevel})`,
                }}
              >
                <img
                  src={order.paymentScreenshot}
                  alt="High-resolution receipt"
                  className="max-w-full max-h-[58vh] object-contain rounded-2xl shadow-xl border border-slate-200/60 bg-white"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Light-Themed Bottom Legend Box */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Scroll or pinch to zoom/pan image • Click outside to exit
              </span>
              <button 
                onClick={() => {
                  setRotation(0);
                  setZoomLevel(1);
                }}
                className="text-indigo-600 hover:text-indigo-700 hover:underline font-black uppercase tracking-widest transition-colors"
              >
                Reset View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
