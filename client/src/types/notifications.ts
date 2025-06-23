export interface Notification {
  id: number;
  userId: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: number | null;
  relatedType?: string | null;
}