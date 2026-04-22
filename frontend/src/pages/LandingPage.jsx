import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Wand2, Image as ImageIcon } from 'lucide-react';

const LandingPage = () => {
    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="relative h-[90vh] flex items-center justify-center overflow-hidden bg-stone-900 text-white">
                <div className="absolute inset-0 z-0 opacity-40">
                    <img
                        src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop"
                        alt="Interior Design"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-5xl md:text-7xl font-bold font-serif mb-6 tracking-tight"
                    >
                        Redesign Your Space with AI
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-xl md:text-2xl text-stone-300 mb-10"
                    >
                        Upload a photo, choose a theme, and see your room redesigned by AI in seconds.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Link to="/design" className="inline-flex items-center gap-2 px-8 py-4 bg-amber-600 text-white rounded-full text-lg font-semibold hover:bg-amber-700 transition-all transform hover:scale-105">
                            Start Designing <ArrowRight className="w-5 h-5" />
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-12">
                        <FeatureCard
                            icon={<ImageIcon className="w-10 h-10 text-amber-600" />}
                            title="Upload & Analyze"
                            description="Simply upload a photo of your room. Our AI analyzes dimensions and current layout."
                        />
                        <FeatureCard
                            icon={<Wand2 className="w-10 h-10 text-amber-600" />}
                            title="AI Transformation"
                            description="Choose from themes like Boho, Scandinavian, or Industrial. Watch your room transform instantly."
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }) => (
    <motion.div
        whileHover={{ y: -10 }}
        className="p-8 bg-stone-50 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all"
    >
        <div className="mb-6">{icon}</div>
        <h3 className="text-2xl font-bold mb-4 text-stone-900">{title}</h3>
        <p className="text-stone-600 leading-relaxed">{description}</p>
    </motion.div>
);

export default LandingPage;
