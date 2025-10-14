import os
import hashlib
import secrets
from datetime import datetime

from flask import Flask, request, jsonify, send_from_directory

from db.clip_store import (
    init_db,
    insert_clip,
    list_clips as db_list_clips,
    get_clip as db_get_clip,
    update_clip_status as db_update_clip_status,
)


app = Flask(__name__)

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
CLIPS_DIR = os.path.join(DATA_DIR, "clips")
os.makedirs(CLIPS_DIR, exist_ok=True)

# Ensure DB exists
init_db()


def _to_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/clips", methods=["GET"])
def list_clips():
    court_id = request.args.get("court_id")
    device_id = request.args.get("device_id")
    limit = _to_int(request.args.get("limit", 20), 20)
    offset = _to_int(request.args.get("offset", 0), 0)

    clips = db_list_clips(court_id=court_id, device_id=device_id, limit=limit, offset=offset)
    return jsonify({"items": clips, "count": len(clips)})


@app.route("/clips/<int:clip_id>", methods=["GET"])
def get_clip(clip_id: int):
    clip = db_get_clip(clip_id)
    if not clip:
        return jsonify({"error": "not_found"}), 404
    return jsonify(clip)


@app.route("/clips/<int:clip_id>", methods=["PATCH"])
def patch_clip(clip_id: int):
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if not status:
        return jsonify({"error": "missing status"}), 400
    ok = db_update_clip_status(clip_id, status)
    if not ok:
        return jsonify({"error": "not_found"}), 404
    return jsonify({"id": clip_id, "status": status})


@app.route("/clips", methods=["POST"])
def create_clip():
    # Accept JSON or multipart form
    payload = {}
    if request.is_json:
        payload = request.get_json(silent=True) or {}
    # Form fields override JSON when present
    getf = lambda k, d=None: request.form.get(k, payload.get(k, d))

    court_id = getf("court_id") or ""
    device_id = getf("device_id") or ""
    source_video_id = getf("source_video_id")
    start_ms = _to_int(getf("start_ms", 0), 0)
    duration_ms = _to_int(getf("duration_ms", 30000), 30000)
    event_type = getf("event_type")
    uploader_email = getf("uploader_email")
    metadata = getf("metadata")  # optional JSON string or text
    clip_url = getf("clip_url")

    # Optional file upload
    clip_path = None
    file = request.files.get("clip_file")

    if file and file.filename:
        # Build a unique filename, keep original extension when possible
        ext = os.path.splitext(file.filename)[1].lower() or ".mp4"
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
        fname = f"clip_{ts}_{secrets.token_hex(4)}{ext}"
        save_path = os.path.join(CLIPS_DIR, fname)
        file.save(save_path)
        clip_path = save_path

        # Expose a local URL for the saved media
        base = request.host_url.rstrip("/")
        clip_url = f"{base}/media/{fname}"

    # Hash optional: if we stored a file, compute sha256
    file_hash = None
    if clip_path and os.path.exists(clip_path):
        h = hashlib.sha256()
        with open(clip_path, "rb") as rf:
            for chunk in iter(lambda: rf.read(1024 * 1024), b""):
                h.update(chunk)
        file_hash = h.hexdigest()

    clip_id = insert_clip(
        court_id=court_id,
        device_id=device_id,
        source_video_id=source_video_id,
        start_ms=start_ms,
        duration_ms=duration_ms,
        event_type=event_type,
        uploader_email=uploader_email,
        clip_path=clip_path,
        clip_url=clip_url,
        metadata=metadata,
        hash_sha256=file_hash,
        status="saved" if clip_path else "received",
    )

    return jsonify({"id": clip_id, "clip_url": clip_url, "clip_path": clip_path}), 201


@app.route("/media/<path:filename>", methods=["GET"])
def media(filename: str):
    # Serve saved clips from local folder
    return send_from_directory(CLIPS_DIR, filename)


if __name__ == "__main__":
    # Run on port 5000 to avoid conflict with the static server on 8000
    app.run(host="0.0.0.0", port=5000, debug=True)