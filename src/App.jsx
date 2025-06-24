import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
    Search, Brain, BookOpen, Youtube, Lightbulb, FileText, ArrowLeft, Loader, Sparkles, 
    AlertTriangle, X, School, FlaskConical, Globe, Calculator, Dna, BarChart2, Drama,
    Computer, BookHeart, Landmark, Languages, HelpCircle, Atom, CheckCircle, ChevronRight, 
    BrainCircuit, History, BookMarked, Github, Instagram, Server, Users, Video, Trash2, Edit,
    PlusCircle, Terminal, Power, PowerOff, LayoutDashboard, Settings, User, LogOut, Moon, Sun, 
    Newspaper, Menu, Download, ShieldCheck, Info, MessageSquare, Award, Trophy, Users2, BrainCog,
    Wind, Text, VolumeX, Palette, ArrowUpRight, Save, Languages as TranslateIcon, Minimize2, WifiOff
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- KONFIGURASI PENTING & API KEYS ---
// CATATAN: Kunci API ini hanya untuk demonstrasi. Ganti dengan kunci Anda sendiri di environment produksi.
const GEMINI_API_KEY = "AIzaSyArJ1P8HanSQ_XVWX9m4kUlsIVXrBRInik";
const YOUTUBE_API_KEY = "AIzaSyD9Rp-oSegoIDr8q9XlKkqpEL64lB2bQVE";

const firebaseConfig = {
    apiKey: "AIzaSyANQqaFwrsf3xGSDxyn9pcRJqJrIiHrjM0",
    authDomain: "bgune---community.firebaseapp.com",
    projectId: "bgune---community",
    storageBucket: "bgune---community.appspot.com",
    messagingSenderId: "749511144215",
    appId: "1:749511144215:web:dcf13c4d59dc705d4f7d52",
    measurementId: "G-5XRSG2H5SV"
};

// --- DAFTAR AKUN DEVELOPER ---
const DEV_ACCOUNTS = ['irhamdika00@gmail.com', 'irham.andika@example.com']; // Tambahkan email developer di sini

// --- INISIALISASI FIREBASE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- KONTEKS APLIKASI ---
const AuthContext = createContext(null);
const SettingsContext = createContext(null);
const AppContext = createContext(null);
const DevContext = createContext(null);

// --- CUSTOM HOOKS ---
function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`[LocalStorage] Gagal mengambil data: ${key}`, error);
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`[LocalStorage] Gagal menyimpan data: ${key}`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setValue];
}

function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        const checkInstalled = () => {
             if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
                setIsAppInstalled(true);
            }
        };

        checkInstalled();
        window.addEventListener('appinstalled', () => setIsAppInstalled(true));
        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', () => setIsAppInstalled(true));
        };
    }, []);

    const triggerInstall = useCallback(async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsAppInstalled(true);
            }
            setDeferredPrompt(null);
        }
    }, [deferredPrompt]);

    return { triggerInstall, canInstall: deferredPrompt !== null, isAppInstalled };
}


// --- PENYEDIA KONTEKS (PROVIDERS) ---

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDeveloper, setIsDeveloper] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            if (user) {
                setIsDeveloper(DEV_ACCOUNTS.includes(user.email));
            } else {
                setIsDeveloper(false);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    const loginWithGoogle = async () => {
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error saat login Google:", error);
        } finally {
            setLoading(false);
        }
    };
    
    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (error) {
            console.error("Error saat logout:", error);
        }
    };

    const value = { user, loading, loginWithGoogle, logout, isDeveloper };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const SettingsProvider = ({ children }) => {
    const [theme, setTheme] = useLocalStorage('bdukasi-theme-v2', 'light');
    const [fontSize, setFontSize] = useLocalStorage('bdukasi-font-size-v2', 'base');
    const [language, setLanguage] = useLocalStorage('bdukasi-language-v2', 'id');
    const [focusMode, setFocusMode] = useLocalStorage('bdukasi-focus-mode-v2', false);
    const [dataSaverMode, setDataSaverMode] = useLocalStorage('bdukasi-data-saver-v2', false);
    const [animationsEnabled, setAnimationsEnabled] = useLocalStorage('bdukasi-animations-v2', true);
    const [dyslexiaFont, setDyslexiaFont] = useLocalStorage('bdukasi-dyslexia-v2', false);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);

        const fontSizes = ['sm', 'base', 'lg', 'xl'];
        fontSizes.forEach(size => root.classList.remove(`font-size-${size}`));
        root.classList.add(`font-size-${fontSize}`);
        
        root.classList.toggle('no-animations', !animationsEnabled);
        root.classList.toggle('dyslexia-friendly', dyslexiaFont);
        root.classList.toggle('focus-mode', focusMode);

    }, [theme, fontSize, animationsEnabled, dyslexiaFont, focusMode]);

    const value = { theme, setTheme, fontSize, setFontSize, language, setLanguage, focusMode, setFocusMode, dataSaverMode, setDataSaverMode, animationsEnabled, setAnimationsEnabled, dyslexiaFont, setDyslexiaFont };
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

