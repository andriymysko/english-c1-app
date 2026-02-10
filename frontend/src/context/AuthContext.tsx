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

import { doc, getDoc } from "firebase/firestore";
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // 1. Llegim la base de dades AL MOMENT
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let firestoreData = {};
          if (userDoc.exists()) {
            firestoreData = userDoc.data();
          }

          // 2. Creem l'objecte complet immediatament
          const fullUser: User = {
            uid: currentUser.uid,
            email: currentUser.email,
            ...firestoreData, // Inserim is_vip: true
          };

          setUser(fullUser);
        } catch (error) {
          console.error("Error carregant dades extra:", error);
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
          });
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
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