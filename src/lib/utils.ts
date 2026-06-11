import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to reliably parse any Firestore timestamp or field string to JS Date
export const parseOrderDate = (createdAt: any, timestamp?: any): Date => {
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

// Formats as localized string in Malaysia in Asia/Kuala_Lumpur timezone
export const formatMYDateTime = (createdAt: any, timestamp?: any, options?: Intl.DateTimeFormatOptions): string => {
  const d = parseOrderDate(createdAt, timestamp);
  return d.toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    ...options
  });
};

export const formatMYDate = (createdAt: any, timestamp?: any, options?: Intl.DateTimeFormatOptions): string => {
  const d = parseOrderDate(createdAt, timestamp);
  return d.toLocaleDateString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    ...options
  });
};

export const formatMYTime = (createdAt: any, timestamp?: any, options?: Intl.DateTimeFormatOptions): string => {
  const d = parseOrderDate(createdAt, timestamp);
  return d.toLocaleTimeString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    ...options
  });
};
