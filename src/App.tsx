import React, { useState, useEffect } from "react";
import {
  Car,
  User,
  Shield,
  Wallet,
  History,
  Gift,
  Store,
  Target,
  Trophy,
  DollarSign,
  FileText,
  Bell,
  MessageSquare,
  Database,
  Sparkles
} from "lucide-react";
import { Navbar } from "./components/common/Navbar";
import { AuthModal } from "./components/auth/AuthModal";
import { SplashScreen } from "./components/auth/SplashScreen";
import { AiSupportModal } from "./components/common/AiSupportModal";

// Passenger Views
import { PassengerHome } from "./components/passenger/PassengerHome";
import { PassengerWalletView } from "./components/passenger/PassengerWallet";
import { PassengerHistoryView } from "./components/passenger/PassengerHistory";
import { PartnerClubView } from "./components/passenger/PartnerClub";
import { MissionsView } from "./components/passenger/MissionsView";
import { PassengerRankingView } from "./components/passenger/PassengerRanking";
import { ReferralProgramView } from "./components/passenger/ReferralProgram";
import { PassengerProfileView } from "./components/passenger/PassengerProfile";

// Driver Views
import { DriverDashboard } from "./components/driver/DriverDashboard";
import { DriverEarningsView } from "./components/driver/DriverEarnings";
import { DriverSubscriptionView } from "./components/driver/DriverSubscription";
import { DriverProfileView } from "./components/driver/DriverProfile";

// Admin Views
import { AdminDashboardView } from "./components/admin/AdminDashboard";
import { DriverApprovalView } from "./components/admin/DriverApproval";
import { DriveCashManagerView } from "./components/admin/DriveCashManager";
import { PushNotificationManagerView } from "./components/admin/PushNotificationManager";
import { SupportManagerView } from "./components/admin/SupportManager";
import { DatabaseSchemaViewer } from "./components/admin/DatabaseSchemaViewer";

