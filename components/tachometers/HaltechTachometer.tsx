import React from 'react';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';

interface HaltechTachometerProps {
  rpm: number;
  speed: number;
  gear: number;
}

const RPM_MAX = 10000;
const REDLINE_START = 8000;

const HaltechTachometer: React.FC<HaltechTachometerProps> = ({ rpm, speed, gear }) => {
  const animatedRpm = useAnimatedValue(rpm);
  const animatedSpeed = useAnimatedValue(speed);

  const rpmToAngle = (r: number) => {
    const minAngle = -150;
    const maxAngle = 150;
    const ratio = Math.max(0, Math.min(r, RPM_MAX)) / RPM_MAX;
    return minAngle + ratio * (maxAngle - minAngle);
  };
  
  const needleAngle = rpmToAngle(animatedRpm);
  const redGlowOpacity = Math.max(0, (animatedRpm - 2000) / (RPM_MAX - 2000));

  const redlineStartAngle = rpmToAngle(REDLINE_START);
  const redlineEndAngle = rpmToAngle(RPM_MAX);
  
  const describeArc = (x:number, y:number, radius:number, startAngle:number, endAngle:number) => {
    const start = {
        x: x + radius * Math.cos((startAngle - 90) * Math.PI / 180),
        y: y + radius * Math.sin((startAngle - 90) * Math.PI / 180)
    };
    const end = {
        x: x + radius * Math.cos((endAngle - 90) * Math.PI / 180),
        y: y + radius * Math.sin((endAngle - 90) * Math.PI / 180)
    };
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  }


  return (
    <div className="relative w-full h-full max-w-[500px] aspect-square">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <radialGradient id="brushed-metal" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" style={{stopColor: '#f0f0f0'}} />
            <stop offset="100%" style={{stopColor: 'var(--theme-haltech-silver)'}} />
          </radialGradient>
          <radialGradient id="red-glow" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="var(--theme-haltech-red)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--theme-haltech-red)" stopOpacity="0" />
          </radialGradient>
           <filter id="needle-glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Bezel */}
        <path d="M 20 5 L 180 5 L 195 20 L 195 180 L 180 195 L 20 195 L 5 180 L 5 20 Z" fill="url(#brushed-metal)" />
        <path d="M 22 7 L 178 7 L 193 22 L 193 178 L 178 193 L 22 193 L 7 178 L 7 22 Z" fill="var(--theme-haltech-dark-gray)" />
        
        {/* Face */}
        <circle cx="100" cy="100" r="90" fill="black" />
        
        {/* Red inner glow */}
        <circle cx="100" cy="100" r="50" fill="url(#red-glow)" style={{opacity: redGlowOpacity, transition: 'opacity 0.2s ease-in-out'}} />

        {/* Ticks and Numbers */}
        {Array.from({ length: 11 }).map((_, i) => {
            const r = i * 1000;
            const angle = rpmToAngle(r);
            const isMajorTick = i % 1 === 0;
            return (
                <g key={`tick-${i}`} transform={`rotate(${angle} 100 100)`}>
                    <line x1="100" y1="15" x2="100" y2={isMajorTick ? "25" : "20"} stroke="var(--theme-text-secondary)" strokeWidth="1.5" />
                     {isMajorTick && <text
                        x="100"
                        y="35"
                        textAnchor="middle"
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                        className="font-sans"
                     >
                        {i}
                    </text>}
                </g>
            )
        })}

        {/* Redline Block */}
        <path d={describeArc(100, 100, 80, redlineStartAngle, redlineEndAngle)} fill="none" stroke="var(--theme-haltech-red)" strokeWidth="10" />

        {/* Center Digital Displays */}
        <foreignObject x="50" y="80" width="100" height="60">
            <div className="flex flex-col items-center justify-center text-center text-white w-full h-full">
                <div className="flex items-baseline justify-between w-full px-2">
                    <div className="flex flex-col items-center">
                        <span className="font-sans text-xs text-gray-400">Speed</span>
                        <span className="font-display font-bold text-3xl">{animatedSpeed.toFixed(0)}</span>
                    </div>
                     <div className="flex flex-col items-center">
                        <span className="font-sans text-xs text-gray-400">Gear</span>
                        <span className="font-display font-bold text-3xl">{gear}</span>
                    </div>
                </div>
            </div>
        </foreignObject>
        
        {/* Needle */}
        <g transform={`rotate(${needleAngle} 100 100)`} style={{ transition: 'transform 0.1s cubic-bezier(.4, 0, .2, 1)' }}>
          <path d="M 100 100 L 100 12" stroke="var(--theme-needle-color)" strokeWidth="2" strokeLinecap="round" filter="url(#needle-glow)" />
          <path d="M 100 108 L 100 100" stroke="var(--theme-needle-color)" strokeWidth="4" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="5" fill="#111" stroke="#333" strokeWidth="1" />
      </svg>
    </div>
  );
};

export default HaltechTachometer;
