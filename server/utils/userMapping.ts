import { getStorage } from '../storage';
import { logger } from './logger';
import type { User } from '@supabase/supabase-js';

export async function getDbUserBySupabaseUser(
  supabaseUser: Pick<User, 'email' | 'id'>
) {
  if (!supabaseUser.email) {
    throw new Error('User email not found');
  }

  try {
    const user = await getStorage().getUserByEmail(supabaseUser.email);

    if (!user) {
      throw new Error('User not found in database');
    }

    return {
      id: user.id,
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
