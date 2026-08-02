import React, { useEffect, useState } from "react";
import { Car, Sparkles, ShieldCheck } from "lucide-react";

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setFade(true);
    }, 1800);

    const timer2 = setTimeout(() => {
      onFinish();
    }, 2200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#0b1329] flex flex-col items-center justify-center p-6 transition-opacity duration-500 ${
        fade ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Glowing background ring */}
        <div className="absolute w-36 h-36 rounded-full bg-emerald-500/20 blur-2xl animate-pulse" />

        {/* Logo Badge */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-6 transform hover:scale-105 transition-transform animate-bounce">
          <Car className="w-12 h-12" />
        </div>

        <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-1">
          Drive<span className="text-emerald-400">Cash</span>
        </h1>
        <p className="text-slate-400 text-sm mt-2 font-medium">Sua corrida vale muito mais</p>

        {/* Loading Pill */}
        <div className="mt-8 flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full text-xs font-bold text-emerald-400">
          <Sparkles className="w-4 h-4 animate-spin" />
          <span>Carregando plataforma...</span>
        </div>

        <div className="mt-12 flex items-center gap-6 text-slate-500 text-xs font-semibold">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Corridas Seguras
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-emerald-500" /> Cashback em Pontos
          </span>
        </div>
      </div>
    </div>
  );
};
