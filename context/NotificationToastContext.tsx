// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/context/NotificationToastContext.tsx
// 📝 Aksi: CREATE NEW FILE
// ✅ V6: Toast notification context using react-native-notificated
// 
// INSTALL: npm install react-native-notificated
// ===========================================================

import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react-native';

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, description?: string, duration?: number) => void;
  showSuccess: (title: string, description?: string) => void;
  showError: (title: string, description?: string) => void;
  showWarning: (title: string, description?: string) => void;
  showInfo: (title: string, description?: string) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast icons and colors
const toastConfig = {
  success: {
    icon: CheckCircle,
    color: '#059669',
    bgColor: '#D1FAE5',
    darkBgColor: 'rgba(5, 150, 105, 0.15)',
  },
  error: {
    icon: XCircle,
    color: '#DC2626',
    bgColor: '#FEE2E2',
    darkBgColor: 'rgba(220, 38, 38, 0.15)',
  },
  warning: {
    icon: AlertCircle,
    color: '#D97706',
    bgColor: '#FEF3C7',
    darkBgColor: 'rgba(217, 119, 6, 0.15)',
  },
  info: {
    icon: Info,
    color: '#2563EB',
    bgColor: '#DBEAFE',
    darkBgColor: 'rgba(37, 99, 235, 0.15)',
  },
};

// Single Toast Component
function ToastItem({
  toastData,
  onHide,
  isDarkMode = false,
}: {
  toastData: Toast;
  onHide: (id: string) => void;
  isDarkMode?: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  const { icon: Icon, color, bgColor, darkBgColor } = toastConfig[toastData.type];

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide
    const timer = setTimeout(() => {
      hideWithAnimation();
    }, toastData.duration || 3000);

    return () => clearTimeout(timer);
  }, []);

  const hideWithAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide(toastData.id);
    });
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY }],
        marginBottom: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          borderRadius: 12,
          backgroundColor: isDarkMode ? darkBgColor : bgColor,
          borderLeftWidth: 4,
          borderLeftColor: color,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        <View style={{ marginRight: 12 }}>
          <Icon color={color} size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontWeight: '600',
            color: isDarkMode ? '#F9FAFB' : '#1F2937',
            fontSize: 14
          }}>
            {toastData.title}
          </Text>
          {toastData.description && (
            <Text style={{
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
              fontSize: 12,
              marginTop: 2
            }}>
              {toastData.description}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={hideWithAnimation} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X color={isDarkMode ? '#9CA3AF' : '#6B7280'} size={18} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// Toast Container
function ToastContainer({ 
  toasts, 
  onHide,
  isDarkMode = false,
}: { 
  toasts: Toast[]; 
  onHide: (id: string) => void;
  isDarkMode?: boolean;
}) {
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 10,
        left: 16,
        right: 16,
        zIndex: 9999,
      }}
      pointerEvents="box-none"
    >
      {toasts.map((item) => (
        <ToastItem
          key={item.id}
          toastData={item}
          onHide={onHide}
          isDarkMode={isDarkMode}
        />
      ))}
    </View>
  );
}

interface ToastProviderProps {
  children: React.ReactNode;
  isDarkMode?: boolean;
}

export function ToastProvider({ children, isDarkMode = false }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((
    type: ToastType, 
    title: string, 
    description?: string, 
    duration?: number
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { id, type, title, description, duration };
    
    setToasts((prev) => [...prev.slice(-2), newToast]); // Keep max 3 toasts
  }, []);

  const showSuccess = useCallback((title: string, description?: string) => {
    showToast('success', title, description);
  }, [showToast]);

  const showError = useCallback((title: string, description?: string) => {
    showToast('error', title, description);
  }, [showToast]);

  const showWarning = useCallback((title: string, description?: string) => {
    showToast('warning', title, description);
  }, [showToast]);

  const showInfo = useCallback((title: string, description?: string) => {
    showToast('info', title, description);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} isDarkMode={isDarkMode} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
