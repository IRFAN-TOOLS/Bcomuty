import React, { useState, useEffect, createContext, useContext, useCallback, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
    getFirestore, collection, doc, onSnapshot, addDoc, deleteDoc, updateDoc, getDocs, writeBatch, serverTimestamp, setDoc, query, where, getDoc
} from 'firebase/firestore';
import { 
    Search, Brain, BookOpen, Youtube, Lightbulb, FileText, ArrowLeft, Loader, Sparkles, 
    AlertTriangle, X, School, FlaskConical, Globe, Calculator, Dna, BarChart2, Drama,
    Computer, BookHeart, Landmark, Languages, HelpCircle, Atom, CheckCircle, ChevronRight, 
    BrainCircuit, History, BookMarked, Github, Instagram, Server, Users, Video, Trash2, Edit,
    PlusCircle, Terminal, Power, PowerOff, LayoutDashboard, Settings, User, LogOut, Moon, Sun, 
    Newspaper, Menu, Download, ShieldCheck, Info, MessageSquare, Award, Trophy, Users2, BrainCog,
    Wind, Text, Palette, ArrowUpRight, Save, Languages as TranslateIcon, Minimize2, WifiOff,
    SendHorizonal, Bot, UserCircle, Tv, ToggleLeft, ToggleRight, Check, Eye, EyeOff, Filter, 
    BarChartHorizontal, TrendingUp, BookCheck, Timer, RefreshCw, Gamepad2, Music
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- KONFIGURASI PENTING & API KEYS ---
// CATATAN: Ganti dengan kunci Anda sendiri di environment produksi.
const GEMINI_API_KEY = "MASUKKAN_API_KEY_GEMINI_ANDA";
const YOUTUBE_API_KEY = "MASUKKAN_API_KEY_YOUTUBE_ANDA";

const firebaseConfig = {
    apiKey: "AIzaSyANQqaFwrsf3xGSDxyn9pcRJqJrIiHrjM0", // GANTI DENGAN API KEY ANDA
    authDomain: "bgune---community.firebaseapp.com",
    projectId: "bgune---community",
    storageBucket: "bgune---community.appspot.com",
    messagingSenderId: "749511144215",
    appId: "1:749511144215:web:dcf13c4d59dc705d4f7d52",
    measurementId: "G-5XRSG2H5SV"
};

// --- DAFTAR AKUN DEVELOPER ---
const DEV_ACCOUNTS = ['bgune@admin.com', 'irhamdika00@gmail.com']; 

// --- INISIALISASI FIREBASE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- KONTEKS APLIKASI ---
const AuthContext = createContext(null);
const SettingsContext = createContext(null);
const AppContext = createContext(null);
const DevContext = createContext(null);

// --- KUTIPAN MOTIVASI ---
const motivationalQuotes = [
    "Pendidikan adalah senjata paling ampuh yang bisa kamu gunakan untuk mengubah dunia. - Nelson Mandela",
    "Satu-satunya sumber pengetahuan adalah pengalaman. - Albert Einstein",
    "Belajar tidak pernah melelahkan pikiran. - Leonardo da Vinci",
    "Masa depan adalah milik mereka yang mempersiapkannya hari ini. - Malcolm X",
    "Jangan takut tumbuh lambat, takutlah hanya berdiri diam.",
    "Semakin banyak kamu membaca, semakin banyak hal yang akan kamu ketahui. Semakin banyak kamu belajar, semakin banyak tempat yang akan kamu kunjungi. - Dr. Seuss"
];

// --- LOGO APLIKASI ---
const APP_LOGO_URL = "https://lh3.googleusercontent.com/u/0/d/1x9XzTfUe64N2dzTrYOdF05Ncl67d9Dcn";

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
    
    const removeItem = useCallback(() => {
        try {
            window.localStorage.removeItem(key);
        } catch (error) {
            console.error(`[LocalStorage] Gagal menghapus data: ${key}`, error);
        }
    }, [key]);

    return [storedValue, setValue, removeItem];
}

function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);
    const [canInstall, setCanInstall] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setCanInstall(true); 
        };

        const checkInstalled = () => {
             if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
                setIsAppInstalled(true);
                setCanInstall(false);
            }
        };

        checkInstalled();
        window.addEventListener('appinstalled', () => {
            setIsAppInstalled(true);
            setCanInstall(false);
        });
        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', () => {});
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
            setCanInstall(false);
        }
    }, [deferredPrompt]);

    return { triggerInstall, canInstall, isAppInstalled };
}


// --- PENYEDIA KONTEKS (PROVIDERS) ---

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDeveloper, setIsDeveloper] = useState(false);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userRef);
                
                if (!userDoc.exists()) {
                    const newUserdata = {
                        uid: currentUser.uid,
                        displayName: currentUser.displayName,
                        email: currentUser.email,
                        photoURL: currentUser.photoURL,
                        createdAt: serverTimestamp(),
                        lastLogin: serverTimestamp(),
                        studyTime: 0, 
                    };
                    await setDoc(userRef, newUserdata);
                    setUserData(newUserdata);
                } else {
                    await updateDoc(userRef, { lastLogin: serverTimestamp() });
                    setUserData(userDoc.data());
                }
                
                setUser(currentUser);
                setIsDeveloper(DEV_ACCOUNTS.includes(currentUser.email));
            } else {
                setUser(null);
                setIsDeveloper(false);
                setUserData(null);
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

    const value = { user, userData, loading, loginWithGoogle, logout, isDeveloper };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const SettingsProvider = ({ children }) => {
    const [theme, setTheme, removeTheme] = useLocalStorage('bdukasi-theme-v3', 'system');
    const [fontSize, setFontSize, removeFontSize] = useLocalStorage('bdukasi-font-size-v3', 'base');
    const [language, setLanguage, removeLanguage] = useLocalStorage('bdukasi-language-v3', 'id');
    const [dyslexiaFont, setDyslexiaFont, removeDyslexiaFont] = useLocalStorage('bdukasi-dyslexia-v3', false);

    const activeTheme = useMemo(() => {
        if (theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
    }, [theme]);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(activeTheme);
    }, [activeTheme]);
    
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme === 'system') {
                const newTheme = mediaQuery.matches ? 'dark' : 'light';
                const root = window.document.documentElement;
                root.classList.remove('light', 'dark');
                root.classList.add(newTheme);
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);


    useEffect(() => {
        const root = window.document.documentElement;
        ['sm', 'base', 'lg', 'xl'].forEach(size => root.classList.remove(`font-size-${size}`));
        root.classList.add(`font-size-${fontSize}`);
        root.classList.toggle('dyslexia-friendly', dyslexiaFont);
    }, [fontSize, dyslexiaFont]);
    
    const resetSettings = () => {
        removeTheme();
        removeFontSize();
        removeLanguage();
        removeDyslexiaFont();
        window.location.reload();
    };

    const value = { theme, setTheme, activeTheme, fontSize, setFontSize, language, setLanguage, dyslexiaFont, setDyslexiaFont, resetSettings };
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

