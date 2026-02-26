import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react"; 

import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInWithRedirect,      
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  type User as FirebaseUser,
  type UserCredential
} from "firebase/auth";

import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase"; 

// 1. Ampliem la interfície per forçar la comprovació de verificació
export interface User extends Partial<FirebaseUser> {
  uid: string;
  email: string | null;
  emailVerified: boolean; // 👈 CAMP CRÍTIC AFEGIT
  is_vip?: boolean;
  daily_usage?: {
    date: string;
    counts: Record<string, number>;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserCredential>;
  signup: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyEmail: (userToVerify: FirebaseUser) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        
        const unsubscribeSnapshot = onSnapshot(userDocRef, (userDoc) => {
          let firestoreData = {};
          if (userDoc.exists()) firestoreData = userDoc.data();

          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            emailVerified: currentUser.emailVerified, // 👈 CAPTUREM L'ESTAT DEL CORREU
            ...firestoreData,
          });
          setLoading(false);
        }, (error) => {
          console.error("Error escoltant Firestore:", error);
          setLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Modifiquem les funcions perquè retornin el UserCredential
  const login = async (email: string, password: string) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string) => {
    return await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };

  const resetPassword = async (email: string) => {
    return await sendPasswordResetEmail(auth, email);
  };

  const verifyEmail = async (userToVerify: FirebaseUser) => {
    return await sendEmailVerification(userToVerify);
  };

  const value = { user, loading, login, signup, logout, loginWithGoogle, resetPassword, verifyEmail };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}