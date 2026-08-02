import React from "react";
import {
  Users,
  Car,
  TrendingUp,
  DollarSign,
  Activity,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { exportRidesToPDF, exportRidesToExcel } from "../../lib/exportUtils";

export const AdminDashboardView: React.FC = () => {
  const [users, setUsers] = React.useState(supabase.getUsers());
  const [passengers, setPassengers] = React.useState(supabase.getPassengers());
  const [drivers, setDrivers] = React.useState(supabase.getDrivers());
  const [rides, setRides] = React.useState(supabase.getRides());

  React.useEffect(() => {
    const syncData = () => {
      setUsers(supabase.getUsers());
      setPassengers(supabase.getPassengers());
      setDrivers(supabase.getDrivers());
      setRides(supabase.getRides());
    };
    syncData();
    const unsubscribe = supabase.subscribe(syncData);
    return unsubscribe;
  }, []);

  const totalPassengers = passengers.length;
  const totalDrivers = drivers.length;
  const onlineDrivers = drivers.filter((d) => d.status === "online").length;
  const ongoingRides = rides.filter((r) => r.status === "in_progress" || r.status === "accepted").length;
  const ridesToday = rides.length;
  const monthlyRevenue = rides.reduce((acc, r) => acc + r.price, 0);
  const annualRevenue = monthlyRevenue * 12;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Painel Administrativo DriveCash</h2>
          <p className="text-xs text-slate-400 mt-1">
            Visão em tempo real da frota, faturamento e solicitações da plataforma.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportRidesToPDF(rides, "Relatorio_Geral_DriveCash")}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
          <button
            onClick={() => exportRidesToExcel(rides, "Planilha_Corridas_DriveCash")}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total de Passageiros</span>
          <p className="text-3xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" /> {totalPassengers}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total de Motoristas</span>
          <p className="text-3xl font-black text-white flex items-center gap-2">
            <Car className="w-6 h-6 text-emerald-400" /> {totalDrivers}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Motoristas Online</span>
          <p className="text-3xl font-black text-emerald-400 flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400 animate-pulse" /> {onlineDrivers}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Corridas em Andamento</span>
          <p className="text-3xl font-black text-amber-400 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-400" /> {ongoingRides}
          </p>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-2">
          <span className="text-xs text-slate-400 font-bold uppercase block">Corridas Hoje</span>
          <p className="text-3xl font-black text-white">{ridesToday}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-2">
          <span className="text-xs text-slate-400 font-bold uppercase block">Receita Mensal Estimada</span>
          <p className="text-3xl font-black text-emerald-400">R$ {monthlyRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-2">
          <span className="text-xs text-slate-400 font-bold uppercase block">Projeção Receita Anual</span>
          <p className="text-3xl font-black text-white">R$ {annualRevenue.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
};
