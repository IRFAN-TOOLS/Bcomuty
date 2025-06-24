import React, { useState, useEffect, createContext, useContext, useCallback, useMemo, useRef } from 'react';
// --- MEMPERBAIKI MASALAH IMPORT DENGAN MENGGUNAKAN CDN YANG LEBIH KOMPATIBEL ---
// Mengganti CDN esm.sh dengan cdn.skypack.dev untuk mengatasi eror "Dynamic require".
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
import ReactMarkdown from 'https://cdn.skypack.dev/react-markdown';
import remarkGfm from 'https://cdn.skypack.dev/remark-gfm';

import {
    Search, Brain, BookOpen, Youtube, Lightbulb, FileText, ArrowLeft, Loader, Sparkles,
    AlertTriangle, X, School, FlaskConical, Globe, Calculator, Dna, BarChart2, Drama,
    Computer, BookHeart, Landmark, Languages, HelpCircle, Atom, CheckCircle, ChevronRight,
    BrainCircuit, History, BookMarked, Github, Instagram, CalendarDays, User, Settings,
    LogOut, Sun, Moon, LayoutDashboard, MessageSquare, Newspaper, Menu, Send, Bot, UserCircle
} from 'lucide-react';

// --- KONFIGURASI SUPABASE & API ---
const supabaseUrl = 'https://cmrxzuddtrxdllkppkii.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtcnh6dWRkdHJ4ZGxsa3Bwa2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTcxMDQsImV4cCI6MjA2NjI5MzEwNH0.LtW-OrpGW5DS_qOINT5SBg0Yvm9Xq7nLv1jUYmD2siM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Kunci API Anda, Sembunyikan di environment variable pada produksi
const GEMINI_API_KEY = "GEMINI_API_KEY_ANDA"; // GANTI DENGAN KUNCI API GEMINI ANDA
const YOUTUBE_API_KEY = "YOUTUBE_API_KEY_ANDA"; // GANTI DENGAN KUNCI API YOUTUBE ANDA

// --- App Context untuk State Global ---
const AppContext = createContext(null);

// --- Custom Hook untuk LocalStorage ---
function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Gagal mengambil dari LocalStorage: ${key}`, error);
            return initialValue;
        }
    });

    const setValue = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Gagal menyimpan ke LocalStorage: ${key}`, error);
        }
    };
    return [storedValue, setValue];
}

// --- Data & Ikon ---
const curriculum = {
  'SD': { subjects: [{ name: 'Matematika', iconName: 'Calculator' }, { name: 'IPAS', iconName: 'Globe' }, { name: 'Pendidikan Pancasila', iconName: 'Landmark' }, { name: 'Bahasa Indonesia', iconName: 'BookHeart' }] },
  'SMP': { subjects: [{ name: 'Matematika', iconName: 'Calculator' }, { name: 'IPA Terpadu', iconName: 'FlaskConical' }, { name: 'IPS Terpadu', iconName: 'Globe' }, { name: 'Pendidikan Pancasila', iconName: 'Landmark'}, { name: 'Bahasa Indonesia', iconName: 'BookHeart' }, { name: 'Bahasa Inggris', iconName: 'Languages' }, { name: 'Informatika', iconName: 'Computer' }] },
  'SMA': { tracks: { 'IPA': [{ name: 'Matematika Peminatan', iconName: 'Calculator' }, { name: 'Fisika', iconName: 'Atom' }, { name: 'Kimia', iconName: 'FlaskConical' }, { name: 'Biologi', iconName: 'Dna' }], 'IPS': [{ name: 'Ekonomi', iconName: 'BarChart2' }, { name: 'Geografi', iconName: 'Globe' }, { name: 'Sosiologi', iconName: 'School' }], 'Bahasa': [{ name: 'Sastra Indonesia', iconName: 'BookHeart' }, { name: 'Sastra Inggris', iconName: 'Drama' }, { name: 'Antropologi', iconName: 'Globe' }, { name: 'Bahasa Asing', iconName: 'Languages' }] } }
};
const iconMap = { School, Brain, BookOpen, Youtube, Lightbulb, FileText, ArrowLeft, Loader, Sparkles, AlertTriangle, X, FlaskConical, Globe, Calculator, Dna, BarChart2, Drama, Computer, BookHeart, Landmark, Languages, HelpCircle, Atom, CheckCircle, ChevronRight, BrainCircuit, History, BookMarked, Github, Instagram, CalendarDays, User, Settings, LogOut, Sun, Moon, LayoutDashboard, MessageSquare, Newspaper, Menu, Send, Bot, UserCircle };

// --- Helper & Utilitas API ---
const callGeminiAPI = async (prompt, isJson = true) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "GEMINI_API_KEY_ANDA") throw new Error("Kunci API Gemini belum diatur.");
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: {} };
    if (isJson) { payload.generationConfig.response_mime_type = "application/json"; }

    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) { const errorBody = await response.json(); throw new Error(`API Gemini Gagal: ${errorBody.error?.message || 'Unknown Error'}`); }
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Respons API Gemini kosong.");
    const cleanedText = text.replace(/^```json\s*|```$/g, '').trim();
    return isJson ? JSON.parse(cleanedText) : cleanedText;
};

