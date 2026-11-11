import bpy,json,math
from pathlib import Path
from collections import defaultdict
r=Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(r/'Blender'/'snowglobe_new_york_v04_window-tree-detail.blend'))
w=r/'웹체험_3D';boxes=[]
for o in bpy.data.collections['03_NewYork'].objects:
 if o.name.startswith(('Brownstone ','Empire tower setback','Distant Manhattan block')):
  from mathutils import Vector
  pts=[o.matrix_world@Vector(v) for v in o.bound_box]
  boxes.append({'min':[min(p.x for p in pts),min(p.z for p in pts),-max(p.y for p in pts)],'max':[max(p.x for p in pts),max(p.z for p in pts),-min(p.y for p in pts)]})
(w/'assets/3d/colliders.json').write_text(json.dumps(boxes))
for name in ['07_Stage','06_Snow']:
 for o in list(bpy.data.collections[name].objects):bpy.data.objects.remove(o,do_unlink=True)
before=len(bpy.data.objects)
# Simplify materials to explicit UV-based portable glTF PBR.
for m in bpy.data.materials:
 if not m.use_nodes:continue
 p=m.node_tree.nodes.get('Principled BSDF')
 if not p:continue
 imgs=[n.image for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and ('color' in n.image.name.lower())]
 if imgs:
  img=imgs[0];base=p.inputs['Base Color'].default_value[:];rough=p.inputs['Roughness'].default_value;metal=p.inputs['Metallic'].default_value
  m.node_tree.nodes.clear();p=m.node_tree.nodes.new('ShaderNodeBsdfPrincipled');out=m.node_tree.nodes.new('ShaderNodeOutputMaterial');m.node_tree.links.new(p.outputs['BSDF'],out.inputs['Surface'])
  p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
  t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=img;m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
groups={}
print('MATERIALS_READY',flush=True)
for cname,prefix in [('01_Globe','GLASS'),('02_Pedestal','BASE'),('03_NewYork','CITY'),('04_Trees','TREES'),('05_Props','PROPS')]:
 print('CONVERTING',cname,flush=True);col=bpy.data.collections[cname];batch=list(col.objects)
 bpy.ops.object.select_all(action='DESELECT')
 for o in batch:o.select_set(True)
 bpy.context.view_layer.objects.active=batch[0];bpy.ops.object.convert(target='MESH')
 # Apply world transforms and generate planar UVs with consistent real-world texture scale.
 for o in list(col.objects):
  o.data.transform(o.matrix_world);o.matrix_world.identity()
  uv=o.data.uv_layers.active or o.data.uv_layers.new(name='UVMap')
  for face in o.data.polygons:
   axis=max(range(3),key=lambda i:abs(face.normal[i]))
   for li in face.loop_indices:
    v=o.data.vertices[o.data.loops[li].vertex_index].co
    pair=(v.y,v.z) if axis==0 else (v.x,v.z) if axis==1 else (v.x,v.y)
    uv.data[li].uv=(pair[0]*3,pair[1]*3)
 bpy.ops.object.select_all(action='DESELECT')
 for o in col.objects:o.select_set(True)
 bpy.context.view_layer.objects.active=list(col.objects)[0];bpy.ops.object.join();joined=bpy.context.object;joined.name=prefix
 groups[prefix]=len(joined.data.polygons);print('JOINED',prefix,groups[prefix],flush=True)
# Resize only the web copy of images, preserving source maps and editable master.
for img in bpy.data.images:
 if img.size[0]>1024 or img.size[1]>1024:img.scale(1024,1024)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(r/'Blender/snowglobe_new_york_v05_web.blend'))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(w/'assets/3d/snowglobe.glb'),export_format='GLB',use_selection=True,export_apply=True)
(r/'제작기록/web-optimization.json').write_text(json.dumps({'objects_before':before,'objects_after':len(bpy.data.objects),'polygons_by_group':groups,'colliders':len(boxes),'note':'Joined by category; glTF primitives split by material. UVs explicitly generated. Master v04 preserved.'},indent=2))
print('WEB_EXPORT_COMPLETE')
