"""Original TR-style subway car models for TTC Sim (tribute design, no trademarks).

Run headless (Blender 4.3):
  blender -b --factory-startup -P scripts/blender/tr_car.py -- --out public/models [--preview path.png]

Writes tr_cab.glb and tr_mid.glb. No logos, wordmarks, roundels or fleet numbers;
the destination sign is a blank dark panel.

Coordinates: Blender is Z-up. The car front points to Blender -Y, which the glTF
exporter (export_yup=True) turns into glTF/three.js +Z, matching Train.ts where
car.lookAt(front) aims +Z at the front bogie. Origin = rail level, car centre.

Dimensions are ESTIMATE (public approximate figures for the TR fleet; not from a
drawing). See public/models/README.md for the basis of each.
"""
import math
import sys
import os

import bpy
import bmesh

# --- dimensions (metres), all ESTIMATE ---
LEN_COUPLERS = 23.2   # ESTIMATE: length over couplers
BODY_LEN = 22.7       # ESTIMATE: carbody length (couplers add ~0.25 m each end)
BODY_W = 3.13         # ESTIMATE: body width
ROOF_Z = 3.65         # ESTIMATE: roof above rail
FLOOR_Z = 1.10        # ESTIMATE: floor above rail (platform-level boarding)
SKIRT_Z = 0.95        # ESTIMATE: body bottom edge
DOOR_W = 1.30         # ESTIMATE: door pair opening width
DOORS_PER_SIDE = 4    # ESTIMATE
BOGIE_CTRS = 16.1     # ESTIMATE: bogie centre spacing
WHEEL_D = 0.71        # ESTIMATE: wheel diameter
GAUGE = 1.495         # TTC gauge 4 ft 10 7/8 in (1495 mm), documented
WHEELBASE = 2.2       # ESTIMATE: bogie wheelbase
WIN_LO, WIN_HI = 1.95, 2.85   # ESTIMATE: window band
BAND_LO, BAND_HI = 1.62, 1.84  # tribute red band (generic red, not a brand colour match)

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def arg(name, default=None):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else default


# --- materials (Principled BSDF only) ---
def mat(name, color, metallic=0.0, roughness=0.5, emission=None, strength=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = roughness
    if emission:
        b.inputs['Emission Color'].default_value = (*emission, 1)
        b.inputs['Emission Strength'].default_value = strength
    return m


def materials():
    return {
        'steel': mat('stainless', (0.78, 0.79, 0.80), 0.9, 0.35),
        'door': mat('stainless_door', (0.70, 0.71, 0.72), 0.9, 0.42),
        'red': mat('red_band', (0.62, 0.03, 0.05), 0.1, 0.45),
        'glass': mat('dark_glass', (0.02, 0.025, 0.03), 0.0, 0.06),
        'rubber': mat('black_rubber', (0.015, 0.015, 0.015), 0.0, 0.85),
        'under': mat('underframe', (0.09, 0.09, 0.09), 0.5, 0.7),
        'roof': mat('roof_grey', (0.42, 0.43, 0.44), 0.6, 0.55),
        'head': mat('headlight', (1.0, 0.97, 0.88), 0.0, 0.2, (1.0, 0.95, 0.82), 6.0),
        'tail': mat('taillight', (0.5, 0.02, 0.02), 0.0, 0.3, (1.0, 0.05, 0.03), 3.0),
        'sign': mat('blank_sign', (0.01, 0.01, 0.012), 0.0, 0.3),
    }


# --- geometry helpers ---
def profile():
    """Half cross-section (x>=0) from bottom centre round to roof centre, (x, z)."""
    hw = BODY_W / 2
    return [(0.0, SKIRT_Z), (hw - 0.07, SKIRT_Z), (hw - 0.02, SKIRT_Z + 0.12), (hw, 1.30),
            (hw, 2.95), (hw - 0.05, 3.18), (hw - 0.22, 3.42), (hw - 0.55, 3.57),
            (hw - 1.0, 3.63), (0.0, ROOF_Z)]


def ring_points():
    half = profile()
    left = [(-x, z) for x, z in reversed(half[1:-1])]
    return half[:-1] + [(0.0, ROOF_Z)] + left  # closed loop, starts bottom centre


def new_obj(name, bm, material):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material)
    return ob


