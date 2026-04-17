import React from 'react';
import { motion } from 'framer-motion';

const styles = [
  { id: 'scandinavian', name: 'Scandinavian', image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=500&q=80' },
  { id: 'modern', name: 'Modern', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80' },
  { id: 'boho', name: 'Boho', image: 'https://images.unsplash.com/photo-1512918766673-bc97e9378f44?w=500&q=80' },
  { id: 'industrial', name: 'Industrial', image: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=500&q=80' },
];

const StyleSelector = ({ selectedStyle, onSelect }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
      {styles.map((style) => (
        <motion.div
          key={style.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(style.id)}
          className={`relative cursor-pointer rounded-xl overflow-hidden glass h-40 group ${
            selectedStyle === style.id ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20' : ''
          }`}
        >
          <img
            src={style.image}
            alt={style.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              selectedStyle === style.id ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-premium-dark/80 to-transparent flex items-end p-4">
            <span className="text-white font-medium tracking-wide font-sans">
              {style.name}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default StyleSelector;
