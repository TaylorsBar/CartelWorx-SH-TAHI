
import React, { useState, useEffect } from 'react';
import { useVehicleData } from '../../hooks/useVehicleData';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';

// --- Icons (Inline SVGs for reliability) ---
const TurnLeftIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" className={`w-6 h-6 transition-colors duration-200 ${active ? 'fill-green-500 animate-pulse filter drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'fill-[#222]'}`}><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
);
const TurnRightIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" className={`w-6 h-6 transition-colors duration-200 ${active ? 'fill-green-500 animate-pulse filter drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'fill-[#222]'}`}><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
);
const ParkingIcon = ({ active }: { active: boolean }) => (
    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-display font-bold text-xs transition-colors duration-200 ${active ? 'border-red-500 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'border-[#222] text-[#222]'}`}>P</div>
);
const HighBeamIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" className={`w-6 h-6 transition-colors duration-200 ${active ? 'fill-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'fill-[#222]'}`}><path d="M5.5,16.5L2,12l3.5-4.5H12V6H4A2,2,0,0,0,2,8v8a2,2,0,0,0,2,2h8v-1.5H5.5M22,12l-3.5,4.5H12V18h8a2,2,0,0,0,2-2V8a2,2,0,0,0-2-2h-8v1.5h6.5M12,14h-1v-4h1V14z"/></svg>
);
const CheckEngineIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" className={`w-6 h-6 transition-colors duration-200 ${active ? 'fill-amber-500 animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'fill-[#222]'}`}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg> 
);
const BatteryIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" className={`w-6 h-6 transition-colors duration-200 ${active ? 'fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'fill-[#222]'}`}><path d="M16.67,4H15V2H9V4H7.33A1.33,1.33,0,0,0,6,5.33V20.67C6,21.4,6.6,22,7.33,22H16.67A1.33,1.33,0,0,0,18,20.67V5.33A1.33,1.33,0,0,0,16.67,4M15,18H9V16h6Zm0-4H9V12h6Zm0-4H9V8h6Z"/></svg>
);

// --- Components ---

// Sequential Shift Light Array
const ShiftLights: React.FC<{ rpm: number; limit: number }> = ({ rpm, limit }) => {
    const percentage = rpm / limit;
    const isShiftNow = percentage >= 0.95;
    
    const getLedState = (index: number) => {
        if (isShiftNow) return 'bg-blue-500 animate-pulse shadow-[0_0_15px_#3b82f6] border-blue-300';
        
        let threshold = 0;
        let activeColor = '';
        let borderColor = '';
        
        if (index < 4) { // Green LEDs
            threshold = 0.50 + (index * 0.08); 
            activeColor = 'bg-green-500 shadow-[0_0_12px_#22c55e]';
            borderColor = 'border-green-400';
        } else if (index < 7) { // Yellow LEDs
            threshold = 0.82 + ((index - 4) * 0.04);
            activeColor = 'bg-yellow-400 shadow-[0_0_12px_#facc15]';
            borderColor = 'border-yellow-200';
        } else { // Red LEDs
            threshold = 0.94;
            activeColor = 'bg-red-600 shadow-[0_0_12px_#ef4444]';
            borderColor = 'border-red-400';
        }

        return percentage >= threshold ? `${activeColor} border ${borderColor}` : 'bg-[#151515] border border-[#222]';
    };

    return (
        <div className="flex justify-center items-center gap-1.5 py-3 bg-gradient-to-b from-[#111] to-black border-b border-[#222] shadow-lg relative z-10">
            {Array.from({ length: 8 }).map((_, i) => (
                <div 
                    key={i} 
                    className={`w-12 h-5 rounded-[2px] skew-x-[-10deg] transition-all duration-75 ${getLedState(i)}`}
                />
            ))}
        </div>
    );
};