const fetchYouTubeChannelVideos = async () => {
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === "YOUTUBE_API_KEY_ANDA") {
        console.warn("Kunci API YouTube tidak diatur. Menggunakan data mock.");
        return [
            { id: { videoId: '5n5xZk3gJNY' }, snippet: { title: 'Kenapa Kita MALAS? | Series "Akar Masalah"', thumbnails: { medium: { url: 'https://i.ytimg.com/vi/5n5xZk3gJNY/mqdefault.jpg' } } } },
            { id: { videoId: 'hY7M2qPAOfQ' }, snippet: { title: 'Cara Belajar yang Benar, Menurut Sains', thumbnails: { medium: { url: 'https://i.ytimg.com/vi/hY7M2qPAOfQ/mqdefault.jpg' } } } },
            { id: { videoId: 'Gg4G_4Z1e4c' }, snippet: { title: 'Apa itu BLACK HOLE? Dan Bagaimana Cara Kerjanya?', thumbnails: { medium: { url: 'https://i.ytimg.com/vi/Gg4G_4Z1e4c/mqdefault.jpg' } } } },
            { id: { videoId: 'videoseries' }, snippet: { title: 'Perjalanan waktu itu mungkin?', thumbnails: { medium: { url: 'https://i.ytimg.com/vi/2i5A_0O5wzI/mqdefault.jpg' } } } },
        ];
    }
    const CHANNEL_ID = "UC-1A45AbQ2Y3Lw0p0hT0r1g"; // Channel ID "Pernah Mikir?"
    const API_URL = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&order=date&type=video&maxResults=8&key=${YOUTUBE_API_KEY}`;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Gagal mengambil video YouTube.');
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error("Error fetching YouTube videos:", error);
        return []; // return empty array on error
    }
};

// --- Komponen Provider Utama ---
const AppProvider = ({ children }) => {
    const [theme, setTheme] = useLocalStorage('bdukasi-theme', 'dark');
    const [fontSize, setFontSize] = useLocalStorage('bdukasi-font-size', 'base');
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isAuthLoading, setAuthLoading] = useState(true);

    // State dari kode lama, diintegrasikan
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
    
    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
    }, [theme]);

    useEffect(() => {
        const checkUser = async () => {
            setAuthLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (session?.user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                if (data) setProfile(data);
            }
            setAuthLoading(false);
        };
        checkUser();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                if (session?.user) {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    if (data) {
                        setProfile(data);
                    } else { // Auto-create profile on first login
                        const { error: insertError } = await supabase.from('profiles').insert({ 
                            id: session.user.id, 
                            email: session.user.email,
                            full_name: session.user.user_metadata.full_name,
                            avatar_url: session.user.user_metadata.avatar_url,
                            setup_complete: false // Flag untuk alur pengguna baru
                        });
                        if (!insertError) {
                            const { data: newData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                            setProfile(newData);
                        }
                    }
                } else {
                    setProfile(null);
                }
            }
        );

        return () => authListener.subscription.unsubscribe();
    }, []);

    const completeSetup = async () => {
        if (!profile) return;
        setAuthLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .update({ setup_complete: true })
            .eq('id', profile.id)
            .select()
            .single();
        if (data) setProfile(data);
        if (error) console.error("Gagal update profile:", error);
        setAuthLoading(false);
    };

    const contextValue = useMemo(() => ({ level, track, subject }), [level, track, subject]);
    const addHistory = useCallback((item) => setHistory(prev => [item, ...prev.filter(h => h.topic !== item.topic)].slice(0, 50)), [setHistory]);

    // --- Fungsi-fungsi dari kode lama ---
    const fetchLearningMaterial = useCallback(async (searchTopic, isFromHistory = false) => {
        if (!searchTopic || !contextValue.level || !contextValue.subject) return;
        setIsLoading(true); setLoadingMessage('AI sedang menyusun materi...'); setError(null);
        setLearningData(null); setScreen('lesson');
        const { level, track, subject } = contextValue;
        if (!isFromHistory) addHistory({ topic: searchTopic, level, track, subjectName: subject.name });
        
        const geminiPrompt = `Sebagai ahli materi '${subject.name}', buatkan ringkasan, materi lengkap (format Markdown bersih), dan 5 soal pilihan ganda (A-E) dengan jawaban & penjelasan untuk topik '${searchTopic}' bagi siswa ${level} ${track ? `jurusan ${track}`: ''}. Respons HANYA dalam format JSON: {"ringkasan": "...", "materi_lengkap": "...", "latihan_soal": [{"question": "...", "options": ["..."], "correctAnswer": "A", "explanation": "..."}]}`;
        
        try {
            const geminiData = await callGeminiAPI(geminiPrompt);
            setLearningData({ topic: searchTopic, ...geminiData });
        } catch (err) {
            setError(`Gagal memuat materi: ${err.message}.`);
            setScreen('subjectDashboard');
        } finally {
            setIsLoading(false);
        }
    }, [contextValue, addHistory]);

    const fetchRecommendations = useCallback(async () => {
        if (!contextValue.level || !contextValue.subject) return;
        const { level, track, subject } = contextValue;
        const prompt = `Berikan 5 rekomendasi topik menarik mata pelajaran "${subject.name}" untuk siswa ${level} ${track ? `jurusan ${track}`: ''}. Jawab HANYA dalam JSON array string. Contoh: ["Topik 1", "Topik 2"]`;
        try {
            const recs = await callGeminiAPI(prompt); setRecommendations(Array.isArray(recs) ? recs : []);
        } catch (err) { console.error("Gagal fetch rekomendasi:", err); }
    }, [contextValue]);

    const fetchBankSoal = useCallback(async (topic, count) => {
        if (!topic || !contextValue.level || !contextValue.subject || !count) return;
        setIsLoading(true); setLoadingMessage(`AI sedang membuat ${count} soal...`); setError(null);
        const { level, track, subject } = contextValue;
        const prompt = `Buatkan ${count} soal pilihan ganda (A-E) tentang '${topic}' untuk mata pelajaran '${subject.name}' level ${level} ${track ? `jurusan ${track}` : ''}. Sertakan jawaban & penjelasan. Respons HANYA dalam format JSON array objek: [{"question": "...", "options": ["..."], "correctAnswer": "A", "explanation": "..."}]`;
        try {
            const soal = await callGeminiAPI(prompt);
            setBankSoal(Array.isArray(soal) ? soal : []);
            setScreen('bankSoal');
        } catch(err) {
            setError(`Gagal membuat bank soal: ${err.message}`);
            setScreen('subjectDashboard');
        } finally {
            setIsLoading(false);
        }
    }, [contextValue]);

    const value = {
        theme, setTheme, fontSize, setFontSize, session, profile, isAuthLoading, completeSetup,
        screen, setScreen, level, setLevel, track, setTrack, subject, setSubject,
        learningData, recommendations, fetchRecommendations, bankSoal, fetchBankSoal,
        isLoading, error, setError, history, fetchLearningMaterial, setIsLoading, setLoadingMessage
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// --- Komponen Entry Point Aplikasi ---
export default function App() {
    return (
        <AppProvider>
            <div className={`font-sans antialiased text-base-content bg-base-100`}>
                <AppRouter />
            </div>
        </AppProvider>
    );
}

// --- Router Aplikasi ---
const AppRouter = () => {
    const { session, profile, isAuthLoading } = useContext(AppContext);

    if (isAuthLoading) {
        return <FullScreenLoader message="Memuat sesi Anda..." />;
    }

    if (session && profile) {
        if (!profile.setup_complete) {
            return <MoreInfoScreen />;
        }
        return <MainAppLayout />;
    }

    return <LandingPage />;
};

// --- Komponen UI Umum ---
const DynamicIcon = ({ name, ...props }) => { const IconComponent = iconMap[name]; return IconComponent ? <IconComponent {...props} /> : <HelpCircle {...props} />; };
const FullScreenLoader = ({ message }) => <div className="flex flex-col items-center justify-center min-h-screen bg-base-100"><Loader className="w-16 h-16 text-primary animate-spin" /><p className="text-xl font-semibold mt-6 text-base-content text-center max-w-md">{message || 'Memuat...'}</p></div>;
const AnimatedScreen = ({ children, className = '' }) => <div className={`p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto ${className}`} style={{animation: 'screenIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'}}>{children}</div>;
const Card = ({ children, className = '', ...props }) => <div className={`bg-base-200/50 backdrop-blur-sm border border-base-300 rounded-2xl shadow-lg overflow-hidden ${className}`} {...props}>{children}</div>;
const Button = ({ children, onClick, className = '', variant = 'primary', ...props }) => {
    const variants = {
        primary: 'bg-primary text-primary-content hover:bg-primary-focus',
        secondary: 'bg-secondary text-secondary-content hover:bg-secondary-focus',
        ghost: 'bg-transparent hover:bg-base-300/50',
    };
    return <button onClick={onClick} className={`btn ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

