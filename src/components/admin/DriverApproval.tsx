import React, { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, FileText, User } from "lucide-react";
import { supabase } from "../../lib/supabase";

export const DriverApprovalView: React.FC = () => {
  const drivers = supabase.getDrivers();
  const users = supabase.getUsers();

  const [filter, setFilter] = useState<string>("all");

  const filteredDrivers = filter === "all"
    ? drivers
    : drivers.filter((d) => d.approval_status === filter);

  const handleUpdateStatus = (driverId: string, status: "approved" | "rejected" | "documents_requested") => {
    supabase.setDriverApproval(driverId, status);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Aprovação de Motoristas</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerencie e analise a documentação de novos cadastros de motoristas parceiros.
          </p>
        </div>

        <div className="flex gap-2 text-xs font-bold">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl border ${
              filter === "all" ? "bg-emerald-500 text-slate-950 border-emerald-500" : "bg-slate-950 text-slate-400 border-slate-800"
            }`}
          >
            Todos ({drivers.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-xl border ${
              filter === "pending" ? "bg-amber-500 text-slate-950 border-amber-500" : "bg-slate-950 text-slate-400 border-slate-800"
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`px-3 py-1.5 rounded-xl border ${
              filter === "approved" ? "bg-emerald-500 text-slate-950 border-emerald-500" : "bg-slate-950 text-slate-400 border-slate-800"
            }`}
          >
            Aprovados
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredDrivers.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500 text-xs">
            Nenhum motorista encontrado.
          </div>
        ) : (
          filteredDrivers.map((drv) => {
          const usr = users.find((u) => u.id === drv.user_id);

          return (
            <div
              key={drv.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white font-black flex items-center justify-center text-lg">
                  {usr?.name.charAt(0) || "M"}
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-base">{usr?.name || "Motorista"}</h4>
                  <p className="text-xs text-slate-400">
                    {drv.vehicle_model} ({drv.vehicle_color}) • Placa: {drv.plate}
                  </p>
                  <span
                    className={`inline-block mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      drv.approval_status === "approved"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : drv.approval_status === "pending"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                    }`}
                  >
                    {drv.approval_status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleUpdateStatus(drv.id, "approved")}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" /> Aprovar
                </button>
                <button
                  onClick={() => handleUpdateStatus(drv.id, "documents_requested")}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md"
                >
                  <AlertCircle className="w-4 h-4" /> Solicitar Documentos
                </button>
                <button
                  onClick={() => handleUpdateStatus(drv.id, "rejected")}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md"
                >
                  <XCircle className="w-4 h-4" /> Reprovar
                </button>
              </div>
            </div>
          );
        }))}
      </div>
    </div>
  );
};
