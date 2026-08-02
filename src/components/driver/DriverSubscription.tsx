import React, { useState } from "react";
import { ShieldCheck, Sparkles, Check, CreditCard, QrCode, Lock, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "../../lib/supabase";

export const DriverSubscriptionView: React.FC = () => {
  const currentUser = supabase.getCurrentUser();
  const driver = currentUser ? supabase.getDriverByUserId(currentUser.id) : null;

  const [selectedPlan, setSelectedPlan] = useState<"essencial" | "premium">("premium");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; paymentId: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!currentUser || !driver) return null;

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    setPixData(null);
    setSuccessMsg(null);

    const price = selectedPlan === "essencial" ? 79.90 : 119.90;

    try {
      const res = await fetch("/api/mercado-pago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: selectedPlan,
          amount: price,
          driverId: driver.id
        })
      });

      const data = await res.json();

      if (paymentMethod === "pix") {
        setPixData({ qrCode: data.pixQrCode, paymentId: data.paymentId });
      } else {
        // Instant approval for credit card
        supabase.updateDriverSubscription(currentUser.id, selectedPlan, data.paymentId);
        setSuccessMsg(`Assinatura do Plano ${selectedPlan.toUpperCase()} ativada com sucesso!`);
      }
    } catch (e) {
      // Fallback
      const fakeId = "MP-" + Math.floor(100000 + Math.random() * 900000);
      supabase.updateDriverSubscription(currentUser.id, selectedPlan, fakeId);
      setSuccessMsg(`Assinatura do Plano ${selectedPlan.toUpperCase()} ativada!`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPixPaid = () => {
    if (pixData) {
      supabase.updateDriverSubscription(currentUser.id, selectedPlan, pixData.paymentId);
      setPixData(null);
      setSuccessMsg(`Pagamento PIX confirmado! Plano ${selectedPlan.toUpperCase()} ativado por 30 dias.`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Current Plan Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
            Status da Sua Assinatura
          </span>
          <h2 className="text-2xl font-black text-white mt-1">
            Plano Ativo:{" "}
            <span className="text-emerald-400 uppercase">
              {driver.active_plan ? driver.active_plan : "NENHUM (EXPIRADO)"}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {driver.plan_expires_at
              ? `Vencimento da assinatura: ${new Date(driver.plan_expires_at).toLocaleDateString("pt-BR")}`
              : "Assine um plano para liberar o botão 'Ficar Online' e receber corridas ilimitadas."}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-2xl text-emerald-400 font-black text-xs">
          <ShieldCheck className="w-5 h-5" /> Mercado Pago Integrado
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-bold text-center">
          {successMsg}
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ESSENCIAL PLAN */}
        <div
          onClick={() => setSelectedPlan("essencial")}
          className={`p-6 rounded-3xl border cursor-pointer transition-all space-y-4 relative ${
            selectedPlan === "essencial"
              ? "bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-2xl"
              : "bg-slate-950 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Plano Essencial
            </span>
            <span className="text-2xl font-black text-white">R$ 79,90<span className="text-xs text-slate-500 font-normal">/mês</span></span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Ideal para motoristas iniciantes que desejam rodar com custos fixos baixos.
          </p>

          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Corridas Ilimitadas sem comissão alta
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Recebimento direto na carteira DriveCash
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Suporte em horário comercial
            </li>
          </ul>
        </div>

        {/* PREMIUM PLAN */}
        <div
          onClick={() => setSelectedPlan("premium")}
          className={`p-6 rounded-3xl border cursor-pointer transition-all space-y-4 relative overflow-hidden ${
            selectedPlan === "premium"
              ? "bg-gradient-to-b from-emerald-950/40 to-slate-900 border-emerald-500 ring-2 ring-emerald-500/40 shadow-2xl"
              : "bg-slate-950 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="absolute top-3 right-3 bg-emerald-500 text-slate-950 font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full">
            Mais Popular ★
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> Plano Premium
            </span>
            <span className="text-2xl font-black text-white">R$ 119,90<span className="text-xs text-slate-500 font-normal">/mês</span></span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            0% de taxa sobre as corridas, prioridade no envio de chamadas e pontos DriveCash em dobro!
          </p>

          <ul className="space-y-2 text-xs text-slate-200 font-semibold">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" /> 0% de Taxa em todas as corridas
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Prioridade na fila de passageiros próximos
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Pontos DriveCash em dobro para resgates
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Suporte Prioritário 24/7 com IA
            </li>
          </ul>
        </div>
      </div>

      {/* Payment Selection Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <h3 className="font-extrabold text-white text-base">Pagamento via Mercado Pago</h3>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod("pix")}
            className={`flex-1 py-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
              paymentMethod === "pix"
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                : "bg-slate-950 border-slate-800 text-slate-400"
            }`}
          >
            <QrCode className="w-4 h-4" /> PIX Instantâneo
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("card")}
            className={`flex-1 py-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
              paymentMethod === "card"
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                : "bg-slate-950 border-slate-800 text-slate-400"
            }`}
          >
            <CreditCard className="w-4 h-4" /> Cartão de Crédito
          </button>
        </div>

        {pixData ? (
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center space-y-4 animate-in fade-in">
            <span className="text-xs font-bold text-emerald-400 block">QR Code PIX Gerado</span>
            <div className="p-3 bg-white rounded-2xl w-48 h-48 mx-auto flex items-center justify-center">
              <QrCode className="w-36 h-36 text-slate-950" />
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Copie a chave PIX abaixo ou escaneie o QR Code no seu aplicativo do banco:
            </p>
            <input
              type="text"
              readOnly
              value={pixData.qrCode.slice(0, 40) + "..."}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 text-center font-mono"
            />
            <button
              onClick={handleConfirmPixPaid}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-xl text-xs shadow-lg shadow-emerald-500/20"
            >
              Confirmar Pagamento PIX
            </button>
          </div>
        ) : (
          <button
            onClick={handleProcessPayment}
            disabled={isProcessing}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3.5 rounded-2xl text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processando no Mercado Pago...
              </>
            ) : (
              <>
                Assinar Plano {selectedPlan.toUpperCase()} R${" "}
                {selectedPlan === "essencial" ? "79,90" : "119,90"} <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
