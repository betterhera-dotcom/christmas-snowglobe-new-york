"""Add side/rear facade relief and warm courtyard windows to the v09 city."""
from pathlib import Path
import random

import bpy


ROOT = Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'Blender/snowglobe_new_york_v09_deep_snow.blend'))
random.seed(104)
city = bpy.data.objects['CITY']
atlas = bpy.data.images.load(str(ROOT / '웹체험_3D/assets/window-interiors/rooms-atlas.png'), check_existing=True)


def room_material(name, emission):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    texture = material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = atlas
    material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
    material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Emission Color'])
    shader.inputs['Emission Strength'].default_value = emission
    shader.inputs['Roughness'].default_value = 0.68
    return material


materials = [bpy.data.materials[name] for name in [
    'AI aged cream limestone', 'Painted walnut window sash',
    'Deep botanical enamel', 'Snow · ambientCG Snow001', 'Aged champagne brass',
]]
materials.extend([room_material('Courtyard lit interior', 0.75),
                  room_material('Courtyard dark interior', 0.04)])
lantern = bpy.data.materials['Warm window glass'].copy()
lantern.name = 'Courtyard lantern glass'
lantern.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value = 1.4
materials.append(lantern)
vertices, faces, material_ids, pane_uvs = [], [], [], {}
window_count = 0
lit_count = 0


