import { createBrowserClient } from "@supabase/ssr";

export function createClient(options?: { cookieOptions?: { maxAge?: number } }) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options?.cookieOptions ? { cookieOptions: options.cookieOptions } : undefined
  );
}
