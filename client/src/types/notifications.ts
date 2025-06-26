// Re-export the Notification type from the shared schema to keep
// the frontend in sync with the backend definitions. The backend
// uses UUID strings for identifiers, so the type reflects that.

import type { Notification as SharedNotification } from '@shared/schema';

export type Notification = SharedNotification;
