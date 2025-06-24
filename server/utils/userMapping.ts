import { getStorage } from '../storage';
import { logger } from './logger';
import type { User } from '@supabase/supabase-js';

export async function getDbUserBySupabaseUser(supabaseUser: Pick<User, 'email' | 'id'>) {
  console.log('🔍 [DEBUG] getDbUserBySupabaseUser called with:', {
    email: supabaseUser.email,
    id: supabaseUser.id
  });

  const email = supabaseUser.email;
  if (!email) {
    console.log('❌ [ERROR] No email found');
    throw new Error('User email not found');
  }

  try {
    const user = await getStorage().getUserByEmail(email);
    console.log('🔍 [DEBUG] getUserByEmail result:', user ? {
      id: user.id,
      email: user.email,
      role: user.role
    } : 'null');

    if (!user) {
      console.log('❌ [ERROR] User not found in database');
      throw new Error('User not found in database');
    }

    const result = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };

    console.log('✅ [SUCCESS] userMapping result:', result);
    return result;
  } catch (error) {
    console.log('🚨 [ERROR] userMapping error:', error);
    logger.error('User mapping error:', error);
    throw error;
  }
}
