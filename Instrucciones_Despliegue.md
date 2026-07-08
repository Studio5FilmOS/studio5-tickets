# Guía de Despliegue en Easypanel - Studio 5 Tickets

Dado que tu servidor cuenta con **Easypanel** administrando los contenedores de Docker, hemos configurado el sistema para que se despliegue de forma unificada. El frontend se compilará y el servidor de Node lo servirá todo en un solo puerto, optimizando el uso de RAM del VPS.

Sigue estos 3 simples pasos para poner a funcionar tu PWA en producción hoy mismo:

---

## 📦 Paso 1: Subir el Código a GitHub
He creado un script automatizado en la raíz de tu proyecto para subir el código en 1 clic.
1. Abre tu cuenta de GitHub y crea un **repositorio vacío** llamado: `studio5-tickets` (de preferencia bajo tu organización `Studio5FilmOS` o tu usuario).
2. Abre la carpeta del proyecto en tu computadora: `c:\Users\Jesse\Desktop\APP TICKET`.
3. Haz doble clic en el archivo **`deploy_git.bat`**.
4. Pega la URL de tu repositorio (ej. `https://github.com/Studio5FilmOS/studio5-tickets.git`) y presiona Enter.
5. El script se encargará de inicializar Git, hacer commit del código con el frontend compilado y subirlo automáticamente a tu GitHub.

---

## 🚀 Paso 2: Crear y Configurar la App en Easypanel
1. Ingresa a tu panel de Easypanel: `http://72.62.170.115:3000` con tus credenciales.
2. Entra al proyecto **`studio5`**.
3. Haz clic en **`+ Service`** en la esquina superior derecha y selecciona **`App`**.
4. Ponle de nombre: `studio5-tickets`
5. En la pestaña **`Source`** (Origen):
   - Conecta el repositorio de GitHub: `Studio5FilmOS/studio5-tickets`
   - Configura la rama (Branch): `main`
   - Configura la **Ruta Raíz (Root Directory)**: `backend` *(¡Muy importante! Indica que arranque desde la carpeta del backend)*
6. En la pestaña **`Environment`** (Variables de Entorno), agrega las siguientes variables para conectar la base de datos interna y configurar la seguridad:

| Variable | Valor | Descripción |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Activa las optimizaciones de producción |
| `DB_USER` | `tickets_user` | Usuario de la base de datos `tickets-db` |
| `DB_PASSWORD` | `Tickets_Studio5_2026` | Contraseña configurada para la base de datos `tickets-db` |
| `DB_HOST` | `studio5_tickets-db` | Servidor interno de la nueva base de datos en Easypanel |
| `DB_PORT` | `5432` | Puerto interno |
| `DB_DATABASE` | `studio5_tickets` | Nombre de la base de datos del sistema de tickets |
| `JWT_SECRET` | `super_secreto_studio5_2026` | Llave de seguridad de autenticación |
| `FRONTEND_URL` | `https://ticket.studio5film.com` | Dominio público de tu PWA |

> [!NOTE]
> **Inicialización Automática de Base de Datos:**
> El backend cuenta con un auto-inicializador. La primera vez que el contenedor arranque en Easypanel, detectará si la base de datos está vacía, y de forma automática creará todas las tablas (`schema.sql`) e insertará los usuarios y eventos semilla (`seeds.sql`). No necesitas ejecutar ningún comando SQL manual en el VPS.

---

## 🌐 Paso 3: Asignar el Dominio y Desplegar
1. En la configuración de la app `studio5-tickets` en Easypanel, ve a la pestaña **`Domains`** (Dominios).
2. Haz clic en **`Add Domain`** y configura:
   - **Domain:** `ticket.studio5film.com`
   - **Path:** `/`
   - **Port:** `5000` *(Puerto de escucha interno del backend)*
3. Guarda los cambios y haz clic en **`Deploy`** en la esquina superior derecha.

¡Listo! Easypanel se encargará de compilar el contenedor, conectar los puertos y habilitar la aplicación en tu dominio público `https://ticket.studio5film.com` en pocos minutos.
