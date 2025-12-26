import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SegmentOrientation } from '../types';

export interface BodyOrientations {
    torso?: SegmentOrientation;
    pelvis?: SegmentOrientation;
    rightThigh?: SegmentOrientation;
    rightShin?: SegmentOrientation;
    rightFoot?: SegmentOrientation;
    leftThigh?: SegmentOrientation;
    leftShin?: SegmentOrientation;
    leftFoot?: SegmentOrientation;
    rightUpperArm?: SegmentOrientation;
    rightForearm?: SegmentOrientation;
    leftUpperArm?: SegmentOrientation;
    leftForearm?: SegmentOrientation;
}

export interface AvatarProps {
    orientations?: BodyOrientations;
    horizontalRotation?: number;
    verticalRotation?: number;
    size?: number;
}

const Avatar: React.FC<AvatarProps> = ({ 
    orientations, 
    horizontalRotation = 0, 
    verticalRotation = 0,
    size = 300 
}) => {
    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <View style={styles.placeholder}>
                {/* Placeholder for 3D Avatar - will be re-enabled after build fix */}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholder: {
        width: 100,
        height: 100,
        backgroundColor: '#6b7280',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default Avatar; 