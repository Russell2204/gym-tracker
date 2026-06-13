import LandingHeader from '@/components/landing/LandingHeader';
import LandingMotion from '@/components/landing/LandingMotion';
import Hero from '@/components/landing/Hero';
import FeatureGrid from '@/components/landing/FeatureGrid';
import StatsStrip from '@/components/landing/StatsStrip';
import ShowcasePhone from '@/components/landing/ShowcasePhone';
import Testimonials from '@/components/landing/Testimonials';
import CTA from '@/components/landing/CTA';
import LandingFooter from '@/components/landing/LandingFooter';

export default function LandingPage() {
  return (
    <LandingMotion>
      <div className="min-h-dvh">
        <LandingHeader />
        <main>
          <Hero />
          <StatsStrip />
          <FeatureGrid />
          <ShowcasePhone />
          <Testimonials />
          <CTA />
        </main>
        <LandingFooter />
      </div>
    </LandingMotion>
  );
}
