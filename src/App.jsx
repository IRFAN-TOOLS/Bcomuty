import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    signInAnonymously,
    signInWithCustomToken
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    serverTimestamp,
    updateDoc,
    arrayUnion,
    arrayRemove,
    getDocs,
    Timestamp
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Import icons from lucide-react
import { 
    Home, MessageSquare, Bell, UserCircle, LogOut, PlusCircle, Send, Search, Image as ImageIcon, Video as VideoIcon, Users, Settings, X, ArrowLeft, Heart, MessageCircle as CommentIcon
} from 'lucide-react';

// Firebase Configuration
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "AIzaSyANQqaFwrsf3xGSDxyn9pcRJqJrIiHrjM0",
  authDomain: "bgune---community.firebaseapp.com",
  projectId: "bgune---community",
  storageBucket: "bgune---community.appspot.com",
  messagingSenderId: "749511144215",
  appId: "1:749511144215:web:dcf13c4d59dc705d4f7d52",
  measurementId: "G-5XRSG2H5SV" };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'bgune-komunitas-app-revised';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ❗❗ Tambahkan ini kalau belum ada:

const provider = new GoogleAuthProvider();

// Helper function to get user ID
const getCurrentUserId = () => auth.currentUser?.uid || null;

// Firestore collection paths
const getCollectionPath = (collectionName, isPublic = false) => {
    const userId = getCurrentUserId();
    if (isPublic) {
        return `/artifacts/${appId}/public/data/${collectionName}`;
    }
    if (!userId) {
        console.warn("User not authenticated for private collection access.");
        return `/artifacts/${appId}/users/anonymous/data/${collectionName}`;
    }
    return `/artifacts/${appId}/users/${userId}/data/${collectionName}`;
};


// --- Utility Functions ---
const timeAgo = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'Baru saja';
    const now = new Date();
    const seconds = Math.round((now - timestamp.toDate()) / 1000);
  
    if (seconds < 5) return `Baru saja`;
    if (seconds < 60) return `${seconds} dtk lalu`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} mnt lalu`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days} hr lalu`;
    return timestamp.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const formatTimestamp = (timestamp, formatOptions = { hour: '2-digit', minute: '2-digit' }) => {
    if (!timestamp || !timestamp.toDate) return '';
    return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate().toLocaleTimeString('id-ID', formatOptions);
};


// --- Komponen Utama ---
function App() {
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [isProfileComplete, setIsProfileComplete] = useState(false);
    const [currentView, setCurrentView] = useState('feed'); 
    const [selectedChat, setSelectedChat] = useState(null);
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userDocRef = doc(db, getCollectionPath('profiles', true), firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists() && userDocSnap.data().bio) {
                    setUser({ ...firebaseUser, ...userDocSnap.data() });
                    setIsProfileComplete(true);
                } else {
                    setUser(firebaseUser);
                    setIsProfileComplete(false);
                    if (!userDocSnap.exists()) {
                        try {
                            await setDoc(userDocRef, {
                                uid: firebaseUser.uid,
                                displayName: firebaseUser.displayName || 'Pengguna Baru',
                                email: firebaseUser.email,
                                photoURL: firebaseUser.photoURL || `https://placehold.co/100x100/E0E7FF/4F46E5?text=${(firebaseUser.displayName || 'P').charAt(0)}`,
                                createdAt: serverTimestamp(),
                            }, { merge: true });
                        } catch (error) {
                            console.error("Error creating basic user profile:", error);
                        }
                    }
                }
            } else {
                setUser(null);
                setIsProfileComplete(false);
            }
            setLoadingAuth(false);
        });
        
        const attemptInitialSignIn = async () => {
            if (auth.currentUser) return; // Already signed in or being handled by onAuthStateChanged
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Initial sign-in error:", error);
                // Fallback to anonymous if custom token fails or not present
                if (!auth.currentUser) {
                    try { await signInAnonymously(auth); }
                    catch (anonError) { console.error("Anonymous sign-in fallback error:", anonError); }
                }
            }
        };
        attemptInitialSignIn();

        return () => unsubscribe();
    }, []);
    
