import React, { useState } from "react";
import { Database, ShieldCheck, Copy, Check } from "lucide-react";

export const DatabaseSchemaViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const fullSqlScript = `-- ==========================================
-- DRIVE CASH - MIGRATION SQL (RUN IN SUPABASE SQL EDITOR)
-- ==========================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_date TEXT;

-- ==========================================
-- DRIVE CASH - FULL DATABASE SCHEMA
-- ==========================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('passenger', 'driver', 'admin')) NOT NULL,
  name TEXT NOT NULL,
  cpf TEXT,
  birth_date TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PASSENGERS TABLE
CREATE TABLE IF NOT EXISTS public.passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  favorite_places JSONB DEFAULT '[]'::jsonb,
  rating NUMERIC(3, 2) DEFAULT 5.0,
  total_rides INT DEFAULT 0
);

-- 3. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_model TEXT NOT NULL,
  vehicle_color TEXT NOT NULL,
  plate TEXT NOT NULL,
  status TEXT CHECK (status IN ('online', 'offline')) DEFAULT 'offline',
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected', 'documents_requested')) DEFAULT 'pending',
  license_doc TEXT,
  vehicle_doc TEXT,
  rating NUMERIC(3, 2) DEFAULT 5.0,
  subscription_id UUID,
  active_plan TEXT CHECK (active_plan IN ('essencial', 'premium')),
  plan_expires_at TIMESTAMPTZ,
  lat DOUBLE PRECISION DEFAULT -23.5615,
  lng DOUBLE PRECISION DEFAULT -46.6560,
  total_rides INT DEFAULT 0,
  earnings_today NUMERIC(10, 2) DEFAULT 0,
  earnings_week NUMERIC(10, 2) DEFAULT 0,
  earnings_month NUMERIC(10, 2) DEFAULT 0
);

-- 4. RIDES TABLE
CREATE TABLE IF NOT EXISTS public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID REFERENCES public.users(id),
  driver_id UUID REFERENCES public.users(id),
  origin_address TEXT NOT NULL,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  dest_address TEXT NOT NULL,
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lng DOUBLE PRECISION NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  distance_km NUMERIC(6, 2) NOT NULL,
  duration_mins INT NOT NULL,
  category TEXT CHECK (category IN ('standard', 'comfort', 'premium', 'moto')) NOT NULL,
  status TEXT CHECK (status IN ('requested', 'searching', 'accepted', 'arriving', 'in_progress', 'completed', 'cancelled')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  drivecash_earned INT DEFAULT 0,
  payment_method TEXT NOT NULL
);

-- 5. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan_type TEXT CHECK (plan_type IN ('essencial', 'premium')) NOT NULL,
  status TEXT CHECK (status IN ('active', 'expired', 'pending')) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  mercado_pago_payment_id TEXT
);

-- 6. WALLET TABLE
CREATE TABLE IF NOT EXISTS public.wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  balance NUMERIC(10, 2) DEFAULT 0,
  drivecash_points INT DEFAULT 0,
  level TEXT CHECK (level IN ('Bronze', 'Prata', 'Ouro', 'Diamante')) DEFAULT 'Bronze',
  total_points_earned INT DEFAULT 0
);

-- 7. WALLET_TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.wallet(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  points INT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. DRIVER_LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. RATINGS TABLE
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES public.users(id),
  to_user_id UUID REFERENCES public.users(id),
  score INT CHECK (score BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. SUPPORT TABLE
CREATE TABLE IF NOT EXISTS public.support (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved')) DEFAULT 'open',
  admin_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. REWARD_LEVELS TABLE
CREATE TABLE IF NOT EXISTS public.reward_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  min_points INT NOT NULL,
  cashback_multiplier NUMERIC(3, 2) NOT NULL,
  benefits JSONB DEFAULT '[]'::jsonb
);

-- 13. REWARD_CATALOG TABLE
CREATE TABLE IF NOT EXISTS public.reward_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points_cost INT NOT NULL,
  category TEXT NOT NULL,
  discount_value TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  image TEXT
);

-- 14. INVITE_CODES TABLE
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  uses_count INT DEFAULT 0,
  total_earned_cashback NUMERIC(10, 2) DEFAULT 0
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users Policy: users can view and edit their own account
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Rides Policy: passengers and assigned drivers can read ride details
CREATE POLICY "Passengers and drivers view rides" ON public.rides 
  FOR SELECT USING (auth.uid() = passenger_id OR auth.uid() = driver_id);
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullSqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" /> Esquema de Banco de Dados & RLS Supabase
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visualização técnica das 14 tabelas, relacionamentos com chaves estrangeiras e políticas de segurança RLS.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "SQL Copiado!" : "Copiar Script SQL"}
        </button>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl overflow-x-auto">
        <pre className="text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre font-medium">
          {fullSqlScript}
        </pre>
      </div>
    </div>
  );
};
