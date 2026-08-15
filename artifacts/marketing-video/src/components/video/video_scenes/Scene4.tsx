import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

const badges = [
  { name: "BRONZE", score: "≥ 50%", color: "#CD7F32", icon: Shield },
  { name: "SILVER", score: "≥ 70%", color: "#C0C0C0", icon: ShieldAlert },
  { name: "GOLD", score: "≥ 85%", color: "#FFD700", icon: ShieldCheck },
  { name: "PLATINUM", score: "≥ 95%", color: "#E5E4E2", icon: ShieldCheck, explode: true },
];

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),   // Bronze
      setTimeout(() => setPhase(2), 800),   // Silver
      setTimeout(() => setPhase(3), 1300),  // Gold
      setTimeout(() => setPhase(4), 2000),  // Platinum builds up
      setTimeout(() => setPhase(5), 2300),  // Platinum explodes!
      setTimeout(() => setPhase(6), 3800),  // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(20px)" }}
      transition={{ duration: 0.6 }}>

      <motion.h2 className="absolute top-[10vh] font-mono text-[2vw] text-primary tracking-[0.5em]"
        initial={{ y: -20, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: -20, opacity: 0 }}>
        EARN YOUR RANK
      </motion.h2>

      <div className="relative flex justify-center items-end h-[40vh] w-[80vw] gap-[2vw]">
        {badges.map((badge, i) => {
          const isActive = phase > i && (!badge.explode || phase >= 5);
          const isPlatinumExplosion = badge.explode && phase >= 5;
          const isHiddenByExplosion = phase >= 5 && !badge.explode;
          
          const Icon = badge.icon;
          
          return (
            <motion.div key={badge.name}
              className="relative flex flex-col items-center"
              initial={{ opacity: 0, y: 100, scale: 0.5 }}
              animate={
                isHiddenByExplosion
                  ? { opacity: 0, scale: 0.5, y: 100, filter: "blur(10px)" }
                  : isActive
                    ? { 
                        opacity: 1, 
                        y: 0, 
                        scale: isPlatinumExplosion ? 2.5 : 1,
                        zIndex: isPlatinumExplosion ? 50 : 10,
                      }
                    : { opacity: 0, y: 100, scale: 0.5 }
              }
              transition={{ 
                type: "spring", 
                stiffness: isPlatinumExplosion ? 100 : 300, 
                damping: isPlatinumExplosion ? 15 : 20 
              }}>
              
              {/* Explosion rings for platinum */}
              {isPlatinumExplosion && (
                <>
                  <motion.div className="absolute inset-0 rounded-full border-4" style={{ borderColor: badge.color }}
                    initial={{ scale: 0.5, opacity: 1 }}
                    animate={{ scale: 3, opacity: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }} />
                  <motion.div className="absolute inset-0 rounded-full bg-white mix-blend-overlay"
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 5, opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }} />
                </>
              )}

              <div className="flex flex-col items-center justify-center p-[2vw] rounded-full bg-secondary border-[0.5vw]"
                style={{ borderColor: badge.color, boxShadow: isPlatinumExplosion ? `0 0 80px ${badge.color}` : `0 0 20px ${badge.color}40` }}>
                <Icon size={isPlatinumExplosion ? "6vw" : "4vw"} color={badge.color} />
              </div>
              
              <motion.div className="mt-[2vw] flex flex-col items-center"
                animate={{ opacity: isPlatinumExplosion ? 0 : 1 }}>
                <span className="font-sans font-black text-[1.8vw] tracking-wide" style={{ color: badge.color }}>
                  {badge.name}
                </span>
                <span className="font-mono text-[1.2vw] text-white/50">
                  {badge.score}
                </span>
              </motion.div>
              
            </motion.div>
          );
        })}
      </div>
      
      {/* High Prestige Overlay text */}
      {phase >= 5 && (
        <motion.div className="absolute bottom-[15vh] flex flex-col items-center pointer-events-none"
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}>
          <h1 className="text-[6vw] font-black text-white italic tracking-tighter" style={{ textShadow: "0 0 40px rgba(255,255,255,0.5)" }}>
            TOP 5% GLOBALLY
          </h1>
        </motion.div>
      )}

    </motion.div>
  );
}
