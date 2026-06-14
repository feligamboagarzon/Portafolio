import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Github } from 'lucide-react';
import { motion } from 'framer-motion';

const PROJECTS = {
  'moibymoi': { name: 'moibymoi', language: 'HTML', image: '/images/moibymoi.png', desc: 'Una interfaz web responsiva construida con HTML semántico puro, enfocada en la legibilidad y la estructura limpia de código.', url: '/moibymoi/index.html' },
  'auto-encuestas': { name: 'Auto-encuestas', language: 'JavaScript', image: '/images/auto-encuestas.png', desc: 'Herramientas de automatización para la recopilación y análisis de encuestas, optimizando flujos de trabajo empresariales y reduciendo tiempos operativos.' },
  'ftools': { name: 'Ftools', language: 'JavaScript', image: '/images/ftools.png', desc: 'Una biblioteca robusta de utilidades y scripts en JavaScript diseñada para simplificar tareas recurrentes de desarrollo y automatización de sistema.', url: '/ftools-web/index.html' },
  'clips': { name: 'clips', language: 'Python', image: '/images/clips.png', desc: 'Script en Python diseñado para procesar, segmentar y organizar archivos multimedia de manera eficiente a través de la línea de comandos.' },
  'inversion': { name: 'Decisiones Inversión', language: 'JavaScript', image: '/images/inversion.png', desc: 'Aplicación financiera interactiva para modelar escenarios de inversión y apoyar la toma de decisiones estratégicas basadas en proyecciones analíticas.', url: '/Proyecto-decisiones-de-inversion/index.html' },
  'fstore': { name: 'fStore', language: 'JavaScript', image: '/images/fstore.png', desc: 'Prototipo de tienda virtual de alto rendimiento que simula un flujo completo de comercio electrónico, integrando un diseño de catálogo limpio.', url: '/fStore/index.html' }
};

export default function ProjectDetail() {
  const { id } = useParams();
  const project = PROJECTS[id];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!project) return <div style={{ padding: '2rem' }}>Proyecto no encontrado</div>;

  const handleBack = (e) => {
    if (document.startViewTransition) {
      e.preventDefault();
      document.startViewTransition(() => {
        window.history.back();
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: -80,
      transition: {
        type: 'spring',
        duration: 0.9,
        bounce: 0.15,
        staggerChildren: 0.18,
        delayChildren: 0.45 /* Wait for view-transition to settle first */
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 35 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: 'spring',
        duration: 0.85,
        bounce: 0.12
      }
    }
  };

  return (
    <div className="project-detail-container">
      <Link to="/" onClick={handleBack} className="back-button button">
        <ArrowLeft size={24} />
      </Link>
      
      <div 
        className="project-hero" 
        style={{ viewTransitionName: `artwork-card-${id}` }}
      >
        <img 
          src={project.image} 
          alt={project.name} 
          className="project-hero-img" 
          style={{ viewTransitionName: `project-image-${id}` }}
        />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="project-content project-detail-card"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem', flexWrap: 'wrap', gap: '2rem' }}>
          <motion.div variants={itemVariants}>
            <h1 style={{ 
              fontFamily: 'var(--font-main)', 
              fontWeight: '700', 
              fontSize: '3.2rem', 
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem',
              color: 'var(--text-color)' 
            }}>
              {project.name}
            </h1>
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--text-muted)', 
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase'
            }}>
              Obra en {project.language}
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants} style={{ display: 'flex', gap: '1rem' }}>
            <a 
              href={`https://github.com/feligamboagarzon/${project.name}`} 
              target="_blank" 
              rel="noreferrer"
              className="button"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.8rem 1.6rem', 
                background: '#111113', 
                color: '#ffffff', 
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.9rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
              }}
            >
              <Github size={18} /> Código Fuente
            </a>
            {project.url && (
              <a 
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="button" 
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.8rem 1.6rem', 
                  background: 'transparent', 
                  color: 'var(--text-color)', 
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  border: '1px solid rgba(0, 0, 0, 0.15)',
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={18} /> Ver Exhibición
              </a>
            )}
          </motion.div>
        </div>
        
        <motion.div 
          variants={itemVariants} 
          style={{ fontSize: '1.05rem', color: '#27272e', lineHeight: 1.8, fontFamily: 'var(--font-main)' }}
        >
          <p style={{ marginBottom: '1.5rem' }}>{project.desc}</p>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1.5rem' }}>
            Esta pieza forma parte de la colección digital oficial de Felipe Gamboa. Representa el diseño de código modular, escrito con un enfoque en estructuras eficientes y estándares semánticos. Puede acceder al repositorio y al despliegue utilizando las acciones superiores.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
