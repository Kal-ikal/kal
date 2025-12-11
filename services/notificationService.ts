// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: services/notificationService.ts
// 📝 Aksi: CREATE NEW FILE
// ✅ Service untuk create notification + send push notification
// ===========================================================

import { supabase } from '@/lib/supabase';

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  data?: Record<string, any>;
}

/**
 * Create notification in database and send push notification
 */
export async function createNotificationWithPush({
  userId,
  title,
  message,
  type,
  data,
}: CreateNotificationParams) {
  try {
    // 1. Insert notification ke database
    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        is_read: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting notification:', insertError);
      throw insertError;
    }

    console.log('Notification created:', notification);

    // 2. Send push notification via Edge Function
    const { data: pushResult, error: pushError } = await supabase.functions.invoke(
      'send-push-notification',
      {
        body: {
          user_id: userId,
          title,
          body: message,
          data: {
            notification_id: notification.id,
            type,
            ...data,
          },
        },
      }
    );

    if (pushError) {
      console.error('Error sending push notification:', pushError);
      // Don't throw - notification sudah tersimpan, push error bukan critical
    } else {
      console.log('Push notification sent:', pushResult);
    }

    return { notification, pushResult };
  } catch (error) {
    console.error('Error in createNotificationWithPush:', error);
    throw error;
  }
}

/**
 * Send notification to multiple users
 */
export async function createBulkNotificationWithPush(
  users: string[],
  title: string,
  message: string,
  type: 'success' | 'error' | 'warning' | 'info',
  data?: Record<string, any>
) {
  const results = await Promise.allSettled(
    users.map((userId) =>
      createNotificationWithPush({
        userId,
        title,
        message,
        type,
        data,
      })
    )
  );

  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`Bulk notification: ${successful} succeeded, ${failed} failed`);

  return { successful, failed, results };
}
