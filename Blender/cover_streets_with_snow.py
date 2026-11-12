"""Cover all paving in the v10 city with an unbroken, uneven snow blanket."""
from pathlib import Path
import math

import bmesh
import bpy
from mathutils import Vector, noise


ROOT = Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'Blender/snowglobe_new_york_v10_courtyard_detail.blend'))
city = bpy.data.objects['CITY']
snow = bpy.data.materials['Settled ground snow']
snow_slot = next(i for i, material in enumerate(city.data.materials) if material == snow)
mesh = bmesh.new()
mesh.from_mesh(city.data)
old_snow = {v for face in mesh.faces if face.material_index == snow_slot for v in face.verts}
bmesh.ops.delete(mesh, geom=list(old_snow), context='VERTS')
mesh.to_mesh(city.data)
mesh.free()

# The deck beneath the snow is snowy too, including the narrow rim at the glass.
paving_slot = next(i for i, material in enumerate(city.data.materials)
                   if material and material.name == 'Winter paving')
deck = snow.copy()
deck.name = 'Snow-covered ground'
city.data.materials[paving_slot] = deck
for face in city.data.polygons:
    if face.material_index == paving_slot:
        for loop_index in face.loop_indices:
            city.data.uv_layers.active.data[loop_index].uv *= 4

RADIUS = 1.405
RINGS = 96
SEGMENTS = 192
DRIFTS = [
    (-0.19, 0.28, 0.26, 0.44, 0.07), (0.26, 0.25, 0.21, 0.38, 0.07),
    (0.68, 0.23, 0.21, 0.38, 0.06), (1.02, 0.30, 0.27, 0.41, 0.085),
    (0.36, 0.70, 0.65, 0.28, 0.07), (-0.60, 0.78, 0.43, 0.28, 0.06),
    (0.78, -0.48, 0.43, 0.39, 0.075), (-1.0, -0.25, 0.35, 0.40, 0.08),
    (-0.85, -0.60, 0.32, 0.29, 0.05), (-0.63, -0.60, 0.27, 0.31, 0.04),
    (0.16, -0.87, 0.38, 0.38, 0.055), (-0.66, -1.02, 0.26, 0.23, 0.06),
]


def surface_height(x, y):
    depth = 0.032 + 0.016 * noise.noise(Vector((x * 2.7, y * 2.7, 4.13)))
    depth += 0.004 * noise.noise(Vector((x * 15, y * 15, 8.21)))
    for cx, cy, rx, ry, height in DRIFTS:
        distance = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
        depth += height * max(0, 1 - distance) ** 2
    depth = 0.12 * (1 - math.exp(-depth / 0.12))
    edge = max(0, min(1, (RADIUS - math.hypot(x, y)) / 0.06))
    return 0.8403 + depth * edge * edge * (3 - 2 * edge)


vertices = [(0, 0, surface_height(0, 0))]
for ring in range(1, RINGS + 1):
    radius = RADIUS * ring / RINGS
    for segment in range(SEGMENTS):
        angle = math.tau * segment / SEGMENTS
        x, y = radius * math.cos(angle), radius * math.sin(angle)
        vertices.append((x, y, surface_height(x, y)))
faces = [(0, 1 + i, 1 + (i + 1) % SEGMENTS) for i in range(SEGMENTS)]
for ring in range(RINGS - 1):
    for segment in range(SEGMENTS):
        a = 1 + ring * SEGMENTS + segment
        b = 1 + ring * SEGMENTS + (segment + 1) % SEGMENTS
        faces.append((a, a + SEGMENTS, b + SEGMENTS, b))
data = bpy.data.meshes.new('Unbroken winter snow blanket')
data.from_pydata(vertices, [], faces)
data.materials.append(snow)
uv = data.uv_layers.new(name='UVMap')
for face in data.polygons:
    face.use_smooth = True
    for index in face.loop_indices:
        point = data.vertices[data.loops[index].vertex_index].co
        uv.data[index].uv = (point.x * 4, point.y * 4)
blanket = bpy.data.objects.new('Unbroken winter snow blanket', data)
city.users_collection[0].objects.link(blanket)
bpy.ops.object.select_all(action='DESELECT')
city.select_set(True)
blanket.select_set(True)
bpy.context.view_layer.objects.active = city
bpy.ops.object.join()
assert all(material.name != 'Winter paving' for material in city.data.materials if material)
assert min(z for x, y, z in vertices) > 0.84
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'Blender/snowglobe_new_york_v11_full_snow.blend'))
bpy.ops.object.select_all(action='DESELECT')
for name in ['GLASS', 'BASE', 'CITY', 'TREES', 'PROPS']:
    bpy.data.objects[name].select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'Blender/snowglobe_new_york_v11_full_snow.glb'),
                         export_format='GLB', use_selection=True, export_apply=True)
print('FULL_SNOW_OK', {'covered_faces': len(faces), 'min_height': min(p[2] for p in vertices),
                       'max_height': max(p[2] for p in vertices), 'exposed_paving_materials': 0})
