import React, { useState, useEffect, createContext, useContext, useCallback, useMemo, useRef } from 'react';
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
const GEMINI_API_KEY = "AIzaSyArJ1P8HanSQ_XVWX9m4kUlsIVXrBRInik";
const YOUTUBE_API_KEY = "AIzaSyD9Rp-oSegoIDr8q9XlKkqpEL64lB2bQVE";

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
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setIsDeveloper(DEV_ACCOUNTS.includes(currentUser.email));

                // Simpan data pengguna ke Firestore jika belum ada
                const userRef = doc(db, 'users', currentUser.uid);
                onSnapshot(userRef, (docSnap) => {
                    if (!docSnap.exists()) {
                        setDoc(userRef, {
                            uid: currentUser.uid,
                            displayName: currentUser.displayName,
                            email: currentUser.email,
                            photoURL: currentUser.photoURL,
                            createdAt: serverTimestamp(),
                            lastLogin: serverTimestamp()
                        });
                    } else {
                        updateDoc(userRef, { lastLogin: serverTimestamp() });
                        setUserData(docSnap.data());
                    }
                });

            } else {
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
    const [theme, setTheme] = useLocalStorage('bdukasi-theme-v3', 'system');
    const [fontSize, setFontSize] = useLocalStorage('bdukasi-font-size-v3', 'base');
    const [language, setLanguage] = useLocalStorage('bdukasi-language-v3', 'id');
    const [dataSaverMode, setDataSaverMode] = useLocalStorage('bdukasi-data-saver-v3', false);
    const [dyslexiaFont, setDyslexiaFont] = useLocalStorage('bdukasi-dyslexia-v3', false);

    const { featureFlags } = useContext(DevContext) || {};

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
        const root = window.document.documentElement;

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

    }, [theme]);


    useEffect(() => {
        const root = window.document.documentElement;
        const fontSizes = ['sm', 'base', 'lg', 'xl'];
        fontSizes.forEach(size => root.classList.remove(`font-size-${size}`));
        root.classList.add(`font-size-${fontSize}`);

        root.classList.toggle('dyslexia-friendly', dyslexiaFont);
        root.classList.toggle('focus-mode', featureFlags?.focusMode);
    }, [fontSize, dyslexiaFont, featureFlags]);

    const value = { theme, setTheme, activeTheme, fontSize, setFontSize, language, setLanguage, dataSaverMode, setDataSaverMode, dyslexiaFont, setDyslexiaFont };
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