const DevProvider = ({ children }) => {
    const [recVideos, setRecVideos] = useState([]);
    const [stats, setStats] = useState({ users: 0, materials: 0, questions: 0, totalStudyTime: 0 });
    const [logs, setLogs] = useState([`[${new Date().toLocaleTimeString()}] [SYSTEM] Developer console initialized.`]);
    const [featureFlags, setFeatureFlags] = useState({});
    const [loading, setLoading] = useState(true);

    const addLog = useCallback((message, type = 'INFO') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] [${type}] ${message}`, ...prev].slice(-100));
    }, []);

    useEffect(() => {
        addLog("Initializing Developer Context...", "SYSTEM");

        const unsubscribers = [
            onSnapshot(collection(db, "recommended_videos"), (snapshot) => {
                const fetchedVideos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRecVideos(fetchedVideos);
                addLog(`Fetched ${fetchedVideos.length} recommended videos.`, "DB");
            }, error => addLog(`Recommended video fetch failed: ${error.message}`, "ERROR")),
            
            onSnapshot(doc(db, "dev_stats", "main"), (doc) => {
                if (doc.exists()) {
                    setStats(s => ({ ...s, ...doc.data() }));
                    addLog("Live stats updated.", "DB");
                } else {
                     addLog("Stats document not found.", "DB-WARN");
                }
            }, error => addLog(`Stats fetch failed: ${error.message}`, "ERROR")),

            onSnapshot(doc(db, "dev_feature_flags", "main"), (doc) => {
                if(doc.exists()){
                    setFeatureFlags(f => ({...f, ...doc.data()}));
                    addLog("Feature flags loaded.", "DB");
                } else {
                    addLog("Feature flags document not found. Using defaults.", "DB-WARN");
                    setDoc(doc(db, "dev_feature_flags", "main"), {
                        aiAvatar: true,
                        peringkat: true,
                        gameRingan: false,
                        backgroundAudio: false,
                        darkModeDefault: false
                    });
                }
            }, error => addLog(`Flags fetch failed: ${error.message}`, "ERROR")),

            onSnapshot(collection(db, "users"), (snapshot) => {
                setStats(prev => ({...prev, users: snapshot.size}));
            }, error => addLog(`User count fetch failed: ${error.message}`, "ERROR"))
        ];

        setLoading(false);

        return () => {
            unsubscribers.forEach(unsub => unsub());
            addLog("Developer Context cleaned up.", "SYSTEM");
        };
    }, [addLog]);

    const crudRecommendedVideo = async (action, payload) => {
        const collectionRef = collection(db, "recommended_videos");
        try {
            if (action === 'add') {
                await addDoc(collectionRef, { ...payload, status: 'active', created_at: serverTimestamp() });
                addLog(`Recommended video added: ${payload.title}`, "SUCCESS");
            } else if (action === 'update') {
                await updateDoc(doc(db, "recommended_videos", payload.id), payload.data);
                addLog(`Recommended video ${payload.id} updated.`, "CONFIG");
            } else if (action === 'delete') {
                await deleteDoc(doc(db, "recommended_videos", payload.id));
                addLog(`Recommended video ${payload.id} deleted.`, "CONFIG");
            }
        } catch (error) {
            addLog(`Recommended video operation '${action}' failed: ${error.message}`, "ERROR");
        }
    };
    
    const toggleFeatureFlag = async (featureKey) => {
        const flagsRef = doc(db, "dev_feature_flags", "main");
        const newValue = !featureFlags[featureKey];
        try {
            await updateDoc(flagsRef, { [featureKey]: newValue });
            addLog(`Feature '${featureKey}' is now ${newValue ? 'ACTIVE' : 'INACTIVE'}.`, "CONFIG");
        } catch (error) {
            addLog(`Failed to update flag '${featureKey}': ${error.message}`, "ERROR");
        }
    };

    const value = { 
        recVideos, crudRecommendedVideo,
        stats, logs, addLog, featureFlags, toggleFeatureFlag, loading 
    };
    return <DevContext.Provider value={value}>{children}</DevContext.Provider>;
}

const AppProvider = ({ children }) => {
    const { user, userData } = useContext(AuthContext);
    const [page, setPage] = useState('dashboard');
    const [screen, setScreen] = useState('levelSelection');
    const [level, setLevel] = useState('');
    const [track, setTrack] = useState('');
    const [subject, setSubject] = useState(null);
    const [learningData, setLearningData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [userStats, setUserStats] = useState({ completedCount: 0, studyTime: 0, weeklyProgress: [] });
    
    useEffect(() => {
        if (user && userData) {
            const unsub = onSnapshot(collection(db, `belajar_log`), where("userId", "==", user.uid), (snapshot) => {
                const logs = snapshot.docs.map(doc => doc.data());
                
                const uniqueMaterials = [...new Set(logs.map(log => log.topic))];
                const totalTime = logs.reduce((acc, curr) => acc + (curr.studyDuration || 0), 0);
                
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                const weeklyLogs = logs.filter(m => m.completedAt?.toDate() > oneWeekAgo);

                setUserStats({
                    completedCount: uniqueMaterials.length,
                    studyTime: totalTime,
                    weeklyProgress: weeklyLogs
                });
            });
            return () => unsub();
        }
    }, [user, userData]);


    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
    };

    const handleMarkAsComplete = async (topic, studyDuration) => {
        if (!user || !topic) return;
        try {
            const logRef = doc(collection(db, 'belajar_log'));
            await setDoc(logRef, {
                userId: user.uid,
                topic: topic,
                subject: subject?.name || 'Unknown',
                level: level,
                track: track,
                completedAt: serverTimestamp(),
                studyDuration: studyDuration 
            });

            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                studyTime: userData.studyTime + studyDuration
            });

            showToast("🎉 Materi berhasil ditandai selesai");
            setPage('dashboard');
        } catch (err) {
            console.error("Gagal menandai selesai:", err);
            showToast("Gagal menyimpan progres, coba lagi nanti.", 'error');
        }
    };

    const fetchLearningMaterial = useCallback(async (searchTopic) => {
        setIsLoading(true); 
        setLoadingMessage('Mencari materi dan video relevan...'); 
        setError(null); 
        setLearningData(null); 
        setPage('belajar'); 
        setScreen('lesson');

        try {
            // Promise.all untuk menjalankan pencarian video dan materi AI secara paralel
            const [videoResult, geminiData] = await Promise.all([
                callYouTubeAPI(searchTopic, subject.name),
                callGeminiAPI(`Sebagai ahli materi pelajaran, buatkan ringkasan, materi lengkap (format Markdown bersih), dan 5 soal latihan pilihan ganda (A-E) dengan jawaban & penjelasan untuk topik '${searchTopic}' pelajaran '${subject.name}' tingkat ${level} ${track ? `jurusan ${track}`: ''}. Respons HANYA dalam format JSON: {"ringkasan": "...", "materi_lengkap": "...", "latihan_soal": [{"question": "...", "options": [...], "correctAnswer": "A", "explanation": "..."}]}`)
            ]);

            const videoUrl = videoResult ? `https://www.youtube.com/embed/${videoResult.videoId}` : null;
            
            setLearningData({ 
                topic: searchTopic, 
                videoUrl: videoUrl,
                videoTitle: videoResult ? videoResult.title : null,
                ...geminiData 
            });

        } catch (err) {
            setError(`Gagal memuat materi: ${err.message}. Coba lagi nanti.`);
            console.error(err);
            setPage('dashboard');
        } finally {
            setIsLoading(false);
        }
    }, [level, track, subject]);


    const value = { 
        page, setPage, screen, setScreen, level, setLevel, track, setTrack, subject, setSubject, 
        learningData, isLoading, error, loadingMessage, isSidebarOpen, setSidebarOpen,
        fetchLearningMaterial, handleMarkAsComplete, toast, showToast, userStats
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};


// --- FUNGSI API HELPER ---

