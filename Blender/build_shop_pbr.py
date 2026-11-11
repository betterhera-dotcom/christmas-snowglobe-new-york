import bpy, math, json, random
from pathlib import Path
from mathutils import Vector
random.seed(42)
r=Path(__file__).resolve().parent.parent
w=r/'웹체험_3D'
bpy.ops.wm.open_mainfile(filepath=str(r/'Blender/snowglobe_new_york_v05_web.blend'))

def image(path,noncolor=False):
    im=bpy.data.images.load(str(path),check_existing=True)
    if noncolor: im.colorspace_settings.name='Non-Color'
    return im
def cc(asset,kind): return r/'무료소스'/asset/f'{asset}_1K-JPG_{kind}.jpg'
def pbr(m,color,normal=None,rough=None,metal=0,roughness=.6,strength=.3,ao=None):
    m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;n.clear()
    p=n.new('ShaderNodeBsdfPrincipled');out=n.new('ShaderNodeOutputMaterial');l.new(p.outputs['BSDF'],out.inputs['Surface'])
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=roughness
    if isinstance(color,Path):
        t=n.new('ShaderNodeTexImage');t.image=image(color);l.new(t.outputs['Color'],p.inputs['Base Color'])
    else:p.inputs['Base Color'].default_value=(*color,1)
    if normal:
        t=n.new('ShaderNodeTexImage');t.image=image(normal,True);nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=strength;l.new(t.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],p.inputs['Normal'])
    if rough:
        t=n.new('ShaderNodeTexImage');t.image=image(rough,True);l.new(t.outputs['Color'],p.inputs['Roughness'])
    if ao:
        # glTF exporter recognizes this named node group as occlusion input.
        group=bpy.data.node_groups.get('glTF Material Output')
        if not group:
            group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
        g=n.new('ShaderNodeGroup');g.node_tree=group;t=n.new('ShaderNodeTexImage');t.image=image(ao,True);l.new(t.outputs['Color'],g.inputs['Occlusion'])
    return m

for m in list(bpy.data.materials):
    name=m.name
    if name.startswith('AI warm NY brick'):
        pbr(m,cc('Bricks052','Color'),cc('Bricks052','NormalGL'),cc('Bricks052','Roughness'),strength=.65,ao=cc('Bricks052','AmbientOcclusion'))
    elif name.startswith('AI aged cream limestone'):
        pbr(m,r/'AI재질/limestone-color.png',cc('Snow001','NormalGL'),roughness=.72,strength=.12)
    elif name.startswith('Snow ·'):
        pbr(m,cc('Snow001','Color'),cc('Snow001','NormalGL'),cc('Snow001','Roughness'),strength=.38)
    elif name.startswith('AI winter bark'):
        pbr(m,r/'AI재질/winter-bark-color.png',cc('Wood051','NormalGL'),cc('Wood051','Roughness'),strength=.65)
    elif name.startswith('Deep botanical enamel'):
        pbr(m,r/'AI재질/green-enamel-color.png',cc('Wood051','NormalGL'),metal=.10,roughness=.30,strength=.055)
    elif name.startswith('Aged champagne brass'):
        pbr(m,r/'AI재질/antique-brass-color.png',cc('Wood051','NormalGL'),metal=.87,roughness=.27,strength=.07)
    elif name.startswith('Painted walnut'):
        pbr(m,cc('Wood051','Color'),cc('Wood051','NormalGL'),cc('Wood051','Roughness'),strength=.35)
    elif name.startswith('Warm window glass'):
        p=m.node_tree.nodes.get('Principled BSDF')
        if p:p.inputs['Emission Strength'].default_value=.65;p.inputs['Base Color'].default_value=(.38,.18,.05,1)

