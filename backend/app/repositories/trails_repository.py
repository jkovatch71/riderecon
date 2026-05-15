from datetime import datetime, timezone, timedelta
from typing import Any

from app.db.supabase_client import get_supabase_admin_client
from app.db.weather_cache import (
    get_any_weather_cache_payload,
    get_fresh_weather_cache_payload,
)

FRESHNESS_HOURS = 8
VISIBLE_REPORT_HOURS = 168
CURRENT_CACHE_KEY = "current_weather"
RECENT_RAIN_CACHE_KEY = "recent_rain"

PERMANENTLY_CLOSED_TRAIL_IDS = {
    "700-acres",
    "devils-backbone",
}


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

    if lowered in {"hero"}:
        return "Hero"
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
    if lowered == "permanently closed":
        return "Permanently Closed"
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


def normalize_hazard_tag(value: str | None) -> str | None:
    if not value:
        return None

    lowered = value.strip().lower()

    if lowered in {"obstructed", "obstruction"}:
        return "Obstruction"
    if lowered == "bees":
        return "Bees"
    if lowered == "wildlife":
        return "Wildlife"
    if lowered == "other":
        return "Other"

    return value.strip()


def build_hazard_points(fresh_reports: list[dict[str, Any]]) -> list[dict[str, Any]]:
    points: list[dict[str, Any]] = []

    for report in fresh_reports:
        lat = report.get("hazard_latitude")
        lng = report.get("hazard_longitude")
        tags = report.get("hazard_tags", []) or []

        if lat is None or lng is None or not tags:
            continue

        normalized_tags = [
            tag for tag in (normalize_hazard_tag(tag) for tag in tags) if tag
        ]

        if not normalized_tags:
            continue

        points.append(
            {
                "id": report.get("id"),
                "trail_id": report.get("trail_id"),
                "tags": normalized_tags,
                "note": report.get("note"),
                "latitude": float(lat),
                "longitude": float(lng),
                "accuracy_meters": report.get("hazard_location_accuracy_meters"),
                "created_at": report.get("created_at"),
            }
        )

    return points


def color_for_condition(primary_condition: str | None) -> str:
    condition = normalize_condition(primary_condition)

    if not condition:
        return "yellow"

    if condition in {"Hero", "Dry", "Likely Dry"}:
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

