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
    Timestamp,
    deleteDoc,
    increment 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Import icons from lucide-react
import { 
    Home, MessageSquare, Bell, UserCircle, LogOut, PlusCircle, Send, Search, Image as ImageIcon, Video as VideoIcon, Users, Settings, X, ArrowLeft, Heart, MessageCircle as CommentIcon, MoreVertical, Edit, Trash2, Check, CheckCheck, Pin, PinOff, UserPlus, UserMinus, Share2
} from 'lucide-react';

// Firebase Configuration
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    apiKey: "AIzaSyANQqaFwrsf3xGSDxyn9pcRJqJrIiHrjM0", 
    authDomain: "bgune---community.firebaseapp.com",
    projectId: "bgune---community",
    storageBucket: "bgune---community.appspot.com",
    messagingSenderId: "749511144215",
    appId: "1:749511144215:web:dcf13c4d59dc705d4f7d52",
    measurementId: "G-5XRSG2H5SV" 
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'bgune-komunitas-app-revised';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const provider = new GoogleAuthProvider();

// Helper function to get user ID
const getCurrentUserId = () => auth.currentUser?.uid || null;

// Firestore collection paths
const getCollectionPath = (collectionName, isPublic = false) => {
    const userId = getCurrentUserId();
    if (isPublic) {
        return `/artifacts/${appId}/public/data/${collectionName}`;
    }
    // Fallback to public if userId is not available for private collections
    if (!userId) {
        console.warn(`User not authenticated for private collection access to ${collectionName}. Falling back to public.`);
        return `/artifacts/${appId}/public/data/${collectionName}`; 
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

// --- Notification Helper ---
const sendNotification = async (recipientId, type, senderId, postId = null, commentId = null) => {
    if (recipientId === senderId) return; // Jangan notifikasi diri sendiri

    const notificationsRef = collection(db, getCollectionPath('notifications', true)); // Notifikasi bersifat publik untuk kesederhanaan
    
    let message = "";
    let link = "";

    switch (type) {
        case 'follow':
            const senderProfile = await getDoc(doc(db, getCollectionPath('profiles', true), senderId));
            const senderName = senderProfile.exists() ? senderProfile.data().displayName : 'Seseorang';
            message = `${senderName} mulai mengikuti Anda.`;
            link = `/profile/${senderId}`; // Tautan ke profil pengirim
            break;
        case 'like':
            const likerProfile = await getDoc(doc(db, getCollectionPath('profiles', true), senderId));
            const likerName = likerProfile.exists() ? likerProfile.data().displayName : 'Seseorang';
            message = `${likerName} menyukai postingan Anda.`;
            link = `/post/${postId}`; // Tautan ke postingan
            break;
        case 'comment':
            const commenterProfile = await getDoc(doc(db, getCollectionPath('profiles', true), senderId));
            const commenterName = commenterProfile.exists() ? commenterProfile.data().displayName : 'Seseorang';
            message = `${commenterName} mengomentari postingan Anda.`;
            link = `/post/${postId}`; // Tautan ke postingan
            break;
        default:
            message = "Ada pembaruan baru untuk Anda.";
            link = "/updates";
    }

    try {
        await addDoc(notificationsRef, {
            recipientId: recipientId,
            senderId: senderId,
            type: type,
            message: message,
            link: link,
            isRead: false,
            createdAt: serverTimestamp(),
            postId: postId,
            commentId: commentId
        });
    } catch (error) {
        console.error("Error sending notification:", error);
    }
};


// --- Komponen Utama ---
function App() {
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [isProfileComplete, setIsProfileComplete] = useState(false);
    const [currentView, setCurrentView] = useState('feed'); 
    const [selectedChat, setSelectedChat] = useState(null); // { chatId, otherUserName, otherUserPhotoURL, otherUserId, isAI }
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [viewingOtherProfile, setViewingOtherProfile] = useState(null); // Stores UID of other user if viewing their profile

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userDocRef = doc(db, getCollectionPath('profiles', true), firebaseUser.uid);
                
                // Update online status
                try {
                    await setDoc(userDocRef, { 
                        isOnline: true, 
                        lastActive: serverTimestamp() 
                    }, { merge: true });
                } catch (e) {
                    console.error("Error setting online status:", e);
                }

                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists() && userDocSnap.data().bio) {
                    setUser({ ...firebaseUser, ...userDocSnap.data() });
                    setIsProfileComplete(true);
                } else {
                    setUser(firebaseUser); // Set basic user first
                    setIsProfileComplete(false);
                    // Create basic profile if not exists, useful for first login
                    if (!userDocSnap.exists()) {
                         try {
                            await setDoc(userDocRef, {
                                uid: firebaseUser.uid,
                                displayName: firebaseUser.displayName || 'Pengguna Baru',
                                email: firebaseUser.email,
                                photoURL: firebaseUser.photoURL || `https://placehold.co/100x100/E0E7FF/4F46E5?text=${(firebaseUser.displayName || 'P').charAt(0)}`,
                                createdAt: serverTimestamp(),
                                isOnline: true,
                                lastActive: serverTimestamp(),
                                followersCount: 0,
                                followingCount: 0
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
            if (auth.currentUser) return; 
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    console.log("No initial auth token, user needs to login manually or anonymous sign-in can be enabled.");
                }
            } catch (error) {
                console.error("Initial sign-in error:", error);
            }
        };
        attemptInitialSignIn();

        // Handle user leaving the page (best effort for offline status)
        const handleBeforeUnload = () => {
            if (auth.currentUser) {
                const userStatusRef = doc(db, getCollectionPath('profiles', true), auth.currentUser.uid);
                updateDoc(userStatusRef, { isOnline: false, lastActive: serverTimestamp() })
                    .catch(e => console.error("Error setting offline status on unload:", e));
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            unsubscribe();
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Set user offline if component unmounts (e.g., tab close)
            if (auth.currentUser) {
                 const userStatusRef = doc(db, getCollectionPath('profiles', true), auth.currentUser.uid);
                 updateDoc(userStatusRef, { isOnline: false, lastActive: serverTimestamp() })
                    .catch(e => console.error("Error setting offline status on unmount:", e));
            }
        };
    }, []);
    
    const handleLogin = async () => {
        setLoadingAuth(true);
        try {
            const result = await signInWithPopup(auth, provider);
            // onAuthStateChanged will handle setting user state and profile completion check
        } catch (error) {
            console.error("Login gagal:", error);
            setLoadingAuth(false);
        }
    };
    
    const handleLogout = async () => {
        if (auth.currentUser) {
            const userStatusRef = doc(db, getCollectionPath('profiles', true), auth.currentUser.uid);
            try {
                await updateDoc(userStatusRef, { isOnline: false, lastActive: serverTimestamp() });
            } catch (e) {
                console.error("Error setting offline status on logout:", e);
            }
        }
        try {
            setSelectedChat(null);
            setViewingOtherProfile(null);
            await signOut(auth);
            // User state will be set to null by onAuthStateChanged
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const completeProfile = async (profileData) => { 
        if (auth.currentUser) {
            setUser(prevUser => ({ ...prevUser, ...profileData })); 
            setIsProfileComplete(true);
        }
    };
    
    const openChatWithUser = (otherUser) => {
        if (!user || !otherUser || !user.uid || !otherUser.uid) {
            console.error("Cannot open chat: current user or other user is undefined.");
            return;
        }
        const chatId = [user.uid, otherUser.uid].sort().join('_');
        setSelectedChat({
            chatId: chatId,
            otherUserName: otherUser.displayName,
            otherUserPhotoURL: otherUser.photoURL,
            otherUserId: otherUser.uid,
            isAI: false, // Ini adalah chat dengan pengguna lain
        });
        setCurrentView('chat');
        setViewingOtherProfile(null); // Tutup tampilan profil lain jika terbuka
    };

    const openAIChat = () => {
        setSelectedChat({
            chatId: `ai_chat_${user.uid}`, // ID chat unik untuk AI per pengguna
            otherUserName: "Bgune AI",
            otherUserPhotoURL: "https://placehold.co/100x100/4F46E5/FFFFFF?text=AI", // Placeholder untuk AI
            otherUserId: "bgune_ai_bot", // ID khusus untuk AI
            isAI: true,
        });
        setCurrentView('chat');
        setViewingOtherProfile(null); // Tutup tampilan profil lain jika terbuka
    };

    const viewProfile = (uid) => {
        setViewingOtherProfile(uid);
        setCurrentView('profile');
        setSelectedChat(null); // Tutup chat jika terbuka
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
            if (selectedChat.isAI) {
                return <AIChatWindow chat={selectedChat} currentUser={user} onBack={() => {setSelectedChat(null); setCurrentView('chatList');}} />;
            } else {
                return <ChatWindow chat={selectedChat} currentUser={user} onBack={() => {setSelectedChat(null); setCurrentView('chatList');}} />;
            }
        }
        switch (currentView) {
            case 'feed': return <Feed currentUser={user} onViewProfile={viewProfile} />;
            case 'chatList': return <ChatList currentUser={user} onSelectChat={openChatWithUser} onFindFriends={() => setCurrentView('findFriends')} onOpenAIChat={openAIChat} />;
            case 'updates': return <NotificationsPage currentUser={user} onViewProfile={viewProfile} />;
            case 'profile': 
                if (viewingOtherProfile && viewingOtherProfile !== user.uid) {
                    return <OtherProfilePage currentUser={user} otherUserId={viewingOtherProfile} onBack={() => setViewingOtherProfile(null)} onStartChat={openChatWithUser} />;
                }
                return <ProfilePage currentUser={user} onLogout={handleLogout} onViewProfile={viewProfile} />;
            case 'findFriends': return <FindFriendsPage currentUser={user} onStartChat={openChatWithUser} onBack={() => setCurrentView('chatList')} onViewProfile={viewProfile} />;
            default: return <Feed currentUser={user} onViewProfile={viewProfile} />;
        }
    };

    return (
        <div className="flex flex-col h-screen font-inter bg-slate-50">
            <div className="flex-grow overflow-y-auto pb-20">
                <MainContent />
            </div>

            {showCreatePostModal && (
                <CreatePostModal 
                    currentUser={user} 
                    onClose={() => setShowCreatePostModal(false)} 
                />
            )}

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-40">
                <div className="flex justify-around items-center max-w-md mx-auto h-16">
                    <NavItem icon={<Home />} label="Beranda" active={currentView === 'feed'} onClick={() => {setCurrentView('feed'); setSelectedChat(null); setViewingOtherProfile(null);}} />
                    <NavItem icon={<MessageSquare />} label="Pesan" active={['chatList', 'chat', 'findFriends'].includes(currentView)} onClick={() => {setCurrentView('chatList'); setSelectedChat(null); setViewingOtherProfile(null);}} />
                    <button 
                        onClick={() => setShowCreatePostModal(true)}
                        className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-[calc(50%-8px)] bg-indigo-600 text-white rounded-full p-3.5 shadow-xl hover:bg-indigo-700 transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-50"
                        aria-label="Buat Postingan Baru"
                    >
                        <PlusCircle size={26} />
                    </button>
                    <NavItem icon={<Bell />} label="Notifikasi" active={currentView === 'updates'} onClick={() => {setCurrentView('updates'); setSelectedChat(null); setViewingOtherProfile(null);}} />
                    <NavItem icon={<UserCircle />} label="Profil" active={currentView === 'profile' && !viewingOtherProfile} onClick={() => {setCurrentView('profile'); setSelectedChat(null); setViewingOtherProfile(null);}} />
                </div>
            </nav>
        </div>
    );
}

// --- Komponen Layar & Bagian ---

function LoginScreen({ onLogin }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
            <div className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl text-center max-w-md w-full">
                <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">Bgune Community</h1>
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
        setError('');
        if (e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) { // Max 2MB
                setError("Ukuran foto maksimal 2MB.");
                return;
            }
            if (!['image/jpeg', 'image/png'].includes(file.type)) { // Hanya izinkan JPG dan PNG
                setError("Format foto tidak didukung (hanya JPG, PNG).");
                return;
            }
            setError('');
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
            e.target.value = null; // Reset input file agar event onChange terpicu lagi jika file yang sama dipilih
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
                // Penanganan kesalahan lebih detail
                console.error("Error uploading photo for ProfileSetup:", uploadError);
                setError(`Gagal mengunggah foto profil: ${uploadError.message || 'Terjadi kesalahan tidak dikenal.'}`);
                setIsSaving(false);
                return;
            }
        }
        
        const userDocRef = doc(db, getCollectionPath('profiles', true), user.uid);
        const profileData = {
            uid: user.uid,
            displayName: displayName.trim(),
            email: user.email, 
            photoURL: photoURLToSave,
            bio: bio.trim(),
            createdAt: user.createdAt || serverTimestamp(), 
            updatedAt: serverTimestamp(),
            isOnline: true, 
            lastActive: serverTimestamp(),
            followersCount: 0, // Initialize
            followingCount: 0  // Initialize
        };

        try {
            await setDoc(userDocRef, profileData, { merge: true });
            onProfileComplete(profileData); 
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
                    <img src={photoPreview} alt="Profile Preview" className="w-36 h-36 rounded-full mx-auto object-cover border-4 border-blue-300 shadow-md" />
                    <input type="file" id="photoUpload" onChange={handlePhotoChange} accept="image/jpeg, image/png" className="hidden" />
                    <label htmlFor="photoUpload" className="mt-3 inline-block bg-blue-500 hover:bg-blue-600 text-white text-sm py-2.5 px-5 rounded-lg cursor-pointer transition duration-150 shadow hover:shadow-md">
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
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
                        placeholder="Ceritakan sedikit tentang diri Anda (maks. 150 karakter)"
                        maxLength="150"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed text-lg"
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
                        ${active ? 'text-blue-600' : 'text-slate-500 hover:text-blue-500'}`}
        >
            {React.cloneElement(icon, { size: active ? 26 : 24, strokeWidth: active ? 2.5 : 2 })}
            <span className={`text-xs mt-1 ${active ? 'font-semibold' : 'font-normal'}`}>{label}</span>
        </button>
    );
}

function Feed({ currentUser, onViewProfile }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredPosts, setFilteredPosts] = useState([]);

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
                post.likes = post.likes || [];
                post.commentsCount = post.commentsCount || 0;
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

    useEffect(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
        if (lowercasedSearchTerm === '') {
            setFilteredPosts(posts);
        } else {
            const filtered = posts.filter(post =>
                (post.text && post.text.toLowerCase().includes(lowercasedSearchTerm)) ||
                (post.author && post.author.displayName && post.author.displayName.toLowerCase().includes(lowercasedSearchTerm))
            );
            setFilteredPosts(filtered);
        }
    }, [searchTerm, posts]);

    const handlePostUpdate = () => {
        // This function can trigger a re-fetch or re-render if needed
        console.log("Post list potentially updated.");
    };


    if (loading) {
        return <div className="p-6 text-center text-slate-500">Memuat postingan...</div>;
    }

    return (
        <div className="py-4 md:py-6 space-y-4 md:space-y-6">
            <div className="px-4 sm:px-6 mb-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Cari postingan atau pengguna..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base shadow-sm"
                    />
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                </div>
            </div>

            {filteredPosts.length === 0 && !loading && (
                <p className="text-center text-slate-500 mt-10 text-lg">
                    {searchTerm ? `Tidak ada postingan ditemukan untuk "${searchTerm}".` : "Belum ada postingan. Jadilah yang pertama berbagi!"}
                </p>
            )}
            {filteredPosts.map(post => (
                <PostCard 
                    key={post.id} 
                    post={post} 
                    currentUser={currentUser} 
                    onPostEdited={handlePostUpdate} 
                    onPostDeleted={handlePostUpdate} 
                    onViewProfile={onViewProfile}
                />
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
            e.target.value = null; 
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
                setIsPosting(false); 
                return;
            }
        }

        setIsPosting(true);
        let imageUrlToStore = '';
        let imageStoragePath = ''; 
        if (imageFile) {
            imageStoragePath = `posts_images/${currentUser.uid}/${Date.now()}_${imageFile.name}`;
            const imageRef = ref(storage, imageStoragePath);
            try {
                const snapshot = await uploadBytes(imageRef, imageFile);
                imageUrlToStore = await getDownloadURL(snapshot.ref);
            } catch (uploadError) {
                // Penanganan kesalahan lebih detail
                console.error("Error uploading image for post:", uploadError);
                setError(`Gagal mengunggah gambar: ${uploadError.message || 'Terjadi kesalahan tidak dikenal.'}`);
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
                imageStoragePath: imageStoragePath, 
                videoUrl: finalVideoUrl,
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
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base"
                            rows="5"
                        />
                    </div>
                    <div className="space-y-3">
                        <button type="button" onClick={() => imageInputRef.current.click()} className="w-full flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-800 py-2.5 px-3 bg-blue-50 rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-500 transition">
                            <ImageIcon size={22} /> 
                            <span className="font-medium">Tambah Gambar</span>
                        </button>
                        <input type="file" ref={imageInputRef} onChange={handleImageChange} accept="image/jpeg, image/png, image/gif" className="hidden" />
                        {imagePreview && (
                            <div className="mt-2 relative group">
                                <img src={imagePreview} alt="Preview" className="rounded-lg max-h-60 w-auto mx-auto object-contain border border-slate-200" />
                                <button type="button" onClick={() => {setImageFile(null); setImagePreview(null); if(imageInputRef.current) imageInputRef.current.value = null;}} className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
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
                                placeholder="Contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isPosting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-60 text-lg"
                    >
                        {isPosting ? 'Memposting...' : 'Posting Sekarang'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// Modal untuk mengedit postingan
function EditPostModal({ post, currentUser, onClose, onPostUpdated }) {
    const [text, setText] = useState(post.text);
    const [imageFile, setImageFile] = useState(null);
    // Mengkonversi URL embed kembali ke URL standar YouTube untuk tampilan di input
    const [videoUrl, setVideoUrl] = useState(post.videoUrl ? `https://www.youtube.com/watch?v=${post.videoUrl.split('/').pop()}` : ''); 
    const [imagePreview, setImagePreview] = useState(post.imageUrl || null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');
    const imageInputRef = useRef(null);

    const handleImageChange = (e) => {
        setError('');
        if (e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                setError("Ukuran gambar maksimal 5MB.");
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
                setError("Format gambar tidak didukung (hanya JPG, PNG, GIF).");
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            e.target.value = null; 
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
        if (!text.trim() && !imageFile && !videoUrl.trim() && !imagePreview) { 
            setError("Postingan tidak boleh kosong. Isi teks, gambar, atau video.");
            return;
        }

        let finalVideoUrl = '';
        if (videoUrl.trim()) {
            finalVideoUrl = getYoutubeEmbedUrl(videoUrl.trim());
            if (!finalVideoUrl) {
                setError("URL Video YouTube tidak valid. Contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ");
                setIsUpdating(false);
                return;
            }
        }

        setIsUpdating(true);
        let imageUrlToStore = post.imageUrl;
        let imageStoragePathToStore = post.imageStoragePath || '';


        // Handle image update/removal
        if (imageFile) { 
            // Jika ada gambar lama, hapus gambar lama
            if (post.imageStoragePath) { 
                try {
                    const oldImageRef = ref(storage, post.imageStoragePath);
                    await deleteObject(oldImageRef);
                } catch (deleteError) {
                    console.warn("Gagal menghapus gambar lama dari storage:", deleteError);
                }
            }
            // Unggah gambar baru
            imageStoragePathToStore = `posts_images/${currentUser.uid}/${Date.now()}_${imageFile.name}`;
            const newImageRef = ref(storage, imageStoragePathToStore);
            try {
                const snapshot = await uploadBytes(newImageRef, imageFile);
                imageUrlToStore = await getDownloadURL(snapshot.ref);
            } catch (uploadError) {
                // Penanganan kesalahan lebih detail
                console.error("Error uploading new image for post:", uploadError);
                setError(`Gagal mengunggah gambar baru: ${uploadError.message || 'Terjadi kesalahan tidak dikenal.'}`);
                setIsUpdating(false);
                return;
            }
        } else if (imagePreview === null && post.imageUrl) { // Jika gambar dihapus (imagePreview jadi null tapi sebelumnya ada gambar)
            if (post.imageStoragePath) {
                try {
                    const imageToDeleteRef = ref(storage, post.imageStoragePath);
                    await deleteObject(imageToDeleteRef);
                } catch (deleteError) {
                    console.warn("Could not delete old image from storage:", deleteError);
                }
            }
            imageUrlToStore = '';
            imageStoragePathToStore = '';
        }


        try {
            const postRef = doc(db, getCollectionPath('posts', true), post.id);
            await updateDoc(postRef, {
                text: text.trim(),
                imageUrl: imageUrlToStore,
                imageStoragePath: imageStoragePathToStore,
                videoUrl: finalVideoUrl,
                updatedAt: serverTimestamp(),
            });
            if (onPostUpdated) onPostUpdated(); 
            onClose(); 
        } catch (updateError) {
            console.error("Error updating post:", updateError);
            setError("Gagal memperbarui postingan. Coba lagi.");
        } finally {
            setIsUpdating(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-5 sm:p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-2xl font-semibold text-slate-800">Edit Postingan</h3>
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
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-base"
                            rows="5"
                        />
                    </div>
                    <div className="space-y-3">
                        <button type="button" onClick={() => imageInputRef.current.click()} className="w-full flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-800 py-2.5 px-3 bg-blue-50 rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-500 transition">
                            <ImageIcon size={22} /> 
                            <span className="font-medium">Ubah Gambar</span>
                        </button>
                        <input type="file" ref={imageInputRef} onChange={handleImageChange} accept="image/jpeg, image/png, image/gif" className="hidden" />
                        {imagePreview && (
                            <div className="mt-2 relative group">
                                <img src={imagePreview} alt="Preview" className="rounded-lg max-h-60 w-auto mx-auto object-contain border border-slate-200" />
                                <button type="button" onClick={() => {setImageFile(null); setImagePreview(null); if(imageInputRef.current) imageInputRef.current.value = null;}} className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
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
                                placeholder="Contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isUpdating}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-60 text-lg"
                    >
                        {isUpdating ? 'Memperbarui...' : 'Perbarui Postingan'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// Modal konfirmasi penghapusan
function ConfirmDeleteModal({ isOpen, message, onConfirm, onCancel, isDeleting }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                <h3 className="text-xl font-semibold text-slate-800 mb-4">Konfirmasi Penghapusan</h3>
                <p className="text-slate-700 mb-6">{message}</p>
                <div className="flex justify-center space-x-4">
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-150 disabled:opacity-50"
                    >
                        {isDeleting ? "Menghapus..." : "Hapus"}
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="bg-slate-300 hover:bg-slate-400 text-slate-800 font-semibold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-150 disabled:opacity-50"
                    >
                        Batal
                    </button>
                </div>
            </div>
        </div>
    );
}


function PostCard({ post, currentUser, onPostEdited, onPostDeleted, onViewProfile }) {
    const [liked, setLiked] = useState(post.likes?.includes(currentUser.uid) || false);
    const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
    const [currentCommentsCount, setCurrentCommentsCount] = useState(post.commentsCount || 0); 
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeletingPost, setIsDeletingPost] = useState(false);
    const [showShareMessage, setShowShareMessage] = useState(false); // State untuk pesan "Link disalin!"

    const isMyPost = post.userId === currentUser.uid;

    useEffect(() => {
        setLiked(post.likes?.includes(currentUser.uid) || false);
        setLikesCount(post.likes?.length || 0);
        setCurrentCommentsCount(post.commentsCount || 0);
    }, [post, currentUser.uid]);


    const handleLike = async () => {
        if (!currentUser || !post.id) {
            console.warn("handleLike: Current user or post ID is missing.");
            return;
        }
        const postRef = doc(db, getCollectionPath('posts', true), post.id);
        try {
            if (liked) {
                await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
            } else {
                await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
                // Kirim notifikasi ke penulis postingan jika bukan menyukai postingan sendiri
                if (post.userId !== currentUser.uid) {
                    sendNotification(post.userId, 'like', currentUser.uid, post.id);
                }
            }
            setLiked(!liked);
            setLikesCount(prev => liked ? prev -1 : prev + 1);

        } catch (error) {
            console.error("handleLike: Error updating like:", error);
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
        if (!newComment.trim() || !currentUser || !post.id) {
            console.warn("handleAddComment: New comment, current user, or post ID is missing.");
            return;
        }
        
        const commentsRef = collection(db, getCollectionPath('posts', true), post.id, 'comments');
        try {
            await addDoc(commentsRef, {
                text: newComment.trim(),
                userId: currentUser.uid,
                createdAt: serverTimestamp()
            });
            const postRef = doc(db, getCollectionPath('posts', true), post.id);
            await updateDoc(postRef, { commentsCount: increment(1) }); 
            setNewComment('');

            // Kirim notifikasi ke penulis postingan jika bukan mengomentari postingan sendiri
            if (post.userId !== currentUser.uid) {
                sendNotification(post.userId, 'comment', currentUser.uid, post.id);
            }

        } catch (error) {
            console.error("handleAddComment: Error adding comment:", error);
        }
    };

    const handleDeletePost = async () => {
        setShowDeleteConfirm(false);
        if (!post.id || isDeletingPost) return;
        setIsDeletingPost(true);

        try {
            // Hapus gambar dari storage jika ada
            if (post.imageStoragePath) { 
                const imageRef = ref(storage, post.imageStoragePath);
                await deleteObject(imageRef);
            }
            // Hapus subkoleksi komentar (Firestore tidak otomatis menghapus subkoleksi)
            const commentsCollectionRef = collection(db, getCollectionPath('posts', true), post.id, 'comments');
            const commentsSnapshot = await getDocs(commentsCollectionRef);
            const deleteCommentPromises = commentsSnapshot.docs.map(commentDoc => deleteDoc(commentDoc.ref));
            await Promise.all(deleteCommentPromises);

            // Hapus dokumen postingan
            await deleteDoc(doc(db, getCollectionPath('posts', true), post.id));
            if (onPostDeleted) onPostDeleted(post.id); 
        } catch (error) {
            console.error("Error deleting post:", error);
        } finally {
            setIsDeletingPost(false);
        }
    };

    const handleSharePost = () => {
        let shareContent = `Lihat postingan ini di Bgune Community!\n\n${post.text || ''}`;
        if (post.imageUrl) {
            shareContent += `\n\nGambar: ${post.imageUrl}`;
        }
        if (post.videoUrl) {
            shareContent += `\n\nVideo: ${post.videoUrl}`;
        }
        // Fallback for copying to clipboard
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = shareContent;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        try {
            document.execCommand('copy');
            setShowShareMessage(true);
            setTimeout(() => setShowShareMessage(false), 3000); // Sembunyikan pesan setelah 3 detik
        } catch (err) {
            console.error('Gagal menyalin ke clipboard:', err);
            // Optionally, show a fallback message to the user
        }
        document.body.removeChild(tempTextArea);
    };

    return (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden mx-2 sm:mx-auto max-w-xl border border-slate-200">
            <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <img 
                            src={post.author?.photoURL || `https://placehold.co/40x40/E0E7FF/4F46E5?text=${(post.author?.displayName || 'U').charAt(0)}`} 
                            alt={post.author?.displayName} 
                            className="w-11 h-11 rounded-full mr-3 object-cover shadow-sm cursor-pointer" 
                            onClick={() => onViewProfile(post.userId)}
                        />
                        <div>
                            <p className="font-semibold text-slate-800 text-md cursor-pointer hover:text-blue-600" onClick={() => onViewProfile(post.userId)}>{post.author?.displayName || 'Pengguna Bgune'}</p>
                            <p className="text-xs text-slate-500">{timeAgo(post.createdAt)}</p>
                        </div>
                    </div>
                    {isMyPost && (
                        <div className="relative">
                            <button 
                                onClick={() => setShowOptions(!showOptions)}
                                className="p-2 rounded-full hover:bg-slate-100 transition"
                            >
                                <MoreVertical size={20} />
                            </button>
                            {showOptions && (
                                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-1 z-20 border border-slate-200">
                                    <button 
                                        onClick={() => { setShowEditModal(true); setShowOptions(false); }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                    >
                                        <Edit size={16} className="mr-2" /> Edit
                                    </button>
                                    <button 
                                        onClick={() => { setShowDeleteConfirm(true); setShowOptions(false); }}
                                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 size={16} className="mr-2" /> Hapus
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
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
                        <span className="text-sm font-medium">{currentCommentsCount} Komentar</span>
                    </button>
                    <button onClick={handleSharePost} className="flex items-center space-x-1.5 p-2 rounded-lg hover:bg-slate-100 transition-colors hover:text-slate-800">
                        <Share2 size={20} />
                        <span className="text-sm font-medium">Bagikan</span>
                    </button>
                </div>
                {showShareMessage && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm px-4 py-2 rounded-full shadow-lg transition-all duration-300 ease-out z-30">
                        Link postingan disalin!
                    </div>
                )}
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
                            className="flex-grow p-2.5 border border-slate-300 rounded-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none"
                        />
                        <button type="submit" className="p-2.5 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!newComment.trim()}>
                            <Send size={20} />
                        </button>
                    </form>
                    {loadingComments && <p className="text-sm text-slate-500 text-center py-2">Memuat komentar...</p>}
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {comments.map(comment => (
                            <div key={comment.id} className="flex items-start space-x-2.5">
                                <img 
                                    src={comment.author?.photoURL || `https://placehold.co/32x32/CBD5E1/475569?text=A`} 
                                    alt={comment.author?.displayName} 
                                    className="w-9 h-9 rounded-full object-cover shadow-sm cursor-pointer"
                                    onClick={() => onViewProfile(comment.userId)}
                                />
                                <div className="bg-slate-100 p-2.5 rounded-lg flex-grow shadow-sm">
                                    <p className="font-semibold text-sm text-slate-800 cursor-pointer hover:text-blue-600" onClick={() => onViewProfile(comment.userId)}>{comment.author?.displayName}</p>
                                    <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{comment.text}</p>
                                    <p className="text-xs text-slate-400 mt-1 text-right">{timeAgo(comment.createdAt)}</p>
                                </div>
                            </div>
                        ))}
                         {comments.length === 0 && !loadingComments && <p className="text-sm text-slate-500 text-center py-2">Belum ada komentar di postingan ini.</p>}
                    </div>
                </div>
            )}

            {showEditModal && (
                <EditPostModal 
                    post={post} 
                    currentUser={currentUser} 
                    onClose={() => setShowEditModal(false)} 
                    onPostUpdated={() => {
                        if(onPostEdited) onPostEdited();
                        setShowEditModal(false); 
                    }}
                />
            )}

            <ConfirmDeleteModal
                isOpen={showDeleteConfirm}
                message="Apakah Anda yakin ingin menghapus postingan ini? Tindakan ini tidak dapat dibatalkan."
                onConfirm={handleDeletePost}
                onCancel={() => setShowDeleteConfirm(false)}
                isDeleting={isDeletingPost}
            />
        </div>
    );
}


function ChatList({ currentUser, onSelectChat, onFindFriends, onOpenAIChat }) {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || !currentUser.uid) {
            setLoading(false);
            return;
        }

        const chatRoomsRef = collection(db, getCollectionPath('chatRooms', true));
        // Query untuk chatroom yang melibatkan pengguna saat ini
        const q = query(chatRoomsRef, where('members', 'array-contains', currentUser.uid));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const chatListDataPromises = snapshot.docs.map(async (roomDoc) => {
                const roomData = roomDoc.data();
                // Filter out AI chat from this list if it's handled separately
                if (roomData.members.includes("bgune_ai_bot")) {
                    return null; // Lewati chat AI di sini, ini akan menjadi entri statis
                }

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
                            isPinned: roomData.pinnedBy && roomData.pinnedBy.includes(currentUser.uid), // Cek apakah di-pin oleh pengguna ini
                            updatedAt: roomData.updatedAt, // Untuk sorting
                        };
                    }
                }
                return null;
            });
            const chatListData = (await Promise.all(chatListDataPromises)).filter(Boolean);
            
            // Urutkan chat: yang di-pin dulu, lalu berdasarkan stempel waktu pesan terakhir
            chatListData.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                // Jika keduanya di-pin atau keduanya tidak, urutkan berdasarkan stempel waktu
                const timeA = a.lastMessageTimestamp?.toDate() || new Date(0);
                const timeB = b.lastMessageTimestamp?.toDate() || new Date(0);
                return timeB.getTime() - timeA.getTime();
            });

            setChats(chatListData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching chats: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handlePinToggle = async (chatItem) => {
        if (!currentUser || !chatItem.chatId) return;
        const chatRoomRef = doc(db, getCollectionPath('chatRooms', true), chatItem.chatId);
        try {
            if (chatItem.isPinned) {
                await updateDoc(chatRoomRef, { pinnedBy: arrayRemove(currentUser.uid) });
            } else {
                await updateDoc(chatRoomRef, { pinnedBy: arrayUnion(currentUser.uid) });
            }
        } catch (error) {
            console.error("Error toggling pin status:", error);
        }
    };


    if (loading) {
        return <div className="p-6 text-center text-slate-500">Memuat daftar chat...</div>;
    }

    return (
        <div className="h-full flex flex-col bg-slate-50">
             <div className="p-4 sm:p-5 border-b border-slate-200 bg-white sticky top-0 z-10">
                <h2 className="text-2xl font-semibold text-slate-800 mb-3">Pesan Pribadi</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                        onClick={onFindFriends} 
                        className="flex-1 flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150"
                    >
                        <Search size={20} />
                        <span>Cari & Mulai Chat</span>
                    </button>
                    <button 
                        onClick={onOpenAIChat} 
                        className="flex-1 flex items-center justify-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150"
                    >
                        <MessageSquare size={20} />
                        <span>Chat dengan AI</span>
                    </button>
                </div>
            </div>
            {chats.length === 0 && (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                    <MessageSquare size={56} className="mb-4 opacity-40" />
                    <p className="text-lg">Anda belum memiliki percakapan.</p>
                    <p className="text-sm">Mulai chat dengan mencari teman atau pengguna lain.</p>
                </div>
            )}
            <div className="flex-grow overflow-y-auto">
                {chats.map(chatItem => ( 
                    <div
                        key={chatItem.chatId}
                        className="flex items-center p-3 sm:p-4 hover:bg-slate-100 cursor-pointer border-b border-slate-200 transition-colors relative"
                    >
                        <img src={chatItem.otherUserPhotoURL || `https://placehold.co/48x48/E0E7FF/4F46E5?text=${chatItem.otherUserName.charAt(0)}`} alt={chatItem.otherUserName} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full mr-3 sm:mr-4 object-cover shadow-sm" />
                        <div className="flex-grow overflow-hidden" onClick={() => onSelectChat({ 
                            uid: chatItem.otherUserId, 
                            displayName: chatItem.otherUserName, 
                            photoURL: chatItem.otherUserPhotoURL
                        })}>
                            <p className="font-semibold text-slate-800 text-md truncate">{chatItem.otherUserName}</p>
                            <p className="text-sm text-slate-500 truncate">{chatItem.lastMessage}</p>
                        </div>
                        {chatItem.lastMessageTimestamp && (
                             <p className="text-xs text-slate-400 ml-2 whitespace-nowrap self-start mt-1">
                                {formatTimestamp(chatItem.lastMessageTimestamp)}
                            </p>
                        )}
                        <button 
                            onClick={() => handlePinToggle(chatItem)}
                            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-slate-200 text-slate-500"
                            title={chatItem.isPinned ? "Lepas Pin" : "Sematkan Chat"}
                        >
                            {chatItem.isPinned ? <PinOff size={18} className="text-blue-600" /> : <Pin size={18} />}
                        </button>
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
    const [otherUserDetails, setOtherUserDetails] = useState(null); 
    const [isRemoteTyping, setIsRemoteTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    },[]);

    useEffect(scrollToBottom, [messages, scrollToBottom]);

    // Fetch other user's details for online status
    useEffect(() => {
        if (chat?.otherUserId) {
            const userRef = doc(db, getCollectionPath('profiles', true), chat.otherUserId);
            const unsubscribe = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    setOtherUserDetails(docSnap.data());
                } else {
                    setOtherUserDetails(null); 
                }
            });
            return () => unsubscribe();
        }
    }, [chat?.otherUserId]);

    // Fetch messages and listen for typing status
    useEffect(() => {
        if (!chat || !chat.chatId) return;
        setLoadingMessages(true);
        
        // Listener untuk pesan
        const messagesRef = collection(db, getCollectionPath('chatRooms', true), chat.chatId, 'messages');
        const qMessages = query(messagesRef, orderBy('timestamp', 'asc'));
        const unsubscribeMessages = onSnapshot(qMessages, async (snapshot) => {
            const msgs = [];
            const updatePromises = [];

            snapshot.docs.forEach(docSnap => {
                const msgData = { id: docSnap.id, ...docSnap.data() };
                msgs.push(msgData);
                // Tandai pesan sebagai terbaca jika diterima oleh currentUser dan belum dibaca
                if (msgData.recipientId === currentUser.uid && !msgData.readAt) {
                    const msgRef = doc(db, getCollectionPath('chatRooms', true), chat.chatId, 'messages', docSnap.id);
                    updatePromises.push(updateDoc(msgRef, { readAt: serverTimestamp() }));
                }
            });
            
            await Promise.all(updatePromises); 
            setMessages(msgs);
            setLoadingMessages(false);
        }, (error) => {
            console.error("Error fetching messages:", error);
            setLoadingMessages(false);
        });

        // Listener untuk status mengetik
        const chatRoomRef = doc(db, getCollectionPath('chatRooms', true), chat.chatId);
        const unsubscribeTyping = onSnapshot(chatRoomRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Pastikan status mengetik dari user lain, bukan diri sendiri
                if (data.typing && data.typing[chat.otherUserId]) {
                    setIsRemoteTyping(true);
                } else {
                    setIsRemoteTyping(false);
                }
            }
        });

        return () => {
            unsubscribeMessages();
            unsubscribeTyping();
            // Hentikan status mengetik saat window ditutup/pindah
            if (currentUser?.uid && chat?.chatId) {
                const roomRef = doc(db, getCollectionPath('chatRooms', true), chat.chatId);
                updateDoc(roomRef, { [`typing.${currentUser.uid}`]: false }).catch(console.error);
            }
        };
    }, [chat, currentUser.uid]);

    const handleTypingChange = (isTyping) => {
        if (!currentUser?.uid || !chat?.chatId) return;
        clearTimeout(typingTimeoutRef.current);
        const chatRoomRef = doc(db, getCollectionPath('chatRooms', true), chat.chatId);
        
        updateDoc(chatRoomRef, {
            [`typing.${currentUser.uid}`]: isTyping 
        }).catch(console.error);

        if (isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
                updateDoc(chatRoomRef, { [`typing.${currentUser.uid}`]: false }).catch(console.error);
            }, 3000); 
        }
    };


    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !chat) return;

        const messageData = {
            text: newMessage.trim(),
            senderId: currentUser.uid,
            recipientId: chat.otherUserId, 
            timestamp: serverTimestamp(),
            readAt: null, 
        };
        
        const messagesRef = collection(db, getCollectionPath('chatRooms', true), chat.chatId, 'messages');
        const chatRoomRef = doc(db, getCollectionPath('chatRooms', true), chat.chatId);

        try {
            await addDoc(messagesRef, messageData);
            await updateDoc(chatRoomRef, {
                lastMessage: { text: newMessage.trim(), senderId: currentUser.uid, timestamp: serverTimestamp() },
                updatedAt: serverTimestamp(),
                [`typing.${currentUser.uid}`]: false 
            });
            setNewMessage('');
            clearTimeout(typingTimeoutRef.current); 
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };
    
    if (!chat) return null;

    const onlineStatusText = otherUserDetails?.isOnline ? 'Online' : (otherUserDetails?.lastActive ? `Terakhir aktif ${timeAgo(otherUserDetails.lastActive)}` : 'Offline');

    return (
        <div className="flex flex-col h-full bg-slate-100">
            <div className="flex items-center p-3 sm:p-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <button onClick={onBack} className="mr-3 text-blue-600 hover:text-blue-800 p-1.5 rounded-full hover:bg-slate-100 transition">
                    <ArrowLeft size={22} />
                </button>
                <img src={chat.otherUserPhotoURL || `https://placehold.co/40x40/E0E7FF/4F46E5?text=${chat.otherUserName.charAt(0)}`} alt={chat.otherUserName} className="w-10 h-10 rounded-full mr-3 object-cover shadow-sm" />
                <div>
                    <h2 className="font-semibold text-slate-800 text-lg">{chat.otherUserName}</h2>
                    <p className="text-xs text-slate-500">{isRemoteTyping ? "Sedang mengetik..." : onlineStatusText}</p>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-3">
                {loadingMessages && <p className="text-center text-slate-500 py-4">Memuat pesan...</p>}
                {!loadingMessages && messages.length === 0 && (
                    <p className="text-center text-slate-500 py-4">Tidak ada pesan. Mulai percakapan!</p>
                )}
                {messages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} isCurrentUser={msg.senderId === currentUser.uid} currentUser={currentUser} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 sm:p-4 bg-white border-t border-slate-200 sticky bottom-0">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2 sm:space-x-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            if (e.target.value.trim()) {
                                handleTypingChange(true);
                            } else {
                                handleTypingChange(false);
                            }
                        }}
                        placeholder="Ketik pesan Anda..."
                        className="flex-grow p-3 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                    />
                    <button type="submit" className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition duration-150 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400" disabled={!newMessage.trim()}>
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}