const handleLogin = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("Login berhasil:", result.user);
    // lanjutkan ke halaman lain / set user state
  } catch (error) {
    alert("Login gagal: " + error.message);
    console.error("Login gagal:", error);
  }
};
    

    const handleLogout = async () => {
        try {
            setSelectedChat(null);
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const completeProfile = async () => {
        if (auth.currentUser) {
            const userDocRef = doc(db, getCollectionPath('profiles', true), auth.currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                setUser({ ...auth.currentUser, ...userDocSnap.data() });
                setIsProfileComplete(true);
            }
        }
    };
    
    const openChatWithUser = (otherUser) => {
        if (!user || !otherUser) return;
        const chatId = [user.uid, otherUser.uid].sort().join('_');
        setSelectedChat({
            chatId: chatId,
            otherUserName: otherUser.displayName,
            otherUserPhotoURL: otherUser.photoURL,
            otherUserId: otherUser.uid,
        });
        setCurrentView('chat');
    };

    if (loadingAuth) {
        return <div className="flex items-center justify-center min-h-screen bg-slate-100"><div className="text-xl font-semibold text-slate-700">Memuat Aplikasi...</div></div>;
    }

    if (!user) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    if (!isProfileComplete) {
        return <ProfileSetup user={user} onProfileComplete={completeProfile} />;
    }
    
    const MainContent = () => {
        if (selectedChat && currentView === 'chat') {
            return <ChatWindow chat={selectedChat} currentUser={user} onBack={() => {setSelectedChat(null); setCurrentView('chatList');}} />;
        }
        switch (currentView) {
            case 'feed': return <Feed currentUser={user} />;
            case 'chatList': return <ChatList currentUser={user} onSelectChat={setSelectedChat} onFindFriends={() => setCurrentView('findFriends')} />;
            case 'updates': return <UpdatesPage />;
            case 'profile': return <ProfilePage currentUser={user} onLogout={handleLogout} />;
            case 'findFriends': return <FindFriendsPage currentUser={user} onStartChat={openChatWithUser} onBack={() => setCurrentView('chatList')} />;
            default: return <Feed currentUser={user} />;
        }
    };

    return (
        <div className="flex flex-col h-screen font-inter bg-slate-50">
            <div className="flex-grow overflow-y-auto pb-20"> {/* Increased padding-bottom for nav bar */}
                <MainContent />
            </div>

            {showCreatePostModal && (
                <CreatePostModal 
                    currentUser={user} 
                    onClose={() => setShowCreatePostModal(false)} 
                />
            )}

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
                <div className="flex justify-around items-center max-w-md mx-auto h-16">
                    <NavItem icon={<Home />} label="Beranda" active={currentView === 'feed'} onClick={() => {setCurrentView('feed'); setSelectedChat(null);}} />
                    <NavItem icon={<MessageSquare />} label="Pesan" active={currentView === 'chatList' || currentView === 'chat' || currentView === 'findFriends'} onClick={() => {setCurrentView('chatList'); setSelectedChat(null);}} />
                    <button 
                        onClick={() => setShowCreatePostModal(true)}
                        className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-[calc(50%-8px)] bg-indigo-600 text-white rounded-full p-3.5 shadow-xl hover:bg-indigo-700 transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-50"
                        aria-label="Buat Postingan Baru"
                    >
                        <PlusCircle size={26} />
                    </button>
                    <NavItem icon={<Bell />} label="Info" active={currentView === 'updates'} onClick={() => {setCurrentView('updates'); setSelectedChat(null);}} />
                    <NavItem icon={<UserCircle />} label="Profil" active={currentView === 'profile'} onClick={() => {setCurrentView('profile'); setSelectedChat(null);}} />
                </div>
            </nav>
        </div>
    );
}

// --- Komponen Layar & Bagian ---

function LoginScreen({ onLogin }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
            <div className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl text-center max-w-md w-full">
                <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600 mb-4">Bgune</h1>
                <p className="text-slate-600 mb-8 text-lg">Komunitas untuk berbagi & terhubung.</p>
                <button
                    onClick={onLogin}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out flex items-center justify-center space-x-2 text-lg"
                >
                     <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.491-3.679-2.383-5.89-2.383a8.921 8.921 0 0 0-8.924 8.923 8.921 8.921 0 0 0 8.924 8.923c4.966 0 8.302-3.453 8.302-8.534 0-.622-.059-1.227-.163-1.828z"></path></svg>
                    <span>Masuk dengan Google</span>
                </button>
            </div>
             <p className="text-white text-opacity-80 mt-10 text-sm">Platform Komunitas Bgune</p>
        </div>
    );
}

