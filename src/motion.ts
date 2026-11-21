import { useEffect } from 'react'

export function useMotionVisibility() {
  useEffect(() => {
    const update = () => { document.documentElement.dataset.motionPaused = String(document.visibilityState === 'hidden') }
    update()
    document.addEventListener('visibilitychange', update)
    return () => { document.removeEventListener('visibilitychange', update); delete document.documentElement.dataset.motionPaused }
  }, [])
}
