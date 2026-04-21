export type StatusColor = "green" | "yellow" | "red";

export type PrimaryCondition =
  | "Hero"
  | "Dry"
  | "Damp"
  | "Muddy"
  | "Flooded"
  | "Closed"
  | "Other";

export type HazardTag = "Obstructed" | "Bees" | "Wildlife";

export type TrailSummary = {
  current_condition: string | null;
  reported_by_count: number;
  recent_hazards: string[];
  last_updated_at: string | null;
  freshness_hours: number;
  display_condition?: string | null;
  display_status_color?: "green" | "yellow" | "red" | null;
};

export type Trail = {
  id: string;
  name: string;
  alias?: string | null;
  system_name?: string | null;
  status_color: StatusColor;
  current_condition: string;
  last_reported_at?: string | null;
  recovery_profile?: TrailRecoveryProfile | null;
  latitude?: number | null;
  longitude?: number | null;
  report_count: number;
  summary?: TrailSummary;
};

export type TrailReport = {
  id: string;
  username: string;
  trail_id: string;
  primary_condition: PrimaryCondition;
  hazard_tags: HazardTag[];
  note?: string;
  created_at: string;
  updated_at?: string;
  is_edited: boolean;
  reaction_summary?: {
    thumb: number;
    rock: number;
    fire: number;
  };
};

export type TrailRecoveryProfile = {
  trail_id?: string | null;
  recovery_class: string;
  average_recovery_hours?: number | null;
  recovery_confidence?: string | null;
  rain_events_observed?: number | null;
  notes?: string | null;
  updated_at?: string | null;
};
