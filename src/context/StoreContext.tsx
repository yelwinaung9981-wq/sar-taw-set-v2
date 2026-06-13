import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { translations } from '../lib/translations';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  serverTimestamp,
  increment,
  getDoc,
  addDoc,
  deleteDoc,
  limit,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, getIsQuotaExceeded, onQuotaExceededChange, resetQuotaExceeded as resetQuota, signInAnonymously, googleProvider, signInWithPopup } from '../lib/firebase';
import { onAuthStateChanged, setPersistence, browserLocalPersistence, signOut, createUserWithEmailAndPassword as createAuthUser } from 'firebase/auth';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// Fix: Use absolute-like relative path and ensure it's imported correctly
import firebaseConfig from '../../firebase-applet-config.json';

const getSecondaryAuth = () => {
  const secondaryAppName = 'SecondaryAuth';
  try {
    const existingApp = getApps().find(app => app.name === secondaryAppName);
    const secondaryApp = existingApp || initializeApp(firebaseConfig as any, secondaryAppName);
    return getAuth(secondaryApp);
  } catch (error) {
    console.error("Secondary Auth Init Error:", error);
    // Fallback to primary if secondary fails, though this might cause sign-out
    return auth;
  }
};
import { Address, ServiceArea } from '../types';
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';

import { BroadcastToast } from '../components/ui/BroadcastToast';
import { toast } from 'sonner';

