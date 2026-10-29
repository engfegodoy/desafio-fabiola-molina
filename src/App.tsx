import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { isTouch, useGame } from './store/gameStore';
import { RaceEngine } from './game/raceEngine';
import { current } from './game/engineContext';
import { PHASE_STAGE } from './config/balance';
import { RaceWorld } from './three/RaceWorld';
import { FinalScene, MenuScene } from './three/scenes/MenuScene';
import { MenuScreen } from './ui/MenuScreen';
import { ControlsScreen, RulesScreen } from './ui/PreGameScreens';
import { RaceScreen } from './ui/RaceScreen';
import { FinalScreen } from './ui/FinalScreen';
import { GameAudio } from './ui/GameAudio';

/** Transição animada (íris com bolhas) a cada troca de tela ou fase. */
function Transition({ trigger }: { trigger: string }) {
  const [shown, setShown] = useState<string | null>(trigger);
  useEffect(() => {
    setShown(trigger);
    const id = setTimeout(() => setShown(null), 950);
    return () => clearTimeout(id);
  }, [trigger]);
  if (!shown) return null;
  return (
    <div
      key={shown}
      className="pointer-events-none absolute inset-0 z-[60]"
      style={{
        background: 'radial-gradient(circle at 50% 40%, #22d3ee 0%, #1f6fe5 55%, #0a1f52 100%)',
        animation: 'iris 0.8s cubic-bezier(0.6,0,0.3,1) 0.1s both',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-80">🌊</div>
    </div>
  );
}

export default function App() {
  const screen = useGame((s) => s.screen);
  const phase = useGame((s) => s.phase);
  const runId = useGame((s) => s.runId);
  const quality = useGame((s) => s.quality);
  const setQuality = useGame((s) => s.setQuality);
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, quality === 'high' ? 1.75 : 1.25));

  const engine = useMemo(() => {
    const opts = { desktop: !isTouch };
    if (screen === 'race') return new RaceEngine(PHASE_STAGE[phase], undefined, opts);
    return null;
    // runId força uma nova prova ao repetir a fase
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, phase, runId]);
  current.engine = engine;
  if (import.meta.env.DEV) (window as unknown as { __game: unknown }).__game = { current, useGame };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ touchAction: 'none' }}>
      <Canvas
        className="!absolute inset-0"
        shadows={quality === 'high'}
        dpr={dpr}
        gl={{ antialias: quality === 'high', powerPreference: 'high-performance', alpha: false }}
        camera={{ fov: 56, near: 0.25, far: 1500, position: [0, 4, 10] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.setClearColor('#0a4fb5');
        }}
      >
        <PerformanceMonitor
          onDecline={() => {
            setDpr((d) => Math.max(0.75, d - 0.25));
            setQuality('low');
          }}
          onIncline={() => setDpr((d) => Math.min(window.devicePixelRatio || 1, d + 0.25, 2))}
          flipflops={3}
        >
          <Suspense fallback={null}>
            {(screen === 'menu' || screen === 'rules' || screen === 'controls') && <MenuScene />}
            {engine && <RaceWorld key={`${screen}-${phase}-${runId}`} engine={engine} />}
            {screen === 'final' && <FinalScene />}
          </Suspense>
        </PerformanceMonitor>
      </Canvas>

      <div className="absolute inset-0">
        {screen === 'menu' && <MenuScreen />}
        {screen === 'rules' && <RulesScreen />}
        {screen === 'controls' && <ControlsScreen />}
        {screen === 'race' && engine && <RaceScreen key={runId} engine={engine} />}
        {screen === 'final' && <FinalScreen />}
      </div>
      <GameAudio engine={engine} />
      <Transition trigger={`${screen}-${phase}-${runId}`} />
    </div>
  );
}
