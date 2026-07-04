# ATV3-APP-BUILD-V.0

A Next.js 14 application configured with Vercel Web Analytics.

## Features

- ⚡️ Next.js 14 with App Router
- 📊 Vercel Web Analytics integration
- 🎨 Tailwind CSS for styling
- 📝 TypeScript for type safety
- ✨ ESLint for code quality

## Getting Started

First, install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Build

To create a production build:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

## Linting

To run the linter:

```bash
npm run lint
```

## Vercel Web Analytics

This project is configured with Vercel Web Analytics. The `@vercel/analytics` package has been installed and the `<Analytics />` component is included in the root layout (`app/layout.tsx`).

### Analytics Setup

The Analytics component is imported and added to the root layout:

```tsx
import { Analytics } from '@vercel/analytics/next'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

After deploying to Vercel, enable Web Analytics from your project's dashboard to start collecting data.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.