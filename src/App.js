import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useEffect, useState } from "react";

import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import HomePage from "./HomePage";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load session on start
  useEffect(() => {
    const currentSession = supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>

        {/* Login & Register */}
        <Route 
          path="/login" 
          element={session ? <Navigate to="/home/" /> : <LoginPage />} 
        />
        <Route 
          path="/register" 
          element={session ? <Navigate to="/home/" /> : <RegisterPage />} 
        />

        {/* Protected area */}
        <Route 
          path="/home/*" 
          element={session ? <HomePage /> : <Navigate to="/login" />} 
        />

        {/* Default → go to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
