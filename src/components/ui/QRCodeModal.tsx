import React from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { X, Download, Share2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useStore } from '../../context/StoreContext';
import { BRAND_LOGO } from '../../constants';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  subtitle?: string;
  darkMode?: boolean;
}

export function QRCodeModal({ isOpen, onClose, url, title, subtitle, darkMode }: QRCodeModalProps) {
  const { settings } = useStore();
  const finalUrl = url || settings.productionUrl;
  const [logoDataUrl, setLogoDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      const fetchLogo = async () => {
        try {
          const logoToFetch = settings.qrCodeLogoUrl || ((darkMode && settings.logoUrlDark) ? settings.logoUrlDark : (settings.logoUrl || BRAND_LOGO));
          
          // Use Image to process the logo with a border
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = logoToFetch;
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('Failed to load image'));
          });

          // Create a canvas to add a thick white border
          const canvas = document.createElement('canvas');
          const size = Math.max(img.width, img.height);
          const padding = size * 0.12; // 12% padding for a thinner border
          
          canvas.width = size + padding * 2;
          canvas.height = size + padding * 2;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw white background (thick border)
            ctx.fillStyle = 'white';
            // Draw a rounded rectangle for the border
            const radius = canvas.width * 0.2;
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.lineTo(canvas.width - radius, 0);
            ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
            ctx.lineTo(canvas.width, canvas.height - radius);
            ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
            ctx.lineTo(radius, canvas.height);
            ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
            ctx.lineTo(0, radius);
            ctx.quadraticCurveTo(0, 0, radius, 0);
            ctx.closePath();
            ctx.fill();
            
            // Center the original logo
            const x = (canvas.width - img.width) / 2;
            const y = (canvas.height - img.height) / 2;
            ctx.drawImage(img, x, y);
            
            setLogoDataUrl(canvas.toDataURL());
          }
        } catch (err) {
          console.warn('CORS restricted logo or load error:', err);
          // Fallback to simple fetch if direct Image loading fails due to CORS
          try {
            const logoToUse = settings.qrCodeLogoUrl || ((darkMode && settings.logoUrlDark) ? settings.logoUrlDark : (settings.logoUrl || BRAND_LOGO));
            const response = await fetch(logoToUse, { mode: 'cors' });
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              setLogoDataUrl(reader.result as string);
            };
            reader.readAsDataURL(blob);
          } catch (e) {
            setLogoDataUrl(null);
          }
        }
      };
      fetchLogo();
    }
  }, [isOpen, settings.logoUrl, settings.logoUrlDark, settings.qrCodeLogoUrl, darkMode]);

  const downloadQR = () => {
    const canvas = document.getElementById('app-qr-canvas') as HTMLCanvasElement;
    if (!canvas) {
      toast.error('Failed to generate download');
      return;
    }
    
    try {
      // Create a final canvas with padding and high quality
      const finalCanvas = document.createElement('canvas');
      const padding = 80;
      finalCanvas.width = canvas.width + padding;
      finalCanvas.height = canvas.height + padding;
      const ctx = finalCanvas.getContext('2d');
      
      if (ctx) {
        // High quality background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        // Soft shadow for the QR code
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 20;
        
        // Draw QR code from high-res hidden canvas
        ctx.drawImage(canvas, padding/2, padding/2);
        
        const pngFile = finalCanvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${title?.toLowerCase().replace(/\s+/g, '-') || 'qr-code'}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        
        toast.success('QR Code downloaded successfully');
      }
    } catch (error) {
      console.error('QR Download Error:', error);
      toast.error('Could not generate image. Please try again.');
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`relative w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl ${
              darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 shadow-xl'
            }`}
          >
            {/* Hidden Canvas for Downloads */}
            <div className="hidden">
              <QRCodeCanvas
                id="app-qr-canvas"
                value={finalUrl}
                size={1024}
                level="H"
                includeMargin={true}
                fgColor="#0f172a"
                imageSettings={logoDataUrl ? {
                  src: logoDataUrl,
                  height: 160,
                  width: 160,
                  excavate: true,
                } : undefined}
              />
            </div>

            {/* Header */}
            <div className={`p-6 border-b flex items-center justify-between ${
              darkMode ? 'border-white/5' : 'border-slate-100'
            }`}>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">{title || 'Share App'}</h3>
                {subtitle && <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-0.5">{subtitle}</p>}
              </div>
              <button 
                onClick={onClose}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 flex flex-col md:flex-row items-center gap-8">
              <div className={`p-6 rounded-3xl shrink-0 ${darkMode ? 'bg-white shadow-xl shadow-primary/10' : 'bg-white shadow-2xl shadow-slate-200'}`}>
                <QRCodeSVG
                  id="app-qr-code"
                  value={finalUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                  fgColor="#0f172a"
                  imageSettings={logoDataUrl ? {
                    src: logoDataUrl,
                    height: 40,
                    width: 40,
                    excavate: true,
                  } : undefined}
                />
              </div>

              <div className="flex-1 w-full flex flex-col justify-center">
                <div className="space-y-3">
                  <button
                    onClick={downloadQR}
                    className="w-full py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    <Download size={18} />
                    Download Image
                  </button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={copyUrl}
                      className={`py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                        darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      <Copy size={16} />
                      Copy Link
                    </button>
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: title || 'Shop App',
                            url: url
                          });
                        } else {
                          copyUrl();
                        }
                      }}
                      className={`py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                        darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      <Share2 size={16} />
                      Share Link
                    </button>
                  </div>
                </div>

                <p className="mt-6 text-[9px] font-bold opacity-30 uppercase tracking-widest leading-relaxed">
                  Scan this QR code with a mobile camera to open the application instantly.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
