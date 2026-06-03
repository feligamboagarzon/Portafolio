import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { portfolioData } from '../data/portfolioData';

const Volunteering = () => {
  const { volunteering } = portfolioData;
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = volunteering.images;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= images.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  return (
    <section className="volunteering section">
      <div className="container">
        <motion.div 
          className="volunteering-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">{volunteering.title}</h2>
          <h3 className="volunteering-subtitle">{volunteering.subtitle}</h3>
          <p className="volunteering-desc">{volunteering.description}</p>
        </motion.div>
        
        <div style={{ position: 'relative', width: '100%', padding: '2rem 0', overflow: 'hidden' }}>
          <motion.div 
            style={{ display: 'flex', gap: '2rem', width: 'max-content' }}
            animate={{ x: `calc(-${currentIndex * (400 + 32)}px)` }} 
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            {images.map((img, idx) => (
              <motion.div
                key={idx}
                style={{ 
                  width: '400px', 
                  maxWidth: '80vw',
                  height: '450px', 
                  borderRadius: '2rem',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)'
                }}
                animate={{ y: [ -10, 10, -10 ] }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: idx * 0.5 
                }}
                whileHover={{ scale: 1.05 }}
              >
                <img src={img} alt={`Voluntariado ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </motion.div>
            ))}
          </motion.div>
          
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem', justifyContent: 'center' }}>
              <motion.button 
                onClick={prevSlide} 
                whileHover={{ scale: 1.1, backgroundColor: 'var(--accent-color)', color: 'white' }}
                whileTap={{ scale: 0.9 }}
                style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', color: 'var(--text-color)', border: 'var(--glass-border)', width: '60px', height: '60px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--soft-shadow)', transition: 'background-color 0.3s ease' }}
              >
                &#8592;
              </motion.button>
              <motion.button 
                onClick={nextSlide} 
                whileHover={{ scale: 1.1, backgroundColor: 'var(--accent-color)', color: 'white' }}
                whileTap={{ scale: 0.9 }}
                style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', color: 'var(--text-color)', border: 'var(--glass-border)', width: '60px', height: '60px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--soft-shadow)', transition: 'background-color 0.3s ease' }}
              >
                &#8594;
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Volunteering;
