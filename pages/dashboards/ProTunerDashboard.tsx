
import React from 'react';
import { useVehicleData } from '../../hooks/useVehicleData';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';

const ProTunerGauge: React.FC<{
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  redline?: number;
}> = ({ value, min, max, label, unit, redline }) => {
  const animatedValue = useAnimatedValue(value);

  const START_ANGLE = -125;
  const END_ANGLE = 125;
  const range = END_ANGLE - START_ANGLE;

  const valueRatio = (Math.max(min, Math.min(animatedValue, max)) - min) / (max - min);
  const angle = START_ANGLE + valueRatio * range;

  const redlineRatio = redline ? (redline - min) / (max - min) : 1;
  const redlineAngle = START_ANGLE + redlineRatio * range;

  const describeArc = (x:number, y:number, radius:number, startAngle:number, endAngle:number) => {
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    const start = {
        x: x + radius * Math.cos(startRad),
        y: y + radius * Math.sin(startRad)
    };
    const end = {
        x: x + radius * Math.cos(endRad),
        y: y + radius * Math.sin(endRad)
    };
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  }

  const numTicks = 9;

  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <radialGradient id="proTunerFace" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="85%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#000" />
          </radialGradient>
           <filter id="needleGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>

        {/* Face */}
        <circle cx="100" cy="100" r="90" fill="url(#proTunerFace)" />

        {/* Ticks */}
        {Array.from({ length: numTicks }).map((_, i) => {
            const tickVal = min + (i / (numTicks - 1)) * (max - min);
            const tickAngle = START_ANGLE + (i / (numTicks - 1)) * range;
            const isRed = redline && tickVal >= redline;
            return (
                <g key={i} transform={`rotate(${tickAngle} 100 100)`}>
                    <line 
                        x1="100" y1="18" x2="100" y2="28" 
                        stroke={isRed ? 'var(--theme-accent-red)' : 'var(--theme-text-secondary)'} 
                        strokeWidth="2" 
                    />
                     <text
                        x="100" y="40"
                        textAnchor="middle"
                        fill={isRed ? 'var(--theme-accent-red)' : 'white'}
                        fontSize="12"
                        transform={`rotate(${180} 100 40)`}
                        className="font-sans font-bold"
                     >
                        {label === 'RPM' ? tickVal / 1000 : tickVal}
                    </text>
                </g>
            )
        })}
        
        {redline && <path 
            d={describeArc(100, 100, 84, redlineAngle, END_ANGLE)}
            fill="none"
            stroke="var(--theme-accent-red)"
            strokeWidth="3"
        />}
        
        {/* Needle */}
        <g transform={`rotate(${angle} 100 100)`} style={{ transition: 'transform 0.1s ease-out' }}>
            <path d="M 100 120 L 100 25" stroke="var(--theme-needle-color)" strokeWidth="3" strokeLinecap="round" filter="url(#needleGlow)" />
        </g>
        <circle cx="100" cy="100" r="8" fill="#FFC300" />
        <circle cx="100" cy="100" r="5" fill="black" />

        {/* Digital display */}
        <foreignObject x="60" y="130" width="80" height="50">
             <div className="flex flex-col items-center justify-center text-center text-white w-full h-full">
                <div className="font-display font-bold text-3xl text-[var(--theme-accent-primary)]">{animatedValue.toFixed(0)}</div>
                <div className="font-sans text-sm uppercase text-gray-400">{unit}</div>
             </div>
        </foreignObject>
        <text x="100" y="90" textAnchor="middle" className="font-display font-bold text-xl fill-white uppercase">{label}</text>
      </svg>
    </div>
  );
};

const InfoBox: React.FC<{label: string, value: string | number, unit?: string}> = ({ label, value, unit}) => (
    <div className="bg-black/40 backdrop-blur-sm border-t-2 border-gray-600 p-2 text-center h-full flex flex-col justify-center">
        <div className="text-gray-400 text-xs uppercase font-sans tracking-widest">{label}</div>
        <div className="text-white text-2xl font-mono font-bold">
            {value}
            {unit && <span className="text-lg text-gray-400 ml-1">{unit}</span>}
        </div>
    </div>
)

const ProTunerDashboard: React.FC = () => {
    const { latestData } = useVehicleData();
    const d = latestData;
  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 theme-background z-0" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 grid grid-cols-12 gap-4 h-full items-center">
            
            {/* Left Gauge */}
            <div className="col-span-5 h-[400px]">
                <ProTunerGauge 
                    label="RPM"
                    unit="x1000"
                    value={d.rpm}
                    min={0}
                    max={8000}
                    redline={7000}
                />
            </div>
            
            {/* Center Info */}
            <div className="col-span-2 flex flex-col justify-center items-center h-full">
                <div className="text-center bg-black/30 backdrop-blur-sm p-4 rounded-xl border border-gray-700">
                    <div className="font-sans text-gray-400 text-lg">GEAR</div>
                    <div className="font-display text-9xl font-bold text-white -my-2">{d.gear}</div>
                </div>
            </div>

            {/* Right Gauge */}
            <div className="col-span-5 h-[400px]">
                 <ProTunerGauge 
                    label="SPEED"
                    unit="km/h"
                    value={d.speed}
                    min={0}
                    max={280}
                    redline={240}
                />
            </div>
            
            {/* Bottom Info Boxes */}
            <div className="col-start-3 col-span-2 h-20">
                <InfoBox label="Boost" value={d.turboBoost.toFixed(2)} unit="bar" />
            </div>
            <div className="col-span-2 h-20">
                 <InfoBox label="Coolant" value={d.engineTemp.toFixed(0)} unit="°C" />
            </div>
             <div className="col-span-2 h-20">
                 <InfoBox label="Oil Press." value={d.oilPressure.toFixed(1)} unit="bar" />
            </div>
            <div className="col-span-2 h-20">
                 <InfoBox label="Voltage" value={d.batteryVoltage.toFixed(1)} unit="V" />
            </div>

        </div>
    </div>
  );
};

export default ProTunerDashboard;
