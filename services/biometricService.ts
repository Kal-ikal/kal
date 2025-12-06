// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/services/biometricService.ts
// 📝 Aksi: CREATE NEW FILE
// ✅ Phase 4: Biometric authentication service
// ===========================================================

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const USER_CREDENTIALS_KEY = 'user_credentials';

export interface BiometricStatus {
  isAvailable: boolean;
  isEnabled: boolean;
  biometricType: 'fingerprint' | 'facial' | 'iris' | 'none';
}

/**
 * Check if device supports biometric authentication
 */
export async function checkBiometricSupport(): Promise<{
  isSupported: boolean;
  biometricType: 'fingerprint' | 'facial' | 'iris' | 'none';
}> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      return { isSupported: false, biometricType: 'none' };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return { isSupported: false, biometricType: 'none' };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    let biometricType: 'fingerprint' | 'facial' | 'iris' | 'none' = 'none';
    
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'facial';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'fingerprint';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'iris';
    }

    return { isSupported: true, biometricType };
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return { isSupported: false, biometricType: 'none' };
  }
}

/**
 * Get biometric status (availability and enabled state)
 */
export async function getBiometricStatus(): Promise<BiometricStatus> {
  const { isSupported, biometricType } = await checkBiometricSupport();
  
  if (!isSupported) {
    return {
      isAvailable: false,
      isEnabled: false,
      biometricType: 'none',
    };
  }

  const isEnabled = await isBiometricEnabled();
  
  return {
    isAvailable: true,
    isEnabled,
    biometricType,
  };
}

/**
 * Check if biometric login is enabled for this device
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking biometric enabled:', error);
    return false;
  }
}

/**
 * Enable biometric login and store credentials
 */
export async function enableBiometric(email: string, password: string): Promise<boolean> {
  try {
    // Store credentials securely
    const credentials = JSON.stringify({ email, password });
    await SecureStore.setItemAsync(USER_CREDENTIALS_KEY, credentials);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    return true;
  } catch (error) {
    console.error('Error enabling biometric:', error);
    return false;
  }
}

/**
 * Disable biometric login and clear credentials
 */
export async function disableBiometric(): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(USER_CREDENTIALS_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    return true;
  } catch (error) {
    console.error('Error disabling biometric:', error);
    return false;
  }
}

/**
 * Authenticate using biometrics and return stored credentials
 */
export async function authenticateWithBiometric(): Promise<{
  success: boolean;
  credentials?: { email: string; password: string };
  error?: string;
}> {
  try {
    // Check if biometric is enabled
    const isEnabled = await isBiometricEnabled();
    if (!isEnabled) {
      return { success: false, error: 'Biometric tidak diaktifkan' };
    }

    // Prompt for biometric authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login dengan Biometrik',
      fallbackLabel: 'Gunakan Password',
      cancelLabel: 'Batal',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      return { 
        success: false, 
        error: result.error === 'user_cancel' ? 'Dibatalkan' : 'Autentikasi gagal' 
      };
    }

    // Get stored credentials
    const credentialsStr = await SecureStore.getItemAsync(USER_CREDENTIALS_KEY);
    if (!credentialsStr) {
      return { success: false, error: 'Kredensial tidak ditemukan' };
    }

    const credentials = JSON.parse(credentialsStr);
    return { success: true, credentials };
  } catch (error) {
    console.error('Error authenticating with biometric:', error);
    return { success: false, error: 'Terjadi kesalahan' };
  }
}

/**
 * Get biometric type label in Indonesian
 */
export function getBiometricLabel(type: 'fingerprint' | 'facial' | 'iris' | 'none'): string {
  switch (type) {
    case 'fingerprint':
      return 'Sidik Jari';
    case 'facial':
      return 'Face ID';
    case 'iris':
      return 'Iris';
    default:
      return 'Biometrik';
  }
}
