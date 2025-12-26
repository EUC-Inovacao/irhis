import { Patient } from '../types';

export const mockPatients: Record<string, Patient> = {
  '1': {
    id: '1',
    name: 'John Doe',
    doctor: { id: 'doc1', name: 'Dr. Smith' },
    recovery_process: [
      { id: 'rp1', name: 'Knee Bends', completed: true },
      { id: 'rp2', name: 'Leg Raises', completed: true },
      { id: 'rp3', name: 'Quad Sets', completed: false },
    ],
    medications: [
      { id: 'med1', name: 'Ibuprofen', dosage: '200mg as needed', completed: true },
      { id: 'med2', name: 'Acetaminophen', dosage: '500mg twice a day', completed: false },
    ],
    weekly_logs: [
      { week: 1, pain: 8, discomfort: 7, tiredness: 6, strength: 3 },
      { week: 2, pain: 6, discomfort: 5, tiredness: 5, strength: 4 },
      { week: 3, pain: 4, discomfort: 3, tiredness: 3, strength: 6 },
    ],
  },
  '2': {
    id: '2',
    name: 'Jane Smith',
    doctor: { id: 'doc1', name: 'Dr. Smith' },
    recovery_process: [
      { id: 'rp4', name: 'Shoulder Pendulum', completed: true },
      { id: 'rp5', name: 'Finger-to-Nose', completed: false },
    ],
    medications: [
      { id: 'med3', name: 'Naproxen', dosage: '220mg every 8-12 hours', completed: true },
    ],
    weekly_logs: [
      { week: 1, pain: 7, discomfort: 8, tiredness: 7, strength: 2 },
      { week: 2, pain: 5, discomfort: 6, tiredness: 5, strength: 3 },
      { week: 3, pain: 3, discomfort: 4, tiredness: 4, strength: 5 },
    ],
  },
  '3': {
    id: '3',
    name: 'Robert Johnson',
    doctor: { id: 'doc1', name: 'Dr. Smith' },
    recovery_process: [
      { id: 'rp6', name: 'Ankle Pumps', completed: true },
      { id: 'rp7', name: 'Heel Slides', completed: true },
      { id: 'rp8', name: 'Calf Stretches', completed: true },
    ],
    medications: [],
    weekly_logs: [
      { week: 1, pain: 5, discomfort: 4, tiredness: 3, strength: 7 },
      { week: 2, pain: 3, discomfort: 2, tiredness: 2, strength: 8 },
      { week: 3, pain: 1, discomfort: 1, tiredness: 1, strength: 9 },
    ],
  },
  '4': {
    id: '4',
    name: 'Emily Williams',
    doctor: { id: 'doc1', name: 'Dr. Smith' },
    recovery_process: [
      { id: 'rp9', name: 'Wrist Flexion', completed: false },
      { id: 'rp10', name: 'Grip Strengthening', completed: false },
    ],
    medications: [
      { id: 'med4', name: 'Celecoxib', dosage: '200mg once a day', completed: false },
    ],
    weekly_logs: [
      { week: 1, pain: 9, discomfort: 9, tiredness: 8, strength: 1 },
      { week: 2, pain: 8, discomfort: 8, tiredness: 7, strength: 2 },
      { week: 3, pain: 7, discomfort: 7, tiredness: 6, strength: 3 },
    ],
  },
  '5': {
    id: '5',
    name: 'Michael Brown',
    doctor: { id: 'doc1', name: 'Dr. Smith' },
    recovery_process: [
        { id: 'rp11', name: 'Back Extension', completed: true },
        { id: 'rp12', name: 'Pelvic Tilt', completed: false },
    ],
    medications: [
      { id: 'med5', name: 'Meloxicam', dosage: '15mg once a day', completed: true },
      { id: 'med6', name: 'Tylenol', dosage: 'As needed for pain', completed: false },
    ],
    weekly_logs: [
      { week: 1, pain: 6, discomfort: 6, tiredness: 9, strength: 4 },
      { week: 2, pain: 4, discomfort: 4, tiredness: 7, strength: 5 },
    ],
  },
}; 