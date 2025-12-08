// ===========================================================
// 📁 Lokasi: annualbenefit/services/profileService.ts
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ FIXED: Menghapus 'updated_at' yang menyebabkan error PGRST204
// ===========================================================

import { supabase } from '@/lib/supabase';

// --- AVATAR FUNCTIONS ---

export async function uploadAvatar(userId: string, imageUri: string) {
  try {
    if (!userId || !imageUri) throw new Error('Missing userId or imageUri');

    // 1. Fetch file dari URI lokal sebagai Blob/ArrayBuffer
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();

    // 2. Tentukan path file
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = new Date().getTime();
    const filePath = `${userId}/${timestamp}.${fileExt}`;
    
    let contentType = 'image/jpeg';
    if (fileExt === 'png') contentType = 'image/png';
    else if (fileExt === 'webp') contentType = 'image/webp';

    // 3. Upload ke Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, { 
        contentType, 
        upsert: true 
      });

    if (uploadError) throw uploadError;

    // 4. Dapatkan Public URL
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // 5. Update profil user dengan URL baru
    // ❌ HAPUS: updated_at: new Date().toISOString() (karena kolom tidak ada)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl }) 
      .eq('id', userId);

    if (updateError) throw updateError;

    return publicUrl; 
  } catch (error: any) {
    console.error('[ProfileService] Upload failed:', error);
    throw error;
  }
}

// Alias untuk backward compatibility
export const uploadUserProfilePhoto = uploadAvatar;

export async function deleteAvatar(userId: string) {
  try {
    // 1. List file lama di folder user
    const { data: files } = await supabase.storage.from('avatars').list(userId);
    
    if (files && files.length > 0) {
      const paths = files.map(f => `${userId}/${f.name}`);
      if (paths.length > 0) {
        await supabase.storage.from('avatars').remove(paths);
      }
    }

    // 2. Set avatar_url menjadi null di database
    // ❌ HAPUS: updated_at
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null }) 
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error('[ProfileService] Delete failed:', error);
    throw error;
  }
}

// --- PASSWORD FUNCTION ---

export async function changePassword(currentPassword: string, newPassword: string) {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    throw error;
  }
}

// --- MFA FUNCTIONS (Placeholders/Wrappers) ---

export async function getMFAFactors() {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;
    return data || { totp: [] };
  } catch (error) {
    console.log("MFA List Info:", error); 
    return { totp: [] };
  }
}

export async function enrollTOTP() {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) throw error;
    return data;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function verifyTOTP(factorId: string, code: string) {
  try {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (error) throw error;
    return data;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function unenrollMFA(factorId: string) {
  try {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// --- LEAVE HISTORY ---
export async function getRecentLeaveHistory(userId: string, limit = 5) {
  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      id,
      start_date,
      end_date,
      status,
      leave_type:leave_types(name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}