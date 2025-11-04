import { supabase } from '@/lib/supabase';

// Generic function invocation
async function invokeFunction<T>(functionName: string, payload: object): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  });

  if (error) {
    console.error(`Error invoking function '${functionName}':`, error);
    return { data: null, error };
  }

  return { data: data as T, error: null };
}

export const functions = {
  invokeFunction,
};
