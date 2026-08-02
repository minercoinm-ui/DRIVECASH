import React, { useState, useEffect } from "react";
import { History, MapPin, Sparkles, FileText, Download } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { exportRidesToPDF } from "../../lib/exportUtils";
import { Ride } from "../../types";

export const PassengerHistoryView: React.FC = () => {
  const currentUser = supabase.getCurrentUser();
  const [rides, setRides] = useState<Ride[]>(() =>
    currentUser ? supabase.getRides().filter((r) => r.passenger_id === currentUser.id) : []
  );

  useEffect(() => {
    const fetchHistory = () => {
      if (currentUser) {
        setRides(supabase.getRides().filter((r) => r.passenger_id === currentUser.id));
      }
    };
    fetchHistory();
    const unsubscribe = supabase.subscribe(fetchHistory);
    return unsubscribe;
  }, [currentUser?.id]);

  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" /> Histórico de Corridas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Acompanhe todas as suas viagens e comprovantes oficiais.
          </p>
        </div>

        {rides.length > 0 && (
          <button
            onClick={() => exportRidesToPDF(rides, "Minhas_Corridas_DriveCash")}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
          >
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        )}
      </div>

      <div className="space-y-4">
        {rides.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500 text-xs">
            Nenhuma corrida realizada ainda.
          </div>
        ) : (
          rides.map((ride) => (
            <div
              key={ride.id}
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-white">ID: #{ride.id.slice(-6).toUpperCase()}</span>
                <span className="text-slate-400">
                  {new Date(ride.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <p className="text-slate-300 font-medium">
                    <b className="text-white">Origem:</b> {ride.origin_address}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <p className="text-slate-300 font-medium">
                    <b className="text-white">Destino:</b> {ride.dest_address}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-white text-sm">R$ {ride.price.toFixed(2)}</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> +{ride.drivecash_earned} pts
                  </span>
                </div>

                <button
                  onClick={() => setSelectedReceipt(ride)}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" /> Comprovante
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-xs">
            <div className="text-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">Comprovante de Viagem</h3>
              <p className="text-[10px] text-emerald-400 font-bold uppercase mt-0.5">DriveCash Brasil</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Motorista:</span>
                <span className="font-bold text-white">{selectedReceipt.driver_name || "N/A"}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Veículo:</span>
                <span className="font-bold text-white">{selectedReceipt.vehicle_info || "Onix"}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Distância:</span>
                <span className="font-bold text-white">{selectedReceipt.distance_km} km</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Duração:</span>
                <span className="font-bold text-white">{selectedReceipt.duration_mins} min</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
                <span className="font-bold text-white">Valor Pago:</span>
                <span className="font-black text-emerald-400 text-sm">R$ {selectedReceipt.price.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl transition-all"
            >
              Fechar Comprovante
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
