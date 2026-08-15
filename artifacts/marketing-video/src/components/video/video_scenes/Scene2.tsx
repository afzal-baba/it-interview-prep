import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Database, Server, Coffee, FileCode, Cloud, Terminal } from 'lucide-react';

const courses = [
  { name: "ORACLE", icon: Database, color: "#F80000" },
  { name: "SAP", icon: Server, color: "#008FD3" },
  { name: "JAVA", icon: Coffee, color: "#E76F00" },
  { name: "PYTHON", icon: FileCode, color: "#FFD43B" },
  { name: "AWS", icon: Cloud, color: "#FF9900" },
  { name: "LINUX", icon: Terminal, color: "#FCC624" }
];

export function Scene2() {
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    // Rapid fire: ~400ms per course
    const timers = courses.map((_, i) => 
      setTimeout(() => setActiveIdx(i), i * 350)
    );
    // End sequence
    timers.push(setTimeout(() => setActiveIdx(-2), courses.length * 350 + 200));

    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center bg-background"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, x: "-10%" }}
      transition={{ duration: 0.5, ease: "easeInOut" }}>
      
      {/* Background kinetic typography tracks */}
      <div className="absolute inset-0 overflow-hidden flex flex-col justify-around opacity-10">
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} className="whitespace-nowrap font-sans font-black text-[8vw]"
            animate={{ x: i % 2 === 0 ? ["0%", "-50%"] : ["-50%", "0%"] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}>
            SELECT YOUR PATH SELECT YOUR PATH SELECT YOUR PATH SELECT YOUR PATH
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 w-[80vw] h-[60vh] flex flex-wrap justify-center gap-[2vw] content-center">
        {courses.map((course, i) => {
          const isActive = activeIdx === i;
          const Icon = course.icon;
          
          return (
            <motion.div key={course.name} 
              className="flex flex-col items-center justify-center bg-secondary border border-white/10 rounded-2xl w-[24vw] h-[15vw]"
              initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
              animate={
                activeIdx >= i 
                  ? isActive 
                    ? { opacity: 1, scale: 1.1, rotateY: 0, zIndex: 20, borderColor: course.color, boxShadow: `0 0 40px ${course.color}40` }
                    : { opacity: 0.4, scale: 0.95, rotateY: 0, zIndex: 10, borderColor: "rgba(255,255,255,0.1)", boxShadow: "none" }
                  : { opacity: 0, scale: 0.8, rotateY: 90 }
              }
              transition={{ type: "spring", stiffness: 400, damping: 25 }}>
              <Icon size="5vw" color={isActive ? course.color : "#ffffff"} className="mb-[1vw]" />
              <span className="font-sans font-black text-[2.5vw] tracking-wider" style={{ color: isActive ? course.color : "#ffffff" }}>
                {course.name}
              </span>
            </motion.div>
          );
        })}
      </div>
      
      {/* Final punchy text overlay at the end of sequence */}
      <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0, scale: 2 }}
        animate={activeIdx === -2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 2 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}>
        <h2 className="text-[8vw] font-black text-white bg-primary px-8 py-4 transform -rotate-3 uppercase">
          Master Them All
        </h2>
      </motion.div>
      
    </motion.div>
  );
}
