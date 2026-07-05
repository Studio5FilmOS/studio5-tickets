-- 1. INSERTAR USUARIOS DE PRUEBA (Pre-configurados con bcrypt para password: "password123")
INSERT INTO users (name, email, phone, password_hash, role) VALUES
('Administrador Studio 5', 'admin@studio5.com', '0999999999', '$2a$10$d.bNn4V58h/R75jLg2dGce0V1lGz8gNnE2J/YnU/Y6r2E3dE2e2q2', 'admin'),
('Staff Puerta 1', 'staff@studio5.com', '0888888888', '$2a$10$d.bNn4V58h/R75jLg2dGce0V1lGz8gNnE2J/YnU/Y6r2E3dE2e2q2', 'staff');

-- 2. INSERTAR EVENTO DE MUESTRA 1 (NUMERADO - CON ASASIENTOS)
INSERT INTO events (id, title, description, venue, banner_url, ticket_template_url, price_adult, price_child, capacity_total, is_single_rate, has_assigned_seats, seating_layout, promo_type, price_promo, promo_deadline, status) VALUES
('e8b835eb-f529-4d64-be5f-7be69d8eb6e7', 
 'El Misterio de la Calle 5', 
 'Una experiencia teatral inmersiva de suspenso y misterio donde el público ayuda a resolver el crimen.', 
 'Sala Principal Studio 5', 
 'https://i.imgur.com/0z5756T.png', 
 'https://i.imgur.com/0z5756T.png', 
 15.00, 
 7.50, 
 12, 
 FALSE, 
 TRUE, 
 '["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4"]'::jsonb, 
 'Preventa', 
 12.00, 
 NOW() + INTERVAL '10 days', 
 'active');

-- INSERTAR EVENTO DE MUESTRA 2 (NO NUMERADO - ENTRADA GENERAL)
INSERT INTO events (id, title, description, venue, banner_url, ticket_template_url, price_adult, price_child, capacity_total, is_single_rate, has_assigned_seats, seating_layout, promo_type, price_promo, status) VALUES
('b8c09a80-1a77-4b7b-8919-df0fe8d7eb8f', 
 'Concierto Acústico Íntimo', 
 'Una noche especial con los mejores éxitos en formato acústico de artistas locales.', 
 'Café-Teatro Studio 5', 
 'https://i.imgur.com/0z5756T.png', 
 NULL, 
 20.00, 
 0.00, 
 50, 
 TRUE, 
 FALSE, 
 NULL, 
 'Ninguna', 
 0.00, 
 'active');

-- 3. INSERTAR FECHAS/HORARIOS DE FUNCIONES (Schedules)
INSERT INTO event_schedules (id, event_id, schedule_time) VALUES
('a6b328a6-89d4-4b53-a5c2-b91c7849e7b1', 'e8b835eb-f529-4d64-be5f-7be69d8eb6e7', '2026-11-27 19:00:00-05'),
('7f6c38a2-2b66-41e9-9182-3d9201f9e2cf', 'e8b835eb-f529-4d64-be5f-7be69d8eb6e7', '2026-12-05 20:00:00-05'),
('c5a2c4e6-d98c-4f11-ba1b-261ef4d023a1', 'b8c09a80-1a77-4b7b-8919-df0fe8d7eb8f', '2026-12-10 21:00:00-05');

-- ===============================================
-- DATOS SEMILLA PARA INTERACTIVIDAD (EVENTO 1)
-- ===============================================

-- 4. INSERTAR PREGUNTAS / ENCUESTAS
INSERT INTO event_polls (id, event_id, question, options, is_active) VALUES
('d1c678a6-568b-4c4f-9e8c-a12efb7d8d21', 
 'e8b835eb-f529-4d64-be5f-7be69d8eb6e7', 
 '¿Quién es tu principal sospechoso?', 
 '["El Médico (Dr. Díaz)", "El Mayordomo (Carlos)", "La Viuda (Leonor)", "La Mucama (Julia)"]'::jsonb, 
 FALSE),
('34d89a78-2b89-417c-a49e-b91efcd98d78', 
 'e8b835eb-f529-4d64-be5f-7be69d8eb6e7', 
 '¿Crees que Leonor está ocultando el diario de la víctima?', 
 '["Definitivamente sí", "No, es inocente", "Está siendo amenazada"]'::jsonb, 
 FALSE);

-- 5. INSERTAR PISTAS
INSERT INTO event_clues (id, event_id, title, content, image_url, is_revealed) VALUES
('b1c34a8e-28d1-4b11-a89e-b3d67ab8cd91', 
 'e8b835eb-f529-4d64-be5f-7be69d8eb6e7', 
 'Nota de Chantaje', 
 'Se ha encontrado un papel quemado en la chimenea con el mensaje: "Paga los 10 mil o todos sabrán de tu secreto en la calle 5".', 
 NULL, 
 FALSE),
('a2d45c6b-9c7d-4c7b-a25e-b9d5c6f8cd22', 
 'e8b835eb-f529-4d64-be5f-7be69d8eb6e7', 
 'Veneno en el Estante', 
 'El reporte toxicológico confirma restos de cianuro. Un frasco sospechoso fue hallado escondido en la biblioteca detrás de un libro viejo.', 
 'https://i.imgur.com/0z5756T.png', 
 FALSE);
