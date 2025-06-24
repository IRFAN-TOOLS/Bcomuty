import React, { useState, useEffect, createContext, useContext, useCallback, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
    Search, BrainCircuit, BookOpen, Youtube, Lightbulb, FileText, ArrowLeft, Loader, Sparkles, 
    AlertTriangle, X, School, FlaskConical, Globe, Calculator, Dna, BarChart2, Drama,
    Computer, BookHeart, Landmark, Languages, HelpCircle, Atom, CheckCircle, ChevronRight, 
    History, BookMarked, Github, Instagram, Sun, Moon, LogOut, 
    User, Settings, Menu, Info, Newspaper, LayoutDashboard, Volume2, VolumeX, 
    Wind, Text, Palette, Download, MessageSquare, BarChart, Upload, Trash2, ShieldCheck,
    Focus, Zap, SendHorizontal, UserCheck, Monitor, Terminal, Database, Video, Edit, Check, 
    Award, Users
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- KONFIGURASI PENTING & API KEYS ---
const GEMINI_API_KEY = "AIzaSyArJ1P8HanSQ_XVWX9m4kUlsIVXrBRInik"; // Kunci API Anda
const YOUTUBE_API_KEY = "AIzaSyD9Rp-oSegoIDr8q9XlKkqpEL64lB2bQVE"; // Kunci API Anda
const DEV_EMAIL = "bgune@admin.com"; // Email khusus untuk akses developer

const firebaseConfig = {
    apiKey: "AIzaSyANQqaFwrsf3xGSDxyn9pcRJqJrIiHrjM0", // Konfigurasi Firebase Anda
    authDomain: "bgune---community.firebaseapp.com",
    projectId: "bgune---community",
    storageBucket: "bgune---community.appspot.com",
    messagingSenderId: "749511144215",
    appId: "1:749511144215:web:dcf13c4d59dc705d4f7d52",
    measurementId: "G-5XRSG2H5SV"
};

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
            console.error(error);
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    }, [key, storedValue]);

    return [storedValue, setValue];
}

// --- PENYEDIA KONTEKS (PROVIDERS) ---

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const isDeveloper = useMemo(() => user?.email === DEV_EMAIL, [user]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        setLoading(true);
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
        } catch (error) {
            console.error("Error login:", error);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (error) {
            console.error("Error logout:", error);
        }
    };

    const value = { user, loading, isDeveloper, loginWithGoogle, logout };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const SettingsProvider = ({ children }) => {
    const [theme, setTheme] = useLocalStorage('bdukasi-theme-v2', 'light');
    const [fontSize, setFontSize] = useLocalStorage('bdukasi-font-size-v2', 'base');
    const [language, setLanguage] = useLocalStorage('bdukasi-lang-v2', 'id');
    const [dyslexiaFont, setDyslexiaFont] = useLocalStorage('bdukasi-dyslexia-v2', false);
    const [focusMode, setFocusMode] = useLocalStorage('bdukasi-focus-v2', false);
    const [dataSaver, setDataSaver] = useLocalStorage('bdukasi-datasaver-v2', false);
    const [animations, setAnimations] = useLocalStorage('bdukasi-animations-v2', true);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.toggle('dark', theme === 'dark');
        root.classList.toggle('light', theme !== 'dark');
        root.style.setProperty('--font-family', dyslexiaFont ? "'Open Sans', sans-serif" : "'Poppins', sans-serif");
        root.classList.toggle('no-animations', !animations);
        document.body.className = `font-size-${fontSize}`;
    }, [theme, dyslexiaFont, animations, fontSize]);

    const value = { theme, setTheme, fontSize, setFontSize, language, setLanguage, dyslexiaFont, setDyslexiaFont, focusMode, setFocusMode, dataSaver, setDataSaver, animations, setAnimations };
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

