import React, { useState } from "react";
import { Share2, Copy, Check, Users, Sparkles, Gift } from "lucide-react";
import { supabase } from "../../lib/supabase";

export const ReferralProgramView: React.FC = () => {
  const currentUser = supabase.getCurrentUser();
  if (!currentUser) return null;

  const inviteCode = supabase.getInviteCode(currentUser.id);

  const [copied, setCopied] = useState(false);
  const [friendCode, setFriendCode] = useState("");
  const [msg, setMsg] = useState<{ success: boolean; text: string } | null>(null);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCode.trim()) return;

    const res = await supabase.applyReferralCode(currentUser.id, friendCode);
    setMsg({ success: res.success, text: res.message });
    if (res.success) setFriendCode("");
  };

  return (
    <div className="space-y-6">
      {/* Referral Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
          <Gift className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-white">Indique Amigos e Ganhe DriveCash</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Compartilhe seu código exclusivo. Você e seu amigo ganham bônus de cashback e pontos quando ele fizer a primeira corrida!
          </p>
        </div>

        {/* Unique Code Box */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl max-w-sm mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase block text-left">Seu Código Único</span>
            <span className="text-xl font-black text-emerald-400 tracking-wider font-mono">{inviteCode.code}</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto pt-2">
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold block">Amigos Indicados</span>
            <span className="text-lg font-black text-white flex items-center justify-center gap-1 mt-0.5">
              <Users className="w-4 h-4 text-emerald-400" /> {inviteCode.uses_count}
            </span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold block">Pontos Ganham com Indicações</span>
            <span className="text-lg font-black text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
              <Sparkles className="w-4 h-4" /> {inviteCode.total_earned_cashback} pts
            </span>
          </div>
        </div>
      </div>

      {/* Apply Friend Code Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <h3 className="font-extrabold text-white text-base">Inserir Código de Indicação</h3>
        <p className="text-xs text-slate-400">
          Foi indicado por um amigo? Digite o código dele abaixo para resgatar R$ 5,00 + 300 pontos de bônus!
        </p>

        {msg && (
          <div
            className={`p-3 rounded-xl text-xs font-bold ${
              msg.success ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={handleApplyReferral} className="flex gap-2">
          <input
            type="text"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value)}
            placeholder="Ex: DRIVEANA2026"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white uppercase font-mono tracking-wider focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20"
          >
            Resgatar
          </button>
        </form>
      </div>
    </div>
  );
};
