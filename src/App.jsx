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
    Award, Users, Target, VideoIcon, XCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- KONFIGURASI PENTING & API KEYS ---
const GEMINI_API_KEY = "AIzaSyArJ1P8HanSQ_XVWX9m4kUlsIVXrBRInik"; 
const YOUTUBE_API_KEY = "AIzaSyD9Rp-oSegoIDr8q9XlKkqpEL64lB2bQVE";
const DEV_EMAIL = "irhamdika00@gmail.com";

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

// --- KONTEKS APLIKASI ---
const AuthContext = createContext(null);
const SettingsContext = createContext(null);
const AppContext = createContext(null);
const DevContext = createContext(null);

// --- CUSTOM HOOKS ---
function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try { const item = window.localStorage.getItem(key); return item ? JSON.parse(item) : initialValue; } 
        catch (error) { console.error(error); return initialValue; }
    });
    const setValue = useCallback((value) => {
        try { const valueToStore = value instanceof Function ? value(storedValue) : value; setStoredValue(valueToStore); window.localStorage.setItem(key, JSON.stringify(valueToStore));} 
        catch (error) { console.error(error); }
    }, [key, storedValue]);
    return [storedValue, setValue];
}

// --- PENYEDIA KONTEKS (PROVIDERS) ---
const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const isDeveloper = useMemo(() => user?.email === DEV_EMAIL, [user]);
    useEffect(() => { const unsubscribe = onAuthStateChanged(auth, (user) => { setUser(user); setLoading(false); }); return () => unsubscribe(); }, []);
    const loginWithGoogle = async () => { setLoading(true); try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { console.error("Error login:", error); } finally { setLoading(false); } };
    const logout = async () => { try { await signOut(auth); setUser(null); } catch (error) { console.error("Error logout:", error); }};
    const value = { user, loading, isDeveloper, loginWithGoogle, logout };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
