import { supabase } from '@/lib/supabase';

// Generic file upload function
async function uploadFile(bucket: string, path: string, file: File): Promise<{ path: string | null; error: Error | null }> {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) {
    console.error('Error uploading file:', error);
    return { path: null, error };
  }
  return { path: data.path, error: null };
}

// Generic file URL retrieval function
function getFileUrl(bucket: string, path: string): { publicUrl: string | null } {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}

export const storage = {
  uploadFile,
  getFileUrl,
};
