import React, { useState } from "react";
import {
  Car,
  User,
  Shield,
  Wallet,
  Bell,
  Bot,
  LogOut,
  ChevronDown,
  Sparkles,
  Smartphone
} from "lucide-react";
import { UserRole } from "../../types";
import { supabase } from "../../lib/supabase";

interface NavbarProps {
  currentModule: "passenger" | "driver" | "admin";
  onSelectModule: (module: "passenger" | "driver" | "admin") => void;
  onOpenAuth: () => void;
  onOpenAiSupport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentModule,
  onSelectModule,
  onOpenAuth,
  onOpenAiSupport
}) => {
  const currentUser = supabase.getCurrentUser();
  const wallet = currentUser ? supabase.getWallet(currentUser.id) : null;
  const notifications = currentUser ? supabase.getNotifications(currentUser.id) : [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    supabase.setCurrentUser(null);
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0b1329]/95 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
              Drive<span className="text-emerald-400">Cash</span>
            </span>
            <span className="block text-[10px] text-emerald-400/80 font-semibold tracking-wider uppercase">
              Mobilidade & Recompensas
            </span>
          </div>
        </div>

        {/* Module Switcher Tabs */}
        <div className="hidden md:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onSelectModule("passenger")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentModule === "passenger"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <User className="w-3.5 h-3.5" /> Passageiro
          </button>
          <button
            onClick={() => onSelectModule("driver")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentModule === "driver"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Car className="w-3.5 h-3.5" /> Motorista
          </button>
          <button
            onClick={() => onSelectModule("admin")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentModule === "admin"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Painel Admin
          </button>
        </div>

        {/* Right Action Items */}
        <div className="flex items-center gap-3">
          {/* DriveCash Wallet Pill */}
          {wallet && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <div className="flex items-center gap-1.5">
                <span className="text-white">R$ {wallet.balance.toFixed(2)}</span>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3" /> {wallet.drivecash_points} pts
                </span>
              </div>
            </div>
          )}

          {/* AI Support Assistant Button */}
          <button
            onClick={onOpenAiSupport}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            title="Assistente de Suporte IA"
          >
            <Bot className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">IA Suporte</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#0b1329]" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="font-bold text-white">Notificações</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">DriveCash</span>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">Nenhuma notificação recente.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <p className="font-bold text-slate-200">{n.title}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{n.message}</p>
                        <span className="text-[9px] text-slate-500 block mt-1">
                          {new Date(n.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Account / Auth Dropdown */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 p-1.5 pl-2.5 rounded-xl text-xs font-bold transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-[10px]">
                  {currentUser.name.charAt(0)}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">{currentUser.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-slate-400 text-[10px] truncate">{currentUser.email}</p>
                    <span className="inline-block mt-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {currentUser.role.toUpperCase()}
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 mt-1 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 font-semibold flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sair da Conta
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
            >
              <Smartphone className="w-4 h-4" /> Entrar / Cadastrar
            </button>
          )}
        </div>
      </div>

      {/* Mobile Module Navigation Bar */}
      <div className="md:hidden flex border-t border-slate-800/80 bg-slate-950 px-2 py-1.5 justify-around text-[11px] font-bold">
        <button
          onClick={() => onSelectModule("passenger")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
            currentModule === "passenger" ? "bg-emerald-500 text-slate-950" : "text-slate-400"
          }`}
        >
          <User className="w-3.5 h-3.5" /> Passageiro
        </button>
        <button
          onClick={() => onSelectModule("driver")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
            currentModule === "driver" ? "bg-emerald-500 text-slate-950" : "text-slate-400"
          }`}
        >
          <Car className="w-3.5 h-3.5" /> Motorista
        </button>
        <button
          onClick={() => onSelectModule("admin")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
            currentModule === "admin" ? "bg-emerald-500 text-slate-950" : "text-slate-400"
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Admin
        </button>
      </div>
    </header>
  );
};
