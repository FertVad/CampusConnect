import { getStorage } from '../storage';
import { logger } from './logger';
import type { User } from '@supabase/supabase-js';

export async function getDbUserBySupabaseUser(supabaseUser: Pick<User, 'email' | 'id'>) {
  const email = supabaseUser.email;
  if (!email) {
    throw new Error('User email not found');
  }

  try {
    const user = await getStorage().getUserByEmail(email);
    if (!user) {
      throw new Error('User not found in database');
    }

    return {
      id: user.authUserId || user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    };
  } catch (error) {
    logger.error('User mapping error:', error);
    throw error;
  }
}
