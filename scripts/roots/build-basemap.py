#!/usr/bin/env python3
"""Build public/roots/assets/basemap.json from Natural Earth (public domain) for the card maps.

    python3 scripts/roots/build-basemap.py <dir with Natural Earth geojson>

Needs ne_50m_land, ne_10m_land, ne_50m_admin_0_boundary_lines_land and
ne_50m_admin_1_states_provinces_lines (github.com/nvkelso/natural-earth-vector, geojson/).
Run once; the output is committed. Coordinates are stored as delta-encoded integers.
"""
import json, sys, os
from shapely.geometry import shape, box, mapping
from shapely.ops import unary_union

src = sys.argv[1]
out = os.path.join(os.path.dirname(__file__), "../../public/roots/assets/basemap.json")
# detailed coastline where the families lived: eastern US, northern Italy, Panama, NY harbour
DETAIL = [box(-84.5, 32.5, -69.5, 44.5), box(5.5, 42.5, 13.5, 47.5), box(-81.5, 7.5, -77, 10.5), box(-2, 48, 3, 51)]

def load(name):
    return json.load(open(os.path.join(src, name + ".geojson")))["features"]

def enc(coords, scale):
    flat, px, py = [], 0, 0
    for x, y in coords:
        ix, iy = round(x * scale), round(y * scale)
        flat += [ix - px, iy - py]; px, py = ix, iy
    return flat

def rings(geom):
    if geom.is_empty: return []
    gs = [geom] if geom.geom_type in ("Polygon", "LineString") else list(geom.geoms)
    r = []
    for g in gs:
        if g.geom_type == "Polygon":
            r.append(list(g.exterior.coords)); r += [list(i.coords) for i in g.interiors]
        elif g.geom_type == "LineString":
            r.append(list(g.coords))
        else:
            r += rings(g)
    return r

def layer(geoms, tol, scale, minlen=3):
    res = []
    for g in geoms:
        g = g.simplify(tol, preserve_topology=True)
        for r in rings(g):
            if len(r) >= minlen: res.append(enc(r, scale))
    return res

land50 = [shape(f["geometry"]) for f in load("ne_50m_land")]
land10 = unary_union([shape(f["geometry"]) for f in load("ne_10m_land")])
detail = [land10.intersection(b) for b in DETAIL]
borders = [shape(f["geometry"]) for f in load("ne_50m_admin_0_boundary_lines_land")]
states = [shape(f["geometry"]) for f in load("ne_50m_admin_1_states_provinces_lines") if f["properties"].get("adm0_a3") == "USA"]
data = {
    "about": "Natural Earth (public domain), naturalearthdata.com. Integer lon/lat, delta-encoded; divide by scale.",
    "land": {"scale": 100, "rings": layer(land50, 0.03, 100)},
    "detail": {"scale": 1000, "boxes": [list(b.bounds) for b in DETAIL], "rings": layer(detail, 0.004, 1000)},
    "borders": {"scale": 100, "rings": layer(borders, 0.02, 100, 2)},
    "states": {"scale": 100, "rings": layer(states, 0.02, 100, 2)},
}
json.dump(data, open(out, "w"), separators=(",", ":"))
print("wrote", out, os.path.getsize(out) // 1024, "KB")
