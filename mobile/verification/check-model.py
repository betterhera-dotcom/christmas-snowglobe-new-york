import json,struct
from pathlib import Path
root=Path(__file__).resolve().parents[2]
def read(path):
 b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),b[28+n:]
a,ab=read(root/'웹체험_3D/assets/3d/snowglobe.glb');b,bb=read(root/'mobile/assets/snowglobe-mobile.glb')
assert a['nodes']==b['nodes'] and a['scenes']==b['scenes']
assert not b.get('images') and not b.get('textures')
def data(doc,blob,index):
 ac=doc['accessors'][index];v=doc['bufferViews'][ac['bufferView']];return blob[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
for am,bm in zip(a['meshes'],b['meshes']):
 assert len(am['primitives'])==len(bm['primitives'])
 for ap,bp in zip(am['primitives'],bm['primitives']):
  for name in ['POSITION','NORMAL']:assert data(a,ab,ap['attributes'][name])==data(b,bb,bp['attributes'][name])
  assert data(a,ab,ap['indices'])==data(b,bb,bp['indices'])
print('PASS: original model geometry, normals, indices and placement unchanged; zero image textures')
