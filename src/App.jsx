import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, onSnapshot, query, orderBy, deleteDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { 
    Search, Brain, BookOpen, Youtube, Lightbulb, FileText, ArrowLeft, Sparkles, 
    AlertTriangle, X, School, FlaskConical, Globe, Calculator, Dna, BarChart2, Drama,
    Computer, BookHeart, Landmark, Languages, HelpCircle, Atom, CheckCircle, ChevronRight, 
    BrainCircuit, History, BookMarked, Github, Instagram, CalendarDays, Sun, Moon, LogOut, 
    User, Settings, Menu, Info, Newspaper, LayoutDashboard, Volume2, VolumeX, Contrast, 
    Wind, Text, Palette, Shield, Target, Save, Users, UploadCloud, Trash2, Globe2, MessageSquare,
    Check, Award, Star, EyeOff, WifiOff
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- KONFIGURASI PENTING & API KEYS ---
const GEMINI_API_KEY = "AIzaSyArJ1P8HanSQ_XVWX9m4kUlsIVXrBRInik";
const firebaseConfig = {
    apiKey: "AIzaSyANQqaFwrsf3xGSDxyn9pcRJqJrIiHrjM0",
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
const db = getFirestore(app);

// --- KONFIGURASI DEVELOPER ---
const DEVELOPER_UIDS = ["YOUR_GOOGLE_UID_HERE", "ANOTHER_DEVELOPER_UID_HERE"]; // Ganti dengan UID Google Anda

// --- KONTEKS APLIKASI ---
const AuthContext = createContext(null);
const SettingsContext = createContext(null);
const AppContext = createContext(null);

// --- CUSTOM HOOKS ---
function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) { console.error(error); return initialValue; }
    });

    const setValue = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) { console.error(error); }
    }, [key]);
    
    return [storedValue, setValue];
}

// --- PENYEDIA KONTEKS (PROVIDERS) ---
const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userRef = doc(db, "users", firebaseUser.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    setUserData(userSnap.data());
                } else {
                    const newUserData = {
                        uid: firebaseUser.uid,
                        displayName: firebaseUser.displayName,
                        email: firebaseUser.email,
                        photoURL: firebaseUser.photoURL,
                        role: DEVELOPER_UIDS.includes(firebaseUser.uid) ? 'developer' : 'student',
                        createdAt: serverTimestamp(),
                        isNew: true,
                    };
                    await setDoc(userRef, newUserData);
                    setUserData(newUserData);
                     await runTransaction(db, async (transaction) => {
                        const statsRef = doc(db, "app_stats", "main");
                        const statsDoc = await transaction.get(statsRef);
                        if (!statsDoc.exists()) {
                            transaction.set(statsRef, { userCount: 1 });
                        } else {
                            const newCount = (statsDoc.data().userCount || 0) + 1;
                            transaction.update(statsRef, { userCount: newCount });
                        }
                    });
                }
                setUser(firebaseUser);
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        setLoading(true);
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error saat login Google:", error);
            setLoading(false);
        }
    };

    const logout = () => signOut(auth);
    
    const markUserAsOld = async () => {
        if (user) {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, { isNew: false }, { merge: true });
            setUserData(prev => ({ ...prev, isNew: false }));
        }
    };

    const value = { user, userData, loading, loginWithGoogle, logout, markUserAsOld };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const SettingsProvider = ({ children }) => {
    const [theme, setTheme] = useLocalStorage('bdukasi-theme', 'light');
    const [fontSize, setFontSize] = useLocalStorage('bdukasi-font-size', 'base');
    const [language, setLanguage] = useLocalStorage('bdukasi-lang', 'id');
    const [focusMode, setFocusMode] = useLocalStorage('bdukasi-focus', false);
    const [dataSaver, setDataSaver] = useLocalStorage('bdukasi-datasaver', false);
    const [dyslexiaFont, setDyslexiaFont] = useLocalStorage('bdukasi-dyslexia', false);
    const [notifications, setNotifications] = useLocalStorage('bdukasi-notifs', true);
    const [animations, setAnimations] = useLocalStorage('bdukasi-animations', true);
    
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        root.classList.toggle('no-animations', !animations);
        root.classList.toggle('dyslexia-friendly', dyslexiaFont);
        
        const sizes = ['sm', 'base', 'lg', 'xl'];
        sizes.forEach(s => root.classList.remove(`font-size-${s}`));
        root.classList.add(`font-size-${fontSize}`);

    }, [theme, fontSize, animations, dyslexiaFont]);

    const value = { theme, setTheme, fontSize, setFontSize, language, setLanguage, focusMode, setFocusMode, dataSaver, setDataSaver, dyslexiaFont, setDyslexiaFont, notifications, setNotifications, animations, setAnimations };
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