def body(name, cab, m):
    """Sweep the cross-section along Y. A cab end gets a raked windscreen nose at -Y."""
    pts = ring_points()
    half = BODY_LEN / 2
    # rings: (y, rake function) from rear (+Y) to front (-Y)
    rings = [(half, None), (-half + 0.8, None)] if cab else [(half, None), (-half, None)]
    if cab:
        rings.append((-half + 0.25, 'mid'))
        rings.append((-half, 'nose'))
    bm = bmesh.new()
    loops = []
    for y, kind in rings:
        loop = []
        for x, z in pts:
            yy, xx = y, x
            if kind == 'nose':
                t = max(0.0, (z - 2.05) / (ROOF_Z - 2.05))
                yy = y + 0.42 * t          # windscreen rake, ESTIMATE
                xx = x * (0.965 - 0.02 * t)  # slight corner taper
                if z < 1.2:
                    yy = y + 0.08
            elif kind == 'mid':
                t = max(0.0, (z - 2.05) / (ROOF_Z - 2.05))
                yy = y + 0.18 * t
                xx = x * 0.99
            loop.append(bm.verts.new((xx, yy, z)))
        loops.append(loop)
    n = len(pts)
    for a, b in zip(loops, loops[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(list(reversed(loops[0])))
    bm.faces.new(loops[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm, m['steel'])


def box(name, size, loc, material):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bmesh.ops.translate(bm, vec=loc, verts=bm.verts)
    return new_obj(name, bm, material)


def cyl(name, r, depth, loc, material, axis='X', segs=16):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=depth)
    rot = {'X': ('Y', math.pi / 2), 'Y': ('X', math.pi / 2), 'Z': ('Z', 0.0)}[axis]
    from mathutils import Matrix
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(rot[1], 3, rot[0]))
    bmesh.ops.translate(bm, vec=loc, verts=bm.verts)
    return new_obj(name, bm, material)


def door_centres():
    usable = BODY_LEN - 3.0
    step = usable / DOORS_PER_SIDE
    return [-usable / 2 + step * (i + 0.5) for i in range(DOORS_PER_SIDE)]


def side_details(m, cab):
    hw = BODY_W / 2
    parts = []
    doors = door_centres()
    front = -BODY_LEN / 2 + (1.0 if cab else 0.35)
    rear = BODY_LEN / 2 - 0.35
    for s in (-1, 1):
        x = s * hw
        # red band in pieces between doors
        edges = [front] + [e for d in doors for e in (d - DOOR_W / 2 - 0.05, d + DOOR_W / 2 + 0.05)] + [rear]
        for a, b in zip(edges[0::2], edges[1::2]):
            parts.append(box('band', (0.012, b - a, BAND_HI - BAND_LO), (x + s * 0.006, (a + b) / 2, (BAND_LO + BAND_HI) / 2), m['red']))
            if b - a > 1.2:  # window between doors, split by a mullion
                mid = (a + b) / 2
                for wa, wb in ((a + 0.2, mid - 0.06), (mid + 0.06, b - 0.2)):
                    parts.append(box('win', (0.012, wb - wa, WIN_HI - WIN_LO), (x + s * 0.006, (wa + wb) / 2, (WIN_LO + WIN_HI) / 2), m['glass']))
        for d in doors:
            parts.append(box('door', (0.014, DOOR_W, 2.0), (x + s * 0.008, d, FLOOR_Z + 1.0), m['door']))
            parts.append(box('doorseal', (0.016, 0.03, 2.0), (x + s * 0.009, d, FLOOR_Z + 1.0), m['rubber']))
            for dx in (-0.33, 0.33):
                parts.append(box('doorwin', (0.016, 0.42, 0.95), (x + s * 0.010, d + dx, 2.42), m['glass']))
        if cab:  # cab side window
            parts.append(box('cabwin', (0.012, 0.8, 0.9), (x + s * 0.006, -BODY_LEN / 2 + 1.1, 2.4), m['glass']))
    parts.append(box('roofstrip', (BODY_W - 1.6, BODY_LEN - 1.6, 0.06), (0, 0.1, ROOF_Z), m['roof']))
    return parts


def underframe(m):
    parts = [box('underframe', (BODY_W - 0.5, BODY_LEN - 5.8, 0.55), (0, 0, SKIRT_Z - 0.25), m['under'])]
    r = WHEEL_D / 2
    for by in (-BOGIE_CTRS / 2, BOGIE_CTRS / 2):
        parts.append(box('bogie', (GAUGE + 0.35, WHEELBASE + 0.7, 0.32), (0, by, r + 0.05), m['under']))
        for wy in (-WHEELBASE / 2, WHEELBASE / 2):
            parts.append(cyl('axle', 0.07, GAUGE + 0.2, (0, by + wy, r), m['under'], 'X', 8))
            for s in (-1, 1):
                parts.append(cyl('wheel', r, 0.13, (s * GAUGE / 2, by + wy, r), m['under'], 'X', 16))
        for s in (-1, 1):  # third-rail collector shoe beam (both sides; TTC rail side varies)
            parts.append(box('shoe', (0.25, 0.4, 0.06), (s * (GAUGE / 2 + 0.55), by, 0.18), m['under']))
    return parts


def ends(m, cab):
    half = BODY_LEN / 2
    tip = LEN_COUPLERS / 2
    parts = [box('coupler_r', (0.3, tip - half + 0.05, 0.25), (0, (half + tip) / 2, 0.9), m['under']),
             box('gangway_r', (1.1, 0.12, 2.1), (0, half + 0.06, FLOOR_Z + 1.05), m['rubber'])]
    if cab:
        y = -half
        rake = lambda z: y + 0.42 * max(0.0, (z - 2.05) / (ROOF_Z - 2.05)) - 0.012
        zl, zh = 2.15, 3.25
        bm = bmesh.new()
        v = [bm.verts.new(p) for p in ((-1.25, rake(zl), zl), (1.25, rake(zl), zl), (1.15, rake(zh), zh), (-1.15, rake(zh), zh))]
        bm.faces.new(v)
        bm.normal_update()
        ws = new_obj('windscreen', bm, m['glass'])
        if ws.data.polygons[0].normal.y > 0:
            ws.data.flip_normals()
        parts.append(ws)
        parts.append(box('sign', (1.3, 0.02, 0.26), (0, rake(3.36), 3.36), m['sign']))
        parts.append(box('cab_red', (BODY_W * 0.93, 0.03, 0.36), (0, y + 0.07, 1.62), m['red']))
        for s in (-1, 1):
            parts.append(cyl('headlight', 0.11, 0.06, (s * 1.05, y + 0.06, 1.25), m['head'], 'Y', 12))
            parts.append(box('taillight', (0.18, 0.05, 0.1), (s * 1.05, y + 0.07, 1.02), m['tail']))
        parts.append(box('anticlimber', (BODY_W * 0.85, 0.2, 0.18), (0, y - 0.02, 1.0), m['under']))
        parts.append(box('coupler_f', (0.3, tip - half + 0.05, 0.25), (0, -(half + tip) / 2, 0.9), m['under']))
    else:
        parts += [box('coupler_f', (0.3, tip - half + 0.05, 0.25), (0, -(half + tip) / 2, 0.9), m['under']),
                  box('gangway_f', (1.1, 0.12, 2.1), (0, -half - 0.06, FLOOR_Z + 1.05), m['rubber'])]
    return parts


def build(name, cab, m):
    parts = [body(name, cab, m)] + side_details(m, cab) + underframe(m) + ends(m, cab)
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    bpy.ops.object.shade_flat()
    return ob


def stats(ob):
    me = ob.data
    me.calc_loop_triangles()
    xs = [v.co for v in me.vertices]
    bb = [max(c[i] for c in xs) - min(c[i] for c in xs) for i in range(3)]
    return len(me.loop_triangles), bb


def export(ob, path):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
                              export_yup=True, export_apply=True, export_materials='EXPORT')


