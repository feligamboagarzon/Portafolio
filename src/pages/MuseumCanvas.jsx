import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import ArtworkCard from '../components/ArtworkCard';

const PROJECTS = [
  // Wing I (Left Wing: Interactive Web & UI)
  { id: 'moibymoi', name: 'moibymoi', language: 'HTML', image: '/images/moibymoi.png', x: 450, y: 350, url: '/moibymoi/index.html' },
  { id: 'auto-encuestas', name: 'Auto-encuestas', language: 'JavaScript', image: '/images/auto-encuestas.png', x: 750, y: 900 },
  
  // Wing II (Right Wing: Full-Stack & Systems)
  { id: 'fstore', name: 'fStore', language: 'JavaScript', image: '/images/fstore.png', x: 3050, y: 350, url: '/fStore/index.html' },
  { id: 'inversion', name: 'Decisiones Inversión', language: 'JavaScript', image: '/images/inversion.png', x: 2750, y: 900, url: '/Proyecto-decisiones-de-inversion/index.html' },
  
  // Wing III (Bottom Wing: Algorithms & Scripts)
  { id: 'ftools', name: 'Ftools', language: 'JavaScript', image: '/images/ftools.png', x: 1100, y: 1250, url: '/ftools-web/index.html' },
  { id: 'clips', name: 'clips', language: 'Python', image: '/images/clips.png', x: 2170, y: 1250 }
];

const TILE_WIDTH = 3600;
const TILE_HEIGHT = 1600;