function ProfileSetup({ user, onProfileComplete }) {
    const [displayName, setDisplayName] = useState(user.displayName || '');
    const [bio, setBio] = useState('');
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(user.photoURL || `https://placehold.co/150x150/E0E7FF/4F46E5?text=${(user.displayName || 'P').charAt(0)}`);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handlePhotoChange = (e) => {
        if (e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) { // Max 2MB
                setError("Ukuran foto maksimal 2MB.");
                return;
            }
            setError('');
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!displayName.trim() || !bio.trim()) {
            setError("Nama dan Bio tidak boleh kosong.");
            return;
        }
        setIsSaving(true);
        let photoURLToSave = user.photoURL;

        if (photoFile) {
            const photoRef = ref(storage, `profile_photos/${user.uid}/${Date.now()}_${photoFile.name}`);
            try {
                const snapshot = await uploadBytes(photoRef, photoFile);
                photoURLToSave = await getDownloadURL(snapshot.ref);
            } catch (uploadError) {
                console.error("Error uploading photo:", uploadError);
                setError("Gagal mengunggah foto profil. Coba lagi.");
                setIsSaving(false);
                return;
            }
        }
        
        const userDocRef = doc(db, getCollectionPath('profiles', true), user.uid);
        try {
            await setDoc(userDocRef, {
                uid: user.uid,
                displayName: displayName.trim(),
                email: user.email,
                photoURL: photoURLToSave,
                bio: bio.trim(),
                createdAt: user.createdAt || serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });
            onProfileComplete();
        } catch (saveError) {
            console.error("Error saving profile:", saveError);
            setError("Gagal menyimpan profil. Coba lagi.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl shadow-xl w-full max-w-lg">
                <h2 className="text-3xl font-semibold text-slate-800 mb-8 text-center">Lengkapi Profil Anda</h2>
                
                {error && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md text-center">{error}</p>}

                <div className="mb-6 text-center">
                    <img src={photoPreview} alt="Profile Preview" className="w-36 h-36 rounded-full mx-auto object-cover border-4 border-indigo-300 shadow-md" />
                    <input type="file" id="photoUpload" onChange={handlePhotoChange} accept="image/jpeg, image/png" className="hidden" />
                    <label htmlFor="photoUpload" className="mt-3 inline-block bg-indigo-500 hover:bg-indigo-600 text-white text-sm py-2.5 px-5 rounded-lg cursor-pointer transition duration-150 shadow hover:shadow-md">
                        Ganti Foto
                    </label>
                </div>

                <div className="mb-5">
                    <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-1">Nama Tampilan</label>
                    <input
                        type="text"
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                        required
                    />
                </div>
                <div className="mb-8">
                    <label htmlFor="bio" className="block text-sm font-medium text-slate-700 mb-1">Bio Singkat</label>
                    <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows="4"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
                        placeholder="Ceritakan sedikit tentang diri Anda (maks. 150 karakter)"
                        maxLength="150"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed text-lg"
                >
                    {isSaving ? 'Menyimpan...' : 'Simpan & Lanjutkan'}
                </button>
            </form>
        </div>
    );
}


function NavItem({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center w-1/4 py-2 rounded-md transition-colors duration-200 ease-in-out focus:outline-none
                        ${active ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-500'}`}
        >
            {React.cloneElement(icon, { size: active ? 26 : 24, strokeWidth: active ? 2.5 : 2 })}
            <span className={`text-xs mt-1 ${active ? 'font-semibold' : 'font-normal'}`}>{label}</span>
        </button>
    );
}

function Feed({ currentUser }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const postsCollectionRef = collection(db, getCollectionPath('posts', true));
        const q = query(postsCollectionRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            const postsDataPromises = querySnapshot.docs.map(async (postDoc) => {
                const post = { id: postDoc.id, ...postDoc.data() };
                if (post.userId) {
                    const userDocRef = doc(db, getCollectionPath('profiles', true), post.userId);
                    const userSnap = await getDoc(userDocRef);
                    post.author = userSnap.exists() ? userSnap.data() : { displayName: 'Pengguna Anonim', photoURL: `https://placehold.co/40x40/CBD5E1/475569?text=A` };
                }
                return post;
            });
            const postsData = await Promise.all(postsDataPromises);
            setPosts(postsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching posts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div className="p-6 text-center text-slate-500">Memuat postingan...</div>;
    }

    return (
        <div className="py-4 md:py-6 space-y-4 md:space-y-6">
            {posts.length === 0 && <p className="text-center text-slate-500 mt-10 text-lg">Belum ada postingan. <br/> Jadilah yang pertama berbagi!</p>}
            {posts.map(post => (
                <PostCard key={post.id} post={post} currentUser={currentUser} />
            ))}
        </div>
    );
}

function CreatePostModal({ currentUser, onClose }) {
    const [text, setText] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [isPosting, setIsPosting] = useState(false);
    const [error, setError] = useState('');
    const imageInputRef = useRef(null);

    const handleImageChange = (e) => {
        setError('');
        if (e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) { // Max 5MB for posts
                setError("Ukuran gambar maksimal 5MB.");
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
                setError("Format gambar tidak didukung (hanya JPG, PNG, GIF).");
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };
    
    const isValidYoutubeUrl = (url) => {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        return youtubeRegex.test(url);
    };

    const getYoutubeEmbedUrl = (url) => {
        if (!isValidYoutubeUrl(url)) return null;
        const videoIdMatch = url.match(/([a-zA-Z0-9_-]{11})/);
        return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[0]}` : null;
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!text.trim() && !imageFile && !videoUrl.trim()) {
            setError("Postingan tidak boleh kosong. Isi teks, gambar, atau video.");
            return;
        }

        let finalVideoUrl = '';
        if (videoUrl.trim()) {
            finalVideoUrl = getYoutubeEmbedUrl(videoUrl.trim());
            if (!finalVideoUrl) {
                setError("URL Video YouTube tidak valid. Contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ");
                return;
            }
        }

        setIsPosting(true);
        let imageUrlToStore = '';
        if (imageFile) {
            const imageRef = ref(storage, `posts_images/${currentUser.uid}/${Date.now()}_${imageFile.name}`);
            try {
                const snapshot = await uploadBytes(imageRef, imageFile);
                imageUrlToStore = await getDownloadURL(snapshot.ref);
            } catch (uploadError) {
                console.error("Error uploading image for post:", uploadError);
                setError("Gagal mengunggah gambar. Coba lagi.");
                setIsPosting(false);
                return;
            }
        }

        try {
            const postsCollectionRef = collection(db, getCollectionPath('posts', true));
            await addDoc(postsCollectionRef, {
                userId: currentUser.uid,
                text: text.trim(),
                imageUrl: imageUrlToStore,
                videoUrl: finalVideoUrl, // Store embed URL
                createdAt: serverTimestamp(),
                likes: [],
                commentsCount: 0,
            });
            onClose(); 
        } catch (postError) {
            console.error("Error creating post:", postError);
            setError("Gagal membuat postingan. Coba lagi.");
        } finally {
            setIsPosting(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-5 sm:p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-2xl font-semibold text-slate-800">Buat Postingan</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition">
                        <X size={24} />
                    </button>
                </div>
                {error && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md text-center">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Apa yang Anda pikirkan hari ini?"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-base"
                            rows="5"
                        />
                    </div>
                    <div className="space-y-3">
                        <button type="button" onClick={() => imageInputRef.current.click()} className="w-full flex items-center justify-center space-x-2 text-indigo-600 hover:text-indigo-800 py-2.5 px-3 bg-indigo-50 rounded-lg border-2 border-dashed border-indigo-300 hover:border-indigo-500 transition">
                            <ImageIcon size={22} /> 
                            <span className="font-medium">Tambah Gambar</span>
                        </button>
                        <input type="file" ref={imageInputRef} onChange={handleImageChange} accept="image/jpeg, image/png, image/gif" className="hidden" />
                        {imagePreview && (
                            <div className="mt-2 relative group">
                                <img src={imagePreview} alt="Preview" className="rounded-lg max-h-60 w-auto mx-auto object-contain border border-slate-200" />
                                <button type="button" onClick={() => {setImageFile(null); setImagePreview(null); imageInputRef.current.value = null;}} className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                     <div>
                        <label htmlFor="videoUrl" className="block text-sm font-medium text-slate-700 mb-1">URL Video YouTube (opsional)</label>
                        <div className="flex items-center space-x-2">
                            <VideoIcon size={22} className="text-slate-500" />
                            <input
                                type="url"
                                id="videoUrl"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                placeholder="Contoh: https://www.youtube.com/watch?v=xxxxxx"
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isPosting}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-60 text-lg"
                    >
                        {isPosting ? 'Memposting...' : 'Posting Sekarang'}
                    </button>
                </form>
            </div>
        </div>
    );
}


function PostCard({ post, currentUser }) {
    const [liked, setLiked] = useState(post.likes?.includes(currentUser.uid) || false);
    const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);

    const handleLike = async () => {
        if (!currentUser || !post.id) return;
        const postRef = doc(db, getCollectionPath('posts', true), post.id);
        try {
            if (liked) {
                await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
                setLikesCount(prev => prev - 1);
            } else {
                await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
                setLikesCount(prev => prev + 1);
            }
            setLiked(!liked);
        } catch (error) {
            console.error("Error updating like:", error);
        }
    };
    
    const fetchComments = useCallback(async () => {
        if (!post.id) return;
        setLoadingComments(true);
        const commentsRef = collection(db, getCollectionPath('posts', true), post.id, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const commentsDataPromises = snapshot.docs.map(async (commentDoc) => {
                const comment = { id: commentDoc.id, ...commentDoc.data() };
                if (comment.userId) {
                    const userDocRef = doc(db, getCollectionPath('profiles', true), comment.userId);
                    const userSnap = await getDoc(userDocRef);
                    comment.author = userSnap.exists() ? userSnap.data() : { displayName: 'Anonim', photoURL: `https://placehold.co/32x32/CBD5E1/475569?text=A`};
                }
                return comment;
            });
            const commentsData = await Promise.all(commentsDataPromises);
            setComments(commentsData);
            setLoadingComments(false);
        }, (error) => {
            console.error("Error fetching comments:", error);
            setLoadingComments(false);
        });
        return unsubscribe;
    }, [post.id]);

    useEffect(() => {
        let unsubscribeComments;
        if (showComments) {
            fetchComments().then(unsub => unsubscribeComments = unsub);
        }
        return () => {
            if (unsubscribeComments) unsubscribeComments();
        };
    }, [showComments, fetchComments]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUser || !post.id) return;
        
        const commentsRef = collection(db, getCollectionPath('posts', true), post.id, 'comments');
        try {
            await addDoc(commentsRef, {
                text: newComment.trim(),
                userId: currentUser.uid,
                createdAt: serverTimestamp()
            });
            const postRef = doc(db, getCollectionPath('posts', true), post.id);
            await updateDoc(postRef, { commentsCount: (post.commentsCount || 0) + 1 });
            setNewComment('');
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    };

    return (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden mx-2 sm:mx-auto max-w-xl border border-slate-200">
            <div className="p-4 sm:p-5">
                <div className="flex items-center mb-4">
                    <img src={post.author?.photoURL || `https://placehold.co/40x40/E0E7FF/4F46E5?text=${(post.author?.displayName || 'U').charAt(0)}`} alt={post.author?.displayName} className="w-11 h-11 rounded-full mr-3 object-cover shadow-sm" />
                    <div>
                        <p className="font-semibold text-slate-800 text-md">{post.author?.displayName || 'Pengguna Bgune'}</p>
                        <p className="text-xs text-slate-500">{timeAgo(post.createdAt)}</p>
                    </div>
                </div>
                {post.text && <p className="text-slate-700 mb-4 whitespace-pre-wrap text-base leading-relaxed">{post.text}</p>}
                {post.imageUrl && <img src={post.imageUrl} alt="Postingan" className="rounded-lg w-full max-h-[60vh] object-contain mb-4 border border-slate-200 bg-slate-50" onError={(e) => e.target.style.display='none'} />}
                {post.videoUrl && (
                    <div className="aspect-video mb-4 rounded-lg overflow-hidden border border-slate-200">
                        <iframe 
                            src={post.videoUrl}
                            title="Video Postingan" 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                            allowFullScreen
                            className="w-full h-full"
                        ></iframe>
                    </div>
                )}
            </div>
            <div className="border-t border-slate-200 px-4 py-2.5">
                <div className="flex justify-around items-center text-slate-600">
                    <button onClick={handleLike} className={`flex items-center space-x-1.5 p-2 rounded-lg hover:bg-slate-100 transition-colors ${liked ? 'text-red-500 hover:text-red-600' : 'hover:text-slate-800'}`}>
                        <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
                        <span className="text-sm font-medium">{likesCount} Suka</span>
                    </button>
                    <button onClick={() => setShowComments(!showComments)} className="flex items-center space-x-1.5 p-2 rounded-lg hover:bg-slate-100 transition-colors hover:text-slate-800">
                        <CommentIcon size={20} />
                        <span className="text-sm font-medium">{post.commentsCount || 0} Komentar</span>
                    </button>
                </div>
            </div>
            {showComments && (
                <div className="px-4 py-4 border-t border-slate-200 bg-slate-50">
                    <form onSubmit={handleAddComment} className="flex items-center space-x-2 mb-4">
                        <img src={currentUser.photoURL || `https://placehold.co/32x32/E0E7FF/4F46E5?text=${currentUser.displayName.charAt(0)}`} alt="Anda" className="w-9 h-9 rounded-full object-cover shadow-sm"/>
                        <input 
                            type="text" 
                            value={newComment} 
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Tulis komentar Anda..."
                            className="flex-grow p-2.5 border border-slate-300 rounded-full focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none"
                        />
                        <button type="submit" className="p-2.5 text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!newComment.trim()}>
                            <Send size={20} />
                        </button>
                    </form>
                    {loadingComments && <p className="text-sm text-slate-500 text-center py-2">Memuat komentar...</p>}
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {comments.map(comment => (
                            <div key={comment.id} className="flex items-start space-x-2.5">
                                <img src={comment.author?.photoURL || `https://placehold.co/32x32/CBD5E1/475569?text=A`} alt={comment.author?.displayName} className="w-9 h-9 rounded-full object-cover shadow-sm"/>
                                <div className="bg-slate-100 p-2.5 rounded-lg flex-grow shadow-sm">
                                    <p className="font-semibold text-sm text-slate-800">{comment.author?.displayName}</p>
                                    <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{comment.text}</p>
                                    <p className="text-xs text-slate-400 mt-1 text-right">{timeAgo(comment.createdAt)}</p>
                                </div>
                            </div>
                        ))}
                         {comments.length === 0 && !loadingComments && <p className="text-sm text-slate-500 text-center py-2">Belum ada komentar di postingan ini.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}


function ChatList({ currentUser, onSelectChat, onFindFriends }) {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || !currentUser.uid) return;

        const chatRoomsRef = collection(db, getCollectionPath('chatRooms', true));
        const q = query(chatRoomsRef, where('members', 'array-contains', currentUser.uid), orderBy('updatedAt', 'desc'));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const chatListDataPromises = snapshot.docs.map(async (roomDoc) => {
                const roomData = roomDoc.data();
                const otherUserId = roomData.members.find(id => id !== currentUser.uid);
                if (otherUserId) {
                    const userDocRef = doc(db, getCollectionPath('profiles', true), otherUserId);
                    const userSnap = await getDoc(userDocRef);
                    if (userSnap.exists()) {
                        const otherUser = userSnap.data();
                        return {
                            chatId: roomDoc.id,
                            otherUserId: otherUserId,
                            otherUserName: otherUser.displayName,
                            otherUserPhotoURL: otherUser.photoURL,
                            lastMessage: roomData.lastMessage?.text || "...",
                            lastMessageTimestamp: roomData.lastMessage?.timestamp,
                        };
                    }
                }
                return null; 
            });
            const chatListData = (await Promise.all(chatListDataPromises)).filter(Boolean);
            setChats(chatListData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chats: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    if (loading) {
        return <div className="p-6 text-center text-slate-500">Memuat daftar chat...</div>;
    }

    return (
        <div className="h-full flex flex-col bg-slate-50">
             <div className="p-4 sm:p-5 border-b border-slate-200 bg-white sticky top-0 z-10">
                <h2 className="text-2xl font-semibold text-slate-800 mb-3">Pesan Pribadi</h2>
                <button 
                    onClick={onFindFriends} 
                    className="w-full flex items-center justify-center space-x-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150"
                >
                    <Search size={20} />
                    <span>Cari & Mulai Chat Baru</span>
                </button>
            </div>
            {chats.length === 0 && (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                    <MessageSquare size={56} className="mb-4 opacity-40" />
                    <p className="text-lg">Anda belum memiliki percakapan.</p>
                    <p className="text-sm">Mulai chat dengan mencari teman atau pengguna lain.</p>
                </div>
            )}
            <div className="flex-grow overflow-y-auto">
                {chats.map(chat => (
                    <div
                        key={chat.chatId}
                        onClick={() => onSelectChat(chat)}
                        className="flex items-center p-3 sm:p-4 hover:bg-slate-100 cursor-pointer border-b border-slate-200 transition-colors"
                    >
                        <img src={chat.otherUserPhotoURL || `https://placehold.co/48x48/E0E7FF/4F46E5?text=${chat.otherUserName.charAt(0)}`} alt={chat.otherUserName} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full mr-3 sm:mr-4 object-cover shadow-sm" />
                        <div className="flex-grow overflow-hidden">
                            <p className="font-semibold text-slate-800 text-md truncate">{chat.otherUserName}</p>
                            <p className="text-sm text-slate-500 truncate">{chat.lastMessage}</p>
                        </div>
                        {chat.lastMessageTimestamp && (
                             <p className="text-xs text-slate-400 ml-2 whitespace-nowrap self-start mt-1">
                                {formatTimestamp(chat.lastMessageTimestamp)}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}


function ChatWindow({ chat, currentUser, onBack }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingMessages, setLoadingMessages] = useState(true);
    const messagesEndRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    },[]);

    useEffect(scrollToBottom, [messages, scrollToBottom]);

    useEffect(() => {
        if (!chat || !chat.chatId) return;
        setLoadingMessages(true);
        const messagesRef = collection(db, getCollectionPath('chatRooms', true), chat.chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
            setLoadingMessages(false);
             // Mark messages as read (simplified: assume opening chat means reading)
            // More complex: store unread counts per user in chatRoom doc
        }, (error) => {
            console.error("Error fetching messages:", error);
            setLoadingMessages(false);
        });

        return () => unsubscribe();
    }, [chat]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !chat) return;

        const messageData = {
            text: newMessage.trim(),
            senderId: currentUser.uid,
            timestamp: serverTimestamp(),
        };
        
        const messagesRef = collection(db, getCollectionPath('chatRooms', true), chat.chatId, 'messages');
        const chatRoomRef = doc(db, getCollectionPath('chatRooms', true), chat.chatId);

        try {
            await addDoc(messagesRef, messageData);
            await updateDoc(chatRoomRef, {
                lastMessage: { text: newMessage.trim(), senderId: currentUser.uid, timestamp: serverTimestamp() },
                updatedAt: serverTimestamp(),
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
            // Show user error
        }
    };
    
    if (!chat) return null; // Should not happen if navigation is correct

    return (
        <div className="flex flex-col h-full bg-slate-100">
            <div className="flex items-center p-3 sm:p-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <button onClick={onBack} className="mr-3 text-indigo-600 hover:text-indigo-800 p-1.5 rounded-full hover:bg-slate-100 transition">
                    <ArrowLeft size={22} />
                </button>
                <img src={chat.otherUserPhotoURL || `https://placehold.co/40x40/E0E7FF/4F46E5?text=${chat.otherUserName.charAt(0)}`} alt={chat.otherUserName} className="w-10 h-10 rounded-full mr-3 object-cover shadow-sm" />
                <h2 className="font-semibold text-slate-800 text-lg">{chat.otherUserName}</h2>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-3">
                {loadingMessages && <p className="text-center text-slate-500 py-4">Memuat pesan...</p>}
                {!loadingMessages && messages.length === 0 && (
                    <p className="text-center text-slate-500 py-4">Tidak ada pesan. Mulai percakapan!</p>
                )}
                {messages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} isCurrentUser={msg.senderId === currentUser.uid} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 sm:p-4 bg-white border-t border-slate-200 sticky bottom-0">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2 sm:space-x-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Ketik pesan Anda..."
                        className="flex-grow p-3 border border-slate-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-base"
                    />
                    <button type="submit" className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 transition duration-150 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" disabled={!newMessage.trim()}>
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}

function MessageBubble({ message, isCurrentUser }) {
    const timeDisplay = formatTimestamp(message.timestamp);
    return (
        <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] sm:max-w-[60%] px-4 py-2.5 rounded-2xl shadow-md ${isCurrentUser ? 'bg-indigo-500 text-white rounded-br-lg' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-lg'}`}>
                <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
                <p className={`text-xs mt-1.5 ${isCurrentUser ? 'text-indigo-200 text-right' : 'text-slate-400 text-right'}`}>{timeDisplay}</p>
            </div>
        </div>
    );
}


function FindFriendsPage({ currentUser, onStartChat, onBack }) {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const usersRef = collection(db, getCollectionPath('profiles', true));
        // Exclude current user from the list
        const q = query(usersRef, where('uid', '!=', currentUser.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersList);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching users:", err);
            setError("Gagal memuat daftar pengguna.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser.uid]);

    const filteredUsers = users.filter(user =>
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );

    const handleStartChat = async (otherUser) => {
        const currentUserId = currentUser.uid;
        const otherUserId = otherUser.uid;
        const chatId = [currentUserId, otherUserId].sort().join('_');
        const chatRoomRef = doc(db, getCollectionPath('chatRooms', true), chatId);

        try {
            const chatRoomSnap = await getDoc(chatRoomRef);
            if (!chatRoomSnap.exists()) {
                await setDoc(chatRoomRef, {
                    members: [currentUserId, otherUserId],
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    lastMessage: null,
                });
            }
            onStartChat(otherUser);
        } catch (err) {
            console.error("Error creating/checking chat room:", err);
            setError("Gagal memulai chat. Coba lagi.");
        }
    };

    return (
        <div className="p-4 sm:p-5 h-full flex flex-col bg-slate-50">
            <div className="flex items-center mb-5">
                 <button onClick={onBack} className="mr-3 text-indigo-600 hover:text-indigo-800 p-1.5 rounded-full hover:bg-slate-100 transition">
                    <ArrowLeft size={22} />
                </button>
                <h2 className="text-2xl font-semibold text-slate-800">Cari Pengguna Lain</h2>
            </div>
            <div className="mb-5 relative">
                <input
                    type="text"
                    placeholder="Ketik nama pengguna..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-base shadow-sm"
                />
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            </div>
            {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
            {loading && <p className="text-center text-slate-500 py-4">Memuat pengguna...</p>}
            
            <div className="flex-grow overflow-y-auto space-y-3">
                {!loading && filteredUsers.length === 0 && searchTerm && (
                    <p className="text-center text-slate-500 py-4">Tidak ada pengguna ditemukan dengan nama "{searchTerm}".</p>
                )}
                {!loading && filteredUsers.length === 0 && !searchTerm && (
                    <p className="text-center text-slate-500 py-4">Ketik nama untuk mencari pengguna.</p>
                )}
                {filteredUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-slate-200">
                        <div className="flex items-center overflow-hidden">
                            <img src={user.photoURL || `https://placehold.co/40x40/E0E7FF/4F46E5?text=${user.displayName.charAt(0)}`} alt={user.displayName} className="w-11 h-11 rounded-full mr-3 object-cover shadow-sm" />
                            <div className="overflow-hidden">
                                <p className="font-semibold text-slate-700 truncate">{user.displayName}</p>
                                <p className="text-sm text-slate-500 truncate">{user.bio?.substring(0,35)}{user.bio?.length > 35 ? '...' : ''}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleStartChat(user)}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-md shadow-sm hover:shadow-md transition duration-150 whitespace-nowrap"
                        >
                            Mulai Chat
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}


function UpdatesPage() {
    const [updates, setUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const updatesRef = collection(db, getCollectionPath('appUpdates', true));
        const q = query(updatesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const updatesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUpdates(updatesData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching updates:", err);
            setError("Gagal memuat pembaruan aplikasi.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    const formatDateForUpdates = (timestamp) => {
        if (!timestamp || !timestamp.toDate) return '';
        return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate().toLocaleDateString('id-ID', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) {
        return <div className="p-6 text-center text-slate-500">Memuat info & pembaruan...</div>;
    }

    return (
        <div className="p-4 sm:p-6 bg-slate-50 min-h-full">
            <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center sm:text-left">Info & Pembaruan Aplikasi</h2>
            {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
            {updates.length === 0 && !loading && <p className="text-center text-slate-500 text-lg mt-6">Belum ada pembaruan atau informasi terbaru.</p>}
            <div className="space-y-6">
                {updates.map(update => (
                    <div key={update.id} className="bg-white p-5 sm:p-6 rounded-xl shadow-lg border border-indigo-100 hover:shadow-xl transition-shadow">
                        <h3 className="text-xl sm:text-2xl font-semibold text-indigo-700 mb-2">{update.title}</h3>
                        <p className="text-slate-500 text-sm mb-4">
                            Diposting oleh: {update.author || 'Tim Bgune'} • {formatDateForUpdates(update.createdAt)}
                        </p>
                        <div className="text-slate-700 leading-relaxed whitespace-pre-wrap prose prose-sm sm:prose-base max-w-none">{update.content}</div>
                    </div>
                ))}
            </div>
             <div className="mt-10 p-4 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-lg text-sm text-indigo-700">
                <p className="font-semibold mb-1">Catatan untuk Pemilik Web:</p>
                <p>Untuk menambahkan pembaruan, tambahkan dokumen ke Firestore di path: 
                <code className="bg-indigo-100 p-1 rounded text-xs mx-1">/artifacts/{appId}/public/data/appUpdates</code>
                dengan field: `title` (string), `content` (string, bisa markdown), `author` (string, opsional), dan `createdAt` (timestamp).</p>
            </div>
        </div>
    );
}

function ProfilePage({ currentUser, onLogout }) {
    const [isEditing, setIsEditing] = useState(false);
    const [displayName, setDisplayName] = useState(currentUser.displayName);
    const [bio, setBio] = useState(currentUser.bio);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(currentUser.photoURL);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handlePhotoChange = (e) => {
        setError('');
        if (e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) { // Max 2MB
                setError("Ukuran foto profil maksimal 2MB.");
                return;
            }
            if (!['image/jpeg', 'image/png'].includes(file.type)) {
                setError("Format foto tidak didukung (hanya JPG, PNG).");
                return;
            }
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };
    
    const handleSaveProfile = async () => {
        setError('');
        if (!displayName.trim() || !bio.trim()) {
            setError("Nama dan Bio tidak boleh kosong.");
            return;
        }
        setIsSaving(true);
        let newPhotoURL = currentUser.photoURL;

        if (photoFile) {
            const photoRef = ref(storage, `profile_photos/${currentUser.uid}/${Date.now()}_${photoFile.name}`);
            try {
                const snapshot = await uploadBytes(photoRef, photoFile);
                newPhotoURL = await getDownloadURL(snapshot.ref);
            } catch (uploadError) {
                console.error("Error uploading new photo:", uploadError);
                setError("Gagal mengunggah foto baru. Coba lagi.");
                setIsSaving(false);
                return;
            }
        }

        const userDocRef = doc(db, getCollectionPath('profiles', true), currentUser.uid);
        try {
            await updateDoc(userDocRef, {
                displayName: displayName.trim(),
                bio: bio.trim(),
                photoURL: newPhotoURL,
                updatedAt: serverTimestamp()
            });
            // Update local state immediately for better UX
            currentUser.displayName = displayName.trim();
            currentUser.bio = bio.trim();
            currentUser.photoURL = newPhotoURL;
            setIsEditing(false);
            // No alert needed, UI will reflect changes
        } catch (saveError) {
            console.error("Error updating profile:", saveError);
            setError("Gagal memperbarui profil. Coba lagi.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 bg-slate-50 min-h-full">
            <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-xl p-6 sm:p-8">
                <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                        <img 
                            src={isEditing ? photoPreview : currentUser.photoURL} 
                            alt="Foto Profil" 
                            className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-indigo-500 shadow-lg"
                            onError={(e) => e.target.src=`https://placehold.co/150x150/E0E7FF/4F46E5?text=${(currentUser.displayName || 'P').charAt(0)}`}
                        />
                        {isEditing && (
                            <>
                                <input type="file" id="profilePhotoEdit" onChange={handlePhotoChange} accept="image/jpeg, image/png" className="hidden" />
                                <label htmlFor="profilePhotoEdit" className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2.5 rounded-full cursor-pointer hover:bg-indigo-700 transition shadow-md">
                                    <ImageIcon size={18}/>
                                </label>
                            </>
                        )}
                    </div>

                    {error && !isEditing && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md text-center">{error}</p>}

                    {!isEditing ? (
                        <>
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mt-3 text-center">{currentUser.displayName}</h2>
                            <p className="text-slate-600 mt-1 text-center text-base">{currentUser.email}</p>
                            <p className="text-slate-700 mt-5 text-center leading-relaxed max-w-md text-base">{currentUser.bio || "Pengguna ini belum menambahkan bio."}</p>
                            <button 
                                onClick={() => { setIsEditing(true); setError(''); setDisplayName(currentUser.displayName); setBio(currentUser.bio); setPhotoPreview(currentUser.photoURL); setPhotoFile(null);}}
                                className="mt-8 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2.5 px-8 rounded-lg shadow-md hover:shadow-lg transition duration-150 flex items-center space-x-2 text-base"
                            >
                                <Settings size={20} />
                                <span>Edit Profil</span>
                            </button>
                        </>
                    ) : (
                        <div className="w-full mt-6 space-y-5">
                            {error && <p className="mb-3 text-sm text-red-600 bg-red-100 p-3 rounded-md text-center">{error}</p>}
                            <div>
                                <label htmlFor="editDisplayName" className="block text-sm font-medium text-slate-700 mb-1">Nama Tampilan</label>
                                <input type="text" id="editDisplayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full p-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base"/>
                            </div>
                            <div>
                                <label htmlFor="editBio" className="block text-sm font-medium text-slate-700 mb-1">Bio Singkat</label>
                                <textarea id="editBio" value={bio} onChange={(e) => setBio(e.target.value)} rows="3" maxLength="150" className="mt-1 w-full p-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base resize-none" placeholder="Maks. 150 karakter"></textarea>
                            </div>
                            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-2">
                                <button 
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 disabled:opacity-60 text-base"
                                >
                                    {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                                </button>
                                <button 
                                    onClick={() => {setIsEditing(false); setError('');}}
                                    className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-800 font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 text-base"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <div className="mt-10 border-t border-slate-200 w-full pt-6 text-center">
                        <p className="text-sm text-slate-500 mb-2">ID Pengguna Anda: <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{currentUser.uid}</code></p>
                        <button
                            onClick={onLogout}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-8 rounded-lg shadow-md hover:shadow-lg transition duration-150 flex items-center space-x-2 mx-auto text-base"
                        >
                            <LogOut size={20} />
                            <span>Keluar Akun</span>
                        </button>
                    </div>
                </div>
            </div>
            <footer className="text-center mt-10 py-4">
                <p className="text-sm text-slate-500">Aplikasi Komunitas Bgune</p>
                <p className="text-xs text-slate-400">Dibuat oleh M. Irham</p>
            </footer>
        </div>
    );
}


export default App;

