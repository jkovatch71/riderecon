from datetime import datetime, timezone, timedelta
from typing import Any

from app.data.seed import REPORTS, TRAILS
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

    if condition in {"Damp", "Muddy", "Other", "Likely Wet", "Unknown"}:
        return "yellow"

    return "red"


def warning_indicates_wet(weather_warning: str | None) -> bool:
    if not weather_warning:
        return False

    warning = weather_warning.lower()

    wet_terms = (
        "rain",
        "wet",
        "flood",
        "storm",
        "thunder",
        "drizzle",
        "shower",
        "precip",
    )

    return any(term in warning for term in wet_terms)


def warning_indicates_flood(weather_warning: str | None) -> bool:
    if not weather_warning:
        return False

    return "flood" in weather_warning.lower()


def current_weather_indicates_rain(payload: dict[str, Any] | None) -> bool:
    if not payload:
        return False

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

        most_recent_raw_condition = (
            most_recent_report.get("primary_condition")
            if most_recent_report
            else trail.get("current_condition")
        )
        current_condition = normalize_condition(most_recent_raw_condition)

        fresh_report_count = len(fresh_reports)

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
            else trail.get("last_reported_at")
        )

        weather_warning = trail.get("weather_warning")
        trail_warning_wet = warning_indicates_wet(weather_warning)
        trail_warning_flood = warning_indicates_flood(weather_warning)

        cached_rain_inches = float(recent_rain.get("rain_inches", 0) or 0) if recent_rain else 0.0
        recent_rain_exceeds_threshold = bool(recent_rain.get("exceeds_threshold")) if recent_rain else False
        current_rain_active = current_weather_indicates_rain(current_weather)

        # Strong regional wet signal
        regional_wet_signal = current_rain_active or recent_rain_exceeds_threshold
        severe_wet_signal = trail_warning_flood or current_rain_active or recent_rain_exceeds_threshold

        display_condition = "Unknown"
        display_status_color = "yellow"
        reported_by_count = fresh_report_count

        most_recent_fresh_condition = normalize_condition(
            most_recent_fresh_report.get("primary_condition") if most_recent_fresh_report else None
        )

        # 1) Fresh hard closures/flooding always win
        if most_recent_fresh_condition in {"Closed", "Flooded"}:
            display_condition = most_recent_fresh_condition
            display_status_color = color_for_condition(display_condition)

        # 2) Explicit trail flood warning also wins unless a fresh hard closure/flood already did
        elif trail_warning_flood:
            display_condition = "Likely Wet"
            display_status_color = color_for_condition(display_condition)

        # 3) During active citywide wet conditions:
        #    do not allow Dry / Hero Dirt / Likely Dry.
        elif severe_wet_signal:
            if most_recent_fresh_condition in {"Muddy", "Damp"}:
                display_condition = most_recent_fresh_condition
            else:
                display_condition = "Likely Wet"

            display_status_color = color_for_condition(display_condition)

        # 4) If there is some trail-level weather caution, still bias wet
        elif trail_warning_wet:
            if most_recent_fresh_condition in {"Muddy", "Damp"}:
                display_condition = most_recent_fresh_condition
            else:
                display_condition = "Likely Wet"

            display_status_color = color_for_condition(display_condition)

        # 5) No active wet signal: fresh rider report can win
        elif most_recent_fresh_condition:
            display_condition = most_recent_fresh_condition
            display_status_color = color_for_condition(display_condition)

        # 6) No fresh reports:
        #    - no rain at all => Likely Dry
        #    - some rain, but below threshold => Unknown
        else:
            stored_condition = normalize_condition(trail.get("current_condition"))

            if stored_condition in {"Closed", "Flooded"}:
                display_condition = stored_condition
            elif cached_rain_inches == 0:
                display_condition = "Likely Dry"
            else:
                display_condition = "Unknown"

            display_status_color = color_for_condition(display_condition)
            reported_by_count = 0

        return {
            **trail,
            "summary": {
                "current_condition": current_condition,
                "reported_by_count": reported_by_count,
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
        current_weather = get_cached_current_weather()
        recent_rain = get_cached_recent_rain()

        if not self.client:
            results = []
            for trail in TRAILS:
                reports = REPORTS.get(trail["id"], [])
                results.append(
                    self._build_summary(
                        trail,
                        reports,
                        recovery_profiles,
                        current_weather,
                        recent_rain,
                    )
                )

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
        current_weather = get_cached_current_weather()
        recent_rain = get_cached_recent_rain()

        if not self.client:
            trail = next((trail for trail in TRAILS if trail["id"] == trail_id), None)
            if not trail:
                return None
            reports = REPORTS.get(trail_id, [])
            return self._build_summary(
                trail,
                reports,
                recovery_profiles,
                current_weather,
                recent_rain,
            )

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