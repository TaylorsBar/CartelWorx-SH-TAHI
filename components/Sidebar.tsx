
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import GaugeIcon from './icons/GaugeIcon';
import ChatIcon from './icons/ChatIcon';
import WrenchIcon from './icons/WrenchIcon';
import TuningForkIcon from './icons/TuningForkIcon';
import EngineIcon from './icons/EngineIcon';
import ShieldIcon from './icons/ShieldIcon';
import ARIcon from './icons/ARIcon';
import HederaIcon from './icons/HederaIcon';
import StopwatchIcon from './icons/StopwatchIcon';
import PaintBrushIcon from './icons/PaintBrushIcon';
import SoundWaveIcon from './icons/SoundWaveIcon';
import FullScreenIcon from './icons/FullScreenIcon';
import { useVehicleConnection } from '../hooks/useVehicleData';
import { ObdConnectionState } from '../types';
import { KarapiroLogo } from './KarapiroLogo';

const navigation = [
  { name: 'Dashboard', href: '/', icon: GaugeIcon },
  { name: 'Race Pack', href: '/race-pack', icon: StopwatchIcon },
  { name: 'AI Engine', href: '/ai-engine', icon: EngineIcon },
  { name: 'AR Assistant', href: '/ar-assistant', icon: ARIcon },
  { name: 'Diagnostics', href: '/diagnostics', icon: ChatIcon },
  { name: 'Logbook', href: '/logbook', icon: WrenchIcon },
  { name: 'Tuning', href: '/tuning', icon: TuningForkIcon },
  { name: 'Accessories', href: '/accessories', icon: SoundWaveIcon },
  { name: 'Appearance', href: '/appearance', icon: PaintBrushIcon },
  { name: 'Security', href: '/security', icon: ShieldIcon },
  { name: 'Hedera DLT', href: '/hedera', icon: HederaIcon },
];

