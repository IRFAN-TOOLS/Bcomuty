import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
    Search, Brain, BookOpen, Youtube, Lightbulb, FileText, ArrowLeft, Loader, Sparkles, 
    AlertTriangle, X, School, FlaskConical, Globe, Calculator, Dna, BarChart2, Drama,
    Computer, BookHeart, Landmark, Languages, HelpCircle, Atom, CheckCircle, ChevronRight, 
    BrainCircuit, History, BookMarked, Github, Instagram, CalendarDays, Sun, Moon, LogOut, 
    User, Settings, Menu, Info, Newspaper, LayoutDashboard, Volume2, VolumeX, Contrast, 
    Sparkle, Wind, Text, Palette
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- KONFIGURASI PENTING & API KEYS ---
const GEMINI_API_KEY = "AIzaSyArJ1P8HanSQ_XVWX9m4kUlsIVXrBRInik";
const YOUTUBE_API_KEY = "AIzaSyD9Rp-oSegoIDr8q9XlKkqpEL64lB2bQVE";
const PERNAH_MIKIR_CHANNEL_ID = "UC_Qc0st3N12HkP3y21pMUcw";

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

// --- PENYEDIA KONTEKS (PROVIDERS) ---

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isNewUser, setIsNewUser] = useLocalStorage('bdukasi_is_new_user_v2', true);

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

    const value = { user, loading, loginWithGoogle, logout, isNewUser, setIsNewUser };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const SettingsProvider = ({ children }) => {
    const [theme, setTheme] = useLocalStorage('bdukasi-theme', 'light');
    const [fontSize, setFontSize] = useLocalStorage('bdukasi-font-size', 'base');
    const [soundEnabled, setSoundEnabled] = useLocalStorage('bdukasi-sound', true);
    const [animationsEnabled, setAnimationsEnabled] = useLocalStorage('bdukasi-animations', true);
    const [dyslexiaFont, setDyslexiaFont] = useLocalStorage('bdukasi-dyslexia', false);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);

        const fontSizes = ['sm', 'base', 'lg', 'xl'];
        fontSizes.forEach(size => root.classList.remove(`font-size-${size}`));
        root.classList.add(`font-size-${fontSize}`);

        if (animationsEnabled) {
            root.classList.remove('no-animations');
        } else {
            root.classList.add('no-animations');
        }

        if (dyslexiaFont) {
            root.classList.add('dyslexia-friendly');
        } else {
            root.classList.remove('dyslexia-friendly');
        }

    }, [theme, fontSize, animationsEnabled, dyslexiaFont]);

    const value = { theme, setTheme, fontSize, setFontSize, soundEnabled, setSoundEnabled, animationsEnabled, setAnimationsEnabled, dyslexiaFont, setDyslexiaFont };
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

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

    const value = { page, setPage, screen, setScreen, level, setLevel, track, setTrack, subject, setSubject, learningData, setLearningData, recommendations, setRecommendations, fetchRecommendations, bankSoal, setBankSoal, isLoading, setIsLoading, error, setError, history, addHistory, loadingMessage, setLoadingMessage, isSidebarOpen, setSidebarOpen, contextValue };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

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

const fetchVideosFromPernahMikir = async () => {
    console.log("[YouTube API] Mengambil video dari @PernahMikir...");
    if (!YOUTUBE_API_KEY) { console.error("Kunci API YouTube belum diatur."); return []; }
    const API_URL = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${PERNAH_MIKIR_CHANNEL_ID}&maxResults=20&order=date&type=video&key=${YOUTUBE_API_KEY}`;
    try {
        const response = await fetch(API_URL);
        if (!response.ok) { throw new Error('Gagal mengambil data video.'); }
        const data = await response.json();
        return data.items
            .map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium.url,
            }))
            .filter(item => item.id); // Filter item yang tidak memiliki videoId
    } catch (error) {
        console.error("[YouTube API] Error @PernahMikir:", error);
        return [];
    }
};

const fetchRelevantLearningVideo = async (topic, subject) => {
    console.log(`[YouTube API] Mencari video untuk: "${topic}"`);
    if (!YOUTUBE_API_KEY) { console.error("Kunci API YouTube belum diatur."); return null; }
    
    // Query lebih spesifik untuk hasil yang lebih baik
    const searchQuery = `materi ${subject} ${topic} pembahasan lengkap kelas`;
    const API_URL = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&maxResults=5&type=video&videoDuration=long&videoCategoryId=27&relevanceLanguage=id&key=${YOUTUBE_API_KEY}`;
    
    try {
        const response = await fetch(API_URL);
        if (!response.ok) { throw new Error('Gagal mencari video pembelajaran.'); }
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            // Pilih video pertama yang paling relevan
            const video = data.items[0];
            return {
                id: video.id.videoId,
                title: video.snippet.title,
                embedUrl: `https://www.youtube.com/embed/${video.id.videoId}`,
            };
        }
        console.log("Tidak ada video (long) yang relevan ditemukan.");
        return null;
    } catch (error) {
        console.error("[YouTube API] Error pencarian video:", error);
        return null;
    }
};

