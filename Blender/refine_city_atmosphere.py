"""Preserve v11 and add snow banks and soft snow on the existing fir boughs."""
from pathlib import Path
import math
import random
import bpy

ROOT = Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'Blender/snowglobe_new_york_v11_full_snow.blend'))
city = bpy.data.objects['CITY']
snow_slot = next(i for i, m in enumerate(city.data.materials) if m and m.name == 'Settled ground snow')
snow_vertices = {i for p in city.data.polygons if p.material_index == snow_slot for i in p.vertices}
for index in snow_vertices:
    v = city.data.vertices[index].co
    edge = max(0, min(1, (1.405 - math.hypot(v.x, v.y)) / .08))
    # A shallow snow-covered lane bends between the facades; its banks remain white.
    lane = -.24 + .06 * math.sin(v.y * 3)
    bank = .014 * math.exp(-((abs(v.x - lane) - .18) / .075) ** 2)
    v.z += bank * edge
city.data.update()

trees = bpy.data.objects['TREES']
snow = bpy.data.materials['Snow · ambientCG Snow001']
random.seed(712)
caps = []
for tx, ty, h in [(.78, -.48, .85), (-1., -.25, .56)]:
    for level in range(2, 14, 2):
        f = level / 15
        reach = h * .35 * (1 - f) ** .8
        for j in range(0, 12, 2):
            angle = j * math.tau / 12 + level * .7
            radius = reach * random.uniform(.48, .68)
            z = .85 + h * (.10 + f * .92) + h * .018
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6,
                location=(tx + math.cos(angle)*radius, ty + math.sin(angle)*radius, z))
            cap = bpy.context.object
            cap.name = 'Soft snow resting on fir bough'
            cap.scale = (reach * .42, reach * .17, h * random.uniform(.009, .015))
            cap.rotation_euler.z = angle
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            cap.data.materials.append(snow)
            for face in cap.data.polygons:
                face.use_smooth = True
            caps.append(cap)
bpy.ops.object.select_all(action='DESELECT')
trees.select_set(True)
for cap in caps:
    cap.select_set(True)
bpy.context.view_layer.objects.active = trees
bpy.ops.object.join()
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'Blender/snowglobe_new_york_v12_city_atmosphere.blend'))
bpy.ops.object.select_all(action='DESELECT')
for name in ['GLASS', 'BASE', 'CITY', 'TREES', 'PROPS']:
    bpy.data.objects[name].select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'Blender/snowglobe_new_york_v12_city_atmosphere.glb'),
                         export_format='GLB', use_selection=True, export_apply=True)
print('CITY_ATMOSPHERE_OK', {'tree_snow_caps': len(caps), 'snow_vertices': len(snow_vertices)})
