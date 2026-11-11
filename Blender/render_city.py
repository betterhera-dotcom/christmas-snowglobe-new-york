import bpy
from pathlib import Path
from mathutils import Vector
r=Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(r/'Blender'/'snowglobe_new_york_v01.blend'))
s=bpy.context.scene
for name in ['01_Globe','02_Pedestal','06_Snow']:
 for o in bpy.data.collections[name].objects:o.hide_render=True
for name in ['Studio green backdrop','Walnut counter']:bpy.data.objects[name].hide_render=True
s.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.32,.42,1)
s.world.node_tree.nodes['Background'].inputs[1].default_value=.5
cam=s.camera;cam.location=(0,-1.85,1.10);cam.rotation_euler=(Vector((-.10,.42,1.60))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='PERSP';cam.data.lens=24
s.render.resolution_x=1600;s.render.resolution_y=900;s.cycles.samples=24
s.render.filepath=str(r/'미리보기'/'02-same-city-inside.png')
bpy.ops.render.render(write_still=True)
