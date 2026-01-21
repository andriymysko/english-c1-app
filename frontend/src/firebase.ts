import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
apiKey: "AIzaSyB3DD1Qt-0WpzDcRt_0c49LOY9apb_spvc",
  authDomain: "english-c1-app.firebaseapp.com",
  projectId: "english-c1-app",
  storageBucket: "english-c1-app.firebasestorage.app",
  messagingSenderId: "322986353692",
  appId: "1:322986353692:web:ccf1bbde35435dbde6ebd9"
};

// Inicialitzem l'app
const app = initializeApp(firebaseConfig);

// Exportem les eines d'autenticació
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();