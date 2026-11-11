import bpy,math,random,json
from pathlib import Path
from mathutils import Vector
random.seed(53)
r=Path(__file__).resolve().parent.parent
bpy.ops.wm.open_mainfile(filepath=str(r/'Blender'/'snowglobe_new_york_v03_AI-city-trees.blend'))
s=bpy.context.scene;city=bpy.data.collections['03_NewYork'];trees=bpy.data.collections['04_Trees']
stone=bpy.data.materials['AI aged cream limestone'];bark=bpy.data.materials['AI winter bark'];fir=bpy.data.materials['AI fir needles'];snow=bpy.data.materials['Snow · ambientCG Snow001'];dark=bpy.data.materials['Ironwork']
def material(name,color,rough=.5,emit=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
 if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
 return m
room=material('Warm shaded interior',(.55,.24,.065),.8,2.5);frame=material('Painted walnut window sash',(.035,.025,.016),.45);curtain=material('Ivory curtain',(.45,.32,.18),.9)
window=material('Clear window glazing',(.85,.90,.90),.12);p=window.node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=.95;p.inputs['IOR'].default_value=1.45
needleMats=[material('Fir needle shade '+str(i),c,.72) for i,c in enumerate([(.015,.042,.018),(.027,.072,.025),(.045,.094,.032)])]
def place(o,col,m):
 for c in list(o.users_collection):c.objects.unlink(o)
 col.objects.link(o)
 if m:o.data.materials.append(m)
 return o
def box(name,loc,size,mat,col=city,bevel=.002):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);place(o,col,mat)
 if bevel:
  mod=o.modifiers.new('Crafted edge','BEVEL');mod.width=bevel;mod.segments=2
 return o
def curve(name,pts,radius,mat,col=trees):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=radius;c.bevel_resolution=2;c.resolution_u=8
 sp=c.splines.new('POLY');sp.points.add(len(pts)-1)
 for i,(p,co) in enumerate(zip(sp.points,pts)):p.co=(*co,1);p.radius=1-i/(len(pts)-1)*.65
 o=bpy.data.objects.new(name,c);col.objects.link(o);c.materials.append(mat);return o
