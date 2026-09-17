import importlib.util, json, sys, datetime as dt

spec = importlib.util.spec_from_file_location("build_calendar", "/tmp/outputs/build_calendar.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

out = []
for i, e in enumerate(m.E, start=1):
    g = m.genre_for(e)
    out.append({
        "id": i,
        "name": e["name"],
        "venue": e["venue"],
        "cat": e["cat"],
        "start": e["start"].isoformat(),
        "end": e["end"].isoformat(),
        "cost": e["cost"],
        "desc": e["desc"],
        "link": e["link"],
        "flags": e["flags"],
        "approx": e["approx"],
        "genre": g,
    })

meta = {
    "cats": {k: {"label": v[0], "color": v[1]} for k, v in m.CATS.items()},
    "genreLabels": m.GENRE_LABELS,
    "weeks": [[w[0].isoformat(), w[1].isoformat()] for w in m.WEEKS],
}

with open("/tmp/outputs/local-events-finder/data/events.json", "w") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
with open("/tmp/outputs/local-events-finder/data/meta.json", "w") as f:
    json.dump(meta, f, indent=2, ensure_ascii=False)

print("exported", len(out), "events")
