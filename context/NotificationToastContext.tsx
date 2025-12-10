// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/context/NotificationToastContext.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ Phase 4: Position-aware toast notifications
// ===========================================================

import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react-native";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  Dimensions,
  GestureResponderEvent,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type ToastType = "success" | "error" | "warning" | "info";

interface ToastPosition {
  x: number;
  y: number;
}

interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  position?: ToastPosition;
}

interface ToastContextType {
  showSuccess: (title: string, message?: string, positionOrEvent?: GestureResponderEvent | ToastPosition) => void;
  showError: (title: string, message?: string, positionOrEvent?: GestureResponderEvent | ToastPosition) => void;
  showWarning: (title: string, message?: string, positionOrEvent?: GestureResponderEvent | ToastPosition) => void;
  showInfo: (title: string, message?: string, positionOrEvent?: GestureResponderEvent | ToastPosition) => void;
  // Legacy support (tanpa position)
  showToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_DURATION = 3000;
const TOAST_WIDTH = SCREEN_WIDTH - 40;

// Get icon based on type
const getToastIcon = (type: ToastType) => {
  const size = 22;
  switch (type) {
    case "success":
      return <CheckCircle color="#fff" size={size} />;
    case "error":
      return <XCircle color="#fff" size={size} />;
    case "warning":
      return <AlertCircle color="#fff" size={size} />;
    case "info":
      return <Info color="#fff" size={size} />;
  }
};

// Get colors based on type
const getToastColors = (type: ToastType) => {
  switch (type) {
    case "success":
      return { bg: "#10B981", border: "#059669" };
    case "error":
      return { bg: "#EF4444", border: "#DC2626" };
    case "warning":
      return { bg: "#F59E0B", border: "#D97706" };
    case "info":
      return { bg: "#3B82F6", border: "#2563EB" };
  }
};

// Single Toast Component
function Toast({
  toastData,
  onDismiss,
}: {
  toastData: ToastData;
  onDismiss: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(20);

  const colors = getToastColors(toastData.type);

  // Calculate position
  const getToastPosition = () => {
    if (!toastData.position) {
      // Default: top center
      return {
        top: insets.top + 60,
        left: 20,
      };
    }

    const { y } = toastData.position;
    const TOAST_HEIGHT = 80;
    const PADDING = 20;

    // Determine if toast should appear above or below press point
    const spaceAbove = y - insets.top;
    const spaceBelow = SCREEN_HEIGHT - y - insets.bottom;

    let top: number;
    if (spaceBelow > TOAST_HEIGHT + PADDING) {
      // Show below press point
      top = y + PADDING;
    } else if (spaceAbove > TOAST_HEIGHT + PADDING) {
      // Show above press point
      top = y - TOAST_HEIGHT - PADDING;
    } else {
      // Center vertically
      top = SCREEN_HEIGHT / 2 - TOAST_HEIGHT / 2;
    }

    // Ensure toast stays within screen bounds
    top = Math.max(insets.top + 10, Math.min(top, SCREEN_HEIGHT - TOAST_HEIGHT - insets.bottom - 10));

    return {
      top,
      left: 20,
    };
  };

  const position = getToastPosition();

  const dismissToast = useCallback(() => {
    opacity.value = withTiming(0, { duration: 150 });
    scale.value = withTiming(0.8, { duration: 150 });
    translateY.value = withTiming(-20, { duration: 150 }, (finished) => {
      if (finished) {
        scheduleOnRN(onDismiss, toastData.id);
      }
    });
  }, [opacity, scale, translateY, onDismiss, toastData.id]);

  // Animate in
  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.5)) });
    translateY.value = withTiming(0, { duration: 200 });

    // Auto dismiss
    const timer = setTimeout(() => {
      dismissToast();
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [opacity, scale, translateY, dismissToast]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: position.top,
          left: position.left,
          width: TOAST_WIDTH,
          zIndex: 9999,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          backgroundColor: colors.bg,
          borderRadius: 16,
          borderLeftWidth: 4,
          borderLeftColor: colors.border,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          {getToastIcon(toastData.type)}
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "#fff",
              fontWeight: "700",
              fontSize: 15,
            }}
            numberOfLines={1}
          >
            {toastData.title}
          </Text>
          {toastData.message && (
            <Text
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: 13,
                marginTop: 2,
              }}
              numberOfLines={2}
            >
              {toastData.message}
            </Text>
          )}
        </View>

        {/* Dismiss Button */}
        <TouchableOpacity
          onPress={dismissToast}
          style={{
            padding: 6,
            marginLeft: 8,
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X color="rgba(255,255,255,0.7)" size={18} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// Provider Component
export function NotificationToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, position?: ToastPosition) => {
      const id = `toast-${++toastIdRef.current}`;
      
      setToasts((prev) => {
        // Limit to 3 toasts max
        const newToasts = prev.length >= 3 ? prev.slice(1) : prev;
        return [...newToasts, { id, type, title, message, position }];
      });
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Extract position from event or object
  const getPositionFromEvent = (eventOrPos?: GestureResponderEvent | ToastPosition): ToastPosition | undefined => {
    if (!eventOrPos) return undefined;

    // Check if it's a native event
    if ('nativeEvent' in eventOrPos && eventOrPos.nativeEvent) {
       return {
         x: eventOrPos.nativeEvent.pageX,
         y: eventOrPos.nativeEvent.pageY,
       };
    }

    // Check if it's already a position object
    if ('x' in eventOrPos && 'y' in eventOrPos) {
      return eventOrPos as ToastPosition;
    }

    return undefined;
  };

  const showSuccess = useCallback(
    (title: string, message?: string, positionOrEvent?: GestureResponderEvent | ToastPosition) => {
      addToast("success", title, message, getPositionFromEvent(positionOrEvent));
    },
    [addToast]
  );

  const showError = useCallback(
    (title: string, message?: string, positionOrEvent?: GestureResponderEvent | ToastPosition) => {
      addToast("error", title, message, getPositionFromEvent(positionOrEvent));
    },
    [addToast]
  );

  const showWarning = useCallback(
    (title: string, message?: string, positionOrEvent?: GestureResponderEvent | ToastPosition) => {
      addToast("warning", title, message, getPositionFromEvent(positionOrEvent));
    },
    [addToast]
  );

  const showInfo = useCallback(
    (title: string, message?: string, positionOrEvent?: GestureResponderEvent | ToastPosition) => {
      addToast("info", title, message, getPositionFromEvent(positionOrEvent));
    },
    [addToast]
  );

  // Legacy support
  const showToast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      addToast(type, title, message);
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showToast,
      }}
    >
      {children}
      
      {/* Toast Container */}
      {toasts.map((item) => (
        <Toast key={item.id} toastData={item} onDismiss={removeToast} />
      ))}
    </ToastContext.Provider>
  );
}

// Backwards-compatible export: `ToastProvider` expected by older layouts
export function ToastProvider({ children, isDarkMode }: { children: React.ReactNode; isDarkMode?: boolean }) {
  // `isDarkMode` was previously passed in by layout wrappers; it's not needed here
  return <NotificationToastProvider>{children}</NotificationToastProvider>;
}

// Hook
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within NotificationToastProvider");
  }
  return context;
}

// Export type for external use
export type { GestureResponderEvent, ToastType };
