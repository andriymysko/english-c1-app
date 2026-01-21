import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ExerciseGenerator from "./components/ExerciseGenerator"; // Aquest és el Dashboard
import Login from "./components/Login";
import Landing from "./components/Landing";

function AppContent() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  // 1. Si tenim usuari, anem directes al Dashboard
  if (user) {
    return <ExerciseGenerator />;
  }

  // 2. Si no, o mostrem el Login...
  if (showLogin) {
    return <Login />;
  }

  // 3. ... o mostrem la Landing Page
  return <Landing onGetStarted={() => setShowLogin(true)} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;