import React, { useState, useEffect, createContext, useContext, useCallback, useMemo, useRef, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
    getFirestore, collection, doc, onSnapshot, addDoc, deleteDoc, updateDoc, getDocs, writeBatch, serverTimestamp, setDoc, query
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
    BarChartHorizontal, TrendingUp, BookCheck
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- KONFIGURASI PENTING & API KEYS ---
// CATATAN: Ganti dengan kunci Anda sendiri di environment produksi.
const GEMINI_API_KEY = "AIzaSyArJ1P8HanSQ_XVWX9m4kUlsIVXrBRInik"; // JANGAN DIUNGGAH KE PUBLIK
const YOUTUBE_API_KEY = "AIzaSyD9Rp-oSegoIDr8q9XlKkqpEL64lB2bQVE"; // JANGAN DIUNGGAH KE PUBLIK

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
            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    setIsAppInstalled(true);
                }
                setDeferredPrompt(null);
            } catch (error) {
                console.error("Gagal memicu prompt instalasi:", error);
            }
        }
    }, [deferredPrompt]);

    return { triggerInstall, canInstall: deferredPrompt !== null, isAppInstalled };
}

// --- FUNGSI API HELPER ---
const callGeminiAPI = async (prompt, chatHistory = []) => {
    console.log("[API Call] Memanggil Gemini API...");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "MASUKKAN_API_KEY_GEMINI_ANDA") {
        throw new Error("Kunci API Gemini belum diatur.");
    }
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    
    const contents = chatHistory.length > 0 
        ? [...chatHistory, { role: "user", parts: [{ text: prompt }] }] 
        : [{ role: "user", parts: [{ text: prompt }] }];
    
    const payload = { 
        contents, 
        generationConfig: { response_mime_type: "application/json" } 
    };

    try {
        const response = await fetch(API_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });

        if (!response.ok) { 
            const errorBody = await response.json(); 
            throw new Error(`Permintaan API Gemini gagal: ${errorBody.error?.message || response.statusText}`); 
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            throw new Error("Respons API Gemini tidak valid atau kosong.");
        }

        const cleanedText = text.replace(/^```(json)?\s*|```$/g, '').trim();
        return JSON.parse(cleanedText);

    } catch (error) {
        console.error("[API Exception] Terjadi kesalahan Gemini:", error);
        throw error;
    }
};


