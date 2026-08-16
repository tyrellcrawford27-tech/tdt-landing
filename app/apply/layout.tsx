import type { Viewport } from 'next';

// The apply flow is a light surface end to end, but the root layout declares a
// black theme colour for the landing page's black hero. Inherited here, iOS
// paints that black behind the status bar and tints Safari's chrome dark above
// a cream page. Declaring the flow's own colour keeps the chrome continuous
// with the page — the status bar reads as part of the app, not a bar above it.
//
// `data-surface="light"` on the wrapper below is what repaints <body> to match
// (see globals.css); theme-color alone leaves the near-black body showing on
// overscroll rubber-band.
export const viewport: Viewport = {
  themeColor: '#FAF6F2',
  viewportFit: 'cover',
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-surface="light" className="contents">
      {children}
    </div>
  );
}
