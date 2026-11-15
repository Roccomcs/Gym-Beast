import { mkdir, writeFile } from 'node:fs/promises'
import * as T from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.() }) }
}
const materials = new Map()
function cube(parent, color, size, position) {
  if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({ color, roughness: 1 }))
  const mesh = new T.Mesh(new T.BoxGeometry(...size), materials.get(color))
  mesh.position.set(...position)
  parent.add(mesh)
  return mesh
}
const kinds = [
  ['dragon', '#9961da', '#e3acfc'], ['crocodile', '#39a577', '#b5ef99'],
  ['bear', '#b96a39', '#fed286'], ['wolf', '#7989be', '#dce4ff'],
]
const stages = ['baby', 'young', 'adult']
function character(kind, fur, light, age) {
  const pet = new T.Group()
  const head = new T.Group()
  head.name = 'Head'
  head.position.y = 1.63 + age * .1
  pet.add(head)
  const width = .84 - age * .055
  cube(head, fur, [width, .67, .64], [0, 0, 0])
  const muzzle = kind === 'crocodile' ? .69 : kind === 'bear' ? .28 : .44
  cube(head, light, [width * .72, .25, muzzle], [0, -.14, .31 + muzzle / 4])
  if (kind === 'bear' || kind === 'wolf') cube(head, '#24162f', [.16,.11,.09], [0,-.09,.49])
  for (const side of [-1, 1]) {
    cube(head, '#fff3dd', [.18,.2,.035], [side * width * .27,.09,.33])
    cube(head, '#261434', [.09,.14,.035], [side * width * .27,.08,.36])
    if (kind !== 'crocodile') {
      const ear = cube(head, kind === 'dragon' ? '#fff0d6' : fur, [.2,kind === 'bear' ? .23 : .4,.18], [side * width * .43,.37,0])
      ear.rotation.z = -side * .23
    }
    cube(pet, fur, [.26,.45 + age * .07,.29], [side*.18,.3 + age*.05,.02])
    cube(pet, '#372653', [.31,.18,.45], [side*.18,.1,.12])
    const arm = cube(pet, fur, [.22 + age*.025,.54,.24], [side*(.44+age*.045),1 + age*.07,.02])
    arm.name = side === 1 ? 'ArmR' : 'ArmL'
    arm.rotation.z = side*.13
    if (kind === 'dragon') {
      const wing = cube(pet, light, [.37+age*.12,.45,.09], [side*(.43+age*.1),1.21,-.34])
      wing.rotation.z = side*.32
    }
  }
  cube(pet, '#473071', [.66+age*.08,.65+age*.1,.46], [0,1+age*.07,0])
  cube(pet, '#c0ff64', [.67,.12,.52], [0,1.34+age*.095,.03])
  if (kind !== 'bear') cube(pet, fur, [.24,.24,.57+age*.13], [0,.71,-.47-age*.05]).rotation.x = -.32
  pet.scale.setScalar([.76,.9,1][age])
  return pet
}
const rotations = [
  ['Reposo','Head','z',0,.05], ['Saludo','ArmR','z',.13,-1.65],
  ['Entrenamiento','ArmL','x',0,-1.3], ['Victoria','ArmR','z',.13,-2.55], ['Evolución','Head','y',0,.45],
]
const animations = rotations.map(([name,node,axis,start,end]) =>
  new T.AnimationClip(name, 1.2, [new T.QuaternionKeyframeTrack(node + '.quaternion', [0,.6,1.2],
    [start,end,start].flatMap(angle => {
      const pose = new T.Euler()
      pose[axis] = angle
      return new T.Quaternion().setFromEuler(pose).toArray()
    }))]))
const exporter = new GLTFExporter()
await mkdir('public/pets', { recursive: true })
for (const [kind, fur, light] of kinds) {
  for (const [age, stage] of stages.entries()) {
    const model = character(kind, fur, light, age)
    const data = await exporter.parseAsync(model, { binary: true, animations })
    await writeFile('public/pets/' + kind + '-' + stage + '.glb', Buffer.from(data))
  }
}
