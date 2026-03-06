/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './lib/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                },
                emerald: {
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                },
                surface: {
                    900: '#0a0f1e',
                    800: '#0f1729',
                    700: '#1a2540',
                    600: '#243052',
                    500: '#2e3d66',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['DM Mono', 'monospace'],
            },
            backgroundImage: {
                'gradient-brand': 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
                'gradient-surface': 'linear-gradient(180deg, #0a0f1e 0%, #0f1729 100%)',
            },
            boxShadow: {
                'glow-blue': '0 0 20px rgba(14, 165, 233, 0.3)',
                'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
            },
        },
    },
    plugins: [],
};
