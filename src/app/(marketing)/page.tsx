import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The app subdomain root (trailwatch.houseofruga.com) is not a marketing page —
// that lives at houseofruga.com/trailwatch. Send visitors into the app: the
// dashboard if signed in, otherwise login.
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/dashboard" : "/login");
}
