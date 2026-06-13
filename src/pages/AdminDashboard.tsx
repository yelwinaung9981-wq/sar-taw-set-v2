import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, Product, Order } from "../context/StoreContext";
import OrdersTab from "../components/admin/OrdersTab";
import OrderDetailsView from "../components/admin/OrderDetailsView";
import ProductsTab from "../components/admin/ProductsTab";
import { SettingsTab } from "../components/admin/SettingsTab";
import { NotificationsTab } from "../components/admin/NotificationsTab";
import { OrderNotifications } from "../components/admin/OrderNotifications";
import {
  LogOut,
  Package,
  Clock,
  CheckCircle2,
  Bike,
  LayoutDashboard,
  ShoppingBag,
  ListChecks,
  ChevronRight,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  MapPin,
  Home,
  Settings,
  Phone,
  Save,
  CreditCard,
  DollarSign,
  Database,
  RefreshCw,
  Plus,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  Link as LinkIcon,
  Tag,
  Hash,
  ShieldCheck,
  Menu,
  X,
  Search,
  SlidersHorizontal,
  Eye,
  EyeOff,
  User,
  Users,
  Calendar,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  AlertTriangle,
  Download,
  Bell,
  Edit2,
  History,
  MessageSquare,
  MessageCircle,
  Beef,
  Fish,
  Carrot,
  Egg,
  Soup,
  Wheat,
  UtensilsCrossed,
  Flame,
  Wine,
  Candy,
  Snowflake,
  Baby,
  Dog,
  Smile,
  Pill,
  Briefcase,
  Store,
  Zap,
  ToggleLeft,
  ToggleRight,
  FileText,
  KeyRound,
  Moon,
  Sun,
  Truck,
  ClipboardList,
  ExternalLink,
  Mail,
  Ban,
  Check,
  UserCheck,
  UserCircle,
  Camera,
  Edit3,
  Info,
  Shield,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import { seedDatabase, seedSampleOrders, PRODUCTS } from "../lib/seed";
import { CATEGORIES } from "../constants";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { translateProductName } from "../services/translationService";
import { formatAdminNotifyMessage, getWhatsAppLink, openWhatsApp } from "../lib/messaging";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatPhoneNumber } from "../lib/messaging";
import { uploadProductImage, uploadProfileImage } from "../services/uploadService";

// Helper to reliably parse any Firestore timestamp or field string to JS Date
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

