// components/EditProfilePhotoModal.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Pressable,
  Image,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Camera, Image as ImageIcon, X } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";

type Props = {
  onClose: () => void;
  onSave: (uri: string | null) => void;
};

export default function EditProfilePhotoModal({ onClose, onSave }: Props) {
  const { isDarkMode } = useTheme();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withTiming(1, { duration: 200 });
  }, [anim]);

  const closeAnimated = () => {
    anim.value = withTiming(0, { duration: 180 });
    setTimeout(() => onClose(), 180);
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
  }));

  const popupStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ scale: withSpring(anim.value ? 1 : 0.85) }],
  }));

  async function ensureMediaLibPermission() {
    const status = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (status.granted) return true;
    const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return req.granted;
  }

  async function ensureCameraPermission() {
    const status = await ImagePicker.getCameraPermissionsAsync();
    if (status.granted) return true;
    const req = await ImagePicker.requestCameraPermissionsAsync();
    return req.granted;
  }

  const pickGallery = async () => {
    try {
      const ok = await ensureMediaLibPermission();
      if (!ok) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openCamera = async () => {
    try {
      const ok = await ensureCameraPermission();
      if (!ok) return;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = () => {
    Alert.alert("Saved", "Photo Updated!", [
      {
        text: "OK",
        onPress: () => {
          anim.value = withTiming(0, { duration: 180 });
          setTimeout(() => {
            onSave(profileImage);
          }, 180);
        },
      },
    ]);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* BACKDROP */}
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <Pressable style={{ flex: 1 }} onPress={closeAnimated}>
          <BlurView
            tint={isDarkMode ? "dark" : "light"}
            intensity={60}
            style={{ flex: 1 }}
          />
        </Pressable>
      </Animated.View>

      {/* POPUP */}
      <Animated.View
        style={[
          popupStyle,
          {
            position: "absolute",
            top: "20%", // <-- posisi turun ke bawah
            alignSelf: "center",
            width: "86%",
            borderRadius: 14,
          },
        ]}
      >
        <View style={[styles.popup, isDarkMode ? styles.darkBg : styles.lightBg]}>
          <TouchableOpacity onPress={closeAnimated} style={styles.closeBtn}>
            <X size={22} color={isDarkMode ? "#ddd" : "#444"} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: isDarkMode ? "#fff" : "#222" }]}>
            Change Profile Photo
          </Text>

          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.preview} />
          ) : (
            <View style={styles.placeholder}>
              <ImageIcon size={32} color="#9CA3AF" />
              <Text style={{ marginTop: 8, color: isDarkMode ? "#ccc" : "#666" }}>
                No photo selected
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.actionBtn} onPress={openCamera}>
            <Camera size={20} color="#3B82F6" />
            <Text style={styles.actionText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={pickGallery}>
            <ImageIcon size={20} color="#3B82F6" />
            <Text style={styles.actionText}>Choose from Gallery</Text>
          </TouchableOpacity>

          {profileImage && (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Save Changes</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  popup: {
    padding: 16,
    paddingTop: 18,
    borderRadius: 14,
    alignItems: "center",
  },
  lightBg: { backgroundColor: "#fff" },
  darkBg: { backgroundColor: "#111827" },
  closeBtn: { position: "absolute", right: 12, top: 12 },
  title: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  placeholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#DDD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  preview: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#3B82F6",
    marginBottom: 12,
  },
  actionBtn: {
    width: "100%",
    marginTop: 8,
    backgroundColor: "#EFF6FF",
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { marginLeft: 8, color: "#1E3A8A", fontWeight: "600" },
  saveBtn: {
    marginTop: 12,
    backgroundColor: "#16A34A",
    width: "100%",
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveText: { textAlign: "center", color: "white", fontWeight: "700" },
});
