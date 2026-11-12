"""Flatten the miniature street and seat its three lamp bases on the snow deck.

Run with Blender --background --python Blender/fix_street_and_lamp_bases.py.
The v06 source stays available, and v07 is saved as a separate editable model.
"""
from pathlib import Path
import json

import bpy


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'Blender/snowglobe_new_york_v06_shop_pbr.blend'
OUTPUT = ROOT / 'Blender/snowglobe_new_york_v07_flat_street.blend'
EXPORT = ROOT / 'Blender/snowglobe_new_york_v07_flat_street.glb'
GROUND_Z = 0.84
LAMP_CENTERS = [(-0.65, -0.83), (-0.3, -0.46), (-0.29, 0.03)]

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
city = bpy.data.objects['CITY']
street_slot = next(i for i, material in enumerate(city.data.materials)
                   if material and material.name == 'Stone street')
street_vertices = {index for face in city.data.polygons
                   if face.material_index == street_slot for index in face.vertices}
assert street_vertices, 'The source street was not found.'
old_low = min(city.data.vertices[i].co.z for i in street_vertices)
old_high = max(city.data.vertices[i].co.z for i in street_vertices)
assert old_high - old_low > 0.2, 'Unexpected source street thickness.'

# Keep the existing curved route and width, with a shallow crown above the snow.
for index in street_vertices:
    vertex = city.data.vertices[index]
    fraction = (vertex.co.z - old_low) / (old_high - old_low)
    vertex.co.z = GROUND_Z + 0.001 + fraction * 0.007
city.data.update()

props = bpy.data.objects['PROPS']
neighbors = [[] for _ in props.data.vertices]
for edge in props.data.edges:
    a, b = edge.vertices
    neighbors[a].append(b)
    neighbors[b].append(a)

# The props are joined, but each lamp foot is still a connected mesh component.
unvisited = set(range(len(props.data.vertices)))
feet = []
while unvisited:
    pending = [unvisited.pop()]
    component = []
    while pending:
        index = pending.pop()
        component.append(index)
        for neighbor in neighbors[index]:
            if neighbor in unvisited:
                unvisited.remove(neighbor)
                pending.append(neighbor)
    points = [props.data.vertices[i].co for i in component]
    low = [min(point[axis] for point in points) for axis in range(3)]
    high = [max(point[axis] for point in points) for axis in range(3)]
    center_x = (low[0] + high[0]) / 2
    center_y = (low[1] + high[1]) / 2
    is_lamp = any(abs(center_x - x) < 0.001 and abs(center_y - y) < 0.001
                  for x, y in LAMP_CENTERS)
    if is_lamp and abs(low[2] - 0.855) < 0.001 and abs(high[2] - 0.905) < 0.001:
        for index in component:
            vertex = props.data.vertices[index]
            fraction = (vertex.co.z - low[2]) / (high[2] - low[2])
            vertex.co.z = GROUND_Z + fraction * (high[2] - GROUND_Z)
        feet.append(component)

assert len(feet) == 3, f'Expected three lamp feet, found {len(feet)}.'
props.data.update()
assert all(abs(min(props.data.vertices[i].co.z for i in foot) - GROUND_Z) < 1e-6
           for foot in feet), 'Lamp feet must meet the snow deck.'
assert max(city.data.vertices[i].co.z for i in street_vertices) < GROUND_Z + 0.009
images = [image for image in bpy.data.images if image.source == 'FILE']
assert all(image.packed_file and image.size[0] > 0 for image in images)

bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT))
bpy.ops.object.select_all(action='DESELECT')
for name in ['GLASS', 'BASE', 'CITY', 'TREES', 'PROPS']:
    bpy.data.objects[name].select_set(True)
bpy.ops.export_scene.gltf(filepath=str(EXPORT), export_format='GLB',
                         use_selection=True, export_apply=True)
print('MODEL_CHECK', json.dumps({
    'street_vertices': len(street_vertices),
    'old_street_height': [old_low, old_high],
    'new_street_height': [min(city.data.vertices[i].co.z for i in street_vertices),
                          max(city.data.vertices[i].co.z for i in street_vertices)],
    'ground_height': GROUND_Z,
    'grounded_lamp_bases': len(feet),
    'packed_images': len(images),
    'blend': str(OUTPUT),
    'glb': str(EXPORT),
}))
