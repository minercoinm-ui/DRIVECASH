import React, { useState } from "react";
import { MessageSquare, CheckCircle2, Clock, Send } from "lucide-react";
import { supabase } from "../../lib/supabase";

export const SupportManagerView: React.FC = () => {
  const tickets = supabase.getSupportTickets();
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const handleReply = (ticketId: string) => {
    const text = replyText[ticketId];
    if (!text || !text.trim()) return;

    supabase.replySupportTicket(ticketId, text.trim());
    setReplyText((prev) => ({ ...prev, [ticketId]: "" }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Gerenciamento de Atendimento & Suporte</h2>
          <p className="text-xs text-slate-400 mt-0.5">Chamados de passageiros e motoristas registrados no app.</p>
        </div>
      </div>

      <div className="space-y-4">
        {tickets.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500 text-xs">
            Nenhum chamado de suporte encontrado.
          </div>
        ) : (
          tickets.map((t) => (
          <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white">{t.user_name}</span>
                <span className="bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full text-[10px]">
                  {t.user_role.toUpperCase()}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  t.status === "resolved"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                }`}
              >
                {t.status.toUpperCase()}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-extrabold text-white">{t.subject}</p>
              <p className="text-slate-300 leading-relaxed">{t.message}</p>
            </div>

            {t.admin_reply ? (
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold uppercase block">Resposta da Equipe</span>
                <p className="text-slate-300">{t.admin_reply}</p>
              </div>
            ) : (
              <div className="flex gap-2 pt-2 text-xs">
                <input
                  type="text"
                  value={replyText[t.id] || ""}
                  onChange={(e) => setReplyText({ ...replyText, [t.id]: e.target.value })}
                  placeholder="Escreva a resposta oficial para o usuário..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => handleReply(t.id)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" /> Responder
                </button>
              </div>
            )}
          </div>
        )))}
      </div>
    </div>
  );
};
