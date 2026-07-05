-- Habilitar extensión para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE USUARIOS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'buyer',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE EVENTOS
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    venue VARCHAR(255) NOT NULL,
    banner_url VARCHAR(1024) NOT NULL,
    ticket_template_url VARCHAR(1024),
    price_adult NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    price_child NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    capacity_total INTEGER NOT NULL DEFAULT 0,
    is_single_rate BOOLEAN NOT NULL DEFAULT FALSE,
    has_assigned_seats BOOLEAN NOT NULL DEFAULT FALSE,
    seating_layout JSONB,
    promo_type VARCHAR(50) NOT NULL DEFAULT 'Ninguna',
    price_promo NUMERIC(10, 2) DEFAULT 0.00,
    promo_deadline TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE FUNCIONES (FECHAS Y HORARIOS POR EVENTO)
CREATE TABLE IF NOT EXISTS event_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    schedule_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_event_time ON event_schedules(event_id, schedule_time);

-- 4. TABLA DE ÓRDENES
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_num VARCHAR(50) UNIQUE NOT NULL,
    buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_whatsapp VARCHAR(50),
    event_id UUID REFERENCES events(id) NOT NULL,
    schedule_id UUID REFERENCES event_schedules(id) NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    amount_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    ticket_count_adult INTEGER NOT NULL DEFAULT 0,
    ticket_count_child INTEGER NOT NULL DEFAULT 0,
    transaction_ref VARCHAR(100),
    bank_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA DE TICKETS INDIVIDUALES
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    ticket_code VARCHAR(100) UNIQUE NOT NULL,
    ticket_type VARCHAR(50) NOT NULL,
    seat_label VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_order ON tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);

-- ==========================================
-- TABLAS NUEVAS PARA INTERACTIVIDAD EN VIVO
-- ==========================================

-- 6. TABLA DE ENCUESTAS / PREGUNTAS DEL EVENTO
CREATE TABLE IF NOT EXISTS event_polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Ej: ["Doctor", "Mayordomo", "Detective"]
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polls_event_active ON event_polls(event_id, is_active);

-- 7. TABLA DE VOTOS DE ESPECTADORES (ACTUALIZADA CON VOTOS ANÓNIMOS POR DISPOSITIVO)
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID REFERENCES event_polls(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES event_schedules(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE, -- Nullable (si vota por e-ticket)
    voter_id VARCHAR(100), -- Nullable (token de dispositivo localStorage si entra por QR general)
    selected_option VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_ticket_vote UNIQUE (poll_id, ticket_id),
    CONSTRAINT unique_voter_vote UNIQUE (poll_id, voter_id)
);

-- 8. TABLA DE PISTAS DEL EVENTO
CREATE TABLE IF NOT EXISTS event_clues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(1024),
    is_revealed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clues_event_revealed ON event_clues(event_id, is_revealed);
