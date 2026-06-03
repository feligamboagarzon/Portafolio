import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { portfolioData } from '../data/portfolioData';

const Hero = () => {
  const { hero } = portfolioData;
  const ref = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  // Staggered variants for children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <section ref={ref} className="hero section">
      <div className="container hero-container">
        <motion.div 
          className="hero-content"
          style={{ y: textY }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.p variants={itemVariants} className="hero-greeting">{hero.greeting}</motion.p>
          <motion.h1 variants={itemVariants} className="hero-name">{hero.name}</motion.h1>
          <motion.h2 variants={itemVariants} className="hero-subtitle">{hero.subtitle}</motion.h2>
          <motion.p variants={itemVariants} className="hero-description">{hero.description}</motion.p>
          
          <motion.a 
            variants={itemVariants}
            href="#contact" 
            className="cta-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Contactar
          </motion.a>
        </motion.div>
        
        <motion.div 
          className="hero-image-wrapper"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1, y: [0, -15, 0] }}
          transition={{ 
            opacity: { duration: 1 }, 
            scale: { duration: 1 },
            y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }
          }}
        >
          <motion.img 
            src={hero.image} 
            alt={hero.name} 
            className="hero-image parallax-img"
            style={{ y: imageY, scale: 1.15 }}
          />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
