import React, { useState, useEffect } from "react";
import { X, Mail, Phone, Lock, UserCheck, Car, User, ArrowRight, Calendar, CreditCard, ShieldCheck, Camera, AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { validateCPF, formatCPF, formatPhone, validateEmail } from "../../lib/validators";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  promptMessage?: string | null;
  initialTab?: "login" | "register";
  initialRole?: "passenger" | "driver";
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  promptMessage,
  initialTab = "login",
  initialRole = "passenger"
}) => {
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [role, setRole] = useState<"passenger" | "driver">(initialRole);

  // Sync tab & role when modal opens with new initial props
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setTab(initialTab);
      if (initialRole) setRole(initialRole);
    }
  }, [isOpen, initialTab, initialRole]);

  // Form states for login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registration Form States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // Driver extra fields
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [plate, setPlate] = useState("");
  const [cnhFileName, setCnhFileName] = useState("");
  const [crlvFileName, setCrlvFileName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (loginMethod === "email") {
        if (!loginEmail.trim()) {
          setError("Digite seu e-mail.");
          setLoading(false);
          return;
        }
        if (!loginPassword) {
          setError("Digite sua senha de acesso.");
          setLoading(false);
          return;
        }
        await supabase.loginWithEmail(loginEmail, loginPassword);
      } else {
        const cleanP = loginPhone.replace(/\D/g, "");
        if (!cleanP || cleanP.length < 8) {
          setError("Digite um número de telefone com DDD válido.");
          setLoading(false);
          return;
        }
        await supabase.loginWithPhone(loginPhone);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao efetuar login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!name.trim()) {
      setError("Por favor, informe seu nome completo.");
      setLoading(false);
      return;
    }

    if (!phone.trim()) {
      setError("Por favor, informe seu número de telefone.");
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError("Por favor, informe um e-mail válido.");
      setLoading(false);
      return;
    }

    if (!password) {
      setError("Informe uma senha de acesso.");
      setLoading(false);
      return;
    }

    try {
      await supabase.registerUser({
        name: name.trim(),
        email: email.trim(),
        phone: formatPhone(phone),
        password,
        role,
        avatar: avatarUrl || undefined,
        cpf: cpf ? formatCPF(cpf) : undefined,
        birthDate: birthDate || undefined,
        vehicleModel: role === "driver" ? vehicleModel || "Chevrolet Onix" : undefined,
        vehicleColor: role === "driver" ? vehicleColor || "Prata" : undefined,
        plate: role === "driver" ? plate || "DRV-2026" : undefined,
        licenseDoc: role === "driver" ? cnhFileName || undefined : undefined,
        vehicleDoc: role === "driver" ? crlvFileName || undefined : undefined,
        approvalStatus: role === "driver" ? "approved" : "approved"
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao realizar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-4 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-extrabold flex items-center justify-center mx-auto mb-2 shadow-lg shadow-emerald-500/20">
            <Car className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-white">DriveCash</h2>
          <p className="text-xs text-slate-400 mt-0.5">Sua mobilidade urbana com cashback em todas as corridas</p>
        </div>

        {/* Action Prompt Message Banner */}
        {promptMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-3 shrink-0 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="leading-relaxed">{promptMessage}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex bg-slate-900 p-1 rounded-2xl mb-4 border border-slate-800 shrink-0">
          <button
            onClick={() => {
              setTab("login");
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "login" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => {
              setTab("register");
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === "register" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Cadastrar
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium shrink-0 animate-in fade-in duration-200">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center font-medium shrink-0 animate-in fade-in duration-200">
            {successMsg}
          </div>
        )}

        {/* Form Body Scrollable Container */}
        <div className="overflow-y-auto pr-1 custom-scrollbar space-y-4">
          {/* LOGIN FORM */}
          {tab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="flex justify-center gap-4 text-xs font-semibold mb-2">
                <button
                  type="button"
                  onClick={() => setLoginMethod("email")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border transition-all ${
                    loginMethod === "email"
                      ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                      : "border-slate-800 text-slate-400"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod("phone")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border transition-all ${
                    loginMethod === "phone"
                      ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                      : "border-slate-800 text-slate-400"
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" /> Telefone
                </button>
              </div>

              {loginMethod === "email" ? (
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-bold">Endereço de E-mail</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-bold">Número de Celular com DDD</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(formatPhone(e.target.value))}
                      placeholder="(11) 99999-8888"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-bold">Senha de Acesso</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {loading ? "Entrando..." : "Acessar Plataforma"} <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {tab === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-bold">Tipo de Conta</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("passenger")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      role === "passenger"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" /> Passageiro
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("driver")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      role === "driver"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" /> Motorista
                  </button>
                </div>
              </div>

              {/* Personal Data Section Header */}
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs pt-1 border-t border-slate-800/80">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Cadastro Simples & Rápido</span>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-bold">Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Roberto da Silva"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Grid Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Phone */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-bold">Telefone / Celular</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(11) 98765-4321"
                      maxLength={15}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-bold">E-mail</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="carlos@exemplo.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-bold">Senha de Acesso</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Optional Profile Photo */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-bold flex items-center justify-between">
                  <span>Foto de Perfil <span className="text-slate-500 font-normal">(Opcional)</span></span>
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                </label>
                <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-emerald-500/50" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFile}
                    className="w-full text-[11px] text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30 cursor-pointer"
                  />
                </div>
              </div>

              {role === "driver" && (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 mt-2">
                  <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Dados do Veículo & Documentos</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="Modelo (ex: Onix)"
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600"
                    />
                    <input
                      type="text"
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                      placeholder="Cor (ex: Prata)"
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600"
                    />
                  </div>
                  <input
                    type="text"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    placeholder="Placa (ex: ABC-1D23)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 uppercase"
                  />

                  {/* Document Attachments */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Anexar CNH (PDF ou Foto)</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setCnhFileName(file.name);
                        }}
                        className="w-full text-[11px] text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30 cursor-pointer"
                      />
                      {cnhFileName && <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">✓ {cnhFileName}</span>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Anexar CRLV (Veículo)</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setCrlvFileName(file.name);
                        }}
                        className="w-full text-[11px] text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30 cursor-pointer"
                      />
                      {crlvFileName && <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">✓ {crlvFileName}</span>}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm mt-4 disabled:opacity-50"
              >
                {loading ? "Criando Conta..." : `Criar Conta de ${role === "driver" ? "Motorista" : "Passageiro"}`} <UserCheck className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
