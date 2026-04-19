import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ArrowRight, Home, Palette, BrainCircuit, Wand2 } from 'lucide-react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';

import FileUpload from './components/FileUpload';
import StyleSelector from './components/StyleSelector';

// In development the Vite proxy forwards this to http://localhost:5000/api.
// In production (Docker) the browser talks directly to the backend container.
const API_BASE_URL = '/api';

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [style, setStyle] = useState('modern');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!file) return;

    setLoading(true);
    setLoadingMessage('Connecting to Engine...');
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('style', style);

    try {
      const response = await axios.post(`${API_BASE_URL}/generate`, formData);
      const taskId = response.data.task_id;

      const pollStatus = async () => {
        try {
          const statusRes = await axios.get(`${API_BASE_URL}/status/${taskId}`);
          const { status, error, result_url, ...meta } = statusRes.data;

          if (status === 'completed') {
            setResult({
              ...meta,
              generated_image: result_url
            });
            setLoading(false);
          } else if (status === 'failed') {
            setError(error || 'Generation task failed in ML service.');
            setLoading(false);
          } else {
            // Still internal processing, poll again
            setLoadingMessage('You are in the queue... Designing your room...');
            setTimeout(pollStatus, 2500);
          }
        } catch (pollErr) {
          console.error(pollErr);
          setError('Lost connection to status monitor.');
          setLoading(false);
        }
      };

      pollStatus();

    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Something went wrong while communicating with the engine.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-blue-500/30">
      {/* ── Header ── */}
      <nav className="p-6 border-b border-white/5 glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-premium-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Sparkles size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white uppercase">Decora AI</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
            <a href="#" className="hover:text-premium-accent transition-colors">Platform</a>
            <a href="#" className="hover:text-premium-accent transition-colors">Styles</a>
            <a href="#" className="hover:text-premium-accent transition-colors">Pricing</a>
          </div>
          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-sm font-medium border border-white/10">
            Sign In
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-16">

          {/* ── Left Column: Controls ── */}
          <div className="space-y-10">
            <header>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-6xl font-bold leading-tight"
              >
                Redesign your <span className="premium-text-gradient">Space</span> with AI
              </motion.h1>
              <p className="mt-4 text-slate-400 text-lg max-w-lg">
                Upload a photo of your room and let our neural engine reimagine it in seconds.
                Preserving what matters, transforming everything else.
              </p>
            </header>

            <section className="space-y-6">
              <div className="flex items-center gap-4 text-sm font-bold tracking-widest text-slate-500 uppercase">
                <Home size={16} />
                <span>Step 1: Upload Room</span>
              </div>
              <FileUpload file={file} setFile={setFile} preview={preview} setPreview={setPreview} />
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-4 text-sm font-bold tracking-widest text-slate-500 uppercase">
                <Palette size={16} />
                <span>Step 2: Choose Style</span>
              </div>
              <StyleSelector selectedStyle={style} onSelect={setStyle} />
            </section>

            <button
              onClick={handleGenerate}
              disabled={loading || !file}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 shadow-2xl
                ${loading || !file
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'premium-gradient text-white hover:shadow-blue-500/40 hover:-translate-y-1'}`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  {loadingMessage}
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  Generate Redesign
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
              >
                ⚠️ {error}
              </motion.div>
            )}
          </div>

          {/* ── Right Column: Results ── */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="sticky top-32 space-y-6"
                >
                  {/* Before / After Slider */}
                  <div className="rounded-2xl overflow-hidden glass shadow-2xl border-white/10 aspect-[4/3]">
                    <ReactCompareSlider
                      itemOne={<ReactCompareSliderImage src={preview} alt="Original room" />}
                      itemTwo={
                        <ReactCompareSliderImage
                          src={result.generated_image}
                          alt="AI redesigned room"
                        />
                      }
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Detected Furniture */}
                    <div className="glass p-5 rounded-2xl border-white/5">
                      <div className="flex items-center gap-3 text-premium-accent mb-3">
                        <BrainCircuit size={18} />
                        <h3 className="font-bold uppercase tracking-widest text-xs">Objects Detected</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(result.detected_objects ?? []).map((obj, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium border border-white/10 capitalize"
                          >
                            {obj}
                          </span>
                        ))}
                        {result.detected_objects?.length === 0 && (
                          <span className="text-slate-500 text-xs">No objects detected</span>
                        )}
                      </div>
                    </div>

                    {/* Style Predictions from Classifier */}
                    <div className="glass p-5 rounded-2xl border-white/5">
                      <div className="flex items-center gap-3 text-premium-accent mb-3">
                        <Sparkles size={18} />
                        <h3 className="font-bold uppercase tracking-widest text-xs">Style Analysis</h3>
                      </div>
                      <div className="space-y-2">
                        {(result.style_predictions ?? []).map((pred, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-xs font-medium capitalize text-slate-300">
                              {pred.style.replace(/-/g, ' ')}
                            </span>
                            <span className="text-xs text-slate-500">
                              {(pred.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Generation Prompt (collapsed) */}
                  {result.metadata?.prompt && (
                    <details className="glass rounded-xl p-4 border-white/5 text-xs text-slate-400 cursor-pointer">
                      <summary className="font-semibold text-slate-300 mb-2 select-none">
                        View Generation Prompt
                      </summary>
                      <p className="mt-2 leading-relaxed">{result.metadata.prompt}</p>
                    </details>
                  )}
                </motion.div>
              ) : (
                <div className="sticky top-32 h-[500px] rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 gap-4 text-center p-12">
                  <div className="p-6 bg-slate-800/50 rounded-full border border-slate-700">
                    <Sparkles size={48} className="text-slate-700" />
                  </div>
                  <div className="max-w-xs">
                    <p className="font-medium text-slate-400">Results Gallery</p>
                    <p className="text-sm mt-1">
                      Upload a room photo, choose a style, then click Generate Redesign.
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </main>

      <footer className="mt-20 py-12 border-t border-white/5 glass">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm">
          <p>© 2026 Decoraid AI Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