# Carve real recesses into the building mesh; no luminous blocks pasted over the wall.
old_windows=[o for o in city.objects if o.name.startswith('Amber recessed window')]
for building in [o for o in city.objects if o.name.startswith('Brownstone ')]:
 x,y,z=building.location;front=y-building.dimensions.y/2
 matches=[o for o in old_windows if abs(o.location.x-x)<building.dimensions.x/2 and abs(o.location.y-(y-.251))<.002]
 for old in matches:
  wx,_,wz=old.location;cut=box('temporary opening',(wx,front+.025,wz),(.101,.16,.186),None,bevel=0)
  bpy.context.view_layer.objects.active=building;mod=building.modifiers.new('Recessed window opening','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
  # The rear surface sits 75mm behind the facade in model coordinates.
  box('Interior shadow chamber',(wx,front+.074,wz),(.099,.005,.184),room,bevel=0)
  for side in [-1,1]:
   box('Stone window jamb',(wx+side*.061,front-.008,wz),(.019,.037,.214),stone)
   box('Recessed sash side',(wx+side*.042,front+.018,wz),(.008,.009,.173),frame)
   box('Curtain fold',(wx+side*.035,front+.058,wz),(.012,.005,.16),curtain,bevel=.003)
  for v in [-1,1]:box('Stone lintel',(wx,front-.009,wz+v*.101),(.14,.044,.021),stone)
  box('Deep projecting sill',(wx,front-.027,wz-.108),(.15,.075,.019),stone)
  box('Snow on sill',(wx,front-.035,wz-.095),(.143,.06,.009),snow,bevel=.004)
  box('Recessed glazing',(wx,front+.025,wz),(.080,.002,.166),window,bevel=0)
  box('Sash center upright',(wx,front+.014,wz),(.005,.010,.17),frame,bevel=.0005)
  box('Sash horizontal rail',(wx,front+.013,wz-.008),(.089,.011,.005),frame,bevel=.0005)
for o in list(city.objects):
 if any(o.name.startswith(n) for n in ['Window stone surround','Amber recessed window','Window mullion','Window crossbar']):bpy.data.objects.remove(o,do_unlink=True)
# Thin the oversized glowing windows of the distant tower, keeping their locations.
for o in city.objects:
 if o.name.startswith(('Tower lit window','Distant window')):
  o.data.materials.clear();o.data.materials.append(room);o.scale.y=.3
for o in trees.objects:
 if o.name.startswith('Fir trunk'):o.scale.x*=.45;o.scale.y*=.45
# Replace the concentric cone shapes with layered branch sprays and actual needles.
for o in list(trees.objects):
 if any(o.name.startswith(n) for n in ['Fir branches','Snow on fir','Winter bare trunk','Winter branch','Branch snow']):bpy.data.objects.remove(o,do_unlink=True)
verts=[];faces=[];mids=[]
def needle(a,b,width,mi):
 axis=(b-a).normalized();cross=axis.cross(Vector((0,0,1)))
 if cross.length<.001:cross=Vector((1,0,0))
 cross.normalize();mid=a+(b-a)*.35;k=len(verts);verts.extend([a,mid+cross*width,b,mid-cross*width]);faces.append((k,k+1,k+2,k+3));mids.append(mi)
for tx,ty,h in [(.78,-.48,.85),(-1.0,-.25,.56)]:
 for level in range(15):
  f=level/15;z=.85+h*(.10+f*.92);reach=h*.35*(1-f)**.8
  for j in range(12):
   angle=j*math.tau/12+level*.7+random.uniform(-.16,.16);d=Vector((math.cos(angle),math.sin(angle),0));start=Vector((tx,ty,z+random.uniform(-.025,.025)*h));end=start+d*reach*random.uniform(.8,1.15)+Vector((0,0,random.uniform(-.07,.10)*h))
   curve('Fir tapered bough',[start,start.lerp(end,.55)+Vector((0,0,-.013)),end],h*.006,bark)
   # Branchlets fan to either side; individual needle geometry breaks the silhouette.
   for k in range(1,7):
    t=k/7;base=start.lerp(end,t)
    for side in [-1,1]:
     a=angle+side*.65;out=Vector((math.cos(a),math.sin(a),random.uniform(-.3,.8)));length=reach*.40*(1-t*.6)
     tip=base+out*length;curve('Fir fine branchlet',[base,tip],h*.0024,bark)
     for n in range(9):
      point=base.lerp(tip,n/9)
      for ns in [-1,1]:
       na=a+ns*random.uniform(.6,1.0);direction=Vector((math.cos(na),math.sin(na),random.uniform(-.4,1.0)))
       needle(point,point+direction*h*random.uniform(.035,.065),h*.0024,random.randrange(3))
   if j%2==0:
    pts=[start.lerp(end,t)+Vector((0,0,h*.012)) for t in [.35,.5,.65,.83]]
    curve('Snow on upward bough',pts,h*.012,snow)
mesh=bpy.data.meshes.new('Individual fir needles');mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new('Fir needles geometry',mesh);trees.objects.link(obj)
for m in needleMats:mesh.materials.append(m)
# Mix the AI needle color with the individual needle forms.
for m in needleMats:
 n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.get('fir-needles-color.png');tex.projection='BOX';coord=n.new('ShaderNodeTexCoord');l.new(coord.outputs['Generated'],tex.inputs['Vector']);l.new(tex.outputs['Color'],p.inputs['Base Color'])
for p,mi in zip(mesh.polygons,mids):p.material_index=mi
# Irregular deciduous trees: tapering trunk, branching in 3D, fine forked twigs.
branchCount=0
for tx,ty,seed in [(-.85,-.6,81),(-.98,.10,82),(-.63,-.60,83)]:
 random.seed(seed);base=Vector((tx,ty,.85));top=base+Vector((random.uniform(-.03,.03),random.uniform(-.025,.025),.60))
 curve('Natural winter trunk',[base,base.lerp(top,.42)+Vector((.01,0,0)),top],.017,bark)
 def fork(start,direction,length,radius,depth):
  global branchCount
  end=start+direction.normalized()*length;mid=start.lerp(end,.55)+Vector((random.uniform(-.009,.009),random.uniform(-.009,.009),.012))
  curve('Tapered winter twig',[start,mid,end],radius,bark);branchCount+=1
  if depth>0:
   for sign in [-1,1]:
    d=direction+Vector((sign*random.uniform(.25,.7),random.uniform(-.6,.6),random.uniform(.1,.4)))
    fork(end,d,length*random.uniform(.5,.72),radius*.52,depth-1)
  if depth>=1:curve('Snow dust on branch',[start+Vector((0,0,radius)),mid+Vector((0,0,radius)),end],radius*.60,snow)
 for j in range(8):
  t=.30+j*.075;a=j*2.4;fork(base.lerp(top,t),Vector((math.cos(a)*.7,math.sin(a)*.7,.6)),.17+random.random()*.08,.007,2)
# Remove the unused cone material only from no objects; original files stay untouched.
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(r/'Blender'/'snowglobe_new_york_v04_window-tree-detail.blend'))
bpy.ops.object.select_all(action='DESELECT')
for col in bpy.data.collections:
 if col.name[:2] in ['01','02','03','04','05','06']:
  for o in col.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(r/'Blender'/'snowglobe_new_york_v04_window-tree-detail.glb'),export_format='GLB',use_selection=True,export_apply=True)
(r/'제작기록'/'창문나무_형태보완.json').write_text(json.dumps({'recessed_brownstone_windows':len(old_windows),'needle_quads':len(faces),'winter_branches':branchCount,'preserved':'v03 original; globe/pedestal/building placements unchanged','scope':'real window recesses, jambs, sashes, glass, curtain layers, sills; fir boughs, needles, tapered winter twigs','status':'design preview, not performance-optimized or connected to MediaPipe'},ensure_ascii=False,indent=2))
s.cycles.samples=32;s.render.filepath=str(r/'미리보기'/'08-snowglobe-window-tree-detail.png');bpy.ops.render.render(write_still=True)
for name in ['01_Globe','02_Pedestal','06_Snow']:
 for o in bpy.data.collections[name].objects:o.hide_render=True
for name in ['Studio green backdrop','Walnut counter']:bpy.data.objects[name].hide_render=True
s.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.32,.42,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.5
cam=s.camera;cam.location=(0,-1.85,1.10);cam.rotation_euler=(Vector((-.10,.42,1.60))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='PERSP';cam.data.lens=24
s.render.resolution_x=1600;s.render.resolution_y=900;s.cycles.samples=24;s.render.filepath=str(r/'미리보기'/'09-city-window-tree-detail.png');bpy.ops.render.render(write_still=True)
print('DETAIL_REFINEMENT_COMPLETE')
