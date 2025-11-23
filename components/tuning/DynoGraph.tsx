
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const DynoGraph: React.FC<{ rpm: number }> = ({ rpm }) => {
    // Generate theoretical dyno curves
    const data = Array.from({length: 80}, (_, i) => {
        const r = i * 100;
        // Torque curve (peaks around 4500)
        let torque = 350 + Math.sin(r / 3000) * 100 - (r > 6000 ? (r-6000)*0.1 : 0);
        if (r < 1000) torque = r * 0.35;
        
        // Power = (Torque * RPM) / 5252 (Imperial) or similar constant. 
        // Just approximation for viz:
        const power = (torque * r) / 7000;
        
        return {
            rpm: r,
            torque: torque,
            power: power
        };
    });

    return (
        <div className="w-full h-full p-2">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#00F0FF" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorTorque" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF3333" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#FF3333" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis 
                        dataKey="rpm" 
                        stroke="#444" 
                        tick={{fill: '#666', fontSize: 10}} 
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis 
                        yAxisId="left" 
                        stroke="#00F0FF" 
                        orientation="left" 
                        tick={{fill: '#00F0FF', fontSize: 10}} 
                        tickLine={false}
                        axisLine={false}
                        width={30}
                    />
                    <YAxis 
                        yAxisId="right" 
                        stroke="#FF3333" 
                        orientation="right" 
                        tick={{fill: '#FF3333', fontSize: 10}} 
                        tickLine={false}
                        axisLine={false}
                        width={30}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                        itemStyle={{ fontSize: '12px' }}
                        labelStyle={{ color: '#888', marginBottom: '5px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }}/>
                    <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="power" 
                        name="Power (HP)" 
                        stroke="#00F0FF" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorPower)" 
                    />
                    <Area 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="torque" 
                        name="Torque (Nm)" 
                        stroke="#FF3333" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorTorque)" 
                    />
                    {/* Live RPM Line */}
                    {rpm > 0 && <line x1={0} y1={0} x2={0} y2={100} stroke="white" />} 
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default DynoGraph;
