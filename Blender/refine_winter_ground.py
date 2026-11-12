"""Create v08 with baked stone paving and shallow, irregular snow accumulations."""
from pathlib import Path
import math
import random

import bmesh
import bpy


ROOT = Path(__file__).resolve().parent.parent
TEXTURES = ROOT / '웹체험_3D/assets/ground-v08'
TEXTURES.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'Blender/snowglobe_new_york_v07_flat_street.blend'))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 8
scene.cycles.device = 'CPU'
scene.render.bake.use_pass_direct = False
scene.render.bake.use_pass_indirect = False
scene.render.bake.use_pass_color = True
scene.render.bake.margin = 8

# Bake the procedural surface into portable textures for the web renderer.
paving = bpy.data.materials.new('Winter paving')
paving.use_nodes = True
nodes, links = paving.node_tree.nodes, paving.node_tree.links
shader = nodes.get('Principled BSDF')
uv = nodes.new('ShaderNodeTexCoord')
brick = nodes.new('ShaderNodeTexBrick')
brick.inputs['Scale'].default_value = 5
brick.inputs['Brick Width'].default_value = 0.5
brick.inputs['Row Height'].default_value = 0.32
brick.inputs['Mortar Size'].default_value = 0.006
brick.inputs['Mortar Smooth'].default_value = 0.008
brick.inputs['Color1'].default_value = (0.19, 0.20, 0.21, 1)
brick.inputs['Color2'].default_value = (0.29, 0.30, 0.31, 1)
brick.inputs['Mortar'].default_value = (0.065, 0.068, 0.072, 1)
links.new(uv.outputs['UV'], brick.inputs['Vector'])
noise = nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = 150
noise.inputs['Detail'].default_value = 3
links.new(uv.outputs['UV'], noise.inputs['Vector'])
grain = nodes.new('ShaderNodeMixRGB')
grain.blend_type = 'MULTIPLY'
grain.inputs[0].default_value = 0.25
links.new(brick.outputs['Color'], grain.inputs[1])
links.new(noise.outputs['Fac'], grain.inputs[2])
links.new(grain.outputs[0], shader.inputs['Base Color'])
height = nodes.new('ShaderNodeMath')
height.operation = 'SUBTRACT'
height.inputs[0].default_value = 1
links.new(brick.outputs['Fac'], height.inputs[1])
bump = nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = 0.35
bump.inputs['Distance'].default_value = 0.002
links.new(height.outputs[0], bump.inputs['Height'])
grain_bump = nodes.new('ShaderNodeBump')
grain_bump.inputs['Strength'].default_value = 0.15
grain_bump.inputs['Distance'].default_value = 0.0007
links.new(noise.outputs['Fac'], grain_bump.inputs['Height'])
links.new(bump.outputs['Normal'], grain_bump.inputs['Normal'])
links.new(grain_bump.outputs['Normal'], shader.inputs['Normal'])
roughness = nodes.new('ShaderNodeMapRange')
roughness.inputs['To Min'].default_value = 0.62
roughness.inputs['To Max'].default_value = 0.88
links.new(noise.outputs['Fac'], roughness.inputs['Value'])
links.new(roughness.outputs['Result'], shader.inputs['Roughness'])

bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, -20))
bake_plane = bpy.context.object
bake_plane.data.materials.append(paving)
baked = {}
for name, bake_type in [('paving-color', 'DIFFUSE'), ('paving-normal', 'NORMAL'), ('paving-roughness', 'ROUGHNESS')]:
    image = bpy.data.images.new(name, width=1024, height=1024)
    if bake_type != 'DIFFUSE':
        image.colorspace_settings.name = 'Non-Color'
    target = nodes.new('ShaderNodeTexImage')
    target.image = image
    nodes.active = target
    bpy.ops.object.bake(type=bake_type)
    image.filepath_raw = str(TEXTURES / f'{name}.png')
    image.file_format = 'PNG'
    image.save()
    baked[name] = image
    nodes.remove(target)
bpy.data.objects.remove(bake_plane, do_unlink=True)

nodes.clear()
shader = nodes.new('ShaderNodeBsdfPrincipled')
output = nodes.new('ShaderNodeOutputMaterial')
links.new(shader.outputs['BSDF'], output.inputs['Surface'])
for name, socket in [('paving-color', 'Base Color'), ('paving-roughness', 'Roughness'), ('paving-normal', 'Normal')]:
    texture = nodes.new('ShaderNodeTexImage')
    texture.image = baked[name]
    if socket == 'Normal':
        normal = nodes.new('ShaderNodeNormalMap')
        links.new(texture.outputs['Color'], normal.inputs['Color'])
        links.new(normal.outputs['Normal'], shader.inputs[socket])
    else:
        links.new(texture.outputs['Color'], shader.inputs[socket])

