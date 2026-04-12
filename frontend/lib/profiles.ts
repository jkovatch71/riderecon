import { supabase } from "@/lib/supabase";

export type MyProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_color: string | null;
  strava_url: string | null;
};

export async function getProfileByUserId(userId: string): Promise<MyProfile | null> {
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

export async function createProfileForUser(userId: string, payload: {
  username: string;
  display_name?: string;
  avatar_color?: string;
  strava_url?: string;
}) {
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

export async function updateProfileForUser(userId: string, payload: {
  username?: string;
  display_name?: string;
  avatar_color?: string;
  strava_url?: string;
}) {
  const updates: Record<string, string | null> = {};

  if (payload.username !== undefined) {
    updates.username = payload.username || null;
  }

  if (payload.display_name !== undefined) {
    updates.display_name = payload.display_name || null;
  }

  if (payload.avatar_color !== undefined) {
    updates.avatar_color = payload.avatar_color || null;
  }

  if (payload.strava_url !== undefined) {
    updates.strava_url = payload.strava_url || null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("id, username, display_name, avatar_color, strava_url")
    .single();

  if (error) {
    throw error;
  }

  return data;
}