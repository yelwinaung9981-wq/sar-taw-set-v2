import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, initializeFirestore, doc, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase SDK
console.log("Initializing Firebase with project:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);

// Initialize Firestore with long polling to resolve connectivity issues in iframe/sandboxed environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || "(default)");

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Initialize Storage using the bucket from firebaseConfig (most robust)
export const storage = getStorage(app);
export { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, signInAnonymously, signInWithPopup };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

let isQuotaExceeded = false;
let quotaListeners: ((exceeded: boolean) => void)[] = [];

export function getIsQuotaExceeded() {
  return isQuotaExceeded;
}

export function onQuotaExceededChange(listener: (exceeded: boolean) => void) {
  quotaListeners.push(listener);
  return () => {
    quotaListeners = quotaListeners.filter(l => l !== listener);
  };
}

export function resetQuotaExceeded() {
  isQuotaExceeded = false;
  quotaListeners.forEach(l => l(false));
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (errorMessage.includes('resource-exhausted')) {
    if (!isQuotaExceeded) {
      isQuotaExceeded = true;
      quotaListeners.forEach(l => l(true));
      console.warn("Firestore Quota Exceeded. Entering Cached Mode.");
    }
  }
  
  if (errorMessage.includes('client is offline')) {
    console.warn("Firestore reports client is offline.");
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-error', { detail: 'Firestore Error: ' + errInfo.error }));
  }

  // CRITICAL: Must throw formatted error for the system to diagnose
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  console.log("Testing Firestore connection to database:", firebaseConfig.firestoreDatabaseId || "(default)");
  // Wait a moment for Firebase to initialize
  await new Promise(resolve => setTimeout(resolve, 3000));
  try {
    const docRef = doc(db, 'test', 'connection');
    // Using a simple getDoc to verify connectivity
    await getDoc(docRef);
    console.log("Firestore connection successful!");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if(errorMessage.includes('client is offline') || errorMessage.includes('unavailable')) {
      console.warn("Firestore reports backend is unavailable or client is offline. This is usually due to network sandboxing or transient connectivity issues. The SDK will automatically reconnect when possible.");
    } else if (errorMessage.includes('Insufficient permissions')) {
      console.log("Firestore connectivity verified (received permission error as expected).");
    } else {
      console.error("Firestore connection test failed:", error);
    }
  }
}
// Call with a small delay to allow SDK initialization
setTimeout(testConnection, 1000);
