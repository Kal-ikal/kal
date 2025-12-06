// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/components/CustomTabBar.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ Phase 4: Added Approvals tab (role-based visibility)
// ===========================================================

import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Home,
  FileText,
  DollarSign,
  User,
  Settings,
  CheckSquare,
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
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// All possible tabs
const ALL_TABS = [
  { name: "home", icon: Home, label: "Home", roles: ["employee", "manager", "dfd", "hrd"] },
  { name: "pengajuan", icon: FileText, label: "Pengajuan", roles: ["employee", "manager", "dfd", "hrd"] },
  { name: "approvals", icon: CheckSquare, label: "Approvals", roles: ["manager", "dfd", "hrd"] }, // Only for approvers
  { name: "konversi", icon: DollarSign, label: "Konversi", roles: ["employee", "manager", "dfd", "hrd"] },
  { name: "profile", icon: User, label: "Profile", roles: ["employee", "manager", "dfd", "hrd"] },
  { name: "settings", icon: Settings, label: "Settings", roles: ["employee", "manager", "dfd", "hrd"] },
];

// Pages where tab bar should auto-hide
const AUTO_HIDE_PAGES = ["pengajuan"];

const PRIMARY_COLOR = "#130057";
const ACTIVE_BG_COLOR = "#FFFFFF";
const ACTIVE_ICON_COLOR = "#130057";
const INACTIVE_ICON_COLOR = "#FFFFFF";

export default function CustomTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const isVisible = useTabBarStore((state) => state.isVisible);
  const setIsVisible = useTabBarStore((state) => state.setIsVisible);
  const { session } = useAuth();

  const [userRole, setUserRole] = useState<string>("employee");

  // Get user role
  useEffect(() => {
    const fetchRole = async () => {
      if (!session?.user?.id) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      
      if (data?.role) {
        setUserRole(data.role);
      }
    };

    fetchRole();
  }, [session?.user?.id]);

  // Filter tabs based on user role
  const visibleTabs = ALL_TABS.filter(tab => tab.roles.includes(userRole));

  // Get current route name
  const currentRouteName = state.routes[state.index]?.name;

  // Shared Value for visibility animation
  const translateY = useSharedValue(0);

  // Auto-hide tab bar on specific pages
  useEffect(() => {
    if (AUTO_HIDE_PAGES.includes(currentRouteName)) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [currentRouteName, setIsVisible]);

  // React to visibility changes
  useEffect(() => {
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
          bottom: insets.bottom + 10,
        },
        animatedContainerStyle,
      ]}
    >
      {state.routes.map((route, index) => {
        // Find configuration for this route
        const tabConfig = visibleTabs.find((t) => t.name === route.name);

        // If route is not in visible tabs, skip it
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
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 12,
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: ACTIVE_ICON_COLOR,
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 8,
  },
});
