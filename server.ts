import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Gemini API route for AI Support Assistant
app.post("/api/ai-support", async (req, res) => {
  try {
    const { message, userRole, contextData } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        reply: "Olá! Sou a Assistente Virtual DriveCash. No momento a chave do Gemini não está configurada no ambiente, mas posso tirar suas dúvidas sobre corridas, carteira DriveCash, assinaturas de motorista e programa de benefícios!"
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const systemPrompt = `Você é o Assistente Virtual IA da plataforma DriveCash (Mobilidade Urbana com Recompensas).
Seu tom é amigável, ágil, profissional e focado em resolver dúvidas em Português do Brasil.
O usuário é um ${userRole === "driver" ? "MOTORISTA" : userRole === "admin" ? "ADMINISTRADOR" : "PASSAGEIRO"}.

Informações do DriveCash:
- É um app de transporte com programa de fidelidade onde passageiros e motoristas acumulam DriveCash (pontos de cashback).
- Planos para Motoristas: Essencial (R$ 79,90/mês) e Premium (R$ 119,90/mês com 0% de taxa e pontos em dobro).
- O DriveCash pode ser trocado por descontos em postos de combustível, farmácias, supermercados e restaurantes no Clube de Parceiros.
- Níveis do programa: Bronze (0-1000 pts), Prata (1001-3000 pts), Ouro (3001-7000 pts), Diamante (7001+ pts).
- Caso o usuário pergunte sobre problemas na corrida, emergência, pagamentos, assinaturas ou pontos, oriente de forma precisa e atenciosa.

Contexto atual do usuário: ${JSON.stringify(contextData || {})}

Responda à dúvida abaixo com objetividade (máximo 3 parágrafos):
Dúvida: ${message}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt,
    });

    const reply = response.text || "Desculpe, não consegui processar sua pergunta agora. Tente novamente em instantes.";
    res.json({ reply });
  } catch (error: any) {
    console.error("Gemini AI Support Error:", error);
    res.status(500).json({
      reply: "Ocorreu um problema ao conectar com a IA do DriveCash. Por favor, tente novamente ou entre em contato com o suporte humano no app."
    });
  }
});

// Multi-device sync in-memory store
const serverSyncStore = {
  users: [] as any[],
  drivers: [] as any[],
  passengers: [] as any[],
  rides: [] as any[],
};

// Real-time multi-device state polling / sync routes
app.get("/api/sync/state", (req, res) => {
  res.json({
    users: serverSyncStore.users,
    drivers: serverSyncStore.drivers,
    passengers: serverSyncStore.passengers,
    rides: serverSyncStore.rides,
  });
});

app.post("/api/sync/user", (req, res) => {
  const { user, driver, passenger } = req.body;
  if (user) {
    console.log("[SERVER SYNC LOG] Register/Update user:", user.email, user.role, user.id);
    const existingIndex = serverSyncStore.users.findIndex((u) => u.id === user.id || u.email === user.email);
    if (existingIndex >= 0) {
      serverSyncStore.users[existingIndex] = { ...serverSyncStore.users[existingIndex], ...user };
    } else {
      serverSyncStore.users.push(user);
    }
  }

  if (driver) {
    console.log("[SERVER SYNC LOG] Register/Update driver:", driver.user_id, driver.status, driver.approval_status);
    const drvIndex = serverSyncStore.drivers.findIndex((d) => d.id === driver.id || d.user_id === driver.user_id);
    if (drvIndex >= 0) {
      serverSyncStore.drivers[drvIndex] = { ...serverSyncStore.drivers[drvIndex], ...driver };
    } else {
      serverSyncStore.drivers.push(driver);
    }
  }

  if (passenger) {
    const pasIndex = serverSyncStore.passengers.findIndex((p) => p.id === passenger.id || p.user_id === passenger.user_id);
    if (pasIndex >= 0) {
      serverSyncStore.passengers[pasIndex] = { ...serverSyncStore.passengers[pasIndex], ...passenger };
    } else {
      serverSyncStore.passengers.push(passenger);
    }
  }

  res.json({ success: true });
});

app.post("/api/sync/driver-location", (req, res) => {
  const { userId, lat, lng } = req.body;
  console.log(`[SERVER SYNC LOG] Driver Location Update: userId=${userId}, lat=${lat}, lng=${lng}`);
  const drv = serverSyncStore.drivers.find((d) => d.user_id === userId || d.id === userId);
  if (drv) {
    drv.lat = lat;
    drv.lng = lng;
    drv.updated_at = new Date().toISOString();
    res.json({ success: true, driver: drv });
  } else {
    // If driver not yet in server sync store, store a placeholder
    const newDrv = {
      id: "drv_" + userId,
      user_id: userId,
      lat,
      lng,
      status: "online",
      approval_status: "approved",
      updated_at: new Date().toISOString()
    };
    serverSyncStore.drivers.push(newDrv);
    res.json({ success: true, driver: newDrv });
  }
});

app.post("/api/sync/driver-status", (req, res) => {
  const { userId, status, approvalStatus } = req.body;
  console.log(`[SERVER SYNC LOG] Driver Status Update: userId=${userId}, status=${status}, approval=${approvalStatus}`);
  let drv = serverSyncStore.drivers.find((d) => d.user_id === userId || d.id === userId);
  if (drv) {
    if (status) drv.status = status;
    if (approvalStatus) drv.approval_status = approvalStatus;
  } else if (userId) {
    drv = {
      id: "drv_" + userId,
      user_id: userId,
      status: status || "online",
      approval_status: approvalStatus || "approved",
      lat: -23.5615,
      lng: -46.6560
    };
    serverSyncStore.drivers.push(drv);
  }
  res.json({ success: true, driver: drv });
});

app.post("/api/sync/ride", (req, res) => {
  const { ride } = req.body;
  if (ride) {
    console.log(`[SERVER SYNC LOG] Ride Update: id=${ride.id}, status=${ride.status}`);
    const index = serverSyncStore.rides.findIndex((r) => r.id === ride.id);
    if (index >= 0) {
      serverSyncStore.rides[index] = { ...serverSyncStore.rides[index], ...ride };
    } else {
      serverSyncStore.rides.push(ride);
    }
  }
  res.json({ success: true, rides: serverSyncStore.rides });
});

// Mercado Pago simulated checkout route
app.post("/api/mercado-pago/checkout", (req, res) => {
  const { planType, amount, driverId } = req.body;
  const paymentId = "MP-" + Math.floor(100000 + Math.random() * 900000);
  const pixQrCode = `00020101021226880014br.gov.bcb.pix2566pix.mercadopago.com/qr/v2/${paymentId}5204000053039865405${amount}.005802BR5915DriveCash Brasil6009SAO PAULO62070503***6304E2A1`;
  
  res.json({
    success: true,
    paymentId,
    pixQrCode,
    amount,
    planType,
    status: "approved",
    message: "Pagamento do plano " + planType.toUpperCase() + " processado com sucesso via Mercado Pago."
  });
});

async function startServer() {
  // Vite middleware in development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DriveCash Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
