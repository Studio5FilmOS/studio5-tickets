# PWA de Tickets Studio 5 (Mobile-First)

Este proyecto es una Progressive Web App (PWA) móvil y responsiva diseñada para modernizar el antiguo sistema de venta y validación de boletos de **Studio 5 Film & Art**. Integra a los Compradores, Staff de puerta y Administradores en una sola plataforma profesional autoalojada.

## 🚀 Arquitectura Tecnológica
- **Frontend (PWA):** React 18, Vite, React Router 6, Axios, Lucide Icons, html2canvas (descarga de boletos) y html5-qrcode (cámara nativa).
- **Backend (API REST):** Node.js, Express, pg (PostgreSQL Client), JWT (Autenticación), bcryptjs (encriptación), Nodemailer (envío de tickets por correo).
- **Base de Datos:** PostgreSQL (base relacional segura con soporte de transacciones para evitar sobreventas).

---

## 📂 Estructura del Proyecto

El código está organizado como un monorepo limpio con dos carpetas independientes:

- `backend/`: Código de la API del servidor y base de datos relacional.
- `frontend/`: Aplicación cliente React optimizada para móviles (mobile-first).

---

## 🛠️ Configuración Local

### 1. Requisitos Previos
Asegúrate de tener instalado en tu máquina:
- [Node.js](https://nodejs.org/) (versión 18 o superior).
- [PostgreSQL](https://www.postgresql.org/) corriendo de forma local.

### 2. Base de Datos (PostgreSQL)
1. Crea una base de datos en PostgreSQL llamada `studio5_tickets`.
2. Ejecuta el archivo DDL de esquema para crear las tablas:
   ```bash
   psql -U postgres -d studio5_tickets -f backend/database/schema.sql
   ```
3. Ejecuta los datos de prueba (semillas) para insertar los usuarios administrativos y eventos demo:
   ```bash
   psql -U postgres -d studio5_tickets -f backend/database/seeds.sql
   ```
   *Nota: Se crearán los usuarios:*
   - **Administrador:** Correo: `admin@studio5.com` | Contraseña: `password123`
   - **Personal de Puerta (Staff):** Correo: `staff@studio5.com` | Contraseña: `password123`

### 3. Configurar y Levantar el Backend
1. Navega a la carpeta del servidor:
   ```bash
   cd backend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Copia el archivo `.env.example` a `.env` y edita las variables de conexión a tu base de datos de PostgreSQL y tus credenciales SMTP para enviar correos:
   ```bash
   cp .env.example .env
   ```
4. Levanta el servidor en modo desarrollo:
   ```bash
   npm run start
   ```
   El servidor correrá en `http://localhost:5000`. Puedes verificar su estado en `http://localhost:5000/health`.

### 4. Configurar y Levantar el Frontend (React PWA)
1. En una nueva terminal, navega a la carpeta del cliente:
   ```bash
   cd frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Levanta el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
   Vite abrirá la app en `http://localhost:5173`. Gracias a que tiene configurado `host: true`, puedes abrir la app en tu teléfono celular ingresando la IP local de tu computador en tu misma red Wi-Fi (ej: `http://192.168.1.15:5173`).

---

## 📱 PWA e Instalación en Celular
Para que la aplicación sea instalable en tu celular:
1. **En Android (Chrome):** Al ingresar, te aparecerá automáticamente el banner inferior indicando "Agregar Studio 5 a la pantalla de inicio". Al hacer clic, se instalará como una app nativa en tu cajón de aplicaciones.
2. **En iOS (Safari):** Haz clic en el botón de "Compartir" de Safari en la barra inferior y luego selecciona la opción **"Agregar a pantalla de inicio"**.

*Nota de seguridad:* Para que la PWA sea instalable en el VPS de producción y los navegadores móviles autoricen el acceso a la **cámara nativa para el escaneo de QRs**, es de carácter obligatorio configurar e instalar un certificado SSL (**HTTPS**).

---

## 🌐 Guía de Despliegue en VPS (Producción)

### 1. Instalar dependencias en el VPS
Instala Node.js, PostgreSQL y Nginx en tu servidor Ubuntu/Debian:
```bash
sudo apt update
sudo apt install nodejs npm postgresql nginx certbot python3-certbot-nginx
```

### 2. Configurar base de datos
Restaura el esquema de base de datos utilizando el archivo `schema.sql` y `seeds.sql` de igual manera en el postgresql del VPS.

### 3. Mantener el servidor Node.js corriendo con PM2
Instala PM2 de forma global en el VPS y levanta el servidor backend para que corra en segundo plano:
```bash
sudo npm install -g pm2
cd backend
pm2 start server.js --name "studio5-api"
pm2 startup
pm2 save
```

### 4. Compilar el Frontend React
Compila los archivos estáticos de tu frontend para producción:
```bash
cd frontend
npm run build
```
Esto generará los archivos finales en la carpeta `frontend/dist/`. Mueve o copia esta carpeta a tu ruta de Nginx en el VPS (por ejemplo, a `/var/www/studio5/`).

### 5. Configurar Nginx como Proxy Inverso
Crea una configuración para tu dominio en `/etc/nginx/sites-available/studio5` redirigiendo la API y sirviendo la carpeta dist de React:
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Archivos estáticos de React (PWA)
    location / {
        root /var/www/studio5/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy para el API Backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enlaza el sitio y reinicia Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/studio5 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Instalar SSL (Certbot Let's Encrypt)
Ejecuta Certbot para obtener el certificado SSL e instalarlo automáticamente en Nginx:
```bash
sudo certbot --nginx -d tu-dominio.com
```
¡Listo! Tu aplicación estará desplegada de forma segura con HTTPS, lo que permitirá escanear QRs con la cámara e instalar la PWA en celulares.
