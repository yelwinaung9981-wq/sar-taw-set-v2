import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ChevronLeft, Receipt, Clock, CheckCircle2, Package, MapPin, Phone, User, Home, Wallet, Calendar, ArrowRight, MessageCircle, MessageSquare, RotateCcw, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [idNotFound, setIdNotFound] = useState(false);
  const [fetchedOrder, setFetchedOrder] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(false);
  const { orders, estimatedDeliveryTime, supportNumber, cancelOrder, reorder, t, darkMode, formatPrice, getMainName, getSecondaryName } = useStore();
  const navigate = useNavigate();
  
  // Try to find in context first
  const orderInContext = orders.find(o => o.id === id);
  const order = fetchedOrder || orderInContext;

  React.useEffect(() => {
    if (!orderInContext && id) {
      const fetchOrder = async () => {
        setIsFetching(true);
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          const snap = await getDoc(doc(db, 'orders', id));
          if (snap.exists()) {
            const data = snap.data();
            setFetchedOrder({ ...data, id: snap.id });
          } else {
            setIdNotFound(true);
          }
        } catch (err) {
          console.error("Failed to fetch order:", err);
          setIdNotFound(true);
        } finally {
          setIsFetching(false);
        }
      };
      fetchOrder();
    }
  }, [id, orderInContext]);

  const orderTime = order ? (typeof order.timestamp === 'number' ? order.timestamp : order.timestamp?.toMillis?.() || Date.now()) : 0;
  const isWithin5Minutes = Date.now() - orderTime < 5 * 60 * 1000;
  const isCancellable = isWithin5Minutes && order?.status === 'pending';

  if (isFetching) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-surface' : 'bg-[#F8FAFC]'}`}>
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (idNotFound || (!order && !isFetching)) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${darkMode ? 'bg-surface text-on-surface' : 'bg-[#F8FAFC]'}`}>
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-sm border ${darkMode ? 'bg-surface-container-high border-on-surface/10' : 'bg-white border-slate-200'}`}>
          <Receipt size={40} className="text-slate-200" />
        </div>
        <h2 className="text-xl font-black mb-2">{t('orderNotFound')}</h2>
        <p className="text-on-surface-variant text-sm mb-8 text-center max-w-xs">{t('orderNotFoundDesc')}</p>
        <button 
          onClick={() => navigate('/orders')}
          className="bg-primary text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
        >
          {t('backToOrders')}
        </button>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: t('pending'),
          color: 'text-amber-600',
          bg: darkMode ? 'bg-amber-500/10' : 'bg-amber-50',
          icon: <Clock size={16} />,
          border: darkMode ? 'border-amber-500/20' : 'border-amber-100',
          desc: t('orderWaitingConfirmation')
        };
      case 'packing':
        return {
          label: t('packing'),
          color: 'text-blue-600',
          bg: darkMode ? 'bg-blue-500/10' : 'bg-blue-50',
          icon: <Package size={16} />,
          border: darkMode ? 'border-blue-500/20' : 'border-blue-100',
          desc: t('preparingItems')
        };
      case 'delivered':
        return {
          label: t('delivered'),
          color: 'text-emerald-600',
          bg: darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50',
          icon: <CheckCircle2 size={16} />,
          border: darkMode ? 'border-emerald-500/20' : 'border-emerald-100',
          desc: t('orderDeliveredSuccess')
        };
      case 'cancelled':
        return {
          label: t('cancelled'),
          color: 'text-red-600',
          bg: darkMode ? 'bg-red-500/10' : 'bg-red-50',
          icon: <Receipt size={16} />,
          border: darkMode ? 'border-red-500/20' : 'border-red-100',
          desc: t('orderCancelled')
        };
      default:
        return {
          label: t('pending'),
          color: 'text-gray-600',
          bg: darkMode ? 'bg-surface-container-high' : 'bg-gray-50',
          icon: <Clock size={16} />,
          border: darkMode ? 'border-on-surface/10' : 'border-gray-100',
          desc: t('processingOrder')
        };
    }
  };

  const status = getStatusConfig(order.status);

  const shareOrder = async () => {
    if (!order) return;
    const { formatOrderInquiry, openWhatsApp } = await import('../lib/messaging');
    const message = formatOrderInquiry(order);
    openWhatsApp(supportNumber, message);
  };

  const generateInvoice = async () => {
    if (!order) return;
    
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      
      const doc = new jsPDF();
      const invoiceDate = new Date(order.timestamp).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" });
      const itemsSubtotal = order.items.reduce(
        (acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 1),
        0,
      );
      const orderTotal = Number(order.total) || Number(order.totalAmount) || (itemsSubtotal + (Number(order.deliveryFee) || 0) - (Number(order.pointDiscount) || 0));

      // --- Header Section ---
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(32);
      doc.text("SAR TAW SET", 20, 30);

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Grocery & Meat Delivery Service", 20, 38);

      // --- Invoice Details (Top Right) ---
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(11);
      doc.text("INVOICE", 190, 25, { align: "right" });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(`#${order.id}`, 190, 35, { align: "right" });
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Issued: ${invoiceDate}`, 190, 42, { align: "right" });

      // --- Divider ---
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(20, 55, 190, 55);

      // --- Meta Info Grid ---
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("BILLED TO", 20, 70);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      // Use splitTextToSize for name to avoid overlap with payment info
      const billedToName = doc.splitTextToSize(order.customerName || "", 80);
      doc.text(billedToName, 20, 78);
      
      const nameLines = billedToName.length;
      let billY = 78 + (nameLines * 6);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      if (order.roomNumber) {
        doc.text(`${order.roomNumber}`, 20, billY);
        billY += 6;
      }
      doc.text(order.customerPhone || "", 20, billY);
      billY += 6;
      
      if (order.address) {
        const splitAddr = doc.splitTextToSize(order.address, 80);
        doc.setFontSize(10);
        doc.text(splitAddr, 20, billY);
        billY += (splitAddr.length * 5);
      }

      // Payment info - Right Aligned
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("PAYMENT", 190, 70, { align: "right" });
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(order.paymentMethod.toUpperCase(), 190, 78, { align: "right" });
      
      // Status - Below Payment
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("STATUS", 190, 90, { align: "right" });
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(order.status.toUpperCase(), 190, 96, { align: "right" });

      // --- Items Table ---
      const itemsData = order.items.map((item) => [
        item.name,
        formatPrice(item.price),
        item.quantity.toString(),
        formatPrice(item.price * (item.quantity || 1)),
      ]);

      const tableStartY = Math.max(115, billY + 10);
      autoTable(doc, {
        startY: tableStartY,
        head: [["Description", "Unit Price", "Qty", "Total"]],
        body: itemsData,
        theme: "plain",
        headStyles: {
          fontSize: 10,
          fontStyle: "bold",
          textColor: [0, 0, 0],
          cellPadding: { bottom: 4, top: 4, left: 2, right: 2 },
          lineColor: [0, 0, 0],
          lineWidth: { bottom: 1 },
        },
        bodyStyles: {
          fontSize: 10,
          textColor: [0, 0, 0],
          cellPadding: { bottom: 4, top: 4, left: 2, right: 2 },
        },
        columnStyles: {
          0: { halign: "left", cellWidth: "auto" },
          1: { halign: "right", cellWidth: 35 },
          2: { halign: "center", cellWidth: 20 },
          3: { halign: "right", cellWidth: 40 },
        },
      });

      // --- Totals ---
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      const totalsX = 130;
      const amountX = 190;

      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      doc.text("Subtotal", totalsX, finalY);
      doc.setTextColor(0, 0, 0);
      doc.text(formatPrice(itemsSubtotal), amountX, finalY, { align: "right" });

      let nextY = finalY + 7;
      if (order.deliveryFee > 0) {
        doc.setTextColor(80, 80, 80);
        doc.text("Delivery Fee", totalsX, nextY);
        doc.setTextColor(0, 0, 0);
        doc.text(`+${formatPrice(order.deliveryFee)}`, amountX, nextY, { align: "right" });
        nextY += 7;
      }

      if (order.pointDiscount && order.pointDiscount > 0) {
        doc.setTextColor(80, 80, 80);
        doc.text("Discount", totalsX, nextY);
        doc.setTextColor(0, 0, 0);
        doc.text(`-${formatPrice(order.pointDiscount)}`, amountX, nextY, { align: "right" });
        nextY += 7;
      }

      // Grand Total Line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(totalsX, nextY, 190, nextY);
      nextY += 10;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL DUE", totalsX, nextY);
      doc.setTextColor(0, 0, 0);
      doc.text(formatPrice(orderTotal), amountX, nextY, { align: "right" });

      // Footer
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text("Thank you for shopping with SAR TAW SET!", 105, 280, { align: "center" });

      doc.save(`Invoice_${order.id}.pdf`);
      toast.success("Invoice downloaded successfully!");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF invoice");
    }
  };

  const handleWhatsApp = async (isSupport: boolean) => {
    const { openWhatsApp } = await import('../lib/messaging');
    const message = isSupport 
      ? `Hello! I need assistance with my order #${order.id}.`
      : `Hello! I would like to request a cancellation for my order #${order.id}.`;
    openWhatsApp(supportNumber, message);
  };

  const handleCancel = () => {
    cancelOrder(order.id);
    setShowCancelModal(false);
  };

  const handleReorder = async () => {
    setIsReordering(true);
    const result = await reorder(order);
    setIsReordering(false);
    
    if (result.success) {
      if (result.message) {
        toast.info(result.message);
      } else {
        toast.success(t('addedToCart'));
      }
      navigate('/checkout');
    } else {
      toast.error(result.message || 'Failed to reorder');
    }
  };

  const itemsSubtotalUI = order?.items?.reduce((acc: number, item: any) => acc + (Number(item.price) || 0) * (item.quantity || 1), 0) || 0;
  const orderTotalUI = order ? (Number(order.total) || Number(order.totalAmount) || (itemsSubtotalUI + (Number(order.deliveryFee) || 0) - (Number(order.pointDiscount) || 0))) : 0;

  return (
    <div className={`min-h-screen pb-24 font-sans selection:bg-primary/20 ${darkMode ? 'bg-surface text-on-surface' : 'bg-[#F8FAFC]'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b border-on-surface/5 px-4 h-[72px] flex items-center justify-between ${darkMode ? 'bg-surface/80' : 'bg-white/80'}`}>
        <button 
          onClick={() => navigate(-1)}
          className={`relative z-10 -ml-2 p-2 rounded-full transition-all active:scale-90 touch-manipulation ${darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
        >
          <ChevronLeft size={24} className="text-on-surface stroke-[2.5]" />
        </button>

        <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
          <h2 className="text-lg font-black text-on-surface tracking-tight leading-tight">{t('orderDetails')}</h2>
          <p className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest">#{order.id}</p>
        </div>

        <button 
          onClick={generateInvoice}
          className={`relative z-10 flex items-center justify-center transition-all active:scale-90 p-2 rounded-xl ${darkMode ? 'hover:bg-on-surface/5' : 'hover:bg-slate-50'}`}
          title="Download Invoice PDF"
        >
          <FileText size={22} className="text-primary" />
        </button>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Status Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{t('orderStatus')}</h3>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${status.bg} ${status.border} ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant/80">{status.desc}</p>
          {order.status === 'cancelled' && order.cancelReason && (
            <div className={`mt-2 p-3 rounded-xl text-xs font-medium border ${darkMode ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
              <strong className="text-[10px] uppercase font-bold tracking-widest block mb-1">{t('reasonForCancellation') || 'Reason for cancellation:'}</strong>
              {order.cancelReason}
            </div>
          )}
        </motion.div>

        {/* Order Details Grid */}
        <section className={`rounded-2xl p-5 border border-on-surface/5 shadow-sm ${darkMode ? 'bg-surface-container-high' : 'bg-white'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-on-surface text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <MapPin size={14} className="text-primary" />
                {t('deliveryInformation')}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">{t('deliveryAddress')}</p>
                  <p className="text-[10px] font-black text-on-surface mt-1 leading-relaxed break-words whitespace-normal">
                    {order.address?.replace(/^(Apt\.?\s*|Apartment\s*|Room\s*)/i, '')}
                    {order.roomNumber && <span className="block text-on-surface-variant/60 mt-0.5">{order.roomNumber}</span>}
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">{t('recipient')}</p>
                    <p className="text-[10px] font-black text-on-surface mt-1">{order.customerName}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">{t('phone')}</p>
                    <p className="text-[10px] font-black text-on-surface mt-1">{order.customerPhone}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
               <h3 className="font-bold text-on-surface text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <Receipt size={14} className="text-primary" />
                {t('orderMeta')}
              </h3>
               <div className="space-y-3">
                 <div>
                    <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">{t('payment')}</p>
                    <p className="text-[10px] font-black text-on-surface mt-1">{t(order.paymentMethod) || order.paymentMethod.replace(/_/g, ' ')}</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">{t('orderDate')}</p>
                      <p className="text-[10px] font-black text-on-surface mt-1">
                        {new Date(order.timestamp).toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">{t('deliveryDate')}</p>
                      <p className="text-[10px] font-black text-on-surface mt-1">
                        {order.deliveryDate || t('pending')}
                      </p>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* Order Items */}
        <section className={`rounded-2xl p-6 border border-on-surface/5 shadow-sm ${darkMode ? 'bg-surface-container-high' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-on-surface text-xs uppercase tracking-widest flex items-center gap-2">
              <Receipt size={14} className="text-primary" />
              {t('orderSummary')}
            </h3>
            <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${darkMode ? 'bg-surface-container-highest text-on-surface-variant' : 'bg-slate-100 text-slate-500'}`}>
              {order.items.length} {t('items')}
            </span>
          </div>

          <div className="space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex gap-4 items-center">
                <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border ${darkMode ? 'bg-surface-container-highest border-on-surface/5' : 'bg-slate-50 border-slate-100'}`}>
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-on-surface leading-tight">{getMainName(item)}</h4>
                    <p className="text-xs font-black text-primary ml-4">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                  <p className="text-[9px] font-bold text-on-surface-variant/60 mt-0.5">{getSecondaryName(item)} • Qty: {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-on-surface/10 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-on-surface-variant">{t('subtotal')}</p>
              <p className="text-[10px] font-black text-on-surface">
                {formatPrice(itemsSubtotalUI)}
              </p>
            </div>
            {order.pointDiscount > 0 && (
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-bold text-red-600">{t('pointDiscount')}</p>
                <p className="text-[10px] font-black text-red-600">-{formatPrice(order.pointDiscount)}</p>
              </div>
            )}
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-on-surface-variant">{t('deliveryFee')}</p>
              <p className={`text-[10px] font-black ${order.deliveryFee === 0 ? 'text-emerald-600' : 'text-on-surface'}`}>
                {order.deliveryFee === 0 ? t('free') : formatPrice(order.deliveryFee)}
              </p>
            </div>
            <div className="pt-3 border-t border-on-surface-variant/10 flex justify-between items-center">
              <p className="text-sm font-black text-on-surface">{t('totalAmount')}</p>
              <p className="text-lg font-black text-primary">{formatPrice(orderTotalUI)}</p>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex gap-2 pb-6">
          {/* Left Dynamic Button */}
          {order.status === 'delivered' || order.status === 'cancelled' ? (
            <button
              onClick={handleReorder}
              disabled={isReordering}
              className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-tight shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50 ${darkMode ? 'bg-primary text-white shadow-primary/20' : 'bg-emerald-600 text-white shadow-emerald-900/20'}`}
            >
              {isReordering ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <RotateCcw size={14} />
              )}
              <span className="truncate">{t('reorder')}</span>
            </button>
          ) : isCancellable ? (
            <button 
              onClick={() => setShowCancelModal(true)}
              className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-tight transition-all active:scale-95 border ${darkMode ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'}`}
            >
              <span className="truncate">{t('cancelOrder')}</span>
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => handleWhatsApp(false)}
              className={`flex-1 py-2 rounded-xl font-black text-[10px] uppercase tracking-tight transition-all active:scale-95 flex items-center justify-center gap-1.5 border ${darkMode ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100/50'}`}
            >
              <MessageCircle size={14} className="text-[#25D366]" />
              <span className="truncate">{t('requestCancellation')}</span>
            </button>
          )}

          {/* Right Support Button (Always visible) */}
          <div className={`flex items-center p-1 rounded-xl border ${darkMode ? 'bg-surface-container-high border-on-surface/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <button 
              onClick={() => shareOrder()}
              className={`px-3 h-9 rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 ${darkMode ? 'hover:bg-white/5 text-on-surface' : 'hover:bg-slate-50 text-slate-900'}`}
              title="Share via WhatsApp"
            >
              <MessageCircle size={18} className="text-[#25D366]" />
              <span className="text-[10px] font-black uppercase">WhatsApp</span>
            </button>
          </div>
        </div>
        
        {/* Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`rounded-2xl p-6 max-w-sm w-full shadow-2xl ${darkMode ? 'bg-surface-container-high' : 'bg-white'}`}>
              <h3 className="text-lg font-black text-on-surface mb-2">{t('areYouSure')}</h3>
              <p className="text-sm text-on-surface-variant mb-6">{t('cancelOrderConfirm')}</p>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowCancelModal(false)}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${darkMode ? 'bg-surface-container-highest text-on-surface hover:bg-surface-container-high' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {t('noKeep')}
                </button>
                <button 
                  onClick={handleCancel}
                  className="py-3 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700"
                >
                  {t('yesCancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