export default function MuseumCanvas() {
  const constraintsRef = useRef(null);

  // Drag offsets
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Infinite looping logic: monitor drag values and loop seamlessly
  useEffect(() => {
    const unsubscribeX = x.on("change", (latest) => {
      if (latest < -TILE_WIDTH / 2) {
        x.set(latest + TILE_WIDTH);
      } else if (latest > TILE_WIDTH / 2) {
        x.set(latest - TILE_WIDTH);
      }
    });

    const unsubscribeY = y.on("change", (latest) => {
      if (latest < -TILE_HEIGHT / 2) {
        y.set(latest + TILE_HEIGHT);
      } else if (latest > TILE_HEIGHT / 2) {
        y.set(latest - TILE_HEIGHT);
      }
    });

    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [x, y]);

  // Dynamic flashlight setup
  const bgMouseX = useMotionValue(0);
  const bgMouseY = useMotionValue(0);
  const bgSpringX = useSpring(bgMouseX, { damping: 50, stiffness: 220 });
  const bgSpringY = useSpring(bgMouseY, { damping: 50, stiffness: 220 });

  function handleViewportMouseMove(e) {
    bgMouseX.set(e.clientX);
    bgMouseY.set(e.clientY);
  }

  return (
    <div 
      className="museum-viewport" 
      ref={constraintsRef}
      onMouseMove={handleViewportMouseMove}
    >
      {/* Dynamic Cursor Light Source */}
      <motion.div 
        className="museum-flashlight" 
        style={{
          left: bgSpringX,
          top: bgSpringY,
        }}
      />

      <div className="museum-canvas-bg" />
      
      {/* Draggable Surface */}
      <motion.div 
        drag 
        dragElastic={0.1}
        dragMomentum={true}
        style={{ 
          width: `${TILE_WIDTH}px`, 
          height: `${TILE_HEIGHT}px`, 
          position: 'absolute', 
          top: `calc(50vh - ${TILE_HEIGHT / 2}px)`, 
          left: `calc(50vw - ${TILE_WIDTH / 2}px)`, 
          x,
          y,
          cursor: 'grab' 
        }}
        whileTap={{ cursor: 'grabbing' }}
      >
        {/* Render a 3x3 repetition grid of tiles */}
        {[-1, 0, 1].map(col => 
          [-1, 0, 1].map(row => (
            <div 
              key={`${col}_${row}`}
              style={{
                position: 'absolute',
                left: col * TILE_WIDTH,
                top: row * TILE_HEIGHT,
                width: TILE_WIDTH,
                height: TILE_HEIGHT,
                pointerEvents: 'none' /* Let drag pass through to the motion.div wrapper */
              }}
            >
              {/* Ambient Floating Orbs for Parallax/Depth */}
              <div className="ambient-orb orb-violet" style={{ left: '400px', top: '200px' }} />
              <div className="ambient-orb orb-blue" style={{ left: '2600px', top: '600px' }} />
              <div className="ambient-orb orb-peach" style={{ left: '1600px', top: '900px' }} />
              <div className="ambient-orb orb-violet" style={{ left: '1800px', top: '100px' }} />

              {/* Coordinated Guiding Thread (SVG Network) */}
              <svg style={{ position: 'absolute', left: 0, top: 0, width: `${TILE_WIDTH}px`, height: `${TILE_HEIGHT}px`, pointerEvents: 'none', zIndex: 1 }}>
                {/* Left Wing (Wing I) Path: Lobby to auto-encuestas to moibymoi */}
                <path 
                  d="M 1800 750 Q 1300 950, 915 1125 T 615 575" 
                  fill="none" 
                  className="museum-thread"
                />
                {/* Right Wing (Wing II) Path: Lobby to inversion to fstore */}
                <path 
                  d="M 1800 750 Q 2300 950, 2915 1125 T 3215 575" 
                  fill="none" 
                  className="museum-thread"
                />
                {/* Bottom Wing (Wing III) Paths: Lobby to ftools and clips */}
                <path 
                  d="M 1800 750 Q 1600 1100, 1265 1475" 
                  fill="none" 
                  className="museum-thread"
                />
                <path 
                  d="M 1800 750 Q 2000 1100, 2335 1475" 
                  fill="none" 
                  className="museum-thread"
                />
              </svg>

              {/* Wall Divider Lines */}
              <div className="museum-divider-line" style={{ left: '1250px', top: '150px' }} />
              <div className="museum-divider-line" style={{ left: '2350px', top: '150px' }} />

              {/* Gallery Wing Labels */}
              {/* Wing I: Left */}
              <div className="museum-wing-header" style={{ left: '625px', top: '200px' }}>
                <span className="museum-wing-eyebrow">Ala I</span>
                <h2 className="museum-wing-title">Interfaces & Frontend</h2>
              </div>

              {/* Wing II: Right */}
              <div className="museum-wing-header" style={{ left: '2975px', top: '200px' }}>
                <span className="museum-wing-eyebrow">Ala II</span>
                <h2 className="museum-wing-title">Sistemas & Full-Stack</h2>
              </div>

              {/* Wing III: Bottom */}
              <div className="museum-wing-header" style={{ left: '1800px', top: '1120px' }}>
                <span className="museum-wing-eyebrow">Ala III</span>
                <h2 className="museum-wing-title">Algoritmos & Scripts</h2>
              </div>

              {/* Welcome Lobby Manifesto Plaque (Center Lobby) */}
              <div 
                className="museum-lobby-card" 
                style={{ 
                  left: '1800px', 
                  top: '750px', 
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'auto' /* Re-enable pointer events for clicks */
                }}
              >
                <span className="museum-lobby-eyebrow">Manifiesto de la Exposición</span>
                <h1 className="museum-lobby-title">Felipe Gamboa</h1>
                
                <div className="museum-lobby-divider" />
                
                <p className="museum-lobby-desc">
                  Creador y desarrollador enfocado en soluciones <strong>AI-first</strong>. Uniendo la estrategia de negocio y la computación como estudiante de Administración de Empresas en la <strong>Universidad de los Andes</strong>. Diseñando herramientas digitales donde la lógica analítica se encuentra con el pulido visual.
                </p>
                
                <div className="museum-lobby-navigation">
                  <span>← Ala I</span>
                  <span>Ala III ↓</span>
                  <span>Ala II →</span>
                </div>
              </div>

              {/* Ambient Wall Quotes */}
              <div className="museum-wall-quote" style={{ left: '150px', top: '550px' }}>
                "El diseño no es solo cómo se ve y cómo se siente. El diseño es cómo funciona."
                <span>— Steve Jobs</span>
              </div>

              <div className="museum-wall-quote" style={{ left: '3200px', top: '600px' }}>
                "La simplicidad es la máxima sofisticación. Detrás de cada interfaz elegante se encuentra un algoritmo robusto."
                <span>— Leonardo da Vinci</span>
              </div>

              {/* Room Numbers */}
              <div className="museum-wall-number" style={{ left: '400px', top: '200px' }}>01</div>
              <div className="museum-wall-number" style={{ left: '1800px', top: '480px', transform: 'translateX(-50%)' }}>Vestíbulo</div>
              <div className="museum-wall-number" style={{ left: '3200px', top: '200px' }}>02</div>

              {/* Artworks */}
              {PROJECTS.map((proj, i) => (
                <ArtworkCard 
                  key={`${proj.id}_${col}_${row}`} 
                  project={proj} 
                  index={i} 
                  x={proj.x} 
                  y={proj.y} 
                  col={col}
                  row={row}
                />
              ))}
            </div>
          ))
        )}
      </motion.div>

      {/* Floating Action Menu */}
      <div className="museum-nav">
        <Link 
          to="/resume" 
          className="museum-nav-item button"
          onClick={(e) => {
            if (document.startViewTransition) {
              e.preventDefault();
              document.startViewTransition(() => {
                window.location.href = '/resume';
              });
            }
          }}
        >
          <User size={18} />
          <span>Curículum del Curador</span>
        </Link>
      </div>
    </div>
  );
}
