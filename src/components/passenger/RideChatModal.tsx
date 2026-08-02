import React, { useState, useEffect, useRef } from "react";
import { X, Send, MessageSquare } from "lucide-react";
import { ChatMessage } from "../../types";
import { supabase } from "../../lib/supabase";

interface RideChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  driverName?: string;
  passengerName?: string;
  userRole?: "passenger" | "driver";
}

export const RideChatModal: React.FC<RideChatModalProps> = ({
  isOpen,
  onClose,
  rideId,
  driverName = "Motorista",
  passengerName = "Passageiro",
  userRole = "passenger"
}) => {
  const currentUser = supabase.getCurrentUser();
  const currentUserId = currentUser?.id || (userRole === "driver" ? "driver_user" : "passenger_user");
  const currentUserName = currentUser?.name || (userRole === "driver" ? driverName : passengerName);
  const otherPartyName = userRole === "passenger" ? driverName : passengerName;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync real-time messages for this ride
  useEffect(() => {
    if (!isOpen || !rideId) return;

    const syncMessages = () => {
      const msgs = supabase.getChatMessages(rideId);
      setMessages(msgs);
    };

    syncMessages();
    const unsubscribe = supabase.subscribe(syncMessages);
    return () => {
      unsubscribe();
    };
  }, [isOpen, rideId]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !rideId) return;

    setInput("");
    await supabase.sendChatMessage(rideId, currentUserId, currentUserName, trimmed);
    setMessages(supabase.getChatMessages(rideId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col h-[520px]">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-extrabold flex items-center justify-center text-sm shadow-md">
              {otherPartyName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                <span>Chat com {otherPartyName}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              </h4>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <MessageSquare className="w-3 h-3 inline" /> Mensagens em tempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#070d1e]/50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                <MessageSquare className="w-6 h-6 opacity-80" />
              </div>
              <p className="text-xs font-bold text-slate-300">Nenhuma mensagem ainda</p>
              <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                Envie uma mensagem abaixo para falar com {otherPartyName} em tempo real.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === currentUserId || m.sender_name === currentUserName;
              return (
                <div
                  key={m.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-lg ${
                      isMine
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-medium rounded-tr-none shadow-emerald-500/10"
                        : "bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none"
                    }`}
                  >
                    <span className={`block text-[9px] font-black uppercase mb-0.5 ${isMine ? "text-slate-950/70" : "text-emerald-400"}`}>
                      {isMine ? "Você" : m.sender_name}
                    </span>
                    <p className="break-words font-medium">{m.text}</p>
                    <span className={`block text-[8px] text-right mt-1 ${isMine ? "text-slate-950/60" : "text-slate-500"}`}>
                      {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Digite sua mensagem para ${otherPartyName}...`}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-slate-950 px-4 rounded-2xl font-black transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
