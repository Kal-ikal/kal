import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { cssInterop } from 'nativewind';

// Setup Animated View for NativeWind
cssInterop(Animated.View, { className: 'style' });

export function Toast() {
  const [message, setMessage] = useState<string | null>(null);
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as { title: string; message: string };
          setMessage(`${newNotif.title}: ${newNotif.message}`);

          // Auto hide after 4 seconds
          setTimeout(() => {
            setMessage(null);
          }, 4000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user]);

  if (!message) return null;

  return (
    <Animated.View
      entering={FadeInUp.springify()}
      exiting={FadeOutUp}
      className="absolute top-12 left-4 right-4 bg-gray-900 dark:bg-gray-100 p-4 rounded-xl shadow-lg z-50 flex-row items-center justify-between"
    >
      <Text className="text-white dark:text-gray-900 font-medium text-sm flex-1">
        {message}
      </Text>
    </Animated.View>
  );
}
