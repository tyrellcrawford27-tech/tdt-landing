'use client';

import { useState } from 'react';

interface Props {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

const BASE_BG: React.CSSProperties = {
  backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50.18%)',
  backgroundBlendMode: 'soft-light, normal',
  boxShadow:
    'rgba(0,0,0,0.25) 0px 0px 0px 0.8px inset, rgba(255,255,255,0.1) 0px 0px 5px 5px inset, rgba(255,255,255,0.25) 0px 0px 3px 1px inset, rgba(255,255,255,0.04) 0px 0px 4px 20px inset',
};

export function CTAButton({ href, onClick, children, className = '' }: Props) {
  const [pos, setPos] = useState({ x: 0, y: 0, on: false });

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top, on: true });
  };
  const onLeave = () => setPos(p => ({ ...p, on: false }));

  const inner = (
    <>
      {/* Base fill */}
      <div
        className="absolute inset-0 rounded-[33px] pointer-events-none bg-[#B34929] transition-[filter,background-color] duration-200 ease-out group-hover:bg-[#C25433] group-hover:brightness-[1.06]"
        style={BASE_BG}
      />
      {/* Mouse-tracking spotlight */}
      <div
        className="absolute inset-0 rounded-[33px] pointer-events-none transition-opacity duration-150"
        style={{
          opacity: pos.on ? 1 : 0,
          background: `radial-gradient(circle at ${pos.x}px ${pos.y}px, rgba(255,255,255,0.22) 0%, transparent 65%)`,
        }}
      />
      <span className="relative">{children}</span>
    </>
  );

  const shared =
    `group relative inline-flex items-center justify-center overflow-hidden rounded-[33px] font-normal text-white transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_8px_22px_-6px_rgba(179,73,41,0.55)] active:translate-y-0 active:scale-[0.98] ${className}`;

  if (href) {
    return (
      <a href={href} className={shared} onMouseMove={onMove} onMouseLeave={onLeave}>
        {inner}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={shared} onMouseMove={onMove} onMouseLeave={onLeave}>
      {inner}
    </button>
  );
}
