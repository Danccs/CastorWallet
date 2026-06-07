# Guía de Configuración Externa - CastorWallet

Esta guía describe los pasos necesarios para configurar la base de datos Supabase, la autenticación de Google y el despliegue automático en Netlify.

---

## 1. Configuración de Base de Datos en Supabase

1. Ve a [Supabase Console](https://supabase.com) y crea un nuevo proyecto gratuito llamado `CastorWallet`.
2. Una vez creado el proyecto, dirígete a la sección **SQL Editor** en el menú lateral.
3. Copia y ejecuta el siguiente script DDL para crear las tablas, activar RLS (Seguridad a Nivel de Fila) y habilitar la creación automática de perfiles de usuario.

```sql
-- =========================================================================
-- 1. TABLA DE PERFILES (Vinculada a auth.users de Supabase)
-- =========================================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS en perfiles
alter table public.profiles enable row level security;

-- Políticas RLS para perfiles
create policy "Los usuarios pueden ver su propio perfil" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Los usuarios pueden actualizar su propio perfil" 
  on public.profiles for update 
  using (auth.uid() = id);

-- =========================================================================
-- 2. TRIGGER AUTOMÁTICO PARA CREAR PERFIL AL REGISTRARSE
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- 3. TABLA DE TRANSACCIONES (Ingresos y Gastos)
-- =========================================================================
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  amount numeric(12,2) not null,
  type text not null check (type in ('income', 'expense')),
  description text not null,
  category text not null,
  date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS en transacciones
alter table public.transactions enable row level security;

-- Políticas RLS para transacciones
create policy "Usuarios pueden ver sus propias transacciones" 
  on public.transactions for select 
  using (auth.uid() = user_id);

create policy "Usuarios pueden insertar sus propias transacciones" 
  on public.transactions for insert 
  with check (auth.uid() = user_id);

create policy "Usuarios pueden eliminar sus propias transacciones" 
  on public.transactions for delete 
  using (auth.uid() = user_id);

-- =========================================================================
-- 4. TABLA DE PRESUPUESTOS (Límites Mensuales)
-- =========================================================================
create table public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category text not null,
  amount numeric(12,2) not null,
  spent numeric(12,2) default 0.00 not null,
  period text not null, -- Formato: 'YYYY-MM' (ej: '2026-06')
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, category, period)
);

-- Habilitar RLS en presupuestos
alter table public.budgets enable row level security;

-- Políticas RLS para presupuestos
create policy "Usuarios pueden ver sus propios presupuestos" 
  on public.budgets for select 
  using (auth.uid() = user_id);

create policy "Usuarios pueden gestionar sus propios presupuestos" 
  on public.budgets for all 
  using (auth.uid() = user_id);
```

---

## 2. Configuración de Registro y Google Auth (Gratis)

Para permitir a tus usuarios iniciar sesión con cuentas de Google:

### Paso A: Obtener credenciales de Google Cloud Console
1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un nuevo proyecto llamado `CastorWallet`.
3. Busca **Pantalla de consentimiento de OAuth** (OAuth Consent Screen):
   - Elige el tipo de usuario **Externo**.
   - Llena los datos obligatorios (nombre de app, email de soporte).
   - En **Permisos** (Scopes), añade `./auth/userinfo.email` y `./auth/userinfo.profile`.
4. Ve a **Credenciales** (Credentials) -> **Crear Credenciales** -> **ID de cliente de OAuth** (OAuth Client ID):
   - Tipo de aplicación: **Aplicación web**.
   - Nombre: `CastorWallet Supabase Auth`.
   - Deja los campos de redirección vacíos por un momento y haz clic en **Crear**. Copia el **Client ID** y el **Client Secret** generados.

### Paso B: Enlazar con Supabase Auth
1. Ve a tu panel de Supabase -> **Authentication** -> **Providers** -> **Google**.
2. Activa el proveedor (toggle enabled).
3. Pega el **Client ID** y **Client Secret** obtenidos de Google Cloud.
4. Supabase te mostrará una URL llamada **Redirect URL** (ej: `https://your-project.supabase.co/auth/v1/callback`). Cópiala.
5. Regresa a Google Cloud Console -> Edita la credencial OAuth que creaste antes y añade la URL copiada al campo **URI de redirección autorizados** (Authorized redirect URIs). Guarda los cambios.

---

## 3. Despliegue en Netlify (Free Tier) y Repositorio GitHub

### Paso A: Crear tu Repositorio en GitHub
1. Crea un nuevo repositorio en GitHub llamado `CastorWallet`.
2. En tu terminal local de Windows, corre los comandos estándar para subir tu código actual:
   ```bash
   git init
   git add .
   git commit -m "initial skeleton setup: vite, react, ts, clean architecture design"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/CastorWallet.git
   git push -u origin main
   ```

### Paso B: Conectar y Desplegar en Netlify
1. Crea una cuenta gratuita en [Netlify](https://www.netlify.com/).
2. En el panel de control de Netlify, haz clic en **Add new site** -> **Import an existing project**.
3. Selecciona **GitHub** y autoriza a Netlify para acceder a tus repositorios. Elige `CastorWallet`.
4. En la configuración de Build:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Haz clic en **Advanced build settings** (o ve a Site settings -> Environment variables luego del deploy) y añade estas dos variables clave:
   * `VITE_SUPABASE_URL`: (Encuéntrala en Supabase -> Project Settings -> API)
   * `VITE_SUPABASE_ANON_KEY`: (Encuéntrala en Supabase -> Project Settings -> API)
6. Haz clic en **Deploy site**. ¡Netlify compilará y desplegará tu app móvil automáticamente con cada push a `main`!

*Nota: La aplicación ya incluye el archivo `public/_redirects` necesario para que las rutas Single Page Application funcionen correctamente en Netlify sin dar errores 404.*

---

## 4. Pruebas Locales antes de Desplegar

Para probar localmente, crea un archivo `.env.local` en la raíz de tu proyecto e ingresa tus claves de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-aqui
```

Luego, ejecuta en consola:
```bash
npm run dev
```
Abre la URL local en el navegador y activa la **vista móvil** en las herramientas de desarrollador (F12) para tener la experiencia táctil idónea de CastorWallet.
