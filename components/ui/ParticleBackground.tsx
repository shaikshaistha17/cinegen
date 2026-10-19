"use client";

export function ParticleBackground() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 8}s`,
    duration: `${8 + Math.random() * 4}s`,
    size: `${2 + Math.random() * 4}px`,
    color: i % 2 === 0 ? "rgba(139, 92, 246, 0.3)" : "rgba(34, 211, 238, 0.3)",
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full blur-sm animate-float-slow"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            background: particle.color,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}
    </div>
  );
}

export default ParticleBackground;