const AppProvider = ({ children }) => {
    const [page, setPage] = useState('dashboard');
    const [screen, setScreen] = useState('levelSelection'); // For learning flow
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    
    // States for learning flow
    const [level, setLevel] = useState('');
    const [track, setTrack] = useState('');
    const [subject, setSubject] = useState(null);

    const value = { page, setPage, screen, setScreen, isLoading, setIsLoading, loadingMessage, setLoadingMessage, level, setLevel, track, setTrack, subject, setSubject };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// --- FUNGSI API & UTILITIES ---
const callGeminiAPI = async (prompt) => { /* ... (fungsi sama seperti sebelumnya) */ 
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json" } };
    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error("Gagal menghubungi AI");
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Respons AI tidak valid.");
    return JSON.parse(text.replace(/^```json\s*|```$/g, '').trim());
};
const getYoutubeVideoId = (url) => {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') return urlObj.pathname.slice(1);
        if (urlObj.hostname.includes('youtube.com')) return urlObj.searchParams.get('v');
        return null;
    } catch (e) { return null; }
};

// --- KOMPONEN UTAMA (Entry Point) ---
export default function App() {
    return (
        <SettingsProvider>
            <AuthProvider>
                <AppProvider>
                    <MainApp />
                </AppProvider>
            </AuthProvider>
        </SettingsProvider>
    );
}

const MainApp = () => {
    const { loading, user, userData } = useContext(AuthContext);
    const { isLoading, loadingMessage } = useContext(AppContext);

    if (loading) {
        return <LoadingScreen message="Mengecek sesi..." isInitial={true} />;
    }
    if (isLoading) {
        return <LoadingScreen message={loadingMessage} />;
    }
    if (!user) {
        return <LandingPage />;
    }
    if (userData?.isNew) {
        return <InfoPage />;
    }
    
    return <AppLayout />;
};

const AppLayout = () => {
    const { page } = useContext(AppContext);
    const { userData } = useContext(AuthContext);

    const pages = {
        'dashboard': <DashboardPage />,
        'belajar': <LearningFlow />,
        'bank-soal': <p>Bank Soal (Segera Hadir)</p>,
        'tanya-ai': <ChatAIPage />,
        'pengaturan': <SettingsPage />,
        'dev-dashboard': userData?.role === 'developer' ? <DeveloperDashboard /> : <p>Akses ditolak.</p>,
    };

    return (
        <div className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 min-h-screen font-sans">
             <div className="md:flex">
                <Sidebar />
                <div className="flex-1 md:ml-64">
                    <main className="p-4 sm:p-6 lg:p-8">
                        {pages[page] || <DashboardPage />}
                    </main>
                </div>
            </div>
        </div>
    );
};