const DevProvider = ({ children }) => {
    const [videos, setVideos] = useState([]);
    const [stats, setStats] = useState({ users: 0, materials: 0, questions: 0, lastActivity: 'N/A', totalStudyTime: 0 });
    const [logs, setLogs] = useState([`[${new Date().toLocaleTimeString()}] [SYSTEM] Developer console initialized.`]);
    const [featureFlags, setFeatureFlags] = useState({
        focusMode: false,
        backgroundSound: false,
        dailyMissions: false,
        aiAvatar: false,
        videoRecs: true
    });
    const [loading, setLoading] = useState(true);

    const addLog = (message, type = 'INFO') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] [${type}] ${message}`, ...prev].slice(-100));
    };

    useEffect(() => {
        setLoading(true);
        addLog("Initializing Developer Context...", "SYSTEM");

        const unsubscribers = [
            onSnapshot(collection(db, "dev_youtube_videos"), (snapshot) => {
                const fetchedVideos = snapshot.docs.map(doc => ({ fbId: doc.id, ...doc.data() }));
                setVideos(fetchedVideos);
                addLog(`Fetched ${fetchedVideos.length} videos.`, "DB");
            }, error => addLog(`Video fetch failed: ${error.message}`, "ERROR")),

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
                    // Create if not exists
                    setDoc(doc(db, "dev_feature_flags", "main"), featureFlags);
                }
            }, error => addLog(`Flags fetch failed: ${error.message}`, "ERROR")),

            onSnapshot(collection(db, "users"), (snapshot) => {
                setStats(prev => ({...prev, users: snapshot.size}));
                addLog(`User count updated to ${snapshot.size}.`, "DB");
            }, error => addLog(`User count fetch failed: ${error.message}`, "ERROR"))
        ];

        setLoading(false);

        return () => {
            unsubscribers.forEach(unsub => unsub());
            addLog("Developer Context cleaned up.", "SYSTEM");
        };
    }, []);

    const addVideo = async (url) => {
        try {
            const videoId = new URL(url).searchParams.get('v');
            if (!videoId) throw new Error("URL YouTube tidak valid.");

            addLog(`Fetching title for video ID: ${videoId}`, "API");
            const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`);
            if (!response.ok) throw new Error("Gagal mengambil data dari YouTube API.");
            const data = await response.json();
            const title = data.items[0]?.snippet?.title || `Video ID: ${videoId}`;

            const newVideo = {
                id: videoId,
                title,
                url,
                isActive: true,
                addedAt: serverTimestamp()
            };
            await addDoc(collection(db, "dev_youtube_videos"), newVideo);
            addLog(`Video added: ${title}`, "SUCCESS");
        } catch (error) {
            addLog(`Failed to add video: ${error.message}`, "ERROR");
            console.error(error);
        }
    };

    const deleteVideo = async (fbId) => {
        await deleteDoc(doc(db, "dev_youtube_videos", fbId));
        addLog(`Video with ID ${fbId} has been deleted.`, "CONFIG");
    };

    const toggleVideoStatus = async (fbId, currentStatus) => {
        await updateDoc(doc(db, "dev_youtube_videos", fbId), { isActive: !currentStatus });
        addLog(`Video status ${fbId} changed to ${!currentStatus ? 'ACTIVE' : 'INACTIVE'}.`, "CONFIG");
    };

    const updateVideoTitle = async (fbId, newTitle) => {
        await updateDoc(doc(db, "dev_youtube_videos", fbId), { title: newTitle });
        addLog(`Video title ${fbId} updated.`, "CONFIG");
    }

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
    const [toast, setToast] = useState({ show: false, message: '' });
    const [learningVideo, setLearningVideo] = useState(null); // NEW: State for learning video

    const showToast = (message) => {
        setToast({ show: true, message });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
    };

    const contextValue = useMemo(() => ({ level, track, subject }), [level, track, subject]);
    const addHistory = useCallback((item) => setHistory(prev => [item, ...prev.filter(h => h.topic !== item.topic)].slice(0, 50)), [setHistory]);

    const handleMarkAsComplete = async (topic) => {
        if (!user || !topic) return;
        try {
            const materialRef = doc(db, `users/${user.uid}/completed_materials`, topic.replace(/\s+/g, '-').toLowerCase());
            await setDoc(materialRef, {
                topic,
                completedAt: serverTimestamp(),
                subjectName: subject?.name || 'Unknown',
            });
            showToast("Kerja bagus, kamu luar biasa! Materi ditandai selesai.");
        } catch (err) {
            console.error("Gagal menandai selesai:", err);
            showToast("Gagal menyimpan progres, coba lagi nanti.");
        }
    };

    const fetchLearningMaterial = useCallback(async (searchTopic, isFromHistory = false) => {
        setIsLoading(true); setLoadingMessage('Guru AI sedang menyiapkan materimu...'); setError(null); setLearningData(null); setPage('belajar'); setScreen('lesson');
        setLearningVideo(null); // NEW: Reset learning video when fetching new material

        const { level, track, subject } = contextValue;
        if (!isFromHistory) addHistory({ topic: searchTopic, level, track, subjectName: subject.name });

        const geminiPrompt = `Sebagai ahli materi pelajaran, buatkan ringkasan, materi lengkap (format Markdown bersih), dan 5 soal latihan pilihan ganda (A-E) dengan jawaban & penjelasan untuk topik '${searchTopic}' pelajaran '${subject.name}' tingkat ${level} ${track ? `jurusan ${track}`: ''}. Respons HANYA dalam format JSON: {"ringkasan": "...", "materi_lengkap": "...", "latihan_soal": [{"question": "...", "options": [...], "correctAnswer": "A", "explanation": "..."}]}`;

        // NEW: Prompt for YouTube video
        const youtubePrompt = `Berikan 1 URL video YouTube yang relevan, edukatif, dan berdurasi panjang (lebih dari 10 menit) tentang '${searchTopic}' pelajaran '${subject.name}' tingkat ${level} ${track ? `jurusan ${track}` : ''}. Berikan HANYA URL video tersebut. Contoh: https://www.youtube.com/watch?v=VIDEO_ID`;


        try {
            const geminiData = await callGeminiAPI(geminiPrompt);
            setLearningData({ topic: searchTopic, ...geminiData });

            // NEW: Fetch YouTube video
            const youtubeVideoUrl = await callGeminiAPI(youtubePrompt);
            if (youtubeVideoUrl) {
                // Basic validation for YouTube URL format
                const videoIdMatch = youtubeVideoUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/);
                if (videoIdMatch && videoIdMatch[1]) {
                    const videoId = videoIdMatch[1];
                    setLearningVideo({ id: videoId, title: searchTopic, url: youtubeVideoUrl });
                } else {
                    console.warn("Invalid YouTube URL received from API:", youtubeVideoUrl);
                }
            }

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
        fetchLearningMaterial, fetchBankSoal, fetchRecommendations,
        handleMarkAsComplete, toast, showToast,
        learningVideo, setLearningVideo // NEW: Add learningVideo to context value
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};


// --- FUNGSI API HELPER ---
const callGeminiAPI = async (prompt, chatHistory = []) => {
    console.log("[API Call] Memanggil Gemini API...");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "MASUKKAN_API_KEY_GEMINI_ANDA") throw new Error("Kunci API Gemini belum diatur.");
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const contents = chatHistory.length > 0 ? [...chatHistory, { role: "user", parts: [{ text: prompt }] }] : [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents, generationConfig: { response_mime_type: "application/json" } };
    try {
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) { const errorBody = await response.json(); throw new Error(`Permintaan API Gemini gagal: ${errorBody.error?.message || 'Error tidak diketahui'}`); }
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Respons API Gemini tidak valid atau kosong.");
        const cleanedText = text.replace(/^