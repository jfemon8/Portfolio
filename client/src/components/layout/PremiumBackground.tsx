import GradientMesh from '@/components/motion/GradientMesh';
import Beams from '@/components/motion/Beams';
import Noise from '@/components/motion/Noise';

/**
 * Fixed cinematic backdrop for the whole public site: animated gradient
 * mesh + masked grid + film grain + vignette. Pointer-transparent, behind
 * all content.
 */
export default function PremiumBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-background" />
      <GradientMesh />
      <Beams />
      <div className="absolute inset-0 bg-grid bg-grid opacity-60 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_55%,transparent_100%)]" />
      <Noise />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.55))]" />
    </div>
  );
}
