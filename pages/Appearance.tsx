import React, { useContext } from 'react';
import { AppearanceContext, Theme, AccentMaterial, LEDMode } from '../contexts/AppearanceContext';

const themes: { id: Theme; name: string; description: string }[] = [
    { id: 'rally', name: 'World Rally', description: 'High-contrast, functional display for intense conditions.' },
    { id: 'modern', name: 'Modern Performance', description: 'Sleek, futuristic interface with radial data readouts.' },
    { id: 'classic', name: 'E-Tuner Pro', description: 'Professional tuner interface with a red-on-black aesthetic.' },
    { id: 'haltech', name: 'Pro Tuner', description: 'Yellow-on-black professional racing display.' },
    { id: 'minimalist', name: 'Minimalist EV', description: 'Clean, modern interface with a frosted glass aesthetic.' },
];

const materials: { id: AccentMaterial; name: string; style: React.CSSProperties }[] = [
    { id: 'cyan', name: 'Hyper Cyan', style: { background: 'linear-gradient(145deg, #007FFF, #00FFFF)' } },
    { id: 'brushed-brass', name: 'Brushed Brass', style: { background: 'linear-gradient(to right, rgba(255,255,255,0.2), rgba(255,255,255,0), rgba(255,255,255,0.2)), linear-gradient(145deg, #b08d57, #cfb53b)' } },
    { id: 'satin-brass', name: 'Satin Brass', style: { background: 'radial-gradient(ellipse at center, #e3d3a3 0%, #c8b684 100%)' } },
    { id: 'antique-brass', name: 'Antique Brass', style: { background: 'linear-gradient(145deg, #6b4f3a, #a57d54)' } },
    { id: 'carbon-fiber', name: 'Carbon Fiber', style: { 
        backgroundColor: '#1a1a1a',
        backgroundImage: 'linear-gradient(27deg, #151515 5px, transparent 5px), linear-gradient(207deg, #151515 5px, transparent 5px), linear-gradient(27deg, #222 5px, transparent 5px), linear-gradient(207deg, #222 5px, transparent 5px), linear-gradient(90deg, #1b1b1b 10px, transparent 10px), linear-gradient(#1d1d1d 25%, #1a1a1a 25%, #1a1a1a 50%, transparent 50%, transparent 75%, #242424 75%, #242424)',
        backgroundSize: '20px 20px',
    }},
];

const ledColors = [
    { name: 'Cyan', hex: '#00FFFF' },
    { name: 'Blue', hex: '#007FFF' },
    { name: 'Purple', hex: '#8A2BE2' },
    { name: 'Pink', hex: '#FF00FF' },
    { name: 'Red', hex: '#FF0000' },
    { name: 'Orange', hex: '#FFA500' },
    { name: 'Green', hex: '#00FF00' },
    { name: 'White', hex: '#FFFFFF' },
];

const ledModes: { id: LEDMode, name: string }[] = [
    { id: 'solid', name: 'Solid' },
    { id: 'pulse', name: 'Pulse' },
    { id: 'music', name: 'Music Sync' },
];

const Appearance: React.FC = () => {
    const { theme, setTheme, accentMaterial, setAccentMaterial, ledSettings, setLedSettings } = useContext(AppearanceContext);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-100 font-display">Appearance Settings</h1>
                <p className="text-gray-400 mt-1">Customize the look and feel of your dashboard and cabin.</p>
            </div>

            <div className="bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg">
                <h2 className="text-lg font-semibold border-b border-brand-cyan/30 pb-2 mb-6 font-display">Dashboard Theme</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {themes.map(t => (
                        <div
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${theme === t.id ? 'border-[var(--theme-accent-primary)] shadow-glow-theme' : 'border-base-700 hover:border-brand-cyan/50'}`}
                        >
                            <h3 className="font-bold text-white">{t.name}</h3>
                            <p className="text-sm text-gray-400 mt-1">{t.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg">
                <h2 className="text-lg font-semibold border-b border-brand-cyan/30 pb-2 mb-6 font-display">Accent Material</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {materials.map(m => (
                        <div
                            key={m.id}
                            onClick={() => setAccentMaterial(m.id)}
                            className="flex flex-col items-center cursor-pointer group"
                        >
                            <div
                                style={m.style}
                                className={`w-24 h-24 rounded-full border-4 transition-all ${accentMaterial === m.id ? 'border-brand-cyan shadow-glow-cyan' : 'border-base-700 group-hover:border-brand-cyan/50'}`}
                            ></div>
                            <p className={`mt-3 font-semibold transition-colors ${accentMaterial === m.id ? 'text-brand-cyan' : 'text-gray-400 group-hover:text-white'}`}>{m.name}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg">
                <div className="flex justify-between items-center border-b border-brand-cyan/30 pb-2 mb-6">
                    <h2 className="text-lg font-semibold font-display">Interior Ambient Lighting</h2>
                     <div className="flex items-center">
                        <span className={`mr-3 text-sm font-medium ${ledSettings.isOn ? 'text-white' : 'text-gray-500'}`}>
                            {ledSettings.isOn ? 'On' : 'Off'}
                        </span>
                        <button
                            onClick={() => setLedSettings({ isOn: !ledSettings.isOn })}
                            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${ledSettings.isOn ? 'bg-brand-cyan' : 'bg-base-700'}`}
                            role="switch"
                            aria-checked={ledSettings.isOn}
                        >
                            <span
                                aria-hidden="true"
                                className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200 ${ledSettings.isOn ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>
                </div>
                
                <div className={`space-y-6 ${!ledSettings.isOn ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div>
                        <h3 className="text-md font-semibold text-gray-300 mb-3">Color</h3>
                        <div className="flex flex-wrap gap-4">
                            {ledColors.map(c => (
                                <button
                                    key={c.hex}
                                    onClick={() => setLedSettings({ color: c.hex })}
                                    className={`w-10 h-10 rounded-full border-2 transition-all ${ledSettings.color === c.hex ? 'border-white scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c.hex }}
                                    aria-label={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="brightness" className="block text-md font-semibold text-gray-300 mb-2">Brightness</label>
                        <div className="flex items-center space-x-4">
                            <input
                                type="range"
                                id="brightness"
                                name="brightness"
                                min="0"
                                max="100"
                                value={ledSettings.brightness}
                                onChange={e => setLedSettings({ brightness: parseInt(e.target.value) })}
                                className="w-full h-2 bg-base-800 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
                            />
                            <span className="font-mono text-lg w-12 text-right">{ledSettings.brightness}%</span>
                        </div>
                    </div>
                    
                     <div>
                        <h3 className="text-md font-semibold text-gray-300 mb-3">Mode</h3>
                        <div className="flex gap-4">
                            {ledModes.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setLedSettings({ mode: m.id })}
                                    className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${ledSettings.mode === m.id ? 'bg-brand-cyan text-black' : 'bg-base-700 text-gray-300 hover:bg-base-700'}`}
                                >
                                    {m.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Appearance;