import { z } from "zod";

/**
 * Fail loudly at first use rather than handing `undefined` to the Supabase
 * client and getting an opaque error three layers down.
 *
 * NEXT_PUBLIC_* vars must be referenced as full literals, not looked up
 * dynamically, or Next won't inline them into the client bundle.
 */
const publicEnv = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z
      .string()
      .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"),
  })
  .parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

export const SUPABASE_URL = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