def preview(cab, mid, path):
    from mathutils import Vector
    scene = bpy.context.scene
    mid.location.y = 23.0  # coupled behind the cab car (23.0 m pitch, as in Physics.ts)
    ground = box('ground', (12, 70, 0.02), (0, 10, -0.01), mat('ballast', (0.18, 0.17, 0.16), 0.0, 0.95))
    for s in (-1, 1):
        box('rail', (0.07, 70, 0.15), (s * GAUGE / 2, 10, 0.075), mat('rail', (0.35, 0.33, 0.3), 0.8, 0.4))
    bpy.ops.object.light_add(type='SUN', rotation=(math.radians(50), math.radians(10), math.radians(-35)))
    bpy.context.object.data.energy = 3.5
    world = scene.world or bpy.data.worlds.new('World')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.68, 0.85, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.9
    bpy.ops.object.camera_add(location=tuple(float(v) for v in arg('--cam', '9.5,-21.0,3.6').split(',')))
    cam = bpy.context.object
    d = Vector((0, -4.0, 1.9)) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = 35
    scene.camera = cam
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = int(arg('--samples', '128'))
    scene.cycles.use_denoising = False  # distro build has no OIDN
    scene.render.resolution_x, scene.render.resolution_y = 1280, 720
    scene.view_settings.view_transform = 'AgX'
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    out = os.path.abspath(arg('--out', 'public/models'))
    os.makedirs(out, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    m = materials()
    cab = build('tr_cab', True, m)
    mid = build('tr_mid', False, m)
    for ob, fn in ((cab, 'tr_cab.glb'), (mid, 'tr_mid.glb')):
        tris, bb = stats(ob)
        export(ob, os.path.join(out, fn))
        size = os.path.getsize(os.path.join(out, fn))
        print(f'{fn}: tris={tris} bbox={bb[0]:.2f},{bb[1]:.2f},{bb[2]:.2f} bytes={size}')
    pv = arg('--preview')
    if pv:
        preview(cab, mid, os.path.abspath(pv))
        print('preview', os.path.abspath(pv))


main()
