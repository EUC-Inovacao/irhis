import * as THREE from 'three';

export type SensorDataRow = {
    'Quat_W'?: number;
    'Quat_X'?: number;
    'Quat_Y'?: number;
    'Quat_Z'?: number;
    'Euler_X'?: number;
    'Euler_Y'?: number;
    'Euler_Z'?: number;
    [key: string]: any;
};

/**
 * Calculates the relative quaternion representing the rotation from one orientation to another.
 * @param q1 - The first quaternion (e.g., proximal sensor like upper arm).
 * @param q2 - The second quaternion (e.g., distal sensor like forearm).
 * @returns The relative quaternion.
 */
export function getRelativeQuaternion(q1: THREE.Quaternion, q2: THREE.Quaternion): THREE.Quaternion {
    // The rotation from parent q1 to child q2 is inverse(q1) * q2
    const q1Inverse = q1.clone().invert();
    return q1Inverse.multiply(q2);
}

/**
 * Calculates the angle of rotation in degrees from a quaternion.
 * The angle is extracted from the axis-angle representation of the quaternion.
 * @param q - The quaternion.
 * @returns The angle in degrees.
 */
function getAngleFromQuaternion(q: THREE.Quaternion): number {
    // angle = 2 * acos(w)
    const angleRad = 2 * Math.acos(q.w);
    // Convert radians to degrees
    let angleDeg = angleRad * (180 / Math.PI);

    // Normalize angle to be within [0, 360)
    if (angleDeg >= 360) {
        angleDeg %= 360;
    }
    
    return angleDeg;
}

function eulerToQuaternion(row: SensorDataRow): THREE.Quaternion | null {
    if (row.Euler_X != null && row.Euler_Y != null && row.Euler_Z != null) {
        const euler = new THREE.Euler(
            THREE.MathUtils.degToRad(row.Euler_X),
            THREE.MathUtils.degToRad(row.Euler_Y),
            THREE.MathUtils.degToRad(row.Euler_Z),
            'ZYX' 
        );
        return new THREE.Quaternion().setFromEuler(euler);
    }
    if (row.Quat_W != null && row.Quat_X != null && row.Quat_Y != null && row.Quat_Z != null) {
        return new THREE.Quaternion(row.Quat_X, row.Quat_Y, row.Quat_Z, row.Quat_W).normalize();
    }
    return null;
}

/**
 * Processes two sets of sensor data to calculate the relative angle over time.
 * This assumes two sensors are used, one proximal and one distal (e.g., for a single joint).
 * @param data1 - Data from the first sensor (e.g., 'upper_arm.csv').
 * @param data2 - Data from the second sensor (e.g., 'forearm.csv').
 * @returns An array of angles in degrees over time.
 */
export function calculateJointAngles(data1: SensorDataRow[], data2: SensorDataRow[]): number[] {
    const angles: number[] = [];
    const numSamples = Math.min(data1.length, data2.length);

    for (let i = 0; i < numSamples; i++) {
        const q1 = eulerToQuaternion(data1[i]);
        const q2 = eulerToQuaternion(data2[i]);

        if (q1 && q2) {
            const relativeQ = getRelativeQuaternion(q1, q2);
            const angle = getAngleFromQuaternion(relativeQ);
            
            angles.push(angle);
        }
    }

    return angles;
} 