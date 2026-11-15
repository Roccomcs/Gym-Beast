import { useEffect, useRef, useState } from 'react'
import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const species: Record<string, string> = { Dragón: 'dragon', Cocodrilo: 'crocodile', Oso: 'bear', Lobo: 'wolf' }
const stages = { bebé: 'baby', joven: 'young', adulta: 'adult' }

export default function PetView({ name, stage, animation, accessory }: {
  name: string; stage: keyof typeof stages; animation?: string; accessory?: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const [failed, fail] = useState(false)
  useEffect(() => {
    const container = host.current
    if (!container) return
    let renderer: T.WebGLRenderer
    try { renderer = new T.WebGLRenderer({ alpha: true, antialias: false }) }
    catch { fail(true); return }
    const scene = new T.Scene()
    const camera = new T.PerspectiveCamera(32, 1, .1, 20)
    camera.position.set(2.1, 1.65, 4.8)
    camera.lookAt(0, .92, 0)
    renderer.setSize(210, 210)
    renderer.domElement.setAttribute('aria-hidden', 'true')
    const lost = () => fail(true)
    renderer.domElement.addEventListener('webglcontextlost', lost)
    container.append(renderer.domElement)
    scene.add(new T.HemisphereLight(0xffe6ff, 0x544676, 2.4))
    const lamp = new T.DirectionalLight(0xffeadb, 2.5)
    lamp.position.set(3, 4, 4)
    scene.add(lamp)
    let disposed = false
    let frame = 0
    let model: T.Object3D | undefined
    let mixer: T.AnimationMixer | undefined
    let previous = performance.now()
    const release = (mesh: T.Object3D) => mesh.traverse(child => {
      if (!(child instanceof T.Mesh)) return
      child.geometry.dispose()
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach(material => material.dispose())
    })
    new GLTFLoader().load('/pets/' + species[name] + '-' + stages[stage] + '.glb', gltf => {
      if (disposed) { release(gltf.scene); return }
      model = gltf.scene
      if (accessory === 'bandana' || accessory === 'medalla') {
        const character = model.children[0] ?? model
        const age = stage === 'adulta' ? 2 : stage === 'joven' ? 1 : 0
        const geometry = accessory === 'bandana' ? new T.BoxGeometry(.7, .13, .55) : new T.CylinderGeometry(.095, .095, .045, 8)
        const accessoryMesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ color: 0xffc851, roughness: .65 }))
        if (accessory === 'bandana') accessoryMesh.position.set(0, 1.34 + age * .095, .03)
        else {
          accessoryMesh.rotation.x = Math.PI / 2
          accessoryMesh.position.set(0, 1.13 + age * .08, .27)
        }
        character.add(accessoryMesh)
      }
      scene.add(model)
      mixer = new T.AnimationMixer(model)
      const clip = gltf.animations.find(entry => entry.name === animation) ?? gltf.animations[0]
      if (clip) mixer.clipAction(clip).play()
      const tick = (now: number) => {
        if (disposed) return
        if (!document.hidden) {
          mixer?.update(Math.min(.04, (now - previous) / 1000))
          renderer.render(scene, camera)
        }
        previous = now
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, undefined, () => { if (!disposed) fail(true) })
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      mixer?.stopAllAction()
      if (model) release(model)
      renderer.domElement.removeEventListener('webglcontextlost', lost)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [name, stage, animation, accessory])
  return <>{failed ? <p role="status">Vista 3D no disponible en este dispositivo.</p> : <div className="pet-canvas" ref={host} />}</>
}
