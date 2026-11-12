"""Independent liquid volume + baked shared-solver preview. Existing city models stay untouched.
Run node Blender/bake_liquid_motion.mjs first, then this script with Blender --background.
"""
import bpy, math, json, struct
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parent.parent
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Winter studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.24,.30,.33,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45

# A closed, fully filled volume. No ocean-like exposed surface in a sealed globe.
radius=1.54;center=1.78;bottom=.855;segments=80;rings=48
angle=math.acos((bottom-center)/radius)
vertices=[(0,0,center+radius)];faces=[]
for j in range(1,rings+1):
 theta=angle*j/rings
 for i in range(segments):
  a=2*math.pi*i/segments
  vertices.append((radius*math.sin(theta)*math.cos(a),radius*math.sin(theta)*math.sin(a),center+radius*math.cos(theta)))
for i in range(segments):faces.append((0,1+i,1+(i+1)%segments))
for j in range(rings-1):
 for i in range(segments):
  a=1+j*segments+i;b=1+j*segments+(i+1)%segments
  faces.append((a,a+segments,b+segments,b))
faces.append(tuple(reversed(range(1+(rings-1)*segments,1+rings*segments))))
mesh=bpy.data.meshes.new('Closed water volume');mesh.from_pydata(vertices,[],faces);mesh.update()
liquid=bpy.data.objects.new('LIQUID',mesh);scene.collection.objects.link(liquid)
for face in mesh.polygons:face.use_smooth=len(face.vertices)<5
mat=bpy.data.materials.new('Clear glycerin water');mat.use_nodes=True
mat.use_backface_culling=True
nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value=(.98,.995,1,1)
bsdf.inputs['Transmission Weight'].default_value=1
bsdf.inputs['IOR'].default_value=1.333;bsdf.inputs['Roughness'].default_value=.025
absorb=nodes.new('ShaderNodeVolumeAbsorption');absorb.inputs['Color'].default_value=(.86,.96,1,1);absorb.inputs['Density'].default_value=.025
links.new(absorb.outputs[0],nodes.get('Material Output').inputs['Volume'])
group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
group.interface.new_socket(name='Thickness',in_out='INPUT',socket_type='NodeSocketFloat').default_value=.12
group.nodes.new('NodeGroupInput');group.nodes.new('NodeGroupOutput')
settings=nodes.new('ShaderNodeGroup');settings.node_tree=group;settings.inputs['Thickness'].default_value=.12
mesh.materials.append(mat)
liquid['description']='Filled water/glycerin optical volume. Runtime snow uses shared viscous-current solver.'
bpy.ops.object.select_all(action='DESELECT');liquid.select_set(True);bpy.context.view_layer.objects.active=liquid
bpy.ops.export_scene.gltf(filepath=str(ROOT/'웹체험_3D/assets/3d/liquid.glb'),export_format='GLB',use_selection=True,export_animations=False)
# Blender 5.2 strips the unconnected glTF thickness node in this material.
# Preserve that authored volume metadata explicitly; mesh/binary data stays byte-identical.
path=ROOT/'웹체험_3D/assets/3d/liquid.glb';raw=path.read_bytes();json_length=struct.unpack_from('<I',raw,12)[0]
gltf=json.loads(raw[20:20+json_length]);extensions=gltf['materials'][0].setdefault('extensions',{})
extensions['KHR_materials_volume']={'thicknessFactor':settings.inputs['Thickness'].default_value,'attenuationDistance':1/absorb.inputs['Density'].default_value,'attenuationColor':list(absorb.inputs['Color'].default_value)[:3]}
gltf['extensionsUsed']=sorted(set(gltf.get('extensionsUsed',[])+['KHR_materials_volume']))
encoded=json.dumps(gltf,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);binary=raw[20+json_length:]
path.write_bytes(struct.pack('<4sII',b'glTF',2,20+len(encoded)+len(binary))+struct.pack('<I4s',len(encoded),b'JSON')+encoded+binary)

# Reference the committed miniature without duplicating or modifying its geometry.
source=ROOT/'Blender/snowglobe_new_york_v12_city_atmosphere.blend'
with bpy.data.libraries.load(str(source),link=True,relative=True) as (src,dst):dst.objects=['BASE','CITY','TREES','PROPS','GLASS']
for obj in dst.objects:
 if obj:scene.collection.objects.link(obj)

