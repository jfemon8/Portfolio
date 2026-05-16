/** Fixed decorative background: animated grid + floating neon orbs. */
export default function Background() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)] opacity-70" />
      <div className="absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-neon/20 blur-[120px] animate-pulse-slow" />
      <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-neon-violet/20 blur-[130px] animate-pulse-slow [animation-delay:1.5s]" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-neon-blue/10 blur-[120px] animate-pulse-slow [animation-delay:3s]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,.55))]" />
    </div>
  );
}