const callYouTubeAPI = async (topic, subjectName) => {
    console.log("[API Call] Mencari video pembelajaran di YouTube...");
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY.startsWith("MASUKKAN")) {
        console.warn("Kunci API YouTube belum diatur. Fitur video pembelajaran tidak akan berfungsi.");
        return null;
    }

    const searchQuery = `video edukasi ${subjectName} ${topic}`;
    const API_URL = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoEmbeddable=true&videoDuration=long&maxResults=1&key=${YOUTUBE_API_KEY}`;
    
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`API YouTube gagal: ${errorBody.error?.message || 'Error tidak diketahui'}`);
        }
        const result = await response.json();
        if (result.items && result.items.length > 0) {
            return {
                videoId: result.items[0].id.videoId,
                title: result.items[0].snippet.title
            };
        }
        return null; // Tidak ada video yang ditemukan
    } catch (error) {
        console.error("[API Exception] Terjadi kesalahan YouTube:", error);
        return null; // Kembalikan null jika ada error agar aplikasi tidak crash
    }
};

const callGeminiAPI = async (prompt, isPlainText = false) => {
    console.log("[API Call] Memanggil Gemini API...");
    if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith("MASUKKAN")) throw new Error("Kunci API Gemini belum diatur.");
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = { 
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      ...( !isPlainText && { generationConfig: { response_mime_type: "application/json" } })
    };
    
    try {
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) { 
            const errorBody = await response.json(); 
            throw new Error(`API Gemini gagal: ${errorBody.error?.message || 'Error tidak diketahui'}`); 
        }
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Respons API Gemini tidak valid atau kosong.");
        
        if (isPlainText) return text;

        const cleanedText = text.replace(/^```(json)?\s*|```$/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("[API Exception] Terjadi kesalahan Gemini:", error);
        throw error;
    }
};

// --- KOMPONEN UTAMA APLIKASI ---
export default function App() {
    return (
        <DevProvider>
            <AuthProvider>
                <SettingsProvider>
                    <AppProvider>
                        <MainApp />
                    </AppProvider>
                </SettingsProvider>
            </AuthProvider>
        </DevProvider>
    );
}

const MainApp = () => {
    const { loading: authLoading, user } = useContext(AuthContext);
    const { isLoading: appIsLoading, loadingMessage, toast } = useContext(AppContext);
    const { canInstall } = usePWAInstall();
    const [showPWAInstallPopup, setShowPWAInstallPopup] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (canInstall) {
                setShowPWAInstallPopup(true);
            }
        }, 10000); 
        return () => clearTimeout(timer);
    }, [canInstall]);


    if (authLoading) return <LoadingScreen message="Memverifikasi sesi Anda..." />;
    if (appIsLoading) return <LoadingScreen message={loadingMessage} />;
    if (!user) return <LandingPage />;

    return (
      <>
        {showPWAInstallPopup && <PWAInstallPopup onClose={() => setShowPWAInstallPopup(false)} />}
        {toast.show && <ToastNotification message={toast.message} type={toast.type} />}
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
        'leaderboard': <LeaderboardPage />,
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
        { icon: <Video size={28} />, title: "Video Relevan", text: "Belajar dari video YouTube pilihan yang dicari otomatis sesuai materimu." },
        { icon: <Trophy size={28} />, title: "Papan Peringkat", text: "Asah pemahamanmu dan bersaing sehat dengan pelajar lain." }
    ];
    return (
        <div className="bg-slate-50 min-h-screen text-slate-800">
            <header className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <img src={APP_LOGO_URL} alt="Bdukasi Logo" className="h-10 w-10" onError={(e) => e.target.outerHTML = '<Brain class="h-10 w-10 text-cyan-500" />'} />
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
            </main>
            <Footer isLanding={true} />
        </div>
    );
};

const DashboardPage = () => {
    const { setPage, userStats } = useContext(AppContext);
    const { user } = useContext(AuthContext);
    const { recVideos, featureFlags, loading: devLoading } = useContext(DevContext);
    const [recommendedVideos, setRecommendedVideos] = useState([]);
    const [quote, setQuote] = useState('');

    useEffect(() => {
        setQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
    }, []);

    useEffect(() => {
        if (featureFlags?.peringkat && recVideos && recVideos.length > 0) {
            const activeVideos = recVideos.filter(v => v.status === 'active');
            const shuffled = [...activeVideos].sort(() => 0.5 - Math.random());
            setRecommendedVideos(shuffled.slice(0, 3));
        }
    }, [recVideos, featureFlags]);

    const formatStudyTime = (totalSeconds) => {
        if (totalSeconds < 60) return `${Math.floor(totalSeconds)}d`;
        const minutes = Math.floor(totalSeconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}j ${remainingMinutes}m`;
    };

    return (
        <AnimatedScreen customKey="dashboard">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-1">Dashboard Bdukasi</h1>
                <p className="text-lg text-slate-500 dark:text-slate-400">Selamat datang kembali, {user?.displayName?.split(' ')[0] || 'Juara'}!</p>
            </div>

            <InfoCard icon={<Lightbulb />} title="Kutipan Hari Ini" className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                 <p className="text-lg italic text-amber-800 dark:text-amber-200 text-center">"{quote}"</p>
            </InfoCard>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <DashboardCard icon={<BrainCircuit size={32} />} title="Mulai Belajar" description="Pilih jenjang & mapel untuk dijelajahi." onClick={() => { setPage('belajar'); }} className="bg-cyan-500 text-white hover:bg-cyan-600 !items-start" />
                    <DashboardCard icon={<MessageSquare size={32} />} title="Tanya AI" description="Ada pertanyaan? Tanya Kak Spenta." onClick={() => { setPage('tanya-ai'); }} className="bg-white dark:bg-slate-800" />
                    <DashboardCard icon={<Trophy size={32} />} title="Papan Peringkat" description="Lihat posisimu di antara para juara." onClick={() => setPage('leaderboard')} className="bg-white dark:bg-slate-800" disabled={!featureFlags?.peringkat}/>
                    <DashboardCard icon={<Award size={32} />} title="Misi Harian" description="Segera hadir!" onClick={() => {}} className="bg-white dark:bg-slate-800" disabled={true} />
                </div>

                <div className="lg:col-span-1">
                    <InfoCard icon={<BarChartHorizontal />} title="Statistik Kamu">
                        <div className="space-y-4">
                            <StatItem label="Materi Selesai" value={userStats.completedCount} icon={<BookCheck size={20}/>}/>
                            <StatItem label="Total Waktu Belajar" value={formatStudyTime(userStats.studyTime)} icon={<Timer size={20}/>}/>
                            <div className="pt-2">
                                <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Progres Minggu Ini</h4>
                                <WeeklyProgressChart data={userStats.weeklyProgress} />
                            </div>
                        </div>
                    </InfoCard>
                </div>
            </div>

            {featureFlags?.peringkat && recommendedVideos.length > 0 && (
                <div className="mt-8">
                    <InfoCard icon={<Tv />} title="Rekomendasi Video Edukasi">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {recommendedVideos.map(video => (
                                <div key={video.id} className="bg-slate-100 dark:bg-slate-800/50 rounded-xl overflow-hidden shadow-sm">
                                    <div className="aspect-w-16 aspect-h-9 bg-black rounded-t-lg">
                                        <iframe src={video.url} title={video.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                                    </div>
                                    <div className="p-4"><h3 className="font-semibold text-sm line-clamp-2 text-slate-800 dark:text-slate-200">{video.title}</h3></div>
                                </div>
                            ))}
                        </div>
                    </InfoCard>
                </div>
            )}
        </AnimatedScreen>
    );
};

const SettingsPage = () => {
    const { user, logout } = useContext(AuthContext);
    const { theme, setTheme, fontSize, setFontSize, language, setLanguage, dyslexiaFont, setDyslexiaFont, resetSettings } = useContext(SettingsContext);

    const fontOptions = [ { value: 'sm', label: 'Kecil' }, { value: 'base', label: 'Normal' }, { value: 'lg', label: 'Besar' }];
    const langOptions = [ { value: 'id', label: 'Indonesia' }, { value: 'en', label: 'English' }];
    const themeOptions = [ { value: 'light', label: 'Terang', icon: <Sun/> }, { value: 'dark', label: 'Gelap', icon: <Moon/> }, { value: 'system', label: 'Sistem', icon: <Computer/>} ];

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
                        <SettingOptionGroup label="Tema Aplikasi" options={themeOptions} selected={theme} onChange={setTheme} isIconGroup={true} />
                        <SettingOptionGroup label="Ukuran Font" options={fontOptions} selected={fontSize} onChange={setFontSize} />
                        <SettingToggle label="Font Disleksia" icon={<Text/>} isEnabled={dyslexiaFont} onToggle={() => setDyslexiaFont(p => !p)} />
                        <SettingOptionGroup label="Bahasa (Segera Hadir)" options={langOptions} selected={language} onChange={setLanguage} icon={<TranslateIcon />} disabled={true} />
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                             <button onClick={resetSettings} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                <RefreshCw size={16} /> Reset Pengaturan
                            </button>
                        </div>
                    </div>
                </InfoCard>
            </div>
        </AnimatedScreen>
    );
};