const fetchFunFact = async () => {
    try {
        const prompt = 'Berikan saya satu fakta menarik (fun fact) tentang sains atau sejarah dalam Bahasa Indonesia. Jawab HANYA dalam format JSON: {"fakta": "Isi fakta di sini..."}';
        const result = await callGeminiAPI(prompt);
        return result.fakta;
    } catch (error) {
        console.error("Gagal mengambil Fun Fact:", error);
        return "Gagal memuat fakta menarik hari ini. Coba lagi nanti!";
    }
};

// --- LOGIKA INTI & FETCH DATA ---

function useLearningActions() {
    const { setIsLoading, setLoadingMessage, setError, setLearningData, addHistory, contextValue, setPage, setScreen, setBankSoal, setRecommendations } = useContext(AppContext);
    
    const fetchLearningMaterial = useCallback(async (searchTopic, isFromHistory = false) => {
        console.log(`[Fetch Materi] Memulai untuk topik: "${searchTopic}"`);
        if (!searchTopic || !contextValue.level || !contextValue.subject) { console.error("[Fetch Materi] Gagal: Konteks tidak lengkap."); return; }
        
        setIsLoading(true);
        setLoadingMessage('Guru AI sedang menyiapkan materimu...');
        setError(null);
        setLearningData(null);
        setPage('belajar');
        setScreen('lesson');
        
        const { level, track, subject } = contextValue;
        if (!isFromHistory) addHistory({ topic: searchTopic, level, track, subjectName: subject.name });

        const geminiPrompt = `Sebagai ahli materi pelajaran, buatkan ringkasan, materi lengkap (format Markdown bersih), dan 5 soal latihan pilihan ganda (A-E) dengan jawaban & penjelasan untuk topik '${searchTopic}' pelajaran '${subject.name}' tingkat ${level} ${track ? `jurusan ${track}`: ''}. Respons HANYA dalam format JSON: {"ringkasan": "...", "materi_lengkap": "...", "latihan_soal": [{"question": "...", "options": [...], "correctAnswer": "A", "explanation": "..."}]}`;

        try {
            // Fetch material dan video secara paralel
            const [geminiData, videoData] = await Promise.all([
                callGeminiAPI(geminiPrompt),
                fetchRelevantLearningVideo(searchTopic, subject.name)
            ]);

            setLearningData({
                topic: searchTopic,
                ...geminiData,
                video: videoData // Simpan objek video
            });
            console.log("[Fetch Materi] Sukses, data materi dan video diatur.");
        } catch (err) {
            console.error("[Fetch Materi] Error:", err);
            setError(`Gagal memuat materi: ${err.message}. Coba lagi nanti.`);
            setPage('dashboard');
        } finally {
            setIsLoading(false);
        }
    }, [contextValue, addHistory, setIsLoading, setLoadingMessage, setError, setLearningData, setPage, setScreen]);

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
    }, [contextValue, setBankSoal, setError, setIsLoading, setLoadingMessage, setPage, setScreen]);
    
    const fetchRecommendations = useCallback(async () => {
        if (!contextValue.level || !contextValue.subject) return;
        const { level, track, subject } = contextValue;
        const prompt = `Berikan 5 rekomendasi topik menarik untuk mata pelajaran "${subject.name}" level ${level} ${track ? `jurusan ${track}`: ''}. Jawab HANYA dalam format JSON array string. Contoh: ["Topik 1", "Topik 2"]`;
        try { const recs = await callGeminiAPI(prompt); setRecommendations(Array.isArray(recs) ? recs : []); } catch (err) { console.error("Gagal fetch rekomendasi:", err); }
    }, [contextValue, setRecommendations]);

    return { fetchLearningMaterial, fetchBankSoal, fetchRecommendations };
}


// --- KOMPONEN UTAMA APLIKASI ---

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
    const { loading: authLoading, user, isNewUser } = useContext(AuthContext);
    const { isLoading: appIsLoading, loadingMessage } = useContext(AppContext);

    if (authLoading) {
        return <LoadingScreen message="Memverifikasi akun..." />;
    }
    
    if (appIsLoading) {
        return <LoadingScreen message={loadingMessage} />;
    }

    if (!user) {
        return <LandingPage />;
    }
    
    if (user && isNewUser) {
        return <InfoPage />;
    }
    
    return <AppLayout />;
}

