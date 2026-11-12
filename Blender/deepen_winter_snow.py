"""Build a continuous, uneven snow cover over the v08 miniature ground."""
from pathlib import Path
import math

import bmesh
import bpy
from mathutils import Vector, noise


ROOT = Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'Blender/snowglobe_new_york_v08_winter_ground.blend'))
city = bpy.data.objects['CITY']
snow = bpy.data.materials['Settled ground snow']
snow_slot = next(i for i, material in enumerate(city.data.materials) if material == snow)
mesh = bmesh.new()
mesh.from_mesh(city.data)
old_snow = {vertex for face in mesh.faces if face.material_index == snow_slot for vertex in face.verts}
assert old_snow, 'Expected the v08 ground snow patches.'
bmesh.ops.delete(mesh, geom=list(old_snow), context='VERTS')
mesh.to_mesh(city.data)
mesh.free()

GROUND = 0.84
RADIUS = 1.395
RESOLUTION = 144
DRIFTS = [
    (-0.19, 0.28, 0.24, 0.44, 0.075), (0.26, 0.25, 0.18, 0.38, 0.075),
    (0.68, 0.23, 0.18, 0.38, 0.065), (1.02, 0.30, 0.25, 0.41, 0.09),
    (0.36, 0.70, 0.65, 0.28, 0.075), (-0.60, 0.78, 0.43, 0.28, 0.065),
    (0.78, -0.48, 0.43, 0.39, 0.08), (-1.0, -0.25, 0.35, 0.40, 0.09),
    (-0.85, -0.60, 0.32, 0.29, 0.055), (-0.63, -0.60, 0.27, 0.31, 0.04),
    (-0.98, 0.10, 0.30, 0.36, 0.055), (0.74, -0.93, 0.36, 0.27, 0.065),
    (0.16, -0.87, 0.32, 0.38, 0.055), (-0.66, -1.02, 0.26, 0.23, 0.065),
]


def smooth(low, high, value):
    value = max(0, min(1, (value - low) / (high - low)))
    return value * value * (3 - 2 * value)


def snow_depth(x, y):
    broad_noise = noise.noise(Vector((x * 2.7, y * 2.7, 4.13)))
    detail = noise.noise(Vector((x * 15, y * 15, 8.21)))
    depth = 0.025 + broad_noise * 0.025 + detail * 0.006
    for cx, cy, rx, ry, height in DRIFTS:
        distance = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
        depth += height * max(0, 1 - distance) ** 2
    depth = 0.115 * (1 - math.exp(-max(0, depth) / 0.115))

    # A narrow, wandering track exposes a few paving stones through deep snow.
    track_x = -0.34 + 0.09 * math.sin(y * 4.2) + 0.035 * math.sin(y * 12.3)
    width = 0.055 + 0.025 * math.sin(y * 8.7 + 1.2) + detail * 0.018
    track = smooth(-0.015, 0.045, abs(x - track_x) - width)
    # The front steps remain partly visible through an irregular connecting track.
    approach_y = -0.18 + 0.025 * math.sin(x * 16) + detail * 0.018
    approach = smooth(0.015, 0.065, abs(y - approach_y))
    approach_extent = smooth(-0.36, -0.20, x) * (1 - smooth(0.93, 1.10, x))
    depth *= min(track, 1 - approach_extent * (1 - approach))
    depth *= smooth(0, 0.055, RADIUS - math.hypot(x, y))
    return max(0, depth)


vertices = []
depths = []
grid = {}
for row in range(RESOLUTION + 1):
    y = -RADIUS + row * RADIUS * 2 / RESOLUTION
    for column in range(RESOLUTION + 1):
        x = -RADIUS + column * RADIUS * 2 / RESOLUTION
        depth = snow_depth(x, y)
        grid[row, column] = len(vertices)
        vertices.append((x, y, GROUND + 0.0002 + depth))
        depths.append(depth)

samples = vertices
vertices = []
vertex_lookup = {}
faces = []


def add_snow_triangle(triangle):
    # Intersect the snow edge with each triangle instead of leaving a stair-step grid outline.
    polygon = [(samples[index], depths[index] - 0.0008) for index in triangle]
    clipped = []
    previous, previous_depth = polygon[-1]
    for point, depth in polygon:
        if (depth > 0) != (previous_depth > 0):
            fraction = previous_depth / (previous_depth - depth)
            clipped.append((previous[0] + fraction * (point[0] - previous[0]),
                            previous[1] + fraction * (point[1] - previous[1]), GROUND + 0.0002))
        if depth > 0:
            clipped.append((point[0], point[1], GROUND + 0.0002 + depth))
        previous, previous_depth = point, depth
    indices = []
    for point in clipped:
        key = tuple(round(value, 7) for value in point)
        if key not in vertex_lookup:
            vertex_lookup[key] = len(vertices)
            vertices.append(point)
        indices.append(vertex_lookup[key])
    for corner in range(1, len(indices) - 1):
        faces.append((indices[0], indices[corner], indices[corner + 1]))


for row in range(RESOLUTION):
    for column in range(RESOLUTION):
        corners = [grid.get(key) for key in [(row, column), (row, column + 1),
                                            (row + 1, column + 1), (row + 1, column)]]
        for triangle in [(corners[0], corners[1], corners[2]), (corners[0], corners[2], corners[3])]:
            add_snow_triangle(triangle)

snow_mesh = bpy.data.meshes.new('Deep irregular winter snow')
snow_mesh.from_pydata(vertices, [], faces)
snow_mesh.materials.append(snow)
uv = snow_mesh.uv_layers.new(name='UVMap')
for face in snow_mesh.polygons:
    face.use_smooth = True
    for loop_index in face.loop_indices:
        point = snow_mesh.vertices[snow_mesh.loops[loop_index].vertex_index].co
        uv.data[loop_index].uv = (point.x * 4, point.y * 4)
snow_object = bpy.data.objects.new('Deep irregular winter snow', snow_mesh)
city.users_collection[0].objects.link(snow_object)

interior_depths = [depth for point, depth in zip(samples, depths) if math.hypot(point[0], point[1]) <= RADIUS]
coverage = sum(depth > 0.002 for depth in interior_depths) / len(interior_depths)
assert coverage > 0.75, f'Insufficient snow coverage: {coverage}'
assert max(depths) > 0.07, 'Snowbanks should be substantially deeper than v08.'
bpy.ops.object.select_all(action='DESELECT')
city.select_set(True)
snow_object.select_set(True)
bpy.context.view_layer.objects.active = city
bpy.ops.object.join()
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'Blender/snowglobe_new_york_v09_deep_snow.blend'))
bpy.ops.object.select_all(action='DESELECT')
for name in ['GLASS', 'BASE', 'CITY', 'TREES', 'PROPS']:
    bpy.data.objects[name].select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'Blender/snowglobe_new_york_v09_deep_snow.glb'),
                         export_format='GLB', use_selection=True, export_apply=True)
print('DEEP_SNOW_OK', {'coverage': round(coverage, 3), 'max_depth': round(max(depths), 4),
                       'average_depth': round(sum(depths) / len(depths), 4), 'triangles': len(faces)})