// --- Alur Pengguna Baru ---
const LandingPage = () => {
    const handleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
        if (error) console.error("Error login dengan Google:", error);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-30"></div>
            <div className="text-center z-10">
                <BrainCircuit className="w-28 h-28 mx-auto text-primary" />
                <h1 className="text-5xl md:text-7xl font-bold mt-4 bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">Bgune</h1>
                <p className="text-xl md:text-2xl text-base-content/80 mt-2 mb-10">Edukasi Disingkat Bdukasi. Belajar Apapun, Kapanpun dengan Guru AI Pribadimu.</p>
                <Button onClick={handleLogin} className="btn-lg">
                    <img src="https://www.vectorlogo.zone/logos/google/google-icon.svg" alt="Google Icon" className="w-6 h-6 mr-3" />
                    Mulai Belajar dengan Google
                </Button>
            </div>
            <div className="absolute bottom-0 w-full"><Footer isTransparent /></div>
        </div>
    );
};

const MoreInfoScreen = () => {
    const { profile, completeSetup } = useContext(AppContext);
    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
            <Card className="max-w-3xl text-center p-8 md:p-12">
                <h1 className="text-3xl font-bold text-primary">Selamat Datang di Bgune, {profile?.full_name || 'Pelajar Hebat'}!</h1>
                <p className="mt-4 text-base-content/80">Sebelum mulai, kami ingin berbagi beberapa informasi penting tentang bagaimana Bgune bekerja untuk membantumu belajar lebih baik.</p>
                <div className="text-left grid md:grid-cols-2 gap-6 my-8">
                    <InfoItem icon={<Bot />} title="Guru AI Pribadi" text="Bgune menggunakan teknologi AI canggih untuk menyusun materi, menjawab pertanyaan, dan membuat soal latihan yang relevan dengan kurikulum terbaru." />
                    <InfoItem icon={<BookOpen />} title="Materi Terpersonalisasi" text="Materi yang kamu dapatkan disesuaikan dengan jenjang dan mata pelajaran yang kamu pilih, memastikan kamu belajar hal yang tepat." />
                    <InfoItem icon={<ShieldCheck />} title="Keamanan Data Terjamin" text="Kami menghargai privasimu. Data belajarmu disimpan dengan aman dan hanya digunakan untuk meningkatkan pengalaman belajarmu di aplikasi ini." />
                    <InfoItem icon={<Users />} title="Karya Anak Bangsa" text="Aplikasi ini dikembangkan oleh M. Irham Andika Putra dan tim Bgune Digital, dengan misi untuk memajukan pendidikan di Indonesia." />
                </div>
                <Button onClick={completeSetup} className="btn-lg">Saya Mengerti, Lanjutkan!</Button>
            </Card>
        </div>
    );
};

