import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { Search, Brain, BookOpen, Youtube, Lightbulb, FileText, ArrowLeft, Loader, Sparkles, AlertTriangle, X, School, FlaskConical, Globe, Calculator, Dna, BarChart2, Drama, Computer, BookHeart, Landmark, Languages, HelpCircle, Atom, CheckCircle, ChevronRight, BrainCircuit, History, BookMarked, Github, Instagram, CalendarDays, Sun, Moon, LogOut, User, Settings, Menu, Info, Newspaper, LayoutDashboard } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- KONFIGURASI PENTING ---
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

// --- Inisialisasi Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- Contexts ---
const AppContext = createContext(null);
const AuthContext = createContext(null);
const ThemeContext = createContext(null);

// --- Custom Hooks ---
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

    const setValue = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`[LocalStorage] Gagal menyimpan data: ${key}`, error);
        }
    };
    return [storedValue, setValue];
}


// --- Penyedia Konteks ---
const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isNewUser, setIsNewUser] = useLocalStorage('bdukasi_is_new_user', true);

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
            // Status isNewUser akan di-handle setelah login
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

const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useLocalStorage('bdukasi-theme', 'dark');
    const [fontSize, setFontSize] = useLocalStorage('bdukasi-font-size', 'base');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        
        // Remove old font size classes
        const fontSizes = ['sm', 'base', 'lg', 'xl'];
        fontSizes.forEach(size => root.classList.remove(`font-size-${size}`));
        
        // Add new font size class
        root.classList.add(`font-size-${fontSize}`);

    }, [theme, fontSize]);

    const toggleTheme = () => setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');

    const value = { theme, toggleTheme, fontSize, setFontSize };
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

