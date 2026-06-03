import React from 'react';
import { motion } from 'framer-motion';
import { portfolioData } from '../data/portfolioData';

const Experience = () => {
  const { experience } = portfolioData;

  return (
    <section className="experience section">
      <div className="container">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">{experience.title}</h2>
        </motion.div>
        
        <div className="timeline cards-grid">
          {experience.items.map((item, index) => (
            <motion.div 
              key={item.id}
              className="experience-card"
              initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: index * 0.2, ease: "easeOut" }}
              whileHover={{ 
                scale: 1.05, 
                y: -10,
                boxShadow: "0 30px 60px -15px rgba(255, 74, 61, 0.15)" 
              }}
            >
              <div className="card-content">
                <h3 className="timeline-company">{item.company}</h3>
                <h4 className="timeline-role">{item.role}</h4>
                <p className="timeline-desc">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Experience;
