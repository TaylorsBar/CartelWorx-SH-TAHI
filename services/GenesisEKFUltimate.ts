import { VisionGroundTruth, VisualOdometryResult } from './VisionGroundTruth';

/**
 * GenesisEKFUltimate
 * 
 * An Advanced Extended Kalman Filter (EKF) for vehicle state estimation.
 * 
 * Architecture:
 * - State Vector [x]: Velocity (km/h)
 * - Process Model: Physics-based prediction using derived acceleration.
 * - Measurement 1: GPS Speed (Absolute, Low Frequency, subject to outages).
 * - Measurement 2: OBD-II Wheel Speed (High Frequency, subject to wheel slip).
 * - Measurement 3: Visual Odometry (Gap filler, relative accuracy, subject to lighting).
 * 
 * This sensor fusion engine dynamically weights inputs based on their covariance (R)
 * to provide a "Genesis" truth state that is more accurate than any single sensor.
 */
export class GenesisEKFUltimate {
    // State Vector (1D for Speed)
    private x: number = 0; 
    
    // Estimation Error Covariance
    private P: number = 1.0; 
    
    // Process Noise Covariance (Uncertainty in the physics/acceleration model)
    private Q: number = 0.1;

    // Sub-modules
    private visionModule: VisionGroundTruth;

    constructor() {
        this.visionModule = new VisionGroundTruth();
    }

    /**
     * Prediction Step (Time Update)
     * Projects the state ahead based on kinematic physics.
     * x_k = x_k-1 + a * dt
     * 
     * @param acceleration - Estimated acceleration (km/h/s)
     * @param dt - Delta time (seconds)
     */
    public predict(acceleration: number, dt: number): void {
        // Project state
        this.x = this.x + (acceleration * dt);
        
        // Project error covariance
        // P = F*P*F' + Q (F=1 for this simple 1D model)
        this.P = this.P + this.Q;
    }

    /**
     * Correction Step (Measurement Update)
     * Generic Kalman update equation.
     * 
     * @param z - Measurement value
     * @param R - Measurement noise covariance (Sensor uncertainty)
     */
    private update(z: number, R: number): void {
        // Innovation (Residual)
        const y = z - this.x;

        // Innovation Covariance
        const S = this.P + R;

        // Optimal Kalman Gain
        const K = this.P / S;

        // Update State
        this.x = this.x + (K * y);

        // Update Covariance
        this.P = (1 - K) * this.P;
    }

    /**
     * Fuse GPS Speed Data.
     * GPS is generally accurate (Low R) but low frequency. 
     * If accuracy is poor (high DOP), R increases.
     */
    public fuseGps(speed: number, accuracy: number = 1.0): void {
        // Base variance 0.5 for good GPS, scaled by accuracy reported by receiver
        this.update(speed, 0.5 * accuracy);
    }

    /**
     * Fuse OBD-II Wheel Speed Data.
     * We assign a moderate noise variance (R=2.0) to account for tire slip and sensor lag.
     */
    public fuseObdSpeed(speed: number): void {
        this.update(speed, 2.0);
    }

    /**
     * Fuse Visual Odometry Data.
     * We dynamically calculate R based on the computer vision confidence score.
     * High confidence = Low R (High trust).
     */
    public fuseVision(trueSpeedSim: number, dt: number): VisualOdometryResult {
        // In a real app, 'trueSpeedSim' would be the image buffer passed to the CV engine.
        // Here we simulate the extraction of velocity from the 'truth' with realistic noise.
        const vo = this.visionModule.computeVisualOdometry(trueSpeedSim, dt, 0.95); 

        if (vo.isTracking) {
            // Invert confidence to get variance. 
            // If confidence is 1.0, R is 0.5 (Very trusted).
            // If confidence is 0.1, R is 5.0 (Not trusted).
            const R_vision = (1.0 / Math.max(0.01, vo.confidence)) * 0.5; 
            
            this.update(vo.speed, R_vision);
        }

        return vo;
    }

    /**
     * Returns the fused, filtered speed estimate.
     */
    public getEstimatedSpeed(): number {
        return Math.max(0, this.x);
    }
    
    /**
     * Returns the current state uncertainty.
     */
    public getUncertainty(): number {
        return this.P;
    }
}
