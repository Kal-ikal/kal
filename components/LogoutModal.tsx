import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LogOut} from 'lucide-react-native';

interface LogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDarkMode: boolean;
}

export default function LogoutModal({
  visible,
  onClose,
  onConfirm,
  isDarkMode,
}: LogoutModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop with Blur */}
      <Pressable
        className="flex-1 justify-center items-center"
        onPress={onClose}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <BlurView
          intensity={Platform.OS === 'android' ? 50 : 80}
          tint={isDarkMode ? 'dark' : 'light'}
          experimentalBlurMethod="dimezisBlurView"
          className="absolute inset-0"
        />

        {/* Modal Content */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="mx-6 w-5/6 max-w-sm"
        >
          <View
            className={`rounded-3xl overflow-hidden shadow-2xl ${
              isDarkMode ? 'bg-gray-800/95' : 'bg-white/95'
            }`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Header */}
            <View className="items-center pt-8 pb-4 px-6">
              {/* Icon Container */}
              <View
                className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${
                  isDarkMode ? 'bg-red-900/30' : 'bg-red-50'
                }`}
              >
                <LogOut
                  color={isDarkMode ? '#EF4444' : '#DC2626'}
                  size={36}
                  strokeWidth={2}
                />
              </View>

              {/* Title */}
              <Text
                className={`text-2xl font-bold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                Logout
              </Text>

              {/* Message */}
              <Text
                className={`text-center text-base leading-6 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}
              >
                Are you sure you want to logout? You&apos;ll need to sign in again to
                access your account.
              </Text>
            </View>

            {/* Divider */}
            <View
              className={`h-px ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            />

            {/* Actions */}
            <View className="p-6">
              {/* Logout Button */}
              <TouchableOpacity
                onPress={onConfirm}
                className="bg-red-500 rounded-2xl py-4 mb-3 shadow-lg"
                activeOpacity={0.8}
                style={{
                  shadowColor: '#EF4444',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Text className="text-white text-center font-bold text-lg">
                  Yes, Logout
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={onClose}
                className={`rounded-2xl py-4 border-2 ${
                  isDarkMode
                    ? 'border-gray-600 bg-gray-700/50'
                    : 'border-gray-300 bg-gray-50'
                }`}
                activeOpacity={0.8}
              >
                <Text
                  className={`text-center font-semibold text-lg ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}