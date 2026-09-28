import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { User } from "@/types/auth";
import { authAPI } from "@/services/api";

// Pages & Layouts
import ActivationPage from "@/pages/ActivationPage";
import ClaimPage from "@/pages/ClaimPage";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import SuperAdminPage from "@/pages/SuperAdminPage";
import MainLayout from "@/layouts/MainLayout";
import GoldenDashboard from "@/pages/GoldenDashboard";
import HomePage from "./pages/HomePage";
import POSPage from "@/pages/POSPage";
import CRMPage from "@/pages/CRMPage";
import InventoryPage from "@/pages/InventoryPage";
import ReportsPage from "@/pages/ReportsPage";
import CollectionPage from "@/pages/CollectionPage";
import SettingsPage from "@/pages/SettingsPage";
import UserManagementPage from "@/pages/UserManagementPage";
import HRPage from "@/pages/HRPage";
import AttendancePage from "@/pages/AttendancePage";
import LegalPage from "@/pages/LegalPage";
import NotificationsPage from "@/pages/NotificationsPage";
import LoadingScreen from "@/components/LoadingScreen";
import SuppliersPage from "@/pages/SuppliersPage";
import PurchasesPage from "@/pages/PurchasesPage";
import DataBridgePage from "@/pages/DataBridgePage";
import AuditPage from "@/pages/AuditPage";
import PartnersPage from "@/pages/PartnersPage";
import SurveyPage from "@/pages/SurveyPage";
import ShiftsPage from "@/pages/ShiftsPage";
import VaultsPage from "./pages/VaultsPage";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      // 1. Check License Key
      const storedLicense = localStorage.getItem('ecofine_license_key');
      setLicenseKey(storedLicense);

      // 2. Check Backend Session (source of truth)
      try {
        const token = localStorage.getItem('ecofine_auth_token');
        if (!token) {
          setUser(null);
        } else {
          // Validate session through backend
          const userData = await authAPI.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        // Token invalid or expired
        localStorage.removeItem('ecofine_auth_token');
        localStorage.removeItem('ecofine_session');
        setUser(null);
      }

      setIsLoading(false);
    };

    const handleLicenseKeyUpdated = () => {
      setLicenseKey(localStorage.getItem('ecofine_license_key'));
    };

    window.addEventListener('ecofine_license_key_updated', handleLicenseKeyUpdated);
    initApp();

    return () => {
      window.removeEventListener('ecofine_license_key_updated', handleLicenseKeyUpdated);
    };
  }, []);

  // Complete the handleLogout function in App.tsx
  const handleLogout = async () => {
      try {
          await authAPI.logout();
      } catch (error) {
          console.error('Logout error:', error);
      } finally {
          localStorage.removeItem('ecofine_auth_token');
          localStorage.removeItem('ecofine_session');
          localStorage.removeItem('ecofine_last_activity');
          // We keep the license key so they don't have to re-enter it
          setUser(null);
      }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        {/*
          SCENARIO 1: NO LICENSE KEY
          Trap the user on /activate until they verify a key.
        */}
        {!licenseKey ? (
          <>
            <Route path="/activate" element={<ActivationPage />} />
            <Route path="/claim" element={<ClaimPage />} />
            <Route path="*" element={<Navigate to="/activate" replace />} />
          </>
        ) :
        /*
          SCENARIO 2: HAS LICENSE KEY, BUT NO SESSION
          Allow only public auth routes.
        */
        !user ? (
          <>
            <Route path="/login" element={<LoginPage onLogin={(u) => setUser(u)} />} />
            <Route path="/claim" element={<ClaimPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) :
        /*
          SCENARIO 3: LOGGED IN AS SUPER ADMIN
          Force them to /sa.
        */
        user?.isSuperAdmin ? (
          <>
            <Route path="/sa" element={<SuperAdminPage />} />
            <Route path="*" element={<Navigate to="/sa" replace />} />
          </>
        ) :
        /*
          SCENARIO 4: LOGGED IN AS NORMAL USER
          Give them access to the main app.
        */
        (
          <>
            <Route path="/" element={<MainLayout user={user!} onLogout={handleLogout} />}>
              <Route index element={<HomePage currentUser={user!} />} />
              <Route path="golden" element={<GoldenDashboard currentUser={user!} />} />
              <Route path="pos" element={<POSPage />} />
              <Route path="crm" element={<CRMPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="purchases" element={<PurchasesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="collection" element={<CollectionPage currentUser={user!} />} />
              <Route path="settings" element={<SettingsPage currentUser={user!} />} />
              <Route path="users" element={<UserManagementPage currentUser={user!} />} />
              <Route path="hr" element={<HRPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="legal" element={<LegalPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="data-bridge" element={<DataBridgePage />} />
              <Route path="audit" element={<AuditPage currentUser={user!} />} />
              <Route path="partners" element={<PartnersPage currentUser={user!} />} />
              <Route path="surveys" element={<SurveyPage currentUser={user!} />} />
              <Route path="shifts" element={<ShiftsPage currentUser={user!} />} />
              <Route path="vaults" element={<VaultsPage />} />
            </Route>
            
            <Route path="/sa" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/claim" element={<Navigate to="/" replace />} />
            <Route path="/activate" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}