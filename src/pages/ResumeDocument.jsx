import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResumeDocument() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleBack = (e) => {
    if (document.startViewTransition) {
      e.preventDefault();
      document.startViewTransition(() => {
        window.history.back();
      });
    }
  };

  return (
    <div style={{ backgroundColor: '#f5f4f0', minHeight: '100vh', color: '#1a1a1e', fontFamily: 'var(--font-main)' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 2rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <Link to="/" onClick={handleBack} className="button" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.75rem 1.5rem', background: '#1a1a1e', borderRadius: '4px',
            fontWeight: 600, color: '#f5f4f0', fontSize: '0.9rem',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
          }}>
            <ArrowLeft size={18} /> Volver al Museo
          </Link>
          
          <button className="button" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.75rem 1.5rem', background: 'transparent', color: '#1a1a1e', 
            borderRadius: '4px', border: '1px solid #1a1a1e',
            fontWeight: 600, fontSize: '0.9rem'
          }}>
            <Download size={18} /> Exportar Documento
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="resume-paper"
        >
          {/* Formal Editorial Header */}
          <header style={{ borderBottom: '1px solid #1a1a1e', paddingBottom: '2rem', marginBottom: '2.5rem' }}>
            <h1 style={{ 
              fontFamily: 'var(--font-serif)', 
              fontSize: '3.6rem', 
              fontWeight: '300',
              fontStyle: 'italic',
              letterSpacing: '-0.02em', 
              marginBottom: '0.2rem',
              color: '#1a1a1e'
            }}>
              Felipe Gamboa
            </h1>
            <p style={{ 
              fontSize: '0.85rem', 
              color: '#76757d', 
              fontFamily: 'var(--font-main)',
              fontWeight: '700',
              letterSpacing: '0.2em',
              textTransform: 'uppercase'
            }}>
              Estudiante de Administración de Empresas & Creador de Software
            </p>
            <div style={{ marginTop: '1.2rem', display: 'flex', gap: '2rem', fontSize: '0.85rem', color: '#56555c', fontWeight: 500 }}>
              <span>feligamboagarzon@gmail.com</span>
              <span>github.com/feligamboagarzon</span>
            </div>
          </header>

          {/* Sections */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              fontFamily: 'var(--font-serif)', 
              fontSize: '1.1rem', 
              textTransform: 'uppercase', 
              letterSpacing: '0.2em', 
              marginBottom: '1.2rem', 
              color: '#1a1a1e',
              borderBottom: '1px solid #e6e5df',
              paddingBottom: '0.4rem'
            }}>
              Sobre Mí
            </h2>
            <p style={{ lineHeight: 1.8, color: '#3a3a40', fontSize: '0.98rem' }}>
              Desarrollador y creador (maker) apasionado por la construcción de herramientas y aplicaciones robustas a través de tecnologías modernas. Mi enfoque es crear utilidades que resuelvan problemas reales de negocio, desde automatizaciones y análisis de datos hasta interfaces con un meticuloso pulido visual.
            </p>
          </section>

          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ 
              fontFamily: 'var(--font-serif)', 
              fontSize: '1.1rem', 
              textTransform: 'uppercase', 
              letterSpacing: '0.2em', 
              marginBottom: '1.2rem', 
              color: '#1a1a1e',
              borderBottom: '1px solid #e6e5df',
              paddingBottom: '0.4rem'
            }}>
              Experiencia
            </h2>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1a1a1e' }}>Desarrollador de Software</h3>
                <span style={{ color: '#76757d', fontSize: '0.85rem', fontWeight: 600 }}>2022 - Presente</span>
              </div>
              <p style={{ color: '#3a3a40', lineHeight: 1.7, fontSize: '0.98rem' }}>
                Desarrollo de aplicaciones web full-stack, automatización de flujos de encuestas e integración de APIs críticas para maximizar la productividad y eficiencia operativa del equipo.
              </p>
            </div>
          </section>

          <section>
            <h2 style={{ 
              fontFamily: 'var(--font-serif)', 
              fontSize: '1.1rem', 
              textTransform: 'uppercase', 
              letterSpacing: '0.2em', 
              marginBottom: '1.2rem', 
              color: '#1a1a1e',
              borderBottom: '1px solid #e6e5df',
              paddingBottom: '0.4rem'
            }}>
              Educación
            </h2>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1a1a1e' }}>Administración de Empresas • Universidad de los Andes</h3>
                <span style={{ color: '#76757d', fontSize: '0.85rem', fontWeight: 600 }}>Actualmente cursando</span>
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
