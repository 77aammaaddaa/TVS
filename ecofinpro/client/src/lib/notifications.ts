export type NotificationType = 'info' | 'warning' | 'critical' | 'success';

// Offline notification sync has been removed.
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'info',
  link?: string
) {
  console.warn('createNotification called after offline sync removal:', { userId, title, message, type, link });
  return;
}

export async function getNotifications(userId: string): Promise<any[]> {
  return [];
}

export async function markAsRead(notifId: string) {
  return;
}

export async function markAllAsRead(userId: string) {
  return;
}

// ---------- AI-Ops Scanner (from MVP XAlerts) ----------
export async function scanSystemHealth(_userId: string): Promise<number> {
  console.warn('scanSystemHealth called after offline sync removal');
  return 0;
}
