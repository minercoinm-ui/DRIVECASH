import React, { useState } from "react";
import { User, FileText, CheckCircle2, Clock, Upload, Shield, Zap } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { playSuccessChime } from "../../lib/audioUtils";

export const DriverProfileView: React.FC = () => {
  const currentUser = supabase.getCurrentUser();
  const driver = currentUser ? supabase.getDriverByUserId(currentUser.id) : null;

  const [cnhName, setCnhName] = useState(driver?.license_doc || "");
  const [crlvName, setCrlvName] = useState(driver?.vehicle_doc || "");

  if (!driver || !currentUser) return null;

  const handleCnhChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCnhName(file.name);
      supabase.updateDriverDocuments(currentUser.id, file.name, crlvName || "");
    }
  };

  const handleCrlvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCrlvName(file.name);
      supabase.updateDriverDocuments(currentUser.id, cnhName || "", file.name);
    }
  };

  const handleApprove = () => {
    supabase.setDriverApproval(driver.id, "approved");
    playSuccessChime();
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{currentUser.name}</h2>
              <p className="text-xs text-slate-400">
                Motorista Parceiro • Veículo: {driver.vehicle_model} ({driver.plate})
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-block font-bold px-3 py-1 rounded-full text-[10px] border ${
                  driver.approval_status === "approved"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                }`}>
                  Status: {driver.approval_status === "approved" ? "APROVADO" : "EM ANÁLISE (1 MINUTO)"}
                </span>
              </div>
            </div>
          </div>

          {driver.approval_status !== "approved" && (
            <button
              onClick={handleApprove}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0"
            >
              <Zap className="w-4 h-4 fill-slate-950" /> Aprovar Agora
            </button>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" /> Documentos do Motorista & Veículo
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* CNH Document */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
              <span className="text-xs font-bold text-white block">Carteira Habilitação (CNH com EAR)</span>
              <p className="text-[10px] text-slate-400">Envie cópia legível da sua CNH com atividade remunerada.</p>

              <label className="w-full py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>{cnhName ? "Trocar Arquivo CNH" : "Anexar Arquivo CNH"}</span>
                <input type="file" accept="image/*,.pdf" onChange={handleCnhChange} className="hidden" />
              </label>

              {cnhName && (
                <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Arquivo: {cnhName}
                </p>
              )}
            </div>

            {/* CRLV Document */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
              <span className="text-xs font-bold text-white block">Documento do Veículo (CRLV)</span>
              <p className="text-[10px] text-slate-400">Envie a foto do licenciamento do veículo atualizado.</p>

              <label className="w-full py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>{crlvName ? "Trocar Arquivo CRLV" : "Anexar Arquivo CRLV"}</span>
                <input type="file" accept="image/*,.pdf" onChange={handleCrlvChange} className="hidden" />
              </label>

              {crlvName && (
                <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Arquivo: {crlvName}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