city = bpy.data.objects['CITY']
road_slot = next(i for i, m in enumerate(city.data.materials) if m and m.name == 'Stone street')
snow_slot = next(i for i, m in enumerate(city.data.materials) if m and m.name.startswith('Snow ·'))
city.data.materials.append(paving)
paving_slot = len(city.data.materials) - 1
mesh = bmesh.new()
mesh.from_mesh(city.data)
# The obsolete tube-shaped road is replaced by the continuous paved surface.
road_vertices = {v for face in mesh.faces if face.material_index == road_slot for v in face.verts}
bmesh.ops.delete(mesh, geom=list(road_vertices), context='VERTS')
uv_layer = mesh.loops.layers.uv.active
deck_faces = 0
for face in mesh.faces:
    if face.material_index == snow_slot and max(v.co.z for v in face.verts) < 0.85:
        face.material_index = paving_slot
        deck_faces += 1
        for loop in face.loops:
            loop[uv_layer].uv = (loop.vert.co.x, loop.vert.co.y)
assert deck_faces > 0
mesh.to_mesh(city.data)
mesh.free()

snow = bpy.data.materials['Snow · ambientCG Snow001'].copy()
snow.name = 'Settled ground snow'
for node in snow.node_tree.nodes:
    if node.type == 'NORMAL_MAP':
        node.inputs['Strength'].default_value = 0.18
random.seed(81)
patches = []
# Snow gathers beside facades and around tree trunks, leaving the entrances clear.
locations = [
    (-0.19, 0.28, 0.12, 0.28), (0.26, 0.25, 0.08, 0.23),
    (0.68, 0.23, 0.08, 0.22), (1.06, 0.30, 0.11, 0.25),
    (0.36, 0.70, 0.55, 0.16), (-0.60, 0.78, 0.33, 0.15),
    (0.78, -0.48, 0.27, 0.23), (-1.0, -0.25, 0.20, 0.24),
    (-0.85, -0.60, 0.21, 0.18), (-0.63, -0.60, 0.13, 0.17),
    (-0.98, 0.10, 0.17, 0.20), (0.98, -0.15, 0.17, 0.12),
]
for number, (x, y, rx, ry) in enumerate(locations):
    phase = random.random() * math.tau
    segments = 48
    boundary = [1 + 0.10 * math.sin(i * math.tau / segments * 3 + phase)
                + 0.055 * math.cos(i * math.tau / segments * 7 + phase)
                + random.uniform(-0.025, 0.025) for i in range(segments)]
    vertices = [(x, y, 0.858)]
    for radius in [0.2, 0.45, 0.7, 0.88, 1]:
        for i in range(segments):
            angle = i * math.tau / segments
            z = 0.8403 + 0.018 * (1 - radius * radius) ** 1.6
            z += math.sin(angle * 4 + phase) * 0.001 * math.sin(radius * math.pi)
            vertices.append((x + rx * radius * boundary[i] * math.cos(angle),
                             y + ry * radius * boundary[i] * math.sin(angle), z))
    faces = [(0, 1 + i, 1 + (i + 1) % segments) for i in range(segments)]
    for ring in range(4):
        for i in range(segments):
            a = 1 + ring * segments + i
            b = 1 + ring * segments + (i + 1) % segments
            faces.append((a, a + segments, b + segments, b))
    data = bpy.data.meshes.new(f'Settled snow {number}')
    data.from_pydata(vertices, [], faces)
    data.materials.append(snow)
    uv_layer = data.uv_layers.new(name='UVMap')
    for face in data.polygons:
        face.use_smooth = True
        for index in face.loop_indices:
            position = data.vertices[data.loops[index].vertex_index].co
            uv_layer.data[index].uv = (position.x * 4, position.y * 4)
    patch = bpy.data.objects.new(f'Settled snow {number}', data)
    city.users_collection[0].objects.link(patch)
    patches.append(patch)

bpy.ops.object.select_all(action='DESELECT')
city.select_set(True)
for patch in patches:
    patch.select_set(True)
bpy.context.view_layer.objects.active = city
bpy.ops.object.join()
city.data.update()
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'Blender/snowglobe_new_york_v08_winter_ground.blend'))
bpy.ops.object.select_all(action='DESELECT')
for name in ['GLASS', 'BASE', 'CITY', 'TREES', 'PROPS']:
    bpy.data.objects[name].select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'Blender/snowglobe_new_york_v08_winter_ground.glb'),
                         export_format='GLB', use_selection=True, export_apply=True)
print('WINTER_GROUND_OK', {'paved_deck_faces': deck_faces, 'snow_patches': len(locations), 'baked_maps': len(baked)})
