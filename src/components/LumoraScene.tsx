import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { useRef } from 'react'
import type { Group, Mesh } from 'three'

function Particles() {
  const group = useRef<Group>(null)

  useFrame((state) => {
    if (!group.current) return

    const time = state.clock.elapsedTime

    group.current.rotation.y = time * 0.015
    group.current.rotation.x = Math.sin(time * 0.08) * 0.03
  })

  const particles = Array.from({ length: 90 }, (_, index) => {
    const angle = index * 2.399
    const radius = 2.5 + (index % 12) * 0.45

    return {
      x: Math.cos(angle) * radius,
      y: ((index % 17) - 8) * 0.38,
      z: -3 - Math.sin(angle) * radius * 0.55,
      size: 0.012 + (index % 4) * 0.006,
    }
  })

  return (
    <group ref={group}>
      {particles.map((particle, index) => (
        <mesh
          key={index}
          position={[
            particle.x,
            particle.y,
            particle.z,
          ]}
        >
          <sphereGeometry
            args={[particle.size, 8, 8]}
          />

          <meshBasicMaterial
            color="#d8d8d8"
            transparent
            opacity={0.25 + (index % 5) * 0.08}
          />
        </mesh>
      ))}
    </group>
  )
}

function Architecture() {
  const group = useRef<Group>(null)

  useFrame((state) => {
    if (!group.current) return

    const time = state.clock.elapsedTime

    group.current.position.x =
      Math.sin(time * 0.08) * 0.08
  })

  const structures = [
    [-5.5, -0.8, -7, 2.1, 4.2],
    [-3.7, -0.8, -9, 1.4, 5.5],
    [4.8, -0.8, -8, 2, 5],
    [6.3, -0.8, -11, 1.5, 6.5],
    [-7, -0.8, -11, 1.5, 6],
    [2.8, -0.8, -12, 2.2, 7],
  ]

  return (
    <group ref={group}>
      {structures.map(
        ([x, y, z, width, height], index) => (
          <group
            key={index}
            position={[
              x,
              y + height / 2,
              z,
            ]}
          >
            <mesh>
              <boxGeometry
                args={[
                  width,
                  height,
                  width,
                ]}
              />

              <meshStandardMaterial
                color="#0c0c0c"
                metalness={0.85}
                roughness={0.55}
              />
            </mesh>

            {Array.from({
              length: Math.max(
                2,
                Math.floor(height / 1.3),
              ),
            }).map((_, lightIndex) => (
              <mesh
                key={lightIndex}
                position={[
                  0,
                  -height / 2 +
                    0.9 +
                    lightIndex * 1.1,
                  width / 2 + 0.01,
                ]}
              >
                <planeGeometry
                  args={[
                    width * 0.3,
                    0.025,
                  ]}
                />

                <meshBasicMaterial
                  color="#8a8a8a"
                  transparent
                  opacity={0.28}
                />
              </mesh>
            ))}
          </group>
        ),
      )}

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.35, -6]}
      >
        <planeGeometry args={[30, 30]} />

        <meshStandardMaterial
          color="#060606"
          metalness={0.75}
          roughness={0.65}
        />
      </mesh>
    </group>
  )
}

