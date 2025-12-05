import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

export async function uploadUserProfilePhoto(userId: string, imageUri: string) {
  try {
    // 1. Baca file gambar dari device menjadi string Base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64', // ✅ FIX: Pakai string langsung, tidak perlu import EncodingType
    });

    // 2. Tentukan path file (misal: user_id/timestamp.jpg)
    // Menggunakan timestamp agar nama file unik
    const filePath = `${userId}/${new Date().getTime()}.jpg`;
    const contentType = 'image/jpeg';

    // 3. Upload ke Supabase Storage (Bucket 'avatars')
    // ✅ FIX: Hapus 'data' dari sini karena tidak dipakai (error unused vars)
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, decode(base64), {
        contentType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 4. Dapatkan Public URL dari file yang baru diupload
    // Destructure data: { publicUrl } langsung dari result
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // 5. Update kolom avatar_url di tabel profiles
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { success: true, data: publicUrl };

  } catch (error: any) {
    console.error('Upload failed:', error);
    return { success: false, error: error.message };
  }
}