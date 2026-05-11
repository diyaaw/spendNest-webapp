'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import PricingSection from '@/components/landing/PricingSection';
import AboutSection from '@/components/landing/AboutSection';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  const router = useRouter();
  const handleStartApp = () => router.push('/login');
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar onStartApp={handleStartApp} />
      <HeroSection onStartApp={handleStartApp} />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection onStartApp={handleStartApp} />
      <AboutSection onStartApp={handleStartApp} />
      <Footer />
    </div>
  );
}