// --- Layout Aplikasi Utama ---
const MainAppLayout = () => {
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const pages = {
        dashboard: <DashboardScreen setPage={setCurrentPage} />,
        learn: <LearningJourney />,
        chat: <ChatAiScreen />,
        account: <AccountScreen />,
        updates: <UpdatesScreen />,
    };

    return (
        <div className="flex min-h-screen">
            <Sidebar currentPage={currentPage} setPage={setCurrentPage} isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
            <main className="flex-1 flex flex-col transition-all duration-300">
                <header className="sticky top-0 bg-base-100/80 backdrop-blur-md z-30 flex items-center justify-between p-4 border-b border-base-300 lg:hidden">
                    <h1 className="text-xl font-bold text-primary">Bgune</h1>
                    <Button onClick={() => setSidebarOpen(true)} variant="ghost" className="btn-circle">
                        <Menu />
                    </Button>
                </header>
                <div className="flex-1 overflow-y-auto">
                    {pages[currentPage]}
                </div>
            </main>
        </div>
    );
}

const Sidebar = ({ currentPage, setPage, isSidebarOpen, setSidebarOpen }) => {
    const { profile } = useContext(AppContext);
    
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const NavItem = ({ pageName, icon, text }) => (
        <a href="#" onClick={(e) => { e.preventDefault(); setPage(pageName); setSidebarOpen(false); }}
           className={`flex items-center p-3 my-1 rounded-lg transition-colors ${currentPage === pageName ? 'bg-primary text-primary-content' : 'hover:bg-base-300/50'}`}>
            {icon}
            <span className="ml-4 font-semibold">{text}</span>
        </a>
    );

    return (
        <>
            <aside className={`fixed lg:relative lg:translate-x-0 inset-y-0 left-0 bg-base-200 w-64 p-4 z-40 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center gap-3 mb-8">
                    <BrainCircuit className="w-10 h-10 text-primary"/>
                    <h1 className="text-2xl font-bold">Bgune</h1>
                </div>
                <nav className="flex-1">
                    <NavItem pageName="dashboard" icon={<LayoutDashboard size={20}/>} text="Dashboard"/>
                    <NavItem pageName="chat" icon={<MessageSquare size={20}/>} text="Tanya Segalanya"/>
                    <NavItem pageName="account" icon={<User size={20}/>} text="Akun & Setting"/>
                    <NavItem pageName="updates" icon={<Newspaper size={20}/>} text="Pembaruan"/>
                </nav>
                <div className="mt-auto">
                    <div className="flex items-center p-2 rounded-lg bg-base-300/50">
                        <img src={profile?.avatar_url || 'https://placehold.co/40x40/7e5bef/ffffff?text=U'} alt="Avatar" className="w-10 h-10 rounded-full"/>
                        <div className="ml-3 overflow-hidden">
                            <p className="font-bold text-sm truncate">{profile?.full_name || 'Pengguna'}</p>
                            <p className="text-xs text-base-content/60 truncate">{profile?.email}</p>
                        </div>
                    </div>
                     <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} className="flex items-center p-3 my-1 rounded-lg transition-colors hover:bg-red-500/20 text-red-500">
                        <LogOut size={20}/>
                        <span className="ml-4 font-semibold">Logout</span>
                    </a>
                </div>
            </aside>
            {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-30 lg:hidden"></div>}
        </>
    );
}

// --- Halaman-Halaman Utama Aplikasi ---

const DashboardScreen = ({ setPage }) => {
    const { profile } = useContext(AppContext);
    const [videos, setVideos] = useState([]);
    const [isLoading, setLoading] = useState(true);

    useEffect(() => {
        const loadVideos = async () => {
            setLoading(true);
            const fetchedVideos = await fetchYouTubeChannelVideos();
            setVideos(fetchedVideos);
            setLoading(false);
        };
        loadVideos();
    }, []);

    const ActionButton = ({ icon, title, description, onClick }) => (
        <Card onClick={onClick} className="p-6 text-center hover:border-primary hover:-translate-y-1 transition-all cursor-pointer">
            {icon}
            <h3 className="text-xl font-bold mt-4">{title}</h3>
            <p className="text-base-content/70 mt-1">{description}</p>
        </Card>
    );

    return (
        <AnimatedScreen>
            <h1 className="text-4xl font-bold">Selamat Datang, {profile?.full_name?.split(' ')[0] || 'Pelajar Hebat'}!</h1>
            <p className="text-lg text-base-content/70 mt-1">Siap untuk menaklukkan pengetahuan hari ini?</p>
            
            <div className="grid md:grid-cols-3 gap-6 my-8">
                <ActionButton icon={<Brain size={48} className="mx-auto text-primary" />} title="Mulai Belajar" description="Pilih jenjang & mapel untuk dapat materi dari AI." onClick={() => setPage('learn')} />
                <ActionButton icon={<BrainCircuit size={48} className="mx-auto text-secondary" />} title="Bank Soal" description="Pindah ke menu 'Mulai Belajar' untuk buat soal." onClick={() => setPage('learn')} />
                <ActionButton icon={<MessageSquare size={48} className="mx-auto text-accent" />} title="Tanya Segalanya" description="Punya pertanyaan? Tanyakan langsung pada AI." onClick={() => setPage('chat')} />
            </div>

            <h2 className="text-3xl font-bold mt-12 mb-6">Rekomendasi Video dari Pernah Mikir?</h2>
            {isLoading ? (
                <div className="flex justify-center items-center h-48"><Loader className="animate-spin" size={40} /></div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {videos.map(video => (
                        <a href={`https://www.youtube.com/watch?v=${video.id.videoId}`} target="_blank" rel="noopener noreferrer" key={video.id.videoId} className="block group">
                            <Card className="overflow-hidden h-full">
                                <img src={video.snippet.thumbnails.medium.url} alt={video.snippet.title} className="w-full h-auto object-cover group-hover:scale-105 transition-transform"/>
                                <div className="p-4">
                                    <h4 className="font-bold line-clamp-2">{video.snippet.title}</h4>
                                </div>
                            </Card>
                        </a>
                    ))}
                </div>
            )}
            <Footer />
        </AnimatedScreen>
    );
}

