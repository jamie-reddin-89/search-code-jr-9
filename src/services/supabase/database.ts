import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type ErrorCode = Tables<'error_codes_db'>;
type ErrorCodeInsert = TablesInsert<'error_codes_db'>;
type ErrorCodeUpdate = TablesUpdate<'error_codes_db'>;

async function getErrorCode(code: string, system_name: string): Promise<ErrorCode | null> {
  const { data, error } = await supabase
    .from('error_codes_db')
    .select('*')
    .eq('code', code)
    .eq('system_name', system_name)
    .single();
  if (error) {
    console.error('Error fetching error code:', error);
    return null;
  }
  return data;
}

async function createErrorCode(errorCode: ErrorCodeInsert): Promise<ErrorCode | null> {
  const { data, error } = await supabase
    .from('error_codes_db')
    .insert(errorCode)
    .single();
  if (error) {
    console.error('Error creating error code:', error);
    return null;
  }
  return data;
}

async function updateErrorCode(id: string, errorCode: ErrorCodeUpdate): Promise<ErrorCode | null> {
  const { data, error } = await supabase
    .from('error_codes_db')
    .update(errorCode)
    .eq('id', id)
    .single();
  if (error) {
    console.error('Error updating error code:', error);
    return null;
  }
  return data;
}

async function deleteErrorCode(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('error_codes_db')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting error code:', error);
    return false;
  }
  return true;
}

export const database = {
  getErrorCode,
  createErrorCode,
  updateErrorCode,
  deleteErrorCode,
};