// --- LOGO ---
const AppLogo = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: '#3b82f6'}} />
                <stop offset="100%" style={{stopColor: '#8b5cf6'}} />
            </linearGradient>
        </defs>
        <path fill="url(#logoGradient)" d="M50,0C22.4,0,0,22.4,0,50s22.4,50,50,50s50-22.4,50-50S77.6,0,50,0z M71.7,59.3c-2.8,4.7-7.3,7.9-12.6,9.1 c-5.3,1.2-10.9,0.3-15.8-2.6c-5-2.9-8.7-7.8-10.4-13.4c-1.7-5.6-1.3-11.7,1.1-16.9c2.4-5.2,6.8-9.3,12.2-11.4 c5.4-2.1,11.5-1.9,16.7,0.5l-3.3,7.3c-3.3-1.5-7.1-1.6-10.5-0.3c-3.4,1.3-6.2,4-7.8,7.3c-1.6,3.3-2,7.1-1.2,10.8 c0.8,3.7,3,6.8,6,8.9c3,2.1,6.7,3,10.3,2.4c3.6-0.6,6.8-2.6,9-5.4L71.7,59.3z"/>
    </svg>
);

const LoadingScreen = ({ message, isInitial = false }) => (
    <div className="fixed inset-0 bg-slate-100 dark:bg-slate-900 z-50 flex flex-col items-center justify-center gap-6">
        <AppLogo className="w-24 h-24 animate-bounce" />
        <p className="text-xl font-semibold text-slate-600 dark:text-slate-300">{message || 'Memuat...'}</p>
        {isInitial && <div className="absolute bottom-10 text-xs text-slate-400">Bgune Edukasi by M. Irham Andika Putra</div>}
    </div>
);


