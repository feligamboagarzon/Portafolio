import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Hero from './components/Hero';
import About from './components/About';
import Projects from './components/Projects';
import Experience from './components/Experience';
import Volunteering from './components/Volunteering';
import Education from './components/Education';
import Skills from './components/Skills';
import Contact from './components/Contact';

function App() {
  const { scrollYProgress } = useScroll();
  
  // Parallax values for global background decorative elements
  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "150%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["0%", "-100%"]);
  const y3 = useTransform(scrollYProgress, [0, 1], ["0%", "200%"]);
  const y4 = useTransform(scrollYProgress, [0, 1], ["0%", "-150%"]);

  return (
    <div className="app-container" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Decorative Organic Background Blobs */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ 
          y: y1, 
          position: 'absolute', 
          top: '-10%', 
          left: '-15%', 
          width: '800px', 
          height: '800px', 
          borderRadius: '45% 55% 70% 30% / 30% 30% 70% 70%', 
          background: 'linear-gradient(45deg, rgba(255,74,61,0.03) 0%, rgba(255,74,61,0) 70%)', 
          pointerEvents: 'none', 
          zIndex: 0,
          filter: 'blur(40px)'
        }} 
      />
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        style={{ 
          y: y2, 
          position: 'absolute', 
          top: '25%', 
          right: '-20%', 
          width: '1000px', 
          height: '1000px', 
          borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%', 
          background: 'linear-gradient(135deg, rgba(10,10,10,0.02) 0%, rgba(10,10,10,0) 70%)', 
          pointerEvents: 'none', 
          zIndex: 0,
          filter: 'blur(60px)'
        }} 
      />
      <motion.div 
        animate={{ scale: [1, 1.15, 1], rotate: [0, 180, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        style={{ 
          y: y3, 
          position: 'absolute', 
          top: '55%', 
          left: '-5%', 
          width: '700px', 
          height: '700px', 
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%', 
          background: 'linear-gradient(225deg, rgba(255,74,61,0.02) 0%, rgba(255,74,61,0) 70%)', 
          pointerEvents: 'none', 
          zIndex: 0,
          filter: 'blur(50px)'
        }} 
      />
      <motion.div 
        animate={{ scale: [1, 1.1, 1], rotate: [0, -180, 0] }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        style={{ 
          y: y4, 
          position: 'absolute', 
          top: '80%', 
          right: '-10%', 
          width: '900px', 
          height: '900px', 
          borderRadius: '50% 50% 30% 70% / 50% 50% 70% 30%', 
          background: 'linear-gradient(315deg, rgba(10,10,10,0.02) 0%, rgba(10,10,10,0) 70%)', 
          pointerEvents: 'none', 
          zIndex: 0,
          filter: 'blur(60px)'
        }} 
      />

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Hero />
        <About />
        <Projects />
        <Experience />
        <Volunteering />
        <Education />
        <Skills />
        <Contact />
      </div>
    </div>
  );
}

export default App;
