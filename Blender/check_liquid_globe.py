"""Reopen the deliverable and verify its closed water mesh and baked animation."""
import bpy,bmesh,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'Blender/snowglobe_liquid_v01.blend'))
liquid=bpy.data.objects['LIQUID'];bm=bmesh.new();bm.from_mesh(liquid.data)
assert all(edge.is_manifold for edge in bm.edges), 'Liquid volume must be watertight'
assert bm.calc_volume()>0, 'Volume must face outwards'
assert len(liquid.data.vertices)>3000
assert liquid.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['IOR'].default_value>1.33
keys=bpy.data.objects['SNOW_LIQUID_PREVIEW'].data.shape_keys
assert len(keys.key_blocks)==289
scene=bpy.context.scene;scene.frame_set(89)
assert abs(sum(k.value for k in list(keys.key_blocks)[1:])-1)<.001
assert max(p.co.z for p in keys.key_blocks['Flow_0089'].data)>1.2
for lib in bpy.data.libraries:assert Path(bpy.path.abspath(lib.filepath)).exists(),lib.filepath
print('PASS: closed outward liquid volume, water IOR, 289 animation samples, reference models resolved')
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.cycles.samples=12
scene.render.filepath=str(ROOT/'웹체험_3D/verification/liquid-blender.png')
bpy.ops.render.render(write_still=True)
