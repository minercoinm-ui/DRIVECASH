import React, { useState, useEffect } from "react";
import {
  Car,
  Power,
  Navigation,
  MapPin,
  Clock,
  DollarSign,
  Star,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  X,
  Sparkles,
  Phone,
  MessageSquare,
  FileText,
  Upload,
  ShieldCheck,
  Zap,
  Loader2,
  LogIn,
  BellRing,
  Radar,
  Flame
} from "lucide-react";
import { MapComponent } from "../common/Map";
import { supabase } from "../../lib/supabase";
import { Ride, Driver } from "../../types";
import { playRideAlert, stopRideAlert, playSuccessChime } from "../../lib/audioUtils";
import { useAuth } from "../../context/AuthContext";
import { RideChatModal } from "../passenger/RideChatModal";

interface DriverDashboardProps {
  onOpenSubscriptions: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onOpenSubscriptions }) => {
  const { requireAuth } = useAuth();
  const currentUser = supabase.getCurrentUser();
  const [driver, setDriver] = useState<Driver | null>(() =>
    currentUser ? supabase.getDriverByUserId(currentUser.id) || null : null
  );

  const [isOnline, setIsOnline] = useState(driver?.status === "online");
  const [incomingRequest, setIncomingRequest] = useState<Ride | null>(null);
  const [acceptedRide, setAcceptedRide] = useState<Ride | null>(null);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [declinedRideIds, setDeclinedRideIds] = useState<string[]>([]);
  const [rideCountdown, setRideCountdown] = useState<number>(15);
  const [isDriverChatOpen, setIsDriverChatOpen] = useState<boolean>(false);

  const isSearchingRides = isOnline && !acceptedRide && !incomingRequest;

  // Sync driver state from database in real-time
  useEffect(() => {
    const syncDriver = () => {
      if (currentUser) {
        const d = supabase.getDriverByUserId(currentUser.id);
        if (d) setDriver({ ...d });
      }
    };
    syncDriver();
    const unsubscribe = supabase.subscribe(syncDriver);
    return unsubscribe;
  }, [currentUser?.id]);

  // Document Upload and Verification States
  const [cnhFileName, setCnhFileName] = useState(driver?.license_doc || "");
  const [crlvFileName, setCrlvFileName] = useState(driver?.vehicle_doc || "");
  const [isAnalyzing, setIsAnalyzing] = useState(driver?.approval_status === "in_review");
  const [timerSeconds, setTimerSeconds] = useState(60);

  // GPS Location Tracking States
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("GPS do dispositivo pronto.");
  const [customLatInput, setCustomLatInput] = useState(driver?.lat ? String(driver.lat) : "");
  const [customLngInput, setCustomLngInput] = useState(driver?.lng ? String(driver.lng) : "");

  // Fetch Exact GPS Location from Device Browser (iOS Safari, Android, Desktop compatible)
  const fetchExactLocation = () => {
    if (!currentUser) return;

    if (!("geolocation" in navigator)) {
      setGpsStatus("Geolocalização não é suportada neste dispositivo/navegador.");
      setIsGpsActive(false);
      return;
    }

    setGpsStatus("Buscando sinal GPS do dispositivo...");

    const handleLocationSuccess = (pos: GeolocationPosition, isFallback = false) => {
      const latitude = pos.coords.latitude;
      const longitude = pos.coords.longitude;
      supabase.updateDriverLocation(currentUser.id, latitude, longitude);
      const source = isFallback ? "Wi-Fi/Rede Celular" : "GPS de Alta Precisão";
      setGpsStatus(`GPS Ativo (${source}): Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`);
      setIsGpsActive(true);
      setCustomLatInput(String(latitude));
      setCustomLngInput(String(longitude));
    };

    const handleHighAccuracyError = (err: GeolocationPositionError) => {
      console.warn("GPS de alta precisão falhou/expirou. Tentando modo de rede...", err.code, err.message);

      if (err.code === err.PERMISSION_DENIED) {
        setGpsStatus("Permissão de GPS negada. Por favor, libere a localização no Safari/Configurações do iPhone.");
        setIsGpsActive(false);
        return;
      }

      // Fallback for Safari/iOS or indoor locations with low accuracy / cellular network
      setGpsStatus("Obtendo posição via rede de dados/Wi-Fi...");
      navigator.geolocation.getCurrentPosition(
        (pos) => handleLocationSuccess(pos, true),
        (fallbackErr) => {
          console.warn("Fallback de localização também falhou:", fallbackErr.code, fallbackErr.message);
          if (fallbackErr.code === fallbackErr.PERMISSION_DENIED) {
            setGpsStatus("Acesso à localização negado no Safari. Ajuste em Ajustes > Privacidade > Serviços de Localização.");
          } else {
            setGpsStatus("Sinal de GPS indisponível no momento. Insira as coordenadas manualmente abaixo.");
          }
          setIsGpsActive(false);
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
      );
    };

    // Primary attempt: High Accuracy with reasonable timeout for mobile GPS
    navigator.geolocation.getCurrentPosition(
      (pos) => handleLocationSuccess(pos, false),
      handleHighAccuracyError,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  };

  // Watch position when driver is online
  useEffect(() => {
    if (!isOnline || !currentUser) return;

    fetchExactLocation();

    let watchId: number | null = null;
    if ("geolocation" in navigator) {
      const handleWatchSuccess = (pos: GeolocationPosition) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        supabase.updateDriverLocation(currentUser.id, latitude, longitude);
        setGpsStatus(`GPS ao vivo: Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`);
        setIsGpsActive(true);
        setCustomLatInput(String(latitude));
        setCustomLngInput(String(longitude));
      };

      const handleWatchError = (err: GeolocationPositionError) => {
        console.warn("Watch position notice:", err.code, err.message);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus("Permissão de GPS revogada ou negada no Safari.");
          setIsGpsActive(false);
        }
      };

      watchId = navigator.geolocation.watchPosition(
        handleWatchSuccess,
        handleWatchError,
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 }
      );
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [isOnline, currentUser?.id]);

  const handleManualLocationUpdate = () => {
    if (!currentUser) return;
    const latNum = parseFloat(customLatInput);
    const lngNum = parseFloat(customLngInput);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      supabase.updateDriverLocation(currentUser.id, latNum, lngNum);
      setGpsStatus(`Localização definida manualmente: Lat ${latNum.toFixed(4)}, Lng ${lngNum.toFixed(4)}`);
      setIsGpsActive(true);
    } else {
      alert("Por favor, digite valores válidos para latitude e longitude.");
    }
  };

  // Check Subscription Status
  const isSubscriptionExpired = !driver?.active_plan;

  // Sync real ride requests and accepted rides from database in real-time
  useEffect(() => {
    const syncRides = () => {
      const allRides = supabase.getRides();

      if (driver) {
        const active = allRides.find(
          (r) => (r.driver_id === driver.user_id || r.driver_id === currentUser?.id) && r.status !== "completed" && r.status !== "cancelled"
        );
        if (active) {
          setAcceptedRide(active);
          setIncomingRequest(null);
          return;
        } else {
          setAcceptedRide(null);
        }
      }

      if (isOnline) {
        const searchingRide = allRides.find(
          (r) => r.status === "searching" && !declinedRideIds.includes(r.id)
        );
        if (searchingRide) {
          if (!incomingRequest || incomingRequest.id !== searchingRide.id) {
            setIncomingRequest(searchingRide);
            playRideAlert();
          }
        } else {
          if (incomingRequest) {
            stopRideAlert();
          }
          setIncomingRequest(null);
        }
      } else {
        if (incomingRequest) {
          stopRideAlert();
        }
        setIncomingRequest(null);
      }
    };

    syncRides();
    const unsubscribe = supabase.subscribe(syncRides);
    const interval = setInterval(syncRides, 1000);
    return () => {
      stopRideAlert();
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOnline, driver?.user_id, currentUser?.id, incomingRequest?.id, declinedRideIds]);

  // 15-Second Uber/99 Countdown Timer for Incoming Ride Requests
  useEffect(() => {
    if (!incomingRequest) {
      setRideCountdown(15);
      return;
    }

    setRideCountdown(15);
    const timer = setInterval(() => {
      setRideCountdown((prev) => {
        if (prev <= 1) {
          stopRideAlert();
          if (incomingRequest?.id) {
            setDeclinedRideIds((declined) => [...declined, incomingRequest.id]);
          }
          setIncomingRequest(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingRequest?.id]);

  // 1-Minute Live Approval Timer Effect
  useEffect(() => {
    let interval: any;
    if (isAnalyzing && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (isAnalyzing && timerSeconds === 0) {
      setIsAnalyzing(false);
      if (driver) {
        supabase.setDriverApproval(driver.id, "approved");
        playSuccessChime();
        setIsOnline(true);
      }
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, timerSeconds, driver?.id]);

  const handleStartDocumentAnalysis = () => {
    if (!currentUser || !driver) return;
    const finalCnh = cnhFileName || "cnh_motorista.pdf";
    const finalCrlv = crlvFileName || "crlv_veiculo.pdf";
    setCnhFileName(finalCnh);
    setCrlvFileName(finalCrlv);

    supabase.updateDriverDocuments(currentUser.id, finalCnh, finalCrlv);
    setIsAnalyzing(true);
    setTimerSeconds(60);
  };

  const handleInstantApprove = () => {
    if (!driver) return;
    supabase.setDriverApproval(driver.id, "approved");
    setIsAnalyzing(false);
    setTimerSeconds(0);
    setIsOnline(true);
    playSuccessChime();
  };

  // Handle Online Toggle
  const handleToggleOnline = async () => {
    if (driver?.approval_status !== "approved") {
      alert("Seu cadastro de motorista precisa ser aprovado para você ficar online. Envie os documentos abaixo!");
      return;
    }

    if (isSubscriptionExpired) {
      alert("Sua assinatura do plano de motorista está inativa ou expirou. Renove seu plano para ficar online!");
      onOpenSubscriptions();
      return;
    }

    requireAuth(
      async () => {
        const nextStatus = isOnline ? "offline" : "online";
        setIsOnline(!isOnline);
        const u = supabase.getCurrentUser();
        if (u) {
          await supabase.setDriverStatus(u.id, nextStatus);
        }
      },
      "Para ficar online e receber solicitações de corrida, faça login ou cadastre-se como motorista.",
      "driver"
    );
  };

  // Ride Action Handlers
  const handleAcceptRide = async () => {
    stopRideAlert();
    requireAuth(
      async () => {
        if (!incomingRequest || !driver) return;
        const updated = await supabase.updateRideStatus(incomingRequest.id, "accepted", driver);
        setAcceptedRide(updated || incomingRequest);
        setIncomingRequest(null);
        playSuccessChime();
      },
      "Para aceitar corridas de passageiros, entre na sua conta de motorista.",
      "driver"
    );
  };

  const handleDeclineRide = () => {
    stopRideAlert();
    if (incomingRequest) {
      setDeclinedRideIds((prev) => [...prev, incomingRequest.id]);
    }
    setIncomingRequest(null);
    setRideCountdown(15);
  };

  const handleArrived = async () => {
    requireAuth(
      async () => {
        if (!acceptedRide) return;
        const updated = await supabase.updateRideStatus(acceptedRide.id, "arriving");
        setAcceptedRide({ ...(updated || acceptedRide), status: "arriving" });
      },
      "Faça login para gerenciar o status da corrida.",
      "driver"
    );
  };

  const handleStartRide = async () => {
    requireAuth(
      async () => {
        if (!acceptedRide) return;
        const updated = await supabase.updateRideStatus(acceptedRide.id, "in_progress");
        setAcceptedRide({ ...(updated || acceptedRide), status: "in_progress" });
      },
      "Faça login para gerenciar o status da corrida.",
      "driver"
    );
  };

  const handleFinishRide = async () => {
    requireAuth(
      async () => {
        if (!acceptedRide) return;
        await supabase.updateRideStatus(acceptedRide.id, "completed");
        playSuccessChime();
        alert("Corrida finalizada! Valor creditado em sua carteira.");
        setAcceptedRide(null);
      },
      "Faça login para finalizar a corrida.",
      "driver"
    );
  };

  if (!currentUser) {
    return (
      <div className="bg-[#0b1329] border border-slate-800 rounded-3xl p-8 text-center max-w-xl mx-auto space-y-5 shadow-2xl my-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <Car className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white">Área Exclusiva para Motoristas</h3>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Para visualizar chamadas de corridas ao vivo, ficar online no mapa e faturar com a taxa zero do DriveCash, faça seu cadastro ou entre com sua conta.
          </p>
        </div>
        <button
          onClick={() =>
            requireAuth(
              () => {},
              "Para acessar a área do motorista e aceitar corridas, faça seu cadastro ou entre na sua conta.",
              "driver"
            )
          }
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3.5 px-6 rounded-2xl text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          <LogIn className="w-5 h-5" /> Cadastrar-se ou Entrar como Motorista
        </button>
      </div>
    );
  }

  if (!driver) return null;

  return (
    <div className="space-y-6">
      {/* Subscription Expiration Alert Banner */}
      {isSubscriptionExpired && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-3xl p-5 text-amber-300 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <h4 className="font-extrabold text-sm text-white">Assinatura de Motorista Inativa</h4>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Para aceitar corridas e ficar online no mapa, escolha o Plano Essencial (R$ 79,90) ou Premium (R$ 119,90).
              </p>
            </div>
          </div>
          <button
            onClick={onOpenSubscriptions}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition-all shrink-0"
          >
            Assinar Agora
          </button>
        </div>
      )}

      {/* Driver Document Verification & 1-Minute Live Approval Card */}
      {driver.approval_status !== "approved" && (
        <div className="bg-gradient-to-br from-[#0e1a38] to-[#091124] border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white flex flex-wrap items-center gap-2">
                  Análise de Documentação do Motorista
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
                    Aprovação em 1 Minuto
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Envie sua CNH (com EAR) e o documento do veículo (CRLV) para liberação de cadastro.
                </p>
              </div>
            </div>

            <button
              onClick={handleInstantApprove}
              className="flex items-center justify-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-md shrink-0"
            >
              <Zap className="w-4 h-4 fill-slate-950" /> Aprovar Instantaneamente
            </button>
          </div>

          {/* Real File Upload Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CNH Box */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" /> CNH com Atividade Remunerada (EAR)
                </span>
                {cnhFileName && (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Anexado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Selecione ou tire foto legível da sua CNH válida.</p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setCnhFileName(f.name);
                }}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30 cursor-pointer"
              />
              {cnhFileName && (
                <p className="text-[11px] font-bold text-emerald-400 truncate flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {cnhFileName}
                </p>
              )}
            </div>

            {/* CRLV Box */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-emerald-400" /> Documento do Veículo (CRLV)
                </span>
                {crlvFileName && (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Anexado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Licenciamento atualizado do modelo {driver.vehicle_model}.</p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setCrlvFileName(f.name);
                }}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30 cursor-pointer"
              />
              {crlvFileName && (
                <p className="text-[11px] font-bold text-emerald-400 truncate flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {crlvFileName}
                </p>
              )}
            </div>
          </div>

          {/* Live Analysis Progress / Timer Block */}
          {isAnalyzing ? (
            <div className="p-4 bg-slate-900 border border-emerald-500/40 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-white">Análise Inteligente DriveCash em Andamento...</h4>
                    <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                      {timerSeconds > 45 && "🔍 Validando autenticidade do documento CNH..."}
                      {timerSeconds <= 45 && timerSeconds > 30 && "🛡️ Verificando regularidade do veículo e CRLV..."}
                      {timerSeconds <= 30 && timerSeconds > 15 && "👤 Checando biometria e antecedentes do motorista..."}
                      {timerSeconds <= 15 && "✨ Concluindo cadastro e liberando conta..."}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-bold">Tempo restante</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${((60 - timerSeconds) / 60) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={handleStartDocumentAnalysis}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" /> Enviar Documentos e Iniciar Análise Automática (1 Minuto)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Online/Offline Toggle Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              isOnline ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30" : "bg-slate-800 text-slate-500"
            }`}
          >
            <Power className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">
                {isOnline ? "Você está Online!" : "Você está Offline"}
              </h2>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                  isOnline
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {isOnline ? "Aguardando Chamadas" : "Modo Indisponível"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {driver.vehicle_model} ({driver.vehicle_color}) • Placa: {driver.plate}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleOnline}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
            isOnline
              ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
              : "bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20"
          }`}
        >
          <Power className="w-5 h-5" /> {isOnline ? "Ficar Offline" : "Ficar Online"}
        </button>
      </div>

      {/* Earnings Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Ganhos Hoje</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">R$ {driver.earnings_today.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Ganhos Semana</span>
          <p className="text-2xl font-black text-white mt-1">R$ {driver.earnings_week.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Corridas</span>
          <p className="text-2xl font-black text-white mt-1">{driver.total_rides}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Nota Média</span>
          <p className="text-2xl font-black text-amber-400 mt-1 flex items-center gap-1">
            <Star className="w-5 h-5 fill-amber-400" /> {driver.rating}
          </p>
        </div>
      </div>

      {/* GPS Exact Location Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white">Posição Exata do Motorista (GPS)</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isGpsActive
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}>
                  {isGpsActive ? "GPS Ativo" : "GPS Inativo"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{gpsStatus}</p>
            </div>
          </div>

          <button
            onClick={fetchExactLocation}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0"
          >
            <Navigation className="w-3.5 h-3.5" /> Obter Posição Exata (GPS)
          </button>
        </div>

        {/* Manual Latitude/Longitude fine-tuning for testing or precision adjustments */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-2 text-xs">
          <span className="text-slate-400 font-bold shrink-0">Ajuste de Coordenadas:</span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={customLatInput}
              onChange={(e) => setCustomLatInput(e.target.value)}
              placeholder="Latitude"
              className="w-full sm:w-28 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono text-[11px]"
            />
            <input
              type="text"
              value={customLngInput}
              onChange={(e) => setCustomLngInput(e.target.value)}
              placeholder="Longitude"
              className="w-full sm:w-28 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono text-[11px]"
            />
            <button
              onClick={handleManualLocationUpdate}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded-xl text-[11px] shrink-0 border border-slate-700"
            >
              Definir No Mapa
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Map */}
      <MapComponent
        originLat={driver.lat}
        originLng={driver.lng}
        originName={isSearchingRides ? "Buscando passageiros..." : "Sua Posição Atual"}
        destLat={acceptedRide?.dest_lat || incomingRequest?.dest_lat}
        destLng={acceptedRide?.dest_lng || incomingRequest?.dest_lng}
        destName={acceptedRide?.dest_address || incomingRequest?.dest_address}
        height="h-[400px]"
        isSearchingRides={isSearchingRides}
        showHeatmap={showHeatmap && isOnline}
        isDriverView={true}
        hasIncomingRide={!!incomingRequest}
      />

      {/* PROCURANDO CORRIDAS - UBER DRIVER STYLE STATUS BANNER */}
      {isSearchingRides && (
        <div className="bg-gradient-to-r from-slate-900 via-[#0d1c3a] to-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Animated Radar Pulse Badge */}
            <div className="relative w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-emerald-500/10">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl animate-ping opacity-30" />
              <Radar className="w-7 h-7 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-black tracking-wide uppercase text-emerald-400">
                  🟢 Online • Você está disponível
                </span>
              </div>
              <h3 className="text-lg font-black text-white leading-tight">
                Aguardando solicitações de corrida...
              </h3>
              <p className="text-xs text-slate-400">
                Varrendo raio de passageiros próximos. Você ouvirá um toque triplo e vibração quando surgir uma corrida.
              </p>
            </div>
          </div>

          {/* Heatmap Toggle Button */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-4 py-3 rounded-2xl font-bold text-xs transition-all border flex items-center justify-center gap-2 shrink-0 ${
              showHeatmap
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-lg shadow-amber-500/10"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
            }`}
          >
            <Flame className={`w-4 h-4 ${showHeatmap ? "text-amber-400 animate-bounce" : "text-slate-500"}`} />
            <span>{showHeatmap ? "Mapa de Calor (Ativado)" : "Ativar Mapa de Calor"}</span>
          </button>
        </div>
      )}

      {/* INCOMING RIDE REQUEST POPUP CARD */}
      {incomingRequest && (
        <div className="bg-slate-900 border-2 border-emerald-400 ring-4 ring-emerald-500/20 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-300 shadow-[0_0_40px_rgba(16,185,129,0.35)] relative overflow-hidden">
          {/* Animated 15-Second Progress Countdown Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-1000 ease-linear"
              style={{ width: `${(rideCountdown / 15) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-800 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 animate-pulse font-mono font-black text-xs">
                {rideCountdown}s
              </div>
              <div>
                <h3 className="font-black text-white text-base leading-none">Nova Solicitação de Corrida!</h3>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Alerta Sonoro e Vibração Continuos ({rideCountdown}s restantes)
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="bg-emerald-500 text-slate-950 font-black text-base px-4 py-1.5 rounded-2xl shadow-lg shadow-emerald-500/20">
                R$ {incomingRequest.price.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] text-emerald-400 font-bold uppercase block">Origem (Embarque)</span>
              <p className="text-white font-bold mt-1">{incomingRequest.origin_address}</p>
            </div>
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] text-red-400 font-bold uppercase block">Destino (Desembarque)</span>
              <p className="text-white font-bold mt-1">{incomingRequest.dest_address}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
            <span>Passageira: <b className="text-white">{incomingRequest.passenger_name}</b> (⭐ {incomingRequest.passenger_rating})</span>
            <span className="font-mono text-emerald-400 font-bold">{incomingRequest.distance_km} km • ~{incomingRequest.duration_mins} min</span>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleDeclineRide}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 rounded-2xl text-xs transition-all border border-slate-700/60"
            >
              Recusar ({rideCountdown}s)
            </button>
            <button
              onClick={handleAcceptRide}
              className="flex-[2] bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-3.5 rounded-2xl text-xs transition-all shadow-xl shadow-emerald-500/40 animate-pulse flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" /> Aceitar Corrida Agora
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE ACCEPTED TRIP CONTROLS */}
      {acceptedRide && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs text-emerald-400 font-extrabold uppercase tracking-wider block">
                Corrida em Andamento
              </span>
              <h3 className="font-black text-white text-lg">{acceptedRide.passenger_name}</h3>
            </div>
            <span className="text-2xl font-black text-emerald-400">R$ {acceptedRide.price.toFixed(2)}</span>
          </div>

          <div className="space-y-2 text-xs">
            <p className="text-slate-300">
              <b className="text-white">Embarque:</b> {acceptedRide.origin_address}
            </p>
            <p className="text-slate-300">
              <b className="text-white">Desembarque:</b> {acceptedRide.dest_address}
            </p>
          </div>

          {/* Stepper Buttons for Navigation and Chat */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <button
              onClick={() => setIsDriverChatOpen(true)}
              className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" /> Chat com Passageiro
            </button>

            {acceptedRide.status === "accepted" && (
              <button
                onClick={handleArrived}
                className="w-full sm:col-span-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-lg"
              >
                Cheguei ao Local de Embarque
              </button>
            )}

            {acceptedRide.status === "arriving" && (
              <button
                onClick={handleStartRide}
                className="w-full sm:col-span-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3.5 rounded-2xl text-xs shadow-lg"
              >
                Iniciar Corrida
              </button>
            )}

            {acceptedRide.status === "in_progress" && (
              <button
                onClick={handleFinishRide}
                className="w-full sm:col-span-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3.5 rounded-2xl text-xs shadow-lg"
              >
                Finalizar Corrida & Receber
              </button>
            )}
          </div>
        </div>
      )}

      {/* Driver Real-time Chat Modal */}
      {acceptedRide && (
        <RideChatModal
          isOpen={isDriverChatOpen}
          onClose={() => setIsDriverChatOpen(false)}
          rideId={acceptedRide.id}
          driverName={driver?.vehicle_model ? `${currentUser?.name || 'Motorista'}` : "Motorista"}
          passengerName={acceptedRide.passenger_name}
          userRole="driver"
        />
      )}
    </div>
  );
};
