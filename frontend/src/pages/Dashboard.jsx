import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Clock, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import axios from 'axios';

const Dashboard = () => {
    const [history, setHistory] = useState([]);
    const [selectedDesign, setSelectedDesign] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }
        
        axios.get(`/api/designs/history/${user.id}`)
            .then(res => {
                setHistory(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch history:', err);
                setLoading(false);
            });
    }, [navigate]);

    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex justify-between items-center mb-12">
                <h1 className="text-3xl font-bold text-stone-900">Your Designs</h1>
                <Link
                    to="/design"
                    className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-full font-semibold hover:bg-amber-700 transition-colors shadow-lg hover:shadow-xl"
                >
                    <Plus className="w-5 h-5" /> New Design
                </Link>
            </div>

            {history.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-stone-100 shadow-sm">
                    <div className="inline-block p-4 bg-stone-100 rounded-full mb-4">
                        <Clock className="w-8 h-8 text-stone-400" />
                    </div>
                    <h3 className="text-xl font-medium text-stone-900 mb-2">No designs yet</h3>
                    <p className="text-stone-500 mb-6">Start your first interior design project today.</p>
                    <Link to="/design" className="text-amber-600 font-medium hover:underline">Create Design &rarr;</Link>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {history.map((design, idx) => (
                        <div key={idx} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-stone-100 group relative">
                            <div className="relative h-64 overflow-hidden cursor-pointer" onClick={() => setSelectedDesign(design)}>
                                <img
                                    src={design.generated_image}
                                    alt={design.style}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <button className="bg-white/90 text-stone-900 px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg">
                                        <Eye className="w-4 h-4" /> View
                                    </button>
                                </div>
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                                    {design.style}
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-stone-500">
                                    {(design.detected_objects ?? []).length} objects detected
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedDesign && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setSelectedDesign(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-stone-900 capitalize">{selectedDesign.style} Redesign</h2>
                                    <p className="text-stone-500 text-sm">AI-generated interior design</p>
                                </div>
                                <button
                                    onClick={() => setSelectedDesign(null)}
                                    className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-stone-500" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="rounded-xl overflow-hidden bg-stone-100 aspect-video">
                                    <img
                                        src={selectedDesign.generated_image}
                                        alt="Generated"
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Objects */}
                                    <div className="bg-stone-50 rounded-xl p-6 border border-stone-100">
                                        <h3 className="font-semibold text-stone-900 mb-3">Objects Detected</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {(selectedDesign.detected_objects ?? []).map((obj, i) => (
                                                <span key={i} className="px-3 py-1 bg-white rounded-full text-sm font-medium border border-stone-200 capitalize shadow-sm">
                                                    {obj}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Style */}
                                    <div className="bg-stone-50 rounded-xl p-6 border border-stone-100">
                                        <h3 className="font-semibold text-stone-900 mb-3">Style Analysis</h3>
                                        <div className="space-y-2">
                                            {(selectedDesign.style_predictions ?? []).map((pred, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <span className="text-sm font-medium capitalize text-stone-700">
                                                        {pred.style.replace(/-/g, ' ')}
                                                    </span>
                                                    <span className="text-sm text-stone-500 font-mono">
                                                        {(pred.confidence * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {selectedDesign.metadata?.prompt && (
                                    <details className="bg-stone-50 rounded-xl p-4 border border-stone-100 text-sm text-stone-600 cursor-pointer">
                                        <summary className="font-semibold text-stone-900 select-none">
                                            View Generation Prompt
                                        </summary>
                                        <p className="mt-2 leading-relaxed">{selectedDesign.metadata.prompt}</p>
                                    </details>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
