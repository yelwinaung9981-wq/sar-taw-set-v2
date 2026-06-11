export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category: string;
}

export interface Order {
  id: string;
  uid: string;
  customerName: string;
  customerPhone: string;
  address?: string;
  items: OrderItem[];
  total: number;
  totalAmount?: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  status: 'pending' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled';
  deliveryStatus?: 'preparing' | 'on_the_way' | 'delivered';
  assignedTo?: string;
  assignedToName?: string;
  paymentMethod: 'cod' | 'kpay' | 'wave' | 'other';
  paymentStatus: 'pending' | 'completed' | 'failed';
  timestamp: number;
  updatedAt: number;
  note?: string;
}

export interface Rider {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  isApproved: boolean;
  isOnline: boolean;
  avatar?: string;
  vehicleType?: string;
  createdAt: string;
  totalEarnings: number;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  region: string;
  city: string;
  township: string;
  street: string;
  building?: string;
  room?: string;
  label: 'Home' | 'Office' | 'Other';
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
}

export interface ServiceAreaCity {
  name: string;
  townships: string[];
}

export interface ServiceArea {
  id: string;
  region: string;
  cities?: ServiceAreaCity[];
  city?: string; // Legacy
  townships?: string[]; // Legacy
  isActive: boolean;
}
