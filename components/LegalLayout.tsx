import Link from 'next/link';

export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[720px] px-6 md:px-0 py-[60px] md:py-[90px]">
        <Link
          href="/"
          className="mb-[40px] inline-block text-[13px] text-white/40 hover:text-white/70 transition-colors"
        >
          ← Back to home
        </Link>

        <h1 className="text-[32px] md:text-[40px] font-bold tracking-[-0.02em] leading-[1.15] mb-[40px]">
          {title}
        </h1>

        <div className="legal-content text-[15px] leading-[26px] text-white/70">
          {children}
        </div>
      </div>
    </div>
  );
}
