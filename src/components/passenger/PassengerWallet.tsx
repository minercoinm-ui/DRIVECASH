import React, { useState } from "react";
import { Wallet, Sparkles, TrendingUp, ArrowDownRight, ArrowUpRight, Award, Plus, ArrowUpFromLine, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

export const PassengerWalletView: React.FC = () => {
  const currentUser = supabase.getCurrentUser();
  if (!currentUser) return null;

  const wallet = supabase.getWallet(currentUser.id);
  const transactions = supabase.getTransactions(currentUser.id);

  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(50);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(20);
  const [pixKey, setPixKey] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Level thresholds
  const levelData = {
    Bronze: { min: 0, max: 1000, next: "Prata" },
    Prata: { min: 1001, max: 3000, next: "Ouro" },
    Ouro: { min: 3001, max: 7000, next: "Diamante" },
    Diamante: { min: 7001, max: 20000, next: "Nível Máximo VIP" }
  };

  const currentLevelInfo = levelData[wallet.level] || levelData.Bronze;
  const progressPercent = Math.min(
    100,
    Math.round(((wallet.drivecash_points - currentLevelInfo.min) / (currentLevelInfo.max - currentLevelInfo.min)) * 100)
  );

  const handleTopup = async () => {
    if (topupAmount <= 0) return;
    await supabase.addWalletBalance(currentUser.id, topupAmount, "PIX Instantâneo");
    setFeedback(`R$ ${topupAmount.toFixed(2)} adicionados com sucesso à sua carteira!`);
    setShowTopupModal(false);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleWithdraw = async () => {
    if (withdrawAmount <= 0 || !pixKey) return;
    const res = await supabase.withdrawWalletBalance(currentUser.id, withdrawAmount, pixKey);
    if (res.success) {
      setFeedback(res.message);
      setShowWithdrawModal(false);
    } else {
      alert(res.message);
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Wallet Card */}
      <div className="bg-gradient-to-tr from-slate-900 via-[#0b1329] to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                Carteira Digital DriveCash
              </span>
            </div>

            <span className="text-xs text-slate-400 block font-semibold">Saldo em Dinheiro</span>
            <h2 className="text-4xl font-black text-white mt-1">R$ {wallet.balance.toFixed(2)}</h2>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Sparkles className="w-4 h-4" />
                <span>{wallet.drivecash_points} Pontos DriveCash</span>
              </div>

              <button
                onClick={() => setShowTopupModal(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" /> Recarregar PIX
              </button>

              <button
                onClick={() => setShowWithdrawModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <ArrowUpFromLine className="w-4 h-4 text-emerald-400" /> Sacar PIX
              </button>
            </div>
          </div>

          {/* Level Progress */}
          <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="text-xs text-slate-400 block">Nível Atual</span>
                  <span className="text-sm font-black text-white">{wallet.level}</span>
                </div>
              </div>
              <span className="text-xs text-emerald-400 font-bold">
                Próximo: {currentLevelInfo.next}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(progressPercent, 5)}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
              <span>{wallet.drivecash_points} pts</span>
              <span>{currentLevelInfo.max} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-extrabold text-white text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" /> Histórico de Transações & Cashback
          </h3>
          <span className="text-xs text-slate-400 font-semibold">{transactions.length} registros</span>
        </div>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <p className="text-slate-500 text-center py-6 text-xs">Nenhuma transação registrada ainda.</p>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.amount >= 0
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}
                  >
                    {tx.amount >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs">{tx.description}</p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {new Date(tx.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  {tx.amount !== 0 && (
                    <span className={`block font-black text-sm ${tx.amount > 0 ? "text-emerald-400" : "text-slate-200"}`}>
                      {tx.amount > 0 ? `+ R$ ${tx.amount.toFixed(2)}` : `- R$ ${Math.abs(tx.amount).toFixed(2)}`}
                    </span>
                  )}
                  <span className={`text-xs font-bold ${tx.points >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.points >= 0 ? `+${tx.points} pts` : `${tx.points} pts`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Topup Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-xs">
            <h3 className="font-black text-white text-base text-center">Recarregar Carteira PIX</h3>
            <p className="text-slate-400 text-center">Escolha ou digite o valor que deseja adicionar:</p>

            <div className="grid grid-cols-3 gap-2">
              {[20, 50, 100].map((val) => (
                <button
                  key={val}
                  onClick={() => setTopupAmount(val)}
                  className={`py-2 rounded-xl border font-bold ${
                    topupAmount === val
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "bg-slate-950 border-slate-800 text-slate-300"
                  }`}
                >
                  R$ {val}
                </button>
              ))}
            </div>

            <input
              type="number"
              value={topupAmount}
              onChange={(e) => setTopupAmount(Number(e.target.value))}
              placeholder="Outro valor..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-bold focus:outline-none focus:border-emerald-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowTopupModal(false)}
                className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleTopup}
                className="w-1/2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-2.5 rounded-xl shadow-lg shadow-emerald-500/20"
              >
                Confirmar PIX
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-xs">
            <h3 className="font-black text-white text-base text-center">Sacar Saldo via PIX</h3>
            <p className="text-slate-400 text-center">Insira a chave PIX e o valor do saque:</p>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Chave PIX (CPF, Email ou Tel)</label>
              <input
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="Ex: 123.456.789-00 ou email@exemplo.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Valor do Saque (R$)</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                placeholder="R$ 20.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleWithdraw}
                className="w-1/2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-2.5 rounded-xl shadow-lg shadow-emerald-500/20"
              >
                Confirmar Saque
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