const DevProvider = ({ children }) => {
    const [videos, setVideos] = useLocalStorage('bdukasi-dev-videos-v1', [
      { id: 'dQw4w9WgXcQ', title: 'Contoh Video: Pembahasan Fotosintesis Lengkap', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { id: '5G_pA01Ua4o', title: 'Contoh Video: Sejarah Perang Diponegoro', url: 'https://www.youtube.com/watch?v=5G_pA01Ua4o' },
    ]);
    const [stats] = useState({ users: 1337, materials: 42, active: 89 }); // Data dummy
    const [logs, setLogs] = useState(['[INFO] Developer console initialized.']);
    const [experimentalFeatures, setExperimentalFeatures] = useLocalStorage('bdukasi-dev-experimental', {});

    const addVideo = (url) => {
        try {
            const videoId = new URL(url).searchParams.get('v');
            if (!videoId) throw new Error("URL YouTube tidak valid.");
            const newVideo = { id: videoId, title: `Video baru: ${videoId}`, url };
            setVideos(prev => [...prev, newVideo]);
            addLog(`[SUCCESS] Video ditambahkan: ${videoId}`);
        } catch (error) {
            addLog(`[ERROR] Gagal menambah video: ${error.message}`);
        }
    };

    const deleteVideo = (id) => {
        setVideos(prev => prev.filter(v => v.id !== id));
        addLog(`[INFO] Video dihapus: ${id}`);
    };

    const addLog = (message) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`].slice(-50));
    
    const toggleFeature = (feature) => {
      setExperimentalFeatures(prev => ({...prev, [feature]: !prev[feature]}));
      addLog(`[CONFIG] Fitur eksperimen '${feature}' sekarang ${!experimentalFeatures[feature] ? 'AKTIF' : 'NONAKTIF'}.`);
    }

    const value = { videos, addVideo, deleteVideo, stats, logs, addLog, experimentalFeatures, toggleFeature, setVideos };
    return <DevContext.Provider value={value}>{children}</DevContext.Provider>;
}

const AppProvider = ({ children }) => {
    const [page, setPage] = useState('dashboard');
    const [screen, setScreen] = useState('levelSelection');
    const [level, setLevel] = useState('');
    const [track, setTrack] = useState('');
    const [subject, setSubject] = useState(null);
    const [learningData, setLearningData] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [bankSoal, setBankSoal] = useState([]);
    const [history, setHistory] = useLocalStorage('bdukasi-expert-history-v5', []);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const contextValue = useMemo(() => ({ level, track, subject }), [level, track, subject]);
    const addHistory = useCallback((item) => setHistory(prev => [item, ...prev.filter(h => h.topic !== item.topic)].slice(0, 50)), [setHistory]);
    
    const fetchLearningMaterial = useCallback(async (searchTopic, isFromHistory = false) => {
        setIsLoading(true); setLoadingMessage('Guru AI sedang menyiapkan materimu...'); setError(null); setLearningData(null); setPage('belajar'); setScreen('lesson');

        const { level, track, subject } = contextValue;
        if (!isFromHistory) addHistory({ topic: searchTopic, level, track, subjectName: subject.name });

        const geminiPrompt = `Sebagai ahli materi pelajaran, buatkan ringkasan, materi lengkap (format Markdown bersih), dan 5 soal latihan pilihan ganda (A-E) dengan jawaban & penjelasan untuk topik '${searchTopic}' pelajaran '${subject.name}' tingkat ${level} ${track ? `jurusan ${track}`: ''}. Respons HANYA dalam format JSON: {"ringkasan": "...", "materi_lengkap": "...", "latihan_soal": [{"question": "...", "options": [...], "correctAnswer": "A", "explanation": "..."}]}`;
        
        const youtubeSearchQuery = `${searchTopic} ${subject.name} pembahasan lengkap`;

        try {
            const [geminiData, videoData] = await Promise.all([
                callGeminiAPI(geminiPrompt),
                callYouTubeAPI(youtubeSearchQuery) // Perubahan: Mencari video di YouTube
            ]);
            setLearningData({ topic: searchTopic, ...geminiData, video: videoData });
        } catch (err) {
            setError(`Gagal memuat materi: ${err.message}.`);
            setPage('dashboard');
        } finally {
            setIsLoading(false);
        }
    }, [contextValue, addHistory]);
    
    const fetchBankSoal = useCallback(async (topic, count) => {
        if (!topic || !contextValue.level || !contextValue.subject || !count) { setError("Harap masukkan topik dan jumlah soal."); return; }
        setIsLoading(true); setLoadingMessage(`Guru AI sedang membuat ${count} soal...`); setError(null);
        const { level, track, subject } = contextValue;
        const prompt = `Buatkan ${count} soal pilihan ganda (A-E) tentang '${topic}' untuk pelajaran '${subject.name}' level ${level} ${track ? `jurusan ${track}` : ''}. Sertakan jawaban & penjelasan. Respons HANYA dalam format JSON array objek: [{"question": "...", "options": [...], "correctAnswer": "A", "explanation": "..."}]`;
        try {
            const soal = await callGeminiAPI(prompt);
            setBankSoal(Array.isArray(soal) ? soal : []);
            setPage('belajar'); setScreen('bankSoal');
        } catch(err) { setError(`Gagal membuat bank soal: ${err.message}`); setPage('dashboard'); } finally { setIsLoading(false); }
    }, [contextValue]);

    const fetchRecommendations = useCallback(async () => {
        if (!contextValue.level || !contextValue.subject) return;
        const { level, track, subject } = contextValue;
        const prompt = `Berikan 5 rekomendasi topik menarik untuk mata pelajaran "${subject.name}" level ${level} ${track ? `jurusan ${track}`: ''}. Jawab HANYA dalam format JSON array string. Contoh: ["Topik 1", "Topik 2"]`;
        try { 
            const recs = await callGeminiAPI(prompt); 
            setRecommendations(Array.isArray(recs) ? recs : []); 
        } catch (err) { console.error("Gagal fetch rekomendasi:", err); }
    }, [contextValue]);

    const value = { 
        page, setPage, screen, setScreen, level, setLevel, track, setTrack, subject, setSubject, 
        learningData, setLearningData, recommendations, setRecommendations, bankSoal, setBankSoal, 
        isLoading, setIsLoading, error, setError, history, addHistory, 
        loadingMessage, setLoadingMessage, isSidebarOpen, setSidebarOpen, contextValue,
        fetchLearningMaterial, fetchBankSoal, fetchRecommendations 
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};


// --- FUNGSI API HELPER ---
const callGeminiAPI = async (prompt) => {
    console.log("[API Call] Memanggil Gemini API...");
    if (!GEMINI_API_KEY) throw new Error("Kunci API Gemini belum diatur.");
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
    };
    try {
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) { const errorBody = await response.json(); throw new Error(`Permintaan API Gemini gagal: ${errorBody.error?.message || 'Error tidak diketahui'}`); }
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Respons API Gemini tidak valid atau kosong.");
        const cleanedText = text.replace(/^```json\s*|```$/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("[API Exception] Terjadi kesalahan Gemini:", error);
        throw error;
    }
};

const callYouTubeAPI = async (query) => {
    console.log("[API Call] Memanggil YouTube API untuk query:", query);
    if (!YOUTUBE_API_KEY) {
        console.warn("[API Warning] Kunci API YouTube tidak ada. Pencarian video dilewati.");
        return null; // Tidak melempar error agar aplikasi tetap jalan
    }
    const API_URL = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}&maxResults=1&type=video&videoDuration=long`;
    
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Permintaan API YouTube gagal: ${errorBody.error?.message || 'Error tidak diketahui'}`);
        }
        const result = await response.json();
        const item = result.items?.[0];
        if (!item) return null; // Tidak ada video yang ditemukan
        
        return {
            id: item.id.videoId,
            title: item.snippet.title,
            embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`
        };
    } catch (error) {
        console.error("[API Exception] Terjadi kesalahan YouTube:", error);
        return null; // Return null agar tidak menghentikan proses load materi
    }
};

// --- KOMPONEN UTAMA APLIKASI ---
export default function App() {
    return (
        <SettingsProvider>
            <AuthProvider>
                <DevProvider>
                    <AppProvider>
                        <MainApp />
                    </AppProvider>
                </DevProvider>
            </AuthProvider>
        </SettingsProvider>
    );
}

