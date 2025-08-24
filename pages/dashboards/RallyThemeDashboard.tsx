import React from 'react';
import { useVehicleData } from '../../hooks/useVehicleData';
import { SensorDataPoint } from '../../types';
import HorizontalTachometer from '../../components/tachometers/HorizontalTachometer';
import IndicatorPanel from '../../components/IndicatorPanel';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';

const DataReadout: React.FC<{ label: string; value: number; unit: string; className?: string, format: (val: number) => string }> = ({ label, value, unit, className = '', format }) => {
    const animatedValue = useAnimatedValue(value);
    return (
        <div className={`flex flex-col items-center justify-between p-2 rounded-lg ${className}`}>
            <div className="text-lg font-mono text-[var(--theme-text-secondary)]">{label}</div>
            <div>
                <span className="text-4xl font-display font-bold text-[var(--theme-text-primary)]">{format(animatedValue)}</span>
                <span className="ml-2 text-lg text-[var(--theme-text-secondary)]">{unit}</span>
            </div>
        </div>
    );
};

const GaugeBar: React.FC<{ label: string, value: number, max: number, unit: string, format: (val: number) => string }> = ({ label, value, max, unit, format }) => {
    const animatedValue = useAnimatedValue(value);
    const percentage = max > 0 ? (animatedValue / max) * 100 : 0;
    const numSegments = 20;

    return (
        <div className="w-full">
            <div className="flex justify-between items-baseline text-sm mb-1">
                <span className="font-semibold text-[var(--theme-text-secondary)]">{label}</span>
                <span className="font-mono text-[var(--theme-text-primary)]">{format(animatedValue)} {unit}</span>
            </div>
            <div className="w-full flex gap-1 h-3 bg-black/30 p-0.5 rounded-sm border border-gray-700/50">
                {Array.from({ length: numSegments }).map((_, i) => (
                    <div 
                        key={i}
                        className="flex-1 h-full rounded-sm transition-colors duration-100"
                        style={{ backgroundColor: i < (percentage / 100 * numSegments) ? 'var(--theme-accent-primary)' : 'var(--theme-indicator-inactive)' }}
                    ></div>
                ))}
            </div>
        </div>
    );
};


const RallyThemeDashboard: React.FC = () => {
    const { latestData } = useVehicleData();
    const d: SensorDataPoint = latestData;

    const animatedSpeed = useAnimatedValue(d.speed);
    const animatedGear = d.gear; // Gear changes are instant

    return (
        <div className="flex flex-col items-center justify-between h-full w-full bg-[var(--theme-bg)] text-white p-4 font-sans gap-4 theme-background">
            {/* Top Section: RPM */}
            <HorizontalTachometer rpm={d.rpm} />
            
            {/* Middle Section: Main Readouts */}
            <div className="w-full flex justify-around items-center flex-grow">
                 <DataReadout label="BOOST" value={d.turboBoost} unit="bar" className="w-1/4" format={v => v.toFixed(2)} />
                 
                 <div className="flex flex-col items-center justify-center w-1/2 h-full bg-black/20 border-2 border-gray-800 rounded-lg p-4">
                    <div className="flex items-end justify-center w-full">
                        <div className="font-display text-9xl font-bold text-white tracking-widest leading-none">{animatedGear}</div>
                        <div className="text-2xl text-[var(--theme-text-secondary)] mb-2 ml-4">GEAR</div>
                    </div>
                    <div className="w-full h-px bg-gray-700 my-3"></div>
                    <div className="flex items-baseline mt-2">
                        <span className="font-mono text-5xl font-bold">{animatedSpeed.toFixed(0)}</span>
                        <span className="ml-2 text-xl text-[var(--theme-text-secondary)]">km/h</span>
                    </div>
                 </div>

                 <DataReadout label="LAMBDA" value={d.o2SensorVoltage * 2} unit="λ" className="w-1/4" format={v => v.toFixed(2)} />
            </div>

            {/* Bottom Section: Gauges */}
            <div className="w-full flex justify-between gap-8">
                <div className="w-1/3 space-y-3">
                    <GaugeBar label="Air Temp" value={d.inletAirTemp} max={100} unit="°C" format={v => v.toFixed(0)} />
                    <GaugeBar label="ECT" value={d.engineTemp} max={120} unit="°C" format={v => v.toFixed(0)} />
                </div>
                <div className="w-1/3 flex flex-col items-center justify-center">
                    <IndicatorPanel />
                </div>
                <div className="w-1/3 space-y-3">
                    <GaugeBar label="Oil Pres" value={d.oilPressure} max={8} unit="Bar" format={v => v.toFixed(1)} />
                    <GaugeBar label="Fuel Pres" value={d.fuelPressure} max={10} unit="Bar" format={v => v.toFixed(1)} />
                </div>
            </div>
        </div>
    );
};

export default RallyThemeDashboard;