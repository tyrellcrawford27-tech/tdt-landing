import type { Viewport } from 'next';

// Same reasoning as app/apply/layout.tsx: the dashboard is a cream surface, but
// the root layout declares black for the landing page's hero. Left inherited,
// iOS paints black behind the status bar above a cream page.
//
// The hex is repeated rather than imported because Next only statically
// analyses literal values in a viewport export. It must stay in step with
// --surface-light in globals.css, which paints <body> off the marker below.
export const viewport: Viewport = {
  themeColor: '#FAF6F2',
  viewportFit: 'cover',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-surface="light" className="contents">
      {children}
    </div>
  );
}