function AnalyticsTab({
  orders,
  products,
  stats,
  darkMode,
  formatPrice,
  isLowStockAlertEnabled,
  t,
  categories,
}: {
  orders: Order[];
  products: Product[];
  stats: any;
  darkMode: boolean;
  formatPrice: (p: number) => string;
  isLowStockAlertEnabled: boolean;
  t: (key: string) => string;
  categories: any[];
}) {
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');

  // Filter orders according to timeRange interactively
  const filteredOrdersByTime = useMemo(() => {
    const now = new Date();
    return orders.filter(order => {
      const orderDate = parseOrderDate(order.createdAt, order.timestamp);
      
      if (timeRange === 'today') {
        const today = new Date();
        return orderDate.getDate() === today.getDate() &&
               orderDate.getMonth() === today.getMonth() &&
               orderDate.getFullYear() === today.getFullYear();
      } else if (timeRange === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= sevenDaysAgo;
      } else if (timeRange === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= thirtyDaysAgo;
      }
      return true; // all-time
    });
  }, [orders, timeRange]);

  // Aggregate stats based on filtered orders
  const analyticsStats = useMemo(() => {
    const deliveredOrders = filteredOrdersByTime.filter((o) => o.status === "delivered");
    const cancelledOrders = filteredOrdersByTime.filter((o) => o.status === "cancelled");
    const totalRevenue = deliveredOrders.reduce((acc, o) => acc + o.total, 0);
    const aov = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;
    
    const cancellationRate = filteredOrdersByTime.length > 0 
      ? (cancelledOrders.length / filteredOrdersByTime.length) * 100 
      : 0;

    const inventoryValue = products.reduce(
      (acc, p) => acc + (Number(p.price) || 0) * (Number(p.stock) || 0),
      0,
    );

    // Operational workload pipeline (Pending + Packing + Out for Delivery)
    const pipelineCount = filteredOrdersByTime.filter(
      (o) => o.status !== "delivered" && o.status !== "cancelled"
    ).length;

    // Growth calculation (Current 7 Days vs Previous 7 Days based on delivered orders)
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prev7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentPeriodRev = orders
      .filter((o) => parseOrderDate(o.createdAt, o.timestamp) >= last7Days && o.status === "delivered")
      .reduce((acc, o) => acc + o.total, 0);

    const prevPeriodRev = orders
      .filter((o) => {
        const d = parseOrderDate(o.createdAt, o.timestamp);
        return d >= prev7Days && d < last7Days && o.status === "delivered";
      })
      .reduce((acc, o) => acc + o.total, 0);

    const growth = prevPeriodRev > 0
      ? ((currentPeriodRev - prevPeriodRev) / prevPeriodRev) * 100
      : 0;

    return {
      aov,
      growth,
      cancellationRate,
      inventoryValue,
      totalOrders: filteredOrdersByTime.length,
      deliveredOrders: deliveredOrders.length,
      totalRevenue,
      pipelineCount,
    };
  }, [filteredOrdersByTime, orders, products]);

  // Sparkline Chart Data for current selected scope
  const chartData = useMemo(() => {
    const dailyData: Record<string, { date: string; revenue: number; orders: number }> = {};

    if (timeRange === 'today') {
      for (let i = 0; i < 24; i += 3) {
        const hourStr = `${i === 0 ? '12 AM' : i < 12 ? i + ' AM' : i === 12 ? '12 PM' : (i - 12) + ' PM'}`;
        dailyData[hourStr] = { date: hourStr, revenue: 0, orders: 0 };
      }
      filteredOrdersByTime.forEach((order) => {
        const hour = parseOrderDate(order.createdAt, order.timestamp).getHours();
        const bucketHour = Math.floor(hour / 3) * 3;
        const bucketStr = `${bucketHour === 0 ? '12 AM' : bucketHour < 12 ? bucketHour + ' AM' : bucketHour === 12 ? '12 PM' : (bucketHour - 12) + ' PM'}`;
        if (dailyData[bucketStr] && order.status === "delivered") {
          dailyData[bucketStr].revenue += order.total;
          dailyData[bucketStr].orders += 1;
        }
      });
    } else if (timeRange === '7days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur", month: "short", day: "numeric" });
        dailyData[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
      }
      filteredOrdersByTime.forEach((order) => {
        const dateStr = parseOrderDate(order.createdAt, order.timestamp).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur", month: "short", day: "numeric" });
        if (dailyData[dateStr] && order.status === "delivered") {
          dailyData[dateStr].revenue += order.total;
          dailyData[dateStr].orders += 1;
        }
      });
    } else if (timeRange === '30days') {
      // Group in 5-day intervals
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i * 5);
        const dateStr = d.toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur", month: "short", day: "numeric" });
        dailyData[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
      }
      filteredOrdersByTime.forEach((order) => {
        if (order.status !== "delivered") return;
        const orderDate = parseOrderDate(order.createdAt, order.timestamp);
        let closestBucket = Object.keys(dailyData)[0];
        let minDiff = Infinity;
        Object.keys(dailyData).forEach(bucketKey => {
          const bucketDate = new Date(bucketKey + " " + orderDate.getFullYear());
          const diff = Math.abs(orderDate.getTime() - bucketDate.getTime());
          if (diff < minDiff) {
            minDiff = diff;
            closestBucket = bucketKey;
          }
        });
        if (dailyData[closestBucket]) {
          dailyData[closestBucket].revenue += order.total;
          dailyData[closestBucket].orders += 1;
        }
      });
    } else {
      // Group by Month
      filteredOrdersByTime.forEach((order) => {
        if (order.status !== "delivered") return;
        const monthStr = parseOrderDate(order.createdAt, order.timestamp).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur", month: "short", year: "numeric" });
        if (!dailyData[monthStr]) {
          dailyData[monthStr] = { date: monthStr, revenue: 0, orders: 0 };
        }
        dailyData[monthStr].revenue += order.total;
        dailyData[monthStr].orders += 1;
      });
    }

    return Object.values(dailyData);
  }, [filteredOrdersByTime, timeRange]);

  // Top Customers in dynamic scope
  const topCustomers = useMemo(() => {
    const customers: Record<string, { name: string; orders: number; spent: number }> = {};
    filteredOrdersByTime.forEach((order) => {
      if (order.status === "cancelled") return;
      if (!customers[order.customerName]) {
        customers[order.customerName] = { name: order.customerName, orders: 0, spent: 0 };
      }
      customers[order.customerName].orders += 1;
      customers[order.customerName].spent += order.total;
    });
    return Object.values(customers)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 4);
  }, [filteredOrdersByTime]);

  // Top categories split
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredOrdersByTime.forEach((order) => {
      if (order.status === "cancelled") return;
      order.items.forEach((item) => {
        cats[item.category] =
          (cats[item.category] || 0) + (Number(item.price) || 0) * (Number(item.quantity) || 0);
      });
    });
    return Object.entries(cats).map(([id, value]) => {
      const cat = categories.find(c => c.id === id || c.key === id);
      const name = cat ? (cat.nameEn || cat.name || id) : id;
      return { name, value };
    }).sort((a, b) => b.value - a.value).slice(0, 4);
  }, [filteredOrdersByTime, categories]);

  // High-performance products progress bars calculation
  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string; quantity: number; revenue: number }> = {};
    filteredOrdersByTime.forEach((order) => {
      if (order.status === "cancelled") return;
      order.items.forEach((item) => {
        if (!counts[item.id]) {
          counts[item.id] = { name: item.name || 'Unknown', quantity: 0, revenue: 0 };
        }
        counts[item.id].quantity += (Number(item.quantity) || 0);
        counts[item.id].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 0);
      });
    });
    const result = Object.values(counts)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4);
    
    const maxRevenue = result.length > 0 ? Math.max(...result.map(r => r.revenue)) : 1;
    return result.map(p => ({
      ...p,
      percentage: Math.round((p.revenue / maxRevenue) * 100),
    }));
  }, [filteredOrdersByTime]);

  // Payment methods list with calculation
  const paymentStats = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {
      cod: { count: 0, total: 0 },
      kpay: { count: 0, total: 0 },
      wave: { count: 0, total: 0 },
      other: { count: 0, total: 0 }
    };
    filteredOrdersByTime.forEach((order) => {
      if (order.status === "cancelled") return;
      const method = (order.paymentMethod || "cod").toLowerCase();
      const key = method === "cod" || method === "cash" ? "cod" :
                  method === "kpay" || method === "kbzpay" ? "kpay" :
                  method === "wave" || method === "wavepay" ? "wave" : "other";
      
      counts[key].count += 1;
      counts[key].total += order.total;
    });

    const totalCalculatedRevenue = Object.values(counts).reduce((acc, c) => acc + c.total, 0) || 1;

    return Object.entries(counts).map(([method, data]) => ({
      method,
      label: method === "cod" ? "Cash On Delivery (COD)" :
             method === "kpay" ? "KBZPay Mobile" :
             method === "wave" ? "WavePay Transfer" : "Other Payment",
      count: data.count,
      total: data.total,
      percentage: Math.round((data.total / totalCalculatedRevenue) * 100)
    })).sort((a, b) => b.total - a.total);
  }, [filteredOrdersByTime]);

  // Operational Rider distribution with statistics
  const riderLeaderboard = useMemo(() => {
    const list: Record<string, { name: string; count: number; total: number }> = {};
    filteredOrdersByTime.forEach((order) => {
      if (order.status !== "delivered") return;
      const riderName = order.assignedToName || "In-Store Staff / Self-Pickup";
      if (!list[riderName]) {
        list[riderName] = { name: riderName, count: 0, total: 0 };
      }
      list[riderName].count += 1;
      list[riderName].total += order.total;
    });
    return Object.values(list).sort((a, b) => b.count - a.count).slice(0, 3);
  }, [filteredOrdersByTime]);

  // Operational shifts summary
  const shiftingAnalysis = useMemo(() => {
    const shiftBuckets = {
      breakfast: { label: "Breakfast Shift", hours: "6am - 11am", count: 0, total: 0 },
      lunch: { label: "Lunch Rush", hours: "11am - 3pm", count: 0, total: 0 },
      dinner: { label: "Dinner Shift", hours: "3pm - 8pm", count: 0, total: 0 },
      late: { label: "Night Sessions", hours: "8pm - 6am", count: 0, total: 0 }
    };
    
    filteredOrdersByTime.forEach((order) => {
      if (order.status === "cancelled") return;
      
      const dateObj = parseOrderDate(order.createdAt, order.timestamp);
      const hour = dateObj.getHours();
      
      if (hour >= 6 && hour < 11) {
        shiftBuckets.breakfast.count += 1;
        shiftBuckets.breakfast.total += order.total;
      } else if (hour >= 11 && hour < 15) {
        shiftBuckets.lunch.count += 1;
        shiftBuckets.lunch.total += order.total;
      } else if (hour >= 15 && hour < 20) {
        shiftBuckets.dinner.count += 1;
        shiftBuckets.dinner.total += order.total;
      } else {
        shiftBuckets.late.count += 1;
        shiftBuckets.late.total += order.total;
      }
    });
    
    return Object.values(shiftBuckets).sort((a, b) => b.count - a.count);
  }, [filteredOrdersByTime]);

  // Live order activities stream feed
  const recentOrdersLog = useMemo(() => {
    return [...filteredOrdersByTime]
      .sort((a, b) => parseOrderDate(b.createdAt, b.timestamp).getTime() - parseOrderDate(a.createdAt, a.timestamp).getTime())
      .slice(0, 4);
  }, [filteredOrdersByTime]);

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"];

  return (
    <div className="space-y-4">
      {/* 1. Header Filter Row - High-Density Interface */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
        darkMode ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${darkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
            <BarChart3 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Live Insights Overview</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest font-mono">Active Sync</span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-0.5">Real-time enterprise statistics matched with raw transactional feeds.</p>
          </div>
        </div>

        {/* Time Segments */}
        <div className={`flex p-1 rounded-xl gap-1 self-start md:self-auto border ${
          darkMode ? "bg-black/25 border-white/5" : "bg-slate-100/70 border-slate-200/50"
        }`}>
          {([
            { id: "today", label: "Today" },
            { id: "7days", label: "7 Days" },
            { id: "30days", label: "30 Days" },
            { id: "all", label: "All Time" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id)}
              className={`px-3 py-1 text-[10px] uppercase font-black tracking-wider transition-all rounded-lg ${
                timeRange === tab.id
                  ? (darkMode ? "bg-primary text-white shadow-lg" : "bg-emerald-600 text-white shadow-sm")
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Micro KPI Ribbon - Compact row of 5 metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* KPI 1: Revenue */}
        <div className={`p-3 rounded-2xl border relative overflow-hidden flex flex-col justify-between ${
          darkMode ? "bg-emerald-500/10 border-emerald-500/10" : "bg-emerald-50 border-emerald-100/70 shadow-sm"
        }`}>
          <div>
            <p className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>
              Net Revenue
            </p>
            <h4 className={`text-base font-black tracking-tight ${darkMode ? "text-white" : "text-emerald-950"}`}>
              {formatPrice(analyticsStats.totalRevenue)}
            </h4>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full ${
              analyticsStats.growth >= 0 
                ? (darkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-white text-emerald-700")
                : "bg-rose-100 text-rose-700"
            }`}>
              <TrendingUp size={8} className={analyticsStats.growth < 0 ? "rotate-180" : ""} />
              {Math.abs(analyticsStats.growth).toFixed(0)}%
            </span>
            <span className={`text-[8px] font-bold ${darkMode ? "text-slate-400" : "text-emerald-600"}`}>vs last week</span>
          </div>
        </div>

        {/* KPI 2: Average Order Value */}
        <div className={`p-3 rounded-2xl border flex flex-col justify-between ${
          darkMode ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
              Avg. Ticket (AOV)
            </p>
            <h4 className={`text-base font-black tracking-tight ${darkMode ? "text-slate-100" : "text-slate-800"}`}>
              {formatPrice(analyticsStats.aov)}
            </h4>
          </div>
          <p className="text-[8px] font-medium text-slate-400 mt-2">Value per active delivery</p>
        </div>

        {/* KPI 3: Orders Volumes */}
        <div className={`p-3 rounded-2xl border flex flex-col justify-between ${
          darkMode ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
              Sales volume
            </p>
            <h4 className={`text-base font-black tracking-tight ${darkMode ? "text-slate-100" : "text-slate-800"}`}>
              {analyticsStats.totalOrders} <span className="text-[10px] font-black text-slate-400">({analyticsStats.deliveredOrders} Closed)</span>
            </h4>
          </div>
          <p className="text-[8px] font-medium text-slate-400 mt-2">Volume within selected range</p>
        </div>

        {/* KPI 4: Workload Pipeline */}
        <div className={`p-3 rounded-2xl border flex flex-col justify-between ${
          darkMode ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
              Workload Pipeline
            </p>
            <h4 className={`text-base font-black tracking-tight ${
              analyticsStats.pipelineCount > 0 
                ? (darkMode ? "text-amber-400" : "text-amber-600") 
                : (darkMode ? "text-slate-200" : "text-slate-800")
            }`}>
              {analyticsStats.pipelineCount} <span className="text-[10px] font-bold text-slate-400">Incoming</span>
            </h4>
          </div>
          <p className="text-[8px] font-medium text-slate-400 mt-2">Uncompleted processing stream</p>
        </div>

        {/* KPI 5: Stock Asset & Danger Alert */}
        <div className={`p-3 rounded-2xl border flex flex-col justify-between ${
          darkMode ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
              Stock Asset Value
            </p>
            <h4 className={`text-base font-black tracking-tight ${darkMode ? "text-slate-100" : "text-slate-800"}`}>
              {formatPrice(analyticsStats.inventoryValue)}
            </h4>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`text-[8px] font-black uppercase py-0.5 px-2 rounded-full ${
              stats.lowStock > 0 
                ? "bg-rose-100 text-rose-700 animate-pulse" 
                : "bg-slate-100 text-slate-500"
            }`}>
              {stats.lowStock} Low Stock Items
            </span>
          </div>
        </div>
      </div>

      {/* 3. Analytics Charts Split Panel - Side by Side (Flexible Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Revenue Flow Spark Chart */}
        <div className={`p-4 rounded-2xl border lg:col-span-2 flex flex-col justify-between ${
          darkMode ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operational Earnings Flow</h5>
              <p className={`text-xs font-bold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>Dynamic sales frequency match</p>
            </div>
            <div className="text-[10px] font-mono font-bold text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Delivered Orders Only
            </div>
          </div>
          
          <div className="h-[125px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevFlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 8, fontWeight: 700, fill: darkMode ? "#94a3b8" : "#64748b" }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 8, fontWeight: 700, fill: darkMode ? "#94a3b8" : "#64748b" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                    border: darkMode ? "1px solid rgba(255,255,255,0.05)" : "1px solid #f1f5f9",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    fontSize: "9px",
                    fontWeight: "900",
                    color: darkMode ? "#f8fafc" : "#0f172a"
                  }}
                  formatter={(value: any) => [formatPrice(Number(value)), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevFlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Share Doughnut Panel */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
          darkMode ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Category Demand Distribution</h5>
            <p className={`text-xs font-bold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>(Price x Quantity Ordered)</p>
          </div>

          <div className="flex items-center justify-between gap-2 h-[110px] my-2">
            {categoryData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                No purchases recorded for this span.
              </div>
            ) : (
              <>
                <div className="w-1/2 h-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        innerRadius={28}
                        outerRadius={44}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[8px] font-black uppercase text-slate-400 leading-none">Total</span>
                    <span className={`text-[10px] font-black ${darkMode ? "text-white" : "text-slate-800"}`}>
                      {categoryData.length} Cat
                    </span>
                  </div>
                </div>

                <div className="w-1/2 space-y-1.5 overflow-y-auto max-h-[105px]">
                  {categoryData.map((cat, idx) => (
                    <div key={idx} className="flex flex-col">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-[9px] font-black truncate max-w-[65px] uppercase tracking-tight text-slate-500 dark:text-slate-400">
                            {cat.name}
                          </span>
                        </div>
                        <span className="text-[8px] font-mono font-black text-slate-400">{formatPrice(cat.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. Advanced High-Density Operations Row - Products, Target VIPs, Live Orders Stream */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Column 1: Core Products Performance & Peaks */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
          darkMode ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <div className="flex items-center justify-between border-b pb-2 mb-3 dark:border-white/5">
              <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Product Revenue Rank</h6>
              <span className="text-[8px] font-black text-primary p-1 bg-primary/10 rounded-md">By Quantity</span>
            </div>

            <div className="space-y-3">
              {topProducts.length === 0 ? (
                <p className="text-[10px] font-bold text-slate-400 text-center py-6">No products sold in this cycle.</p>
              ) : (
                topProducts.map((product, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className={`truncate max-w-[130px] ${darkMode ? "text-slate-100" : "text-slate-800"}`}>{product.name}</span>
                      <span className="text-slate-400 font-mono text-[9px]">{product.quantity} sold ({formatPrice(product.revenue)})</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-teal-400"
                        style={{ width: `${product.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 border-t pt-3 dark:border-white/5">
            <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Peak Shift Statistics</h6>
            <div className="space-y-1.5">
              {shiftingAnalysis.map((shift, idx) => (
                <div key={idx} className="flex items-center justify-between text-[9px] font-bold">
                  <div className="flex flex-col">
                    <span className={darkMode ? "text-slate-200" : "text-slate-700"}>{shift.label}</span>
                    <span className="text-[7.5px] text-slate-450 font-medium">{shift.hours}</span>
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono">{shift.count} ords ({formatPrice(shift.total)})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: VIP Customer Roster & Rider Metrics */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
          darkMode ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <div className="flex items-center justify-between border-b pb-2 mb-3 dark:border-white/5">
              <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Valuable Client Core</h6>
              <span className="text-[8px] font-mono font-bold text-indigo-500 dark:text-indigo-400 p-1 bg-indigo-500/10 rounded-md">VIP tier</span>
            </div>

            <div className="space-y-2.5">
              {topCustomers.length === 0 ? (
                <p className="text-[10px] font-bold text-slate-400 text-center py-6">No client accounts recorded.</p>
              ) : (
                topCustomers.map((customer, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[9px] ${
                        darkMode ? "bg-white/5 text-primary" : "bg-slate-100 text-emerald-800"
                      }`}>
                        {customer.name ? customer.name.slice(0, 2).toUpperCase() : "CU"}
                      </div>
                      <div>
                        <p className={`text-[10px] font-bold truncate max-w-[100px] leading-tight ${darkMode ? "text-slate-100" : "text-slate-800"}`}>
                          {customer.name}
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">{customer.orders} orders logged</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-black font-mono text-emerald-500">{formatPrice(customer.spent)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 border-t pt-3 dark:border-white/5">
            <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Delivery Rider Standings</h6>
            <div className="space-y-2">
              {riderLeaderboard.length === 0 ? (
                <p className="text-[9px] font-bold text-slate-400 text-center py-2">No active rider deliveries registered.</p>
              ) : (
                riderLeaderboard.map((rider, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[8px] text-slate-400">#{idx + 1}</span>
                      <span className={`font-bold truncate max-w-[110px] ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
                        {rider.name}
                      </span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[9px]">
                      {rider.count} delv ({formatPrice(rider.total)})
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Payment Channel Breakdown */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
          darkMode ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div>
            <div className="flex items-center justify-between border-b pb-2 mb-3 dark:border-white/5">
              <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Payment Breakdown</h6>
              <span className="text-[8px] font-black text-amber-500 p-1 bg-amber-500/10 rounded-md">Live Tx</span>
            </div>

            <div className="space-y-3">
              {paymentStats.map((pay, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[9.5px] font-bold">
                    <span className={darkMode ? "text-slate-100" : "text-slate-800"}>{pay.label}</span>
                    <span className="text-slate-400 font-mono text-[9px]">{pay.count} tx • {pay.percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        pay.method === "cod" ? "bg-gradient-to-r from-teal-500 to-emerald-400" :
                        pay.method === "kpay" ? "bg-gradient-to-r from-blue-500 to-indigo-400" :
                        pay.method === "wave" ? "bg-gradient-to-r from-amber-500 to-orange-400" :
                        "bg-gradient-to-r from-slate-500 to-slate-400"
                      }`}
                      style={{ width: `${pay.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[8.5px] text-slate-400">
                    <span>Total Volume:</span>
                    <span className="font-extrabold text-emerald-500 dark:text-emerald-400 font-mono">{formatPrice(pay.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t pt-3 dark:border-white/5 bg-slate-500/5 p-2 rounded-xl text-center">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Operational Strategy Tip</span>
            <p className="text-[8px] font-medium text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
              Mobile payment integrations speed up driver dispatch times.
            </p>
          </div>
        </div>

        {/* Column 4: Real-time Order Stream Feed */}
        <div className={`p-4 rounded-2xl border ${
          darkMode ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm"
        }`}>
          <div className="flex items-center justify-between border-b pb-2 mb-3 dark:border-white/5">
            <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Live Transaction Stream</h6>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[8px] font-black uppercase opacity-60">Log Active</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {recentOrdersLog.length === 0 ? (
              <p className="text-[10px] font-bold text-slate-400 text-center py-6">No order streaming records.</p>
            ) : (
              recentOrdersLog.map((order, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px]">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-black font-mono uppercase tracking-tighter ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                        #{order.id.slice(-6).toUpperCase()}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                        order.status === "delivered" 
                          ? "bg-emerald-500/10 text-emerald-500" 
                          : order.status === "cancelled" 
                            ? "bg-rose-500/10 text-rose-500" 
                            : "bg-amber-500/10 text-amber-500 dark:text-amber-400"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-[8px] font-medium text-slate-400 leading-tight mt-0.5">
                      {order.customerName} • {parseOrderDate(order.createdAt, order.timestamp).toLocaleTimeString("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{formatPrice(order.total)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderDetailModal({
  order,
  isOpen,
  onClose,
  darkMode,
  formatPrice,
  updateStatus,
  updateDeliveryStatus,
  t,
  isMenuOpen,
  handleDownloadPDF,
}: {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  formatPrice: (p: number) => string;
  updateStatus: (id: string, s: any) => Promise<void>;
  updateDeliveryStatus: (id: string, s: any) => Promise<void>;
  t: any;
  isMenuOpen: boolean;
  handleDownloadPDF: (order: Order) => void;
}) {
  const { shopPhone, shopEmail, getCategoryName } = useStore();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
      // Update state listener for quota
  const { isQuotaExceeded } = useStore();

  if (!order) return null;

  const handleStatusUpdate = async (id: string, status: any) => {
    setIsUpdating(status);
    try {
      await updateStatus(id, status);
    } catch (e) {
      console.error("Status update error:", e);
    } finally {
      setIsUpdating(null);
    }
  };

  const statusConfig = {
    pending: {
      color: "amber",
      icon: Clock,
      label: t("statusPending"),
      bg: "bg-amber-500",
      text: "text-amber-500",
      light: "bg-amber-50",
      border: "border-amber-100",
      dark: "bg-amber-500/10",
    },
    confirmed: {
      color: "emerald",
      icon: CheckCircle2,
      label: t("statusConfirmed"),
      bg: "bg-emerald-500",
      text: "text-emerald-500",
      light: "bg-emerald-50",
      border: "border-emerald-100",
      dark: "bg-emerald-500/10",
    },
    packing: {
      color: "blue",
      icon: Package,
      label: t("statusPacking"),
      bg: "bg-blue-500",
      text: "text-blue-500",
      light: "bg-blue-50",
      border: "border-blue-100",
      dark: "bg-blue-500/10",
    },
    ready: {
      color: "orange",
      icon: Truck,
      label: t("statusReady"),
      bg: "bg-orange-500",
      text: "text-orange-500",
      light: "bg-orange-50",
      border: "border-orange-100",
      dark: "bg-orange-500/10",
    },
    shipped: {
      color: "indigo",
      icon: Bike,
      label: t("statusShipped") || "Shipped",
      bg: "bg-indigo-500",
      text: "text-indigo-500",
      light: "bg-indigo-50",
      border: "border-indigo-100",
      dark: "bg-indigo-500/10",
    },
    delivered: {
      color: "emerald",
      icon: CheckCircle2,
      label: t("statusDelivered"),
      bg: "bg-emerald-500",
      text: "text-emerald-500",
      light: "bg-emerald-50",
      border: "border-emerald-100",
      dark: "bg-emerald-500/10",
    },
    cancelled: {
      color: "rose",
      icon: X,
      label: t("statusCancelled"),
      bg: "bg-rose-500",
      text: "text-rose-500",
      light: "bg-rose-50",
      border: "border-rose-100",
      dark: "bg-rose-500/10",
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-white dark:bg-[#0c0e0e]"
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ 
              x: 0
            }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="w-full h-full overflow-hidden flex flex-col lg:flex-row"
          >
            {/* Left Side: Order Info & Status (Professional side column) */}
            <div
              className={`w-full lg:w-[400px] shrink-0 flex flex-col border-r ${darkMode ? "border-white/5 bg-white/[0.02]" : "border-gray-100 bg-gray-50/50"}`}
            >
              {/* Breadcrumb & Top Section */}
              <div className="px-8 py-8 pb-6 border-b border-dashed border-gray-100/10 mb-2">
                <button
                  onClick={onClose}
                  className={`flex items-center gap-2 mb-6 group transition-all px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] ${darkMode ? "bg-white/5 text-white/60 hover:text-white" : "bg-emerald-50 text-emerald-950/60 hover:text-emerald-950"}`}
                >
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  Close Order Details
                </button>

                <div
                  className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] mb-1.5 ${
                    order.status === "pending"
                      ? "bg-amber-500/10 text-amber-500"
                      : order.status === "preparing"
                        ? "bg-blue-500/10 text-blue-500"
                        : order.status === "cancelled"
                          ? "bg-rose-500/10 text-rose-500"
                          : "bg-emerald-500/10 text-emerald-500"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full animate-pulse ${order.status === "pending" ? "bg-amber-500" : order.status === "preparing" ? "bg-blue-500" : order.status === "cancelled" ? "bg-rose-500" : "bg-emerald-500"}`}
                  />
                  {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                </div>
                
                {order.deliveryStatus && order.deliveryStatus !== "pending" && (
                  <div
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-[0.15em] ml-2 bg-primary/10 text-primary border border-primary/20"
                  >
                    <Truck size={8} />
                    {order.deliveryStatus.replace("_", " ")}
                    {order.assignedToName && ` • ${order.assignedToName}`}
                  </div>
                )}
                <h2
                  className={`text-xl font-black tracking-tighter mb-1 ${darkMode ? "text-on-surface" : "text-emerald-950"}`}
                >
                  Order ID: {order.id.slice(-8)}
                </h2>
                <div className="flex items-center gap-2 opacity-40">
                  <Calendar size={10} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">
                    {parseOrderDate(order.createdAt, order.timestamp).toLocaleDateString("en-MY", {
                      timeZone: "Asia/Kuala_Lumpur",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Scrollable Details */}
              <div className="flex-grow overflow-y-auto no-scrollbar px-6 py-6 space-y-8">
                {/* Customer Section */}
                <section>
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-30 mb-1.5 ml-1">
                    Customer
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                       <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${darkMode ? "bg-white/5 text-primary" : "bg-white shadow-sm text-emerald-700"}`}
                      >
                        <User size={12} />
                      </div>
                      <div>
                        <p className="font-black text-xs tracking-tight leading-tight mb-0.5">
                          {order.customerName}
                        </p>
                        <p
                          className={`text-[8px] font-bold font-mono opacity-50`}
                        >
                          {order.customerPhone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${darkMode ? "bg-white/5 text-primary" : "bg-white shadow-sm text-emerald-700"}`}
                      >
                        <MapPin size={12} />
                      </div>
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-widest opacity-30 mb-0.5 leading-none">
                          Location
                        </p>
                        <p className={`font-bold text-[10px] tracking-tight ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                          {order.roomNumber?.replace(/^(Apt\.?\s*|Apartment\s*|Room\s*)/i, '')}
                        </p>
                        {order.address && (
                          <p
                            className={`text-[8px] font-semibold mt-0.5 leading-relaxed break-words whitespace-normal ${
                              darkMode ? "text-slate-300" : "text-slate-700"
                            }`}
                          >
                            {order.address.replace(/^(Apt\.?\s*|Apartment\s*|Room\s*)/i, '')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${darkMode ? "bg-white/5 text-primary" : "bg-white shadow-sm text-emerald-700"}`}
                      >
                        <CreditCard size={12} />
                      </div>
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-widest opacity-30 mb-0.5 leading-none">
                          Payment
                        </p>
                        <p className="font-bold text-[10px] tracking-tight uppercase">
                          {order.paymentMethod}
                        </p>
                      </div>
                    </div>

                    {order.paymentMethod.toLowerCase().includes("bank") && (
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-none flex items-center justify-center shrink-0 ${darkMode ? "bg-white/5 text-primary" : "bg-white shadow-sm text-emerald-700"}`}
                        >
                          <ImageIcon size={14} />
                        </div>
                        <div className="flex-grow">
                          <p className="text-[8px] font-black uppercase tracking-widest opacity-30 mb-1 leading-none">
                            Screenshot
                          </p>
                          {order.paymentScreenshot ? (
                            <button
                              onClick={() =>
                                window.open(order.paymentScreenshot, "_blank")
                              }
                              className="group relative w-full h-20 rounded-xl overflow-hidden border border-dashed border-inherit bg-black/5 hover:bg-black/10 transition-all"
                            >
                              <img
                                src={order.paymentScreenshot}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                alt="Payment Screenshot"
                              />
                            </button>
                          ) : (
                            <div
                              className={`w-full py-2 px-2 rounded-xl border border-dashed text-center ${darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}
                            >
                              <p className="text-[8px] font-bold opacity-30 italic">
                                No upload
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Delivery schedule */}
                <section>
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-30 mb-1.5 ml-1">
                    Schedule
                  </p>
                  <div
                    className={`px-3 py-2.5 rounded-xl border border-dashed ${darkMode ? "bg-primary/5 border-primary/20" : "bg-emerald-50/50 border-emerald-100"}`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Clock size={12} className="text-primary" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                        {order.deliveryDay}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold opacity-80">
                      {order.deliveryDate}
                    </p>
                  </div>
                </section>
              </div>

              {/* Customer Contact at bottom of sidebar */}
              <div
                className={`p-2 border-t ${darkMode ? "border-white/5 bg-white/[0.01]" : "border-gray-100 bg-gray-50/50"}`}
              >
                  <div className={`grid grid-cols-2 gap-1 p-1 rounded-2xl border ${darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"}`}>
                    <button
                      onClick={() => {
                        const message = formatAdminNotifyMessage(order, formatPrice);
                        openWhatsApp(order.customerPhone, message);
                      }}
                      className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all active:scale-95 ${darkMode ? "hover:bg-emerald-500/10 text-emerald-500" : "bg-white text-emerald-700 shadow-sm hover:bg-emerald-50"}`}
                    >
                      <MessageCircle size={14} />
                      <span className="text-[7px] font-black uppercase tracking-widest">WhatsApp</span>
                    </button>
                    <a
                      href={`tel:${order.customerPhone}`}
                      className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all active:scale-95 ${darkMode ? "hover:bg-blue-500/10 text-blue-400" : "bg-white text-blue-700 shadow-sm hover:bg-blue-50"}`}
                    >
                      <Phone size={14} />
                      <span className="text-[7px] font-black uppercase tracking-widest">Call</span>
                    </a>
                  </div>
              </div>
            </div>

            {/* Right Side: Items List & Total Summary */}
            <div
              className={`flex-grow flex flex-col min-w-0 ${darkMode ? "bg-transparent" : "bg-white"}`}
            >
              {/* Header Content */}
              <div className="px-6 py-2.5 flex items-center justify-between relative border-b border-inherit">
                <div>
                  <h3 className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 mb-0.5">
                    Invoice Details
                  </h3>
                  <p className="text-base font-black truncate max-w-md">
                    Order Summary • {order.customerName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadPDF(order)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      darkMode
                        ? "bg-white/5 text-white/40 hover:bg-white/10"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                    title="Download Invoice"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>

              {/* Items List (Scrollable) */}
              <div className="flex-grow overflow-y-auto px-10 no-scrollbar py-8">
                <div className="space-y-4 pb-8">
                  {order.items.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`group flex items-center gap-2.5 p-2 rounded-xl border transition-all duration-300 ${
                        darkMode
                          ? "bg-white/2 border-white/5 hover:bg-white/5"
                          : "bg-white border-gray-100 hover:border-emerald-100 shadow-sm"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-500">
                          <img
                            src={item.image}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-primary text-white rounded-full flex items-center justify-center text-[7px] font-black shadow-lg border-2 border-surface">
                          {item.quantity}
                        </div>
                      </div>

                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-[7px] font-black uppercase tracking-[0.2em] ${darkMode ? "text-primary/60" : "text-emerald-600"}`}>
                            {getCategoryName(item.category)}
                          </p>
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${darkMode ? "bg-white/10 text-on-surface-variant" : "bg-emerald-100/50 text-emerald-800"}`}
                          >
                            {item.unit || "Unit"}
                          </span>
                        </div>
                        <h4 className="text-sm font-black tracking-tight truncate leading-none mb-1">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1 opacity-50">
                          <Tag size={10} />
                          <span className="text-[9px] font-bold">
                            {formatPrice(item.price)} each
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-20 mb-0.5 leading-none">
                          Subtotal
                        </p>
                        <p className="text-base font-black tracking-tighter leading-none">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Order total footer */}
              <div
                className={`px-6 py-1.5 border-t mt-auto ${darkMode ? "border-white/5 bg-white/[0.01]" : "border-gray-100 bg-gray-50/30"}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                  <div className="space-y-1">
                    {order.note && (
                      <div className="max-w-md">
                        <p className="text-[7px] font-black uppercase tracking-[0.3em] opacity-30 mb-0.5">
                          Note from Customer
                        </p>
                        <p className="text-[10px] font-bold opacity-70 leading-relaxed italic line-clamp-1">
                          "{order.note}"
                        </p>
                      </div>
                    )}
                    <div className={`flex items-center w-full lg:w-auto p-1 rounded-2xl border shadow-sm transition-colors gap-1 ${darkMode ? "bg-surface-container-high border-on-surface/10" : "bg-white border-slate-200"}`}>
                      {/* CANCEL ACTION */}
                      {order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleStatusUpdate(order.id, "cancelled")}
                          disabled={isUpdating !== null}
                          className={`flex-1 lg:flex-none px-3 h-8 rounded-xl flex items-center justify-center gap-1.5 transition-all font-black text-[9px] uppercase tracking-[0.1em] ${
                            darkMode ? "text-rose-400 hover:bg-rose-500/10" : "text-rose-600 hover:bg-rose-50"
                          }`}
                        >
                          {isUpdating === "cancelled" ? (
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <X size={12} strokeWidth={3} />
                          )}
                          <span>Cancel</span>
                        </motion.button>
                      )}
                      
                      {/* PREPARE ACTION */}
                      {order.status === 'pending' && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleStatusUpdate(order.id, "preparing")}
                          disabled={isUpdating !== null}
                          className={`flex-1 lg:flex-none px-4 h-8 rounded-xl flex items-center justify-center gap-1.5 transition-all font-black text-[9px] uppercase tracking-[0.15em] bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:bg-blue-600`}
                        >
                          {isUpdating === "preparing" ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Package size={12} strokeWidth={3} />
                          )}
                          <span>Prepare Order</span>
                        </motion.button>
                      )}

                      {/* ON THE WAY ACTION (Trigger Delivery System) */}
                      {order.status === 'preparing' && updateDeliveryStatus && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={async () => {
                            setIsUpdating("on_the_way");
                            try {
                              await handleStatusUpdate(order.id, "on_the_way");
                              toast.success("Marked as On The Way!", { icon: "🏍️" });
                            } finally {
                              setIsUpdating(null);
                            }
                          }}
                          disabled={isUpdating !== null}
                          className={`flex-1 lg:flex-none px-4 h-8 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-[9px] uppercase tracking-[0.15em] bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 active:scale-95`}
                        >
                          {isUpdating === "on_the_way" ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Truck size={12} strokeWidth={3} />
                          )}
                          <span>Send With Rider</span>
                        </motion.button>
                      )}

                      {/* STATUS DISPLAY FOR IN-PROGRESS DELIVERIES */}
                      {order.status === 'on_the_way' && (
                        <div className="px-4 h-8 rounded-xl bg-violet-500/10 text-violet-500 flex items-center gap-2 font-black text-[9px] uppercase tracking-[0.1em] border border-violet-500/20 shadow-sm animate-pulse">
                          <Bike size={12} strokeWidth={3} />
                          <span>On The Way</span>
                        </div>
                      )}

                      {order.status === 'delivered' && (
                        <div className="px-4 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center gap-2 font-black text-[9px] uppercase tracking-[0.1em] border border-emerald-500/20">
                          <CheckCircle2 size={12} strokeWidth={3} />
                          <span>Complete</span>
                        </div>
                      )}
                    </div>


                    {/* RIDER INFO & DELIVERY PROGRESS TRACKER */}
                    {order.assignedTo && (
                      <div className={`mt-4 p-4 rounded-3xl border transition-all duration-500 overflow-hidden ${darkMode ? 'bg-white/5 border-white/10 shadow-2xl' : 'bg-blue-50/40 border-blue-100 shadow-sm'}`}>
                        {/* Header: Rider Info */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-blue-500/20' : 'bg-white shadow-md'}`}>
                              <Bike size={20} className="text-blue-500" />
                            </div>
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40 leading-none mb-1">On-Duty Rider</p>
                              <p className="text-sm font-black tracking-tight">{order.assignedToName || 'Official Rider'}</p>
                            </div>
                          </div>
                          
                          <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                             order.deliveryStatus === 'delivered' 
                               ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                               : 'bg-blue-500 text-white animate-pulse shadow-lg shadow-blue-500/30'
                           }`}>
                             {order.deliveryStatus === 'delivered' ? 'Completed' : 'Streaming...'}
                           </div>
                        </div>

                        {/* Progression Steps */}
                        <div className="space-y-4 px-1 mt-6 relative">
                          {/* Vertical Line Connector */}
                          <div className="absolute left-[13px] top-6 bottom-6 w-0.5 bg-current opacity-10" />

                          {/* Step 1: Assigned */}
                          <div className="flex items-start gap-4 relative">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${order.assignedAt ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-200 text-gray-400 opacity-50'}`}>
                              <CheckCircle2 size={12} strokeWidth={3} />
                            </div>
                            <div className="pt-1">
                              <p className={`text-[10px] font-black uppercase tracking-widest ${order.assignedAt ? 'opacity-100' : 'opacity-30'}`}>Step 1: Rider Accepted</p>
                              <p className="text-[8px] font-bold opacity-40 italic">Courier is heading to the store</p>
                            </div>
                          </div>

                          {/* Step 2: Pickup */}
                          <div className="flex items-start gap-4 relative">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${order.pickedUpAt ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-gray-200 text-gray-400 opacity-50'}`}>
                              <Package size={12} strokeWidth={3} />
                            </div>
                            <div className="pt-1">
                              <p className={`text-[10px] font-black uppercase tracking-widest ${order.pickedUpAt ? 'opacity-100' : 'opacity-30'}`}>Step 2: Order Picked Up</p>
                              <p className="text-[8px] font-bold opacity-40 italic">Courier is on the way to customer</p>
                            </div>
                          </div>

                          {/* Step 3: Delivered */}
                          <div className="flex items-start gap-4 relative">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${order.deliveredAt ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-gray-200 text-gray-400 opacity-50'}`}>
                              <Home size={12} strokeWidth={3} />
                            </div>
                            <div className="pt-1">
                              <p className={`text-[10px] font-black uppercase tracking-widest ${order.deliveredAt ? 'opacity-100' : 'opacity-30'}`}>Step 3: Delivered</p>
                              <p className="text-[8px] font-bold opacity-40 italic">Order successfully received</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>{" "}
                  <div className="text-right min-w-[200px]">
                    <div className="space-y-1 mb-2">
                      <div className="flex items-center justify-between gap-4 opacity-40">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                          Subtotal
                        </span>
                        <span className="text-[10px] font-bold font-mono">
                          {formatPrice(
                            order.items.reduce(
                              (acc, item) => acc + item.price * item.quantity,
                              0,
                            ),
                          )}
                        </span>
                      </div>

                      {order.deliveryFee > 0 && (
                        <div
                          className={`flex items-center justify-between gap-4 px-2 py-1 rounded-lg border border-dashed ${darkMode ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}
                        >
                          <div className="flex items-center gap-1">
                            <Truck size={10} />
                            <span className="text-[8px] font-black uppercase tracking-widest">
                              Delivery Fee
                            </span>
                          </div>
                          <span className="text-[10px] font-black">
                            +{formatPrice(order.deliveryFee)}
                          </span>
                        </div>
                      )}

                      {order.pointDiscount > 0 && (
                        <div
                          className={`flex items-center justify-between gap-4 px-2 py-1 rounded-lg border border-dashed ${darkMode ? "bg-rose-500/5 border-rose-500/20 text-rose-500" : "bg-rose-50 border-rose-100 text-rose-700"}`}
                        >
                          <div className="flex items-center gap-1">
                            <Sparkles size={10} />
                            <span className="text-[8px] font-black uppercase tracking-widest">
                              Points Disc.
                            </span>
                          </div>
                          <span className="text-[10px] font-black">
                            -{formatPrice(order.pointDiscount)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-end justify-between border-t border-dashed pt-2 mt-2 gap-4">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${darkMode ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-amber-50 border-amber-100 text-amber-700"}`}
                      >
                        <Sparkles size={9} className="animate-pulse" />
                        <span className="text-[7px] font-black uppercase tracking-widest">
                          +{order.earnedPoints || 0} PTS
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30 mb-0.5">
                          Final Amount
                        </p>
                        <p
                          className={`text-2xl font-black tracking-tighter leading-none ${darkMode ? "text-primary" : "text-emerald-950"}`}
                        >
                          {(() => {
                            const itemsSub = order.items.reduce((acc: number, item: any) => acc + (Number(item.price) || 0) * (item.quantity || 1), 0);
                            const total = Number(order.total) || Number(order.totalAmount) || (itemsSub + (Number(order.deliveryFee) || 0) - (Number(order.pointDiscount) || 0));
                            return formatPrice(total);
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BannerManagement({
  banners,
  add,
  update,
  remove,
  reorder,
  darkMode,
  globalSearch,
}: any) {
  const sortedBannersForAdmin = [...banners].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  const filteredBanners = sortedBannersForAdmin.filter((b: any) => {
    const s = globalSearch?.toLowerCase() || "";
    return b.title?.toLowerCase().includes(s) || b.subtitle?.toLowerCase().includes(s);
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    tag: "promo",
    image: "",
    link: "",
    isActive: true,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCloudinaryActive, setIsCloudinaryActive] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  useEffect(() => {
    const envCloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME;
    const envPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (envCloudName && envPreset) {
      setIsCloudinaryActive(true);
    } else {
      try {
        const cached = localStorage.getItem('sp_settings_global');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.cloudinaryCloudName && parsed.cloudinaryUploadPreset) {
            setIsCloudinaryActive(true);
          }
        }
      } catch (e) {}
    }
  }, []);

  const handleImageUploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const url = await uploadProductImage(file, (progress) => {
        setUploadProgress(Math.round(progress));
      }, 'banners');
      setFormData(prev => ({ ...prev, image: url }));
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileDropBanner = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const url = await uploadProductImage(file, (progress) => {
        setUploadProgress(Math.round(progress));
      }, 'banners');
      setFormData(prev => ({ ...prev, image: url }));
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newBanners = [...sortedBannersForAdmin];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newBanners.length) {
      [newBanners[index], newBanners[targetIndex]] = [newBanners[targetIndex], newBanners[index]];
      
      toast.promise(reorder(newBanners), {
        loading: 'Updating order...',
        success: 'Campaign order updated!',
        error: 'Failed to reorder campaigns.',
      });
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (uploading) {
      toast.error("Please wait for the image upload to complete.");
      return;
    }
    if (!formData.image) {
      toast.error("A campaign image is required.");
      return;
    }

    const savePromise = async () => {
      if (editingBanner) {
        await update(editingBanner.id, formData);
        setEditingBanner(null);
      } else {
        await add({
          ...formData,
          type: "ad",
          color: "bg-transparent",
        });
      }
    };

    toast.promise(savePromise(), {
      loading: editingBanner ? 'Synchronizing changes...' : 'Deploying new campaign...',
      success: editingBanner ? 'Campaign updated successfully!' : 'Campaign deployed successfully!',
      error: 'Failed to save campaign.',
    });

    setShowAdd(false);
    setFormData({ title: "", subtitle: "", tag: "promo", image: "", link: "", isActive: true });
  };

  const startEdit = (banner: any) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      tag: banner.tag || "promo",
      image: banner.image || "",
      link: banner.link || "",
      isActive: banner.isActive !== false,
    });
    setShowAdd(true);
  };

  const handleRemove = (id: string) => {
    toast.promise(remove(id), {
      loading: 'Deleting campaign...',
      success: 'Campaign deleted successfully!',
      error: 'Failed to delete campaign.',
    });
  };

  const handleToggleActive = async (banner: any) => {
    toast.promise(update(banner.id, { isActive: !banner.isActive }), {
      loading: banner.isActive ? 'Pausing campaign...' : 'Activating campaign...',
      success: banner.isActive ? 'Campaign paused!' : 'Campaign live!',
      error: 'Failed to update campaign state.',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Section with Glassmorphism */}
      <div className={`p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border backdrop-blur-xl ${darkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-emerald-100 shadow-md shadow-emerald-900/5"}`}>
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className={`w-1.5 h-5 rounded-full ${darkMode ? "bg-primary" : "bg-emerald-600"}`} />
            <h3 className={`text-base font-bold tracking-tight ${darkMode ? "text-on-surface" : "text-emerald-950"}`}>
              Campaign Studio
            </h3>
          </div>
          <p className="text-[9px] opacity-50 font-bold uppercase tracking-[0.15em] ml-4">
            Manage store's visual announcements
          </p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (showAdd) {
              setShowAdd(false);
              setTimeout(() => {
                setEditingBanner(null);
                setFormData({ title: "", subtitle: "", tag: "promo", image: "", link: "", isActive: true });
              }, 300);
            } else {
              setShowAdd(true);
            }
          }}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.15em] ${
            showAdd 
              ? (darkMode ? "bg-red-500/10 text-red-500" : "bg-red-50/80 text-red-600 border border-red-100")
              : (darkMode ? "bg-primary text-surface shadow-md shadow-primary/10" : "bg-emerald-950 text-white shadow-md shadow-emerald-950/10")
          }`}
        >
          {showAdd ? <X size={14} /> : <Plus size={14} />}
          <span>{showAdd ? "Close Editor" : "New Campaign"}</span>
        </motion.button>
      </div>

      {/* Add/Edit Form - Compact & Premium */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            className="flex justify-center"
          >
            <form
              onSubmit={handleSubmit}
              className={`w-full max-w-4xl p-5 md:p-6 rounded-2xl border space-y-4 relative overflow-hidden ${
                darkMode ? "bg-surface-container border-white/10 shadow-xl" : "bg-white border-gray-100 shadow-lg"
              }`}
            >
              {/* Subtle Decorative Element */}
              <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-primary/5 blur-2xl" />
              
              <div className="flex items-center gap-3 relative border-b border-on-surface/5 pb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-inner ${darkMode ? "bg-white/5 text-primary" : "bg-emerald-50 text-emerald-600"}`}>
                  {editingBanner ? <Edit2 size={15} strokeWidth={2.5} /> : <Plus size={15} strokeWidth={2.5} />}
                </div>
                <div>
                  <h4 className={`text-sm font-black tracking-tight ${darkMode ? "text-on-surface" : "text-emerald-950"}`}>
                    {editingBanner ? "Refine Campaign" : "Draft New Story"}
                  </h4>
                  <p className="text-[7.5px] uppercase font-bold tracking-wider opacity-40 mt-0.5">Campaign identities & visual assets</p>
                </div>
              </div>

              {/* 2-Column Responsive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 relative">
                {/* Left Side: Fields (7 cols) */}
                <div className="md:col-span-7 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider opacity-50 ml-0.5">
                        Display Heading
                      </label>
                      <div className="group relative">
                        <input
                          className={`w-full py-2 px-3 rounded-xl border font-semibold text-xs outline-none transition-all pl-10 ${
                            darkMode 
                              ? "bg-white/5 border-white/10 focus:border-primary focus:bg-white/10" 
                              : "bg-gray-50/50 border-gray-100 focus:border-emerald-950 focus:bg-white focus:shadow-sm"
                          }`}
                          placeholder="Give your campaign a title (optional)..."
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                        <FileText size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? "opacity-20 group-focus-within:text-primary group-focus-within:opacity-100" : "opacity-30 group-focus-within:text-emerald-950 group-focus-within:opacity-100"}`} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider opacity-50 ml-0.5">
                        Subtitle / Brief Info (Optional)
                      </label>
                      <div className="group relative">
                        <input
                          className={`w-full py-2 px-3 rounded-xl border font-semibold text-xs outline-none transition-all pl-10 ${
                            darkMode 
                              ? "bg-white/5 border-white/10 focus:border-primary focus:bg-white/10" 
                              : "bg-gray-50/50 border-gray-100 focus:border-emerald-950 focus:bg-white focus:shadow-sm"
                          }`}
                          placeholder="Short description..."
                          value={formData.subtitle}
                          onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                        />
                        <FileText size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? "opacity-20 group-focus-within:text-primary group-focus-within:opacity-100" : "opacity-30 group-focus-within:text-emerald-950 group-focus-within:opacity-100"}`} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider opacity-50 ml-0.5">
                        Campaign Tag Type
                      </label>
                      <div className="group relative">
                        <select
                          className={`w-full py-2 px-3 pr-10 rounded-xl border font-semibold text-xs outline-none transition-all appearance-none ${
                            darkMode 
                              ? "bg-surface-container-high border-white/10 focus:border-primary focus:bg-white/10 text-on-surface" 
                              : "bg-gray-50/50 border-gray-100 focus:border-emerald-950 focus:bg-white focus:shadow-sm text-emerald-950"
                          }`}
                          value={formData.tag}
                          onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                        >
                          <option value="promo">Promo / Promotion</option>
                          <option value="deal">Special Deal</option>
                          <option value="new">New Arrivals</option>
                          <option value="discount">Discount Campaign</option>
                          <option value="info">General Announcement</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 opacity-50">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider opacity-50 ml-0.5">
                        Action Link URL (Optional)
                      </label>
                      <div className="group relative">
                        <input
                          className={`w-full py-2 px-3 rounded-xl border font-semibold text-xs outline-none transition-all pl-10 ${
                            darkMode 
                              ? "bg-white/5 border-white/10 focus:border-primary focus:bg-white/10" 
                              : "bg-gray-50/50 border-gray-100 focus:border-emerald-950 focus:bg-white focus:shadow-sm"
                          }`}
                          placeholder="https://yourstore.com/special-deal"
                          value={formData.link}
                          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                        />
                        <LinkIcon size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? "opacity-20 group-focus-within:text-primary group-focus-within:opacity-100" : "opacity-30 group-focus-within:text-emerald-950 group-focus-within:opacity-100"}`} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side: Artwork Upload (5 cols) */}
                <div className="md:col-span-5 flex flex-col justify-end">
                  <div className="flex justify-between items-center ml-0.5 mb-1 bg-transparent">
                    <label className="text-[9px] font-bold uppercase tracking-wider opacity-50">
                      Campaign Banner Artwork
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className={`text-[9px] font-black uppercase tracking-wider transition-colors outline-none ${
                        darkMode ? 'text-primary hover:text-primary/80' : 'text-emerald-600 hover:text-emerald-800'
                      }`}
                    >
                      {showUrlInput ? "⚡ Use Drag & Drop Upload" : "🔗 Enter Artwork URL Directly"}
                    </button>
                  </div>

                  {showUrlInput ? (
                    <div className="group relative animate-in fade-in duration-200">
                      <input
                        className={`w-full py-2 px-3 rounded-xl border font-semibold text-xs outline-none transition-all pl-10 ${
                          darkMode 
                            ? "bg-white/5 border-white/10 focus:border-primary focus:bg-white/10" 
                            : "bg-gray-50/50 border-gray-100 focus:border-emerald-950 focus:bg-white focus:shadow-sm"
                        }`}
                        placeholder="https://images.unsplash.com/..."
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        required
                      />
                      <ImageIcon size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? "opacity-20 group-focus-within:text-primary group-focus-within:opacity-100" : "opacity-30 group-focus-within:text-emerald-950 group-focus-within:opacity-100"}`} />
                    </div>
                  ) : (
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleFileDropBanner}
                      className={`relative border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-3 transition-all min-h-[110px] h-[110px] animate-in fade-in duration-200 ${
                        uploading ? 'opacity-60 pointer-events-none' : ''
                      } ${
                        isDragging 
                          ? darkMode ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-emerald-500 bg-emerald-500/5 scale-[1.01]'
                          : darkMode ? 'border-white/10 hover:border-primary/50' : 'border-gray-200 hover:border-emerald-400 bg-gray-50/50'
                      }`}
                    >
                      {formData.image ? (
                        <div className="absolute inset-2 rounded-lg overflow-hidden group shadow-md h-[94px] w-[calc(100%-16px)]">
                          <img src={formData.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              type="button"
                              onClick={() => setFormData({...formData, image: ''})}
                              className="px-2.5 py-1.5 bg-rose-500 text-white font-black text-[9px] uppercase tracking-wider rounded-lg hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-1"
                            >
                              <Trash2 size={10} />
                              Remove Artwork
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 shadow-inner ${
                            darkMode ? 'bg-white/5 text-primary' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            <ImageIcon size={14} className={uploading ? "animate-pulse" : ""} />
                          </div>
                          <p className="text-[9px] font-black text-center mb-0.5">
                            {uploading ? `Uploading (${uploadProgress}%)...` : 'Drag & drop key artwork here'}
                          </p>
                          <p className="text-[7px] text-slate-400 font-bold uppercase tracking-widest text-center">
                            {isCloudinaryActive ? '📦 Active: Cloudinary CDN' : '☁️ Firebase Storage'}
                          </p>
                          {uploading && (
                            <div className="w-full max-w-[130px] bg-slate-200 dark:bg-white/10 h-1 rounded-full overflow-hidden mt-1.5">
                              <div 
                                className={`h-full transition-all duration-300 ${darkMode ? 'bg-primary' : 'bg-emerald-500'}`}
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          )}
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUploadBanner}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={uploading}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-3.5 border-t border-on-surface/5 relative">
                <div className={`flex items-center gap-3 p-1 rounded-xl border ${darkMode ? "bg-white/5 border-white/5" : "bg-gray-50 border-gray-100"}`}>
                  <span className="text-[8px] font-bold uppercase tracking-wider opacity-40 ml-2">Visibility</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                      formData.isActive 
                        ? "bg-emerald-500 text-white shadow" 
                        : "bg-gray-400 text-white"
                    }`}
                  >
                    {formData.isActive ? "Live Now" : "Hidden"}
                  </button>
                </div>
                
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 0 }}
                  type="submit"
                  disabled={uploading}
                  className={`flex-1 w-full py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${
                    darkMode 
                      ? "bg-primary text-surface shadow hover:bg-primary/90 disabled:opacity-40" 
                      : "bg-emerald-950 text-white hover:bg-emerald-900 shadow disabled:opacity-40"
                  }`}
                >
                  {editingBanner ? "Synchronize Changes" : "Deploy Campaign"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banners Grid Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-[9px] font-bold uppercase tracking-wider opacity-40">Active Campaigns</h4>
          <div className="h-px flex-1 mx-4 bg-current opacity-5" />
          <span className="text-[9px] font-bold opacity-40">{filteredBanners.length} Objects</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
          <AnimatePresence mode="popLayout">
            {filteredBanners.map((banner: any, idx: number) => (
              <motion.div
                layout
                key={banner.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group p-0 rounded-2xl border relative overflow-hidden h-[160px] transition-all duration-300 hover:shadow-lg ${
                  darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-md shadow-emerald-900/5"
                }`}
              >
                {/* Visual Content */}
                <div className="absolute inset-0 grayscale-[0.1] scale-100 group-hover:scale-105 transition-all duration-700">
                  <img
                    src={banner.image}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    alt={banner.title}
                  />
                </div>

                {/* Depth Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity duration-300 group-hover:opacity-75" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Card Top Branding & Controls */}
                <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-30 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="flex gap-1.5">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMove(idx, 'up'); }}
                      disabled={idx === 0}
                      className="w-7 h-7 rounded-lg bg-black/60 hover:bg-white hover:text-black text-white flex items-center justify-center transition-all disabled:opacity-0"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMove(idx, 'down'); }}
                      disabled={idx === filteredBanners.length - 1}
                      className="w-7 h-7 rounded-lg bg-black/60 hover:bg-white hover:text-black text-white flex items-center justify-center transition-all disabled:opacity-0"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  <div className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider backdrop-blur-md border ${
                    banner.isActive 
                      ? "bg-emerald-500/85 text-white border-emerald-500" 
                      : "bg-black/60 text-white/60 border-white/10"
                  }`}>
                    {banner.isActive ? "Live" : "Paused"}
                  </div>
                </div>

                {/* Content & Primary Actions */}
                <div className="absolute inset-x-0 bottom-0 p-3.5 z-30">
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex-grow min-w-0 pointer-events-none">
                      <p className="text-[7px] font-bold uppercase tracking-wider text-white/50 mb-0.5 flex items-center gap-1">
                        <span className="w-2.5 h-[1px] bg-primary" />
                        {banner.tag ? banner.tag.toUpperCase() : "PROMO"}
                      </p>
                      <h4 className="font-bold text-white text-xs sm:text-sm leading-tight truncate drop-shadow-md">
                        {banner.title}
                      </h4>
                      {banner.subtitle && (
                        <p className="text-[9px] text-white/70 line-clamp-1 truncate mt-0.5 drop-shadow-sm font-semibold">
                          {banner.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0 z-20">
                      <button
                        onClick={(e) => { e.stopPropagation(); startEdit(banner); }}
                        className="w-8 h-8 bg-white text-emerald-950 rounded-lg flex items-center justify-center shadow-md hover:bg-primary hover:text-white transition-all"
                        title="Edit Banner"
                      >
                        <Edit2 size={13} strokeWidth={2} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(banner.id); }}
                        className="w-8 h-8 bg-black/65 text-red-400 hover:bg-red-600 hover:text-white rounded-lg flex items-center justify-center shadow-md transition-all"
                        title="Delete Banner"
                      >
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Full Card Interactive Quick Toggle Overlay */}
                <button 
                  onClick={() => handleToggleActive(banner)}
                  className="absolute inset-0 z-10 w-full h-full cursor-pointer outline-none"
                  title="Quick Toggle Visibility"
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function DealManagement({
  deals,
  add,
  update,
  remove,
  darkMode,
  formatPrice,
  globalSearch,
}: any) {
  const filteredDeals = deals.filter((d: any) => {
    const s = globalSearch?.toLowerCase() || "";
    return (
      d.title?.toLowerCase().includes(s) ||
      d.titleMm?.toLowerCase().includes(s) ||
      d.discount?.toLowerCase().includes(s)
    );
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [formData, setFormData] = useState({
    type: "daily-deal",
    title: "",
    titleMm: "",
    originalPrice: "",
    price: "",
    discount: "",
    image: "",
    endTime: "",
    soldCount: 0,
    totalCount: 100,
    description: "",
    descriptionMm: "",
    isActive: true,
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const payload = {
      ...formData,
      originalPrice: Number(formData.originalPrice),
      price: Number(formData.price),
      totalCount: Number(formData.totalCount),
    };

    if (editingDeal) {
      await update(editingDeal.id, payload);
      setEditingDeal(null);
    } else {
      await add(payload);
    }
    
    setShowAdd(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      type: "daily-deal",
      title: "",
      titleMm: "",
      originalPrice: "",
      price: "",
      discount: "",
      image: "",
      endTime: "",
      soldCount: 0,
      totalCount: 100,
      description: "",
      descriptionMm: "",
      isActive: true,
    });
  };

  const startEdit = (deal: any) => {
    setEditingDeal(deal);
    setFormData({
      ...deal,
      originalPrice: String(deal.originalPrice),
      price: String(deal.price),
      totalCount: String(deal.totalCount),
    });
    setShowAdd(true);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className={`p-8 rounded-[2.5rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border backdrop-blur-xl ${darkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-emerald-100 shadow-2xl shadow-emerald-900/5"}`}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-2 h-8 rounded-full ${darkMode ? "bg-primary" : "bg-orange-500"}`} />
            <h3 className={`text-2xl font-black tracking-tight ${darkMode ? "text-on-surface" : "text-emerald-950"}`}>
              Daily Deals
            </h3>
          </div>
          <p className="text-[10px] opacity-40 font-bold uppercase tracking-[0.3em] ml-5">
            Flash sales & time-limited opportunities
          </p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (showAdd) {
              setShowAdd(false);
              setTimeout(() => { setEditingDeal(null); resetForm(); }, 300);
            } else {
              setShowAdd(true);
            }
          }}
          className={`px-6 py-4 rounded-2xl transition-all flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] ${
            showAdd 
              ? (darkMode ? "bg-red-500/10 text-red-500" : "bg-red-50/80 text-red-600 border border-red-100")
              : (darkMode ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-orange-600 text-white shadow-2xl shadow-orange-600/20")
          }`}
        >
          {showAdd ? <X size={18} /> : <Zap size={18} />}
          <span>{showAdd ? "Discard Changes" : "New Flash Deal"}</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            className="flex justify-center"
          >
            <form
              onSubmit={handleSubmit}
              className={`w-full max-w-4xl p-8 md:p-10 rounded-[3rem] border space-y-8 relative overflow-hidden ${
                darkMode ? "bg-surface-container border-white/10 shadow-3xl" : "bg-white border-gray-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]"
              }`}
            >
              <div className="flex items-center gap-5 relative">
                <div className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-inner ${darkMode ? "bg-white/5 text-primary" : "bg-orange-50 text-orange-600"}`}>
                  {editingDeal ? <Edit2 size={24} strokeWidth={2.5} /> : <Zap size={24} strokeWidth={2.5} />}
                </div>
                <div>
                  <h4 className={`text-xl font-black tracking-tight ${darkMode ? "text-on-surface" : "text-emerald-950"}`}>
                    {editingDeal ? "Refine Deal Details" : "Launch Flash Sale"}
                  </h4>
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-30 mt-0.5">Define constraints and pricing</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Titles</label>
                    <div className="space-y-3">
                      <input
                        className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-gray-50 border-gray-100"}`}
                        placeholder="Deal Title (English)"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                      <input
                        className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-gray-50 border-gray-100"}`}
                        placeholder="Deal Title (မြန်မာ)"
                        value={formData.titleMm}
                        onChange={(e) => setFormData({ ...formData, titleMm: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Original Price</label>
                      <input
                        type="number"
                        className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-gray-50 border-gray-100"}`}
                        placeholder="25000"
                        value={formData.originalPrice}
                        onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Special Price</label>
                      <input
                        type="number"
                        className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-gray-50 border-gray-100"}`}
                        placeholder="18000"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Visual Asset & End Time</label>
                    <div className="space-y-3">
                      <input
                        className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-gray-50 border-gray-100"}`}
                        placeholder="Image URL"
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        required
                      />
                      <input
                        type="datetime-local"
                        className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-gray-50 border-gray-100"}`}
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Discount Text</label>
                      <input
                        className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-gray-50 border-gray-100"}`}
                        placeholder="e.g. 50% OFF"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Total Spots</label>
                      <input
                        type="number"
                        className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-gray-50 border-gray-100"}`}
                        placeholder="50"
                        value={formData.totalCount}
                        onChange={(e) => setFormData({ ...formData, totalCount: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5 pt-6 border-t border-on-surface/5">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.isActive ? "bg-emerald-500 text-white" : "bg-gray-400 text-white"
                  }`}
                >
                  {formData.isActive ? "Deal Live" : "Draft Status"}
                </button>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  type="submit"
                  className={`flex-1 w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all ${
                    darkMode ? "bg-primary text-surface shadow-xl" : "bg-emerald-950 text-white hover:bg-emerald-900"
                  }`}
                >
                  {editingDeal ? "Update Flash Sale" : "Release Flash Sale"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredDeals.map((deal: any) => (
            <motion.div
              layout
              key={deal.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`group p-6 rounded-[2.5rem] border relative overflow-hidden transition-all duration-500 hover:shadow-2xl ${
                darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-xl shadow-emerald-900/5"
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border border-white/10">
                    <img src={deal.image} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm tracking-tight leading-tight max-w-[120px] truncate">{deal.title}</h4>
                    <p className="text-[9px] font-bold text-gray-400 truncate max-w-[120px]">{deal.titleMm}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${
                    deal.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-500/10 text-gray-500"
                  }`}>
                    {deal.isActive ? "Live" : "Inactive"}
                  </div>
                  <button
                    onClick={() => update(deal.id, { isActive: !deal.isActive })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 border-2 ${
                      deal.isActive 
                        ? "bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
                        : `border-transparent ${darkMode ? "bg-white/10" : "bg-gray-200"}`
                    }`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${deal.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>

              <div className="mb-6 p-4 rounded-2xl bg-on-surface/5 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black text-primary block">{formatPrice(deal.price)}</span>
                  <span className="text-[8px] text-gray-400 line-through font-bold opacity-60 italic">{formatPrice(deal.originalPrice)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Sold Out</span>
                  <div className="h-1 w-20 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${(deal.soldCount / deal.totalCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => startEdit(deal)}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest border transition-all ${
                    darkMode ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-gray-50 border-gray-100 hover:bg-white hover:border-primary"
                  }`}
                >
                  <Edit2 size={14} />
                  Edit
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => remove(deal.id)}
                  className="w-12 py-3 rounded-xl flex items-center justify-center text-red-500 border border-red-500/10 bg-red-500/5 hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={16} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BundleManagement({
  bundles,
  add,
  update,
  remove,
  darkMode,
  formatPrice,
  globalSearch,
}: any) {
  const filteredBundles = bundles.filter((b: any) => {
    const s = globalSearch?.toLowerCase() || "";
    return b.title?.toLowerCase().includes(s) || b.titleMm?.toLowerCase().includes(s);
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editingBundle, setEditingBundle] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    titleMm: "",
    description: "",
    descriptionMm: "",
    originalPrice: "",
    price: "",
    image: "",
    items: "",
    isActive: true,
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const payload = {
      ...formData,
      originalPrice: Number(formData.originalPrice),
      price: Number(formData.price),
      items: formData.items.split(",").map((i: string) => i.trim()).filter(Boolean),
      type: "bundle",
    };

    if (editingBundle) {
      await update(editingBundle.id, payload);
      setEditingBundle(null);
    } else {
      await add(payload);
    }
    
    setShowAdd(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: "",
      titleMm: "",
      description: "",
      descriptionMm: "",
      originalPrice: "",
      price: "",
      image: "",
      items: "",
      isActive: true,
    });
  };

  const startEdit = (bundle: any) => {
    setEditingBundle(bundle);
    setFormData({
      ...bundle,
      originalPrice: String(bundle.originalPrice || ""),
      price: String(bundle.price || ""),
      items: (bundle.items || []).join(", "),
    });
    setShowAdd(true);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className={`p-8 rounded-[2.5rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border backdrop-blur-xl ${darkMode ? "bg-white/5 border-white/10" : "bg-white/80 border-cyan-100 shadow-2xl shadow-cyan-900/5"}`}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-2 h-8 rounded-full ${darkMode ? "bg-primary" : "bg-cyan-500"}`} />
            <h3 className={`text-2xl font-black tracking-tight ${darkMode ? "text-on-surface" : "text-emerald-950"}`}>
              Combo Bundles
            </h3>
          </div>
          <p className="text-[10px] opacity-40 font-bold uppercase tracking-[0.3em] ml-5">
            Craft high-value product pairings
          </p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (showAdd) {
              setShowAdd(false);
              setTimeout(() => { setEditingBundle(null); resetForm(); }, 300);
            } else {
              setShowAdd(true);
            }
          }}
          className={`px-6 py-4 rounded-2xl transition-all flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] ${
            showAdd 
              ? (darkMode ? "bg-red-500/10 text-red-500" : "bg-red-50/80 text-red-600 border border-red-100")
              : (darkMode ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/20" : "bg-cyan-700 text-white shadow-2xl shadow-cyan-700/20")
          }`}
        >
          {showAdd ? <X size={18} /> : <Package size={18} />}
          <span>{showAdd ? "Abort Changes" : "Create New Combo"}</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <form
              onSubmit={handleSubmit}
              className={`p-10 rounded-[3rem] border space-y-8 relative overflow-hidden ${
                darkMode ? "bg-surface-container border-white/10" : "bg-white border-gray-100 shadow-2xl"
              }`}
            >
              <div className="flex items-center gap-5 relative">
                <div className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-inner ${darkMode ? "bg-white/5 text-cyan-400" : "bg-cyan-50 text-cyan-600"}`}>
                  <Package size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className={`text-xl font-black tracking-tight ${darkMode ? "text-on-surface" : "text-emerald-950"}`}>
                    {editingBundle ? "Update Combo Recipe" : "Design New Combo"}
                  </h4>
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-30 mt-0.5">Bundle your best-sellers together</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Bundle Naming</label>
                    <input
                      className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"}`}
                      placeholder="Special Family Combo (EN)"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                    <input
                      className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"}`}
                      placeholder="Special Family Combo (MM)"
                      value={formData.titleMm}
                      onChange={(e) => setFormData({ ...formData, titleMm: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Included Items (Comma separated)</label>
                    <textarea
                      rows={2}
                      className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"}`}
                      placeholder="Pizza, Coke, Wings..."
                      value={formData.items}
                      onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                      required
                    ></textarea>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Normal Value</label>
                      <input
                        type="number"
                        className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"}`}
                        value={formData.originalPrice}
                        onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Bundle Price</label>
                      <input
                        type="number"
                        className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"}`}
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">Cover Asset URL</label>
                    <input
                      className={`w-full p-4 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"}`}
                      placeholder="Cover image link"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-6">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.4em] transition-all ${
                    darkMode ? "bg-primary text-surface shadow-xl" : "bg-cyan-800 text-white hover:bg-cyan-900"
                  }`}
                >
                  {editingBundle ? "Commit Bundle Updates" : "Activate Bundle Campaign"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {filteredBundles.map((bundle: any) => (
            <motion.div
              layout
              key={bundle.id}
              className={`group p-8 rounded-[3rem] border relative overflow-hidden transition-all duration-700 hover:-translate-y-2 hover:shadow-2xl ${
                darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-xl"
              }`}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-3xl overflow-hidden glass shadow-2xl">
                  <img src={bundle.image} className="w-full h-full object-cover" />
                </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-black text-base truncate">{bundle.title}</h4>
                      <button
                        onClick={() => update(bundle.id, { isActive: !bundle.isActive })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 border-2 ${
                          bundle.isActive 
                            ? "bg-cyan-500 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]" 
                            : `border-transparent ${darkMode ? "bg-white/10" : "bg-gray-200"}`
                        }`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${bundle.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(bundle.items || []).slice(0, 2).map((item: string, i: number) => (
                        <span key={i} className="text-[7px] font-black uppercase tracking-tighter bg-on-surface/5 px-2 py-1 rounded-full opacity-60 italic">{item}</span>
                      ))}
                      {(bundle.items || []).length > 2 && <span className="text-[7px] font-black opacity-40 ml-1">+{(bundle.items || []).length - 2} more</span>}
                    </div>
                  </div>
              </div>

              <div className="flex items-end justify-between border-t border-on-surface/5 pt-6">
                <div>
                  <span className="text-[10px] font-black text-cyan-500 block mb-1 uppercase tracking-widest leading-none">Price Value</span>
                  <span className="text-xl font-black">{formatPrice(bundle.price)}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(bundle)} className="p-3 bg-on-surface/5 rounded-2xl hover:bg-primary hover:text-white transition-all"><Edit2 size={16} /></button>
                  <button onClick={() => remove(bundle.id)} className="p-3 bg-red-500/5 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CategoriesTab({
  darkMode,
  t,
  globalSearch,
}: {
  darkMode: boolean;
  t: any;
  globalSearch?: string;
}) {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    products,
    deals,
    addDeal,
    updateDeal,
    deleteDeal,
    bundles,
    addBundle,
    updateBundle,
    deleteBundle,
    formatPrice,
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<"list" | "deals" | "bundles">(
    "list",
  );

  const filteredCategories = categories.filter((c) => {
    const s = globalSearch?.toLowerCase() || "";
    return (
      c.key.toLowerCase().includes(s) || 
      t(c.key).toLowerCase().includes(s) ||
      c.nameEn?.toLowerCase().includes(s) ||
      c.nameMm?.toLowerCase().includes(s) ||
      c.nameMs?.toLowerCase().includes(s) ||
      c.nameTh?.toLowerCase().includes(s) ||
      c.nameZh?.toLowerCase().includes(s)
    );
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newCategory, setNewCategory] = useState({
    key: "",
    nameEn: "",
    nameMm: "",
    nameMs: "",
    nameTh: "",
    nameZh: "",
    order: categories.length,
    supportPhone: "",
    iconUrl: "",
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.key) return;
    
    if (editingCategory) {
      await updateCategory(editingCategory.id, {
        key: newCategory.key,
        nameEn: newCategory.nameEn,
        nameMm: newCategory.nameMm,
        nameMs: newCategory.nameMs,
        nameTh: newCategory.nameTh,
        nameZh: newCategory.nameZh,
        order: Number(newCategory.order),
        supportPhone: newCategory.supportPhone,
        iconUrl: newCategory.iconUrl,
      });
      setEditingCategory(null);
    } else {
      await addCategory({
        key: newCategory.key,
        nameEn: newCategory.nameEn,
        nameMm: newCategory.nameMm,
        nameMs: newCategory.nameMs,
        nameTh: newCategory.nameTh,
        nameZh: newCategory.nameZh,
        isActive: true,
        order: Number(newCategory.order),
        supportPhone: newCategory.supportPhone,
        iconUrl: newCategory.iconUrl,
      });
    }
    
    setNewCategory({ 
      key: "", 
      nameEn: "", 
      nameMm: "", 
      nameMs: "",
      nameTh: "",
      nameZh: "",
      order: categories.length + 1,
      supportPhone: "",
      iconUrl: "",
    });
    setShowAdd(false);
  };

  const startEdit = (cat: any) => {
    setEditingCategory(cat);
    setNewCategory({
      key: cat.key,
      nameEn: cat.nameEn || "",
      nameMm: cat.nameMm || "",
      nameMs: cat.nameMs || "",
      nameTh: cat.nameTh || "",
      nameZh: cat.nameZh || "",
      order: cat.order,
      supportPhone: cat.supportPhone || "",
      iconUrl: cat.iconUrl || "",
    });
    setShowAdd(true);
  };

  const moveOrder = async (cat: any, direction: 'up' | 'down') => {
    const sortedCats = [...categories].filter(c => c.id !== 'all').sort((a, b) => a.order - b.order);
    const currentIndex = sortedCats.findIndex(c => c.id === cat.id);
    
    if (direction === 'up' && currentIndex > 0) {
      const prevCat = sortedCats[currentIndex - 1];
      await updateCategory(cat.id, { order: prevCat.order });
      await updateCategory(prevCat.id, { order: cat.order });
      toast.success(`Position moved up`);
    } else if (direction === 'down' && currentIndex < sortedCats.length - 1) {
      const nextCat = sortedCats[currentIndex + 1];
      await updateCategory(cat.id, { order: nextCat.order });
      await updateCategory(nextCat.id, { order: cat.order });
      toast.success(`Position moved down`);
    }
  };

  const handleDeleteCategory = (cat: any) => {
    const productsInCat = products.filter(p => p.category === cat.key).length;
    if (productsInCat > 0) {
      toast.error(`Cannot delete category with ${productsInCat} products.`);
      return;
    }
    toast("Delete this category?", {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: () => deleteCategory(cat.id)
      },
      cancel: {
        label: "Cancel",
        onClick: () => {}
      }
    });
  };

  const getCategoryIcon = (category: any) => {
    if (category.iconUrl) {
      return <img src={category.iconUrl} alt="" className="w-5 h-5 object-contain rounded-md" referrerPolicy="no-referrer" />;
    }

    const key = category.key;
    const iconSize = 18;
    switch (key) {
      case 'all': return <LayoutDashboard size={iconSize} />;
      case 'deals': return <Zap size={iconSize} className="fill-orange-500 text-orange-500" />;
      case 'bundles': return <Sparkles size={iconSize} className="text-cyan-500" />;
      
      // Core food categories
      case 'meat': 
      case 'poultry':
      case 'meat-poultry': return <Beef size={iconSize} />;
      case 'seafood': 
      case 'fish': return <Fish size={iconSize} />;
      case 'vegetables': 
      case 'fresh-produce': 
      case 'fruits': return <Carrot size={iconSize} />;
      case 'dairy':
      case 'eggs':
      case 'dairy-eggs':
      case 'dairyAndEggs': return <Egg size={iconSize} />;
      case 'ready-to-eat':
      case 'readyToEat': 
      case 'prepared-meals': return <Soup size={iconSize} />;
      case 'dry-goods':
      case 'pantry':
      case 'dryGoods': return <Wheat size={iconSize} />;
      case 'kitchen': 
      case 'home-essentials': return <UtensilsCrossed size={iconSize} />;
      case 'spices': 
      case 'seasonings': return <Flame size={iconSize} className="text-orange-600" />;
      case 'beverages': 
      case 'drinks': return <Wine size={iconSize} />;
      case 'snacks': 
      case 'confectionery': return <Candy size={iconSize} />;
      
      // Legacy/Misc categories
      case 'frozen-foods': return <Snowflake size={iconSize} />;
      case 'baby-care': return <Baby size={iconSize} />;
      case 'pet-care': return <Dog size={iconSize} />;
      case 'household': return <Home size={iconSize} />;
      case 'personal-care': return <Smile size={iconSize} />;
      case 'health-wellness': return <Pill size={iconSize} />;
      case 'office-supplies': return <Briefcase size={iconSize} />;
      
      default: return <Store size={iconSize} />;
    }
  };

  const stats = [
    { label: 'Total', value: categories.length, icon: ListChecks, color: darkMode ? 'text-blue-400' : 'text-blue-600', bg: darkMode ? 'bg-blue-400/10' : 'bg-blue-50' },
    { label: 'Active', value: categories.filter(c => c.isActive !== false).length, icon: CheckCircle2, color: darkMode ? 'text-emerald-400' : 'text-emerald-600', bg: darkMode ? 'bg-emerald-400/10' : 'bg-emerald-50' },
    { label: 'Hidden', value: categories.filter(c => c.isActive === false).length, icon: EyeOff, color: darkMode ? 'text-rose-400' : 'text-rose-600', bg: darkMode ? 'bg-rose-400/10' : 'bg-rose-50' },
  ];

  return (
    <div className="space-y-8">
      {/* Sub Navigation */}
      <div className={`p-1.5 rounded-[1.25rem] flex gap-1 border transition-all duration-300 ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-100/50 border-gray-100"}`}>
        {[
          { id: "list", label: "Category List", icon: ListChecks },
          { id: "deals", label: "Daily Deals", icon: Zap },
          { id: "bundles", label: "Combo Packs", icon: Sparkles },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[0.9rem] font-black text-[9px] uppercase tracking-[0.15em] transition-all duration-300 ${
              activeSubTab === tab.id
                ? darkMode
                  ? "bg-primary text-surface shadow-[0_4px_15px_rgba(16,185,129,0.3)]"
                  : "bg-white text-emerald-950 shadow-sm border border-black/[0.02]"
                : "text-on-surface/30 hover:text-on-surface/60"
            }`}
          >
            <tab.icon size={12} strokeWidth={3} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeSubTab === "list" && (
            <div className="space-y-6">
              {/* Compact Header & Stats Row */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className={`flex-1 p-6 rounded-2xl border flex items-center justify-between ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-sm"}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-1.5 h-6 rounded-full ${darkMode ? "bg-primary" : "bg-emerald-500"}`} />
                    <div>
                      <h2 className={`text-lg font-black tracking-tight ${darkMode ? "text-on-surface" : "text-emerald-950"}`}>
                        Category Hub
                      </h2>
                      <p className="text-[9px] opacity-40 font-bold uppercase tracking-widest leading-none">Management</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (window.confirm("Restore default categories?")) {
                          try {
                            await seedDatabase();
                            toast.success("Defaults restored");
                          } catch (err) { toast.error("Failed"); }
                        }
                      }}
                      className={`h-10 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border ${darkMode ? "bg-white/5 text-on-surface border-white/10" : "bg-gray-100 text-gray-600 border-gray-200"}`}
                    >
                      Defaults
                    </button>
                    <button
                      onClick={() => {
                        if (showAdd) {
                          setShowAdd(false);
                          setEditingCategory(null);
                          setNewCategory({ key: "", order: categories.length });
                        } else {
                          setShowAdd(true);
                        }
                      }}
                      className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${darkMode ? "bg-primary/10 text-primary border border-primary/20" : "bg-emerald-600 text-white shadow-lg shadow-emerald-200"}`}
                    >
                      {showAdd ? <X size={18} /> : <Plus size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                  {stats.map((s, i) => (
                    <div key={i} className={`flex-none min-w-[100px] px-5 py-4 rounded-xl border flex items-center gap-3 ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-sm"}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.bg}`}>
                        <s.icon size={14} className={s.color} />
                      </div>
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-widest opacity-40 leading-none mb-1">{s.label}</p>
                        <p className={`text-sm font-black tracking-tighter leading-none ${darkMode ? "text-white" : "text-emerald-950"}`}>{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {showAdd && (
                <form
                  onSubmit={handleAdd}
                  className={`p-6 rounded-2xl border space-y-4 ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"}`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-2">Key</label>
                      <input
                        className={`w-full p-4 rounded-lg border font-black text-xs outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-white border-gray-200 focus:border-emerald-500"} ${editingCategory ? "opacity-50 cursor-not-allowed" : ""}`}
                        placeholder="e.g. fresh-fruit"
                        value={newCategory.key}
                        onChange={(e) => setNewCategory({ ...newCategory, key: e.target.value })}
                        required
                        disabled={!!editingCategory}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-2">Menu Order</label>
                      <input
                        type="number"
                        className={`w-full p-4 rounded-lg border font-black text-xs outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-white border-gray-200 focus:border-emerald-500"}`}
                        value={newCategory.order}
                        onChange={(e) => setNewCategory({ ...newCategory, order: Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-2">Name (English)</label>
                       <input
                        className={`w-full p-4 rounded-lg border font-black text-xs outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-white border-gray-200 focus:border-emerald-500"}`}
                        placeholder="Fresh Fruit"
                        value={newCategory.nameEn}
                        onChange={(e) => setNewCategory({ ...newCategory, nameEn: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-2">Name (Myanmar)</label>
                      <input
                        className={`w-full p-4 rounded-lg border font-black text-xs outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-white border-gray-100 placeholder-opacity-20 font-sans"}`}
                        placeholder="လတ်ဆတ်သော သစ်သီးများ"
                        value={newCategory.nameMm}
                        onChange={(e) => setNewCategory({ ...newCategory, nameMm: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-2">Name (Malay)</label>
                      <input
                        className={`w-full p-4 rounded-lg border font-black text-xs outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-white border-gray-200 focus:border-emerald-500"}`}
                        placeholder="Buah-buahan Segar"
                        value={newCategory.nameMs}
                        onChange={(e) => setNewCategory({ ...newCategory, nameMs: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-2">Name (Thai)</label>
                      <input
                        className={`w-full p-4 rounded-lg border font-black text-xs outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-white border-gray-200 focus:border-emerald-500"}`}
                        placeholder="ผลไม้สด"
                        value={newCategory.nameTh}
                        onChange={(e) => setNewCategory({ ...newCategory, nameTh: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-2">Name (Chinese)</label>
                      <input
                        className={`w-full p-4 rounded-lg border font-black text-xs outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-white border-gray-200 focus:border-emerald-500"}`}
                        placeholder="新鲜水果"
                        value={newCategory.nameZh}
                        onChange={(e) => setNewCategory({ ...newCategory, nameZh: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-2">Support Phone (Optional)</label>
                      <input
                        className={`w-full p-4 rounded-lg border font-black text-xs outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-white border-gray-200 focus:border-emerald-500"}`}
                        placeholder="e.g. 60112345678"
                        value={newCategory.supportPhone}
                        onChange={(e) => setNewCategory({ ...newCategory, supportPhone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-2">Icon Logo URL (Optional)</label>
                      <input
                        className={`w-full p-4 rounded-lg border font-black text-xs outline-none transition-all ${darkMode ? "bg-white/5 border-white/10 focus:border-primary" : "bg-white border-gray-200 focus:border-emerald-500"}`}
                        placeholder="https://png.pngtree.com/png-vector/..."
                        value={newCategory.iconUrl}
                        onChange={(e) => setNewCategory({ ...newCategory, iconUrl: e.target.value })}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className={`w-full py-4 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${darkMode ? "bg-primary text-surface shadow-lg" : "bg-emerald-600 text-white shadow-lg shadow-emerald-200"}`}
                  >
                    {editingCategory ? "Update Category" : "Confirm Register"}
                  </button>
                </form>
              )}

              {/* Enhanced Grid/List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredCategories
                  .filter((c) => c.id !== "all")
                  .sort((a, b) => a.order - b.order)
                  .map((cat) => (
                    <motion.div
                      layout
                      key={cat.id}
                      className={`p-5 rounded-xl border flex flex-col group transition-all duration-300 ${
                        darkMode 
                          ? "bg-white/5 border-white/10 hover:bg-white/[0.08]" 
                          : "bg-white border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              darkMode ? "bg-white/5 text-primary border border-white/5" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            }`}
                          >
                            {getCategoryIcon(cat)}
                          </div>
                          <div>
                            <h4 className="font-black text-[11px] uppercase tracking-widest truncate max-w-[120px]">
                              {(() => {
                                if (cat.nameEn) return cat.nameEn;
                                return cat.key ? t(cat.key) : cat.name;
                              })()}
                            </h4>
                            <div className="flex items-center gap-2">
                              <p className="text-[8px] opacity-40 font-bold tracking-widest leading-none mt-0.5">
                                {cat.key}
                              </p>
                              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded ${darkMode ? "bg-white/5 text-white/40" : "bg-gray-100 text-gray-500"}`}>
                                {products.filter(p => p.category === cat.key).length} Items
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => updateCategory(cat.id, { isActive: cat.isActive === false ? true : false })}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 border-2 ${
                            cat.isActive !== false 
                              ? "bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
                              : `border-transparent ${darkMode ? "bg-white/10" : "bg-gray-200"}`
                          }`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${cat.isActive !== false ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </div>

                      <div className="mt-auto pt-3 flex items-center justify-between border-t border-dashed border-on-surface/5">
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => moveOrder(cat, 'up')}
                            className={`p-1 rounded bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors`}
                          >
                            <ChevronUp size={12} />
                          </button>
                          <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter ${darkMode ? "bg-white/5 opacity-50" : "bg-gray-50 opacity-60"}`}>
                            {cat.order}
                          </div>
                          <button 
                            onClick={() => moveOrder(cat, 'down')}
                            className={`p-1 rounded bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors`}
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(cat)}
                            className={`p-2 rounded-lg transition-all ${darkMode ? "text-blue-400 hover:bg-blue-400/10" : "text-blue-600 hover:bg-blue-50"}`}
                            title="Edit"
                          >
                            <Settings size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className={`p-2 rounded-lg transition-all active:scale-95 ${darkMode ? "text-rose-400 hover:bg-rose-400/10" : "text-rose-600 hover:bg-rose-50"}`}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          )}

          {activeSubTab === "deals" && (
            <DealManagement
              deals={deals}
              add={addDeal}
              update={updateDeal}
              remove={deleteDeal}
              darkMode={darkMode}
              formatPrice={formatPrice}
              globalSearch={globalSearch}
            />
          )}
          {activeSubTab === "bundles" && (
            <BundleManagement
              bundles={bundles}
              add={addBundle}
              update={updateBundle}
              remove={deleteBundle}
              darkMode={darkMode}
              formatPrice={formatPrice}
              globalSearch={globalSearch}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SpecialOffersTab() {
  return null;
}

function AdBannersTab({
  darkMode,
  t,
  globalSearch,
}: {
  darkMode: boolean;
  t: any;
  globalSearch?: string;
}) {
  const {
    promotionBanners,
    addPromotionBanner,
    updatePromotionBanner,
    deletePromotionBanner,
    reorderPromotionBanners,
  } = useStore();

  return (
    <div className="space-y-8">
      <BannerManagement
        banners={promotionBanners}
        add={addPromotionBanner}
        update={updatePromotionBanner}
        remove={deletePromotionBanner}
        reorder={reorderPromotionBanners}
        darkMode={darkMode}
        globalSearch={globalSearch}
      />
    </div>
  );
}

function CustomerDetailsView({
  customer,
  orders,
  darkMode,
  onClose,
  updateUserPoints,
  handlePrint,
}: {
  customer: any;
  orders: any[];
  darkMode: boolean;
  onClose: () => void;
  updateUserPoints: (uid: string, p: number) => Promise<void>;
  handlePrint?: (order: Order, format: 'a4' | 'thermal' | 'pdf') => void;
}) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [editingPoints, setEditingPoints] = React.useState(false);
  const [pointsVal, setPointsVal] = React.useState((customer.points || 0).toString());
  const [isBlockingOrUnblocking, setIsBlockingOrUnblocking] = React.useState(false);
  const [showImagePreview, setShowImagePreview] = React.useState(false);
  const [expandedOrderId, setExpandedOrderId] = React.useState<string | null>(null);
  
  const { formatPrice, t, updateOrderStatus } = useStore();

  const leftColRef = React.useRef<HTMLDivElement>(null);
  const [leftColHeight, setLeftColHeight] = React.useState<number | null>(null);
  const [isDesktop, setIsDesktop] = React.useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    if (!leftColRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setLeftColHeight(entry.contentRect.height);
      }
    });
    observer.observe(leftColRef.current);
    return () => observer.disconnect();
  }, [customer]);
  
  const [customerAddresses, setCustomerAddresses] = React.useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = React.useState(false);

  React.useEffect(() => {
    if (!customer) return;
    
    const fetchAddresses = async () => {
      setLoadingAddresses(true);
      try {
        const uidsToCheck = customer.uids || [customer.id || customer.uid];
        const allAddresses: any[] = [];
        
        for (const uid of uidsToCheck) {
          if (!uid) continue;
          const snap = await getDocs(collection(db, 'users', uid, 'addresses'));
          snap.forEach(docSnap => {
            allAddresses.push({
              id: docSnap.id,
              userId: uid,
              ...docSnap.data()
            });
          });
        }
        setCustomerAddresses(allAddresses);
      } catch (e) {
        console.error("Error fetching customer addresses:", e);
      } finally {
        setLoadingAddresses(false);
      }
    };
    
    fetchAddresses();
  }, [customer]);
  
  // Helper for Phone Matching
  const getPhoneGroupKey = (phone: string) => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("09")) {
      cleaned = "95" + cleaned.substring(1);
    } else if (cleaned.startsWith("01")) {
      cleaned = "60" + cleaned.substring(1);
    }
    return cleaned;
  };

  // Filter orders related to this customer
  const customerOrdersList = React.useMemo(() => {
    if (!customer) return [];
    return orders.filter(o => 
      (o.uid && customer.uids?.includes(o.uid)) || 
      (o.customerPhone && customer.phone && getPhoneGroupKey(o.customerPhone) === getPhoneGroupKey(customer.phone))
    ).sort((a, b) => {
      const timeA = a.timestamp || 0;
      const timeB = b.timestamp || 0;
      return timeB - timeA;
    });
  }, [customer, orders]);

  // Compute Statistics
  const stats = React.useMemo(() => {
    const deliveredOrders = customerOrdersList.filter(o => o.status === "delivered");
    const totalSpend = deliveredOrders.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0);
    const orderCount = customerOrdersList.length;
    const deliveredCount = deliveredOrders.length;
    const avgOrderValue = deliveredCount > 0 ? totalSpend / deliveredCount : 0;
    
    return {
      totalSpend,
      orderCount,
      deliveredCount,
      avgOrderValue,
    };
  }, [customerOrdersList]);

  // Filtering for orders inside view
  const filteredOrders = React.useMemo(() => {
    return customerOrdersList.filter(o => {
      const term = searchTerm.toLowerCase();
      const matchTerm = !term || 
        o.id?.toLowerCase().includes(term) ||
        o.items?.some((item: any) => item.name?.toLowerCase().includes(term)) ||
        o.note?.toLowerCase().includes(term);

      const matchStatus = statusFilter === "all" || o.status === statusFilter;

      return matchTerm && matchStatus;
    });
  }, [customerOrdersList, searchTerm, statusFilter]);

  const handleUpdatePoints = async () => {
    const parsed = parseInt(pointsVal);
    if (isNaN(parsed)) return;
    try {
      const updatePromises = customer.uids.map((id: string) => updateUserPoints(id, parsed));
      await Promise.all(updatePromises);
      customer.points = parsed; // Optimistic update
      toast.success(`Loyalty balance updated to ${parsed} Stars`);
      setEditingPoints(false);
    } catch (e) {
      toast.error("Failed to update points");
    }
  };

  const handleToggleBlock = async () => {
    if (!customer.uids || customer.uids.length === 0) return;
    setIsBlockingOrUnblocking(true);
    try {
      const { doc, updateDoc, deleteField } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");
      
      if (!customer.isBlocked) {
        const message = window.prompt("Enter suspension message for the customer's portal:", "Your account has been temporarily suspended from of our retail network.");
        if (message === null) {
          setIsBlockingOrUnblocking(false);
          return;
        }
        
        const blockPromises = customer.uids.map((id: string) => 
          updateDoc(doc(db, "users", id), {
            isBlocked: true,
            blockMessage: message
          })
        );
        await Promise.all(blockPromises);
        customer.isBlocked = true;
        customer.blockMessage = message;
        toast.success(`Customer account suspended successfully.`);
      } else {
        if (window.confirm("Are you sure you want to revoke suspenson on this customer?")) {
          const unblockPromises = customer.uids.map((id: string) => 
            updateDoc(doc(db, "users", id), {
              isBlocked: false,
              blockMessage: deleteField()
            })
          );
          await Promise.all(unblockPromises);
          customer.isBlocked = false;
          customer.blockMessage = "";
          toast.success(`Customer account unblocked successfully.`);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update account restriction status.");
    } finally {
      setIsBlockingOrUnblocking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success("Order reference key copied to clipboard!");
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "pending":
        return darkMode 
          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
          : "bg-amber-50 text-amber-700 border border-amber-200";
      case "preparing":
        return darkMode 
          ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" 
          : "bg-sky-50 text-sky-700 border border-sky-200";
      case "on_the_way":
        return darkMode 
          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
          : "bg-indigo-50 text-indigo-700 border border-indigo-200";
      case "delivered":
        return darkMode 
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
          : "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "cancelled":
        return darkMode 
          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
          : "bg-rose-50 text-rose-700 border border-rose-200";
      default:
        return "bg-slate-100 text-slate-705 border border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Pending Approval";
      case "preparing": return "Preparing Order";
      case "on_the_way": return "In Transit";
      case "delivered": return "Delivered & Settled";
      case "cancelled": return "Cancelled";
      default: return status || "General";
    }
  };

  // Determine Loyalty Tier Styling Details
  const tierInfo = React.useMemo(() => {
    const tier = customer.tier || "Bronze";
    if (tier === "Gold") {
      return {
        badgeClass: "bg-gradient-to-r from-amber-500/15 to-yellow-600/15 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
        bgLight: "bg-gradient-to-r from-amber-50 to-yellow-100 text-amber-800 border border-amber-200 shadow-xs",
        label: "Gold Partner"
      };
    }
    if (tier === "Silver") {
      return {
        badgeClass: "bg-gradient-to-r from-slate-400/15 to-indigo-500/15 text-slate-300 border border-slate-400/30 shadow-[0_0_12px_rgba(148,163,184,0.1)]",
        bgLight: "bg-gradient-to-r from-slate-50 to-indigo-100 text-slate-800 border border-slate-200 shadow-xs",
        label: "Silver Partner"
      };
    }
    return {
      badgeClass: "bg-gradient-to-r from-emerald-500/15 to-teal-600/15 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]",
      bgLight: "bg-gradient-to-r from-emerald-50 to-teal-100 text-emerald-800 border border-emerald-200 shadow-xs",
      label: "Bronze Loyalty"
    };
  }, [customer]);

  return (
    <div className="space-y-6 w-full animate-fade-in relative pb-12">
      {/* Page Header */}
      <div className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        darkMode 
          ? "bg-surface-container border-white/5" 
          : "bg-white border-slate-200 shadow-xs"
      }`}>
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className={`p-2.5 rounded-lg transition-all duration-205 active:scale-95 hover:scale-102 cursor-pointer border ${
              darkMode
                ? "bg-white/5 hover:bg-white/10 text-primary border-white/5"
                : "bg-slate-100 hover:bg-slate-200 text-slate-850 border-slate-200"
            }`}
          >
            <ArrowLeft size={16} className="stroke-[2.5]" />
          </button>
          
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className={`text-xl md:text-2xl font-bold tracking-tight ${darkMode ? "text-on-surface" : "text-slate-900"}`}>
                {customer.name || "Anonymous Customer"}
              </h2>
              
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md shadow-2xs transition-all ${
                darkMode ? tierInfo.badgeClass : tierInfo.bgLight
              }`}>
                {tierInfo.label}
              </span>

              {customer.isBlocked && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 border border-rose-500/20 animate-pulse">
                  Suspended
                </span>
              )}
            </div>
            
            <p className="text-[11px] font-medium opacity-50 mt-1 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${customer.isBlocked ? "bg-rose-500" : "bg-emerald-500"}`} />
              Customer Profile • {customer.isGrouped && customer.groupedCount > 1 ? `${customer.groupedCount} Linked Accounts` : "Single Account"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {customer.phone && (
            <a
              href={`https://wa.me/${formatPhoneNumber(customer.phone)}`}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer border ${
                darkMode 
                  ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 border-emerald-500/20" 
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
              }`}
            >
              <MessageCircle size={14} className="stroke-[2.5]" />
              WhatsApp Client
            </a>
          )}
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMN 1: Left dossier card details */}
        <div ref={leftColRef} className="lg:col-span-4 space-y-6">
          
          {/* Simple Clean Profile block */}
          <div className={`p-6 rounded-xl border text-center relative overflow-hidden transition-all duration-200 ${
            darkMode 
              ? "bg-gradient-to-b from-surface-container to-surface-container-low border-white/5" 
              : "bg-white border-slate-200 shadow-xs"
          }`}>
            <div className="relative flex flex-col items-center">
              {/* Profile Avatar */}
              <div className="relative mb-4 flex justify-center items-center">
                {customer.avatar ? (
                  <div className="relative font-sans">
                    <img
                      src={customer.avatar}
                      alt={customer.name || "Customer"}
                      className="w-18 h-18 rounded-full object-cover border-2 border-primary/40 shadow-sm cursor-zoom-in hover:scale-105 active:scale-95 transition-all duration-300"
                      referrerPolicy="no-referrer"
                      onClick={() => setShowImagePreview(true)}
                      title="Click to zoom / ပုံကြီးကြည့်ရန်"
                    />
                    <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 ${
                      darkMode ? "border-zinc-900" : "border-white"
                    } ${
                      customer.isBlocked ? "bg-rose-500" : "bg-emerald-500"
                    }`} />
                  </div>
                ) : (
                  <div className={`w-18 h-18 rounded-full flex items-center justify-center font-bold text-2xl border-2 relative ${
                    darkMode 
                      ? "bg-zinc-800 text-primary border-zinc-700" 
                      : "bg-slate-50 text-primary border-slate-200"
                  }`}>
                    {customer.name ? customer.name.charAt(0).toUpperCase() : "?"}
                    
                    {/* Status Indicator */}
                    <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 ${
                      darkMode ? "border-zinc-900" : "border-white"
                    } ${
                      customer.isBlocked ? "bg-rose-500" : "bg-emerald-500"
                    }`} />
                  </div>
                )}
              </div>
              
              <h4 className="font-bold text-base tracking-tight">{customer.name || "Anonymous Customer"}</h4>
              <p className={`text-xs mt-1 font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                {customer.phone || "No phone linked"}
              </p>
              
              {customer.email && (
                <div className={`mt-3 py-1 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 ${
                  darkMode ? "bg-white/5 text-slate-300" : "bg-slate-50 text-slate-600 border border-slate-100"
                }`}>
                  <Mail size={12} className="opacity-60 text-primary" />
                  <span className="truncate max-w-[190px]">{customer.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Wallet Financial Stats Overview */}
          <div className={`p-5 rounded-xl border space-y-4 ${
            darkMode ? "bg-surface-container border-white/5" : "bg-white border-slate-200 shadow-xs"
          }`}>
            <h5 className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5 pl-0.5 text-slate-500">
              <span className="w-1 h-3 rounded-full bg-primary" />
              FINANCIAL OVERVIEW
            </h5>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Total Spend */}
              <div className={`p-3.5 rounded-lg border ${
                darkMode ? 'bg-zinc-900/60 border-white/5' : 'bg-slate-50 border-slate-150 shadow-2xs'
              }`}>
                <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">Total Spend</p>
                <p className="font-bold text-base tracking-tight text-emerald-500 mt-1">
                  RM {stats.totalSpend.toLocaleString()}
                </p>
              </div>

              {/* AOV */}
              <div className={`p-3.5 rounded-lg border ${
                darkMode ? 'bg-zinc-900/60 border-white/5' : 'bg-slate-50 border-slate-150 shadow-2xs'
              }`}>
                <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">Average Order</p>
                <p className="font-bold text-base tracking-tight text-primary mt-1">
                  RM {Math.round(stats.avgOrderValue).toLocaleString()}
                </p>
              </div>

              {/* Total OrdersCount */}
              <div className={`p-3.5 rounded-lg border ${
                darkMode ? 'bg-zinc-900/60 border-white/5' : 'bg-slate-50 border-slate-150 shadow-2xs'
              }`}>
                <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">Total Orders</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-bold text-base tracking-tight text-on-surface">
                    {stats.orderCount}
                  </span>
                  <span className="text-[9px] opacity-50 font-bold">({stats.deliveredCount} Del)</span>
                </div>
              </div>

              {/* Star loyalty points */}
              <div className={`p-3.5 rounded-lg border ${
                darkMode ? 'bg-zinc-900/60 border-white/5' : 'bg-slate-50 border-slate-150 shadow-2xs'
              }`}>
                <p className="text-[8.5px] font-bold text-slate-400 tracking-wider uppercase">STAR POINTS</p>
                <p className="font-bold text-base tracking-tight text-indigo-400 mt-1 flex items-center gap-1">
                  <Sparkles size={13} className="text-primary opacity-80" />
                  {customer.points || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Account Details Record Card */}
          <div className={`p-5 rounded-xl border space-y-4 ${
            darkMode ? "bg-surface-container border-white/5" : "bg-white border-slate-200 shadow-xs"
          }`}>
            <h5 className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5 pl-0.5 text-slate-500">
              <span className="w-1 h-3 rounded-full bg-indigo-400" />
              CONTACT INFORMATION
            </h5>
            
            <div className="space-y-3 text-xs">
              {customer.phone && (
                <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-on-surface/5">
                  <span className="text-slate-400 font-medium shrink-0">Phone Number:</span>
                  <span className="font-semibold text-on-surface text-right">{customer.phone}</span>
                </div>
              )}

              {customer.email && (
                <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-on-surface/5">
                  <span className="text-slate-400 font-medium shrink-0">Email Address:</span>
                  <span className="font-semibold text-right break-all max-w-[200px] text-on-surface" title={customer.email}>
                    {customer.email}
                  </span>
                </div>
              )}

              {customer.room && (
                <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-on-surface/5">
                  <span className="text-slate-400 font-medium shrink-0">Delivery Room:</span>
                  <span className="font-bold text-right text-primary bg-primary/5 px-2.5 py-0.5 rounded-lg border border-primary/10">
                    {customer.room}
                  </span>
                </div>
              )}

              {customer.birthday && (
                <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-on-surface/5">
                  <span className="text-slate-400 font-medium shrink-0">Birthday:</span>
                  <span className="font-semibold text-on-surface text-right">{customer.birthday}</span>
                </div>
              )}

              {customer.createdAt && (
                <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-on-surface/5">
                  <span className="text-slate-400 font-medium shrink-0">Joined Date:</span>
                  <span className="font-semibold text-on-surface text-right">
                    {typeof customer.createdAt === 'string' 
                      ? customer.createdAt 
                      : (new Date(customer.createdAt)).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}
                  </span>
                </div>
              )}

              {customer.isGrouped && customer.groupedCount > 1 && (
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Linked Accounts:</span>
                    <span className="px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold">
                      {customer.groupedCount} Linked
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg text-[9px] font-mono break-all max-h-[140px] overflow-y-auto space-y-1 border ${
                    darkMode ? "bg-zinc-900/60 text-slate-400 border-white/5" : "bg-slate-50 text-slate-650 border-slate-150"
                  }`}>
                    {customer.uids.map((id: string, idx: number) => (
                      <div key={id} className="flex justify-between gap-2 border-b last:border-0 border-on-surface/5 pb-1 last:pb-0">
                        <span className="opacity-65 flex items-center gap-1 font-bold">
                          <span className="w-1 h-1 rounded-full bg-slate-400 opacity-40" />
                          Sub-ID #{idx+1}
                        </span>
                        <span className="opacity-95 font-semibold">{id.substring(0, 16)}...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Addresses Section */}
          <div className={`p-5 rounded-xl border space-y-4 ${
            darkMode ? "bg-surface-container border-white/5" : "bg-white border-slate-200 shadow-xs"
          }`}>
            <h5 className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5 pl-0.5 text-slate-500">
              <span className="w-1 h-3 rounded-full bg-emerald-500" />
              DELIVERY ADDRESSES ({customerAddresses.length})
            </h5>
            
            {loadingAddresses ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-1.5">
                <RefreshCw size={18} className="animate-spin text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Loading addresses...</span>
              </div>
            ) : customerAddresses.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-on-surface/5 rounded-lg">
                <MapPin size={20} className="mx-auto text-slate-400 opacity-40 mb-1.5" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">No saved addresses</p>
                <p className="text-[9px] text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed text-center">This customer has not saved any delivery addresses yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[280px] overflow-y-auto no-scrollbar pr-1">
                {customerAddresses.map((addr) => (
                  <div 
                    key={addr.id}
                    className={`p-3 rounded-lg border transition-all text-xs ${
                      addr.isDefault 
                        ? (darkMode ? "bg-primary/5 border-primary/25" : "bg-primary/5 border-primary/15")
                        : (darkMode ? "bg-zinc-900/60 border-white/5" : "bg-slate-50 border-slate-150")
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {addr.label === "Home" ? (
                          <Home size={12} className="text-primary" />
                        ) : addr.label === "Office" ? (
                          <Briefcase size={12} className="text-primary" />
                        ) : (
                          <MapPin size={12} className="text-primary" />
                        )}
                        <span className={`font-bold text-[10px] uppercase tracking-wider ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                          {addr.label || "Address"}
                        </span>
                        {addr.isDefault && (
                          <span className="px-1.5 py-0.2 rounded bg-primary text-white text-[8px] font-bold uppercase tracking-widest">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className={`space-y-1 leading-relaxed font-semibold`}>
                      <p className={`text-[11px] font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Recipient: <span className={`font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{addr.name || customer.name}</span></p>
                      <p className={`text-[11px] font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Phone: <span className={`font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{addr.phone || customer.phone}</span></p>
                      <p className={`text-[11.5px] font-bold mt-1 leading-normal ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                        {addr.room ? `${addr.room}, ` : ""}
                        {addr.building ? `${addr.building}, ` : ""}
                        {addr.street}, {addr.township}, {addr.city}, {addr.region}
                      </p>
                    </div>

                    {addr.latitude && addr.longitude && (
                      <div className="mt-2 pt-2 border-t border-on-surface/5 flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono text-slate-500">
                          {addr.latitude.toFixed(5)}, {addr.longitude.toFixed(5)}
                        </span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${addr.latitude},${addr.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[9px] font-bold text-primary flex items-center gap-1 hover:underline shrink-0"
                        >
                          <MapPin size={9} />
                          Map View
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick operations admin block */}
          <div className={`p-5 rounded-xl border space-y-4 ${
            darkMode ? "bg-surface-container border-white/5" : "bg-white border-slate-200 shadow-xs"
          }`}>
            <h5 className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5 pl-0.5 text-slate-500">
              <span className="w-1 h-3 rounded-full bg-rose-500" />
              ADMIN CONTROLS
            </h5>
            
            <div className="space-y-3.5">
              {/* Star points administration */}
              <div className="space-y-1.5 p-3 rounded-lg border border-on-surface/5 bg-on-surface/5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Adjust Star Balance
                </label>
                {editingPoints ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <input
                      type="number"
                      value={pointsVal}
                      onChange={(e) => setPointsVal(e.target.value)}
                      className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-xs font-bold outline-none transition-all ${
                        darkMode 
                          ? "bg-zinc-950 border border-white/10 focus:border-primary text-white" 
                          : "bg-white border border-slate-250 focus:border-primary text-slate-800"
                      }`}
                      placeholder="Stars..."
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleUpdatePoints}
                      className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all active:scale-95 shrink-0 cursor-pointer shadow-3xs"
                    >
                      <Check size={14} className="stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPoints(false);
                        setPointsVal((customer.points || 0).toString());
                      }}
                      className="p-1.5 rounded-lg bg-rose-550 text-white hover:bg-rose-650 transition-all active:scale-95 shrink-0 cursor-pointer shadow-3xs"
                    >
                      <X size={14} className="stroke-[2.5]" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingPoints(true)}
                    className={`w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all border ${
                      darkMode 
                        ? "bg-primary/10 text-primary hover:bg-primary/18 border-primary/15" 
                        : "bg-primary/5 text-primary hover:bg-primary/10 border-primary/15"
                    }`}
                  >
                    <Plus size={11} className="stroke-[2.5]" /> Adjust Star Balances
                  </button>
                )}
              </div>

              {/* Suspension operations */}
              <div>
                <button
                  type="button"
                  disabled={isBlockingOrUnblocking}
                  onClick={handleToggleBlock}
                  className={`w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all border disabled:opacity-45 ${
                    customer.isBlocked
                      ? "bg-rose-600 text-white hover:bg-rose-700 border-rose-650 shadow-3xs"
                      : darkMode
                        ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/18 border-rose-500/15"
                        : "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-150"
                  }`}
                >
                  <Ban size={11} className="stroke-[2.5]" />
                  {customer.isBlocked ? "Unblock Account" : "Suspend Account"}
                </button>
                
                {customer.isBlocked && customer.blockMessage && (
                  <div className={`mt-2.5 p-3 rounded-lg border text-[11px] font-medium flex items-start gap-2 leading-relaxed ${
                    darkMode ? "bg-rose-500/5 border-rose-500/10 text-rose-300" : "bg-rose-50/50 border-rose-100 text-rose-800"
                  }`}>
                    <AlertTriangle size={14} className="stroke-[2.5] text-rose-550 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase text-[9px] block text-rose-600 tracking-wider">Note:</span>
                      "{customer.blockMessage}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* COLUMN 2: Order logs history list (Right side) */}
        <div 
          className="lg:col-span-8 flex flex-col space-y-4 lg:min-h-0"
          style={isDesktop && leftColHeight ? { height: `${leftColHeight}px` } : {}}
        >
          
          {/* Advanced filter pane */}
          <div className={`p-5 rounded-xl border space-y-4 ${
            darkMode ? "bg-surface-container border-white/5" : "bg-white border-slate-200 shadow-xs"
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-1 h-3.5 rounded-full bg-primary" />
                <h5 className="text-sm font-bold tracking-tight text-on-surface flex items-baseline gap-1.5">
                  Order History
                  <span className="text-[10px] font-bold px-2 py-0.2 bg-primary/10 text-primary rounded-md">
                    {customerOrdersList.length} Total
                  </span>
                </h5>
              </div>
              
              {/* Search filter input */}
              <div className="relative w-full sm:max-w-xs">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search item, reference ID..."
                  className={`w-full py-1.5 pl-8 pr-3 rounded-lg text-xs font-semibold outline-none border transition-all placeholder:text-[11px] placeholder:italic ${
                    darkMode 
                      ? "bg-zinc-900 border-white/10 focus:border-primary text-white" 
                      : "bg-slate-50 border-slate-200 focus:border-primary text-slate-800"
                  }`}
                />
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50 text-on-surface pointer-events-none stroke-[2]" />
              </div>
            </div>

            {/* Status indicators segmented buttons list */}
            <div className="flex flex-wrap items-center gap-1.5 border-t border-on-surface/5 pt-3.5">
              {["all", "pending", "preparing", "on_the_way", "delivered", "cancelled"].map((st) => {
                const count = st === "all" ? customerOrdersList.length : customerOrdersList.filter(o => o.status === st).length;
                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 border ${
                      statusFilter === st
                        ? darkMode 
                          ? "bg-primary text-surface border-primary" 
                          : "bg-slate-900 text-white border-slate-900"
                        : darkMode 
                          ? "bg-white/5 hover:bg-white/10 text-slate-300 border-white/5" 
                          : "bg-white hover:bg-slate-50 text-slate-650 border-slate-200"
                    }`}
                  >
                    <span>{st.replace(/_/g, " ")}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded ${
                      statusFilter === st 
                        ? darkMode ? "bg-surface/20 text-surface" : "bg-white/25 text-white"
                        : darkMode ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-500"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ledger transaction Cards list */}
          <div className="lg:flex-1 lg:min-h-0 overflow-y-auto no-scrollbar space-y-4 pb-12 pr-1 max-h-[75vh] lg:max-h-none">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => {
                const formattedDate = parseOrderDate(order.createdAt, order.timestamp).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });

                return (
                  <div
                    key={order.id}
                    className="flex flex-col gap-2"
                  >
                    {/* Single unified interactive box container */}
                    <div
                      className={`group rounded-xl border transition-all duration-300 overflow-hidden select-none ${
                        expandedOrderId === order.id
                          ? darkMode
                            ? "bg-zinc-900 border-primary/40 shadow-md"
                            : "bg-slate-50 border-emerald-500/40 shadow-xs"
                          : darkMode
                            ? "bg-surface-container border-white/5 hover:border-white/10 hover:bg-white/[0.03] shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-3xs shadow-3xs"
                      }`}
                    >
                      {/* Header row click target */}
                      <div
                        onClick={() => setExpandedOrderId(prev => prev === order.id ? null : order.id)}
                        className={`px-3.5 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                          expandedOrderId === order.id
                            ? darkMode
                              ? "bg-white/[0.02] border-b border-white/5"
                              : "bg-slate-100/50 border-b border-slate-200"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Status Icon Indicator */}
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              order.status === "pending"
                                ? "bg-amber-500/10 text-amber-500"
                                : order.status === "cancelled"
                                  ? "bg-rose-500/10 text-rose-500"
                                  : "bg-primary/10 text-primary"
                            }`}
                          >
                            <ShoppingBag size={15} className="stroke-[2.5]" />
                          </div>
                          
                          {/* Reference & Time */}
                          <div className="truncate flex items-center gap-2 min-w-0">
                            <div className="min-w-0 truncate">
                              <p className={`font-extrabold text-sm tracking-tight ${darkMode ? "text-on-surface" : "text-slate-800"}`}>
                                #{order.id?.substring(0, 8).toUpperCase() || "N/A"}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {formattedDate}
                              </p>
                            </div>
                            
                            {/* Quick details indicators */}
                            <div className="flex gap-1 shrink-0">
                              {order.note && (
                                <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0" title="Has Instruction">
                                  <FileText size={10} className="stroke-[2.5]" />
                                </div>
                              )}
                              {order.paymentScreenshot && (
                                <div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0" title="Has Payment Proof">
                                  <ImageIcon size={10} className="stroke-[2.5]" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Hand Side Details */}
                        <div className="flex items-center gap-3 shrink-0 font-sans">
                          {/* Items count */}
                          <div className="text-right hidden sm:block">
                            <p className="text-[8px] uppercase tracking-[0.2em] opacity-30 font-black mb-1">
                              Breakdown
                            </p>
                            <p className={`font-bold text-xs ${darkMode ? "text-on-surface" : "text-slate-700"}`}>
                              {order.items?.length || 0} items
                            </p>
                          </div>
                          
                          {/* Grand Total */}
                          <div className="text-right min-w-[75px]">
                            <p className="text-[8px] uppercase tracking-[0.2em] opacity-30 font-black mb-1">
                              Total
                            </p>
                            <p className="font-extrabold text-xs text-emerald-500">
                              RM {order.total?.toLocaleString()}
                            </p>
                          </div>

                          {/* Status Badge */}
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${
                            getStatusBadgeStyles(order.status)
                          }`}>
                            {getStatusLabel(order.status)}
                          </span>

                          {/* Expand indicator icon */}
                          <div className={`p-1.5 rounded-full transition-colors ${
                            darkMode 
                              ? "bg-white/5 text-slate-300 group-hover:bg-primary/20 group-hover:text-primary" 
                              : "bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600"
                          }`}>
                            {expandedOrderId === order.id ? (
                              <ChevronUp size={12} className="stroke-[2.5]" />
                            ) : (
                              <ChevronDown size={12} className="stroke-[2.5]" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Inline Collapsible Detailed Content Panel (Merged Inside) */}
                      {expandedOrderId === order.id && (
                        <div className="p-4 space-y-4 animate-fade-in">
                          <div className="flex items-center justify-between border-b border-on-surface/5 pb-2">
                            <span className={`text-[11px] font-extrabold uppercase tracking-widest ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                              {t("order_items") || "Ordered Items"}
                            </span>
                            <span className="text-[10px] font-mono opacity-50 bg-on-surface/5 px-2 py-0.5 rounded-md">
                              {order.items?.length || 0} {order.items?.length === 1 ? "item" : "items"}
                            </span>
                          </div>

                          {/* Items list */}
                          <div className="space-y-2">
                            {order.items?.map((item: any, itemIdx: number) => (
                              <div 
                                key={item.id || itemIdx} 
                                className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${
                                  darkMode 
                                    ? "bg-zinc-950/40 border-white/5" 
                                    : "bg-white border-slate-200"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {item.image ? (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      referrerPolicy="no-referrer"
                                      className="w-9 h-9 rounded-lg object-cover shrink-0 pointer-events-none"
                                    />
                                  ) : (
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${
                                      darkMode ? "bg-zinc-805 border-zinc-700" : "bg-slate-50 border-slate-200"
                                    }`}>
                                      <ShoppingBag size={14} className="opacity-40 text-primary" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-bold text-[11.5px] text-on-surface truncate leading-tight">
                                      {item.name}
                                    </p>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-on-surface/5 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                                      {item.category || "General"}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="text-right shrink-0 flex items-center gap-4 font-medium">
                                  <span className="text-[11px] text-slate-450">
                                    Qty: <span className="font-bold text-on-surface">{item.quantity}</span>
                                  </span>
                                  <span className="font-bold text-[11px] text-on-surface min-w-[55px] text-right">
                                    {formatPrice(item.price)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Financial summary breakdown */}
                          <div className={`p-3 rounded-lg space-y-1.5 text-xs border ${
                            darkMode ? "bg-zinc-950/40 border-white/5" : "bg-slate-100/50 border-slate-200/60"
                          }`}>
                            <div className="flex justify-between items-center px-1">
                              <span className="text-slate-400 text-[11px]">Subtotal</span>
                              <span className="font-semibold text-on-surface text-[11px]">
                                {formatPrice(order.subtotal || (order.total - (order.deliveryFee || 0) + (order.discount || 0)))}
                              </span>
                            </div>
                            
                            {(order.deliveryFee || 0) > 0 && (
                              <div className="flex justify-between items-center px-1">
                                <span className="text-slate-400 text-[11px]">Delivery Fee</span>
                                <span className="font-semibold text-on-surface text-[11px]">
                                  +{formatPrice(order.deliveryFee)}
                                </span>
                              </div>
                            )}

                            {(order.discount || 0) > 0 && (
                              <div className="flex justify-between items-center px-1">
                                <span className="text-rose-450 text-[11px]">Discount</span>
                                <span className="font-semibold text-rose-500 text-[11px]">
                                  -{formatPrice(order.discount)}
                                </span>
                              </div>
                            )}

                            {order.paymentMethod && (
                              <div className="flex justify-between items-center px-1">
                                <span className="text-slate-400 text-[11px]">Payment</span>
                                <span className={`font-extrabold text-[10px] uppercase tracking-wider ${
                                  darkMode ? "text-slate-300" : "text-slate-700"
                                }`}>
                                  {order.paymentMethod.toUpperCase()}
                                </span>
                              </div>
                            )}

                            <div className="border-t border-on-surface/5 my-1" />

                            <div className="flex justify-between items-center px-1 font-bold">
                              <span className="text-on-surface text-xs font-extrabold">Total</span>
                              <span className="text-emerald-500 text-sm font-black">
                                {formatPrice(order.total || 0)}
                              </span>
                            </div>
                          </div>

                          {/* Special Instructions (Customer Note) */}
                          {order.note && (
                            <div className={`p-3 rounded-lg border flex items-start gap-2 text-[11px] ${
                              darkMode ? "bg-amber-500/5 border-amber-500/15 text-slate-300" : "bg-amber-50/50 border-amber-100 text-slate-750"
                            }`}>
                              <FileText size={14} className="shrink-0 mt-0.5 text-amber-500 stroke-[2.5]" />
                              <div className="min-w-0 break-words font-semibold leading-relaxed">
                                <span className="font-bold text-[9px] uppercase tracking-widest text-amber-600 mr-1">Customer Note:</span>
                                "{order.note}"
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={`flex flex-col items-center justify-center p-12 rounded-xl border-2 border-dashed text-center transition-colors ${
                darkMode ? "border-white/10 bg-white/2" : "border-slate-200 bg-slate-50/30"
              }`}>
                <ShoppingBag size={38} className="text-slate-450 opacity-30 mb-3 stroke-[1.5]" />
                <h5 className="text-xs font-bold text-on-surface">No Transactions Found</h5>
                <p className="text-[11px] text-slate-400 max-w-xs mt-1 font-medium">
                  {customerOrdersList.length === 0 
                    ? "This customer has no orders logged in the database yet." 
                    : "No matching transactions fit the current filter state."}
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Profile Image View Zoom (WhatsApp-style: no background dim/blur, square card with drop shadow) */}
      <AnimatePresence>
        {showImagePreview && customer.avatar && (
          <>
            {/* Transparent backdrop for dismissal */}
            <div
              className="absolute inset-0 z-30 cursor-zoom-out bg-black/0"
              onClick={() => setShowImagePreview(false)}
            />

            {/* Float Popover Card at the Center-Top of Customer Details */}
            <div className="absolute inset-x-0 top-10 z-40 pointer-events-none flex justify-center px-4 font-sans">
              <motion.div
                initial={{ scale: 0.85, y: -10, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.85, y: -10, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className={`w-72 sm:w-80 h-72 sm:h-80 rounded-2xl pointer-events-auto overflow-hidden relative shadow-[0_20px_60px_rgba(0,0,0,0.3)] border ${
                  darkMode ? "bg-zinc-900 border-white/10" : "bg-white border-slate-200"
                }`}
              >
                {/* Image filling the entire square profile popup */}
                <img
                  src={customer.avatar}
                  alt={customer.name || "Customer"}
                  className="w-full h-full object-cover select-none"
                  referrerPolicy="no-referrer"
                />

                {/* Top Overlay Bar containing Name & Close Button (WhatsApp style) */}
                <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between text-white">
                  <span className="font-bold text-sm tracking-wide line-clamp-1 truncate pr-2 select-none shadow-sm">
                    {customer.name || "Customer"}
                  </span>
                  <button
                    onClick={() => setShowImagePreview(false)}
                    className="p-1 px-2 text-white/90 hover:text-white bg-black/20 hover:bg-black/40 rounded-lg transition-colors focus:outline-none text-xs font-black uppercase tracking-wider"
                    aria-label="Close"
                  >
                    Close
                  </button>
                </div>

                {/* Subtitle/Email banner overlay at the bottom */}
                {customer.email && (
                  <div className="absolute bottom-0 inset-x-0 p-2 text-center bg-black/60 backdrop-blur-[2px]">
                    <span className="text-[10px] text-white/80 font-mono tracking-tight select-all">
                      {customer.email}
                    </span>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}


function UsersTab({
  users,
  orders = [],
  darkMode,
  updateUserPoints,
  globalSearch,
  handlePrint,
}: {
  users: any[];
  orders?: any[];
  darkMode: boolean;
  updateUserPoints: (uid: string, p: number) => Promise<void>;
  globalSearch?: string;
  handlePrint?: (order: Order, format: 'a4' | 'thermal' | 'pdf') => void;
}) {
  const [editingPointsId, setEditingPointsId] = React.useState<string | null>(null);
  const [newPointsVal, setNewPointsVal] = React.useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = React.useState<any | null>(null);


  const getPhoneGroupKey = (phone: string) => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("09")) {
      cleaned = "95" + cleaned.substring(1);
    } else if (cleaned.startsWith("01")) {
      cleaned = "60" + cleaned.substring(1);
    }
    return cleaned;
  };

  const groupedUsers = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    const noPhoneUsers: any[] = [];

    users.forEach((u) => {
      const key = u.phone ? getPhoneGroupKey(u.phone) : "";
      if (key) {
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(u);
      } else {
        noPhoneUsers.push(u);
      }
    });

    const consolidatedGroups = Object.keys(groups).map((key) => {
      const gUsers = groups[key];
      // Select the primary user: one with a non-anonymous name or simply the first one
      const primary = gUsers.find(u => u.name && u.name !== "Anonymous") || gUsers[0];
      const uids = gUsers.map(u => u.uid || u.id).filter(Boolean);
      const totalPoints = gUsers.reduce((sum, u) => sum + (Number(u.points) || 0), 0);
      
      const rooms = [...new Set(gUsers.map(u => u.room).filter(Boolean))];
      const combinedRoom = rooms.join(", ");
      
      const emails = [...new Set(gUsers.map(u => u.email).filter(Boolean))];
      const combinedEmail = emails.join(", ");

      const isBlocked = gUsers.some(u => u.isBlocked === true);
      const blockedUserWithMsg = gUsers.find(u => u.isBlocked && u.blockMessage);
      const blockMessage = blockedUserWithMsg ? blockedUserWithMsg.blockMessage : "";

      const tiers = gUsers.map(u => u.tier).filter(Boolean);
      let tier = undefined;
      if (tiers.includes("Gold")) tier = "Gold";
      else if (tiers.includes("Silver")) tier = "Silver";
      else if (tiers.includes("Bronze")) tier = "Bronze";

      const avatarUser = gUsers.find(u => u.avatar || u.photoURL || u.userAvatar);
      const resolvedAvatar = avatarUser ? (avatarUser.avatar || avatarUser.photoURL || avatarUser.userAvatar) : undefined;

      return {
        ...primary,
        id: primary.id || primary.uid,
        uid: primary.uid || primary.id,
        phone: primary.phone,
        uids,
        points: totalPoints,
        room: combinedRoom,
        email: combinedEmail,
        avatar: resolvedAvatar,
        isBlocked,
        blockMessage,
        tier,
        isGrouped: true,
        groupedCount: gUsers.length,
      };
    });

    return [
      ...consolidatedGroups,
      ...noPhoneUsers.map(u => ({
        ...u,
        uids: [u.uid || u.id].filter(Boolean),
        isGrouped: false,
        groupedCount: 1,
      }))
    ];
  }, [users]);

  const filteredUsers = React.useMemo(() => {
    const s = globalSearch?.toLowerCase() || "";
    return groupedUsers.filter((u) => {
      return (
        u.name?.toLowerCase().includes(s) ||
        u.phone?.toLowerCase().includes(s) ||
        u.room?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.id?.toLowerCase().includes(s)
      );
    });
  }, [groupedUsers, globalSearch]);

  if (selectedCustomer) {
    return (
      <CustomerDetailsView
        customer={selectedCustomer}
        orders={orders}
        darkMode={darkMode}
        onClose={() => setSelectedCustomer(null)}
        updateUserPoints={updateUserPoints}
        handlePrint={handlePrint}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            Customer Management
          </h2>
          <p className="text-sm opacity-40 font-bold uppercase tracking-widest">
            {filteredUsers.length} Total Customers {groupedUsers.length < users.length && `(${users.length - groupedUsers.length} duplicates merged)`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user, i) => {
          const userOrdersCount = orders.filter(o => 
            (o.uid && user.uids?.includes(o.uid)) || 
            (o.customerPhone && user.phone && getPhoneGroupKey(o.customerPhone) === getPhoneGroupKey(user.phone))
          ).length;

          return (
            <div
              key={user.uid || user.id || `user-${i}`}
              onClick={() => setSelectedCustomer(user)}
              className={`relative rounded-xl border overflow-hidden transition-all duration-300 flex flex-col h-[155px] w-full max-w-[320px] mx-auto justify-between cursor-pointer group scale-100 active:scale-[0.98] ${
                darkMode 
                  ? "bg-slate-900/60 border-slate-800/80 hover:bg-slate-900/90 hover:border-slate-700/80 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)]" 
                  : "bg-white border-slate-100 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-slate-200 hover:bg-slate-50/30"
              }`}
            >
              {/* Silhouette Watermark Icon */}
              <User className={`absolute -right-2 top-2 w-24 h-24 pointer-events-none transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${darkMode ? "text-slate-100 opacity-[0.025]" : "text-slate-800 opacity-[0.035]"}`} />

              {/* Card Header with Profile, Name and Tier (takes roughly 68% vertical space area) */}
              <div className="h-[68%] pt-3.5 pb-1.5 px-4 flex flex-col justify-between relative z-10 w-full">
                {/* Profile Details & Points Badge Row */}
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || "Customer"}
                        className={`w-9 h-9 shrink-0 rounded-full object-cover ring-2 transition-transform duration-300 group-hover:scale-105 ${
                          user.isBlocked 
                            ? "ring-rose-500/50" 
                            : user.tier === "Gold" 
                              ? "ring-amber-500/60" 
                              : user.tier === "Silver" 
                                ? "ring-slate-400/60" 
                                : "ring-primary/45"
                        }`}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold text-xs ring-2 ${
                          user.isBlocked 
                            ? "bg-rose-500/10 text-rose-500 ring-rose-500/30"
                            : user.tier === "Gold"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 ring-amber-500/30"
                              : user.tier === "Silver"
                                ? "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70 ring-slate-400/30"
                                : "bg-primary/10 text-primary ring-primary/20"
                        }`}
                      >
                        <User size={15} />
                      </div>
                    )}

                    <div className="min-w-0 mt-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className={`font-bold text-[13px] leading-none tracking-tight group-hover:text-primary transition-colors truncate max-w-[125px] sm:max-w-none ${
                          darkMode ? "text-slate-100" : "text-slate-800"
                        }`}>
                          {user.name || "Anonymous"}
                        </h3>
                        {user.isBlocked && (
                          <span className="px-1.5 py-0.2 rounded-full text-[7.5px] font-extrabold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/15">
                            Suspended
                          </span>
                        )}
                      </div>
                      
                      {/* Customer Subtitle / Contact */}
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-medium whitespace-nowrap">
                        {user.phone ? (
                          <span className="font-mono text-[9px]">{user.phone}</span>
                        ) : (
                          <span className="italic opacity-60 text-[9px]">No phone</span>
                        )}
                        {user.isGrouped && user.groupedCount > 1 && (
                          <>
                            <span className="opacity-45">•</span>
                            <span 
                              title={`${user.groupedCount} linked accounts`}
                              className="text-[8px] font-black text-emerald-500 dark:text-emerald-400/90"
                            >
                              {user.groupedCount} Linked
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Points Display Badge (Ultra-sleek & compact) */}
                  <div className={`shrink-0 px-2 py-0.5 rounded-full border flex items-center gap-0.5 transition-all whitespace-nowrap ${
                    user.tier === "Gold"
                      ? "bg-amber-500/5 border-amber-500/20 text-amber-500"
                      : user.tier === "Silver"
                        ? "bg-slate-400/5 border-slate-400/20 text-slate-400"
                        : "bg-primary/5 border-primary/10 text-primary"
                  }`}>
                    <Sparkles size={8.5} className={`stroke-[2.5] shrink-0 ${user.tier === "Gold" ? "animate-pulse" : ""}`} />
                    <span className="font-black text-[10.5px] leading-none">{user.points || 0}</span>
                    <span className="text-[6.5px] font-extrabold tracking-wider uppercase opacity-65">PTS</span>
                  </div>
                </div>

                {/* Joined Date (positioned right above the dashboard's dotted borderline) */}
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400/75 dark:text-slate-450 font-medium select-none ml-1">
                  <Calendar size={10} className="opacity-65 shrink-0" />
                  <span>Joined:</span>
                  <span className="font-semibold text-[8.5px]">
                    {user.createdAt ? (
                      typeof user.createdAt === 'string' 
                        ? (user.createdAt.includes('T') || user.createdAt.includes('-') 
                            ? new Date(user.createdAt).toLocaleDateString('en-MY', { timeZone: "Asia/Kuala_Lumpur", month: 'short', year: 'numeric' }) 
                            : user.createdAt) 
                        : new Date(user.createdAt).toLocaleDateString('en-MY', { timeZone: "Asia/Kuala_Lumpur", month: 'short', year: 'numeric' })
                    ) : 'New'}
                  </span>
                </div>
              </div>

              {/* Separator line (Perfect dashed border that doesn't reach the outer edges of the box) */}
              <div className="mx-4 border-t border-dashed border-slate-500/10 dark:border-slate-800/80 z-10 relative" />

              {/* Badges and Order Stats Panel (takes roughly 32% vertical space area) */}
              <div className="h-[32%] px-4 flex items-center justify-between z-10 relative">
                {/* Visual Stats */}
                <div className="flex items-center gap-1.5">
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
                    darkMode ? "bg-slate-800/80 text-slate-300" : "bg-slate-50 text-slate-600 border border-slate-100"
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <span>{userOrdersCount} {userOrdersCount === 1 ? 'Order' : 'Orders'}</span>
                  </div>

                  {user.tier && user.tier !== "Bronze" && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        user.tier === "Gold"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : "bg-slate-400/10 text-slate-400 border-slate-400/20"
                      }`}
                    >
                      ★ {user.tier}
                    </span>
                  )}
                </div>

                {/* Direct quick communication actions */}
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {user.phone && (
                    <a
                      href={`https://wa.me/${formatPhoneNumber(user.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        darkMode 
                          ? "hover:bg-emerald-500/20 text-emerald-400 bg-emerald-500/5 border border-emerald-500/10" 
                          : "hover:bg-emerald-50 text-emerald-600 bg-emerald-50 border border-emerald-100"
                      }`}
                      title="WhatsApp Chat"
                    >
                      <MessageCircle size={13} className="stroke-[2.5]" />
                    </a>
                  )}

                  {user.email && (
                    <a
                      href={`mailto:${user.email}`}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        darkMode 
                          ? "hover:bg-blue-500/20 text-blue-400 bg-blue-500/5 border border-blue-500/10" 
                          : "hover:bg-blue-50 text-blue-600 bg-blue-50 border border-blue-100"
                      }`}
                      title="Send Email"
                    >
                      <Mail size={13} className="stroke-[2.5]" />
                    </a>
                  )}

                  {/* Elegant "View More" Chevron appearing beautifully on group hover */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center border border-transparent transition-all group-hover:border-primary/20 group-hover:bg-primary/5 text-slate-400 group-hover:text-primary ${
                    darkMode ? "bg-slate-800/30" : "bg-slate-50/50"
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-0.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function _DeprecatedNotificationsTab({
  sendBroadcast,
  broadcastNotifications,
  orders,
  darkMode,
  globalSearch,
}: {
  sendBroadcast: any;
  broadcastNotifications: any[];
  orders: any[];
  darkMode: boolean;
  globalSearch?: string;
}) {
  const allHistory = [
    ...broadcastNotifications.map(n => ({...n, type: 'broadcast', date: n.createdAt?.seconds * 1000})),
    ...orders.map(o => ({
      id: o.id,
      title: `New Order: #${o.orderNumber}`,
      message: `Order for ${o.customerName} - ${o.items.length} items`,
      type: 'order',
      date: o.createdAt?.seconds * 1000
    }))
  ].sort((a, b) => b.date - a.date);

  const filteredHistory = allHistory.filter((n) => {
    const s = globalSearch?.toLowerCase() || "";
    return (
      n.title?.toLowerCase().includes(s) || n.message?.toLowerCase().includes(s)
    );
  });

  const [isSending, setIsSending] = useState(false);
  const [payload, setPayload] = useState({
    title: "",
    message: "",
    type: "promotion" as "promotion" | "system" | "update",
    image: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendBroadcast(payload);
    setIsSending(false);
    setPayload({ title: "", message: "", type: "promotion", image: "" });
    toast.success("Broadcast sent successfully");
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this broadcast?")) {
      try {
        await deleteDoc(doc(db, "broadcastNotifications", id));
        toast.success("Broadcast deleted successfully");
      } catch (error) {
        console.error("Error deleting broadcast:", error);
        toast.error("Failed to delete broadcast");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            Broadcast Notifications
          </h2>
          <p className="text-sm opacity-40 font-bold uppercase tracking-widest">
            Send messages to all customers
          </p>
        </div>
        <button
          onClick={() => setIsSending(true)}
          className={`px-6 py-3 rounded-none font-bold text-sm flex items-center gap-2 transition-all ${
            darkMode
              ? "bg-primary text-surface"
              : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200"
          }`}
        >
          <Bell size={18} />
          New Broadcast
        </button>
      </div>

      <div className="space-y-4">
        {filteredHistory.map((notif) => (
          <div
            key={notif.id}
            className={`p-6 rounded-[2rem] border flex gap-6 ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-100 shadow-sm"}`}
          >
            <div
              className={`w-12 h-12 rounded-none flex items-center justify-center shrink-0 ${
                notif.type === "promotion"
                  ? "bg-emerald-100 text-emerald-600"
                  : notif.type === "update"
                    ? "bg-blue-100 text-blue-600"
                    : notif.type === "order"
                      ? "bg-purple-100 text-purple-600"
                      : "bg-amber-100 text-amber-600"
              }`}
            >
              <Bell size={24} />
            </div>
            <div className="flex-grow">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-black text-lg">{notif.title}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">
                    {new Date(notif.date).toLocaleDateString()}
                  </span>
                  <button 
                    onClick={() => handleDeleteBroadcast(notif.id)}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950/30 text-rose-500 rounded-full transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm opacity-60 font-medium leading-relaxed">
                {notif.message}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                    notif.type === "promotion"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {notif.type}
                </span>
              </div>
            </div>
          </div>
        ))}
        {filteredHistory.length === 0 && (
          <div className="p-12 text-center opacity-40 italic">No notifications or order history found.</div>
        )}
      </div>

      <AnimatePresence>
        {isSending && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-md p-8 rounded-[2.5rem] ${darkMode ? "bg-surface-container-high text-on-surface" : "bg-white text-gray-900"}`}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black tracking-tight">
                  Send Broadcast
                </h3>
                <button
                  onClick={() => setIsSending(false)}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-2">
                    Title
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="New Promotion!"
                    value={payload.title}
                    onChange={(e) =>
                      setPayload({ ...payload, title: e.target.value })
                    }
                    className={`w-full px-6 py-3 rounded-none border font-bold outline-none focus:border-primary transition-all ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-2">
                    Message
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Get 20% off on all items today..."
                    value={payload.message}
                    onChange={(e) =>
                      setPayload({ ...payload, message: e.target.value })
                    }
                    className={`w-full px-6 py-3 rounded-none border font-bold outline-none focus:border-primary transition-all resize-none ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 ml-2">
                    Type
                  </label>
                  <select
                    value={payload.type}
                    onChange={(e) =>
                      setPayload({ ...payload, type: e.target.value as any })
                    }
                    className={`w-full px-6 py-3 rounded-none border font-bold outline-none focus:border-primary transition-all ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"}`}
                  >
                    <option value="promotion">Promotion</option>
                    <option value="system">System Alert</option>
                    <option value="update">App Update</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className={`w-full py-4 rounded-none font-black text-sm transition-all mt-4 ${
                    darkMode
                      ? "bg-primary text-surface"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  Send to All Users
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AuditLogsTab({
  auditLogs,
  darkMode,
  globalSearch,
}: {
  auditLogs: any[];
  darkMode: boolean;
  globalSearch?: string;
}) {
  const filteredLogs = auditLogs.filter((log) => {
    const s = globalSearch?.toLowerCase() || "";
    return (
      log.adminName?.toLowerCase().includes(s) ||
      log.action?.toLowerCase().includes(s) ||
      log.target?.toLowerCase().includes(s) ||
      log.details?.toLowerCase().includes(s)
    );
  });

  const getActionStyles = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("delete") || act.includes("remove"))
      return {
        bg: darkMode ? "bg-red-500/10" : "bg-red-50",
        text: "text-red-500",
        border: darkMode ? "border-red-500/20" : "border-red-100",
      };
    if (act.includes("add") || act.includes("create"))
      return {
        bg: darkMode ? "bg-emerald-500/10" : "bg-emerald-50",
        text: "text-emerald-500",
        border: darkMode ? "border-emerald-500/20" : "border-emerald-100",
      };
    if (act.includes("update") || act.includes("edit"))
      return {
        bg: darkMode ? "bg-amber-500/10" : "bg-amber-50",
        text: "text-amber-500",
        border: darkMode ? "border-amber-500/20" : "border-amber-100",
      };
    return {
      bg: darkMode ? "bg-blue-500/10" : "bg-blue-50",
      text: "text-blue-500",
      border: darkMode ? "border-blue-500/20" : "border-blue-100",
    };
  };

  const formatTime = (createdAt: any) => {
    if (!createdAt) return "Just now";
    let date: Date;
    if (createdAt.seconds) {
      date = new Date(createdAt.seconds * 1000);
    } else if (createdAt instanceof Date) {
      date = createdAt;
    } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
      date = new Date(createdAt);
    } else {
      return "Just now";
    }
    return date.toLocaleTimeString("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur", month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Audit Logs</h2>
          <p className="text-sm opacity-40 font-bold uppercase tracking-widest">
            {filteredLogs.length} Actions Tracked
          </p>
        </div>
      </div>

      <div className={`overflow-x-auto border ${darkMode ? "border-white/10" : "border-on-surface/5 shadow-sm"}`}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={darkMode ? "bg-white/5" : "bg-gray-50"}>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Action</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Target</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Details</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Admin</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-on-surface/5">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const styles = getActionStyles(log.action);
                return (
                  <tr key={log.id} className="group hover:bg-on-surface/5 transition-colors">
                    <td className="p-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${styles.bg} ${styles.text} ${styles.border}`}>
                        {log.action.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-bold text-on-surface">{log.target}</td>
                    <td className="p-4 text-[11px] text-on-surface-variant leading-relaxed max-w-xs">{log.details || "No details"}</td>
                    <td className="p-4 text-xs font-bold text-on-surface-variant">{log.adminName}</td>
                    <td className="p-4 text-[10px] font-bold text-on-surface-variant text-right">{formatTime(log.createdAt)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-12 text-center opacity-40">No logs found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RidersTab({
  createNewRider,
  removeRider,
  darkMode,
  globalSearch,
}: {
  createNewRider: (email: string, password: string, name: string) => Promise<void>;
  removeRider: (uid: string) => Promise<void>;
  darkMode: boolean;
  globalSearch?: string;
}) {
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    const fetchRiders = async () => {
      try {
        const snap = await getDocs(collection(db, 'riders'));
        setRiders(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Riders fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRiders();
  }, []);

  const filteredRiders = riders.filter((rider) => {
    const s = globalSearch?.toLowerCase() || "";
    return (
      rider.name?.toLowerCase().includes(s) ||
      rider.email?.toLowerCase().includes(s) ||
      rider.uid.toLowerCase().includes(s)
    );
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await createNewRider(formData.email, formData.password, formData.name);
      setIsAdding(false);
      setFormData({ name: '', email: '', password: '' });
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Rider Management</h2>
          <p className="text-sm opacity-40 font-bold uppercase tracking-widest">
            {riders.length} Registered Riders
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all active:scale-95 ${
            darkMode
              ? "bg-primary text-surface"
              : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200"
          }`}
        >
          <Plus size={18} />
          Add Rider
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading ? (
           <div className="py-20 text-center animate-pulse opacity-40">Loading riders...</div>
        ) : filteredRiders.length > 0 ? (
          filteredRiders.map((rider) => (
            <div
              key={rider.uid}
              className={`group p-4 rounded-3xl border transition-all duration-300 hover:scale-[1.01] ${
                darkMode
                  ? "bg-white/5 border-white/10 hover:bg-white/[0.07]"
                  : "bg-white border-on-surface/5 hover:border-primary/20 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${darkMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-emerald-50 border-emerald-100 text-emerald-600"}`}>
                    <Truck size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-black text-sm text-on-surface truncate">
                        {rider.name || "Delivery Rider"}
                      </h4>
                      <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${
                        rider.isOnline 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                          : "bg-gray-500/10 border-gray-500/20 text-gray-500"
                      }`}>
                        {rider.isOnline ? "Online" : "Offline"}
                      </div>
                      {rider.isApproved === false && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20">
                          Suspended
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 opacity-40">
                        <Mail size={10} />
                        <p className="text-[10px] font-bold truncate max-w-[200px]">{rider.email}</p>
                      </div>
                      {rider.lastActive && (
                        <div className="flex items-center gap-1.5 opacity-40">
                          <Clock size={10} />
                          <p className="text-[10px] font-bold">
                            {new Date(rider.lastActive?.seconds * 1000).toLocaleTimeString("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeRider(rider.uid)}
                  className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                  title="Remove Rider"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={`p-12 rounded-[2.5rem] border border-dashed flex flex-col items-center justify-center text-center space-y-3 ${
            darkMode ? "border-white/10" : "border-gray-200"
          }`}>
            <div className="w-16 h-16 rounded-full bg-on-surface/5 flex items-center justify-center">
              <Truck size={32} className="opacity-20" />
            </div>
            <div>
              <p className="font-black text-lg">No riders found</p>
              <p className="text-sm opacity-40">Add delivery accounts for your portal</p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-md p-6 md:p-8 rounded-[2.5rem] border ${darkMode ? "bg-surface-container-high border-white/10" : "bg-white border-gray-100 shadow-2xl"}`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${darkMode ? "bg-primary/10 text-primary" : "bg-primary/5 text-primary"}`}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">New Delivery Account</h3>
                    <p className="text-[10px] font-bold opacity-40 uppercase">Create rider credentials</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdding(false)}
                  className="w-10 h-10 rounded-full bg-on-surface/5 flex items-center justify-center hover:bg-on-surface/10"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-bold outline-none focus:border-primary ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"}`}
                    placeholder="Enter name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Email</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-bold outline-none focus:border-primary ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"}`}
                    placeholder="rider@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Password</label>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData(f => ({ ...f, password: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-2xl border text-xs font-bold outline-none focus:border-primary ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"}`}
                    placeholder="At least 6 chars"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                  } ${darkMode ? "bg-primary text-surface" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-500/20"}`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Delivery Account"
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminsTab({
  admins,
  addAdmin,
  createNewAdmin,
  updateAdminRole,
  removeAdmin,
  darkMode,
  globalSearch,
}: {
  admins: any[];
  addAdmin: any;
  createNewAdmin: any;
  updateAdminRole: any;
  removeAdmin: any;
  darkMode: boolean;
  globalSearch?: string;
}) {
  const { currentAdmin } = useStore();

  const filteredAdmins = admins.filter((admin) => {
    const s = globalSearch?.toLowerCase() || "";
    return (
      admin.name?.toLowerCase().includes(s) ||
      admin.email?.toLowerCase().includes(s)
    );
  });

  const [isAdding, setIsAdding] = useState(false);
  const [addMode, setAddMode] = useState<"create" | "uid">("create");
  const [newAdmin, setNewAdmin] = useState({
    uid: "",
    email: "",
    password: "",
    name: "",
    role: "staff" as "superadmin" | "staff",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addMode === "create") {
      if (newAdmin.password.length < 6) {
        toast.error("Password must be at least 6 characters.");
        return;
      }
      await createNewAdmin(
        newAdmin.email,
        newAdmin.password,
        newAdmin.name,
        newAdmin.role,
      );
    } else {
      if (!newAdmin.uid.trim()) {
        toast.error("Firebase UID is required.");
        return;
      }
      await addAdmin({
        uid: newAdmin.uid,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
      });
    }
    setIsAdding(false);
    setNewAdmin({ uid: "", email: "", password: "", name: "", role: "staff" });
  };

  const getRoleStyles = (role: string) => {
    if (role === "superadmin")
      return {
        bg: darkMode ? "bg-purple-500/10" : "bg-purple-50",
        text: "text-purple-500",
        border: darkMode ? "border-purple-500/20" : "border-purple-100",
      };
    return {
      bg: darkMode ? "bg-blue-500/10" : "bg-blue-50",
      text: "text-blue-500",
      border: darkMode ? "border-blue-500/20" : "border-blue-100",
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">
            Admin Management
          </h2>
          <p className="text-sm opacity-40 font-bold uppercase tracking-widest">
            {admins.length} Total Admins
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all active:scale-95 ${
            darkMode
              ? "bg-primary text-surface"
              : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200"
          }`}
        >
          <Plus size={18} />
          Add Admin
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredAdmins.length > 0 ? (
          filteredAdmins.map((admin) => {
            const roleStyles = getRoleStyles(admin.role);
            const isMe = admin.uid === currentAdmin?.uid;
            return (
              <div
                key={admin.uid}
                className={`group p-4 rounded-xl border transition-all duration-300 hover:scale-[1.01] ${
                  darkMode
                    ? "bg-white/5 border-white/10 hover:bg-white/[0.07]"
                    : "bg-white border-on-surface/5 hover:border-primary/20 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${roleStyles.bg} ${roleStyles.border}`}>
                      <ShieldCheck size={18} className={roleStyles.text} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-black text-sm text-on-surface truncate">
                          {admin.name || "Admin User"}
                          {isMe && <span className="ml-1.5 opacity-40 font-bold text-[9px] uppercase tracking-wider">(You)</span>}
                        </h4>
                        
                        <div className="relative inline-flex items-center">
                          <select
                            value={admin.role}
                            onChange={(e) => updateAdminRole(admin.uid, e.target.value as any)}
                            disabled={isMe}
                            className={`pl-2 pr-5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border appearance-none outline-none cursor-pointer transition-all focus:ring-1 focus:ring-primary ${roleStyles.bg} ${roleStyles.text} ${roleStyles.border} ${isMe ? 'opacity-80 cursor-not-allowed' : 'hover:scale-[1.03] active:scale-[0.97]'}`}
                          >
                            <option value="staff">Staff</option>
                            <option value="superadmin">Super Admin</option>
                          </select>
                          {!isMe && (
                            <ChevronDown size={8} className={`absolute right-1.5 pointer-events-none ${roleStyles.text}`} />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 opacity-40">
                          <Mail size={10} />
                          <p className="text-[10px] font-bold truncate max-w-[200px]">{admin.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-20">
                          <span className="text-[10px] font-mono">{admin.uid.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {!isMe && (
                    <button
                      onClick={() => removeAdmin(admin.uid)}
                      className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                      title="Remove Admin"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className={`p-12 rounded-xl border border-dashed flex flex-col items-center justify-center text-center space-y-3 ${
            darkMode ? "border-white/10" : "border-gray-200"
          }`}>
            <div className="w-16 h-16 rounded-full bg-on-surface/5 flex items-center justify-center">
              <ShieldCheck size={32} className="opacity-20" />
            </div>
            <div>
              <p className="font-black text-lg">No admins found</p>
              <p className="text-sm opacity-40 text-on-surface-variant">Try adjusting your search query</p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-2xl p-6 md:p-8 rounded-2xl border ${darkMode ? "bg-surface-container-high border-white/10" : "bg-white border-gray-100 shadow-2xl"}`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? "bg-primary/10 text-primary" : "bg-primary/5 text-primary"}`}>
                    <Plus size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight leading-none">Add New Admin</h3>
                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1 italic">Configure administrator access</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdding(false)}
                  className="w-10 h-10 rounded-full bg-on-surface/5 flex items-center justify-center hover:bg-on-surface/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
                {/* Mode Selection Sidebar */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setAddMode("create")}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        addMode === "create"
                          ? "bg-primary text-surface border-primary shadow-lg shadow-primary/20"
                          : "bg-on-surface/5 border-transparent text-on-surface/60 hover:bg-on-surface/10"
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">New Account</p>
                      <p className="text-[9px] font-medium opacity-60 leading-tight">Create a fresh admin login</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode("uid")}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        addMode === "uid"
                          ? "bg-primary text-surface border-primary shadow-lg shadow-primary/20"
                          : "bg-on-surface/5 border-transparent text-on-surface/60 hover:bg-on-surface/10"
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Existing UID</p>
                      <p className="text-[9px] font-medium opacity-60 leading-tight">Promote an existing customer</p>
                    </button>
                  </div>

                  <div className={`p-3 rounded-xl border border-dashed ${darkMode ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"}`}>
                    <p className="text-[9px] font-bold opacity-40 leading-relaxed italic">
                      {addMode === "create" 
                        ? "Admin will receive their credentials via the email provided." 
                        : "You need the specific Firebase UID from the user's profile."}
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addMode === "uid" ? (
                      <div className="space-y-1 sm:col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-2 italic">
                          Firebase UID
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="Paste User UID here..."
                          value={newAdmin.uid}
                          onChange={(e) =>
                            setNewAdmin({ ...newAdmin, uid: e.target.value })
                          }
                          className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none focus:border-primary transition-all ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-on-surface/5"}`}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1 sm:col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-2 italic">
                          Full Name
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Mg Mg"
                          value={newAdmin.name}
                          onChange={(e) =>
                            setNewAdmin({ ...newAdmin, name: e.target.value })
                          }
                          className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none focus:border-primary transition-all ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-on-surface/5"}`}
                        />
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-2 italic">
                        Email Address
                      </label>
                      <input
                        required
                        type="email"
                        placeholder="admin@example.com"
                        value={newAdmin.email}
                        onChange={(e) =>
                          setNewAdmin({ ...newAdmin, email: e.target.value })
                        }
                        className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none focus:border-primary transition-all ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-on-surface/5"}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-2 italic">
                        {addMode === "create" ? "Initial Password" : "Role"}
                      </label>
                      {addMode === "create" ? (
                        <input
                          required
                          type="password"
                          placeholder="Min. 6 chars"
                          value={newAdmin.password}
                          onChange={(e) =>
                            setNewAdmin({ ...newAdmin, password: e.target.value })
                          }
                          className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none focus:border-primary transition-all ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-on-surface/5"}`}
                        />
                      ) : (
                        <div className="relative">
                          <select
                            value={newAdmin.role}
                            onChange={(e) =>
                              setNewAdmin({ ...newAdmin, role: e.target.value as any })
                            }
                            className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none focus:border-primary transition-all appearance-none cursor-pointer ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-on-surface/5"}`}
                          >
                            <option value="staff">Staff Member</option>
                            <option value="superadmin">Super Admin</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                            <ShieldCheck size={14} />
                          </div>
                        </div>
                      )}
                    </div>

                    {addMode === "create" && (
                      <div className="space-y-1 sm:col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-2 italic">
                          Permission Level
                        </label>
                        <div className="relative">
                          <select
                            value={newAdmin.role}
                            onChange={(e) =>
                              setNewAdmin({ ...newAdmin, role: e.target.value as any })
                            }
                            className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none focus:border-primary transition-all appearance-none cursor-pointer ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-on-surface/5"}`}
                          >
                            <option value="staff">Staff Member</option>
                            <option value="superadmin">Super Admin</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                            <ShieldCheck size={14} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="submit"
                    className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      darkMode
                        ? "bg-primary text-surface shadow-lg shadow-primary/20"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-600/20"
                    }`}
                  >
                    Confirm & Grant Access
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const {
    adminOrders: orders,
    updateOrderStatus,
    updateDeliveryStatus,
    supportNumber,
    setSupportNumber,
    bankName,
    setBankName,
    bankAccountNumber,
    setBankAccountNumber,
    bankAccountName,
    setBankAccountName,
    currency,
    setCurrency,
    formatPrice,
    darkMode,
    setDarkMode,
    t,
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
    isBankEnabled,
    setIsBankEnabled,
    estimatedDeliveryTime,
    setEstimatedDeliveryTime,
    signInWithGoogle,
    authUid,
    userEmail,
    users,
    updateUserPoints,
    auditLogs,
    logAudit,
    broadcastNotifications,
    sendBroadcast,
    sendTargetedNotification,
    admins,
    currentAdmin,
    addAdmin,
    createNewAdmin,
    updateAdminRole,
    updateAdminProfile,
    removeAdmin,
    createNewRider,
    removeRider,
    isAdmin,
    isAuthLoading,
    isAdminPanelActive,
    setIsAdminPanelActive,
    categories,
    updateCategory,
    addCategory,
    deleteCategory,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    isQuotaExceeded,
    resetQuotaExceeded,
    getCategoryName,
    getMainName,
    getSecondaryName,
    refreshAllData,
    shopPhone,
    setShopPhone,
    shopEmail,
    setShopEmail,
    language,
    settings,
    logout,
  } = useStore();

  // All Customers for notification targeting
  const allCustomers = useMemo(() => {
    const customers: Record<string, { name: string; uid: string }> = {};
    orders.forEach((order) => {
      if (order.uid && !customers[order.uid]) {
        customers[order.uid] = { name: order.customerName, uid: order.uid };
      }
    });
    return Object.values(customers);
  }, [orders]);

  const handleDownloadPDF = (order: Order) => {
    try {
      if (!order || !order.items) return;
      toast.info("Generating PDF Invoice...", { icon: "📄" });

      const doc = new jsPDF();
      const invoiceDate = parseOrderDate(order.createdAt, order.timestamp).toLocaleDateString(
        "en-MY",
        {
          timeZone: "Asia/Kuala_Lumpur",
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      );
      const itemsSubtotal = order.items.reduce(
        (acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 1),
        0,
      );
      const docTotal = Number(order.total) || Number(order.totalAmount) || (itemsSubtotal + (Number(order.deliveryFee) || 0) - (Number(order.pointDiscount) || 0));

      // --- NEW PROFESSIONAL DESIGN ---

      // Background Accents
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 45, "F");

      // Header Section
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text("SAR TAW SET", 20, 28);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("PREMIUM QUALITY CATERING", 20, 35);

      // Invoice Details (Top Right Area)
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", 190, 28, { align: "right" });
      
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text(`#${order.id.toUpperCase().slice(0, 8)}`, 190, 35, { align: "right" });

      // Info Grid
      let currentY = 60;
      
      // Customer Info
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("BILL TO", 20, currentY);
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(order.customerName, 20, currentY + 8);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(order.customerPhone, 20, currentY + 14);
      
      if (order.address || order.roomNumber) {
        const addr = `${order.roomNumber ? order.roomNumber + ", " : ""}${order.address || ""}`;
        const splitAddr = doc.splitTextToSize(addr, 80);
        doc.text(splitAddr, 20, currentY + 20);
      }

      // Order Info (Right Side)
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("ORDER DETAILS", 120, currentY);
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${invoiceDate}`, 120, currentY + 8);
      doc.text(`Method: ${order.paymentMethod.toUpperCase()}`, 120, currentY + 14);
      doc.text(`Status: ${order.status.toUpperCase()}`, 120, currentY + 20);

      // Items Table
      const itemsData = order.items.map((item, index) => [
        String(index + 1).padStart(2, '0'),
        item.name,
        formatPrice(item.price),
        item.quantity.toString(),
        formatPrice(item.price * item.quantity),
      ]);

      autoTable(doc, {
        startY: 100,
        head: [["#", "Description", "Unit Price", "Qty", "Total"]],
        body: itemsData,
        theme: "striped",
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: "bold",
          cellPadding: 5,
        },
        bodyStyles: {
          fontSize: 10,
          textColor: [51, 65, 85],
          cellPadding: 4,
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 15 },
          2: { halign: "right", cellWidth: 35 },
          3: { halign: "center", cellWidth: 20 },
          4: { halign: "right", cellWidth: 40 },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      // Totals
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      const totalsX = 130;
      const amountX = 190;

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("Subtotal", totalsX, finalY);
      doc.setTextColor(15, 23, 42);
      doc.text(formatPrice(itemsSubtotal), amountX, finalY, { align: "right" });

      let nextY = finalY + 8;
      if (order.deliveryFee > 0) {
        doc.setTextColor(100, 116, 139);
        doc.text("Delivery Fee", totalsX, nextY);
        doc.setTextColor(15, 23, 42);
        doc.text(`+${formatPrice(order.deliveryFee)}`, amountX, nextY, {
          align: "right",
        });
        nextY += 8;
      }

      if (order.pointDiscount > 0) {
        doc.setTextColor(239, 68, 68);
        doc.text("Discount", totalsX, nextY);
        doc.text(`-${formatPrice(order.pointDiscount)}`, amountX, nextY, {
          align: "right",
        });
        nextY += 8;
      }

      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(totalsX - 5, nextY, 190, nextY);
      nextY += 12;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("TOTAL DUE", totalsX, nextY);
      doc.text(formatPrice(docTotal), amountX, nextY, { align: "right" });

      // Signature Area
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.5);
      doc.line(20, pageHeight - 50, 80, pageHeight - 50);
      doc.line(130, pageHeight - 50, 190, pageHeight - 50);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("AUTHORIZED SIGNATORY", 50, pageHeight - 45, { align: "center" });
      doc.text("CUSTOMER SIGNATURE", 160, pageHeight - 45, { align: "center" });

      // Footer
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(
        "Thank you for choosing Sar Taw Set. This is a computer-generated invoice.",
        105,
        pageHeight - 25,
        { align: "center" },
      );
      doc.text(
        `Support: ${shopPhone} | Email: ${shopEmail} | Web: sartawset.com`,
        105,
        pageHeight - 18,
        { align: "center" },
      );

      doc.save(`Invoice_#${order.id.slice(0, 8)}.pdf`);
      toast.success("PDF Downloaded!");
    } catch (err) {
      console.error("PDF Export error:", err);
      toast.error("Failed to generate PDF.");
    }
  };

  const handlePrintOrder = (order: Order, format: "a4" | "thermal" | "pdf") => {
    if (format === "pdf") {
      handleDownloadPDF(order);
      return;
    }
    try {
      toast.info(`Preparing ${format === "a4" ? "Invoice" : "Receipt"}...`, {
        icon: "🖨️",
      });

      if (!order || !order.items) {
        toast.error("Order data is missing.");
        return;
      }

      const itemsSubtotal = order.items.reduce(
        (acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 1),
        0,
      );
      const printTotal = Number(order.total) || Number(order.totalAmount) || (itemsSubtotal + (Number(order.deliveryFee) || 0) - (Number(order.pointDiscount) || 0));

      const invoiceDate = parseOrderDate(order.createdAt, order.timestamp).toLocaleDateString(
        "en-MY",
        { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "long", day: "numeric" },
      );

      let styles = "";
      let content = "";

      if (format === "thermal") {
        styles = `
          @page { size: 58mm auto; margin: 0; }
          body { 
            background: #fff; 
            color: #000000 !important;
            margin: 0; 
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            width: 58mm;
            box-sizing: border-box;
            line-height: 1.1;
            font-size: 14.5px;
            font-weight: 800;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            text-rendering: optimizeLegibility;
          }
          .thermal-receipt {
            width: 52mm;
            margin: 0 auto;
            padding: 4mm 0;
          }
          * { color: #000000 !important; -webkit-print-color-adjust: exact; }
          .thermal-header { text-align: center; margin-bottom: 8px; border-bottom: 2.5px solid #000; padding-bottom: 6px; }
          .thermal-header h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 0.5px; }
          .thermal-header p { margin: 1px 0; font-size: 13px; font-weight: 800; }
          
          .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 12.5px; font-weight: 800; }
          .info-val { font-weight: 900; }
          
          table { width: 100%; border-collapse: collapse; margin: 6px 0; }
          .line-sep { border-top: 1.5px dashed #000; margin: 6px 0; }
          .double-line { border-top: 2.5px solid #000; margin: 6px 0; }
          
          .item-row td { padding: 4px 0; vertical-align: top; }
          .item-name { font-weight: 900; font-size: 15px; margin-bottom: 1px; }
          .item-details { font-size: 12.5px; font-weight: 800; }
          .item-price { text-align: right; font-weight: 900; font-size: 15px; }

          .total-section { margin-top: 6px; }
          .total-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 15px; font-weight: 800; }
          .grand-total-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 6px 0; 
            font-size: 22px; 
            border-top: 2.5px solid #000; 
            border-bottom: 2.5px solid #000;
            margin: 4px 0;
            font-weight: 1000;
          }
          
          .footer { text-align: center; margin-top: 12px; font-size: 12.5px; padding-top: 8px; border-top: 1.5px dashed #000; line-height: 1.4; font-weight: 800; }
        `;

        content = `
          <div class="thermal-receipt">
            <div class="thermal-header">
              <h1>SAR TAW SET</h1>
              <p>Grocery & Meats Delivery</p>
              <p>TEL: ${shopPhone || "09 123 456 789"}</p>
            </div>
            
            <div class="info-section">
              <div class="info-row"><span>Receipt No:</span><span class="info-val">#${order.id.slice(-8).toUpperCase()}</span></div>
              <div class="info-row"><span>Date:</span><span class="info-val">${parseOrderDate(order.createdAt, order.timestamp).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })} ${parseOrderDate(order.createdAt, order.timestamp).toLocaleTimeString("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour: '2-digit', minute: '2-digit' })}</span></div>
              <div class="info-row"><span>Cashier:</span><span class="info-val">${currentAdmin?.name || settings.cashierName || 'Yenge'}</span></div>
              <div class="line-sep"></div>
              <div class="info-row"><span>Customer:</span><span class="info-val">${order.customerName}</span></div>
              <div class="info-row"><span>Phone:</span><span class="info-val">${order.customerPhone}</span></div>
            </div>
            
            <div class="double-line"></div>
            
            <table>
              <thead>
                <tr style="border-bottom: 1px solid #000; font-size: 11.5px;">
                  <th style="text-align: left; padding-bottom: 4px;">ITEM</th>
                  <th style="text-align: right; padding-bottom: 4px;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${order.items
                  .map(
                    (item) => `
                  <tr class="item-row">
                    <td>
                      <div class="item-name">${item.name}</div>
                      <div class="item-details">${item.quantity} x ${formatPrice(item.price)}</div>
                    </td>
                    <td class="item-price">${formatPrice(item.price * item.quantity)}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
            
            <div class="double-line"></div>
            
            <div class="total-section">
              <div class="total-row"><span>Subtotal</span><span>${formatPrice(itemsSubtotal)}</span></div>
              ${order.deliveryFee > 0 ? `<div class="total-row"><span>Delivery Fee</span><span>+${formatPrice(order.deliveryFee)}</span></div>` : ""}
              ${order.pointDiscount > 0 ? `<div class="total-row"><span>Discount</span><span>-${formatPrice(order.pointDiscount)}</span></div>` : ""}
              
              <div class="grand-total-row">
                <span>TOTAL</span>
                <span>${formatPrice(printTotal)}</span>
              </div>
              
              <div class="info-row" style="margin-top: 4px;"><span>Payment Method:</span><span class="info-val">${order.paymentMethod.toUpperCase()}</span></div>
            </div>
            
            <div class="footer">
              <p style="margin-top: 4px; font-weight: 900;">THANK YOU FOR YOUR PATRONAGE!</p>
              <p>Please come again</p>
            </div>
          </div>
        `;
      } else if (format === "a4") {
        const itemsHtml = order.items
          .map(
            (item, index) => `
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px 5px; text-align: center; font-size: 13px;">${index + 1}</td>
            <td style="padding: 10px 10px; text-align: left;">
              <div style="font-weight: 700; font-size: 14px;">${item.name}</div>
              <div style="font-size: 11px; color: #555;">${item.mmName || ""}</div>
            </td>
            <td style="padding: 10px 10px; text-align: right; font-family: monospace; font-size: 13px;">${formatPrice(item.price)}</td>
            <td style="padding: 10px 5px; text-align: center; font-weight: 700; font-size: 13px;">${item.quantity}</td>
            <td style="padding: 10px 10px; text-align: right; font-weight: 900; font-family: monospace; font-size: 14px;">${formatPrice(item.price * item.quantity)}</td>
          </tr>
        `,
          )
          .join("");

        styles = `
          @page { size: A4; margin: 15mm; }
          body { font-family: sans-serif; background: #fff; margin: 0; padding: 20px; color: #000; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-main { width: 100%; max-width: 180mm; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          .items-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 20px; }
          .items-table th { padding: 10px; font-size: 12px; font-weight: 900; text-transform: uppercase; border-top: 1px solid #000; border-bottom: 1px solid #000; text-align: center; }
          .grand-total { border-top: 2px solid #000; margin-top: 20px; padding-top: 15px; font-size: 20px; font-weight: 900; display: flex; justify-content: space-between; }
        `;

        content = `
          <div class="invoice-main">
            <div class="header">
              <div><h1 style="margin:0; font-size:32px;">SAR TAW SET</h1><p style="margin:5px 0;">Official Tax Invoice</p></div>
              <div style="text-align: right;">
                <p style="margin:0; font-size:18px; font-weight:900;">ID: #${order.id.slice(0, 8).toUpperCase()}</p>
                <p style="margin:5px 0; color:#666;">Date: ${invoiceDate}</p>
              </div>
            </div>

            <div style="margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
               <div>
                  <h3 style="font-size:10px; text-transform:uppercase; color:#888; border-bottom:1px solid #ddd; margin-bottom:8px;">Customer</h3>
                  <p style="font-weight:900; margin:0;">${order.customerName}</p>
                  <p style="margin:4px 0; font-size:13px; color:#555;">${order.customerPhone}</p>
                  <p style="margin:4px 0; font-size:13px; color:#555;">${order.address || "N/A"}</p>
               </div>
               <div style="text-align:right;">
                  <h3 style="font-size:10px; text-transform:uppercase; color:#888; border-bottom:1px solid #ddd; margin-bottom:8px; display:inline-block; width:100%;">Order Summary</h3>
                  <p style="margin:4px 0; font-size:13px;">Payment: <b>${order.paymentMethod.toUpperCase()}</b></p>
                  <p style="margin:4px 0; font-size:13px;">Schedule: <b>${order.deliveryDay}</b></p>
               </div>
            </div>

            <table class="items-table">
              <thead><tr><th style="width: 40px;">#</th><th style="text-align: left;">Item Description</th><th style="width: 120px;">Price</th><th style="width: 60px;">Qty</th><th style="width: 140px;">Total</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px; display: flex; flex-direction: column; align-items: flex-end;">
                <div style="width: 250px;">
                   <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>Subtotal:</span><span>${formatPrice(itemsSubtotal)}</span></div>
                   ${order.deliveryFee > 0 ? `<div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>Delivery Fee:</span><span>+${formatPrice(order.deliveryFee)}</span></div>` : ""}
                   ${order.pointDiscount > 0 ? `<div style="display:flex; justify-content:space-between; margin-bottom:5px; color:red;"><span>Points Discount:</span><span>-${formatPrice(order.pointDiscount)}</span></div>` : ""}
                   <div class="grand-total">
                      <span>Total:</span>
                      <span>${formatPrice(printTotal)}</span>
                   </div>
                </div>
            </div>

            <div class="footer">
              <p>Thank you for your business! Visit us again at sartawset.com</p>
            </div>
          </div>
        `;
      }

      const printWin = window.open("", "_blank");
      if (!printWin) {
         toast.error("Popup blocked! Please allow popups to see the print window.");
         return;
      }

      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Order #${order.id.slice(-6).toUpperCase()}</title>
            <style>${styles}</style>
          </head>
          <body>
            ${content}
            <script>
              window.onload = function() {
                setTimeout(() => {
                  window.focus();
                  window.print();
                  window.close();
                }, 1500);
              };
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
      toast.success("Print window opened!");
    } catch (err) {
      console.error("Print error:", err);
      toast.error("Failed to generate document.");
    }
  };

  // Redirect if not admin
  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      navigate('/admin-login');
    }
  }, [isAdmin, isAuthLoading, navigate]);

  useEffect(() => {
    setIsAdminPanelActive(true);
    return () => setIsAdminPanelActive(false);
  }, [setIsAdminPanelActive]);

  const isSuperAdmin = currentAdmin?.role === "superadmin" || 
    ["yelwinaung9981@gmail.com", "sartawset@gmail.com", "saphosaung@gmail.com"]
      .includes(auth.currentUser?.email?.toLowerCase() || "");

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Final safety check
  if (!isAdmin) return null;

  const [activeTab, setActiveTab] = useState<
    | "orders"
    | "market"
    | "products"
    | "banners"
    | "special-offers"
    | "categories"
    | "settings"
    | "analytics"
    | "users"
    | "notifications"
    | "audit"
    | "admins"
    | "riders"
    | "account"
  >("analytics");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [checkedMarketItems, setCheckedMarketItems] = useState<Record<string, boolean>>({});
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeOrderView, setActiveOrderView] = useState<'list' | 'details'>('list');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState({
    start: "",
    end: "",
  });

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    if (passwordForm.new.length < 6) {
      toast.error("Password should be at least 6 characters.");
      return;
    }

    try {
      setIsChangingPassword(true);
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import("firebase/auth");
      
      if (auth.currentUser?.email) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, passwordForm.current);
        await reauthenticateWithCredential(auth.currentUser, credential);
        
        await updatePassword(auth.currentUser, passwordForm.new);
        toast.success("Password updated successfully!");
        setIsPasswordModalOpen(false);
        setPasswordForm({ current: "", new: "", confirm: "" });
      } else {
        toast.error("Could not determine user email.");
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        toast.error("Incorrect current password.");
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error("Session expired. Please log out and log back in.");
      } else {
        toast.error(error.message || "Failed to update password.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Sync selected order with latest order data from context to reflect status changes immediately
  useEffect(() => {
    if (selectedOrder && (isOrderModalOpen || activeOrderView === 'details')) {
      const updatedOrder = orders.find((o) => o.id === selectedOrder.id);
      if (
        updatedOrder &&
        (updatedOrder.status !== selectedOrder.status ||
          updatedOrder.deliveryStatus !== selectedOrder.deliveryStatus ||
          updatedOrder.assignedTo !== selectedOrder.assignedTo ||
          updatedOrder.paymentScreenshot !== selectedOrder.paymentScreenshot)
      ) {
        setSelectedOrder(updatedOrder);
      }
    }
  }, [orders, isOrderModalOpen, activeOrderView, selectedOrder]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== "all")
      result = result.filter((o) => o.status === statusFilter);
    if (selectedDateFilter.start)
      result = result.filter(
        (o) =>
          parseOrderDate(o.createdAt, o.timestamp).toISOString().split("T")[0] >=
          selectedDateFilter.start,
      );
    if (selectedDateFilter.end)
      result = result.filter(
        (o) =>
          parseOrderDate(o.createdAt, o.timestamp).toISOString().split("T")[0] <=
          selectedDateFilter.end,
      );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.customerName.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          o.roomNumber.toLowerCase().includes(q) ||
          o.customerPhone?.includes(q),
      );
    }

    return result;
  }, [orders, statusFilter, selectedDateFilter, searchQuery]);

  // Redirect Staff if on forbidden tab
  useEffect(() => {
    const forbiddenTabs = ["analytics", "audit", "admins", "riders", "settings"];
    if (isSuperAdmin === false && forbiddenTabs.includes(activeTab)) {
      setActiveTab("orders");
    }
  }, [isSuperAdmin, activeTab]);

  // Redundant new order notification listener removed (consolidated in StoreContext)
  useEffect(() => {
    if (!isAdmin) return;
    // Listen for tab specific updates if needed here, but orders are handled centrally
  }, [isAdmin]);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          // Using jpeg for better compression
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetUid = currentAdmin?.uid || authUid;
    if (!file || !targetUid) return;

    // Even larger files can be compressed, but let's set a sane limit to avoid browser lag
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Please select an image under 5MB.");
      return;
    }

    try {
      await toast.promise(
        (async () => {
          const url = await uploadProfileImage(file);
          await updateAdminProfile(targetUid, {
            photoURL: url
          });
        })(),
        {
          loading: 'Processing and uploading photo...',
          success: 'Photo updated!',
          error: (err) => `Upload failed: ${err.message || 'Unknown error'}`
        }
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to process image.");
    }
  };

  useEffect(() => {
    if (currentAdmin) {
      setProfileForm({
        name: currentAdmin.name || "",
        phone: currentAdmin.phone || "",
      });
    }
  }, [currentAdmin]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // We strictly need authUid to know whose profile to update
    const targetUid = currentAdmin?.uid || authUid;
    if (!targetUid) {
      toast.error("User identity not verified. Please refresh.");
      return;
    }

    try {
      setIsUpdatingProfile(true);
      
      // Use toast.promise for better feedback
      await toast.promise(
        updateAdminProfile(targetUid, {
          name: profileForm.name,
          phone: profileForm.phone,
        }),
        {
          loading: 'Updating profile...',
          success: 'Profile updated successfully!',
          error: (err) => `Failed to update: ${err.message || 'Unknown error'}`
        }
      );
      
      setIsProfileModalOpen(false);
    } catch (error) {
      console.error("Profile update error:", error);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/admin-login");
    } catch (error) {
      console.error("Logout failed:", error);
      localStorage.removeItem("isAdmin");
      navigate("/admin-login");
    }
  };

  // Keyboard listener for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  // Scroll to top when tab changes
  useEffect(() => {
    const mainContent = document.getElementById("admin-main-content");
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTab]);

  const handleSeed = async () => {
    setIsSeeding(true);
    await seedDatabase();
    setIsSeeding(false);
    alert("Database seeded!");
  };

  const handleMigrate = async () => {
    setIsMigrating(true);
    // Migration logic
    setIsMigrating(false);
    alert("Migration complete!");
  };

  // Market List Logic: Auto-Sum total weight/quantity of each product
  const [customMarketDate, setCustomMarketDate] = useState<string>("");

  const normalizeDateKey = (
    dateStr?: string,
    createdAt?: string | number | Date,
  ) => {
    const isLongFormat =
      dateStr && (dateStr.includes(",") || /[a-zA-Z]/.test(dateStr));
    if (!dateStr || !isLongFormat) {
      const dateObj = dateStr ? new Date(dateStr) : new Date(createdAt!);
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kuala_Lumpur",
        weekday: "long",
        month: "long",
        day: "numeric",
      };
      return dateObj.toLocaleDateString("en-MY", options);
    }
    return dateStr;
  };

  const marketListOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = order.status !== "cancelled";

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery]);

  const marketListByDate = useMemo(() => {
    const grouped: Record<
      string,
      Record<
        string,
        {
          id: string;
          name: string;
          total: number;
          unit: string;
          category: string;
        }
      >
    > = {};
    marketListOrders.forEach((order) => {
      const dateKey = normalizeDateKey(order.deliveryDate, order.createdAt);

      if (!grouped[dateKey]) grouped[dateKey] = {};
      order.items.forEach((item) => {
        if (!grouped[dateKey][item.id]) {
          grouped[dateKey][item.id] = {
            id: item.id,
            name: item.name,
            total: 0,
            unit: item.unit || t("oneKg"),
            category: item.category || "Other",
          };
        }
        grouped[dateKey][item.id].total += item.quantity;
      });
    });
    return grouped;
  }, [marketListOrders, t]);

  // Removed auto-redirect useEffect that prevented seeing the date selection overview

  const stats = useMemo(() => {
    return {
      pending: orders.filter((o) => o.status === "pending").length,
      packing: orders.filter((o) => o.status === "packing").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      totalRevenue: orders
        .filter((o) => o.status === "delivered")
        .reduce((acc, o) => acc + o.total, 0),
      lowStock: products.filter((p) => p.stock <= 5).length,
    };
  }, [orders, products]);

  const handlePrintMarketList = () => {
    if (!selectedDate || !marketListByDate[selectedDate]) return;

    const marketItems = Object.values(marketListByDate[selectedDate]) as {
      name: string;
      category: string;
      total: number;
      unit: string;
    }[];
    const doc = new jsPDF();

    // Header Section
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("MARKET PURCHASE LIST", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(`Delivery Date: ${selectedDate}`, 14, 28);
    doc.text(`Generated On: ${new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}`, 14, 33);
    doc.text(`Total Unique Items: ${marketItems.length}`, 14, 38);

    // Line Separator
    doc.setDrawColor(230);
    doc.line(14, 42, 196, 42);

    const categories = Array.from(
      new Set(marketItems.map((i) => i.category)),
    ).sort();
    let currentY = 50;

    categories.forEach((cat) => {
      const catItems = marketItems.filter((i) => i.category === cat);

      // Check for page overflow before writing category title
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      // Category Header
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(cat.toUpperCase(), 14, currentY);

      const tableData = catItems.map((item, idx) => [
        idx + 1,
        item.name,
        `${item.total} ${item.unit}`,
        "[  ]",
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [["#", "Description", "Quantity / Weight", "Check"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [250, 250, 250],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineWidth: 0.1,
          lineColor: [220, 220, 220],
        },
        styles: {
          fontSize: 9,
          cellPadding: 3.5,
          lineColor: [240, 240, 240],
          lineWidth: 0.1,
          textColor: [50, 50, 50],
        },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: "auto" },
          2: { cellWidth: 45, halign: "right" },
          3: { cellWidth: 20, halign: "center" },
        },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;
    });

    // Page Numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: "right" });
    }

    doc.save(`Market_List_${selectedDate.replace(/\//g, "-")}.pdf`);
  };

  return (
    <div
      className={`min-h-screen font-sans flex transition-all duration-500 ${darkMode ? "bg-[#0c0e0e] text-on-surface" : "bg-[#f8faf9]"}`}
    >

      {/* Header - Full Width Top */}

      <header
        className={`fixed top-0 left-0 right-0 z-60 flex items-center justify-between px-4 md:px-8 py-2 border-b ${darkMode ? "bg-[#0c0e0e]/80 backdrop-blur-md border-white/5" : "bg-white/80 backdrop-blur-md border-gray-100"}`}
      >
        {/* Logo Left */}
        <div className="flex items-center gap-3">
            <h1 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title="Toggle Sidebar"
              className={`text-lg font-black tracking-tight cursor-pointer select-none hover:opacity-80 active:scale-95 transition-all ${darkMode ? "text-on-surface" : "text-emerald-950"}`}
            >
                Sar Taw Set
            </h1>
            
            <button
              onClick={() => window.open('/#/menu', '_blank')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
                darkMode 
                  ? "text-primary/70 hover:text-primary hover:bg-primary/10" 
                  : "text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50"
              }`}
            >
              <ExternalLink size={14} />
              <span className="text-[10px] font-black uppercase tracking-wider">View Menu</span>
            </button>
        </div>

        {/* Search Centered */}
        <div className="absolute left-1/2 transform -translate-x-1/2 w-full max-w-md">
          {/* Gmail-style Search Bar */}
          <div className="relative w-full">
            <div
              className={`flex items-center gap-3 px-3 py-1.5 rounded-full transition-all group ${
                darkMode
                  ? "bg-surface-container-high/40 focus-within:bg-surface-container-high border border-white/5 focus-within:border-primary/30"
                  : "bg-gray-100 focus-within:bg-white border border-transparent focus-within:border-emerald-200"
              }`}
            >
              <Search
                size={16}
                className={darkMode ? "text-on-surface-variant/60" : "text-gray-400"}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search")}
                className={`w-full bg-transparent outline-none text-sm placeholder:text-gray-400/50 ${
                  darkMode ? "text-on-surface" : "text-gray-900"
                }`}
              />
            </div>
          </div>
        </div>
        
        {/* Buttons Right */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <button className={`p-2 rounded-full transition-colors ${darkMode ? "text-on-surface-variant/60 hover:bg-white/5" : "text-gray-400 hover:bg-gray-100"}`}>
                <Bell size={20} />
              </button>
            </Popover.Trigger>
            <Popover.Content align="end" className="z-50">
              <OrderNotifications orders={orders} darkMode={darkMode} />
            </Popover.Content>
          </Popover.Root>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full transition-colors ${
              darkMode ? "text-primary hover:bg-white/5" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {/* User Profile */}
          <Popover.Root open={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
            <Popover.Trigger asChild>
              <button className="flex items-center gap-2 px-2 py-1 rounded-2xl transition-all cursor-pointer hover:opacity-80">
                {currentAdmin && (
                  <div className="hidden lg:flex flex-col items-end mr-1 text-right">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-primary" : "text-emerald-700"}`}>
                      {currentAdmin.role}
                    </span>
                    <span className="text-[9px] font-bold opacity-40 uppercase truncate max-w-[100px]">
                      {currentAdmin.name || "Admin"}
                    </span>
                  </div>
                )}
                <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ${darkMode ? "bg-white/5 text-primary border border-white/5" : "bg-gray-100 text-gray-600 border border-gray-100"}`}>
                  {currentAdmin?.photoURL ? (
                    <img src={currentAdmin.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} />
                  )}
                </div>
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={8}
                className={`z-50 w-56 rounded-2xl border shadow-xl p-2 ${
                  darkMode
                    ? "bg-[#0f1111] border-white/10"
                    : "bg-white border-gray-100"
                }`}
              >
                <div className="px-3 py-2 border-b mb-2 pb-3 opacity-80 min-w-0">
                  <p className="font-bold text-sm truncate">{currentAdmin?.name || auth.currentUser?.email || "Admin"}</p>
                  <p className="text-[10px] truncate opacity-50 mt-0.5">{auth.currentUser?.email}</p>
                </div>
                
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    darkMode
                      ? "hover:bg-white/5 text-on-surface"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <User size={16} />
                  My Profile
                </button>
                
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (auth.currentUser?.providerData.some(p => p.providerId === 'google.com')) {
                       toast.error("Google accounts cannot change password here.");
                       return;
                    }
                    setIsPasswordModalOpen(true);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    darkMode
                      ? "hover:bg-white/5 text-on-surface"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <KeyRound size={16} />
                  Change Password
                </button>
                
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    handleLogout();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all mt-1 ${
                    darkMode
                      ? "hover:bg-rose-500/10 text-rose-400"
                      : "hover:bg-rose-50 text-rose-600"
                  }`}
                >
                  <LogOut size={16} />
                  {t("logout")}
                </button>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </header>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isMenuOpen ? 240 : 70,
          boxShadow: isMenuOpen 
            ? (darkMode ? "0 4px 25px rgba(0,0,0,0.5)" : "0 4px 25px rgba(0,0,0,0.05)") 
            : "none",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed top-[70px] left-4 bottom-4 z-50 flex-shrink-0 overflow-hidden rounded-2xl border ${darkMode ? "bg-gradient-to-b from-[#0c0e0e]/90 to-black/90 backdrop-blur-2xl border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" : "bg-gradient-to-b from-white/90 to-gray-50/90 backdrop-blur-2xl border-emerald-100 shadow-[inset_0_1px_1px_rgba(255,255,255,1)]"}`}
      >
        <div className="w-full h-full flex flex-col pt-0 pb-6">

          {/* Navigation Items */}
          <nav className="flex-grow px-3 space-y-2 overflow-y-auto no-scrollbar pb-6">
            <div>
              {/* Removed management header */}
              <div className="space-y-1 pt-4">
                {[
                  { id: "analytics", icon: BarChart3, label: "Analytics", superOnly: true },
                  { id: "orders", icon: ShoppingBag, label: t("orders") },
                  { id: "market", icon: ClipboardList, label: "Market List" },
                  { id: "products", icon: Package, label: t("products") },
                  { id: "banners", icon: ImageIcon, label: "Ad Banners" },
                  {
                    id: "categories",
                    icon: SlidersHorizontal,
                    label: "Categories",
                  },
                ]
                  .filter(item => !item.superOnly || isSuperAdmin)
                  .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex items-center h-12 rounded-xl mx-2 w-[calc(100%-16px)] transition-all duration-300 group relative ${
                      activeTab === item.id
                        ? darkMode
                          ? "bg-primary/15 text-primary font-medium"
                          : "bg-emerald-50 text-emerald-800 font-medium"
                        : darkMode
                          ? "text-on-surface-variant/60 hover:bg-white/5 hover:text-on-surface"
                          : "text-gray-500 hover:bg-gray-50 hover:text-emerald-900"
                    } ${isMenuOpen ? "px-4 gap-4" : "px-0 justify-center"}`}
                  >
                    {activeTab === item.id && (
                      <motion.div
                        layoutId="navPill"
                        className={`absolute left-0 w-1 h-6 rounded-r-full ${darkMode ? "bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.5)]" : "bg-emerald-600"}`}
                      />
                    )}
                    <item.icon
                      size={20}
                      strokeWidth={activeTab === item.id ? 2.5 : 2}
                      className={activeTab === item.id ? "text-current" : ""}
                    />
                    {isMenuOpen && (
                      <span
                        className={`font-bold text-xs whitespace-nowrap transition-transform duration-300 ${activeTab === item.id ? "translate-x-1" : ""}`}
                      >
                        {item.label}
                      </span>
                    )}
                    {activeTab === item.id &&
                      isMenuOpen &&
                      item.id === "orders" &&
                      stats.pending > 0 && (
                        <span className="ml-auto bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full ring-4 ring-rose-500/10">
                          {stats.pending}
                        </span>
                      )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="space-y-1">
                {[
                  { id: "users", icon: Users, label: "Customers" },
                  { id: "notifications", icon: Bell, label: "Broadcast" },
                  { id: "audit", icon: History, label: "Audit Logs", superOnly: true },
                  { id: "admins", icon: ShieldCheck, label: "Admins", superOnly: true },
                  { id: "riders", icon: UserCheck, label: "Riders", superOnly: true },
                  { id: "account", icon: UserCircle, label: "My Account" },
                  { id: "settings", icon: Settings, label: t("settings"), superOnly: true },
                ]
                  .filter(item => !item.superOnly || isSuperAdmin)
                  .map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex items-center h-12 rounded-xl mx-2 w-[calc(100%-16px)] transition-all duration-300 group relative ${
                      activeTab === item.id
                        ? darkMode
                        ? "bg-primary/15 text-primary font-medium"
                        : "bg-emerald-50 text-emerald-800 font-medium"
                      : darkMode
                      ? "text-on-surface-variant/60 hover:bg-white/5 hover:text-on-surface"
                      : "text-gray-500 hover:bg-gray-50 hover:text-emerald-900"
                    } ${isMenuOpen ? "px-4 gap-4" : "px-0 justify-center"}`}
                  >
                    {activeTab === item.id && (
                      <motion.div
                        layoutId="navPill2"
                        className={`absolute left-0 w-1 h-6 rounded-r-full ${darkMode ? "bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.5)]" : "bg-emerald-600"}`}
                      />
                    )}
                    <item.icon
                      size={20}
                      strokeWidth={activeTab === item.id ? 2.5 : 2}
                      className={activeTab === item.id ? "text-current" : ""}
                    />
                    {isMenuOpen && (
                      <span
                        className={`font-bold text-xs whitespace-nowrap transition-transform duration-300 ${activeTab === item.id ? "translate-x-1" : ""}`}
                      >
                        {item.label}
                      </span>
                    )}
                  </button>
                ))}
                
                <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                <button

                  onClick={handleLogout}
                  className={`flex items-center h-12 rounded-xl mx-2 w-[calc(100%-16px)] transition-all duration-300 group relative ${
                    darkMode
                      ? "text-red-400/60 hover:bg-red-500/10 hover:text-red-400"
                      : "text-gray-400 hover:bg-gray-100 hover:text-red-600"
                  } ${isMenuOpen ? "px-4 gap-4" : "px-0 justify-center"}`}
                >
                  <LogOut size={20} />
                  {isMenuOpen && (
                    <span className="font-bold text-xs whitespace-nowrap">
                      {t("logout")}
                    </span>
                  )}
                </button>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </motion.aside>

      {/* Main Content */}
      <motion.main
        id="admin-main-content"
        animate={{
          marginLeft: isMenuOpen ? 240 : 70,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex-grow overflow-y-auto max-h-screen no-scrollbar pt-[52px]"
      >



        {/* Content Area */}
        <div className="flex-grow min-w-0 transition-opacity duration-300 relative before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] before:from-primary/10 before:via-transparent before:to-transparent before:pointer-events-none before:-z-10">
          <div className="p-4 md:p-10 max-w-[1600px] mx-auto relative z-10">
            {/* Low Stock Alerts */}
              {isLowStockAlertEnabled &&
              stats.lowStock > 0 &&
              activeTab === "analytics" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mb-10 p-8 rounded-[3rem] border flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden ${
                    darkMode
                      ? "bg-red-500/10 border-red-500/10 shadow-2xl shadow-red-900/10"
                      : "bg-red-50 border-red-100 shadow-xl shadow-red-900/5"
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50`}
                  />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/30">
                      <AlertTriangle size={32} />
                    </div>
                    <div>
                      <h3
                        className={`text-2xl font-black tracking-tight ${darkMode ? "text-red-400" : "text-red-800"}`}
                      >
                        Inventory Warning
                      </h3>
                      <p
                        className={`text-sm font-bold ${darkMode ? "text-red-400/50" : "text-red-600/60"}`}
                      >
                        {stats.lowStock} essential products are critically low.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 relative z-10">
                    {products
                      .filter((p) => p.stock <= 5)
                      .map((p) => (
                        <motion.span
                          whileHover={{ y: -2 }}
                          key={p.id}
                          className={`px-5 py-2.5 rounded-none text-[11px] font-black uppercase tracking-widest border transition-colors ${
                            darkMode
                              ? "bg-white/5 border-white/10 text-red-300 hover:bg-white/10"
                              : "bg-white/80 backdrop-blur-sm border-red-100 text-red-700 hover:bg-white"
                          }`}
                        >
                          {p.name}: {p.stock} {p.unit}
                        </motion.span>
                      ))}
                  </div>
                </motion.div>
              )}

            {activeTab === "analytics" && (
              <div className="flex items-center gap-3 mb-6">
                <h2
                  className={`text-2xl font-black tracking-tight ${darkMode ? "text-on-surface" : "text-emerald-900"}`}
                >
                  Real-time Analytics
                </h2>
                <div
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${
                    darkMode
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-emerald-50 border-emerald-100 text-emerald-600"
                  }`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest">
                    Live Sync
                  </span>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {activeTab === "analytics" && isSuperAdmin ? (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <AnalyticsTab
                    orders={orders}
                    products={products}
                    stats={stats}
                    darkMode={darkMode}
                    formatPrice={formatPrice}
                    isLowStockAlertEnabled={isLowStockAlertEnabled}
                    t={t}
                    categories={categories}
                  />
                </motion.div>
              ) : activeTab === "orders" ? (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {activeOrderView !== 'details' && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <h2
                            className={`text-2xl font-black tracking-tight ${darkMode ? "text-on-surface" : "text-emerald-900"}`}
                          >
                            {isSuperAdmin ? "Administrator Portal" : "Staff Dashboard"}
                          </h2>
                          <p className="text-[10px] font-medium opacity-50 -mt-1">
                            {isSuperAdmin 
                              ? "Manage, filter, and track all customer orders with full root privileges."
                              : "Review and process incoming customer orders. Internal staff view active."}
                          </p>
                        </div>
                        <div className="flex gap-2 relative">
                          <button
                            onClick={() => {
                              const headers = ["Order ID", "Customer Name", "Phone", "Total Amount", "Status", "Order Date", "Payment Method", "Delivery Location", "Items"];
                              const csvRows = [headers.join(",")];
                              filteredOrders.forEach(o => {
                                const items = o.items.map(i => `${i.quantity}x ${i.name.replace(/,/g, '')}`).join(" | ");
                                csvRows.push([
                                  o.id,
                                  `"${o.customerName}"`,
                                  o.customerPhone,
                                  o.total,
                                  o.status,
                                  parseOrderDate(o.createdAt, o.timestamp).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }),
                                  o.paymentMethod,
                                  `"${o.roomNumber ? o.roomNumber.replace(/^(Apt\.?\s*|Apartment\s*|Room\s*)/i, '') + ' ' : ''}${o.address ? o.address.replace(/^(Apt\.?\s*|Apartment\s*|Room\s*)/i, '') : ''}"`,
                                  `"${items}"`
                                ].join(","));
                              });
                              const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `SarTawSet_Orders_${new Date().toISOString().split("T")[0]}.csv`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                              darkMode
                                ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 shadow-sm"
                            }`}
                          >
                            <FileText size={16} /> {/* Can use Download icon or FileText */}
                            Export CSV
                          </button>
                          <button
                            onClick={() => {
                              const doc = new jsPDF({
                                orientation: "portrait",
                                unit: "mm",
                                format: "a4",
                              });

                              const pageWidth = doc.internal.pageSize.getWidth();
                              const pageHeight = doc.internal.pageSize.getHeight();

                              // Header: Company Name
                              doc.setFontSize(22);
                              doc.setTextColor(16, 185, 129); // Emerald-500
                              doc.setFont("helvetica", "bold");
                              doc.text("Sar Taw Set", 14, 20);

                              // Header: Title
                              doc.setFontSize(16);
                              doc.setTextColor(40);
                              doc.text("Order Management Report", 14, 30);

                              // Header: Timestamp
                              doc.setFontSize(10);
                              doc.setTextColor(100);
                              doc.setFont("helvetica", "normal");
                              const timestamp = new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" });
                              doc.text(`Generated on: ${timestamp}`, 14, 37);

                              const tableData = filteredOrders.map((o) => [
                                `#${o.id.slice(-6).toUpperCase().padStart(6, "0")}`,
                                o.customerName,
                                formatPrice(o.total),
                                o.status.toUpperCase(),
                                parseOrderDate(o.createdAt, o.timestamp).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }),
                              ]);

                              autoTable(doc, {
                                head: [
                                  [
                                    "Order ID",
                                    "Customer Name",
                                    "Total Amount",
                                    "Status",
                                    "Order Date",
                                  ],
                                ],
                                body: tableData,
                                startY: 45,
                                theme: "grid",
                                headStyles: {
                                  fillColor: [16, 185, 129],
                                  textColor: 255,
                                  fontStyle: "bold",
                                },
                                styles: {
                                  fontSize: 9,
                                  cellPadding: 3,
                                  lineColor: [230, 230, 230],
                                  lineWidth: 0.1,
                                },
                                margin: { bottom: 20 },
                                didDrawPage: (data) => {
                                  // Footer: Page Number
                                  doc.setFontSize(8);
                                  doc.setTextColor(150);
                                  const str = `Page ${doc.getNumberOfPages()}`;
                                  doc.text(str, pageWidth / 2, pageHeight - 10, {
                                    align: "center",
                                  });
                                },
                              });

                              doc.save(
                                `SarTawSet_Orders_${new Date().toISOString().split("T")[0]}.pdf`,
                              );
                            }}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                              darkMode
                                ? "bg-white/5 text-on-surface-variant/60 hover:bg-white/10 border border-white/10"
                                : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-50 shadow-sm"
                            }`}
                          >
                            <FileText size={16} />
                            Export PDF
                          </button>
                        </div>
                      </div>

                      {/* Status Filter Chips & Date Range Inline */}
                      <div className="flex flex-wrap items-center gap-3 mb-6">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-grow md:flex-grow-0">
                          {[
                            { id: "all", label: "All Orders", color: "bg-gray-500" },
                            {
                              id: "pending",
                              label: "Placed",
                              color: "bg-amber-500",
                            },
                            {
                              id: "preparing",
                              label: "Preparing",
                              color: "bg-blue-500"
                            },
                            {
                              id: "on_the_way",
                              label: "On Way",
                              color: "bg-violet-500"
                            },
                            {
                              id: "delivered",
                              label: "Delivered",
                              color: "bg-emerald-500",
                            }
                          ].map((chip) => (
                            <button
                              key={chip.id}
                              onClick={() => setStatusFilter(chip.id as any)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all border ${
                                statusFilter === chip.id
                                  ? `${chip.color} text-white border-transparent shadow-lg shadow-${chip.color.split("-")[1]}-500/20`
                                  : darkMode
                                    ? "bg-white/5 border-white/10 text-on-surface-variant/60 hover:bg-white/10"
                                    : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${statusFilter === chip.id ? "bg-white" : chip.color}`}
                              />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                {chip.label}
                              </span>
                              {statusFilter === chip.id && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/20 text-[8px] font-black">
                                  {
                                    orders.filter((o) =>
                                      chip.id === "all"
                                        ? true
                                        : o.status === chip.id,
                                    ).length
                                  }
                                </span>
                              )}
                            </button>
                          ))}
                        </div>

                        <div
                          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-100"}`}
                        >
                          <Calendar size={12} className="opacity-40" />
                          <input
                            type="date"
                            className="bg-transparent text-[10px] font-bold outline-none cursor-pointer"
                            onChange={(e) =>
                              setSelectedDateFilter((prev) => ({
                                ...prev,
                                start: e.target.value,
                              }))
                            }
                          />
                          <span className="opacity-20 text-[10px]">—</span>
                          <input
                            type="date"
                            className="bg-transparent text-[10px] font-bold outline-none cursor-pointer"
                            onChange={(e) =>
                              setSelectedDateFilter((prev) => ({
                                ...prev,
                                end: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Compact Enhanced Orders Grid */}
                  {activeOrderView === 'details' && selectedOrder ? (
                    <div className="space-y-6 px-1">
                         <OrderDetailsView
                             order={selectedOrder}
                             onClose={() => setActiveOrderView('list')}
                             darkMode={darkMode}
                             formatPrice={formatPrice}
                             t={t}

                             updateStatus={async (id, status, reason) => {
                                 await updateOrderStatus(id, status, reason);
                             }}
                             handlePrint={handlePrintOrder}
                         />
                    </div>
                  ) : (
                  <div className="grid gap-2">
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((order, i) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.01, duration: 0.2 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                            setActiveOrderView('details');
                          }}
                          className={`group px-3 py-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer hover:scale-[1.01] ${
                            order.status === "pending"
                              ? "bg-amber-950/5 border-amber-500/20 hover:bg-amber-950/10 shadow-lg shadow-amber-900/5"
                              : "bg-surface-container-high/20 border-white/5 hover:bg-surface-container-high/40 shadow-sm"
                          }`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                                order.status === "pending"
                                  ? "bg-amber-500/10 text-amber-500"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              <User size={16} />
                            </div>
                            <div className="truncate flex items-center gap-2">
                              <div className="truncate">
                                <p className="font-black text-sm text-on-surface truncate tracking-tight">
                                  {order.customerName}
                                </p>
                                <p className="font-mono text-[9px] font-black uppercase tracking-widest opacity-30">
                                  #
                                  {order.id.slice(-8)}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {order.note && (
                                  <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0" title="Has Customer Note">
                                    <FileText size={10} />
                                  </div>
                                )}
                                {order.paymentScreenshot && (
                                  <div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0" title="Has Payment Attachment">
                                    <ImageIcon size={10} />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                              <p className="text-[8px] uppercase tracking-[0.2em] opacity-30 font-black mb-1">
                                Delivery
                              </p>
                              <p className="font-bold text-xs text-on-surface">
                                {order.deliveryDay || "ASAP"}
                              </p>
                            </div>
                            <div className="text-right hidden md:block">
                              <p className="text-[8px] uppercase tracking-[0.2em] opacity-30 font-black mb-1">
                                Ordered On
                              </p>
                              <p className="font-bold text-xs text-on-surface">
                                {parseOrderDate(order.createdAt, order.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>

                            <div className="text-right min-w-[100px]">
                              <p className="font-black text-sm text-on-surface">
                                {formatPrice(order.total)}
                              </p>
                              <p className="text-[8px] uppercase tracking-[0.2em] opacity-30 font-black">
                                {order.items.length} items
                              </p>
                            </div>

                            <span
                              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                order.status === "delivered"
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : order.status === "packing"
                                    ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              }`}
                            >
                              {order.status}
                            </span>

                            <div className={`p-1.5 rounded-full transition-colors ${darkMode ? "bg-white/5 text-on-surface-variant/20 group-hover:text-primary group-hover:bg-primary/10" : "bg-gray-50 text-gray-300 group-hover:text-emerald-600 group-hover:bg-emerald-50"}`}>
                              <ChevronRight size={14} />
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="p-10 text-center rounded-3xl border border-dashed border-white/5">
                        <p className="font-bold text-xs opacity-30">
                          No orders found.
                        </p>
                      </div>
                    )}
                  </div>
                  )}
                </motion.div>
              ) : activeTab === "market" ? (
                <motion.div
                  key="market"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  {selectedDate ? (
                    // Detail View
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setSelectedDate(null)}
                            className={`p-2.5 rounded-full transition-all hover:scale-110 active:scale-95 ${darkMode ? "bg-white/5 hover:bg-white/10 text-primary" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100"}`}
                          >
                            <ChevronRight size={18} className="rotate-180" />
                          </button>
                          <div>
                            <h2
                              className={`text-2xl font-black tracking-tight ${darkMode ? "text-on-surface" : "text-emerald-900"}`}
                            >
                              {selectedDate}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-on-surface-variant/40" : "text-gray-400"}`}
                              >
                                Market Purchase Summary
                              </span>
                              <span
                                className={`w-1 h-1 rounded-full ${darkMode ? "bg-white/10" : "bg-gray-200"}`}
                              />
                              <span
                                className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-primary" : "text-emerald-600"}`}
                              >
                                {
                                  Object.keys(
                                    marketListByDate[selectedDate] || {},
                                  ).length
                                }{" "}
                                Products Found
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div
                            className={`px-4 py-2 rounded-none text-[10px] font-black uppercase tracking-widest ${darkMode ? "bg-primary/5 text-primary/60" : "bg-emerald-50 text-emerald-600/60"}`}
                          >
                            Market Mode
                          </div>
                        </div>
                      </div>

                      {marketListByDate[selectedDate] ? (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div
                              className={`p-4 rounded-none border ${darkMode ? "bg-surface-container-high/40 border-white/5" : "bg-white border-gray-100 shadow-sm"}`}
                            >
                              <p
                                className={`text-[9px] font-black uppercase tracking-widest mb-1 ${darkMode ? "text-on-surface-variant/40" : "text-gray-400"}`}
                              >
                                {t("totalItems")}
                              </p>
                              <p
                                className={`text-xl font-black ${darkMode ? "text-on-surface" : "text-emerald-950"}`}
                              >
                                {
                                  Object.keys(marketListByDate[selectedDate])
                                    .length
                                }
                              </p>
                            </div>

                            <div
                              className={`p-4 rounded-none border ${darkMode ? "bg-surface-container-high/40 border-white/5" : "bg-white border-gray-100 shadow-sm"}`}
                            >
                              <p
                                className={`text-[9px] font-black uppercase tracking-widest mb-1 ${darkMode ? "text-on-surface-variant/40" : "text-gray-400"}`}
                              >
                                Categories
                              </p>
                              <p
                                className={`text-xl font-black ${darkMode ? "text-on-surface" : "text-emerald-950"}`}
                              >
                                {
                                  new Set(
                                    Object.values(
                                      marketListByDate[selectedDate],
                                    ).map((i: any) => i.category),
                                  ).size
                                }
                              </p>
                            </div>

                            <div
                              className={`p-4 rounded-none border ${darkMode ? "bg-surface-container-high/40 border-white/5" : "bg-white border-gray-100 shadow-sm"}`}
                            >
                              <p
                                className={`text-[9px] font-black uppercase tracking-widest mb-1 ${darkMode ? "text-on-surface-variant/40" : "text-gray-400"}`}
                              >
                                Orders
                              </p>
                              <p
                                className={`text-xl font-black ${darkMode ? "text-on-surface" : "text-emerald-950"}`}
                              >
                                {
                                  marketListOrders.filter(
                                    (o) =>
                                      normalizeDateKey(
                                        o.deliveryDate,
                                        o.createdAt,
                                      ) === selectedDate,
                                  ).length
                                }
                              </p>
                            </div>

                            <button
                              onClick={handlePrintMarketList}
                              className={`p-4 rounded-none border flex flex-col items-center justify-center gap-1 transition-all group active:scale-95 ${
                                darkMode
                                  ? "bg-primary border-primary hover:bg-primary/90 text-surface shadow-lg shadow-primary/20"
                                  : "bg-emerald-600 border-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                              }`}
                            >
                              <FileText
                                size={16}
                                className="group-hover:scale-110 transition-transform"
                              />
                              <span className="text-[9px] font-black uppercase tracking-widest">
                                Export PDF
                              </span>
                            </button>
                          </div>

                          <div
                            className={`rounded-none border overflow-hidden ${darkMode ? "bg-surface-container-high/40 border-white/5" : "bg-white border-gray-100 shadow-sm"}`}
                          >
                            {Object.entries(
                              Object.values(
                                marketListByDate[selectedDate],
                              ).reduce(
                                (acc, item: any) => {
                                  if (!acc[item.category])
                                    acc[item.category] = [];
                                  acc[item.category].push(item);
                                  return acc;
                                },
                                {} as Record<string, any[]>,
                              ),
                            ).map(
                              ([category, items]: [string, any[]], catIdx) => (
                                <div
                                  key={`category-${category}-${catIdx}`}
                                  className={
                                    catIdx > 0
                                      ? "border-t " +
                                        (darkMode
                                          ? "border-white/5"
                                          : "border-gray-100")
                                      : ""
                                  }
                                >
                                  <div
                                    className={`px-5 py-3 flex items-center justify-between ${darkMode ? "bg-white/[0.03]" : "bg-gray-50/80 border-b border-gray-100"}`}
                                  >
                                    <h3
                                      className={`text-[9px] font-black uppercase tracking-[0.25em] ${darkMode ? "text-primary" : "text-emerald-600"}`}
                                    >
                                      {category}
                                    </h3>
                                    <span
                                      className={`text-[9px] font-black px-2 py-0.5 rounded-md ${darkMode ? "bg-white/5 text-on-surface-variant/50" : "bg-white border border-gray-100 text-gray-400 shadow-sm uppercase tracking-tighter text-[8px]"}`}
                                    >
                                      {items.length} Items
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse table-fixed">
                                      <thead>
                                        <tr
                                          className={`border-b ${darkMode ? "border-white/5" : "border-gray-50"}`}
                                        >
                                          <th className="py-2.5 px-6 text-[8px] font-black uppercase tracking-widest text-gray-400 w-[50px] text-center">
                                            #
                                          </th>
                                          <th className="py-2.5 px-0 text-[8px] font-black uppercase tracking-widest text-gray-400">
                                            {t("itemName")}
                                          </th>
                                          <th className="py-2.5 px-6 text-[8px] font-black uppercase tracking-widest text-gray-400 text-right w-[150px]">
                                            {t("totalWeightQty")}
                                          </th>
                                          <th className="py-2.5 px-6 text-[8px] font-black uppercase tracking-widest text-gray-400 text-center w-[80px]">
                                            {t("status")}
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {items.map((item, i) => {
                                          const itemKey = `${selectedDate}-${item.id}`;
                                          const isChecked = checkedMarketItems[itemKey] || false;
                                          return (
                                            <tr
                                              key={item.id}
                                              className={`group border-b last:border-0 transition-colors ${isChecked ? "opacity-50" : ""} ${darkMode ? "border-white/5 hover:bg-white/5" : "border-gray-50 hover:bg-emerald-50/30"}`}
                                            >
                                              <td
                                                className={`py-3 px-6 text-[10px] font-bold text-center ${darkMode ? "text-on-surface-variant/30" : "text-gray-300"}`}
                                              >
                                                {i + 1}
                                              </td>
                                              <td
                                                className={`py-3 px-0 text-xs font-bold leading-tight ${isChecked ? "line-through text-on-surface-variant/40" : (darkMode ? "text-on-surface" : "text-emerald-950")}`}
                                              >
                                                {item.name}
                                              </td>
                                              <td
                                                className={`py-3 px-6 text-xs font-black text-right ${isChecked ? "line-through text-on-surface-variant/40" : (darkMode ? "text-primary" : "text-emerald-700")}`}
                                              >
                                                <span className="tabular-nums">
                                                  {item.total}
                                                </span>{" "}
                                                <span className="text-[9px] opacity-40 ml-0.5 lowercase font-medium">
                                                  {item.unit}
                                                </span>
                                              </td>
                                              <td className="py-3 px-6 text-center">
                                                <label className="flex items-center justify-center cursor-pointer group-hover:scale-110 transition-transform">
                                                  <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                      setCheckedMarketItems(prev => ({
                                                        ...prev,
                                                        [itemKey]: e.target.checked
                                                      }));
                                                    }}
                                                    className={`w-3.5 h-3.5 rounded transition-all cursor-pointer ${
                                                      darkMode
                                                        ? "border-white/10 checked:bg-primary/40 checked:border-primary"
                                                        : "border-gray-200 checked:bg-emerald-500 checked:border-emerald-600 focus:ring-0 appearance-none bg-white"
                                                    }`}
                                                  />
                                                </label>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="p-20 text-center rounded-[3rem] border border-dashed border-white/5">
                          <p className="font-bold text-lg opacity-30">
                            No items found for this date.
                          </p>
                          <button
                            onClick={() => setSelectedDate(null)}
                            className="mt-4 text-primary font-bold hover:underline"
                          >
                            Go back home
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Overview Page: Date Selection Cards */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                          <h2
                            className={`text-2xl font-black tracking-tight ${darkMode ? "text-on-surface" : "text-emerald-900"}`}
                          >
                            {t("marketList")}
                          </h2>
                          <p
                            className={`text-xs font-bold ${darkMode ? "text-on-surface-variant/60" : "text-gray-500"}`}
                          >
                            Choose a date to view summarized purchase list
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              const options: Intl.DateTimeFormatOptions = {
                                timeZone: "Asia/Kuala_Lumpur",
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                              };
                              const today = new Date().toLocaleDateString(
                                "en-MY",
                                options,
                              );
                              setSelectedDate(today);
                            }}
                            className={`px-4 py-2.5 rounded-none font-bold text-[10px] uppercase tracking-widest border transition-all ${darkMode ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20" : "bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100"}`}
                          >
                            Today
                          </button>
                          <div
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-none border transition-all ${darkMode ? "bg-surface-container-high/40 border-white/5 focus-within:border-primary/50" : "bg-white border-gray-100 shadow-sm focus-within:border-emerald-500 shadow-emerald-500/5"}`}
                          >
                            <Calendar
                              size={16}
                              className={
                                darkMode ? "text-primary" : "text-emerald-600"
                              }
                            />
                            <input
                              type="date"
                              className="bg-transparent border-none outline-none text-xs font-bold w-full"
                              onChange={(e) => {
                                if (e.target.value) {
                                  const date = new Date(e.target.value);
                                  const options: Intl.DateTimeFormatOptions = {
                                    timeZone: "Asia/Kuala_Lumpur",
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                  };
                                  const formatted = date.toLocaleDateString(
                                    "en-MY",
                                    options,
                                  );
                                  setSelectedDate(formatted);
                                }
                              }}
                            />
                          </div>
                          <div
                            className={`px-4 py-2.5 rounded-none font-black text-[10px] uppercase tracking-widest border ${darkMode ? "bg-white/5 border-white/5 text-on-surface-variant/60" : "bg-gray-50 border-gray-100 text-gray-500"}`}
                          >
                            {Object.keys(marketListByDate).length} {t("days")}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Sort dates chronologically if possible */}
                        {Object.keys(marketListByDate)
                          .sort((a, b) => {
                            const da = new Date(a).getTime();
                            const db = new Date(b).getTime();
                            if (isNaN(da) || isNaN(db)) return 0;
                            return db - da; // Newest first
                          })
                          .map((date) => (
                            <button
                              key={date}
                              onClick={() => setSelectedDate(date)}
                              className={`group p-4 rounded-none border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                darkMode
                                  ? "bg-surface-container-high/40 border-white/5 hover:bg-white/5"
                                  : "bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200"
                              }`}
                            >
                              <div className="flex flex-col h-full gap-2.5">
                                <div
                                  className={`w-8 h-8 rounded-none flex items-center justify-center transition-colors ${darkMode ? "bg-white/5 text-primary" : "bg-emerald-50 text-emerald-600"}`}
                                >
                                  <Calendar size={16} />
                                </div>
                                <div className="mt-1">
                                  <p
                                    className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${darkMode ? "text-on-surface-variant/40" : "text-gray-400"}`}
                                  >
                                    Delivery Date
                                  </p>
                                  <h3
                                    className={`font-black text-sm leading-tight ${darkMode ? "text-on-surface" : "text-emerald-950"}`}
                                  >
                                    {date}
                                  </h3>
                                </div>
                                <div className="mt-1 flex items-center justify-between">
                                  <span
                                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${darkMode ? "bg-white/5 text-primary" : "bg-emerald-50 text-emerald-700"}`}
                                  >
                                    {Object.keys(marketListByDate[date]).length}{" "}
                                    {t("items")}
                                  </span>
                                  <ChevronRight
                                    size={14}
                                    className={`transition-transform group-hover:translate-x-1 ${darkMode ? "text-white/20" : "text-emerald-200"}`}
                                  />
                                </div>
                              </div>
                            </button>
                          ))}

                        {Object.keys(marketListByDate).length === 0 && (
                          <div
                            className={`col-span-full py-20 text-center rounded-[2rem] border-2 border-dashed ${darkMode ? "border-white/5" : "border-gray-100"}`}
                          >
                            <div className="flex flex-col items-center gap-4">
                              <div
                                className={`w-16 h-16 rounded-none flex items-center justify-center ${darkMode ? "bg-white/5 text-white/5" : "bg-gray-50 text-gray-200"}`}
                              >
                                <ClipboardList size={32} />
                              </div>
                              <p
                                className={`font-bold text-lg ${darkMode ? "text-white/20" : "text-gray-400"}`}
                              >
                                No market lists generated yet.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : activeTab === "products" ? (
                <motion.div
                  key="products"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                    <ProductsTab
                      products={products}
                      categories={categories}
                      addProduct={addProduct}
                      updateProduct={updateProduct}
                      deleteProduct={deleteProduct}
                      darkMode={darkMode}
                      t={t}
                      language={language}
                      formatPrice={formatPrice}
                      globalSearch={searchQuery}
                    />
                </motion.div>
              ) : activeTab === "banners" ? (
                <motion.div
                  key="banners"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2
                      className={`text-3xl font-black tracking-tight ${darkMode ? "text-on-surface" : "text-emerald-950"}`}
                    >
                      Ad Banners
                    </h2>
                    <p
                      className={`text-xs font-bold ${darkMode ? "text-on-surface-variant/60" : "text-gray-500"}`}
                    >
                      Manage full-image advertisements
                    </p>
                  </div>
                  <AdBannersTab
                    darkMode={darkMode}
                    t={t}
                    globalSearch={searchQuery}
                  />
                </motion.div>
              ) : activeTab === "categories" ? (
                <motion.div
                  key="categories"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <CategoriesTab
                    darkMode={darkMode}
                    t={t}
                    globalSearch={searchQuery}
                  />
                </motion.div>
              ) : activeTab === "users" ? (
                <motion.div
                  key="users"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <UsersTab
                    users={users}
                    orders={orders}
                    darkMode={darkMode}
                    updateUserPoints={updateUserPoints}
                    globalSearch={searchQuery}
                    handlePrint={handlePrintOrder}
                  />
                </motion.div>
              ) : activeTab === "notifications" ? (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <NotificationsTab
                    broadcastNotifications={broadcastNotifications}
                    sendBroadcast={sendBroadcast}
                    sendTargetedNotification={sendTargetedNotification}
                    allCustomers={allCustomers}
                    darkMode={darkMode}
                  />
                </motion.div>
              ) : activeTab === "audit" && isSuperAdmin ? (
                <motion.div
                  key="audit"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <AuditLogsTab
                    auditLogs={auditLogs}
                    darkMode={darkMode}
                    globalSearch={searchQuery}
                  />
                </motion.div>
              ) : activeTab === "admins" && isSuperAdmin ? (
                <motion.div
                  key="admins"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <AdminsTab
                    admins={admins}
                    addAdmin={addAdmin}
                    createNewAdmin={createNewAdmin}
                    updateAdminRole={updateAdminRole}
                    removeAdmin={removeAdmin}
                    darkMode={darkMode}
                    globalSearch={searchQuery}
                  />
                </motion.div>
              ) : activeTab === "riders" && isSuperAdmin ? (
                <motion.div
                  key="riders"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <RidersTab
                    createNewRider={createNewRider}
                    removeRider={removeRider}
                    darkMode={darkMode}
                    globalSearch={searchQuery}
                  />
                </motion.div>
              ) : activeTab === "account" ? (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="max-w-4xl mx-auto"
                >
                  {/* Compact Header */}
                  <div className={`relative mb-4 rounded-3xl overflow-hidden border ${darkMode ? 'bg-surface-container border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className={`h-20 w-full ${darkMode ? 'bg-primary/10' : 'bg-emerald-50'}`} />
                    <div className="px-6 pb-4 -mt-8 flex items-center gap-4">
                      <div className="relative group/avatar cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className={`w-20 h-20 rounded-2xl border-4 flex items-center justify-center text-2xl shadow-lg overflow-hidden transition-all duration-500 group-hover/avatar:scale-105 ${
                          darkMode 
                            ? 'bg-surface-container-high border-surface-container text-primary' 
                            : 'bg-white border-white text-emerald-600'
                        }`}>
                          {currentAdmin?.photoURL ? (
                            <img src={currentAdmin.photoURL} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            currentAdmin?.name?.[0]?.toUpperCase() || <User size={32} />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                            <Camera className="text-white" size={20} />
                          </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                      </div>
                      
                      <div className="flex-grow pt-8">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-black tracking-tight">{currentAdmin?.name || (isSuperAdmin ? "Administrator" : "Staff Member")}</h2>
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                            isSuperAdmin 
                              ? (darkMode ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-emerald-100 text-emerald-800 border border-emerald-200')
                              : (darkMode ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-orange-50 text-orange-700 border border-orange-100')
                          }`}>
                            {isSuperAdmin ? 'Admin' : 'Staff'}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold opacity-50 flex items-center gap-1.5 mt-0.5">
                          <Mail size={12} /> {currentAdmin?.email}
                        </p>
                      </div>

                      <button
                        onClick={() => setIsProfileModalOpen(true)}
                        className={`mt-8 flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 ${
                          darkMode ? "bg-white text-black hover:bg-gray-100" : "bg-emerald-950 text-white hover:bg-black"
                        }`}
                      >
                        <Edit3 size={14} />
                        Update
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Basic Info */}
                    <div className={`p-5 rounded-3xl border ${darkMode ? "bg-surface-container border-white/5" : "bg-white border-gray-100 shadow-sm"}`}>
                      <h3 className="text-xs font-black mb-4 flex items-center gap-2 uppercase tracking-widest opacity-50">
                        <Info size={14} />
                        Information
                      </h3>
                      <div className="space-y-3">
                        {[
                          { label: 'Full Name', value: currentAdmin?.name },
                          { label: 'Phone', value: currentAdmin?.phone },
                          { label: 'Email', value: currentAdmin?.email, subtle: true },
                          { label: 'Joined', value: currentAdmin?.createdAt ? new Date(currentAdmin.createdAt).toLocaleDateString() : 'N/A', subtle: true },
                        ].map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-0.5">
                            <span className="text-[8px] font-black opacity-30 uppercase tracking-[0.2em] ml-1">{item.label}</span>
                            <div className={`px-3 py-2 rounded-xl text-xs font-bold border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'} ${item.subtle ? 'opacity-60' : ''}`}>
                              {item.value || "Not set"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Security & Actions */}
                      <div className={`p-5 rounded-3xl border ${darkMode ? "bg-surface-container border-white/5" : "bg-white border-gray-100 shadow-sm"}`}>
                        <h3 className="text-xs font-black mb-4 flex items-center gap-2 uppercase tracking-widest opacity-50">
                          <ShieldCheck size={14} />
                          Security
                        </h3>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => {
                              if (auth.currentUser?.providerData.some(p => p.providerId === 'google.com')) {
                                toast.error("Google accounts cannot change password here.");
                                return;
                              }
                              setIsPasswordModalOpen(true);
                            }}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${darkMode ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"}`}
                          >
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-80">
                              <KeyRound size={16} className={darkMode ? "text-primary" : "text-emerald-600"} />
                              Reset Password
                            </div>
                            <ChevronRight size={14} className="opacity-30" />
                          </button>
                          
                          <button 
                            onClick={handleLogout}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${darkMode ? "bg-red-500/5 hover:bg-red-500/10 text-red-500" : "bg-red-50 hover:bg-red-100 text-red-600"}`}
                          >
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                              <LogOut size={16} />
                              Logout
                            </div>
                            <ChevronRight size={14} className="opacity-30" />
                          </button>
                        </div>
                      </div>

                      {/* Status Card */}
                      <div className={`p-5 rounded-3xl border ${isSuperAdmin ? (darkMode ? 'bg-primary/5 border-primary/20' : 'bg-emerald-50 border-emerald-100') : (darkMode ? 'bg-amber-500/5 border-amber-500/10' : 'bg-orange-50 border-orange-100')} flex items-center gap-4`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSuperAdmin ? (darkMode ? 'bg-primary text-black' : 'bg-emerald-600 text-white') : (darkMode ? 'bg-amber-500 text-black' : 'bg-orange-500 text-white')}`}>
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <h4 className="font-black text-sm tracking-tight leading-none mb-1">
                            {isSuperAdmin ? 'Restricted Root Access' : 'Verified Staff Member'}
                          </h4>
                          <p className="text-[9px] font-medium opacity-60 leading-tight">
                            {isSuperAdmin ? 'Full administrative control active.' : 'Internal operations access granted.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Permissions - More Compact List */}
                    <div className={`p-5 rounded-3xl border md:col-span-2 ${darkMode ? "bg-surface-container border-white/5" : "bg-white border-gray-100 shadow-sm"}`}>
                      <h3 className="text-xs font-black mb-4 flex items-center gap-2 uppercase tracking-widest opacity-50">
                        <Shield size={14} />
                        Permissions
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { title: 'Configuration', sub: 'Global settings', rootOnly: true },
                          { title: 'Orders', sub: 'Full lifecycle', rootOnly: false },
                          { title: 'Inventory', sub: 'Products & Stock', rootOnly: false },
                        ].map((perm, i) => (
                          <div key={i} className={`p-3 rounded-xl border flex items-center justify-between ${darkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-tight leading-none mb-0.5">{perm.title}</p>
                              <p className="text-[8px] opacity-40 font-bold">{perm.sub}</p>
                            </div>
                            {perm.rootOnly ? (
                              isSuperAdmin ? <Check className="text-primary" size={14} /> : <Ban className="opacity-10" size={14} />
                            ) : <Check className="text-primary" size={14} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === "settings" && isSuperAdmin ? (
                <SettingsTab 
                  darkMode={darkMode}
                  handleSeed={handleSeed}
                  isSeeding={isSeeding}
                  handleMigrate={handleMigrate}
                  isMigrating={isMigrating}
                  setIsSeeding={setIsSeeding}
                />
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </motion.main>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <Dialog.Root open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" />
              <Dialog.Content className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded-3xl p-6 shadow-2xl z-50 ${darkMode ? "bg-surface-container-high border border-white/10 text-on-surface" : "bg-white border text-slate-800"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Dialog.Title className="text-xl font-black tracking-tight">Edit Profile</Dialog.Title>
                    <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mt-1">Update your account details</p>
                  </div>
                  <Dialog.Close asChild>
                    <button className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-white/5" : "hover:bg-gray-100"}`}>
                      <X size={20} />
                    </button>
                  </Dialog.Close>
                </div>
                
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] ml-2">Display Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-black/20 border-white/10 focus:border-primary" : "bg-gray-50 border-gray-200 focus:border-emerald-500"}`}
                      placeholder="Your full name"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] ml-2">Phone Number</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl border font-bold text-sm outline-none transition-all ${darkMode ? "bg-black/20 border-white/10 focus:border-primary" : "bg-gray-50 border-gray-200 focus:border-emerald-500"}`}
                      placeholder="e.g. +95 9..."
                    />
                  </div>
                  
                  <div className={`p-3 rounded-xl text-[9px] font-bold ${darkMode ? "bg-white/5 text-on-surface-variant/40" : "bg-gray-50 text-gray-400"}`}>
                    <p>Email address and permissions are managed by system administrators.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
                      darkMode
                        ? "bg-primary text-black hover:bg-primary/90 shadow-primary/10 disabled:opacity-50"
                        : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/10 disabled:opacity-50"
                    }`}
                  >
                    {isUpdatingProfile ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : 'Save Changes'}
                  </button>
                </form>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <Dialog.Root open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" />
              <Dialog.Content className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded-3xl p-6 shadow-2xl z-50 ${darkMode ? "bg-surface-container-high border border-white/10 text-on-surface" : "bg-white border text-slate-800"}`}>
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-black">Change Password</Dialog.Title>
                  <Dialog.Close asChild>
                    <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                      <X size={20} />
                    </button>
                  </Dialog.Close>
                </div>
                
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold opacity-70 uppercase tracking-wider">Current Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm(p => ({ ...p, current: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl border font-medium outline-none transition-all ${darkMode ? "bg-black/20 border-white/10 focus:border-primary" : "bg-gray-50 border-gray-200 focus:border-emerald-500"}`}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold opacity-70 uppercase tracking-wider">New Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm(p => ({ ...p, new: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl border font-medium outline-none transition-all ${darkMode ? "bg-black/20 border-white/10 focus:border-primary" : "bg-gray-50 border-gray-200 focus:border-emerald-500"}`}
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold opacity-70 uppercase tracking-wider">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl border font-medium outline-none transition-all ${darkMode ? "bg-black/20 border-white/10 focus:border-primary" : "bg-gray-50 border-gray-200 focus:border-emerald-500"}`}
                      placeholder="Repeat new password"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className={`mt-4 w-full h-12 rounded-xl flex items-center justify-center font-black text-sm uppercase tracking-widest transition-all ${darkMode ? "bg-primary text-surface hover:bg-primary/90" : "bg-emerald-600 text-white hover:bg-emerald-700"} disabled:opacity-50`}
                  >
                    {isChangingPassword ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </form>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </AnimatePresence>
    </div>
  );
}
