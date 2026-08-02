import React, { useState } from "react";
import { Bot, Send, X, Sparkles, Loader2, User } from "lucide-react";
import { UserRole } from "../../types";

interface AiSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  userName: string;
}

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
}

export const AiSupportModal: React.FC<AiSupportModalProps> = ({
  isOpen,
  onClose,
  userRole,
  userName
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: `Olá, ${userName}! Sou a Assistente Virtual DriveCash com Inteligência Artificial. Como posso te ajudar hoje sobre corridas, carteira, saldo DriveCash ou suporte?`,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsgText = input.trim();
    const userMsg: Message = {
      id: "usr_" + Date.now(),
      sender: "user",
      text: userMsgText,
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsgText,
          userRole,
          contextData: { userName }
        })
      });

      const data = await res.json();
      const botReplyText = data.reply || "Desculpe, tente novamente em instantes.";

      setMessages((prev) => [
        ...prev,
        {
          id: "bot_" + Date.now(),
          sender: "bot",
          text: botReplyText,
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: "bot_err_" + Date.now(),
          sender: "bot",
          text: "Como funciona a Carteira DriveCash? Você ganha cashback e pontos em cada corrida realizada. Os pontos podem ser trocados no Clube de Parceiros por cupons de supermercado, gasolina, farmácia e refeição!",
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Como funciona o cashback DriveCash?",
    "Quais os benefícios da assinatura Motorista Premium?",
    "Esqueci um objeto no carro, o que fazer?",
    "Como funciona o programa de indicação?"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[580px]">
        {/* Header */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Suporte IA DriveCash</h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Gemini
                </span>
              </div>
              <p className="text-xs text-slate-400">Atendimento inteligente 24 horas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  m.sender === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {m.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${
                  m.sender === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                <span className="block text-[10px] text-slate-400/80 text-right mt-1">
                  {m.time}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                Digitando resposta...
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestions */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/40 overflow-x-auto flex gap-2 scrollbar-none">
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => {
                setInput(p);
              }}
              className="text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-full border border-slate-700/60 whitespace-nowrap transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem para a IA..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 p-2.5 rounded-xl font-bold transition-all shadow-md shadow-emerald-500/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
