// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: hooks/usePushNotifications.ts
// 📝 Aksi: REPLACE file
// ✅ Hook untuk Push Notifications dengan Expo
// ===========================================================

import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationState {
  expoPushToken?: string;
  notification?: Notifications.Notification;
}

export const usePushNotifications = (): PushNotificationState => {
  const [expoPushToken, setExpoPushToken] = useState<string>();
  const [notification, setNotification] = useState<Notifications.Notification>();

  // Types are inferred correctly usually, but we can be explicit
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      try {
        const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
        const tokenData = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined
        );
        token = tokenData.data;
        console.log('Expo Push Token:', token);
      } catch (error) {
        console.error('Error getting push token:', error);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  async function savePushTokenToDatabase(token: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log('No user logged in');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ expo_push_token: token })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Push token saved to database successfully');
      }
    } catch (error) {
      console.error('Error in savePushTokenToDatabase:', error);
    }
  }

  useEffect(() => {
    // Register for push notifications and save token
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        savePushTokenToDatabase(token);
      }
    });

    // Listener for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received in foreground:', notification);
      setNotification(notification);
    });

    // Listener for when user taps on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      console.log('Notification data:', data);
    });

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
  };
};
