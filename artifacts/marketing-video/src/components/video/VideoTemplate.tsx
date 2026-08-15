import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video/hooks';
import { useEffect, useRef } from 'react';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS: Record<string, number> = {
  open: 3500,     // 3.5s - Hook: "Are you ready"
  courses: 3500,  // 3.5s - Fast flash of courses
  quiz: 4500,     // 4.5s - Interview question simulation
  badges: 4800,   // 4.8s - Badges stacking and exploding
  close: 5500,    // 5.5s - Leaderboard + CTA "Prove you're the best"
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  open: Scene1,
  courses: Scene2,
  quiz: Scene3,
  badges: Scene4,
  close: Scene5,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  return (
    <>
      <div className="relative w-full h-screen overflow-hidden bg-background">
        {/* Dynamic Background gradients that shift based on scene */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
          <motion.div
            className="absolute rounded-full blur-[150px]"
            animate={{
              x: ['-20vw', '50vw', '100vw', '20vw', '-20vw'][sceneIndex],
              y: ['-20vh', '80vh', '10vh', '60vh', '-20vh'][sceneIndex],
              width: ['60vw', '40vw', '70vw', '50vw', '80vw'][sceneIndex],
              height: ['60vw', '40vw', '70vw', '50vw', '80vw'][sceneIndex],
              backgroundColor: sceneIndex === 4 ? '#ffffff' : '#7B5CFA',
              opacity: sceneIndex === 4 ? 0 : 0.6,
            }}
            transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute rounded-full blur-[120px]"
            animate={{
              x: ['80vw', '10vw', '-30vw', '80vw', '50vw'][sceneIndex],
              y: ['80vh', '-10vh', '70vh', '-20vh', '80vh'][sceneIndex],
              width: ['50vw', '60vw', '40vw', '70vw', '50vw'][sceneIndex],
              height: ['50vw', '60vw', '40vw', '70vw', '50vw'][sceneIndex],
              backgroundColor: sceneIndex === 4 ? '#ffffff' : '#4C1D95',
              opacity: sceneIndex === 4 ? 0 : 0.4,
            }}
            transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        {/* Grid overlay for tech vibe */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4vw_4vw] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none z-0" />

        {/* Frame border */}
        <div className="absolute inset-[2vw] border border-white/10 pointer-events-none z-50 rounded-xl" />

        {/* Scenes */}
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </>
  );
}