const DevProvider = ({ children }) => {
    const [managedVideos, setManagedVideos] = useLocalStorage('bdukasi-dev-videos-v2', []);
    const [devLogs, setDevLogs] = useLocalStorage('bdukasi-dev-logs-v2', [{ type: 'info', msg: 'Developer console initialized.'}]);
    
    const addLog = (type, msg) => {
        const newLog = { type, msg, time: new Date().toLocaleTimeString() };
        setDevLogs(prev => [newLog, ...prev].slice(0, 100));
    };

    const value = { managedVideos, setManagedVideos, devLogs, addLog };
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
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [pwaInstallPrompt, setPwaInstallPrompt] = useState(null);

    const { managedVideos } = useContext(DevContext);
    const { dataSaver } = useContext(SettingsContext);

    const fetchLearningMaterial = useCallback(async (searchTopic) => {
        if (!searchTopic || !level || !subject) return;
        setIsLoading(true);
        setLoadingMessage('Kak Spenta AI sedang menyiapkan materimu...');
        setLearningData(null);
        setPage('belajar');
        setScreen('lesson');

        const geminiPrompt = `Buat ringkasan, materi lengkap (Markdown), dan 5 soal pilihan ganda (A-E) dengan jawaban & penjelasan untuk topik '${searchTopic}' pelajaran '${subject.name}' tingkat ${level} ${track ? `jurusan ${track}`: ''}. Respons HANYA JSON: {"ringkasan": "...", "materi_lengkap": "...", "latihan_soal": [{"question": "...", "options": [...], "correctAnswer": "A", "explanation": "..."}]}`;
        
        try {
            const geminiData = await callGeminiAPI(geminiPrompt);
            const videoToShow = !dataSaver && managedVideos.length > 0 ? managedVideos[0] : null;
            setLearningData({ topic: searchTopic, ...geminiData, video: videoToShow });
        } catch (err) {
            console.error("Fetch Materi Error:", err);
            setPage('dashboard');
        } finally {
            setIsLoading(false);
        }
    }, [level, subject, track, managedVideos, dataSaver]);
    
    // ... other app provider functions remain the same
    const value = { page, setPage, screen, setScreen, level, setLevel, track, setTrack, subject, setSubject, learningData, isLoading, loadingMessage, isSidebarOpen, setSidebarOpen, pwaInstallPrompt, setPwaInstallPrompt, fetchLearningMaterial, bankSoal, setBankSoal, setIsLoading, setLoadingMessage, recommendations, setRecommendations };
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}


// --- FUNGSI API HELPER ---
const callGeminiAPI = async (prompt) => {
    if (!GEMINI_API_KEY) throw new Error("Kunci API Gemini belum diatur.");
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json" } };
    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error("Permintaan API Gagal");
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Respons API tidak valid.");
    return JSON.parse(text.replace(/```json|```/g, '').trim());
};

// --- KOMPONEN UTAMA ---
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
    const { loading } = useContext(AuthContext);
    const { isLoading, loadingMessage } = useContext(AppContext);

    if (loading || isLoading) {
        return <LoadingScreen message={loadingMessage || 'Autentikasi...'} />;
    }
    return <Content />;
}

const Content = () => {
    const { user } = useContext(AuthContext);
    if (!user) return <LandingPage />;
    return <AppLayout />;
}

const AppLayout = () => {
    const { page } = useContext(AppContext);
    const { focusMode } = useContext(SettingsContext);
    const { isDeveloper } = useContext(AuthContext);

    const pages = {
        'dashboard': <DashboardPage />,
        'belajar': <LearningFlow />,
        'tanya-ai': <ChatAiPage />,
        'akun': <SettingsPage />,
        'developer': isDeveloper ? <DeveloperDashboard /> : <DashboardPage />,
    };

    return (
        <div className="bg-sky-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 min-h-screen font-sans">
            <div className="md:flex">
                {!focusMode && <Sidebar />}
                <div className={`flex-1 transition-all duration-300 ${!focusMode ? 'md:ml-64' : 'md:ml-0'}`}>
                    {!focusMode && <Navbar />}
                    <main className="p-4 sm:p-6 lg:p-8">
                        {pages[page] || <DashboardPage />}
                    </main>
                </div>
            </div>
        </div>
    );
};