# The same portable PBR materials are used on the physical shop geometry.
def material(name,col,**kw):return pbr(bpy.data.materials.new(name),col,**kw)
wood=material('SHOP walnut · scanned PBR',cc('Wood051','Color'),normal=cc('Wood051','NormalGL'),rough=cc('Wood051','Roughness'),strength=.4)
green=bpy.data.materials.get('Deep botanical enamel · AI surface v02')
gold=bpy.data.materials.get('Aged champagne brass · AI surface v02')
stone=bpy.data.materials.get('AI aged cream limestone')
snow=bpy.data.materials.get('Snow · ambientCG Snow001')
leaf=material('SHOP winter evergreen',r/'AI재질/fir-needles-color.png',normal=cc('Wood051','NormalGL'),roughness=.8,strength=.10)
counter=material('SHOP green counter lacquer',r/'AI재질/green-enamel-color.png',normal=cc('Wood051','NormalGL'),roughness=.27,metal=.08,strength=.08)
counter.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.35
red=material('SHOP burgundy velvet',(.16,.012,.022),normal=cc('Snow001','NormalGL'),roughness=.83,strength=.1)
ivory=material('SHOP wrapping paper',(.66,.54,.36),normal=cc('Snow001','NormalGL'),roughness=.8,strength=.08)
bookcolors=[material('SHOP cloth binding '+str(i),r/'AI재질/limestone-color.png',normal=cc('Snow001','NormalGL'),roughness=.9,strength=.16) for i in range(4)]
glow=material('SHOP warm fairy lights',(.9,.42,.10),roughness=.3);p=glow.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.45,.12,1);p.inputs['Emission Strength'].default_value=4
sky=material('SHOP dusk beyond glass',(.12,.20,.28),roughness=1)
col=bpy.data.collections.new('08_Shop');bpy.context.scene.collection.children.link(col)
def finish(o,name,m):
    o.name=name
    for c in list(o.users_collection):c.objects.unlink(o)
    col.objects.link(o);o.data.materials.append(m);return o
# World convention for helpers matches Three.js (x horizontal, y up, z towards viewer).
def box(name,pos,size,mat,bevel=.02):
    x,y,z=pos;sx,sy,sz=size
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.scale=(sx,sz,sy);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Crafted bevel','BEVEL');mod.width=bevel;mod.segments=3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return finish(o,name,mat)
def sphere(name,pos,size,mat):
    x,y,z=pos;bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=(x,-z,y));o=bpy.context.object;o.scale=(size[0],size[2],size[1]);
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,mat)
def rod(name,a,b,radius,mat):
    a=Vector((a[0],-a[2],a[1]));b=Vector((b[0],-b[2],b[1]));d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=radius,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return finish(o,name,mat)
def arch(name,cx,z,bottom,spring,radius,mat,thickness=.045):
    pts=[(cx-radius,bottom,z),(cx-radius,spring,z)]
    for i in range(33):a=math.pi-i*math.pi/32;pts.append((cx+radius*math.cos(a),spring+radius*math.sin(a),z))
    pts.extend([(cx+radius,bottom,z)])
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=thickness;curve.bevel_resolution=4
    sp=curve.splines.new('POLY');sp.points.add(len(pts)-1)
    for p,v in zip(sp.points,pts):p.co=(v[0],-v[2],v[1],1)
    o=bpy.data.objects.new(name,curve);col.objects.link(o);curve.materials.append(mat)
def window_shape(cx):
    pts=[(cx-1.22,.18),(cx-1.22,3.15)]
    for i in range(41):
        a=math.pi-i*math.pi/40;pts.append((cx+1.22*math.cos(a),3.15+1.22*math.sin(a)))
    pts.append((cx+1.22,.18));verts=[(cx,3.64,2.2)]+[(x,3.64,y) for x,y in pts]
    faces=[(0,1+(i+1)%len(pts),i+1) for i in range(len(pts))];me=bpy.data.meshes.new('Arched window opening');me.from_pydata(verts,[],faces);o=bpy.data.objects.new('Arched window opening',me);col.objects.link(o);me.materials.append(sky)
def winter_branch(a,b,radius,depth,cx):
    b=(max(cx-1.05,min(cx+1.05,b[0])),b[1],b[2]);limit=3.15+math.sqrt(max(0,1.1**2-(b[0]-cx)**2))-.12
    b=(b[0],min(limit,b[1]),b[2]);mid=((a[0]+b[0])*.5+random.uniform(-.025,.025),(a[1]+b[1])*.5,(a[2]+b[2])*.5)
    rod('Organic winter wood',a,mid,radius,wood);rod('Tapered winter twig',mid,b,radius*.64,wood)
    if depth<2:rod('Settled branch snow',(a[0],a[1]+radius,a[2]+.008),(b[0],b[1]+radius*.4,b[2]+.008),radius*.30,snow)
    if depth==0:return
    for side in [-1,1]:
        span=.20+depth*.12
        end=(b[0]+side*random.uniform(.6,1.2)*span,b[1]+random.uniform(.25,.55)*depth,b[2]+random.uniform(-.015,.015))
        winter_branch(b,end,radius*.57,depth-1,cx)