function DataNetwork() {
  const group = useRef<Group>(null)

  useFrame((state) => {
    if (!group.current) return

    group.current.position.y =
      Math.sin(
        state.clock.elapsedTime * 0.35,
      ) * 0.04
  })

  return (
    <group
      ref={group}
      position={[0, -0.15, -5]}
    >
      <mesh position={[-2.4, 0, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />

        <meshBasicMaterial
          color="#dcdcdc"
        />
      </mesh>

      <mesh position={[-0.8, 0.18, 0]}>
        <sphereGeometry args={[0.065, 16, 16]} />

        <meshBasicMaterial
          color="#bdbdbd"
        />
      </mesh>

      <mesh position={[0.8, -0.04, 0]}>
        <sphereGeometry args={[0.075, 16, 16]} />

        <meshBasicMaterial
          color="#cccccc"
        />
      </mesh>

      <mesh position={[2.4, 0.12, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />

        <meshBasicMaterial
          color="#ffffff"
        />
      </mesh>

      <mesh
        position={[0, 0.05, 0]}
        rotation={[0, 0, 0]}
      >
        <boxGeometry args={[5, 0.008, 0.008]} />

        <meshBasicMaterial
          color="#8a8a8a"
          transparent
          opacity={0.35}
        />
      </mesh>
    </group>
  )
}

function LumoraCore() {
  const core = useRef<Mesh>(null)

  useFrame((state) => {
    if (!core.current) return

    const time = state.clock.elapsedTime

    const scale =
      1 + Math.sin(time * 1.2) * 0.08

    core.current.scale.setScalar(scale)
  })

  return (
    <>
      <mesh
        ref={core}
        position={[0, -0.15, -5.5]}
      >
        <sphereGeometry
          args={[0.13, 32, 32]}
        />

        <meshBasicMaterial
          color="#ffffff"
        />
      </mesh>

      <pointLight
        position={[0, -0.15, -5.5]}
        intensity={3}
        distance={7}
        color="#ffffff"
      />
    </>
  )
}

function Scene() {
  const cameraRig = useRef<Group>(null)

  useFrame((state) => {
    if (!cameraRig.current) return

    const time = state.clock.elapsedTime

    cameraRig.current.position.z =
      Math.min(time * 0.035, 0.8)

    cameraRig.current.position.x =
      Math.sin(time * 0.12) * 0.12

    cameraRig.current.position.y =
      Math.sin(time * 0.15) * 0.04
  })

  return (
    <>
      <color
        attach="background"
        args={['#020202']}
      />

      <fog
        attach="fog"
        args={[
          '#020202',
          4,
          18,
        ]}
      />

      <ambientLight intensity={0.1} />

      <directionalLight
        position={[-4, 5, 3]}
        intensity={0.45}
      />

      <group ref={cameraRig}>
        <Architecture />
        <Particles />
        <DataNetwork />
        <LumoraCore />
      </group>
    </>
  )
}

export default function LumoraScene() {
  return (
    <div className="scene-wrapper">
      <Canvas
        camera={{
          position: [0, 0, 6],
          fov: 42,
        }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          powerPreference:
            'high-performance',
        }}
      >
        <Scene />

        <EffectComposer>
          <Bloom
            intensity={0.65}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.85}
          />

          <Vignette
            darkness={0.85}
            offset={0.25}
          />
        </EffectComposer>
      </Canvas>

      <div className="film-content">
        <div className="film-shot shot-intro">
          <span className="eyebrow">
            BUILT BY LUMORA
          </span>

          <h1>
            We build simple technology
            <br />
            for real-world problems.
          </h1>
        </div>

        <div className="film-shot shot-brand">
          <div className="lumora-word">
            LUMORA
          </div>

          <span>
            BUSINESS INTELLIGENCE,
            <br />
            WITHOUT THE COMPLEXITY.
          </span>
        </div>

        <div className="film-shot shot-copilot">
          <span className="eyebrow">
            INTRODUCING
          </span>

          <h2>
            Your Business
            <br />
            Copilot.
          </h2>

          <p>
            Understand what&apos;s happening
            <br />
            in your business.
          </p>
        </div>

        <div className="film-shot shot-flow">
          <div className="flow-line">
            <span>SALES</span>
            <i />
            <span>EXPENSES</span>
            <i />
            <span>PROFIT</span>
            <i />
            <strong>INSIGHT</strong>
          </div>
        </div>

        <div className="film-shot shot-final">
          <p>
            Let&apos;s understand
            <br />
            your business.
          </p>

          <button type="button">
            Get Started
          </button>
        </div>
      </div>

      <div className="film-vignette" />
      <div className="film-grain" />
    </div>
  )
}