const HaltechDataWidget: React.FC<{ 
    label: string; 
    value: number | string; 
    unit?: string; 
    color?: string; 
    side?: 'left' | 'right';
    barColor?: string;
    warning?: boolean;
    critical?: boolean;
}> = ({ label, value, unit, color = 'text-white', side = 'left', barColor = 'bg-[#D4AF37]', warning = false, critical = false }) => {
    
    // Critical state overrides everything
    const bgColor = critical 
        ? 'bg-red-900/60 animate-pulse border-red-500 shadow-[inset_0_0_20px_rgba(255,0,0,0.5)]' 
        : (warning ? 'bg-yellow-900/30 border-yellow-600' : 'bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border-[#2a2a2a]');

    const textColor = critical ? 'text-white' : (warning ? 'text-yellow-100' : color);
    const accentBar = critical ? 'bg-red-500' : (warning ? 'bg-yellow-500' : barColor);
    const labelColor = critical ? 'text-red-200' : 'text-gray-400';

    return (
        <div className={`relative w-full h-full min-h-[100px] border-y ${bgColor} flex flex-col justify-center px-5 shadow-[0_4px_6px_rgba(0,0,0,0.5)] group overflow-hidden`}>
            
            {/* Side Accent Bar */}
            <div className={`absolute top-0 bottom-0 w-3 ${accentBar} shadow-[0_0_10px_rgba(0,0,0,0.5)] ${side === 'left' ? 'left-0' : 'right-0'}`}>
                <div className="w-full h-full flex flex-col justify-between py-1 opacity-40">
                     {Array.from({length: 12}).map((_, i) => <div key={i} className="h-[1px] bg-black w-full"></div>)}
                </div>
            </div>
            
            {/* Gloss Highlight */}
            <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

            <div className={`flex flex-col z-10 ${side === 'left' ? 'pl-4 items-start' : 'pr-4 items-end'}`}>
                <div className="flex items-baseline gap-1.5">
                     <span className={`font-display font-bold text-4xl lg:text-5xl tracking-tighter drop-shadow-lg ${textColor}`}>
                        {value}
                    </span>
                    {unit && <span className={`${critical ? 'text-white' : 'text-[#D4AF37]'} font-bold font-mono text-xs lg:text-sm mb-1 opacity-80`}>{unit}</span>}
                </div>
                <div className="flex items-center gap-2 mt-[-4px]">
                    {critical && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>}
                    <span className={`${labelColor} font-bold text-[10px] lg:text-xs uppercase tracking-[0.1em] font-sans`}>{label}</span>
                </div>
            </div>
        </div>
    );
};

