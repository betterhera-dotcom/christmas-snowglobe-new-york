import bpy,hashlib,json
from pathlib import Path
from mathutils import Vector
r=Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(r/'Blender'/'snowglobe_new_york_v01.blend'))
s=bpy.context.scene

def geometry_digest():
 h=hashlib.sha256()
 for o in sorted(bpy.data.objects,key=lambda x:x.name):
  h.update(str((o.name,o.type,tuple(v for row in o.matrix_world for v in row))).encode())
  if o.type=='MESH':
   for v in o.data.vertices:h.update(str(tuple(v.co)).encode())
   for p in o.data.polygons:h.update(str(tuple(p.vertices)).encode())
 return h.hexdigest()
before=geometry_digest()
replacements={}
for old,file,rough,metal in [('Deep botanical enamel','green-enamel-color.png',(.24,.34),.1),('Aged champagne brass','antique-brass-color.png',(.25,.40),.82)]:
 m=bpy.data.materials[old].copy();m.name=old+' · AI surface v02';replacements[old]=m
 n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF')
 tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(r/'AI재질'/file));tex.projection='BOX';tex.projection_blend=.3
 coord=n.new('ShaderNodeTexCoord');mapping=n.new('ShaderNodeMapping');mapping.inputs['Scale'].default_value=(2,2,2)
 l.new(coord.outputs['Generated'],mapping.inputs['Vector']);l.new(mapping.outputs['Vector'],tex.inputs['Vector']);l.new(tex.outputs['Color'],p.inputs['Base Color'])
 # Reflectivity remains shader-controlled; the AI supplies color, not baked lighting.
 p.inputs['Metallic'].default_value=metal
 gray=n.new('ShaderNodeRGBToBW');l.new(tex.outputs['Color'],gray.inputs[0])
 ramp=n.new('ShaderNodeMapRange');ramp.inputs['From Min'].default_value=0;ramp.inputs['From Max'].default_value=.5;ramp.inputs['To Min'].default_value=rough[0];ramp.inputs['To Max'].default_value=rough[1]
 l.new(gray.outputs[0],ramp.inputs['Value']);l.new(ramp.outputs[0],p.inputs['Roughness'])
 bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.10;bump.inputs['Distance'].default_value=.006;l.new(gray.outputs[0],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
 if 'enamel' in old:p.inputs['Coat Weight'].default_value=.32;p.inputs['Coat Roughness'].default_value=.18
changed=[]
for o in bpy.data.collections['02_Pedestal'].objects:
 for slot in o.material_slots:
  if slot.material and slot.material.name in replacements:slot.material=replacements[slot.material.name];changed.append(o.name)
after=geometry_digest();assert before==after,'Geometry or transforms changed'
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(r/'Blender'/'snowglobe_new_york_v02_AI-materials.blend'))
bpy.ops.object.select_all(action='DESELECT')
for col in bpy.data.collections:
 if col.name[:2] in ['01','02','03','04','05','06']:
  for o in col.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(r/'Blender'/'snowglobe_new_york_v02_AI-materials.glb'),export_format='GLB',use_selection=True,export_apply=True)
(r/'제작기록'/'AI재질_검증.json').write_text(json.dumps({'before_geometry_sha256':before,'after_geometry_sha256':after,'identical_geometry':before==after,'changed_objects':len(changed),'scope':'02_Pedestal only','ai_maps':['green-enamel-color.png','antique-brass-color.png'],'note':'AI base color; roughness and bump are shader-derived artistic approximations, not measured PBR maps. Original v01 preserved.'},ensure_ascii=False,indent=2))
s.render.filepath=str(r/'미리보기'/'03-snowglobe-AI-materials.png');bpy.ops.render.render(write_still=True)
# Detail comparison: identical camera/light for before and after, only materials change.
cam=s.camera;cam.location=(2,-5,1.45);cam.rotation_euler=(Vector((0,0,.38))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=3.55
s.render.resolution_x=1600;s.render.resolution_y=650;s.cycles.samples=32
s.render.filepath=str(r/'미리보기'/'05-pedestal-after-AI.png');bpy.ops.render.render(write_still=True)
for o in bpy.data.collections['02_Pedestal'].objects:
 for slot in o.material_slots:
  for original,new in replacements.items():
   if slot.material==new:slot.material=bpy.data.materials[original];break
s.render.filepath=str(r/'미리보기'/'04-pedestal-before-AI.png');bpy.ops.render.render(write_still=True)
print('AI_MATERIAL_TEST_COMPLETE')
