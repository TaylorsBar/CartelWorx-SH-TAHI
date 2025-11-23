
import React from 'react';
import { useVehicleData } from '../../hooks/useVehicleData';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';

// --- Icons ---
const TurnLeftIcon = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#333]"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
);
const TurnRightIcon = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#333]"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
);
const ParkingIcon = () => (
    <div className="w-8 h-8 rounded-full border-2 border-[#333] flex items-center justify-center text-[#333] font-bold text-sm">P</div>
);
const LightsIcon = () => (
    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#333]"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.93 12.37 7 10.79 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.79-.93 3.37-2.15 4.1z"/></svg>
);

// --- Components ---

const HaltechDataWidget: React.FC<{ 
    label: string; 
    value: number | string; 
    unit?: string; 
    color?: string; 
    side?: 'left' | 'right';
    barColor?: string;
    selected?: boolean;
}> = ({ label, value, unit, color = 'text-white', side = 'left', barColor = 'bg-[#D4AF37]', selected = false }) => {
    return (
        <div className={`relative w-full h-full min-h-[90px] bg-gradient-to-b from-[#2a2a2a] to-[#111] border-y border-gray-800 flex flex-col justify-center px-4 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] group ${selected ? 'ring-2 ring-cyan-400 z-10' : ''}`}>
            
            {/* Side Accent Bar */}
            <div className={`absolute top-0 bottom-0 w-4 ${barColor} shadow-[inset_0_0_5px_rgba(0,0,0,0.5)] ${side === 'left' ? 'left-0' : 'right-0'}`}>
                {/* Texture lines on the bar */}
                <div className="w-full h-full flex flex-col justify-between py-1 opacity-30">
                     {Array.from({length: 10}).map((_, i) => <div key={i} className="h-[1px] bg-black w-full"></div>)}
                </div>
            </div>
            
            {/* Gloss Highlight */}
            <div className="absolute top-0 left-0 right-0 h-[35%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

            <div className={`flex flex-col z-10 ${side === 'left' ? 'pl-6 items-start' : 'pr-6 items-end'}`}>
                <div className="flex items-baseline gap-1">
                     <span className={`font-display font-bold text-5xl tracking-tighter drop-shadow-md ${color}`}>
                        {value}
                    </span>
                    {unit && <span className="text-[#D4AF37] font-bold text-sm mb-1">{unit}</span>}
                </div>
                <span className="text-gray-400 font-bold text-xs uppercase tracking-wide">{label}</span>
            </div>
        </div>
    );
};

