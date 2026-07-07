'use client'

import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import { ElectricCurrentBurst } from './awakening/ElectricCurrentBurst'

interface TurnOnButtonProps {
  onClick: () => void
  isHovered: boolean
  onHoverChange: (hovered: boolean) => void
}

export function TurnOnButton({ onClick, isHovered, onHoverChange }: TurnOnButtonProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0">
        <Canvas
          camera={{ position: [0, 0, 3], fov: 35 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            alpha: true,
          }}
          onCreated={(state) => {
            if (state.gl) {
              state.gl.setClearColor(0x000000, 0)
              state.scene.background = null
            }
          }}
          dpr={[1, 2]}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <ElectricCurrentBurst active={isHovered} />
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={0.6}
              luminanceThreshold={1.3}
              luminanceSmoothing={0.9}
              mipmapBlur
              radius={0.3}
            />
          </EffectComposer>
        </Canvas>
      </div>

      <div className="relative z-10 text-center">
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={(e) => {
            onHoverChange(true)
            e.currentTarget.style.animation = 'button-pulse-glow 2s ease-in-out infinite'
          }}
          onMouseLeave={(e) => {
            onHoverChange(false)
            e.currentTarget.style.animation = 'none'
            e.currentTarget.style.boxShadow = '0 0 0 0 rgba(217, 252, 103, 0.7)'
          }}
          className="button-glass-accent body-1 px-spacing-12 py-spacing-6 relative rounded-lg font-medium transition-all duration-300"
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            boxShadow: '0 0 0 0 rgba(217, 252, 103, 0.7)',
          }}
        >
          <span className="relative z-10">TURN ME ON</span>
        </button>
      </div>
    </>
  )
}
