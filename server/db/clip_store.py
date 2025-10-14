import os
import json
import sqlite3
from datetime import datetime


BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.getenv("REPLAY_DB_PATH", os.path.join(DATA_DIR, "replay.db"))
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def _connect():
    con = sqlite3.connect(DB_PATH)
    return con


def init_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    con = _connect()
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        con.executescript(f.read())
    con.commit()
    con.close()


def insert_clip(
    court_id,
    device_id,
    source_video_id,
    start_ms,
    duration_ms,
    clip_path=None,
    clip_url=None,
    uploader_email=None,
    event_type=None,
    metadata=None,
    recorded_at=None,
    hash_sha256=None,
    status="stored",
):
    os.makedirs(DATA_DIR, exist_ok=True)
    con = _connect()
    cur = con.cursor()
    if recorded_at is None:
        recorded_at = datetime.utcnow().isoformat()
    if metadata is not None and not isinstance(metadata, str):
        metadata = json.dumps(metadata, ensure_ascii=False)
    cur.execute(
        """
        INSERT INTO clips (
            court_id, device_id, source_video_id, start_ms, duration_ms,
            recorded_at, clip_path, clip_url, uploader_email, event_type,
            hash_sha256, status, metadata_json
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            court_id,
            device_id,
            source_video_id,
            int(start_ms),
            int(duration_ms),
            recorded_at,
            clip_path,
            clip_url,
            uploader_email,
            event_type,
            hash_sha256,
            status,
            metadata,
        ),
    )
    clip_id = cur.lastrowid
    con.commit()
    con.close()
    return clip_id


def get_clip(clip_id):
    con = _connect()
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.execute("SELECT * FROM clips WHERE id=?", (clip_id,))
    row = cur.fetchone()
    con.close()
    return dict(row) if row else None


def list_clips(limit=50, offset=0, court_id=None, device_id=None):
    con = _connect()
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    q = "SELECT * FROM clips"
    params = []
    where = []
    if court_id:
        where.append("court_id=?")
        params.append(court_id)
    if device_id:
        where.append("device_id=?")
        params.append(device_id)
    if where:
        q += " WHERE " + " AND ".join(where)
    q += " ORDER BY recorded_at DESC, id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    cur.execute(q, params)
    rows = cur.fetchall()
    con.close()
    return [dict(r) for r in rows]


def update_clip_status(clip_id, status):
    con = _connect()
    cur = con.cursor()
    cur.execute("UPDATE clips SET status=? WHERE id=?", (status, clip_id))
    con.commit()
    con.close()
    return True