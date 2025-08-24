import React from 'react';
import { useVehicleData } from '../../hooks/useVehicleData';
import { SensorDataPoint } from '../../types';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';
import ModernTachometer from '../../components/tachometers/ModernTachometer';

const DigitalReadout: React.FC<{ label: string; value: string | number; className?: string }> = ({ label, value, className }) => {
    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <div className="font-display font-bold text-7xl text-[var(--theme-text-primary)]" style={{ textShadow: '0 0 10px var(--theme-glow-color)' }}>
                {value}
            </div>
            <div className="text-xl font-sans text-[var(--theme-text-secondary)] uppercase tracking-widest">{label}</div>
        </div>
    )
};

const ModernThemeDashboard: React.FC = () => {
    const { latestData } = useVehicleData();
    const d: SensorDataPoint = latestData;
    const animatedSpeed = useAnimatedValue(d.speed);

    return (
        <div className="flex flex-col items-center justify-center h-full w-full p-4 font-sans theme-background gap-8">
            <div className="w-full flex justify-around items-center">
                
                <div className="w-1/4" />

                <ModernTachometer
                    value={d.rpm}
                    min={0}
                    max={8000}
                    label="RPM"
                    size="large"
                />

                <DigitalReadout
                    label="SPEED"
                    value={animatedSpeed.toFixed(0)}
                    className="w-1/4"
                />

            </div>
            <div className="w-full max-w-4xl grid grid-cols-2 gap-8 -mt-16">
                 <ModernTachometer
                    value={d.turboBoost * 14.5} // bar to PSI
                    min={-10}
                    max={30}
                    label="TURBO"
                    unit="PSI"
                    size="small"
                />
                 <ModernTachometer
                    value={d.engineLoad}
                    min={0}
                    max={100}
                    label="THROTTLE"
                    unit="%"
                    size="small"
                />
            </div>
        </div>
    );
};

export default ModernThemeDashboard;