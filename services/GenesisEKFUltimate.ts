import { VisionGroundTruth, VisualOdometryResult } from './VisionGroundTruth';

// --- Lightweight Matrix/Vector Math Kernel ---
type Vec3 = [number, number, number];
type Mat3 = [
    number, number, number,
    number, number, number,
    number, number, number
];

const MAT3_IDENTITY: Mat3 = [1,0,0, 0,1,0, 0,0,1];

class Math3D {
    static addVec(a: Vec3, b: Vec3): Vec3 {
        return [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
    }
    
    static scaleVec(v: Vec3, s: number): Vec3 {
        return [v[0]*s, v[1]*s, v[2]*s];
    }

    static addMat(A: Mat3, B: Mat3): Mat3 {
        return A.map((v, i) => v + B[i]) as Mat3;
    }

    static multMat(A: Mat3, B: Mat3): Mat3 {
        const C = new Array(9).fill(0) as Mat3;
        for(let r=0; r<3; r++) {
            for(let c=0; c<3; c++) {
                for(let k=0; k<3; k++) {
                    C[r*3+c] += A[r*3+k] * B[k*3+c];
                }
            }
        }
        return C;
    }

    static multMatVec(A: Mat3, v: Vec3): Vec3 {
        return [
            A[0]*v[0] + A[1]*v[1] + A[2]*v[2],
            A[3]*v[0] + A[4]*v[1] + A[5]*v[2],
            A[6]*v[0] + A[7]*v[1] + A[8]*v[2]
        ];
    }

    static transpose(A: Mat3): Mat3 {
        return [
            A[0], A[3], A[6],
            A[1], A[4], A[7],
            A[2], A[5], A[8]
        ];
    }

    // Naive 3x3 Inverse
    static invertMat(A: Mat3): Mat3 {
        const det = A[0]*(A[4]*A[8]-A[7]*A[5]) - A[1]*(A[3]*A[8]-A[5]*A[6]) + A[2]*(A[3]*A[7]-A[4]*A[6]);
        const invDet = 1/det;
        return [
             (A[4]*A[8]-A[5]*A[7])*invDet, -(A[1]*A[8]-A[2]*A[7])*invDet,  (A[1]*A[5]-A[2]*A[4])*invDet,
            -(A[3]*A[8]-A[5]*A[6])*invDet,  (A[0]*A[8]-A[2]*A[6])*invDet, -(A[0]*A[5]-A[2]*A[3])*invDet,
             (A[3]*A[7]-A[4]*A[6])*invDet, -(A[0]*A[7]-A[1]*A[6])*invDet,  (A[0]*A[4]-A[1]*A[3])*invDet
        ];
    }
}

/**
 * GenesisEKFUltimate
 * 
 * An Advanced Extended Kalman Filter (EKF) for vehicle state estimation with 6-DOF support.
 * 
 * State Vector [x]: [vx, vy, vz] (Velocity in Body Frame)
 * Prediction Model: Kinematic integration using IMU (Accel + Gyro)
 *   dv/dt = a_body - omega x v_body
 * 
 * Measurements:
 * 1. GPS Speed (Magnitude) -> EKF Update (Non-linear)
 * 2. OBD-II Wheel Speed (Longitudinal) -> Linear Update
 * 3. Visual Odometry (Longitudinal) -> Linear Update
 */
export class GenesisEKFUltimate {
    // State Vector: [vx, vy, vz] in m/s
    private x: Vec3 = [0, 0, 0]; 
    
    // Estimation Error Covariance P (3x3)
    private P: Mat3 = [...MAT3_IDENTITY]; 
    
    // Process Noise Covariance Q (3x3)
    // Represents uncertainty in IMU readings (accel/gyro noise integration)
    private readonly Q: Mat3 = [
        0.05, 0, 0,
        0, 0.05, 0,
        0, 0, 0.05
    ];

    private visionModule: VisionGroundTruth;

    constructor() {
        this.visionModule = new VisionGroundTruth();
    }

    /**
     * Prediction Step (Time Update)
     * Projects the state ahead based on 6-DOF kinematic physics.
     * v_k = v_{k-1} + (a_body - omega x v_{k-1}) * dt
     * 
     * @param accel - Body frame acceleration [ax, ay, az] in m/s^2
     * @param gyro - Body frame angular rates [p, q, r] in rad/s (Roll, Pitch, Yaw rates)
     * @param dt - Delta time (seconds)
     */
    public predict(accel: Vec3, gyro: Vec3, dt: number): void {
        const [vx, vy, vz] = this.x;
        const [ax, ay, az] = accel;
        const [p, q, r]    = gyro; // Roll rate, Pitch rate, Yaw rate

        // 1. Calculate derivatives: dv/dt = a - w x v
        // Cross product w x v = [q*vz - r*vy, r*vx - p*vz, p*vy - q*vx]
        const dvx = ax - (q*vz - r*vy); // Subtracting cross product term
        const dvy = ay - (r*vx - p*vz);
        const dvz = az - (p*vy - q*vx);

        // 2. Project State
        this.x = [
            vx + dvx * dt,
            vy + dvy * dt,
            vz + dvz * dt
        ];

        // 3. Calculate Jacobian F = I + dt * J(f)
        // df/dv is roughly the skew symmetric matrix of -omega
        // J = [ 0,  r, -q ]
        //     [ -r, 0,  p ]
        //     [ q, -p,  0 ]
        const Omega: Mat3 = [
            0,   r, -q,
            -r,  0,  p,
             q, -p,  0
        ];
        
        // F = I + Omega * dt
        const F = Math3D.addMat(MAT3_IDENTITY, Math3D.multMat(Omega, [dt,0,0, 0,dt,0, 0,0,dt] as Mat3) as unknown as Mat3);

        // 4. Project Covariance: P = F * P * F' + Q
        const FP = Math3D.multMat(F, this.P);
        const FP_Ft = Math3D.multMat(FP, Math3D.transpose(F));
        this.P = Math3D.addMat(FP_Ft, this.Q);
    }

