/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        sunken: 'var(--sunken)',
        line: { DEFAULT: 'var(--line)', strong: 'var(--line-strong)' },
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)', 3: 'var(--ink-3)' },
        accent: { DEFAULT: 'var(--accent)', hover: 'var(--accent-hover)', soft: 'var(--accent-soft)' },
        status: {
          pending: 'var(--pending)',
          progress: 'var(--progress)',
          done: 'var(--done)',
          void: 'var(--void)',
        },
        danger: { DEFAULT: 'var(--danger)', soft: 'var(--danger-soft)', line: 'var(--danger-line)' },
        'pending-line': 'var(--pending-line)',
        scrim: 'var(--scrim)',
        notice: { DEFAULT: 'var(--notice)', line: 'var(--notice-line)' },
      },
      borderRadius: { DEFAULT: 'var(--radius)' },
      boxShadow: { overlay: 'var(--shadow-overlay)' },
      fontSize: { '2xs': ['11px', '16px'] },
    },
  },
  plugins: [],
};
