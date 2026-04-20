import React from 'react';
import { motion } from 'framer-motion';

// The 4 core design styles + Auto-Detect
const STYLES = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Sleek & minimal',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400',
  },
  {
    id: 'boho',
    name: 'Boho',
    description: 'Eclectic & earthy',
    image: 'https://images.unsplash.com/photo-1522444195799-478538b28823?auto=format&fit=crop&w=400',
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    description: 'Light & functional',
    image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=400',
  },
  {
    id: 'industrial',
    name: 'Industrial',
    description: 'Raw & urban',
    image: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=400',
  },
  {
    id: 'auto',
    name: 'Auto-Detect',
    description: 'Let AI choose',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400',
  },
];

const StyleSelector = ({ selectedStyle, onSelect }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
      {STYLES.map((style) => {
        const isSelected = selectedStyle === style.id;
        return (
          <motion.div
            key={style.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(style.id)}
            className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all
              ${isSelected
                ? 'border-amber-600 ring-2 ring-amber-100 shadow-md'
                : 'border-transparent hover:border-stone-200'
              }`}
          >
            <div className="h-28 overflow-hidden relative">
              <img
                src={style.image}
                alt={style.name}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              {/* Auto badge */}
              {style.id === 'auto' && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-600 rounded text-[10px] font-bold text-white uppercase tracking-wide">
                  AI Pick
                </div>
              )}
              {/* Selected checkmark */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center shadow-md"
                >
                  <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.div>
              )}
            </div>
            <div className="p-3 bg-stone-50 text-center">
              <p className="font-medium text-stone-900 text-sm">{style.name}</p>
              <p className="text-stone-500 text-xs">{style.description}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default StyleSelector;
