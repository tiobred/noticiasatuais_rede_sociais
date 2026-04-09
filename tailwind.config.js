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
                bg: {
                    base: 'var(--bg-base)',
                    surface: 'var(--bg-surface)',
                    elevated: 'var(--bg-elevated)',
                },
                text: {
                    primary: 'var(--text-primary)',
                    secondary: 'var(--text-secondary)',
                    muted: 'var(--text-muted)',
                },
                purple: {
                  400: 'var(--purple-400)',
                  500: 'var(--purple-500)',
                },
                pink: {
                  500: 'var(--pink-500)',
                },
                cyan: {
                  400: 'var(--cyan-400)',
                },
                green: {
                  400: 'var(--green-400)',
                },
                amber: {
                  400: 'var(--amber-400)',
                },
                red: {
                  400: 'var(--red-400)',
                },
                border: {
                  subtle: 'var(--border-subtle)',
                  default: 'var(--border-default)',
                  strong: 'var(--border-strong)',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            backgroundImage: {
                'grad-primary': 'var(--grad-primary)',
                'grad-accent': 'var(--grad-accent)',
                'grad-success': 'var(--grad-success)',
                'grad-warm': 'var(--grad-warm)',
            },
            boxShadow: {
                'purple': 'var(--shadow-purple)',
                'glow': 'var(--shadow-glow)',
            },
            borderRadius: {
              'sm': 'var(--radius-sm)',
              'md': 'var(--radius-md)',
              'lg': 'var(--radius-lg)',
              'xl': 'var(--radius-xl)',
            }
        },
    },
    plugins: [],
};
