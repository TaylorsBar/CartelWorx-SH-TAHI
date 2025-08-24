import React from 'react';
import { useVehicleData } from '../../hooks/useVehicleData';
import { SensorDataPoint } from '../../types';
import HaltechTachometer from '../../components/tachometers/HaltechTachometer';
import HaltechSideBarGauge from '../../components/gauges/HaltechSideBarGauge';


const HaltechDashboard: React.FC = () => {
    const { latestData } = useVehicleData();
    const d: SensorDataPoint = latestData;

    return (
        <div className="flex h-full w-full items-center justify-center p-4 theme-background">
            <div className="grid grid-cols-[1fr_2fr_1fr] items-center justify-center gap-4 w-full max-w-7xl">
                {/* Left Gauges */}
                <div className="flex flex-col gap-4 h-full justify-around">
                    <HaltechSideBarGauge 
                        label="COOLANT"
                        value={d.engineTemp}
                        min={40}
                        max={120}
                        unit="°C"
                        orientation="left"
                    />
                     <HaltechSideBarGauge 
                        label="FUEL P"
                        value={d.fuelPressure}
                        min={0}
                        max={8}
                        unit="bar"
                        orientation="left"
                    />
                </div>

                {/* Center Tachometer */}
                <div className="flex items-center justify-center">
                    <HaltechTachometer
                        rpm={d.rpm}
                        speed={d.speed}
                        gear={d.gear}
                    />
                </div>

                {/* Right Gauges */}
                 <div className="flex flex-col gap-4 h-full justify-around">
                     <HaltechSideBarGauge 
                        label="BOOST"
                        value={d.turboBoost}
                        min={-1}
                        max={2}
                        unit="bar"
                        orientation="right"
                    />
                     <HaltechSideBarGauge 
                        label="OIL P"
                        value={d.oilPressure}
                        min={0}
                        max={10}
                        unit="bar"
                        orientation="right"
                    />
                </div>
            </div>
        </div>
    );
};

export default HaltechDashboard;