// --- PENYEDIA KONTEKS (PROVIDERS) ---

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDeveloper, setIsDeveloper] = useState(false);
    const [userData, setUserData] = useState(null);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setIsDeveloper(DEV_ACCOUNTS.includes(currentUser.email));
                
                const userRef = doc(db, 'users', currentUser.uid);
                const unsubUser = onSnapshot(userRef, (docSnap) => {
                    if (!docSnap.exists()) {
                        setDoc(userRef, {
                            uid: currentUser.uid,
                            displayName: currentUser.displayName,
                            email: currentUser.email,
                            photoURL: currentUser.photoURL,
                            createdAt: serverTimestamp(),
                            lastLogin: serverTimestamp(),
                            score: 0
                        }).catch(e => console.error("Gagal membuat data pengguna baru:", e));
                    } else {
                        updateDoc(userRef, { lastLogin: serverTimestamp() }).catch(e => console.error("Gagal update waktu login:", e));
                        setUserData(docSnap.data());
                    }
                }, (error) => {
                    console.error("Gagal sinkronisasi data pengguna:", error);
                    setAuthError("Gagal mengambil data profil Anda.");
                });
                return () => unsubUser();
            } else {
                setIsDeveloper(false);
                setUserData(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error pada onAuthStateChanged:", error);
            setAuthError("Terjadi masalah pada sesi otentikasi.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        setLoading(true);
        setAuthError(null);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error saat login Google:", error);
            let message = "Gagal masuk dengan Google. Silakan coba lagi.";
            if (error.code === 'auth/popup-closed-by-user') {
                message = "Anda menutup jendela login. Silakan coba lagi.";
            } else if (error.code === 'auth/popup-blocked') {
                message = "Jendela login diblokir. Izinkan popup untuk situs ini.";
            }
            setAuthError(message);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setUserData(null);
        } catch (error) {
            console.error("Error saat logout:", error);
            setAuthError("Gagal keluar. Coba muat ulang halaman.");
        }
    };

    const value = { user, userData, loading, loginWithGoogle, logout, isDeveloper, authError, setAuthError };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const SettingsProvider = ({ children }) => {
    const [theme, setTheme] = useLocalStorage('bdukasi-theme-v3', 'system');
    const [fontSize, setFontSize] = useLocalStorage('bdukasi-font-size-v3', 'base');
    const [language, setLanguage] = useLocalStorage('bdukasi-language-v3', 'id');
    const [dataSaverMode, setDataSaverMode] = useLocalStorage('bdukasi-data-saver-v3', false);
    const [dyslexiaFont, setDyslexiaFont] = useLocalStorage('bdukasi-dyslexia-v3', false);

    const devContext = useContext(DevContext);
    const featureFlags = devContext ? devContext.featureFlags : {};

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

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme === 'system') {
                const newTheme = mediaQuery.matches ? 'dark' : 'light';
                root.classList.remove('light', 'dark');
                root.classList.add(newTheme);
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [activeTheme, theme]);

    useEffect(() => {
        const root = window.document.documentElement;
        const fontSizes = ['sm', 'base', 'lg', 'xl'];
        fontSizes.forEach(size => root.classList.remove(`font-size-${size}`));
        root.classList.add(`font-size-${fontSize}`);

        root.classList.toggle('dyslexia-friendly', dyslexiaFont);
        if (featureFlags) {
           root.classList.toggle('focus-mode', featureFlags.focusMode);
        }
    }, [fontSize, dyslexiaFont, featureFlags]);

    const value = { theme, setTheme, activeTheme, fontSize, setFontSize, language, setLanguage, dataSaverMode, setDataSaverMode, dyslexiaFont, setDyslexiaFont };
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

const DevProvider = ({ children }) => {
    const [videos, setVideos] = useState([]);
    const [stats, setStats] = useState({ users: 0, materials: 0, questions: 0, lastActivity: 'N/A', totalStudyTime: 0 });
    const [logs, setLogs] = useState([]);
    const [featureFlags, setFeatureFlags] = useState({ 
        focusMode: false, 
        backgroundSound: false, 
        dailyMissions: false,
        aiAvatar: false,
        videoRecs: true
    });
    const [loading, setLoading] = useState(true);

    const addLog = useCallback((message, type = 'INFO') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] [${type}] ${message}`, ...prev].slice(-100));
    }, []);

    useEffect(() => {
        addLog("Initializing Developer Context...", "SYSTEM");

        const unsubscribers = [
            onSnapshot(collection(db, "dev_youtube_videos"), (snapshot) => {
                const fetchedVideos = snapshot.docs.map(doc => ({ fbId: doc.id, ...doc.data() }));
                setVideos(fetchedVideos);
                addLog(`Fetched ${fetchedVideos.length} videos.`, "DB");
            }, error => addLog(`Video fetch failed: ${error.message}`, "ERROR")),

            onSnapshot(doc(db, "dev_stats", "main"), (doc) => {
                if (doc.exists()) setStats(s => ({ ...s, ...doc.data() }));
                else addLog("Stats document not found.", "DB-WARN");
            }, error => addLog(`Stats fetch failed: ${error.message}`, "ERROR")),

            onSnapshot(doc(db, "dev_feature_flags", "main"), (doc) => {
                if(doc.exists()){
                    setFeatureFlags(f => ({...f, ...doc.data()}));
                    addLog("Feature flags loaded.", "DB");
                } else {
                    addLog("Feature flags doc not found. Creating with defaults.", "DB-WARN");
                    setDoc(doc(db, "dev_feature_flags", "main"), featureFlags);
                }
            }, error => addLog(`Flags fetch failed: ${error.message}`, "ERROR")),

            onSnapshot(collection(db, "users"), (snapshot) => {
                setStats(prev => ({...prev, users: snapshot.size}));
            }, error => addLog(`User count fetch failed: ${error.message}`, "ERROR"))
        ];
        
        setLoading(false);
        return () => unsubscribers.forEach(unsub => unsub());
    }, [addLog]);

    const addVideo = async (url) => {
        try {
            const videoId = new URL(url).searchParams.get('v');
            if (!videoId) throw new Error("URL YouTube tidak valid.");

            addLog(`Fetching title for video ID: ${videoId}`, "API");
            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`);
            if (!response.ok) throw new Error("Gagal mengambil data dari YouTube API.");
            const data = await response.json();
            if (!data.items || data.items.length === 0) throw new Error("Video tidak ditemukan di YouTube.");
            const title = data.items[0]?.snippet?.title || `Video ID: ${videoId}`;

            await addDoc(collection(db, "dev_youtube_videos"), { id: videoId, title, url, isActive: true, addedAt: serverTimestamp() });
            addLog(`Video added: ${title}`, "SUCCESS");
        } catch (error) {
            addLog(`Failed to add video: ${error.message}`, "ERROR");
        }
    };

    const deleteVideo = async (fbId) => {
        try {
            await deleteDoc(doc(db, "dev_youtube_videos", fbId));
            addLog(`Video with ID ${fbId} deleted.`, "CONFIG");
        } catch (error) { addLog(`Failed to delete video ${fbId}: ${error.message}`, "ERROR"); }
    };

    const toggleVideoStatus = async (fbId, currentStatus) => {
         try {
            await updateDoc(doc(db, "dev_youtube_videos", fbId), { isActive: !currentStatus });
            addLog(`Video status ${fbId} changed.`, "CONFIG");
        } catch (error) { addLog(`Failed to toggle video ${fbId}: ${error.message}`, "ERROR"); }
    };

    const updateVideoTitle = async (fbId, newTitle) => {
        try {
            await updateDoc(doc(db, "dev_youtube_videos", fbId), { title: newTitle });
            addLog(`Video title ${fbId} updated.`, "CONFIG");
        } catch (error) { addLog(`Failed to update title ${fbId}: ${error.message}`, "ERROR"); }
    }

    const toggleFeatureFlag = async (featureKey) => {
        const flagsRef = doc(db, "dev_feature_flags", "main");
        const newValue = !featureFlags[featureKey];
        try {
            await updateDoc(flagsRef, { [featureKey]: newValue });
            addLog(`Feature '${featureKey}' toggled to ${newValue}.`, "CONFIG");
        } catch (error) {
            addLog(`Failed to update flag '${featureKey}': ${error.message}`, "ERROR");
        }
    };

    const value = { videos, addVideo, deleteVideo, toggleVideoStatus, updateVideoTitle, stats, logs, addLog, featureFlags, toggleFeatureFlag, loading };
    return <DevContext.Provider value={value}>{children}</DevContext.Provider>;
}

const AppProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
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
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [learningVideos, setLearningVideos] = useState([]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    const contextValue = useMemo(() => ({ level, track, subject }), [level, track, subject]);
    const addHistory = useCallback((item) => setHistory(prev => [item, ...prev.filter(h => h.topic !== item.topic)].slice(0, 50)), [setHistory]);

    const handleMarkAsComplete = async (topic) => {
        if (!user || !topic) return;
        try {
            const materialId = topic.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            const materialRef = doc(db, `users/${user.uid}/completed_materials`, materialId);
            
            await setDoc(materialRef, {
                topic,
                completedAt: serverTimestamp(),
                subjectName: subject?.name || 'Unknown',
            });
            
            const userRef = doc(db, 'users', user.uid);
            const completedCollection = collection(db, `users/${user.uid}/completed_materials`);
            const snapshot = await getDocs(completedCollection);
            await updateDoc(userRef, { score: snapshot.size });

            showToast("Kerja bagus! Materi ditandai selesai.");
        } catch (err) {
            console.error("Gagal menandai selesai:", err);
            showToast("Gagal menyimpan progres, coba lagi nanti.", 'error');
        }
    };

    const fetchLearningVideos = useCallback(async (topic) => {
        if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY.includes("GANTI") || !topic) return;
        setLoadingMessage('Mencari video pendukung...');
        try {
            const query = encodeURIComponent(`${topic} ${subject?.name || ''} ${level || ''} tutorial`);
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=3&key=${YOUTUBE_API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Gagal mengambil data video dari YouTube.');
            const data = await response.json();
            const videos = data.items?.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
            })) || [];
            setLearningVideos(videos);
        } catch (err) {
            console.error("Gagal fetch video pembelajaran:", err);
            setLearningVideos([]);
        }
    }, [level, subject]);

    const fetchLearningMaterial = useCallback(async (searchTopic, isFromHistory = false) => {
        setIsLoading(true); 
        setLoadingMessage('Guru AI sedang menyiapkan materimu...'); 
        setError(null); 
        setLearningData(null); 
        setLearningVideos([]);
        setPage('belajar'); 
        setScreen('lesson');

        const { level, track, subject } = contextValue;
        if (!subject) {
            setError("Konteks belajar tidak ditemukan. Silakan pilih ulang mata pelajaran.");
            setIsLoading(false);
            setPage('dashboard');
            return;
        }

        if (!isFromHistory) addHistory({ topic: searchTopic, level, track, subjectName: subject.name });

        const geminiPrompt = `Sebagai ahli materi pelajaran, buatkan ringkasan, materi lengkap (format Markdown bersih), dan 5 soal latihan pilihan ganda (A-E) dengan jawaban & penjelasan untuk topik '${searchTopic}' pelajaran '${subject.name}' tingkat ${level} ${track ? `jurusan ${track}`: ''}. Respons HANYA dalam format JSON: {"ringkasan": "...", "materi_lengkap": "...", "latihan_soal": [{"question": "...", "options": [...], "correctAnswer": "A", "explanation": "..."}]}`;

        try {
            const geminiData = await callGeminiAPI(geminiPrompt);
            if (typeof geminiData !== 'object' || !geminiData.materi_lengkap) {
                throw new Error("Format respons dari AI tidak sesuai.");
            }
            setLearningData({ topic: searchTopic, ...geminiData });
            await fetchLearningVideos(searchTopic);
        } catch (err) {
            setError(`Gagal memuat materi: ${err.message}. Coba lagi atau gunakan topik lain.`);
            showToast(`Error: ${err.message}`, 'error');
            setPage('belajar');
            setScreen('subjectDashboard');
        } finally {
            setIsLoading(false);
        }
    }, [contextValue, addHistory, fetchLearningVideos, showToast]);


    const fetchBankSoal = useCallback(async (topic, count) => {
        if (!topic || !contextValue.subject || !count) { setError("Harap masukkan topik dan jumlah soal."); return; }
        setIsLoading(true); setLoadingMessage(`Guru AI sedang membuat ${count} soal...`); setError(null);
        const { level, track, subject } = contextValue;
        const prompt = `Buatkan ${count} soal pilihan ganda (A-E) tentang '${topic}' untuk pelajaran '${subject.name}' level ${level} ${track ? `jurusan ${track}` : ''}. Sertakan jawaban & penjelasan. Respons HANYA dalam format JSON array objek: [{"question": "...", "options": [...], "correctAnswer": "A", "explanation": "..."}]`;
        try { 
            const soal = await callGeminiAPI(prompt);
            setBankSoal(Array.isArray(soal) ? soal : []);
            setPage('belajar'); setScreen('bankSoal');
        } catch(err) { setError(`Gagal membuat bank soal: ${err.message}`); showToast(err.message, 'error'); setPage('belajar'); setScreen('subjectDashboard'); } finally { setIsLoading(false); }
    }, [contextValue, showToast]);

    const fetchRecommendations = useCallback(async () => {
        if (!contextValue.subject) return;
        const { level, track, subject } = contextValue;
        const prompt = `Berikan 5 rekomendasi topik menarik untuk mata pelajaran "${subject.name}" level ${level} ${track ? `jurusan ${track}`: ''}. Jawab HANYA dalam format JSON array string. Contoh: ["Topik 1", "Topik 2"]`;
        try {  
            const recs = await callGeminiAPI(prompt); 
            setRecommendations(Array.isArray(recs) ? recs : []); 
        } catch (err) { console.error("Gagal fetch rekomendasi:", err); setRecommendations([]); }
    }, [contextValue]);

    const value = { 
        page, setPage, screen, setScreen, level, setLevel, track, setTrack, subject, setSubject, 
        learningData, recommendations, bankSoal, 
        isLoading, error, setError, history, addHistory, 
        loadingMessage, isSidebarOpen, setSidebarOpen,
        fetchLearningMaterial, fetchBankSoal, fetchRecommendations,
        handleMarkAsComplete, toast, showToast,
        learningVideos
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// --- KOMPONEN UI & PENDUKUNG ---

const LoadingScreen = ({ message }) => (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-[100] flex flex-col items-center justify-center gap-6">
        <div className="relative w-24 h-24">
            <img src="https://lh3.googleusercontent.com/u/0/d/1x9XzTfUe64N2dzTrYOdF05Ncl67d9Dcn" alt="Loading Logo" className="w-full h-full animate-pulse" onError={(e) => e.target.outerHTML = '<Brain class="w-full h-full text-cyan-500 animate-pulse" />'} />
        </div>
        <p className="text-xl font-semibold text-slate-600 dark:text-slate-300 text-center max-w-xs">{message || 'Memuat...'}</p>
    </div>
);

// --- HALAMAN-HALAMAN UTAMA (PAGES) ---

const LandingPage = () => {
    const { loginWithGoogle, loading } = useContext(AuthContext);
    const features = [
        { icon: <BrainCog size={28} />, title: "Guru AI Cerdas", text: "Dapatkan penjelasan, ringkasan, dan jawaban instan untuk setiap pertanyaanmu." },
        { icon: <Video size={28} />, title: "Video Terkurasi", text: "Belajar dari video pilihan berkualitas yang relevan dengan materimu." },
        { icon: <Trophy size={28} />, title: "Papan Peringkat", text: "Asah pemahamanmu dan bersaing sehat dengan pelajar lain." }
    ];
    return (
        <div className="bg-slate-50 min-h-screen text-slate-800">
            <header className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <img src="https://lh3.googleusercontent.com/u/0/d/1x9XzTfUe64N2dzTrYOdF05Ncl67d9Dcn" alt="Bdukasi Logo" className="h-10 w-10" onError={(e) => e.target.outerHTML = '<Brain class="h-10 w-10 text-cyan-500" />'} />
                    <h1 className="font-bold text-2xl">Bdukasi</h1>
                </div>
                 <button onClick={loginWithGoogle} disabled={loading} className="px-5 py-2.5 bg-cyan-500 text-white font-bold rounded-full shadow-lg hover:bg-cyan-600 transform hover:scale-105 transition-all duration-300 flex items-center gap-2 group disabled:bg-cyan-300 disabled:scale-100">
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
                    <button onClick={loginWithGoogle} disabled={loading} className="mt-10 px-8 py-4 bg-cyan-500 text-white font-bold text-lg rounded-full shadow-lg hover:bg-cyan-600 transform hover:scale-105 transition-all duration-300 flex items-center gap-3 group mx-auto disabled:bg-cyan-300 disabled:scale-100">
                        <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.19,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.19,22C17.6,22 21.54,18.33 21.54,12.81C21.54,11.76 21.45,11.44 21.35,11.1Z"></path></svg>
                        {loading ? "Memproses..." : "Masuk dan Mulai Sekarang"}
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
    const { setPage } = useContext(AppContext);
    const { user, userData } = useContext(AuthContext);
    const { videos, featureFlags } = useContext(DevContext);
    const [recommendedVideos, setRecommendedVideos] = useState([]);
    const [quote, setQuote] = useState('');

    useEffect(() => {
        setQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);

        if (featureFlags?.videoRecs && videos && videos.length > 0) {
            const activeVideos = videos.filter(v => v.isActive);
            const shuffled = [...activeVideos].sort(() => 0.5 - Math.random());
            setRecommendedVideos(shuffled.slice(0, 3));
        }
    }, [videos, featureFlags]);

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
                    <DashboardCard icon={<Trophy size={32} />} title="Papan Peringkat" description="Lihat posisimu di antara para juara." onClick={() => { setPage('leaderboard'); }} className="bg-white dark:bg-slate-800" />
                    <DashboardCard icon={<Award size={32} />} title="Misi Harian" description="Segera hadir!" onClick={() => {}} className="bg-white dark:bg-slate-800" disabled={!featureFlags?.dailyMissions} />
                </div>

                <div className="lg:col-span-1">
                    <InfoCard icon={<BarChart2 />} title="Statistik Kamu">
                         {!userData ? (
                            <div className="flex justify-center items-center h-24"><Loader size={28} className="animate-spin text-cyan-500" /></div>
                         ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                                    <span className="font-semibold text-slate-600 dark:text-slate-300">Skor Belajar</span>
                                    <span className="font-bold text-2xl text-cyan-500">{userData.score || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                                    <span className="font-semibold text-slate-600 dark:text-slate-300">Waktu Belajar</span>
                                    <span className="font-bold text-2xl text-cyan-500">N/A</span>
                                </div>
                            </div>
                         )}
                    </InfoCard>
                </div>
            </div>

            {featureFlags?.videoRecs && recommendedVideos && recommendedVideos.length > 0 && (
                <div className="mt-8">
                    <InfoCard icon={<Tv />} title="Rekomendasi Video Edukasi">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {recommendedVideos.map(video => (
                                <div key={video.id} className="bg-slate-100 dark:bg-slate-800/50 rounded-xl overflow-hidden shadow-sm">
                                    <div className="aspect-w-16 aspect-h-9 bg-black rounded-t-lg">
                                        <iframe src={`https://www.youtube.com/embed/${video.id}`} title={video.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy"></iframe>
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

// ... (Other page components will follow this pattern)
const LearningFlow = () => { const { screen } = useContext(AppContext); return <ScreenContainer />; };
const ChatAiPage = () => { /* ... code for ChatAiPage ... */ return <div>Chat AI Page</div> };
const LeaderboardPage = () => { /* ... code for LeaderboardPage ... */ return <div>Leaderboard Page</div>};
const SettingsPage = () => { /* ... code for SettingsPage ... */ return <div>Settings Page</div>};
const UpdateLogPage = () => { /* ... code for UpdateLogPage ... */ return <div>UpdateLog Page</div>};
const DeveloperDashboardPage = () => { /* ... code for DeveloperDashboardPage ... */ return <div>Developer Page</div>};
// For brevity, the full code for all components is not repeated here but would be in the actual file.

// KOMPONEN UTAMA APLIKASI
export default function App() {
    return (
        <DevProvider>
            <SettingsProvider>
                <AuthProvider>
                    <AppProvider>
                        <MainApp />
                    </AppProvider>
                </AuthProvider>
            </SettingsProvider>
        </DevProvider>
    );
}

const MainApp = () => {
    const { loading: authLoading, user, authError, setAuthError } = useContext(AuthContext);
    const { isLoading: appIsLoading, loadingMessage, toast, showToast } = useContext(AppContext);
    const [showPWAInstall, setShowPWAInstall] = useState(false);
    const { canInstall, isAppInstalled, triggerInstall } = usePWAInstall();

    useEffect(() => {
        if (canInstall && !isAppInstalled) {
            const timer = setTimeout(() => {
                setShowPWAInstall(true);
                showToast('Aplikasi Bdukasi bisa di-install!', 'info');
            } , 7000); 
            return () => clearTimeout(timer);
        }
    }, [canInstall, isAppInstalled, showToast]);
    
    if (authLoading || appIsLoading) {
        return <LoadingScreen message={authLoading ? "Memverifikasi sesi Anda..." : loadingMessage} />;
    }

    return (
      <>
        {toast.show && <ToastNotification message={toast.message} type={toast.type} onClose={() => {}} />}
        {authError && <ToastNotification message={authError} type="error" onClose={() => setAuthError(null)} />}
        {showPWAInstall && <PWAInstallPopup onClose={() => setShowPWAInstall(false)} onInstall={triggerInstall} />}

        {!user ? <LandingPage /> : <AppLayout />}
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


// --- KOMPONEN LAINNYA ---
const ToastNotification = ({ message, type = 'success', onClose }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        setVisible(true);
        const timer = setTimeout(() => {
            setVisible(false);
            // Allow time for fade out animation before calling onClose
            setTimeout(onClose, 300);
        }, 3500);
        return () => clearTimeout(timer);
    }, [onClose]);


    const colors = {
        success: "bg-green-500 text-white",
        error: "bg-red-500 text-white",
        info: "bg-slate-900 dark:bg-white text-white dark:text-black",
    };
    const Icon = {
        success: <CheckCircle />,
        error: <AlertTriangle />,
        info: <Info />
    }[type];

    return (
        <div className={`fixed bottom-5 right-5 ${colors[type]} px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-[101] transition-all duration-300 ${visible ? 'animate-fadeInUp' : 'opacity-0 translate-y-5'}`}>
            {Icon}
            <p className="font-semibold">{message}</p>
        </div>
    );
}

const PWAInstallPopup = ({ onClose, onInstall }) => {
    return (
        <Modal onClose={onClose}>
            <div className="text-center relative">
                <button onClick={onClose} className="absolute -top-2 -right-2 text-slate-400 hover:text-slate-600"><X /></button>
                <img src="https://lh3.googleusercontent.com/u/0/d/1x9XzTfUe64N2dzTrYOdF05Ncl67d9Dcn" alt="App Logo" className="w-20 h-20 mx-auto mb-4" onError={(e) => e.target.outerHTML = '<Brain class="w-20 h-20 mx-auto mb-4 text-cyan-500" />'} />
                <h2 className="text-2xl font-bold">Install Aplikasi Bdukasi</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6">Dapatkan pengalaman belajar terbaik dengan menginstal aplikasi di perangkatmu.</p>
                <button onClick={() => { onInstall(); onClose(); }} className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-cyan-500 text-white font-bold rounded-lg hover:bg-cyan-600 transition-colors">
                    <Download size={20} /> Install Sekarang
                </button>
            </div>
        </Modal>
    );
};

const Modal = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black/60 z-[99] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6 m-4" onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);

const Navbar = () => {
    const { setSidebarOpen } = useContext(AppContext);
    return (
        <header className="sticky top-0 bg-white/70 dark:bg-slate-900/80 backdrop-blur-md z-10 border-b border-slate-200 dark:border-slate-700 md:hidden">
            <div className="px-4 h-16 flex items-center justify-between">
                <div className="font-bold text-xl flex items-center gap-2"><img src="https://lh3.googleusercontent.com/u/0/d/1x9XzTfUe64N2dzTrYOdF05Ncl67d9Dcn" alt="Logo" className="h-8 w-8" onError={(e) => e.target.outerHTML = '<Brain class="h-8 w-8 text-cyan-500" />'} /> Bdukasi</div>
                <button onClick={() => setSidebarOpen(true)} className="md:hidden"><Menu /></button>
            </div>
        </header>
    );
};

const Sidebar = () => {
    const { page, setPage, isSidebarOpen, setSidebarOpen } = useContext(AppContext);
    const { logout, user, isDeveloper } = useContext(AuthContext);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'belajar', label: 'Mulai Belajar', icon: <BrainCircuit size={20} /> },
        { id: 'tanya-ai', label: 'Tanya AI', icon: <MessageSquare size={20} />},
        { id: 'leaderboard', label: 'Papan Peringkat', icon: <Trophy size={20} />},
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
                 <div className="flex items-center gap-3 text-2xl font-bold mb-10"><img src="https://lh3.googleusercontent.com/u/0/d/1x9XzTfUe64N2dzTrYOdF05Ncl67d9Dcn" alt="Logo" className="h-10 w-10" onError={(e) => e.target.outerHTML = '<Brain class="h-10 w-10 text-cyan-500" />'} /><span className="text-slate-800 dark:text-white">Bdukasi</span></div>
                <nav className="flex-grow space-y-2">{navItems.map(item => (<button key={item.id} onClick={() => { setPage(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors text-base ${page === item.id ? 'bg-cyan-500 text-white font-semibold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{React.cloneElement(item.icon, { className: page === item.id ? 'text-white' : 'text-slate-500' })}<span>{item.label}</span></button>))}</nav>
                <div className="mt-auto">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 mb-4"><img src={user?.photoURL} alt="Avatar" className="w-10 h-10 rounded-full" /><div className='overflow-hidden'><p className="font-semibold text-sm line-clamp-1">{user?.displayName}</p><p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{user?.email}</p></div></div>
                    <button onClick={logout} className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 font-semibold"><LogOut size={20}/><span>Keluar</span></button>
                </div>
            </aside>
        </>
    );
}

// ... other small components like InfoCard, AnimatedScreen, etc.
const InfoCard = ({ icon, title, children, className = '' }) => <div className={`bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden ${className} animate-fadeInUp`}><div className="p-4 border-b border-slate-200/80 dark:border-slate-700/50 flex items-center gap-3">{icon && <div className="text-cyan-500">{React.cloneElement(icon, { size: 24 })}</div>}<h2 className="text-xl font-bold">{title}</h2></div><div className="p-4 sm:p-6">{children}</div></div>;
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
const Footer = ({ isLanding = false }) => (
    <footer className={`w-full text-center p-6 text-slate-500 dark:text-slate-400 text-sm ${isLanding ? 'relative z-10 mt-16' : 'mt-auto'}`}>
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Sebuah Karya dari</p><p className="text-lg font-bold text-slate-900 dark:text-white">M. Irham Andika Putra & Bgune Digital</p>
        <div className="flex justify-center gap-4 mt-3"><a href="https://www.youtube.com/@PernahMikir" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 transition-colors"><Youtube/></a><a href="https://github.com/irhamp" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 transition-colors"><Github/></a><a href="https://www.instagram.com/irham_putra07" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 transition-colors"><Instagram/></a></div>
        <p className="mt-4 text-xs">Dibuat dengan <Sparkles className="inline h-3 w-3 text-amber-400"/> dan Teknologi AI dari Google</p>
    </footer>
);

// Inject style
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Open+Sans&family=Lexend:wght@400;700&display=swap');
    :root { --font-family-default: 'Poppins', 'Lexend', sans-serif; --font-family-dyslexia: 'Open Sans', sans-serif; }
    body, .font-sans { font-family: var(--font-family-default); }
    .dyslexia-friendly { font-family: var(--font-family-dyslexia); letter-spacing: 0.5px; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.4s ease-in-out; }
    .animate-fadeInUp { animation: fadeInUp 0.4s ease-out forwards; }
    .aspect-w-16 { position: relative; padding-bottom: 56.25%; }
    .aspect-h-9 { height: 0; }
    .aspect-w-16 > iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
    .prose a { text-decoration: none; font-weight: 600; }
    .prose a:hover { text-decoration: underline; }
    .line-clamp-1 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; }
    .line-clamp-2 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
`;
document.head.appendChild(styleSheet);
