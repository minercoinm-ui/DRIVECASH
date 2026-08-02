import React from "react";
import { Target, Sparkles, CheckCircle2, Trophy, Clock } from "lucide-react";
import { supabase } from "../../lib/supabase";

export const MissionsView: React.FC = () => {
  const currentUser = supabase.getCurrentUser();
  const rides = currentUser
    ? supabase.getRides().filter((r) => r.passenger_id === currentUser.id && r.status === "completed")
    : [];
  const completedRidesCount = rides.length;

  const inviteCode = currentUser ? supabase.getInviteCode(currentUser.id) : null;
  const inviteUses = inviteCode?.uses_count || 0;

  const dynamicMissions = [
    {
      id: "mis_1",
      title: "Explorador da Cidade",
      description: "Complete 3 corridas na plataforma para ganhar pontos bônus.",
      reward_points: 300,
      progress: Math.min(3, completedRidesCount),
      target: 3,
      completed: completedRidesCount >= 3,
      expires_in: "Semanal"
    },
    {
      id: "mis_2",
      title: "Passageiro Frequente",
      description: "Realize 5 viagens concluídas com o DriveCash.",
      reward_points: 500,
      progress: Math.min(5, completedRidesCount),
      target: 5,
      completed: completedRidesCount >= 5,
      expires_in: "Semanal"
    },
    {
      id: "mis_3",
      title: "Super Indicação",
      description: "Compartilhe seu código de indicação com 1 amigo que realize uma corrida.",
      reward_points: 400,
      progress: Math.min(1, inviteUses),
      target: 1,
      completed: inviteUses >= 1,
      expires_in: "Ativa"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-black text-white">Missões DriveCash</h2>
        </div>
        <p className="text-xs text-slate-400">
          Cumpra os desafios semanais para conquistar bônus exclusivos e subir de nível mais rápido!
        </p>
      </div>

      <div className="space-y-4">
        {dynamicMissions.map((m) => {
          const progressPercent = Math.min(100, Math.round((m.progress / m.target) * 100));

          return (
            <div
              key={m.id}
              className={`p-5 rounded-3xl border transition-all ${
                m.completed
                  ? "bg-emerald-500/10 border-emerald-500/40"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      m.completed
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-950 text-emerald-400 border border-slate-800"
                    }`}
                  >
                    {m.completed ? <CheckCircle2 className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-sm">{m.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                  </div>
                </div>

                <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shrink-0">
                  +{m.reward_points} pts
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 mt-2">
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>
                    Progresso: {m.progress} de {m.target}
                  </span>
                  <span className="flex items-center gap-1 text-[10px]">
                    <Clock className="w-3 h-3" /> {m.expires_in}
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
