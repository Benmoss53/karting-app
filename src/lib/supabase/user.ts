import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Every dashboard layout + page independently calls `supabase.auth.getUser()`
// to get the current driver, which is a real network round trip to Supabase
// Auth each time — two or three of them stack up on a single navigation
// (layout, page, sometimes more). `cache()` memoizes the first call for the
// lifetime of this request, so the rest are free instead of adding their
// own round trip.
export const getAuthedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