const IC7Tachometer: React.FC<{ rpm: number; gear: number | string; speed: number; peakRpm: number }> = ({ rpm, gear, speed, peakRpm }) => {
    // Config
    const MIN_RPM = 0;
    const MAX_RPM = 8000;
    const START_ANGLE = 135; 
    const END_ANGLE = 405;   
    const ANGLE_RANGE = END_ANGLE - START_ANGLE;
    const YELLOW_END_RPM = 6000;
    
    const size = 600;
    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = 280;
    const innerRadius = 210;

    const valueToAngle = (val: number) => {
        const ratio = (val - MIN_RPM) / (MAX_RPM - MIN_RPM);
        return START_ANGLE + ratio * ANGLE_RANGE;
    };

    const yellowEndAngle = valueToAngle(YELLOW_END_RPM);
    const needleAngle = valueToAngle(rpm);
    const peakAngle = valueToAngle(peakRpm);

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

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
        <div className="relative w-full h-full flex items-center justify-center p-4">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full max-h-[85vh] drop-shadow-2xl">
                <defs>
                    <linearGradient id="yellowBand" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FFD700" />
                        <stop offset="100%" stopColor="#FFA500" />
                    </linearGradient>
                    <linearGradient id="redBand" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FF3300" />
                        <stop offset="100%" stopColor="#800000" />
                    </linearGradient>
                    <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#2a2a2a" />
                        <stop offset="70%" stopColor="#111" />
                        <stop offset="100%" stopColor="#000" />
                    </radialGradient>
                     {/* Carbon Fiber Pattern Definition */}
                    <pattern id="carbonPattern" patternUnits="userSpaceOnUse" width="8" height="8">
                        <rect width="8" height="8" fill="#111" />
                        <path d="M0 0 L8 8 M8 0 L0 8" stroke="#222" strokeWidth="1" />
                    </pattern>
                    <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
                         <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                         <feMerge>
                             <feMergeNode in="coloredBlur"/>
                             <feMergeNode in="SourceGraphic"/>
                         </feMerge>
                    </filter>
                    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="black" floodOpacity="0.8"/>
                    </filter>
                </defs>

                {/* 1. Gauge Face Background */}
                <circle cx={cx} cy={cy} r={outerRadius + 10} fill="#1a1a1a" stroke="#333" strokeWidth="4" />

                {/* 2. Yellow Zone (0 - 6k) */}
                <path 
                    d={describeDonutSegment(cx, cy, outerRadius, innerRadius, START_ANGLE, yellowEndAngle)}
                    fill="url(#yellowBand)"
                    stroke="none"
                    opacity="0.9"
                />

                {/* 3. Red Zone (6k - 8k) */}
                <path 
                    d={describeDonutSegment(cx, cy, outerRadius, innerRadius, yellowEndAngle, END_ANGLE)}
                    fill="url(#redBand)"
                    stroke="none"
                    filter="url(#needleGlow)" 
                />

                {/* 4. Ticks & Numbers */}
                {Array.from({ length: 9 }).map((_, i) => {
                    const tickVal = i * 1000;
                    const angle = valueToAngle(tickVal);
                    // Major Ticks
                    const p1 = polarToCartesian(cx, cy, outerRadius, angle);
                    const p2 = polarToCartesian(cx, cy, outerRadius - 20, angle);
                    
                    const textPos = polarToCartesian(cx, cy, innerRadius - 35, angle);
                    const isRedZone = tickVal >= YELLOW_END_RPM;
                    
                    return (
                        <g key={i}>
                            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="white" strokeWidth="4" />
                            {/* Minor Ticks */}
                            {i < 8 && Array.from({length: 1}).map((__, j) => {
                                const subAngle = valueToAngle(tickVal + 500);
                                const s1 = polarToCartesian(cx, cy, outerRadius, subAngle);
                                const s2 = polarToCartesian(cx, cy, outerRadius - 12, subAngle);
                                return <line key={`${i}-${j}`} x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="white" strokeWidth="2" opacity="0.6" />
                            })}
                            
                             <text 
                                x={textPos.x} 
                                y={textPos.y} 
                                dy="0.35em"
                                textAnchor="middle" 
                                fontSize="42" 
                                fontFamily="Orbitron" 
                                fontWeight="700" 
                                fill={isRedZone ? "#FF4444" : "#FFF"}
                                style={{ transformBox: "fill-box", transformOrigin: "center" }}
                                filter="url(#textShadow)"
                            >
                                {i}
                            </text>
                        </g>
                    );
                })}

                {/* 5. Center Hub with Carbon Fiber */}
                <circle cx={cx} cy={cy} r={innerRadius - 5} fill="url(#centerGradient)" stroke="#333" strokeWidth="2" />
                <circle cx={cx} cy={cy} r={innerRadius - 20} fill="url(#carbonPattern)" opacity="0.4" />

                {/* 6. Branding */}
                <g transform={`translate(${cx}, ${cy - 70})`}>
                     <text x="0" y="0" textAnchor="middle" fill="#00AEEF" fontSize="38" fontWeight="900" style={{ fontStyle: "italic" }} filter="url(#textShadow)">
                        CARTEL<tspan fill="white">WORX</tspan>
                    </text>
                    <text x="0" y="25" textAnchor="middle" fill="#666" fontSize="14" fontWeight="bold" letterSpacing="2">GENESIS TELEMETRY</text>
                </g>

                {/* 7. Peak Hold Indicator */}
                <line 
                    x1={cx} y1={cy - innerRadius} 
                    x2={cx} y2={cy - outerRadius} 
                    stroke="#00AEEF" 
                    strokeWidth="4"
                    strokeOpacity="0.8"
                    transform={`rotate(${peakAngle - 90} ${cx} ${cy})`}
                />

                {/* 8. The Needle */}
                <g transform={`rotate(${needleAngle} ${cx} ${cy})`} filter="url(#needleGlow)" className="transition-transform duration-100 ease-out">
                    {/* Main blade */}
                    <path 
                        d={`M ${cx} ${cy - 40} L ${cx} ${cy - outerRadius + 5} L ${cx - 6} ${cy - 40} Z`} 
                        fill="#FF2200" 
                        stroke="#CC0000"
                        strokeWidth="1"
                    />
                    {/* Center cap */}
                    <circle cx={cx} cy={cy} r="25" fill="#111" stroke="#333" strokeWidth="2" />
                    <circle cx={cx} cy={cy} r="8" fill="#333" />
                </g>
                
                {/* 9. Glass Reflection Overlay */}
                <path d={`M ${cx-outerRadius} ${cy} A ${outerRadius} ${outerRadius} 0 0 1 ${cx+outerRadius} ${cy} L ${cx+outerRadius} ${cy-outerRadius} L ${cx-outerRadius} ${cy-outerRadius} Z`} fill="url(#glassGradient)" opacity="0.1" pointerEvents="none" />
                <defs>
                    <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="white" stopOpacity="0"/>
                    </linearGradient>
                </defs>

            </svg>
            
            {/* 10. Digital Gear & Speed Cutout */}
            <div className="absolute top-[58%] left-[50%] transform -translate-x-1/2 w-[280px] h-[160px] z-20">
                <div className="w-full h-full bg-[#0a0a0a]/95 border-t-2 border-gray-700 rounded-t-3xl shadow-2xl flex flex-col items-center justify-center p-2 backdrop-blur-sm">
                     <div className="flex items-baseline gap-4">
                        <span className="text-white font-display font-black text-8xl leading-none drop-shadow-md">
                            {gear}
                        </span>
                        <div className="flex flex-col items-start">
                             <span className="text-gray-400 font-bold text-xs uppercase">Gear</span>
                             <div className="h-px w-10 bg-gray-600 my-1"></div>
                             <span className="text-white font-mono font-bold text-3xl leading-none">{speed}</span>
                             <span className="text-gray-500 font-bold text-[10px] uppercase">km/h</span>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

const HaltechDashboard: React.FC = () => {
    const { latestData, ekfStats, hasActiveFault } = useVehicleData();
    const d = latestData;
    const animatedSpeed = useAnimatedValue(d.speed);
    
    // --- Startup Sweep Logic ---
    const [isStartup, setIsStartup] = useState(true);
    const [displayRpm, setDisplayRpm] = useState(0);

    useEffect(() => {
        let start = Date.now();
        const duration = 1200; 
        
        const animate = () => {
            const now = Date.now();
            const elapsed = now - start;
            if (elapsed < duration) {
                // Ease out cubic
                const progress = elapsed / duration;
                const ease = 1 - Math.pow(1 - progress, 3);
                
                // Sweep up to 8000 then settle to idle
                const val = progress < 0.5 
                    ? (progress * 2) * 8000 
                    : 8000 - ((progress - 0.5) * 2) * (8000 - d.rpm);
                    
                setDisplayRpm(val);
                requestAnimationFrame(animate);
            } else {
                setIsStartup(false);
            }
        };
        requestAnimationFrame(animate);
    }, []);

    const effectiveRpm = isStartup ? displayRpm : d.rpm;
    
    // Peak Hold
    const [peakRpm, setPeakRpm] = useState(0);
    useEffect(() => {
        if (effectiveRpm > peakRpm) setPeakRpm(effectiveRpm);
        const timer = setTimeout(() => setPeakRpm(effectiveRpm), 3000); // Decay peak
        return () => clearTimeout(timer);
    }, [effectiveRpm]);

    // Value Formatting
    const mapKpa = (d.turboBoost * 100 + 101).toFixed(0); 
    const coolantTemp = d.engineTemp.toFixed(0);
    const airTemp = d.inletAirTemp.toFixed(0);
    const injectorDuty = d.engineLoad.toFixed(0);
    const ignitionAngle = (15 + (d.rpm / 800)).toFixed(0);
    const throttle = d.engineLoad.toFixed(0);
    const voltage = d.batteryVoltage.toFixed(1);
    
    // EKF Status Logic
    const isUsingVision = ekfStats.visionConfidence > 0.5 && !ekfStats.gpsActive;
    
    return (
        <div className="w-full h-full bg-black flex flex-col overflow-hidden font-sans select-none text-white relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
            
            {/* Top Status Bar */}
            <div className="h-14 bg-[#111] flex justify-between items-center px-6 border-b border-[#222] shadow-md z-20 relative">
                <div className="flex gap-6 items-center">
                    <TurnLeftIcon active={false} />
                    <ParkingIcon active={d.speed === 0} />
                </div>
                
                {/* Center: Sensor Fusion Status */}
                <div className="flex items-center gap-2 bg-[#0a0a0a] px-4 py-1.5 rounded-full border border-[#222] shadow-inner">
                    <div className={`flex items-center gap-2 px-3 py-0.5 rounded transition-colors ${ekfStats.gpsActive ? 'bg-green-900/30' : 'bg-[#151515]'}`}>
                         <div className={`w-2 h-2 rounded-full ${ekfStats.gpsActive ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-900'}`}></div>
                         <span className={`text-[10px] font-bold tracking-widest ${ekfStats.gpsActive ? 'text-green-500' : 'text-gray-700'}`}>GNSS</span>
                    </div>
                    
                    <div className="h-4 w-px bg-[#333]"></div>

                    <div className={`flex items-center gap-2 px-3 py-0.5 rounded transition-colors ${isUsingVision ? 'bg-cyan-900/30' : 'bg-[#151515]'}`}>
                         <div className={`w-2 h-2 rounded-full ${isUsingVision ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]' : 'bg-gray-700'}`}></div>
                         <span className={`text-[10px] font-bold tracking-widest ${isUsingVision ? 'text-cyan-400' : 'text-gray-600'}`}>VISION</span>
                    </div>
                </div>

                <div className="flex gap-6 items-center">
                    <CheckEngineIcon active={hasActiveFault} />
                    <BatteryIcon active={d.batteryVoltage < 11.5} />
                    <HighBeamIcon active={false} />
                    <TurnRightIcon active={false} />
                </div>
            </div>

            <ShiftLights rpm={effectiveRpm} limit={8000} />

            {/* Main Dashboard Grid */}
            <div className="flex-1 grid grid-cols-4 gap-0.5 bg-[#050505] p-0.5 z-10">
                
                {/* LEFT COLUMN */}
                <div className="col-span-1 grid grid-rows-4 gap-0.5">
                    <HaltechDataWidget label="Manifold Pressure" value={mapKpa} unit="kPa" color="text-[#D4AF37]" side="left" />
                    
                    <HaltechDataWidget 
                        label="Coolant Temp" 
                        value={coolantTemp} 
                        unit="°C" 
                        color="text-[#00AEEF]" 
                        side="left" 
                        barColor="bg-[#00AEEF]"
                        warning={d.engineTemp > 100}
                        critical={d.engineTemp > 110}
                    />
                    
                    <HaltechDataWidget 
                        label="Intake Air Temp" 
                        value={airTemp} 
                        unit="°C" 
                        color="text-[#00AEEF]" 
                        side="left" 
                        barColor="bg-[#00AEEF]"
                    />
                    
                    <HaltechDataWidget label="Injector Duty" value={injectorDuty} unit="%" color="text-white" side="left" barColor="bg-white" />
                </div>

                {/* CENTER (Tachometer) */}
                <div className="col-span-2 relative bg-gradient-to-b from-[#111] to-black flex items-center justify-center overflow-hidden">
                    {/* Radial Glow Background */}
                    <div className="absolute inset-0 bg-radial-gradient from-[#222] to-black opacity-50 pointer-events-none"></div>
                    <IC7Tachometer rpm={effectiveRpm} peakRpm={peakRpm} gear={d.gear === 0 ? "N" : d.gear} speed={Math.round(animatedSpeed)} />
                </div>

                {/* RIGHT COLUMN */}
                <div className="col-span-1 grid grid-rows-4 gap-0.5">
                    <HaltechDataWidget label="Ignition Angle" value={ignitionAngle} unit="deg" color="text-[#D4AF37]" side="right" />
                    
                    <HaltechDataWidget label="Throttle Pos" value={throttle} unit="%" color="text-[#D4AF37]" side="right" />
                    
                    <HaltechDataWidget 
                        label="Battery Volts" 
                        value={voltage} 
                        unit="V" 
                        color="text-green-500" 
                        side="right" 
                        barColor="bg-green-500"
                        warning={d.batteryVoltage < 12.0}
                        critical={d.batteryVoltage < 11.0}
                    />
                    
                    <HaltechDataWidget label="Oil Pressure" value={d.oilPressure.toFixed(1)} unit="Bar" color="text-red-500" side="right" barColor="bg-red-500" />
                </div>
            </div>
        </div>
    );
};

export default HaltechDashboard;
