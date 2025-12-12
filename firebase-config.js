// Firebase Configuration for Royal Vault
const firebaseConfig = {
    apiKey: "AIzaSyATlDCcj-TVL1DVJ8I7D0KEU3Z3Hk91AZo",
    authDomain: "storage-59be5.firebaseapp.com",
    databaseURL: "https://storage-59be5-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "storage-59be5",
    storageBucket: "storage-59be5.firebasestorage.app",
    messagingSenderId: "485318027222",
    appId: "1:485318027222:web:dde21326bf9faa45e9e677",
    measurementId: "G-BFTQBRLH92"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized successfully");
} catch (error) {
    console.error("❌ Firebase initialization error:", error);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.database(); // Using Realtime Database, NOT Storage

// Test database connection
if (db) {
    db.ref('.info/connected').on('value', (snap) => {
        if (snap.val() === true) {
            console.log("✅ Connected to Firebase Realtime Database");
        } else {
            console.log("⚠️ Not connected to database");
        }
    });
}

// Set persistence for auth
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log("✅ Auth persistence set to LOCAL");
    })
    .catch((error) => {
        console.error("❌ Auth persistence error:", error);
    });

// Export for use in other files
window.firebaseApp = {
    auth: auth,
    db: db,
    firebase: firebase
};