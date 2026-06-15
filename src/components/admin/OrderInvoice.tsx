import React from 'react';
import { Order, useStore } from '../../context/StoreContext';
import { Receipt, MapPin, Phone, Mail, Globe } from 'lucide-react';

interface OrderInvoiceProps {
  order: Order;
  formatPrice: (p: number) => string;
  t: (key: string) => string;
  id: string;
}

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

export default function OrderInvoice({ order, formatPrice, t, id }: OrderInvoiceProps) {
  const { settings } = useStore();
  const itemsSubtotal = order.items.reduce((acc, item) => acc + (item.isCancelled ? 0 : (Number(item.price) || 0) * (item.quantity || 1)), 0);
  const hasCancelledItems = order.items.some(item => item.isCancelled);
  const orderTotal = hasCancelledItems 
    ? Math.max(0, itemsSubtotal + (Number(order.deliveryFee) || 0) - (Number(order.pointDiscount) || 0))
    : (Number(order.total) || Number(order.totalAmount) || Math.max(0, itemsSubtotal + (Number(order.deliveryFee) || 0) - (Number(order.pointDiscount) || 0)));

  const shopUrl = settings?.productionUrl || window.location.origin;

  return (
    <div 
      id={id}
      className="bg-white text-black p-[5mm] mx-auto w-full max-w-[210mm] min-h-[297mm] shadow-none flex flex-col font-sans relative print:p-0 print:max-w-full print:w-[58mm] print:mx-0 print:shadow-none print:min-h-0 print:bg-white print:text-black"
      style={{ 
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#000000',
        lineHeight: '1.2',
        paddingBottom: '20mm'
      }}
    >
      <style>{`
        @media print {
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            background: #ffffff !important; 
            color: #000000 !important;
            font-size: 10pt; 
            width: 58mm; 
            margin: 0; 
            padding: 0;
            font-family: 'Courier New', Courier, monospace !important;
          }
          .print-hidden { display: none !important; }
          @page { size: 58mm auto; margin: 0; }
          * { 
            background-color: transparent !important;
            color: #000000 !important;
            border-color: #000000 !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-weight: bold !important;
            -webkit-text-stroke: 0.1px #000000 !important;
            box-shadow: none !important;
            opacity: 1 !important;
            filter: none !important;
          }
          .thermal-bold { 
            font-weight: 900 !important;
            color: #000000 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.02em !important;
            -webkit-text-stroke: 0.3px #000000 !important;
          }
          .print-border-thick { border-width: 2px !important; border-color: black !important; border-style: solid !important; }
          .print-border-b-thick { border-bottom-width: 2px !important; border-color: black !important; border-style: solid !important; }
          .print-border-t-thick { border-top-width: 2px !important; border-color: black !important; border-style: solid !important; }
          .thermal-text-5xl { font-size: 22pt !important; line-height: 1 !important; }
          .thermal-text-4xl { font-size: 18pt !important; line-height: 1 !important; }
          .thermal-text-3xl { font-size: 16pt !important; line-height: 1.1 !important; }
          .thermal-text-2xl { font-size: 14pt !important; line-height: 1.1 !important; }
          .thermal-text-xl { font-size: 12pt !important; line-height: 1.2 !important; }
          .thermal-text-lg { font-size: 10pt !important; line-height: 1.2 !important; }
          .thermal-text-base { font-size: 9pt !important; line-height: 1.3 !important; }
          .thermal-text-sm { font-size: 8pt !important; line-height: 1.3 !important; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 2mm; table-layout: fixed; }
          tr { border-bottom: 1px solid black !important; }
          th, td { padding: 4px 1px !important; word-break: break-word; overflow: hidden; vertical-align: top; }
          thead { display: table-header-group; border-bottom: 2px solid black !important; }
          .col-item { width: 50% !important; text-align: left !important; }
          .col-qty { width: 20% !important; text-align: center !important; }
          .col-price { width: 30% !important; text-align: right !important; }
          .print-w-full { width: 100% !important; }
        }
      `}</style>
      
      {/* Royal Head Decoration border */}
      <div className="absolute top-0 left-0 w-full h-3 bg-black print:h-2" />
      <div className="absolute top-4 left-0 w-full h-1 bg-black print:hidden" />
      
      {/* Background Watermark - hidden on print for clarity */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none print:hidden">
        <Receipt size={600} className="-rotate-12" />
      </div>

      <div className="relative z-10 flex flex-col h-full print:gap-2 mt-8 print:mt-4">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-6 print:flex-col print:mb-2 print:gap-1">
          <div className="space-y-4 print:w-full print:text-center print:space-y-1">
            <div className="flex items-center gap-4 print:flex-col print:items-center print:gap-1">
              <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center border-4 border-black print:border-black print:w-10 print:h-10 print:rounded-md">
                <Receipt className="text-white print:text-white" size={32} />
              </div>
              <div className="print:text-center">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase leading-none text-black thermal-bold print:thermal-text-3xl text-center">Sar Taw Set</h1>
                <div className="flex items-center gap-2 mt-2 print:justify-center print:mt-1">
                  <p className="text-xs sm:text-sm font-black text-black uppercase tracking-[0.2em] sm:tracking-[0.5em] thermal-bold print:thermal-text-sm">Royal Caterer</p>
                  <p className="text-[11px] sm:text-xs font-black text-black uppercase tracking-widest thermal-bold print:thermal-text-sm">Est. 2024</p>
                </div>
              </div>
            </div>
            
            <div className="pt-2 space-y-2 border-l-4 border-black pl-6 ml-8 print:border-l-0 print:border-b-2 print:border-t-2 print:border-black print:pl-0 print:ml-0 print:py-2 print:text-center">
              <div className="flex items-center gap-3 text-xs sm:text-sm font-black text-black uppercase tracking-wider thermal-bold print:justify-center print:thermal-text-base">
                <Phone size={14} className="text-black print:w-4 print:h-4" />
                <span>+95 9 123 456 789</span>
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right print:text-center print:w-full print:mt-2">
            <div className="relative inline-block mb-4 print:hidden">
              <h2 className="relative text-5xl sm:text-7xl font-black text-black uppercase leading-none select-none thermal-bold">INVOICE</h2>
            </div>
            
            <div className="space-y-3 relative z-10 print:flex print:flex-col print:gap-1 print:items-center">
              <div className="bg-black text-white p-3 rounded-xl print:bg-transparent print:text-black print-border-thick print:p-2 print:rounded-none">
                <p className="text-xs font-black uppercase tracking-widest sm:tracking-[0.3em] mb-1 print:text-black thermal-bold print:thermal-text-sm">Invoice ID</p>
                <p className="text-lg sm:text-xl font-black uppercase tracking-tight tabular-nums print:text-black thermal-bold print:thermal-text-lg">#INV-{order.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="pr-2 sm:pr-4 print:pr-0 print:pt-1">
                <p className="text-xs font-black uppercase tracking-widest sm:tracking-[0.3em] text-black mb-1 thermal-bold print:thermal-text-sm">Date Issued</p>
                <p className="text-sm sm:text-base font-black text-black tracking-tight thermal-bold print:thermal-text-base">
                  {parseOrderDate(order.createdAt, order.timestamp).toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} {parseOrderDate(order.createdAt, order.timestamp).toLocaleTimeString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Informational Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8 print:flex print:flex-col print:gap-2 print:mb-4">
          <div className="space-y-4 print:space-y-1">
            <div className="border-b-4 border-black pb-2 print-border-b-thick print:pb-1">
              <h3 className="text-sm sm:text-base font-black uppercase tracking-widest sm:tracking-[0.3em] text-black thermal-bold print:thermal-text-lg">Customer</h3>
            </div>
            <div className="pl-2 print:pl-0 space-y-1">
              <p className="text-xl sm:text-2xl font-black text-black leading-tight thermal-bold print:thermal-text-lg">{order.customerName}</p>
              <p className="text-sm sm:text-base font-black text-black mt-1 thermal-bold print:thermal-text-base">{order.customerPhone}</p>
              {order.address && (
                <div className="pt-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black thermal-bold print:thermal-text-sm">Location</p>
                  <p className="text-sm font-black text-black leading-tight mt-0.5 thermal-bold print:thermal-text-base line-clamp-2">
                    {order.roomNumber && `${order.roomNumber}, `}
                    {order.address}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transaction Ledger */}
        <div className="flex-grow mt-4 print:mt-1">
          <table className="w-full text-left border-collapse border-b-4 border-black print-border-b-thick" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr className="border-b-4 border-black print-border-b-thick">
                <th className="py-3 px-1 text-[10px] sm:text-xs font-black uppercase text-black thermal-bold col-item print:thermal-text-sm" style={{ width: '50%' }}>Item</th>
                <th className="py-3 px-1 text-[10px] sm:text-xs font-black uppercase text-black thermal-bold col-qty print:thermal-text-sm" style={{ width: '20%', textAlign: 'center' }}>Qty</th>
                <th className="py-3 px-1 text-[10px] sm:text-xs font-black uppercase text-black thermal-bold col-price print:thermal-text-sm" style={{ width: '30%', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/20 print:divide-black">
              {order.items.map((item, index) => (
                <tr key={index} className={`print:border-b print:border-black ${item.isCancelled ? 'line-through' : ''}`}>
                  <td className="py-2 px-1 col-item" style={{ width: '50%' }}>
                    <p className="text-sm sm:text-base font-black text-black thermal-bold leading-tight print:thermal-text-base">
                      {item.name} {item.isCancelled ? '(Cancelled)' : ''}
                    </p>
                    <p className="text-[10px] font-black text-black uppercase thermal-bold leading-tight print:thermal-text-sm opacity-70">
                      {item.mmName} {item.isCancelled ? '(ဖျက်ပြီး)' : ''}
                    </p>
                  </td>
                  <td className="py-2 px-1 text-center font-black text-black thermal-bold col-qty print:thermal-text-base" style={{ width: '20%', textAlign: 'center' }}>
                    {item.quantity}
                  </td>
                  <td className="py-2 px-1 text-right font-black text-black tabular-nums thermal-bold col-price print:thermal-text-base" style={{ width: '30%', textAlign: 'right' }}>
                    {item.isCancelled ? formatPrice(0) : formatPrice(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Section */}
        <div className="mt-8 border-t-8 border-black pt-6 print:mt-2 print:pt-2 print-border-t-thick">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 print:flex-col print:gap-2">
            <div className="flex-grow space-y-4 w-full print:space-y-2">
               {order.note && (
                <div className="p-4 bg-white border-4 border-black print-border-thick rounded-2xl print:p-2 print:rounded-none">
                  <p className="text-xs font-black uppercase tracking-widest text-black mb-1 thermal-bold print:thermal-text-sm">
                    Note
                  </p>
                  <p className="text-sm font-black text-black italic border-l-4 border-black pl-3 uppercase thermal-bold print:thermal-text-base">
                    "{order.note}"
                  </p>
                </div>
              )}
            </div>

            <div className="w-full md:w-96 shrink-0 bg-white p-6 rounded-2xl border-4 border-black print-border-thick print:p-2 print:w-full print:rounded-none">
              <div className="space-y-3 print:space-y-1">
                <div className="flex justify-between items-center text-black">
                  <span className="text-xs font-black uppercase thermal-bold print:thermal-text-sm">Subtotal</span>
                  <span className="text-sm font-black tabular-nums thermal-bold print:thermal-text-base">
                    {formatPrice(itemsSubtotal)}
                  </span>
                </div>
                
                {order.pointDiscount > 0 && (
                  <div className="flex justify-between items-center text-black">
                    <span className="text-xs font-black uppercase thermal-bold print:thermal-text-sm">Discount</span>
                    <span className="text-sm font-black tabular-nums thermal-bold print:thermal-text-base">-{formatPrice(order.pointDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-black">
                  <span className="text-xs font-black uppercase thermal-bold print:thermal-text-sm">Delivery</span>
                  <span className="text-sm font-black uppercase italic thermal-bold print:thermal-text-base">
                    {order.deliveryFee === 0 ? 'Free' : `${formatPrice(order.deliveryFee)}`}
                  </span>
                </div>

                <div className="h-1 bg-black my-2 print:h-0.5" />

                <div className="bg-black text-white p-4 rounded-xl print:bg-white print:text-black print:border-4 print:border-black print:p-2 print:rounded-none">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-black uppercase tracking-widest thermal-bold print:thermal-text-sm">TOTAL DUE</span>
                    <span className="text-3xl sm:text-4xl font-black tabular-nums leading-tight thermal-bold print:thermal-text-2xl" style={{ letterSpacing: '0' }}>
                      {formatPrice(orderTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Print Thank You Note */}
        <div className="text-center mt-6 pt-4 border-t-2 border-dashed border-black">
          <p className="text-xl font-black uppercase thermal-bold mb-1 print:thermal-text-xl">Thank you!</p>
          <p className="text-sm font-black thermal-bold print:thermal-text-base">Please come again</p>
        </div>
      </div>
    </div>
  );
}
