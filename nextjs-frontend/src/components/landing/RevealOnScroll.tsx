'use client';
import { useEffect, useRef, useState } from 'react';

export default function RevealOnScroll({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); if (ref.current) observer.unobserve(ref.current); }
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.disconnect(); };
  }, []);
  const delayClass = delay ? `delay-${delay}` : '';
  return (
    <div ref={ref} className={`${isVisible ? 'animate-fade-in-up' : 'opacity-0'} ${delayClass} ${className}`}>
      {children}
    </div>
  );
}
