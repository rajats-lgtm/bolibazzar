/**
 * Standalone Tailwind config. The marketing site does not share the app's
 * design system, so it scans only its own files.
 */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
};
