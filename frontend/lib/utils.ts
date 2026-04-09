export function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function timeAgo(input: string): string {
  const date = new Date(input);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function freshnessLabel(input: string): string {
  const date = new Date(input);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / 3600000;
  return diffHours <= 3 ? "Fresh" : "Aging";
}

export function getConditionColor(condition?: string): "green" | "yellow" | "red" {
  if (!condition) return "yellow";

  const c = condition.toLowerCase();

  if (c === "hero" || c === "dry") return "green";
  if (c === "damp" || c === "other") return "yellow";
  if (c === "muddy" || c === "flooded" || c === "closed") return "red";

  return "yellow";
}