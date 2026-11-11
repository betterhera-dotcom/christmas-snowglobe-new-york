import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
random.seed(17)
ROOT=Path(__file__).resolve().parent.parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for col in list(bpy.data.collections):
 if col.name!='Collection' and col.users==0:bpy.data.collections.remove(col)
scene=bpy.context.scene

def mat(name,color,metal=0,rough=.4,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 return m

def texture(name,asset,tint=None):
 m=mat(name,tint or (.8,.8,.8));n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF')
 for suffix,slot in [('Color','Base Color'),('Roughness','Roughness'),('NormalGL',None)]:
  files=list((ROOT/'무료소스'/asset).glob('*_'+suffix+'.jpg'))
  if not files:continue
  image=bpy.data.images.load(str(files[0]));node=n.new('ShaderNodeTexImage');node.image=image
  node.projection='BOX';node.projection_blend=.2
  coords=n.get('Texture Coordinate') or n.new('ShaderNodeTexCoord');l.new(coords.outputs['Generated'],node.inputs['Vector'])
  if suffix!='Color':image.colorspace_settings.name='Non-Color'
  if slot:l.new(node.outputs['Color'],p.inputs[slot])
  else:
   normal=n.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.25;l.new(node.outputs['Color'],normal.inputs['Color']);l.new(normal.outputs['Normal'],p.inputs['Normal'])
 return m
snow=texture('Snow · ambientCG Snow001','Snow001');brick=texture('Brick · ambientCG Bricks052','Bricks052');wood=texture('Counter · ambientCG Wood051','Wood051')
green=mat('Deep botanical enamel',(.021,.075,.046),.4,.27);gold=mat('Aged champagne brass',(.53,.32,.105),.82,.24)
cream=mat('Warm carved limestone',(.57,.44,.29),0,.67);red=mat('Brownstone terracotta',(.22,.075,.04),0,.72)
fir=mat('Fir green',(.016,.058,.033),0,.72);dark=mat('Ironwork',(.018,.027,.023),.6,.4);light=mat('Warm window glass',(1,.48,.12),.1,.22,1.4)
ornament=mat('Burgundy glass',(.24,.012,.019),.65,.2);road=mat('Stone street',(.15,.17,.16),0,.8)
glass=mat('Clear curved glass',(.98,1,1),0,.018);p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Transmission Weight'].default_value=1;p.inputs['IOR'].default_value=1.45
collections={}
for name in ['01_Globe','02_Pedestal','03_NewYork','04_Trees','05_Props','06_Snow','07_Stage']:
 c=bpy.data.collections.new(name);scene.collection.children.link(c);collections[name]=c
current='02_Pedestal'
def finish(o,name,m):
 o.name=name
 for c in list(o.users_collection):c.objects.unlink(o)
 collections[current].objects.link(o)
 if m:o.data.materials.append(m)
 return o

def cube(name,loc,scale,m,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft crafted edges','BEVEL');mod.width=bevel;mod.segments=2
  o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return finish(o,name,m)
def sphere(name,loc,r,m,scale=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=r,location=loc);o=bpy.context.object
 if scale:o.scale=scale
 for f in o.data.polygons:f.use_smooth=True
 return finish(o,name,m)
def cylinder(name,loc,r,depth,m,r2=None):
 bpy.ops.mesh.primitive_cone_add(vertices=64,radius1=r,radius2=r if r2 is None else r2,depth=depth,location=loc);o=bpy.context.object
 for f in o.data.polygons:f.use_smooth=True
 return finish(o,name,m)
def torus(name,r,z,minor,m):
 bpy.ops.mesh.primitive_torus_add(major_segments=128,minor_segments=12,location=(0,0,z),major_radius=r,minor_radius=minor)
 o=bpy.context.object
 for f in o.data.polygons:f.use_smooth=True
 return finish(o,name,m)
def line(name,points,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_depth=r;c.bevel_resolution=2
 p=c.splines.new('POLY');p.points.add(len(points)-1)
 for a,b in zip(p.points,points):a.co=(*b,1)
 o=bpy.data.objects.new(name,c);collections[current].objects.link(o);c.materials.append(m);return o
# Lathed, stepped base proportions reflect the approved green-and-brass reference.
profile=[(1.50,.02),(1.55,.07),(1.55,.13),(1.48,.20),(1.40,.24),(1.32,.34),(1.30,.54),(1.38,.65),(1.45,.69),(1.46,.76)]
verts=[];faces=[];N=128
for radius,z in profile:
 for i in range(N):a=i*2*math.pi/N;verts.append((radius*math.cos(a),radius*math.sin(a),z))
for j in range(len(profile)-1):
 for i in range(N):a=j*N+i;b=j*N+(i+1)%N;faces.append((a,b,b+N,a+N))
mesh=bpy.data.meshes.new('Turned pedestal');mesh.from_pydata(verts,[],faces);o=bpy.data.objects.new('Green turned pedestal',mesh);collections[current].objects.link(o);mesh.materials.append(green)
for f in mesh.polygons:f.use_smooth=True
for radius,z,thick in [(1.54,.08,.033),(1.50,.19,.024),(1.39,.25,.018),(1.35,.60,.022),(1.45,.70,.035),(1.46,.76,.022)]:torus('Brass molding',radius,z,thick,gold)
# A botanical frieze: small gold leaves and curved stems around the circumference.
for sector in range(12):
 a=sector*math.tau/12
 points=[]
 for j in range(13):
  t=j/12;ang=a+(t-.5)*.38;points.append((1.335*math.cos(ang),1.335*math.sin(ang),.38+.12*math.sin(t*math.pi)))
 line('Botanical gold stem',points,.008,gold)
 for j in range(1,6):
  ang=a+(j/6-.5)*.34;leaf=sphere('Gold leaf',(1.34*math.cos(ang),1.34*math.sin(ang),.42+.09*math.sin(j/6*math.pi)),.045,gold,(.45,1,1.8));leaf.rotation_euler=(0,.45,ang)
current='03_NewYork'
cylinder('Snow-covered miniature ground',(0,0,.79),1.41,.10,snow)
# Street ribbon and footprints of brownstones.
line('Curved winter street',[(-1.0,-.9,.852),(-.75,-.65,.854),(-.4,-.25,.855),(-.35,.2,.855),(-.6,.7,.855)],.14,road)
for i,(x,y,h,w) in enumerate([(.05,.35,1.05,.36),(.47,.37,1.30,.40),(.88,.30,1.14,.34)]):
 z=.85;m=[brick,cream,red][i]
 cube('Brownstone %d'%i,(x,y,z+h/2),(w,.42,h),m)
 for level in [0,.34,.69,1]:
  if level>h:continue
  cube('Facade stone band',(x,y-.225,z+level),(w+.045,.04,.038),cream,.006)
 for floor in range(3):
  for side in [-1,1]:
   wx=x+side*w*.24;wz=z+.25+floor*.31
   if wz>z+h-.08:continue
   cube('Window stone surround',(wx,y-.225,wz),(.12,.04,.21),cream,.008)
   cube('Amber recessed window',(wx,y-.251,wz),(.088,.012,.17),light,.002)
   cube('Window mullion',(wx,y-.262,wz),(.009,.009,.17),dark,.001)
   cube('Window crossbar',(wx,y-.264,wz),(.09,.009,.009),dark,.001)
 cube('Green front door',(x,y-.24,z+.13),(.12,.025,.25),green,.006)
 for step in range(3):cube('Front stoop',(x,y-.34-step*.055,z+.04-step*.018),(.19,.12,.07),cream,.008)
 for level in [.0,.045,.085]:cube('Cornice molding',(x,y,z+h+level),(w+.07,.49,.035),green,.008)
 cube('Roof snow',(x,y,z+h+.11),(w+.09,.50,.045),snow,.02)
 cylinder('Chimney',(x+w*.23,y+.07,z+h+.20),.045,.18,brick)
# Tapered landmark silhouette with setbacks and illuminated window rows.
x,y=-.52,.48;base=.85
for level,(w,d,h) in enumerate([(.39,.32,.88),(.30,.27,.42),(.22,.21,.30),(.14,.14,.18)]):
 cube('Empire tower setback',(x,y,base+h/2),(w,d,h),cream,.008)
 for row in range(max(2,int(h/.10))):
  for col in [-1,0,1]:
   cube('Tower lit window',(x+col*w*.27,y-d/2-.004,base+.05+row*.095),(.026,.008,.052),light,.001)
 cube('Tower snow ledge',(x,y,base+h+.008),(w+.025,d+.025,.022),snow,.006);base+=h
cylinder('Empire spire',(x,y,base+.17),.023,.34,gold,r2=.004)
# Small distant blocks reinforce perspective without replacing the central landmark.
for x,y,h in [(-.95,.45,.65),(-.8,.85,.74),(.0,.9,.60)]:
 cube('Distant Manhattan block',(x,y,.85+h/2),(.23,.22,h),cream,.01)
 for row in range(4):
  for side in [-1,1]:cube('Distant window',(x+side*.055,y-.115,.95+row*.12),(.03,.01,.06),light,.001)
current='04_Trees'
def tree(x,y,h):
 cylinder('Fir trunk',(x,y,.85+h*.25),.035,h*.5,wood)
 for level in range(5):
  z=.85+h*(.25+level*.135);r=h*(.31-level*.045)
  cylinder('Fir branches',(x,y,z),r,h*.31,fir,r2=.008)
  cylinder('Snow on fir',(x,y,z+h*.07),r*.80,h*.21,snow,r2=.005)
 for i in range(25):
  t=i/25;z=.85+h*(.2+.72*t);r=h*.29*(1-t);a=t*math.pi*9
  sphere('Tree golden light',(x+r*math.cos(a),y+r*math.sin(a),z),.013,light)
 sphere('Tree top ornament',(x,y,.85+h*.99),.035,gold)
tree(.78,-.48,.85);tree(-1.0,-.25,.56)
for x,y in [(-.85,-.6),(-.98,.10),(-.63,-.60)]:
 trunk=[(x,y,.85),(x+.015,y,1.12),(x-.025,y,1.42)]
 line('Winter bare trunk',trunk,.014,wood)
 for side in [-1,1]:
  for h in [1.10,1.22,1.33]:
   pts=[(x,y,h),(x+side*.12,y+.015,h+.10),(x+side*.19,y+.03,h+.22)]
   line('Winter branch',pts,.007,wood);line('Branch snow',[(a,b,c+.009) for a,b,c in pts],.007,snow)
current='05_Props'
for x,y in [(-.65,-.83),(-.3,-.46),(-.29,.03)]:
 cylinder('Lamp post',(x,y,1.04),.014,.40,dark);cylinder('Lamp foot',(x,y,.88),.035,.05,dark)
 cube('Lantern glow',(x,y,1.28),(.065,.065,.10),light,.008)
 cylinder('Lantern roof',(x,y,1.35),.055,.045,dark,r2=.008)
for i in range(19):
 a=math.pi+(i/18)*math.pi;x=1.1*math.cos(a);y=1.1*math.sin(a)
 cylinder('Front iron fence',(x,y,.94),.009,.18,dark);sphere('Fence finial',(x,y,1.04),.015,gold)
line('Fence upper rail',[(1.1*math.cos(a),1.1*math.sin(a),1.0) for a in [math.pi+i/48*math.pi for i in range(49)]],.01,dark)
for x,y in [(.57,-.69),(.7,-.79)]:
 cube('Gift box',(x,y,.91),(.12,.12,.12),ornament,.008);cube('Gift ribbon',(x,y,.975),(.025,.125,.008),gold,.001)
current='01_Globe'
# Thin solid shell, clipped beneath the snow deck.
r=1.57;cz=1.78;minimum=.79;thetaMax=math.acos((minimum-cz)/r);vs=[];fs=[]
for j in range(65):
 theta=.0001+(thetaMax-.0001)*j/64
 for i in range(128):
  a=i*math.tau/128;vs.append((r*math.sin(theta)*math.cos(a),r*math.sin(theta)*math.sin(a),cz+r*math.cos(theta)))
for j in range(64):
 for i in range(128):a=j*128+i;b=j*128+(i+1)%128;fs.append((a,b,b+128,a+128))
mesh=bpy.data.meshes.new('Optical globe shell');mesh.from_pydata(vs,[],fs);mesh.update();o=bpy.data.objects.new('GLASS_GLOBE',mesh);collections[current].objects.link(o);mesh.materials.append(glass)
for f in mesh.polygons:f.use_smooth=True
mod=o.modifiers.new('Glass wall 4mm','SOLIDIFY');mod.thickness=.004
current='06_Snow'
# One joined snow mesh keeps the export inexpensive; real-time particles replace it later.
vs=[];fs=[]
for i in range(300):
 while True:
  x=random.uniform(-1.4,1.4);y=random.uniform(-1.4,1.4);z=random.uniform(.89,3.15)
  if x*x+y*y+(z-cz)**2<1.42**2:break
 rr=random.uniform(.005,.014);k=len(vs);vs.extend([(x-rr,y,z),(x+rr,y,z),(x,y-rr,z),(x,y+rr,z),(x,y,z-rr),(x,y,z+rr)])
 for a,b,c in [(0,2,4),(2,1,4),(1,3,4),(3,0,4),(2,0,5),(1,2,5),(3,1,5),(0,3,5)]:fs.append((k+a,k+b,k+c))
mesh=bpy.data.meshes.new('Preview suspended flakes');mesh.from_pydata(vs,[],fs);o=bpy.data.objects.new('SNOW_PREVIEW_STATIC',mesh);collections[current].objects.link(o);mesh.materials.append(snow)
# Export only the artwork, excluding lighting, studio and camera.
bpy.ops.object.select_all(action='DESELECT')
for key,c in collections.items():
 if key!='07_Stage':
  for o in c.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'Blender'/'snowglobe_new_york_v01.glb'),export_format='GLB',use_selection=True,export_apply=True)
current='07_Stage'
cube('Walnut counter',(0,0,-.12),(200,200,.2),wood,.02)
back=mat('Shop green background',(.018,.043,.029),0,.85);cube('Studio green backdrop',(0,3,3),(30,.2,12),back,0)
# Broad reflection sources reveal a curved glass volume.
def area(name,loc,power,color,size,target):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='RECTANGLE';data.size=size*.35;data.size_y=size
 o=bpy.data.objects.new(name,data);collections[current].objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm window',(-4,-3,6),700,(1,.82,.60),4,(0,0,1.5));area('Cool winter rim',(3,1,5),900,(.72,.84,1),3,(0,0,1.7));area('Front fill',(1,-5,3),180,(1,.90,.73),3,(0,0,1.5))
world=bpy.data.worlds.new('Winter studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.15,.20,.24,1);world.node_tree.nodes['Background'].inputs[1].default_value=.3
camData=bpy.data.cameras.new('Presentation camera');cam=bpy.data.objects.new('Presentation camera',camData);collections[current].objects.link(cam);cam.location=(4,-8,3.6);cam.rotation_euler=(Vector((0,0,1.65))-cam.location).to_track_quat('-Z','Y').to_euler();camData.type='ORTHO';camData.ortho_scale=4.5;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.transmission_bounces=8;scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ROOT/'미리보기'/'01-snowglobe-3d.png')
# Pack source textures so the .blend remains portable.
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'Blender'/'snowglobe_new_york_v01.blend'))
(ROOT/'제작기록'/'3D_구성.json').write_text(json.dumps({'objects':len(bpy.data.objects),'collections':{k:len(v.objects) for k,v in collections.items()},'status':'3D design draft, not connected to MediaPipe','snow':'static render preview; replace with runtime simulation','materials':'ambientCG CC0 plus original procedural materials','original_reference':'웹체험/assets/redraw-v4/snowglobe-clear.png'},ensure_ascii=False,indent=2))
bpy.ops.render.render(write_still=True)
# A second view uses exactly the same geometry, so it cannot invent a different city.
for o in collections['01_Globe'].objects:o.hide_render=True
for o in collections['02_Pedestal'].objects:o.hide_render=True
cam.location=(0,-1.1,1.08);cam.rotation_euler=(Vector((-.05,.4,1.40))-cam.location).to_track_quat('-Z','Y').to_euler();camData.type='PERSP';camData.lens=20
scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.filepath=str(ROOT/'미리보기'/'02-same-city-inside.png')
bpy.ops.render.render(write_still=True)
print('DELIVERY_COMPLETE',ROOT)