// --- HALAMAN-HALAMAN UTAMA (PAGES) ---
const LandingPage = () => {
    const { loginWithGoogle } = useContext(AuthContext);
    const [stats, setStats] = useState({ userCount: 1500, materialCount: 800 }); // Default stats

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "app_stats", "main"), (doc) => {
            if (doc.exists()) setStats(doc.data());
        });
        return () => unsub();
    }, []);

    const testimonials = [
        { name: "Andi, Siswa SMA", text: "Gara-gara Bdukasi, materi Fisika yang tadinya bikin pusing jadi gampang dimengerti. Guru AI-nya sabar banget!" },
        { name: "Citra, Siswi SMP", text: "Fitur Misi Harian bikin aku jadi semangat belajar setiap hari. Nggak kerasa udah ngumpulin banyak poin!" },
        { name: "Budi, Orang Tua", text: "Saya tenang melihat anak saya belajar pakai aplikasi ini. Materinya sesuai kurikulum dan ada mode fokusnya." },
    ];

    return (
        <div className="bg-slate-50 text-slate-800">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-20">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-xl">
                        <AppLogo className="w-8 h-8" />
                        <span>Bdukasi</span>
                    </div>
                    <button onClick={loginWithGoogle} className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-full hover:bg-blue-700 transition-colors">Masuk</button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-16 container mx-auto px-6 text-center relative overflow-hidden">
                <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob"></div>
                <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-2000"></div>
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Belajar Apapun, Kapanpun, <br /><span className="bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">Jadi Jagoan.</span></h1>
                <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">Bdukasi adalah teman belajar AI-mu. Dapatkan materi lengkap, latihan soal tanpa batas, dan bimbingan personal yang dirancang khusus untuk pelajar Indonesia.</p>
                <button onClick={loginWithGoogle} className="mt-8 px-8 py-4 bg-slate-800 text-white font-bold rounded-full text-lg hover:bg-black transform hover:scale-105 transition-all">Mulai Petualangan Belajar (Gratis!)</button>
            </section>
            
            {/* Stats Section */}
            <section className="py-16 bg-slate-100">
                <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div>
                        <p className="text-4xl font-bold text-blue-600">{(stats.userCount)}+</p>
                        <p className="text-slate-500 mt-1">Pelajar Terdaftar</p>
                    </div>
                    <div>
                        <p className="text-4xl font-bold text-blue-600">{(stats.materialCount)}+</p>
                        <p className="text-slate-500 mt-1">Materi Telah Dipelajari</p>
                    </div>
                     <div>
                        <p className="text-4xl font-bold text-blue-600">4.8/5</p>
                        <p className="text-slate-500 mt-1">Rating Kepuasan</p>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-20 container mx-auto px-6">
                <h2 className="text-3xl font-bold text-center mb-12">Kata Mereka Tentang Bdukasi</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((t, i) => (
                        <div key={i} className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                            <p className="text-slate-600 italic">"{t.text}"</p>
                            <p className="mt-4 font-bold text-right">- {t.name}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-800 text-white py-12">
                <div className="container mx-auto px-6 text-center">
                    <AppLogo className="w-12 h-12 mx-auto mb-4"/>
                    <p className="font-bold text-xl">Bdukasi by Bgune Digital</p>
                    <p className="text-slate-400 mt-2">Misi kami adalah membuat pendidikan berkualitas dapat diakses oleh semua pelajar Indonesia.</p>
                    <p className="text-xs text-slate-500 mt-8">&copy; {new Date().getFullYear()} M. Irham Andika Putra & Bgune Digital. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

const InfoPage = () => { /* ... (Sama seperti sebelumnya, dengan styling baru) */
    const { markUserAsOld } = useContext(AuthContext);
    return (
        <div className="bg-slate-100 dark:bg-slate-900 flex items-center justify-center min-h-screen p-4">
            <div className="max-w-3xl mx-auto p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl animate-fadeInUp">
                <h1 className="text-3xl font-bold text-center mb-6 text-blue-500">Selamat Datang di Keluarga Bdukasi!</h1>
                <div className="space-y-4 text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                    <p>Hai Pelajar Hebat! Kami senang sekali kamu bergabung. Bdukasi adalah hasil karya <strong>M. Irham Andika Putra</strong> dan tim <strong>Bgune Digital</strong>, yang didesain untuk jadi teman belajarmu yang paling asyik.</p>
                    <p>🔒 <strong>Datamu Aman Bersama Kami.</strong> Kami pakai sistem keamanan Google. Datamu hanya untuk membuat pengalaman belajarmu makin personal, bukan untuk yang lain.</p>
                    <p>🤖 <strong>Guru AI Siap Membantu.</strong> "Otak" guru virtual kami adalah teknologi AI canggih. Dia siap menjelaskan materi, membuat soal, dan menjawab rasa penasaranmu, sesuai kurikulum Indonesia.</p>
                    <p>Yuk, kita mulai petualangan belajar yang seru dan raih semua impianmu!</p>
                </div>
                <div className="text-center mt-8">
                    <button onClick={markUserAsOld} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-transform hover:scale-105">
                        Ayo Mulai!
                    </button>
                </div>
            </div>
        </div>
    );
};

const DashboardPage = () => {
    const { setPage } = useContext(AppContext);
    const { userData } = useContext(AuthContext);

    return (
        <AnimatedScreen key="dashboard">
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">Selamat datang, {userData?.displayName?.split(' ')[0] || 'Juara'}!</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <DashboardCard icon={<BrainCircuit size={32} />} title="Mulai Belajar" description="Pilih jenjang & mata pelajaran." onClick={() => setPage('belajar')} className="bg-blue-500 text-white hover:bg-blue-600" />
                <DashboardCard icon={<Sparkles size={32} />} title="Tanya AI" description="Ngobrol langsung dengan Guru AI." onClick={() => setPage('tanya-ai')} />
            </div>
            
            <DailyMissionCard />
            <RecommendedVideoSection />
        </AnimatedScreen>
    );
};

const SettingsPage = () => {
    const { userData, logout } = useContext(AuthContext);
    const { theme, setTheme, fontSize, setFontSize, language, setLanguage, focusMode, setFocusMode, dataSaver, setDataSaver, dyslexiaFont, setDyslexiaFont, notifications, setNotifications, animations, setAnimations } = useContext(SettingsContext);
    
    return (
         <AnimatedScreen key="pengaturan">
            <h1 className="text-3xl font-bold mb-8">Pengaturan</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile Card */}
                <InfoCard icon={<User />} title="Profil Pengguna">
                     <div className="flex items-center space-x-4">
                        <img src={userData?.photoURL} alt="Avatar" className="w-20 h-20 rounded-full" />
                        <div>
                            <h3 className="text-xl font-bold">{userData?.displayName}</h3>
                            <p className="text-slate-500 dark:text-slate-400">{userData?.email}</p>
                             {userData?.role === 'developer' && <p className="text-xs font-bold text-purple-500 bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded-full inline-block mt-2">DEVELOPER</p>}
                        </div>
                    </div>
                     <button onClick={logout} className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors">
                        <LogOut size={18} /> Keluar
                    </button>
                </InfoCard>
                
                {/* Settings Card */}
                <InfoCard icon={<Settings />} title="Preferensi Aplikasi">
                    <div className="space-y-4">
                        <SettingToggle label="Mode Gelap" icon={<Palette/>} isEnabled={theme === 'dark'} onToggle={() => setTheme(p => p === 'light' ? 'dark' : 'light')} />
                        <SettingToggle label="Mode Fokus" icon={<EyeOff/>} isEnabled={focusMode} onToggle={() => setFocusMode(p => !p)} />
                        <SettingToggle label="Hemat Kuota" icon={<WifiOff/>} isEnabled={dataSaver} onToggle={() => setDataSaver(p => !p)} />
                        <SettingToggle label="Animasi" icon={<Wind/>} isEnabled={animations} onToggle={() => setAnimations(p => !p)} />
                        <SettingToggle label="Notifikasi" icon={notifications ? <Volume2/> : <VolumeX/>} isEnabled={notifications} onToggle={() => setNotifications(p => !p)} />
                        <SettingToggle label="Font Disleksia" icon={<Text/>} isEnabled={dyslexiaFont} onToggle={() => setDyslexiaFont(p => !p)} />
                        
                        {/* Language & Font Size Selectors */}
                        <div className="flex gap-4">
                            <div className="w-1/2">
                                <label className="font-semibold block mb-2 text-sm">Bahasa</label>
                                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full p-2 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600">
                                    <option value="id">Indonesia</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                            <div className="w-1/2">
                                <label className="font-semibold block mb-2 text-sm">Ukuran Teks</label>
                                 <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="w-full p-2 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600">
                                    <option value="sm">Kecil</option>
                                    <option value="base">Normal</option>
                                    <option value="lg">Besar</option>
                                    <option value="xl">Sangat Besar</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </InfoCard>
            </div>
        </AnimatedScreen>
    );
};

const ChatAIPage = () => {
    const [messages, setMessages] = useState([{ text: "Halo! Aku Kak Spenta AI, teman belajarmu. Ada yang bisa kubantu?", sender: 'ai' }]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = React.useRef(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;
        const newMessages = [...messages, { text: input, sender: 'user' }];
        setMessages(newMessages);
        setInput('');
        setIsTyping(true);

        const prompt = `Sebagai AI tutor bernama "Kak Spenta AI", jawab pertanyaan siswa berikut dengan ramah, jelas, dan mendidik dalam Bahasa Indonesia: "${input}"`;
        try {
            const result = await callGeminiAPI(`Jawab pertanyaan ini. Respons dalam format JSON {"response": "jawabanmu disini"}. Pertanyaan: ${prompt}`);
            setMessages([...newMessages, { text: result.response, sender: 'ai' }]);
        } catch (error) {
            setMessages([...newMessages, { text: "Maaf, terjadi kesalahan. Coba tanyakan lagi nanti ya.", sender: 'ai' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <AnimatedScreen key="tanya-ai">
            <h1 className="text-3xl font-bold mb-4">Tanya Kak Spenta AI</h1>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg h-[70vh] flex flex-col">
                {/* Chat Area */}
                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex items-end gap-3 ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}>
                            {msg.sender === 'ai' && <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0"><Brain size={24}/></div>}
                            <div className={`px-4 py-2 rounded-2xl max-w-lg ${msg.sender === 'ai' ? 'bg-slate-200 dark:bg-slate-700 rounded-bl-none' : 'bg-blue-500 text-white rounded-br-none'}`}>
                                <p>{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isTyping && <div className="flex items-end gap-3 justify-start"><div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0"><Brain size={24}/></div><div className="px-4 py-3 bg-slate-200 dark:bg-slate-700 rounded-2xl rounded-bl-none"><div className="flex gap-1.5 items-center"><div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></div><div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-300"></div></div></div></div>}
                    <div ref={messagesEndRef} />
                </div>
                {/* Input Area */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="Ketik pertanyaanmu di sini..." className="w-full p-3 bg-slate-100 dark:bg-slate-700 rounded-full border-transparent focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                        <button onClick={handleSend} disabled={isTyping} className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-slate-400">
                            <ArrowRight />
                        </button>
                    </div>
                </div>
            </div>
        </AnimatedScreen>
    )
};

const DeveloperDashboard = () => {
    const { userData } = useContext(AuthContext);
    const [videos, setVideos] = useState([]);
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [newVideoTitle, setNewVideoTitle] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'recommended_videos'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, []);

    const handleUploadVideo = async (e) => {
        e.preventDefault();
        const youtubeId = getYoutubeVideoId(newVideoUrl);
        if (!newVideoTitle.trim() || !youtubeId) {
            alert("Judul dan URL YouTube valid diperlukan.");
            return;
        }
        await addDoc(collection(db, 'recommended_videos'), {
            title: newVideoTitle,
            youtubeId: youtubeId,
            uploadedBy: userData.displayName,
            createdAt: serverTimestamp(),
        });
        setNewVideoTitle('');
        setNewVideoUrl('');
    };
    
    const handleDeleteVideo = async (id) => {
        if(window.confirm("Yakin ingin menghapus video ini?")) {
            await deleteDoc(doc(db, "recommended_videos", id));
        }
    }

    return (
        <AnimatedScreen key="dev-dashboard">
            <h1 className="text-3xl font-bold mb-4">Developer Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Video Management */}
                <InfoCard icon={<UploadCloud />} title="Kelola Video Rekomendasi">
                    <form onSubmit={handleUploadVideo} className="space-y-4">
                        <input type="text" value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} placeholder="Judul Video" className="w-full p-2 bg-slate-100 dark:bg-slate-700 rounded-lg" />
                        <input type="url" value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} placeholder="Link YouTube (youtube.com/watch?v=...)" className="w-full p-2 bg-slate-100 dark:bg-slate-700 rounded-lg" />
                        <button type="submit" className="w-full p-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600">Upload</button>
                    </form>
                    <div className="mt-6 space-y-2 max-h-60 overflow-y-auto">
                        {videos.map(video => (
                            <div key={video.id} className="flex justify-between items-center p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                <p className="truncate text-sm">{video.title}</p>
                                <button onClick={() => handleDeleteVideo(video.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </InfoCard>
                {/* Stats Card */}
                <InfoCard icon={<Users />} title="Statistik Aplikasi">
                    <p>Coming Soon...</p>
                </InfoCard>
            </div>
        </AnimatedScreen>
    );
};

// --- KOMPONEN UI PENDUKUNG ---
const DailyMissionCard = () => {
    const { user } = useContext(AuthContext);
    const today = new Date().toISOString().split('T')[0];
    const [missions, setMissions] = useState({ learn: false, quiz: false, chat: false });

    useEffect(() => {
        if (!user) return;
        const missionRef = doc(db, 'daily_missions', `${user.uid}_${today}`);
        const unsub = onSnapshot(missionRef, (doc) => {
            if (doc.exists()) {
                setMissions(doc.data());
            } else {
                setDoc(missionRef, missions);
            }
        });
        return unsub;
    }, [user, today]);

    const missionList = [
        { id: 'learn', text: 'Pelajari 1 materi baru', isDone: missions.learn, icon: <BookOpen /> },
        { id: 'quiz', text: 'Selesaikan 1 kuis', isDone: missions.quiz, icon: <Target /> },
        { id: 'chat', text: 'Tanya 1 kali ke AI', isDone: missions.chat, icon: <MessageSquare /> },
    ];
    
    const completedCount = Object.values(missions).filter(Boolean).length;

    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md mb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Misi Harian</h2>
                <div className="flex items-center gap-2 font-semibold text-amber-500">
                    <Award />
                    <span>{completedCount}/{missionList.length} Selesai</span>
                </div>
            </div>
            <div className="space-y-3">
                {missionList.map(mission => (
                     <div key={mission.id} className={`flex items-center gap-4 p-3 rounded-lg ${mission.isDone ? 'bg-green-100 dark:bg-green-900/50 text-slate-400 line-through' : 'bg-slate-100 dark:bg-slate-700'}`}>
                        <div className={`p-2 rounded-full ${mission.isDone ? 'bg-green-200 dark:bg-green-800 text-green-600' : 'bg-blue-100 dark:bg-blue-900 text-blue-500'}`}>
                            {mission.isDone ? <Check /> : mission.icon}
                        </div>
                        <p>{mission.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const RecommendedVideoSection = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'recommended_videos'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    if (loading) return <p>Memuat video rekomendasi...</p>;
    if (videos.length === 0) return null;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Rekomendasi Pilihan</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map(video => (
                    <a key={video.id} href={`https://www.youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="block bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 group">
                        <img src={`https://i3.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`} alt={video.title} className="w-full h-32 object-cover" />
                        <div className="p-4">
                            <h3 className="font-bold text-sm line-clamp-2 group-hover:text-blue-500 transition-colors">{video.title}</h3>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

const AnimatedScreen = ({ children, customKey }) => <div key={customKey} className="animate-fadeIn">{children}</div>;
const DashboardCard = ({ icon, title, description, onClick, disabled, className="" }) => (
    <button onClick={onClick} disabled={disabled} className={`p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md text-left transform hover:-translate-y-1 transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'} ${className}`}>
        <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${!className.includes('bg-blue') ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-500' : ''}`}>{icon}</div>
            <div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className={`${className.includes('bg-blue') ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>{description}</p>
            </div>
        </div>
    </button>
);
const InfoCard = ({ icon, title, children, className = '' }) => <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md overflow-hidden ${className}`}><div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">{icon && <div className="text-blue-500">{React.cloneElement(icon, { size: 20 })}</div>}<h2 className="text-lg font-bold">{title}</h2></div><div className="p-4 sm:p-6">{children}</div></div>;
const SettingToggle = ({ label, icon, isEnabled, onToggle }) => (
    <div className="flex items-center justify-between">
        <label className="font-semibold flex items-center gap-3 text-sm">
            {icon} {label}
        </label>
        <button onClick={onToggle} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} /></button>
    </div>
);
const Sidebar = () => { /* ... (Sama seperti sebelumnya) */
    const { page, setPage } = useContext(AppContext);
    const { userData } = useContext(AuthContext);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
        { id: 'belajar', label: 'Mulai Belajar', icon: <BrainCircuit /> },
        { id: 'tanya-ai', label: 'Tanya AI', icon: <Sparkles /> },
        { id: 'pengaturan', label: 'Pengaturan', icon: <Settings /> },
    ];
    
    if (userData?.role === 'developer') {
        navItems.push({ id: 'dev-dashboard', label: 'Dev Dashboard', icon: <Shield /> });
    }

    return (
        <aside className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 flex-col z-30 hidden md:flex`}>
            <div className="flex items-center gap-3 text-2xl font-bold mb-10 px-2">
                <AppLogo className="w-9 h-9" />
                <span>Bdukasi</span>
            </div>
            <nav className="flex-grow space-y-2">
                {navItems.map(item => (
                     <button key={item.id} onClick={() => setPage(item.id)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors text-base ${page === item.id ? 'bg-blue-500 text-white font-semibold' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );
};

const LearningFlow = () => { /* ... (Sama seperti sebelumnya) */
    return <p>Alur Belajar disini</p>
};

// --- CSS & STYLING INJECTOR ---
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
    /* ... (CSS sama seperti sebelumnya) */
`;
document.head.appendChild(styleSheet);

