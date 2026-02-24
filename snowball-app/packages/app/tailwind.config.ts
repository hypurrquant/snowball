/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Dark backgrounds
                'dark-900': '#0a0a0f',
                'dark-800': '#0d1117',
                'dark-700': '#111827',
                'dark-600': '#1a2035',
                'dark-500': '#1e293b',
                'dark-400': '#2d3748',
                // Ice blue accent
                'ice-50': '#eff6ff',
                'ice-100': '#dbeafe',
                'ice-200': '#bfdbfe',
                'ice-300': '#93c5fd',
                'ice-400': '#60a5fa',
                'ice-500': '#3b82f6',
                'ice-600': '#2563eb',
                // Status colors
                'status-safe': '#22c55e',
                'status-warn': '#eab308',
                'status-danger': '#ef4444',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'ice-gradient': 'linear-gradient(135deg, #60a5fa, #93c5fd)',
                'dark-gradient': 'linear-gradient(180deg, #0a0a0f 0%, #111827 100%)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite',
                'slide-up': 'slideUp 0.3s ease-out',
                'fade-in': 'fadeIn 0.4s ease-out',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                glow: {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(96, 165, 250, 0.3)' },
                    '50%': { boxShadow: '0 0 40px rgba(96, 165, 250, 0.6)' },
                },
                slideUp: {
                    from: { transform: 'translateY(10px)', opacity: '0' },
                    to: { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
            },
            boxShadow: {
                'ice': '0 0 20px rgba(96, 165, 250, 0.2)',
                'ice-lg': '0 0 40px rgba(96, 165, 250, 0.3)',
                'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
                'card-hover': '0 8px 32px rgba(96, 165, 250, 0.15)',
            },
            borderRadius: {
                'xl2': '1rem',
                '2xl': '1.5rem',
            },
        },
    },
    plugins: [],
}
