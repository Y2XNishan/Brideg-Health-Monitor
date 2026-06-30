import { useEffect, useRef } from 'react'

export default function AuroraBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let t = 0
    let animId

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const lightOrbs = [
      { cx: 0.1, cy: 0.2, r: 320, c: '147,197,253', vx: 0.4, vy: 0.3 },
      { cx: 0.65, cy: 0.15, r: 360, c: '196,181,253', vx: -0.35, vy: 0.25 },
      { cx: 0.9, cy: 0.75, r: 280, c: '167,243,208', vx: 0.3, vy: -0.4 },
      { cx: 0.25, cy: 0.85, r: 260, c: '186,230,253', vx: -0.28, vy: 0.35 },
    ]

    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      const orbs = lightOrbs
      const alpha = 0.5

      ctx.fillStyle = '#f0f4ff'
      ctx.fillRect(0, 0, W, H)

      orbs.forEach((o, i) => {
        const x = (o.cx + Math.sin(t * o.vx + i) * 0.12) * W
        const y = (o.cy + Math.cos(t * o.vy + i) * 0.1) * H
        const g = ctx.createRadialGradient(x, y, 0, x, y, o.r)
        g.addColorStop(0, `rgba(${o.c},${alpha})`)
        g.addColorStop(1, `rgba(${o.c},0)`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
      })

      t += 0.004
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  )
}
