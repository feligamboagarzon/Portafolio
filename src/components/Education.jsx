import React from 'react';
import { motion } from 'framer-motion';
import { portfolioData } from '../data/portfolioData';

const Education = () => {
  const { education } = portfolioData;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30, filter: 'blur(5px)' },
    visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <section className="education section">
      <div className="container">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">{education.title}</h2>
        </motion.div>
        
        <motion.div 
          className="education-list"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {education.items.map((item, index) => (
            <motion.div 
              key={index}
              className="education-item"
              variants={itemVariants}
            >
              <h3 className="education-degree">{item.title}</h3>
              <p className="education-inst">{item.institution}</p>
              <span className="education-year">{item.year}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Education;