const AppLayout = () => {
    const { page } = useContext(AppContext);
    
    const pages = {
        'dashboard': <DashboardPage />,
        'belajar': <LearningFlow />,
        'akun': <SettingsPage />,
        'pembaruan': <UpdateLogPage />,
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 min-h-screen font-sans transition-colors duration-300">
             <div className="md:flex">
                <Sidebar />
                <div className="flex-1 md:ml-64">
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
    const { loginWithGoogle } = useContext(AuthContext);
    return (
        <div className="bg-slate-50 min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden relative">
            {/* Background Decoration */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            
            <div className="relative z-10 text-center flex flex-col items-center">
                <div className="bg-white/50 backdrop-blur-lg p-6 rounded-3xl shadow-lg">
                    <Brain className="w-24 h-24 text-blue-500 mx-auto" />
                    <h1 className="mt-4 text-4xl md:text-6xl font-extrabold text-slate-800">
                        Buka Dunia <span className="text-blue-600">Bdukasi</span>
                    </h1>
                    <p className="mt-4 text-lg md:text-xl text-slate-600 max-w-2xl">
                        Belajar jadi seru ditemani Guru AI, dengan materi ter-update dan fitur canggih yang dirancang khusus untukmu.
                    </p>
                    <button 
                        onClick={loginWithGoogle} 
                        className="mt-8 px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-full shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-300 flex items-center gap-3 group"
                    >
                        <svg className="w-6 h-6 group-hover:animate-spin-fast" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.19,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.19,22C17.6,22 21.54,18.33 21.54,12.81C21.54,11.76 21.45,11.44 21.35,11.1Z"></path></svg>
                        Masuk dengan Google
                    </button>
                </div>
            </div>
             <Footer isLanding={true} />
        </div>
    );
};

const InfoPage = () => {
    const { setPage } = useContext(AppContext);
    const { setIsNewUser } = useContext(AuthContext);

    const handleProceed = () => {
        setIsNewUser(false);
        setPage('dashboard');
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900 flex items-center justify-center min-h-screen p-4">
            <div className="max-w-3xl mx-auto p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl animate-fadeInUp">
                <h1 className="text-3xl font-bold text-center mb-6 text-blue-500">Selamat Datang di Keluarga Bdukasi!</h1>
                <div className="space-y-4 text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                    <p>Hai Pelajar Hebat! Kami senang sekali kamu bergabung. Bdukasi adalah hasil karya <strong>M. Irham Andika Putra</strong> dan tim <strong>Bgune Digital</strong>, yang didesain untuk jadi teman belajarmu yang paling asyik.</p>
                    <p>🔒 <strong>Datamu Aman Bersama Kami.</strong> Kami pakai sistem keamanan Google. Datamu hanya untuk membuat pengalaman belajarmu makin personal, bukan untuk yang lain.</p>
                    <p>🤖 <strong>Guru AI Siap Membantu.</strong> "Otak" guru virtual kami adalah teknologi AI canggih dari Google. Dia siap menjelaskan materi, membuat soal, dan menjawab rasa penasaranmu, sesuai kurikulum Indonesia.</p>
                    <p>Yuk, kita mulai petualangan belajar yang seru dan raih semua impianmu!</p>
                </div>
                <div className="text-center mt-8">
                    <button onClick={handleProceed} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-transform hover:scale-105">
                        Ayo Mulai!
                    </button>
                </div>
            </div>
        </div>
    );
};

const DashboardPage = () => {
    const { setPage } = useContext(AppContext);
    const { user } = useContext(AuthContext);
    
    return (
        <AnimatedScreen key="dashboard">
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">Halo, {user?.displayName?.split(' ')[0] || 'Juara'}! Siap taklukkan hari ini?</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                 {/* Main actions */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <DashboardCard icon={<BrainCircuit size={32} />} title="Mulai Belajar" description="Pilih jenjang & mata pelajaran." onClick={() => { setPage('belajar'); }} className="bg-blue-500 text-white hover:bg-blue-600" />
                    <DashboardCard icon={<BookMarked size={32} />} title="Bank Soal" description="Langsung ke latihan soal." onClick={() => { setPage('belajar'); }} />
                    <div className="sm:col-span-2">
                        <FunFactCard />
                    </div>
                </div>
                 {/* Study Streak */}
                <StudyStreakTracker />
            </div>

            <PernahMikirSection />
            <Footer />
        </AnimatedScreen>
    );
};

const SettingsPage = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme, setTheme, fontSize, setFontSize, soundEnabled, setSoundEnabled, animationsEnabled, setAnimationsEnabled, dyslexiaFont, setDyslexiaFont } = useContext(SettingsContext);

    const fontOptions = [ { value: 'sm', label: 'Kecil' }, { value: 'base', label: 'Normal' }, { value: 'lg', label: 'Besar' }, { value: 'xl', label: 'Sangat Besar' }];

    return (
        <AnimatedScreen key="akun">
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
                        <SettingToggle label="Animasi Transisi" icon={<Wind/>} isEnabled={animationsEnabled} onToggle={() => setAnimationsEnabled(p => !p)} />
                        <SettingToggle label="Font Disleksia" icon={<Text/>} isEnabled={dyslexiaFont} onToggle={() => setDyslexiaFont(p => !p)} />
                        <SettingToggle label="Suara Notifikasi" icon={soundEnabled ? <Volume2/> : <VolumeX/>} isEnabled={soundEnabled} onToggle={() => setSoundEnabled(p => !p)} />
                        
                        <div>
                            <label className="font-semibold block mb-2">Ukuran Font</label>
                            <div className="flex flex-wrap gap-2">
                                {fontOptions.map(opt => (
                                    <button key={opt.value} onClick={() => setFontSize(opt.value)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${fontSize === opt.value ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </InfoCard>
            </div>
        </AnimatedScreen>
    );
};

const LearningFlow = () => {
    const { screen } = useContext(AppContext);
    return <ScreenContainer />;
}

const UpdateLogPage = () => {
    // ... Konten log pembaruan tetap sama
    const updates = [
        { version: "v2.1.0", date: "25 Juni 2025", changes: [
            "Desain ulang UI/UX total dengan tema baru yang lebih segar, modern, dan ramah untuk pelajar.",
            "Perbaikan fitur video pembelajaran: kini menampilkan video relevan dari YouTube berdasarkan topik.",
            "Perbaikan fitur rekomendasi video @PernahMikir di Dashboard, kini menampilkan beberapa video secara acak.",
            "Penambahan fitur 'Fakta Menarik Hari Ini' & 'Runtunan Belajar' di Dashboard.",
            "Halaman Pengaturan diperkaya dengan opsi: Suara, Animasi, dan Font Disleksia-friendly.",
            "Sistem warna baru (soft-theme) untuk kenyamanan mata.",
            "Peningkatan loading screen dan animasi transisi yang lebih halus."
        ]},
        { version: "v2.0.0", date: "24 Juni 2025", changes: [ "Perombakan total UI/UX, penambahan login, halaman dashboard, akun, dan lainnya."] },
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
}

// --- KOMPONEN UI & PENDUKUNG ---

// Komponen UI yang baru dan diperbaiki
const LoadingScreen = ({ message }) => (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 z-50 flex flex-col items-center justify-center gap-6">
        <div className="relative w-24 h-24">
            <Brain className="w-full h-full text-blue-500 animate-pulse" />
            <Sparkles className="absolute top-0 right-0 w-8 h-8 text-amber-400 animate-ping" />
        </div>
        <p className="text-xl font-semibold text-slate-600 dark:text-slate-300 text-center max-w-md">{message || 'Memuat...'}</p>
    </div>
);

const SettingToggle = ({ label, icon, isEnabled, onToggle }) => (
    <div className="flex items-center justify-between">
        <label className="font-semibold flex items-center gap-3">
            {icon} {label}
        </label>
        <button
            onClick={onToggle}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
        >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

const FunFactCard = () => {
    const [fact, setFact] = useState(null);
    useEffect(() => { fetchFunFact().then(setFact); }, []);

    return (
        <div className="p-6 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-start gap-4 h-full">
            <Lightbulb className="w-8 h-8 text-amber-500 flex-shrink-0 mt-1" />
            <div>
                <h3 className="font-bold text-lg text-amber-800 dark:text-amber-300">Fakta Menarik Hari Ini</h3>
                {fact ? <p className="text-amber-700 dark:text-amber-400 mt-1">{fact}</p> : <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mt-2 animate-pulse"></div>}
            </div>
        </div>
    );
};

const StudyStreakTracker = () => {
    const [streakData, setStreakData] = useLocalStorage('bdukasi-streak', { count: 0, lastLogin: null });

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        if (streakData.lastLogin !== today) {
            setStreakData(prev => ({
                count: prev.lastLogin === yesterday ? prev.count + 1 : 1,
                lastLogin: today
            }));
        }
    }, []);

    return (
        <div className="p-6 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex flex-col items-center justify-center text-center h-full">
            <Sparkle className="w-12 h-12 text-purple-500" />
            <h3 className="text-5xl font-bold mt-2 text-purple-600 dark:text-purple-300">{streakData.count}</h3>
            <p className="font-semibold text-purple-800 dark:text-purple-400">Hari Runtunan Belajar</p>
            <p className="text-xs text-purple-500 dark:text-purple-500 mt-1">Masuk setiap hari untuk mempertahankannya!</p>
        </div>
    );
}

const PernahMikirSection = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchVideosFromPernahMikir().then(data => {
            // Ambil 3 video secara acak
            const shuffled = data.sort(() => 0.5 - Math.random());
            setVideos(shuffled.slice(0, 3));
            setLoading(false);
        });
    }, []);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Inspirasi dari @PernahMikir</h2>
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <div key={i} className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 animate-pulse"><div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg"></div><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mt-4"></div></div>)}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map(video => (
                        <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="block bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 group">
                           <img src={video.thumbnail} alt={video.title} className="w-full h-32 object-cover" />
                           <div className="p-4">
                               <h3 className="font-bold text-sm line-clamp-2 group-hover:text-blue-500 transition-colors">{video.title}</h3>
                           </div>
                       </a>
                    ))}
                </div>
            )}
        </div>
    );
};


