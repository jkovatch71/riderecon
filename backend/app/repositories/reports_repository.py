from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.db.supabase_client import get_supabase_admin_client


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


class ReportsRepository:
    def __init__(self) -> None:
        self.client = get_supabase_admin_client()

    def _require_client(self) -> None:
        if not self.client:
            raise RuntimeError(
                "Supabase admin client is unavailable. "
                "Seed/fallback report data has been removed."
            )

    def create_report(self, payload: dict[str, Any]) -> dict[str, Any]:
        self._require_client()

        now = datetime.now(timezone.utc).isoformat()

        report = {
            "id": str(uuid4()),
            "user_id": payload.get("user_id"),
            "username": payload.get("username") or "rider",
            "trail_id": payload["trail_id"],
            "primary_condition": payload["primary_condition"],
            "hazard_tags": payload.get("hazard_tags", []),
            "note": payload.get("note"),
            "hazard_latitude": payload.get("hazard_latitude"),
            "hazard_longitude": payload.get("hazard_longitude"),
            "hazard_location_accuracy_meters": payload.get(
                "hazard_location_accuracy_meters"
            ),
            "created_at": now,
            "updated_at": now,
            "is_visible": True,
        }

        insert_result = self.client.table("trail_reports").insert(report).execute()
        print("SUPABASE INSERT RESULT:", insert_result)

        trail = (
            self.client.table("trails")
            .select("id, report_count")
            .eq("id", payload["trail_id"])
            .limit(1)
            .execute()
        )
        current_rows = trail.data or []
        current_count = current_rows[0].get("report_count", 0) if current_rows else 0

        update_result = (
            self.client.table("trails")
            .update(
                {
                    "current_condition": payload["primary_condition"],
                    "status_color": color_for_condition(payload["primary_condition"]),
                    "last_reported_at": now,
                    "report_count": current_count + 1,
                    "updated_at": now,
                }
            )
            .eq("id", payload["trail_id"])
            .execute()
        )
        print("SUPABASE TRAIL UPDATE RESULT:", update_result)

        return {
            **report,
            "hazard_tags": payload.get("hazard_tags", []),
        }

    def confirm_report(self, report_id: str, user_id: str) -> dict[str, Any]:
        self._require_client()

        existing = (
            self.client.table("report_confirmations")
            .select("id")
            .eq("report_id", report_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )

        if existing.data:
            return self.get_report_confirmation_state(report_id, user_id)

        now = datetime.now(timezone.utc).isoformat()

        self.client.table("report_confirmations").insert(
            {
                "id": str(uuid4()),
                "report_id": report_id,
                "user_id": user_id,
                "created_at": now,
            }
        ).execute()

        return self.get_report_confirmation_state(report_id, user_id)

    def get_report_confirmation_state(
        self, report_id: str, user_id: str | None = None
    ) -> dict[str, Any]:
        self._require_client()

        confirmations = (
            self.client.table("report_confirmations")
            .select("id, user_id")
            .eq("report_id", report_id)
            .execute()
        )

        rows = confirmations.data or []

        return {
            "report_id": report_id,
            "confirmation_count": len(rows),
            "confirmed_by_current_user": (
                any(row.get("user_id") == user_id for row in rows)
                if user_id
                else False
            ),
        }