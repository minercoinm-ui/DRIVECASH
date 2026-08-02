import React from "react";
import { Trophy, Award, Sparkles, Medal } from "lucide-react";
import { supabase } from "../../lib/supabase";

export const PassengerRankingView: React.FC = () => {
  const passengers = supabase.getUsers().filter((u) => u.role === "passenger");
  const rides = supabase.getRides();

  const ranking = passengers
    .map((p) => {
      const wallet = supabase.getWallet(p.id);
      const tripsCount = rides.filter((r) => r.passenger_id === p.id && r.status === "completed").length;
      return {
        id: p.id,
        name: p.name,
        points: wallet.drivecash_points || 0,
        level: wallet.level || "Bronze",
        trips: tripsCount
      };
    })
    .sort((a, b) => b.points - a.points)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-2 text-center">
        <Trophy className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
        <h2 className="text-2xl font-black text-white">Ranking Mensal de Passageiros</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Os 3 passageiros mais ativos do mês recebem bônus de R$ 100 em cashback e upgrades de nível instantâneo!
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-3">
        {ranking.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Nenhum resultado registrado no ranking deste mês. Seja o primeiro a acumular pontos realizando corridas!
          </div>
        ) : (
          ranking.map((p) => (
            <div
              key={p.id}
              className={`p-4 rounded-2xl flex items-center justify-between border transition-all ${
                p.rank === 1
                  ? "bg-amber-500/10 border-amber-500/40 text-white"
                  : p.rank === 2
                  ? "bg-slate-800/80 border-slate-700 text-white"
                  : p.rank === 3
                  ? "bg-orange-500/10 border-orange-500/30 text-white"
                  : "bg-slate-950 border-slate-800 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-9 h-9 rounded-xl font-black flex items-center justify-center text-sm shrink-0 ${
                    p.rank === 1
                      ? "bg-amber-400 text-slate-950"
                      : p.rank === 2
                      ? "bg-slate-300 text-slate-950"
                      : p.rank === 3
                      ? "bg-amber-700 text-white"
                      : "bg-slate-900 text-slate-400 border border-slate-800"
                  }`}
                >
                  #{p.rank}
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    {p.name}
                    {p.rank <= 3 && <Medal className="w-4 h-4 text-amber-400" />}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {p.trips} corridas realizadas • Nível {p.level}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-black text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> {p.points} pts
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
