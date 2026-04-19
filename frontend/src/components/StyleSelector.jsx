import React from 'react';
import { motion } from 'framer-motion';

// All 19 style categories the trained YOLOv8s classifier recognizes,
// plus an "Auto-Detect" option that lets the ML service pick from the image.
const STYLES = [
  {
    id: 'auto',
    name: 'Auto-Detect',
    description: 'Let AI choose',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=500&q=80',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Sleek & minimal',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80',
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian',
    description: 'Light & functional',
    image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=500&q=80',
  },
  {
    id: 'boho',
    name: 'Boho',
    description: 'Eclectic & earthy',
    image: 'https://images.unsplash.com/photo-1512918766673-bc97e9378f44?w=500&q=80',
  },
  {
    id: 'industrial',
    name: 'Industrial',
    description: 'Raw & urban',
    image: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=500&q=80',
  },
  {
    id: 'mid-century-modern',
    name: 'Mid-Century',
    description: 'Retro organic',
    image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=500&q=80',
  },
  {
    id: 'contemporary',
    name: 'Contemporary',
    description: 'Clean geometry',
    image: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=500&q=80',
  },
  {
    id: 'traditional',
    name: 'Traditional',
    description: 'Classic & formal',
    image: 'https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?w=500&q=80',
  },
  {
    id: 'mediterranean',
    name: 'Mediterranean',
    description: 'Warm terracotta',
    image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=500&q=80',
  },
];

const StyleSelector = ({ selectedStyle, onSelect }) => {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
      {STYLES.map((style) => {
        const isSelected = selectedStyle === style.id;
        return (
          <motion.div
            key={style.id}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelect(style.id)}
            className={`relative cursor-pointer rounded-xl overflow-hidden h-28 group transition-all duration-200
              ${isSelected
                ? 'ring-2 ring-[--color-premium-accent] shadow-lg shadow-blue-500/25'
                : 'opacity-70 hover:opacity-100'
              }`}
          >
            <img
              src={style.image}
              alt={style.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />

            {/* Label */}
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="text-white font-semibold text-xs leading-tight">{style.name}</p>
              <p className="text-slate-400 text-[10px] leading-tight">{style.description}</p>
            </div>

            {/* Selected checkmark */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-5 h-5 bg-[--color-premium-accent] rounded-full flex items-center justify-center"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
            )}

            {/* Auto badge */}
            {style.id === 'auto' && (
              <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-blue-500/80 rounded text-[9px] font-bold text-white uppercase tracking-wide">
                AI Pick
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default StyleSelector;
