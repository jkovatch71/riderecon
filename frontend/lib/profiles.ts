import { supabase } from "@/lib/supabase";

export type MyProfile = {
  id: string;
  username: string | null;
  garage_bay_1: string | null;
  garage_bay_2: string | null;
  garage_bay_3: string | null;
};

type ProfilePayload = {
  username?: string;
  garage_bay_1?: string;
  garage_bay_2?: string;
  garage_bay_3?: string;
};

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function normalizeOptionalText(value?: string): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function getProfileByUserId(
  userId: string
): Promise<MyProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, garage_bay_1, garage_bay_2, garage_bay_3")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createProfileForUser(
  userId: string,
  payload: {
    username: string;
    garage_bay_1?: string;
    garage_bay_2?: string;
    garage_bay_3?: string;
  }
) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        username: normalizeUsername(payload.username),
        garage_bay_1: normalizeOptionalText(payload.garage_bay_1),
        garage_bay_2: normalizeOptionalText(payload.garage_bay_2),
        garage_bay_3: normalizeOptionalText(payload.garage_bay_3),
      },
      { onConflict: "id" }
    )
    .select("id, username, garage_bay_1, garage_bay_2, garage_bay_3")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProfileForUser(
  userId: string,
  payload: ProfilePayload
) {
  const updates: Partial<{
    username: string | null;
    garage_bay_1: string | null;
    garage_bay_2: string | null;
    garage_bay_3: string | null;
  }> = {};

  if (payload.username !== undefined) {
    updates.username = normalizeUsername(payload.username);
  }

  if (payload.garage_bay_1 !== undefined) {
    updates.garage_bay_1 = normalizeOptionalText(payload.garage_bay_1);
  }

  if (payload.garage_bay_2 !== undefined) {
    updates.garage_bay_2 = normalizeOptionalText(payload.garage_bay_2);
  }

  if (payload.garage_bay_3 !== undefined) {
    updates.garage_bay_3 = normalizeOptionalText(payload.garage_bay_3);
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("id, username, garage_bay_1, garage_bay_2, garage_bay_3")
    .single();

  if (error) {
    throw error;
  }

  return data;
}