import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Falta configurar las variables de entorno de Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).\n' +
    'Por ahora se inicializará un cliente placeholder. Configura estas variables en un archivo .env.local'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://your-supabase-url.supabase.co',
  supabaseAnonKey || 'your-supabase-anon-key'
);