def box(center, size, material):
    start = len(vertices)
    x, y, z = center
    sx, sy, sz = [value / 2 for value in size]
    vertices.extend([(x + dx * sx, y + dy * sy, z + dz * sz)
                     for dx, dy, dz in [(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1),
                                       (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)]])
    for corners in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
                    (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
        faces.append(tuple(start + i for i in corners))
        material_ids.append(material)


def wall_box(center, normal, width, height, depth, material):
    size = (depth, width, height) if normal[0] else (width, depth, height)
    box(center, size, material)


def window(center, normal, width, height, ornate=True):
    global window_count, lit_count
    x, y, z = center
    nx, ny = normal
    tx, ty = -ny, nx
    is_lit = random.random() < 0.58
    window_count += 1
    lit_count += int(is_lit)
    start = len(vertices)
    vertices.extend([(x + nx * 0.001 + tx * u * width, y + ny * 0.001 + ty * u * width, z + v * height)
                     for u, v in [(-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)]])
    faces.append(tuple(start + i for i in range(4)))
    material_ids.append(5 if is_lit else 6)
    column, row = random.randrange(2), int(is_lit)
    pane_uvs[len(faces) - 1] = [((column + u) / 2, (row + v) / 2)
                               for u, v in [(0.05, 0.03), (0.85, 0.03), (0.85, 0.97), (0.05, 0.97)]]
    frame = 0.006 if ornate else 0.003
    for side in [-1, 1]:
        wall_box((x + tx * side * (width + frame) / 2 + nx * 0.004,
                  y + ty * side * (width + frame) / 2 + ny * 0.004, z),
                 normal, frame, height + frame * 2, 0.012, 0)
        wall_box((x + nx * 0.004, y + ny * 0.004, z + side * (height + frame) / 2),
                 normal, width + frame * 2, frame, 0.012, 0)
    if ornate:
        wall_box((x + nx * 0.007, y + ny * 0.007, z), normal, 0.003, height, 0.007, 1)
        wall_box((x + nx * 0.007, y + ny * 0.007, z), normal, width, 0.003, 0.007, 1)
        wall_box((x + nx * 0.012, y + ny * 0.012, z - height / 2 - 0.008),
                 normal, width + 0.025, 0.012, 0.036, 0)
        wall_box((x + nx * 0.012, y + ny * 0.012, z - height / 2 + 0.001),
                 normal, width + 0.022, 0.005, 0.033, 3)


for x, y, height, width in [(0.05, 0.35, 1.05, 0.36), (0.47, 0.37, 1.30, 0.40), (0.88, 0.30, 1.14, 0.34)]:
    rear = y + 0.21
    for level in range(3):
        z = 1.10 + level * 0.31
        for offset in [-0.24, 0.24]:
            window((x + offset * width, rear, z), (0, 1), 0.075, 0.15)
            for side in [-1, 1]:
                window((x + side * width / 2, y + offset * 0.42, z), (side, 0), 0.075, 0.15)
    for z in [0.90, 1.19, 1.50, 1.81]:
        if z > 0.85 + height:
            continue
        box((x, rear + 0.006, z), (width + 0.012, 0.018, 0.014), 0)
        for side in [-1, 1]:
            box((x + side * (width / 2 + 0.006), y, z), (0.018, 0.42, 0.014), 0)
    # Framed service entrance, handle, snowy steps and a small wall lantern.
    box((x, rear + 0.006, 0.955), (0.09, 0.014, 0.21), 2)
    for side in [-1, 1]:
        box((x + side * 0.05, rear + 0.009, 0.955), (0.009, 0.024, 0.22), 0)
    box((x, rear + 0.009, 1.07), (0.11, 0.024, 0.014), 0)
    box((x + 0.028, rear + 0.017, 0.95), (0.008, 0.008, 0.014), 4)
    box((x, rear + 0.05, 0.865), (0.15, 0.09, 0.04), 0)
    box((x, rear + 0.075, 0.888), (0.15, 0.05, 0.006), 3)
    box((x - 0.075, rear + 0.018, 1.06), (0.026, 0.024, 0.055), 7)
    for z in [1.03, 1.09]:
        box((x - 0.075, rear + 0.018, z), (0.036, 0.032, 0.009), 2)

for x, y, height in [(-0.95, 0.45, 0.65), (-0.8, 0.85, 0.74), (0, 0.9, 0.60)]:
    for row in range(4):
        for offset in [-0.055, 0.055]:
            window((x + offset, y + 0.11, 0.95 + row * 0.12), (0, 1), 0.035, 0.065, False)
            for side in [-1, 1]:
                window((x + side * 0.115, y + offset, 0.95 + row * 0.12), (side, 0), 0.035, 0.065, False)
    box((x, y, 0.85 + height + 0.006), (0.245, 0.235, 0.016), 3)

base = 0.85
for width, depth, height in [(0.39, 0.32, 0.88), (0.30, 0.27, 0.42), (0.22, 0.21, 0.30), (0.14, 0.14, 0.18)]:
    for row in range(max(2, int(height / 0.10))):
        z = base + 0.05 + row * 0.095
        for offset in [-0.27, 0, 0.27]:
            window((-0.52 + offset * width, 0.48 + depth / 2, z), (0, 1), 0.026, 0.052, False)
            for side in [-1, 1]:
                window((-0.52 + side * width / 2, 0.48 + offset * depth, z), (side, 0), 0.026, 0.052, False)
    base += height

data = bpy.data.meshes.new('Courtyard facade details')
data.from_pydata(vertices, [], faces)
for material in materials:
    data.materials.append(material)
uv = data.uv_layers.new(name='UVMap')
for face in data.polygons:
    face.material_index = material_ids[face.index]
    axis = max(range(3), key=lambda i: abs(face.normal[i]))
    for corner, loop_index in enumerate(face.loop_indices):
        p = data.vertices[data.loops[loop_index].vertex_index].co
        projected = (p.y, p.z) if axis == 0 else (p.x, p.z) if axis == 1 else (p.x, p.y)
        uv.data[loop_index].uv = pane_uvs[face.index][corner] if face.index in pane_uvs else (projected[0] * 3, projected[1] * 3)
details = bpy.data.objects.new('Courtyard facade details', data)
city.users_collection[0].objects.link(details)
bpy.ops.object.select_all(action='DESELECT')
city.select_set(True)
details.select_set(True)
bpy.context.view_layer.objects.active = city
bpy.ops.object.join()
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'Blender/snowglobe_new_york_v10_courtyard_detail.blend'))
bpy.ops.object.select_all(action='DESELECT')
for name in ['GLASS', 'BASE', 'CITY', 'TREES', 'PROPS']:
    bpy.data.objects[name].select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'Blender/snowglobe_new_york_v10_courtyard_detail.glb'),
                         export_format='GLB', use_selection=True, export_apply=True)
print('COURTYARD_DETAIL_OK', {'windows': window_count, 'lit': lit_count, 'dark': window_count - lit_count,
                             'service_doors': 3, 'wall_lanterns': 3, 'faces_added': len(faces)})
