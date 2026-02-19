import { createContext, useContext, useEffect, useState } from "react";
// Importem el tipus ReactNode explícitament
import type { ReactNode } from "react"; 

import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInWithPopup,      
  GoogleAuthProvider,
  // 👇 FIX: Afegim 'type' aquí perquè això és només una interfície
  type User as FirebaseUser    
} from "firebase/auth";

import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase"; 

// Definim el tipus d'usuari complet (Auth + Dades BD)
export interface User extends Partial<FirebaseUser> {
  uid: string;
  email: string | null;
  is_vip?: boolean;
  daily_usage?: {
    date: string;
    counts: Record<string, number>;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 ELIMINEM EL RETARD (FLICKER)
  useEffect(() => {
    // 1. Escoltem els canvis de Login/Logout
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        
        // 2. 🔥 ESCOLTEM LA BASE DE DADES EN TEMPS REAL 🔥
        const unsubscribeSnapshot = onSnapshot(userDocRef, (userDoc) => {
          let firestoreData = {};
          if (userDoc.exists()) {
            firestoreData = userDoc.data();
          }

          // Qualsevol canvi a Firestore (ex: is_vip passa a true) s'aplica al moment!
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            ...firestoreData,
          });
          setLoading(false);
        }, (error) => {
          console.error("Error escoltant Firestore:", error);
          setLoading(false);
        });

        // Quan l'usuari fa logout, tanquem el "tub" de dades
        return () => unsubscribeSnapshot();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    loginWithGoogle 
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}