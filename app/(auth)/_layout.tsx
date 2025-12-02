import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: styles.background,
        animation: 'slide_from_right',
        animationDuration: 300,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen 
        name="login" 
        options={{ 
          animation: 'fade',
          gestureEnabled: false 
        }} 
      />
      <Stack.Screen 
        name="forgot-password" 
        options={{ 
          animation: 'fade_from_bottom',
          gestureEnabled: true
        }} 
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#EFF6FF',
  },
});