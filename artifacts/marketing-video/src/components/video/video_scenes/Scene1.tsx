import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),   // Subtext flashes
      setTimeout(() => setPhase(2), 800),   // ARE YOU reveals
      setTimeout(() => setPhase(3), 1600),  // READY reveals
      setTimeout(() => setPhase(4), 2200),  // Flash impact
      setTimeout(() => setPhase(5), 2500),  // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      transition={{ duration: 0.6 }}>
      
      {/* Background intensity */}
      <motion.div className="absolute inset-0 bg-primary/20 blur-[120px]"
        animate={{ scale: phase >= 4 ? 1.5 : 1, opacity: phase >= 4 ? 0 : 0.5 }}
        transition={{ duration: 0.8, ease: "easeOut" }} />
        
      {/* Crosshairs */}
      <div className="absolute inset-8 border border-white/5 opacity-50" />
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5" />
      <div className="absolute left-1/2 top-0 h-full w-[1px] bg-white/5" />
      
      {/* Small tech text top left */}
      <motion.div className="absolute top-12 left-12 font-mono text-[1.2vw] text-primary tracking-widest uppercase"
        initial={{ opacity: 0, x: -20 }}
        animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}>
        [ SYSTEM.INIT ]
      </motion.div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="overflow-hidden mb-2">
          <motion.h2 className="text-[3vw] font-mono text-white/50 tracking-widest"
            initial={{ y: "100%" }}
            animate={phase >= 2 ? { y: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}>
            ARE YOU
          </motion.h2>
        </div>
        
        <div className="overflow-hidden">
          <motion.h1 className="text-[12vw] font-black leading-none text-white tracking-tighter"
            initial={{ y: "100%", rotateX: 45 }}
            animate={phase >= 3 ? { y: 0, rotateX: 0 } : { y: "100%", rotateX: 45 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            READY?
          </motion.h1>
        </div>
        
        {/* Flash impact overlay */}
        {phase === 4 && (
          <motion.div className="absolute inset-0 bg-white"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }} />
        )}
      </div>

    </motion.div>
  );
}
