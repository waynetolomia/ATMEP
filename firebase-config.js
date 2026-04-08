// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCV2PNNmuhzeoEzxr-G3w80a1SQUZIfBk8",
  authDomain: "atmep-1eeb3.firebaseapp.com",
  projectId: "atmep-1eeb3",
  storageBucket: "atmep-1eeb3.firebasestorage.app",
  messagingSenderId: "175073034180",
  appId: "1:175073034180:web:0e2ca1c3138cbcdfe7ae91",
  measurementId: "G-F87DSGRRCQ"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();