# Shape-key samples are interpolated; geometry nodes instance snow crystals on them.
bake=json.loads((ROOT/'Blender/.liquid-motion.json').read_text())
def coords(flat):return [(flat[k],-flat[k+2],flat[k+1]) for k in range(0,len(flat),3)]
pm=bpy.data.meshes.new('Shared fluid particle samples');pm.from_pydata(coords(bake['samples'][0]['positions']),[],[])
particles=bpy.data.objects.new('SNOW_LIQUID_PREVIEW',pm);scene.collection.objects.link(particles)
particles.shape_key_add(name='Basis')
for n,sample in enumerate(bake['samples'][1:],1):
 key=particles.shape_key_add(name=f'Flow_{sample["frame"]:04d}')
 key.data.foreach_set('co',[v for p in coords(sample['positions']) for v in p])
 key.value=0;key.keyframe_insert('value',frame=bake['samples'][n-1]['frame'])
 key.value=1;key.keyframe_insert('value',frame=sample['frame'])
 if n+1<len(bake['samples']):key.value=0;key.keyframe_insert('value',frame=bake['samples'][n+1]['frame'])
 key.value=0
action=pm.shape_keys.animation_data.action
for layer in action.layers:
 for strip in layer.strips:
  bag=strip.channelbag(pm.shape_keys.animation_data.action_slot)
  if bag:
   for curve in bag.fcurves:
    for point in curve.keyframe_points:point.interpolation='LINEAR'
snow=bpy.data.materials.new('Snow suspended in liquid');snow.diffuse_color=(.96,.985,1,1);snow.use_nodes=True
snow.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.65
geo=bpy.data.node_groups.new('Snow crystals on baked fluid','GeometryNodeTree')
geo.interface.new_socket(name='Geometry',in_out='INPUT',socket_type='NodeSocketGeometry');geo.interface.new_socket(name='Geometry',in_out='OUTPUT',socket_type='NodeSocketGeometry')
inp=geo.nodes.new('NodeGroupInput');out=geo.nodes.new('NodeGroupOutput');ico=geo.nodes.new('GeometryNodeMeshIcoSphere');ico.inputs['Radius'].default_value=.018;ico.inputs['Subdivisions'].default_value=1
material=geo.nodes.new('GeometryNodeSetMaterial');material.inputs['Material'].default_value=snow
instance=geo.nodes.new('GeometryNodeInstanceOnPoints');instance.inputs['Scale'].default_value=(1,.7,.35)
geo.links.new(inp.outputs['Geometry'],instance.inputs['Points']);geo.links.new(ico.outputs['Mesh'],material.inputs['Geometry']);geo.links.new(material.outputs['Geometry'],instance.inputs['Instance']);geo.links.new(instance.outputs['Instances'],out.inputs['Geometry'])
particles.modifiers.new('Snow crystals','NODES').node_group=geo
scene.render.fps=bake['fps'];scene.frame_end=bake['samples'][-1]['frame'];scene.frame_set(1)
for frame,name in [(1,'REST'),(25,'SHAKE'),(121,'RELEASE - residual flow'),(577,'SETTLING'),(1153,'REST AGAIN')]:scene.timeline_markers.new(name,frame=frame)
particles['solver']='../웹체험_3D/snow3d.mjs — exact shared current samples, not Mantaflow'
bpy.ops.object.camera_add(location=(4,-7,3.9));camera=bpy.context.object;camera.name='Liquid preview camera';camera.rotation_euler=(Vector((0,0,1.65))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=58;scene.camera=camera
for loc,power,size in [((-3,-4,6),900,4),((3,1,4),650,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,1.5))-light.location).to_track_quat('-Z','Y').to_euler()
scene['preview_instructions']='Space to play: rest 0–1s, shake 1–5s, liquid flow settles 5–48s. Browser remains interactive.'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'Blender/snowglobe_liquid_v01.blend'))
print('LIQUID_COMPLETE',len(mesh.polygons),'faces;',bake['count'],'animated particles;',len(bake['samples']),'samples')
