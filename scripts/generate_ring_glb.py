#!/usr/bin/env python3
"""Generate a dense gold-ring mesh (band + setting) as GLB for the Anil hero."""

from pathlib import Path

import numpy as np
import trimesh

OUT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "models" / "anil-ring.glb"


def revolve(profile_xy: np.ndarray, sections: int = 160) -> trimesh.Trimesh:
    """Revolve 2D profile (x=radius, y=height) around Y axis."""
    verts = []
    faces = []
    n = len(profile_xy)
    for i in range(sections):
        ang = 2 * np.pi * i / sections
        c, s = np.cos(ang), np.sin(ang)
        for x, y in profile_xy:
            verts.append([x * c, y, x * s])
    for i in range(sections):
        i0 = i * n
        i1 = ((i + 1) % sections) * n
        for j in range(n - 1):
            a, b = i0 + j, i0 + j + 1
            c, d = i1 + j, i1 + j + 1
            faces.append([a, c, b])
            faces.append([b, c, d])
    mesh = trimesh.Trimesh(vertices=np.array(verts), faces=np.array(faces), process=True)
    mesh.remove_degenerate_faces()
    mesh.remove_duplicate_faces()
    mesh.fix_normals()
    return mesh


def band_profile() -> np.ndarray:
    """Comfort-fit / D-profile jewelry band (mm-ish units → scene units)."""
    pts = []
    # Start at outer equator, go CCW around cross-section
    # Outer rounded face
    for t in np.linspace(-0.72, 0.72, 10):
        pts.append([1.18 + 0.12, t * 0.22])  # will rebuild properly below

    # Clean parametric profile: x from axis, y along finger axis-ish (height of band)
    # Major radius ~1.0; profile local coords then add major to x
    local = []
    # outer side (rounded)
    for a in np.linspace(-np.pi / 2, np.pi / 2, 18):
        local.append([0.145 * np.cos(a), 0.55 * np.sin(a)])
    # top flat-ish toward inside
    for x in np.linspace(0.0, -0.14, 8):
        local.append([x, 0.55 + 0.02 * (1 - abs(x) / 0.14)])
    # inner comfort scoop
    for a in np.linspace(np.pi / 2, 3 * np.pi / 2, 28):
        # ellipse indented
        r_x = 0.16 + 0.05 * np.sin(a) ** 2  # deeper at equator
        local.append([-r_x * abs(np.cos(a)) - 0.02, 0.52 * np.sin(a)])
    # bottom back to outer
    for x in np.linspace(-0.14, 0.0, 8):
        local.append([x, -0.55 - 0.02 * (1 - abs(x) / 0.14)])

    local = np.array(local, dtype=float)
    # Deduplicate consecutive
    cleaned = [local[0]]
    for p in local[1:]:
        if np.linalg.norm(p - cleaned[-1]) > 1e-4:
            cleaned.append(p)
    local = np.array(cleaned)
    # Offset by major radius so ring sits around origin
    major = 1.05
    profile = np.column_stack([local[:, 0] + major, local[:, 1]])
    return profile


def diamond_brilliant(size=0.34) -> trimesh.Trimesh:
    """Simplified round-brilliant: crown + pavilion."""
    # Crown table + bezel, pavilion facets via cones/icosa
    crown = trimesh.creation.cone(radius=size * 0.72, height=size * 0.42, sections=16)
    crown.apply_translation([0, size * 0.15, 0])
    table = trimesh.creation.cylinder(radius=size * 0.42, height=size * 0.02, sections=16)
    table.apply_translation([0, size * 0.36, 0])
    pavilion = trimesh.creation.cone(radius=size * 0.78, height=size * 0.85, sections=16)
    pavilion.apply_transform(
        trimesh.transformations.rotation_matrix(np.pi, [1, 0, 0])
        @ trimesh.transformations.translation_matrix([0, -size * 0.28, 0])
    )
    girdle = trimesh.creation.cylinder(radius=size * 0.78, height=size * 0.05, sections=32)
    girdle.apply_translation([0, 0, 0])
    gem = trimesh.util.concatenate([crown, table, pavilion, girdle])
    gem.merge_vertices()
    return gem


def prongs(gold_band_top=0.95) -> list[trimesh.Trimesh]:
    meshes = []
    for i in range(6):
        a = 2 * np.pi * i / 6 + np.pi / 6
        r = 0.28
        claw = trimesh.creation.cylinder(radius=0.028, height=0.42, sections=12)
        # tip taper via scaling
        claw.apply_translation([r * np.cos(a), gold_band_top + 0.28, r * np.sin(a)])
        tip = trimesh.creation.cone(radius=0.032, height=0.08, sections=10)
        tip.apply_translation([r * np.cos(a), gold_band_top + 0.48, r * np.sin(a)])
        meshes.extend([claw, tip])
    return meshes


def setting_base() -> trimesh.Trimesh:
    gallery = trimesh.creation.cylinder(radius=0.34, height=0.22, sections=48)
    gallery.apply_translation([0, 0.95, 0])
    seat = trimesh.creation.cylinder(radius=0.26, height=0.12, sections=48)
    seat.apply_translation([0, 1.08, 0])
    return trimesh.util.concatenate([gallery, seat])


def main():
    profile = band_profile()
    band = revolve(profile, sections=180)
    # Smooth
    trimesh.smoothing.filter_laplacian(band, iterations=2)

    setting = setting_base()
    claws = prongs()
    gem = diamond_brilliant(0.36)
    gem.apply_translation([0, 1.28, 0])

    # Materials via visual - single scene export
    gold_parts = trimesh.util.concatenate([band, setting, *claws])
    gold_parts.visual.vertex_colors = [212, 175, 55, 255]
    gem.visual.vertex_colors = [230, 245, 255, 220]

    scene = trimesh.Scene()
    scene.add_geometry(gold_parts, geom_name="gold")
    scene.add_geometry(gem, geom_name="diamond")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    # Export combined mesh for simpler loading (materials overridden in Three)
    combined = trimesh.util.concatenate([gold_parts, gem])
    combined.export(OUT)
    print(f"Wrote {OUT}  faces={len(combined.faces)} verts={len(combined.vertices)}")


if __name__ == "__main__":
    main()