# Physical tabletop is exactly y=0. The globe will rest on this measured plane.
box('COUNTER_TOP',(0,-.12,.30),(12,.24,4.8),counter,.06)
box('Counter cabinet',(0,-1.15,.3),(11.7,1.85,4.55),green,.035)
for y in [-.18,-.30,-1.95]:box('Counter brass horizontal',(0,y,2.60),(11.8,.025,.028),gold,.006)
for x in [-4.4,-2.2,0,2.2,4.4]:
    box('Counter raised panel',(x,-1.06,2.59),(2,1.38,.055),green,.02)
    for xx in [x-.98,x+.98]:box('Panel brass line',(xx,-1.06,2.63),(.014,1.34,.018),gold,.003)
    for yy in [-.40,-1.73]:box('Panel brass line',(x,yy,2.63),(1.97,.014,.018),gold,.003)
box('Shop rear wall',(0,2,-3.85),(16,8,.25),green,.01)
box('Shop ceiling',(0,6,-1),(16,.18,14),stone,.02)
box('Shop front return wall',(0,2,10),(16,8,.22),green,.02)
box('Shop floor',(0,-2.13,-.8),(18,.12,15),wood,.01)
for x in [-7.5,7.5]:box('Shop side wall',(x,1,-1),(.24,7,11),stone,.01)
# Five arched recesses, full depth moldings and window mullions.
for cx in [-5.8,-2.9,0,2.9,5.8]:
    if cx!=0:window_shape(cx)
    else:box('Central carved panel',(cx,2.25,-3.66),(2.55,4.6,.12),green,.025)
    for shift,rad in [(.02,1.29),(.085,1.36)]:arch('Cream carved arch',cx,-3.45+shift,.15,3.15,rad,stone,.11)
    arch('Fine brass arch',cx,-3.28,.16,3.15,1.22,gold,.025)
    for x in [cx-1.42,cx+1.42]:
        box('Limestone pilaster',(x,1.72,-3.38),(.21,3.45,.28),stone,.035)
        for yy in [.16,3.15,3.32]:box('Column capital',(x,yy,-3.31),(.40,.12,.44),stone,.018)
    box('Bay ledge',(cx,.12,-3.2),(2.75,.14,.65),wood,.025)
    if cx!=0:
        for dx in [-.62,0,.62]:box('Window brass mullion',(cx+dx,2.2,-3.28),(.028,3.9,.035),gold,.003)
        for yy in [1.4,2.55,3.15]:box('Window cross rail',(cx,yy,-3.28),(2.45,.025,.04),gold,.003)
        # Winter trees are actual branches placed behind each glazed bay.
        for j in range(3):
            x=cx+(j-1)*.60
            winter_branch((x,.35,-3.53),(x+random.uniform(-.08,.08),1.6+random.random()*.4,-3.53),.025,3,cx)

# Framed bookcases on both sides, visibly three dimensional spines and shelves.
for cx in [-4.6,4.6]:
    box('Bookcase back',(cx,1.5,-2.8),(1.30,3.0,.12),green)
    for dx in [-.71,.71]:box('Bookcase upright',(cx+dx,1.5,-2.5),(.14,3.1,.65),wood)
    for y in [.12,.84,1.56,2.28,3.02]:
        box('Bookcase shelf',(cx,y,-2.48),(1.55,.11,.78),wood)
        box('Shelf brass edge',(cx,y,-2.07),(1.55,.018,.018),gold,.003)
        if y>2.4:continue
        for j in range(8):
            h=random.uniform(.38,.59);x=cx-.55+j*.15
            box('Book paper block',(x,y+.07+h/2,-2.37),(.083,h-.025,.32),ivory,.003)
            for dx in [-.048,.048]:box('Textured cloth hard cover',(x+dx,y+.07+h/2,-2.36),(.012,h,.37),bookcolors[j%4],.003)
            box('Rounded cloth spine',(x,y+.07+h/2,-2.17),(.105,h,.035),bookcolors[j%4],.012)
            for yy in [y+.13,y+h-.02]:box('Book spine gilt',(x,yy,-2.168),(.085,.009,.008),gold,.001)
            font=bpy.data.curves.new('Small embossed book title','FONT');font.body=['WINTER','NOEL','ATLAS','BOTANY'][j%4];font.size=.018;font.align_x='CENTER';font.extrude=.0006
            title=bpy.data.objects.new('Gold embossed title',font);col.objects.link(title);title.location=(x,2.149,y+.07+h*.64);title.rotation_euler.x=math.pi/2;font.materials.append(gold)

