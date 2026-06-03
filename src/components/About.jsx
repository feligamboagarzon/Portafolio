import React from 'react';
import { motion } from 'framer-motion';
import { portfolioData } from '../data/portfolioData';

const About = () => {
  const { about } = portfolioData;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const textVariants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <section className="about section">
      <div className="container">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">{about.title}</h2>
        </motion.div>
        
        <motion.div 
          className="about-content"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {about.paragraphs.map((text, index) => (
            <motion.p 
              key={index}
              variants={textVariants}
              className="about-text"
            >
              {text}
            </motion.p>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default About;
