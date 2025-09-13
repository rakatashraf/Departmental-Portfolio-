// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDrxwdF4Qvw0HCI3nQEdhVUboZnRKixqoE",
  authDomain: "bauet-cse-portfolio.firebaseapp.com",
  projectId: "bauet-cse-portfolio",
  storageBucket: "bauet-cse-portfolio.firebasestorage.app",
  messagingSenderId: "273300306123",
  appId: "1:273300306123:web:4a2084f054097b11c4434e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ------------------- LOGIN -------------------
window.login = function() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const errorElem = document.getElementById("loginError");

  if (!email || !password) {
    errorElem.innerText = "Please enter email and password.";
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      // Redirect to dashboard after successful login
      window.location.href = "dashboard.html";
    })
    .catch((error) => {
  showLoginError("Login Failed!!: Wrong email or password!");
  console.error(error);
});

};

// ------------------- CHECK LOGIN FOR DASHBOARD -------------------
if (window.location.pathname.includes("dashboard.html")) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // Not logged in, redirect to login page
      window.location.href = "index.html";
    }
  });
}

// ------------------- HELPER FUNCTION: Convert file to Base64 -------------------
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) resolve(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// ------------------- SAVE ACHIEVEMENT -------------------
window.saveAchievement = async function() {
  const type = document.getElementById('type').value;
  const achievementDetails = document.getElementById('achievementDetails').value.trim();
  const photoFile = document.getElementById('photo').files[0];
  const photoBase64 = await fileToBase64(photoFile);

  let entries = [];

  if (type === 'student') {
    const container = document.getElementById('studentFields');
    const groups = container.querySelectorAll('.entry-group');
    groups.forEach(group => {
      const studentId = group.querySelector('.studentId').value.trim();
      const studentName = group.querySelector('.studentName').value.trim();
      const batch = group.querySelector('.batch').value.trim();

      if (studentId && studentName && batch) {
        entries.push({
          type: 'student',
          studentId,
          name: studentName,
          batch,
          achievementDetails,
          photoBase64
        });
      }
    });
  } else {
    const container = document.getElementById('teacherFields');
    const groups = container.querySelectorAll('.entry-group');
    groups.forEach(group => {
      const teacherId = group.querySelector('.teacherId').value.trim();
      const teacherName = group.querySelector('.teacherName').value.trim();
      const department = group.querySelector('.department').value.trim();

      if (teacherId && teacherName && department) {
        entries.push({
          type: 'teacher',
          teacherId,
          name: teacherName,
          department,
          achievementDetails,
          photoBase64
        });
      }
    });
  }

  if (entries.length === 0) {
    alert('Please enter at least one valid entry.');
    return;
  }

  try {
    // Save all entries individually
    for (let entry of entries) {
      const col = entry.type === 'student' ? 'students' : 'teachers';
      await addDoc(collection(db, col), entry);
    }

    // Show success popup
    alert('All achievements saved successfully!');
    
    // Optional: reset form fields
    document.getElementById('achievementDetails').value = '';
    document.getElementById('photo').value = '';
    if(type === 'student'){
      document.querySelectorAll('#studentFields .entry-group').forEach((group, index) => {
        if(index>0) group.remove();
        else group.querySelectorAll('input').forEach(input => input.value='');
      });
    } else {
      document.querySelectorAll('#teacherFields .entry-group').forEach((group, index) => {
        if(index>0) group.remove();
        else group.querySelectorAll('input').forEach(input => input.value='');
      });
    }

  } catch (error) {
    console.error(error);
    alert('Error saving data: ' + error.message);
  }
};