    /**
     * Generic EKF Update Step
     * x = x + K * y
     * P = (I - K * H) * P
     * 
     * @param z - Measurement Vector (1D or nD)
     * @param h_x - Predicted Measurement (h(x))
     * @param H - Jacobian Matrix
     * @param R - Measurement Noise Covariance
     */
    private updateEKF(z: number, h_x: number, H: Vec3, R: number): void {
        // Innovation
        const y = z - h_x;

        // Innovation Covariance: S = H * P * H' + R
        // H is 1x3, P is 3x3, H' is 3x1 -> S is scalar
        const HP = Math3D.multMatVec(this.P, H); // 3x1 vector result (actually P*H^T if we treat H as row)
        // Wait, math check:
        // H is row vector [h1, h2, h3]. 
        // P is 3x3.
        // H * P is row vector.
        // (H*P) * H' is scalar.
        
        const HP_vec = [
            H[0]*this.P[0] + H[1]*this.P[3] + H[2]*this.P[6],
            H[0]*this.P[1] + H[1]*this.P[4] + H[2]*this.P[7],
            H[0]*this.P[2] + H[1]*this.P[5] + H[2]*this.P[8]
        ]; // Row vector result of H*P
        
        const HPHt = HP_vec[0]*H[0] + HP_vec[1]*H[1] + HP_vec[2]*H[2];
        const S = HPHt + R;

        // Kalman Gain: K = P * H' * inv(S)
        const K = Math3D.scaleVec([
            this.P[0]*H[0] + this.P[1]*H[1] + this.P[2]*H[2],
            this.P[3]*H[0] + this.P[4]*H[1] + this.P[5]*H[2],
            this.P[6]*H[0] + this.P[7]*H[1] + this.P[8]*H[2]
        ], 1/S);

        // Outlier Gating (3-Sigma)
        const sigma = Math.sqrt(S);
        let validY = y;
        if (Math.abs(y) > 3.0 * sigma) {
             validY = Math.sign(y) * 3.0 * sigma; // Clamp
        }

        // State Update
        this.x = Math3D.addVec(this.x, Math3D.scaleVec(K, validY));

        // Covariance Update: P = (I - K*H) * P
        // KH is 3x3
        const KH: Mat3 = [
            K[0]*H[0], K[0]*H[1], K[0]*H[2],
            K[1]*H[0], K[1]*H[1], K[1]*H[2],
            K[2]*H[0], K[2]*H[1], K[2]*H[2]
        ];
        
        const I_KH = Math3D.addMat(MAT3_IDENTITY, Math3D.scaleVec(KH as unknown as Vec3, -1) as unknown as Mat3);
        this.P = Math3D.multMat(I_KH, this.P);
    }

    /**
     * Fuse GPS Speed Data.
     * GPS provides Speed over Ground (magnitude of velocity).
     * h(x) = sqrt(vx^2 + vy^2 + vz^2)
     * H = Jacobian = [vx/v, vy/v, vz/v]
     */
    public fuseGps(speed: number, accuracy: number = 1.0): void {
        const [vx, vy, vz] = this.x;
        const vMag = Math.sqrt(vx*vx + vy*vy + vz*vz) || 0.001; // Avoid div by zero

        const h_x = vMag;
        const H: Vec3 = [vx/vMag, vy/vMag, vz/vMag];
        
        // R scales with GPS accuracy
        const R_gps = Math.max(0.5, accuracy * 0.5);

        this.updateEKF(speed, h_x, H, R_gps);
    }

    /**
     * Fuse OBD-II Wheel Speed.
     * Assumes Wheel Speed measures longitudinal velocity (vx) primarily.
     * Linear update: z = vx
     * H = [1, 0, 0]
     */
    public fuseObdSpeed(speed: number): void {
        const h_x = this.x[0];
        const H: Vec3 = [1, 0, 0];
        const R_obd = 2.0; // Moderate noise variance

        this.updateEKF(speed, h_x, H, R_obd);
    }

    /**
     * Fuse Visual Odometry.
     * Assumes VO measures forward velocity (vx).
     */
    public fuseVision(trueSpeedSim: number, dt: number): VisualOdometryResult {
        const vo = this.visionModule.computeVisualOdometry(trueSpeedSim, dt, 0.95);

        if (vo.isTracking) {
            const h_x = this.x[0];
            const H: Vec3 = [1, 0, 0];
            const R_vision = (1.0 / Math.max(0.1, vo.confidence)) * 0.5;

            this.updateEKF(vo.speed, h_x, H, R_vision);
        }

        return vo;
    }

    public getEstimatedSpeed(): number {
        // Return Magnitude of velocity vector
        return Math.sqrt(this.x[0]**2 + this.x[1]**2 + this.x[2]**2);
    }
    
    public getVelocityVector(): Vec3 {
        return [...this.x];
    }

    public getUncertainty(): number {
        // Return trace of P (sum of variances)
        return this.P[0] + this.P[4] + this.P[8];
    }
}
