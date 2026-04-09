import { supabase } from "@/lib/supabase";

export async function getMyProfile() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("id", session.user.id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateMyProfile(payload: {
  username: string;
  display_name: string;
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      username: payload.username,
      display_name: payload.display_name,
    })
    .eq("id", session.user.id)
    .select("id, username, display_name")
    .single();

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
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("You must be signed in.");
  }

  const { error } = await supabase.from("profiles").upsert({
    id: session.user.id,
    username: payload.username,
    display_name: payload.display_name || null,
    avatar_color: payload.avatar_color || null,
    strava_url: payload.strava_url || null
  });

  if (error) throw error;
}