export const lightColors = {
    primary: '#2563EB', // Professional blue for healthcare - trustworthy and calming
    background: '#F8FAFC', // Very light blue-gray for background
    card: '#FFFFFF', // Pure white for card backgrounds
    text: '#0F172A', // Dark slate for primary text - high contrast
    textSecondary: '#64748B', // Medium slate for secondary text
    border: '#E2E8F0', // Light slate border
    notification: '#EF4444', // Red for notifications
    white: '#FFFFFF',
    black: '#000000',
    darkGray: '#475569',
    mediumGray: '#CBD5E1',
    success: '#059669', // Professional green for success states
    warning: '#D97706', // Amber for warning states
    info: '#0284C7', // Sky blue for info states
    error: '#DC2626', // Red for errors
    purple: {
        50: '#F5F3FF',
        100: '#EDE9FE',
        500: '#6366F1', // Indigo for accents
        600: '#4F46E5',
        700: '#4338CA',
    },
    gray: {
        50: '#F8FAFC',
        100: '#F1F5F9',
        200: '#E2E8F0',
        300: '#CBD5E1',
        400: '#94A3B8',
        500: '#64748B',
        600: '#475569',
        700: '#334155',
        800: '#1E293B',
        900: '#0F172A',
    }
};

export const darkColors = {
    primary: '#3B82F6', // Lighter blue for dark mode
    background: '#0F172A', // Dark slate background
    card: '#1E293B', // Slightly lighter slate for cards
    text: '#F1F5F9', // Near white for primary text
    textSecondary: '#94A3B8', // Light slate for secondary text
    border: '#334155',
    notification: '#EF4444', // Keep the same red for notifications
    white: '#FFFFFF',
    black: '#000000',
    darkGray: '#64748B',
    mediumGray: '#475569',
    success: '#10B981', // Brighter green for dark mode
    warning: '#F59E0B', // Brighter amber for dark mode
    info: '#0EA5E9', // Sky blue for dark mode
    error: '#EF4444', // Red for errors
    purple: {
        50: '#312E81',
        100: '#3730A3',
        500: '#6366F1',
        600: '#4F46E5',
        700: '#4338CA',
    },
    gray: {
        50: '#1E293B',
        100: '#334155',
        200: '#475569',
        300: '#64748B',
        400: '#94A3B8',
        500: '#CBD5E1',
        600: '#E2E8F0',
        700: '#F1F5F9',
        800: '#F8FAFC',
        900: '#FFFFFF',
    }
};

// Default export for initial load, can be updated by theme context
export const colors = lightColors; 