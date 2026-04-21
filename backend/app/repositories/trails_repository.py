from datetime import datetime, timezone, timedelta
from typing import Any

from app.db.supabase_client import get_supabase_admin_client
from app.db.weather_cache import (
    get_any_weather_cache_payload,
    get_fresh_weather_cache_payload,
)

FRESHNESS_HOURS = 3
CURRENT_CACHE_KEY = "current_weather"
RECENT_RAIN_CACHE_KEY = "recent_rain"


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def normalize_condition(value: str | None) -> str | None:
    if not value:
        return None

    lowered = value.strip().lower()

    if lowered in {"hero dirt", "hero"}:
        return "Hero Dirt"
    if lowered == "dry":
        return "Dry"
    if lowered == "damp":
        return "Damp"
    if lowered == "muddy":
        return "Muddy"
    if lowered == "flooded":
        return "Flooded"
    if lowered == "closed":
        return "Closed"
    if lowered == "likely wet":
        return "Likely Wet"
    if lowered == "likely dry":
        return "Likely Dry"
    if lowered == "needs more time":
        return "Needs More Time"
    if lowered == "wet / unrideable":
        return "Wet / Unrideable"
    if lowered in {"no reports", "unknown"}:
        return "Unknown"
    if lowered == "other":
        return "Other"

    return value.strip()


def color_for_condition(primary_condition: str | None) -> str:
    condition = normalize_condition(primary_condition)

    if not condition:
        return "yellow"

    if condition in {"Hero Dirt", "Dry", "Likely Dry"}:
        return "green"

    if condition in {"Damp", "Likely Wet", "Unknown", "Other"}:
        return "yellow"

    return "red"


def current_weather_indicates_rain(payload: dict[str, Any] | None) -> bool:
    if not payload:
        return False

    explicit_flag = payload.get("is_raining_now")
    if isinstance(explicit_flag, bool):
        return explicit_flag

    summary = str(payload.get("raw_summary") or payload.get("summary") or "").lower()
    wet_terms = (
        "rain",
        "drizzle",
        "storm",
        "thunder",
        "shower",
        "precip",
    )
    return any(term in summary for term in wet_terms)


def get_cached_current_weather() -> dict[str, Any] | None:
    return (
        get_fresh_weather_cache_payload(CURRENT_CACHE_KEY)
        or get_any_weather_cache_payload(CURRENT_CACHE_KEY)
    )


def get_cached_recent_rain() -> dict[str, Any] | None:
    return (
        get_fresh_weather_cache_payload(RECENT_RAIN_CACHE_KEY)
        or get_any_weather_cache_payload(RECENT_RAIN_CACHE_KEY)
    )


def get_required_recovery_hours(recovery_class: str | None, storm_rain_total: float) -> int:
    if storm_rain_total < 0.10:
        storm_band = "light"
    elif storm_rain_total < 0.50:
        storm_band = "moderate"
    elif storm_rain_total < 1.50:
        storm_band = "heavy"
    else:
        storm_band = "extreme"

    matrix = {
        "fast": {
            "light": 4,
            "moderate": 10,
            "heavy": 20,
            "extreme": 36,
        },
        "average": {
            "light": 6,
            "moderate": 14,
            "heavy": 30,
            "extreme": 48,
        },
        "slow": {
            "light": 10,
            "moderate": 20,
            "heavy": 40,
            "extreme": 72,
        },
    }

    effective_recovery_class = recovery_class or "average"
    return matrix.get(effective_recovery_class, matrix["average"])[storm_band]