const Sidebar: React.FC = () => {
  const { pathname } = useLocation();
  const { obdState, connectObd, disconnectObd } = useVehicleConnection();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen().catch(err => console.error(err));
    }
  };

  const handleConnectionClick = () => {
    if (obdState === ObdConnectionState.Disconnected || obdState === ObdConnectionState.Error) {
      connectObd();
    } else {
      disconnectObd();
    }
  };

  const getConnectionLabel = () => {
    switch (obdState) {
      case ObdConnectionState.Connected: return 'LINK ACTIVE';
      case ObdConnectionState.Connecting: return 'LINKING...';
      case ObdConnectionState.Initializing: return 'INIT PROTOCOL';
      case ObdConnectionState.Error: return 'LINK ERROR';
      default: return 'CONNECT OBD';
    }
  };

  const getConnectionColor = () => {
    switch (obdState) {
      case ObdConnectionState.Connected: return 'text-brand-green neon-text-green';
      case ObdConnectionState.Connecting:
      case ObdConnectionState.Initializing: return 'text-yellow-400 animate-pulse';
      case ObdConnectionState.Error: return 'text-brand-red neon-text-red';
      default: return 'text-gray-500';
    }
  };

  return (
    <div 
      className={`hidden md:flex flex-col h-full z-50 transition-all duration-300 ease-in-out relative ${isCollapsed ? 'w-20' : 'w-72'}`}
    >
       {/* Glassmorphism Container */}
       <div className="flex flex-col h-full bg-black/40 backdrop-blur-xl border-r border-white/10 shadow-[10px_0_30px_rgba(0,0,0,0.5)] overflow-hidden relative">
          
          {/* Toggle Button */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-8 w-6 h-6 bg-black border border-white/20 rounded-full flex items-center justify-center text-brand-cyan hover:text-white hover:scale-110 transition-all z-50 shadow-[0_0_10px_rgba(0,240,255,0.3)]"
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
             <svg 
               className={`w-3 h-3 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} 
               fill="none" 
               viewBox="0 0 24 24" 
               stroke="currentColor"
             >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
             </svg>
          </button>

          {/* Brand Header */}
          <div className={`flex items-center h-24 border-b border-white/10 transition-all duration-300 ${isCollapsed ? 'justify-center px-2' : 'justify-start px-6'}`}>
            {isCollapsed ? (
                <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-black rounded-full flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(0,240,255,0.2)] group">
                    <span className="font-display font-bold text-white text-xl group-hover:text-brand-cyan transition-colors">K</span>
                </div>
            ) : (
                <KarapiroLogo className="w-full h-16" />
            )}
          </div>

          {/* Navigation Items */}
          <div className={`flex flex-col flex-1 overflow-y-auto py-6 space-y-2 custom-scrollbar overflow-x-hidden ${isCollapsed ? 'px-2' : 'px-4'}`}>
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  title={isCollapsed ? item.name : ''}
                  className={`group relative flex items-center py-3 text-sm font-medium rounded-lg transition-all duration-300 border border-transparent overflow-hidden ${
                    isCollapsed ? 'justify-center px-0' : 'px-4'
                  } ${
                    isActive
                      ? 'bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white hover:border-white/10'
                  }`}
                >
                  {/* Active Indicator Bar */}
                  {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-cyan shadow-[0_0_10px_#00F0FF]"></div>
                  )}
                  
                  <item.icon
                    className={`flex-shrink-0 h-5 w-5 transition-all duration-300 ${
                      isActive ? 'text-brand-cyan drop-shadow-[0_0_8px_#00F0FF]' : 'text-gray-500 group-hover:text-gray-300'
                    } ${isCollapsed ? '' : 'mr-3'}`}
                    aria-hidden="true"
                  />
                  
                  <span className={`font-display tracking-wide whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden hidden' : 'w-auto opacity-100'} ${isActive ? 'font-bold' : ''}`}>
                      {item.name}
                  </span>
                  
                  {/* Hover Glint Effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 pointer-events-none"></div>
                </NavLink>
              );
            })}
          </div>
          
          {/* Footer: OBD Status & Fullscreen Toggle */}
          <div className={`border-t border-white/10 bg-black/40 backdrop-blur-md transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
            <div className={`flex gap-2 ${isCollapsed ? 'flex-col' : 'flex-row'}`}>
                {/* OBD Button */}
                <button
                    onClick={handleConnectionClick}
                    className={`flex-1 flex items-center rounded-xl bg-white/5 border border-white/10 hover:border-brand-cyan/50 hover:bg-white/10 transition-all group relative overflow-hidden ${isCollapsed ? 'justify-center py-3 px-0 w-full' : 'justify-between px-4 py-3'}`}
                    title={isCollapsed ? getConnectionLabel() : ''}
                >
                    <div className="flex items-center z-10">
                        <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isCollapsed ? 'mr-0' : 'mr-3'} ${
                            obdState === ObdConnectionState.Connected ? 'bg-brand-green shadow-[0_0_8px_#33FF33]' : 
                            obdState === ObdConnectionState.Disconnected ? 'bg-gray-600' : 
                            'bg-yellow-400 animate-pulse'
                        }`}></div>
                        <span className={`text-xs font-display font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${getConnectionColor()} ${isCollapsed ? 'w-0 opacity-0 overflow-hidden hidden' : 'w-auto opacity-100'}`}>
                            {getConnectionLabel()}
                        </span>
                    </div>
                    <div className={`z-10 ${isCollapsed ? 'hidden' : 'block'}`}>
                        <svg className={`w-4 h-4 text-gray-500 group-hover:text-brand-cyan transition-colors ${obdState === ObdConnectionState.Connecting ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {obdState === ObdConnectionState.Connected 
                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                }
                        </svg>
                    </div>
                    {/* Button Scanline */}
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>

                {/* Fullscreen Toggle */}
                <button
                    onClick={toggleFullScreen}
                    className={`flex-shrink-0 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:border-brand-cyan/50 hover:bg-white/10 transition-all group relative overflow-hidden ${isCollapsed ? 'w-full py-3' : 'w-12'}`}
                    title={isFullscreen ? "Exit Full Screen" : "Full Screen"}
                >
                    <FullScreenIcon isFullscreen={isFullscreen} className="w-5 h-5 text-gray-500 group-hover:text-brand-cyan transition-colors z-10" />
                     {/* Button Scanline */}
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
            </div>
          </div>
       </div>
    </div>
  );
};

export default Sidebar;
