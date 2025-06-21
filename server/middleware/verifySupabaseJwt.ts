import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { getDbUserBySupabaseUser } from '../utils/userMapping';
import type { AuthenticatedUser } from '../types/auth';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function verifySupabaseJwt(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').map(c => c.trim());
      for (const cookie of cookies) {
        if (cookie.startsWith('sb-access-token=')) {
          token = cookie.substring('sb-access-token='.length);
          break;
        }
      }
    }


    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (process.env.NODE_ENV === 'development') {
      logger.info('verifySupabaseJwt getUser error:', error);
      logger.info('verifySupabaseJwt getUser data:', data);
    }
    if (error || !data?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const dbUser = await getDbUserBySupabaseUser(data.user);

    const mergedUser: AuthenticatedUser = {
      id: data.user.id,
      email: data.user.email || '',
      publicId: dbUser.id,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      role: dbUser.role,
    };

    (req as any).user = mergedUser;
    next();
  } catch (err) {
    next(err);
  }
}
