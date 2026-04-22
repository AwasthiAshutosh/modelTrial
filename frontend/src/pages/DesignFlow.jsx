import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, Palette, ArrowRight, Loader2 } from 'lucide-react';

const API_BASE_URL = '/api';
const MAX_FILE_SIZE = parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760', 10); // Default 10MB

const themes = [
    { id: 'modern', name: 'Modern', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400' },
    { id: 'boho', name: 'Boho', image: 'https://images.unsplash.com/photo-1522444195799-478538b28823?auto=format&fit=crop&w=400' },
    { id: 'scandinavian', name: 'Scandinavian', image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=400' },
    { id: 'industrial', name: 'Industrial', image: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=400' },
    { id: 'auto', name: 'Auto-Detect', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400' },
];

const DesignFlow = () => {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [selectedTheme, setSelectedTheme] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Designing Your Room...');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const eventSourceRef = useRef(null);
    const navigate = useNavigate();

    // Auth guard
    useEffect(() => {
        let user = null;
        try {
            user = JSON.parse(localStorage.getItem('user'));
        } catch (e) {
            console.error('Failed to parse user from localStorage:', e);
        }

        if (!user) {
            navigate('/auth');
        }
    }, [navigate]);

    // Cleanup SSE on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    // Manage preview URL to prevent memory leaks
    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.size > MAX_FILE_SIZE) {
                alert(`File is too large. Maximum size is ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB.`);
                return;
            }
            setFile(selectedFile);
        }
    };

    // ── ML Service generation logic (unchanged backend integration) ──
    const handleGenerate = async () => {
        setLoading(true);
        setLoadingMessage('Connecting to Engine...');
        setError(null);
        setResult(null);
        setStep(3); // Loading state

        const formData = new FormData();
        formData.append('image', file);
        formData.append('style', selectedTheme);

        try {
            const response = await axios.post(`${API_BASE_URL}/generate`, formData);
            const taskId = response.data.task_id;

            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            const eventSource = new EventSource(`${API_BASE_URL}/status/${taskId}`);
            eventSourceRef.current = eventSource;

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const { status, error: taskError, result_url, ...meta } = data;

                    if (status === 'completed') {
                        const newResult = {
                            ...meta,
                            generated_image: result_url,
                            style: selectedTheme
                        };
                        setResult(newResult);
                        
                        // Save to backend SQLite DB
                        let user = null;
                        try {
                            user = JSON.parse(localStorage.getItem('user'));
                        } catch (e) {
                            console.error('Failed to parse user for saving:', e);
                        }

                        if (user && user.token) {
                            axios.post(`${API_BASE_URL}/designs/save`, {
                                userId: user.id,
                                generatedImage: result_url,
                                style: selectedTheme,
                                detectedObjects: meta.detected_objects,
                                stylePredictions: meta.style_predictions,
                                metadata: meta.metadata
                            }, {
                                headers: { Authorization: `Bearer ${user.token}` }
                            }).catch(err => console.error('Failed to save design to DB:', err));
                        }

                        setLoading(false);
                        setStep(4); // Result state
                        eventSource.close();
                    } else if (status === 'failed') {
                        setError(taskError || 'Generation task failed in ML service.');
                        setLoading(false);
                        setStep(2);
                        eventSource.close();
                    } else {
                        setLoadingMessage('You are in the queue... Designing your room...');
                    }
                } catch (e) {
                    console.error('Error parsing SSE data:', e);
                }
            };

            eventSource.onerror = (err) => {
                console.warn('SSE connection interrupted, attempting to reconnect...', err);
            };

        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 401) {
                alert('Your session has expired or is invalid. Please log in again.');
                localStorage.removeItem('user');
                navigate('/auth');
            } else {
                setError(
                    err.response?.data?.detail ||
                    err.response?.data?.error ||
                    (err.response?.status === 404 ? 'Configuration Error: The backend proxy could not reach the ML service. Try restarting the backend.' : 'Something went wrong while communicating with the engine.')
                );
            }
            setLoading(false);
            setStep(2);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            {/* Progress Bar */}
            <div className="flex justify-between mb-12 relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-stone-200 -z-10"></div>
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${step >= s ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-500'}`}>
                        {s}
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* Step 1: Upload */}
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100"
                    >
                        <h2 className="text-2xl font-bold mb-6">Upload Your Room</h2>
                        <div className="space-y-6">
                            <div className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center hover:border-amber-500 transition-colors cursor-pointer relative">
                                <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                <Upload className="w-12 h-12 text-stone-400 mx-auto mb-4" />
                                <p className="text-stone-600 font-medium">{file ? file.name : 'Click or Drag to Upload Image'}</p>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={!file}
                                className="w-full py-3 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                Next Step <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Step 2: Choose Style */}
                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100"
                    >
                        <h2 className="text-2xl font-bold mb-6">Choose Your Style</h2>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            {themes.map((theme) => (
                                <div
                                    key={theme.id}
                                    onClick={() => setSelectedTheme(theme.id)}
                                    className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${selectedTheme === theme.id ? 'border-amber-600 ring-2 ring-amber-100' : 'border-transparent'}`}
                                >
                                    <div className="h-32 overflow-hidden relative">
                                        <img src={theme.image} alt={theme.name} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                                        {theme.id === 'auto' && (
                                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-600 rounded text-[10px] font-bold text-white uppercase tracking-wide">
                                                AI Pick
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 text-center font-medium bg-stone-50">{theme.name}</div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={!selectedTheme}
                            className="w-full py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
                        >
                            Generate Design
                        </button>
                    </motion.div>
                )}

                {/* Step 3: Loading */}
                {step === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <Loader2 className="w-16 h-16 text-amber-600 animate-spin mx-auto mb-6" />
                        <h3 className="text-2xl font-bold mb-2">{loadingMessage}</h3>
                        <p className="text-stone-500">Our AI is analyzing your room and applying the {themes.find(t => t.id === selectedTheme)?.name} style.</p>
                    </motion.div>
                )}

                {/* Step 4: Results */}
                {step === 4 && result && (
                    <motion.div
                        key="step4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                    >
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-white p-4 rounded-2xl shadow-sm">
                                <h3 className="font-bold mb-4">Original</h3>
                                {previewUrl && <img src={previewUrl} alt="Original" className="w-full rounded-lg" />}
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm ring-2 ring-amber-100 relative overflow-hidden">
                                <h3 className="font-bold mb-4 text-amber-600">AI Redesign</h3>
                                <div className="absolute top-4 right-4 z-10">
                                    <span className="bg-amber-600 text-white text-[10px] px-2 py-1 rounded-full font-bold tracking-wider uppercase">
                                        Decoraid Render
                                    </span>
                                </div>
                                <img
                                    src={result.generated_image}
                                    alt="Generated"
                                    className="w-full rounded-lg transition-all duration-700"
                                />
                            </div>
                        </div>

                        {/* ML Results: Objects & Style Predictions */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Detected Objects */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                                <h3 className="text-lg font-bold mb-4 text-stone-900">Objects Detected</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(result.detected_objects ?? []).map((obj, i) => (
                                        <span
                                            key={i}
                                            className="px-3 py-1 bg-stone-100 rounded-full text-sm font-medium border border-stone-200 capitalize"
                                        >
                                            {obj}
                                        </span>
                                    ))}
                                    {(result.detected_objects ?? []).length === 0 && (
                                        <span className="text-stone-400 text-sm">No objects detected</span>
                                    )}
                                </div>
                            </div>

                            {/* Style Predictions */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                                <h3 className="text-lg font-bold mb-4 text-stone-900">Style Analysis</h3>
                                <div className="space-y-3">
                                    {(result.style_predictions ?? []).map((pred, i) => (
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

                        {/* Generation Prompt */}
                        {result.metadata?.prompt && (
                            <details className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 text-sm text-stone-600 cursor-pointer">
                                <summary className="font-semibold text-stone-900 select-none">
                                    View Generation Prompt
                                </summary>
                                <p className="mt-3 leading-relaxed">{result.metadata.prompt}</p>
                            </details>
                        )}

                        <div className="flex gap-4">
                            <button onClick={() => { setStep(1); setFile(null); setSelectedTheme(''); setResult(null); setError(null); }} className="flex-1 py-3 border border-stone-300 rounded-lg font-semibold hover:bg-stone-50 transition-colors">
                                Start New Design
                            </button>
                            <button onClick={() => navigate('/dashboard')} className="flex-1 py-3 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800 transition-colors">
                                View History
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DesignFlow;
