import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Laurel Highlands For Us',
  description: 'A community for Laurel Highlands rental owners and Airbnb operators.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
