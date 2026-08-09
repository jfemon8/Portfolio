import GradientMesh from '@/components/motion/GradientMesh';
import Beams from '@/components/motion/Beams';
import Noise from '@/components/motion/Noise';

export default function PremiumBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-background" />
      <GradientMesh />
      <Beams />
      <div className="absolute inset-0 bg-grid bg-grid opacity-60 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_55%,transparent_100%)]" />
      <Noise />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,hsl(var(--shadow-color)/calc(var(--shadow-strength)*0.8)))]" />
    </div>
  );
}
