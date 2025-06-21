import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Функция для безопасной настройки real-time подписки
export const setupRealtimeSubscription = async (callback: () => void) => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    if (!session) {
      console.log('No active session found, skipping realtime subscription');
      return null;
    }

    console.log('Session found, setting up realtime subscription');
    callback();

    return session;
  } catch (error) {
    console.error('Failed to setup realtime subscription:', error);
    return null;
  }
};
