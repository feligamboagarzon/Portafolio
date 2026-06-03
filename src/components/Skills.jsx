import React from 'react';
import { motion } from 'framer-motion';
import { portfolioData } from '../data/portfolioData';

const Skills = () => {
  const { skills } = portfolioData;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const badgeVariants = {
    hidden: { opacity: 0, scale: 0.8, filter: 'blur(5px)' },
    visible: { opacity: 1, scale: 1, filter: 'blur(0px)' }
  };

  return (
    <section className="skills section">
      <div className="container">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title" style={{ textAlign: 'center', display: 'block' }}>Habilidades y Herramientas</h2>
        </motion.div>
        
        <motion.div 
          className="skills-container"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {skills.map((skill, index) => (
            <motion.div 
              key={index}
              className="skill-badge"
              variants={badgeVariants}
              animate={{ y: [ -5, 5, -5 ] }}
              transition={{ 
                y: {
                  duration: 4, 
                  repeat: Infinity, 
                  ease: "easeInOut",
                  delay: index * 0.2
                }
              }}
              whileHover={{ scale: 1.15, backgroundColor: 'var(--accent-color)', color: 'white', y: 0 }}
            >
              {skill}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Skills;