const DeveloperDashboardPage = () => {
    const { isDeveloper } = useContext(AuthContext);
    const { 
        stats, recVideos, crudRecommendedVideo, logs, featureFlags, toggleFeatureFlag
    } = useContext(DevContext);
    const [view, setView] = useState('stats');
    const [logFilter, setLogFilter] = useState('ALL');

    const allFlags = [
        { key: 'aiAvatar', label: "Avatar AI", icon: <Bot/> },
        { key: 'peringkat', label: "Papan Peringkat", icon: <Trophy/> },
        { key: 'gameRingan', label: "Game Ringan", icon: <Gamepad2/> },
        { key: 'backgroundAudio', label: "Audio Suasana", icon: <Music/> },
        { key: 'darkModeDefault', label: "Default Dark Mode", icon: <Moon/> }
    ];
    
    const filteredLogs = useMemo(() => {
        if (logFilter === 'ALL') return logs;
        return logs.filter(log => log.includes(`[${logFilter}]`));
    }, [logs, logFilter]);
    
    if (!isDeveloper) {
        return (
            <AnimatedScreen customKey="dev-denied">
                <InfoCard icon={<ShieldCheck />} title="Akses Ditolak"><p>Halaman ini hanya untuk developer.</p></InfoCard>
            </AnimatedScreen>
        );
    }
    
    return (
        <AnimatedScreen customKey="dev-dashboard">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3"><Server /> Developer Dashboard</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">Mode Super Admin Aktif.</p>

            <div className="flex border-b border-slate-300 dark:border-slate-700 mb-6 flex-wrap">
                <TabButton text="Statistik" isActive={view==='stats'} onClick={()=>setView('stats')} icon={<BarChart2/>}/>
                <TabButton text="Video Rekomen" isActive={view==='recVideos'} onClick={()=>setView('recVideos')} icon={<Tv/>}/>
                <TabButton text="Kontrol Fitur" isActive={view==='features'} onClick={()=>setView('features')} icon={<Power/>}/>
                <TabButton text="Logs" isActive={view==='logs'} onClick={()=>setView('logs')} icon={<Terminal/>}/>
            </div>

            {view === 'stats' && (
                <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard icon={<Users2 />} label="Total Pengguna" value={stats.users} />
                    <StatCard icon={<BookOpen />} label="Materi Diselesaikan" value={stats.materials || 0} />
                    <StatCard icon={<HelpCircle />} label="Total Soal" value={stats.questions || 0} />
                    <StatCard icon={<Timer />} label="Total Jam Belajar" value={Math.floor((stats.totalStudyTime || 0) / 3600)} />
                </section>
            )}

            {view === 'recVideos' && <VideoManager title="Kelola Video Rekomendasi" videos={recVideos} onCrud={crudRecommendedVideo} />}

            {view === 'features' && (
                <InfoCard icon={<Power />} title="Kontrol Fitur Aplikasi (Live)">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                       {allFlags.map(flag => (
                           <FeatureToggleCard key={flag.key} featureKey={flag.key} label={flag.label} icon={flag.icon} isEnabled={featureFlags[flag.key]} onToggle={toggleFeatureFlag} />
                       ))}
                    </div>
                </InfoCard>
            )}
            
            {view === 'logs' && (
                 <InfoCard icon={<Terminal />} title="Developer Console" className="flex-grow flex flex-col">
                    <div className="mb-3 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                        <Filter size={16} className="text-slate-500"/>
                        <select value={logFilter} onChange={e => setLogFilter(e.target.value)} className="bg-slate-100 dark:bg-slate-700 text-xs rounded p-1 border-0 outline-none">
                           {['ALL', 'SYSTEM', 'DB', 'CONFIG', 'API', 'SUCCESS', 'ERROR'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div className="bg-black text-white font-mono text-xs p-4 rounded-lg h-[450px] flex-grow overflow-y-auto">
                        {filteredLogs.map((log, i) => <p key={i} className={`whitespace-pre-wrap ${log.includes('[ERROR]') ? 'text-red-400' : log.includes('[SUCCESS]') ? 'text-green-400' : log.includes('[CONFIG]') ? 'text-cyan-400' : 'text-slate-300'}`}>{log}</p>)}
                    </div>
                </InfoCard>
            )}
        </AnimatedScreen>
    );
};

// --- HALAMAN BARU: CHAT AI ---
const ChatAiPage = () => {
    const { featureFlags } = useContext(DevContext);
    const [messages, setMessages] = useState([
        { role: 'model', content: "Halo! Saya Kak Spenta AI, asisten belajarmu. Ada yang bisa saya bantu jelaskan hari ini?" }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isThinking) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsThinking(true);

        try {
            const prompt = `Sebagai "Kak Spenta AI", seorang guru AI yang ramah, cerdas, dan membantu dari aplikasi Bdukasi, jawab pertanyaan pengguna berikut dengan jelas dan mudah dimengerti. Tetap dalam peranmu. Pertanyaan: ${input}`;
            const aiResponse = await callGeminiAPI(prompt, true); // true for plain text response
            setMessages(prev => [...prev, { role: 'model', content: aiResponse }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', content: "Aduh, sepertinya ada sedikit gangguan di sirkuitku. Bisa coba tanyakan lagi?" }]);
            console.error(error);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <AnimatedScreen customKey="tanya-ai">
            <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[800px] bg-white dark:bg-slate-800/50 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700/50">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    {featureFlags.aiAvatar ? <img src={APP_LOGO_URL} className="w-10 h-10" alt="Kak Spenta AI"/> : <Bot size={28} className="text-cyan-500" />}
                    <div><h1 className="text-xl font-bold">Tanya Segalanya dengan Kak Spenta AI</h1><p className="text-sm text-slate-500 dark:text-slate-400">Asisten belajar pribadimu, siap 24/7.</p></div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && (<div className="w-10 h-10 rounded-full bg-cyan-500 flex-shrink-0 flex items-center justify-center text-white">{featureFlags.aiAvatar ? <img src={APP_LOGO_URL} className="p-1" alt="AI Avatar"/> : <Bot size={24}/>}</div>)}
                            <div className={`max-w-xl p-4 rounded-2xl prose prose-sm dark:prose-invert max-w-none ${msg.role === 'user' ? 'bg-cyan-500 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-700 rounded-bl-none'}`}><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                            {msg.role === 'user' && (<div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex-shrink-0 flex items-center justify-center"><UserCircle size={24} /></div>)}
                        </div>
                    ))}
                    {isThinking && (
                         <div className="flex items-start gap-4 justify-start">
                             <div className="w-10 h-10 rounded-full bg-cyan-500 flex-shrink-0 flex items-center justify-center text-white"><Bot size={24} /></div>
                             <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 rounded-bl-none flex items-center gap-2"><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div></div>
                         </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <form onSubmit={handleSend} className="flex items-center gap-3">
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ketik pertanyaanmu di sini..." disabled={isThinking} className="flex-1 w-full p-3 bg-slate-100 dark:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500 outline-none" />
                        <button type="submit" disabled={isThinking || !input.trim()} className="p-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"><SendHorizonal size={24} /></button>
                    </form>
                </div>
            </div>
        </AnimatedScreen>
    );
};

const UpdateLogPage = () => {
    const updates = [
        { version: "v4.1.0", date: "25 Juni 2025", changes: [
            "PENTING: Mekanisme Video Pembelajaran diubah total. Kini video dicari otomatis menggunakan YouTube API berdasarkan topik yang dipelajari, bukan lagi diinput manual oleh developer. Tujuannya agar konten video selalu relevan dan up-to-date.",
            "Pembaruan Dashboard Developer: Fitur untuk mengelola 'Video Materi' telah dihapus karena prosesnya sudah otomatis."
        ]},
        { version: "v4.0.0", date: "25 Juni 2025", changes: [
            "FITUR: Tombol '✅ Sudah Belajar' ditambahkan. Progres dan waktu belajar kini tersimpan secara permanen.",
            "FITUR: Papan Peringkat (Leaderboard) kini menampilkan data skor (materi selesai) dan total waktu belajar secara live dari database.",
            "FITUR: Statistik Pengguna di Dashboard diperkaya dengan Total Waktu Belajar dan visualisasi progres mingguan.",
            "UPDATE: Mata pelajaran 'Sejarah' telah ditambahkan untuk semua jenjang pendidikan.",
            "UPDATE: Implementasi PWA dengan logo baru dan popup instalasi yang lebih baik.",
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

const LeaderboardPage = () => {
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            setError(null);
            try {
                const logSnapshot = await getDocs(collection(db, "belajar_log"));
                const logs = logSnapshot.docs.map(doc => doc.data());
        
                const usersSnapshot = await getDocs(collection(db, "users"));
                const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const scores = users.map(u => {
                    const userLogs = logs.filter(log => log.userId === u.id);
                    const uniqueMaterials = [...new Set(userLogs.map(log => log.topic))];
                    const totalStudyTime = u.studyTime || 0; 

                    return {
                        ...u,
                        score: uniqueMaterials.length,
                        studyTime: totalStudyTime
                    };
                });
        
                scores.sort((a, b) => b.score - a.score || b.studyTime - a.studyTime);
                setLeaderboardData(scores);
            } catch (err) {
                console.error("Gagal mengambil data papan peringkat:", err);
                setError("Tidak dapat memuat papan peringkat. Silakan coba lagi nanti.");
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    if (loading) {
        return <div className="text-center p-10"><Loader className="animate-spin mx-auto text-cyan-500" size={48} /></div>
    }
    
    if (error) {
        return <ErrorMessage message={error} />
    }

    return (
        <AnimatedScreen key="leaderboard">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3"><Trophy className="text-amber-400" /> Papan Peringkat</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">Lihat siapa pelajar paling giat di Bdukasi!</p>
            
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                    {leaderboardData.length > 0 ? leaderboardData.map((player, index) => (
                        <div key={player.uid} className={`p-4 flex items-center gap-4 transition-colors ${player.uid === user.uid ? 'bg-cyan-50 dark:bg-cyan-900/20' : ''}`}>
                            <span className={`font-bold text-xl w-10 text-center ${index < 3 ? 'text-amber-500' : 'text-slate-400'}`}>{index + 1}</span>
                            <img src={player.photoURL || `https://ui-avatars.com/api/?name=${player.displayName}`} alt={player.displayName} className="w-12 h-12 rounded-full" />
                            <div className="flex-grow">
                                <p className="font-bold">{player.displayName}</p>
                                <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-4">
                                    <span>Skor: <span className="font-semibold text-slate-700 dark:text-slate-200">{player.score}</span></span>
                                    <span>Waktu: <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.floor(player.studyTime / 60)}m</span></span>
                                </div>
                            </div>
                            {index === 0 && <Trophy size={24} className="text-amber-400" />}
                            {index === 1 && <Trophy size={24} className="text-slate-400" />}
                            {index === 2 && <Trophy size={24} className="text-amber-700" />}
                        </div>
                    )) : (
                        <div className="p-8 text-center text-slate-500">
                            <Trophy size={48} className="mx-auto mb-4"/>
                            <h3 className="text-xl font-bold">Papan Peringkat Masih Kosong</h3>
                            <p>Jadilah yang pertama menyelesaikan materi untuk tampil di sini!</p>
                        </div>
                    )}
                </div>
            </div>
        </AnimatedScreen>
    );
};


// --- KOMPONEN UI & PENDUKUNG LAINNYA ---

const ToastNotification = ({ message, type = 'success' }) => (
    <div className={`fixed bottom-5 right-5 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fadeInUp z-50 ${type === 'success' ? 'bg-slate-900 dark:bg-white text-white dark:text-black' : 'bg-red-600 text-white'}`}>
        {type === 'success' ? <CheckCircle className="text-green-400" /> : <AlertTriangle className="text-white"/>}
        <p className="font-semibold">{message}</p>
    </div>
);

const Modal = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);


const LoadingScreen = ({ message }) => (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-50 flex flex-col items-center justify-center gap-6">
        <div className="relative w-24 h-24">
            <img src={APP_LOGO_URL} alt="Loading Logo" className="w-full h-full animate-pulse" onError={(e) => e.target.outerHTML = '<Brain class="w-full h-full text-cyan-500 animate-pulse" />'} />
        </div>
        <p className="text-xl font-semibold text-slate-600 dark:text-slate-300 text-center max-w-xs">{message || 'Memuat...'}</p>
    </div>
);

const PWAInstallPopup = ({ onClose }) => {
    const { triggerInstall } = usePWAInstall();
    const handleInstallClick = () => { triggerInstall(); onClose(); };
    return (
        <Modal onClose={onClose}>
            <div className="text-center relative">
                <button onClick={onClose} className="absolute -top-2 -right-2 text-slate-400 hover:text-slate-600"><X /></button>
                <img src={APP_LOGO_URL} alt="App Logo" className="w-20 h-20 mx-auto mb-4" onError={(e) => e.target.outerHTML = '<Brain class="w-20 h-20 mx-auto mb-4 text-cyan-500" />'} />
                <h2 className="text-2xl font-bold">Install Aplikasi Bdukasi</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6">Dapatkan pengalaman belajar terbaik dengan menginstal aplikasi di perangkatmu.</p>
                <button onClick={handleInstallClick} className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-cyan-500 text-white font-bold rounded-lg hover:bg-cyan-600 transition-colors">
                    <Download size={20} /> Install Sekarang
                </button>
            </div>
        </Modal>
    );
};

const FeatureToggleCard = ({ featureKey, label, icon, isEnabled, onToggle }) => (
    <div className={`p-4 rounded-xl text-center border-2 transition-all flex flex-col items-center justify-center gap-2 ${isEnabled ? 'border-green-400 bg-green-50 dark:bg-green-900/30' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
        <div className={`transition-colors ${isEnabled ? 'text-green-600 dark:text-green-300' : 'text-slate-600 dark:text-slate-400'}`}>{icon}</div>
        <p className={`font-bold text-xs transition-colors ${isEnabled ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-300'}`}>{label}</p>
        <button onClick={() => onToggle(featureKey)}>
            {isEnabled ? <ToggleRight size={28} className="text-green-500"/> : <ToggleLeft size={28} className="text-slate-500"/>}
        </button>
    </div>
);

const SettingToggle = ({ label, icon, isEnabled, onToggle, hint }) => (
    <div>
        <div className="flex items-center justify-between"><label className="font-semibold flex items-center gap-3">{icon} {label}</label><button onClick={onToggle} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isEnabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'}`}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
        {hint && <p className="text-xs text-slate-400 mt-1 pl-9">{hint}</p>}
    </div>
);

const SettingOptionGroup = ({ label, options, selected, onChange, icon, isIconGroup = false, disabled = false }) => (
    <div className={disabled ? 'opacity-50' : ''}>
        <label className="font-semibold block mb-2 flex items-center gap-2">{icon}{label}</label>
        <div className="flex flex-wrap gap-2">{options.map(opt => (<button key={opt.value} onClick={() => !disabled && onChange(opt.value)} disabled={disabled} className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${selected === opt.value ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-700'} ${disabled ? 'cursor-not-allowed' : 'hover:bg-slate-300 dark:hover:bg-slate-600'}`}>{isIconGroup && opt.icon}<span>{opt.label}</span></button>))}</div>
    </div>
);
const StatCard = ({ icon, label, value }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center gap-4">
        <div className="p-3 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-500 rounded-full">{icon}</div>
        <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </div>
);

const StatItem = ({icon, label, value}) => (
    <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
        <div className="flex items-center gap-3">
            <div className="text-cyan-500">{icon}</div>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{label}</span>
        </div>
        <span className="font-bold text-xl text-cyan-500">{value}</span>
    </div>
);

const WeeklyProgressChart = ({ data }) => {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const dailyCounts = Array(7).fill(0);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    data.forEach(item => {
        const completedDate = item.completedAt.toDate();
        completedDate.setHours(0,0,0,0);
        const diffDays = Math.floor((today - completedDate) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
            const dayIndex = today.getDay() - diffDays;
            dailyCounts[dayIndex < 0 ? dayIndex + 7 : dayIndex]++;
        }
    });

    const maxCount = Math.max(...dailyCounts, 1);

    return (
         <div className="flex justify-between items-end gap-2 h-24 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg">
            {dailyCounts.map((count, index) => (
                <div key={index} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-full flex items-end">
                       <div className="w-full bg-cyan-400 rounded-full transition-all duration-500" style={{ height: `${(count/maxCount)*100}%` }}></div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{days[index]}</span>
                </div>
            ))}
        </div>
    );
};

const AnimatedScreen = ({ children, customKey }) => <div key={customKey} className="animate-fadeIn">{children}</div>;
const DashboardCard = ({ icon, title, description, onClick, disabled, className = "" }) => (
    <button onClick={onClick} disabled={disabled} className={`group p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-md text-left transform hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between gap-4 ${disabled ? 'opacity-50 cursor-not-allowed saturate-50' : 'hover:shadow-lg hover:shadow-cyan-500/10'} ${className}`}>
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${!className.includes('bg-cyan') ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-500' : ''}`}>{icon}</div>
            <div>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className={`${className.includes('bg-cyan') ? 'text-cyan-100' : 'text-slate-500 dark:text-slate-400'}`}>{description}</p>
            </div>
        </div>
        {!disabled && <ArrowUpRight className="ml-auto text-slate-400 group-hover:text-cyan-500 transition-transform group-hover:rotate-45 self-end"/>}
    </button>
);

const Navbar = () => {
    const { setSidebarOpen } = useContext(AppContext);
    return (
        <header className="sticky top-0 bg-white/70 dark:bg-slate-900/80 backdrop-blur-md z-10 border-b border-slate-200 dark:border-slate-700 md:hidden">
            <div className="px-4 h-16 flex items-center justify-between">
                <div className="font-bold text-xl flex items-center gap-2"><img src={APP_LOGO_URL} alt="Logo" className="h-8 w-8" onError={(e) => e.target.outerHTML = '<Brain class="h-8 w-8 text-cyan-500" />'} /> Bdukasi</div>
                <button onClick={() => setSidebarOpen(true)} className="md:hidden"><Menu /></button>
            </div>
        </header>
    );
};

const Sidebar = () => {
    const { page, setPage, isSidebarOpen, setSidebarOpen } = useContext(AppContext);
    const { logout, user, isDeveloper } = useContext(AuthContext);
    const { featureFlags } = useContext(DevContext);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'belajar', label: 'Mulai Belajar', icon: <BrainCircuit size={20} /> },
        { id: 'tanya-ai', label: 'Tanya AI', icon: <MessageSquare size={20} />},
        { id: 'leaderboard', label: 'Papan Peringkat', icon: <Trophy size={20} />, disabled: !featureFlags?.peringkat },
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
                 <div className="flex items-center gap-3 text-2xl font-bold mb-10"><img src={APP_LOGO_URL} alt="Logo" className="h-10 w-10" onError={(e) => e.target.outerHTML = '<Brain class="h-10 w-10 text-cyan-500" />'} /><span className="text-slate-800 dark:text-white">Bdukasi</span></div>
                <nav className="flex-grow space-y-2">{navItems.filter(item => !item.disabled).map(item => (<button key={item.id} onClick={() => { setPage(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors text-base ${page === item.id ? 'bg-cyan-500 text-white font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{React.cloneElement(item.icon, { className: page === item.id ? 'text-white' : 'text-slate-500' })}<span>{item.label}</span></button>))}</nav>
                <div className="mt-auto">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 mb-4"><img src={user?.photoURL} alt="Avatar" className="w-10 h-10 rounded-full" /><div className='overflow-hidden'><p className="font-semibold text-sm line-clamp-1">{user?.displayName}</p><p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{user?.email}</p></div></div>
                    <button onClick={logout} className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 font-semibold"><LogOut size={20}/><span>Keluar</span></button>
                </div>
            </aside>
        </>
    );
}

const InfoCard = ({ icon, title, children, className = '' }) => <div className={`bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden ${className} animate-fadeInUp`}><div className="p-4 border-b border-slate-200/80 dark:border-slate-700/50 flex items-center gap-3">{icon && <div className="text-cyan-500">{React.cloneElement(icon, { size: 24 })}</div>}<h2 className="text-xl font-bold">{title}</h2></div><div className="p-4 sm:p-6">{children}</div></div>;
const LearningFlow = () => { const { screen } = useContext(AppContext); return <ScreenContainer />; };
const LearningMaterialScreen = () => {
    const { learningData, setScreen, handleMarkAsComplete, setPage } = useContext(AppContext);
    const [startTime, setStartTime] = useState(null);

    useEffect(() => {
        setStartTime(Date.now()); 
    }, []);

    const onComplete = () => {
        const endTime = Date.now();
        const duration = Math.floor((endTime - startTime) / 1000); 
        handleMarkAsComplete(learningData?.topic, duration);
    };

    if (!learningData) return <div className="text-center p-8">Materi tidak ditemukan. <button onClick={() => setPage('dashboard')} className="text-cyan-500 underline">Kembali ke Dashboard</button></div>;
    
    const { topic, videoUrl, videoTitle, ringkasan, materi_lengkap, latihan_soal } = learningData;
    
    return (
        <AnimatedScreen customKey="lesson">
            <BackButton onClick={() => setScreen('subjectDashboard')} />
            <div className="space-y-8 pt-8">
                <h1 className="text-3xl sm:text-5xl font-bold text-center text-cyan-600 dark:text-cyan-400">{topic}</h1>
                
                {videoUrl && (
                     <InfoCard icon={<Youtube />} title="Video Pembelajaran Terkait">
                        <div className="aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden">
                           <iframe src={videoUrl} title={videoTitle} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                        </div>
                    </InfoCard>
                )}

                {ringkasan && <InfoCard icon={<Lightbulb />} title="Ringkasan"><p className="leading-relaxed">{ringkasan}</p></InfoCard>}
                {materi_lengkap && <InfoCard icon={<BookOpen />} title="Materi Lengkap"><div className="prose dark:prose-invert max-w-none"><ReactMarkdown>{materi_lengkap}</ReactMarkdown></div></InfoCard>}
                {latihan_soal?.length > 0 && <InfoCard icon={<BookMarked />} title="Latihan Soal"><QuizPlayer questions={latihan_soal} /></InfoCard>}
                
                <div className="text-center pt-8">
                    <button onClick={onComplete} className="px-8 py-4 bg-green-500 text-white font-bold rounded-full shadow-lg hover:bg-green-600 transform hover:scale-105 transition-all duration-300 flex items-center gap-3 group mx-auto">
                        <CheckCircle size={24} />
                        ✅ Sudah Belajar
                    </button>
                </div>
            </div>
        </AnimatedScreen>
    );
};
const Footer = ({ isLanding = false }) => (
    <footer className={`w-full text-center p-6 text-slate-500 dark:text-slate-400 text-sm ${isLanding ? 'relative z-10 mt-16' : 'mt-auto'}`}>
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Sebuah Karya dari</p><p className="text-lg font-bold text-slate-900 dark:text-white">M. Irham Andika Putra & Bgune Digital</p>
        <div className="flex justify-center gap-4 mt-3"><a href="https://www.youtube.com/@PernahMikir" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 transition-colors"><Youtube/></a><a href="https://github.com/irhamp" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 transition-colors"><Github/></a><a href="https://www.instagram.com/irham_putra07" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 transition-colors"><Instagram/></a></div>
        <p className="mt-4 text-xs">Dibuat dengan <Sparkles className="inline h-3 w-3 text-amber-400"/> dan Teknologi AI dari Google</p>
    </footer>
);
const ScreenContainer = () => { const { screen } = useContext(AppContext); const screens = { levelSelection: <LevelSelectionScreen key="level" />, trackSelection: <TrackSelectionScreen key="track" />, subjectSelection: <SubjectSelectionScreen key="subject" />, subjectDashboard: <SubjectDashboardScreen key="dashboard" />, lesson: <LearningMaterialScreen key="lesson" />, }; return <div className="relative h-full w-full">{screens[screen]}</div>; };
const BackButton = ({ onClick }) => <button onClick={onClick} className="flex items-center gap-2 text-cyan-500 font-semibold hover:underline mb-8"><ArrowLeft size={20} /> Kembali</button>;
const ErrorMessage = ({ message }) => <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-r-lg mt-4 w-full flex items-center gap-4"><AlertTriangle className="h-6 w-6 text-red-500" /><p className="font-bold">{message}</p></div>;
const iconMap = { School, Brain, BookOpen, Youtube, Lightbulb, FileText, ArrowLeft, Loader, Sparkles, AlertTriangle, X, FlaskConical, Globe, Calculator, Dna, BarChart2, Drama, Computer, BookHeart, Landmark, Languages, HelpCircle, Atom, CheckCircle, ChevronRight, BrainCircuit, History, BookMarked, Github, Instagram };
const curriculum = { 
    'SD': { subjects: [{ name: 'Matematika', iconName: 'Calculator' }, { name: 'IPAS', iconName: 'Globe' }, { name: 'Pendidikan Pancasila', iconName: 'Landmark' }, { name: 'Bahasa Indonesia', iconName: 'BookHeart' }, { name: 'Sejarah', iconName: 'History' }] }, 
    'SMP': { subjects: [{ name: 'Matematika', iconName: 'Calculator' }, { name: 'IPA Terpadu', iconName: 'FlaskConical' }, { name: 'IPS Terpadu', 'iconName': 'Globe' }, { name: 'Pendidikan Pancasila', iconName: 'Landmark'}, { name: 'Bahasa Indonesia', iconName: 'BookHeart' }, { name: 'Bahasa Inggris', iconName: 'Languages' }, { name: 'Informatika', iconName: 'Computer' }, { name: 'Sejarah', iconName: 'History' }] }, 
    'SMA': { tracks: { 
        'IPA': [{ name: 'Matematika Peminatan', iconName: 'Calculator' }, { name: 'Fisika', iconName: 'Atom' }, { name: 'Kimia', iconName: 'FlaskConical' }, { name: 'Biologi', iconName: 'Dna' }, { name: 'Sejarah Indonesia', iconName: 'History' }], 
        'IPS': [{ name: 'Ekonomi', iconName: 'BarChart2' }, { name: 'Geografi', iconName: 'Globe' }, { name: 'Sosiologi', iconName: 'School' }, { name: 'Sejarah Peminatan', iconName: 'History' }], 
        'Bahasa': [{ name: 'Sastra Indonesia', iconName: 'BookHeart' }, { name: 'Sastra Inggris', iconName: 'Drama' }, { name: 'Antropologi', iconName: 'Globe' }, { name: 'Bahasa Asing', iconName: 'Languages' }, { name: 'Sejarah', iconName: 'History' }] 
    } } 
};
const LevelSelectionScreen = () => { const { setScreen, setLevel, setPage } = useContext(AppContext); return ( <AnimatedScreen customKey="level"> <div className="text-center pt-8"> <BackButton onClick={() => setPage('dashboard')} /> <School className="w-24 h-24 mx-auto text-cyan-500" /> <h1 className="text-4xl font-bold mt-4">Pilih Jenjang Pendidikan</h1> <p className="text-xl text-slate-500 dark:text-slate-400 mt-2 mb-12">Mulai dari sini untuk petualangan belajarmu.</p> <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"> {Object.keys(curriculum).map((lvl) => <button key={lvl} onClick={() => { setLevel(lvl); setScreen(lvl === 'SMA' ? 'trackSelection' : 'subjectSelection'); }} className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md hover:shadow-cyan-500/20 hover:border-cyan-500 hover:-translate-y-2 transition-all text-2xl font-bold flex flex-col items-center justify-center gap-4 cursor-pointer">{lvl}</button>)} </div> </div> </AnimatedScreen> ); };
const TrackSelectionScreen = () => { const { setScreen, setTrack } = useContext(AppContext); return ( <AnimatedScreen customKey="track"> <BackButton onClick={() => setScreen('levelSelection')} /> <div className="text-center pt-8"> <h1 className="text-4xl font-bold mb-12">Pilih Jurusan</h1> <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto"> {Object.keys(curriculum.SMA.tracks).map((trackName) => <button key={trackName} onClick={() => { setTrack(trackName); setScreen('subjectSelection'); }} className="p-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md hover:shadow-cyan-500/20 hover:border-cyan-500 hover:-translate-y-2 transition-all text-2xl font-bold">{trackName}</button>)} </div> </div> </AnimatedScreen> ); };
const SubjectSelectionScreen = () => { const { level, track, setScreen, setSubject } = useContext(AppContext); const subjects = level === 'SMA' ? curriculum.SMA.tracks[track] : curriculum[level]?.subjects; const backScreen = level === 'SMA' ? 'trackSelection' : 'levelSelection'; if (!subjects) return <div className="text-center"><p>Gagal memuat mata pelajaran.</p><BackButton onClick={() => setScreen(backScreen)} /></div>; return ( <AnimatedScreen customKey="subject"> <BackButton onClick={() => setScreen(backScreen)} /> <div className="pt-8"> <h1 className="text-4xl font-bold mb-12 text-center">Pilih Mata Pelajaran</h1> <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-5xl mx-auto"> {subjects.map((s) => <button key={s.name} onClick={() => { setSubject(s); setScreen('subjectDashboard'); }} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-center hover:border-cyan-500 hover:-translate-y-1 transition-all aspect-square shadow-md"><DynamicIcon name={s.iconName} size={48} className="text-cyan-500" /><span className="font-semibold text-sm text-center mt-3">{s.name}</span></button>)} </div> </div> </AnimatedScreen> ); };
const DynamicIcon = ({ name, ...props }) => { const IconComponent = iconMap[name]; return IconComponent ? <IconComponent {...props} /> : <HelpCircle {...props} />; };
const SubjectDashboardScreen = () => { const { subject, error, setError, setScreen, fetchLearningMaterial } = useContext(AppContext); const [inputValue, setInputValue] = useState(''); if (!subject) return <div className="text-center">Harap pilih mata pelajaran. <BackButton onClick={() => setScreen('subjectSelection')} /></div>; const handleSearchSubmit = (e) => { e.preventDefault(); if(inputValue.trim()) { setError(null); fetchLearningMaterial(inputValue); } else { setError("Topik pencarian tidak boleh kosong."); } }; return ( <AnimatedScreen customKey="dashboard"> <BackButton onClick={() => setScreen('subjectSelection')} /> <div className="text-center pt-8"><DynamicIcon name={subject.iconName} size={80} className="text-cyan-500 mx-auto mb-4" /><h1 className="text-4xl font-bold">Mata Pelajaran: {subject.name}</h1></div> <div className="w-full max-w-2xl mx-auto my-12"> <form onSubmit={handleSearchSubmit} className="relative"> <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ketik topik untuk dipelajari..." className="w-full pl-6 pr-16 py-4 text-lg bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-full focus:ring-4 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"/> <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-cyan-600 text-white rounded-full hover:bg-cyan-700 transition-transform active:scale-95"><Search className="w-6 h-6" /></button> </form> {error && <ErrorMessage message={error} />} </div> </AnimatedScreen> ); };

const TabButton = ({icon, text, isActive, onClick}) => <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 sm:px-6 font-semibold border-b-2 transition-all ${isActive ? 'text-cyan-500 border-cyan-500' : 'text-slate-500 border-transparent hover:text-cyan-500'}`}>{icon} <span className="hidden sm:inline">{text}</span></button>;
const QuizPlayer = ({ questions }) => { const [answers, setAnswers] = useState({}); const [isSubmitted, setSubmitted] = useState(false); if (!questions || !Array.isArray(questions) || questions.length === 0) return <p>Soal latihan tidak tersedia.</p>; const score = useMemo(() => isSubmitted ? questions.reduce((acc, q, i) => acc + (answers[i]?.charAt(0).toUpperCase() === q.correctAnswer.charAt(0).toUpperCase() ? 1 : 0), 0) : 0, [answers, questions, isSubmitted]); return ( <div className="space-y-8"> {isSubmitted && <div className="text-center p-4 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 border border-cyan-300 dark:border-cyan-700"><h3 className="text-2xl font-bold">Skor: {Math.round((score / questions.length) * 100)}%</h3><p>Benar {score} dari {questions.length} soal.</p></div>} {questions.map((q, qIndex) => ( <div key={qIndex}> <p className="font-semibold text-lg mb-3">{qIndex + 1}. {q.question}</p> <div className="space-y-2">{q.options?.map((opt, oIndex) => { const isSelected = answers[qIndex] === opt; const isCorrectOption = opt.charAt(0).toUpperCase() === q.correctAnswer.charAt(0).toUpperCase(); let stateClass = "border-slate-300 dark:border-slate-600 hover:border-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-700"; if (isSubmitted) { if (isCorrectOption) stateClass = "bg-green-100 dark:bg-green-900/60 border-green-500 text-green-800 dark:text-white"; else if (isSelected && !isCorrectOption) stateClass = "bg-red-100 dark:bg-red-900/60 border-red-500 text-red-800 dark:text-white"; else stateClass = "border-slate-300 dark:border-slate-700 text-slate-500"; } else if (isSelected) { stateClass = "border-cyan-500 bg-cyan-100 dark:bg-cyan-900/50"; } return <button key={oIndex} onClick={() => !isSubmitted && setAnswers(p => ({ ...p, [qIndex]: opt }))} disabled={isSubmitted} className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${stateClass} disabled:cursor-not-allowed`}>{opt}</button>})} </div> {isSubmitted && q.explanation && <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-sm"><p className="font-bold flex items-center gap-2"><CheckCircle size={16}/> Penjelasan:</p><p className="mt-2 pl-1">{q.explanation}</p><p className="mt-2 pl-1">Jawaban benar: <span className="font-bold text-green-600 dark:text-green-400">{q.correctAnswer}</span></p></div>} </div> ))} <div className="pt-4">{!isSubmitted ? <button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length !== questions.length} className="w-full p-4 mt-6 font-bold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all">Kumpulkan Jawaban</button> : <button onClick={() => { setSubmitted(false); setAnswers({}); }} className="w-full p-4 mt-6 font-bold text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition-all">Coba Lagi</button>}</div> </div> ); };

// Komponen untuk mengelola video di dashboard developer
const VideoManager = ({ title, videos, onCrud }) => {
    const [formData, setFormData] = useState({ title: '', url: ''});
    const [editingVideo, setEditingVideo] = useState(null);
    
    const handleSave = (e) => {
        e.preventDefault();
        if (editingVideo.id) {
            onCrud('update', { id: editingVideo.id, data: { title: editingVideo.title, url: editingVideo.url, status: editingVideo.status }});
        } else {
            onCrud('add', { title: editingVideo.title, url: editingVideo.url });
        }
        setEditingVideo(null);
    };

    return (
        <InfoCard icon={<Video />} title={title}>
            <button onClick={() => setEditingVideo({ title: '', url: '', status: 'active' })} className="w-full mb-4 p-2 bg-cyan-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-cyan-600">
                <PlusCircle size={18} /> Tambah Video Rekomendasi
            </button>
            <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                {videos.length > 0 ? videos.map(video => (
                    <div key={video.id} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                         <button onClick={() => onCrud('update', { id: video.id, data: { status: video.status === 'active' ? 'inactive' : 'active' }})}>
                            {video.status === 'active' ? <Eye size={16} className="text-green-500"/> : <EyeOff size={16} className="text-slate-500"/>}
                        </button>
                        <p className="flex-grow truncate text-sm" title={video.title}>{video.title}</p>
                        <button className="p-2 hover:text-cyan-500 transition-colors" onClick={() => setEditingVideo(video)}><Edit size={16}/></button>
                        <button className="p-2 hover:text-red-500 transition-colors" onClick={() => onCrud('delete', { id: video.id })}><Trash2 size={16}/></button>
                    </div>
                )) : <p className="text-center text-slate-500 p-4">Belum ada video.</p>}
            </div>
            {editingVideo && (
                <Modal onClose={() => setEditingVideo(null)}>
                    <h3 className="text-xl font-bold mb-4">{editingVideo.id ? 'Edit' : 'Tambah'} Video Rekomendasi</h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <input type="text" placeholder="Judul Video" value={editingVideo.title} onChange={(e) => setEditingVideo(v => ({ ...v, title: e.target.value }))} className="w-full p-2 bg-slate-100 dark:bg-slate-700 rounded-lg" required />
                        <input type="url" placeholder="URL Embed YouTube" value={editingVideo.url} onChange={(e) => setEditingVideo(v => ({ ...v, url: e.target.value }))} className="w-full p-2 bg-slate-100 dark:bg-slate-700 rounded-lg" required />
                        <div className="flex justify-end gap-3 mt-4">
                            <button type="button" onClick={() => setEditingVideo(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-lg">Batal</button>
                            <button type="submit" className="px-4 py-2 bg-cyan-500 text-white rounded-lg">Simpan</button>
                        </div>
                    </form>
                </Modal>
            )}
        </InfoCard>
    );
};

// --- CSS & STYLING INJECTOR ---
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Open+Sans&family=Lexend:wght@400;700&display=swap');
    
    :root {
        --font-family-default: 'Poppins', 'Lexend', sans-serif;
        --font-family-dyslexia: 'Open Sans', sans-serif;
    }
    body, .font-sans { font-family: var(--font-family-default); }
    .dyslexia-friendly { font-family: var(--font-family-dyslexia); letter-spacing: 0.5px; word-spacing: 1.5px; }
    .font-size-sm { font-size: 0.9rem; }
    .font-size-base { font-size: 1rem; }
    .font-size-lg { font-size: 1.1rem; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.4s ease-in-out; }
    .animate-fadeInUp { animation: fadeInUp 0.4s ease-out forwards; }
    
    .aspect-w-16 { position: relative; padding-bottom: 56.25%; }
    .aspect-h-9 { height: 0; }
    .aspect-w-16 > iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }

    .prose { --tw-prose-body: #334155; --tw-prose-headings: #1e293b; --tw-prose-lead: #475569; --tw-prose-links: #0891b2; --tw-prose-bold: #1e293b; --tw-prose-counters: #64748b; --tw-prose-bullets: #94a3b8; --tw-prose-hr: #e2e8f0; --tw-prose-quotes: #1e293b; --tw-prose-quote-borders: #e2e8f0; --tw-prose-captions: #64748b; --tw-prose-code: #1e293b; --tw-prose-pre-code: #e2e8f0; --tw-prose-pre-bg: #1e293b; --tw-prose-invert-body: #d1d5db; --tw-prose-invert-headings: #fff; --tw-prose-invert-lead: #9ca3af; --tw-prose-invert-links: #67e8f9; --tw-prose-invert-bold: #fff; --tw-prose-invert-counters: #9ca3af; --tw-prose-invert-bullets: #4b5563; --tw-prose-invert-hr: #374151; --tw-prose-invert-quotes: #f3f4f6; --tw-prose-invert-quote-borders: #374151; --tw-prose-invert-captions: #9ca3af; --tw-prose-invert-code: #fff; --tw-prose-invert-pre-code: #d1d5db; --tw-prose-invert-pre-bg: rgb(0 0 0 / 50%); }
    .prose :where(a):not(:where([class~="not-prose"] *)) { text-decoration: none; font-weight: 600; }
    .prose :where(a):not(:where([class~="not-prose"] *)):hover { text-decoration: underline; }
    .prose :where(h2):not(:where([class~="not-prose"] *)) { margin-top: 1.5em; margin-bottom: 0.8em; }
    .prose :where(h3):not(:where([class~="not-prose"] *)) { margin-top: 1.2em; margin-bottom: 0.5em; }
    .prose :where(ul):not(:where([class~="not-prose"] *)) { padding-left: 1.2em; }
    .prose :where(ol):not(:where([class~="not-prose"] *)) { padding-left: 1.2em; }
    .prose :where(code):not(:where([class~="not-prose"] *)) { background-color: #e2e8f0; padding: 0.2em 0.4em; border-radius: 0.25rem; font-weight: 600; font-size: 85% !important; }
    .dark .prose :where(code):not(:where([class~="not-prose"] *)) { background-color: #334155; }
    .line-clamp-1 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; }
    .line-clamp-2 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
`;
document.head.appendChild(styleSheet);
