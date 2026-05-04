from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.db.supabase_client import get_supabase_admin_client


class RiderAssistRepository:
    def __init__(self) -> None:
        self.client = get_supabase_admin_client()

    def _require_client(self) -> None:
        if not self.client:
            raise RuntimeError("Supabase admin client is unavailable.")

    def create_request(self, payload: dict[str, Any]) -> dict[str, Any]:
        self._require_client()

        now = datetime.now(timezone.utc).isoformat()

        request = {
            "id": str(uuid4()),
            "user_id": payload["user_id"],
            "username": payload.get("username") or "rider",
            "assist_type": payload["assist_type"],
            "assist_detail": payload.get("assist_detail"),
            "note": payload.get("note"),
            "latitude": payload.get("latitude"),
            "longitude": payload.get("longitude"),
            "location_accuracy_meters": payload.get("location_accuracy_meters"),
            "status": "active",
            "created_at": now,
            "updated_at": now,
        }

        result = (
            self.client.table("rider_assist_requests")
            .insert(request)
            .execute()
        )

        rows = result.data or []
        return rows[0] if rows else request

    def list_active_requests(self) -> list[dict[str, Any]]:
        self._require_client()

        result = (
            self.client.table("rider_assist_requests")
            .select("*")
            .eq("status", "active")
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )

        return result.data or []
    
    def respond_to_request(
        self,
        request_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        self._require_client()

        now = datetime.now(timezone.utc).isoformat()

        update_payload = {
            "responder_user_id": payload["user_id"],
            "responder_username": payload.get("username") or "rider",
            "responder_latitude": payload.get("latitude"),
            "responder_longitude": payload.get("longitude"),
            "responder_location_accuracy_meters": payload.get(
                "location_accuracy_meters"
            ),
            "responded_at": now,
            "updated_at": now,
        }

        result = (
            self.client.table("rider_assist_requests")
            .update(update_payload)
            .eq("id", request_id)
            .eq("status", "active")
            .execute()
        )

        rows = result.data or []

        if not rows:
            raise ValueError("Assist request not found or no longer active.")

        return rows[0]
    
    def resolve_request(
        self,
        request_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        self._require_client()

        now = datetime.now(timezone.utc).isoformat()

        result = (
            self.client.table("rider_assist_requests")
            .update(
                {
                    "status": "resolved",
                    "resolved_at": now,
                    "updated_at": now,
                }
            )
            .eq("id", request_id)
            .eq("status", "active")
            .execute()
        )

        rows = result.data or []

        if not rows:
            raise ValueError("Assist request not found or already resolved.")

        return rows[0]