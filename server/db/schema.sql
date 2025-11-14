PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS clips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    court_id TEXT NOT NULL,
    device_id TEXT,
    source_video_id TEXT,
    start_ms INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    recorded_at TEXT NOT NULL,
    clip_path TEXT,
    clip_url TEXT,
    uploader_email TEXT,
    event_type TEXT,
    hash_sha256 TEXT,
    status TEXT DEFAULT 'stored',
    metadata_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clips_court_recorded ON clips (court_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_clips_device_recorded ON clips (device_id, recorded_at);