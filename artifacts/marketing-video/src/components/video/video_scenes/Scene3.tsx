import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const questionText = "Which HTTP method is idempotent and used to replace a resource entirely?";
const options = [
  { id: "A", text: "POST" },
  { id: "B", text: "PUT", correct: true },
  { id: "C", text: "PATCH" },
  { id: "D", text: "DELETE" }
];

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),   // Question reveals
      setTimeout(() => setPhase(2), 1000),  // Options appear
      setTimeout(() => setPhase(3), 2000),  // Select B
      setTimeout(() => setPhase(4), 2600),  // Correct feedback
      setTimeout(() => setPhase(5), 3500),  // Sweep exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center bg-background"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "-100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}>
      
      {/* Code syntax background pattern */}
      <div className="absolute inset-0 font-mono text-[1vw] text-white/5 opacity-50 p-8 whitespace-pre">
        {`interface ResourceProps {
  id: string;
  method: string;
  payload: any;
}
const apiHandler = async (req: Request) => {
  if (req.method === 'PUT') {
    // Replaces entirely
  }
};
`.repeat(10)}
      </div>

      <div className="relative z-10 w-[70vw]">
        {/* Question Header */}
        <motion.div className="bg-secondary border-l-[0.5vw] border-primary p-[3vw] mb-[2vw] shadow-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, ease: "easeOut" }}>
          <h3 className="font-mono text-primary text-[1.5vw] mb-[1vw]">QUESTION 04 // ADVANCED</h3>
          <p className="font-sans font-semibold text-[2.5vw] leading-snug">{questionText}</p>
        </motion.div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-[1.5vw]">
          {options.map((opt, i) => {
            const isSelected = phase >= 3 && opt.correct; // simulate correct choice
            const isCorrectFeedback = phase >= 4 && opt.correct;

            let bgColor = "bg-secondary";
            let borderColor = "border-white/10";
            let textColor = "text-white";

            if (isSelected) {
              bgColor = "bg-primary/20";
              borderColor = "border-primary";
            }
            if (isCorrectFeedback) {
              bgColor = "bg-[#10B981]"; // Emerald
              borderColor = "border-[#10B981]";
              textColor = "text-white";
            }

            return (
              <motion.div key={opt.id}
                className={`relative flex items-center p-[2vw] border-2 rounded-xl transition-colors duration-300 ${bgColor} ${borderColor} ${textColor}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={phase >= 2 ? { opacity: 1, scale: isSelected ? 1.05 : 1 } : { opacity: 0, scale: 0.9 }}
                transition={{ delay: phase === 2 ? i * 0.1 : 0, type: "spring", stiffness: 400, damping: 30 }}>
                
                <span className="font-mono font-bold text-[2vw] mr-[2vw] opacity-50">{opt.id}</span>
                <span className="font-sans font-medium text-[2vw]">{opt.text}</span>

                {isCorrectFeedback && (
                  <motion.div className="absolute right-[2vw] font-black text-[2vw]"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", bounce: 0.5 }}>
                    ✓
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
      
    </motion.div>
  );
}
