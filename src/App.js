import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useEffect, useState } from "react";

import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import HomePage from "./HomePage";

// Simple reusable skeleton components (you can style them better in CSS)
const SkeletonBox = ({ height = "100px", width = "100%", className = "" }) => (
  <div
    className={`skeleton-box ${className}`}
    style={{
      height,
      width,
      background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
      backgroundSize: "200% 100%",
      animation: "skeleton-loading 1.5s infinite",
      borderRadius: "12px",
    }}
  />
);

const SkeletonText = ({ width = "80%", height = "20px" }) => (
  <SkeletonBox height={height} width={width} />
);

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Show a skeleton version of your homepage while loading
  if (loading) {
    return (
      <div
        className="homepage-container"
        style={{
          display: "flex",
          height: "100vh",
          background: "var(--bg-color)",
          padding: "20px",
          gap: "20px",
          flexDirection: "column",
        }}
      >
        {/* Top bar / header skeleton */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SkeletonText width="200px" height="40px" /> {/* Title / logo */}
          <div style={{ display: "flex", gap: "16px" }}>
            <SkeletonBox height="40px" width="40px" /> {/* Icon buttons */}
            <SkeletonBox height="40px" width="40px" />
          </div>
        </div>

        {/* Main content area - two-column layout like your homepage */}
        <div style={{ flex: 1, display: "flex", gap: "20px" }}>
          {/* Left column - big panels + chart area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Top boxes */}
            <div style={{ display: "flex", gap: "20px" }}>
              <SkeletonBox height="180px" width="50%" />
              <SkeletonBox height="180px" width="50%" />
            </div>

            {/* Bottom chart area */}
            <SkeletonBox height="400px" width="100%" /> {/* Big chart placeholder */}
          </div>

          {/* Right column - flip box / balance */}
          <div style={{ width: "400px" }}>
            <SkeletonBox height="600px" width="100%" /> {/* Flip container */}
          </div>
        </div>

        {/* Bottom floating elements / buttons */}
        <div style={{ position: "absolute", bottom: "20px", right: "20px", display: "flex", gap: "12px" }}>
          <SkeletonBox height="48px" width="48px" />
          <SkeletonBox height="48px" width="48px" />
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/home/" /> : <LoginPage />} />
        <Route path="/register" element={session ? <Navigate to="/home/" /> : <RegisterPage />} />
        <Route path="/home/*" element={session ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}