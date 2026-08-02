import React, { useState, useEffect } from "react";
import {
  MapPin,
  Search,
  Car,
  ShieldCheck,
  Zap,
  Sparkles,
  Phone,
  MessageSquare,
  Share2,
  AlertTriangle,
  Star,
  CheckCircle2,
  Clock,
  Navigation,
  Loader2,
  X
} from "lucide-react";
import { MapComponent } from "../common/Map";
import {
  searchPlaces,
  searchPlacesReal,
  reverseGeocodeReal,
  calculateFares,
  FareEstimate,
  LocationSearchResult
} from "../../lib/mapUtils";
import { Ride, RideCategory, Driver } from "../../types";
import { supabase } from "../../lib/supabase";
import { playRideAlertSound, playSuccessChime } from "../../lib/audioUtils";
import { RideChatModal } from "./RideChatModal";
import { useAuth } from "../../context/AuthContext";

export const PassengerHome: React.FC = () => {
  const { requireAuth } = useAuth();
  const currentUser = supabase.getCurrentUser();
  const [drivers, setDrivers] = useState<Driver[]>(supabase.getDrivers());

  // Search States
  const [origin, setOrigin] = useState<LocationSearchResult | null>(null);

  const [originQuery, setOriginQuery] = useState("");
  const [originSearchResults, setOriginSearchResults] = useState<LocationSearchResult[]>([]);
  const [showOriginResults, setShowOriginResults] = useState(false);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);

  const [destinationQuery, setDestinationQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [destination, setDestination] = useState<LocationSearchResult | null>(null);

  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  // Auto-fetch GPS on component mount
  useEffect(() => {
    handleFetchGpsLocation();
  }, []);

  // Fares & Vehicle Categories
  const [fares, setFares] = useState<FareEstimate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<RideCategory>("standard");
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix" | "wallet">("credit_card");

  // Ride Lifecycle States
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [isSearchingDriver, setIsSearchingDriver] = useState(false);
  const [searchTimer, setSearchTimer] = useState(0);

  // Modals & Tools
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [cashbackEarnedNotice, setCashbackEarnedNotice] = useState<number | null>(null);

  // Real-time synchronization for active ride status and online drivers
  useEffect(() => {
    const syncData = () => {
      setDrivers(supabase.getDrivers());

      const user = currentUser || supabase.getUsers()[0];
      if (!user) return;

      const rides = supabase.getRides();
      const currentActive = rides.find(
        (r) => r.passenger_id === user.id && r.status !== "completed" && r.status !== "cancelled"
      );

      if (currentActive) {
        setActiveRide({ ...currentActive });
        setIsSearchingDriver(currentActive.status === "searching");
      } else {
        // If passenger previously had an active ride, check if it was completed by driver
        if (activeRide) {
          const finishedRide = rides.find((r) => r.id === activeRide.id);
          if (finishedRide && finishedRide.status === "completed") {
            setCashbackEarnedNotice(finishedRide.drivecash_earned);
            setShowRatingModal(true);
            playSuccessChime();
          }
        }
        setActiveRide(null);
        setIsSearchingDriver(false);
      }
    };

    syncData();
    const unsubscribe = supabase.subscribe(syncData);
    const interval = setInterval(syncData, 1000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [currentUser?.id, activeRide?.id]);

  // Handle Origin Autocomplete Search (Real Geocoding API with 300ms debounce)
  useEffect(() => {
    const trimmed = originQuery.trim();
    if (trimmed.length >= 3 && (!origin || trimmed !== origin.name)) {
      setIsSearchingOrigin(true);
      setShowOriginResults(true);
      const timer = setTimeout(async () => {
        const results = await searchPlacesReal(trimmed);
        setOriginSearchResults(results);
        setIsSearchingOrigin(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setOriginSearchResults([]);
      setShowOriginResults(false);
      setIsSearchingOrigin(false);
    }
  }, [originQuery, origin?.name]);

  // Handle Destination Autocomplete Search (Real Geocoding API with 300ms debounce)
  useEffect(() => {
    const trimmed = destinationQuery.trim();
    if (trimmed.length >= 3 && (!destination || trimmed !== destination.name)) {
      setIsSearchingDest(true);
      setShowResults(true);
      const timer = setTimeout(async () => {
        const results = await searchPlacesReal(trimmed);
        setSearchResults(results);
        setIsSearchingDest(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowResults(false);
      setIsSearchingDest(false);
    }
  }, [destinationQuery, destination?.name]);

  const handleSelectOrigin = (loc: LocationSearchResult) => {
    setOrigin(loc);
    setOriginQuery(loc.name);
    setShowOriginResults(false);

    if (destination) {
      const computedFares = calculateFares(loc.lat, loc.lng, destination.lat, destination.lng);
      setFares(computedFares);
    }
  };

  const handleConfirmOrigin = async () => {
    requireAuth(
      async () => {
        if (originSearchResults.length > 0) {
          handleSelectOrigin(originSearchResults[0]);
        } else if (originQuery.trim()) {
          const realResults = await searchPlacesReal(originQuery);
          if (realResults.length > 0) {
            handleSelectOrigin(realResults[0]);
          }
        }
      },
      "Para solicitar uma corrida, faça seu cadastro ou entre na sua conta.",
      "passenger"
    );
  };

  // Robust GPS location fetch tailored for mobile browsers / iPhone Safari
  const handleFetchGpsLocation = () => {
    if (!("geolocation" in navigator)) {
      setGpsNotice("Geolocalização não é suportada neste navegador. Digite a origem manualmente na caixa de busca.");
      return;
    }

    setIsLocatingGps(true);
    setGpsNotice("Obtendo sinal do GPS... Por favor, aguarde.");

    const applyGpsPosition = async (pos: GeolocationPosition, method: string) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      
      const realAddress = await reverseGeocodeReal(lat, lng);
      
      setOrigin(realAddress);
      setOriginQuery(realAddress.name);
      setIsLocatingGps(false);
      setGpsNotice(`Endereço de GPS identificado: ${realAddress.name}`);
      setTimeout(() => setGpsNotice(null), 5000);

      if (destination) {
        const computedFares = calculateFares(lat, lng, destination.lat, destination.lng);
        setFares(computedFares);
      }
    };

    // Primary attempt: High Accuracy
    navigator.geolocation.getCurrentPosition(
      (pos) => applyGpsPosition(pos, "GPS de Precisão"),
      (err) => {
        console.warn("High accuracy GPS failed on mobile device:", err.code, err.message);
        navigator.geolocation.getCurrentPosition(
          (pos) => applyGpsPosition(pos, "Rede Celular/Wi-Fi"),
          (fallbackErr) => {
            console.warn("Fallback GPS failed:", fallbackErr.code, fallbackErr.message);
            setIsLocatingGps(false);
            if (fallbackErr.code === fallbackErr.PERMISSION_DENIED) {
              setGpsNotice("Acesso ao GPS bloqueado. Digite o ponto de partida manualmente na caixa de busca.");
            } else {
              setGpsNotice("Não foi possível obter o sinal de GPS agora. Digite o ponto de partida manualmente.");
            }
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
    );
  };

  const handleSwapLocations = () => {
    if (!destination || !origin) return;
    const prevOrigin = origin;
    const prevDest = destination;

    setOrigin(prevDest);
    setOriginQuery(prevDest.name);
    setDestination(prevOrigin);
    setDestinationQuery(prevOrigin.name);

    const computedFares = calculateFares(prevDest.lat, prevDest.lng, prevOrigin.lat, prevOrigin.lng);
    setFares(computedFares);
  };

  const handleSelectDestination = (loc: LocationSearchResult) => {
    setDestination(loc);
    setDestinationQuery(loc.name);
    setShowResults(false);

    // Calculate dynamic fares for selected route if origin is available
    if (origin) {
      const computedFares = calculateFares(origin.lat, origin.lng, loc.lat, loc.lng);
      setFares(computedFares);
    }
  };

  const handleConfirmDestination = async () => {
    requireAuth(
      async () => {
        if (searchResults.length > 0) {
          handleSelectDestination(searchResults[0]);
        } else if (destinationQuery.trim()) {
          const realResults = await searchPlacesReal(destinationQuery);
          if (realResults.length > 0) {
            handleSelectDestination(realResults[0]);
          } else {
            alert("Endereço não encontrado.");
          }
        }
      },
      "Para solicitar uma corrida, faça seu cadastro ou entre na sua conta.",
      "passenger"
    );
  };

  const handleMapClick = async (lat: number, lng: number) => {
    const realAddress = await reverseGeocodeReal(lat, lng);
    if (!destination) {
      handleSelectDestination(realAddress);
    } else {
      handleSelectOrigin(realAddress);
    }
  };

  // Request Ride Handler
  const handleRequestRide = async () => {
    requireAuth(
      async () => {
        const user = supabase.getCurrentUser();
        let dest = destination;

        if (!origin) {
          alert("Por favor, selecione a origem ou permita o acesso ao GPS.");
          return;
        }

        if (!dest && destinationQuery.trim()) {
          const realResults = await searchPlacesReal(destinationQuery);
          if (realResults.length > 0) {
            dest = realResults[0];
            setDestination(dest);
          } else {
            alert("Endereço de destino não encontrado.");
            return;
          }
        }

        if (!dest || !user) {
          alert("Por favor, digite e confirme o endereço de destino para solicitar a corrida.");
          return;
        }

        const currentFares = fares.length > 0 ? fares : calculateFares(origin.lat, origin.lng, dest.lat, dest.lng);
        const selectedFare = currentFares.find((f) => f.category === selectedCategory) || currentFares[0];

        const newRide = await supabase.createRide({
          passenger_id: user.id,
          passenger_name: user.name,
          passenger_phone: user.phone || "",
          passenger_rating: 4.9,
          origin_address: origin.address,
          origin_lat: origin.lat,
          origin_lng: origin.lng,
          dest_address: dest.address,
          dest_lat: dest.lat,
          dest_lng: dest.lng,
          price: selectedFare ? selectedFare.price : 25.0,
          distance_km: selectedFare ? selectedFare.distanceKm : 5.0,
          duration_mins: selectedFare ? selectedFare.durationMins : 15,
          category: selectedCategory,
          payment_method: paymentMethod
        });

        setActiveRide(newRide);
        setIsSearchingDriver(true);
        playRideAlertSound();
      },
      "Para solicitar uma corrida, faça seu cadastro ou entre na sua conta.",
      "passenger"
    );
  };

  const handleCancelRide = async () => {
    if (activeRide) {
      await supabase.updateRideStatus(activeRide.id, "cancelled");
      setActiveRide(null);
      setIsSearchingDriver(false);
    }
  };

  const handleTestDriverAccept = async () => {
    if (!activeRide) return;
    const availableDrivers = supabase.getDrivers();
    const driver = availableDrivers[0];
    const updated = await supabase.updateRideStatus(activeRide.id, "accepted", driver);
    if (updated) {
      setActiveRide(updated);
      setIsSearchingDriver(false);
      playSuccessChime();
    }
  };

  // Simulate Ride Progress Transitions
  const handleSimulateNextStep = async () => {
    if (!activeRide) return;

    if (activeRide.status === "accepted") {
      const updated = await supabase.updateRideStatus(activeRide.id, "arriving");
      if (updated) setActiveRide({ ...updated });
    } else if (activeRide.status === "arriving") {
      const updated = await supabase.updateRideStatus(activeRide.id, "in_progress");
      if (updated) setActiveRide({ ...updated });
    } else if (activeRide.status === "in_progress") {
      const updated = await supabase.updateRideStatus(activeRide.id, "completed");
      if (updated) {
        setActiveRide({ ...updated });
        setCashbackEarnedNotice(updated.drivecash_earned);
        setShowRatingModal(true);
        playSuccessChime();
      }
    }
  };

  // Submit Rating
  const handleSubmitRating = () => {
    setShowRatingModal(false);
    setActiveRide(null);
    setDestination(null);
    setDestinationQuery("");
    setFares([]);
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Navigation className="w-5 h-5 text-emerald-400" /> Para onde vamos hoje?
            </h2>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Ganhe Cashback em Pontos
            </span>
          </div>

          {/* GPS Status Notice Banner */}
          {gpsNotice && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs text-emerald-300 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                {isLocatingGps ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" /> : <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />}
                <p>{gpsNotice}</p>
              </div>
              <button
                onClick={() => setGpsNotice(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded-lg"
              >
                ✕
              </button>
            </div>
          )}

          <div className="space-y-3">
            {/* Origin Editable Input */}
            <div className="relative">
              <div className="absolute left-3.5 top-3 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={originQuery}
                onChange={(e) => setOriginQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirmOrigin();
                  }
                }}
                placeholder="Insira a origem / Ponto de partida (Ex: Sua Rua, Bairro, Metrô)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-36 py-3 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-emerald-500"
              />
              <div className="absolute right-2 top-2 flex items-center gap-1.5">
                {originQuery !== origin?.name && (
                  <button
                    onClick={handleConfirmOrigin}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white font-bold px-2.5 py-1.5 rounded-xl transition-all"
                  >
                    OK
                  </button>
                )}
                <button
                  onClick={handleFetchGpsLocation}
                  disabled={isLocatingGps}
                  className="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                  title="Capturar GPS real do seu dispositivo ou iPhone"
                >
                  {isLocatingGps ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                      <span>Buscando...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3 h-3" />
                      <span>Usar GPS</span>
                    </>
                  )}
                </button>
              </div>

              {/* Origin Autocomplete Dropdown */}
              {showOriginResults && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
                  {isSearchingOrigin ? (
                    <div className="p-4 flex items-center justify-center gap-2.5 text-slate-400 text-xs font-medium">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Buscando endereços em tempo real...</span>
                    </div>
                  ) : originSearchResults.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-600 opacity-60" />
                      <span>Nenhum endereço encontrado.</span>
                    </div>
                  ) : (
                    originSearchResults.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectOrigin(item)}
                        className="w-full text-left p-3.5 hover:bg-slate-800/90 transition-colors flex items-start gap-3 text-xs group"
                      >
                        <div className="p-2 bg-slate-950 border border-slate-800 group-hover:border-emerald-500/50 rounded-xl text-emerald-400 shrink-0 mt-0.5 shadow-sm">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="truncate flex-1 min-w-0">
                          <p className="font-bold text-white group-hover:text-emerald-400 transition-colors truncate text-xs">
                            {item.name}
                          </p>
                          {item.address && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {item.address}
                            </p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Swap Locations Button */}
            {destination && (
              <div className="flex justify-center -my-1 relative z-20">
                <button
                  onClick={handleSwapLocations}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg transition-all flex items-center gap-1.5"
                  title="Inverter Origem e Destino"
                >
                  🔄 Inverter Origem e Destino
                </button>
              </div>
            )}

            {/* Destination Search Field */}
            <div className="relative">
              <div className="absolute left-3.5 top-3 flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={destinationQuery}
                onChange={(e) => setDestinationQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirmDestination();
                  }
                }}
                placeholder="Insira o destino (Ex: Rua, Número, Bairro, Aeroporto, Shopping)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-24 py-3 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-emerald-500"
              />
              {destinationQuery.trim().length > 0 && (
                <button
                  onClick={handleConfirmDestination}
                  className="absolute right-2 top-2 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-3 py-1.5 rounded-xl transition-all shadow-md"
                >
                  Confirmar
                </button>
              )}

              {/* Smart Autocomplete Suggestions */}
              {showResults && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
                  {isSearchingDest ? (
                    <div className="p-4 flex items-center justify-center gap-2.5 text-slate-400 text-xs font-medium">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Buscando endereços em tempo real...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-600 opacity-60" />
                      <span>Nenhum endereço encontrado.</span>
                    </div>
                  ) : (
                    searchResults.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectDestination(item)}
                        className="w-full text-left p-3.5 hover:bg-slate-800/90 transition-colors flex items-start gap-3 text-xs group"
                      >
                        <div className="p-2 bg-slate-950 border border-slate-800 group-hover:border-emerald-500/50 rounded-xl text-emerald-400 shrink-0 mt-0.5 shadow-sm">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="truncate flex-1 min-w-0">
                          <p className="font-bold text-white group-hover:text-emerald-400 transition-colors truncate text-xs">
                            {item.name}
                          </p>
                          {item.address && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {item.address}
                            </p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Main Map Canvas */}
      <MapComponent
        originLat={origin?.lat}
        originLng={origin?.lng}
        originName={origin?.name || "Origem"}
        destLat={destination?.lat}
        destLng={destination?.lng}
        destName={destination?.name}
        drivers={drivers}
        height="h-[400px]"
        onMapClick={handleMapClick}
      />

      {/* Route Estimation Cards & Request Panel */}
      {destination && fares.length > 0 && !activeRide && !isSearchingDriver && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-5 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-base">Escolha a Categoria</h3>
              <p className="text-xs text-slate-400">
                {fares[0].distanceKm} km • ~{fares[0].durationMins} minutos de percurso
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Origem → Destino</span>
              <p className="text-xs font-bold text-emerald-400">{destination.name}</p>
            </div>
          </div>

          {/* Vehicle Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {fares.map((f) => (
              <button
                key={f.category}
                onClick={() => setSelectedCategory(f.category)}
                className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                  selectedCategory === f.category
                    ? "bg-emerald-500/10 border-emerald-500 text-white ring-1 ring-emerald-500/50"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-slate-900 rounded-xl text-emerald-400 border border-slate-800">
                      {f.category === "standard" && <Car className="w-5 h-5" />}
                      {f.category === "comfort" && <ShieldCheck className="w-5 h-5" />}
                      {f.category === "premium" && <Sparkles className="w-5 h-5" />}
                      {f.category === "moto" && <Zap className="w-5 h-5" />}
                    </div>
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full">
                      +{f.drivecashPoints} pts
                    </span>
                  </div>
                  <p className="font-black text-sm text-white">{f.categoryName}</p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{f.description}</p>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Estimado</span>
                  <span className="text-base font-black text-emerald-400">R$ {f.price.toFixed(2)}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Payment Method & Request Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400">Pagamento:</span>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-white font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="credit_card">Cartão de Crédito</option>
                <option value="pix">PIX Instantâneo</option>
                <option value="wallet">Saldo Carteira DriveCash</option>
              </select>
            </div>

            <button
              onClick={handleRequestRide}
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-8 py-3.5 rounded-2xl text-sm transition-all shadow-xl shadow-emerald-500/20 transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              <Car className="w-5 h-5" /> Solicitar Corrida Agora
            </button>
          </div>
        </div>
      )}

      {/* Searching Driver Animation Modal */}
      {isSearchingDriver && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Procurando motoristas parceiros ao vivo...</h3>
            <p className="text-xs text-slate-400 mt-1">
              Sua solicitação está publicada no sistema. Um motorista parceiro online aceitará em breve.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleCancelRide}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-5 py-2.5 rounded-2xl text-xs transition-all"
            >
              Cancelar Solicitação
            </button>
          </div>
        </div>
      )}

      {/* Active Trip Tracker Card */}
      {activeRide && !isSearchingDriver && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-black text-white text-lg">
                {activeRide.status === "accepted" && "Motorista a caminho!"}
                {activeRide.status === "arriving" && "Motorista chegou ao local!"}
                {activeRide.status === "in_progress" && "Corrida em andamento..."}
              </h3>
            </div>
          </div>

          {/* Driver Details Card */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-bold text-white text-lg">
                {activeRide.driver_name?.charAt(0) || "C"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-white text-base">{activeRide.driver_name}</h4>
                  <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> {activeRide.driver_rating}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">{activeRide.vehicle_info}</p>
                <p className="text-xs font-bold text-emerald-400 mt-0.5">Placa: {activeRide.plate}</p>
              </div>
            </div>

            <div className="text-center sm:text-right bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Chegada em</span>
              <span className="text-xl font-black text-white flex items-center gap-1 justify-center sm:justify-end">
                <Clock className="w-4 h-4 text-emerald-400" /> ~3 min
              </span>
            </div>
          </div>

          {/* Action Tools: Chat, Phone, Share, SOS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <button
              onClick={() => setIsChatOpen(true)}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" /> Chat ao Vivo
            </button>
            <button
              onClick={() => setShowCallModal(true)}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Phone className="w-4 h-4 text-emerald-400" /> Ligar
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Share2 className="w-4 h-4 text-emerald-400" /> Compartilhar
            </button>
            <button
              onClick={() => setShowSosModal(true)}
              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-400 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              <AlertTriangle className="w-4 h-4" /> Emergência SOS
            </button>
          </div>
        </div>
      )}

      {/* RATING & CASHBACK MODAL UPON RIDE FINISH */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b1329] border border-slate-800 rounded-3xl w-full max-w-md p-6 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">Corrida Finalizada!</h3>
              <p className="text-xs text-slate-400 mt-1">Como foi sua experiência com o motorista?</p>
            </div>

            {cashbackEarnedNotice && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>
                  + {cashbackEarnedNotice} pontos DriveCash adicionados à sua carteira!
                </span>
              </div>
            )}

            {/* Stars */}
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRatingScore(s)}
                  className="p-1 transition-transform hover:scale-125"
                >
                  <Star
                    className={`w-8 h-8 ${
                      s <= ratingScore ? "fill-amber-400 text-amber-400" : "text-slate-700"
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Escreva um comentário elogioso..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />

            <button
              onClick={handleSubmitRating}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 text-sm"
            >
              Enviar Avaliação & Concluir
            </button>
          </div>
        </div>
      )}

      {/* Live Chat Modal */}
      {activeRide && (
        <RideChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          rideId={activeRide.id}
          driverName={activeRide.driver_name || "Motorista"}
          passengerName={currentUser?.name || "Passageiro"}
          userRole="passenger"
        />
      )}

      {/* Simulated Phone Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Phone className="w-8 h-8 animate-bounce" />
            </div>
            <h4 className="font-bold text-white text-base">Ligando para {activeRide?.driver_name}...</h4>
            <p className="text-xs text-slate-400">
              Sua ligação está criptografada e segura pelo sistema DriveCash.
            </p>
            <button
              onClick={() => setShowCallModal(false)}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Encerrar Chamada
            </button>
          </div>
        </div>
      )}

      {/* Share Trip Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <Share2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="font-bold text-white text-base">Compartilhar Viagem</h4>
            <p className="text-xs text-slate-400">
              Envie o link de acompanhamento em tempo real para familiares e amigos.
            </p>
            <input
              type="text"
              readOnly
              value={`https://drivecash.com.br/track/${activeRide?.id || "101"}`}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-emerald-400 font-mono text-center"
            />
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs"
            >
              Copiar Link
            </button>
          </div>
        </div>
      )}

      {/* Emergency SOS Modal */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto border border-red-500/40">
              <AlertTriangle className="w-10 h-10 animate-pulse" />
            </div>
            <h3 className="text-xl font-black text-white">Central de Emergência SOS</h3>
            <p className="text-xs text-slate-300">
              Em caso de perigo imediato, você pode acionar a Polícia Militar (190) ou enviar um alerta com sua localização para nossa Central 24h.
            </p>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  alert("Alerta SOS acionado! Nossa Central de Segurança foi notificada com sua localização em tempo real.");
                  setShowSosModal(false);
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 rounded-2xl text-xs shadow-lg shadow-red-600/30"
              >
                ACIONAR CENTRAL DE SEGURANÇA DRIVECASH
              </button>
              <button
                onClick={() => setShowSosModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-2xl text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