const SettingsProvider = ({ children }) => {
    const [theme, setTheme] = useLocalStorage('bdukasi-theme-v3', 'light');
    const [fontSize, setFontSize] = useLocalStorage('bdukasi-font-size-v3', 'base');
    const [dyslexiaFont, setDyslexiaFont] = useLocalStorage('bdukasi-dyslexia-v3', false);
    const [focusMode, setFocusMode] = useLocalStorage('bdukasi-focus-v3', false);
    const [dataSaver, setDataSaver] = useLocalStorage('bdukasi-datasaver-v3', false);
    const [animations, setAnimations] = useLocalStorage('bdukasi-animations-v3', true);
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.toggle('dark', theme === 'dark'); root.classList.toggle('light', theme !== 'dark');
        root.style.setProperty('--font-family', dyslexiaFont ? "'Open Sans', sans-serif" : "'Poppins', sans-serif");
        root.classList.toggle('no-animations', !animations); document.body.className = `font-size-${fontSize}`;
    }, [theme, dyslexiaFont, animations, fontSize]);
    const value = { theme, setTheme, fontSize, setFontSize, dyslexiaFont, setDyslexiaFont, focusMode, setFocusMode, dataSaver, setDataSaver, animations, setAnimations };
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
const DevProvider = ({ children }) => {
    const [managedVideos, setManagedVideos] = useLocalStorage('bdukasi-dev-videos-v3', [{id: "Ld2M9q9sC-s", title: "Apa itu Paradoks? | Pembahasan Filsafat", embedUrl: "https://www.youtube.com/embed/Ld2M9q9sC-s"}]);
    const [devLogs, setDevLogs] = useLocalStorage('bdukasi-dev-logs-v3', [{ type: 'info', msg: 'Developer console initialized.', time: new Date().toLocaleTimeString()}]);
    const addLog = (type, msg) => { setDevLogs(prev => [{ type, msg, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 100)); };
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
    const [userStats, setUserStats] = useLocalStorage('bdukasi-user-stats-v1', { videosWatched: 0, questionsAnswered: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [pwaInstallPrompt, setPwaInstallPrompt] = useState(null);
    const { managedVideos } = useContext(DevContext);
    const { dataSaver } = useContext(SettingsContext);

    const fetchLearningMaterial = useCallback(async (searchTopic) => {
        if (!searchTopic || !level || !subject) return;
        setIsLoading(true); setLoadingMessage('Kak Spenta AI sedang menyiapkan materimu...'); setError(null); setLearningData(null);
        setPage('belajar'); setScreen('lesson');
        const geminiPrompt = `Sebagai ahli materi pelajaran, buatkan ringkasan dan materi lengkap untuk topik '${searchTopic}' pelajaran '${subject.name}' tingkat ${level} ${track ? `jurusan ${track}`: ''}. Format materi dalam Markdown yang rapi: gunakan heading (#, ##), sub-heading, list (bullet/number), dan bold. Beri jarak antar paragraf. Lalu, buatkan 5 soal pilihan ganda (A-E) dengan jawaban & penjelasan. Respons HANYA dalam format JSON: {"ringkasan": "...", "materi_lengkap": "...", "latihan_soal": [{"question": "...", "options": [...], "correctAnswer": "A", "explanation": "..."}]}`;
        
        const youtubeSearchQuery = `materi ${subject.name} ${searchTopic} pembahasan lengkap ${level}`;
        
        try {
            const [geminiData, videoData] = await Promise.all([
                callGeminiAPI(geminiPrompt),
                !dataSaver ? fetchRelevantLearningVideo(youtubeSearchQuery) : Promise.resolve(null)
            ]);
            setLearningData({ topic: searchTopic, ...geminiData, video: videoData });
            setUserStats(prev => ({...prev, videosWatched: prev.videosWatched + 1}));
        } catch (err) {
            setError(`Gagal memuat materi: ${err.message}.`); setPage('dashboard');
        } finally { setIsLoading(false); }
    }, [level, subject, track, dataSaver]);
    
    const fetchBankSoal = useCallback(async (topic, count) => {
        if (!topic || !level || !subject || !count) return;
        setIsLoading(true); setLoadingMessage(`Kak Spenta AI sedang membuat ${count} soal...`); setError(null);
        const prompt = `Buatkan ${count} soal pilihan ganda (A-E) tentang '${topic}' untuk pelajaran '${subject.name}' level ${level} ${track ? `jurusan ${track}` : ''}. Sertakan jawaban & penjelasan. Respons HANYA dalam format JSON array objek: [{"question": "...", "options": [...], "correctAnswer": "A", "explanation": "..."}]`;
        try {
            const soal = await callGeminiAPI(prompt);
            setBankSoal(Array.isArray(soal) ? soal : []);
            setPage('bank-soal-view'); 
        } catch(err) { setError(`Gagal membuat bank soal: ${err.message}`); setPage('dashboard'); } finally { setIsLoading(false); }
    }, [level, track, subject]);
    
    const value = { page, setPage, screen, setScreen, level, setLevel, track, setTrack, subject, setSubject, learningData, isLoading, loadingMessage, error, setError, isSidebarOpen, setSidebarOpen, pwaInstallPrompt, setPwaInstallPrompt, fetchLearningMaterial, fetchBankSoal, bankSoal, recommendations, setRecommendations, userStats, setUserStats };
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// --- FUNGSI API HELPER ---
const callGeminiAPI = async (prompt) => { /* ... (Tidak berubah) ... */ if (!GEMINI_API_KEY) throw new Error("Kunci API Gemini belum diatur."); const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`; const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json" } }; const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error("Permintaan API Gagal"); const result = await response.json(); const text = result.candidates?.[0]?.content?.parts?.[0]?.text; if (!text) throw new Error("Respons API tidak valid."); return JSON.parse(text.replace(/```json|```/g, '').trim()); };
const fetchRelevantLearningVideo = async (searchQuery) => {
    if (!YOUTUBE_API_KEY) return null;
    const API_URL = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&maxResults=1&type=video&videoDuration=long&videoCategoryId=27&relevanceLanguage=id&key=${YOUTUBE_API_KEY}`;
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Gagal mencari video.');
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const video = data.items[0];
            return { id: video.id.videoId, title: video.snippet.title, embedUrl: `https://www.youtube.com/embed/${video.id.videoId}` };
        }
        return null;
    } catch (error) { console.error("YouTube API Error:", error); return null; }
};

// --- KOMPONEN UTAMA ---
export default function App() { /* ... (Tidak berubah) ... */ return (<SettingsProvider><AuthProvider><DevProvider><AppProvider><MainApp /></AppProvider></DevProvider></AuthProvider></SettingsProvider>); }
const MainApp = () => { /* ... (Tidak berubah) ... */ const { loading } = useContext(AuthContext); const { isLoading, loadingMessage, setPwaInstallPrompt } = useContext(AppContext); useEffect(() => { const handler = (e) => { e.preventDefault(); setPwaInstallPrompt(e); }; window.addEventListener('beforeinstallprompt', handler); return () => window.removeEventListener('beforeinstallprompt', handler); }, [setPwaInstallPrompt]); if (loading || isLoading) return <LoadingScreen message={loadingMessage || 'Autentikasi...'} />; return <Content />; }
const Content = () => { /* ... (Tidak berubah) ... */ const { user } = useContext(AuthContext); if (!user) return <LandingPage />; return <AppLayout />; }

// --- STRUKTUR & HALAMAN ---
const AppLayout = () => {
    const { page } = useContext(AppContext);
    const { focusMode } = useContext(SettingsContext);
    const { isDeveloper } = useContext(AuthContext);
    const pages = {
        'dashboard': <DashboardPage />, 'belajar': <LearningFlow />, 'bank-soal': <BankSoalPage />,
        'bank-soal-view': <BankSoalView />, 'tanya-ai': <ChatAiPage />, 'akun': <SettingsPage />,
        'pembaruan': <UpdateLogPage />, 'developer': isDeveloper ? <DeveloperDashboard /> : <DashboardPage />,
    };
    return (<div className="bg-sky-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 min-h-screen font-sans">
        <div className="md:flex"> {!focusMode && <Sidebar />}
            <div className={`flex-1 transition-all duration-300 ${!focusMode ? 'md:ml-64' : 'md:ml-0'}`}>
                {!focusMode && <Navbar />} <main className="p-4 sm:p-6 lg:p-8">{pages[page] || <DashboardPage />}</main>
            </div>
        </div>
    </div>);
};
const LandingPage = () => { /* ... (Tidak berubah) ... */ const { loginWithGoogle, loading } = useContext(AuthContext); const features = [{ icon: BrainCircuit, title: "Guru AI Pribadi", description: "Dapatkan penjelasan materi dan jawaban dari AI canggih kapan saja." }, { icon: VideoIcon, title: "Video Terkurasi", description: "Belajar dari video pilihan yang relevan dengan kurikulum." }, { icon: BookMarked, title: "Bank Soal Adaptif", description: "Latih pemahamanmu dengan ribuan soal yang menyesuaikan." }]; return (<div className="bg-sky-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 min-h-screen"><header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10"><div className="flex items-center gap-2"><Logo className="w-10 h-10"/><span className="text-2xl font-bold text-slate-800 dark:text-white">Bdukasi</span></div><button onClick={loginWithGoogle} disabled={loading} className="px-5 py-2 bg-blue-500 text-white font-semibold text-sm rounded-full shadow-sm hover:bg-blue-600 transition-colors">Masuk</button></header><section className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative text-center"><div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-200/50 rounded-full mix-blend-multiply filter blur-xl animate-blob dark:opacity-30"></div><div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-200/50 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000 dark:opacity-30"></div><div className="z-10 bg-white/30 dark:bg-slate-800/30 backdrop-blur-lg p-8 rounded-3xl shadow-2xl shadow-blue-500/10 max-w-3xl"><h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight">Teman Belajar <span className="text-blue-500">Terbaikmu</span>.</h1><p className="mt-6 text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto">Ubah cara belajarmu jadi lebih seru dan personal dengan AI, dirancang khusus untuk pelajar Indonesia.</p><button onClick={loginWithGoogle} disabled={loading} className="mt-8 px-8 py-4 bg-blue-500 text-white font-bold text-lg rounded-full shadow-lg hover:bg-blue-600 transform hover:scale-105 transition-all flex items-center gap-3 disabled:bg-slate-400">{loading ? <Loader className="animate-spin" /> : "Mulai Belajar Sekarang"}</button></div></section><section className="py-20 px-4 bg-white dark:bg-slate-800"><div className="max-w-5xl mx-auto text-center"><h2 className="text-3xl font-bold mb-4">Kenapa Memilih Bdukasi?</h2><p className="text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto">Kami menyediakan alat belajar modern yang membuat setiap materi menjadi lebih mudah dan menyenangkan.</p><div className="grid grid-cols-1 md:grid-cols-3 gap-8">{features.map((feature, i) => (<div key={i} className="p-8 bg-sky-50 dark:bg-slate-700/50 rounded-2xl"><div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full inline-block mb-4"><feature.icon className="w-8 h-8 text-blue-500"/></div><h3 className="text-xl font-bold mb-2">{feature.title}</h3><p className="text-slate-600 dark:text-slate-400">{feature.description}</p></div>))}</div></div></section><section className="py-20 px-4"><div className="max-w-3xl mx-auto text-center"><div className="p-4 inline-block bg-teal-100/80 dark:bg-teal-900/50 rounded-full mb-4"><Target className="w-10 h-10 text-teal-500" /></div><h2 className="text-3xl font-bold mb-4">Misi Kami</h2><p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">Misi kami adalah untuk membuat pendidikan berkualitas tinggi dapat diakses oleh semua pelajar di Indonesia. Kami percaya bahwa dengan teknologi yang tepat, belajar bisa menjadi sebuah petualangan yang menyenangkan dan memberdayakan setiap individu untuk meraih potensi terbaiknya.</p></div></section><footer className="w-full text-center p-8 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm"><p className="font-semibold text-slate-700 dark:text-slate-300">Sebuah Karya dari</p><p className="text-lg font-bold text-slate-900 dark:text-white mt-1">M. Irham Andika Putra & Tim Bgune Digital</p><div className="flex justify-center gap-4 mt-4"><a href="https://www.youtube.com/@PernahMikir" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500"><Youtube/></a><a href="https://github.com/irhamp" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500"><Github/></a><a href="https://www.instagram.com/irham_putra07" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500"><Instagram/></a></div><p className="mt-6 text-xs">© {new Date().getFullYear()} Bgune Digital. Dibuat dengan <Sparkles className="inline h-4 w-4 text-amber-400"/> untuk Pelajar Indonesia.</p></footer></div>);};
const DashboardPage = () => {
    const { user } = useContext(AuthContext);
    const { setPage, userStats } = useContext(AppContext);
    const { managedVideos } = useContext(DevContext);
    const leaderboard = [{name: 'Budi Setiawan', score: 1250}, {name: 'Putri Lestari', score: 1100}, {name: user.displayName, score: (userStats.questionsAnswered * 10) + (userStats.videosWatched * 50)}, {name: 'Ahmad Yani', score: 800}].sort((a,b) => b.score - a.score);
    return (
        <AnimatedScreen customKey="dashboard">
            <h1 className="text-3xl font-bold">Halo, {user?.displayName?.split(' ')[0]}!</h1><p className="text-lg text-slate-500 mb-8">Siap taklukkan hari ini?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DashboardCard icon={<BrainCircuit size={32} className="text-white"/>} title="Mulai Belajar" description="Pilih jenjang & mapel." onClick={() => setPage('belajar')} className="bg-gradient-to-br from-blue-500 to-blue-600 text-white col-span-1 lg:col-span-1"/>
                <DashboardCard icon={<MessageSquare size={32} className="text-white"/>} title="Tanya AI" description="Tanya apa saja pada Kak Spenta." onClick={() => setPage('tanya-ai')} className="bg-gradient-to-br from-teal-400 to-teal-500 text-white"/>
                <DashboardCard icon={<BookMarked size={32} className="text-blue-500"/>} title="Bank Soal" description="Latihan soal tak terbatas." onClick={() => setPage('bank-soal')} />
                <div className="lg:col-span-2"><DailyMissionCard /></div>
                <LeaderboardCard leaderboard={leaderboard} currentUser={user.displayName}/>
            </div>
            {managedVideos.length > 0 && <DeveloperVideoSection videos={managedVideos}/>}
            <Footer />
        </AnimatedScreen>
    );
};
const DeveloperDashboard = () => { /* ... (Tidak berubah) ... */ return (<AnimatedScreen key="developer"><div className="flex justify-between items-start mb-6"><div><h1 className="text-3xl font-bold">Developer Dashboard</h1><p className="text-slate-500">Alat dan statistik khusus untuk tim Bgune.</p></div><div className="flex items-center gap-2 text-xs font-mono p-2 bg-slate-200 dark:bg-slate-700 rounded"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>ADMIN_MODE</div></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="lg:col-span-2 space-y-8"><VideoManagement /></div><div className="lg:col-span-1 space-y-8"><DevStats /><DevConsole /></div></div></AnimatedScreen>); };
const SettingsPage = () => { const { user, logout } = useContext(AuthContext); const { theme, setTheme, fontSize, setFontSize, dyslexiaFont, setDyslexiaFont, focusMode, setFocusMode, dataSaver, setDataSaver, animations, setAnimations } = useContext(SettingsContext); return (<AnimatedScreen key="settings"><h1 className="text-3xl font-bold mb-8">Profil & Pengaturan</h1><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><InfoCard icon={<User size={24} />} title="Profil Pengguna"><div className="flex items-center space-x-4"><img src={user?.photoURL} alt={user?.displayName} className="w-20 h-20 rounded-full" /><div><h3 className="text-xl font-bold">{user?.displayName}</h3><p className="text-slate-500 dark:text-slate-400">{user?.email}</p></div></div><button onClick={logout} className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"><LogOut size={18} /> Keluar</button></InfoCard><InfoCard icon={<Palette size={24} />} title="Tampilan & Aksesibilitas"><SettingToggle label="Mode Gelap" isEnabled={theme === 'dark'} onToggle={() => setTheme(p => p === 'dark' ? 'light' : 'dark')} /><SettingToggle label="Animasi UI" isEnabled={animations} onToggle={() => setAnimations(p => !p)} /><SettingToggle label="Font Disleksia" isEnabled={dyslexiaFont} onToggle={() => setDyslexiaFont(p => !p)} /><SettingToggle label="Mode Fokus" isEnabled={focusMode} onToggle={() => setFocusMode(p => !p)} /><SettingToggle label="Hemat Kuota" isEnabled={dataSaver} onToggle={() => setDataSaver(p => !p)} /><div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700"><label className="font-semibold block mb-2">Ukuran Font</label><div className="flex flex-wrap gap-2">{['sm', 'base', 'lg'].map(size => <button key={size} onClick={() => setFontSize(size)} className={`px-4 py-2 rounded-lg font-semibold text-sm ${fontSize === size ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>{size.charAt(0).toUpperCase() + size.slice(1)}</button>)}</div></div></InfoCard></div></AnimatedScreen>)};
const ChatAiPage = () => { /* ... (Tidak berubah) ... */ const [messages, setMessages] = useLocalStorage('bdukasi-chat-ai-v3', [{ text: 'Halo! Aku Kak Spenta, asisten AI-mu. Ada yang bisa kubantu?', sender: 'ai' }]); const [input, setInput] = useState(''); const [isTyping, setIsTyping] = useState(false); const messagesEndRef = useRef(null); useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]); const handleSend = async (e) => { e.preventDefault(); if (!input.trim() || isTyping) return; const userMessage = { text: input, sender: 'user' }; setMessages(prev => [...prev, userMessage]); const currentInput = input; setInput(''); setIsTyping(true); try { const prompt = `Kamu adalah "Kak Spenta", asisten belajar AI yang ramah dan positif untuk pelajar Indonesia. Jawab pertanyaan berikut dengan gaya mendidik dan mudah dipahami dalam format JSON {"answer": "jawabanmu di sini"}: ${currentInput}`; const response = await callGeminiAPI(prompt); setMessages(prev => [...prev, { text: response.answer, sender: 'ai' }]); } catch (error) { setMessages(prev => [...prev, { text: "Aduh, maaf! Ada gangguan di sirkuitku. Coba lagi ya.", sender: 'ai' }]); } finally { setIsTyping(false); } }; return (<AnimatedScreen customKey="tanya-ai"><h1 className="text-3xl font-bold mb-1">Tanya AI</h1><p className="text-lg text-slate-500 mb-6">Ditenagai oleh AI Canggih</p><div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg h-[65vh] flex flex-col"><div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3"><div className="relative"><Logo className="w-10 h-10"/><span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span></div><div><h2 className="font-bold text-lg">Kak Spenta AI</h2><p className="text-sm text-green-500">Online</p></div></div><div className="flex-1 p-6 space-y-6 overflow-y-auto">{messages.map((msg, index) => (<div key={index} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>{msg.sender === 'ai' && <Logo className="w-8 h-8 flex-shrink-0"/>}<div className={`max-w-md lg:max-w-xl p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-lg' : 'bg-slate-100 dark:bg-slate-700 rounded-bl-lg'}`}><ReactMarkdown>{msg.text}</ReactMarkdown></div></div>))}{isTyping && (<div className="flex items-end gap-3 justify-start"><Logo className="w-8 h-8 flex-shrink-0"/><div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-700"><div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span></div></div></div>)}<div ref={messagesEndRef} /></div><form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-slate-700"><div className="relative"><input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ketik pertanyaanmu di sini..." className="w-full pl-4 pr-14 py-3 bg-slate-100 dark:bg-slate-700 rounded-full border border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"/><button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:bg-slate-400" disabled={isTyping || !input.trim()}><SendHorizontal className="w-5 h-5" /></button></div></form></div></AnimatedScreen>); };
const UpdateLogPage = () => { const updates = [ { version: "3.0.0", date: "25 Juni 2025", changes: ["Penambahan kurikulum lengkap untuk SD, SMP, dan SMA.", "Sistem Misi Harian & Papan Peringkat fungsional.", "Halaman Bank Soal terpisah.", "Video dari Developer kini tampil di Dashboard."] }, { version: "2.5.0", date: "24 Juni 2025", changes: ["Implementasi Developer Dashboard fungsional.", "Integrasi video dari Developer ke halaman belajar."] } ]; return (<AnimatedScreen key="pembaruan"><h1 className="text-3xl font-bold mb-8">Log Pembaruan</h1><div className="space-y-8">{updates.map(update => (<InfoCard key={update.version} icon={<Newspaper size={24} />} title={`Versi ${update.version} - ${update.date}`}><ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300">{update.changes.map((change, index) => <li key={index}>{change}</li>)}</ul></InfoCard>))}</div></AnimatedScreen>);};

// --- ALUR BELAJAR & BANK SOAL ---
const curriculum = { 'SD': { subjects: [{ name: 'Matematika', icon: Calculator }, { name: 'IPAS', icon: Globe }, { name: 'Pendidikan Pancasila', icon: Landmark}, { name: 'Bahasa Indonesia', icon: BookHeart }, { name: 'Bahasa Inggris', icon: Languages }] }, 'SMP': { subjects: [{ name: 'Matematika', icon: Calculator }, { name: 'IPA', icon: FlaskConical }, { name: 'IPS', icon: Landmark }, { name: 'Bahasa Indonesia', icon: BookHeart }, { name: 'Bahasa Inggris', icon: Languages }, {name: 'Informatika', icon: Computer}, {name: 'Pendidikan Pancasila', icon: Landmark}]}, 'SMA': { tracks: { 'IPA': [{ name: 'Matematika', icon: Calculator }, { name: 'Fisika', icon: Atom }, { name: 'Kimia', icon: FlaskConical }, { name: 'Biologi', icon: Dna }], 'IPS': [{ name: 'Ekonomi', icon: BarChart2 }, { name: 'Geografi', icon: Globe }, { name: 'Sosiologi', icon: Users }], 'Bahasa': [{ name: 'Sastra Indonesia', icon: BookHeart}, {name: 'Sastra Inggris', icon: Drama}, {name: 'Antropologi', icon: Globe}, {name: 'Bahasa Asing Lain', icon: Languages}] } } };
const LearningFlow = () => { const { screen } = useContext(AppContext); const screens = { levelSelection: <LevelSelectionScreen />, trackSelection: <TrackSelectionScreen />, subjectSelection: <SubjectSelectionScreen />, subjectDashboard: <SubjectDashboardScreen />, lesson: <LearningMaterialScreen /> }; return <div className="relative">{screens[screen]}</div>;};
const LevelSelectionScreen = () => { const { setScreen, setLevel, setPage } = useContext(AppContext); return (<AnimatedScreen customKey="level"><BackButton onClick={() => setPage('dashboard')} /><div className="text-center"><School className="w-24 h-24 mx-auto text-blue-500" /><h1 className="text-4xl font-bold mt-4">Pilih Jenjang Pendidikan</h1><p className="text-xl text-slate-500 mt-2 mb-12">Mulai petualangan belajarmu dari sini.</p><div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">{Object.keys(curriculum).map((lvl) => <button key={lvl} onClick={() => { setLevel(lvl); setScreen(lvl === 'SMA' ? 'trackSelection' : 'subjectSelection'); }} className="p-8 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-2xl shadow-sm hover:shadow-blue-500/20 hover:border-blue-500 hover:-translate-y-2 transition-all text-2xl font-bold">{lvl}</button>)}</div></div></AnimatedScreen>);};
const TrackSelectionScreen = () => { const { setScreen, setTrack } = useContext(AppContext); return (<AnimatedScreen customKey="track"><BackButton onClick={() => setScreen('levelSelection')} /><div className="text-center"><h1 className="text-4xl font-bold mb-12">Pilih Jurusan</h1><div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">{Object.keys(curriculum.SMA.tracks).map((trackName) => <button key={trackName} onClick={() => { setTrack(trackName); setScreen('subjectSelection'); }} className="p-8 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-2xl shadow-sm hover:shadow-blue-500/20 hover:border-blue-500 hover:-translate-y-2 transition-all text-2xl font-bold">{trackName}</button>)}</div></div></AnimatedScreen>);};
const SubjectSelectionScreen = () => { const { level, track, setScreen, setSubject } = useContext(AppContext); const subjects = level === 'SMA' ? curriculum.SMA.tracks[track] : curriculum[level]?.subjects; const backScreen = level === 'SMA' ? 'trackSelection' : 'levelSelection'; return (<AnimatedScreen customKey="subject"><BackButton onClick={() => setScreen(backScreen)} /><h1 className="text-4xl font-bold mb-12 text-center">Pilih Mata Pelajaran</h1><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-5xl mx-auto">{subjects.map((s) => <button key={s.name} onClick={() => { setSubject(s); setScreen('subjectDashboard'); }} className="p-4 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl flex flex-col items-center justify-center text-center hover:border-blue-500 hover:-translate-y-1 transition-all aspect-square shadow-sm"><s.icon size={48} className="text-blue-500" /><span className="font-semibold text-sm text-center mt-3">{s.name}</span></button>)}</div></AnimatedScreen>);};
const SubjectDashboardScreen = () => { /* ... Komponen tidak berubah ... */ const { subject, error, setError, setScreen, fetchLearningMaterial } = useContext(AppContext); const [inputValue, setInputValue] = useState(''); const handleSearchSubmit = (e) => { e.preventDefault(); if (inputValue.trim()) { setError(null); fetchLearningMaterial(inputValue); } else { setError("Topik pencarian tidak boleh kosong."); } }; if (!subject) return null; return ( <AnimatedScreen customKey="subject-dashboard"> <BackButton onClick={() => setScreen('subjectSelection')} /> <div className="text-center"><subject.icon size={80} className="text-blue-500 mx-auto mb-4" /><h1 className="text-4xl font-bold">Mata Pelajaran: {subject.name}</h1></div> <div className="w-full max-w-2xl mx-auto my-12"><form onSubmit={handleSearchSubmit} className="relative"><input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ketik topik untuk dipelajari..." className="w-full pl-6 pr-16 py-4 text-lg bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-full focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"/><button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-transform active:scale-95"><Search className="w-6 h-6" /></button></form>{error && <ErrorMessage message={error} />}</div> </AnimatedScreen> ); };
const LearningMaterialScreen = () => { const { learningData, setScreen, setUserStats } = useContext(AppContext); if (!learningData) return <div className="text-center p-8">Materi tidak ditemukan. <button onClick={() => setScreen('levelSelection')} className="text-blue-500 underline">Kembali</button></div>; const { topic, ringkasan, materi_lengkap, latihan_soal, video } = learningData; return ( <AnimatedScreen customKey="lesson"> <BackButton onClick={() => setScreen('subjectDashboard')} /> <div className="space-y-8"> <h1 className="text-3xl sm:text-5xl font-bold text-center">{topic}</h1> {video && <InfoCard title={video.title} icon={<Youtube />}><div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg"><iframe src={video.embedUrl} title={video.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="w-full h-full"></iframe></div></InfoCard>} {ringkasan && <InfoCard title="Ringkasan" icon={<Lightbulb />}><p className="leading-relaxed whitespace-pre-wrap">{ringkasan}</p></InfoCard>} {materi_lengkap && <InfoCard title="Materi Lengkap" icon={<BookOpen />}><div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-p:my-4 prose-ul:my-4 prose-ol:my-4"><ReactMarkdown>{materi_lengkap}</ReactMarkdown></div></InfoCard>} {latihan_soal?.length > 0 && <InfoCard title="Latihan Soal" icon={<BookMarked />}><QuizPlayer questions={latihan_soal} onCompleteQuiz={(correctAnswers) => setUserStats(prev => ({...prev, questionsAnswered: prev.questionsAnswered + correctAnswers}))} /></InfoCard>} </div> </AnimatedScreen> );};
const BankSoalPage = () => {
    const { setLevel, setTrack, setSubject, setScreen, setPage } = useContext(AppContext);
    const selectAndGo = (level, track, subject) => { setLevel(level); setTrack(track); setSubject(subject); setPage('bank-soal-view'); setScreen('generator'); };
    return (<AnimatedScreen key="bank-soal-page">
        <h1 className="text-3xl font-bold mb-8">Pilih Mapel untuk Bank Soal</h1>
        <div className="space-y-6">
            {Object.entries(curriculum).map(([level, data]) => (
                <div key={level}>
                    <h2 className="text-2xl font-bold mb-3">{level}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {data.subjects ? data.subjects.map(subject => (
                            <button key={subject.name} onClick={() => selectAndGo(level, '', subject)} className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-center font-semibold hover:bg-sky-100 dark:hover:bg-sky-900 transition-colors">{subject.name}</button>
                        )) : Object.entries(data.tracks).map(([track, subjects]) => (
                            subjects.map(subject => (
                                 <button key={`${track}-${subject.name}`} onClick={() => selectAndGo(level, track, subject)} className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-center font-semibold hover:bg-sky-100 dark:hover:bg-sky-900 transition-colors">{subject.name} ({track})</button>
                            ))
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </AnimatedScreen>);
};
const BankSoalView = () => { const { screen, bankSoal } = useContext(AppContext); return <div className="relative">{screen === 'generator' ? <BankSoalGenerator /> : <QuizPlayer questions={bankSoal}/>}</div>; };
const QuizPlayer = ({ questions, onCompleteQuiz }) => { const [answers, setAnswers] = useState({}); const [isSubmitted, setSubmitted] = useState(false); const score = useMemo(() => isSubmitted ? questions.reduce((acc, q, i) => acc + (answers[i]?.charAt(0).toUpperCase() === q.correctAnswer.charAt(0).toUpperCase() ? 1 : 0), 0) : 0, [answers, questions, isSubmitted]); const handleSubmit = () => { setSubmitted(true); if (onCompleteQuiz) onCompleteQuiz(score); }; if (!questions || !Array.isArray(questions)) return <p>Soal tidak tersedia.</p>; return (<div className="space-y-8">{isSubmitted && <div className="text-center p-4 rounded-lg bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700"><h3 className="text-2xl font-bold">Skor: {Math.round((score / questions.length) * 100)}%</h3><p>Benar {score} dari {questions.length} soal.</p></div>}{questions.map((q, qIndex) => (<div key={qIndex}><p className="font-semibold text-lg mb-3">{qIndex + 1}. {q.question}</p><div className="space-y-2">{q.options?.map((opt) => {const isSelected = answers[qIndex] === opt; const isCorrect = opt.charAt(0).toUpperCase() === q.correctAnswer.charAt(0).toUpperCase(); let stateClass = "border-slate-300 dark:border-slate-600 hover:border-blue-500"; if (isSubmitted) { if (isCorrect) stateClass = "bg-green-100 dark:bg-green-900/60 border-green-500"; else if (isSelected) stateClass = "bg-red-100 dark:bg-red-900/60 border-red-500"; else stateClass = "border-slate-300 dark:border-slate-700 opacity-60";} else if (isSelected) { stateClass = "border-blue-500 bg-blue-100 dark:bg-blue-900/50";} return <button key={opt} onClick={() => !isSubmitted && setAnswers(p => ({ ...p, [qIndex]: opt }))} disabled={isSubmitted} className={`w-full text-left p-3 rounded-lg border-2 transition-all ${stateClass}`}>{opt}</button>})}</div>{isSubmitted && q.explanation && <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-sm"><p className="font-bold flex items-center gap-2"><CheckCircle size={16}/> Penjelasan:</p><p className="mt-2 pl-1">{q.explanation}</p></div>}</div>))}<div className="pt-4">{!isSubmitted ? <button onClick={handleSubmit} disabled={Object.keys(answers).length !== questions.length} className="w-full p-4 mt-6 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-500">Kumpulkan</button> : <button onClick={() => { setSubmitted(false); setAnswers({}); }} className="w-full p-4 mt-6 font-bold text-white bg-slate-600 rounded-lg hover:bg-slate-700">Coba Lagi</button>}</div></div>);};

// --- KOMPONEN UI & PENDUKUNG LAIN ---
const InfoCard = ({ title, children, className }) => (<div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700/50 ${className}`}><h3 className="px-6 py-4 text-lg font-bold border-b border-slate-200/80 dark:border-slate-700/50">{title}</h3><div className="p-6">{children}</div></div>);
const DevStats = () => { const { userStats } = useContext(AppContext); const { managedVideos } = useContext(DevContext); return (<InfoCard title="Statistik Aplikasi (Global)"><div className="space-y-4"><div className="flex justify-between items-center"><span className="flex items-center gap-2"><Users size={16}/> Pengguna Aktif</span> <span className="font-bold">1,204</span></div><div className="flex justify-between items-center"><span className="flex items-center gap-2"><Database size={16}/> Video Terkelola</span> <span className="font-bold">{managedVideos.length}</span></div><div className="flex justify-between items-center"><span className="flex items-center gap-2"><CheckCircle size={16}/> Soal Dikerjakan (Anda)</span> <span className="font-bold">{userStats.questionsAnswered}</span></div></div></InfoCard>)};
const VideoManagement = () => { /* ... (Tidak berubah) ... */ const { managedVideos, setManagedVideos, addLog } = useContext(DevContext); const [id, setId] = useState(''); const [title, setTitle] = useState(''); const [editing, setEditing] = useState(null); const handleAddOrUpdate = (e) => { e.preventDefault(); if (!id || !title) return; const videoData = { id, title, embedUrl: `https://www.youtube.com/embed/${id}` }; if (editing) { setManagedVideos(managedVideos.map(v => v.id === editing.id ? videoData : v)); addLog('success', `Video updated: ${title}`); setEditing(null); } else { setManagedVideos([videoData, ...managedVideos]); addLog('success', `Video added: ${title}`); } setId(''); setTitle(''); }; const handleEdit = (video) => { setEditing(video); setId(video.id); setTitle(video.title); }; const handleDelete = (videoId) => { setManagedVideos(managedVideos.filter(v => v.id !== videoId)); addLog('warn', `Video ID ${videoId} deleted.`); }; return (<InfoCard title="Kelola Video Pembelajaran"><form onSubmit={handleAddOrUpdate} className="space-y-3 mb-6 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg"><input value={id} onChange={e => setId(e.target.value)} placeholder="YouTube Video ID" className="w-full p-2 rounded-md bg-white dark:bg-slate-700"/><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul Video" className="w-full p-2 rounded-md bg-white dark:bg-slate-700"/><button type="submit" className="w-full p-2 rounded-md font-bold text-white bg-blue-500 hover:bg-blue-600">{editing ? 'Update Video' : 'Tambah Video'}</button>{editing && <button onClick={() => { setEditing(null); setId(''); setTitle('');}} className="w-full p-2 mt-2 rounded-md bg-slate-300 dark:bg-slate-600">Batal</button>}</form><div className="space-y-2 max-h-96 overflow-y-auto pr-2">{managedVideos.map(video => (<div key={video.id} className="flex items-center justify-between p-3 rounded-md bg-slate-50 dark:bg-slate-700/50"><div><p className="font-semibold">{video.title}</p><p className="text-xs text-slate-500">{video.id}</p></div><div className="flex gap-2"><button onClick={() => handleEdit(video)} className="p-2 hover:text-blue-500"><Edit size={16}/></button><button onClick={() => handleDelete(video.id)} className="p-2 hover:text-red-500"><Trash2 size={16}/></button></div></div>))}</div></InfoCard>); };
const DevConsole = () => { /* ... (Tidak berubah) ... */ const { devLogs, addLog, setManagedVideos } = useContext(DevContext); const handleClearVideos = () => { if(window.confirm('Yakin ingin hapus semua video?')) { setManagedVideos([]); addLog('error', 'All managed videos have been reset.'); } }; return (<InfoCard title="Konsol Developer"><div className="bg-black text-white font-mono text-xs rounded-lg p-4 h-64 overflow-y-scroll flex flex-col-reverse"><div className="space-y-1">{devLogs.map((log, i) => (<p key={i}><span className="text-slate-500">{log.time}&gt; </span><span className={log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-amber-400' : 'text-green-400'}>{log.msg}</span></p>))}</div></div><div className="mt-4 space-y-2"><button onClick={handleClearVideos} className="w-full p-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700">Reset Semua Video</button></div></InfoCard>) };
const Sidebar = () => { const { page, setPage, isSidebarOpen, setSidebarOpen } = useContext(AppContext); const { logout, isDeveloper } = useContext(AuthContext); const navItems = [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'belajar', label: 'Belajar', icon: BrainCircuit }, { id: 'bank-soal', label: 'Bank Soal', icon: BookMarked }, { id: 'tanya-ai', label: 'Tanya AI', icon: MessageSquare }, { id: 'pembaruan', label: 'Pembaruan', icon: Newspaper}]; if(isDeveloper) navItems.push({ id: 'developer', label: 'Developer', icon: Terminal }); const NavLink = ({ item }) => (<button onClick={() => { setPage(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors text-base ${page === item.id ? 'bg-blue-500 text-white font-semibold' : 'hover:bg-sky-100 dark:hover:bg-slate-700'}`}><item.icon size={20} /><span>{item.label}</span></button>); return (<><div onClick={() => setSidebarOpen(false)} className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div><aside className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 flex flex-col z-40 transition-transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}><div className="flex items-center gap-2 text-2xl font-bold mb-8 px-2"><Logo className="w-9 h-9"/><span>Bdukasi</span></div><nav className="flex-grow space-y-1.5">{navItems.map(item => <NavLink key={item.id} item={item} />)}</nav><div className="mt-auto space-y-1.5"><NavLink item={{ id: 'akun', label: 'Pengaturan', icon: Settings }} /><button onClick={logout} className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500"><LogOut size={20}/><span>Keluar</span></button></div></aside></>); }
const Navbar = () => { const { setSidebarOpen } = useContext(AppContext); return (<header className="sticky top-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg z-20 border-b border-slate-200 dark:border-slate-700 md:hidden"><div className="px-4 h-16 flex items-center justify-between"><div className="font-bold text-xl flex items-center gap-2"><Logo className="w-8 h-8"/> Bdukasi</div><button onClick={() => setSidebarOpen(true)} className="p-2"><Menu /></button></div></header>); }
const AnimatedScreen = ({ children, customKey }) => <div key={customKey} className="animate-fadeIn">{children}</div>;
const DashboardCard = ({ icon, title, description, onClick, className="" }) => (<button onClick={onClick} className={`p-6 rounded-2xl shadow-sm text-left transform hover:-translate-y-1 transition-all duration-300 ${className}`}><div className="flex items-start gap-4"><div className={`${!className.includes("bg-") ? "bg-slate-100 dark:bg-slate-700" : "bg-white/20"} p-3 rounded-lg`}>{icon}</div><div><h3 className="text-xl font-bold">{title}</h3><p className={className.includes("text-white") ? "opacity-80" : "text-slate-500 dark:text-slate-400"}>{description}</p></div></div></button>);
const DailyMissionCard = () => { const { userStats } = useContext(AppContext); return (<InfoCard title="Misi Harian"><div className="space-y-3"><p className={`flex items-center gap-3 ${userStats.videosWatched > 0 ? 'text-green-500' : ''}`}><CheckCircle/> Tonton 1 video belajar</p><p className={`flex items-center gap-3 ${userStats.questionsAnswered >= 5 ? 'text-green-500' : ''}`}><CheckCircle/> Kerjakan 5 soal latihan</p><p className="flex items-center gap-3 text-slate-400"><XCircle className="w-5 h-5"/> Tanya 1 pertanyaan ke AI</p></div></InfoCard>);};
const LeaderboardCard = ({leaderboard, currentUser}) => (<InfoCard title="Papan Peringkat Mingguan"><div className="space-y-3">{leaderboard.map((player, index) => (<div key={player.name} className={`flex items-center justify-between p-2 rounded-md ${player.name === currentUser ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}><span className="flex items-center gap-3"><Award className={index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-amber-600' : 'text-transparent'}/> {index+1}. {player.name}</span> <span className="font-bold">{player.score} XP</span></div>))}</div></InfoCard>);
const DeveloperVideoSection = ({ videos }) => (<div className="mt-8"><h2 className="text-2xl font-bold mb-4">Video Pilihan Developer</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-6">{videos.slice(0, 2).map(video => (<a key={video.id} href={`https://youtu.be/${video.id}`} target="_blank" rel="noopener noreferrer" className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden group"><div className="aspect-video bg-black"><img src={`https://i3.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt={video.title} className="w-full h-full object-cover"/></div><div className="p-4"><h3 className="font-bold text-sm line-clamp-2 group-hover:text-blue-500">{video.title}</h3></div></a>))}</div></div>);
const BackButton = ({ onClick }) => <button onClick={onClick} className="flex items-center gap-2 text-blue-500 font-semibold hover:underline mb-8"><ArrowLeft size={20} /> Kembali</button>;
const SettingToggle = ({ label, isEnabled, onToggle }) => (<div className="flex items-center justify-between py-2"><label className="font-semibold flex items-center gap-3">{label}</label><button onClick={onToggle} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>);
const ErrorMessage = ({ message }) => (<div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-r-lg mt-4 w-full flex items-center gap-4"><AlertTriangle className="h-6 w-6 text-red-500" /><p className="font-bold">{message}</p></div>);
const TabButton = ({icon, text, isActive, onClick}) => <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 sm:px-6 font-semibold border-b-2 transition-all ${isActive ? 'text-blue-500 border-blue-500' : 'text-slate-500 border-transparent hover:text-blue-500'}`}><icon size={20}/> <span className="hidden sm:inline">{text}</span></button>;
const ListItem = ({text, onClick}) => <button onClick={onClick} className="w-full text-left flex justify-between items-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg transition-all"><span className="font-semibold">{text}</span><ChevronRight /></button>;
const Footer = () => (<footer className="w-full text-center p-8 mt-8 border-t border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm"><p className="mt-6 text-xs">© {new Date().getFullYear()} Bgune Digital.</p></footer>);

// --- CSS & STYLING ---
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Open+Sans:wght@400;700&display=swap'); :root { --font-family: 'Poppins', sans-serif; } body { font-family: var(--font-family); transition: background-color 0.3s, color 0.3s; } .font-size-sm { font-size: 0.9rem; } .font-size-base { font-size: 1rem; } .font-size-lg { font-size: 1.1rem; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } } .animate-fadeIn { animation: fadeIn 0.4s ease-in-out; } .animate-blob { animation: blob 8s infinite ease-in-out; } .animation-delay-2000 { animation-delay: -4s; } .no-animations * { transition: none !important; animation: none !important; } .prose {max-width: 100%;} .prose h1, .prose h2, .prose h3, .prose p, .prose strong, .prose ul, .prose ol, .prose li {color: inherit; margin-top: 1.25em; margin-bottom: 1.25em;} .aspect-video { position: relative; padding-bottom: 56.25%; height: 0; } .aspect-video iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }`;
document.head.appendChild(styleSheet);
