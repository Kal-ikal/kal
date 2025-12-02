import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Home,
  FileText,
  DollarSign,
  User,
  Settings,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarStore } from "@/hooks/useTabBarStore";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";

// NativeWind Fix
cssInterop(LinearGradient, { className: "style" });

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Tab configuration matching the routes
const TABS = [
  { name: "home", icon: Home, label: "Home" },
  { name: "pengajuan", icon: FileText, label: "Pengajuan" },
  { name: "konversi", icon: DollarSign, label: "Konversi" },
  { name: "profile", icon: User, label: "Profile" },
  { name: "settings", icon: Settings, label: "Settings" },
];

const PRIMARY_COLOR = "#130057"; // Deep Navy
const ACTIVE_BG_COLOR = "#FFFFFF"; // White
const ACTIVE_ICON_COLOR = "#130057"; // Deep Navy
const INACTIVE_ICON_COLOR = "#FFFFFF"; // White

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const isVisible = useTabBarStore((state) => state.isVisible);

  // Shared Value for visibility animation (Y-axis translation)
  const translateY = useSharedValue(0);

  // React to visibility changes
  useEffect(() => {
    // Hide value: Height of bar (approx 60) + bottom padding
    const hideValue = 100 + insets.bottom + 30;
    translateY.value = withTiming(isVisible ? 0 : hideValue, {
      duration: 300,
    });
  }, [isVisible, insets.bottom, translateY]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          // Specific positioning fix: Use insets.bottom for BOTH platforms
          // to avoid overlap with transparent system bar on Android
          bottom: insets.bottom + 10,
        },
        animatedContainerStyle,
      ]}
    >
      {state.routes.map((route, index) => {
        // Find configuration for this route
        const tabConfig = TABS.find((t) => t.name === route.name);

        // If route is not in our config (e.g. index, +not-found), skip it
        if (!tabConfig) return null;

        const isFocused = state.index === index;
        const Icon = tabConfig.icon;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          } else if (isFocused) {
            // Emit event for "Scroll to Top"
            navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
            });
          }
        };

        return (
          <AnimatedTouchableOpacity
            key={route.key}
            onPress={onPress}
            layout={LinearTransition.springify().mass(0.5)}
            style={[
              styles.tabItem,
              { backgroundColor: isFocused ? ACTIVE_BG_COLOR : "transparent" },
            ]}
          >
            <View style={styles.contentContainer}>
                <Icon
                size={22}
                color={isFocused ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR}
                />
                {isFocused && (
                <Animated.Text
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                    style={styles.label}
                    numberOfLines={1}
                >
                    {tabConfig.label}
                </Animated.Text>
                )}
            </View>
          </AnimatedTouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    width: "90%",
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  tabItem: {
    height: 44,
    borderRadius: 22, // Half of height for pill shape
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 12,
  },
  contentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
  },
  label: {
    color: ACTIVE_ICON_COLOR,
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 8,
  },
});