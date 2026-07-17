# 🦫 CastorWallet

[![React](https://img.shields.io/badge/React-19-blue.svg?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF.svg?logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E.svg?logo=supabase&logoColor=white)](https://supabase.com/)
[![Netlify](https://img.shields.io/badge/Netlify-Deployed-00C7B7.svg?logo=netlify&logoColor=white)](https://www.netlify.com/)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20%2B%20SOLID-orange.svg)]()
[![Design System](https://img.shields.io/badge/Design%20System-Organic%20Finance-forestgreen.svg)]()

**CastorWallet** es una aplicación móvil premium de finanzas personales y gestión de presupuesto diseñada **100% para dispositivos móviles**. Desarrollada bajo los principios de **Clean Architecture** (Arquitectura Limpia) y **SOLID**, utiliza **React 19**, **TypeScript** y **Vite** en el Frontend, respaldados por la robusta infraestructura de bases de datos y autenticación de **Supabase**.

---

## 🎨 Sistema de Diseño: "Organic Finance" / "The Modern Naturalist"

La estética visual de CastorWallet ha sido inspirada por un enfoque natural y moderno, alejándose de los esquemas financieros corporativos tradicionales. El diseño implementa una combinación de:

*   **Paleta Cromática Terrosa y Orgánica:**
    *   Fondo base en tono hueso/pergamino (`#faf9f7`) y tarjetas flotantes en blanco puro (`#ffffff`).
    *   Tono primario en verde bosque profundo (`#163428`).
    *   Tono de éxito en verde menta/salvia (`#3e6658`) para los ingresos.
    *   Tono de error/advertencia en rojo arcilla (`#ba1a1a`) para los gastos.
    *   Detalles de presupuestos en color café tierra (`#7d5a50`).
*   **Aero-interacciones y Tactilidad Móvil:**
    *   Efectos de vidrio esmerilado (**glassmorphism**).
    *   Sombras difusas basadas en reflejos verdes ambientales (`rgba(22, 52, 40, 0.05)`).
    *   Retroalimentación táctil inmediata al presionar botones (efectos de escalamiento `scale(0.98)`).
    *   Tipografía limpia y moderna utilizando **Manrope** de Google Fonts para la máxima legibilidad de números y montos en interfaces reducidas.

---

## 🚀 Características Clave

1.  📱 **Mobile-First Estricto:** Diseñado exclusivamente para interactuar mediante pantallas táctiles y optimizado para anchos de dispositivos de 360px a 480px.
2.  🔐 **Autenticación Segura con Google:** Integración directa con **Supabase Auth** y **Google Cloud OAuth** (soporta inicio de sesión nativo de Google y redirección alternativa).
3.  📊 **Panel de Control Dinámico:** Visualización rápida del balance neto, ingresos y egresos agregados del mes actual con micro-animaciones fluidas.
4.  💸 **Gestión Completa de Transacciones:** Registro interactivo de gastos y ganancias con fecha, categoría y descripción detallada. Permite creación, edición y eliminación de datos.
5.  🎯 **Planificador de Presupuestos Activo:** Define límites máximos de gasto mensual por categoría. Muestra barras de progreso de consumo en tiempo real que cambian de color según la cercanía al límite.
6.  🏷️ **Gestor de Categorías Integrado:** Permite activar o desactivar categorías personalizadas para adaptar la aplicación a las necesidades de cada usuario.
7.  💵 **Formato Regional Español (`es-ES`):** Los montos de dinero se formatean con separador de miles y sin decimales (ej: `$1.250` en lugar de `$1250.00` o `$1.250,00`), simplificando la visualización móvil.
8.  🔔 **Feedback Premium:** Las advertencias y cuadros de confirmación utilizan modales estéticamente integrados mediante **SweetAlert2**, reemplazando las ventanas emergentes nativas del navegador.

---

## 🏛️ Arquitectura del Software: Clean Architecture

Para garantizar que el proyecto sea altamente mantenible, escalable y fácilmente testeable, CastorWallet está estructurado en capas bien diferenciadas basadas en la **regla de dependencia**: *las capas internas no conocen nada de las capas externas*.

```
src/
├── domain/              # Capa de Dominio (Reglas de Negocio Puras)
│   ├── entities/        # Modelos e interfaces de negocio (Transaction, Budget, Category)
│   ├── repositories/    # Contratos/Interfaces para persistencia de datos
│   └── usecases/        # Casos de uso específicos del negocio (ej. AgregarTransaccion)
│
├── data/                # Capa de Datos (Lógica de Persistencia y Red)
│   ├── mappers/         # Transformadores entre modelos de BD y entidades de dominio
│   └── repositories/    # Implementaciones concretas de interfaces de persistencia (Supabase)
│
├── presentation/        # Capa de Presentación (UI y Estado de React)
│   ├── components/      # Vistas y componentes visuales (Dashboard, History, etc.)
│   ├── context/         # Proveedores de estado global (AuthContext, AppContext)
│   ├── hooks/           # Custom hooks para aislar lógica UI (useTransactions, etc.)
│   └── styles/          # Variables CSS, index.css y sistema de diseño visual
│
└── infrastructure/      # Capa Técnica de Configuración
    └── supabase/        # Inicialización del cliente Supabase y variables de red
```

### Reglas de Dependencia
*   **Dominio Puro:** La carpeta [domain/](file:///c:/Proyectos/CastorWallet/src/domain) está escrita en TypeScript puro sin depender de React, Supabase o cualquier framework externo.
*   **Independencia de Persistencia:** Si en el futuro decidimos cambiar Supabase por Firebase o LocalStorage, solo debemos agregar una nueva implementación en [data/repositories/](file:///c:/Proyectos/CastorWallet/src/data/repositories), sin tocar la interfaz de usuario ni las reglas de negocio.

---

## 🗄️ Modelo de Datos y Seguridad (Supabase RLS)

CastorWallet utiliza PostgreSQL en Supabase, protegido por **Row Level Security (RLS)**. Cada usuario tiene acceso de lectura/escritura exclusivo a su propia información de forma garantizada a nivel base de datos.

### Diagrama de Entidades de Base de Datos
*   **`profiles`**: Almacena información básica del usuario (avatar, nombre, correo) sincronizada mediante un disparador de la tabla `auth.users`.
*   **`transactions`**: Historial de movimientos financieros (ingresos y gastos) relacionados con un ID de usuario.
*   **`budgets`**: Registra los límites mensuales de gasto por categoría e introduce restricciones únicas para evitar duplicados en el mismo mes y año.
*   **`categories`**: Administrador de opciones de categorización personalizadas.

> [!NOTE]
> Puedes consultar e instalar el esquema DDL completo de la base de datos, las políticas RLS y el Trigger de sincronización de usuarios en la [Guía de Configuración Externa (SETUP_GUIDE.md)](file:///c:/Proyectos/CastorWallet/SETUP_GUIDE.md).

---

## 🛠️ Configuración e Instalación Local

Sigue estos sencillos pasos para levantar y ejecutar la aplicación en tu entorno local.

### 1. Clonar el Proyecto e Instalar Dependencias
```bash
git clone https://github.com/Danccs/CastorWallet.git
cd CastorWallet
npm install
```

### 2. Configurar Variables de Entorno
Crea un archivo `.env.local` en la raíz de tu proyecto e introduce tus credenciales de Supabase y el ID de Google Client obtenido desde la Consola de Google Cloud:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-de-supabase
VITE_GOOGLE_CLIENT_ID=tu-id-de-cliente-google.apps.googleusercontent.com
```

### 3. Ejecutar el Servidor de Desarrollo
```bash
npm run dev
```

Abre la dirección `http://localhost:5173` en tu navegador.
> [!TIP]
> Dado que la aplicación está diseñada para uso móvil, te recomendamos presionar **F12** en tu navegador para abrir las herramientas de desarrollador y activar la **vista móvil** (Responsive Design Mode).

---

## ☁️ Despliegue en Producción (Netlify)

El proyecto está preparado para desplegarse fácilmente en **Netlify (Free Tier)** con integración continua (CI/CD) desde tu repositorio de GitHub:

1.  Crea un nuevo sitio en Netlify importando el repositorio de **CastorWallet**.
2.  Configura los comandos de build:
    *   **Build command:** `npm run build`
    *   **Publish directory:** `dist`
3.  Agrega las variables de entorno en la sección *Site configuration -> Environment variables* de Netlify:
    *   `VITE_SUPABASE_URL`
    *   `VITE_SUPABASE_ANON_KEY`
    *   `VITE_GOOGLE_CLIENT_ID`
4.  ¡Haz clic en **Deploy site**! Netlify compilará el código y desplegará los recursos estáticos.

*Nota: El repositorio ya contiene el archivo `public/_redirects` necesario para evitar errores 404 de enrutamiento al recargar páginas SPA dentro de Netlify.*

---

## 👨‍💻 Directrices de Desarrollo (Harness IA)

Si estás trabajando con un asistente de inteligencia artificial o deseas contribuir al repositorio:
*   Respeta el tipado estricto en [domain/entities/](file:///c:/Proyectos/CastorWallet/src/domain/entities) y evita el tipo `any`.
*   Mantén las interacciones visuales adaptadas a pantallas móviles respetando el archivo [index.css](file:///c:/Proyectos/CastorWallet/src/index.css).
*   Utiliza la envoltura en [alerts.ts](file:///c:/Proyectos/CastorWallet/src/presentation/utils/alerts.ts) para mostrar ventanas emergentes interactivas de SweetAlert2.
*   Puedes leer directrices de código más específicas en el archivo [Agente.md](file:///c:/Proyectos/CastorWallet/Agente.md).