def foliage(center,rad,depth,mat=leaf,orientation=None):
    direction=random.uniform(-math.pi,math.pi) if orientation is None else orientation
    for i in range(12):
        side=-1 if i%2==0 else 1;alongstem=(i//2)/5*rad*1.25;origin=(center[0]+math.cos(direction)*alongstem,center[1]+math.sin(direction)*alongstem,center[2])
        angle=direction+side*random.uniform(.65,1.05);length=rad*random.uniform(.40,.80);width=rad*random.uniform(.025,.05);verts=[];faces=[]
        for j in range(7):
            t=j/6;along=t*length;spread=math.sin(math.pi*t)*width
            for side in [-1,0,1]:
                xx=along*math.cos(angle)-side*spread*math.sin(angle);yy=along*math.sin(angle)+side*spread*math.cos(angle);zz=depth*.6*math.sin(math.pi*t)+(1-abs(side))*.007
                verts.append((origin[0]+xx,-origin[2]-zz,origin[1]+yy))
        for j in range(6):
            for k in range(2):a=j*3+k;faces.append((a,a+1,a+4,a+3))
        me=bpy.data.meshes.new('Tapered evergreen leaf');me.from_pydata(verts,[],faces);o=bpy.data.objects.new('Curved evergreen needles',me);col.objects.link(o);me.materials.append(mat)
        for f in me.polygons:f.use_smooth=True
def wreath(cx,cy,z,rr):
    for i in range(50):
        a=i*math.tau/50;pos=(cx+rr*math.cos(a),cy+rr*math.sin(a),z)
        foliage(pos,.13,.065,orientation=a+math.pi/2)
        if i%3==0:sphere('Wreath brass ornament',(pos[0],pos[1],z+.10),(.045,.045,.045),gold)
        if i%4==0:sphere('Wreath warm light',(pos[0],pos[1],z+.15),(.018,.018,.018),glow)
    for side in [-1,1]:
        o=sphere('Velvet bow loop',(cx+side*.18,cy+rr+.06,z+.1),(.22,.12,.075),red);o.rotation_euler.y=side*.35
        o=box('Velvet ribbon tail',(cx+side*.09,cy+rr-.20,z+.11),(.12,.42,.035),red,.012);o.rotation_euler.y=side*.16
    sphere('Bow center',(cx,cy+rr+.04,z+.17),(.065,.07,.07),red)
wreath(0,3.06,-3.04,.77)
for i in range(95):
    x=-6.7+i*.142;y=4.65-.18*math.cos(x*.8);foliage((x,y,-3.15),.18,.08,orientation=random.uniform(-.65,.65))
    if i%3==0:sphere('Garland lamp',(x,y-.02,-2.98),(.025,.025,.025),glow)
    if i%7==0:sphere('Garland red berry',(x,y-.1,-3.01),(.045,.045,.045),red)

# Counter still-life leaves the center clear for the interactive globe.
for side in [-1,1]:
    for i in range(3):
        x=side*(3.1+i*.43);h=.24+i*.12;z=.15+i*.22
        box('Wrapped present',(x,h/2,z),(.44,h,.38),[ivory,red,green][i],.015)
        box('Present gold ribbon',(x,h+.005,z),(.06,.012,.39),gold,.003)
        box('Present vertical ribbon',(x,h/2,z+.195),(.06,h,.009),gold,.002)
    x=side*4.3
    sphere('Brass botanical urn',(x,.3,.65),(.28,.34,.28),gold)
    rod('Urn foot',(x,0,.65),(x,.14,.65),.16,gold)
    for i in range(10):
        a=i*2.4;end=(x+math.cos(a)*.42,.65+random.random()*.38,.65+math.sin(a)*.3)
        rod('Botanical stem',(x,.4,.65),end,.009,leaf);foliage(end,.14,.045)
    box('Still life book',(side*2.75,.045,.70),(.62,.09,.42),bookcolors[0],.012)

# Convert the shop alone; derive consistent UVs in real world scale.
bpy.ops.object.select_all(action='DESELECT')
for o in col.objects:o.select_set(True)
bpy.context.view_layer.objects.active=list(col.objects)[0];bpy.ops.object.convert(target='MESH')
for o in list(col.objects):
    o.data.transform(o.matrix_world);o.matrix_world.identity();uv=o.data.uv_layers.active or o.data.uv_layers.new(name='UVMap')
    for face in o.data.polygons:
        axis=max(range(3),key=lambda i:abs(face.normal[i]))
        for li in face.loop_indices:
            v=o.data.vertices[o.data.loops[li].vertex_index].co;pair=(v.y,v.z) if axis==0 else (v.x,v.z) if axis==1 else (v.x,v.y)
            uv.data[li].uv=(pair[0]*.65,pair[1]*.65)
bpy.ops.object.select_all(action='DESELECT')
for o in col.objects:o.select_set(True)
bpy.context.view_layer.objects.active=list(col.objects)[0];bpy.ops.object.join();shop=bpy.context.object;shop.name='SHOP'
# Fine facade relief remains part of the exact same miniature and interior city.
col=bpy.data.collections['03_NewYork'];old_city=bpy.data.objects['CITY'];before=set(col.objects)
trim=material('Weathered limestone relief',r/'AI재질/limestone-color.png',normal=cc('Snow001','NormalGL'),roughness=.74,strength=.18)
base=.85
for width,depth,height in [(.39,.32,.88),(.30,.27,.42),(.22,.21,.30),(.14,.14,.18)]:
    for side in [-1,1]:
        for fraction in [-.43,-.14,.14,.43]:
            box('Tower vertical stone rib',(-.52+width*fraction,base+height/2,-.48+side*(depth/2+.011)),(.012,height,.013),trim,.002)
        for j in range(1,int(height/.095)):
            box('Tower floor relief',(-.52,base+j*.095,-.48+side*(depth/2+.008)),(width,.008,.010),trim,.001)
    base+=height
for x,z in [(.05,-.11),(.47,-.13),(.88,-.06)]:
    for dx in [-.047,.047]:box('Door raised timber frame',(x+dx,.99,z+.022),(.009,.20,.009),wood,.002)
    for y in [.90,1.02,1.10]:box('Door panel rail',(x,y,z+.024),(.10,.008,.008),wood,.002)
    sphere('Door brass handle',(x+.034,1,z+.033),(.007,.007,.012),gold)
new=list(set(col.objects)-before)
bpy.ops.object.select_all(action='DESELECT')
for o in new:o.select_set(True)
bpy.context.view_layer.objects.active=new[0];bpy.ops.object.convert(target='MESH')
for o in new:
    o.data.transform(o.matrix_world);o.matrix_world.identity();uv=o.data.uv_layers.active or o.data.uv_layers.new(name='UVMap')
    for face in o.data.polygons:
        axis=max(range(3),key=lambda i:abs(face.normal[i]))
        for li in face.loop_indices:
            v=o.data.vertices[o.data.loops[li].vertex_index].co;pair=(v.y,v.z) if axis==0 else (v.x,v.z) if axis==1 else (v.x,v.y);uv.data[li].uv=(pair[0]*3,pair[1]*3)
old_city.select_set(True);bpy.context.view_layer.objects.active=old_city;bpy.ops.object.join();old_city.name='CITY'
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(r/'Blender/snowglobe_new_york_v06_shop_pbr.blend'))
bpy.ops.object.select_all(action='DESELECT');shop.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(w/'assets/3d/shop.glb'),export_format='GLB',use_selection=True,export_apply=True)
bpy.ops.object.select_all(action='DESELECT')
for name in ['GLASS','BASE','CITY','TREES','PROPS']:
    o=bpy.data.objects.get(name)
    if o:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(w/'assets/3d/snowglobe.glb'),export_format='GLB',use_selection=True,export_apply=True)
print('SHOP_PBR_EXPORT_COMPLETE',flush=True)
