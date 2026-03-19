// // frontend/.storybook/preview.ts
// import type { Preview } from '@storybook/react';
// import { withThemeByClassName } from '@storybook/addon-themes';
// import '../src/styles/globals.css';

// const preview: Preview = {
//   parameters: {
//     actions: { argTypesRegex: '^on[A-Z].*' },
//     controls: {
//       matchers: {
//         color: /(background|color)$/i,
//         date: /Date$/,
//       },
//     },
//     docs: {
//       toc: true,
//     },
//     backgrounds: {
//       default: 'light',
//       values: [
//         {
//           name: 'light',
//           value: '#ffffff',
//         },
//         {
//           name: 'dark',
//           value: '#0f172a',
//         },
//         {
//           name: 'gray',
//           value: '#f8fafc',
//         },
//       ],
//     },
//     viewport: {
//       viewports: {
//         mobile: {
//           name: 'Mobile',
//           styles: {
//             width: '375px',
//             height: '667px',
//           },
//         },
//         tablet: {
//           name: 'Tablet',
//           styles: {
//             width: '768px',
//             height: '1024px',
//           },
//         },
//         desktop: {
//           name: 'Desktop',
//           styles: {
//             width: '1024px',
//             height: '768px',
//           },
//         },
//         largeDesktop: {
//           name: 'Large Desktop',
//           styles: {
//             width: '1440px',
//             height: '900px',
//           },
//         },
//       },
//     },
//     layout: 'centered',
//   },
//   decorators: [
//     withThemeByClassName({
//       themes: {
//         light: 'light',
//         dark: 'dark',
//       },
//       defaultTheme: 'light',
//     }),
//     (Story) => ({
//       <div className="min-h-screen bg-background text-foreground">
//         <div className="container mx-auto p-4">
//           <Story />
//         </div>
//       </div>
//     }),
//   ],
//   globalTypes: {
//     theme: {
//       description: 'Global theme for components',
//       defaultValue: 'light',
//       toolbar: {
//         title: 'Theme',
//         icon: 'paintbrush',
//         items: ['light', 'dark'],
//         showName: true,
//       },
//     },
//     locale: {
//       description: 'Internationalization locale',
//       defaultValue: 'en',
//       toolbar: {
//         icon: 'globe',
//         items: [
//           { value: 'en', title: 'English' },
//           { value: 'hi', title: 'हिन्दी' },
//         ],
//         showName: true,
//       },
//     },
//     viewport: {
//       description: 'Device viewport',
//       defaultValue: 'desktop',
//       toolbar: {
//         title: 'Viewport',
//         icon: 'mobile',
//         items: [
//           { value: 'mobile', title: 'Mobile' },
//           { value: 'tablet', title: 'Tablet' },
//           { value: 'desktop', title: 'Desktop' },
//         ],
//         showName: true,
//       },
//     },
//   },
//   argTypes: {
//     // Common prop types for FreshFlow components
//     size: {
//       control: { type: 'select' },
//       options: ['sm', 'md', 'lg', 'xl'],
//     },
//     variant: {
//       control: { type: 'select' },
//       options: ['primary', 'secondary', 'success', 'warning', 'danger', 'outline'],
//     },
//     disabled: {
//       control: { type: 'boolean' },
//     },
//     loading: {
//       control: { type: 'boolean' },
//     },
//     className: {
//       control: { type: 'text' },
//     },
//   },
//   tags: ['autodocs'],
// };

// export default preview;