const AppProvider = ({ children }) => {
    const [page, setPage] = useState('dashboard'); // Halaman default setelah login
    const [screen, setScreen] = useState('levelSelection'); // Untuk alur belajar
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
    const [modal, setModal] = useState({ type: null, data: null });
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const contextValue = useMemo(() => ({ level, track, subject }), [level, track, subject]);
    const addHistory = useCallback((item) => setHistory(prev => [item, ...prev.filter(h => h.topic !== item.topic)].slice(0, 50)), [setHistory]);
    
    // --- Logika Inti Aplikasi (fetch materi, dll.) ---
    const callGeminiAPI = async (prompt, isJson = true) => {
        console.log("[API Call] Memanggil Gemini API...");
        if (!GEMINI_API_KEY) throw new Error("Kunci API Gemini belum diatur.");
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {}
        };
        if (isJson) { payload.generationConfig.response_mime_type = "application/json"; }

        try {
            const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) { const errorBody = await response.json(); throw new Error(`Permintaan API Gemini gagal: ${errorBody.error?.message || 'Error tidak diketahui'}`); }
            const result = await response.json();
            console.log("[API Success] Respons diterima dari Gemini.");
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("Respons API Gemini tidak valid atau kosong.");
            const cleanedText = text.replace(/^```json\s*|```$/g, '').trim();
            return isJson ? JSON.parse(cleanedText) : cleanedText;
        } catch (error) {
            console.error("[API Exception] Terjadi kesalahan Gemini:", error);
            throw error;
        }
    };

    const fetchYouTubeVideo = async (channelId) => {
        console.log(`[YouTube API Call] Mencari video dari channel: ${channelId}`);
        if (!YOUTUBE_API_KEY) { console.error("[YouTube API] Kunci API YouTube belum diatur."); return null; }
        const YOUTUBE_API_URL = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&order=date&type=video&key=${YOUTUBE_API_KEY}`;
        try {
            const response = await fetch(YOUTUBE_API_URL);
            if (!response.ok) { const errorBody = await response.json(); throw new Error(`Permintaan YouTube API gagal: ${errorBody.error?.message || 'Error tidak diketahui'}`);}
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                const randomVideo = data.items[Math.floor(Math.random() * data.items.length)];
                return {
                    id: randomVideo.id.videoId,
                    title: randomVideo.snippet.title,
                    thumbnail: randomVideo.snippet.thumbnails.high.url
                };
            }
            return null;
        } catch (error) {
            console.error("[YouTube API Exception] Terjadi kesalahan:", error);
            return null;
        }
    };
    
    const fetchLearningMaterial = useCallback(async (searchTopic, isFromHistory = false) => {
        console.log(`[Fetch Materi] Memulai untuk topik: "${searchTopic}"`);
        if (!searchTopic || !contextValue.level || !contextValue.subject) { console.error("[Fetch Materi] Gagal: Konteks tidak lengkap."); return; }
        setIsLoading(true); setLoadingMessage('AI sedang menyusun materi untukmu...'); setError(null);
        setLearningData(null); setPage('belajar'); setScreen('lesson');
        const { level, track, subject } = contextValue;
        if (!isFromHistory) addHistory({ topic: searchTopic, level, track, subjectName: subject.name });

        const geminiPrompt = `Sebagai ahli materi pelajaran, buatkan ringkasan, materi lengkap (format Markdown bersih), dan 5 soal latihan pilihan ganda (A-E) dengan jawaban & penjelasan untuk topik '${searchTopic}' pelajaran '${subject.name}' tingkat ${level} ${track ? `jurusan ${track}`: ''}. Respons HANYA dalam format JSON: {"ringkasan": "...", "materi_lengkap": "...", "latihan_soal": [{"question": "...", "options": [...], "correctAnswer": "A", "explanation": "..."}]}`;

        try {
            const geminiData = await callGeminiAPI(geminiPrompt);
            setLearningData({ topic: searchTopic, ...geminiData });
            console.log("[Fetch Materi] Sukses, data materi diatur.");
        } catch (err) {
            console.error("[Fetch Materi] Error:", err);
            setError(`Gagal memuat materi: ${err.message}. Coba lagi nanti.`);
            setPage('dashboard');
        } finally {
            setIsLoading(false);
        }
    }, [contextValue, addHistory]);

    const fetchRecommendations = useCallback(async () => {
        if (!contextValue.level || !contextValue.subject) return;
        const { level, track, subject } = contextValue;
        const prompt = `Berikan 5 rekomendasi topik menarik untuk mata pelajaran "${subject.name}" level ${level} ${track ? `jurusan ${track}`: ''}. Jawab HANYA dalam format JSON array string. Contoh: ["Topik 1", "Topik 2"]`;
        try { const recs = await callGeminiAPI(prompt); setRecommendations(Array.isArray(recs) ? recs : []); } catch (err) { console.error("Gagal fetch rekomendasi:", err); }
    }, [contextValue]);

    const fetchBankSoal = useCallback(async (topic, count) => {
        if (!topic || !contextValue.level || !contextValue.subject || !count) { setError("Harap masukkan topik dan jumlah soal."); return; }
        setIsLoading(true); setLoadingMessage(`AI sedang membuat ${count} soal untukmu...`); setError(null);
        const { level, track, subject } = contextValue;
        const prompt = `Buatkan ${count} soal pilihan ganda (A-E) tentang '${topic}' untuk pelajaran '${subject.name}' level ${level} ${track ? `jurusan ${track}` : ''}. Sertakan jawaban & penjelasan. Respons HANYA dalam format JSON array objek: [{"question": "...", "options": [...], "correctAnswer": "A", "explanation": "..."}]`;
        try {
            const soal = await callGeminiAPI(prompt);
            setBankSoal(Array.isArray(soal) ? soal : []);
            setPage('belajar'); setScreen('bankSoal');
        } catch(err) { setError(`Gagal membuat bank soal: ${err.message}`); setPage('dashboard'); } finally { setIsLoading(false); }
    }, [contextValue]);

    const value = { page, setPage, screen, setScreen, level, setLevel, track, setTrack, subject, setSubject, learningData, recommendations, fetchRecommendations, bankSoal, fetchBankSoal, isLoading, error, setError, history, fetchLearningMaterial, modal, setModal, fetchYouTubeVideo, loadingMessage, isSidebarOpen, setSidebarOpen };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// --- Komponen Utama Aplikasi ---
export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AppProvider>
                    <MainApp />
                </AppProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

const MainApp = () => {
    const { user, loading, isNewUser, setIsNewUser } = useContext(AuthContext);
    const { page, setPage } = useContext(AppContext);
    const { theme } = useContext(ThemeContext);

    useEffect(() => {
        // Ketika user sudah login dan isNewUser masih true
        if (user && isNewUser) {
            setPage('informasi');
        }
    }, [user, isNewUser, setPage]);

    if (loading) {
        return <LoadingSpinner message="Memuat aplikasi..." />;
    }

    if (!user) {
        // Tampilkan landing page jika belum login
        return <LandingPage />;
    }
    
    // Alur untuk user yang sudah login
    const pages = {
        'informasi': <InfoPage />,
        'dashboard': <DashboardPage />,
        'belajar': <LearningFlow />,
        'akun': <AccountPage />,
        'pembaruan': <UpdateLogPage />,
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen font-sans transition-colors duration-300">
             <div className="md:flex">
                <Sidebar />
                <div className="flex-1">
                    <Navbar />
                    <main className="p-4 sm:p-6 lg:p-8">
                        {pages[page] || <DashboardPage />}
                    </main>
                </div>
            </div>
            <ModalContainer />
        </div>
    );
}

// --- Halaman-Halaman Utama (7 Halaman) ---

const LandingPage = () => {
    const { loginWithGoogle } = useContext(AuthContext);
    return (
        <div className="bg-white dark:bg-gray-900 min-h-screen flex flex-col">
            <div className="absolute inset-0 bg-grid-pattern opacity-10 dark:opacity-20"></div>
            <div className="relative container mx-auto px-6 flex-grow flex flex-col justify-center items-center text-center">
                <Brain className="w-24 h-24 text-blue-500 mb-4" />
                <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white">
                    Selamat Datang di <span className="text-blue-500">Bdukasi</span>
                </h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
                    Revolusi Belajar dengan Guru AI Pribadi. Kurikulum ter-update, materi lengkap, dan siap temani perjalanan belajarmu.
                </p>
                <div className="mt-8">
                    <button onClick={loginWithGoogle} className="px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-full shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-300 flex items-center gap-3">
                        <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.19,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.19,22C17.6,22 21.54,18.33 21.54,12.81C21.54,11.76 21.45,11.44 21.35,11.1Z"></path></svg>
                        Mulai Belajar dengan Google
                    </button>
                </div>
            </div>
            <Footer />
        </div>
    );
};

// LoginWithGoogle digabung dalam alur LandingPage

const InfoPage = () => {
    const { setPage } = useContext(AppContext);
    const { setIsNewUser } = useContext(AuthContext);

    const handleProceed = () => {
        setIsNewUser(false); // Tandai user bukan baru lagi
        setPage('dashboard');
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
            <div className="max-w-3xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                <h1 className="text-3xl font-bold text-center mb-6 text-blue-500">Informasi Penting Untukmu</h1>
                <div className="space-y-4 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                    <p><strong>Selamat datang di Bdukasi!</strong> Kami sangat senang Anda bergabung. Aplikasi ini dirancang oleh <strong>M. Irham Andika Putra</strong> dan tim <strong>Bgune Digital</strong> untuk menjadi teman belajar terbaik bagi pelajar Indonesia.</p>
                    <p><strong>Keamanan Data Anda Prioritas Kami.</strong> Kami menggunakan sistem autentikasi dari Google (Firebase) yang aman. Data profil Anda hanya digunakan untuk personalisasi pengalaman belajar dan tidak akan dibagikan ke pihak lain.</p>
                    <p><strong>Bagaimana AI Bekerja?</strong> Guru virtual kami didukung oleh teknologi AI canggih dari Google (Gemini). AI ini dilatih untuk memberikan penjelasan materi, membuat soal, dan menjawab pertanyaanmu sesuai kurikulum yang berlaku di Indonesia.</p>
                    <p>Kami berkomitmen untuk terus mengembangkan Bdukasi agar menjadi lebih baik. Selamat belajar dan mari raih prestasimu!</p>
                </div>
                <div className="text-center mt-8">
                    <button onClick={handleProceed} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors">
                        Saya Mengerti, Lanjutkan ke Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

const DashboardPage = () => {
    const { setPage } = useContext(AppContext);
    const { fetchYouTubeVideo } = useContext(AppContext);
    const { user } = useContext(AuthContext);
    const [video, setVideo] = useState(null);

    useEffect(() => {
        const channelId = "UC_Qc0st3N12HkP3y21pMUcw"; // ID Channel Pernah Mikir
        fetchYouTubeVideo(channelId).then(setVideo);
    }, [fetchYouTubeVideo]);

    return (
        <AnimatedScreen key="dashboard">
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">Selamat datang kembali, {user?.displayName || 'Pelajar Hebat'}!</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <DashboardCard icon={<BrainCircuit size={32} />} title="Mulai Belajar" description="Pilih jenjang & mata pelajaran." onClick={() => { setPage('belajar'); }} />
                <DashboardCard icon={<BookMarked size={32} />} title="Bank Soal" description="Pindah ke halaman belajar." onClick={() => { setPage('belajar'); }} />
                <DashboardCard icon={<Sparkles size={32} />} title="Tanya Segalanya" description="Fitur Chat AI (segera hadir)." onClick={() => {}} disabled={true} />
            </div>

            <h2 className="text-2xl font-bold mb-4">Inspirasi Hari Ini dari Pernah Mikir?</h2>
            {video ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                     <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer">
                        <img src={video.thumbnail} alt={video.title} className="w-full h-auto object-cover" />
                        <div className="p-4">
                            <h3 className="font-bold text-lg">{video.title}</h3>
                        </div>
                    </a>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center">
                    <Loader className="animate-spin mx-auto mb-4" />
                    <p>Sedang memuat video inspirasi...</p>
                </div>
            )}
            <Footer />
        </AnimatedScreen>
    );
};

const AccountPage = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggleTheme, fontSize, setFontSize } = useContext(ThemeContext);

    const fontOptions = [
        { value: 'sm', label: 'Kecil' },
        { value: 'base', label: 'Normal' },
        { value: 'lg', label: 'Besar' },
        { value: 'xl', label: 'Sangat Besar' }
    ];

    return (
        <AnimatedScreen key="akun">
            <h1 className="text-3xl font-bold mb-8">Akun & Pengaturan</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Info Akun */}
                <InfoCard icon={<User size={24} />} title="Informasi Akun">
                    <div className="flex items-center space-x-4">
                        <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}&background=random`} alt="User Avatar" className="w-20 h-20 rounded-full" />
                        <div>
                            <h3 className="text-xl font-bold">{user?.displayName}</h3>
                            <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
                        </div>
                    </div>
                     <button onClick={logout} className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">
                        <LogOut size={18} /> Logout
                    </button>
                </InfoCard>

                {/* Pengaturan */}
                <InfoCard icon={<Settings size={24} />} title="Pengaturan Tampilan">
                    <div className="space-y-6">
                        {/* Mode Terang/Gelap */}
                        <div className="flex items-center justify-between">
                            <label className="font-semibold">Mode Tampilan</label>
                            <button onClick={toggleTheme} className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-full font-semibold">
                                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                                {theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
                            </button>
                        </div>

                        {/* Ukuran Font */}
                        <div>
                            <label className="font-semibold block mb-2">Ukuran Font</label>
                            <div className="flex flex-wrap gap-2">
                                {fontOptions.map(opt => (
                                    <button key={opt.value} onClick={() => setFontSize(opt.value)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${fontSize === opt.value ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
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
    // Ini akan merender alur belajar yang sudah ada
    return <ScreenContainer />;
}

const UpdateLogPage = () => {
    const updates = [
        { version: "v2.0.0", date: "24 Juni 2025", changes: [
            "Perombakan total UI/UX menjadi lebih modern, bersih, dan profesional.",
            "Penambahan Landing Page baru.",
            "Implementasi sistem login dengan Google (Firebase Authentication).",
            "Penambahan halaman Dashboard dengan tombol akses cepat dan video inspirasi dari channel 'Pernah Mikir?'.",
            "Penambahan halaman Akun & Pengaturan (Mode Terang/Gelap, Ukuran Font, Logout).",
            "Penambahan halaman Informasi untuk pengguna baru.",
            "Penambahan halaman Log Pembaruan ini.",
            "Peningkatan responsivitas untuk semua perangkat (mobile-friendly).",
            "Optimisasi pemanggilan API dan penanganan loading state."
        ]},
        { version: "v1.0.0", date: "Awal 2025", changes: ["Rilis awal aplikasi Bdukasi Expert."] },
    ];
    
    return (
        <AnimatedScreen key="pembaruan">
            <h1 className="text-3xl font-bold mb-8">Log Pembaruan Aplikasi</h1>
            <div className="space-y-8">
                {updates.map(update => (
                    <InfoCard key={update.version} icon={<Newspaper size={24} />} title={`Versi ${update.version} - ${update.date}`}>
                       <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                           {update.changes.map((change, index) => (
                               <li key={index}>{change}</li>
                           ))}
                       </ul>
                    </InfoCard>
                ))}
            </div>
        </AnimatedScreen>
    );
}

// --- Komponen UI Pendukung ---
const iconMap = { School, Brain, BookOpen, Youtube, Lightbulb, FileText, ArrowLeft, Loader, Sparkles, AlertTriangle, X, FlaskConical, Globe, Calculator, Dna, BarChart2, Drama, Computer, BookHeart, Landmark, Languages, HelpCircle, Atom, CheckCircle, ChevronRight, BrainCircuit, History, BookMarked, Github, Instagram, CalendarDays };
const curriculum = { 'SD': { subjects: [{ name: 'Matematika', iconName: 'Calculator' }, { name: 'IPAS', iconName: 'Globe' }, { name: 'Pendidikan Pancasila', iconName: 'Landmark' }, { name: 'Bahasa Indonesia', iconName: 'BookHeart' }] }, 'SMP': { subjects: [{ name: 'Matematika', iconName: 'Calculator' }, { name: 'IPA Terpadu', iconName: 'FlaskConical' }, { name: 'IPS Terpadu', iconName: 'Globe' }, { name: 'Pendidikan Pancasila', iconName: 'Landmark'}, { name: 'Bahasa Indonesia', iconName: 'BookHeart' }, { name: 'Bahasa Inggris', iconName: 'Languages' }, { name: 'Informatika', iconName: 'Computer' }] }, 'SMA': { tracks: { 'IPA': [{ name: 'Matematika Peminatan', iconName: 'Calculator' }, { name: 'Fisika', iconName: 'Atom' }, { name: 'Kimia', iconName: 'FlaskConical' }, { name: 'Biologi', iconName: 'Dna' }], 'IPS': [{ name: 'Ekonomi', iconName: 'BarChart2' }, { name: 'Geografi', iconName: 'Globe' }, { name: 'Sosiologi', iconName: 'School' }], 'Bahasa': [{ name: 'Sastra Indonesia', iconName: 'BookHeart' }, { name: 'Sastra Inggris', iconName: 'Drama' }, { name: 'Antropologi', iconName: 'Globe' }, { name: 'Bahasa Asing', iconName: 'Languages' }] } } };
const AnimatedScreen = ({ children, customKey }) => <div key={customKey} className="animate-fadeIn">{children}</div>;
const DashboardCard = ({ icon, title, description, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled} className={`p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md text-left transform hover:-translate-y-1 transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}`}>
        <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-500 rounded-lg">{icon}</div>
            <div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400">{description}</p>
            </div>
        </div>
    </button>
);
const Navbar = () => {
    const { setSidebarOpen } = useContext(AppContext);
    return (
        <header className="sticky top-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md z-10 border-b border-gray-200 dark:border-gray-700 md:hidden">
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
        { id: 'akun', label: 'Akun & Setting', icon: <User size={20} /> },
    ];

    const NavLink = ({ item }) => (
         <button 
            onClick={() => { setPage(item.id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${page === item.id ? 'bg-blue-500 text-white font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
            {item.icon}
            <span>{item.label}</span>
        </button>
    );

    return (
        <>
            {/* Overlay for mobile */}
            <div onClick={() => setSidebarOpen(false)} className={`fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div>

            <aside className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col z-30 transition-transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

// --- Komponen Alur Belajar (yang sudah ada, disesuaikan) ---
const ScreenContainer = () => {
    const { screen, isLoading, loadingMessage } = useContext(AppContext);
    if (isLoading) return <LoadingSpinner message={loadingMessage} />;
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

const DynamicIcon = ({ name, ...props }) => { const IconComponent = iconMap[name]; return IconComponent ? <IconComponent {...props} /> : <HelpCircle {...props} />; };
const BackButton = ({ onClick }) => <button onClick={onClick} className="flex items-center gap-2 text-blue-500 font-semibold hover:underline mb-8"><ArrowLeft size={20} /> Kembali</button>;
const InfoCard = ({ icon, title, children, className = '' }) => <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-md overflow-hidden ${className} animate-fadeInUp`}><div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">{icon && <div className="text-blue-500">{React.cloneElement(icon, { size: 24 })}</div>}<h2 className="text-xl font-bold">{title}</h2></div><div className="p-4 sm:p-6">{children}</div></div>;
const LoadingSpinner = ({ message }) => <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900 fixed inset-0 z-50"><Loader className="w-16 h-16 text-blue-500 animate-spin" /><p className="text-xl font-semibold mt-6 text-center max-w-md">{message || 'Memuat...'}</p></div>;
const ErrorMessage = ({ message }) => <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-r-lg mt-4 w-full flex items-center gap-4"><AlertTriangle className="h-6 w-6 text-red-500" /><p className="font-bold">{message}</p></div>;

const LevelSelectionScreen = () => {
    const { setScreen, setLevel, setPage } = useContext(AppContext);
    return (
        <AnimatedScreen customKey="level">
            <div className="text-center pt-8">
                <BackButton onClick={() => setPage('dashboard')} />
                <School className="w-24 h-24 mx-auto text-blue-500" />
                <h1 className="text-4xl font-bold mt-4">Pilih Jenjang Pendidikan</h1>
                <p className="text-xl text-gray-500 dark:text-gray-400 mt-2 mb-12">Pilih jenjangmu untuk memulai petualangan belajar.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    {Object.keys(curriculum).map((lvl) => <button key={lvl} onClick={() => { setLevel(lvl); setScreen(lvl === 'SMA' ? 'trackSelection' : 'subjectSelection'); }} className="p-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-md hover:shadow-blue-500/20 hover:border-blue-500 hover:-translate-y-2 transition-all text-2xl font-bold flex flex-col items-center justify-center gap-4 cursor-pointer">{lvl}</button>)}
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
                    {Object.keys(curriculum.SMA.tracks).map((trackName) => <button key={trackName} onClick={() => { setTrack(trackName); setScreen('subjectSelection'); }} className="p-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-md hover:shadow-blue-500/20 hover:border-blue-500 hover:-translate-y-2 transition-all text-2xl font-bold">{trackName}</button>)}
                </div>
            </div>
        </AnimatedScreen>
    );
};

const SubjectSelectionScreen = () => {
    const { level, track, setScreen, setSubject } = useContext(AppContext);
    const subjects = level === 'SMA' ? curriculum.SMA.tracks[track] : curriculum[level]?.subjects;
    const backScreen = level === 'SMA' ? 'trackSelection' : 'levelSelection';

    if (!subjects) {
        return <div className="text-center"><p>Gagal memuat mata pelajaran. Silakan kembali.</p><BackButton onClick={() => setScreen(backScreen)} /></div>
    }

    return (
        <AnimatedScreen customKey="subject">
             <BackButton onClick={() => setScreen(backScreen)} />
            <div className="pt-8">
                 <h1 className="text-4xl font-bold mb-12 text-center">Pilih Mata Pelajaran</h1>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
                    {subjects.map((s, index) => <button key={s.name} onClick={() => { setSubject(s); setScreen('subjectDashboard'); }} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-center hover:border-blue-500 hover:-translate-y-1 transition-all aspect-square shadow-md"><DynamicIcon name={s.iconName} size={48} className="text-blue-500" /><span className="font-semibold text-sm text-center mt-3">{s.name}</span></button>)}
                </div>
            </div>
        </AnimatedScreen>
    );
};

const SubjectDashboardScreen = () => {
    const { subject, fetchLearningMaterial, fetchRecommendations, recommendations, error, setError, history, setScreen } = useContext(AppContext);
    const [inputValue, setInputValue] = useState('');
    const [activeTab, setActiveTab] = useState('rekomendasi');

    useEffect(() => { if (subject && recommendations.length === 0) fetchRecommendations(); }, [subject, fetchRecommendations, recommendations.length]);

    if (!subject) return <div className="text-center">Harap pilih mata pelajaran terlebih dahulu. <BackButton onClick={() => setScreen('subjectSelection')} /></div>;

    const filteredHistory = history.filter(h => h.subjectName === subject.name);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if(inputValue.trim()) { setError(null); fetchLearningMaterial(inputValue); } else { setError("Topik pencarian tidak boleh kosong."); }
    };

    return (
        <AnimatedScreen customKey="dashboard">
            <BackButton onClick={() => setScreen('subjectSelection')} />
            <div className="text-center pt-8"><DynamicIcon name={subject.iconName} size={80} className="text-blue-500 mx-auto mb-4" /><h1 className="text-4xl font-bold">Mata Pelajaran: {subject.name}</h1></div>
            <div className="w-full max-w-2xl mx-auto my-12">
                <form onSubmit={handleSearchSubmit} className="relative">
                    <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ketik topik untuk dipelajari..." className="w-full pl-6 pr-16 py-4 text-lg bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-full focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"/>
                    <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-transform active:scale-95"><Search className="w-6 h-6" /></button>
                </form>
                 {error && <ErrorMessage message={error} />}
            </div>
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-center border-b border-gray-300 dark:border-gray-700 mb-6 flex-wrap">{['rekomendasi', 'riwayat', 'bank_soal'].map(tab => <TabButton key={tab} icon={{rekomendasi: <Sparkles/>, riwayat: <History/>, bank_soal: <BrainCircuit/>}[tab]} text={{rekomendasi: "Rekomendasi", riwayat: "Riwayat", bank_soal: "Bank Soal"}[tab]} isActive={activeTab===tab} onClick={() => setActiveTab(tab)}/>)}</div>
                <div className="animate-fadeInUp">
                    {activeTab === 'rekomendasi' && (recommendations.length > 0 ? <div className="grid md:grid-cols-2 gap-4">{recommendations.map((rec,i)=>(<ListItem key={i} text={rec} onClick={()=>fetchLearningMaterial(rec)}/>))}</div> : <p className="text-center text-gray-500">Tidak ada rekomendasi topik.</p>)}
                    {activeTab === 'riwayat' && (filteredHistory.length > 0 ? <div className="grid md:grid-cols-2 gap-4">{filteredHistory.map((h,i)=>(<ListItem key={i} text={h.topic} onClick={()=>fetchLearningMaterial(h.topic, true)}/>))}</div> : <p className="text-center text-gray-500">Belum ada riwayat belajar.</p>)}
                    {activeTab === 'bank_soal' && <BankSoalGenerator />}
                </div>
            </div>
        </AnimatedScreen>
    );
};

const BankSoalGenerator = () => {
    const { fetchBankSoal, setError } = useContext(AppContext);
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(5);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!topic.trim()) { setError("Topik soal tidak boleh kosong."); return; }
        if (count < 1 || count > 20) { setError("Jumlah soal harus antara 1 dan 20."); return; }
        setError(null); fetchBankSoal(topic, count);
    };

    return (
        <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-center mb-4">🎯 Bank Soal Berbasis Topik</h3>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-4">Masukkan topik spesifik dan jumlah soal.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder='Contoh: Perang Diponegoro' className='w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500' />
                <div className="flex flex-col sm:flex-row gap-4">
                    <input type="number" value={count} onChange={e => setCount(parseInt(e.target.value, 10))} min="1" max="20" className='w-full sm:w-1/3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500' />
                    <button type="submit" className="w-full sm:w-2/3 p-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500">Buatkan Soal!</button>
                </div>
            </form>
        </div>
    );
}

const TabButton = ({icon, text, isActive, onClick}) => <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 sm:px-6 font-semibold border-b-2 transition-all ${isActive ? 'text-blue-500 border-blue-500' : 'text-gray-500 border-transparent hover:text-blue-500'}`}>{React.cloneElement(icon, {size: 20})} <span className="hidden sm:inline">{text}</span></button>;
const ListItem = ({text, onClick}) => <button onClick={onClick} className="w-full text-left flex justify-between items-center p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 rounded-lg transition-all"><span className="font-semibold">{text}</span><ChevronRight /></button>;

const LearningMaterialScreen = () => {
    const { learningData, setScreen } = useContext(AppContext);
    if (!learningData) return <div className="text-center p-8">Materi tidak ditemukan. <button onClick={() => setScreen('subjectDashboard')} className="text-blue-500 underline">Kembali</button></div>;
    const { topic, ringkasan, materi_lengkap, latihan_soal } = learningData;

    return (
        <AnimatedScreen customKey="lesson">
            <BackButton onClick={() => setScreen('subjectDashboard')} />
            <div className="space-y-8 pt-8">
                <h1 className="text-3xl sm:text-5xl font-bold text-center text-blue-500">{topic}</h1>
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

const QuizPlayer = ({ questions }) => {
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
                        let stateClass = "border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700";
                        if (isSubmitted) {
                            if (isCorrectOption) stateClass = "bg-green-100 dark:bg-green-900/60 border-green-500 text-green-800 dark:text-white";
                            else if (isSelected && !isCorrectOption) stateClass = "bg-red-100 dark:bg-red-900/60 border-red-500 text-red-800 dark:text-white";
                            else stateClass = "border-gray-300 dark:border-gray-700 text-gray-500";
                        } else if (isSelected) {
                            stateClass = "border-blue-500 bg-blue-100 dark:bg-blue-900/50";
                        }
                        return <button key={oIndex} onClick={() => !isSubmitted && setAnswers(p => ({ ...p, [qIndex]: opt }))} disabled={isSubmitted} className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${stateClass} disabled:cursor-not-allowed`}>{opt}</button>})}
                    </div>
                    {isSubmitted && q.explanation && <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-sm"><p className="font-bold flex items-center gap-2"><CheckCircle size={16}/> Penjelasan:</p><p className="mt-2 pl-1">{q.explanation}</p><p className="mt-2 pl-1">Jawaban benar: <span className="font-bold text-green-600">{q.correctAnswer}</span></p></div>}
                </div>
            ))}
            <div className="pt-4">{!isSubmitted ? <button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length !== questions.length} className="w-full p-4 mt-6 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all">Kumpulkan Jawaban</button> : <button onClick={() => { setSubmitted(false); setAnswers({}); }} className="w-full p-4 mt-6 font-bold text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-all">Coba Lagi</button>}</div>
        </div>
    );
};


const Footer = () => (
    <footer className="w-full text-center p-8 mt-auto text-gray-500 dark:text-gray-400 text-sm border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="font-semibold text-lg text-gray-700 dark:text-gray-300 mb-2">Sebuah Karya dari</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">M. Irham Andika Putra</p>
        <p>Owner Bgune Digital & YouTuber "Pernah Mikir?"</p>
        <div className="flex justify-center gap-4 mt-4">
            <a href="https://www.youtube.com/@PernahMikir" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500"><Youtube/></a>
            <a href="https://github.com/irhamp" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500"><Github/></a>
            <a href="https://www.instagram.com/irham_putra07" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500"><Instagram/></a>
        </div>
        <p className="mt-6">Dibuat dengan <Sparkles className="inline h-4 w-4 text-yellow-400"/> dan Teknologi AI</p>
    </footer>
);

// --- Modal & CSS Injector ---
const ModalContainer = () => { /* ... Logika Modal jika diperlukan ... */ return null; };

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
    :root {
        --font-size-multiplier: 1;
    }
    .font-size-sm { --font-size-multiplier: 0.875; }
    .font-size-base { --font-size-multiplier: 1; }
    .font-size-lg { --font-size-multiplier: 1.125; }
    .font-size-xl { --font-size-multiplier: 1.25; }

    body, p, span, div, button, input, a {
        font-size: calc(1rem * var(--font-size-multiplier));
    }
    h1 { font-size: calc(2.25rem * var(--font-size-multiplier)); }
    h2 { font-size: calc(1.5rem * var(--font-size-multiplier)); }
    h3 { font-size: calc(1.25rem * var(--font-size-multiplier)); }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.5s ease-in-out; }
    .animate-fadeInUp { animation: fadeInUp 0.5s ease-out forwards; }
    .bg-grid-pattern { background-image: linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px); background-size: 2rem 2rem; }
    .dark .bg-grid-pattern { background-image: linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px); }
    .prose a { color: #3b82f6; }
    .dark .prose-invert a { color: #60a5fa; }
    .prose h1, .prose h2, .prose h3 { margin-bottom: 0.5em; }
    .prose p { margin-bottom: 1em; }
`;
document.head.appendChild(styleSheet);