const ChatAiScreen = () => {
    const [messages, setMessages] = useState([{ sender: 'ai', text: 'Halo! Ada yang bisa saya bantu jelaskan hari ini?' }]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;
        const newMessages = [...messages, { sender: 'user', text: input }];
        setMessages(newMessages);
        setInput('');
        setIsTyping(true);

        const prompt = `Riwayat percakapan sejauh ini:\n${newMessages.map(m => `${m.sender}: ${m.text}`).join('\n')}\n\nUser baru saja bertanya: "${input}".\n\nSebagai AI Guru di aplikasi Bgune, berikan jawaban yang jelas, mendidik, dan ramah.`;

        try {
            const aiResponse = await callGeminiAPI(prompt, false);
            setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
        } catch (error) {
            setMessages(prev => [...prev, { sender: 'ai', text: `Maaf, terjadi kesalahan: ${error.message}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <AnimatedScreen className="flex flex-col h-[calc(100vh-65px)] lg:h-screen">
            <div className="text-center mb-6">
                <h1 className="text-4xl font-bold">Tanya Segalanya</h1>
                <p className="text-lg text-base-content/70">Guru AI siap menjawab pertanyaanmu seputar pelajaran.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-base-200/50 rounded-2xl">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 my-4 ${msg.sender === 'ai' ? '' : 'flex-row-reverse'}`}>
                        <div className={`p-3 rounded-2xl max-w-lg ${msg.sender === 'ai' ? 'bg-base-300 rounded-bl-none' : 'bg-primary text-primary-content rounded-br-none'}`}>
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex items-start gap-3 my-4">
                        <div className="p-3 rounded-2xl max-w-lg bg-base-300 rounded-bl-none">
                            <Loader className="animate-spin" size={20} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="mt-6">
                <div className="relative">
                    <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="Ketik pertanyaanmu di sini..." className="w-full input input-bordered input-lg pr-16" />
                    <Button onClick={handleSend} disabled={isTyping} className="absolute right-3 top-1/2 -translate-y-1/2 btn-circle btn-primary">
                        <Send />
                    </Button>
                </div>
            </div>
        </AnimatedScreen>
    );
};


const AccountScreen = () => {
    const { theme, setTheme, fontSize, setFontSize, profile } = useContext(AppContext);

    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

    const fontSizes = { 'sm': 'Kecil', 'base': 'Normal', 'lg': 'Besar', 'xl': 'Sangat Besar' };

    return (
        <AnimatedScreen>
            <h1 className="text-4xl font-bold mb-8">Akun & Pengaturan</h1>
            <div className="grid md:grid-cols-2 gap-8">
                <Card className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Informasi Akun</h2>
                    <div className="flex items-center gap-4">
                        <img src={profile?.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full"/>
                        <div>
                            <p className="font-bold text-xl">{profile?.full_name}</p>
                            <p className="text-base-content/70">{profile?.email}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Pengaturan Tampilan</h2>
                    <div className="form-control">
                        <label className="label cursor-pointer">
                            <span className="label-text font-semibold">Mode Gelap</span> 
                            <input type="checkbox" className="toggle toggle-primary" checked={theme === 'dark'} onChange={toggleTheme} />
                        </label>
                    </div>
                     <div className="form-control mt-4">
                        <label className="label"><span className="label-text font-semibold">Ukuran Font</span></label>
                        <div className="join">
                            {Object.entries(fontSizes).map(([size, label]) => (
                                <input key={size} className="join-item btn" type="radio" name="font-size" aria-label={label}
                                       checked={fontSize === size} onChange={() => setFontSize(size)} />
                            ))}
                        </div>
                    </div>
                </Card>
            </div>
            <Footer/>
        </AnimatedScreen>
    );
};

const UpdatesScreen = () => (
    <AnimatedScreen>
        <h1 className="text-4xl font-bold mb-8">Catatan Pembaruan</h1>
        <Card>
            <div className="p-6 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold">Versi 2.0.0 - "The Revamp"</h2>
                    <p className="text-sm text-base-content/60">24 Juni 2025</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>🎉 Perombakan total Desain UI/UX menjadi lebih modern dan responsif.</li>
                        <li>✨ Tambah Halaman Dashboard sebagai pusat navigasi utama.</li>
                        <li>🤖 Tambah Halaman "Tanya Segalanya" untuk chat langsung dengan AI.</li>
                        <li>👤 Tambah Halaman Akun dan Pengaturan (Mode Gelap/Terang, Ukuran Font).</li>
                        <li>🔐 Implementasi sistem login dengan Google menggunakan Supabase.</li>
                        <li>📺 Menampilkan rekomendasi video terbaru dari channel "Pernah Mikir?".</li>
                        <li>🚀 Peningkatan performa dan pengalaman pengguna secara keseluruhan.</li>
                    </ul>
                </div>
                 <div>
                    <h2 className="text-2xl font-bold">Versi 1.0.0 - "Initial Release"</h2>
                    <p className="text-sm text-base-content/60">Awal 2024</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>🚀 Peluncuran awal aplikasi Bgune.</li>
                        <li>🧠 Inti fitur belajar berbasis AI Gemini.</li>
                        <li>📚 Pemilihan jenjang, jurusan, dan mata pelajaran.</li>
                        <li>📝 Fitur Bank Soal dan Ringkasan Materi.</li>
                    </ul>
                </div>
            </div>
        </Card>
        <Footer />
    </AnimatedScreen>
);


// --- INTEGRASI KODE LAMA SEBAGAI "LEARNING JOURNEY" ---
const LearningJourney = () => {
    const { screen, isLoading, loadingMessage, setScreen } = useContext(AppContext);
    
    // Reset screen to level selection when this component mounts if not already in the flow
    useEffect(() => {
        const learningScreens = ['levelSelection', 'trackSelection', 'subjectSelection', 'subjectDashboard', 'lesson', 'bankSoal'];
        if (!learningScreens.includes(screen)) {
            setScreen('levelSelection');
        }
    }, [screen, setScreen]);

    if (isLoading) return <FullScreenLoader message={loadingMessage} />;

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


// --- KOMPONEN-KOMPONEN DARI KODE LAMA (DISESUAIKAN GAYA) ---
const LevelSelectionScreen = () => {
    const { setScreen, setLevel } = useContext(AppContext);
    return (
        <AnimatedScreen>
            <div className="text-center pt-8">
                <h1 className="text-4xl font-bold">Mulai Petualangan Belajar!</h1>
                <p className="text-xl text-base-content/70 mt-2 mb-12">Pilih jenjang pendidikanmu untuk melanjutkan.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    {Object.keys(curriculum).map((lvl, index) => 
                        <Card key={lvl} onClick={() => { setLevel(lvl); setScreen(lvl === 'SMA' ? 'trackSelection' : 'subjectSelection'); }} className="p-8 text-center hover:border-primary hover:-translate-y-2 transition-all cursor-pointer">
                            <School size={48} className="mx-auto text-primary" />
                            <p className="text-2xl font-bold mt-4">{lvl}</p>
                        </Card>
                    )}
                </div>
            </div>
            <Footer/>
        </AnimatedScreen>
    );
};

const TrackSelectionScreen = () => {
    const { setScreen, setTrack } = useContext(AppContext);
    return (
        <AnimatedScreen>
            <BackButton onClick={() => setScreen('levelSelection')} />
            <div className="text-center pt-16">
                <h1 className="text-4xl font-bold mb-12">Pilih Jurusan</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    {Object.keys(curriculum.SMA.tracks).map((trackName) => 
                        <Card key={trackName} onClick={() => { setTrack(trackName); setScreen('subjectSelection'); }} className="p-8 text-center hover:border-primary hover:-translate-y-2 transition-all cursor-pointer">
                            <p className="text-2xl font-bold">{trackName}</p>
                        </Card>
                    )}
                </div>
            </div>
        </AnimatedScreen>
    );
};

const SubjectSelectionScreen = () => {
    const { level, track, setScreen, setSubject } = useContext(AppContext);
    const subjects = level === 'SMA' ? curriculum.SMA.tracks[track] : curriculum[level].subjects;
    const backScreen = level === 'SMA' ? 'trackSelection' : 'levelSelection';

    return (
        <AnimatedScreen>
             <BackButton onClick={() => setScreen(backScreen)} />
            <div className="pt-16">
                 <h1 className="text-4xl font-bold mb-12 text-center">Pilih Mata Pelajaran</h1>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
                    {subjects.map((s) => 
                        <Card key={s.name} onClick={() => { setSubject(s); setScreen('subjectDashboard'); }} className="p-4 flex flex-col items-center justify-center text-center hover:border-primary hover:-translate-y-1 transition-all aspect-square cursor-pointer">
                            <DynamicIcon name={s.iconName} size={48} className="text-primary" />
                            <span className="font-semibold text-sm text-center mt-3">{s.name}</span>
                        </Card>
                    )}
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

    if (!subject) return <div>Pilih mata pelajaran.</div>;

    const filteredHistory = history.filter(h => h.subjectName === subject.name);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if(inputValue.trim()) { setError(null); fetchLearningMaterial(inputValue); } 
        else { setError("Topik pencarian tidak boleh kosong."); }
    };

    return (
        <AnimatedScreen>
            <BackButton onClick={() => setScreen('subjectSelection')} />
            <div className="text-center pt-16"><DynamicIcon name={subject.iconName} size={80} className="text-primary mx-auto mb-4" /><h1 className="text-5xl font-bold">Mapel: {subject.name}</h1></div>
            <div className="w-full max-w-2xl mx-auto my-12">
                <form onSubmit={handleSearchSubmit}>
                    <div className="relative">
                        <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ketik topik untuk dipelajari..." className="input input-bordered input-lg w-full pr-16"/>
                        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-primary btn-circle"><Search /></button>
                    </div>
                     {error && <div className="alert alert-error mt-4"><AlertTriangle/><span>{error}</span></div>}
                </form>
            </div>
            <div className="tabs tabs-boxed justify-center mb-6 max-w-xl mx-auto">
                 <a className={`tab ${activeTab === 'rekomendasi' && 'tab-active'}`} onClick={() => setActiveTab('rekomendasi')}>Rekomendasi</a> 
                 <a className={`tab ${activeTab === 'riwayat' && 'tab-active'}`} onClick={() => setActiveTab('riwayat')}>Riwayat</a> 
                 <a className={`tab ${activeTab === 'bank_soal' && 'tab-active'}`} onClick={() => setActiveTab('bank_soal')}>Bank Soal</a> 
            </div>
            <div className="max-w-4xl mx-auto">
                {activeTab === 'rekomendasi' && (recommendations.length > 0 ? <div className="grid md:grid-cols-2 gap-4">{recommendations.map((rec,i)=>(<ListItem key={i} text={rec} onClick={()=>fetchLearningMaterial(rec)}/>))}</div> : <p className="text-center text-base-content/60">Tidak ada rekomendasi topik.</p>)}
                {activeTab === 'riwayat' && (filteredHistory.length > 0 ? <div className="grid md:grid-cols-2 gap-4">{filteredHistory.map((h,i)=>(<ListItem key={i} text={h.topic} onClick={()=>fetchLearningMaterial(h.topic, true)}/>))}</div> : <p className="text-center text-base-content/60">Belum ada riwayat belajar di mapel ini.</p>)}
                {activeTab === 'bank_soal' && <BankSoalGenerator />}
            </div>
            <Footer />
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
        <Card className="max-w-xl mx-auto p-6">
            <h3 className="text-xl font-bold text-center mb-4">🎯 Bank Soal Berbasis Topik</h3>
            <p className="text-center text-base-content/70 mb-4">Masukkan topik spesifik dan jumlah soal yang diinginkan.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder='Contoh: Perang Diponegoro' className='input input-bordered w-full' />
                <div className="flex flex-col sm:flex-row gap-4">
                    <input type="number" value={count} onChange={e => setCount(parseInt(e.target.value, 10))} min="1" max="20" className='input input-bordered w-full sm:w-1/3' />
                    <Button type="submit" className="w-full sm:w-2/3">Buatkan Soal!</Button>
                </div>
            </form>
        </Card>
    );
}

const LearningMaterialScreen = () => {
    const { learningData, setScreen } = useContext(AppContext);
    if (!learningData) return <div className="text-center p-8">Materi gagal dimuat. <a onClick={() => setScreen('subjectDashboard')} className="link link-primary">Kembali</a></div>;
    const { topic, ringkasan, materi_lengkap, latihan_soal } = learningData;

    return (
        <AnimatedScreen>
            <BackButton onClick={() => setScreen('subjectDashboard')} />
            <div className="space-y-8 pt-16">
                <h1 className="text-3xl sm:text-5xl font-bold text-center bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">{topic}</h1>
                {ringkasan && <InfoCard icon={<Lightbulb />} title="Ringkasan"><p className="leading-relaxed">{ringkasan}</p></InfoCard>}
                {materi_lengkap && <InfoCard icon={<BookOpen />} title="Materi Lengkap"><div className="prose prose-sm sm:prose-base max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{materi_lengkap}</ReactMarkdown></div></InfoCard>}
                {latihan_soal?.length > 0 && <InfoCard icon={<BookMarked />} title="Latihan Soal"><QuizPlayer questions={latihan_soal} /></InfoCard>}
            </div>
             <Footer />
        </AnimatedScreen>
    );
};

const BankSoalScreen = () => {
    const { bankSoal, setScreen } = useContext(AppContext);
    return (
        <AnimatedScreen>
            <BackButton onClick={() => setScreen('subjectDashboard')} />
            <div className="pt-16"><InfoCard title="Bank Soal Latihan">{bankSoal?.length > 0 ? <QuizPlayer questions={bankSoal} /> : <p className="text-center p-4">Gagal memuat soal.</p>}</InfoCard></div>
            <Footer />
        </AnimatedScreen>
    );
};

const QuizPlayer = ({ questions }) => {
    const [answers, setAnswers] = useState({});
    const [isSubmitted, setSubmitted] = useState(false);

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return <p>Soal tidak tersedia.</p>;
    }

    const score = useMemo(() => {
        if (!isSubmitted) return 0;
        return questions.reduce((acc, q, i) => acc + (answers[i]?.charAt(0) === q.correctAnswer.charAt(0) ? 1 : 0), 0);
    }, [answers, questions, isSubmitted]);

    return (
        <div className="space-y-8">
            {isSubmitted && <div className="text-center p-4 rounded-lg bg-primary/20 border border-primary"><h3 className="text-2xl font-bold">Skor: {Math.round((score / questions.length) * 100)}%</h3><p>Benar {score} dari {questions.length} soal.</p></div>}
            {questions.map((q, qIndex) => (
                <div key={qIndex}>
                    <p className="font-semibold text-lg mb-3">{qIndex + 1}. {q.question}</p>
                    <div className="space-y-2">{q.options?.map((opt, oIndex) => {
                        const isSelected = answers[qIndex] === opt;
                        const isCorrectOption = opt.charAt(0) === q.correctAnswer.charAt(0);
                        let stateClass = "btn-outline";
                        if (isSubmitted) {
                            if (isCorrectOption) stateClass = "btn-success";
                            else if (isSelected) stateClass = "btn-error";
                            else stateClass = "btn-disabled";
                        } else if (isSelected) {
                            stateClass = "btn-primary";
                        }
                        return <button key={oIndex} onClick={() => !isSubmitted && setAnswers(p => ({ ...p, [qIndex]: opt }))} disabled={isSubmitted} className={`btn w-full justify-start ${stateClass}`}>{opt}</button>
                    })}</div>
                    {isSubmitted && q.explanation && (
                        <div className="mt-4 p-4 bg-base-300/50 rounded-lg text-sm">
                            <p className="font-bold flex items-center gap-2"><CheckCircle size={16}/> Penjelasan:</p>
                            <p className="mt-2 pl-1">{q.explanation}</p>
                            <p className="mt-2 pl-1">Jawaban: <span className="font-bold text-success">{q.correctAnswer}</span></p>
                        </div>
                    )}
                </div>
            ))}
            <div className="pt-4">
                {!isSubmitted ? <Button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length !== questions.length} className="w-full">Kumpulkan</Button> : <Button onClick={() => { setSubmitted(false); setAnswers({}); }} className="w-full" variant="secondary">Coba Lagi</Button>}
            </div>
        </div>
    );
};

// --- Komponen-komponen UI Tambahan ---
const BackButton = ({ onClick }) => <button onClick={onClick} className="btn btn-ghost absolute top-6 left-6 z-10 hidden lg:flex"><ArrowLeft size={20} /> Kembali</button>;
const InfoCard = ({ icon, title, children, className = '' }) => <Card className={className}><div className="p-4 border-b border-base-300 flex items-center gap-3">{icon && <div className="text-primary">{React.cloneElement(icon, { size: 24 })}</div>}<h2 className="text-xl font-bold">{title}</h2></div><div className="p-4 sm:p-6">{children}</div></Card>;
const InfoItem = ({ icon, title, text }) => <div className="flex gap-4"><div className="text-primary mt-1">{icon}</div><div><h4 className="font-bold">{title}</h4><p className="text-sm text-base-content/70">{text}</p></div></div>;
const ListItem = ({text, onClick}) => <button onClick={onClick} className="w-full text-left flex justify-between items-center p-4 bg-base-200/50 border border-base-300 hover:border-primary rounded-lg transition-all group"><span className="font-semibold">{text}</span><ChevronRight className="group-hover:translate-x-1 transition-transform"/></button>;

const Footer = ({ isTransparent = false }) => (
    <footer className={`w-full text-center p-8 mt-16 text-sm ${isTransparent ? 'text-base-content/60' : 'text-base-content/50'}`}>
        <p>Sebuah Karya dari <strong>M. Irham Andika Putra</strong> & Tim Bgune Digital</p>
        <div className="flex justify-center gap-4 mt-4">
            <a href="https://www.youtube.com/@PernahMikirChannel" target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Youtube/></a>
            <a href="https://github.com/irhamp" target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Github/></a>
            <a href="https://www.instagram.com/irham_putra07" target="_blank" rel="noopener noreferrer" className="hover:text-primary"><Instagram/></a>
        </div>
    </footer>
);

// --- Inject CSS for animations and theming ---
const daisyUIThemes = `
[data-theme=light] {
  --p: 106 137 254; /* primary */
  --s: 250 171 211; /* secondary */
  --a: 58 196 168;  /* accent */
  --b1: 255 255 255; /* base-100 */
  --b2: 242 242 242;
  --b3: 229 229 229;
  --bc: 29 33 40;   /* base-content */
}
[data-theme=dark] {
  --p: 129 140 248; /* primary */
  --s: 251 154 203; /* secondary */
  --a: 52 211 153;  /* accent */
  --b1: 23 23 33;   /* base-100 */
  --b2: 30 30 43;
  --b3: 41 41 56;
  --bc: 222 222 229; /* base-content */
}
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
@import url('https://cdn.jsdelivr.net/npm/daisyui@4.11.1/dist/full.min.css');
:root {
  ${daisyUIThemes}
}
.btn { text-transform: none; }
@keyframes screenIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.bg-grid-pattern { background-image: linear-gradient(rgba(128, 128, 128, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(128, 128, 128, 0.1) 1px, transparent 1px); background-size: 2rem 2rem; }
.prose { --tw-prose-body: hsl(var(--bc) / 0.8); --tw-prose-headings: hsl(var(--bc)); --tw-prose-bold: hsl(var(--bc)); --tw-prose-links: hsl(var(--p)); --tw-prose-bullets: hsl(var(--bc) / 0.5); --tw-prose-code: hsl(var(--s)); --tw-prose-pre-bg: hsl(var(--b3)); --tw-prose-pre-code: hsl(var(--bc)); }
/* Add your custom CSS here if needed */
`;
document.head.appendChild(styleSheet);

// Dummy ShieldCheck and Users icons for MoreInfoScreen as they are not in lucide-react by default
const ShieldCheck = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path>
  </svg>
);

const Users = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
