from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.data.seed import REPORTS, TRAILS
from app.db.supabase_client import get_supabase_admin_client


def color_for_condition(primary_condition: str) -> str:
    if primary_condition in {"Hero Dirt", "Dry"}:
        return "green"
    if primary_condition in {"Damp", "Muddy", "Other"}:
        return "yellow"
    return "red"


class ReportsRepository:
    def __init__(self) -> None:
        self.client = get_supabase_admin_client()

    def create_report(self, payload: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()

        report = {
            "id": str(uuid4()),
            "user_id": payload.get("user_id"),
            "username": payload.get("username") or "rider",
            "trail_id": payload["trail_id"],
            "primary_condition": payload["primary_condition"],
            "hazard_tags": payload.get("hazard_tags", []),
            "note": payload.get("note"),
            "created_at": now,
            "updated_at": now,
            "is_visible": True,
        }

        if not self.client:
            demo_report = {
                **report,
                "hazard_tags": payload.get("hazard_tags", []),
            }

            REPORTS.setdefault(payload["trail_id"], []).insert(0, demo_report)

            for trail in TRAILS:
                if trail["id"] == payload["trail_id"]:
                    trail["current_condition"] = payload["primary_condition"]
                    trail["status_color"] = color_for_condition(payload["primary_condition"])
                    trail["last_reported_at"] = now
                    trail["report_count"] += 1
                    break

            return demo_report

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