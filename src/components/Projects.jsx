import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { portfolioData } from '../data/portfolioData';

const Projects = () => {
  const { projects } = portfolioData;
  const { mainProject } = projects;
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <section ref={ref} className="projects section">
      <div className="container">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">{projects.title}</h2>
        </motion.div>
        
        <div className="project-feature">
          <motion.div 
            className="project-info"
            initial={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h3 className="project-name">{mainProject.name}</h3>
            <p className="project-desc">{mainProject.description}</p>
            <div className="project-tech-value">
              <strong>Valor Técnico:</strong> {mainProject.techValue}
            </div>
          </motion.div>
          
          <motion.div 
            className="project-image-wrapper"
            initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <motion.img 
              style={{ y: imageY, scale: 1.15 }}
              src={mainProject.image} 
              alt={mainProject.name} 
              className="project-image parallax-img" 
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Projects;
