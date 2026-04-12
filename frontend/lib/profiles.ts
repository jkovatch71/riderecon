import { supabase } from "@/lib/supabase";

export type MyProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_color: string | null;
  strava_url: string | null;
};

export async function getMyProfile(): Promise<MyProfile | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_color, strava_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createMyProfile(payload: {
  username: string;
  display_name?: string;
  avatar_color?: string;
  strava_url?: string;
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("You must be signed in to create a profile.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        username: payload.username,
        display_name: payload.display_name || null,
        avatar_color: payload.avatar_color || null,
        strava_url: payload.strava_url || null,
      },
      { onConflict: "id" }
    )
    .select("id, username, display_name, avatar_color, strava_url")
    .single();

  if (error) {
    throw error;
  }

  return data;
}