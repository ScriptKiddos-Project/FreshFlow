// // frontend/.storybook/main.ts
// import type { StorybookConfig } from '@storybook/react-vite';
// import { mergeConfig } from 'vite';
// import path from 'path';

// const config: StorybookConfig = {
//   stories: [
//     '../src/**/*.stories.@(js|jsx|ts|tsx|mdx)',
//     '../src/**/*.story.@(js|jsx|ts|tsx|mdx)',
//   ],
//   addons: [
//     '@storybook/addon-links',
//     '@storybook/addon-essentials',
//     '@storybook/addon-interactions',
//     '@storybook/addon-docs',
//     '@storybook/addon-controls',
//     '@storybook/addon-viewport',
//     '@storybook/addon-backgrounds',
//     '@storybook/addon-measure',
//     '@storybook/addon-outline',
//     '@storybook/addon-a11y',
//   ],
//   framework: {
//     name: '@storybook/react-vite',
//     options: {},
//   },
//   docs: {
//     autodocs: 'tag',
//     defaultName: 'Documentation',
//   },
//   features: {
//     buildStoriesJson: true,
//   },
//   typescript: {
//     check: false,
//     reactDocgen: 'react-docgen-typescript',
//     reactDocgenTypescriptOptions: {
//       shouldExtractLiteralValuesFromEnum: true,
//       propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
//     },
//   },
//   viteFinal: async (config) => {
//     return mergeConfig(config, {
//       resolve: {
//         alias: {
//           '@': path.resolve(__dirname, '../src'),
//           '@/components': path.resolve(__dirname, '../src/components'),
//           '@/pages': path.resolve(__dirname, '../src/pages'),
//           '@/hooks': path.resolve(__dirname, '../src/hooks'),
//           '@/store': path.resolve(__dirname, '../src/store'),
//           '@/services': path.resolve(__dirname, '../src/services'),
//           '@/utils': path.resolve(__dirname, '../src/utils'),
//           '@/types': path.resolve(__dirname, '../src/types'),
//           '@/styles': path.resolve(__dirname, '../src/styles'),
//         },
//       },
//       css: {
//         postcss: {
//           plugins: [
//             require('tailwindcss'),
//             require('autoprefixer'),
//           ],
//         },
//       },
//       define: {
//         global: 'globalThis',
//       },
//       optimizeDeps: {
//         include: ['@storybook/addon-docs'],
//       },
//     });
//   },
//   env: (config) => ({
//     ...config,
//     // Environment variables for Storybook
//     STORYBOOK: 'true',
//   }),
//   core: {
//     disableTelemetry: true,
//   },
//   staticDirs: ['../public'],
// };

// export default config;