const MainApp = () => {
    const { loading: authLoading, user } = useContext(AuthContext);
    const { isLoading: appIsLoading, loadingMessage } = useContext(AppContext);
    const [showPWAInstall, setShowPWAInstall] = useState(false);
    const { canInstall, isAppInstalled } = usePWAInstall();

    useEffect(() => {
        if (canInstall && !isAppInstalled) {
            const timer = setTimeout(() => {
                setShowPWAInstall(true);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [canInstall, isAppInstalled]);

    if (authLoading) {
        return <LoadingScreen message="Memverifikasi sesi Anda..." />;
    }

    if (appIsLoading) {
        return <LoadingScreen message={loadingMessage} />;
    }

    if (!user) {
        return <LandingPage />;
    }

    return (
      <>
        {showPWAInstall && <PWAInstallPopup onClose={() => setShowPWAInstall(false)} />}
        <AppLayout />
      </>
    );
}

const AppLayout = () => {
    const { page } = useContext(AppContext);

    const pages = {
        'dashboard': <DashboardPage />,
        'belajar': <LearningFlow />,
        'tanya-ai': <ChatAiPage />,
        'settings': <SettingsPage />,
        'pembaruan': <UpdateLogPage />,
        'developer': <DeveloperDashboardPage />,
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 min-h-screen font-sans transition-colors duration-300">
             <div className="md:flex">
                <Sidebar />
                <div className="flex-1 md:ml-72">
                    <Navbar />
                    <main className="p-4 sm:p-6 lg:p-8">
                        {pages[page] || <DashboardPage />}
                    </main>
                </div>
            </div>
        </div>
    );
}

// --- HALAMAN-HALAMAN UTAMA (PAGES) ---

const LandingPage = () => {
    const { loginWithGoogle, loading } = useContext(AuthContext);

    const features = [
        { icon: <BrainCog size={28} />, title: "Guru AI Cerdas", text: "Dapatkan penjelasan, ringkasan, dan jawaban instan untuk setiap pertanyaanmu." },
        { icon: <Video size={28} />, title: "Video Terkurasi", text: "Belajar dari video pilihan berkualitas yang relevan dengan materimu." },
        { icon: <Trophy size={28} />, title: "Misi & Latihan", text: "Asah pemahamanmu dengan latihan soal dan misi harian yang menantang." }
    ];

    const stats = [
        { value: "1.3K+", label: "Pelajar Terdaftar" },
        { value: "50+", label: "Materi Belajar" },
        { value: "24/7", label: "Bantuan AI" }
    ];

    return (
        <div className="bg-slate-50 min-h-screen text-slate-800">
            <header className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <img src="src/logo.png" alt="Bdukasi Logo" className="h-10 w-10" onError={(e) => e.target.outerHTML = '<Brain class="h-10 w-10 text-cyan-500" />'} />
                    <h1 className="font-bold text-2xl">Bdukasi</h1>
                </div>
                 <button onClick={loginWithGoogle} disabled={loading} className="px-5 py-2.5 bg-cyan-500 text-white font-bold rounded-full shadow-lg hover:bg-cyan-600 transform hover:scale-105 transition-all duration-300 flex items-center gap-2 group">
                    {loading ? <Loader className="animate-spin" size={20}/> : "Mulai Belajar"}
                </button>
            </header>

            <main className="pt-32 pb-16 px-6">
                <section className="text-center max-w-4xl mx-auto">
                    <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight">
                        Teman Belajar <span className="text-cyan-500">Generasi Digital</span> Indonesia.
                    </h2>
                    <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
                        Bdukasi mengubah caramu belajar. Dapatkan materi, video, dan bantuan AI dalam satu platform modern yang asyik.
                    </p>
                    <button onClick={loginWithGoogle} disabled={loading} className="mt-10 px-8 py-4 bg-cyan-500 text-white font-bold text-lg rounded-full shadow-lg hover:bg-cyan-600 transform hover:scale-105 transition-all duration-300 flex items-center gap-3 group mx-auto">
                        <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.19,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.19,22C17.6,22 21.54,18.33 21.54,12.81C21.54,11.76 21.45,11.44 21.35,11.1Z"></path></svg>
                        Masuk dan Mulai Sekarang
                    </button>
                </section>
                
                <section className="mt-24 max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
                        {stats.map(stat => (
                            <div key={stat.label}>
                                <p className="text-4xl font-bold text-cyan-500">{stat.value}</p>
                                <p className="text-slate-500 mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mt-24 max-w-5xl mx-auto">
                     <h3 className="text-3xl font-bold text-center mb-12">Semua yang Kamu Butuhkan</h3>
                     <div className="grid md:grid-cols-3 gap-8">
                        {features.map(f => (
                            <div key={f.title} className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                                <div className="text-cyan-500 bg-cyan-50 p-3 rounded-full inline-block mb-4">{f.icon}</div>
                                <h4 className="text-xl font-bold mb-2">{f.title}</h4>
                                <p className="text-slate-600">{f.text}</p>
                            </div>
                        ))}
                     </div>
                </section>
                
                <section className="mt-24 text-center max-w-3xl mx-auto">
                    <h3 className="text-3xl font-bold mb-8">Kata Para Pelajar</h3>
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 relative">
                        <img src="https://i.pravatar.cc/100?u=sinta" alt="Testimoni" className="w-20 h-20 rounded-full mx-auto -mt-16 border-4 border-white"/>
                        <p className="text-lg text-slate-700 mt-4 italic">"Semenjak pakai Bdukasi, belajar jadi nggak ngebosenin lagi. Materi Fisika yang tadinya susah jadi gampang dimengerti berkat penjelasan AI-nya. Keren banget!"</p>
                        <p className="font-bold text-slate-800 mt-6">- Sinta, Siswi SMA</p>
                    </div>
                </section>
            </main>
            <Footer isLanding={true} />
        </div>
    );
};

const DashboardPage = () => {
    const { setPage } = useContext(AppContext);
    const { user } = useContext(AuthContext);
    const { videos } = useContext(DevContext);

    const recommendedVideo = videos && videos.length > 0 ? videos[videos.length - 1] : null;

    return (
        <AnimatedScreen customKey="dashboard">
            <h1 className="text-3xl font-bold mb-2">Dashboard Bdukasi</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">Selamat datang kembali, {user?.displayName?.split(' ')[0] || 'Juara'}!</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DashboardCard 
                    icon={<BrainCircuit size={40} />} 
                    title="Mulai Belajar" 
                    description="Pilih jenjang & mapel untuk dijelajahi." 
                    onClick={() => { setPage('belajar'); }} 
                    className="bg-cyan-500 text-white hover:bg-cyan-600 col-span-1 row-span-2 !flex-col !items-start !justify-between" 
                />
                 <DashboardCard 
                    icon={<MessageSquare size={32} />} 
                    title="Tanya AI" 
                    description="Ada pertanyaan? Tanyakan pada Guru AI." 
                    onClick={() => { setPage('tanya-ai'); }}
                    className="bg-white dark:bg-slate-800"
                />
                <DashboardCard 
                    icon={<Award size={32} />} 
                    title="Misi Harian" 
                    description="Selesaikan tantangan & dapatkan poin." 
                    onClick={() => {}} 
                    className="bg-white dark:bg-slate-800"
                    disabled={true}
                />
            </div>
            
            {/* Perubahan: Menampilkan Video Rekomendasi di Dashboard */}
            {recommendedVideo && (
                <div className="mt-6">
                    <InfoCard icon={<Video />} title="Video Rekomendasi Pilihan">
                        <h3 className="text-lg font-semibold mb-3">{recommendedVideo.title}</h3>
                        <div className="aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden shadow-lg">
                            <iframe 
                                src={`https://www.youtube.com/embed/${recommendedVideo.id}`} 
                                title={recommendedVideo.title} 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                allowFullScreen 
                                className="w-full h-full">
                            </iframe>
                        </div>
                    </InfoCard>
                </div>
            )}
            
            <div className="mt-6">
                <InfoCard icon={<Info size={20}/>} title="Info & Pengembang">
                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                        Bdukasi adalah platform edukasi modern yang dikembangkan oleh <strong>M. Irham Andika Putra</strong> & tim <strong>Bgune Digital</strong>. Ditenagai oleh AI canggih untuk membuat belajar lebih mudah dan menyenangkan.
                    </p>
                    <Footer />
                </InfoCard>
            </div>
        </AnimatedScreen>
    );
};

const SettingsPage = () => {
    const { user, logout } = useContext(AuthContext);
    const {
        theme, setTheme, fontSize, setFontSize, language, setLanguage, focusMode, setFocusMode,
        dataSaverMode, setDataSaverMode, animationsEnabled, setAnimationsEnabled, dyslexiaFont, setDyslexiaFont
    } = useContext(SettingsContext);

    const fontOptions = [ { value: 'sm', label: 'Kecil' }, { value: 'base', label: 'Normal' }, { value: 'lg', label: 'Besar' }];
    const langOptions = [ { value: 'id', label: 'Indonesia' }, { value: 'en', label: 'English' }];
    
    return (
        <AnimatedScreen customKey="settings">
            <h1 className="text-3xl font-bold mb-8">Akun & Pengaturan</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <InfoCard icon={<User size={24} />} title="Informasi Akun">
                    <div className="flex items-center space-x-4">
                        <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}&background=random&color=fff`} alt="User Avatar" className="w-20 h-20 rounded-full" />
                        <div>
                            <h3 className="text-xl font-bold">{user?.displayName}</h3>
                            <p className="text-slate-500 dark:text-slate-400">{user?.email}</p>
                        </div>
                    </div>
                     <button onClick={logout} className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors">
                        <LogOut size={18} /> Keluar
                    </button>
                </InfoCard>

                <InfoCard icon={<Palette size={24} />} title="Tampilan & Aksesibilitas">
                    <div className="space-y-6">
                        <SettingToggle label="Mode Gelap" icon={theme === 'light' ? <Moon/> : <Sun/>} isEnabled={theme === 'dark'} onToggle={() => setTheme(p => p === 'light' ? 'dark' : 'light')} />
                        <SettingToggle label="Mode Fokus" icon={<Minimize2 />} isEnabled={focusMode} onToggle={() => setFocusMode(p => !p)} />
                        <SettingToggle label="Animasi" icon={<Wind/>} isEnabled={animationsEnabled} onToggle={() => setAnimationsEnabled(p => !p)} />
                        <SettingToggle label="Font Disleksia" icon={<Text/>} isEnabled={dyslexiaFont} onToggle={() => setDyslexiaFont(p => !p)} />
                        <SettingToggle label="Hemat Kuota" icon={<WifiOff />} isEnabled={dataSaverMode} onToggle={() => setDataSaverMode(p => !p)} />
                        
                        <SettingOptionGroup label="Ukuran Font" options={fontOptions} selected={fontSize} onChange={setFontSize} />
                        <SettingOptionGroup label="Bahasa" options={langOptions} selected={language} onChange={setLanguage} icon={<TranslateIcon />}/>
                    </div>
                </InfoCard>
            </div>
        </AnimatedScreen>
    );
};

const DeveloperDashboardPage = () => {
    const { user, isDeveloper } = useContext(AuthContext);
    const { stats, videos, addVideo, deleteVideo, logs, addLog, experimentalFeatures, toggleFeature, setVideos } = useContext(DevContext);
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);

    if (!isDeveloper) {
        return (
            <AnimatedScreen customKey="dev-denied">
                <InfoCard icon={<ShieldCheck />} title="Akses Ditolak">
                    <p>Halaman ini hanya untuk developer.</p>
                </InfoCard>
            </AnimatedScreen>
        );
    }
    
    const handleAddVideo = (e) => { e.preventDefault(); addVideo(newVideoUrl); setNewVideoUrl(''); };
    const handleReset = () => { setVideos([]); addLog('[CRITICAL] Daftar video telah direset.'); setShowConfirm(false); };

    return (
        <AnimatedScreen customKey="dev-dashboard">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3"><Server /> Developer Dashboard</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">Selamat datang, {user?.displayName}.</p>
            
            {showConfirm && <ConfirmationModal title="Reset Video?" message="Apakah Anda yakin ingin menghapus semua video? Aksi ini tidak dapat dibatalkan." onConfirm={handleReset} onCancel={() => setShowConfirm(false)} />}

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard icon={<Users />} label="Total Pengguna" value={stats.users} />
                <StatCard icon={<Users2 />} label="Pengguna Aktif" value={stats.active} />
                <StatCard icon={<BookOpen />} label="Jumlah Materi" value={stats.materials} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <InfoCard icon={<Video />} title="Kelola Video Rekomendasi" className="lg:col-span-2">
                    <form onSubmit={handleAddVideo} className="flex gap-2 mb-4">
                        <input type="url" value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="flex-grow p-2 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500 outline-none" required />
                        <button type="submit" className="p-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"><PlusCircle size={20} /></button>
                    </form>
                    <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                        {videos.length > 0 ? videos.map(video => (
                            <div key={video.id} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                                <Youtube className="text-red-500 flex-shrink-0" />
                                <p className="flex-grow truncate text-sm">{video.title}</p>
                                <button className="p-2 hover:text-cyan-500 transition-colors" onClick={() => alert('Fitur Edit belum diimplementasikan.')}><Edit size={16}/></button>
                                <button className="p-2 hover:text-red-500 transition-colors" onClick={() => deleteVideo(video.id)}><Trash2 size={16}/></button>
                            </div>
                        )) : <p className="text-center text-slate-500 p-4">Belum ada video.</p>}
                    </div>
                </InfoCard>

                <InfoCard icon={<Terminal />} title="Developer Console" className="lg:col-span-1">
                    <div className="bg-black text-white font-mono text-xs p-3 rounded-lg h-64 overflow-y-auto mb-4">
                        {logs.map((log, i) => <p key={i} className={log.includes('[ERROR]') ? 'text-red-400' : log.includes('[SUCCESS]') ? 'text-green-400' : ''}>{log}</p>)}
                    </div>
                    <div className="space-y-2">
                         <ConsoleButton icon={<Power />} text="Toggle Fitur Leaderboard" onClick={() => toggleFeature('leaderboard')} active={experimentalFeatures['leaderboard']} />
                         <ConsoleButton icon={<Power />} text="Toggle Fitur Misi Harian" onClick={() => toggleFeature('missions')} active={experimentalFeatures['missions']} />
                         <button onClick={() => setShowConfirm(true)} className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors">
                            <Trash2 size={16} /> Reset Daftar Video
                        </button>
                    </div>
                </InfoCard>
            </div>
        </AnimatedScreen>
    );
};

const ChatAiPage = () => {
    return (
        <AnimatedScreen customKey="tanya-ai">
            <h1 className="text-3xl font-bold mb-4">Tanya AI</h1>
            <InfoCard icon={<MessageSquare />} title="Segera Hadir!">
                <div className="text-center p-8">
                    <BrainCog size={64} className="mx-auto text-cyan-400 mb-4" />
                    <h2 className="text-2xl font-bold">Halaman Interaksi dengan Guru AI</h2>
                    <p className="text-slate-500 mt-2">Fitur ini sedang dalam pengembangan. Nantikan kemampuan untuk bertanya apa saja seputar pelajaran langsung kepada Guru AI kami!</p>
                </div>
            </InfoCard>
        </AnimatedScreen>
    )
};

const UpdateLogPage = () => {
    const updates = [
        { version: "v2.3.0", date: "26 Juni 2025", changes: [
            "Memperbaiki sistem video: Video pembelajaran kini dicari dari YouTube, dan video rekomendasi di Dashboard dikelola developer.",
            "Menambahkan card Video Rekomendasi di Dashboard.",
            "Logika `fetchLearningMaterial` diperbarui untuk memanggil YouTube API.",
        ]},
        { version: "v2.2.0", date: "25 Juni 2025", changes: [
            "Implementasi Developer Dashboard untuk pengelolaan video.",
            "Desain ulang Landing Page, Dashboard Pelajar, dan Halaman Pengaturan.",
            "Sistem video pembelajaran sekarang menggunakan daftar terkurasi dari Developer.",
            "Penambahan popup instalasi PWA.",
            "Penggantian warna tema utama menjadi Biru Toska (Cyan).",
            "Penambahan halaman 'Tanya AI' sebagai placeholder.",
        ]},
        { version: "v2.1.0", date: "24 Juni 2025", changes: [
            "Desain ulang UI/UX total dengan tema baru yang lebih segar, modern, dan ramah untuk pelajar.",
            "Perbaikan fitur rekomendasi video di Dashboard.",
            "Penambahan fitur 'Runtunan Belajar' di Dashboard.",
            "Penambahan opsi Suara, Animasi, dan Font Disleksia-friendly.",
        ]},
    ];

    return (
        <AnimatedScreen key="pembaruan">
            <h1 className="text-3xl font-bold mb-8">Log Pembaruan Aplikasi</h1>
            <div className="space-y-8">
                {updates.map(update => (
                    <InfoCard key={update.version} icon={<Newspaper size={24} />} title={`Versi ${update.version} - ${update.date}`}>
                       <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300">
                           {update.changes.map((change, index) => <li key={index}>{change}</li>)}
                       </ul>
                    </InfoCard>
                ))}
            </div>
        </AnimatedScreen>
    );
};

const LearningFlow = () => {
    const { screen } = useContext(AppContext);
    return <ScreenContainer />;
};

// --- KOMPONEN UI & PENDUKUNG ---

const LoadingScreen = ({ message }) => (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-50 flex flex-col items-center justify-center gap-6">
        <div className="relative w-24 h-24">
            <img src="src/logo.png" alt="Loading Logo" className="w-full h-full animate-pulse" onError={(e) => e.target.outerHTML = '<Brain class="w-full h-full text-cyan-500 animate-pulse" />'} />
            <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-amber-400 animate-ping" />
        </div>
        <p className="text-xl font-semibold text-slate-600 dark:text-slate-300 text-center max-w-xs">{message || 'Memuat...'}</p>
    </div>
);

const PWAInstallPopup = ({ onClose }) => {
    const { triggerInstall } = usePWAInstall();

    const handleInstallClick = () => {
        triggerInstall();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-8 text-center relative transform animate-fadeInUp">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X /></button>
                <img src="src/logo.png" alt="App Logo" className="w-20 h-20 mx-auto mb-4" onError={(e) => e.target.outerHTML = '<Brain class="w-20 h-20 mx-auto mb-4 text-cyan-500" />'} />
                <h2 className="text-2xl font-bold">Install Aplikasi Bdukasi</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6">Dapatkan pengalaman belajar terbaik dengan menginstal aplikasi di perangkatmu.</p>
                <button onClick={handleInstallClick} className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-cyan-500 text-white font-bold rounded-lg hover:bg-cyan-600 transition-colors">
                    <Download size={20} /> Install Sekarang
                </button>
            </div>
        </div>
    );
};

const ConfirmationModal = ({ title, message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6 text-center transform animate-fadeInUp">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4"/>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6">{message}</p>
            <div className="flex gap-4">
                <button onClick={onCancel} className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">Batal</button>
                <button onClick={onConfirm} className="flex-1 px-6 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Ya, Lanjutkan</button>
            </div>
        </div>
    </div>
);

const SettingToggle = ({ label, icon, isEnabled, onToggle }) => (
    <div className="flex items-center justify-between">
        <label className="font-semibold flex items-center gap-3">
            {icon} {label}
        </label>
        <button
            onClick={onToggle}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isEnabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'}`}
        >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

const SettingOptionGroup = ({ label, options, selected, onChange, icon }) => (
    <div>
        <label className="font-semibold block mb-2 flex items-center gap-2">{icon}{label}</label>
        <div className="flex flex-wrap gap-2">
            {options.map(opt => (
                <button key={opt.value} onClick={() => onChange(opt.value)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${selected === opt.value ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                    {opt.label}
                </button>
            ))}
        </div>
    </div>
);
const StatCard = ({ icon, label, value }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center gap-4">
        <div className="p-3 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-500 rounded-full">{icon}</div>
        <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </div>
);
const ConsoleButton = ({ icon, text, onClick, active }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/40'}`}>
        <span className="flex items-center gap-2">{icon} {text}</span>
        {active ? <Power size={16} /> : <PowerOff size={16} />}
    </button>
);

const AnimatedScreen = ({ children, customKey }) => <div key={customKey} className="animate-fadeIn">{children}</div>;
const DashboardCard = ({ icon, title, description, onClick, disabled, className = "" }) => (
    <button onClick={onClick} disabled={disabled} className={`group p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-md text-left transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 ${disabled ? 'opacity-50 cursor-not-allowed saturate-50' : 'hover:shadow-lg hover:shadow-cyan-500/10'} ${className}`}>
        <div className={`p-3 rounded-xl ${!className.includes('bg-cyan') ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-500' : ''}`}>{icon}</div>
        <div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className={`${className.includes('bg-cyan') ? 'text-cyan-100' : 'text-slate-500 dark:text-slate-400'}`}>{description}</p>
        </div>
        {!disabled && <ArrowUpRight className="ml-auto text-slate-400 group-hover:text-cyan-500 transition-transform group-hover:rotate-45"/>}
    </button>
);

const Navbar = () => {
    const { setSidebarOpen } = useContext(AppContext);
    return (
        <header className="sticky top-0 bg-white/70 dark:bg-slate-900/80 backdrop-blur-md z-10 border-b border-slate-200 dark:border-slate-700 md:hidden">
            <div className="px-4 h-16 flex items-center justify-between">
                <div className="font-bold text-xl flex items-center gap-2"><img src="src/logo.png" alt="Logo" className="h-8 w-8" onError={(e) => e.target.outerHTML = '<Brain class="h-8 w-8 text-cyan-500" />'} /> Bdukasi</div>
                <button onClick={() => setSidebarOpen(true)} className="md:hidden">
                    <Menu />
                </button>
            </div>
        </header>
    );
};

const Sidebar = () => {
    const { page, setPage, isSidebarOpen, setSidebarOpen } = useContext(AppContext);
    const { logout } = useContext(AuthContext);
    const { isDeveloper } = useContext(AuthContext);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'belajar', label: 'Mulai Belajar', icon: <BrainCircuit size={20} /> },
        { id: 'tanya-ai', label: 'Tanya AI', icon: <MessageSquare size={20} />},
        { id: 'settings', label: 'Pengaturan', icon: <Settings size={20} /> },
        { id: 'pembaruan', label: 'Log Pembaruan', icon: <Newspaper size={20} /> },
    ];
    if (isDeveloper) {
        navItems.push({ id: 'developer', label: 'Developer', icon: <Server size={20} /> });
    }

    return (
        <>
            <div onClick={() => setSidebarOpen(false)} className={`fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div>
            <aside className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col z-30 transition-transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center gap-3 text-2xl font-bold mb-10">
                    <img src="src/logo.png" alt="Logo" className="h-10 w-10" onError={(e) => e.target.outerHTML = '<Brain class="h-10 w-10 text-cyan-500" />'} />
                    <span className="text-slate-800 dark:text-white">Bdukasi</span>
                </div>
                <nav className="flex-grow space-y-2">
                    {navItems.map(item => (
                         <button 
                            key={item.id}
                            onClick={() => { setPage(item.id); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors text-base ${page === item.id ? 'bg-cyan-500 text-white font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            {React.cloneElement(item.icon, { className: page === item.id ? 'text-white' : 'text-slate-500' })}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="mt-auto">
                    <button onClick={logout} className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 font-semibold">
                        <LogOut size={20}/>
                        <span>Keluar</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

const InfoCard = ({ icon, title, children, className = '' }) => <div className={`bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden ${className} animate-fadeInUp`}><div className="p-4 border-b border-slate-200/80 dark:border-slate-700/50 flex items-center gap-3">{icon && <div className="text-cyan-500">{React.cloneElement(icon, { size: 24 })}</div>}<h2 className="text-xl font-bold">{title}</h2></div><div className="p-4 sm:p-6">{children}</div></div>;

const LearningMaterialScreen = () => {
    const { learningData, setScreen } = useContext(AppContext);
    if (!learningData) return <div className="text-center p-8">Materi tidak ditemukan. <button onClick={() => setScreen('subjectDashboard')} className="text-cyan-500 underline">Kembali</button></div>;
    const { topic, ringkasan, materi_lengkap, latihan_soal, video } = learningData;
    return (
        <AnimatedScreen customKey="lesson">
            <BackButton onClick={() => setScreen('subjectDashboard')} />
            <div className="space-y-8 pt-8">
                <h1 className="text-3xl sm:text-5xl font-bold text-center text-cyan-600 dark:text-cyan-400">{topic}</h1>
                {video ? (
                    <InfoCard icon={<Youtube />} title={video.title}>
                        <div className="aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden shadow-lg">
                            <iframe src={video.embedUrl} title={video.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="w-full h-full"></iframe>
                        </div>
                    </InfoCard>
                ) : (
                    <InfoCard icon={<Youtube />} title="Video Pembelajaran"><p className="text-center text-slate-400 p-4">Guru AI tidak menemukan video pembelajaran yang relevan di YouTube untuk topik ini.</p></InfoCard>
                )}
                {ringkasan && <InfoCard icon={<Lightbulb />} title="Ringkasan"><p className="leading-relaxed">{ringkasan}</p></InfoCard>}
                {materi_lengkap && <InfoCard icon={<BookOpen />} title="Materi Lengkap"><div className="prose dark:prose-invert max-w-none"><ReactMarkdown>{materi_lengkap}</ReactMarkdown></div></InfoCard>}
                {latihan_soal?.length > 0 && <InfoCard icon={<BookMarked />} title="Latihan Soal"><QuizPlayer questions={latihan_soal} /></InfoCard>}
            </div>
        </AnimatedScreen>
    );
};

const Footer = ({ isLanding = false }) => (
    <footer className={`w-full text-center p-6 text-slate-500 dark:text-slate-400 text-sm ${isLanding ? 'relative z-10 mt-16' : 'mt-auto border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50'}`}>
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Sebuah Karya dari</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white">M. Irham Andika Putra & Bgune Digital</p>
        <div className="flex justify-center gap-4 mt-3">
            <a href="https://www.youtube.com/@PernahMikir" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 transition-colors"><Youtube/></a>
            <a href="https://github.com/irhamp" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 transition-colors"><Github/></a>
            <a href="https://www.instagram.com/irham_putra07" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 transition-colors"><Instagram/></a>
        </div>
        <p className="mt-4 text-xs">Dibuat dengan <Sparkles className="inline h-3 w-3 text-amber-400"/> dan Teknologi AI dari Google</p>
    </footer>
);

const ScreenContainer = () => {
    const { screen } = useContext(AppContext);
    const screens = {
        levelSelection: <LevelSelectionScreen key="level" />,
        trackSelection: <TrackSelectionScreen key="track" />,
        subjectSelection: <SubjectSelectionScreen key="subject" />,
        subjectDashboard: <SubjectDashboardScreen key="dashboard" />,
        lesson: <LearningMaterialScreen key="lesson" />,
        bankSoal: <BankSoalScreen key="bankSoal" />,
    };
    return <div className="relative h-full w-full">{screens[screen]}</div>;
};

const BackButton = ({ onClick }) => <button onClick={onClick} className="flex items-center gap-2 text-cyan-500 font-semibold hover:underline mb-8"><ArrowLeft size={20} /> Kembali</button>;
const ErrorMessage = ({ message }) => <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-r-lg mt-4 w-full flex items-center gap-4"><AlertTriangle className="h-6 w-6 text-red-500" /><p className="font-bold">{message}</p></div>;

const iconMap = { School, Brain, BookOpen, Youtube, Lightbulb, FileText, ArrowLeft, Loader, Sparkles, AlertTriangle, X, FlaskConical, Globe, Calculator, Dna, BarChart2, Drama, Computer, BookHeart, Landmark, Languages, HelpCircle, Atom, CheckCircle, ChevronRight, BrainCircuit, History, BookMarked, Github, Instagram };
const curriculum = { 'SD': { subjects: [{ name: 'Matematika', iconName: 'Calculator' }, { name: 'IPAS', iconName: 'Globe' }, { name: 'Pendidikan Pancasila', iconName: 'Landmark' }, { name: 'Bahasa Indonesia', iconName: 'BookHeart' }] }, 'SMP': { subjects: [{ name: 'Matematika', iconName: 'Calculator' }, { name: 'IPA Terpadu', iconName: 'FlaskConical' }, { name: 'IPS Terpadu', iconName: 'Globe' }, { name: 'Pendidikan Pancasila', iconName: 'Landmark'}, { name: 'Bahasa Indonesia', iconName: 'BookHeart' }, { name: 'Bahasa Inggris', iconName: 'Languages' }, { name: 'Informatika', iconName: 'Computer' }] }, 'SMA': { tracks: { 'IPA': [{ name: 'Matematika Peminatan', iconName: 'Calculator' }, { name: 'Fisika', iconName: 'Atom' }, { name: 'Kimia', iconName: 'FlaskConical' }, { name: 'Biologi', iconName: 'Dna' }], 'IPS': [{ name: 'Ekonomi', iconName: 'BarChart2' }, { name: 'Geografi', iconName: 'Globe' }, { name: 'Sosiologi', iconName: 'School' }], 'Bahasa': [{ name: 'Sastra Indonesia', iconName: 'BookHeart' }, { name: 'Sastra Inggris', iconName: 'Drama' }, { name: 'Antropologi', iconName: 'Globe' }, { name: 'Bahasa Asing', iconName: 'Languages' }] } } };

const LevelSelectionScreen = () => { 
    const { setScreen, setLevel, setPage } = useContext(AppContext);
    return (
        <AnimatedScreen customKey="level">
            <div className="text-center pt-8">
                <BackButton onClick={() => setPage('dashboard')} />
                <School className="w-24 h-24 mx-auto text-cyan-500" />
                <h1 className="text-4xl font-bold mt-4">Pilih Jenjang Pendidikan</h1>
                <p className="text-xl text-slate-500 dark:text-slate-400 mt-2 mb-12">Mulai dari sini untuk petualangan belajarmu.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    {Object.keys(curriculum).map((lvl) => <button key={lvl} onClick={() => { setLevel(lvl); setScreen(lvl === 'SMA' ? 'trackSelection' : 'subjectSelection'); }} className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md hover:shadow-cyan-500/20 hover:border-cyan-500 hover:-translate-y-2 transition-all text-2xl font-bold flex flex-col items-center justify-center gap-4 cursor-pointer">{lvl}</button>)}
                </div>
            </div>
        </AnimatedScreen>
    );
};
const TrackSelectionScreen = () => { 
    const { setScreen, setTrack } = useContext(AppContext);
    return (
        <AnimatedScreen customKey="track">
             <BackButton onClick={() => setScreen('levelSelection')} />
            <div className="text-center pt-8">
                <h1 className="text-4xl font-bold mb-12">Pilih Jurusan</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
                    {Object.keys(curriculum.SMA.tracks).map((trackName) => <button key={trackName} onClick={() => { setTrack(trackName); setScreen('subjectSelection'); }} className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md hover:shadow-cyan-500/20 hover:border-cyan-500 hover:-translate-y-2 transition-all text-2xl font-bold">{trackName}</button>)}
                </div>
            </div>
        </AnimatedScreen>
    );
};
const SubjectSelectionScreen = () => {
    const { level, track, setScreen, setSubject } = useContext(AppContext);
    const subjects = level === 'SMA' ? curriculum.SMA.tracks[track] : curriculum[level]?.subjects;
    const backScreen = level === 'SMA' ? 'trackSelection' : 'levelSelection';
    if (!subjects) return <div className="text-center"><p>Gagal memuat mata pelajaran.</p><BackButton onClick={() => setScreen(backScreen)} /></div>
    return (
        <AnimatedScreen customKey="subject">
             <BackButton onClick={() => setScreen(backScreen)} />
            <div className="pt-8">
                 <h1 className="text-4xl font-bold mb-12 text-center">Pilih Mata Pelajaran</h1>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
                    {subjects.map((s) => <button key={s.name} onClick={() => { setSubject(s); setScreen('subjectDashboard'); }} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-center hover:border-cyan-500 hover:-translate-y-1 transition-all aspect-square shadow-md"><DynamicIcon name={s.iconName} size={48} className="text-cyan-500" /><span className="font-semibold text-sm text-center mt-3">{s.name}</span></button>)}
                </div>
            </div>
        </AnimatedScreen>
    );
};
const DynamicIcon = ({ name, ...props }) => { const IconComponent = iconMap[name]; return IconComponent ? <IconComponent {...props} /> : <HelpCircle {...props} />; };
const SubjectDashboardScreen = () => {
    const { subject, recommendations, error, setError, history, setScreen, fetchLearningMaterial, fetchRecommendations } = useContext(AppContext);
    const [inputValue, setInputValue] = useState('');
    const [activeTab, setActiveTab] = useState('rekomendasi');

    useEffect(() => { if (subject && recommendations.length === 0) fetchRecommendations(); }, [subject, fetchRecommendations, recommendations.length]);
    if (!subject) return <div className="text-center">Harap pilih mata pelajaran. <BackButton onClick={() => setScreen('subjectSelection')} /></div>;

    const handleSearchSubmit = (e) => { e.preventDefault(); if(inputValue.trim()) { setError(null); fetchLearningMaterial(inputValue); } else { setError("Topik pencarian tidak boleh kosong."); } };

    return (
        <AnimatedScreen customKey="dashboard">
            <BackButton onClick={() => setScreen('subjectSelection')} />
            <div className="text-center pt-8"><DynamicIcon name={subject.iconName} size={80} className="text-cyan-500 mx-auto mb-4" /><h1 className="text-4xl font-bold">Mata Pelajaran: {subject.name}</h1></div>
            <div className="w-full max-w-2xl mx-auto my-12">
                <form onSubmit={handleSearchSubmit} className="relative">
                    <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ketik topik untuk dipelajari..." className="w-full pl-6 pr-16 py-4 text-lg bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-full focus:ring-4 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"/>
                    <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-cyan-600 text-white rounded-full hover:bg-cyan-700 transition-transform active:scale-95"><Search className="w-6 h-6" /></button>
                </form>
                 {error && <ErrorMessage message={error} />}
            </div>
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-center border-b border-slate-300 dark:border-slate-700 mb-6 flex-wrap">{['rekomendasi', 'riwayat', 'bank_soal'].map(tab => <TabButton key={tab} icon={{rekomendasi: <Sparkles/>, riwayat: <History/>, bank_soal: <BrainCircuit/>}[tab]} text={{rekomendasi: "Rekomendasi", riwayat: "Riwayat", bank_soal: "Bank Soal"}[tab]} isActive={activeTab===tab} onClick={() => setActiveTab(tab)}/>)}</div>
                <div className="animate-fadeInUp">
                    {activeTab === 'rekomendasi' && (recommendations.length > 0 ? <div className="grid md:grid-cols-2 gap-4">{recommendations.map((rec,i)=>(<ListItem key={i} text={rec} onClick={()=>fetchLearningMaterial(rec)}/>))}</div> : <p className="text-center text-slate-500">Guru AI sedang mencari rekomendasi...</p>)}
                    {activeTab === 'riwayat' && (history.filter(h => h.subjectName === subject.name).length > 0 ? <div className="grid md:grid-cols-2 gap-4">{history.filter(h => h.subjectName === subject.name).map((h,i)=>(<ListItem key={i} text={h.topic} onClick={()=>fetchLearningMaterial(h.topic, true)}/>))}</div> : <p className="text-center text-slate-500">Belum ada riwayat belajar.</p>)}
                    {activeTab === 'bank_soal' && <BankSoalGenerator />}
                </div>
            </div>
        </AnimatedScreen>
    );
};
const BankSoalGenerator = () => {
    const { setError, fetchBankSoal } = useContext(AppContext);
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(5);
    const handleSubmit = (e) => { e.preventDefault(); if (!topic.trim()) { setError("Topik soal tidak boleh kosong."); return; } if (count < 1 || count > 20) { setError("Jumlah soal harus antara 1 dan 20."); return; } setError(null); fetchBankSoal(topic, count); };
    return (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-center mb-4">🎯 Bank Soal Berbasis Topik</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-4">Masukkan topik spesifik dan jumlah soal.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder='Contoh: Perang Diponegoro' className='w-full p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500' />
                <div className="flex flex-col sm:flex-row gap-4">
                    <input type="number" value={count} onChange={e => setCount(parseInt(e.target.value, 10))} min="1" max="20" className='w-full sm:w-1/3 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500' />
                    <button type="submit" className="w-full sm:w-2/3 p-3 font-bold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-slate-500">Buatkan Soal!</button>
                </div>
            </form>
        </div>
    );
};
const TabButton = ({icon, text, isActive, onClick}) => <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 sm:px-6 font-semibold border-b-2 transition-all ${isActive ? 'text-cyan-500 border-cyan-500' : 'text-slate-500 border-transparent hover:text-cyan-500'}`}>{React.cloneElement(icon, {size: 20})} <span className="hidden sm:inline">{text}</span></button>;
const ListItem = ({text, onClick}) => <button onClick={onClick} className="w-full text-left flex justify-between items-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 rounded-lg transition-all"><span className="font-semibold">{text}</span><ChevronRight /></button>;
const BankSoalScreen = () => {
    const { bankSoal, setScreen } = useContext(AppContext);
    return (
        <AnimatedScreen customKey="bankSoal">
            <BackButton onClick={() => setScreen('subjectDashboard')} />
            <div className="pt-8"><InfoCard title="Bank Soal Latihan">{bankSoal && bankSoal.length > 0 ? <QuizPlayer questions={bankSoal} /> : <p className="text-center p-4">Gagal memuat soal.</p>}</InfoCard></div>
        </AnimatedScreen>
    );
};
const QuizPlayer = ({ questions }) => {
    const [answers, setAnswers] = useState({});
    const [isSubmitted, setSubmitted] = useState(false);
    if (!questions || !Array.isArray(questions) || questions.length === 0) return <p>Soal latihan tidak tersedia.</p>;
    const score = useMemo(() => isSubmitted ? questions.reduce((acc, q, i) => acc + (answers[i]?.charAt(0).toUpperCase() === q.correctAnswer.charAt(0).toUpperCase() ? 1 : 0), 0) : 0, [answers, questions, isSubmitted]);

    return (
        <div className="space-y-8">
            {isSubmitted && <div className="text-center p-4 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 border border-cyan-300 dark:border-cyan-700"><h3 className="text-2xl font-bold">Skor: {Math.round((score / questions.length) * 100)}%</h3><p>Benar {score} dari {questions.length} soal.</p></div>}
            {questions.map((q, qIndex) => (
                <div key={qIndex}>
                    <p className="font-semibold text-lg mb-3">{qIndex + 1}. {q.question}</p>
                    <div className="space-y-2">{q.options?.map((opt, oIndex) => {
                        const isSelected = answers[qIndex] === opt;
                        const isCorrectOption = opt.charAt(0).toUpperCase() === q.correctAnswer.charAt(0).toUpperCase();
                        let stateClass = "border-slate-300 dark:border-slate-600 hover:border-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-700";
                        if (isSubmitted) {
                            if (isCorrectOption) stateClass = "bg-green-100 dark:bg-green-900/60 border-green-500 text-green-800 dark:text-white";
                            else if (isSelected && !isCorrectOption) stateClass = "bg-red-100 dark:bg-red-900/60 border-red-500 text-red-800 dark:text-white";
                            else stateClass = "border-slate-300 dark:border-slate-700 text-slate-500";
                        } else if (isSelected) {
                            stateClass = "border-cyan-500 bg-cyan-100 dark:bg-cyan-900/50";
                        }
                        return <button key={oIndex} onClick={() => !isSubmitted && setAnswers(p => ({ ...p, [qIndex]: opt }))} disabled={isSubmitted} className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${stateClass} disabled:cursor-not-allowed`}>{opt}</button>})}
                    </div>
                    {isSubmitted && q.explanation && <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-sm"><p className="font-bold flex items-center gap-2"><CheckCircle size={16}/> Penjelasan:</p><p className="mt-2 pl-1">{q.explanation}</p><p className="mt-2 pl-1">Jawaban benar: <span className="font-bold text-green-600 dark:text-green-400">{q.correctAnswer}</span></p></div>}
                </div>
            ))}
            <div className="pt-4">{!isSubmitted ? <button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length !== questions.length} className="w-full p-4 mt-6 font-bold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all">Kumpulkan Jawaban</button> : <button onClick={() => { setSubmitted(false); setAnswers({}); }} className="w-full p-4 mt-6 font-bold text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition-all">Coba Lagi</button>}</div>
        </div>
    );
};

// --- CSS & STYLING INJECTOR ---
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Open+Sans&family=Lexend:wght@400;700&display=swap');
    
    :root {
        --font-size-multiplier: 1;
        --font-family-default: 'Poppins', 'Lexend', sans-serif;
        --font-family-dyslexia: 'Open Sans', sans-serif;
    }
    body, .font-sans { font-family: var(--font-family-default); }
    .dyslexia-friendly { font-family: var(--font-family-dyslexia); letter-spacing: 0.5px; }

    .font-size-sm { --font-size-multiplier: 0.9; }
    .font-size-base { --font-size-multiplier: 1; }
    .font-size-lg { --font-size-multiplier: 1.1; }
    p, span, div, button, input, a, li, h3, h2, h4 { font-size: calc(1rem * var(--font-size-multiplier)); }
    h1 { font-size: calc(2rem * var(--font-size-multiplier)); }

    .focus-mode .non-essential { display: none !important; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.4s ease-in-out; }
    .animate-fadeInUp { animation: fadeInUp 0.4s ease-out forwards; }
    
    .no-animations * { transition: none !important; animation: none !important; }

    .aspect-w-16 { position: relative; padding-bottom: 56.25%; }
    .aspect-h-9 { height: 0; }
    .aspect-w-16 > iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }

    .prose { --tw-prose-body: #334155; --tw-prose-headings: #1e293b; --tw-prose-lead: #475569; --tw-prose-links: #0891b2; --tw-prose-bold: #1e293b; --tw-prose-counters: #64748b; --tw-prose-bullets: #94a3b8; --tw-prose-hr: #e2e8f0; --tw-prose-quotes: #1e293b; --tw-prose-quote-borders: #e2e8f0; --tw-prose-captions: #64748b; --tw-prose-code: #1e293b; --tw-prose-pre-code: #e2e8f0; --tw-prose-pre-bg: #1e293b; --tw-prose-th-borders: #d1d5db; --tw-prose-td-borders: #e5e7eb; --tw-prose-invert-body: #d1d5db; --tw-prose-invert-headings: #fff; --tw-prose-invert-lead: #9ca3af; --tw-prose-invert-links: #67e8f9; --tw-prose-invert-bold: #fff; --tw-prose-invert-counters: #9ca3af; --tw-prose-invert-bullets: #4b5563; --tw-prose-invert-hr: #374151; --tw-prose-invert-quotes: #f3f4f6; --tw-prose-invert-quote-borders: #374151; --tw-prose-invert-captions: #9ca3af; --tw-prose-invert-code: #fff; --tw-prose-invert-pre-code: #d1d5db; --tw-prose-invert-pre-bg: rgb(0 0 0 / 50%); }
    .prose :where(a):not(:where([class~="not-prose"] *)) { text-decoration: none; font-weight: 600; }
    .prose :where(a):not(:where([class~="not-prose"] *)):hover { text-decoration: underline; }
    .prose :where(h2):not(:where([class~="not-prose"] *)) { margin-top: 1.5em; margin-bottom: 0.8em; }
    .prose :where(h3):not(:where([class~="not-prose"] *)) { margin-top: 1.2em; margin-bottom: 0.5em; }
    .prose :where(ul):not(:where([class~="not-prose"] *)) { padding-left: 1.2em; }
    .prose :where(ol):not(:where([class~="not-prose"] *)) { padding-left: 1.2em; }
    .prose :where(code):not(:where([class~="not-prose"] *)) { background-color: #e2e8f0; padding: 0.2em 0.4em; border-radius: 0.25rem; font-weight: 600; }
    .dark .prose :where(code):not(:where([class~="not-prose"] *)) { background-color: #334155; }
`;
document.head.appendChild(styleSheet);