export interface Product {
  id: string;
  name: string;
  mmName: string;
  msName?: string;
  thName?: string;
  zhName?: string;
  price: number;
  category: string;
  image: string;
  unit: string;
  isPremium?: boolean;
  stock: number;
  salePrice?: number;
  description?: string;
  sku?: string;
  weight?: string;
  status: 'published' | 'draft';
  isAvailable?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Session {
  id: string;
  userId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  lastActive: number;
  isCurrent: boolean;
  userAgent: string;
}

export interface Order {
  id: string;
  roomNumber: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  total: number;
  totalAmount?: number; // Added for legacy/fallback support
  pointDiscount: number;
  deliveryFee: number;
  pointsUsed: number;
  earnedPoints: number;
  status: 'pending' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled';
  deliveryStatus?: 'pending' | 'preparing' | 'ready' | 'accepted' | 'on_the_way' | 'delivered' | 'returned';
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: number;
  pickedUpAt?: number;
  deliveredAt?: number;
  paymentMethod: string;
  address?: string;
  deliveryDate?: string;
  deliveryDay?: string;
  note?: string;
  paymentScreenshot?: string;
  timestamp: number;
  createdAt: number;
  uid?: string;
  cancelReason?: string;
}

export interface Bundle {
  id: string;
  type: string;
  title: string;
  titleMm: string;
  description: string;
  descriptionMm: string;
  originalPrice: number;
  price: number;
  image: string;
  items: string[];
  isActive: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  maxDiscount: number;
  expiryDate: string;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  target: string;
  details: string;
  createdAt: any;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  image: string;
  type: 'promotion' | 'system' | 'update';
  createdAt: any;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: 'superadmin' | 'staff';
  name: string;
  phone?: string;
  photoURL?: string;
  createdAt?: any;
}

export interface Category {
  id: string;
  key: string;
  nameEn: string;
  nameMm: string;
  nameMs?: string;
  nameTh?: string;
  nameZh?: string;
  isActive: boolean;
  order: number;
  supportPhone?: string;
  iconUrl?: string;
}

export interface PromotionBanner {
  id: string;
  type: string;
  tag: string;
  title: string;
  subtitle: string;
  image: string;
  color: string;
  isActive: boolean;
  priority: number;
  link?: string;
}

export interface Deal {
  id: string;
  type: string;
  title: string;
  titleMm: string;
  originalPrice: number;
  price: number;
  discount: string;
  image: string;
  endTime: string;
  soldCount: number;
  totalCount: number;
  description: string;
  descriptionMm: string;
  isActive: boolean;
}

export interface SupportContact {
  id: string;
  type: 'general' | 'order' | 'cancellation' | 'help' | 'other';
  labelEn: string;
  labelMm: string;
  phone: string;
}

export interface TelegramConfig {
  id: string;
  name: string;
  token: string;
  chatId: string;
  isActive: boolean;
}

interface StoreContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  cartTotal: number;
  userName: string;
  setUserName: (name: string) => void;
  userPhone: string;
  setUserPhone: (phone: string) => void;
  roomNumber: string;
  setRoomNumber: (room: string) => void;
  estimatedDeliveryTime: string;
  setEstimatedDeliveryTime: (time: string) => Promise<void>;
  orders: Order[];
  adminOrders: Order[];
  supportNumber: string;
  setSupportNumber: (num: string) => void;
  supportContacts: SupportContact[];
  setSupportContacts: (contacts: SupportContact[]) => Promise<void>;
  shopPhone: string;
  setShopPhone: (phone: string) => Promise<void>;
  shopEmail: string;
  setShopEmail: (email: string) => Promise<void>;
  bankName: string;
  setBankName: (name: string) => void;
  bankAccountNumber: string;
  setBankAccountNumber: (num: string) => void;
  bankAccountName: string;
  setBankAccountName: (name: string) => void;
  userAvatar: string;
  setUserAvatar: (avatar: string) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;
  userBirthday: string;
  setUserBirthday: (birthday: string) => void;
  updateUserProfile: (profile: {
    name?: string;
    phone?: string;
    room?: string;
    avatar?: string;
    email?: string;
    birthday?: string;
  }) => Promise<void>;
  placeOrder: (details: { 
    name: string; 
    phone: string; 
    room: string; 
    address?: string;
    paymentMethod: string; 
    pointDiscount: number; 
    pointsUsed: number 
  }) => any;
  updateOrderStatus: (id: string, status: Order['status'], cancelReason?: string) => void;
  updateDeliveryStatus: (id: string, status: Order['deliveryStatus'], riderInfo?: { uid: string; name: string }) => Promise<void>;
  cancelOrder: (id: string) => void;
  reorder: (order: Order) => Promise<{ success: boolean; message?: string }>;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  emailNotificationsEnabled: boolean;
  setEmailNotificationsEnabled: (enabled: boolean) => void;
  paymentMethods: PaymentMethod[];
  addPaymentMethod: (method: Omit<PaymentMethod, 'id'>) => void;
  removePaymentMethod: (id: string) => void;
  setDefaultPaymentMethod: (id: string) => void;
  points: number;
  setPoints: (points: number) => void;
  language: string;
  setLanguage: (lang: string) => void;
  currency: 'RM' | 'MMK';
  setCurrency: (currency: 'RM' | 'MMK') => void;
  formatPrice: (price: number) => string;
  getCategoryName: (categoryId: string) => string;
  getMainName: (item: any) => string;
  getSecondaryName: (item: any) => string;
  getLocalizedName: (item: any) => string;
  t: (key: string) => string;
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
  isDeliveryEnabled: boolean;
  setIsDeliveryEnabled: (enabled: boolean) => Promise<void>;
  deliveryFee: number;
  setDeliveryFee: (fee: number) => Promise<void>;
  isLowStockAlertEnabled: boolean;
  setIsLowStockAlertEnabled: (enabled: boolean) => Promise<void>;
  cutoffTime: string;
  setCutoffTime: (time: string) => Promise<void>;
  isBankEnabled: boolean;
  setIsBankEnabled: (enabled: boolean) => Promise<void>;
  getDeliveryDate: () => { date: string; isToday: boolean };
  logout: () => void;
  forceSync: () => Promise<void>;
  isSyncing: boolean;
  isProfileLoaded: boolean;
  uid: string | null;
  authUid: string | null;
  riderInfo: any;
  updateRiderProfile: (updates: any) => Promise<void>;
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addresses: Address[];
  addAddress: (address: Omit<Address, 'id'>) => Promise<void>;
  updateAddress: (id: string, address: Partial<Address>) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  selectedAddressId: string | null;
  setSelectedAddressId: (id: string | null) => void;
  categories: Category[];
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  promotionBanners: PromotionBanner[];
  deals: Deal[];
  bundles: Bundle[];
  addPromotionBanner: (banner: Omit<PromotionBanner, 'id' | 'priority'>) => Promise<void>;
  updatePromotionBanner: (id: string, banner: Partial<PromotionBanner>) => Promise<void>;
  deletePromotionBanner: (id: string) => Promise<void>;
  reorderPromotionBanners: (banners: PromotionBanner[]) => Promise<void>;
  addDeal: (deal: Omit<Deal, 'id'>) => Promise<void>;
  updateDeal: (id: string, deal: Partial<Deal>) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
  addBundle: (bundle: Omit<Bundle, 'id'>) => Promise<void>;
  updateBundle: (id: string, bundle: Partial<Bundle>) => Promise<void>;
  deleteBundle: (id: string) => Promise<void>;
  updateProductStock: (productId: string, newStock: number) => Promise<void>;
  coupons: Coupon[];
  addCoupon: (coupon: Omit<Coupon, 'id'>) => Promise<void>;
  updateCoupon: (id: string, coupon: Partial<Coupon>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  auditLogs: AuditLog[];
  logAudit: (action: string, target: string, details: string) => Promise<void>;
  broadcastNotifications: BroadcastNotification[];
  sendBroadcast: (notification: Omit<BroadcastNotification, 'id' | 'createdAt'>) => Promise<void>;
  sendTargetedNotification: (uid: string, notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Promise<void>;
  admins: AdminUser[];
  addAdmin: (admin: Omit<AdminUser, 'createdAt'>) => Promise<void>;
  fetchOrderHistory: (riderId?: string) => Promise<Order[]>;
  createNewAdmin: (email: string, password: string, name: string, role: AdminUser['role'], phone?: string) => Promise<void>;
  updateAdminRole: (uid: string, role: AdminUser['role']) => Promise<void>;
  updateAdminProfile: (uid: string, updates: Partial<AdminUser>) => Promise<void>;
  removeAdmin: (uid: string) => Promise<void>;
  createNewRider: (email: string, password: string, name: string) => Promise<void>;
  removeRider: (uid: string) => Promise<void>;
  users: any[];
  updateUserPoints: (uid: string, points: number) => Promise<void>;
  isAdmin: boolean;
  isRider: boolean;
  isAuthLoading: boolean;
  isQuotaExceeded: boolean;
  isDeliveryPortalActive: boolean;
  setIsDeliveryPortalActive: (active: boolean) => void;
  isAdminPanelActive: boolean;
  setIsAdminPanelActive: (active: boolean) => void;
  resetQuotaExceeded: () => void;
  deviceId: string;
  sessions: Session[];
  revokeSession: (sessionId: string) => Promise<void>;
  refreshAllData: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  isBlocked: boolean;
  blockMessage: string;
  totalOrders: number;
  serviceAreas: ServiceArea[];
  addServiceArea: (area: Omit<ServiceArea, 'id'>) => Promise<void>;
  updateServiceArea: (id: string, updates: Partial<ServiceArea>) => Promise<void>;
  deleteServiceArea: (id: string) => Promise<void>;
  settings: { 
    productionUrl: string; 
    telegramToken?: string; 
    telegramChatId?: string;
    telegramConfigs?: TelegramConfig[];
    logoUrl?: string;
    logoUrlLight?: string;
    logoUrlDark?: string;
    qrCodeLogoUrl?: string;
    cashierName?: string;
    cloudinaryCloudName?: string;
    cloudinaryUploadPreset?: string;
    cloudinaryApiKey?: string;
    cloudinaryApiSecret?: string;
  };
  updateSettings: (newSettings: { 
    productionUrl?: string; 
    telegramToken?: string; 
    telegramChatId?: string;
    telegramConfigs?: TelegramConfig[];
    logoUrl?: string;
    logoUrlLight?: string;
    logoUrlDark?: string;
    qrCodeLogoUrl?: string;
    cashierName?: string;
    cloudinaryCloudName?: string;
    cloudinaryUploadPreset?: string;
    cloudinaryApiKey?: string;
    cloudinaryApiSecret?: string;
  }) => Promise<void>;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'offer' | 'system';
  timestamp: number;
  read: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'amex' | 'kpay' | 'wave';
  last4: string;
  expiry: string;
  cardHolder: string;
  isDefault: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const safeParse = <T,>(saved: string | null, fallback: T): T => {
    if (!saved) return fallback;
    try {
      return JSON.parse(saved);
    } catch {
      return fallback;
    }
  };

  const [cart, setCart] = useState<CartItem[]>([]);

  const [authUid, setAuthUid] = useState<string | null>(null);
  const [riderInfo, setRiderInfo] = useState<any>(null);
  const stateRef = useRef<{ 
    userName: string; 
    userPhone: string; 
    roomNumber: string; 
    userAvatar: string; 
    userEmail: string; 
    userBirthday: string; 
    points: number 
  }>({
    userName: '', userPhone: '', roomNumber: '', userAvatar: '', userEmail: '', userBirthday: '', points: 0
  });
  
  const updateRiderProfile = async (updates: any) => {
    if (!authUid) return;
    try {
      await updateDoc(doc(db, 'riders', authUid), {
        ...updates
      });
      setRiderInfo((prev: any) => prev ? { ...prev, ...updates } : { uid: authUid, ...updates });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error("Update profile error:", error);
      toast.error('Failed to update profile');
    }
  };

  const [userName, setUserName] = useState(() => {
    const val = localStorage.getItem('sp_user_name');
    return (val && val !== 'null' && val !== 'undefined') ? val : '';
  });
  const [userPhone, setUserPhone] = useState(() => {
    const val = localStorage.getItem('sp_user_phone');
    return (val && val !== 'null' && val !== 'undefined') ? val : '';
  });


  const [userAvatar, setUserAvatar] = useState(() => {
    const val = localStorage.getItem('sp_user_avatar');
    return (val && val !== 'null' && val !== 'undefined') ? val : '';
  });
  const [userEmail, setUserEmail] = useState(() => {
    const val = localStorage.getItem('sp_user_email');
    return (val && val !== 'null' && val !== 'undefined') ? val : '';
  });
  const [userBirthday, setUserBirthday] = useState(() => {
    const val = localStorage.getItem('sp_user_birthday');
    return (val && val !== 'null' && val !== 'undefined') ? val : '';
  });
  const [roomNumber, setRoomNumber] = useState(() => localStorage.getItem('sp_room') || '');
  const [orders, setOrders] = useState<Order[]>(() => safeParse(localStorage.getItem('sp_orders'), []));
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [estimatedDeliveryTime, setEstimatedDeliveryTimeState] = useState('8:00 AM - 10:00 AM');
  const [points, setPoints] = useState(() => {
    const saved = localStorage.getItem('sp_points');
    const parsed = saved ? parseInt(saved, 10) : 0;
    return isNaN(parsed) ? 0 : parsed;
  });
  const [products, setProducts] = useState<any[]>(() => safeParse(localStorage.getItem('sp_products'), []));
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  
  const [addresses, setAddresses] = useState<Address[]>(() => {
    const localAddrs = safeParse(localStorage.getItem('sp_addresses'), []);
    const unique = new Map<string, Address>();
    localAddrs.forEach((addr: Address) => {
      const key = [
        addr.phone,
        addr.township,
        addr.street,
        addr.building,
        addr.room
      ].map(v => (v || '').toString().toLowerCase().trim().replace(/\s+/g, '')).join('|');
      
      if (!unique.has(key) || (addr.isDefault && !unique.get(key)?.isDefault)) {
        unique.set(key, addr);
      }
    });
    return Array.from(unique.values());
  });
  const [selectedAddressId, setSelectedAddressIdState] = useState<string | null>(() => {
    return localStorage.getItem('sp_selected_address_id');
  });
  const [favorites, setFavorites] = useState<string[]>(() => safeParse(localStorage.getItem('sp_favorites'), []));
  const [categories, setCategories] = useState<Category[]>(() => safeParse(localStorage.getItem('sp_categories'), []));
  
  const [promotionBanners, setPromotionBanners] = useState<PromotionBanner[]>(() => safeParse(localStorage.getItem('sp_banners'), []));
  
  const [deals, setDeals] = useState<Deal[]>(() => safeParse(localStorage.getItem('sp_deals'), []));
  
  const [bundles, setBundles] = useState<Bundle[]>(() => safeParse(localStorage.getItem('sp_bundles'), []));
  
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [broadcastNotifications, setBroadcastNotifications] = useState<BroadcastNotification[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>(() => safeParse(localStorage.getItem('sp_serviceAreas'), []));
  const [settings, setSettings] = useState<{ 
    productionUrl: string; 
    telegramToken?: string; 
    telegramChatId?: string;
    telegramConfigs?: TelegramConfig[];
    logoUrl?: string;
    logoUrlLight?: string;
    logoUrlDark?: string;
    qrCodeLogoUrl?: string;
    cashierName?: string;
    cloudinaryCloudName?: string;
    cloudinaryUploadPreset?: string;
    cloudinaryApiKey?: string;
    cloudinaryApiSecret?: string;
  }>(() => {
    const cached = localStorage.getItem('sp_settings_global');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Error parsing settings_global cache:', e);
      }
    }
    return { productionUrl: 'https://sartawset.com', cashierName: 'Yenge' };
  });
  
  useEffect(() => {
    const fetchGlobalSettings = async () => {
      if (isCacheValid('settings_global', 3600000)) return;
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'global'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(data as any);
          localStorage.setItem('sp_settings_global', JSON.stringify(data));
          setCacheTime('settings_global');
        }
      } catch (error) {
        console.error('Error fetching global settings:', error);
      }
    };
    fetchGlobalSettings();
  }, []);

  const updateSettings = async (newSettings: { 
    productionUrl?: string; 
    telegramToken?: string; 
    telegramChatId?: string;
    telegramConfigs?: TelegramConfig[];
    logoUrl?: string;
    logoUrlLight?: string;
    logoUrlDark?: string;
    qrCodeLogoUrl?: string;
    cashierName?: string;
    cloudinaryCloudName?: string;
    cloudinaryUploadPreset?: string;
    cloudinaryApiKey?: string;
    cloudinaryApiSecret?: string;
  }) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...newSettings
      }, { merge: true });
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      localStorage.setItem('sp_settings_global', JSON.stringify(updated));
      toast.success('System settings updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    }
  };

  const [notifications, setNotifications] = useState<Notification[]>(() => safeParse(localStorage.getItem('sp_notifications'), []));
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('sp_is_admin') === 'true';
  });
  const [isRider, setIsRider] = useState(() => {
    return localStorage.getItem('sp_is_rider') === 'true';
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [isDeliveryPortalActive, setIsDeliveryPortalActive] = useState(false);
  const [isAdminPanelActive, setIsAdminPanelActive] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMappingSynced, setIsMappingSynced] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(getIsQuotaExceeded());
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('sp_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('sp_device_id', id);
    }
    return id;
  });

  const resetQuotaExceeded = () => {
    resetQuota();
    setIsQuotaExceeded(false);
  };


  // Listen for quota changes
  useEffect(() => {
    return onQuotaExceededChange((exceeded) => {
      setIsQuotaExceeded(exceeded);
    });
  }, []);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId] = useState(() => {
    let id = sessionStorage.getItem('sp_session_id');
    if (!id) {
      id = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('sp_session_id', id);
    }
    return id;
  });

  // UID for data is derived from phone number for persistence across devices
  const uid = useMemo(() => {
    if (!userPhone) return null;
    const cleanPhone = userPhone.replace(/[^0-9+]/g, '');
    if (!cleanPhone) return null;
    return cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
  }, [userPhone]);

  const logAudit = useCallback(async (action: string, target: string, details: string) => {
    if (getIsQuotaExceeded()) return;
    if (!isAdmin && !currentAdmin) return;
    try {
      await addDoc(collection(db, 'auditLogs'), {
        adminId: currentAdmin?.uid || authUid || 'unknown_admin',
        adminName: currentAdmin?.name || currentAdmin?.email || userEmail || 'Admin',
        action,
        target,
        details: details || '',
        createdAt: serverTimestamp(),
        timestamp: serverTimestamp() // Used for query ordering desc
      });
    } catch (error) {
      console.error('Failed to write audit log to Firestore:', error);
    }
  }, [isAdmin, currentAdmin, authUid, userEmail]);

  const lastSyncedCartRef = useRef<string>('');
  const lastSyncedFavoritesRef = useRef<string>('');
  const lastSyncedUidRef = useRef<string | null>(null);
  const lookupPhoneMappingRef = useRef<string | null>(null);
  const lastSyncedUserDataRef = useRef<string>('');
  const shouldMergeGuestDataRef = useRef(true);
  const isInitialMount = useRef(true);
  const isProfileLoadedRef = useRef(false);
  const syncLockRef = useRef<string | null>(null);
  const initialMergeLockedRef = useRef<string | null>(null);

  // Keep ref in sync for closure access
  useEffect(() => {
    isProfileLoadedRef.current = isProfileLoaded;
  }, [isProfileLoaded]);

  // Helper to reset all user-related state and storage
  const clearUserData = useCallback((options?: { skipPhoneReset?: boolean }) => {
    console.log("StoreContext: Clearing all local user data", options);
    
    // Clear storage
    const keysToClear = [
      'sp_addresses', 'sp_orders', 'sp_points', 'sp_favorites', 
      'sp_user_name', 'sp_room',
      'sp_user_avatar', 'sp_user_email', 'sp_user_birthday',
      'sp_notifications', 'sp_payment_methods', 'sp_recent_searches'
    ];
    if (!options?.skipPhoneReset) {
      keysToClear.push('sp_user_phone');
    }
    
    keysToClear.forEach(key => localStorage.removeItem(key));
    
    // Reset state
    setUserName('');
    if (!options?.skipPhoneReset) {
      setUserPhone('');
    }
    setUserEmail('');
    setUserBirthday('');
    setUserAvatar('');
    setRoomNumber('');
    setPoints(0);
    setAddresses([]);
    setOrders([]);
    setFavorites([]);
    setCart([]);
    setNotifications([]);
    setPaymentMethods([]);

    // Invalidate sync refs to ensure proper initial merge from cloud
    lastSyncedCartRef.current = '[]';
    lastSyncedFavoritesRef.current = '[]';
    lastSyncedUserDataRef.current = '';
  }, []);

  // Sync User Data with Firestore
  // Sync User Data with Firestore - Optimized to prevent infinite loop and redundant re-renders
  useEffect(() => {
    // SECURITY GUARD: Always stop if quota exceeded
    if (getIsQuotaExceeded()) {
      setIsProfileLoaded(true);
      return;
    }

    // BACKWARD LOOKUP: Try to restore phone-based session if we have Auth but no phone
    if (authUid && !uid && !isAuthLoading && lookupPhoneMappingRef.current !== authUid) {
      const lookupMapping = async () => {
        try {
          console.log("StoreContext: Attempting auth mapping restoration for:", authUid);
          const mappingSnap = await getDoc(doc(db, 'authToPhone', authUid));
          if (mappingSnap.exists()) {
            const mappedPhone = mappingSnap.data().phone;
            if (mappedPhone && mappedPhone !== userPhone) {
              console.log("StoreContext: Restored phone from mapping:", mappedPhone);
              setUserPhone(mappedPhone);
              localStorage.setItem('sp_user_phone', mappedPhone);
              return;
            }
          }
        } catch (err) {
          console.warn("StoreContext: Auth mapping restoration failed:", err);
        } finally {
          setIsProfileLoaded(true);
        }
      };
      lookupPhoneMappingRef.current = authUid;
      lookupMapping();
      return;
    }

    if (!uid) {
      if (!isAuthLoading) setIsProfileLoaded(true);
      return;
    }

    const isNewUserSwitch = lastSyncedUidRef.current !== uid;

    // Prevent redundant sync if already starting or finished for this UID
    if (syncLockRef.current === uid && isProfileLoaded && !isNewUserSwitch) return;
    
    if (isNewUserSwitch) {
      const wasGuest = lastSyncedUidRef.current === null;
      if (!wasGuest && uid !== null) {
        console.log("StoreContext: Real user switch detected, clearing data.");
        clearUserData({ skipPhoneReset: true });
        shouldMergeGuestDataRef.current = false;
      } else if (uid !== null) {
        shouldMergeGuestDataRef.current = wasGuest;
      }
    }

    lastSyncedUidRef.current = uid;
    syncLockRef.current = uid;
    setIsProfileLoaded(false);
    
    const unsubs: (() => void)[] = [];
    const userDocRef = doc(db, 'users', uid);
    const authMappingRef = authUid ? doc(db, 'authToPhone', authUid) : null;
    
    const runInitialMerge = async () => {
      if (initialMergeLockedRef.current === uid) return;
      initialMergeLockedRef.current = uid;

      // Sync auth mapping ONLY if mapping doesn't exist or is different
      if (authUid && authMappingRef && !getIsQuotaExceeded() && lookupPhoneMappingRef.current !== authUid) {
        try {
          const mappingSnap = await getDoc(authMappingRef);
          if (!mappingSnap.exists() || mappingSnap.data().phone !== uid) {
            await setDoc(authMappingRef, { phone: uid }, { merge: true });
            lookupPhoneMappingRef.current = authUid;
          }
        } catch (e) {
          console.warn("Auth mapping check/update failed:", e);
        }
      }

      try {
        console.log("StoreContext: Syncing profile for UID:", uid);
        const docSnap = await getDoc(userDocRef);
        const shouldMerge = shouldMergeGuestDataRef.current;
        
        if (!docSnap.exists()) {
          console.log("StoreContext: Initializing new account doc", { shouldMerge });
          if (getIsQuotaExceeded()) { setIsProfileLoaded(true); return; }
          
          const initialCart = (shouldMerge && cart.length > 0) ? cart : [];
          const initialFavorites = (shouldMerge && favorites.length > 0) ? favorites : [];
          
          setCart(initialCart);
          setFavorites(initialFavorites);

          await setDoc(userDocRef, {
            uid,
            authUid: authUid || null,
            name: userName || '', 
            phone: userPhone || '',
            points: 0,
            cart: initialCart,
            favorites: initialFavorites,
            createdAt: serverTimestamp(),
            isBlocked: false
          }, { merge: true });
        } else {
          console.log("StoreContext: Merging existing account doc");
          const data = docSnap.data();
          
          // Initial state population
          if (data.name) { setUserName(data.name); localStorage.setItem('sp_user_name', data.name); }
          if (data.points !== undefined) setPoints(data.points);
          if (data.isBlocked !== undefined) setIsBlocked(data.isBlocked);
          if (data.blockMessage !== undefined) setBlockMessage(data.blockMessage);
          
          // Sync missing profile pieces into context & local storage
          if (data.avatar) { setUserAvatar(data.avatar); localStorage.setItem('sp_user_avatar', data.avatar); }
          if (data.email) { setUserEmail(data.email); localStorage.setItem('sp_user_email', data.email); }
          if (data.birthday) { setUserBirthday(data.birthday); localStorage.setItem('sp_user_birthday', data.birthday); }
          if (data.room) { setRoomNumber(data.room); localStorage.setItem('sp_room', data.room); }
          
          // Cart/Favorites merge logic
          const firestoreFavorites = data.favorites || [];
          const mergedFavorites = shouldMerge ? Array.from(new Set([...firestoreFavorites, ...favorites])) : firestoreFavorites;
          
          setFavorites(mergedFavorites);
          
          // Update doc ONLY if data changed (no lastActive heartbeat)
          const updateData: any = {};
          if (authUid && data.authUid !== authUid) updateData.authUid = authUid;
          if (shouldMerge) { updateData.favorites = mergedFavorites; }
          
          if (Object.keys(updateData).length > 0 && !getIsQuotaExceeded()) {
            await updateDoc(userDocRef, updateData).catch(err => console.error("Initial update failed:", err));
          }
        }
        
        shouldMergeGuestDataRef.current = true;
        setIsProfileLoaded(true);
        setIsSyncing(false);
      } catch (err) {
        console.error("StoreContext: sync error:", err);
        setIsProfileLoaded(true);
        setIsSyncing(false);
      }
    };

    runInitialMerge();

    // 2. Real-time Listener (Synchronous setup)
    const unsubscribeProfile = onSnapshot(userDocRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      
      // Batch state updates using functional updates for stability
      setPoints(prev => data.points !== undefined && prev !== data.points ? (data.points || 0) : prev);
      setUserName(prev => {
        if (data.name && data.name !== prev) {
          localStorage.setItem('sp_user_name', data.name);
          return data.name;
        }
        return prev;
      });
      setIsBlocked(prev => data.isBlocked !== undefined && prev !== data.isBlocked ? data.isBlocked : prev);
      setBlockMessage(prev => data.blockMessage !== undefined && prev !== data.blockMessage ? data.blockMessage : prev);
      
      // Real-time synchronization of other profile fields
      if (data.avatar !== undefined) {
        setUserAvatar(prev => {
          if (data.avatar && data.avatar !== prev) {
            localStorage.setItem('sp_user_avatar', data.avatar);
            return data.avatar;
          }
          return prev;
        });
      }
      if (data.email !== undefined) {
        setUserEmail(prev => {
          if (data.email && data.email !== prev) {
            localStorage.setItem('sp_user_email', data.email);
            return data.email;
          }
          return prev;
        });
      }
      if (data.birthday !== undefined) {
        setUserBirthday(prev => {
          if (data.birthday && data.birthday !== prev) {
            localStorage.setItem('sp_user_birthday', data.birthday);
            return data.birthday;
          }
          return prev;
        });
      }
      if (data.room !== undefined) {
        setRoomNumber(prev => {
          if (data.room && data.room !== prev) {
            localStorage.setItem('sp_room', data.room);
            return data.room;
          }
          return prev;
        });
      }
      
      // Cart/Favorites sync ONLY if they differ from local
      // We no longer sync cart DOWN to prevent persisting selected items on page reload.
      // if (data.cart) {
      //   const s = JSON.stringify(data.cart);
      //   setCart(prev => {
      //     if (s !== JSON.stringify(prev) && (data.cart.length > 0 || prev.length === 0)) {
      //       lastSyncedCartRef.current = s;
      //       return data.cart;
      //     }
      //     return prev;
      //   });
      // }
      
      if (data.favorites) {
        const s = JSON.stringify(data.favorites);
        setFavorites(prev => {
          if (s !== JSON.stringify(prev)) {
            lastSyncedFavoritesRef.current = s;
            return data.favorites;
          }
          return prev;
        });
      }
      
      setIsProfileLoaded(true);
      setIsSyncing(false);
    }, (error) => {
      if (!error.message.includes('permission-denied')) {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      }
    });
    unsubs.push(unsubscribeProfile);

    return () => unsubs.forEach(u => u());
  }, [uid, authUid]);

  // Handle Addresses Fetch in a separate effect to avoid loop with isProfileLoaded
  useEffect(() => {
    if (!uid || !isProfileLoaded) {
      return;
    }

    const fetchAddresses = async () => {
      console.log("StoreContext: Fetching addresses for UID:", uid);
      const addressesRef = collection(db, 'users', uid, 'addresses');
      
      try {
        if (getIsQuotaExceeded()) return;

        const snapshot = await getDocs(addressesRef);
        const fetchedAddresses = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Address[];

        setAddresses(prev => {
          const uniqueItems = new Map<string, Address>();

          // 1. Add local addresses from current memory state
          prev.forEach(addr => {
            const key = [
              addr.phone,
              addr.township,
              addr.street,
              addr.building,
              addr.room
            ].map(v => (v || '').toString().toLowerCase().trim().replace(/\s+/g, '')).join('|');
            uniqueItems.set(key, addr);
          });

          // 2. Overwrite or add addresses fetched from Firestore
          fetchedAddresses.forEach(addr => {
            const key = [
              addr.phone,
              addr.township,
              addr.street,
              addr.building,
              addr.room
            ].map(v => (v || '').toString().toLowerCase().trim().replace(/\s+/g, '')).join('|');

            // If the key is not present, or if Firestore address is default whereas local is not, prioritize Firestore
            if (!uniqueItems.has(key) || (addr.isDefault && !uniqueItems.get(key)?.isDefault)) {
              uniqueItems.set(key, addr);
            }
          });

          const mergedAddresses = Array.from(uniqueItems.values());

          // 3. Sync local-only addresses to Firestore in the background
          const localOnlyAddresses = mergedAddresses.filter(ma => 
            !fetchedAddresses.some(fa => fa.id === ma.id)
          );

          if (localOnlyAddresses.length > 0 && !getIsQuotaExceeded()) {
            console.log("StoreContext: Uploading local-only addresses to Firestore in background:", localOnlyAddresses);
            const batch = writeBatch(db);
            localOnlyAddresses.forEach(la => {
              const cleanAddr = { ...la, authUid: authUid || '' };
              batch.set(doc(addressesRef, la.id), cleanAddr);
            });
            batch.commit().catch(e => console.warn("Background address sync to Firestore failed:", e));
          }

          return mergedAddresses;
        });
      } catch (error: any) {
        if (!(error instanceof Error) || !error.message?.includes('resource-exhausted')) {
          handleFirestoreError(error, OperationType.LIST, `users/${uid}/addresses`);
        }
      }
    };

    fetchAddresses();
  }, [uid, isProfileLoaded, authUid]);

  const setSelectedAddressId = (id: string | null) => {
    setSelectedAddressIdState(id);
    if (id) {
      localStorage.setItem('sp_selected_address_id', id);
    } else {
      localStorage.removeItem('sp_selected_address_id');
    }
  };

  // Persist addresses to localStorage

  // Dedicated Effect to sync Favorites to Firestore (Debounced)
  const favSyncTimeoutRef = useRef<NodeJS.Timeout|null>(null);
  useEffect(() => {
    if (!uid || !isProfileLoaded || getIsQuotaExceeded()) return;
    
    const favString = JSON.stringify(favorites);
    if (favString !== lastSyncedFavoritesRef.current) {
      if (favSyncTimeoutRef.current) clearTimeout(favSyncTimeoutRef.current);
      
      favSyncTimeoutRef.current = setTimeout(() => {
        console.log("StoreContext: Pushing debounced favorites update to cloud", favorites.length);
        lastSyncedFavoritesRef.current = favString;
        updateDoc(doc(db, 'users', uid), {
          favorites: favorites
        }).catch(err => {
          if (!err.message?.includes('resource-exhausted')) {
            console.error("Favorites sync to Firestore failed:", err);
          }
        });
      }, 5000); // Increased debounce to 5s
    }
    
    return () => {
      if (favSyncTimeoutRef.current) clearTimeout(favSyncTimeoutRef.current);
    };
  }, [favorites, uid, isProfileLoaded]);

  // Cart sync up to Firestore is removed to prevent persistence

  // Persistence Helpers
  const getCacheTime = (key: string) => {
    const time = localStorage.getItem(`sp_cache_time_${key}`);
    return time ? parseInt(time, 10) : 0;
  };

  const setCacheTime = (key: string) => {
    localStorage.setItem(`sp_cache_time_${key}`, Date.now().toString());
  };

  const isCacheValid = (key: string, ttlMs = 1800000) => { // Default 30 mins
    const now = Date.now();
    const lastSync = getCacheTime(key);
    return (now - lastSync) < ttlMs;
  };

  // Sync categories from Firestore in real-time for both customers and admins
  useEffect(() => {
    if (getIsQuotaExceeded()) return;

    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
      setCategories(prev => {
        const next = JSON.stringify(data);
        const current = JSON.stringify(prev);
        if (next !== current) {
          localStorage.setItem('sp_categories', next);
          setCacheTime('categories');
          return data;
        }
        return prev;
      });
    }, (error) => {
      if (!error.message.includes('resource-exhausted')) {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync serviceAreas from Firestore (Cached)
  useEffect(() => {
    const fetchServiceAreas = async () => {
      if (serviceAreas.length > 0 && isCacheValid('serviceAreas', 3600000)) return;
      
      try {
        const snapshot = await getDocs(collection(db, 'serviceAreas'));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ServiceArea[];
        if (data.length > 0) {
          setServiceAreas(prev => {
            const next = JSON.stringify(data);
            const current = JSON.stringify(prev);
            return next !== current ? data : prev;
          });
          setCacheTime('serviceAreas');
        }
      } catch (error) {}
    };

    fetchServiceAreas();

    // Removed real-time listener for service areas to save quota
  }, [isAdmin]);

  const addServiceArea = async (area: Omit<ServiceArea, 'id'>) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot add service area.');
      return;
    }
    try {
      await addDoc(collection(db, 'serviceAreas'), area);
      toast.success('Service area added');
    } catch (error) {
      toast.error('Failed to add service area');
      handleFirestoreError(error, OperationType.CREATE, 'serviceAreas');
    }
  };

  const updateServiceArea = async (id: string, updates: Partial<ServiceArea>) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update service area.');
      return;
    }
    try {
      await updateDoc(doc(db, 'serviceAreas', id), updates);
      toast.success('Service area updated');
    } catch (error) {
      toast.error('Failed to update service area');
      handleFirestoreError(error, OperationType.UPDATE, `serviceAreas/${id}`);
    }
  };

  const deleteServiceArea = async (id: string) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot delete service area.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'serviceAreas', id));
      toast.success('Service area deleted');
    } catch (error) {
      toast.error('Failed to delete service area');
      handleFirestoreError(error, OperationType.DELETE, `serviceAreas/${id}`);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update category.');
      return;
    }
    
    // Sanitize updates
    const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof Category] = value as any;
      }
      return acc;
    }, {} as any);

    try {
      // Optimistic update
      setCategories(prev => {
        const next = prev.map(c => c.id === id ? { ...c, ...cleanUpdates } : c);
        localStorage.setItem('sp_categories', JSON.stringify(next));
        setCacheTime('categories');
        return next;
      });

      await updateDoc(doc(db, 'categories', id), cleanUpdates);
      toast.success('Category updated');
    } catch (error) {
      toast.error('Failed to update category');
      handleFirestoreError(error, OperationType.UPDATE, `categories/${id}`);
    }
  };

  const addCategory = async (category: Omit<Category, 'id'>) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot add category.');
      return;
    }
    try {
      const id = category.key.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      // Optimistic add
      setCategories(prev => {
        const next = [...prev, { ...category, id }];
        localStorage.setItem('sp_categories', JSON.stringify(next));
        setCacheTime('categories');
        return next;
      });

      await setDoc(doc(db, 'categories', id), { ...category, id });
      toast.success('Category added');
    } catch (error) {
      toast.error('Failed to add category');
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  const deleteCategory = async (id: string) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot delete category.');
      return;
    }
    try {
      // Optimistic delete
      setCategories(prev => {
        const next = prev.filter(c => c.id !== id);
        localStorage.setItem('sp_categories', JSON.stringify(next));
        setCacheTime('categories');
        return next;
      });

      await deleteDoc(doc(db, 'categories', id));
      toast.success('Category deleted');
    } catch (error) {
      toast.error('Failed to delete category');
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  };

  // Sync products from Firestore in real-time for both customers and admins
  useEffect(() => {
    if (getIsQuotaExceeded()) return;

    const q = query(collection(db, 'products'), limit(300));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(prev => {
        const next = JSON.stringify(productsData);
        const current = JSON.stringify(prev);
        if (next !== current) {
          localStorage.setItem('sp_products', next);
          return productsData;
        }
        return prev;
      });
      setCacheTime('products');
    }, (error) => {
      if (!error.message.includes('resource-exhausted')) {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync Coupons from Firestore
  const syncingCoupons = useRef(false);
  useEffect(() => {
    const fetchCoupons = async () => {
      if (coupons.length > 0 && isCacheValid('coupons', 3600000)) return;
      if (syncingCoupons.current) return;
      syncingCoupons.current = true;
      try {
        const q = query(collection(db, 'coupons'), limit(20));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Coupon[];
        setCoupons(prev => {
          const next = JSON.stringify(data);
          const current = JSON.stringify(prev);
          return next !== current ? data : prev;
        });
        setCacheTime('coupons');
      } catch (error) {
      } finally {
        syncingCoupons.current = false;
      }
    };
    fetchCoupons();
  }, []);

  // Sync Audit Logs from Firestore
  useEffect(() => {
    if (!authUid || !isAdmin) return;
    if (auditLogs.length > 0 && isCacheValid('auditLogs', 600000)) return; // 10 min cache

    const fetchAuditLogs = async () => {
      try {
        const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(100));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AuditLog[];
        setAuditLogs(data);
        setCacheTime('auditLogs');
      } catch (error) {
        console.error('Firestore auditLogs fetch error:', error);
      }
    };
    if (isAdminPanelActive) fetchAuditLogs();
  }, [authUid, isAdmin, isAdminPanelActive]);

  // Sync Broadcast Notifications from Firestore periodically
  useEffect(() => {
    const fetchBroadcasts = async () => {
      // Use cache if available
      if (broadcastNotifications.length > 0 && isCacheValid('broadcasts', 3600000)) return; 
      
      if (getIsQuotaExceeded()) return;

      try {
        const q = query(collection(db, 'broadcastNotifications'), orderBy('timestamp', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BroadcastNotification[];
        
        setBroadcastNotifications(prev => {
          const next = JSON.stringify(data);
          const current = JSON.stringify(prev);
          return next !== current ? data : prev;
        });

        setCacheTime('broadcasts');
      } catch (error: any) {
        if (!(error instanceof Error) || !error.message?.includes('resource-exhausted')) {
          console.error('Firestore broadcastNotifications fetch error:', error);
        }
      }
    };

    fetchBroadcasts();
  }, []); // Run on mount only, rely on cache or manual refresh

  const addNotification = React.useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `NT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
  }, [setNotifications]);

  useEffect(() => {
    if (!authUid || !isAdmin) return;
    if (admins.length > 0 && isCacheValid('admins', 3600000)) return; // 1 hour cache

    const fetchAdmins = async () => {
      try {
        const querySnapshot = await getDocs(query(collection(db, 'admins'), limit(50)));
        const data = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as any as AdminUser[];
        setAdmins(data);
        setCacheTime('admins');
      } catch (error) {
        console.error('Firestore admins fetch error:', error);
      }
    };
    if (isAdminPanelActive) fetchAdmins();
  }, [authUid, isAdmin, isAdminPanelActive]);

  // Sync All Users from Firestore (Admin only) - Changed to getDocs to save quota
  useEffect(() => {
    if (!authUid || !isAdmin || !isAdminPanelActive) return;
    if (getIsQuotaExceeded()) return;

    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), limit(50));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(data);
      } catch (error) {
        console.error('Firestore users fetch error:', error);
      }
    };
    fetchUsers();
  }, [authUid, isAdmin, isAdminPanelActive]);

  // Sync Promotion Banners from Firestore in real-time for both customers and admins
  useEffect(() => {
    if (getIsQuotaExceeded()) return;

    const q = query(collection(db, 'promotionBanners'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PromotionBanner[];
      const sortedData = data.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      setPromotionBanners(prev => {
        const next = JSON.stringify(sortedData);
        const current = JSON.stringify(prev);
        if (next !== current) {
          localStorage.setItem('sp_banners', next);
          return sortedData;
        }
        return prev;
      });
      setCacheTime('banners');
    }, (error) => {
      if (!error.message.includes('resource-exhausted')) {
        handleFirestoreError(error, OperationType.LIST, 'promotionBanners');
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync Deals from Firestore
  useEffect(() => {
    if (getIsQuotaExceeded()) return;
    const q = query(collection(db, 'deals'), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Deal[];
      setDeals(prev => {
        const next = JSON.stringify(data);
        const current = JSON.stringify(prev);
        if (next !== current) {
          localStorage.setItem('sp_deals', next);
          setCacheTime('deals');
          return data;
        }
        return prev;
      });
    }, (error) => {
      // ignore
    });
    return () => unsubscribe();
  }, []);

  // Sync Bundles from Firestore
  useEffect(() => {
    if (getIsQuotaExceeded()) return;
    const q = query(collection(db, 'bundles'), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Bundle[];
      setBundles(prev => {
        const next = JSON.stringify(data);
        const current = JSON.stringify(prev);
        if (next !== current) {
          localStorage.setItem('sp_bundles', next);
          setCacheTime('bundles');
          return data;
        }
        return prev;
      });
    }, (error) => {
      // ignore
    });
    return () => unsubscribe();
  }, []);

  // Initialize Auth session
  useEffect(() => {
    // Set persistence to LOCAL to keep user logged in across sessions
    const setPersistenceWithRetry = async (retries = 3) => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log("StoreContext: Auth persistence set to LOCAL");
      } catch (err: any) {
        if (err.code === 'auth/network-request-failed' && retries > 0) {
          console.warn(`Auth persistence failed (network-error). Retrying in 1s... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return setPersistenceWithRetry(retries - 1);
        }
        handleFirestoreError(err, OperationType.WRITE, 'auth/persistence');
      }
    };
    setPersistenceWithRetry();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUid(user.uid);
        if (user.email) {
          setUserEmail(prev => prev !== user.email ? user.email : prev);
          // Clean up stale session remnants synchronously if UID changes
          setCurrentAdmin(prev => prev && prev.uid !== user.uid ? null : prev);
          setRiderInfo(prev => prev && prev.uid !== user.uid ? null : prev);
        } else {
          setUserEmail('');
          setIsAdmin(prev => prev !== false ? false : prev);
          setCurrentAdmin(null);
          setIsRider(prev => prev !== false ? false : prev);
          setRiderInfo(null);
        }
        setIsAuthLoading(false);
      } else {
        setAuthUid(null);
        setUserEmail('');
        setIsAdmin(prev => prev !== false ? false : prev);
        setCurrentAdmin(null);
        setIsRider(prev => prev !== false ? false : prev);
        setRiderInfo(null);
        // Sign in anonymously if no user is present with retries
        let retryCount = 0;
        const maxRetries = 5;
        
        const attemptSignIn = () => {
          signInAnonymously(auth).then(() => {
            setIsAuthLoading(false);
          }).catch(err => {
            if (err.code === 'auth/network-request-failed' && retryCount < maxRetries) {
              retryCount++;
              const delay = Math.pow(2, retryCount) * 1000;
              console.warn(`Anonymous auth failed (network-error). Retrying in ${delay}ms... (Attempt ${retryCount}/${maxRetries})`);
              setTimeout(attemptSignIn, delay);
            } else {
              setIsAuthLoading(false);
              if (err.code === 'auth/admin-restricted-operation') {
                console.warn("[Firebase] Anonymous authentication is currently disabled in your Firebase/Google Cloud project. Please go to the Firebase Console -> Authentication -> Sign-in method and enable 'Anonymous' to support guest user features with unique identifiers.");
              } else {
                console.error("Anonymous auth failed:", err);
              }
            }
          });
        };
        
        attemptSignIn();
      }
    });

    // Safety timeout: Ensure loading always clears
    const timer = setTimeout(() => {
      setIsAuthLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []); // Run once on mount

  // Verify Admin Status
  useEffect(() => {
    if (!authUid) {
      setIsAdmin(prev => prev !== false ? false : prev);
      return;
    }

    const hardcodedAdmins = ['sartawset@gmail.com', 'yelwinaung9981@gmail.com', 'saphosaung@gmail.com'];
    
    // Only fetch from Firestore if we don't have it in local storage OR it's been a while, and the UID matches
    const lastCheck = getCacheTime('admin_check');
    const now = Date.now();
    if (isAdmin && currentAdmin && currentAdmin.uid === authUid && (now - lastCheck) < 3600000) { // 1 hour cache for admin status
      return;
    }

    const fetchAdmin = async () => {
      try {
        const snap = await getDoc(doc(db, 'admins', authUid));
        if (snap.exists()) {
          const adminData = snap.data() as AdminUser;
          
          if (userEmail && hardcodedAdmins.map(e => e.toLowerCase()).includes(userEmail.toLowerCase()) && adminData.role !== 'superadmin') {
             adminData.role = 'superadmin';
             await setDoc(doc(db, 'admins', authUid), { role: 'superadmin' }, { merge: true });
          }
          
          setIsAdmin(prev => prev !== true ? true : prev);
          setCurrentAdmin({ uid: snap.id, ...adminData });
          setCacheTime('admin_check');
        } else if (userEmail && hardcodedAdmins.map(e => e.toLowerCase()).includes(userEmail.toLowerCase())) {
          // Auto-create doc for hardcoded admins if missing
          const newAdmin = {
            uid: authUid,
            email: userEmail,
            name: userEmail.split('@')[0],
            role: 'superadmin' as const,
            createdAt: serverTimestamp()
          };
          await setDoc(doc(db, 'admins', authUid), newAdmin);
          setIsAdmin(true);
          setCurrentAdmin(newAdmin as any);
        } else {
          setIsAdmin(prev => prev !== false ? false : prev);
          setCurrentAdmin(null);
        }
      } catch (err) {
        console.error("Failed to fetch admin status:", err);
      }
    };
    fetchAdmin();
  }, [authUid, userEmail, isAdmin, currentAdmin]); // Keep isAdmin and currentAdmin for cache and change verification

  // Verify Rider Status
  useEffect(() => {
    if (!authUid) {
      setIsRider(prev => prev !== false ? false : prev);
      return;
    }

    const lastCheck = getCacheTime('rider_check');
    const now = Date.now();
    if (isRider && riderInfo && riderInfo.uid === authUid && (now - lastCheck) < 3600000) { // 1 hour cache for rider status
      return;
    }

    const fetchRider = async () => {
      try {
        const snap = await getDoc(doc(db, 'riders', authUid));
        if (snap.exists()) {
          const riderData = snap.data();
          setIsRider(prev => prev !== true ? true : prev);
          setRiderInfo({ uid: snap.id, ...riderData });
          setCacheTime('rider_check');
        } else {
          setIsRider(prev => prev !== false ? false : prev);
          setRiderInfo(null);
        }
      } catch (err) {
        console.error("Failed to fetch rider status:", err);
      }
    };
    fetchRider();
  }, [authUid, isRider, riderInfo]);

  // Manual fetch for rider/admin history to save real-time quota
  const fetchOrderHistory = async (riderId?: string) => {
    if (getIsQuotaExceeded()) return [];
    try {
      console.log("StoreContext: Manual history fetch for:", riderId || 'admin');
      let q;
      if (riderId) {
        q = query(
          collection(db, 'orders'), 
          where('assignedTo', '==', riderId), 
          where('status', '==', 'delivered'), 
          orderBy('timestamp', 'desc'),
          limit(30)
        );
      } else if (isAdmin) {
        q = query(
          collection(db, 'orders'), 
          where('status', '==', 'delivered'), 
          orderBy('timestamp', 'desc'),
          limit(30)
        );
      } else {
        return [];
      }
      
      const snap = await getDocs(q);
      const historyData = snap.docs.map(d => {
        const data = d.data() as any;
        return { id: d.id, ...data } as Order;
      });
      return historyData;
    } catch (error) {
      console.error("History fetch failed:", error);
      return [];
    }
  };

  // End of rider check removal

  // Session tracking removed to prevent remote termination issues
  useEffect(() => {
    if (!uid) {
      setSessions([]);
      return;
    }
  }, [uid]);

  const revokeSession = async (sessionId: string) => {
    if (!uid) return;
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot revoke session.');
      return;
    }
    const t = (key: string) => (translations[language] as any)[key] || key;
    try {
      await deleteDoc(doc(db, 'users', uid, 'sessions', sessionId));
      toast.success(t('sessionRevoked'));
    } catch (error) {
      toast.error(t('failedToRevokeSession'));
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}/sessions/${sessionId}`);
    }
  };

  const logout = async () => {
    try {
      console.log("StoreContext: Logout initiated");
      // Reset state synchronously immediately for instant UI feedback
      setIsAdmin(false);
      setCurrentAdmin(null);
      setIsRider(false);
      setRiderInfo(null);
      setUserEmail('');
      setAuthUid(null);
      
      const currentUid = uid;
      const sid = currentSessionId;
      
      // Perform signOut - this will trigger onAuthStateChanged(null)
      await signOut(auth);
      
      // Background session deletion to avoid blocking UI
      if (currentUid && sid && !getIsQuotaExceeded()) {
        deleteDoc(doc(db, 'users', currentUid, 'sessions', sid)).catch(() => {
          // Ignore background errors
        });
      }
      
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('sp_user_phone');
      localStorage.removeItem('sp_favorites');
      localStorage.removeItem('sp_cache_time_admin_check');
      localStorage.removeItem('sp_is_admin');
      
      clearUserData();
      setIsProfileLoaded(false);
      lastSyncedUidRef.current = null;
      lookupPhoneMappingRef.current = null;
      sessionStorage.clear();
      
    } catch (error) {
      console.error("Logout error:", error);
      clearUserData();
      setAuthUid(null);
      lastSyncedUidRef.current = null;
      throw error;
    }
  };

  const forceSync = useCallback(async () => {
    if (!uid || getIsQuotaExceeded()) return;
    console.log("StoreContext: Force sync initiated for UID:", uid);
    setIsSyncing(true);
    try {
      const userDocRef = doc(db, 'users', uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.favorites) {
          const merged = Array.from(new Set([...(data.favorites || []), ...favorites]));
          setFavorites(merged);
          lastSyncedFavoritesRef.current = JSON.stringify(merged);
          localStorage.setItem('sp_favorites', JSON.stringify(merged));
        }
        if (data.points !== undefined) setPoints(data.points);
        if (data.name) setUserName(data.name);
        toast.success("Account data synced!");
      }
    } catch (err) {
      console.error("Force sync failed:", err);
      toast.error("Sync failed. Please check network.");
    } finally {
      setIsSyncing(false);
      setIsProfileLoaded(true);
    }
  }, [uid, favorites, cart]);

  const updateUserProfile = async (profile: {
    name?: string;
    phone?: string;
    room?: string;
    avatar?: string;
    email?: string;
    birthday?: string;
  }) => {
    if (!uid) return;

    // Update local state
    if (profile.name !== undefined) {
      setUserName(profile.name);
      localStorage.setItem('sp_user_name', profile.name);
    }
    if (profile.phone !== undefined) {
      setUserPhone(profile.phone);
      localStorage.setItem('sp_user_phone', profile.phone);
    }
    if (profile.room !== undefined) {
      setRoomNumber(profile.room);
      localStorage.setItem('sp_room', profile.room);
    }
    if (profile.avatar !== undefined) {
      setUserAvatar(profile.avatar);
      localStorage.setItem('sp_user_avatar', profile.avatar);
    }
    if (profile.email !== undefined) {
      setUserEmail(profile.email);
      localStorage.setItem('sp_user_email', profile.email);
    }
    if (profile.birthday !== undefined) {
      setUserBirthday(profile.birthday);
      localStorage.setItem('sp_user_birthday', profile.birthday);
    }

    // Update Firestore
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Profile updated locally.');
      return;
    }
    const userDocRef = doc(db, 'users', uid);
    try {
      const updateData: any = {
        ...profile
      };
      if (authUid) updateData.authUid = authUid;
      
      await updateDoc(userDocRef, updateData);
    } catch (error) {
      console.error("Error updating profile in Firestore:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  // Sync Orders from Firestore
  useEffect(() => {
    // Only continue if we have a user identity OR we are in a portal that needs all orders
    if (!uid && !isAdminPanelActive && !isDeliveryPortalActive) return;
    if (getIsQuotaExceeded()) return;

    let unsubUserOrders = () => {};
    if (uid) {
      // Always fetch user's personal orders regardless of admin status
      const userOrdersQuery = query(
        collection(db, 'orders'), 
        where('uid', '==', uid),
        limit(20) // Optimization: Limit user's orders shown by default
      );

      unsubUserOrders = onSnapshot(userOrdersQuery, (snapshot) => {
        const fetchedOrders = snapshot.docs.map(doc => {
          const data = doc.data();
          let createdAtMillis = Date.now();
          if (data.createdAt) {
            if (typeof data.createdAt.toMillis === 'function') createdAtMillis = data.createdAt.toMillis();
            else if (typeof data.createdAt === 'number') createdAtMillis = data.createdAt;
            else if (typeof data.createdAt === 'string') createdAtMillis = new Date(data.createdAt).getTime();
          } else if (data.timestamp) createdAtMillis = data.timestamp;

          return { ...data, id: doc.id, createdAt: createdAtMillis, timestamp: createdAtMillis };
        }) as Order[];
        
        const validOrders = fetchedOrders.filter(o => o.uid === uid).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        // Only update state if JSON changed to prevent re-render loops
        setOrders(prev => {
          const newOrdersStr = JSON.stringify(validOrders);
          const oldOrdersStr = JSON.stringify(prev);
          if (newOrdersStr !== oldOrdersStr) {
            return validOrders;
          }
          return prev;
        });
      }, (error) => {
        // Only log if not a standard "unauthenticated" error for guests
        if (!error.message.includes('missing-or-insufficient-permissions') && !error.message.includes('resource-exhausted')) {
          handleFirestoreError(error, OperationType.LIST, 'orders');
        }
      });
    }

    // Admin specific fetch: fetch active orders separately to `adminOrders`
    let unsubAdminOrders = () => {};
    if ((isAdminPanelActive || isDeliveryPortalActive) && isAdmin) {
      // Fetch latest orders regardless of status so they don't disappear when delivered
      const adminOrdersQuery = query(
        collection(db, 'orders'), 
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      let initialLoad = true;

      unsubAdminOrders = onSnapshot(adminOrdersQuery, (snapshot) => {
        const fetchedOrders = snapshot.docs.map(doc => {
          const data = doc.data();
          let createdAtMillis = Date.now();
          if (data.createdAt) {
            if (typeof data.createdAt.toMillis === 'function') createdAtMillis = data.createdAt.toMillis();
            else if (typeof data.createdAt === 'number') createdAtMillis = data.createdAt;
            else if (typeof data.createdAt === 'string') createdAtMillis = new Date(data.createdAt).getTime();
          } else if (data.timestamp) createdAtMillis = data.timestamp;

          return { ...data, id: doc.id, createdAt: createdAtMillis, timestamp: createdAtMillis };
        }) as Order[];
        
        // Handle new order notifications strictly in StoreContext now
        if (!initialLoad) {
          snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
              const newOrder = change.doc.data() as Order;
              
              // Only notify for VERY recent orders (within last 2 minutes)
              // This prevents a notification storm on startup or when the listener restarts
              let orderTime = Date.now();
              const data = change.doc.data();
              if (data.createdAt) {
                if (typeof data.createdAt.toMillis === 'function') orderTime = data.createdAt.toMillis();
                else if (typeof data.createdAt === 'number') orderTime = data.createdAt;
                else if (typeof data.createdAt === 'string') orderTime = new Date(data.createdAt).getTime();
              }
              
              const isRecent = (Date.now() - orderTime) < 120000; // 2 minutes
              
              if (isRecent) {
                const newOrder = { ...data, id: change.doc.id } as Order;
                toast.success(`New Order: ${newOrder.customerName}`, {
                  description: `Room ${newOrder.roomNumber} - Total: ${formatPrice(newOrder.total)}`,
                });
                const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
                audio.play().catch(e => console.log('Notification sound error:', e));
              }
            }
          });
        }
        initialLoad = false;
        
        setAdminOrders(prev => {
          const newState = JSON.stringify(fetchedOrders);
          const oldState = JSON.stringify(prev);
          return newState !== oldState ? fetchedOrders : prev;
        });
      }, (error) => {
        if (!error.message.includes('resource-exhausted')) {
          handleFirestoreError(error, OperationType.LIST, 'admin_orders');
        }
      });
    } else {
      setAdminOrders([]);
    }

    return () => {
      unsubUserOrders();
      unsubAdminOrders();
    };
  }, [uid, isAdmin, isAdminPanelActive, isDeliveryPortalActive]);

  const [supportNumber, setSupportNumber] = useState(() => {
    return localStorage.getItem('sp_support_number') || '601128096366';
  });
  const [supportContacts, setSupportContactsState] = useState<SupportContact[]>(() => {
    const saved = localStorage.getItem('sp_support_contacts');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'help', type: 'help', labelEn: 'Help Center', labelMm: 'အကူအညီဗဟိုဌာန', phone: '601128096366' },
      { id: 'support', type: 'general', labelEn: 'General Support', labelMm: 'အထွေထွေ အကူအညီ', phone: '601128096366' },
      { id: 'cancel', type: 'cancellation', labelEn: 'Cancellation Request', labelMm: 'အော်ဒါပယ်ဖျက်ရန်', phone: '601128096366' },
      { id: 'order', type: 'order', labelEn: 'Order Inquiries', labelMm: 'အောဒါမေးမြန်းမှုများ', phone: '601128096366' }
    ];
  });

  const setSupportContacts = async (contacts: SupportContact[]) => {
    setSupportContactsState(contacts);
    localStorage.setItem('sp_support_contacts', JSON.stringify(contacts));
    
    // Also sync to firestore if admin
    if (isAdmin && !getIsQuotaExceeded()) {
      try {
        await setDoc(doc(db, 'settings', 'support'), { contacts }, { merge: true });
      } catch (err) {
        console.error("Failed to sync support contacts:", err);
      }
    }
  };


  const [shopPhone, setShopPhoneState] = useState(() => {
    return localStorage.getItem('sp_shop_phone') || '+95 9 123 456 789';
  });
  const [shopEmail, setShopEmailState] = useState(() => {
    return localStorage.getItem('sp_shop_email') || 'concierge@sartawset.com';
  });
  const [bankName, setBankNameState] = useState(() => {
    return localStorage.getItem('sp_bank_name') || 'Maybank';
  });
  const [bankAccountNumber, setBankAccountNumberState] = useState(() => {
    return localStorage.getItem('sp_bank_acc_num') || '1234 5678 9012';
  });
  const [bankAccountName, setBankAccountNameState] = useState(() => {
    return localStorage.getItem('sp_bank_acc_name') || 'SAR TAW SET GROCERY';
  });

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('sp_email_enabled');
    return saved === null ? true : saved === 'true';
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => safeParse(localStorage.getItem('sp_payment_methods'), [
    { id: 'pm-1', type: 'visa', last4: '4242', expiry: '12/26', cardHolder: 'SAR TAW SET', isDefault: true }
  ]));
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('sp_language') || 'en';
    console.log('StoreContext: Initial language:', saved);
    return saved;
  });
  const [currency, setCurrencyState] = useState<'RM' | 'MMK'>(() => {
    return (localStorage.getItem('sp_currency') as 'RM' | 'MMK') || 'RM';
  });

  const setBankName = async (name: string) => {
    setBankNameState(name);
    localStorage.setItem('sp_bank_name', name);
    if (!authUid) return;
    if (getIsQuotaExceeded()) return;
    try {
      await setDoc(doc(db, 'settings', 'delivery'), { bankName: name }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/delivery');
    }
  };

  const setBankAccountNumber = async (num: string) => {
    setBankAccountNumberState(num);
    localStorage.setItem('sp_bank_acc_num', num);
    if (!authUid) return;
    if (getIsQuotaExceeded()) return;
    try {
      await setDoc(doc(db, 'settings', 'delivery'), { bankAccountNumber: num }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/delivery');
    }
  };

  const setBankAccountName = async (name: string) => {
    setBankAccountNameState(name);
    localStorage.setItem('sp_bank_acc_name', name);
    if (!authUid) return;
    if (getIsQuotaExceeded()) return;
    try {
      await setDoc(doc(db, 'settings', 'delivery'), { bankAccountName: name }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/delivery');
    }
  };

  const setCurrency = async (curr: 'RM' | 'MMK') => {
    setCurrencyState(curr);
    localStorage.setItem('sp_currency', curr);
    if (!authUid) return;
    if (getIsQuotaExceeded()) return;
    try {
      await setDoc(doc(db, 'settings', 'delivery'), { currency: curr }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/delivery');
    }
  };

  const formatPrice = useCallback((price: number) => {
    const safePrice = Number(price) || 0;
    if (currency === 'RM') {
      return `RM ${safePrice.toFixed(2)}`;
    }
    return `${safePrice.toLocaleString()} Ks`;
  }, [currency]);

  // End of rider notifications removal
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('sp_dark_mode') === 'true';
  });

  const [isDeliveryEnabled, setIsDeliveryEnabledState] = useState(true);
  const [deliveryFee, setDeliveryFeeState] = useState(0);
  const [isLowStockAlertEnabled, setIsLowStockAlertEnabledState] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [cutoffTime, setCutoffTimeState] = useState('06:00');
  const [isBankEnabled, setIsBankEnabledState] = useState(true);

  // Sync settings from Firestore in real-time
  useEffect(() => {
    // 1. Initial hydration from cache/local storage so there is no flickering/delay
    try {
      const cachedDelivery = safeParse(localStorage.getItem('sp_settings_delivery'), null);
      if (cachedDelivery) {
        setIsDeliveryEnabledState(cachedDelivery.enabled ?? true);
        setDeliveryFeeState(cachedDelivery.deliveryFee ?? 0);
        setIsLowStockAlertEnabledState(cachedDelivery.lowStockAlertsEnabled ?? true);
        setCutoffTimeState(cachedDelivery.cutoffTime ?? '06:00');
        setEstimatedDeliveryTimeState(cachedDelivery.estimatedDeliveryTime ?? '8:00 AM - 10:00 AM');
        setIsBankEnabledState(cachedDelivery.isBankEnabled ?? true);
        if (cachedDelivery.bankName) setBankNameState(cachedDelivery.bankName);
        if (cachedDelivery.bankAccountNumber) setBankAccountNumberState(cachedDelivery.bankAccountNumber);
        if (cachedDelivery.bankAccountName) setBankAccountNameState(cachedDelivery.bankAccountName);
        if (cachedDelivery.currency) setCurrencyState(cachedDelivery.currency);
        if (cachedDelivery.supportContacts) setSupportContactsState(cachedDelivery.supportContacts);
        if (cachedDelivery.isPaused !== undefined) setIsMaintenanceMode(cachedDelivery.isPaused);
        if (cachedDelivery.shopPhone) setShopPhoneState(cachedDelivery.shopPhone);
        if (cachedDelivery.shopEmail) setShopEmailState(cachedDelivery.shopEmail);
      }
      const cachedShop = safeParse(localStorage.getItem('sp_settings_shop'), null);
      if (cachedShop) {
        if (cachedShop.phone) setShopPhoneState(cachedShop.phone);
        if (cachedShop.email) setShopEmailState(cachedShop.email);
      }
      const cachedMaintenance = safeParse(localStorage.getItem('sp_settings_maintenance'), null);
      if (cachedMaintenance) {
        setIsMaintenanceMode(cachedMaintenance.isPaused ?? false);
      }
    } catch (e) {
      console.error('Error loading initial cached settings:', e);
    }

    // 2. Set up real-time listener for 'settings/delivery'
    const unsubDelivery = onSnapshot(doc(db, 'settings', 'delivery'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsDeliveryEnabledState(data.enabled ?? true);
        setDeliveryFeeState(data.deliveryFee ?? 0);
        setIsLowStockAlertEnabledState(data.lowStockAlertsEnabled ?? true);
        setCutoffTimeState(data.cutoffTime ?? '06:00');
        setEstimatedDeliveryTimeState(data.estimatedDeliveryTime ?? '8:00 AM - 10:00 AM');
        setIsBankEnabledState(data.isBankEnabled ?? true);
        if (data.bankName) setBankNameState(data.bankName);
        if (data.bankAccountNumber) setBankAccountNumberState(data.bankAccountNumber);
        if (data.bankAccountName) setBankAccountNameState(data.bankAccountName);
        if (data.currency) setCurrencyState(data.currency);
        if (data.supportContacts) setSupportContactsState(data.supportContacts);
        if (data.isPaused !== undefined) setIsMaintenanceMode(data.isPaused);
        if (data.shopPhone) setShopPhoneState(data.shopPhone);
        if (data.shopEmail) setShopEmailState(data.shopEmail);
        localStorage.setItem('sp_settings_delivery', JSON.stringify(data));
      }
    }, (error) => {
      console.error('Error listening to delivery settings:', error);
    });

    // 3. Fetch maintenance sync once (not real-time, cached for 30 mins)
    const fetchMaintenance = async () => {
      if (isCacheValid('settings_maintenance', 1800000)) return;
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'maintenance'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIsMaintenanceMode(data.isPaused ?? false);
          localStorage.setItem('sp_settings_maintenance', JSON.stringify(data));
          setCacheTime('settings_maintenance');
        }
      } catch (error) {
        console.error('Error fetching maintenance settings:', error);
      }
    };

    // 4. Fetch shop phone/email once (not real-time, cached for 1 hour)
    const fetchShop = async () => {
      if (isCacheValid('settings_shop', 3600000)) return;
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'shop'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.phone) {
            setShopPhoneState(data.phone);
            localStorage.setItem('sp_shop_phone', data.phone);
          }
          if (data.email) {
            setShopEmailState(data.email);
            localStorage.setItem('sp_shop_email', data.email);
          }
          localStorage.setItem('sp_settings_shop', JSON.stringify(data));
          setCacheTime('settings_shop');
        }
      } catch (error) {
        console.error('Error fetching shop settings:', error);
      }
    };

    fetchMaintenance();
    fetchShop();

    // Cleanup listener on unmount
    return () => {
      unsubDelivery();
    };
  }, []);

  const setIsDeliveryEnabled = async (enabled: boolean) => {
    if (!authUid) {
      console.error('Cannot update delivery settings: User not authenticated.');
      return;
    }
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update settings.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'delivery'), { enabled }, { merge: true });
      setIsDeliveryEnabledState(enabled);
      const cached = safeParse(localStorage.getItem('sp_settings_delivery'), {}) as any;
      cached.enabled = enabled;
      localStorage.setItem('sp_settings_delivery', JSON.stringify(cached));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/delivery');
    }
  };

  const setDeliveryFee = async (fee: number) => {
    if (!authUid) return;
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update settings.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'delivery'), { deliveryFee: fee }, { merge: true });
      setDeliveryFeeState(fee);
      const cached = safeParse(localStorage.getItem('sp_settings_delivery'), {}) as any;
      cached.deliveryFee = fee;
      localStorage.setItem('sp_settings_delivery', JSON.stringify(cached));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/delivery');
    }
  };

  const setIsLowStockAlertEnabled = async (enabled: boolean) => {
    if (!authUid) return;
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update settings.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'delivery'), { lowStockAlertsEnabled: enabled }, { merge: true });
      setIsLowStockAlertEnabledState(enabled);
      const cached = safeParse(localStorage.getItem('sp_settings_delivery'), {}) as any;
      cached.lowStockAlertsEnabled = enabled;
      localStorage.setItem('sp_settings_delivery', JSON.stringify(cached));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/delivery');
    }
  };

  const setCutoffTime = async (time: string) => {
    if (!authUid) return;
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update settings.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'delivery'), { cutoffTime: time }, { merge: true });
      setCutoffTimeState(time);
      const cached = safeParse(localStorage.getItem('sp_settings_delivery'), {}) as any;
      cached.cutoffTime = time;
      localStorage.setItem('sp_settings_delivery', JSON.stringify(cached));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/delivery');
    }
  };

  const setEstimatedDeliveryTime = async (time: string) => {
    if (!authUid) return;
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update settings.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'delivery'), { estimatedDeliveryTime: time }, { merge: true });
      setEstimatedDeliveryTimeState(time);
      const cached = safeParse(localStorage.getItem('sp_settings_delivery'), {}) as any;
      cached.estimatedDeliveryTime = time;
      localStorage.setItem('sp_settings_delivery', JSON.stringify(cached));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/delivery');
    }
  };

  const setIsBankEnabled = async (enabled: boolean) => {
    if (!authUid) return;
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update settings.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'delivery'), { isBankEnabled: enabled }, { merge: true });
      setIsBankEnabledState(enabled);
      const cached = safeParse(localStorage.getItem('sp_settings_delivery'), {}) as any;
      cached.isBankEnabled = enabled;
      localStorage.setItem('sp_settings_delivery', JSON.stringify(cached));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/delivery');
    }
  };

  const setShopPhone = async (phone: string) => {
    if (!authUid) return;
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update settings.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'shop'), { phone }, { merge: true });
      await setDoc(doc(db, 'settings', 'delivery'), { shopPhone: phone }, { merge: true });
      setShopPhoneState(phone);
      localStorage.setItem('sp_shop_phone', phone);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/shop');
    }
  };

  const setShopEmail = async (email: string) => {
    if (!authUid) return;
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update settings.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'shop'), { email }, { merge: true });
      await setDoc(doc(db, 'settings', 'delivery'), { shopEmail: email }, { merge: true });
      setShopEmailState(email);
      localStorage.setItem('sp_shop_email', email);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/shop');
    }
  };

  const updateMaintenanceMode = async (isPaused: boolean) => {
    if (!authUid) return;
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update settings.');
      return;
    }
    try {
      await setDoc(doc(db, 'settings', 'maintenance'), { isPaused }, { merge: true });
      await setDoc(doc(db, 'settings', 'delivery'), { isPaused }, { merge: true });
      setIsMaintenanceMode(isPaused);
      const cached = { isPaused };
      localStorage.setItem('sp_settings_maintenance', JSON.stringify(cached));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/maintenance');
    }
  };

  const getDeliveryDate = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);
    
    // Cut-off time logic
    const isBeforeMarket = hour < cutoffHour || (hour === cutoffHour && minute < cutoffMinute);
    
    const deliveryDate = new Date();
    if (!isBeforeMarket) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
    }
    
    const isToday = deliveryDate.toDateString() === now.toDateString();
    
    // Format date in Burmese/English based on language
    const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kuala_Lumpur', weekday: 'long', month: 'long', day: 'numeric' };
    const dateStr = deliveryDate.toLocaleDateString(language === 'mm' ? 'my-MM' : 'en-MY', options);
    
    return { date: dateStr, isToday };
  };

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    if (delta > 0 && product && product.isAvailable === false) {
      return;
    }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const addPaymentMethod = (method: Omit<PaymentMethod, 'id'>) => {
    const newMethod: PaymentMethod = {
      ...method,
      id: `pm-${Date.now()}`,
      isDefault: paymentMethods.length === 0 ? true : method.isDefault
    };
    
    if (newMethod.isDefault) {
      setPaymentMethods(prev => prev.map(pm => ({ ...pm, isDefault: false })).concat(newMethod));
    } else {
      setPaymentMethods(prev => [...prev, newMethod]);
    }
  };

  const removePaymentMethod = (id: string) => {
    setPaymentMethods(prev => {
      const filtered = prev.filter(pm => pm.id !== id);
      if (prev.find(pm => pm.id === id)?.isDefault && filtered.length > 0) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
  };

  const setDefaultPaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.map(pm => ({
      ...pm,
      isDefault: pm.id === id
    })));
  };

  const sendTelegramNotification = useCallback(async (order: Order) => {
    const itemsList = order.items.map(item => 
      `▫️ <b>${item.name}</b> (x${item.quantity})`
    ).join('\n');

    const message = `
<b>🛍 NEW ORDER PLACED 🛍</b>
━━━━━━━━━━━━━━━━━━
<b>🆔 Order ID:</b> <code>${order.id}</code>
<b>👤 Customer:</b> ${order.customerName}
<b>📞 Phone:</b> ${order.customerPhone}
<b>📍 Address:</b> ${order.address || 'N/A'}

<b>📦 ITEMS SUMMARY</b>
${itemsList}

<b>💰 TOTAL AMOUNT:</b> <b>${formatPrice(order.total)}</b>
<b>💳 PAYMENT:</b> ${order.paymentMethod}

━━━━━━━━━━━━━━━━━━
🕒 <b>Placed at:</b> ${new Date().toLocaleString()}
<i>🚀 Please process this order promptly!</i>
`;

    // 1. Send via legacy configuration if exists
    if (settings.telegramToken && settings.telegramChatId) {
      try {
        await fetch('/api/telegram/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: settings.telegramToken,
            chatId: settings.telegramChatId,
            message: message
          })
        });
      } catch (error) {
        console.error('Legacy Telegram Notification Error:', error);
      }
    }

    // 2. Send via multiple bot configurations
    if (settings.telegramConfigs && settings.telegramConfigs.length > 0) {
      const activeConfigs = settings.telegramConfigs.filter(c => c.isActive);
      
      for (const config of activeConfigs) {
        try {
          await fetch('/api/telegram/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: config.token,
              chatId: config.chatId,
              message: message
            })
          });
        } catch (error) {
          console.error(`Telegram Notification Error for ${config.name}:`, error);
        }
      }
    }
  }, [settings.telegramToken, settings.telegramChatId, settings.telegramConfigs, formatPrice]);

  const placeOrder = async (details: { 
    name: string; 
    phone: string; 
    room: string; 
    address?: string;
    paymentMethod: string; 
    pointDiscount: number; 
    pointsUsed: number;
    deliveryFee?: number;
    note?: string;
    paymentScreenshot?: string;
  }) => {
    let orderPhoneId = details.phone.replace(/[^0-9+]/g, '');
    if (orderPhoneId && !orderPhoneId.startsWith('+')) {
      orderPhoneId = `+${orderPhoneId}`;
    }
    if (!orderPhoneId) return null;
    
    // Generate a strictly 8-digit numeric order ID
    const orderId = Math.floor(10000000 + Math.random() * 90000000).toString();
    const earnedPoints = Math.floor(cartTotal * 10);
    const { date: deliveryDate, isToday } = getDeliveryDate();
    
    const deliveryCost = details.deliveryFee || 0;

    const orderData = {
      id: orderId,
      uid: orderPhoneId,
      authUid: authUid,
      roomNumber: details.room,
      address: details.address || null,
      items: [...cart],
      total: cartTotal - details.pointDiscount + deliveryCost,
      pointDiscount: details.pointDiscount,
      pointsUsed: details.pointsUsed,
      deliveryFee: deliveryCost,
      earnedPoints: earnedPoints,
      status: 'pending',
      deliveryStatus: 'pending',
      customerName: details.name,
      customerPhone: details.phone,
      paymentMethod: details.paymentMethod,
      paymentScreenshot: details.paymentScreenshot || null,
      deliveryDate,
      deliveryDay: isToday ? 'Today' : 'Tomorrow',
      note: details.note || null,
      createdAt: serverTimestamp(),
      timestamp: Date.now()
    };

    try {
      // 1. Update local state immediately for responsiveness
      if (!userPhone || userPhone !== details.phone) {
        setUserPhone(details.phone);
        localStorage.setItem('sp_user_phone', details.phone);
      }
      if (!userName || userName !== details.name) {
        setUserName(details.name);
        localStorage.setItem('sp_user_name', details.name);
      }
      if (!roomNumber || roomNumber !== details.room) {
        setRoomNumber(details.room);
        localStorage.setItem('sp_room', details.room);
      }

      // Check quota before starting batch
      if (getIsQuotaExceeded()) {
        throw new Error("Firebase Quota Exceeded: The daily limit for orders has been reached. Please try again later or contact support.");
      }
      
      if (isMaintenanceMode) {
        throw new Error("System is currently under maintenance. Please try again later.");
      }

      const batch = writeBatch(db);
      
      // 2. Update/Create User Profile
      const userDocRef = doc(db, 'users', orderPhoneId);
      const userUpdate: any = {
        uid: orderPhoneId,
        name: details.name,
        phone: details.phone,
        room: details.room,
        cart: [], // Clear cart in Firestore
      };
      
      if (authUid) userUpdate.authUid = authUid;
      userUpdate.totalOrders = increment(1);
      if (details.pointsUsed > 0) {
        userUpdate.points = increment(-details.pointsUsed);
      }
      
      batch.set(userDocRef, userUpdate, { merge: true });

      // 3. Create Order
      const orderRef = doc(db, 'orders', orderId);
      batch.set(orderRef, orderData);

      // 4. Update Product Stock (Atomic in the same batch)
      const mergedCartItems = cart.reduce((acc, item) => {
        if (acc[item.id]) {
          acc[item.id].quantity += item.quantity;
        } else {
          acc[item.id] = { ...item };
        }
        return acc;
      }, {} as Record<string, CartItem>);

      Object.values(mergedCartItems).forEach((item: CartItem) => {
        const productRef = doc(db, 'products', item.id);
        batch.set(productRef, {
          stock: increment(-item.quantity)
        }, { merge: true });
      });

      // 5. BACKGROUND SYNC: We don't 'await' the commit to make the UI instant
      // Firestore will handle this write in the background/offline queue
      console.log("StoreContext: Committing order in background for instant UI response");
      batch.commit().catch(error => {
        console.error("Background Order Commit Failed:", error);
        handleFirestoreError(error, OperationType.WRITE, 'batch-order-bg');
        // We might want to notify the user if it's a critical error
        toast.error('Warning: Cloud sync delay. Please ensure you have a stable connection.');
      });

      // 6. IMMEDIATE UI UPDATES
      setCart([]);
      const newOrderForState: Order = {
        ...orderData,
        createdAt: Date.now()
      } as Order;
      setOrders(prev => [newOrderForState, ...prev]);
      
      // 7. Telegram Notification
      sendTelegramNotification(newOrderForState);

      const t = (key: string) => (translations[language] as any)[key] || key;
      addNotification({
        title: t('orderSuccessfulTitle'),
        message: t('orderReceivedMsg').replace('{{id}}', orderId),
        type: 'order'
      });

      return orderData;
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'place-order');
      
      // Handle specific permission errors gracefully
      if (error?.message?.includes('permission') || error?.code === 'permission-denied') {
        throw new Error("Permission Denied: If you have an account, please log in. Otherwise, please check your network.");
      }
      
      throw error;
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status'], cancelReason?: string) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update order status.');
      return;
    }
    const order = adminOrders.find(o => o.id === id);
    if (!order) return;
    const oldStatus = order.status;
    
    const toastId = toast.loading(`Updating order status to ${status}...`);
    try {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status, deliveryStatus: status === 'delivered' ? 'delivered' : o.deliveryStatus, cancelReason: status === 'cancelled' ? cancelReason : o.cancelReason } : o));
      setAdminOrders(prev => prev.map(o => o.id === id ? { ...o, status, deliveryStatus: status === 'delivered' ? 'delivered' : o.deliveryStatus, cancelReason: status === 'cancelled' ? cancelReason : o.cancelReason } : o));
      
      const batch = writeBatch(db);
      const orderUpdateData: any = { status, updatedAt: serverTimestamp() };
      if (status === 'delivered') orderUpdateData.deliveryStatus = 'delivered';
      else if (status === 'preparing') orderUpdateData.deliveryStatus = 'preparing';
      else if (status === 'on_the_way') orderUpdateData.deliveryStatus = 'on_the_way';
      
      if (status === 'cancelled' && cancelReason) {
        orderUpdateData.cancelReason = cancelReason;
      }
      
      if (Object.keys(orderUpdateData).length > 0) {
        batch.update(doc(db, 'orders', id), orderUpdateData);
      }
      
      // Stock logic: Return stock if order is cancelled
      if (status === 'cancelled' && oldStatus !== 'cancelled') {
        for (const item of order.items) {
          batch.set(doc(db, 'products', item.id), {
            stock: increment(item.quantity)
          }, { merge: true });
        }
      }
      // Deduct stock if order was cancelled and is now being restored
      else if (oldStatus === 'cancelled' && status !== 'cancelled') {
        for (const item of order.items) {
          batch.set(doc(db, 'products', item.id), {
            stock: increment(-item.quantity)
          }, { merge: true });
        }
      }

      // Points logic: Add earned points only when marked as 'delivered'
      const earnedPts = order.earnedPoints || 0;
      if (status === 'delivered' && oldStatus !== 'delivered' && order.uid && earnedPts > 0) {
        batch.set(doc(db, 'users', order.uid), {
          points: increment(earnedPts)
        }, { merge: true });
        
        const transactionId = `TX-${Date.now()}`;
        batch.set(doc(db, 'users', order.uid, 'pointTransactions', transactionId), {
          id: transactionId,
          uid: order.uid,
          authUid: authUid,
          type: 'earn',
          amount: earnedPts,
          description: `Order ${id} delivered`,
          createdAt: serverTimestamp()
        });
      } 
      // Revert points if order status changes FROM delivered to something else
      else if (oldStatus === 'delivered' && status !== 'delivered' && order.uid && earnedPts > 0) {
        batch.set(doc(db, 'users', order.uid), {
          points: increment(-earnedPts)
        }, { merge: true });
        
        const transactionId = `TX-${Date.now()}`;
        batch.set(doc(db, 'users', order.uid, 'pointTransactions', transactionId), {
          id: transactionId,
          uid: order.uid,
          authUid: authUid,
          type: 'deduct',
          amount: earnedPts,
          description: `Order ${id} points reverted`,
          createdAt: serverTimestamp()
        });
      }

      // Notify User (Simulated via a subcollection in users/{uid}/notifications)
      if (order.uid) {
        const t = (key: string) => (translations[language] as any)[key] || key;
        let title = '';
        let message = '';

        if (status === 'preparing') {
          title = t('orderPreparingTitle');
          message = t('orderPreparingMsg').replace('{{id}}', id);
        } else if (status === 'delivered') {
          title = t('orderDeliveredTitle');
          message = t('orderDeliveredMsg').replace('{{id}}', id);
        } else if (status === 'cancelled') {
          title = t('orderCancelledTitle');
          message = t('orderCancelledMsg').replace('{{id}}', id);
        }

        if (title && message) {
          const notificationId = `NOTIF-${Date.now()}`;
          batch.set(doc(db, 'users', order.uid, 'notifications', notificationId), {
            id: notificationId,
            title,
            message,
            authUid: authUid,
            type: 'order',
            status: 'unread',
            createdAt: serverTimestamp(),
            orderId: id
          });
        }
      }
      
      await batch.commit();
      toast.success(`Order status updated to ${status}`, { id: toastId });
      
      // Add status update notification
      const t = (key: string) => (translations[language] as any)[key] || key;
      const statusText = t(`status${status.charAt(0).toUpperCase() + status.slice(1)}`);
      addNotification({
        title: t('orderStatusTitle'),
        message: t('orderStatusMsg').replace('{{id}}', id).replace('{{status}}', statusText),
        type: 'order'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const updateDeliveryStatus = async (id: string, status: Order['deliveryStatus'], riderInfo?: { uid: string; name: string }) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update delivery status.');
      return;
    }
    
    const toastId = toast.loading(`Updating delivery status...`);
    try {
      const updates: any = { 
        deliveryStatus: status,
        updatedAt: serverTimestamp()
      };
      
      if (status === 'preparing') {
        updates.status = 'preparing';
      }
      
      if (status === 'accepted') {
        if (riderInfo) {
          updates.assignedTo = riderInfo.uid;
          updates.assignedToName = riderInfo.name;
          updates.assignedAt = Date.now();
        }
      }
      
      if (status === 'on_the_way') {
        updates.status = 'on_the_way';
        updates.pickedUpAt = Date.now();
        // Ensure assigned info is present if picking up directly
        if (riderInfo && !updates.assignedAt) {
          updates.assignedTo = riderInfo.uid;
          updates.assignedToName = riderInfo.name;
          updates.assignedAt = Date.now();
        }
      }
      
      if (status === 'delivered') {
        updates.deliveredAt = Date.now();
        updates.status = 'delivered'; // Sync with main order status
      }

      await updateDoc(doc(db, 'orders', id), updates);
      
      // Optimistic update - convert serverTimestamp for local state
      const localUpdates = { ...updates, updatedAt: Date.now() };
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...localUpdates } : o));
      setAdminOrders(prev => prev.map(o => o.id === id ? { ...o, ...localUpdates } : o));
      
      toast.success(`Status updated to ${status?.replace('_', ' ')}`, { id: toastId });
    } catch (error) {
      toast.error('Failed to update status', { id: toastId });
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
      // Re-throw to allow caller to handle
      throw error;
    }
  };

  const cancelOrder = async (id: string) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot cancel order.');
      return;
    }
    const order = orders.find(o => o.id === id);
    if (!order || order.status === 'cancelled') return;

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'orders', id), { status: 'cancelled' }, { merge: true });
      
      if (order.pointsUsed > 0 && order.uid) {
        batch.set(doc(db, 'users', order.uid), {
          points: increment(order.pointsUsed)
        }, { merge: true });

        const transactionId = `TX-REF-${Date.now()}`;
        batch.set(doc(db, 'users', order.uid, 'pointTransactions', transactionId), {
          id: transactionId,
          uid: order.uid,
          authUid: authUid,
          type: 'refund',
          amount: order.pointsUsed,
          description: `Refund for cancelled order #${id.slice(-6)}`,
          createdAt: serverTimestamp()
        });
      }
      
      await batch.commit();
      
      const t = (key: string) => (translations[language] as any)[key] || key;
      addNotification({
        title: t('orderCancelledTitle'),
        message: t('orderCancelledMsg').replace('{{id}}', id),
        type: 'order'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const reorder = async (order: Order): Promise<{ success: boolean; message?: string }> => {
    try {
      const itemsToAdd: CartItem[] = [];
      const outOfStockItems: string[] = [];

      for (const item of order.items) {
        const product = products.find(p => p.id === item.id);
        if (product && product.stock >= item.quantity) {
          itemsToAdd.push({
            ...item,
            price: product.price // Use current price
          });
        } else {
          outOfStockItems.push(item.name);
        }
      }

      if (itemsToAdd.length === 0) {
        return { 
          success: false, 
          message: language === 'mm' ? 'ပစ္စည်းအားလုံး လက်ကျန်မရှိတော့ပါ။' : 'All items are currently out of stock.' 
        };
      }

      // Add items to cart
      setCart(prev => {
        const newCart = [...prev];
        itemsToAdd.forEach(item => {
          const existing = newCart.find(i => i.id === item.id);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            newCart.push(item);
          }
        });
        return newCart;
      });

      if (outOfStockItems.length > 0) {
        return { 
          success: true, 
          message: language === 'mm' 
            ? `${outOfStockItems.join(', ')} တို့မှာ လက်ကျန်မရှိတော့သဖြင့် ကျန်ရှိသောပစ္စည်းများကိုသာ Cart ထဲသို့ ထည့်ပေးထားပါသည်။` 
            : `Some items (${outOfStockItems.join(', ')}) are out of stock and were skipped.` 
        };
      }

      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reorder');
      return { success: false, message: 'An error occurred while reordering.' };
    }
  };

  // Persist points to localStorage
  useEffect(() => {
    localStorage.setItem('sp_points', points.toString());
  }, [points]);

  const toggleFavorite = async (id: string) => {
    setFavorites(prev => {
      const nextFavorites = prev.includes(id) 
        ? prev.filter(fid => fid !== id) 
        : [...prev, id];
        
      const favString = JSON.stringify(nextFavorites);
      localStorage.setItem('sp_favorites', favString);
      return nextFavorites;
    });
  };

  const deleteProduct = useCallback(async (id: string) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot delete product.');
      return;
    }

    // Find the product details first to extract its image URL before state modification
    const productToDelete = products.find(p => p.id === id);
    const imageUrl = productToDelete?.image;

    // Optimistic delete from local state
    setProducts(prev => prev.filter(p => p.id !== id));
    
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Product deleted successfully');
      await logAudit('delete_product', 'product', `Deleted product ${id}`);

      // Perform background image asset deletion from relevant cloud providers
      if (imageUrl) {
        if (imageUrl.includes('firebasestorage.googleapis.com')) {
          console.log(`[Asset Cleanup] Removing file from Firebase Storage: ${imageUrl}`);
          try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
            console.log(`[Asset Cleanup] Firebase Storage image successfully deleted.`);
          } catch (storageErr) {
            console.warn('[Asset Cleanup] Could not delete file from Firebase Storage (file might not exist or lacks permissions):', storageErr);
          }
        } else if (imageUrl.includes('cloudinary.com')) {
          console.log(`[Asset Cleanup] Removing file from Cloudinary: ${imageUrl}`);
          try {
            let localCloudName: string | undefined;
            let localApiKey: string | undefined;
            let localApiSecret: string | undefined;
            try {
              const cached = localStorage.getItem('sp_settings_global');
              if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.cloudinaryCloudName) {
                  localCloudName = parsed.cloudinaryCloudName;
                }
                if (parsed.cloudinaryApiKey) {
                  localApiKey = parsed.cloudinaryApiKey;
                }
                if (parsed.cloudinaryApiSecret) {
                  localApiSecret = parsed.cloudinaryApiSecret;
                }
              }
            } catch (e) {
              console.warn("Failed to parse settings cache during Cloudinary deletion pass:", e);
            }

            const response = await fetch('/api/cloudinary/delete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                imageUrl: imageUrl,
                cloudName: localCloudName,
                apiKey: localApiKey,
                apiSecret: localApiSecret
              })
            });

            if (response.ok) {
              const resData = await response.json();
              if (resData.success) {
                console.log('[Asset Cleanup] Cloudinary image successfully deleted:', resData.data);
              } else {
                console.log('[Asset Cleanup] Cloudinary bypass: server-side secrets are not yet configured.', resData.message);
              }
            } else {
              console.warn('[Asset Cleanup] Cloudinary delete endpoint returned status-error:', response.status);
            }
          } catch (cloudinaryErr) {
            console.warn('[Asset Cleanup] Could not request Cloudinary image deletion:', cloudinaryErr);
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  }, [logAudit, products]);

  const updateProductStock = async (productId: string, newStock: number) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update stock.');
      return;
    }
    try {
      await setDoc(doc(db, 'products', productId), { stock: newStock }, { merge: true });
      await logAudit('update_stock', 'product', `Updated stock for ${productId} to ${newStock}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${productId}`);
    }
  };

  const addCoupon = async (coupon: Omit<Coupon, 'id'>) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot add coupon.');
      return;
    }
    try {
      await addDoc(collection(db, 'coupons'), { ...coupon, usageCount: 0 });
      await logAudit('add_coupon', 'coupon', `Added coupon ${coupon.code}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'coupons');
    }
  };

  const updateCoupon = async (id: string, coupon: Partial<Coupon>) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update coupon.');
      return;
    }

    // Sanitize updates
    const cleanCoupon = Object.entries(coupon).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof Coupon] = value as any;
      }
      return acc;
    }, {} as any);

    try {
      await updateDoc(doc(db, 'coupons', id), cleanCoupon);
      await logAudit('update_coupon', 'coupon', `Updated coupon ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `coupons/${id}`);
    }
  };

  const deleteCoupon = async (id: string) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot delete coupon.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'coupons', id));
      await logAudit('delete_coupon', 'coupon', `Deleted coupon ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `coupons/${id}`);
    }
  };

  const refreshAllData = async () => {
    localStorage.removeItem('sp_cache_time_products');
    localStorage.removeItem('sp_cache_time_categories');
    localStorage.removeItem('sp_cache_time_coupons');
    localStorage.removeItem('sp_cache_time_banners');
    localStorage.removeItem('sp_cache_time_deals');
    localStorage.removeItem('sp_cache_time_bundles');
    
    // Trigger effects by navigating back to 'all' or simply re-fetching
    window.location.reload(); // Simplest way to re-trigger all mount effects
  };

  const sendBroadcast = async (notification: Omit<BroadcastNotification, 'id' | 'createdAt'>) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot send broadcast.');
      return;
    }
    try {
      await addDoc(collection(db, 'broadcastNotifications'), {
        ...notification,
        createdAt: serverTimestamp(),
        timestamp: Date.now()
      });
      addNotification({
        title: notification.title,
        message: notification.message,
        type: 'offer',
      });
      await logAudit('send_broadcast', 'notification', `Sent broadcast: ${notification.title}`);
      toast.success('Broadcast notification published successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'broadcastNotifications');
    }
  };

  const sendTargetedNotification = async (uid: string, notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot send notification.');
      return;
    }
    try {
      const notificationId = `NT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await setDoc(doc(db, 'users', uid, 'notifications', notificationId), {
        ...notification,
        id: notificationId,
        timestamp: serverTimestamp(),
        read: false
      });
      toast.success('Notification sent to customer');
      await logAudit('send_targeted_notification', uid, `Sent targeted notification: ${notification.title}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${uid}/notifications`);
    }
  };

  const addAdmin = async (admin: Omit<AdminUser, 'createdAt'>) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot add admin.');
      return;
    }
    try {
      await setDoc(doc(db, 'admins', admin.uid), {
        ...admin,
        createdAt: serverTimestamp()
      });
      await logAudit('add_admin', 'admin', `Added admin ${admin.email}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `admins/${admin.uid}`);
    }
  };

  const createNewAdmin = async (email: string, password: string, name: string, role: AdminUser['role'], phone?: string) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot create admin.');
      return;
    }
    try {
      const secondaryAuth = getSecondaryAuth();
      const userCredential = await createAuthUser(secondaryAuth, email, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'admins', uid), {
        uid,
        email,
        name,
        role,
        phone: phone || '',
        createdAt: serverTimestamp()
      });
      
      await logAudit('create_admin', 'admin', `Created and added admin ${email}`);
      
      // Sign out from the secondary instance immediately to avoid session confusion
      await secondaryAuth.signOut();
      
      toast.success('Admin user created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create admin user');
      console.error('Create Admin Error:', error);
    }
  };

  const createNewRider = async (email: string, password: string, name: string) => {
    if (!isAdmin) {
      toast.error('Unauthorized');
      return;
    }
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot create rider.');
      return;
    }
    try {
      const secondaryAuth = getSecondaryAuth();
      const userCredential = await createAuthUser(secondaryAuth, email, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'riders', uid), {
        uid,
        email,
        name,
        isApproved: true,
        isOnline: false,
        createdAt: serverTimestamp()
      });
      
      await logAudit('create_rider', 'rider', `Created and added rider ${email}`);
      
      await secondaryAuth.signOut();
      
      toast.success('Rider account created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create rider account');
      console.error('Create Rider Error:', error);
    }
  };

  const removeRider = async (uid: string) => {
    if (!isAdmin) {
      toast.error('Unauthorized');
      return;
    }
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot remove rider.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'riders', uid));
      await logAudit('remove_rider', 'rider', `Removed rider ${uid}`);
      toast.success('Rider removed');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `riders/${uid}`);
    }
  };

  const updateAdminRole = async (uid: string, role: AdminUser['role']) => {
    if (uid === authUid) {
      toast.error("Security risk: You cannot demote or change your own administrator role!");
      return;
    }
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update admin role.');
      return;
    }
    try {
      await updateDoc(doc(db, 'admins', uid), { role });
      await logAudit('update_admin_role', 'admin', `Updated role for ${uid} to ${role}`);
      toast.success('Admin role updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `admins/${uid}`);
    }
  };

  const updateAdminProfile = async (uid: string, updates: Partial<AdminUser>) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update admin profile.');
      return;
    }
    try {
      await setDoc(doc(db, 'admins', uid), updates, { merge: true });
      if (uid === authUid) {
        setCurrentAdmin(prev => prev ? { ...prev, ...updates } : { uid, ...updates } as any);
      }
      await logAudit('update_admin_profile', 'admin', `Updated profile for ${uid}`);
      toast.success('Admin profile updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `admins/${uid}`);
    }
  };

  const removeAdmin = async (uid: string) => {
    if (uid === authUid) {
      toast.error("Security risk: You cannot revoke/remove your own administrator access!");
      return;
    }
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot remove admin.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'admins', uid));
      await logAudit('remove_admin', 'admin', `Removed admin ${uid}`);
      toast.success('Admin access revoked successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `admins/${uid}`);
    }
  };

  const updateUserPoints = async (uid: string, points: number) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update user points.');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', uid), { points });
      await logAudit('update_user_points', 'user', `Updated points for user ${uid} to ${points}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const addProduct = useCallback(async (product: Omit<Product, 'id'>) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot add product.');
      return;
    }
    
    // Sanitize updates to remove undefined values
    const cleanProduct = Object.entries(product).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = value;
      return acc;
    }, {} as any);

    let productId = (product.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    // If name is non-latin (like Myanmar), the slug might be empty. Use a random ID in that case.
    if (!productId || productId.length < 2) {
      productId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    } else {
      // Add a small random suffix to avoid collisions even with same names
      productId = `${productId}-${Math.random().toString(36).substring(2, 5)}`;
    }
    
    const newProduct = { ...cleanProduct, id: productId };
    
    // Optimistic add
    setProducts(prev => [...prev, newProduct]);
    
    try {
      await setDoc(doc(db, 'products', productId), newProduct);
      await logAudit('add_product', 'product', `Added product ${product.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${productId}`);
      // Revert if write fails
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
  }, [logAudit]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot update product.');
      return;
    }
    
    // Sanitize updates to remove undefined values
    const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof Product] = value as any;
      }
      return acc;
    }, {} as any);

    // Optimistic update
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...cleanUpdates } : p));

    try {
      await setDoc(doc(db, 'products', id), cleanUpdates, { merge: true });
      await logAudit('update_product', 'product', `Updated product ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
      // Revert if update fails
      // TODO: Fetch single doc to revert correctly? For now, we rely on onSnapshot to correct state later
    }
  }, [logAudit]);

  const addPromotionBanner = async (banner: Omit<PromotionBanner, 'id' | 'priority'>) => {
    if (getIsQuotaExceeded()) return;
    try {
      // Auto-calculate priority to make it appear first by default
      // Higher priority = earlier in the list
      const maxPriority = promotionBanners.length > 0 
        ? Math.max(...promotionBanners.map(b => b.priority || 0)) 
        : 0;

      await addDoc(collection(db, 'promotionBanners'), {
        ...banner,
        priority: maxPriority + 1
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'promotionBanners');
    }
  };

  const updatePromotionBanner = async (id: string, banner: Partial<PromotionBanner>) => {
    if (getIsQuotaExceeded()) return;
    
    // Sanitize updates
    const cleanBanner = Object.entries(banner).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof PromotionBanner] = value as any;
      }
      return acc;
    }, {} as any);

    try {
      await setDoc(doc(db, 'promotionBanners', id), cleanBanner, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `promotionBanners/${id}`);
    }
  };

  const reorderPromotionBanners = async (reorderedBanners: PromotionBanner[]) => {
    // Update priorities locally
    const updatedBanners = reorderedBanners.map((banner, index) => ({
      ...banner,
      priority: reorderedBanners.length - index // Higher priority for earlier items in the list
    }));
    
    setPromotionBanners(updatedBanners);
    
    try {
      const { writeBatch, doc } = await import('firebase/firestore');
      const batch = writeBatch(db);
      updatedBanners.forEach(banner => {
        const { id, ...data } = banner;
        batch.set(doc(db, 'promotionBanners', id), data, { merge: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'promotionBanners/reorder');
    }
  };

  const deletePromotionBanner = async (id: string) => {
    if (getIsQuotaExceeded()) return;
    try {
      await deleteDoc(doc(db, 'promotionBanners', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `promotionBanners/${id}`);
    }
  };

  const addDeal = async (deal: Omit<Deal, 'id'>) => {
    if (getIsQuotaExceeded()) return;
    try {
      await addDoc(collection(db, 'deals'), deal);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'deals');
    }
  };

  const updateDeal = async (id: string, deal: Partial<Deal>) => {
    if (getIsQuotaExceeded()) return;
    
    // Sanitize updates
    const cleanDeal = Object.entries(deal).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof Deal] = value as any;
      }
      return acc;
    }, {} as any);
    
    try {
      await updateDoc(doc(db, 'deals', id), cleanDeal);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `deals/${id}`);
    }
  };

  const deleteDeal = async (id: string) => {
    if (getIsQuotaExceeded()) return;
    try {
      await deleteDoc(doc(db, 'deals', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `deals/${id}`);
    }
  };

  const addBundle = async (bundle: Omit<Bundle, 'id'>) => {
    if (getIsQuotaExceeded()) return;
    try {
      await addDoc(collection(db, 'bundles'), bundle);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bundles');
    }
  };

  const updateBundle = async (id: string, bundle: Partial<Bundle>) => {
    if (getIsQuotaExceeded()) return;
    
    // Sanitize updates
    const cleanBundle = Object.entries(bundle).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key as keyof Bundle] = value as any;
      }
      return acc;
    }, {} as any);

    try {
      await updateDoc(doc(db, 'bundles', id), cleanBundle);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bundles/${id}`);
    }
  };

  const deleteBundle = async (id: string) => {
    if (getIsQuotaExceeded()) return;
    try {
      await deleteDoc(doc(db, 'bundles', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bundles/${id}`);
    }
  };

  const addAddress = async (address: Omit<Address, 'id'>) => {
    const addressId = `addr-${Date.now()}`;
    const newAddress = { ...address, id: addressId, authUid: authUid || '' } as Address;
    
    // Optimistic Update
    const previousAddresses = [...addresses];
    let updatedAddresses = [...addresses];
    
    if (newAddress.isDefault) {
      updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefault: false }));
    } else if (addresses.length === 0) {
      newAddress.isDefault = true;
    }
    
    setAddresses([...updatedAddresses, newAddress]);

    if (!uid) {
      const t = (key: string) => (translations[language as keyof typeof translations] as any)[key] || key;
      toast.success(t('addressSaved') || 'Address saved successfully');
      return;
    }

    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Your changes will be saved locally but may not sync to the cloud until tomorrow.');
      return;
    }

    try {
      const batch = writeBatch(db);
      const addressesRef = collection(db, 'users', uid, 'addresses');
      
      if (newAddress.isDefault) {
        // Hard enforcement: Unset any existing default in Firestore
        const q = query(addressesRef, where('isDefault', '==', true));
        const defaultSnap = await getDocs(q);
        defaultSnap.docs.forEach(d => {
          if (d.id !== addressId) {
            batch.update(d.ref, { isDefault: false });
          }
        });
      }

      // Sanitize undefined fields to prevent crashes on Firestore writes
      const cleanNewAddress = Object.entries(newAddress).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      batch.set(doc(addressesRef, addressId), cleanNewAddress);
      await batch.commit();
      
      toast.success(translations[language === 'mm' ? 'mm' : 'en'].addressSaved || 'Address saved successfully');
    } catch (error: any) {
      setAddresses(previousAddresses); // Rollback
      
      const isPermissionError = error?.message?.includes('permission') || error?.code === 'permission-denied';
      const t = (key: string) => (translations[language] as any)[key] || key;
      
      if (isPermissionError) {
        toast.error(t('errorAddingAddress') + ': Permission Denied. If you have an account, please log in.');
      } else {
        toast.error(t('errorAddingAddress') || 'Failed to save address. Please try again.');
      }
      
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}/addresses/${addressId}`);
    }
  };

  const updateAddress = async (id: string, address: Partial<Address>) => {
    // Optimistic Update
    const previousAddresses = [...addresses];
    let updatedAddresses = addresses.map(a => {
      if (a.id === id) return { ...a, ...address };
      if (address.isDefault && a.isDefault) return { ...a, isDefault: false };
      return a;
    });
    
    setAddresses(updatedAddresses);

    if (!uid) {
      const t = (key: string) => (translations[language as keyof typeof translations] as any)[key] || key;
      toast.success(t('addressUpdated') || 'Address updated successfully');
      return;
    }

    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Your changes will be saved locally but may not sync to the cloud tomorrow.');
      return;
    }

    try {
      const batch = writeBatch(db);
      const addressesRef = collection(db, 'users', uid, 'addresses');
      
      if (address.isDefault) {
        // Hard enforcement: Unset any existing default in Firestore
        const q = query(addressesRef, where('isDefault', '==', true));
        const defaultSnap = await getDocs(q);
        defaultSnap.docs.forEach(d => {
          if (d.id !== id) {
            batch.update(d.ref, { isDefault: false });
          }
        });
      }
      
      // Sanitize undefined fields to prevent crashes on Firestore update
      const cleanAddressUpdate = Object.entries(address).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      batch.update(doc(addressesRef, id), cleanAddressUpdate);
      await batch.commit();
      
      toast.success(translations[language === 'mm' ? 'mm' : 'en'].addressUpdated || 'Address updated successfully');
    } catch (error: any) {
      setAddresses(previousAddresses); // Rollback
      
      const isPermissionError = error?.message?.includes('permission') || error?.code === 'permission-denied';
      const t = (key: string) => (translations[language] as any)[key] || key;
      
      if (isPermissionError) {
        toast.error(t('errorUpdatingAddress') + ': Permission Denied. If you have an account, please log in.');
      } else {
        toast.error(t('errorUpdatingAddress') || 'Failed to update address.');
      }
      
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/addresses/${id}`);
    }
  };

  const removeAddress = async (id: string) => {
    // Optimistic Update
    const previousAddresses = [...addresses];
    const deletedAddress = addresses.find(a => a.id === id);
    let updatedAddresses = addresses.filter(a => a.id !== id);
    
    // If we deleted the default, set first remaining as default
    if (deletedAddress?.isDefault && updatedAddresses.length > 0) {
      updatedAddresses = updatedAddresses.map((a, i) => i === 0 ? { ...a, isDefault: true } : a);
    }
    
    setAddresses(updatedAddresses);
    if (selectedAddressId === id) {
      setSelectedAddressId(updatedAddresses.length > 0 ? updatedAddresses[0].id : null);
    }

    if (!uid) {
      const t = (key: string) => (translations[language as keyof typeof translations] as any)[key] || key;
      toast.success(t('addressDeleted') || 'Address deleted successfully');
      return;
    }

    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Your changes will be saved locally but may not sync to the cloud tomorrow.');
      return;
    }

    try {
      const batch = writeBatch(db);
      const addressesRef = collection(db, 'users', uid, 'addresses');
      batch.delete(doc(addressesRef, id));
      
      if (deletedAddress?.isDefault && updatedAddresses.length > 0) {
        batch.update(doc(addressesRef, updatedAddresses[0].id), { isDefault: true });
      }
      
      await batch.commit();
      toast.success(translations[language === 'mm' ? 'mm' : 'en'].addressDeleted || 'Address deleted successfully');
    } catch (error) {
      setAddresses(previousAddresses); // Rollback
      toast.error('Failed to delete address.');
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}/addresses/${id}`);
    }
  };

  const setDefaultAddress = async (id: string) => {
    const previousAddresses = [...addresses];
    const updatedAddresses = addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    }));
    setAddresses(updatedAddresses);

    if (!uid) return;
    if (getIsQuotaExceeded()) {
      toast.error('Daily limit reached. Cannot set default address.');
      return;
    }

    try {
      const batch = writeBatch(db);
      const addressesRef = collection(db, 'users', uid, 'addresses');
      
      // Fetch all documents in Firestore that ARE currently marked as default
      const q = query(addressesRef, where('isDefault', '==', true));
      const defaultSnap = await getDocs(q);
      
      // Unset all existing defaults
      defaultSnap.docs.forEach(d => {
        if (d.id !== id) {
          batch.update(d.ref, { isDefault: false });
        }
      });
      
      // Explicitly set the new default
      batch.update(doc(addressesRef, id), { isDefault: true });
      
      await batch.commit();
    } catch (error) {
      setAddresses(previousAddresses);
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/addresses`);
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign In Error:', error);
      toast.error('Google Sign In Failed');
    }
  };

  const t = useCallback((key: string) => {
    if (!translations) return key;
    return translations[language]?.[key] || translations['en']?.[key] || key;
  }, [language]);

  const getCategoryName = useCallback((categoryId: string) => {
    const cat = (categories || []).find(c => c.id === categoryId || c.key === categoryId);
    if (!cat) return categoryId;
    
    if (language === 'my' && cat.nameMm) return cat.nameMm;
    if (language === 'ms' && cat.nameMs) return cat.nameMs;
    if (language === 'th' && cat.nameTh) return cat.nameTh;
    if (language === 'zh' && cat.nameZh) return cat.nameZh;
    if (cat.nameEn) return cat.nameEn;
    return cat.key ? t(cat.key) : cat.name;
  }, [categories, language, t]);

  const getMainName = useCallback((item: any) => {
    return item.name || item.title || '';
  }, []);

  const getSecondaryName = useCallback((item: any) => {
    const en = item.name || item.title || '';
    const mm = item.mmName || item.titleMm || '';
    const ms = item.msName || '';
    const th = item.thName || '';
    const zh = item.zhName || '';

    switch (language) {
      case 'en':
        return mm || en;
      case 'my':
      case 'mm':
        return mm || en;
      case 'th':
        return th || mm || en;
      case 'zh':
        return zh || mm || en;
      case 'ms':
        return ms || mm || en;
      default:
        return mm || en;
    }
  }, [language]);

  const getLocalizedName = useCallback((item: any) => {
    switch (language) {
      case 'ms':
        return item.msName || item.mmName;
      case 'th':
        return item.thName || item.mmName;
      case 'zh':
        return item.zhName || item.mmName;
      case 'en':
        return item.name || item.title || item.mmName;
      case 'my':
      default:
        return item.mmName;
    }
  }, [language]);

  // Consolidate LocalStorage Persistence with Debounce to reduce overhead
  useEffect(() => {
    const handler = setTimeout(() => {
      const persistToLocalStorage = () => {
        if (userName) localStorage.setItem('sp_user_name', userName);
        else localStorage.removeItem('sp_user_name');

        if (userPhone) localStorage.setItem('sp_user_phone', userPhone);
        else localStorage.removeItem('sp_user_phone');

        if (userAvatar) localStorage.setItem('sp_user_avatar', userAvatar);
        if (userEmail) localStorage.setItem('sp_user_email', userEmail);
        if (userBirthday) localStorage.setItem('sp_user_birthday', userBirthday);
        if (roomNumber) localStorage.setItem('sp_room', roomNumber);
        
        localStorage.setItem('sp_points', points.toString());
        localStorage.setItem('sp_is_admin', isAdmin ? 'true' : 'false');
        localStorage.setItem('sp_is_rider', isRider ? 'true' : 'false');
        localStorage.setItem('sp_dark_mode', darkMode ? 'true' : 'false');
        localStorage.setItem('sp_lang', language);
        localStorage.setItem('sp_currency', currency);

        if (products.length > 0) localStorage.setItem('sp_products', JSON.stringify(products));
        if (categories.length > 0) localStorage.setItem('sp_categories', JSON.stringify(categories));
        if (promotionBanners.length > 0) localStorage.setItem('sp_banners', JSON.stringify(promotionBanners));
        if (deals.length > 0) localStorage.setItem('sp_deals', JSON.stringify(deals));
        if (bundles.length > 0) localStorage.setItem('sp_bundles', JSON.stringify(bundles));
        if (serviceAreas.length > 0) localStorage.setItem('sp_serviceAreas', JSON.stringify(serviceAreas));
        if (orders.length > 0) localStorage.setItem('sp_orders', JSON.stringify(orders));
        if (favorites.length > 0) localStorage.setItem('sp_favorites', JSON.stringify(favorites));
        if (notifications.length > 0) localStorage.setItem('sp_notifications', JSON.stringify(notifications));
        if (addresses.length > 0) localStorage.setItem('sp_addresses', JSON.stringify(addresses));
        if (coupons.length > 0) localStorage.setItem('sp_coupons', JSON.stringify(coupons));
        if (broadcastNotifications.length > 0) localStorage.setItem('sp_broadcasts', JSON.stringify(broadcastNotifications));
        
        localStorage.setItem('sp_support_number', supportNumber);
        localStorage.setItem('sp_shop_phone', shopPhone);
        localStorage.setItem('sp_shop_email', shopEmail);
        localStorage.setItem('sp_bank_name', bankName);
        localStorage.setItem('sp_bank_acc_num', bankAccountNumber);
        localStorage.setItem('sp_bank_acc_name', bankAccountName);
        localStorage.setItem('sp_delivery_time', estimatedDeliveryTime);
        localStorage.setItem('sp_email_enabled', emailNotificationsEnabled ? 'true' : 'false');
        localStorage.setItem('sp_support_contacts', JSON.stringify(supportContacts));
        localStorage.setItem('sp_payment_methods', JSON.stringify(paymentMethods));
      };

      persistToLocalStorage();
      
      // Update ref for other sync logic
      stateRef.current = {
        userName, userPhone, roomNumber, userAvatar, userEmail, userBirthday, points
      };
    }, 2000); // 2 second debounce for persistence

    return () => clearTimeout(handler);
  }, [
    userName, userPhone, userAvatar, userEmail, userBirthday, roomNumber, 
    points, isAdmin, isRider, darkMode, language, currency,
    products, categories, promotionBanners, deals, bundles, serviceAreas, 
    orders, favorites, notifications, addresses, coupons, broadcastNotifications,
    supportNumber, shopPhone, shopEmail, bankName, bankAccountNumber, bankAccountName,
    estimatedDeliveryTime, emailNotificationsEnabled, supportContacts, paymentMethods
  ]);

  const value = useMemo(() => ({
    cart, 
      addToCart, 
      updateQuantity, 
      clearCart,
      cartTotal, 
      userName,
      setUserName,
      userPhone,
      setUserPhone,
      roomNumber, 
      setRoomNumber, 
      orders,
      adminOrders,
      supportNumber,
      setSupportNumber,
      supportContacts,
      setSupportContacts,
      bankName,
      setBankName,
      bankAccountNumber,
      setBankAccountNumber,
      bankAccountName,
      setBankAccountName,
      userAvatar,
      setUserAvatar,
      userEmail,
      setUserEmail,
      userBirthday,
      setUserBirthday,
      updateUserProfile,
      placeOrder, 
      updateOrderStatus,
      cancelOrder,
      reorder,
      favorites,
      toggleFavorite,
      notifications,
      addNotification,
      markNotificationAsRead,
      clearNotifications,
      emailNotificationsEnabled,
      setEmailNotificationsEnabled,
      paymentMethods,
      addPaymentMethod,
      removePaymentMethod,
      setDefaultPaymentMethod,
      points,
      setPoints,
      language,
      setLanguage,
      currency,
      setCurrency,
      formatPrice,
      getCategoryName,
      getMainName,
      getSecondaryName,
      getLocalizedName,
      t,
      darkMode,
      setDarkMode,
    isDeliveryEnabled,
    setIsDeliveryEnabled,
    deliveryFee,
    setDeliveryFee,
    isLowStockAlertEnabled,
    setIsLowStockAlertEnabled,
    isMaintenanceMode,
    updateMaintenanceMode,
    cutoffTime,
    setCutoffTime,
    estimatedDeliveryTime,
    setEstimatedDeliveryTime,
    shopPhone,
    setShopPhone,
    shopEmail,
    setShopEmail,
    isBankEnabled,
    setIsBankEnabled,
    getDeliveryDate,
    logout,
    forceSync,
    isSyncing,
    isProfileLoaded,
    uid,
    authUid,
    riderInfo,
    updateRiderProfile,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    addresses,
    addAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress,
    selectedAddressId,
    setSelectedAddressId,
    categories,
    updateCategory,
    addCategory,
    deleteCategory,
    promotionBanners,
    deals,
    bundles,
    addPromotionBanner,
    updatePromotionBanner,
    deletePromotionBanner,
    reorderPromotionBanners,
    addDeal,
    updateDeal,
    deleteDeal,
    addBundle,
    updateBundle,
    deleteBundle,
    updateProductStock,
    updateDeliveryStatus,
    coupons,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    auditLogs,
    logAudit,
    broadcastNotifications,
    sendBroadcast,
    admins,
    currentAdmin,
    addAdmin,
    fetchOrderHistory,
    createNewAdmin,
    updateAdminRole,
    updateAdminProfile,
    removeAdmin,
    createNewRider,
    removeRider,
    users,
    updateUserPoints,
    isAdmin,
    isRider,
    isAuthLoading,
    isQuotaExceeded,
    resetQuotaExceeded,
    isDeliveryPortalActive,
    setIsDeliveryPortalActive,
    isAdminPanelActive,
    setIsAdminPanelActive,
    refreshAllData,
    signInWithGoogle,
    deviceId,
    sessions,
    revokeSession,
    isBlocked,
    blockMessage,
    totalOrders,
    serviceAreas,
    addServiceArea,
    updateServiceArea,
    deleteServiceArea,
    settings,
    updateSettings
  }), [
    cart,
    userName,
    userPhone,
    updateDeliveryStatus,
    roomNumber,
    orders,
    adminOrders,
    supportNumber,
    supportContacts,
    bankName,
    bankAccountNumber,
    bankAccountName,
    userAvatar,
    userEmail,
    userBirthday,
    favorites,
    notifications,
    emailNotificationsEnabled,
    paymentMethods,
    points,
    language,
    currency,
    darkMode,
    isDeliveryEnabled,
    deliveryFee,
    isLowStockAlertEnabled,
    isMaintenanceMode,
    cutoffTime,
    estimatedDeliveryTime,
    shopPhone,
    shopEmail,
    isBankEnabled,
    isSyncing,
    isProfileLoaded,
    uid,
    authUid,
    riderInfo,
    updateRiderProfile,
    products,
    addresses,
    selectedAddressId,
    categories,
    promotionBanners,
    deals,
    bundles,
    coupons,
    auditLogs,
    reorderPromotionBanners,
    broadcastNotifications,
    sendTargetedNotification,
    admins,
    currentAdmin,
    updateAdminProfile,
    fetchOrderHistory,
    users,
    isAdmin,
    isRider,
    isAuthLoading,
    isQuotaExceeded,
    isDeliveryPortalActive,
    isAdminPanelActive,
    deviceId,
    sessions,
    isBlocked,
    blockMessage,
    totalOrders,
    serviceAreas,
    settings,
    updateSettings,
    addProduct,
    updateProduct,
    deleteProduct,
    logAudit,
    sendTargetedNotification
  ]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};
