"""Restore pre-lighting tree geometry while preserving the v12 snow banks."""
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'Blender/snowglobe_new_york_v12_city_atmosphere.blend'))
old = bpy.data.objects['TREES']
collection = old.users_collection[0]
materials = {m.name: m for m in bpy.data.materials}
with bpy.data.libraries.load(str(ROOT / 'Blender/snowglobe_new_york_v11_full_snow.blend'), link=False) as (source, target):
    target.objects = ['TREES']
restored = target.objects[0]
collection.objects.link(restored)
for index, material in enumerate(restored.data.materials):
    if not material:
        continue
    name = material.name
    if name not in materials and name.rsplit('.', 1)[-1].isdigit():
        name = name.rsplit('.', 1)[0]
    assert name in materials, name
    restored.data.materials[index] = materials[name]
bpy.data.objects.remove(old, do_unlink=True)
restored.name = 'TREES'
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'Blender/snowglobe_new_york_v13_original_trees.blend'))
bpy.ops.object.select_all(action='DESELECT')
for name in ['GLASS', 'BASE', 'CITY', 'TREES', 'PROPS']:
    bpy.data.objects[name].select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'Blender/snowglobe_new_york_v13_original_trees.glb'),
                         export_format='GLB', use_selection=True, export_apply=True)
print('ORIGINAL_TREES_RESTORED', len(restored.data.polygons))