const IC7Tachometer: React.FC<{ rpm: number; gear: number | string; speed: number }> = ({ rpm, gear, speed }) => {
    const animatedRpm = useAnimatedValue(rpm, { duration: 50 });
    
    // Config
    const MIN_RPM = 0;
    const MAX_RPM = 8000;
    const START_ANGLE = 135; // 7-8 o'clock
    const END_ANGLE = 405;   // 4-5 o'clock
    const ANGLE_RANGE = END_ANGLE - START_ANGLE;
    
    // The bands in the specific image are:
    // 0 - 6000: Yellow
    // 6000 - 8000: Red
    const YELLOW_END_RPM = 6000;
    
    const size = 600;
    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = 290;
    const innerRadius = 200;

    const valueToAngle = (val: number) => {
        const ratio = (val - MIN_RPM) / (MAX_RPM - MIN_RPM);
        return START_ANGLE + ratio * ANGLE_RANGE;
    };

    const yellowEndAngle = valueToAngle(YELLOW_END_RPM);
    const needleAngle = valueToAngle(animatedRpm);

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    // Helper to draw donut segments
    const describeDonutSegment = (x: number, y: number, rOuter: number, rInner: number, start: number, end: number) => {
        const outerStart = polarToCartesian(x, y, rOuter, end);
        const outerEnd = polarToCartesian(x, y, rOuter, start);
        const innerStart = polarToCartesian(x, y, rInner, end);
        const innerEnd = polarToCartesian(x, y, rInner, start);
        const largeArcFlag = end - start <= 180 ? "0" : "1";

        return [
            "M", outerStart.x, outerStart.y,
            "A", rOuter, rOuter, 0, largeArcFlag, 0, outerEnd.x, outerEnd.y,
            "L", innerEnd.x, innerEnd.y,
            "A", rInner, rInner, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
            "Z"
        ].join(" ");
    };

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-h-[90vh]">
                <defs>
                    <linearGradient id="yellowBand" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FFC800" />
                        <stop offset="100%" stopColor="#FDB931" />
                    </linearGradient>
                    <linearGradient id="redBand" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FF0000" />
                        <stop offset="100%" stopColor="#CC0000" />
                    </linearGradient>
                    <filter id="needleShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="2" dy="4" stdDeviation="2" floodOpacity="0.5"/>
                    </filter>
                </defs>

                {/* 1. Yellow Zone (0 - 6k) */}
                <path 
                    d={describeDonutSegment(cx, cy, outerRadius, innerRadius, START_ANGLE, yellowEndAngle)}
                    fill="url(#yellowBand)"
                    stroke="#111"
                    strokeWidth="2"
                />

                {/* 2. Red Zone (6k - 8k) */}
                <path 
                    d={describeDonutSegment(cx, cy, outerRadius, innerRadius, yellowEndAngle, END_ANGLE)}
                    fill="url(#redBand)"
                    stroke="#111"
                    strokeWidth="2"
                />

                {/* 3. Ticks & Numbers */}
                {Array.from({ length: 9 }).map((_, i) => {
                    const tickVal = i * 1000;
                    const angle = valueToAngle(tickVal);
                    // Major Ticks (on the outer edge)
                    const p1 = polarToCartesian(cx, cy, outerRadius, angle);
                    const p2 = polarToCartesian(cx, cy, outerRadius - 15, angle);
                    
                    // Numbers
                    // Positioned in the middle of the band
                    const textPos = polarToCartesian(cx, cy, (innerRadius + outerRadius) / 2, angle);
                    const isRedZone = tickVal >= YELLOW_END_RPM;
                    
                    return (
                        <g key={i}>
                            {/* Tick Mark */}
                            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="black" strokeWidth="3" />
                            
                            {/* Number */}
                            <text 
                                x={textPos.x} 
                                y={textPos.y} 
                                dy="0.35em"
                                textAnchor="middle" 
                                fontSize="55" 
                                fontFamily="sans-serif" 
                                fontWeight="900" 
                                fill={isRedZone ? "white" : "black"}
                                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                            >
                                {i}
                            </text>
                            
                            {/* Minor Ticks */}
                            {i < 8 && Array.from({length: 1}).map((__, j) => {
                                const subAngle = valueToAngle(tickVal + 500);
                                const s1 = polarToCartesian(cx, cy, outerRadius, subAngle);
                                const s2 = polarToCartesian(cx, cy, outerRadius - 10, subAngle);
                                return <line key={`${i}-${j}`} x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="black" strokeWidth="2" />
                            })}
                        </g>
                    );
                })}

                {/* 4. Center Area */}
                <circle cx={cx} cy={cy} r={innerRadius} fill="black" stroke="#222" strokeWidth="4" />

                {/* 5. Center Logos */}
                <g transform={`translate(${cx}, ${cy - 50})`}>
                    <rect x="-30" y="-50" width="60" height="30" rx="4" stroke="white" strokeWidth="2" fill="none" opacity="0.8" />
                    <text x="0" y="-28" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" opacity="0.9">iC-7</text>
                    
                    <text x="0" y="20" textAnchor="middle" fill="#FFC800" fontSize="48" fontWeight="900" style={{ fontStyle: "italic", letterSpacing: "-1px" }} stroke="white" strokeWidth="0.5">
                        Haltech
                    </text>
                </g>
                
                {/* 6. Center Icons (Engine, Battery, Oil) */}
                <g transform={`translate(${cx}, ${cy + 60})`}>
                    <path d="M-60 0 H-40 V20 H-60 Z" fill="#222" />
                    <path d="M-10 0 H10 V20 H-10 Z" fill="#222" />
                    <path d="M40 0 H60 V20 H40 Z" fill="#222" />
                </g>

                {/* 7. Needle */}
                <g transform={`rotate(${needleAngle} ${cx} ${cy})`} filter="url(#needleShadow)">
                    <path 
                        d={`M ${cx} ${cy - 40} L ${cx} ${cy - outerRadius + 5} L ${cx - 4} ${cy - 40} Z`} 
                        fill="#D00" 
                        stroke="#900"
                        strokeWidth="1"
                    />
                    <circle cx={cx} cy={cy} r="18" fill="#B00" stroke="#600" strokeWidth="2" />
                </g>

            </svg>
            
            {/* 8. Gear / Trip Cutout Overlay */}
            <div className="absolute top-[55%] left-[55%] w-[42%] h-[35%] z-20">
                {/* The "Cutout" graphic border */}
                <div className="w-full h-full border-l-2 border-t-2 border-gray-600 rounded-tl-[30px] bg-black/90 p-1 flex">
                     {/* Big Gear */}
                    <div className="w-1/2 flex flex-col items-center justify-center border-r border-gray-700">
                        <span className="text-white font-display font-black text-8xl leading-none">
                            {gear}
                        </span>
                        <span className="text-gray-400 font-bold text-xs uppercase mt-1">Gear</span>
                    </div>
                    {/* Trip / Odo */}
                    <div className="w-1/2 flex flex-col justify-center px-4 space-y-3">
                        <div className="flex flex-col items-end">
                            <div className="text-white font-mono font-bold text-3xl leading-none">0.0</div>
                            <div className="text-gray-400 text-[10px] font-bold uppercase mt-1">Trip <span className="text-[9px] align-top">km</span></div>
                        </div>
                         <div className="w-full h-px bg-gray-700"></div>
                        <div className="flex flex-col items-end">
                            <div className="text-white font-mono font-bold text-xl leading-none">0</div>
                            <div className="text-gray-400 text-[10px] font-bold uppercase mt-1">Odo</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HaltechDashboard: React.FC = () => {
    const { latestData } = useVehicleData();
    const d = latestData;
    const animatedSpeed = useAnimatedValue(d.speed);
    
    // Formatting values to match image style
    const mapKpa = (d.turboBoost * 100).toFixed(0); 
    const coolantTemp = d.engineTemp.toFixed(0);
    const airTemp = d.inletAirTemp.toFixed(0);
    const injectorDuty = d.engineLoad.toFixed(0);
    
    return (
        <div className="w-full h-full bg-black flex flex-col overflow-hidden font-sans select-none text-white">
            {/* Top Status Bar */}
            <div className="h-10 bg-[#1a1a1a] flex justify-between items-center px-4 border-b border-gray-800">
                <div className="flex gap-4 opacity-30">
                    <TurnLeftIcon />
                    <ParkingIcon />
                </div>
                <div className="flex gap-4 opacity-30">
                    <LightsIcon />
                    <TurnRightIcon />
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 grid grid-cols-4 gap-1 bg-black p-1">
                
                {/* LEFT COLUMN */}
                <div className="col-span-1 grid grid-rows-4 gap-1">
                    <HaltechDataWidget label="MAP" value="-101" unit="kPa" color="text-[#D4AF37]" side="left" />
                    <HaltechDataWidget label="Coolant Temp" value="-273" unit="°C" color="text-red-600" side="left" />
                    <HaltechDataWidget label="Air Temp" value="-273" unit="°C" color="text-red-600" side="left" selected={true} />
                    <HaltechDataWidget label="Injector Duty %" value="0" color="text-[#D4AF37]" side="left" />
                </div>

                {/* CENTER (Tachometer) */}
                <div className="col-span-2 relative bg-black flex items-center justify-center p-2">
                    <IC7Tachometer rpm={d.rpm} gear={d.gear === 0 ? "N" : d.gear} speed={d.speed} />
                </div>

                {/* RIGHT COLUMN */}
                <div className="col-span-1 grid grid-rows-4 gap-1">
                    <HaltechDataWidget label="Ignition Angle" value="0" color="text-[#D4AF37]" side="right" />
                    <HaltechDataWidget label="Throttle" value="0" unit="%" color="text-[#D4AF37]" side="right" />
                    <HaltechDataWidget label="DashBatt" value="0.00" unit="V" color="text-red-600" side="right" />
                    <HaltechDataWidget label="Speed" value={animatedSpeed.toFixed(0)} unit="km/h" color="text-[#D4AF37]" side="right" />
                </div>

            </div>
        </div>
    );
};

export default HaltechDashboard;
