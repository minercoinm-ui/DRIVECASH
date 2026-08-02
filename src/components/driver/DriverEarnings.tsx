import React, { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Calendar, Award, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Driver } from "../../types";

export const DriverEarningsView: React.FC = () => {
  const currentUser = supabase.getCurrentUser();
  const [driver, setDriver] = useState<Driver | null>(() =>
    currentUser ? supabase.getDriverByUserId(currentUser.id) || null : null
  );

  useEffect(() => {
    const fetchDriver = () => {
      if (currentUser) {
        const d = supabase.getDriverByUserId(currentUser.id);
        if (d) setDriver({ ...d });
      }
    };
    fetchDriver();
    const unsubscribe = supabase.subscribe(fetchDriver);
    return unsubscribe;
  }, [currentUser?.id]);

  if (!driver) return null;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-2">
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-400" /> Relatório Detalhado de Ganhos
        </h2>
        <p className="text-xs text-slate-400">
          Acompanhe seus rendimentos diários, semanais e mensais como parceiro DriveCash.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-2">
          <span className="text-xs text-slate-400 font-bold uppercase block">Hoje</span>
          <p className="text-3xl font-black text-emerald-400">R$ {driver.earnings_today.toFixed(2)}</p>
          <p className="text-[10px] text-slate-500">Creditado automaticamente na carteira</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-2">
          <span className="text-xs text-slate-400 font-bold uppercase block">Esta Semana</span>
          <p className="text-3xl font-black text-white">R$ {driver.earnings_week.toFixed(2)}</p>
          <p className="text-[10px] text-slate-500">Últimos 7 dias de atividades</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-2">
          <span className="text-xs text-slate-400 font-bold uppercase block">Este Mês</span>
          <p className="text-3xl font-black text-emerald-400">R$ {driver.earnings_month.toFixed(2)}</p>
          <p className="text-[10px] text-slate-500">Projeção de rendimento com Plano {driver.active_plan || "Ativo"}</p>
        </div>
      </div>
    </div>
  );
};
