import React from 'react';
import { motion } from 'framer-motion';
import { portfolioData } from '../data/portfolioData';

const Contact = () => {
  const { contact } = portfolioData;

  return (
    <section id="contact" className="contact section">
      <div className="container">
        <motion.div 
          className="contact-content"
          initial={{ opacity: 0, y: 50, filter: 'blur(10px)', scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 className="contact-title">{contact.title}</h2>
          <p className="contact-text">{contact.text}</p>
          
          <div className="contact-links">
            <motion.a 
              href={`mailto:${contact.email}`} 
              className="contact-btn email-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Email
            </motion.a>
            <motion.a 
              href={contact.linkedin} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="contact-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              LinkedIn
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;
