-- ==============================================================================
-- DRIVE CASH - SUPABASE DATABASE MIGRATION SCRIPT
-- ==============================================================================
-- Execute este script no SQL Editor do seu projeto Supabase para criar todas as
-- tabelas, políticas de segurança RLS, índices, permissões e ativar o Realtime.
-- ==============================================================================

-- 1. EXTENSÕES & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tipos personalizados se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('passenger', 'driver', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ride_status') THEN
        CREATE TYPE ride_status AS ENUM ('requested', 'searching', 'accepted', 'arriving', 'in_progress', 'completed', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ride_category') THEN
        CREATE TYPE ride_category AS ENUM ('standard', 'comfort', 'premium', 'moto');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_approval_status') THEN
        CREATE TYPE driver_approval_status AS ENUM ('pending', 'approved', 'rejected', 'documents_requested', 'in_review');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
        CREATE TYPE subscription_plan AS ENUM ('essencial', 'premium');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_level') THEN
        CREATE TYPE reward_level AS ENUM ('Bronze', 'Prata', 'Ouro', 'Diamante');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('cashback', 'ride_payment', 'subscription', 'referral', 'bonus', 'reward_redemption', 'withdrawal');
    END IF;
END $$;

-- 2. TABELA DE USUÁRIOS (users)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role user_role DEFAULT 'passenger'::user_role NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. TABELA DE PASSAGEIROS (passengers)
CREATE TABLE IF NOT EXISTS public.passengers (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    favorite_places JSONB DEFAULT '[]'::jsonb,
    rating NUMERIC(3,2) DEFAULT 5.00 NOT NULL,
    total_rides INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. TABELA DE MOTORISTAS (drivers)
CREATE TABLE IF NOT EXISTS public.drivers (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    vehicle_model TEXT DEFAULT 'Chevrolet Onix' NOT NULL,
    vehicle_color TEXT DEFAULT 'Prata' NOT NULL,
    plate TEXT DEFAULT 'DRV-1234' NOT NULL,
    status TEXT DEFAULT 'online' NOT NULL, -- 'online' | 'offline'
    approval_status driver_approval_status DEFAULT 'pending'::driver_approval_status NOT NULL,
    license_doc TEXT,
    vehicle_doc TEXT,
    rating NUMERIC(3,2) DEFAULT 5.00 NOT NULL,
    subscription_id TEXT,
    active_plan subscription_plan DEFAULT 'premium'::subscription_plan,
    plan_expires_at TIMESTAMPTZ,
    lat DOUBLE PRECISION DEFAULT -23.5615 NOT NULL,
    lng DOUBLE PRECISION DEFAULT -46.6560 NOT NULL,
    total_rides INT DEFAULT 0 NOT NULL,
    earnings_today NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    earnings_week NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    earnings_month NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. TABELA DE CORRIDAS (rides)
CREATE TABLE IF NOT EXISTS public.rides (
    id TEXT PRIMARY KEY,
    passenger_id TEXT NOT NULL,
    driver_id TEXT,
    passenger_name TEXT NOT NULL,
    passenger_phone TEXT NOT NULL,
    passenger_rating NUMERIC(3,2) DEFAULT 5.00,
    driver_name TEXT,
    driver_phone TEXT,
    driver_rating NUMERIC(3,2),
    vehicle_info TEXT,
    plate TEXT,
    origin_address TEXT NOT NULL,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    dest_address TEXT NOT NULL,
    dest_lat DOUBLE PRECISION NOT NULL,
    dest_lng DOUBLE PRECISION NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    distance_km NUMERIC(10,2) NOT NULL,
    duration_mins INT NOT NULL,
    category ride_category DEFAULT 'standard'::ride_category NOT NULL,
    status ride_status DEFAULT 'searching'::ride_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    drivecash_earned INT DEFAULT 0 NOT NULL,
    payment_method TEXT DEFAULT 'pix' NOT NULL
);

-- 6. TABELA DE CARTEIRAS (wallets)
CREATE TABLE IF NOT EXISTS public.wallets (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    balance NUMERIC(10,2) DEFAULT 25.00 NOT NULL,
    drivecash_points INT DEFAULT 200 NOT NULL,
    level reward_level DEFAULT 'Bronze'::reward_level NOT NULL,
    total_points_earned INT DEFAULT 200 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. TABELA DE TRANSAÇÕES DE CARTEIRA (wallet_transactions)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
    points INT DEFAULT 0 NOT NULL,
    type transaction_type DEFAULT 'bonus'::transaction_type NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. TABELA DE ASSINATURAS (subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL,
    plan_type subscription_plan NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    mercado_pago_payment_id TEXT
);

-- 9. TABELA DE TICKETS DE SUPORTE (support_tickets)
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    admin_reply TEXT,
    status TEXT DEFAULT 'open' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. TABELA DE CÓDIGOS DE INDICAÇÃO (invite_codes)
CREATE TABLE IF NOT EXISTS public.invite_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    uses_count INT DEFAULT 0 NOT NULL,
    total_earned_cashback NUMERIC(10,2) DEFAULT 0.00 NOT NULL
);

-- 11. TABELA DE NOTIFICAÇÕES (notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    type TEXT DEFAULT 'system' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) & POLÍTICAS DE ACESSO
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para API pública/anon e autenticada
CREATE POLICY "Permitir Leitura Pública" ON public.users FOR SELECT USING (true);
CREATE POLICY "Permitir Inserção Pública" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir Atualização Pública" ON public.users FOR UPDATE USING (true);

CREATE POLICY "Permitir Leitura Pública" ON public.passengers FOR SELECT USING (true);
CREATE POLICY "Permitir Inserção Pública" ON public.passengers FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir Atualização Pública" ON public.passengers FOR UPDATE USING (true);

CREATE POLICY "Permitir Leitura Pública" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Permitir Inserção Pública" ON public.drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir Atualização Pública" ON public.drivers FOR UPDATE USING (true);

CREATE POLICY "Permitir Leitura Pública" ON public.rides FOR SELECT USING (true);
CREATE POLICY "Permitir Inserção Pública" ON public.rides FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir Atualização Pública" ON public.rides FOR UPDATE USING (true);

CREATE POLICY "Permitir Leitura Pública" ON public.wallets FOR SELECT USING (true);
CREATE POLICY "Permitir Inserção Pública" ON public.wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir Atualização Pública" ON public.wallets FOR UPDATE USING (true);

CREATE POLICY "Permitir Leitura Pública" ON public.wallet_transactions FOR SELECT USING (true);
CREATE POLICY "Permitir Inserção Pública" ON public.wallet_transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir Leitura Pública" ON public.subscriptions FOR SELECT USING (true);
CREATE POLICY "Permitir Inserção Pública" ON public.subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir Atualização Pública" ON public.subscriptions FOR UPDATE USING (true);

CREATE POLICY "Permitir Leitura Pública" ON public.support_tickets FOR SELECT USING (true);
CREATE POLICY "Permitir Inserção Pública" ON public.support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir Atualização Pública" ON public.support_tickets FOR UPDATE USING (true);

CREATE POLICY "Permitir Leitura Pública" ON public.invite_codes FOR SELECT USING (true);
CREATE POLICY "Permitir Inserção Pública" ON public.invite_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir Atualização Pública" ON public.invite_codes FOR UPDATE USING (true);

CREATE POLICY "Permitir Leitura Pública" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Permitir Inserção Pública" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir Atualização Pública" ON public.notifications FOR UPDATE USING (true);

-- Permitir Deleção para todas as tabelas
CREATE POLICY "Permitir Deleção Pública" ON public.users FOR DELETE USING (true);
CREATE POLICY "Permitir Deleção Pública" ON public.passengers FOR DELETE USING (true);
CREATE POLICY "Permitir Deleção Pública" ON public.drivers FOR DELETE USING (true);
CREATE POLICY "Permitir Deleção Pública" ON public.rides FOR DELETE USING (true);
CREATE POLICY "Permitir Deleção Pública" ON public.wallets FOR DELETE USING (true);
CREATE POLICY "Permitir Deleção Pública" ON public.wallet_transactions FOR DELETE USING (true);
CREATE POLICY "Permitir Deleção Pública" ON public.subscriptions FOR DELETE USING (true);
CREATE POLICY "Permitir Deleção Pública" ON public.support_tickets FOR DELETE USING (true);
CREATE POLICY "Permitir Deleção Pública" ON public.invite_codes FOR DELETE USING (true);
CREATE POLICY "Permitir Deleção Pública" ON public.notifications FOR DELETE USING (true);

-- ==============================================================================
-- TRIGGER PARA SINCRONIZAR SUPABASE AUTH COM PUBLIC.USERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, phone, name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'phone', new.phone, ''),
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'passenger'::user_role)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- DADOS INICIAIS DE SEED (OPCIONAL)
-- ==============================================================================

INSERT INTO public.users (id, email, phone, role, name)
VALUES 
    ('usr_passenger_1', 'passageiro@drivecash.com.br', '(11) 98888-1111', 'passenger', 'Ana Maria Silva'),
    ('usr_driver_1', 'motorista@drivecash.com.br', '(11) 97777-2222', 'driver', 'Carlos Santos'),
    ('usr_admin_1', 'admin@drivecash.com.br', '(11) 99999-0000', 'admin', 'Administrador DriveCash')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.drivers (id, user_id, vehicle_model, vehicle_color, plate, status, approval_status, rating, active_plan, lat, lng, total_rides, earnings_today, earnings_week, earnings_month)
VALUES 
    ('drv_1', 'usr_driver_1', 'Chevrolet Onix', 'Prata', 'ABC-1D23', 'online', 'approved', 4.95, 'premium', -23.5615, -46.6560, 342, 185.50, 1240.00, 4850.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.passengers (id, user_id, rating, total_rides)
VALUES 
    ('pas_1', 'usr_passenger_1', 5.00, 12)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.wallets (id, user_id, balance, drivecash_points, level, total_points_earned)
VALUES 
    ('wal_usr_passenger_1', 'usr_passenger_1', 45.50, 850, 'Prata', 1250),
    ('wal_usr_driver_1', 'usr_driver_1', 320.00, 3400, 'Ouro', 4500)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- HABILITAR REALTIME DO SUPABASE
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'drivers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.users, public.drivers, public.rides, public.wallets, public.notifications;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Índice para consultas geográficas eficientes de motoristas e buscas rápidas
CREATE INDEX IF NOT EXISTS idx_drivers_status_lat_lng ON public.drivers(status, lat, lng);
CREATE INDEX IF NOT EXISTS idx_rides_status ON public.rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_passenger_id ON public.rides(passenger_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON public.rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_id ON public.wallet_transactions(wallet_id);
