
import React, { useEffect, useRef, useState } from 'react';
import { useVehicleTelemetry } from '../hooks/useVehicleData';
import GForceMeter from './widgets/GForceMeter';

const RaceCam: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [streamActive, setStreamActive] = useState(false);
    const { latestData } = useVehicleTelemetry(); 
    const d = latestData;

    useEffect(() => {
        let localStream: MediaStream | null = null;

        const startCamera = async () => {
            try {
                // First attempt: Ideal constraints for a "dashcam" feel (Environment/Rear camera, HD)
                try {
                    localStream = await navigator.mediaDevices.getUserMedia({ 
                        video: { 
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            facingMode: "environment" 
                        }, 
                        audio: false 
                    });
                } catch (primaryErr) {
                    console.warn("Primary camera config failed, trying fallback...", primaryErr);
                    // Fallback: Any available video device
                    localStream = await navigator.mediaDevices.getUserMedia({ 
                        video: true, 
                        audio: false 
                    });
                }
                
                if (videoRef.current && localStream) {
                    videoRef.current.srcObject = localStream;
                    // Explicitly call play() to ensure it starts, handling the promise to catch autoplay blocks
                    videoRef.current.play().then(() => {
                        setStreamActive(true);
                    }).catch(playErr => {
                        console.error("Video play failed:", playErr);
                        // Still set active to try showing it, user might need to interact
                        setStreamActive(true);
                    });
                }
            } catch (err) {
                console.error("Camera access denied or unavailable:", err);
                setStreamActive(false);
            }
        };

        startCamera();

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // RPM Bar Calculation
    const rpmPercent = Math.min(100, Math.max(0, (d.rpm / 8000) * 100));
    const isRedline = d.rpm > 7000;

    // Simulated Pedal Inputs (derived from load/g-force for visual effect if not in data)
    const throttlePct = d.engineLoad;
    const brakePct = d.gForceY < -0.2 ? Math.min(100, Math.abs(d.gForceY) * 80) : 0;

    return (
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
            
            {/* 1. Video Layer - Always render to ensure ref availability */}
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                onLoadedMetadata={() => {
                    if (videoRef.current && videoRef.current.paused) {
                        videoRef.current.play().catch(e => console.warn("Autoplay blocked", e));
                    }
                }}
                className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${streamActive ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Fallback Background - Visible when stream not active */}
            {!streamActive && (
                <div className="absolute inset-0 w-full h-full object-cover z-0 bg-[url('https://images.unsplash.com/photo-1542228776-6c70b6d21397?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center grayscale-[30%]">
                    <div className="absolute inset-0 bg-black/20"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/60 backdrop-blur px-4 py-2 rounded border border-white/10 text-xs text-gray-400 font-mono">
                            INITIALIZING CAMERA FEED...
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Professional Overlay Layer */}
            <div className="absolute inset-0 z-10 pointer-events-none p-8 flex flex-col justify-between">
                
                {/* Top Bar: Session Info */}
                <div className="flex justify-between items-start">
                    <div className="bg-[#0a0a0a]/80 backdrop-blur-md border-l-4 border-brand-cyan px-4 py-2 skew-x-[-10deg]">
                        <div className="skew-x-[10deg] flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lap Time</span>
                            <span className="text-3xl font-mono font-bold text-white leading-none">
                                {d.speed > 10 ? "1:24.08" : "--:--.--"}
                            </span>
                        </div>
                    </div>

                    <div className="bg-[#0a0a0a]/80 backdrop-blur-md border-r-4 border-red-600 px-4 py-2 skew-x-[10deg]">
                         <div className="skew-x-[-10deg] flex flex-col items-end">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Delta</span>
                            <span className="text-2xl font-mono font-bold text-green-500 leading-none">-0.342</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Cluster: The "Halo" HUD */}
                <div className="flex items-end justify-between gap-4">
                    
                    {/* Left: Track Map & G-Force */}
                    <div className="flex flex-col gap-2">
                        <div className="w-32 h-32 bg-[#0a0a0a]/60 backdrop-blur-sm rounded-full border border-white/10 flex items-center justify-center relative">
                            {/* Track Map SVG */}
                            <svg viewBox="0 0 100 100" className="w-20 h-20 opacity-80 stroke-white fill-none stroke-2">
                                <path d="M 20 80 L 20 60 C 20 50, 30 40, 40 40 L 70 40 C 80 40, 80 20, 70 20 L 50 20" />
                            </svg>
                            {/* Player Dot */}
                            <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-brand-cyan rounded-full border-2 border-white shadow-[0_0_10px_#00F0FF]"></div>
                        </div>
                        
                        <div className="w-32 h-32 bg-[#0a0a0a]/60 backdrop-blur-sm rounded-full border border-white/10 p-2">
                            <div className="scale-75 origin-top-left">
                                <GForceMeter x={d.gForceX} y={d.gForceY} size={150} />
                            </div>
                        </div>
                    </div>

                    {/* Center: Main Telemetry Stack */}
                    <div className="flex-1 flex flex-col items-center mb-4">
                        
                        {/* RPM Arc/Bar */}
                        <div className="w-full max-w-2xl h-16 bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 rounded-t-2xl relative overflow-hidden flex items-end px-1 gap-0.5">
                             {/* RPM Ticks */}
                            {Array.from({length: 40}).map((_, i) => {
                                const step = 100 / 40;
                                const isActive = rpmPercent >= (i * step);
                                const isWarning = (i * step) > 85;
                                let bg = isActive ? (isWarning ? 'bg-red-500' : 'bg-brand-cyan') : 'bg-gray-800/30';
                                if (isActive && isRedline) bg = 'bg-red-500 animate-pulse';

                                return (
                                    <div key={i} className={`flex-1 ${bg} transition-all duration-75 rounded-t-sm`} style={{ height: `${20 + (i/40)*80}%` }}></div>
                                )
                            })}
                            
                            {/* RPM Text Overlay */}
                            <div className="absolute top-2 right-4 font-mono font-bold text-gray-400 text-xs">
                                {d.rpm.toFixed(0)} <span className="text-[10px]">RPM</span>
                            </div>
                        </div>

                        {/* Digital Readout Box */}
                        <div className="w-full max-w-xl flex bg-[#0a0a0a]/90 backdrop-blur-xl border-x border-b border-white/20 rounded-b-xl shadow-2xl relative overflow-hidden">
                            {/* Gear (Left) */}
                            <div className="w-1/3 flex items-center justify-center border-r border-white/10 p-4 bg-gradient-to-r from-brand-cyan/10 to-transparent">
                                <span className="text-8xl font-display font-black text-white italic" style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.5)' }}>
                                    {d.gear === 0 ? 'N' : d.gear}
                                </span>
                            </div>

                            {/* Speed (Center) */}
                            <div className="flex-1 flex flex-col items-center justify-center p-2">
                                <span className="text-7xl font-display font-bold text-white tracking-tighter tabular-nums leading-none">
                                    {d.speed.toFixed(0)}
                                </span>
                                <span className="text-brand-cyan text-xs font-bold uppercase tracking-[0.5em]">KM/H</span>
                            </div>

                            {/* Inputs (Right) */}
                            <div className="w-1/4 flex gap-2 p-3 items-end justify-center">
                                {/* Throttle */}
                                <div className="flex flex-col items-center h-full w-4 gap-1">
                                    <div className="flex-1 w-full bg-gray-800 rounded-sm relative overflow-hidden">
                                        <div className="absolute bottom-0 left-0 right-0 bg-green-500 transition-all duration-75" style={{ height: `${throttlePct}%` }}></div>
                                    </div>
                                    <span className="text-[8px] font-bold text-green-500">THR</span>
                                </div>
                                {/* Brake */}
                                <div className="flex flex-col items-center h-full w-4 gap-1">
                                    <div className="flex-1 w-full bg-gray-800 rounded-sm relative overflow-hidden">
                                        <div className="absolute bottom-0 left-0 right-0 bg-red-500 transition-all duration-75" style={{ height: `${brakePct}%` }}></div>
                                    </div>
                                    <span className="text-[8px] font-bold text-red-500">BRK</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Sector Times */}
                    <div className="flex flex-col gap-1 w-48">
                        <div className="bg-[#0a0a0a]/80 backdrop-blur-md px-3 py-1 flex justify-between items-center border-l-2 border-purple-500">
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Sector 1</span>
                            <span className="font-mono text-sm font-bold text-purple-400">24.505</span>
                        </div>
                        <div className="bg-[#0a0a0a]/80 backdrop-blur-md px-3 py-1 flex justify-between items-center border-l-2 border-green-500">
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Sector 2</span>
                            <span className="font-mono text-sm font-bold text-green-500">31.200</span>
                        </div>
                         <div className="bg-[#0a0a0a]/80 backdrop-blur-md px-3 py-1 flex justify-between items-center border-l-2 border-yellow-500">
                            <span className="text-[10px] text-gray-400 font-bold uppercase">Sector 3</span>
                            <span className="font-mono text-sm font-bold text-white">--.---</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default RaceCam;