// --- KOMPONEN LOGO DAN LOADING ---
const Logo = ({ className = "w-12 h-12" }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 10C27.9086 10 10 27.9086 10 50C10 72.0914 27.9086 90 50 90V10Z" fill="url(#paint0_linear_1_2)"/>
        <path d="M50 10C72.0914 10 90 27.9086 90 50C90 72.0914 72.0914 90 50 90V10Z" fill="url(#paint1_linear_1_2)"/>
        <path d="M50 10V90" stroke="white" strokeWidth="4"/>
        <circle cx="50" cy="50" r="10" fill="white"/>
        <defs>
            <linearGradient id="paint0_linear_1_2" x1="50" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8"/>
                <stop offset="1" stopColor="#0ea5e9"/>
            </linearGradient>
            <linearGradient id="paint1_linear_1_2" x1="50" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2dd4bf"/>
                <stop offset="1" stopColor="#14b8a6"/>
            </linearGradient>
        </defs>
    </svg>
);

const LoadingScreen = ({ message }) => (
    <div className="fixed inset-0 bg-sky-50 dark:bg-slate-900 z-50 flex flex-col items-center justify-center gap-6">
        <div className="animate-bounce">
            <Logo className="w-24 h-24" />
        </div>
        <p className="text-xl font-semibold text-slate-600 dark:text-slate-300">{message}</p>
    </div>
);

// --- HALAMAN-HALAMAN UTAMA ---
const LandingPage = () => {
    const { loginWithGoogle, loading } = useContext(AuthContext);
    return (
        <div className="bg-sky-50 min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
             <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-2"><Logo className="w-10 h-10"/><span className="text-2xl font-bold text-slate-800">Bdukasi</span></div>
            </div>
            <main className="z-10 text-center flex flex-col items-center">
                <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight">Teman Belajar <span className="text-blue-500">Terbaikmu</span>.</h1>
                <p className="mt-6 text-lg text-slate-600 max-w-xl mx-auto">Ubah cara belajarmu jadi lebih seru dan personal dengan AI.</p>
                <button onClick={loginWithGoogle} disabled={loading} className="mt-8 px-8 py-4 bg-blue-500 text-white font-bold text-lg rounded-full shadow-lg hover:bg-blue-600 transform hover:scale-105 transition-all flex items-center gap-3">
                    {loading ? <Loader className="animate-spin" /> : "Mulai Belajar Sekarang"}
                </button>
            </main>
        </div>
    );
};

const DashboardPage = () => {
    const { user } = useContext(AuthContext);
    const { setPage } = useContext(AppContext);
    return (
        <AnimatedScreen key="dashboard">
            <h1 className="text-3xl font-bold">Halo, {user?.displayName?.split(' ')[0]}!</h1>
            <p className="text-lg text-slate-500 mb-8">Siap taklukkan hari ini?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DashboardCard icon={<BrainCircuit size={32} />} title="Mulai Belajar" description="Pilih jenjang & mapel." onClick={() => setPage('belajar')} className="bg-blue-500 text-white col-span-1 md:col-span-2 lg:col-span-1"/>
                <DashboardCard icon={<MessageSquare size={32} />} title="Tanya AI" description="Tanya apa saja pada Kak Spenta." onClick={() => setPage('tanya-ai')} className="bg-teal-500 text-white"/>
                <DashboardCard icon={<BookMarked size={32} />} title="Bank Soal" description="Latihan soal tak terbatas." onClick={() => setPage('belajar')} />
                <div className="lg:col-span-2"><DailyMissionCard /></div>
                <LeaderboardCard />
            </div>
        </AnimatedScreen>
    );
};

const DeveloperDashboard = () => {
    return (
        <AnimatedScreen key="developer">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Developer Dashboard</h1>
                    <p className="text-slate-500">Alat dan statistik khusus untuk tim Bgune.</p>
                </div>
                 <div className="flex items-center gap-2 text-xs font-mono p-2 bg-slate-200 dark:bg-slate-700 rounded">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    ADMIN_MODE
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <VideoManagement />
                </div>
                <div className="lg:col-span-1 space-y-8">
                    <DevStats />
                    <DevConsole />
                </div>
            </div>
        </AnimatedScreen>
    );
};

const SettingsPage = () => {
    const { logout } = useContext(AuthContext);
    const { theme, setTheme, fontSize, setFontSize, language, setLanguage, dyslexiaFont, setDyslexiaFont, focusMode, setFocusMode, dataSaver, setDataSaver, animations, setAnimations } = useContext(SettingsContext);
    
    return (
        <AnimatedScreen key="settings">
            <h1 className="text-3xl font-bold mb-8">Pengaturan</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InfoCard title="Tampilan">
                    <SettingToggle label="Mode Gelap" icon={<Palette/>} isEnabled={theme === 'dark'} onToggle={() => setTheme(p => p === 'dark' ? 'light' : 'dark')} />
                     <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <label className="font-semibold block mb-2">Ukuran Font</label>
                        <div className="flex gap-2">{['sm', 'base', 'lg'].map(size => <button key={size} onClick={() => setFontSize(size)} className={`px-4 py-2 rounded-lg font-semibold ${fontSize === size ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>{size}</button>)}</div>
                     </div>
                </InfoCard>
                 <InfoCard title="Aksesibilitas & Fitur">
                    <SettingToggle label="Font Ramah Disleksia" icon={<Text/>} isEnabled={dyslexiaFont} onToggle={() => setDyslexiaFont(p => !p)} />
                    <SettingToggle label="Mode Fokus" icon={<Focus/>} isEnabled={focusMode} onToggle={() => setFocusMode(p => !p)} />
                    <SettingToggle label="Hemat Kuota" icon={<Zap/>} isEnabled={dataSaver} onToggle={() => setDataSaver(p => !p)} />
                    <SettingToggle label="Animasi UI" icon={<Wind/>} isEnabled={animations} onToggle={() => setAnimations(p => !p)} />
                </InfoCard>
                <InfoCard title="Bahasa">
                    <div className="flex gap-2">
                         <button onClick={() => setLanguage('id')} className={`px-4 py-2 rounded-lg font-semibold ${language === 'id' ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>Indonesia</button>
                         <button onClick={() => setLanguage('en')} className={`px-4 py-2 rounded-lg font-semibold ${language === 'en' ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>English</button>
                    </div>
                </InfoCard>
                <InfoCard title="Akun">
                    <button onClick={logout} className="w-full text-left p-3 bg-red-500 text-white font-bold rounded-lg flex items-center gap-2"><LogOut/> Keluar</button>
                </InfoCard>
            </div>
        </AnimatedScreen>
    )
}

const ChatAiPage = () => { /* ... Komponen Chat AI tetap sama ... */ return <div/>};
const LearningFlow = () => { /* ... Komponen Alur Belajar tetap sama ... */ return <div/>};


// --- KOMPONEN UNTUK HALAMAN DEVELOPER ---
const InfoCard = ({ title, children, className }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/50 ${className}`}>
        <h3 className="px-6 py-4 text-lg font-bold border-b border-slate-200/80 dark:border-slate-700/50">{title}</h3>
        <div className="p-6">{children}</div>
    </div>
);

const DevStats = () => {
    return (
        <InfoCard title="Statistik Aplikasi">
            <div className="space-y-4">
                <div className="flex justify-between items-center"><span className="flex items-center gap-2"><Users size={16}/> Pengguna Aktif</span> <span className="font-bold">1,204</span></div>
                <div className="flex justify-between items-center"><span className="flex items-center gap-2"><Database size={16}/> Materi Dibuat</span> <span className="font-bold">258</span></div>
                <div className="flex justify-between items-center"><span className="flex items-center gap-2"><CheckCircle size={16}/> Soal Dikerjakan</span> <span className="font-bold">15,721</span></div>
            </div>
        </InfoCard>
    );
};

const VideoManagement = () => {
    const { managedVideos, setManagedVideos, addLog } = useContext(DevContext);
    const [id, setId] = useState('');
    const [title, setTitle] = useState('');
    const [editing, setEditing] = useState(null);

    const handleAddOrUpdate = (e) => {
        e.preventDefault();
        if (!id || !title) return;
        const videoData = { id, title, embedUrl: `https://www.youtube.com/embed/${id}` };
        
        if (editing) {
            setManagedVideos(managedVideos.map(v => v.id === editing.id ? videoData : v));
            addLog('success', `Video updated: ${title}`);
            setEditing(null);
        } else {
            setManagedVideos([videoData, ...managedVideos]);
            addLog('success', `Video added: ${title}`);
        }
        setId('');
        setTitle('');
    };

    const handleEdit = (video) => {
        setEditing(video);
        setId(video.id);
        setTitle(video.title);
    };

    const handleDelete = (videoId) => {
        setManagedVideos(managedVideos.filter(v => v.id !== videoId));
        addLog('warn', `Video with ID ${videoId} deleted.`);
    };

    return (
        <InfoCard title="Kelola Video Pembelajaran">
            <form onSubmit={handleAddOrUpdate} className="space-y-3 mb-6 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                <input value={id} onChange={e => setId(e.target.value)} placeholder="YouTube Video ID (e.g., dQw4w9WgXcQ)" className="w-full p-2 rounded-md bg-white dark:bg-slate-700"/>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul Video" className="w-full p-2 rounded-md bg-white dark:bg-slate-700"/>
                <button type="submit" className="w-full p-2 rounded-md font-bold text-white bg-blue-500 hover:bg-blue-600">{editing ? 'Update Video' : 'Tambah Video'}</button>
                {editing && <button onClick={() => { setEditing(null); setId(''); setTitle('');}} className="w-full p-2 mt-2 rounded-md bg-slate-300 dark:bg-slate-600">Batal</button>}
            </form>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {managedVideos.map(video => (
                    <div key={video.id} className="flex items-center justify-between p-3 rounded-md bg-slate-50 dark:bg-slate-700/50">
                        <div>
                            <p className="font-semibold">{video.title}</p>
                            <p className="text-xs text-slate-500">{video.id}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleEdit(video)} className="p-2 hover:text-blue-500"><Edit size={16}/></button>
                            <button onClick={() => handleDelete(video.id)} className="p-2 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </InfoCard>
    );
};

const DevConsole = () => {
    const { devLogs, addLog, setManagedVideos } = useContext(DevContext);

    const handleClearVideos = () => {
        if(window.confirm('Yakin ingin hapus semua video?')) {
            setManagedVideos([]);
            addLog('error', 'All managed videos have been reset.');
        }
    }
    return (
        <InfoCard title="Konsol Developer">
             <div className="bg-black text-white font-mono text-xs rounded-lg p-4 h-64 overflow-y-scroll flex flex-col-reverse">
                <div className="space-y-1">
                {devLogs.map((log, i) => (
                    <p key={i}>
                        <span className="text-slate-500">{log.time || '...'} &gt; </span>
                        <span className={log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-amber-400' : 'text-green-400'}>{log.msg}</span>
                    </p>
                ))}
                </div>
            </div>
            <div className="mt-4 space-y-2">
                 <button onClick={handleClearVideos} className="w-full p-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700">Reset Semua Video</button>
            </div>
        </InfoCard>
    )
};


// --- KOMPONEN-KOMPONEN UI PENDUKUNG ---

const Sidebar = () => {
    const { page, setPage, isSidebarOpen, setSidebarOpen } = useContext(AppContext);
    const { logout, isDeveloper } = useContext(AuthContext);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'belajar', label: 'Belajar', icon: BrainCircuit },
        { id: 'tanya-ai', label: 'Tanya AI', icon: MessageSquare },
    ];
    if(isDeveloper) navItems.push({ id: 'developer', label: 'Developer', icon: Terminal });

    const NavLink = ({ item }) => (
         <button onClick={() => { setPage(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors text-base ${page === item.id ? 'bg-blue-500 text-white font-semibold' : 'hover:bg-sky-100 dark:hover:bg-slate-700'}`}>
            <item.icon size={20} /><span>{item.label}</span>
        </button>
    );

    return (
        <>
            <div onClick={() => setSidebarOpen(false)} className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div>
            <aside className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 flex flex-col z-40 transition-transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center gap-2 text-2xl font-bold mb-8 px-2">
                    <Logo className="w-9 h-9"/><span>Bdukasi</span>
                </div>
                <nav className="flex-grow space-y-1.5">{navItems.map(item => <NavLink key={item.id} item={item} />)}</nav>
                <div className="mt-auto space-y-1.5">
                    <NavLink item={{ id: 'akun', label: 'Pengaturan', icon: Settings }} />
                    <button onClick={logout} className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500"><LogOut size={20}/><span>Keluar</span></button>
                </div>
            </aside>
        </>
    );
}

const Navbar = () => {
    const { setSidebarOpen } = useContext(AppContext);
    return (
        <header className="sticky top-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg z-20 border-b border-slate-200 dark:border-slate-700 md:hidden">
            <div className="px-4 h-16 flex items-center justify-between">
                <div className="font-bold text-xl flex items-center gap-2"><Logo className="w-8 h-8"/> Bdukasi</div>
                <button onClick={() => setSidebarOpen(true)} className="p-2"><Menu /></button>
            </div>
        </header>
    );
}

const AnimatedScreen = ({ children, customKey }) => <div key={customKey} className="animate-fadeIn">{children}</div>;

const DashboardCard = ({ icon, title, description, onClick, className="" }) => (
    <button onClick={onClick} className={`p-6 rounded-2xl shadow-sm text-left transform hover:-translate-y-1 transition-all duration-300 ${className}`}>
        <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-lg">{icon}</div>
            <div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="opacity-80">{description}</p>
            </div>
        </div>
    </button>
);

const DailyMissionCard = () => (
    <InfoCard title="Misi Harian">
        <div className="space-y-3">
            <p className="flex items-center gap-3"><CheckCircle className="text-green-500"/> Tonton 1 video belajar</p>
            <p className="flex items-center gap-3"><CheckCircle className="text-green-500"/> Kerjakan 5 soal latihan</p>
            <p className="flex items-center gap-3"><X className="text-slate-400"/> Tanya 1 pertanyaan ke AI</p>
        </div>
    </InfoCard>
);

const LeaderboardCard = () => (
    <InfoCard title="Papan Peringkat Mingguan">
         <div className="space-y-3">
            <p className="flex items-center gap-3"><Award className="text-amber-400"/> 1. Putri A.</p>
            <p className="flex items-center gap-3"><Award className="text-slate-400"/> 2. Budi S.</p>
            <p className="flex items-center gap-3"><Award className="text-amber-600"/> 3. Andi K.</p>
        </div>
    </InfoCard>
);

const SettingToggle = ({ label, icon, isEnabled, onToggle }) => (
    <div className="flex items-center justify-between py-2">
        <label className="font-semibold flex items-center gap-3">{icon} {label}</label>
        <button onClick={onToggle} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

// --- CSS & STYLING ---
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Open+Sans:wght@400;700&display=swap');
    
    :root { --font-family: 'Poppins', sans-serif; }
    body { font-family: var(--font-family); transition: background-color 0.3s, color 0.3s; }
    
    .font-size-sm { font-size: 0.9rem; }
    .font-size-base { font-size: 1rem; }
    .font-size-lg { font-size: 1.1rem; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .animate-fadeIn { animation: fadeIn 0.4s ease-in-out; }
    
    .no-animations * { transition: none !important; animation: none !important; }
`;
document.head.appendChild(styleSheet);
