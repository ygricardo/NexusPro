/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}",
        "./App.tsx",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                midnight: '#0B1120', // Deep Blue Background
                primary: {
                    DEFAULT: '#3b82f6', // Electric Blue
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                    950: '#172554',
                },
                secondary: {
                    DEFAULT: '#facc15', // Neon Yellow
                    50: '#fefce8',
                    100: '#fef9c3',
                    200: '#fef08a',
                    300: '#fde047',
                    400: '#facc15',
                    500: '#eab308',
                    600: '#ca8a04',
                    700: '#a16207',
                    800: '#854d0e',
                    900: '#713f12',
                    950: '#422006',
                },
                danger: {
                    DEFAULT: '#f87171', // Neon Red
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#ef4444',
                    600: '#dc2626',
                    700: '#b91c1c',
                    800: '#991b1b',
                    900: '#7f1d1d',
                    950: '#450a0a',
                },
                surface: {
                    light: '#ffffff',
                    dark: '#0B1120', // Midnight Blue Surface
                },
                // Mappings for existing classes in index.css
                'background-light': '#ffffff',
                'text-primary': '#f8fafc', // High contrast white for dark mode default
            },
            boxShadow: {
                'glow': '0 0 20px rgba(59, 130, 246, 0.5)', // Blue glow
                'glow-yellow': '0 0 20px rgba(234, 179, 8, 0.5)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
