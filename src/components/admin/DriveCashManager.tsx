import React, { useState } from "react";
import { Sparkles, ToggleLeft, ToggleRight, Plus, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";

export const DriveCashManagerView: React.FC = () => {
  const [doublePoints, setDoublePoints] = useState(supabase.doublePointsActive);
  const catalog = supabase.getCatalog();

  const handleToggleDoublePoints = () => {
    supabase.doublePointsActive = !doublePoints;
    setDoublePoints(!doublePoints);
    if (!doublePoints) {
      supabase.sendPushNotification(
        "Fim de Semana Pontos em Dobro!",
        "Aproveite! Todas as corridas acumulando o dobro de DriveCash agora mesmo."
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Toggle Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" /> Promoções & Campanha Pontos em Dobro
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ative o multiplicador 2X de pontos para incentivar novas corridas durante fins de semana.
          </p>
        </div>

        <button
          onClick={handleToggleDoublePoints}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all shadow-lg ${
            doublePoints
              ? "bg-emerald-500 text-slate-950 shadow-emerald-500/20"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {doublePoints ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
          <span>{doublePoints ? "CAMPANHA 2X ATIVA" : "ATIVAR PONTOS EM DOBRO"}</span>
        </button>
      </div>

      {/* Catalog Manager */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <h3 className="font-extrabold text-white text-base">Catálogo de Recompensas e Descontos ({catalog.length})</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {catalog.map((item) => (
            <div key={item.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <p className="font-extrabold text-white">{item.title}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">{item.partner_name} • Desconto: {item.discount_value}</p>
              </div>
              <span className="font-black text-emerald-400 shrink-0 ml-2">{item.points_cost} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
