import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function ArtworkCard({ project, index, x, y, col = 0, row = 0 }) {
  const navigate = useNavigate();
  const cardRef = useRef(null);

  const isCenterTile = col === 0 && row === 0;

  // Emil Kowalski style mouse tracking with spring physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 150 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-15, 15]);

  function handleMouseMove(e) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(xPct);
    mouseY.set(yPct);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  // Use View Transitions API natively via router v6.27+ viewTransition or by calling startViewTransition
  function handleClick() {
    if (project.url) {
      window.location.href = project.url;
      return;
    }
    if (!document.startViewTransition) {
      navigate(`/project/${project.id}`);
      return;
    }
    document.startViewTransition(() => {
      navigate(`/project/${project.id}`);
    });
  }

  // Stagger entrance based on index
  const delay = index * 0.08;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        delay, 
        type: 'spring', 
        stiffness: 90, 
        damping: 18 
      }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        perspective: '1200px',
        zIndex: 10,
        pointerEvents: 'auto'
      }}
    >
      {/* Dynamic Background Spotlight Glow - Soft White/Blue blend */}
      <div 
        style={{
          position: 'absolute',
          left: '-135px',
          top: '-135px',
          width: '600px',
          height: '720px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.45) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: -1
        }}
      />

      <motion.button
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.025, y: -6 }}
        whileTap={{ scale: 0.985 }}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          viewTransitionName: isCenterTile ? `artwork-card-${project.id}` : undefined
        }}
        className="museum-artwork-card button"
      >
        <div 
          style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex',
            flexDirection: 'column',
            transform: 'translateZ(20px)' /* Clean depth */
          }}
        >
          {/* Main Artwork Image Preview with Passpartout Mat Board */}
          <div className="museum-artwork-image-wrapper">
            <motion.img 
              src={project.image} 
              alt={project.name}
              className="museum-artwork-image"
              style={{
                viewTransitionName: isCenterTile ? `project-image-${project.id}` : undefined
              }}
            />
          </div>

          {/* Minimalist Apple/Museum Plaque */}
          <div className="museum-artwork-plaque" style={{ transform: 'translateZ(30px)' }}>
            <h3 className="museum-artwork-title">
              {project.name}
            </h3>
            <p className="museum-artwork-subtitle">
              {project.language || 'Artwork'}
            </p>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}
