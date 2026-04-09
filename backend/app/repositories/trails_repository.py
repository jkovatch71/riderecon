from datetime import datetime, timezone, timedelta
from typing import Any

from app.data.seed import REPORTS, TRAILS
from app.db.supabase_client import get_supabase_admin_client

FRESHNESS_HOURS = 3


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def color_for_condition(primary_condition: str | None) -> str:
    if not primary_condition:
        return "yellow"
    if primary_condition in {"Hero Dirt", "Dry"}:
        return "green"
    if primary_condition in {"Damp", "Muddy", "Other", "Likely Wet"}:
        return "yellow"
    return "red"


class TrailsRepository:
    def __init__(self) -> None:
        self.client = get_supabase_admin_client()

    def _fresh_cutoff(self) -> datetime:
        return datetime.now(timezone.utc) - timedelta(hours=FRESHNESS_HOURS)

    def _build_summary(
        self,
        trail: dict[str, Any],
        reports: list[dict[str, Any]],
        recovery_profiles: dict[str, dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        cutoff = self._fresh_cutoff()

        sorted_reports = sorted(
            reports,
            key=lambda r: r.get("created_at") or "",
            reverse=True,
        )

        fresh_reports: list[dict[str, Any]] = []
        for report in sorted_reports:
            created_at = parse_dt(report.get("created_at"))
            if created_at and created_at >= cutoff:
                fresh_reports.append(report)

        most_recent = sorted_reports[0] if sorted_reports else None
        current_condition = (
            most_recent.get("primary_condition")
            if most_recent
            else trail.get("current_condition")
        )

        matching_count = 0
        if current_condition:
            matching_count = sum(
                1
                for report in fresh_reports
                if report.get("primary_condition") == current_condition
            )

        recent_hazards: list[str] = []
        for report in fresh_reports:
            for tag in report.get("hazard_tags", []) or []:
                if tag not in recent_hazards:
                    recent_hazards.append(tag)

        trail_id = trail.get("id")
        recovery_profile = (recovery_profiles or {}).get(trail_id) if trail_id else None

        last_updated_at = (
            most_recent.get("created_at") if most_recent else trail.get("last_reported_at")
        )
        weather_warning = trail.get("weather_warning")

        # Default to stored trail condition
        display_condition = "No Reports"
        display_status_color = "yellow"

        # Fresh rider report wins
        if fresh_reports and most_recent:
            display_condition = (
                most_recent.get("primary_condition") or trail.get("current_condition")
            )
            display_status_color = color_for_condition(display_condition)

        # If there are no fresh rider reports but weather heuristic exists,
        # let weather drive the displayed state to avoid conflicting signals.
        elif weather_warning:
            display_condition = "Likely Wet"
            display_status_color = "yellow"

        return {
            **trail,
            "summary": {
                "current_condition": current_condition,
                "reported_by_count": matching_count,
                "recent_hazards": recent_hazards,
                "last_updated_at": last_updated_at,
                "freshness_hours": FRESHNESS_HOURS,
                "display_condition": display_condition,
                "display_status_color": display_status_color,
            },
            "recovery_profile": recovery_profile,
        }

    def list_trails(self) -> list[dict[str, Any]]:
        recovery_profiles = self._get_recovery_profiles()

        if not self.client:
            results = []
            for trail in TRAILS:
                reports = REPORTS.get(trail["id"], [])
                results.append(self._build_summary(trail, reports, recovery_profiles))

            return sorted(
                results,
                key=lambda trail: trail.get("summary", {}).get("last_updated_at") or "",
                reverse=True,
            )

        trails_res = self.client.table("trails").select("*").execute()
        trails = trails_res.data or []

        reports_res = (
            self.client.table("trail_reports")
            .select("*")
            .eq("is_visible", True)
            .execute()
        )
        all_reports = reports_res.data or []

        grouped: dict[str, list[dict[str, Any]]] = {}
        for report in all_reports:
            grouped.setdefault(report["trail_id"], []).append(report)

        results = [
            self._build_summary(trail, grouped.get(trail["id"], []), recovery_profiles)
            for trail in trails
        ]

        return sorted(
            results,
            key=lambda trail: trail.get("summary", {}).get("last_updated_at") or "",
            reverse=True,
        )

    def get_reports(self, trail_id: str) -> list[dict[str, Any]]:
        if not self.client:
            reports = REPORTS.get(trail_id, [])
            return sorted(
                reports,
                key=lambda r: r.get("created_at") or "",
                reverse=True,
            )

        reports_res = (
            self.client.table("trail_reports")
            .select("*")
            .eq("trail_id", trail_id)
            .eq("is_visible", True)
            .order("created_at", desc=True)
            .execute()
        )

        reports = reports_res.data or []

        normalized: list[dict[str, Any]] = []
        for report in reports:
            normalized.append(
                {
                    "id": report.get("id"),
                    "username": report.get("username") or "rider",
                    "trail_id": report.get("trail_id"),
                    "primary_condition": report.get("primary_condition"),
                    "hazard_tags": report.get("hazard_tags") or [],
                    "note": report.get("note"),
                    "created_at": report.get("created_at"),
                    "updated_at": report.get("updated_at"),
                    "is_edited": report.get("is_edited", False),
                    "is_visible": report.get("is_visible", True),
                }
            )

        return normalized

    def get_trail(self, trail_id: str) -> dict[str, Any] | None:
        recovery_profiles = self._get_recovery_profiles()

        if not self.client:
            trail = next((trail for trail in TRAILS if trail["id"] == trail_id), None)
            if not trail:
                return None
            reports = REPORTS.get(trail_id, [])
            return self._build_summary(trail, reports, recovery_profiles)

        trail_res = (
            self.client.table("trails")
            .select("*")
            .eq("id", trail_id)
            .limit(1)
            .execute()
        )
        trail_rows = trail_res.data or []
        if not trail_rows:
            return None

        trail = trail_rows[0]

        reports_res = (
            self.client.table("trail_reports")
            .select("*")
            .eq("trail_id", trail_id)
            .eq("is_visible", True)
            .execute()
        )
        reports = reports_res.data or []

        return self._build_summary(trail, reports, recovery_profiles)

    def _get_recovery_profiles(self) -> dict[str, dict[str, Any]]:
        def normalize(row: dict[str, Any]) -> dict[str, Any]:
            return {
                "trail_id": row.get("trail_id"),
                "recovery_class": row.get("recovery_class"),
                "average_recovery_hours": row.get("average_recovery_hours"),
                "recovery_confidence": row.get("recovery_confidence"),
                "rain_events_observed": row.get("rain_events_observed", 0),
                "notes": row.get("notes"),
                "updated_at": row.get("updated_at"),
            }

        if not self.client:
            fallback = {
                "mcallister-park": {
                    "trail_id": "mcallister-park",
                    "recovery_class": "average",
                    "average_recovery_hours": 8,
                    "recovery_confidence": "low",
                    "rain_events_observed": 0,
                    "notes": None,
                    "updated_at": None,
                },
                "op-schnabel-park": {
                    "trail_id": "op-schnabel-park",
                    "recovery_class": "fast",
                    "average_recovery_hours": 5,
                    "recovery_confidence": "low",
                    "rain_events_observed": 0,
                    "notes": None,
                    "updated_at": None,
                },
                "government-canyon": {
                    "trail_id": "government-canyon",
                    "recovery_class": "slow",
                    "average_recovery_hours": 14,
                    "recovery_confidence": "low",
                    "rain_events_observed": 0,
                    "notes": None,
                    "updated_at": None,
                },
            }

            return {k: normalize(v) for k, v in fallback.items()}

        res = self.client.table("trail_recovery_profiles").select("*").execute()
        rows = res.data or []

        return {
            row["trail_id"]: normalize(row)
            for row in rows
            if row.get("trail_id")
        }