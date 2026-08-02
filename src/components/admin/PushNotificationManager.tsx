import React, { useState } from "react";
import { Send, Bell, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";

export const PushNotificationManagerView: React.FC = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSendPush = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    supabase.sendPushNotification(title, message, "all");
    setSent(true);
    setTitle("");
    setMessage("");
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Notificações Push Transmissão</h2>
            <p className="text-xs text-slate-400">Envie anúncios e ofertas para todos os usuários do app.</p>
          </div>
        </div>

        {sent && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold flex items-center gap-2">
            <Check className="w-4 h-4" /> Notificação transmitida com sucesso para toda a frota!
          </div>
        )}

        <form onSubmit={handleSendPush} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-bold mb-1">Título da Notificação</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Bônus de Cashback no Fim de Semana!"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Mensagem de Texto</label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite a mensagem que aparecerá nos smartphones dos usuários..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 text-xs"
          >
            <Send className="w-4 h-4" /> Transmitir Notificação Push
          </button>
        </form>
      </div>
    </div>
  );
};