import { supabase } from "./lib/supabase";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { openAuthModal } = useAuth();

  const [showSplash, setShowSplash] = useState(true);
  const [currentModule, setCurrentModule] = useState<"passenger" | "driver" | "admin">("passenger");
  const [passengerTab, setPassengerTab] = useState<"home" | "wallet" | "history" | "partners" | "missions" | "ranking" | "referral" | "profile">("home");
  const [driverTab, setDriverTab] = useState<"dashboard" | "earnings" | "subscription" | "profile">("dashboard");
  const [adminTab, setAdminTab] = useState<"dashboard" | "approvals" | "drivecash" | "push" | "support" | "database">("dashboard");

  const [isAiSupportOpen, setIsAiSupportOpen] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = supabase.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  const currentUser = supabase.getCurrentUser();

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#0b1329] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header Navigation */}
      <Navbar
        currentModule={currentModule}
        onSelectModule={(m) => setCurrentModule(m)}
        onOpenAuth={() => openAuthModal()}
        onOpenAiSupport={() => setIsAiSupportOpen(true)}
      />

      {/* Main Sub-Navigation Bar */}
      <div className="bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-sm sticky top-16 z-30 overflow-x-auto scrollbar-none py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs font-bold whitespace-nowrap">
          {/* PASSENGER MODULE SUBTABS */}
          {currentModule === "passenger" && (
            <>
              <button
                onClick={() => setPassengerTab("home")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  passengerTab === "home" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <Car className="w-4 h-4" /> Solitar Corrida
              </button>
              <button
                onClick={() => setPassengerTab("wallet")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  passengerTab === "wallet" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <Wallet className="w-4 h-4" /> Carteira DriveCash
              </button>
              <button
                onClick={() => setPassengerTab("partners")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  passengerTab === "partners" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <Store className="w-4 h-4" /> Clube de Parceiros
              </button>
              <button
                onClick={() => setPassengerTab("missions")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  passengerTab === "missions" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <Target className="w-4 h-4" /> Missões
              </button>
              <button
                onClick={() => setPassengerTab("ranking")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  passengerTab === "ranking" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <Trophy className="w-4 h-4" /> Ranking
              </button>
              <button
                onClick={() => setPassengerTab("referral")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  passengerTab === "referral" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <Gift className="w-4 h-4" /> Indicação
              </button>
              <button
                onClick={() => setPassengerTab("history")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  passengerTab === "history" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <History className="w-4 h-4" /> Histórico
              </button>
              <button
                onClick={() => setPassengerTab("profile")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  passengerTab === "profile" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <User className="w-4 h-4" /> Perfil
              </button>
            </>
          )}

          {/* DRIVER MODULE SUBTABS */}
          {currentModule === "driver" && (
            <>
              <button
                onClick={() => setDriverTab("dashboard")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  driverTab === "dashboard" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <Car className="w-4 h-4" /> Painel de Corridas
              </button>
              <button
                onClick={() => setDriverTab("subscription")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  driverTab === "subscription" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <Sparkles className="w-4 h-4" /> Assinatura & Mercado Pago
              </button>
              <button
                onClick={() => setDriverTab("earnings")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  driverTab === "earnings" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <DollarSign className="w-4 h-4" /> Rendimentos
              </button>
              <button
                onClick={() => setDriverTab("profile")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  driverTab === "profile" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4" /> Documentos CNH/CRLV
              </button>
            </>
          )}

          {/* ADMIN MODULE SUBTABS */}
          {currentModule === "admin" && (
            <>
              <button
                onClick={() => setAdminTab("dashboard")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  adminTab === "dashboard" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <Shield className="w-4 h-4" /> Visão Geral
              </button>
              <button
                onClick={() => setAdminTab("approvals")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  adminTab === "approvals" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <Car className="w-4 h-4" /> Aprovação de Motoristas
              </button>
              <button
                onClick={() => setAdminTab("drivecash")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  adminTab === "drivecash" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <Sparkles className="w-4 h-4" /> Programa DriveCash
              </button>
              <button
                onClick={() => setAdminTab("push")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  adminTab === "push" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <Bell className="w-4 h-4" /> Push Notifications
              </button>
              <button
                onClick={() => setAdminTab("support")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  adminTab === "support" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <MessageSquare className="w-4 h-4" /> Suporte & Chamados
              </button>
              <button
                onClick={() => setAdminTab("database")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all ${
                  adminTab === "database" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <Database className="w-4 h-4" /> Banco de Dados & RLS
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* PASSENGER VIEWS */}
        {currentModule === "passenger" && (
          <>
            {passengerTab === "home" && <PassengerHome />}
            {passengerTab === "wallet" && <PassengerWalletView />}
            {passengerTab === "history" && <PassengerHistoryView />}
            {passengerTab === "partners" && <PartnerClubView />}
            {passengerTab === "missions" && <MissionsView />}
            {passengerTab === "ranking" && <PassengerRankingView />}
            {passengerTab === "referral" && <ReferralProgramView />}
            {passengerTab === "profile" && <PassengerProfileView />}
          </>
        )}

        {/* DRIVER VIEWS */}
        {currentModule === "driver" && (
          <>
            {driverTab === "dashboard" && (
              <DriverDashboard onOpenSubscriptions={() => setDriverTab("subscription")} />
            )}
            {driverTab === "earnings" && <DriverEarningsView />}
            {driverTab === "subscription" && <DriverSubscriptionView />}
            {driverTab === "profile" && <DriverProfileView />}
          </>
        )}

        {/* ADMIN VIEWS */}
        {currentModule === "admin" && (
          <>
            {adminTab === "dashboard" && <AdminDashboardView />}
            {adminTab === "approvals" && <DriverApprovalView />}
            {adminTab === "drivecash" && <DriveCashManagerView />}
            {adminTab === "push" && <PushNotificationManagerView />}
            {adminTab === "support" && <SupportManagerView />}
            {adminTab === "database" && <DatabaseSchemaViewer />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0b1329] py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 DriveCash Brasil. Plataforma de Mobilidade Urbana com Recompensas.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Privacidade & RLS</span>
            <span>Termos do Motorista</span>
            <span>Mercado Pago SSL</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AiSupportModal
        isOpen={isAiSupportOpen}
        onClose={() => setIsAiSupportOpen(false)}
        userRole={currentModule}
        userName={currentUser?.name || "Usuário"}
      />
    </div>
  );
}
