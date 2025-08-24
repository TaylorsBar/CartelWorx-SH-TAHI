
import React from 'react';
import { useVehicleData } from '../../hooks/useVehicleData';
import { SensorDataPoint } from '../../types';
import MinimalistGauge from '../../components/gauges/MinimalistGauge';
import InfoPanel from '../../components/infopanels/InfoPanel';
import BatteryBar from '../../components/gauges/BatteryBar';
import Map from '../../components/Map';

const MinimalistDashboard: React.FC = () => {
    const { latestData } = useVehicleData();
    const d: SensorDataPoint = latestData;

    return (
        <div className="flex h-full w-full items-center justify-center p-4 md:p-8 theme-background">
            <div 
                className="w-full h-full max-w-7xl max-h-[800px] grid grid-cols-5 grid-rows-3 gap-6"
                style={{
                    gridTemplateAreas: `
                        ".    speed   speed   nav nav"
                        "rpm  rpm     aux     nav nav"
                        "range battery battery climate ."
                    `
                }}
            >
                <div style={{ gridArea: 'speed' }} className="flex items-center justify-end">
                    <MinimalistGauge 
                        value={d.speed}
                        min={0}
                        max={160}
                        unit="mph"
                        size="large"
                    />
                </div>
                <div style={{ gridArea: 'rpm' }} className="flex items-center justify-end">
                    <MinimalistGauge 
                        value={d.rpm}
                        min={0}
                        max={8000}
                        unit="x1000 RPM"
                        size="medium"
                    />
                </div>
                 <div style={{ gridArea: 'aux' }} className="flex items-center justify-start pl-8">
                     <MinimalistGauge 
                        value={d.turboBoost * 14.5}
                        min={-10}
                        max={10}
                        unit=""
                        size="small"
                    />
                </div>
                <div style={{ gridArea: 'nav' }}>
                    <InfoPanel title="NAVIGATION">
                       <div className="p-2 h-full w-full">
                            <Map lat={d.latitude} lon={d.longitude} />
                        </div>
                    </InfoPanel>
                </div>
                <div style={{ gridArea: 'range' }}>
                    <InfoPanel title="RANGE">
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="text-6xl font-display font-bold text-white" style={{ textShadow: '0 0 8px #fff'}}>272<span className="text-2xl ml-2">mi</span></div>
                        </div>
                    </InfoPanel>
                </div>
                <div style={{ gridArea: 'battery' }}>
                    <InfoPanel title="BATTERY">
                         <div className="flex items-center justify-center h-full gap-6 px-4">
                            <BatteryBar percentage={82} />
                            <div className="text-5xl font-display font-bold text-white" style={{ textShadow: '0 0 8px #fff'}}>82%</div>
                        </div>
                    </InfoPanel>
                </div>
                <div style={{ gridArea: 'climate' }}>
                     <InfoPanel title="CLIMATE">
                         <div className="flex items-center justify-center h-full gap-2">
                             <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19.95,10.28v-.05a2,2,0,0,0-1.8-2l-1.45-.2A4.33,4.33,0,0,0,13,4.36a4.5,4.5,0,0,0-4.44,4.78,4.3,4.3,0,0,0-1.44.52l-1.28.64a2,2,0,0,0-1,1.75v.05a2,2,0,0,0,1.8,2l1.45.2a4.33,4.33,0,0,0,3.67,3.67l.2,1.45a2,2,0,0,0,2,1.8h.05a2,2,0,0,0,2-1.8l.2-1.45a4.33,4.33,0,0,0,3.15-3.15l1.45-.2a2,2,0,0,0,1.8-2Z"/></svg>
                             <div className="text-3xl font-display font-bold text-white" style={{ textShadow: '0 0 8px #fff'}}>72°<span className="text-xl">F</span></div>
                        </div>
                     </InfoPanel>
                </div>
            </div>
        </div>
    );
};

export default MinimalistDashboard;