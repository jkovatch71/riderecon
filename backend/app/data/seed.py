from datetime import datetime, timedelta, timezone


now = datetime.now(timezone.utc)

TRAILS = [
    {
        "id": "mcallister-park",
        "name": "McAllister Park",
        "alias": "Mac",
        "system_name": "Salado Creek Greenway",
        "status_color": "yellow",
        "current_condition": "Muddy",
        "last_reported_at": now - timedelta(minutes=42),
        "weather_warning": "Likely Wet (Auto-detected)",
        "latitude": 29.5449,
        "longitude": -98.4243,
        "report_count": 5,
    },
    {
        "id": "op-schnabel-park",
        "name": "O.P. Schnabel Park",
        "alias": None,
        "system_name": "Leon Creek Greenway",
        "status_color": "green",
        "current_condition": "Hero Dirt",
        "last_reported_at": now - timedelta(minutes=25),
        "weather_warning": None,
        "latitude": 29.5365,
        "longitude": -98.6904,
        "report_count": 3,
    },
    {
        "id": "government-canyon",
        "name": "Government Canyon State Natural Area",
        "alias": None,
        "system_name": "Outside Greenways",
        "status_color": "red",
        "current_condition": "Closed",
        "last_reported_at": now - timedelta(hours=2, minutes=10),
        "weather_warning": "Likely Wet (Auto-detected)",
        "latitude": 29.6003,
        "longitude": -98.7695,
        "report_count": 2,
    },
]

REPORTS = {
    "mcallister-park": [
        {
            "id": "rpt-1",
            "username": "traildad",
            "trail_id": "mcallister-park",
            "primary_condition": "Muddy",
            "hazard_tags": ["Bees"],
            "note": "Front side is greasy. Back side has standing water.",
            "created_at": now - timedelta(minutes=42),
            "updated_at": now - timedelta(minutes=42),
            "is_edited": False,
        },
        {
            "id": "rpt-2",
            "username": "rockhopper",
            "trail_id": "mcallister-park",
            "primary_condition": "Muddy",
            "hazard_tags": ["Obstructed"],
            "note": "Small branch pile near the creek crossing.",
            "created_at": now - timedelta(minutes=55),
            "updated_at": now - timedelta(minutes=18),
            "is_edited": True,
        },
    ],
    "op-schnabel-park": [
        {
            "id": "rpt-3",
            "username": "singletracksam",
            "trail_id": "op-schnabel-park",
            "primary_condition": "Hero Dirt",
            "hazard_tags": [],
            "note": "Fast and tacky this morning.",
            "created_at": now - timedelta(minutes=25),
            "updated_at": now - timedelta(minutes=25),
            "is_edited": False,
        }
    ],
    "government-canyon": [
        {
            "id": "rpt-4",
            "username": "mesa_masher",
            "trail_id": "government-canyon",
            "primary_condition": "Closed",
            "hazard_tags": [],
            "note": "Posting says closed after overnight rain.",
            "created_at": now - timedelta(hours=2, minutes=10),
            "updated_at": now - timedelta(hours=2, minutes=10),
            "is_edited": False,
        }
    ],
}
