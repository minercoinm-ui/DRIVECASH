import React, { useState } from "react";
import { Store, Sparkles, CheckCircle2, ShoppingBag, Fuel, Utensils, HeartPulse, ExternalLink } from "lucide-react";
import { RewardCatalogItem } from "../../types";
import { supabase } from "../../lib/supabase";

export const PartnerClubView: React.FC = () => {
  const currentUser = supabase.getCurrentUser();
  const catalog = supabase.getCatalog();
  const wallet = currentUser ? supabase.getWallet(currentUser.id) : null;

  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [redeemedCode, setRedeemedCode] = useState<{ title: string; code: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categories = [
    { id: "todos", label: "Todos", icon: Store },
    { id: "posto", label: "Postos", icon: Fuel },
    { id: "farmacia", label: "Farmácias", icon: HeartPulse },
    { id: "supermercado", label: "Mercados", icon: ShoppingBag },
    { id: "restaurante", label: "Restaurantes", icon: Utensils }
  ];

  const filteredCatalog = activeCategory === "todos"
    ? catalog
    : catalog.filter((c) => c.category === activeCategory);

  const handleRedeem = async (item: RewardCatalogItem) => {
    if (!currentUser) return;
    setErrorMsg(null);
    const res = await supabase.redeemCatalogItem(currentUser.id, item);
    if (res.success && res.voucherCode) {
      setRedeemedCode({ title: item.title, code: res.voucherCode });
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-[#0b1329] to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block mb-1">
            Clube de Parceiros DriveCash
          </span>
          <h2 className="text-2xl font-black text-white">Troque seus Pontos por Descontos Reais</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Aproveite vouchers em combustível na Shell/Ipiranga, compras no Carrefour, medicamentos na Drogasil e refeições no iFood!
          </p>
        </div>

        {wallet && (
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center shrink-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Seu Saldo Atual</span>
            <span className="text-xl font-black text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
              <Sparkles className="w-4 h-4" /> {wallet.drivecash_points} pts
            </span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-center font-bold">
          {errorMsg}
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                activeCategory === cat.id
                  ? "bg-emerald-500 text-slate-950 border-emerald-500 shadow-md shadow-emerald-500/20"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
              }`}
            >
              <IconComponent className="w-4 h-4" /> {cat.label}
            </button>
          );
        })}
      </div>

      {/* Reward Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCatalog.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500 text-xs col-span-full">
            Nenhum item de recompensa encontrado nesta categoria.
          </div>
        ) : (
          filteredCatalog.map((item) => (
          <div
            key={item.id}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between hover:border-slate-700 transition-all group"
          >
            <div className="space-y-3">
              <div className="h-40 rounded-2xl overflow-hidden relative bg-slate-950">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-3 right-3 bg-emerald-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-lg">
                  {item.discount_value}
                </span>
                <span className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md text-white font-bold text-[10px] px-2.5 py-1 rounded-lg border border-slate-800">
                  {item.partner_name}
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-white text-base">{item.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-extrabold flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> {item.points_cost} Pontos DriveCash
              </span>
              <button
                onClick={() => handleRedeem(item)}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20"
              >
                Resgatar
              </button>
            </div>
          </div>
        )))}
      </div>

      {/* Voucher Success Modal */}
      {redeemedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-white">Voucher Resgatado!</h3>
            <p className="text-xs text-slate-300">{redeemedCode.title}</p>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Código do Cupom</span>
              <span className="text-lg font-mono font-black text-emerald-400 tracking-wider">
                {redeemedCode.code}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Apresente este código no estabelecimento parceiro.</p>
            <button
              onClick={() => setRedeemedCode(null)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs"
            >
              Fechar & Aproveitar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
