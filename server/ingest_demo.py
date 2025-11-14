from db.clip_store import init_db, insert_clip, list_clips


def main():
    init_db()
    clip_id = insert_clip(
        court_id="C1",
        device_id="PC-QUADRA-01",
        source_video_id="full_2025_10_14_01",
        start_ms=120000,
        duration_ms=30000,
        clip_url="https://example.com/media/clip_01.mp4",
        uploader_email="op@quadra.local",
        event_type="gol",
        metadata={"note": "Extraído via botão 30s"},
    )
    print("Inserted clip id:", clip_id)
    recent = list_clips(limit=5)
    print("Recent clips:")
    for r in recent:
        print(r)


if __name__ == "__main__":
    main()