// Komponen UI lama yang disesuaikan
const iconMap = { School, Brain, BookOpen, Youtube, Lightbulb, FileText, ArrowLeft, Loader, Sparkles, AlertTriangle, X, FlaskConical, Globe, Calculator, Dna, BarChart2, Drama, Computer, BookHeart, Landmark, Languages, HelpCircle, Atom, CheckCircle, ChevronRight, BrainCircuit, History, BookMarked, Github, Instagram, CalendarDays };
const curriculum = { 'SD': { subjects: [{ name: 'Matematika', iconName: 'Calculator' }, { name: 'IPAS', iconName: 'Globe' }, { name: 'Pendidikan Pancasila', iconName: 'Landmark' }, { name: 'Bahasa Indonesia', iconName: 'BookHeart' }] }, 'SMP': { subjects: [{ name: 'Matematika', iconName: 'Calculator' }, { name: 'IPA Terpadu', iconName: 'FlaskConical' }, { name: 'IPS Terpadu', iconName: 'Globe' }, { name: 'Pendidikan Pancasila', iconName: 'Landmark'}, { name: 'Bahasa Indonesia', iconName: 'BookHeart' }, { name: 'Bahasa Inggris', iconName: 'Languages' }, { name: 'Informatika', iconName: 'Computer' }] }, 'SMA': { tracks: { 'IPA': [{ name: 'Matematika Peminatan', iconName: 'Calculator' }, { name: 'Fisika', iconName: 'Atom' }, { name: 'Kimia', iconName: 'FlaskConical' }, { name: 'Biologi', iconName: 'Dna' }], 'IPS': [{ name: 'Ekonomi', iconName: 'BarChart2' }, { name: 'Geografi', iconName: 'Globe' }, { name: 'Sosiologi', iconName: 'School' }], 'Bahasa': [{ name: 'Sastra Indonesia', iconName: 'BookHeart' }, { name: 'Sastra Inggris', iconName: 'Drama' }, { name: 'Antropologi', iconName: 'Globe' }, { name: 'Bahasa Asing', iconName: 'Languages' }] } } };
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
const Navbar = () => {
    const { setSidebarOpen } = useContext(AppContext);
    return (
        <header className="sticky top-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md z-10 border-b border-slate-200 dark:border-slate-700 md:hidden">
            <div className="px-4 h-16 flex items-center justify-between">
                <div className="font-bold text-xl flex items-center gap-2"><Brain size={24} className="text-blue-500" /> Bdukasi</div>
                <button onClick={() => setSidebarOpen(true)} className="md:hidden">
                    <Menu />
                </button>
            </div>
        </header>
    );
}

