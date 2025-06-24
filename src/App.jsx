
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
     