function MessageBubble({ message, isCurrentUser, currentUser }) {
    const timeDisplay = formatTimestamp(message.timestamp);
    // Pesan dikirim oleh currentUser dan sudah dibaca penerima
    const isRead = message.readAt && message.senderId === currentUser.uid; 
    // Pesan dikirim oleh currentUser tapi belum dibaca penerima
    const isSent = message.senderId === currentUser.uid && !message.readAt; 

    return (
        <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] sm:max-w-[60%] px-4 py-2.5 rounded-2xl shadow-md ${isCurrentUser ? 'bg-blue-500 text-white rounded-br-lg' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-lg'}`}>
                <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
                <div className="flex items-center justify-end mt-1.5">
                    <p className={`text-xs ${isCurrentUser ? 'text-blue-200' : 'text-slate-400'}`}>{timeDisplay}</p>
                    {isCurrentUser && (
                        <span className="ml-1.5">
                            {isRead ? <CheckCheck size={16} className="text-sky-300" /> : <Check size={16} className="text-blue-200" />}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function AIChatWindow({ chat, currentUser, onBack }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [isTyping, setIsTyping] = useState(false); // AI typing indicator
    const messagesEndRef = useRef(null);
    const AI_BOT_ID = "bgune_ai_bot"; // Consistent ID for the AI

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(scrollToBottom, [messages, scrollToBottom]);

    useEffect(() => {
        if (!chat || !chat.chatId) return;
        setLoadingMessages(true);

        const messagesRef = collection(db, getCollectionPath('chatRooms', true), chat.chatId, 'messages');
        const qMessages = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribeMessages = onSnapshot(qMessages, async (snapshot) => {
            const msgs = [];
            snapshot.docs.forEach(docSnap => {
                const msgData = { id: docSnap.id, ...docSnap.data() };
                msgs.push(msgData);
            });
            setMessages(msgs);
            setLoadingMessages(false);
        }, (error) => {
            console.error("Error fetching AI messages:", error);
            setLoadingMessages(false);
        });

        return () => unsubscribeMessages();
    }, [chat]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !chat) return;

        const userMessage = {
            text: newMessage.trim(),
            senderId: currentUser.uid,
            recipientId: AI_BOT_ID,
            timestamp: serverTimestamp(),
        };

        const messagesRef = collection(db, getCollectionPath('chatRooms', true), chat.chatId, 'messages');
        const chatRoomRef = doc(db, getCollectionPath('chatRooms', true), chat.chatId);

        try {
            // Add user's message to Firestore
            await addDoc(messagesRef, userMessage);
            await setDoc(chatRoomRef, {
                members: [currentUser.uid, AI_BOT_ID],
                lastMessage: { text: newMessage.trim(), senderId: currentUser.uid, timestamp: serverTimestamp() },
                updatedAt: serverTimestamp(),
            }, { merge: true });

            setNewMessage('');
            setIsTyping(true); // Show AI typing indicator

            // Call AI API
            const prompt = newMessage.trim();
            // Construct chat history for AI
            let chatHistory = messages.map(msg => ({
                role: msg.senderId === currentUser.uid ? "user" : "model",
                parts: [{ text: msg.text }]
            }));
            chatHistory.push({ role: "user", parts: [{ text: prompt }] }); // Add current user prompt

            const payload = { contents: chatHistory };
            const apiKey = ""; // Canvas will provide this
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            let aiResponseText = "Maaf, saya tidak dapat memproses permintaan Anda saat ini.";

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                aiResponseText = result.candidates[0].content.parts[0].text;
            }

            const aiMessage = {
                text: aiResponseText,
                senderId: AI_BOT_ID,
                recipientId: currentUser.uid,
                timestamp: serverTimestamp(),
            };

            // Add AI's response to Firestore
            await addDoc(messagesRef, aiMessage);
            await updateDoc(chatRoomRef, {
                lastMessage: { text: aiResponseText, senderId: AI_BOT_ID, timestamp: serverTimestamp() },
                updatedAt: serverTimestamp(),
            });

        } catch (error) {
            console.error("Error communicating with AI or sending message:", error);
            // Optionally send an error message from AI to user
            const errorMessage = {
                text: "Terjadi kesalahan saat menghubungi AI. Silakan coba lagi.",
                senderId: AI_BOT_ID,
                recipientId: currentUser.uid,
                timestamp: serverTimestamp(),
            };
            await addDoc(messagesRef, errorMessage);
            await updateDoc(chatRoomRef, {
                lastMessage: { text: errorMessage.text, senderId: AI_BOT_ID, timestamp: serverTimestamp() },
                updatedAt: serverTimestamp(),
            });
        } finally {
            setIsTyping(false); // Hide AI typing indicator
        }
    };

    if (!chat) return null;

    return (
        <div className="flex flex-col h-full bg-slate-100">
            <div className="flex items-center p-3 sm:p-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
                <button onClick={onBack} className="mr-3 text-blue-600 hover:text-blue-800 p-1.5 rounded-full hover:bg-slate-100 transition">
                    <ArrowLeft size={22} />
                </button>
                <img src={chat.otherUserPhotoURL} alt={chat.otherUserName} className="w-10 h-10 rounded-full mr-3 object-cover shadow-sm" />
                <div>
                    <h2 className="font-semibold text-slate-800 text-lg">{chat.otherUserName}</h2>
                    <p className="text-xs text-slate-500">{isTyping ? "AI sedang mengetik..." : "Online"}</p>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-3">
                {loadingMessages && <p className="text-center text-slate-500 py-4">Memuat pesan AI...</p>}
                {!loadingMessages && messages.length === 0 && (
                    <p className="text-center text-slate-500 py-4">Mulai percakapan dengan AI!</p>
                )}
                {messages.map(msg => (
                    <MessageBubble 
                        key={msg.id} 
                        message={msg} 
                        isCurrentUser={msg.senderId === currentUser.uid} 
                        currentUser={currentUser} 
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 sm:p-4 bg-white border-t border-slate-200 sticky bottom-0">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2 sm:space-x-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Ketik pesan Anda untuk AI..."
                        className="flex-grow p-3 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base"
                        disabled={isTyping}
                    />
                    <button type="submit" className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition duration-150 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400" disabled={!newMessage.trim() || isTyping}>
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}

function FindFriendsPage({ currentUser, onStartChat, onBack, onViewProfile }) {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const usersRef = collection(db, getCollectionPath('profiles', true));
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
                    typing: {}, 
                    pinnedBy: [], // Inisialisasi pinnedBy
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
                 <button onClick={onBack} className="mr-3 text-blue-600 hover:text-blue-800 p-1.5 rounded-full hover:bg-slate-100 transition">
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
                    className="w-full p-3 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base shadow-sm"
                />
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            </div>
            {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
            {loading && <p className="text-center text-slate-500 py-4">Memuat pengguna...</p>}
            
            <div className="flex-grow overflow-y-auto space-y-3">
                {!loading && filteredUsers.length === 0 && searchTerm && (
                    <p className="text-center text-slate-500 py-4">Tidak ada pengguna ditemukan dengan nama "{searchTerm}".</p>
                )}
                {!loading && filteredUsers.length === 0 && !searchTerm && users.length > 0 && (
                     <p className="text-center text-slate-500 py-4">Daftar pengguna. Ketik untuk mencari.</p>
                )}
                 {!loading && users.length === 0 && !searchTerm && (
                    <p className="text-center text-slate-500 py-4">Belum ada pengguna lain di platform ini.</p>
                )}
                {filteredUsers.map(userItem => ( 
                    <div key={userItem.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-slate-200">
                        <div className="flex items-center overflow-hidden cursor-pointer" onClick={() => onViewProfile(userItem.uid)}>
                            <img src={userItem.photoURL || `https://placehold.co/40x40/E0E7FF/4F46E5?text=${userItem.displayName.charAt(0)}`} alt={userItem.displayName} className="w-11 h-11 rounded-full mr-3 object-cover shadow-sm" />
                            <div className="overflow-hidden">
                                <p className="font-semibold text-slate-700 truncate">{userItem.displayName}</p>
                                <p className="text-sm text-slate-500 truncate">{userItem.bio?.substring(0,35)}{userItem.bio?.length > 35 ? '...' : ''}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleStartChat(userItem)}
                            className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-md shadow-sm hover:shadow-md transition duration-150 whitespace-nowrap"
                        >
                            Mulai Chat
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}


function NotificationsPage({ currentUser, onViewProfile }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!currentUser?.uid) return;

        const notificationsRef = collection(db, getCollectionPath('notifications', true)); // Notifikasi bersifat publik
        const q = query(
            notificationsRef, 
            where('recipientId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const notificationsDataPromises = snapshot.docs.map(async (docSnap) => {
                const notif = { id: docSnap.id, ...docSnap.data() };
                if (notif.senderId) {
                    const senderProfile = await getDoc(doc(db, getCollectionPath('profiles', true), notif.senderId));
                    notif.sender = senderProfile.exists() ? senderProfile.data() : { displayName: 'Pengguna Tidak Dikenal', photoURL: `https://placehold.co/32x32/CBD5E1/475569?text=U` };
                }
                return notif;
            });
            const notificationsList = await Promise.all(notificationsDataPromises);
            setNotifications(notificationsList);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching notifications:", err);
            setError("Gagal memuat notifikasi.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser?.uid]);

    const handleMarkAsRead = async (notificationId) => {
        try {
            await updateDoc(doc(db, getCollectionPath('notifications', true), notificationId), {
                isRead: true
            });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const handleNotificationClick = (notification) => {
        handleMarkAsRead(notification.id);
        // Implementasi navigasi berdasarkan notification.link atau type
        if (notification.type === 'follow' && notification.senderId) {
            onViewProfile(notification.senderId);
        } else if ((notification.type === 'like' || notification.type === 'comment') && notification.postId) {
            // Untuk saat ini, kita tidak memiliki tampilan postingan khusus, jadi hanya log
            console.log(`Lihat postingan ${notification.postId}`);
        }
    };
    
    if (loading) {
        return <div className="p-6 text-center text-slate-500">Memuat notifikasi...</div>;
    }

    return (
        <div className="p-4 sm:p-6 bg-slate-50 min-h-full">
            <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center sm:text-left">Notifikasi Anda</h2>
            {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
            {notifications.length === 0 && !loading && <p className="text-center text-slate-500 text-lg mt-6">Anda belum memiliki notifikasi.</p>}
            <div className="space-y-4">
                {notifications.map(notification => (
                    <div 
                        key={notification.id} 
                        className={`flex items-start p-4 rounded-xl shadow-md border ${notification.isRead ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-200'} hover:shadow-lg transition-shadow cursor-pointer`}
                        onClick={() => handleNotificationClick(notification)}
                    >
                        <div className="flex-shrink-0 mr-3">
                            <img src={notification.sender?.photoURL || `https://placehold.co/32x32/CBD5E1/475569?text=U`} alt={notification.sender?.displayName} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                        </div>
                        <div className="flex-grow">
                            <p className="text-slate-800 font-medium text-base leading-snug">
                                {notification.message}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {timeAgo(notification.createdAt)}
                            </p>
                        </div>
                        {!notification.isRead && (
                            <div className="flex-shrink-0 ml-3">
                                <span className="block w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ProfilePage({ currentUser, onLogout, onViewProfile }) {
    const [isEditing, setIsEditing] = useState(false);
    const [displayName, setDisplayName] = useState(currentUser.displayName);
    const [bio, setBio] = useState(currentUser.bio);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(currentUser.photoURL);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [userPosts, setUserPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [internalCurrentUser, setInternalCurrentUser] = useState(currentUser); 
    const [followersCount, setFollowersCount] = useState(currentUser.followersCount || 0);
    const [followingCount, setFollowingCount] = useState(currentUser.followingCount || 0);


    useEffect(() => {
        setInternalCurrentUser(currentUser); 
        setDisplayName(currentUser.displayName);
        setBio(currentUser.bio || ''); 
        setPhotoPreview(currentUser.photoURL);
        setFollowersCount(currentUser.followersCount || 0);
        setFollowingCount(currentUser.followingCount || 0);
    }, [currentUser]);

    // Listener for current user's profile updates (e.g., followers/following count)
    useEffect(() => {
        if (!currentUser?.uid) return;
        const userDocRef = doc(db, getCollectionPath('profiles', true), currentUser.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setInternalCurrentUser(prev => ({...prev, ...data}));
                setFollowersCount(data.followersCount || 0);
                setFollowingCount(data.followingCount || 0);
            }
        }, (err) => console.error("Error fetching current user profile updates:", err));
        return () => unsubscribe();
    }, [currentUser?.uid]);


    useEffect(() => {
        if (!internalCurrentUser || !internalCurrentUser.uid) return;

        const postsCollectionRef = collection(db, getCollectionPath('posts', true));
        const q = query(postsCollectionRef, where('userId', '==', internalCurrentUser.uid), orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            const postsDataPromises = querySnapshot.docs.map(async (postDoc) => {
                const post = { id: postDoc.id, ...postDoc.data() };
                post.author = { 
                    displayName: internalCurrentUser.displayName, 
                    photoURL: internalCurrentUser.photoURL 
                };
                post.likes = post.likes || [];
                post.commentsCount = post.commentsCount || 0;
                return post;
            });
            const postsData = await Promise.all(postsDataPromises);
            setUserPosts(postsData);
            setLoadingPosts(false);
        }, (error) => {
            console.error("Error fetching user posts:", error);
            setLoadingPosts(false);
        });

        return () => unsubscribe();
    }, [internalCurrentUser]);

    const handlePhotoChange = (e) => {
        setError('');
        if (e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) {
                setError("Ukuran foto profil maksimal 2MB.");
                return;
            }
            if (!['image/jpeg', 'image/png'].includes(file.type)) {
                setError("Format foto tidak didukung (hanya JPG, PNG).");
                return;
            }
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
            // Reset input file agar event onChange terpicu lagi jika file yang sama dipilih
            e.target.value = null; 
        }
    };
    
    const handleSaveProfile = async () => {
        setError('');
        if (!displayName.trim() || !bio.trim()) {
            setError("Nama dan Bio tidak boleh kosong.");
            return;
        }
        setIsSaving(true);
        let newPhotoURL = internalCurrentUser.photoURL;

        if (photoFile) {
            const photoRef = ref(storage, `profile_photos/${internalCurrentUser.uid}/${Date.now()}_${photoFile.name}`);
            try {
                const snapshot = await uploadBytes(photoRef, photoFile);
                newPhotoURL = await getDownloadURL(snapshot.ref);
            } catch (uploadError) {
                // Penanganan kesalahan lebih detail
                console.error("Error uploading new photo for ProfilePage:", uploadError);
                setError(`Gagal mengunggah foto baru: ${uploadError.message || 'Terjadi kesalahan tidak dikenal.'}`);
                setIsSaving(false);
                return;
            }
        }

        const userDocRef = doc(db, getCollectionPath('profiles', true), internalCurrentUser.uid);
        const updatedProfileData = {
            displayName: displayName.trim(),
            bio: bio.trim(),
            photoURL: newPhotoURL,
            updatedAt: serverTimestamp()
        };
        try {
            await updateDoc(userDocRef, updatedProfileData);
            setInternalCurrentUser(prev => ({...prev, ...updatedProfileData})); 
            setIsEditing(false);
        } catch (saveError) {
            console.error("Error updating profile:", saveError);
            setError("Gagal memperbarui profil. Coba lagi.");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePostChange = () => {
        // This function can be used to trigger a re-fetch of user posts if needed
        console.log("A post by the user was edited or deleted.");
    };

    return (
        <div className="p-4 sm:p-6 bg-slate-50 min-h-full">
            <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-xl p-6 sm:p-8">
                <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                        <img 
                            src={isEditing ? photoPreview : internalCurrentUser.photoURL} 
                            alt="Foto Profil" 
                            className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                            onError={(e) => e.target.src=`https://placehold.co/150x150/E0E7FF/4F46E5?text=${(internalCurrentUser.displayName || 'P').charAt(0)}`}
                        />
                        {isEditing && (
                            <>
                                <input type="file" id="profilePhotoEdit" onChange={handlePhotoChange} accept="image/jpeg, image/png" className="hidden" />
                                <label htmlFor="profilePhotoEdit" className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-2.5 rounded-full cursor-pointer hover:bg-blue-700 transition shadow-md">
                                    <ImageIcon size={18}/>
                                </label>
                            </>
                        )}
                    </div>

                    {error && !isEditing && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md text-center">{error}</p>}

                    {!isEditing ? (
                        <>
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mt-3 text-center">{internalCurrentUser.displayName}</h2>
                            <p className="text-slate-600 mt-1 text-center text-base">{internalCurrentUser.email}</p>
                            <p className="text-slate-700 mt-5 text-center leading-relaxed max-w-md text-base">{internalCurrentUser.bio || "Pengguna ini belum menambahkan bio."}</p>
                            
                            <div className="flex justify-center space-x-6 mt-6 mb-8">
                                <div className="text-center">
                                    <p className="font-bold text-xl text-slate-800">{userPosts.length}</p>
                                    <p className="text-sm text-slate-500">Postingan</p>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-xl text-slate-800">{followersCount}</p>
                                    <p className="text-sm text-slate-500">Pengikut</p>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-xl text-slate-800">{followingCount}</p>
                                    <p className="text-sm text-slate-500">Mengikuti</p>
                                </div>
                            </div>

                            <button 
                                onClick={() => { setIsEditing(true); setError(''); setDisplayName(internalCurrentUser.displayName); setBio(internalCurrentUser.bio || ''); setPhotoPreview(internalCurrentUser.photoURL); setPhotoFile(null);}}
                                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-8 rounded-lg shadow-md hover:shadow-lg transition duration-150 flex items-center space-x-2 text-base"
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
                                <input type="text" id="editDisplayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full p-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"/>
                            </div>
                            <div>
                                <label htmlFor="editBio" className="block text-sm font-medium text-slate-700 mb-1">Bio Singkat</label>
                                <textarea id="editBio" value={bio} onChange={(e) => setBio(e.target.value)} rows="3" maxLength="150" className="mt-1 w-full p-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base resize-none" placeholder="Maks. 150 karakter"></textarea>
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
                        <p className="text-sm text-slate-500 mb-2">ID Pengguna Anda: <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{internalCurrentUser.uid}</code></p>
                        <button
                            onClick={onLogout}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-8 rounded-lg shadow-md hover:shadow-lg transition duration-150 flex items-center space-x-2 mx-auto text-base"
                        >
                            <LogOut size={20} />
                            <span>Keluar Akun</span>
                        </button>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-200">
                    <h3 className="text-2xl font-semibold text-slate-800 mb-6 text-center">Postingan Anda</h3>
                    {loadingPosts && <p className="text-center text-slate-500">Memuat postingan Anda...</p>}
                    {!loadingPosts && userPosts.length === 0 && (
                        <p className="text-center text-slate-500 text-lg">Anda belum membuat postingan apa pun.</p>
                    )}
                    <div className="space-y-6">
                        {userPosts.map(post => (
                            <PostCard 
                                key={post.id} 
                                post={post} 
                                currentUser={internalCurrentUser} 
                                onPostEdited={handlePostChange}
                                onPostDeleted={handlePostChange}
                                onViewProfile={onViewProfile} // Pass down for author click
                            />
                        ))}
                    </div>
                </div>
            </div>
            <footer className="text-center mt-10 py-4">
                <p className="text-sm text-slate-500">Aplikasi Komunitas Bgune</p>
                <p className="text-xs text-slate-400">Dibuat oleh Tim Bgune</p>
            </footer>
        </div>
    );
}

function OtherProfilePage({ currentUser, otherUserId, onBack, onStartChat }) {
    const [otherUser, setOtherUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isFollowing, setIsFollowing] = useState(false);
    const [otherUserPosts, setOtherUserPosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);

    useEffect(() => {
        if (!otherUserId) return;

        // Fetch other user's profile
        const userDocRef = doc(db, getCollectionPath('profiles', true), otherUserId);
        const unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setOtherUser(data);

                // Check follow status
                if (currentUser?.uid) {
                    const followDocRef = doc(db, getCollectionPath('following', true), currentUser.uid, 'userFollowing', otherUserId);
                    const followSnap = await getDoc(followDocRef);
                    setIsFollowing(followSnap.exists());
                }
            } else {
                setError("Pengguna tidak ditemukan.");
            }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching other user profile:", err);
            setError("Gagal memuat profil pengguna.");
            setLoading(false);
        });

        // Fetch other user's posts
        const postsCollectionRef = collection(db, getCollectionPath('posts', true));
        const qPosts = query(postsCollectionRef, where('userId', '==', otherUserId), orderBy('createdAt', 'desc'));
        
        const unsubscribePosts = onSnapshot(qPosts, async (querySnapshot) => {
            const postsDataPromises = querySnapshot.docs.map(async (postDoc) => {
                const post = { id: postDoc.id, ...postDoc.data() };
                post.author = { 
                    displayName: otherUser?.displayName || 'Pengguna', 
                    photoURL: otherUser?.photoURL 
                };
                post.likes = post.likes || [];
                post.commentsCount = post.commentsCount || 0;
                return post;
            });
            const postsData = await Promise.all(postsDataPromises);
            setOtherUserPosts(postsData);
            setLoadingPosts(false);
        }, (error) => {
            console.error("Error fetching other user posts:", error);
            setLoadingPosts(false);
        });


        return () => {
            unsubscribeProfile();
            unsubscribePosts();
        };
    }, [otherUserId, currentUser?.uid, otherUser?.displayName, otherUser?.photoURL]);

    const handleFollowToggle = async () => {
        if (!currentUser || !otherUser) return;

        const currentUserFollowingRef = doc(db, getCollectionPath('following', true), currentUser.uid, 'userFollowing', otherUser.uid);
        const otherUserFollowersRef = doc(db, getCollectionPath('followers', true), otherUser.uid, 'userFollowers', currentUser.uid);
        const otherUserProfileRef = doc(db, getCollectionPath('profiles', true), otherUser.uid);
        const currentUserProfileRef = doc(db, getCollectionPath('profiles', true), currentUser.uid);

        try {
            if (isFollowing) {
                // Unfollow
                await deleteDoc(currentUserFollowingRef);
                await deleteDoc(otherUserFollowersRef);
                await updateDoc(otherUserProfileRef, { followersCount: increment(-1) });
                await updateDoc(currentUserProfileRef, { followingCount: increment(-1) });
            } else {
                // Follow
                await setDoc(currentUserFollowingRef, { followedAt: serverTimestamp() });
                await setDoc(otherUserFollowersRef, { followerAt: serverTimestamp() });
                await updateDoc(otherUserProfileRef, { followersCount: increment(1) });
                await updateDoc(currentUserProfileRef, { followingCount: increment(1) });
                sendNotification(otherUser.uid, 'follow', currentUser.uid); // Kirim notifikasi follow
            }
            setIsFollowing(prev => !prev);
        } catch (err) {
            console.error("Error following/unfollowing:", err);
            setError("Gagal melakukan aksi. Coba lagi.");
        }
    };

    if (loading) {
        return <div className="p-6 text-center text-slate-500">Memuat profil...</div>;
    }

    if (error) {
        return (
            <div className="p-6 text-center text-red-500 bg-red-100 rounded-md mx-auto max-w-md mt-10">
                <p>{error}</p>
                <button onClick={onBack} className="mt-4 bg-slate-300 hover:bg-slate-400 text-slate-800 font-semibold py-2 px-4 rounded-lg">Kembali</button>
            </div>
        );
    }

    if (!otherUser) return null; // Seharusnya tidak terjadi jika tidak ada error dan tidak loading

    return (
        <div className="p-4 sm:p-6 bg-slate-50 min-h-full">
            <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-xl p-6 sm:p-8">
                <div className="flex items-center mb-6">
                    <button onClick={onBack} className="mr-4 text-blue-600 hover:text-blue-800 p-1.5 rounded-full hover:bg-slate-100 transition">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-2xl font-semibold text-slate-800">Profil Pengguna</h2>
                </div>

                <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                        <img 
                            src={otherUser.photoURL || `https://placehold.co/150x150/E0E7FF/4F46E5?text=${(otherUser.displayName || 'P').charAt(0)}`} 
                            alt="Foto Profil" 
                            className="w-32 h-32 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                            onError={(e) => e.target.src=`https://placehold.co/150x150/E0E7FF/4F46E5?text=${(otherUser.displayName || 'P').charAt(0)}`}
                        />
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mt-3 text-center">{otherUser.displayName}</h2>
                    <p className="text-slate-600 mt-1 text-center text-base">{otherUser.email}</p>
                    <p className="text-slate-700 mt-5 text-center leading-relaxed max-w-md text-base">{otherUser.bio || "Pengguna ini belum menambahkan bio."}</p>
                    
                    <div className="flex justify-center space-x-6 mt-6 mb-8">
                        <div className="text-center">
                            <p className="font-bold text-xl text-slate-800">{otherUserPosts.length}</p>
                            <p className="text-sm text-slate-500">Postingan</p>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-xl text-slate-800">{otherUser.followersCount || 0}</p>
                            <p className="text-sm text-slate-500">Pengikut</p>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-xl text-slate-800">{otherUser.followingCount || 0}</p>
                            <p className="text-sm text-slate-500">Mengikuti</p>
                        </div>
                    </div>

                    <div className="flex space-x-4 mt-4">
                        <button 
                            onClick={handleFollowToggle}
                            className={`flex items-center space-x-2 font-semibold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-150 text-base
                                ${isFollowing ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                        >
                            {isFollowing ? <UserMinus size={20} /> : <UserPlus size={20} />}
                            <span>{isFollowing ? 'Berhenti Mengikuti' : 'Ikuti'}</span>
                        </button>
                        <button 
                            onClick={() => onStartChat(otherUser)}
                            className="flex items-center space-x-2 bg-slate-300 hover:bg-slate-400 text-slate-800 font-semibold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg transition duration-150 text-base"
                        >
                            <MessageSquare size={20} />
                            <span>Kirim Pesan</span>
                        </button>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-200">
                    <h3 className="text-2xl font-semibold text-slate-800 mb-6 text-center">Postingan {otherUser.displayName}</h3>
                    {loadingPosts && <p className="text-center text-slate-500">Memuat postingan...</p>}
                    {!loadingPosts && otherUserPosts.length === 0 && (
                        <p className="text-center text-slate-500 text-lg">Pengguna ini belum membuat postingan apa pun.</p>
                    )}
                    <div className="space-y-6">
                        {otherUserPosts.map(post => (
                            <PostCard 
                                key={post.id} 
                                post={post} 
                                currentUser={currentUser} 
                                onPostEdited={() => {}} // Tidak ada edit/hapus untuk postingan pengguna lain
                                onPostDeleted={() => {}} 
                                onViewProfile={() => {}} // Sudah di profil ini
                            />
                        ))}
                    </div>
                </div>
            </div>
            <footer className="text-center mt-10 py-4">
                <p className="text-sm text-slate-500">Aplikasi Komunitas Bgune</p>
                <p className="text-xs text-slate-400">Dibuat oleh Tim Bgune</p>
            </footer>
        </div>
    );
}

export default App;
