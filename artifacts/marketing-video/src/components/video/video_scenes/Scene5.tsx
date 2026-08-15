import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';

const leaderboard = [
  { rank: 1, name: "ALEX_DEV", score: 9850, change: "+2" },
  { rank: 2, name: "SYS_ADMIN_99", score: 9620, change: "+1" },
  { rank: 3, name: "CODE_NINJA", score: 9400, change: "-1" },
];

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),   // Leaderboard rows
      setTimeout(() => setPhase(2), 1500),  // Split / sweep
      setTimeout(() => setPhase(3), 2000),  // CTA Reveal
      setTimeout(() => setPhase(4), 2800),  // Tagline
      setTimeout(() => setPhase(5), 4500),  // Exit / loop restart prep
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 bg-background overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}>

      {/* Leaderboard Phase */}
      <motion.div className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ y: 0 }}
        animate={phase >= 2 ? { y: "-100%" } : { y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}>
        
        <motion.h2 className="font-sans font-black text-[4vw] mb-[3vw] flex items-center gap-[1vw]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}>
          <Trophy size="4vw" className="text-primary" />
          PROVE YOU'RE THE BEST
        </motion.h2>

        <div className="w-[60vw] flex flex-col gap-[1vw]">
          {leaderboard.map((row, i) => (
            <motion.div key={row.rank}
              className="flex items-center bg-secondary/80 border border-white/5 rounded-lg p-[1.5vw]"
              initial={{ opacity: 0, x: -50 }}
              animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
              transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 300, damping: 25 }}>
              
              <div className="font-mono text-[2vw] font-bold text-primary w-[5vw]">{`0${row.rank}`}</div>
              <div className="font-sans font-bold text-[2vw] text-white flex-1">{row.name}</div>
              <div className="font-mono text-[2.5vw] font-black text-white">{row.score}</div>
              <div className="font-mono text-[1.2vw] text-[#10B981] ml-[2vw] flex items-center gap-[0.5vw]">
                <TrendingUp size="1.2vw" />
                {row.change}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Final CTA Phase */}
      <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-primary"
        initial={{ y: "100%" }}
        animate={phase >= 2 ? { y: 0 } : { y: "100%" }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}>
        
        <div className="absolute inset-0 bg-noise mix-blend-overlay" />

        <motion.div className="relative z-10 flex flex-col items-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={phase >= 3 ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.2 }}>
          
          <h1 className="font-sans font-black text-[8vw] text-white leading-none tracking-tighter shadow-2xl drop-shadow-2xl">
            IT INTERVIEW PREP
          </h1>
          
          <motion.div className="mt-[2vw] bg-white text-primary px-[3vw] py-[1vw] rounded-full font-sans font-bold text-[2vw] uppercase tracking-widest shadow-xl"
            initial={{ y: 50, opacity: 0 }}
            animate={phase >= 4 ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            Ace your next interview
          </motion.div>

        </motion.div>
      </motion.div>

    </motion.div>
  );
}