const Sidebar = () => {
    const { page, setPage, isSidebarOpen, setSidebarOpen } = useContext(AppContext);
    const { logout } = useContext(AuthContext);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'belajar', label: 'Mulai Belajar', icon: <BrainCircuit size={20} /> },
        { id: 'pembaruan', label: 'Log Pembaruan', icon: <Newspaper size={20} /> },
        { id: 'akun', label: 'Pengaturan', icon: <Settings size={20} /> },
    ];

    const NavLink = ({ item }) => (
         <button 
            onClick={() => { setPage(item.id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${page === item.id ? 'bg-blue-500 text-white font-semibold' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
        >
            {item.icon}
            <span>{item.label}</span>
        </button>
    );

    return (
        <>
            <div onClick={() => setSidebarOpen(false)} className={`fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div>
            <aside className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 flex flex-col z-30 transition-transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center gap-2 text-2xl font-bold mb-8 px-2">
                    <Brain className="text-blue-500" size={32} />
                    <span>Bdukasi</span>
                </div>
                <nav className="flex-grow space-y-2">
                    {navItems.map(item => <NavLink key={item.id} item={item} />)}
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

const BackButton = ({ onClick }) => <button onClick={onClick} className="flex items-center gap-2 text-blue-500 font-semibold hover:underline mb-8"><ArrowLeft size={20} /> Kembali</button>;
const InfoCard = ({ icon, title, children, className = '' }) => <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md overflow-hidden ${className} animate-fadeInUp`}><div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">{icon && <div className="text-blue-500">{React.cloneElement(icon, { size: 24 })}</div>}<h2 className="text-xl font-bold">{title}</h2></div><div className="p-4 sm:p-6">{children}</div></div>;
const ErrorMessage = ({ message }) => <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-r-lg mt-4 w-full flex items-center gap-4"><AlertTriangle className="h-6 w-6 text-red-500" /><p className="font-bold">{message}</p></div>;

const LevelSelectionScreen = () => { /* ... sama seperti sebelumnya, dengan styling baru */
    const { setScreen, setLevel, setPage } = useContext(AppContext);
    return (
        <AnimatedScreen customKey="level">
            <div className="text-center pt-8">
                <BackButton onClick={() => setPage('dashboard')} />
                <School className="w-24 h-24 mx-auto text-blue-500" />
                <h1 className="text-4xl font-bold mt-4">Pilih Jenjang Pendidikan</h1>
                <p className="text-xl text-slate-500 dark:text-slate-400 mt-2 mb-12">Mulai dari sini untuk petualangan belajarmu.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    {Object.keys(curriculum).map((lvl) => <button key={lvl} onClick={() => { setLevel(lvl); setScreen(lvl === 'SMA' ? 'trackSelection' : 'subjectSelection'); }} className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md hover:shadow-blue-500/20 hover:border-blue-500 hover:-translate-y-2 transition-all text-2xl font-bold flex flex-col items-center justify-center gap-4 cursor-pointer">{lvl}</button>)}
                </div>
            </div>
        </AnimatedScreen>
    );
};
const TrackSelectionScreen = () => { /* ... sama seperti sebelumnya, dengan styling baru */ 
    const { setScreen, setTrack } = useContext(AppContext);
    return (
        <AnimatedScreen customKey="track">
             <BackButton onClick={() => setScreen('levelSelection')} />
            <div className="text-center pt-8">
                <h1 className="text-4xl font-bold mb-12">Pilih Jurusan</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
                    {Object.keys(curriculum.SMA.tracks).map((trackName) => <button key={trackName} onClick={() => { setTrack(trackName); setScreen('subjectSelection'); }} className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md hover:shadow-blue-500/20 hover:border-blue-500 hover:-translate-y-2 transition-all text-2xl font-bold">{trackName}</button>)}
                </div>
            </div>
        </AnimatedScreen>
    );
};
const SubjectSelectionScreen = () => { /* ... sama seperti sebelumnya, dengan styling baru */
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
                    {subjects.map((s) => <button key={s.name} onClick={() => { setSubject(s); setScreen('subjectDashboard'); }} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-center hover:border-blue-500 hover:-translate-y-1 transition-all aspect-square shadow-md"><DynamicIcon name={s.iconName} size={48} className="text-blue-500" /><span className="font-semibold text-sm text-center mt-3">{s.name}</span></button>)}
                </div>
            </div>
        </AnimatedScreen>
    );
};
const DynamicIcon = ({ name, ...props }) => { const IconComponent = iconMap[name]; return IconComponent ? <IconComponent {...props} /> : <HelpCircle {...props} />; };
const SubjectDashboardScreen = () => {
    const { subject, recommendations, error, setError, history, setScreen } = useContext(AppContext);
    const { fetchLearningMaterial, fetchRecommendations } = useLearningActions();
    const [inputValue, setInputValue] = useState('');
    const [activeTab, setActiveTab] = useState('rekomendasi');

    useEffect(() => { if (subject && recommendations.length === 0) fetchRecommendations(); }, [subject, fetchRecommendations, recommendations.length]);
    if (!subject) return <div className="text-center">Harap pilih mata pelajaran. <BackButton onClick={() => setScreen('subjectSelection')} /></div>;
    
    const handleSearchSubmit = (e) => { e.preventDefault(); if(inputValue.trim()) { setError(null); fetchLearningMaterial(inputValue); } else { setError("Topik pencarian tidak boleh kosong."); } };

    return (
        <AnimatedScreen customKey="dashboard">
            <BackButton onClick={() => setScreen('subjectSelection')} />
            <div className="text-center pt-8"><DynamicIcon name={subject.iconName} size={80} className="text-blue-500 mx-auto mb-4" /><h1 className="text-4xl font-bold">Mata Pelajaran: {subject.name}</h1></div>
            <div className="w-full max-w-2xl mx-auto my-12">
                <form onSubmit={handleSearchSubmit} className="relative">
                    <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ketik topik untuk dipelajari..." className="w-full pl-6 pr-16 py-4 text-lg bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-full focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"/>
                    <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-transform active:scale-95"><Search className="w-6 h-6" /></button>
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
    const { setError } = useContext(AppContext);
    const { fetchBankSoal } = useLearningActions();
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(5);
    const handleSubmit = (e) => { e.preventDefault(); if (!topic.trim()) { setError("Topik soal tidak boleh kosong."); return; } if (count < 1 || count > 20) { setError("Jumlah soal harus antara 1 dan 20."); return; } setError(null); fetchBankSoal(topic, count); };
    return (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-center mb-4">🎯 Bank Soal Berbasis Topik</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-4">Masukkan topik spesifik dan jumlah soal.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder='Contoh: Perang Diponegoro' className='w-full p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500' />
                <div className="flex flex-col sm:flex-row gap-4">
                    <input type="number" value={count} onChange={e => setCount(parseInt(e.target.value, 10))} min="1" max="20" className='w-full sm:w-1/3 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500' />
                    <button type="submit" className="w-full sm:w-2/3 p-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-500">Buatkan Soal!</button>
                </div>
            </form>
        </div>
    );
};
const TabButton = ({icon, text, isActive, onClick}) => <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 sm:px-6 font-semibold border-b-2 transition-all ${isActive ? 'text-blue-500 border-blue-500' : 'text-slate-500 border-transparent hover:text-blue-500'}`}>{React.cloneElement(icon, {size: 20})} <span className="hidden sm:inline">{text}</span></button>;
const ListItem = ({text, onClick}) => <button onClick={onClick} className="w-full text-left flex justify-between items-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg transition-all"><span className="font-semibold">{text}</span><ChevronRight /></button>;
const LearningMaterialScreen = () => {
    const { learningData, setScreen } = useContext(AppContext);
    if (!learningData) return <div className="text-center p-8">Materi tidak ditemukan. <button onClick={() => setScreen('subjectDashboard')} className="text-blue-500 underline">Kembali</button></div>;
    const { topic, ringkasan, materi_lengkap, latihan_soal, video } = learningData;
    return (
        <AnimatedScreen customKey="lesson">
            <BackButton onClick={() => setScreen('subjectDashboard')} />
            <div className="space-y-8 pt-8">
                <h1 className="text-3xl sm:text-5xl font-bold text-center text-blue-600 dark:text-blue-400">{topic}</h1>
                {video ? (
                    <InfoCard icon={<Youtube />} title={video.title}>
                        <div className="aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden shadow-lg">
                            <iframe src={video.embedUrl} title={video.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="w-full h-full"></iframe>
                        </div>
                    </InfoCard>
                ) : (
                    <InfoCard icon={<Youtube />} title="Video Pembelajaran"><p className="text-center text-slate-400">Guru AI tidak menemukan video yang cocok untuk topik ini. Coba topik lain ya!</p></InfoCard>
                )}
                {ringkasan && <InfoCard icon={<Lightbulb />} title="Ringkasan"><p className="leading-relaxed">{ringkasan}</p></InfoCard>}
                {materi_lengkap && <InfoCard icon={<BookOpen />} title="Materi Lengkap"><div className="prose dark:prose-invert max-w-none"><ReactMarkdown>{materi_lengkap}</ReactMarkdown></div></InfoCard>}
                {latihan_soal?.length > 0 && <InfoCard icon={<BookMarked />} title="Latihan Soal"><QuizPlayer questions={latihan_soal} /></InfoCard>}
            </div>
        </AnimatedScreen>
    );
};
const BankSoalScreen = () => {
    const { bankSoal, setScreen } = useContext(AppContext);
    return (
        <AnimatedScreen customKey="bankSoal">
            <BackButton onClick={() => setScreen('subjectDashboard')} />
            <div className="pt-8"><InfoCard title="Bank Soal Latihan">{bankSoal && bankSoal.length > 0 ? <QuizPlayer questions={bankSoal} /> : <p className="text-center p-4">Gagal memuat soal.</p>}</InfoCard></div>
        </AnimatedScreen>
    );
};
const QuizPlayer = ({ questions }) => { /* ... sama seperti sebelumnya, dengan styling baru */
    const [answers, setAnswers] = useState({});
    const [isSubmitted, setSubmitted] = useState(false);
    if (!questions || !Array.isArray(questions) || questions.length === 0) return <p>Soal latihan tidak tersedia.</p>;
    const score = useMemo(() => isSubmitted ? questions.reduce((acc, q, i) => acc + (answers[i]?.charAt(0).toUpperCase() === q.correctAnswer.charAt(0).toUpperCase() ? 1 : 0), 0) : 0, [answers, questions, isSubmitted]);

    return (
        <div className="space-y-8">
            {isSubmitted && <div className="text-center p-4 rounded-lg bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700"><h3 className="text-2xl font-bold">Skor: {Math.round((score / questions.length) * 100)}%</h3><p>Benar {score} dari {questions.length} soal.</p></div>}
            {questions.map((q, qIndex) => (
                <div key={qIndex}>
                    <p className="font-semibold text-lg mb-3">{qIndex + 1}. {q.question}</p>
                    <div className="space-y-2">{q.options?.map((opt, oIndex) => {
                        const isSelected = answers[qIndex] === opt;
                        const isCorrectOption = opt.charAt(0).toUpperCase() === q.correctAnswer.charAt(0).toUpperCase();
                        let stateClass = "border-slate-300 dark:border-slate-600 hover:border-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700";
                        if (isSubmitted) {
                            if (isCorrectOption) stateClass = "bg-green-100 dark:bg-green-900/60 border-green-500 text-green-800 dark:text-white";
                            else if (isSelected && !isCorrectOption) stateClass = "bg-red-100 dark:bg-red-900/60 border-red-500 text-red-800 dark:text-white";
                            else stateClass = "border-slate-300 dark:border-slate-700 text-slate-500";
                        } else if (isSelected) {
                            stateClass = "border-blue-500 bg-blue-100 dark:bg-blue-900/50";
                        }
                        return <button key={oIndex} onClick={() => !isSubmitted && setAnswers(p => ({ ...p, [qIndex]: opt }))} disabled={isSubmitted} className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${stateClass} disabled:cursor-not-allowed`}>{opt}</button>})}
                    </div>
                    {isSubmitted && q.explanation && <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-sm"><p className="font-bold flex items-center gap-2"><CheckCircle size={16}/> Penjelasan:</p><p className="mt-2 pl-1">{q.explanation}</p><p className="mt-2 pl-1">Jawaban benar: <span className="font-bold text-green-600 dark:text-green-400">{q.correctAnswer}</span></p></div>}
                </div>
            ))}
            <div className="pt-4">{!isSubmitted ? <button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length !== questions.length} className="w-full p-4 mt-6 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all">Kumpulkan Jawaban</button> : <button onClick={() => { setSubmitted(false); setAnswers({}); }} className="w-full p-4 mt-6 font-bold text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition-all">Coba Lagi</button>}</div>
        </div>
    );
};
const Footer = ({ isLanding = false }) => (
    <footer className={`w-full text-center p-8 text-slate-500 dark:text-slate-400 text-sm ${isLanding ? 'relative z-10' : 'mt-auto border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
        <p className="font-semibold text-lg text-slate-700 dark:text-slate-300 mb-2">Sebuah Karya dari</p>
        <p className="text-xl font-bold text-slate-900 dark:text-white">M. Irham Andika Putra</p>
        <p>Owner Bgune Digital & YouTuber "Pernah Mikir?"</p>
        <div className="flex justify-center gap-4 mt-4">
            <a href="https://www.youtube.com/@PernahMikir" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500"><Youtube/></a>
            <a href="https://github.com/irhamp" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500"><Github/></a>
            <a href="https://www.instagram.com/irham_putra07" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500"><Instagram/></a>
        </div>
        <p className="mt-6">Dibuat dengan <Sparkles className="inline h-4 w-4 text-amber-400"/> dan Teknologi AI</p>
    </footer>
);

// --- CSS & STYLING INJECTOR ---
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
    @import url('https://fonts.googleapis.com/css2?family=Open+Sans&family=Lexend:wght@400;700&display=swap');
    
    :root {
        --font-size-multiplier: 1;
        --font-family-default: 'Lexend', sans-serif;
        --font-family-dyslexia: 'Open Sans', sans-serif;
    }
    body, .font-sans {
        font-family: var(--font-family-default);
    }
    .dyslexia-friendly {
        font-family: var(--font-family-dyslexia);
        letter-spacing: 0.5px;
    }

    .font-size-sm { --font-size-multiplier: 0.9; }
    .font-size-base { --font-size-multiplier: 1; }
    .font-size-lg { --font-size-multiplier: 1.1; }
    .font-size-xl { --font-size-multiplier: 1.2; }
    p, span, div, button, input, a, li, h3, h2 {
        font-size: calc(1rem * var(--font-size-multiplier));
    }
    h1 { font-size: calc(2.25rem * var(--font-size-multiplier)); }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.4s ease-in-out; }
    .animate-fadeInUp { animation: fadeInUp 0.4s ease-out forwards; }
    
    @keyframes blob {
      0% { transform: translate(0px, 0px) scale(1); }
      33% { transform: translate(30px, -50px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.9); }
      100% { transform: translate(0px, 0px) scale(1); }
    }
    .animate-blob { animation: blob 7s infinite; }
    .animation-delay-2000 { animation-delay: 2s; }
    .animation-delay-4000 { animation-delay: 4s; }

    @keyframes spin-fast { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .animate-spin-fast { animation: spin-fast 0.5s linear; }

    .no-animations * {
        transition: none !important;
        animation: none !important;
    }

    .aspect-w-16 { position: relative; padding-bottom: 56.25%; }
    .aspect-h-9 { height: 0; }
    .aspect-w-16 > iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
    .line-clamp-2 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
`;
document.head.appendChild(styleSheet);