def get_dry_out_cap_hours(recovery_class: str | None) -> int:
    caps = {
        "fast": 48,
        "average": 72,
        "slow": 96,
    }

    return caps.get(recovery_class or "average", caps["average"])

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
    
    def _visible_report_cutoff(self) -> datetime:
        return datetime.now(timezone.utc) - timedelta(hours=VISIBLE_REPORT_HOURS)

    def _is_permanently_closed(self, trail: dict[str, Any]) -> bool:
        trail_id = str(trail.get("id") or "").strip().lower()
        return trail_id in PERMANENTLY_CLOSED_TRAIL_IDS

    def _is_summary_permanently_closed(self, trail: dict[str, Any]) -> bool:
        summary = trail.get("summary") or {}
        display_condition = normalize_condition(summary.get("display_condition"))

        return display_condition == "Permanently Closed" or self._is_permanently_closed(trail)

    def _trail_sort_key(self, trail: dict[str, Any]) -> tuple[bool, float, str]:
        summary = trail.get("summary") or {}
        last_updated_at = parse_dt(summary.get("last_updated_at"))
        last_updated_timestamp = (
            last_updated_at.timestamp()
            if last_updated_at
            else datetime.min.replace(tzinfo=timezone.utc).timestamp()
        )

        return (
            self._is_summary_permanently_closed(trail),
            -last_updated_timestamp,
            str(trail.get("name") or "").strip().lower(),
        )

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

        # Fresh rider report wins.
        if most_recent_fresh_condition:
            return (
                most_recent_fresh_condition,
                color_for_condition(most_recent_fresh_condition),
                1,
                "fresh_rider_report",
            )

        if is_raining_now:
            return (
                "Wet / Unrideable",
                color_for_condition("Wet / Unrideable"),
                0,
                "active_rain",
            )

        if recent_rain_unavailable:
            return (
                "Unknown",
                color_for_condition("Unknown"),
                0,
                "recent_rain_unavailable",
            )
        if storm_rain_total_inches <= 0:
            return (
                "Likely Dry",
                color_for_condition("Likely Dry"),
                0,
                "no_recent_rain",
            )

        dry_out_cap_hours = get_dry_out_cap_hours(recovery_class)

        if effective_drying_hours >= dry_out_cap_hours:
            return (
                "Likely Dry",
                color_for_condition("Likely Dry"),
                0,
                "dry_out_cap_reached",
            )

        if not drying_window_established:
            if storm_rain_total_inches < 0.10:
                if recovery_class == "slow":
                    return (
                        "Needs More Time",
                        "yellow",
                        0,
                        "light_rain_slow_recovery",
                    )

                if recovery_class == "fast":
                    return (
                        "Likely Dry",
                        color_for_condition("Likely Dry"),
                        0,
                        "light_rain_fast_recovery",
                    )

                return (
                    "Damp",
                    color_for_condition("Damp"),
                    0,
                    "light_rain_average_recovery",
                )

            if storm_rain_total_inches >= 0.50:
                return (
                    "Wet / Unrideable",
                    color_for_condition("Wet / Unrideable"),
                    0,
                    "no_drying_window_heavy_rain",
                )

            return (
                "Needs More Time",
                "yellow",
                0,
                "no_drying_window",
            )

        required_recovery_hours = get_required_recovery_hours(
            recovery_class,
            storm_rain_total_inches,
        )

        if storm_rain_total_inches < 0.10:
            if recovery_class == "fast":
                return (
                    "Likely Dry",
                    color_for_condition("Likely Dry"),
                    0,
                    "light_rain_fast_recovery",
                )

            if recovery_class == "slow":
                return (
                    "Needs More Time",
                    "yellow",
                    0,
                    "light_rain_slow_recovery",
                )

            return (
                "Damp",
                color_for_condition("Damp"),
                0,
                "light_rain_average_recovery",
            )

        if effective_drying_hours < required_recovery_hours:
            return (
                "Needs More Time",
                color_for_condition("Needs More Time"),
                0,
                "insufficient_drying_time",
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

        visible_cutoff = self._visible_report_cutoff()

        fresh_reports: list[dict[str, Any]] = []
        visible_reports: list[dict[str, Any]] = []

        for report in sorted_reports:
            created_at = parse_dt(report.get("created_at"))

            if created_at and created_at >= cutoff:
                fresh_reports.append(report)

            if created_at and created_at >= visible_cutoff:
                visible_reports.append(report)

        most_recent_report = sorted_reports[0] if sorted_reports else None
        most_recent_fresh_report = fresh_reports[0] if fresh_reports else None
        most_recent_visible_report = visible_reports[0] if visible_reports else None

        current_condition = normalize_condition(
            most_recent_report.get("primary_condition")
            if most_recent_report
            else None
        )

        recent_hazards: list[str] = []
        for report in fresh_reports:
            for tag in report.get("hazard_tags", []) or []:
                normalized_tag = normalize_hazard_tag(tag)
                if normalized_tag and normalized_tag not in recent_hazards:
                    recent_hazards.append(normalized_tag)

        hazard_points = build_hazard_points(fresh_reports)

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

        is_permanently_closed = self._is_permanently_closed(trail)

        if is_permanently_closed:
            display_condition = "Permanently Closed"
            display_status_color = "red"
            report_confidence_count = 1
            resolution_reason = "permanently_closed"
        else:
            (
                display_condition,
                display_status_color,
                report_confidence_count,
                resolution_reason,
            ) = self._resolve_display_status(
                most_recent_fresh_condition=most_recent_fresh_condition,
                recovery_class=recovery_profile.get("recovery_class") if recovery_profile else None,
                current_weather=current_weather,
                recent_rain=recent_rain,
            )

        last_visible_report_created_at = (
            parse_dt(most_recent_visible_report.get("created_at"))
            if most_recent_visible_report
            else None
        )

        last_visible_report_age_hours = (
            round(
                (datetime.now(timezone.utc) - last_visible_report_created_at).total_seconds()
                / 3600,
                1,
            )
            if last_visible_report_created_at
            else None
        )

        trail_payload = dict(trail)
        trail_payload.pop("weather_warning", None)

        return {
            **trail_payload,
            "summary": {
                "current_condition": (
                    "Permanently Closed" if is_permanently_closed else current_condition
                ),
                "reported_by_count": len(fresh_reports),
                "visible_report_count": len(visible_reports),
                "last_visible_report": (
                    {
                        "condition": normalize_condition(
                            most_recent_visible_report.get("primary_condition")
                        ),
                        "note": most_recent_visible_report.get("note"),
                        "username": most_recent_visible_report.get("username") or "rider",
                        "created_at": most_recent_visible_report.get("created_at"),
                        "age_hours": last_visible_report_age_hours,
                    }
                    if most_recent_visible_report
                    else None
                ),
                "recent_hazards": recent_hazards,
                "hazard_points": hazard_points,
                "last_updated_at": last_updated_at,
                "freshness_hours": FRESHNESS_HOURS,
                "display_condition": display_condition,
                "display_status_color": display_status_color,
                "debug": {
                    "resolution_reason": resolution_reason,
                    "is_permanently_closed": is_permanently_closed,
                    "visible_report_count": len(visible_reports),
                    "visible_report_hours": VISIBLE_REPORT_HOURS,
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
                    "dry_out_cap_hours": (
                        get_dry_out_cap_hours(recovery_profile.get("recovery_class"))
                        if recovery_profile
                        else get_dry_out_cap_hours(None)
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

        return sorted(results, key=self._trail_sort_key)

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
                    "hazard_tags": [
                        tag
                        for tag in (
                            normalize_hazard_tag(tag)
                            for tag in (report.get("hazard_tags") or [])
                        )
                        if tag
                    ],
                    "note": report.get("note"),
                    "hazard_latitude": report.get("hazard_latitude"),
                    "hazard_longitude": report.get("hazard_longitude"),
                    "hazard_location_accuracy_meters": report.get(
                        "hazard_location_accuracy_meters"
                    ),
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