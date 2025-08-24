
import React, { useState, useContext } from 'react';
import { AppearanceContext, CopilotAudioOutput } from '../contexts/AppearanceContext';

const Accessories: React.FC = () => {
    const { copilotAudioOutput, setCopilotAudioOutput } = useContext(AppearanceContext);

    const [isConnected, setIsConnected] = useState(true);
    const [stereoName, setStereoName] = useState('Pioneer AVH-Z9200DAB');
    const [volume, setVolume] = useState(75);
    const [source, setSource] = useState<'Radio' | 'Bluetooth' | 'USB'>('Bluetooth');

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-100 font-display">Accessory Control</h1>
                <p className="text-gray-400 mt-1">Manage connected devices and integrations.</p>
            </div>

            {/* Car Stereo Section */}
            <div className="bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg">
                <div className="flex justify-between items-center border-b border-brand-cyan/30 pb-2 mb-6">
                    <h2 className="text-lg font-semibold font-display">Car Stereo</h2>
                    <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                        <span className="text-sm text-gray-400">
                            {isConnected ? `Connected: ${stereoName}` : 'Disconnected'}
                        </span>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label htmlFor="volume" className="block text-md font-semibold text-gray-300 mb-2">Master Volume</label>
                        <div className="flex items-center space-x-4">
                            <input
                                type="range"
                                id="volume"
                                min="0"
                                max="100"
                                value={volume}
                                onChange={e => setVolume(parseInt(e.target.value))}
                                className="w-full h-2 bg-base-800 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
                                disabled={!isConnected}
                            />
                            <span className="font-mono text-lg w-12 text-right">{volume}%</span>
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-md font-semibold text-gray-300 mb-3">Audio Source</h3>
                        <div className="flex gap-4">
                            {(['Radio', 'Bluetooth', 'USB'] as const).map(src => (
                                <button
                                    key={src}
                                    onClick={() => setSource(src)}
                                    className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${source === src ? 'bg-brand-cyan text-black' : 'bg-base-800 text-gray-300 hover:bg-base-700'}`}
                                    disabled={!isConnected}
                                >
                                    {src}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => setIsConnected(prev => !prev)}
                        className="w-full mt-4 bg-brand-blue text-white font-semibold py-2 rounded-md hover:bg-blue-600 transition-colors shadow-glow-blue"
                    >
                        {isConnected ? 'Disconnect Stereo' : 'Connect to Stereo'}
                    </button>
                </div>
            </div>
            
            {/* Co-Pilot Integration */}
            <div className="bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg">
                <h2 className="text-lg font-semibold border-b border-brand-cyan/30 pb-2 mb-6 font-display">Handsfree Co-Pilot Integration</h2>
                <div className="space-y-4">
                    <p className="text-gray-400 text-sm">Route audio feedback from KC through your desired output.</p>
                     <div>
                        <h3 className="text-md font-semibold text-gray-300 mb-3">Audio Output</h3>
                        <div className="flex gap-4">
                            {(['phone', 'stereo'] as const).map(output => (
                                <button
                                    key={output}
                                    onClick={() => setCopilotAudioOutput(output)}
                                    className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors capitalize ${copilotAudioOutput === output ? 'bg-brand-cyan text-black' : 'bg-base-800 text-gray-300 hover:bg-base-700'}`}
                                    disabled={output === 'stereo' && !isConnected}
                                >
                                    {output} {output === 'stereo' && !isConnected ? '(N/A)' : ''}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Accessories;