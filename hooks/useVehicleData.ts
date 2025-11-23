
import { useEffect } from 'react';
import { useVehicleStore } from '../stores/vehicleStore';

export const useVehicleData = () => {
    const data = useVehicleStore(state => state.data);
    const latestData = useVehicleStore(state => state.latestData);
    const hasActiveFault = useVehicleStore(state => state.hasActiveFault);
    const obdState = useVehicleStore(state => state.obdState);
    const ekfStats = useVehicleStore(state => state.ekfStats);
    const connectObd = useVehicleStore(state => state.connectObd);
    const disconnectObd = useVehicleStore(state => state.disconnectObd);
    const startSimulation = useVehicleStore(state => state.startSimulation);

    // Automatically start simulation on mount
    useEffect(() => {
        startSimulation();
    }, [startSimulation]);

    return { 
        data, 
        latestData, 
        hasActiveFault, 
        obdState, 
        ekfStats, 
        connectObd, 
        disconnectObd 
    };
};