class TrailsRepository:
    def __init__(self) -> None:
        self.client = get_supabase_admin_client()

    def _require_client(self) -> None:
        if not self.client:
            raise RuntimeError(
                "Supabase admin client is unavailable. "
                "Seed/fallback trail data has been removed."
            )

    def _fresh_cutoff(self) -> datetime:
        return datetime.now(timezone.utc) - timedelta(hours=FRESHNESS_HOURS)

    def _resolve_display_status(
        self,
        *,
        most_recent_fresh_condition: str | None,
        recovery_class: str | None,
        current_weather: dict[str, Any] | None,
        recent_rain: dict[str, Any] | None,
    ) -> tuple[str, str, int, str]:
        is_raining_now = current_weather_indicates_rain(current_weather)

        storm_rain_total_inches = (
            float(recent_rain.get("storm_rain_total_inches", 0) or 0)
            if recent_rain
            else 0.0
        )
        drying_window_established = (
            bool(recent_rain.get("drying_window_established"))
            if recent_rain
            else False
        )
        effective_drying_hours = (
            float(recent_rain.get("effective_drying_hours", 0) or 0)
            if recent_rain
            else 0.0
        )
        recent_rain_unavailable = (
            bool(recent_rain.get("unavailable"))
            if recent_rain
            else True
        )

        if most_recent_fresh_condition == "Closed":
            return "Closed", color_for_condition("Closed"), 1, "fresh_report_closed"

        if most_recent_fresh_condition == "Flooded":
            return "Flooded", color_for_condition("Flooded"), 1, "fresh_report_flooded"

        if is_raining_now:
            return "Wet / Unrideable", color_for_condition("Wet / Unrideable"), 0, "active_rain"

        if recent_rain_unavailable:
            if most_recent_fresh_condition == "Muddy":
                return "Muddy", color_for_condition("Muddy"), 1, "fresh_report_muddy_no_rain_data"
            if most_recent_fresh_condition == "Damp":
                return "Damp", color_for_condition("Damp"), 1, "fresh_report_damp_no_rain_data"
            if most_recent_fresh_condition in {"Dry", "Hero Dirt"}:
                return (
                    most_recent_fresh_condition,
                    color_for_condition(most_recent_fresh_condition),
                    1,
                    "fresh_report_dry_no_rain_data",
                )
            return "Unknown", color_for_condition("Unknown"), 0, "recent_rain_unavailable"

        if not drying_window_established:
            if storm_rain_total_inches >= 0.50:
                return (
                    "Wet / Unrideable",
                    color_for_condition("Wet / Unrideable"),
                    0,
                    "no_drying_window_heavy_rain",
                )
            return (
                "Needs More Time",
                color_for_condition("Needs More Time"),
                0,
                "no_drying_window",
            )

        required_recovery_hours = get_required_recovery_hours(
            recovery_class,
            storm_rain_total_inches,
        )

        if effective_drying_hours < required_recovery_hours:
            if most_recent_fresh_condition == "Muddy":
                return "Muddy", color_for_condition("Muddy"), 1, "fresh_report_muddy_during_recovery"
            if most_recent_fresh_condition == "Damp":
                return "Damp", color_for_condition("Damp"), 1, "fresh_report_damp_during_recovery"
            return (
                "Needs More Time",
                color_for_condition("Needs More Time"),
                0,
                "insufficient_drying_time",
            )

        if most_recent_fresh_condition == "Muddy":
            return "Muddy", color_for_condition("Muddy"), 1, "fresh_report_muddy"

        if most_recent_fresh_condition == "Damp":
            return "Damp", color_for_condition("Damp"), 1, "fresh_report_damp"

        if most_recent_fresh_condition in {"Dry", "Hero Dirt"}:
            return (
                most_recent_fresh_condition,
                color_for_condition(most_recent_fresh_condition),
                1,
                "fresh_report_dry_family",
            )

        return "Likely Dry", color_for_condition("Likely Dry"), 0, "recovered"

    def _build_summary(
        self,
        trail: dict[str, Any],
        reports: list[dict[str, Any]],
        recovery_profiles: dict[str, dict[str, Any]] | None = None,
        current_weather: dict[str, Any] | None = None,
        recent_rain: dict[str, Any] | None = None,
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

        most_recent_report = sorted_reports[0] if sorted_reports else None
        most_recent_fresh_report = fresh_reports[0] if fresh_reports else None

        current_condition = normalize_condition(
            most_recent_report.get("primary_condition")
            if most_recent_report
            else None
        )

        recent_hazards: list[str] = []
        for report in fresh_reports:
            for tag in report.get("hazard_tags", []) or []:
                if tag not in recent_hazards:
                    recent_hazards.append(tag)

        trail_id = trail.get("id")
        recovery_profile = (recovery_profiles or {}).get(trail_id) if trail_id else None

        last_updated_at = (
            most_recent_report.get("created_at")
            if most_recent_report
            else None
        )

        most_recent_fresh_condition = normalize_condition(
            most_recent_fresh_report.get("primary_condition")
            if most_recent_fresh_report
            else None
        )

        display_condition, display_status_color, report_confidence_count, resolution_reason = self._resolve_display_status(
            most_recent_fresh_condition=most_recent_fresh_condition,
            recovery_class=recovery_profile.get("recovery_class") if recovery_profile else None,
            current_weather=current_weather,
            recent_rain=recent_rain,
        )

        return {
            **trail,
            "summary": {
                "current_condition": current_condition,
                "reported_by_count": report_confidence_count,
                "recent_hazards": recent_hazards,
                "last_updated_at": last_updated_at,
                "freshness_hours": FRESHNESS_HOURS,
                "display_condition": display_condition,
                "display_status_color": display_status_color,
                "debug": {
                    "resolution_reason": resolution_reason,
                    "most_recent_fresh_condition": most_recent_fresh_condition,
                    "recovery_class": recovery_profile.get("recovery_class") if recovery_profile else None,
                    "current_rain_active": current_weather_indicates_rain(current_weather),
                    "storm_rain_total_inches": (
                        float(recent_rain.get("storm_rain_total_inches", 0) or 0)
                        if recent_rain
                        else None
                    ),
                    "drying_window_established": (
                        bool(recent_rain.get("drying_window_established"))
                        if recent_rain
                        else None
                    ),
                    "effective_drying_hours": (
                        float(recent_rain.get("effective_drying_hours", 0) or 0)
                        if recent_rain
                        else None
                    ),
                    "recent_rain_unavailable": (
                        bool(recent_rain.get("unavailable"))
                        if recent_rain
                        else True
                    ),
                    "fresh_report_count": len(fresh_reports),
                },
            },
            "recovery_profile": recovery_profile,
        }

    def list_trails(self) -> list[dict[str, Any]]:
        self._require_client()

        recovery_profiles = self._get_recovery_profiles()
        current_weather = get_cached_current_weather()
        recent_rain = get_cached_recent_rain()

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
            self._build_summary(
                trail,
                grouped.get(trail["id"], []),
                recovery_profiles,
                current_weather,
                recent_rain,
            )
            for trail in trails
        ]

        return sorted(
            results,
            key=lambda trail: trail.get("summary", {}).get("last_updated_at") or "",
            reverse=True,
        )

    def get_reports(self, trail_id: str) -> list[dict[str, Any]]:
        self._require_client()

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
        self._require_client()

        recovery_profiles = self._get_recovery_profiles()
        current_weather = get_cached_current_weather()
        recent_rain = get_cached_recent_rain()

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

        return self._build_summary(
            trail,
            reports,
            recovery_profiles,
            current_weather,
            recent_rain,
        )

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
            return {}

        res = self.client.table("trail_recovery_profiles").select("*").execute()
        rows = res.data or []

        return {
            row["trail_id"]: normalize(row)
            for row in rows
            if row.get("trail_id")
        }