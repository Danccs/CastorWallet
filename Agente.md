# Agente.md - Harness IA de CastorWallet

Este archivo define las directrices y estándares para cualquier asistente de IA que trabaje en el proyecto **CastorWallet**.

---

## 1. Visión del Proyecto
**CastorWallet** es una aplicación de finanzas personales y gestión de presupuesto diseñada **100% para dispositivos móviles**.
* **Infraestructura**: Despliegue en Netlify (Free Tier).
* **Base de Datos**: Supabase (PostgreSQL, Free Tier).
* **Autenticación**: Supabase Auth con Google.
* **Estilos**: Vanilla CSS con enfoque premium, gradientes modernos y adaptado al uso móvil táctil.

---

## 2. Arquitectura de Software: Clean Architecture + SOLID
Para evitar el acoplamiento y asegurar la mantenibilidad del proyecto sin caer en sobre-ingeniería, organizamos el código en 4 áreas funcionales dentro de `src/`:

```
src/
├── domain/            # Capa de Dominio (Reglas de Negocio Puras)
│   ├── entities/      # Interfaces de Datos de Negocio (ej: Transaccion, Presupuesto, Categoria)
│   ├── repositories/  # Definiciones de Interfaces (Contracts) para persistencia
│   └── usecases/      # Casos de uso (ej: AgregarTransaccion, ObtenerBalance)
│
├── data/              # Capa de Datos (Implementaciones e Infraestructura de Red)
│   ├── mappers/       # Conversión entre modelos de base de datos y entidades de negocio
│   └── repositories/  # Implementaciones de las interfaces de dominio usando Supabase
│
├── presentation/      # Capa de Presentación (UI y Estado de React)
│   ├── components/    # Componentes atómicos de UI (Botones, Tarjetas, Inputs)
│   ├── views/         # Vistas/Pantallas principales (Dashboard, Transacciones, Presupuestos)
│   ├── context/       # Estados globales y Autenticación (AuthContext, etc.)
│   ├── hooks/         # Custom hooks para encapsular lógica de presentación
│   └── styles/        # index.css y sistema de diseño visual (colores, fuentes)
│
└── infrastructure/    # Capa de Configuración Técnica e Iniciadores
    └── supabase/      # Cliente de Supabase y configuraciones de red
```

### Reglas de Dependencia
* **La Capa de Dominio NO debe importar nada de la capa de Datos ni de Presentación.** Es Typescript puro.
* La UI (`presentation/`) interactúa con el dominio a través de **Casos de Uso** o mediante **Hooks** que consumen las implementaciones de repositorios pasadas por contexto o inyectadas.
* Cualquier cambio en el motor de base de datos (por ejemplo, migrar de Supabase a LocalStorage o Firebase) solo debe requerir crear una nueva implementación en `data/repositories/` sin modificar la UI o el Dominio.

---

## 3. Principios de Diseño Visual (Premium Mobile UI)
* **Mobile-First Estricto**: Todo componente debe diseñarse pensando en pantallas táctiles de teléfono (ancho objetivo de 360px a 450px).
* **Sistema de Diseño (CSS)**:
  * Utilizar variables CSS para la paleta de colores. Usar colores sofisticados (no primarios puros): tonos HSL oscuros/claros armonizados, gradientes sutiles y efectos de vidrio (glassmorphism).
  * Evitar placeholders y utilizar animaciones fluidas para transiciones (hover, active, transiciones de página).
  * Las interacciones táctiles deben tener un feedback claro (ej: `transform: scale(0.98)` al presionar botones).

---

## 4. Instrucciones de Programación para la IA
1. **Tipado Estricto**: Todos los modelos deben tener interfaces de TypeScript explícitas en `domain/entities/`. Evitar `any`.
2. **Seguridad con Supabase**: Todas las consultas deben asumir que RLS (Row Level Security) está habilitado. Asegurar que el `user_id` de la sesión siempre se envíe o esté contemplado en las consultas y filtros.
3. **Manejo de Errores**: Capturar errores en la capa `data` y transformarlos en objetos de error comprensibles para el dominio antes de lanzarlos a la UI.
4. **Comentarios de Código**: Mantener comentarios claros en la lógica de negocio compleja, respetando la estructura existente.
5. **No Placeholders**: Al crear vistas, implementar datos dummy realistas si la base de datos no está disponible, para que la UI sea funcional de inmediato.
6. **Formato de Montos**: Mostrar siempre todos los montos de dinero formateados con separador de miles y sin decimales en todas las pantallas, listas, tablas y resúmenes de la aplicación, utilizando la configuración regional `'es-ES'` con `maximumFractionDigits: 0` (ej: `$1.250` en lugar de `$1250.00` o `$1.250,00`).
7. **Mensajes del Sistema**: Todos los mensajes informativos, advertencias, errores y flujos de confirmación de usuario deben presentarse a través del componente estéticamente premium SweetAlert2 mediante la envoltura en [alerts](file:///c:/Proyectos/CastorWallet/src/presentation/utils/alerts.ts) en lugar de utilizar los métodos predeterminados del navegador (`alert()` y `confirm()`), manteniendo un diseño visual cohesivo e integrado con los estilos de la app.
