import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout as LayoutIcon, LogOut, User, Trash2, ChevronDown, X } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = '/api';

const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const user = JSON.parse(localStorage.getItem('user'));

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    const handleDeleteAccount = async () => {
        try {
            await axios.post(`${API_BASE_URL}/auth/delete`, { userId: user.id, password: deletePassword });
            localStorage.removeItem('user');
            setShowDeleteModal(false);
            navigate('/');
        } catch (err) {
            setDeleteError(err.response?.data?.error || 'Failed to delete account');
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <Link to="/" className="text-2xl font-bold tracking-tighter flex items-center gap-2">
                            <LayoutIcon className="w-8 h-8 text-amber-600" />
                            <span>Decoraid</span>
                        </Link>
                        <div className="hidden md:flex space-x-8 items-center">
                            <Link to="/" className="hover:text-amber-600 transition-colors">Home</Link>
                            <Link to="/dashboard" className="hover:text-amber-600 transition-colors">History</Link>
                            {user ? (
                                <div className="relative">
                                    <button
                                        onMouseEnter={() => setShowDropdown(true)}
                                        className="flex items-center gap-2 font-medium hover:text-amber-600 transition-colors"
                                    >
                                        <User className="w-5 h-5" />
                                        {user.name || user.email}
                                        <ChevronDown className="w-4 h-4" />
                                    </button>

                                    <AnimatePresence>
                                        {showDropdown && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                onMouseLeave={() => setShowDropdown(false)}
                                                className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-stone-100 py-2 z-50"
                                            >
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full px-4 py-2 text-left text-stone-700 hover:bg-stone-50 hover:text-amber-600 flex items-center gap-2 transition-colors"
                                                >
                                                    <LogOut className="w-4 h-4" /> Logout
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowDropdown(false);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Delete Account
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <Link to="/auth" className="px-4 py-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors">
                                    Login / Sign Up
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content with Transition */}
            <main className="flex-grow">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="bg-stone-900 text-stone-400 py-8">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p>&copy; 2025 Decoraid. Design your dream space.</p>
                </div>
            </footer>

            {/* Delete Account Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDeleteModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md relative z-10"
                        >
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="absolute right-4 top-4 text-stone-400 hover:text-stone-600"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-xl font-bold text-red-600 mb-2">Delete Account</h3>
                            <p className="text-stone-600 mb-6">
                                This action is permanent and cannot be undone. Please enter your password to confirm.
                            </p>

                            {deleteError && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                                    {deleteError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-red-500 outline-none"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteModal(false)}
                                        className="flex-1 py-2 border border-stone-200 rounded-lg font-medium hover:bg-stone-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                                    >
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Layout;
