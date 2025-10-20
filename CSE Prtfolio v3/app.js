// Firebase Configuration and Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Firebase config - Updated with new project configuration
const firebaseConfig = {
    apiKey: "AIzaSyB9Tzg1xQzVmSf5XInx3Tgxv4PAmrgdK28",
    authDomain: "cse-portfolio-38403.firebaseapp.com",
    projectId: "cse-portfolio-38403",
    storageBucket: "cse-portfolio-38403.firebasestorage.app",
    messagingSenderId: "511434668055",
    appId: "1:511434668055:web:e2ecb474faa58b814cc452",
    measurementId: "G-VRK8ZJ0JMS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Missing escapeHtml function - single definition
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Global state
let currentUser = null;
let batchPhotos = [];
let batchPhotosScrollTimer = null;

// Declarations removed; implementations provided below
let achievements = { students: [], teachers: [], collaborative: [] };
let filteredAchievements = [];
let currentFilter = { type: 'all', category: 'all' };
let editMode = false;
let editContext = null;

// Most recent grouped (deduplicated) achievements computed by updateAchievements()
let latestGroupedAchievements = null;

// Photo carousel state
let carouselPhotos = [];
let currentSlideIndex = 0;
let carouselInterval = null;
let isCarouselInitialized = false;
// Suppress toasts during initial page load
let suppressToastsDuringLoad = true;

// EmailJS Configuration
const EMAILJS_CONFIG = {
    serviceId: 'service_bauet',
    templateId: 'template_contact',
    publicKey: 'HmwJRxwjigzXWjCFL'
};

// Initialize EmailJS
if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_CONFIG.publicKey);
}

// Ensure hero title height fits tallest rotating phrase to avoid layout shift
function setHeroTitleMinHeight() {
    const title = document.querySelector('.hero-title');
    if (!title) return;
    const phrases = title.querySelectorAll('.phrase');
    if (!phrases.length) return;
    let maxH = 0;
    const originals = [];
    phrases.forEach((ph, idx) => {
        originals[idx] = ph.getAttribute('style');
        // Temporarily neutralize animation/position to measure natural height
        ph.style.position = 'static';
        ph.style.opacity = '0';
        ph.style.visibility = 'hidden';
        ph.style.animation = 'none';
        ph.style.display = 'block';
        const h = ph.offsetHeight;
        if (h > maxH) maxH = h;
    });
    // Restore inline styles
    phrases.forEach((ph, idx) => {
        if (originals[idx] == null) {
            ph.removeAttribute('style');
        } else {
            ph.setAttribute('style', originals[idx]);
        }
    });
    if (maxH > 0) title.style.minHeight = maxH + 'px';
}

// Debounce helper
function debounce(fn, wait) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

// Run when DOM is ready and after resources load (fonts) + on resize
document.addEventListener('DOMContentLoaded', () => setHeroTitleMinHeight());
window.addEventListener('load', () => setHeroTitleMinHeight());
window.addEventListener('resize', debounce(() => setHeroTitleMinHeight(), 200));

// DOM Elements
const elements = {
    // Edit-related removed - reusing add achievement modal
    // Navigation
    navToggle: document.getElementById('nav-toggle'),
    navMenu: document.getElementById('nav-menu'),
    adminLoginBtn: document.getElementById('admin-login-btn'),
    
    // Admin controls
    adminControls: document.getElementById('admin-controls'),
    addAchievementBtn: document.getElementById('add-achievement-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Filters
    filterBtns: document.querySelectorAll('.filter-btn'),
    categoryBtns: document.querySelectorAll('.category-btn'),
    categoryFilters: document.getElementById('category-filters'),
    // Achievement search inputs
    achievementSearch: document.getElementById('achievement-search'),
    batchFilter: document.getElementById('batch-filter'),
    
    // Grid and loading
    achievementsGrid: document.getElementById('achievements-grid'),
    loading: document.getElementById('loading'),
    
    // Stats
    studentCount: document.getElementById('student-achievements-count'),
    teacherCount: document.getElementById('teacher-achievements-count'),
    collaborativeCount: document.getElementById('collaborative-achievements-count'),
    
    // Login modal
    loginModal: document.getElementById('login-modal'),
    loginModalOverlay: document.getElementById('login-modal-overlay'),
    loginModalClose: document.getElementById('login-modal-close'),
    loginForm: document.getElementById('login-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    loginSubmit: document.getElementById('login-submit'),
    
    // Achievement modal
    achievementModal: document.getElementById('achievement-modal'),
    achievementModalOverlay: document.getElementById('achievement-modal-overlay'),
    achievementModalClose: document.getElementById('achievement-modal-close'),
    achievementModalTitle: document.getElementById('achievement-modal-title'),
    achievementForm: document.getElementById('achievement-form'),
    achievementType: document.getElementById('achievement-type'),
    achievementCategory: document.getElementById('achievement-category'),
    categorySelection: document.getElementById('category-selection'),
    achievementTitle: document.getElementById('achievementTitle'),
    titleCounter: document.getElementById('title-counter'),
    titleCharCount: document.getElementById('title-char-count'),
    titleError: document.getElementById('title-error'),
    achievementDetails: document.getElementById('achievement-details'),
    dynamicFields: document.getElementById('dynamic-fields'),
    studentFields: document.getElementById('studentFields'),
    teacherFields: document.getElementById('teacherFields'),
    collaborativeFields: document.getElementById('collaborativeFields'),
    studentEntries: document.getElementById('student-entries'),
    teacherEntries: document.getElementById('teacher-entries'),
    collaborativeId: document.getElementById('collaborative-id'),
    collaborativeName: document.getElementById('collaborative-name'),
    collaborativeDescription: document.getElementById('collaborative-description'),
    achievementPhoto: document.getElementById('achievement-photo'),
    achievementCancel: document.getElementById('achievement-cancel'),
    achievementSubmit: document.getElementById('achievement-submit'),
    photoPreview: document.getElementById('photo-preview'),
    previewImage: document.getElementById('preview-image'),

    
    // Contact modal elements removed (Contact Us removed from UI)
    contactModal: null,
    contactModalOverlay: null,
    contactModalClose: null,
    contactForm: null,
    contactName: null,
    contactEmail: null,
    contactSubject: null,
    contactMessage: null,
    contactCancel: null,
    contactSubmit: null,
    contactNavLink: null,
    
    // Toast container
    toastContainer: document.getElementById('toast-container')
};

// Batchwise elements (may be null until DOM has new section)
// Replaced by improved batchwise implementation (fixed version)
let batchModal = null;
let batchForm = null;
let batchUploadBtn = null;

// fileToBase64 is defined globally later in this file; no duplicate definition here

// Start real-time listener on unified collection batchPhotos (flat structure)
async function startBatchPhotosListener() {
    try {
        const { collection, query, orderBy, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

        if (window.batchPhotosUnsubscribe) {
            try { window.batchPhotosUnsubscribe(); } catch (e) {}
            window.batchPhotosUnsubscribe = null;
        }

        const colRef = collection(db, 'batchPhotos');
        const q = query(colRef, orderBy('createdAt', 'desc'));

        window.batchPhotosUnsubscribe = onSnapshot(q, (snapshot) => {
            batchPhotos = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
            console.log('📸 Batch photos loaded:', batchPhotos.length);
            renderBatchCarousel();
        }, (error) => {
            console.error('Error loading batch photos:', error);
        });
    } catch (err) {
        console.error('Failed to start batchPhotos listener:', err);
    }
}

// Render carousel matching new HTML structure with inline admin controls
function renderBatchCarousel() {
    const carousel = document.getElementById('batches-carousel');
    const scrollContainer = document.getElementById('batches-scroll-container');
    if (!carousel || !scrollContainer) return;

    if (!batchPhotos || batchPhotos.length === 0) {
        // Preserve structure: render empty-state message inside the scroll container
        scrollContainer.innerHTML = `
            <div class="no-results" style="width:100%">
                <p>📸 No batch photos yet.</p>
                <p>Admins can upload batch photos using the button above.</p>
            </div>
        `;
        toggleScrollControls(false);
        updateScrollButtonsState();
        return;
    }

    // Populate scroll container with cards (prefer hosted URL, fallback to base64)
    scrollContainer.innerHTML = batchPhotos.map(batch => `
        <div class="batch-card ${currentUser ? 'admin-mode' : ''}" data-batch-id="${batch.docId}">
            ${currentUser ? `
                <div class="admin-controls">
                    <button class="edit-btn" onclick="editBatchPhoto('${batch.docId}')" title="Edit Batch Photo">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteBatchPhoto('${batch.docId}')" title="Delete Batch Photo">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            ` : ''}

            <div class="batch-image">
                <img src="${batch.photoUrl || batch.photoBase64 || ''}" alt="${escapeHtml(batch.batchName || '')}"
                    loading="lazy"
                    onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'280\\' height=\\'200\\'%3E%3Crect fill=\\'%23ddd\\' width=\\'280\\' height=\\'200\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' font-size=\\'18\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23999\\'%3ENo Image%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="batch-body">
                <div class="batch-title">Batch ${escapeHtml(batch.batchNumber || '')}</div>
                <div class="batch-meta">${escapeHtml(batch.batchName || '')}</div>
            </div>
        </div>
    `).join('');

    // Show/hide and update scroll controls
    toggleScrollControls(batchPhotos.length > 1);
    updateScrollButtonsState();
}

function toggleScrollControls(show) {
    const left = document.getElementById('batch-scroll-left');
    const right = document.getElementById('batch-scroll-right');
    if (left) left.style.display = show ? 'flex' : 'none';
    if (right) right.style.display = show ? 'flex' : 'none';
}

function scrollBatchPhotos(direction) {
    const scrollContainer = document.getElementById('batches-scroll-container');
    if (!scrollContainer) return;
    const amount = 320; // approx card width + gap
    const next = direction === 'left' ? scrollContainer.scrollLeft - amount : scrollContainer.scrollLeft + amount;
    scrollContainer.scrollTo({ left: next, behavior: 'smooth' });
    setTimeout(updateScrollButtonsState, 300);
}

function updateScrollButtonsState() {
    const scrollContainer = document.getElementById('batches-scroll-container');
    const left = document.getElementById('batch-scroll-left');
    const right = document.getElementById('batch-scroll-right');
    if (!scrollContainer || !left || !right) return;
    const atStart = scrollContainer.scrollLeft <= 0;
    const atEnd = scrollContainer.scrollLeft >= (scrollContainer.scrollWidth - scrollContainer.clientWidth - 8);
    left.disabled = atStart;
    right.disabled = atEnd;
    left.style.opacity = atStart ? '0.3' : '1';
    right.style.opacity = atEnd ? '0.3' : '1';
}

// Auto-scroll animation
// Smooth auto-scroll using requestAnimationFrame + subtle back-and-forth "morph" easing.
// Replaces previous interval-based implementation for smoother UX.
function startBatchAutoScroll() {
    const scroller = document.getElementById('batches-scroller');
    if (!scroller || !batchPhotos || batchPhotos.length === 0) return;

    // cancel any existing animator
    if (window.batchScrollRAF) {
        cancelAnimationFrame(window.batchScrollRAF);
        window.batchScrollRAF = null;
    }

    // parameters to tweak speed / loop
    const duration = 12000; // ms to scroll full width
    let startTime = null;
    let direction = 1; // 1 forward, -1 backward

    // Use scrollLeft-based auto-scroll for broad compatibility

    // Ensure smooth native scrolling when user interacts
    let isHovered = false;
    scroller.addEventListener('mouseenter', () => { isHovered = true; });
    scroller.addEventListener('mouseleave', () => { isHovered = false; });

    function step(ts) {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;

        if (!isHovered) {
            const progress = (elapsed % duration) / duration; // 0..1
            // ease in/out for morph-like effect (cubic)
            const eased = 0.5 - 0.5 * Math.cos(Math.PI * progress);
            // compute total scrollable width
            const maxScroll = scroller.scrollWidth - scroller.clientWidth;
            if (maxScroll > 0) {
                // oscillate back and forth using eased value and direction
                const value = direction === 1 ? eased : 1 - eased;
                scroller.scrollLeft = Math.round(maxScroll * value);
            }
        } else {
            // when hovered: do nothing (stop auto movement)
        }

        window.batchScrollRAF = requestAnimationFrame(step);
    }

    // Start animation
    window.batchScrollRAF = requestAnimationFrame(step);
}


// Render admin management list
// Removed legacy admin list rendering (inline controls used on cards)

// Edit batch photo (exposed globally for onclick)
window.editBatchPhoto = function(docId) {
    const batch = (batchPhotos || []).find(b => b.docId === docId);
    if (batch) {
        openBatchModal(batch);
    } else {
        showToast('Batch not found', 'error');
    }
};

// Delete batch photo (exposed globally for onclick)
window.deleteBatchPhoto = async function(docId) {
    if (!currentUser) {
        showToast('You must be logged in as admin', 'error');
        return;
    }
    const batch = (batchPhotos || []).find(b => b.docId === docId);
    const label = batch ? `Batch ${batch.batchNumber}` : 'this batch photo';
    if (!confirm(`Are you sure you want to delete ${label}? This action cannot be undone.`)) return;
    try {
        const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        await deleteDoc(doc(db, 'batchPhotos', docId));
        showToast('Deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting batch photo:', error);
        showToast('Failed to delete: ' + error.message, 'error');
    }
};

// Open batch modal (for add or edit)
function openBatchModal(editData = null) {
    if (!currentUser) {
        showToast('Admin login required', 'error');
        try { openLoginModal(); } catch (_) {}
        return;
    }
    const modal = document.getElementById('batch-modal');
    const title = document.getElementById('batch-modal-title');
    const form = document.getElementById('batch-form');
    const preview = document.getElementById('batch-photo-preview');
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Ensure event listeners are wired even if initial wiring missed
    if (form && !form.__batchSubmitWired) {
        form.addEventListener('submit', handleBatchFormSubmit);
        form.__batchSubmitWired = true;
    }
    const photoInput = document.getElementById('batch-photo-input');
    if (photoInput && !photoInput.__batchChangeWired) {
        photoInput.addEventListener('change', handleBatchPhotoPreview);
        photoInput.__batchChangeWired = true;
    }

    if (editData) {
        if (title) title.textContent = 'Edit Batch Photo';
        const bn = document.getElementById('batch-number');
        const bname = document.getElementById('batch-name');
        if (bn) bn.value = editData.batchNumber || '';
        if (bname) bname.value = editData.batchName || '';
        if (preview) {
            const src = editData.photoUrl || editData.photoBase64 || '';
            if (src) {
                preview.innerHTML = `<img src="${src}" alt="Preview" style="max-width: 100%; height: auto; border-radius: 8px;">`;
                preview.style.display = 'block';
            } else {
                preview.innerHTML = '<span style="color: #999;">Photo preview will appear here</span>';
                preview.style.display = 'block';
            }
        }
        if (form) form.dataset.editId = editData.docId;
    } else {
        if (title) title.textContent = 'Upload Batch Photo';
        if (form) { form.reset(); delete form.dataset.editId; }
        if (preview) {
            preview.innerHTML = '<span style="color: #999;">Photo preview will appear here</span>';
            preview.style.display = 'block';
        }
    }
}

// Close batch modal
function closeBatchModal() {
    const modal = document.getElementById('batch-modal');
    const form = document.getElementById('batch-form');
    const preview = document.getElementById('batch-photo-preview');
    if (!modal) return;
    // Hide via class toggle to match CSS transitions
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (form) { form.reset(); delete form.dataset.editId; }
    if (preview) { preview.innerHTML = '<span style="color: #999;">Photo preview will appear here</span>'; }
}

// Preview handler for batch photo input
async function handleBatchPhotoPreview(e) {
    const file = e.target.files?.[0];
    const preview = document.getElementById('batch-photo-preview');
    if (!file) {
        if (preview) preview.innerHTML = '<span style="color: #999;">Photo preview will appear here</span>';
        delete e.target.dataset.base64;
        return;
    }
    try {
        let base64 = await resizeFileToBase64(file, 1200, 1200, 0.85, 'image/jpeg');
        e.target.dataset.base64 = base64;
        if (preview) preview.innerHTML = `<img src="${base64}" alt="Preview" style="max-width: 100%; height: auto; border-radius: 8px;">`;
    } catch (err) {
        console.error('Error previewing image:', err);
        showToast('Error loading image preview', 'error');
    }
}

// Handle form submission add or update - CORRECTED VERSION
async function handleBatchFormSubmit(e) {
    e.preventDefault();
    console.log('[Batch] handleBatchFormSubmit: start');
    
    try {
        suppressToastsDuringLoad = false;
    } catch {}
    
    if (!currentUser) {
        showToast('Please log in as admin to save batch photos', 'error');
        try {
            openLoginModal();
        } catch {}
        return;
    }
    
    const form = e.target;
    // Immediate user feedback: switch Save button text
    const submitBtn0 = (form && form.querySelector('button[type="submit"]')) || null;
    if (submitBtn0 && !submitBtn0.__originalText) {
        submitBtn0.__originalText = submitBtn0.textContent;
    }
    if (submitBtn0) {
        submitBtn0.textContent = 'Saving…';
    }
    const batchNumber = document.getElementById('batch-number')?.value?.trim();
    const batchName = document.getElementById('batch-name')?.value?.trim();
    const photoInput = document.getElementById('batch-photo-input');
    const editId = form?.dataset?.editId;
    console.log('[Batch] form values:', { batchNumber, batchName, hasFile: !!(photoInput?.files && photoInput.files[0]), hasBase64: !!photoInput?.dataset?.base64, editId });
    
    // Validation
    if (!batchNumber) {
        showToast('Please enter batch number', 'error');
        return;
    }
    
    if (!batchName) {
        showToast('Please enter batch name', 'error');
        return;
    }
    
    if (!editId && (!photoInput?.files || !photoInput.files[0]) && !photoInput?.dataset?.base64) {
        showToast('Please select a batch photo', 'error');
        return;
    }
    
    let progress;
    try {
        // Keep modal open so the in-modal progress bar is visible; also show a global progress bar
        try { showToast('Saving batch photo...', 'success', 1200); } catch {}
        try { progress = showProgress && showProgress('Saving batch photo...'); } catch {}
    // Disable modal buttons to prevent double submit
        const cancelBtn = document.getElementById('batch-cancel');
        const submitBtn = (form && form.querySelector('button[type="submit"]')) || null;
        const closeBtn = document.getElementById('batch-modal-close');
    const statusEl = document.getElementById('batch-photo-status');
        window.isBatchSaving = true;
        if (cancelBtn) cancelBtn.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        if (closeBtn) closeBtn.disabled = true;
    if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'Preparing upload…'; }
        
        let photoBase64 = null;
        let photoUrl = null;
        const progressEl = document.getElementById('batch-photo-progress');
        
        // Get photo data
        if (photoInput?.dataset?.base64) {
            photoBase64 = photoInput.dataset.base64;
        } else if (photoInput?.files && photoInput.files[0]) {
            try {
                // Upload the raw file to Firebase Storage with progress
                const file = photoInput.files[0];
                const { ref, uploadBytesResumable, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js');
                const safeName = `${Date.now()}-${(file.name||'photo').replace(/[^a-zA-Z0-9._-]/g,'_')}`;
                const storageRef = ref(storage, `batchPhotos/${safeName}`);
                if (progressEl) { progressEl.style.display = 'block'; progressEl.value = 0; }
                if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'Uploading image…'; }
                console.log('[Batch] Starting upload to Storage path:', storageRef._location && storageRef._location.path);
                const task = uploadBytesResumable(storageRef, file);
                await new Promise((resolve, reject) => {
                    task.on('state_changed', (snapshot) => {
                        if (progressEl) {
                            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                            progressEl.value = pct;
                        }
                        // Also reflect progress on the Save button for visibility
                        if (submitBtn) submitBtn.textContent = `Saving… ${Math.max(1, Math.min(99, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)))}%`;
                        if (statusEl) statusEl.textContent = `Uploading image… ${Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)}%`;
                    }, (err) => reject(err), async () => {
                        try {
                            photoUrl = await getDownloadURL(task.snapshot.ref);
                            resolve();
                        } catch (e) { reject(e); }
                    });
                });
                if (progressEl) progressEl.style.display = 'none';
                if (statusEl) { statusEl.textContent = 'Saving data…'; }
                console.log('[Batch] Upload complete. photoUrl:', photoUrl);
            } catch (err) {
                console.error('Error uploading image:', err);
                showToast('Error processing image', 'error');
                if (progress) progress.complete();
                // Hide in-modal progress bar
                if (progressEl) { progressEl.style.display = 'none'; }
                if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = ''; }
                // Re-enable buttons on error
                const cancelBtn2 = document.getElementById('batch-cancel');
                const submitBtn2 = (form && form.querySelector('button[type="submit"]')) || null;
                const closeBtn2 = document.getElementById('batch-modal-close');
                if (cancelBtn2) cancelBtn2.disabled = false;
                if (submitBtn2 && submitBtn2.__originalText) submitBtn2.textContent = submitBtn2.__originalText;
                if (submitBtn2) submitBtn2.disabled = false;
                if (closeBtn2) closeBtn2.disabled = false;
                window.isBatchSaving = false;
                return;
            }
        } else if (editId) {
            const existing = batchPhotos?.find(b => b.docId === editId);
            photoBase64 = existing?.photoBase64 || null;
            photoUrl = existing?.photoUrl || null;
        }
        
        // Make sure we have photo data for new entries
        if (!editId && !photoBase64 && !photoUrl) {
            showToast('Photo processing failed. Please try again.', 'error');
            if (progress) progress.complete();
            const cancelBtnX = document.getElementById('batch-cancel');
            const submitBtnX = (form && form.querySelector('button[type="submit"]')) || null;
            const closeBtnX = document.getElementById('batch-modal-close');
            if (cancelBtnX) cancelBtnX.disabled = false;
            if (submitBtnX) submitBtnX.disabled = false;
            if (closeBtnX) closeBtnX.disabled = false;
            if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = ''; }
            window.isBatchSaving = false;
            return;
        }
        
        // Import Firestore functions
        const { serverTimestamp, addDoc, collection, updateDoc, doc } = 
            await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        
        // Prepare batch data
        let batchData = {
            batchNumber,
            batchName,
            // Prefer a hosted URL when using resumable upload; fallback to base64 for legacy path
            photoUrl: photoUrl || '',
            photoBase64: photoUrl ? '' : (photoBase64 || ''),
            updatedAt: serverTimestamp(),
            updatedBy: auth?.currentUser?.uid || auth?.currentUser?.email || 'anonymous'
        };
        
        if (!editId) {
            batchData.createdAt = serverTimestamp();
            batchData.createdBy = auth?.currentUser?.uid || auth?.currentUser?.email || 'anonymous';
        }
        
        console.log('Saving to Firestore:', { 
            collection: 'batchPhotos',
            operation: editId ? 'update' : 'create',
            hasPhoto: !!(photoUrl || photoBase64),
            transport: photoUrl ? 'storage-url' : 'base64',
            photoSize: photoBase64 ? photoBase64.length : 0
        });
        
        // Save to Firestore
        if (editId) {
            // Update existing
            const docRef = doc(db, 'batchPhotos', editId);
            await updateDoc(docRef, batchData);
            console.log('✅ Document updated:', editId);
        } else {
            // Create new - THIS IS THE KEY PART
            const colRef = collection(db, 'batchPhotos');
            const newDocRef = await addDoc(colRef, batchData);
            console.log('✅ New document created:', newDocRef.id);
        }
        if (progress) try { progress.complete(); } catch {}
        // Close modal after successful save and re-enable buttons just in case
        closeBatchModal();
        const cancelBtn3 = document.getElementById('batch-cancel');
        const submitBtn3 = (form && form.querySelector('button[type="submit"]')) || null;
        const closeBtn3 = document.getElementById('batch-modal-close');
        if (cancelBtn3) cancelBtn3.disabled = false;
        if (submitBtn3) {
            submitBtn3.disabled = false;
            if (submitBtn3.__originalText) submitBtn3.textContent = submitBtn3.__originalText;
        }
        if (closeBtn3) closeBtn3.disabled = false;
        if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = ''; }
        window.isBatchSaving = false;
        // Show success toast after modal has closed to ensure visibility
        setTimeout(() => { try { showToast('Saved Sucesfully', 'success', 5000); } catch {} }, 100);
        
    } catch (error) {
        console.error('Error saving batch photo:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        if (progress) try { progress.complete(); } catch {}
        // Re-enable buttons on error and keep modal open
    const cancelBtn = document.getElementById('batch-cancel');
    const submitBtn = (form && form.querySelector('button[type="submit"]')) || null;
    const closeBtn = document.getElementById('batch-modal-close');
    if (cancelBtn) cancelBtn.disabled = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            if (submitBtn.__originalText) submitBtn.textContent = submitBtn.__originalText;
        }
    if (closeBtn) closeBtn.disabled = false;
    window.isBatchSaving = false;
        
        let errorMsg = 'Failed to save batch photo';
        
        if (error.code === 'permission-denied') {
            errorMsg = 'Permission denied. Check Firestore rules allow write to batchPhotos collection.';
        } else if (error.code === 'unavailable') {
            errorMsg = 'Firestore unavailable. Check your internet connection.';
        } else if (error.message) {
            errorMsg += ': ' + error.message;
        }
        
        showToast(errorMsg, 'error', 5000);
    }
}

// Fast image resize to Base64 (data URL) to speed up saves
async function resizeFileToBase64(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85, mimeType = 'image/jpeg') {
    return new Promise((resolve, reject) => {
        try {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    // Calculate target size
                    let { width, height } = img;
                    const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
                    const targetW = Math.round(width * ratio);
                    const targetH = Math.round(height * ratio);

                    const canvas = document.createElement('canvas');
                    canvas.width = targetW;
                    canvas.height = targetH;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, targetW, targetH);
                    try {
                        const dataUrl = canvas.toDataURL(mimeType, quality);
                        resolve(dataUrl);
                    } catch (err) {
                        reject(err);
                    }
                };
                img.onerror = reject;
                img.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        } catch (e) {
            reject(e);
        }
    });
}

// Initialize batch photos functionality
function initBatchPhotos() {
    console.log('🎓 Initializing enhanced batch photos with inline controls...');
    setupBatchEventListeners();
    startBatchPhotosListener();
}

function setupBatchEventListeners() {
    const uploadBtn = document.getElementById('batch-upload-btn');
    uploadBtn && uploadBtn.addEventListener('click', () => {
        if (!currentUser) {
            showToast('Please log in as admin to upload', 'error');
            try { openLoginModal(); } catch (_) {}
            return;
        }
        openBatchModal();
    });

    const modalClose = document.getElementById('batch-modal-close');
    const modalOverlay = document.getElementById('batch-modal-overlay');
    const cancelBtn = document.getElementById('batch-cancel');
    // Protect against closing while saving
    function guardedClose() {
        if (window.isBatchSaving) {
            showToast('Please wait, saving in progress…', 'error');
            return;
        }
        closeBatchModal();
    }
    modalClose && modalClose.addEventListener('click', guardedClose);
    modalOverlay && modalOverlay.addEventListener('click', guardedClose);
    cancelBtn && cancelBtn.addEventListener('click', (e) => { e.preventDefault(); closeBatchModal(); });

    const form = document.getElementById('batch-form');
    form && form.addEventListener('submit', handleBatchFormSubmit);

    const photoInput = document.getElementById('batch-photo-input');
    photoInput && photoInput.addEventListener('change', handleBatchPhotoPreview);

    const left = document.getElementById('batch-scroll-left');
    const right = document.getElementById('batch-scroll-right');
    left && left.addEventListener('click', () => scrollBatchPhotos('left'));
    right && right.addEventListener('click', () => scrollBatchPhotos('right'));

    const scrollContainer = document.getElementById('batches-scroll-container');
    scrollContainer && scrollContainer.addEventListener('scroll', updateScrollButtonsState);
}

// removed legacy unified carousel renderer

// removed legacy unified admin renderer

// removed dynamic modal creation (modal now lives in index.html)

// removed legacy modal event wiring (initBatchPhotos handles wiring)

// Set up real-time listener for enhanced flat batchPhotos implementation
async function loadAndRenderBatches() {
    try {
        await startBatchPhotosListener();
        renderBatchCarousel();
    } catch (err) {
        console.error('Failed to start enhanced batchPhotos listener:', err);
    }
}

// Debug helper: inspect per-batch listener state from console
// removed legacy debug helper

// Debug helper: quick-save a test batch photo document (no file upload) from console
window.testBatchSave = async function(batchNumber = 'test-batch', batchName = 'Test Batch') {
    // Debug helper: creates a document in the flat `batchPhotos` collection
    // with the required fields so you can quickly verify the UI and listener.
    try {
        const activeUser = auth?.currentUser || currentUser;
        console.log('testBatchSave activeUser:', activeUser ? activeUser.uid : null);
        if (!activeUser) { console.warn('No authenticated user. Sign in as admin then call testBatchSave().'); return; }

        const ff = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const { collection, addDoc, serverTimestamp } = ff;

        const payload = {
            batchNumber,
            batchName,
            photoBase64: '', // no image for debug entry
            createdAt: serverTimestamp(),
            createdBy: activeUser.uid,
            updatedAt: serverTimestamp(),
            updatedBy: activeUser.uid
        };

        const colRef = collection(db, 'batchPhotos');
        const newDocRef = await addDoc(colRef, payload);
        console.log('testBatchSave: batchPhotos doc created ->', newDocRef.id);
        return newDocRef;
    } catch (err) {
        console.error('testBatchSave failed:', err);
        throw err;
    }
};

// removed legacy renderBatchCards in favor of renderBatchCarousel

// removed legacy admin list renderer

// removed legacy auto-scroll (using startBatchAutoScroll)

// removed initializeBatchwise

// Ensure admin-only batch controls are visible when an admin is signed in
function updateBatchAdminVisibility(isAuthenticated) {
    try {
        const uploadBtn = document.getElementById('batch-upload-btn');
        if (uploadBtn) uploadBtn.style.display = isAuthenticated ? 'inline-block' : 'none';
        // Re-render to toggle inline admin controls on cards
        renderBatchCarousel();
    } catch (err) {
        console.warn('updateBatchAdminVisibility error', err);
    }
}

window.openBatchModal = openBatchModal;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        try { initBatchPhotos && initBatchPhotos(); } catch(e) { console.warn('initBatchPhotos error', e); }
    });
} else {
    try { initBatchPhotos && initBatchPhotos(); } catch(e) { console.warn('initBatchPhotos error', e); }
}

// === Simple/legacy modal + carousel/list support ===
// removed legacy setup and UI functions

// Photo Carousel Functions with Enhanced Debugging
async function initializePhotoCarousel() {
    console.log('ðŸ“· Initializing photo carousel with enhanced Firestore debugging...');
    console.log('ðŸ”¥ Firebase Project:', firebaseConfig.projectId);
    console.log('ðŸ”— Collections to fetch: students, teachers, collaborative');
    
    const carouselLoading = document.getElementById('carousel-loading');
    const carouselContainer = document.getElementById('carousel-container');
    const carouselFallback = document.getElementById('carousel-fallback');
    
    if (!carouselContainer) {
        console.error('âŒ Carousel container not found in DOM');
        return;
    }
    
    // Show loading state
    if (carouselLoading) {
        carouselLoading.style.display = 'flex';
        console.log('ðŸ“± Loading state displayed');
    }
    
    try {
        console.log('ðŸš€ Starting photo fetch process...');
        
        // Fetch photos from Firestore with enhanced debugging
        const photos = await fetchAchievementPhotos();
        console.log('ðŸ“Š Photos fetched result:', { count: photos.length, photos });
        
        if (photos.length === 0) {
            console.log('ðŸ“· No photos found, showing fallback');
            showFallbackCarousel();
            return;
        }
        
        // Setup carousel with photos
        setupCarousel(photos);
        
        // Start auto-slide
        startAutoSlide();
        
        isCarouselInitialized = true;
        console.log('âœ… Photo carousel initialized successfully with', photos.length, 'photos!');
        
    } catch (error) {
        console.error('âŒ Error initializing photo carousel:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        showFallbackCarousel();
    }
}

async function fetchAchievementPhotos() {
    console.log('ðŸ“‚ Starting enhanced photo fetch with detailed debugging...');
    console.log('ðŸ”¥ Firebase initialized:', !!db);
    console.log('ðŸ”— Target collections: students, teachers, collaborative');
    
    const photos = [];
    const collections = ['students', 'teachers', 'collaborative'];
    
    try {
        // Import getDocs with error handling
        console.log('ðŸ“¦ Importing Firestore getDocs...');
        const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        console.log('âœ… getDocs imported successfully');
        
        for (let collectionName of collections) {
            console.log(`ðŸ“‚ Fetching from ${collectionName} collection...`);
            
            try {
                const collectionRef = collection(db, collectionName);
                console.log(`ðŸ”— Collection reference created for ${collectionName}`);
                
                const snapshot = await getDocs(collectionRef);
                console.log(`ðŸ“Š ${collectionName} fetch result:`, {
                    docCount: snapshot.docs.length,
                    empty: snapshot.empty,
                    size: snapshot.size
                });
                
                let photoCount = 0;
                snapshot.forEach(doc => {
                    const data = doc.data();
                    console.log(`ðŸ“„ Document ${doc.id} data:`, {
                        hasPhoto: !!data.photoBase64,
                        title: data.title,
                        name: data.name,
                        type: data.type
                    });
                    
                    if (data.photoBase64) {
                        const photoData = {
                            src: data.photoBase64,
                            title: data.title || data.achievementDetails || `${collectionName} Achievement`,
                            type: collectionName,
                            category: data.category || '',
                            participant: data.name || data.studentName || data.teacherName || 'Team'
                        };
                        
                        photos.push(photoData);
                        photoCount++;
                        console.log(`âœ… Photo ${photoCount} added from ${collectionName}:`, {
                            title: photoData.title,
                            hasValidBase64: photoData.src.length > 0,
                            base64Length: photoData.src.length
                        });
                    } else {
                        console.log(`âš ï¸ Document ${doc.id} has no photoBase64 field`);
                    }
                });
                
                console.log(`ðŸ“· ${collectionName} summary: ${photoCount} photos found`);
                
            } catch (collectionError) {
                console.error(`âŒ Error fetching ${collectionName} collection:`, {
                    message: collectionError.message,
                    code: collectionError.code,
                    collection: collectionName
                });
                
                // Continue with other collections even if one fails
                continue;
            }
        }
        
        console.log(`ðŸ“· FETCH COMPLETE - Total photos collected: ${photos.length}`);
        console.log('ðŸ“Š Photo summary:', photos.map(p => ({
            title: p.title.substring(0, 30) + '...',
            type: p.type,
            hasBase64: !!p.src
        })));
        
        // Update global carousel photos
        carouselPhotos = photos;
        
        return photos;
        
    } catch (error) {
        console.error('âŒ CRITICAL ERROR in fetchAchievementPhotos:', {
            message: error.message,
            code: error.code,
            name: error.name,
            stack: error.stack
        });
        
        // Return empty array instead of throwing to prevent carousel crash
        carouselPhotos = [];
        return [];
    }
}

function setupCarousel(photos = carouselPhotos) {
    console.log('ðŸŽ  Setting up carousel with enhanced Base64 processing...');
    
    const carouselContainer = document.getElementById('carousel-container');
    const carouselLoading = document.getElementById('carousel-loading');
    const carouselFallback = document.getElementById('carousel-fallback');
    
    if (!carouselContainer) {
        console.error('âŒ Carousel container not found in DOM');
        return;
    }
    
    // Hide loading state
    if (carouselLoading) {
        carouselLoading.style.display = 'none';
        console.log('ðŸ“± Loading state hidden');
    }
    
    if (!photos || photos.length === 0) {
        console.log('ðŸ–¼ No photos provided, showing fallback carousel');
        showFallbackCarousel();
        return;
    }
    
    // Hide fallback
    if (carouselFallback) {
        carouselFallback.style.display = 'none';
        console.log('ðŸ–¼ Fallback hidden, showing photo carousel');
    }
    
    console.log(`ðŸŽ  Creating carousel with ${photos.length} slides...`);
    
    // Create carousel slides with enhanced Base64 handling
    const slides = photos.map((photo, index) => {
        console.log(`ðŸ–¼ Processing slide ${index + 1}:`, {
            title: photo.title,
            type: photo.type,
            hasBase64: !!photo.src,
            base64Preview: photo.src ? photo.src.substring(0, 50) + '...' : 'No image'
        });
        
        return createCarouselSlide(photo, index);
    }).join('');
    
    carouselContainer.innerHTML = slides;
    
    // Add indicators if more than one photo
    if (photos.length > 1) {
        const indicators = document.createElement('div');
        indicators.className = 'carousel-indicators';
        indicators.innerHTML = photos.map((_, index) => 
            `<div class="carousel-indicator ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})"></div>`
        ).join('');
        carouselContainer.appendChild(indicators);
        console.log('ðŸ”˜ Carousel indicators added');
    }
    
    // Reset slide index
    currentSlideIndex = 0;
    
    console.log('âœ… Carousel setup complete with', photos.length, 'slides and enhanced Base64 processing');
}

// Enhanced carousel slide creation with proper Base64 handling
function createCarouselSlide(photo, index) {
    console.log(`ðŸ–¼ Creating slide ${index + 1} with Base64 processing...`);
    
    const slide = document.createElement('div');
    slide.className = `carousel-slide ${index === 0 ? 'active' : ''}`;
    
    const img = document.createElement('img');
    
    // Enhanced Base64 image processing
    if (photo.src) {
        if (photo.src.startsWith('data:image/')) {
            // Direct Base64 usage - already has data URL prefix
            img.src = photo.src;
            console.log(`âœ… Slide ${index + 1}: Using direct Base64 data URL`);
        } else {
            // Add Base64 prefix if missing
            img.src = `data:image/jpeg;base64,${photo.src}`;
            console.log(`ðŸ”§ Slide ${index + 1}: Added Base64 prefix`);
        }
    } else {
        // Fallback image
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDI0MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iMTgwIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfMF8xKSIvPgo8dGV4dCB4PSIxMjAiIHk9IjkwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDgiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCI+8J+PhjwvdGV4dD4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8wXzEiIHgxPSIwIiB5MT0iMCIgeDI9IjI0MCIgeTI9IjE4MCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMDA2RDVCIi8+CjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzJFOEI1NyIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo=';
        console.log(`âš ï¸ Slide ${index + 1}: Using fallback placeholder`);
    }
    
    img.alt = photo.title || 'Achievement Photo';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    
    // Enhanced error handling for images
    img.onerror = () => {
        console.error(`âŒ Failed to load image for slide ${index + 1}:`, photo.title);
        img.style.background = 'linear-gradient(135deg, #006D5B, #2E8B57)';
        img.style.color = 'white';
        img.style.display = 'flex';
        img.style.alignItems = 'center';
        img.style.justifyContent = 'center';
        img.style.fontSize = '3rem';
        img.innerHTML = 'ðŸ†';
        img.removeAttribute('src'); // Prevent further error attempts
    };
    
    img.onload = () => {
        console.log(`âœ… Successfully loaded image for slide ${index + 1}:`, photo.title);
    };
    
    slide.appendChild(img);
    
    // Add overlay
    const overlay = document.createElement('div');
    overlay.className = 'slide-overlay';
    overlay.innerHTML = `
        <h4 class="slide-title">${photo.title}</h4>
        <p class="slide-category">${photo.category ? `${photo.category} â€¢ ` : ''}${photo.type} Achievement</p>
    `;
    slide.appendChild(overlay);
    
    return slide.outerHTML;
}

function startAutoSlide() {
    // Clear existing interval
    if (carouselInterval) {
        clearInterval(carouselInterval);
        console.log('ðŸ”„ Cleared existing auto-slide interval');
    }
    
    if (!carouselPhotos || carouselPhotos.length <= 1) {
        console.log('ðŸ”„ Auto-slide disabled: Not enough photos (', carouselPhotos ? carouselPhotos.length : 0, 'photos)');
        return;
    }
    
    console.log('ðŸ”„ Starting auto-slide every 4 seconds with', carouselPhotos.length, 'photos...');
    
    carouselInterval = setInterval(() => {
        console.log('â° Auto-slide triggered, moving to next slide...');
        nextSlide();
    }, 4000); // 4 seconds as specified
    
    console.log('âœ… Auto-slide interval started successfully');
}

function nextSlide() {
    if (carouselPhotos.length === 0) return;
    
    const currentSlide = document.querySelector('.carousel-slide.active');
    const currentIndicator = document.querySelector('.carousel-indicator.active');
    
    // Remove active class from current slide and indicator
    if (currentSlide) currentSlide.classList.remove('active');
    if (currentIndicator) currentIndicator.classList.remove('active');
    
    // Update index
    currentSlideIndex = (currentSlideIndex + 1) % carouselPhotos.length;
    
    // Add active class to next slide and indicator
    const nextSlide = document.querySelector(`.carousel-slide:nth-child(${currentSlideIndex + 1})`);
    const nextIndicator = document.querySelector(`.carousel-indicator:nth-child(${currentSlideIndex + 1})`);
    
    if (nextSlide) nextSlide.classList.add('active');
    if (nextIndicator) nextIndicator.classList.add('active');
}

window.goToSlide = function(index) {
    if (index < 0 || index >= carouselPhotos.length) return;
    
    const currentSlide = document.querySelector('.carousel-slide.active');
    const currentIndicator = document.querySelector('.carousel-indicator.active');
    
    // Remove active classes
    if (currentSlide) currentSlide.classList.remove('active');
    if (currentIndicator) currentIndicator.classList.remove('active');
    
    // Set new index and add active classes
    currentSlideIndex = index;
    
    const newSlide = document.querySelector(`.carousel-slide:nth-child(${index + 1})`);
    const newIndicator = document.querySelector(`.carousel-indicator:nth-child(${index + 1})`);
    
    if (newSlide) newSlide.classList.add('active');
    if (newIndicator) newIndicator.classList.add('active');
    
    // Restart auto-slide timer
    startAutoSlide();
};

function showFallbackCarousel() {
    console.log('ðŸ–¼ Showing enhanced fallback carousel...');
    
    const carouselLoading = document.getElementById('carousel-loading');
    const carouselContainer = document.getElementById('carousel-container');
    const carouselFallback = document.getElementById('carousel-fallback');
    
    // Hide loading and container
    if (carouselLoading) {
        carouselLoading.style.display = 'none';
        console.log('ðŸ“± Loading state hidden for fallback');
    }
    if (carouselContainer) {
        carouselContainer.style.display = 'none';
        console.log('ðŸŽ  Carousel container hidden for fallback');
    }
    
    // Show enhanced fallback
    if (carouselFallback) {
        carouselFallback.style.display = 'block';
        carouselFallback.innerHTML = `
            <div class="fallback-slide active">
                <div class="fallback-content">
                    <div class="fallback-icon">ðŸ†</div>
                    <h3>BAUET CSE Excellence</h3>
                    <p>Achievement photos will appear here</p>
                    <small style="opacity: 0.8; font-size: 0.9rem; margin-top: 8px; display: block;">
                        Connect to Firebase and add achievements with photos
                    </small>
                </div>
            </div>
        `;
        console.log('ðŸ–¼ Enhanced fallback carousel displayed');
    } else {
        console.error('âŒ Fallback carousel element not found');
    }
}

// Initialize the app with enhanced carousel initialization
document.addEventListener('DOMContentLoaded', async () => {
    console.log('ðŸš€ DOM loaded, starting app initialization with title field integration...');
    await initializeApp_();
    
    // Initialize photo carousel after app setup
    console.log('ðŸ“· Starting photo carousel initialization...');
    setTimeout(async () => {
        try {
            await initializePhotoCarousel();
            
            // Title integration already handled by loadAchievements in initializeApp_
            console.log('ðŸ† Title field integration active via real-time listeners');
            
        } catch (carouselError) {
            console.error('âŒ Carousel initialization failed:', carouselError);
            showFallbackCarousel();
        }
    }, 1000); // Give time for Firebase to initialize
});

// Fallback carousel initialization on window load
window.addEventListener('load', () => {
    console.log('ðŸ”„ Window loaded, checking carousel status...');
    const carouselLoading = document.getElementById('carousel-loading');
    
    if (carouselLoading && carouselLoading.style.display !== 'none') {
        console.log('ðŸ”„ Carousel still loading, reinitializing...');
        setTimeout(async () => {
            try {
                await initializePhotoCarousel();
            } catch (error) {
                console.error('âŒ Fallback carousel initialization failed:', error);
                showFallbackCarousel();
            }
        }, 2000);
    }
});

async function initializeApp_() {
    console.log('ðŸš€ Initializing BAUET CSE Achievement Portfolio with Achievement Grouping...');
    console.log('ðŸ“Š New Firebase Configuration Active:', {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        storageBucket: firebaseConfig.storageBucket,
        measurementId: firebaseConfig.measurementId
    });
    console.log('ðŸ”— Achievement Grouping: Enabled - Same achievementDetails will be grouped together');
    
    // During initial load we suppress UI toasts. Use console logs for diagnostics.
    
    setupEventListeners();
    setupAuthListener();
    setupFormValidation();
    monitorFirestoreConnection();
    // Try to render cached grouped achievements immediately for a fast first paint
    try {
        const cached = localStorage.getItem('cachedGroupedAchievements');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                console.log('Using cached grouped achievements for fast initial render');
                // Use the cached payload as a temporary filteredAchievements for display
                displayGroupedAchievements(parsed);
            }
        }
    } catch (e) { console.warn('Cache read failed', e); }

    // Continue to load live data (real-time listeners)
    await loadAchievements();
    // load batch photos after achievements are ready
    await loadAndRenderBatches();
    setupNavigation();
    // Setup achievement search inputs
    setupAchievementSearch();
    // Ensure batch filter visibility matches current type
    if (elements.batchFilter) {
        elements.batchFilter.style.display = (currentFilter.type === 'students') ? 'inline-block' : 'none';
    }
    
    // Initialize title field integration
    console.log('ðŸ† Title Field Integration initialized - achievements will display with titles from Firestore');
    
    console.log('âœ… Application initialized successfully with enhanced title integration!');
    console.log('âœ… Active Firebase Config:', {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        storageBucket: firebaseConfig.storageBucket,
        measurementId: firebaseConfig.measurementId
    });
    console.log('ðŸ† TITLE FIELD INTEGRATION: ACTIVE');
    console.log('  âœ… Firestore Title Field: data.title properly fetched with fallback');
    console.log('  âœ… Grouping Title Selection: Smart selection of longest/most descriptive title');
    console.log('  âœ… Card Display: Bold title displayed immediately after photo section');
    console.log('  âœ… Real-time Updates: Title changes reflect immediately');
    console.log('  âœ… Debug Commands: debugAchievementTitles(), validateTitleDisplay()');
    
    // After initialization, allow toasts again
    suppressToastsDuringLoad = false;

    // Show a success toast now that toasts are enabled
    setTimeout(() => {
        showToast('ðŸ† Title Field Integration: Ready - Firestore titles will display in bold', 'success', 3000);
    }, 500);
    console.log('ðŸ”¥ Firestore SDK v10.12.2 loaded with enhanced save functionality');
    console.log('ðŸ”— Enhanced Achievement Grouping: Ready');
    console.log('  âž¡ï¸ Primary Key: achievementDetails + type + category');
    console.log('  âž¡ï¸ Text Normalization: trim, lowercase, remove punctuation');
    console.log('  âž¡ï¸ Smart Title Selection: longest/most descriptive title');
    console.log('  âž¡ï¸ Participant Deduplication: prevents duplicate entries');
    console.log('  âž¡ï¸ Case-Insensitive Matching: flexible comparison');
    
    // Add debug helpers for new Firebase config
    console.log('ðŸ”§ Debug Commands Available:');
    console.log('  âž¡ï¸ addSampleData() - Add test data to new Firebase project');
    console.log('  âž¡ï¸ debugAchievementTitles() - Check title field extraction from Firestore');
    console.log('  âž¡ï¸ validateTitleDisplay() - Verify title display in cards');
    console.log('  âž¡ï¸ window.saveAchievement() - Test save function directly');
    console.log(`  âž¡ï¸ Firebase Project: ${firebaseConfig.projectId}`);
    console.log('  ðŸ”— Achievement Grouping: Automatically groups by achievementDetails');
    console.log('  ðŸ‘¥ Multiple participants with same details show as one card');
    
    // Add global helper for Firebase config info
    window.getFirebaseInfo = () => {
        console.log('ðŸ”¥ Current Firebase Configuration:');
        console.table({
            'Project ID': firebaseConfig.projectId,
            'Auth Domain': firebaseConfig.authDomain,
            'Storage Bucket': firebaseConfig.storageBucket,
            'Measurement ID': firebaseConfig.measurementId,
            'Grouping Enabled': 'Enhanced - By achievementDetails + type + category',
            'Grouping Strategy': 'Primary: achievementDetails, Secondary: type + category'
        });
        return firebaseConfig;
    };
    
    // Add enhanced grouping helper functions
    window.testEnhancedGrouping = () => {
        console.log('ðŸ”¬ Testing Enhanced Grouping Logic:');
        
        // Sample test data
        const testAchievements = [
            {
                title: 'Programming Competition',
                description: 'Won first place in national programming competition',
                type: 'students',
                category: 'Technology',
                participants: ['John Doe']
            },
            {
                title: 'Programming Contest Winner',
                description: 'Won first place in national programming competition',
                type: 'students', 
                category: 'Technology',
                participants: ['Jane Smith']
            }
        ];
        
        const grouped = groupAchievementsByDetails(testAchievements);
        console.log('Test Result:', {
            input: testAchievements.length,
            output: grouped.length,
            merged: testAchievements.length > grouped.length,
            participants: grouped[0]?.participants
        });
        
        return grouped;
    };
    
    // Add grouping analysis function
    // -------------------------- Alumni Feature --------------------------
    // DOM refs for alumni
    const alumniNavLink = document.getElementById('alumni-nav-link');
    const alumniModal = document.getElementById('alumni-modal');
    const alumniModalOverlay = document.getElementById('alumni-modal-overlay');
    const alumniModalClose = document.getElementById('alumni-modal-close');
    const alumniGrid = document.getElementById('alumni-grid');
    const addAlumniBtn = document.getElementById('add-alumni-btn');

    const alumniFormModal = document.getElementById('alumni-form-modal');
    const alumniFormOverlay = document.getElementById('alumni-form-overlay');
    const alumniFormClose = document.getElementById('alumni-form-close');
    const alumniForm = document.getElementById('alumni-form');
    const alumniFormTitle = document.getElementById('alumni-form-title');
    const alumniIdInput = document.getElementById('alumni-id');
    const alumniNameInput = document.getElementById('alumni-name');
    const alumniDetailsInput = document.getElementById('alumni-details');
    const alumniWhatsappInput = document.getElementById('alumni-whatsapp');
    const alumniLinkedinInput = document.getElementById('alumni-linkedin');
    const alumniEmailInput = document.getElementById('alumni-email');
    const alumniPhotoInput = document.getElementById('alumni-photo');
    const alumniPhotoPreview = document.getElementById('alumni-photo-preview');
    const alumniCancelBtn = document.getElementById('alumni-cancel');

    // Firestore helpers - reuse existing firestore SDK imports
    // helper aliases (collection and addDoc are imported at top as 'collection' and 'addDoc')
    const collectionRef = collection;
    const addDocument = addDoc;
    // We'll use dynamic imports for getDocs, updateDoc, deleteDoc when needed (already used elsewhere via dynamic import)

    let alumniList = [];

    function ensureAdminControlsForAlumni(isAdmin) {
        if (addAlumniBtn) addAlumniBtn.style.display = isAdmin ? 'inline-block' : 'none';
    }

    // Open/close handlers
    if (alumniNavLink) alumniNavLink.addEventListener('click', (e) => { e.preventDefault(); openAlumniModal(); });
    if (alumniModalClose) alumniModalClose.addEventListener('click', closeAlumniModal);
    if (alumniModalOverlay) alumniModalOverlay.addEventListener('click', closeAlumniModal);
    if (addAlumniBtn) addAlumniBtn.addEventListener('click', () => openAlumniForm());

    if (alumniFormClose) alumniFormClose.addEventListener('click', closeAlumniForm);
    if (alumniFormOverlay) alumniFormOverlay.addEventListener('click', closeAlumniForm);
    if (alumniCancelBtn) alumniCancelBtn.addEventListener('click', closeAlumniForm);

    alumniPhotoInput && alumniPhotoInput.addEventListener('change', (e) => showAlumniPhotoPreview(e.target.files[0]));

    alumniForm && alumniForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveAlumniEntry();
    });

    function openAlumniModal() {
        if (!alumniModal) return;
        alumniModal.classList.add('active');
        document.body.classList.add('modal-open');
        loadAndRenderAlumni();
    }

    function closeAlumniModal() {
        if (!alumniModal) return;
        alumniModal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    function openAlumniForm(alumni = null) {
        if (!alumniFormModal) return;
        resetAlumniForm();
        if (alumni) {
            alumniFormTitle.textContent = 'Edit Alumni';
            alumniIdInput.value = alumni.id || '';
            alumniNameInput.value = alumni.name || '';
            alumniDetailsInput.value = alumni.details || '';
            alumniWhatsappInput.value = alumni.whatsapp || '';
            alumniLinkedinInput.value = alumni.linkedin || '';
            alumniEmailInput.value = alumni.email || '';
            if (alumni.photoBase64) {
                alumniPhotoPreview.style.display = 'block';
                alumniPhotoPreview.innerHTML = `<img src="${alumni.photoBase64.startsWith('data:')?alumni.photoBase64:'data:image/jpeg;base64,'+alumni.photoBase64}" alt="${alumni.name}" />`;
            }
        } else {
            alumniFormTitle.textContent = 'Add Alumni';
        }
        alumniFormModal.classList.add('active');
        document.body.classList.add('modal-open');
    }

    function closeAlumniForm() {
        if (!alumniFormModal) return;
        alumniFormModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        resetAlumniForm();
    }

    function resetAlumniForm() {
        alumniForm && alumniForm.reset();
        alumniIdInput && (alumniIdInput.value = '');
        if (alumniPhotoPreview) { alumniPhotoPreview.style.display = 'none'; alumniPhotoPreview.innerHTML = ''; }
    }

    function showAlumniPhotoPreview(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            const src = evt.target.result;
            alumniPhotoPreview.style.display = 'block';
            alumniPhotoPreview.innerHTML = `<img src="${src}" alt="preview"/>`;
            alumniPhotoPreview.dataset.base64 = src.startsWith('data:') ? src : `data:image/jpeg;base64,${src}`;
        };
        reader.readAsDataURL(file);
    }

    async function loadAndRenderAlumni() {
        try {
            // Set up a real-time listener so both users and admins see updates immediately
            const { onSnapshot, query } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
            const colRef = collectionRef(db, 'alumni');
            const q = query(colRef);

            // Tear down any previous listener stored on window to avoid duplicates
            if (window.__alumni_unsubscribe) {
                try { window.__alumni_unsubscribe(); } catch (e) { /* ignore */ }
                window.__alumni_unsubscribe = null;
            }

            window.__alumni_unsubscribe = onSnapshot(q, (snapshot) => {
                alumniList = [];
                snapshot.forEach(d => alumniList.push({ id: d.id, ...d.data() }));
                renderAlumniGrid(alumniList);
                ensureAdminControlsForAlumni(!!currentUser);
            }, (err) => {
                console.error('Alumni listener error:', err);
                showToast('Failed to load alumni list', 'error');
            });

        } catch (err) {
            console.error('Error setting up alumni listener:', err);
            showToast('Failed to load alumni list', 'error');
        }
    }

    function renderAlumniGrid(list) {
        if (!alumniGrid) return;
        if (!list || list.length === 0) {
            alumniGrid.innerHTML = `<div class="no-results">No alumni found.</div>`;
            return;
        }

        alumniGrid.innerHTML = list.map(a => {
            // prefer a hosted photoUrl if available, otherwise use stored base64 preview
            const photo = a.photoUrl ? a.photoUrl : (a.photoBase64 ? (a.photoBase64.startsWith('data:')?a.photoBase64:`data:image/jpeg;base64,${a.photoBase64}`) : '');
            const whatsappLink = a.whatsapp ? `https://wa.me/${a.whatsapp.replace(/[^0-9]/g,'')}` : '';
            return `
                <div class="alumni-card card">
                    ${photo?`<img class="alumni-photo-small" src="${photo}" alt="${a.name}"/>`:`<div class="alumni-photo-small"></div>`}
                    <div class="alumni-body">
                        <div class="alumni-name">${escapeHtml(a.name || '')}</div>
                        <div class="alumni-details">${escapeHtml(a.details || '')}</div>
                        <div class="alumni-contacts">
                            ${whatsappLink?`<a class="contact-icon" href="${whatsappLink}" target="_blank" rel="noopener" aria-label="WhatsApp ${escapeHtml(a.name||'')}"><i class="fab fa-whatsapp"></i></a>`:''}
                            ${a.linkedin?`<a class="contact-icon" href="${escapeHtml(a.linkedin)}" target="_blank" rel="noopener" aria-label="LinkedIn ${escapeHtml(a.name||'')}"><i class="fab fa-linkedin-in"></i></a>`:''}
                            ${a.email?`<a class="contact-icon" href="mailto:${escapeHtml(a.email)}" aria-label="Email ${escapeHtml(a.name||'')}"><i class="fa fa-envelope"></i></a>`:''}
                            ${currentUser?`<div class="alumni-actions" style="margin-left:auto;">
                                <button class="alumni-edit-btn" data-id="${a.id}">Edit</button>
                                <button class="alumni-delete-btn" data-id="${a.id}">Delete</button>
                            </div>`:''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach edit/delete handlers
        document.querySelectorAll('.alumni-edit-btn').forEach(btn => btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const item = alumniList.find(x => x.id === id);
            openAlumniForm(item);
        }));

        document.querySelectorAll('.alumni-delete-btn').forEach(btn => btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (!confirm('Delete this alumni entry?')) return;
            try {
                const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                // delete from the `alumni` collection
                await deleteDoc(doc(db, 'alumni', id));
                showToast('Alumni entry deleted', 'success');
                await loadAndRenderAlumni();
            } catch (err) {
                console.error('Delete error:', err);
                showToast('Failed to delete alumni', 'error');
            }
        }));
    }

    async function saveAlumniEntry() {
        // Fast save: convert photo to resized base64 and write Firestore immediately (photoBase64 included),
        // then upload full image to Storage in background to get a hosted photoUrl (optional).
        // Ensure admin is logged in
        const activeUser = auth?.currentUser || currentUser;
        if (!activeUser) {
            showToast('Please sign in as admin to save alumni.', 'info', 4000);
            openLoginModal();
            window.pendingAlumniSave = true;
            return;
        }

        const id = alumniIdInput.value;
        const name = alumniNameInput.value?.trim();
        const details = alumniDetailsInput.value?.trim();
        const whatsapp = alumniWhatsappInput.value?.trim();
        const linkedin = alumniLinkedinInput.value?.trim();
        const email = alumniEmailInput.value?.trim();

        // Basic validation
        if (!name) { showToast('Name is required', 'error'); return; }
        if (!details) { showToast('Details are required', 'error'); return; }

        // Keep a copy of form file (if any) to upload/convert
        const file = (alumniPhotoInput?.files && alumniPhotoInput.files.length > 0) ? alumniPhotoInput.files[0] : null;

        // If there's a file, resize it and convert to Base64 data URL so we can store it immediately
        let photoBase64 = null;
        if (file) {
            try {
                // Resize first to keep base64 size reasonable (same util used for background upload)
                const resizedBlob = await resizeImage(file, 1200, 1200, 0.8);
                // Convert blob to data URL (base64)
                const base64data = await fileToBase64(resizedBlob);
                // fileToBase64 returns a data URL (data:image/...), we store that directly
                photoBase64 = base64data;
                // Also keep a quick preview in the form preview element (if not already set)
                if (alumniPhotoPreview && !alumniPhotoPreview.querySelector('img')) {
                    alumniPhotoPreview.style.display = 'block';
                    alumniPhotoPreview.innerHTML = `<img src="${photoBase64}" alt="preview"/>`;
                }
            } catch (convErr) {
                console.warn('Failed to generate base64 preview for alumni photo:', convErr);
                // leave photoBase64 null and continue; background upload may still attempt later
                photoBase64 = null;
            }
        }

        // Prepare payload and include photoBase64 if available so documents immediately have an embeddable image
        const payload = { name, details, whatsapp, linkedin, email };
        if (photoBase64) payload.photoBase64 = photoBase64;

        try {
            if (!db) throw new Error('Firestore db not initialized');

            const { collection, addDoc, doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

            let docRef;
            if (id) {
                // Update document quickly and include base64 preview if produced
                docRef = doc(db, 'alumni', id);
                await updateDoc(docRef, { ...payload, updatedAt: serverTimestamp(), updatedBy: activeUser.uid });
                showToast('Alumni updated (photo stored as base64 and full upload will continue in background if provided)', 'success', 3000);
                console.log('Alumni quick-update:', id);
            } else {
                const colRef = collection(db, 'alumni');
                docRef = await addDoc(colRef, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: activeUser.uid, updatedBy: activeUser.uid });
                showToast('Alumni added (photo stored as base64 and full upload will continue in background if provided)', 'success', 3000);
                console.log('Alumni quick-add, id:', docRef.id);
            }

            // Close the form immediately so admin can continue working
            closeAlumniForm();

            // If there's a file, upload it in background (don't block the UI)
            if (file && docRef) {
                (async () => {
                    try {
                        // Resize image client-side to reduce upload time
                        const resizedBlob = await resizeImage(file, 1200, 1200, 0.8);

                        const { ref, uploadBytesResumable, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js');
                        const storagePath = `alumni/photos/${Date.now()}-${file.name}`;
                        const storageRef = ref(storage, storagePath);

                        const progressEl = document.getElementById('alumni-photo-progress');
                        if (progressEl) { progressEl.style.display = 'block'; progressEl.value = 0; }

                        const task = uploadBytesResumable(storageRef, resizedBlob);
                        task.on('state_changed', (snapshot) => {
                            if (!progressEl) return;
                            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                            progressEl.value = percent;
                        }, async (err) => {
                            console.warn('Background upload failed, trying to store base64 preview', err);
                            if (progressEl) progressEl.style.display = 'none';
                            // fallback: store preview base64 if available
                            if (alumniPhotoPreview?.querySelector('img')) {
                                const base64 = alumniPhotoPreview.querySelector('img').src;
                                try { await updateDoc(docRef, { photoBase64: base64, updatedAt: serverTimestamp(), updatedBy: activeUser.uid }); } catch (uErr) { console.error('Failed to update doc with base64 fallback', uErr); }
                            }
                        }, async () => {
                            try {
                                const downloadURL = await getDownloadURL(task.snapshot.ref);
                                if (progressEl) progressEl.style.display = 'none';
                                await updateDoc(docRef, { photoUrl: downloadURL, updatedAt: serverTimestamp(), updatedBy: activeUser.uid });
                                console.log('Background upload finished and doc updated with photoUrl');
                            } catch (gErr) {
                                console.error('Failed to get downloadURL or update doc after upload', gErr);
                                if (progressEl) progressEl.style.display = 'none';
                            }
                        });
                    } catch (bgErr) {
                        console.error('Background photo processing/upload failed:', bgErr);
                        const progressEl = document.getElementById('alumni-photo-progress');
                        if (progressEl) progressEl.style.display = 'none';
                    }
                })();
            }

            // Real-time listener will reflect the quick save immediately
        } catch (err) {
            console.error('Fast save error:', err);
            showToast('Failed to save alumni quickly: ' + (err.message || err.code || 'Unknown'), 'error', 6000);
        }
    }

    function escapeHtml(s) { return String(s||'').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    // Integrate admin visibility after auth listener setup
    const originalUpdateUIForAuth = updateUIForAuth;
    updateUIForAuth = function(isAuthenticated) {
        try { originalUpdateUIForAuth(isAuthenticated); } catch (e) { console.warn(e); }
        ensureAdminControlsForAlumni(!!isAuthenticated);
    };

    // End Alumni Feature

    
    
    // Helper: resize image file to a blob (returns Blob)
    async function resizeImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8, mimeType = 'image/jpeg') {
            return new Promise((resolve, reject) => {
                try {
                    const img = new Image();
                    const url = URL.createObjectURL(file);
                    img.onload = () => {
                        let { width, height } = img;
                        let ratio = Math.min(maxWidth / width, maxHeight / height, 1);
                        const canvas = document.createElement('canvas');
                        canvas.width = Math.round(width * ratio);
                        canvas.height = Math.round(height * ratio);
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        canvas.toBlob((blob) => {
                            URL.revokeObjectURL(url);
                            if (blob) resolve(blob);
                            else reject(new Error('Canvas toBlob returned null'));
                        }, mimeType, quality);
                    };
                    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
                    img.src = url;
                } catch (e) { reject(e); }
            });
        }
        /**
         * Migration helper: copy documents from `alumni` -> `alumni_details`.
         * Usage (from browser console as an authenticated admin):
         *   await window.migrateAlumniToAlumniDetails({ preserveIds: true, skipExisting: true, overwrite: false });
         * Options:
         *   preserveIds (default true) - keep the same document IDs when possible
         *   skipExisting (default true) - skip copying if target doc exists
         *   overwrite (default false) - if true and preserveIds=true will overwrite existing target docs
         */
        window.migrateAlumniToAlumniDetails = async function(options = {}) {
            const { preserveIds = true, skipExisting = true, overwrite = false, batchDelayMs = 100 } = options;

            if (!currentUser) {
                const msg = 'Migration requires an authenticated admin. Please log in and try again.';
                console.error(msg);
                showToast(msg, 'error', 5000);
                throw new Error(msg);
            }

            console.log('Starting migration: alumni -> alumni_details', { preserveIds, skipExisting, overwrite });

            try {
                const ff = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
                const { getDocs, getDoc, doc, setDoc, addDoc } = ff;

                const sourceCol = collection(db, 'alumni');
                const snap = await getDocs(sourceCol);

                const total = snap.docs.length;
                let migrated = 0;
                let skipped = 0;
                const errors = [];

                for (const d of snap.docs) {
                    const id = d.id;
                    const data = d.data();

                    try {
                        if (preserveIds) {
                            const targetRef = doc(db, 'alumni_details', id);
                            const targetSnap = await getDoc(targetRef);

                            if (targetSnap.exists()) {
                                if (skipExisting && !overwrite) {
                                    skipped++;
                                    console.log(`Skipping existing doc ${id}`);
                                    continue;
                                }
                                if (overwrite) {
                                    await setDoc(targetRef, { ...data, migratedAt: serverTimestamp() }, { merge: true });
                                    migrated++;
                                    console.log(`Overwrote existing alumni_details/${id}`);
                                }
                            } else {
                                await setDoc(targetRef, { ...data, migratedAt: serverTimestamp() });
                                migrated++;
                                console.log(`Migrated alumni -> alumni_details as ${id}`);
                            }
                        } else {
                            // generate new ID
                            await addDoc(collection(db, 'alumni_details'), { ...data, migratedAt: serverTimestamp() });
                            migrated++;
                            console.log(`Migrated alumni/${id} -> new alumni_details doc`);
                        }

                        // small delay to avoid bursts
                        if (batchDelayMs > 0) await new Promise(r => setTimeout(r, batchDelayMs));

                    } catch (err) {
                        console.error('Error migrating doc', id, err);
                        errors.push({ id, error: err });
                    }
                }

                const summary = { total, migrated, skipped, errorsCount: errors.length, errors };
                console.log('Migration complete', summary);
                showToast(`Migration complete: ${migrated} migrated, ${skipped} skipped, ${errors.length} errors`, 'success', 8000);
                return summary;
            } catch (err) {
                console.error('Migration failed', err);
                showToast('Migration failed: ' + (err.message || err), 'error', 8000);
                throw err;
            }
        };
    window.analyzeGrouping = () => {
        const allAchievements = [...achievements.students, ...achievements.teachers, ...achievements.collaborative];
        const grouped = groupAchievementsByDetails(allAchievements);

// Migration UI wiring removed (migration is handled via console helper window.migrateAlumniToAlumniDetails)
        const analysis = {
            totalIndividual: allAchievements.length,
            totalGrouped: grouped.length,
            reductionCount: allAchievements.length - grouped.length,
            reductionPercent: allAchievements.length > 0 ? Math.round((1 - grouped.length/allAchievements.length) * 100) : 0,
            multiParticipantGroups: grouped.filter(g => g.participantCount > 1).length,
            singleParticipantGroups: grouped.filter(g => g.participantCount === 1).length,
            groupingKeys: grouped.map(g => createGroupingKey(g))
        };
        
        console.log('ðŸ” Enhanced Grouping Analysis:');
        console.table(analysis);
        
        return analysis;
    };
    
    // Enhanced grouping test function
    window.testGrouping = () => {
        console.log('ðŸ—º Enhanced Grouping Test - Current Achievement Stats:');
        const totalIndividual = achievements.students.length + achievements.teachers.length + achievements.collaborative.length;
        const totalGrouped = filteredAchievements.length;
        const efficiency = totalIndividual > 0 ? Math.round((1 - totalGrouped/totalIndividual) * 100) : 0;
        
        const results = {
            individual: totalIndividual,
            grouped: totalGrouped,
            reduction: totalIndividual - totalGrouped,
            efficiency: efficiency + '%',
            multiParticipantGroups: filteredAchievements.filter(a => a.participantCount > 1).length
        };
        
        console.log('Enhanced Grouping Results:');
        console.table(results);
        
        return results;
    };
    
    // Test database connectivity with enhanced UI
    //showToast(`ðŸŽ‰ Connected to ${firebaseConfig.projectId} with enhanced photo display!`, 'success', 3000);
    
    // Add grouping helper info
    console.log('    Enhanced Achievement Card Info:');
    console.log('  - Large, clearly visible photos (240x180px)');
    console.log('  - Horizontal layout with prominent image display');
    console.log('  - Responsive design: vertical on mobile');
    console.log('  - Smooth hover effects and transitions');
    console.log('  - Professional placeholder for missing images');
    console.log('  - Enhanced grouping by achievementDetails + type + category');
    console.log('  - Same achievementDetails automatically merge participants');
    console.log('  - Smart title selection (longest/most descriptive)');
    console.log('  - Case-insensitive matching with text normalization');
    console.log('  - Participant deduplication prevents duplicates');
    console.log('  - Individual database entries preserved for admin editing');
    console.log('  - Real-time grouping updates with new data');
    console.log('  - Filters work seamlessly on grouped achievements');
    console.log('  - Admin Edit: Full CRUD operations on individual achievements');
    console.log('  - Edit Modal: Pre-filled forms with current achievement data');
    console.log('  - Photo Updates: Change photos while preserving other data');
    console.log('  - Delete Protection: Confirmation dialogs prevent accidents');
    console.log('  - Real-time Updates: Changes reflect immediately in all views');

// Setup event listeners
function setupEventListeners() {
    // Navigation
    elements.navToggle.addEventListener('click', toggleMobileMenu);
    elements.adminLoginBtn.addEventListener('click', openLoginModal);
    
    // Login modal
    elements.loginModalClose.addEventListener('click', closeLoginModal);
    elements.loginModalOverlay.addEventListener('click', closeLoginModal);
    elements.loginForm.addEventListener('submit', handleLogin);
    
    // Achievement modal
    elements.achievementModalClose.addEventListener('click', closeAchievementModal);
    elements.achievementModalOverlay.addEventListener('click', closeAchievementModal);
    elements.achievementForm.addEventListener('submit', handleAchievementSubmit);
    elements.achievementCancel.addEventListener('click', closeAchievementModal);
    elements.achievementType.addEventListener('change', toggleFieldVisibility);
    elements.achievementPhoto.addEventListener('change', handlePhotoPreview);
    
    // Title field validation and character counter
    elements.achievementTitle?.addEventListener('input', handleTitleInput);
    elements.achievementTitle?.addEventListener('blur', validateTitle);
    
    // Dynamic entry buttons
    document.getElementById('add-student-btn')?.addEventListener('click', () => addEntryGroup('student'));
    document.getElementById('add-teacher-btn')?.addEventListener('click', () => addEntryGroup('teacher'));
    
    // Admin controls
    elements.addAchievementBtn?.addEventListener('click', openAddAchievementModal);
    elements.logoutBtn?.addEventListener('click', handleLogout);
    
    // Filters
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => handleFilterChange(e, 'type'));
    });
    
    elements.categoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => handleFilterChange(e, 'category'));
    });
    
    // Contact modal
    elements.contactNavLink?.addEventListener('click', openContactModal);
    elements.contactModalClose?.addEventListener('click', closeContactModal);
    elements.contactModalOverlay?.addEventListener('click', closeContactModal);
    elements.contactForm?.addEventListener('submit', handleContactSubmit);
    if (elements.contactForm) console.log('Contact form listener attached to #contact-form');
    elements.contactCancel?.addEventListener('click', closeContactModal);
    

    
    // Smooth scrolling for navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                
                // Handle contact modal
                if (link.getAttribute('href') === '#contact') {
                    openContactModal();
                    return;
                }
                
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    const navHeight = document.querySelector('.navbar').offsetHeight;
                    const targetPosition = target.offsetTop - navHeight;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
                closeMobileMenu();
            }
        });
    });
}

// Navigation functions
function setupNavigation() {
    // Add scroll effect to navbar
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(0, 109, 91, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = '#006D5B';
            navbar.style.boxShadow = 'none';
        }
    });
}

function toggleMobileMenu() {
    elements.navToggle.classList.toggle('active');
    elements.navMenu.classList.toggle('active');
}

function closeMobileMenu() {
    elements.navToggle.classList.remove('active');
    elements.navMenu.classList.remove('active');
}

// Authentication functions
function setupAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        updateUIForAuth(!!user);

        // update batch admin visibility
        try { updateBatchAdminVisibility(!!user); } catch(e) { console.warn('updateBatchAdminVisibility failed', e); }

        // reload batch list so admin can see latest entries
        try { await loadAndRenderBatches(); } catch(e) { console.warn('Failed to reload batches after auth change', e); }

        // If there was a pending alumni save attempt, resume it automatically after successful login
        try {
            if (user && window.pendingAlumniSave) {
                console.log('Resuming pending alumni save after auth...');
                // clear the flag first to avoid re-entrancy
                window.pendingAlumniSave = false;
                showToast('Resuming pending alumni save...', 'info', 2500);
                await saveAlumniEntry();
            }
        } catch (e) {
            console.error('Error resuming pending alumni save:', e);
            showToast('Failed to complete pending alumni save. See console for details.', 'error', 6000);
        }
    });
}

function updateUIForAuth(isAuthenticated) {
    const body = document.body;
    
    if (isAuthenticated) {
        elements.adminLoginBtn.textContent = 'Admin Panel';
        elements.adminControls.style.display = 'block';
        elements.adminLoginBtn.onclick = null;
        body.classList.add('admin-mode');
        showToast(`ðŸŽ‰ Welcome, Admin! Connected to ${firebaseConfig.projectId}`, 'success');
        
        // Initialize real-time listeners for admin
        console.log('Admin authenticated - enhanced real-time listeners active');
        showToast('ðŸ”— Enhanced Grouping: Automatic merging by achievementDetails active', 'success', 2500);
    } else {
        elements.adminLoginBtn.textContent = 'Admin Login';
        elements.adminControls.style.display = 'none';
        elements.adminLoginBtn.onclick = openLoginModal;
        body.classList.remove('admin-mode');
    }
    renderAchievements();
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = elements.loginEmail.value;
    const password = elements.loginPassword.value;
    
    elements.loginSubmit.classList.add('loading');
    elements.loginSubmit.disabled = true;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        closeLoginModal();
        elements.loginForm.reset();
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed. Please check your credentials.', 'error');
    } finally {
        elements.loginSubmit.classList.remove('loading');
        elements.loginSubmit.disabled = false;
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed', 'error');
    }
}

// Modal functions
function openLoginModal() {
    elements.loginModal.classList.add('active');
    elements.loginEmail.focus();
}

function closeLoginModal() {
    elements.loginModal.classList.remove('active');
    elements.loginForm.reset();
}

function openAddAchievementModal() {
    if (!currentUser) {
        showToast('Please log in as admin first', 'error');
        return;
    }
    
    // Reset edit mode
    editMode = false;
    editContext = null;
    
    elements.achievementModalTitle.textContent = 'Add New Achievement';
    elements.achievementSubmit.textContent = 'ðŸ’¾ Save Achievement';
    resetAchievementForm();
    
    elements.achievementModal.classList.add('active');
    
    // Focus on type field
    setTimeout(() => {
        elements.achievementType.focus();
    }, 100);
    
    console.log('Add achievement modal opened');
}

function openEditAchievementModal(achievement) {
    // Note: Edit functionality needs to be implemented based on new structure
    showToast('Edit functionality will be available in the next update', 'info');
    console.log('Edit achievement:', achievement);
}

function closeAchievementModal() {
    elements.achievementModal.classList.remove('active');
    resetAchievementForm();
    
    // Reset edit mode
    editMode = false;
    editContext = null;
}

// Toggle field visibility based on type selection with enhanced animations
function toggleFieldVisibility() {
    const type = elements.achievementType.value;
    
    // Handle category visibility (only for students)
    if (type === 'student') {
        elements.categorySelection.style.display = 'block';
        setTimeout(() => {
            elements.categorySelection.classList.add('show');
        }, 10);
        // Make category required
        elements.achievementCategory.required = true;
    } else {
        elements.categorySelection.classList.remove('show');
        setTimeout(() => {
            elements.categorySelection.style.display = 'none';
        }, 300);
        // Remove category requirement
        elements.achievementCategory.required = false;
        elements.achievementCategory.value = '';
    }
    
    // Handle dynamic fields visibility
    if (type === 'student' || type === 'teacher' || type === 'collaborative') {
        elements.dynamicFields.style.display = 'block';
        setTimeout(() => {
            elements.dynamicFields.classList.add('show');
        }, 10);
        
        // Hide all containers first
        elements.studentFields.style.display = 'none';
        elements.teacherFields.style.display = 'none';
        elements.collaborativeFields.style.display = 'none';
        
        // Clear all entries
        elements.studentEntries.innerHTML = '';
        elements.teacherEntries.innerHTML = '';
        
        if (type === 'student') {
            elements.studentFields.style.display = 'block';
            // Add first student entry if none exist
            if (elements.studentEntries.children.length === 0) {
                addEntryGroup('student');
            }
        } else if (type === 'teacher') {
            elements.teacherFields.style.display = 'block';
            // Add first teacher entry if none exist
            if (elements.teacherEntries.children.length === 0) {
                addEntryGroup('teacher');
            }
        } else if (type === 'collaborative') {
            elements.collaborativeFields.style.display = 'block';
            // Clear collaborative fields
            elements.collaborativeId.value = '';
            elements.collaborativeName.value = '';
            elements.collaborativeDescription.value = '';
        }
    } else {
        elements.dynamicFields.classList.remove('show');
        setTimeout(() => {
            elements.dynamicFields.style.display = 'none';
            elements.studentFields.style.display = 'none';
            elements.teacherFields.style.display = 'none';
            elements.collaborativeFields.style.display = 'none';
        }, 300);
        
        // Clear all entries
        elements.studentEntries.innerHTML = '';
        elements.teacherEntries.innerHTML = '';
    }
}

function handlePhotoPreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            elements.previewImage.src = e.target.result;
            elements.photoPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        elements.photoPreview.style.display = 'none';
    }
}

// Add entry group function
function addEntryGroup(type) {
    const container = type === 'student' ? elements.studentEntries : elements.teacherEntries;
    const entryCount = container.children.length + 1;
    
    const entryGroup = document.createElement('div');
    entryGroup.className = 'entry-group';
    entryGroup.innerHTML = createEntryGroupHTML(type, entryCount);
    
    container.appendChild(entryGroup);
    
    // Focus on first input
    const firstInput = entryGroup.querySelector('input');
    if (firstInput) firstInput.focus();
}

// Create entry group HTML
function createEntryGroupHTML(type, entryCount) {
    const removeBtn = `
        <button type="button" class="remove-entry-btn" onclick="removeEntryGroup(this)" title="Remove Entry">
            Ã—
        </button>
    `;
    
    if (type === 'student') {
        return `
            <div class="entry-group-header">
                <h4 class="entry-group-title">ðŸ‘¨â€ðŸŽ“ Student ${entryCount}</h4>
                ${entryCount > 1 ? removeBtn : ''}
            </div>
            <div class="entry-fields">
                <div class="form-group">
                    <label class="form-label">Student ID</label>
                    <input type="text" class="form-control studentId" placeholder="e.g., CSE-2021-001" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Student Name</label>
                    <input type="text" class="form-control studentName" placeholder="Full Name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Batch</label>
                    <input type="text" class="form-control batch" placeholder="e.g., CSE-47" required>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="entry-group-header">
                <h4 class="entry-group-title">ðŸ‘¨â€ðŸ« Teacher ${entryCount}</h4>
                ${entryCount > 1 ? removeBtn : ''}
            </div>
            <div class="entry-fields">
                <div class="form-group">
                    <label class="form-label">Teacher ID</label>
                    <input type="text" class="form-control teacherId" placeholder="Faculty ID" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Teacher Name</label>
                    <input type="text" class="form-control teacherName" placeholder="Full Name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Department</label>
                    <input type="text" class="form-control department" placeholder="Department" required>
                </div>
            </div>
        `;
    }
}

// Remove entry group function
window.removeEntryGroup = function(button) {
    const entryGroup = button.closest('.entry-group');
    const container = entryGroup.parentNode;
    entryGroup.remove();
    
    // Update entry numbers
    const entries = container.querySelectorAll('.entry-group');
    entries.forEach((entry, index) => {
        const title = entry.querySelector('.entry-group-title');
        const type = title.textContent.includes('Student') ? 'Student' : 'Teacher';
        title.textContent = `${type} ${index + 1}`;
    });
};

// Convert file to Base64 string - exact pattern from reference
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Form population for edit mode
function populateEditForm(data) {
    // Populate basic fields
    elements.achievementTitle.value = data.title || '';
    elements.achievementType.value = data.type || 'student';
    elements.achievementDetails.value = data.achievementDetails || data.description || '';
    
    // Handle category field for students
    if (data.type === 'student' && data.category) {
        elements.achievementCategory.value = data.category;
    }
    
    // Show appropriate fields based on type
    toggleFieldVisibility();
    
    // Clear existing entry groups and add current data
    clearEntryGroups();
    
    // Add entry group with existing data
    if (data.type === 'student') {
        addStudentEntry({
            studentId: data.studentId || '',
            name: data.name || '',
            batch: data.batch || ''
        });
    } else if (data.type === 'teacher') {
        addTeacherEntry({
            teacherId: data.teacherId || '',
            name: data.name || '',
            department: data.department || ''
        });
    } else if (data.type === 'collaborative') {
        elements.collaborativeId.value = data.collaborativeId || '';
        elements.collaborativeName.value = data.name || '';
        elements.collaborativeDescription.value = data.description || '';
    }
    
    // Show current photo if exists
    if (data.photoBase64) {
        showCurrentPhotoPreview(data.photoBase64);
    }
}

// Helper functions for edit mode
function clearEntryGroups() {
    elements.studentEntries.innerHTML = '';
    elements.teacherEntries.innerHTML = '';
}

function addStudentEntry(data = {}) {
    const entryCount = elements.studentEntries.children.length + 1;
    const entryGroup = document.createElement('div');
    entryGroup.className = 'entry-group';
    entryGroup.innerHTML = createEntryGroupHTML('student', entryCount);
    
    // Populate with existing data
    const inputs = entryGroup.querySelectorAll('input');
    inputs[0].value = data.studentId || '';
    inputs[1].value = data.name || '';
    inputs[2].value = data.batch || '';
    
    elements.studentEntries.appendChild(entryGroup);
}

function addTeacherEntry(data = {}) {
    const entryCount = elements.teacherEntries.children.length + 1;
    const entryGroup = document.createElement('div');
    entryGroup.className = 'entry-group';
    entryGroup.innerHTML = createEntryGroupHTML('teacher', entryCount);
    
    // Populate with existing data
    const inputs = entryGroup.querySelectorAll('input');
    inputs[0].value = data.teacherId || '';
    inputs[1].value = data.name || '';
    inputs[2].value = data.department || '';
    
    elements.teacherEntries.appendChild(entryGroup);
}

function showCurrentPhotoPreview(photoBase64) {
    elements.photoPreview.innerHTML = `
        <div class="current-photo-preview">
            <p>Current Photo:</p>
            <img src="${photoBase64}" alt="Current Achievement Photo" style="max-width: 200px; border-radius: 8px; margin-top: 0.5rem;">
            <p style="font-size: 0.8rem; color: #666; margin-top: 0.5rem;">Upload a new photo to replace current image</p>
        </div>
    `;
    elements.photoPreview.style.display = 'block';
}

// Reset achievement form
function resetAchievementForm() {
    elements.achievementForm.reset();
    elements.photoPreview.style.display = 'none';
    elements.dynamicFields.style.display = 'none';
    elements.categorySelection.style.display = 'none';
    
    // Reset animations
    elements.categorySelection.classList.remove('show');
    elements.dynamicFields.classList.remove('show');
    
    // Hide all field containers
    elements.studentFields.style.display = 'none';
    elements.teacherFields.style.display = 'none';
    elements.collaborativeFields.style.display = 'none';
    
    // Clear all entry containers
    elements.studentEntries.innerHTML = '';
    elements.teacherEntries.innerHTML = '';
    
    // Reset title field
    if (elements.achievementTitle) {
        elements.achievementTitle.classList.remove('error', 'success');
    }
    if (elements.titleError) {
        elements.titleError.style.display = 'none';
    }
}

// Enhanced Save Achievement function with edit support
window.saveAchievement = async function() {
    console.log('ðŸš€ Starting saveAchievement with new Firebase config...');
    console.log('ðŸ“Š Firebase Project ID:', firebaseConfig.projectId);
    
    // Authentication check
    if (!currentUser) {
        throw new Error('User must be authenticated to save achievements');
    }
    
    // Get form elements with comprehensive validation
    const typeElement = document.getElementById('achievement-type');
    const categoryElement = document.getElementById('achievement-category');
    const titleElement = document.getElementById('achievementTitle');
    const detailsElement = document.getElementById('achievement-details');
    const photoElement = document.getElementById('achievement-photo');
    
    if (!typeElement || !detailsElement || !photoElement) {
        console.error('âŒ Missing required form elements');
        throw new Error('Critical form elements not found. Please refresh and try again.');
    }
    
    const type = typeElement.value;
    const category = categoryElement?.value || null;
    const title = titleElement?.value.trim() || '';
    const achievementDetails = detailsElement.value.trim();
    const photoFile = photoElement.files[0];
    
    console.log('ðŸ“‹ Form Data Collected:', { 
        type, 
        category,
        title,
        hasDetails: !!achievementDetails,
        hasPhoto: !!photoFile,
        titleLength: title.length,
        detailsLength: achievementDetails.length 
    });
    
    // Enhanced validation with detailed error messages
    if (!type) {
        throw new Error('â— Achievement type selection is required');
    }
    
    if (!title) {
        throw new Error('â— Achievement title is required');
    }
    
    if (title.length < 3) {
        throw new Error('â— Achievement title must be at least 3 characters long');
    }
    
    if (title.length > 100) {
        throw new Error('â— Achievement title cannot exceed 100 characters');
    }
    
    if (!achievementDetails) {
        throw new Error('â— Achievement details cannot be empty');
    }
    
    if (achievementDetails.length < 10) {
        throw new Error('â— Achievement details must be at least 10 characters long');
    }
    
    if (type === 'student' && !category) {
        throw new Error('â— Category selection is required for student achievements');
    }
    
    // Convert photo to Base64 with size guard to avoid Firestore invalid-argument
    let photoBase64 = null;
    if (photoFile) {
        try {
            photoBase64 = await generateSafeBase64(photoFile);
            console.log('📷 Photo converted to Base64 (safe size)');
        } catch (photoError) {
            console.error('✖ Photo conversion failed:', photoError);
            // Continue without photo to avoid blocking overall save
            photoBase64 = null;
        }
    }

    let entries = [];
    const { serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const timestamp = serverTimestamp();
    
    // Type-specific data collection with enhanced validation
    if (type === 'student') {
        const container = document.getElementById('student-entries');
        if (!container) {
            throw new Error('Student entries form section not found');
        }
        
        const entryGroups = container.querySelectorAll('.entry-group');
        if (entryGroups.length === 0) {
            throw new Error('At least one student entry is required');
        }
        
        console.log(`ðŸ‘¨â€ðŸŽ“ Processing ${entryGroups.length} student entries...`);
        
        entryGroups.forEach((entryGroup, index) => {
            const studentId = entryGroup.querySelector('.studentId')?.value.trim() || '';
            const studentName = entryGroup.querySelector('.studentName')?.value.trim() || '';
            const batch = entryGroup.querySelector('.batch')?.value.trim() || '';
            
            // Enhanced validation for student fields
            if (!studentId) throw new Error(`Student ${index + 1}: Student ID is required`);
            if (!studentName) throw new Error(`Student ${index + 1}: Student Name is required`);
            if (!batch) throw new Error(`Student ${index + 1}: Batch is required`);
            
            if (studentId.length < 3) throw new Error(`Student ${index + 1}: Student ID too short`);
            if (studentName.length < 2) throw new Error(`Student ${index + 1}: Student Name too short`);
            
            entries.push(cleanPayload({
                type: 'students',
                title,
                studentId,
                name: studentName,
                batch,
                category,
                achievementDetails,
                photoBase64,
                createdAt: timestamp,
                updatedAt: timestamp,
                createdBy: currentUser.email || currentUser.uid
            }));
            
            console.log(`âœ… Student ${index + 1} entry prepared: ${studentName} (${studentId})`);
        });
        
    } else if (type === 'teacher') {
        const container = document.getElementById('teacher-entries');
        if (!container) {
            throw new Error('Teacher entries form section not found');
        }
        
        const entryGroups = container.querySelectorAll('.entry-group');
        if (entryGroups.length === 0) {
            throw new Error('At least one teacher entry is required');
        }
        
        console.log(`ðŸ‘¨â€ðŸ« Processing ${entryGroups.length} teacher entries...`);
        
        entryGroups.forEach((entryGroup, index) => {
            const teacherId = entryGroup.querySelector('.teacherId')?.value.trim() || '';
            const teacherName = entryGroup.querySelector('.teacherName')?.value.trim() || '';
            const department = entryGroup.querySelector('.department')?.value.trim() || '';
            
            // Enhanced validation for teacher fields
            if (!teacherId) throw new Error(`Teacher ${index + 1}: Teacher ID is required`);
            if (!teacherName) throw new Error(`Teacher ${index + 1}: Teacher Name is required`);
            if (!department) throw new Error(`Teacher ${index + 1}: Department is required`);
            
            if (teacherId.length < 3) throw new Error(`Teacher ${index + 1}: Teacher ID too short`);
            if (teacherName.length < 2) throw new Error(`Teacher ${index + 1}: Teacher Name too short`);
            
            entries.push(cleanPayload({
                type: 'teachers',
                title,
                teacherId,
                name: teacherName,
                department,
                achievementDetails,
                photoBase64,
                createdAt: timestamp,
                updatedAt: timestamp,
                createdBy: currentUser.email || currentUser.uid
            }));
            
            console.log(`âœ… Teacher ${index + 1} entry prepared: ${teacherName} (${teacherId})`);
        });
        
    } else if (type === 'collaborative') {
        const collabIdElement = document.getElementById('collaborative-id');
        const collabNameElement = document.getElementById('collaborative-name');
        const collabDescElement = document.getElementById('collaborative-description');
        
        if (!collabIdElement || !collabNameElement || !collabDescElement) {
            throw new Error('Collaborative form elements not found');
        }
        
        const collaborativeId = collabIdElement.value.trim();
        const collaborativeName = collabNameElement.value.trim();
        const collaborativeDescription = collabDescElement.value.trim();
        
        // Enhanced validation for collaborative fields
        if (!collaborativeId) throw new Error('Collaborative ID is required');
        if (!collaborativeName) throw new Error('Project/Achievement Name is required');
        if (!collaborativeDescription) throw new Error('Description is required');
        
        if (collaborativeId.length < 3) throw new Error('Collaborative ID too short');
        if (collaborativeName.length < 5) throw new Error('Project Name too short');
        if (collaborativeDescription.length < 10) throw new Error('Description too short');
        
        console.log('ðŸ¤ Processing collaborative entry...');
        
        entries.push(cleanPayload({
            type: 'collaborative',
            title,
            collaborativeId,
            name: collaborativeName,
            description: collaborativeDescription,
            achievementDetails,
            photoBase64,
            createdAt: timestamp,
            updatedAt: timestamp,
            createdBy: currentUser.email || currentUser.uid
        }));
        
        console.log(`âœ… Collaborative entry prepared: ${collaborativeName} (${collaborativeId})`);
    }
    
    console.log(`ðŸ“¦ Total entries prepared for saving: ${entries.length}`);
    
    // Save each entry individually to Firestore with enhanced error handling
    const savedEntries = [];
    
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        // Normalize mapping so singular/plural forms route correctly
        const collectionMap = {
            student: 'students',
            students: 'students',
            teacher: 'teachers',
            teachers: 'teachers',
            collaborative: 'collaborative'
        };
        const collectionName = collectionMap[entry.type] || 'teachers';
        
        console.log(`ðŸ’¾ Saving entry ${i + 1}/${entries.length} to '${collectionName}' collection...`);
        console.log(`ðŸ“„ Entry data:`, {
            type: entry.type,
            name: entry.name,
            hasPhoto: !!entry.photoBase64,
            // createdAt uses serverTimestamp() sentinel prior to write
            timestamp: 'serverTimestamp()'
        });
        
        try {
            const { addDoc, collection } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
            const docRef = await addDoc(collection(db, collectionName), entry);
            console.log(`âœ… Document ${i + 1} saved successfully with ID: ${docRef.id}`);
            console.log(`ðŸ† Saved with title: "${entry.title}"`);
            
            savedEntries.push({
                id: docRef.id,
                collection: collectionName,
                name: entry.name,
                type: entry.type,
                title: entry.title
            });
            
        } catch (docError) {
            console.error(`âŒ Error saving document ${i + 1} to ${collectionName}:`, docError);
            
            // Provide specific error messages based on error type
            let errorMessage = `Failed to save ${entry.type} entry for ${entry.name}`;
            
            if (docError.code === 'permission-denied') {
                errorMessage += ': Permission denied. Please check admin access.';
            } else if (docError.code === 'unavailable') {
                errorMessage += ': Database temporarily unavailable. Please try again.';
            } else if (docError.code === 'invalid-argument') {
                errorMessage += ': Invalid data format (often caused by very large images or undefined fields). Try a smaller image or remove optional fields.';
            } else {
                errorMessage += `: ${docError.message}`;
            }
            
            throw new Error(errorMessage);
        }
    }
    
    console.log('ðŸŽ‰ All entries saved successfully!');
    console.log('ðŸ“Š Save Summary:', savedEntries);
    
    // Return success summary
    return {
        success: true,
        count: savedEntries.length,
        entries: savedEntries,
        projectId: firebaseConfig.projectId
    };
};

// Update existing achievement function
async function updateExistingAchievement() {
    if (!editContext) {
        throw new Error('Edit context not found');
    }
    
    const { docId, collectionName } = editContext;
    
    // Get form data
    const title = elements.achievementTitle.value.trim();
    const achievementDetails = elements.achievementDetails.value.trim();
    const photoFile = elements.achievementPhoto.files[0];
    
    // Prepare update data
    const updateData = {
        title,
        achievementDetails,
        updatedAt: new Date()
    };
    
    // Add type-specific fields
    const type = elements.achievementType.value;
    if (type === 'student') {
        updateData.category = elements.achievementCategory.value;
        
        // Get student data
        const studentGroup = elements.studentEntries.querySelector('.entry-group');
        if (studentGroup) {
            updateData.studentId = studentGroup.querySelector('.studentId').value.trim();
            updateData.name = studentGroup.querySelector('.studentName').value.trim();
            updateData.batch = studentGroup.querySelector('.batch').value.trim();
        }
    } else if (type === 'teacher') {
        // Get teacher data
        const teacherGroup = elements.teacherEntries.querySelector('.entry-group');
        if (teacherGroup) {
            updateData.teacherId = teacherGroup.querySelector('.teacherId').value.trim();
            updateData.name = teacherGroup.querySelector('.teacherName').value.trim();
            updateData.department = teacherGroup.querySelector('.department').value.trim();
        }
    } else if (type === 'collaborative') {
        updateData.collaborativeId = elements.collaborativeId.value.trim();
        updateData.name = elements.collaborativeName.value.trim();
        updateData.description = elements.collaborativeDescription.value.trim();
    }
    
    // Handle photo update if new file selected
    if (photoFile) {
        const photoBase64 = await fileToBase64(photoFile);
        updateData.photoBase64 = photoBase64;
    }
    
    // Update document in Firestore
    const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, updateData);
    
    return {
        success: true,
        updated: true,
        docId,
        collection: collectionName
    };
}

// Enhanced main save function with perfect error handling
async function handleAchievementSubmit(e) {
    e.preventDefault();
    
    console.log('ðŸš€ Achievement form submitted with new Firebase config');
    
    if (!currentUser) {
        showToast('â— Please log in as admin first', 'error');
        return;
    }
    
    // Enhanced form validation
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
        console.error('âŒ Form validation failed:', validationErrors);
        showToast('â— ' + validationErrors[0], 'error');
        return;
    }
    
    // Show loading state
    elements.achievementSubmit.classList.add('loading');
    elements.achievementSubmit.disabled = true;
    elements.achievementCancel.disabled = true;
    
    const progress = showProgress('Saving to database...');
    
    try {
        console.log('ðŸ’¾ Starting save process with enhanced validation...');
        
        let result;
        if (editMode && editContext) {
            // Update existing achievement
            result = await updateExistingAchievement();
        } else {
            // Create new achievement(s)
            result = await window.saveAchievement();
        }
        
        progress.complete();
        
        // Show detailed success message with title confirmation
        const successMsg = editMode ? 
            'ðŸŽ‰ Achievement updated successfully!' : 
            `ðŸŽ‰ Successfully saved ${result.count} achievement(s) with titles to Firestore!`;
        console.log(successMsg, result);
        
        // Show title confirmation in toast
        if (!editMode && result.entries && result.entries.length > 0) {
            const titleList = result.entries.map(e => e.title).join(', ');
            console.log(`ðŸ† Titles saved: ${titleList}`);
            showToast(`ðŸŽ‰ Saved with titles: ${titleList}`, 'success', 4000);
        } else {
            showToast(successMsg, 'success');
        }
        
        // Close modal and reset form
        closeAchievementModal();
        
        // Force refresh of achievements display
        await loadAchievements();
        
    } catch (error) {
        progress.complete();
        console.error('âŒ Save operation failed:', error);
        
        let errorMessage = 'Failed to save achievement. Please try again.';
        
        // Enhanced error message handling
        if (error.message.includes('â—')) {
            errorMessage = error.message; // Use the formatted error message
        } else if (error.message.includes('permission-denied')) {
            errorMessage = 'ðŸ”’ Permission denied. Please verify admin access and Firestore rules.';
        } else if (error.message.includes('network') || error.message.includes('unavailable')) {
            errorMessage = 'ðŸŒ Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('invalid-argument')) {
            errorMessage = 'ðŸ“ Invalid data format. Please check all fields and try again.';
        } else if (error.message.includes('Failed to save')) {
            errorMessage = error.message; // Use the detailed save error
        }
        
        showToast(errorMessage, 'error');
        
        // Log detailed error for debugging
        console.error('Detailed error info:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            firebaseConfig: {
                projectId: firebaseConfig.projectId,
                authDomain: firebaseConfig.authDomain
            }
        });
        
    } finally {
        // Reset UI state
        elements.achievementSubmit.classList.remove('loading');
        elements.achievementSubmit.disabled = false;
        elements.achievementCancel.disabled = false;
    }
}

// Enhanced form validation with category and collaborative support
function validateForm() {
    const errors = [];
    
    // Type validation
    const type = elements.achievementType.value;
    if (!type) {
        errors.push('Type selection is required');
        return errors;
    }
    
    // Title validation
    if (!validateTitle()) {
        errors.push('Please fix the achievement title');
        return errors;
    }
    
    // Category validation for students
    if (type === 'student') {
        const category = elements.achievementCategory.value;
        if (!category) {
            errors.push('Category selection is required for student achievements');
            return errors;
        }
    }
    
    // Achievement details validation
    const details = elements.achievementDetails.value.trim();
    if (!details) {
        errors.push('Achievement details are required');
        return errors;
    }
    
    // Type-specific validation
    if (type === 'collaborative') {
        // Validate collaborative fields
        const collaborativeId = elements.collaborativeId.value.trim();
        const collaborativeName = elements.collaborativeName.value.trim();
        const collaborativeDescription = elements.collaborativeDescription.value.trim();
        
        if (!collaborativeId) errors.push('Collaborative ID is required');
        if (!collaborativeName) errors.push('Project/Achievement Name is required');
        if (!collaborativeDescription) errors.push('Description is required');
        
    } else {
        // Validate entry groups for student/teacher
        const container = type === 'student' ? elements.studentEntries : elements.teacherEntries;
        const entryGroups = container.querySelectorAll('.entry-group');
        
        if (entryGroups.length === 0) {
            errors.push(`At least one ${type} entry is required`);
            return errors;
        }
        
        // Validate each entry group
        for (let i = 0; i < entryGroups.length; i++) {
            const group = entryGroups[i];
            
            if (type === 'student') {
                const studentId = group.querySelector('.studentId').value.trim();
                const studentName = group.querySelector('.studentName').value.trim();
                const batch = group.querySelector('.batch').value.trim();
                
                if (!studentId) errors.push(`Student ${i + 1}: Student ID is required`);
                if (!studentName) errors.push(`Student ${i + 1}: Student Name is required`);
                if (!batch) errors.push(`Student ${i + 1}: Batch is required`);
            } else {
                const teacherId = group.querySelector('.teacherId').value.trim();
                const teacherName = group.querySelector('.teacherName').value.trim();
                const department = group.querySelector('.department').value.trim();
                
                if (!teacherId) errors.push(`Teacher ${i + 1}: Teacher ID is required`);
                if (!teacherName) errors.push(`Teacher ${i + 1}: Teacher Name is required`);
                if (!department) errors.push(`Teacher ${i + 1}: Department is required`);
            }
            
            if (errors.length > 0) break; // Stop at first error
        }
    }
    
    return errors;
}

// Legacy delete function - redirects to new admin delete


// ENHANCED ACHIEVEMENT GROUPING - Groups primarily by achievementDetails
function normalizeText(text) {
    return text
        .trim()
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' '); // Normalize whitespace
}

function createGroupingKey(achievement) {
    // Edge case handling: fallback to title if no details
    const details = achievement.description || achievement.achievementDetails || achievement.title || 'untitled';
    const normalizedDetails = normalizeText(details);
    const type = (achievement.type || 'unknown').toLowerCase();
    const category = achievement.category ? achievement.category.toLowerCase() : '';
    
    return `${normalizedDetails}_${type}_${category}`;
}

function selectBestTitle(titles) {
    // Enhanced title selection - choose longest/most descriptive
    const validTitles = titles
        .filter(title => title && typeof title === 'string' && title.trim())
        .map(title => title.trim());
        
    if (validTitles.length === 0) {
        return 'Untitled Achievement';
    }
    
    if (validTitles.length === 1) {
        return validTitles[0];
    }
    
    // Score titles based on length and content quality
    const scoredTitles = validTitles.map(title => {
        let score = title.length; // Base score is length
        
        // Bonus points for descriptive words
        const descriptiveWords = ['competition', 'contest', 'award', 'achievement', 'winner', 'champion', 'excellence', 'outstanding', 'victory', 'success', 'recognition'];
        descriptiveWords.forEach(word => {
            if (title.toLowerCase().includes(word)) {
                score += 15; // Higher bonus for descriptive words
            }
        });
        
        // Bonus for proper capitalization
        if (title[0] === title[0].toUpperCase()) {
            score += 5;
        }
        
        // Penalty for generic words
        const genericWords = ['untitled', 'achievement', 'student', 'teacher'];
        genericWords.forEach(word => {
            if (title.toLowerCase().includes(word) && title.toLowerCase() !== word) {
                score -= 5;
            }
        });
        
        console.log(`ðŸ“Š Title scoring: "${title}" = ${score} points`);
        return { title, score };
    });
    
    // Return title with highest score (longest/most descriptive)
    scoredTitles.sort((a, b) => b.score - a.score);
    const selectedTitle = scoredTitles[0].title;
    
    console.log(`ðŸ† Selected best title: "${selectedTitle}" from ${validTitles.length} options`);
    return selectedTitle;
}

function addUniqueParticipant(participants, newParticipant) {
    // Enhanced deduplication with null/empty checks
    if (!newParticipant || typeof newParticipant !== 'string' || newParticipant.trim() === '') {
        return; // Skip empty or invalid participants
    }
    
    const cleanParticipant = newParticipant.trim();
    
    // Check if participant already exists (by name or ID)
    const exists = participants.some(existing => {
        if (!existing || typeof existing !== 'string') return false;
        
        const existingClean = existing.trim().toLowerCase();
        const newClean = cleanParticipant.toLowerCase();
        
        return existingClean === newClean ||
               existingClean.includes(newClean) ||
               newClean.includes(existingClean);
    });
    
    if (!exists) {
        participants.push(cleanParticipant);
    }
}

function formatParticipant(achievement) {
    // Enhanced participant formatting with null/undefined handling
    let participant = '';
    
    // Get name from various possible fields
    if (achievement.participants && achievement.participants.length > 0) {
        participant = achievement.participants[0];
    } else if (achievement.name) {
        participant = achievement.name;
    } else {
        participant = 'Unknown Participant';
    }
    
    // Add type-specific information with null checks
    if (achievement.type === 'students') {
        if (achievement.studentId) participant += ` (${achievement.studentId})`;
        if (achievement.batch) participant += ` - ${achievement.batch}`;
    } else if (achievement.type === 'teachers') {
        if (achievement.teacherId) participant += ` (${achievement.teacherId})`;
        if (achievement.department) participant += ` - ${achievement.department}`;
    } else if (achievement.type === 'collaborative') {
        if (achievement.collaborativeId) participant += ` (${achievement.collaborativeId})`;
    }
    
    return participant || 'Unknown';
}

// Enhanced Achievement Grouping by Details with Title Preservation
function groupAchievementsByDetails(achievements) {
    const grouped = {};
    
    console.log('ðŸ—º Starting enhanced achievement grouping with title preservation...');
    console.log(`ðŸ“Š Processing ${achievements.length} individual achievements`);
    
    achievements.forEach((achievement, index) => {
        // Primary key: achievementDetails + type + category
        const primaryKey = createGroupingKey(achievement);
        
        console.log(`Achievement ${index + 1}: Title="${achievement.title}", Key="${primaryKey}"`);
        
        if (!grouped[primaryKey]) {
            grouped[primaryKey] = {
                titles: [], // Collect all titles for best selection
                achievementDetails: achievement.description || achievement.achievementDetails || '',
                type: achievement.type,
                category: achievement.category,
                participants: [],
                photo: achievement.photoURL || null,
                createdAt: achievement.createdAt,
                updatedAt: achievement.updatedAt,
                id: achievement.id, // Use first achievement's ID
                collection: achievement.type // Store collection name for admin operations
            };
            console.log(`âœ… Created new group for: "${primaryKey}"`);
        } else {
            console.log(`âž• Adding to existing group: "${primaryKey}"`);
        }
        
        // Collect title for best selection - PRESERVE TITLE
        if (achievement.title && achievement.title.trim()) {
            if (!grouped[primaryKey].titles.includes(achievement.title)) {
                grouped[primaryKey].titles.push(achievement.title);
                console.log(`ðŸ“ Added title to group: "${achievement.title}"`);
            }
        }
        
        // Add participant with deduplication
        const participantInfo = formatParticipant(achievement);
        addUniqueParticipant(grouped[primaryKey].participants, participantInfo);
        
        // Use first available photo
        if (!grouped[primaryKey].photo && achievement.photoURL) {
            grouped[primaryKey].photo = achievement.photoURL;
        }
        
        // Keep most recent timestamp
        if (achievement.updatedAt && (!grouped[primaryKey].updatedAt || achievement.updatedAt > grouped[primaryKey].updatedAt)) {
            grouped[primaryKey].updatedAt = achievement.updatedAt;
        }
    });
    
    // Process grouped data and select best titles
    const result = Object.values(grouped).map(group => {
        const bestTitle = selectBestTitle(group.titles);
        console.log(`ðŸ† Group title selection:`, {
            availableTitles: group.titles,
            selectedTitle: bestTitle,
            participantCount: group.participants.length
        });
        
        return {
            title: bestTitle, // SELECT BEST TITLE FROM GROUP
            achievementDetails: group.achievementDetails,
            type: group.type,
            category: group.category,
            participants: group.participants.sort(), // Sort participants alphabetically
            photo: group.photo,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt,
            id: group.id,
            collection: group.collection,
            participantCount: group.participants.length
        };
    });
    
    console.log(`ðŸ”— Grouping complete: ${achievements.length} entries -> ${result.length} groups`);
    console.log(`ðŸ“ˆ Grouping efficiency: ${achievements.length > 0 ? Math.round((1 - result.length/achievements.length) * 100) : 0}% reduction`);
    
    return result;
}

// Legacy function name for compatibility
function groupAchievements(achievements) {
    return groupAchievementsByDetails(achievements);
}

// Data loading functions
async function loadAchievements() {
    elements.loading.style.display = 'block';
    
    try {
        console.log('ðŸ’¾ Loading achievements from new Firebase project...');
        console.log('ðŸŽ¯ Project ID:', firebaseConfig.projectId);
        
        // Import onSnapshot and other functions separately for real-time updates
        const { onSnapshot, orderBy, query } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        
        // Load students with real-time listener
        const studentsQuery = query(collection(db, 'students'));
        onSnapshot(studentsQuery, (snapshot) => {
            console.log('ðŸ‘¨â€ðŸŽ“ Students collection updated:', snapshot.docs.length, 'documents');
            achievements.students = snapshot.docs.map(doc => {
                const data = doc.data();
                console.log(`ðŸ“„ Student document ${doc.id}:`, {
                    hasTitle: !!data.title,
                    title: data.title,
                    name: data.name,
                    achievementDetails: data.achievementDetails?.substring(0, 50) + '...'
                });
                return {
                    id: doc.id,
                    type: 'students',
                    title: data.title || 'Untitled Achievement', // FETCH TITLE FIELD
                    achievementDetails: data.achievementDetails || '',
                    description: data.achievementDetails || '',
                    category: data.category || 'Academic',
                    participants: [data.name || 'Unknown'],
                    photoURL: data.photoBase64 || '',
                    studentId: data.studentId || '',
                    batch: data.batch || '',
                    name: data.name || 'Unknown',
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt
                };
            });
            console.log('ðŸ“Š Processing', achievements.students.length, 'student achievements for grouping...');
            console.log('ðŸ“Š Student achievements updated - regrouping...');
            updateAchievements();
        }, (error) => {
            console.error('Error in students snapshot:', error);
            showToast('Error loading student achievements', 'error');
        });
        
        // Load teachers with real-time listener
        const teachersQuery = query(collection(db, 'teachers'));
        onSnapshot(teachersQuery, (snapshot) => {
            console.log('ðŸ‘¨â€ðŸ« Teachers collection updated:', snapshot.docs.length, 'documents');
            achievements.teachers = snapshot.docs.map(doc => {
                const data = doc.data();
                console.log(`ðŸ“„ Teacher document ${doc.id}:`, {
                    hasTitle: !!data.title,
                    title: data.title,
                    name: data.name,
                    achievementDetails: data.achievementDetails?.substring(0, 50) + '...'
                });
                return {
                    id: doc.id,
                    type: 'teachers',
                    title: data.title || 'Untitled Achievement', // FETCH TITLE FIELD
                    achievementDetails: data.achievementDetails || '',
                    description: data.achievementDetails || '',
                    participants: [data.name || 'Unknown'],
                    photoURL: data.photoBase64 || '',
                    teacherId: data.teacherId || '',
                    department: data.department || '',
                    name: data.name || 'Unknown',
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt
                };
            });
            console.log('ðŸ“Š Processing', achievements.teachers.length, 'teacher achievements for grouping...');
            console.log('ðŸ“Š Teacher achievements updated - regrouping...');
            updateAchievements();
        }, (error) => {
            console.error('Error in teachers snapshot:', error);
            showToast('Error loading teacher achievements', 'error');
        });
        
        // Load collaborative with real-time listener
        const collaborativeQuery = query(collection(db, 'collaborative'));
        onSnapshot(collaborativeQuery, (snapshot) => {
            console.log('ðŸ¤ Collaborative collection updated:', snapshot.docs.length, 'documents');
            achievements.collaborative = snapshot.docs.map(doc => {
                const data = doc.data();
                console.log(`ðŸ“„ Collaborative document ${doc.id}:`, {
                    hasTitle: !!data.title,
                    title: data.title,
                    name: data.name,
                    achievementDetails: data.achievementDetails?.substring(0, 50) + '...'
                });
                return {
                    id: doc.id,
                    type: 'collaborative',
                    title: data.title || 'Untitled Achievement', // FETCH TITLE FIELD
                    achievementDetails: data.achievementDetails || data.description || '',
                    description: data.achievementDetails || data.description || '',
                    participants: data.name ? [data.name] : ['Collaborative Team'],
                    photoURL: data.photoBase64 || '',
                    collaborativeId: data.collaborativeId || '',
                    projectDescription: data.description || '',
                    name: data.name || 'Collaborative Project',
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt
                };
            });
            console.log('ðŸ“Š Processing', achievements.collaborative.length, 'collaborative achievements for grouping...');
            console.log('ðŸ“Š Collaborative achievements updated - regrouping...');
            updateAchievements();
        }, (error) => {
            console.error('Error in collaborative snapshot:', error);
            showToast('Error loading collaborative achievements', 'error');
        });
        
    } catch (error) {
        console.error('Error setting up achievement listeners:', error);
        showToast('Error connecting to database. Please check Firebase configuration.', 'error');
        elements.loading.style.display = 'none';
    }
}

async function loadAndDisplayAchievements() {
    try {
        console.log('ðŸ“Š Loading achievements with title field integration...');
        
        // Fetch all achievements (this will trigger the real-time listeners)
        await loadAchievements();
        
    } catch (error) {
        console.error('Error loading achievements:', error);
        elements.achievementsGrid.innerHTML = `
            <div class="error-message">
                <p>Error loading achievements. Please try again later.</p>
            </div>
        `;
    }
}

function updateAchievements() {
    // Combine all achievements
    const allAchievements = [...achievements.students, ...achievements.teachers, ...achievements.collaborative];
    
    console.log(`ðŸ“Š Fetched ${allAchievements.length} individual achievements`);
    
    // Group achievements by achievementDetails using enhanced function
    const groupedAchievements = groupAchievementsByDetails(allAchievements);
    // Store latest grouped achievements for stats (deduplicated counts)
    latestGroupedAchievements = groupedAchievements;
    try {
        // Cache grouped achievements lightly (only essential fields) to localStorage for instant load
        const cachePayload = groupedAchievements.map(g => ({
            id: g.id,
            title: g.title,
            type: g.type,
            participantCount: g.participantCount,
            participants: g.participants,
            achievementDetails: g.achievementDetails,
            photo: g.photo || g.photoURL || null,
            batch: g.batch || ''
        }));
        localStorage.setItem('cachedGroupedAchievements', JSON.stringify(cachePayload));
    } catch (e) {
        console.warn('Could not cache grouped achievements:', e);
    }
    
    console.log(`ðŸ“Š Grouped into ${groupedAchievements.length} unique achievements`);
    
    console.log('ðŸ”— Enhanced Achievement Grouping Complete:', {
        totalIndividual: allAchievements.length,
        groupedCards: groupedAchievements.length,
        multiParticipantGroups: groupedAchievements.filter(g => g.participantCount > 1).length,
        groupingReduction: allAchievements.length - groupedAchievements.length,
        groupingEfficiency: allAchievements.length > 0 ? Math.round((1 - groupedAchievements.length/allAchievements.length) * 100) : 0
    });
    
    // Show grouping notification for merged achievements
    const multiParticipantGroups = groupedAchievements.filter(group => group.participantCount > 1);
    if (multiParticipantGroups.length > 0) {
        const totalParticipants = multiParticipantGroups.reduce((sum, group) => sum + group.participantCount, 0);
        console.log(`ðŸ“Š Merged ${multiParticipantGroups.length} achievements with ${totalParticipants} total participants`);
        showToast(`ðŸ”— Grouped ${multiParticipantGroups.length} achievements with multiple participants`, 'success', 2000);
    }
    
    // Apply filters to grouped achievements
    filteredAchievements = groupedAchievements.filter(achievement => {
        // Type filter
        if (currentFilter.type !== 'all' && achievement.type !== currentFilter.type) {
            return false;
        }
        
        // Category filter (only for students)
        if (currentFilter.category !== 'all' && 
            achievement.type === 'students' && 
            achievement.category !== currentFilter.category) {
            return false;
        }
        
        return true;
    });
    
    console.log(`ðŸ“Š Filtering complete: ${filteredAchievements.length} achievement groups match current filters`);
    
    // Log filter statistics
    if (currentFilter.type !== 'all' || currentFilter.category !== 'all') {
        console.log(`  â€¢ Active filters: Type=${currentFilter.type}, Category=${currentFilter.category}`);
        const hiddenCount = groupedAchievements.length - filteredAchievements.length;
        if (hiddenCount > 0) {
            console.log(`  â€¢ ${hiddenCount} groups hidden by filters`);
        }
    }
    
    // Update stats (prefer grouped/deduplicated counts when available)
    updateStats();
    
    // Render grouped achievements
    // Apply search/batch filters before rendering if present
    applySearchAndBatchFilters();
    
    // Hide loading
    elements.loading.style.display = 'none';
    
    // Show enhanced admin notification
    if (currentUser) {
        const totalIndividual = achievements.students.length + achievements.teachers.length + achievements.collaborative.length;
        const totalGrouped = filteredAchievements.length;
        
        if (totalIndividual > totalGrouped) {
            console.log(`âœï¸ Admin Mode: ${totalIndividual} individual entries available for editing, displayed as ${totalGrouped} grouped cards`);
        }
    }
}

function applySearchAndBatchFilters() {
    // Start from filteredAchievements computed by updateAchievements (type/category filters applied)
    let results = filteredAchievements.slice();

    const q = elements.achievementSearch?.value?.trim().toLowerCase();
    if (q) {
        results = results.filter(item => {
            const title = (item.title || '').toLowerCase();
            const participants = (item.participants || []).join(' ').toLowerCase();
            return title.includes(q) || participants.includes(q);
        });
    }

    // If type is students, allow batch filtering
    const typeIsStudents = currentFilter.type === 'students';
    const batchQ = elements.batchFilter?.value?.trim().toLowerCase();
    if (typeIsStudents && batchQ) {
        results = results.filter(item => {
            // item.batch may exist on grouped object or participants entries
            const batchVal = (item.batch || '').toLowerCase();
            const participantsBatchText = (item.participants || []).join(' ').toLowerCase();
            return batchVal.includes(batchQ) || participantsBatchText.includes(batchQ);
        });
    }

    // Render results
    displayGroupedAchievements(results);
}

function setupAchievementSearch() {
    if (elements.achievementSearch) {
        elements.achievementSearch.addEventListener('input', () => {
            applySearchAndBatchFilters();
        });
    }
    if (elements.batchFilter) {
        elements.batchFilter.addEventListener('input', () => {
            applySearchAndBatchFilters();
        });
    }
}

function updateStats() {
    // If grouped (deduplicated) achievements are available, count unique groups per type
    if (latestGroupedAchievements && Array.isArray(latestGroupedAchievements)) {
        const studentGroups = latestGroupedAchievements.filter(g => g.type === 'students').length;
        const teacherGroups = latestGroupedAchievements.filter(g => g.type === 'teachers').length;
        const collaborativeGroups = latestGroupedAchievements.filter(g => g.type === 'collaborative').length;

        elements.studentCount.textContent = studentGroups;
        elements.teacherCount.textContent = teacherGroups;
        elements.collaborativeCount.textContent = collaborativeGroups;
    } else {
        // Fallback: show original counts (individual entries)
        elements.studentCount.textContent = achievements.students.length;
        elements.teacherCount.textContent = achievements.teachers.length;
        elements.collaborativeCount.textContent = achievements.collaborative.length;
    }
    
    // Log grouping statistics
    const totalIndividual = achievements.students.length + achievements.teachers.length + achievements.collaborative.length;
    const totalGrouped = filteredAchievements.length;
    
    if (totalIndividual > 0 && totalGrouped > 0 && totalIndividual !== totalGrouped) {
        console.log(`ðŸ“Š Stats: ${totalIndividual} individual entries grouped into ${totalGrouped} achievement cards`);
    }
}

function displayGroupedAchievements(achievements) {
    const container = document.getElementById('achievements-grid');
    if (!container) return;
    
    container.innerHTML = '';

    // Progressive rendering in small chunks to avoid blocking the main thread
    const chunkSize = 8;
    let index = 0;

    function renderChunk() {
        const end = Math.min(index + chunkSize, achievements.length);
        const fragment = document.createDocumentFragment();
        for (let i = index; i < end; i++) {
            const temp = document.createElement('div');
            temp.innerHTML = createAchievementCard(achievements[i]);
            // Append children from temp
            while (temp.firstChild) fragment.appendChild(temp.firstChild);
        }
        container.appendChild(fragment);
        index = end;
        if (index < achievements.length) {
            // Schedule next chunk
            requestAnimationFrame(renderChunk);
        } else {
            // After all rendered, add image load handlers and animations
            container.querySelectorAll('.achievement-image').forEach(img => {
                if (!img.complete) {
                    img.style.opacity = '0';
                    img.addEventListener('load', () => {
                        img.style.transition = 'opacity 400ms ease-out';
                        img.style.opacity = '1';
                    });
                }
            });
        }
    }

    renderChunk();
    
    console.log(`ðŸŽ¨ Displayed ${achievements.length} grouped achievement cards`);
}

function renderAchievements() {
    const grid = elements.achievementsGrid;
    
    if (filteredAchievements.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <p>No achievements found matching your filters.</p>
                <small>Try adjusting your filters or add some achievements with the same achievementDetails to see grouping in action.</small>
            </div>
        `;
        return;
    }
    
    // Enhanced rendering statistics with title tracking
    const renderStats = {
        totalCards: filteredAchievements.length,
        singleParticipant: filteredAchievements.filter(a => a.participantCount === 1).length,
        multiParticipant: filteredAchievements.filter(a => a.participantCount > 1).length,
        withPhotos: filteredAchievements.filter(a => a.photo).length,
        groupedByDetails: filteredAchievements.filter(a => a.participantCount > 1).length,
        withCustomTitles: filteredAchievements.filter(a => a.title && a.title !== 'Untitled Achievement').length,
        withFallbackTitles: filteredAchievements.filter(a => !a.title || a.title === 'Untitled Achievement').length
    };
    
    console.log('ðŸŽ¨ Enhanced Achievement Rendering with Title Integration:', renderStats);
    
    // Show title integration status
    if (renderStats.withFallbackTitles > 0) {
        console.warn(`âš ï¸ ${renderStats.withFallbackTitles} achievements using fallback titles - consider adding title field to Firestore documents`);
    }
    if (renderStats.withCustomTitles > 0) {
        console.log(`ðŸ† ${renderStats.withCustomTitles} achievements displaying custom titles from Firestore`);
    }
    
    grid.innerHTML = filteredAchievements.map(achievement => 
        createAchievementCard(achievement)
    ).join('');
    
    // Enhanced animation with staggered effect and grouping notifications
    setTimeout(() => {
        grid.querySelectorAll('.achievement-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
            
            // Add loading animation for images
            const image = card.querySelector('.achievement-image');
            if (image && !image.complete) {
                image.style.opacity = '0';
                image.addEventListener('load', () => {
                    image.style.transition = 'opacity 400ms ease-out';
                    image.style.opacity = '1';
                });
            }
        });
        
        // Show enhanced grouping statistics and title validation
        if (renderStats.multiParticipant > 0) {
            const totalParticipants = filteredAchievements
                .filter(a => a.participantCount > 1)
                .reduce((sum, a) => sum + a.participantCount, 0);
                
            console.log(`ðŸ”— Displaying ${renderStats.multiParticipant} grouped achievements with ${totalParticipants} participants`);
            
            if (currentUser) {
                showToast(`ðŸ”— Enhanced Grouping: ${renderStats.multiParticipant} merged achievements displayed`, 'success', 2500);
            }
        } else {
            console.log('ðŸ“Š All achievements are unique - no grouping applied');
        }
        
        // Validate title display after rendering
        setTimeout(() => {
            const titlesDisplayed = filteredAchievements.filter(a => a.title && a.title !== 'Untitled Achievement').length;
            console.log(`ðŸ† Title Display Status: ${titlesDisplayed}/${filteredAchievements.length} achievements have custom titles`);
            
            if (titlesDisplayed < filteredAchievements.length) {
                const untitledCount = filteredAchievements.length - titlesDisplayed;
                console.warn(`âš ï¸ ${untitledCount} achievements using fallback title - check Firestore title field`);
            }
        }, 100);
        
        // Add admin mode styling to cards
        if (currentUser) {
            grid.querySelectorAll('.achievement-card').forEach(card => {
                card.classList.add('admin-mode');
            });
        }
        
        // Show photo enhancement notification
        if (renderStats.withPhotos > 0) {
            console.log(`ðŸ“¸ ${renderStats.withPhotos} achievements displayed with photos`);
        }
    }, 100);
}

function createAchievementCard(achievement) {
    const date = achievement.createdAt ? 
        new Date(achievement.createdAt.toDate ? achievement.createdAt.toDate() : achievement.createdAt).toLocaleDateString() : 
        new Date().toLocaleDateString();
    
    // Log title for debugging
    console.log(`ðŸ–¼ Creating card for: "${achievement.title}"`);
    
    // Ensure title exists with fallback
    const cardTitle = achievement.title || 'Untitled Achievement';
    
    const adminActions = currentUser ? `
        <div class="admin-controls">
            <button class="edit-btn" onclick="editAchievement('${achievement.id}', '${achievement.collection || achievement.type}')" title="Edit Achievement">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" onclick="deleteAchievement('${achievement.id}', '${achievement.collection || achievement.type}', '${cardTitle.replace(/'/g, "&#39;")}')" title="Delete Achievement">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    ` : '';
    
    // Type badge mapping
    const typeMapping = {
        'students': 'STUDENT',
        'teachers': 'TEACHER', 
        'collaborative': 'COLLABORATIVE'
    };
    
    // Category badge for students only
    const categoryBadge = achievement.category && achievement.type === 'students' ? `
        <span class="category-badge ${achievement.category.toLowerCase()}">${achievement.category}</span>
    ` : '';
    
    // Participant count badge
    const participantCountBadge = `
        <span class="participants-count">${achievement.participantCount} Participant${achievement.participantCount > 1 ? 's' : ''}</span>
    `;
    
    // Use photo or fallback
    const photoUrl = achievement.photo || achievement.photoURL || achievement.photoBase64 || null;

    // Photo section - only show if photo exists. Add lazy loading + async decoding for performance
    const photoSection = photoUrl ? `
        <div class="achievement-photo">
            <img class="achievement-image" src="${photoUrl}" alt="${achievement.title}" loading="lazy" decoding="async" onerror="this.parentElement.style.display='none';">
        </div>
    ` : '';
    
    return `
        <div class="achievement-card ${currentUser ? 'admin-mode' : ''}" data-achievement-id="${achievement.id}" data-collection="${achievement.type}">
            ${adminActions}
            
            <!-- 1. PHOTO SECTION -->
            ${photoSection}
            
            <!-- 2. TITLE SECTION (BOLD) -->
            <div class="achievement-title-section">
                <h3 class="achievement-title">${cardTitle}</h3>
            </div>
            
            <!-- 3. BADGES SECTION -->
            <div class="achievement-badges-section">
                <div class="achievement-badges">
                    <span class="type-badge ${achievement.type}">${typeMapping[achievement.type]}</span>
                    ${categoryBadge}
                    ${participantCountBadge}
                </div>
            </div>
            
            <!-- 4. ACHIEVEMENT DETAILS SECTION -->
            <div class="achievement-details-section">
                <p class="achievement-description">${achievement.achievementDetails || achievement.description || 'Achievement details not available.'}</p>
            </div>
            
            <!-- 5. PARTICIPANT DETAILS SECTION -->
            <div class="participants-section">
                <h4 class="participants-heading">Participants:</h4>
                <div class="participants-list">
                    ${achievement.participants.map(participant => 
                        `<div class="participant">${participant}</div>`
                    ).join('')}
                </div>
            </div>
        </div>
    `;
}

// SIMPLIFIED EDIT SYSTEM - REUSE ADD ACHIEVEMENT MODAL

// Edit achievement function - reuses add achievement modal
window.editAchievement = async function(docId, collectionName) {
    try {
        const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Set edit mode
            editMode = true;
            editContext = { docId, collectionName, originalData: data };
            
            // Update modal title and button
            elements.achievementModalTitle.textContent = 'Edit Achievement';
            elements.achievementSubmit.textContent = 'ðŸ”„ Update Achievement';
            
            // Populate form with existing data
            populateEditForm(data);
            
            // Show modal
            elements.achievementModal.classList.add('active');
            
        } else {
            showToast('Achievement not found!', 'error');
        }
    } catch (error) {
        console.error('Error loading achievement:', error);
        showToast('Error loading achievement for editing.', 'error');
    }
};







// Delete achievement function
window.deleteAchievement = async function(docId, collectionName, title) {
    if (!confirm(`Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        await deleteDoc(doc(db, collectionName, docId));
        showToast('Achievement deleted successfully!', 'success');
        
        // Refresh displays
        await loadAchievements();
        
    } catch (error) {
        console.error('Error deleting achievement:', error);
        showToast('Error deleting achievement. Please try again.', 'error');
    }
};



// Filter functions
function handleFilterChange(e, filterType) {
    const value = e.target.dataset[filterType];
    
    if (filterType === 'type') {
        // Update type filter
        currentFilter.type = value;
        
        // Show/hide category filters
        if (value === 'students') {
            elements.categoryFilters.style.display = 'block';
            if (elements.batchFilter) elements.batchFilter.style.display = 'inline-block';
        } else {
            elements.categoryFilters.style.display = 'none';
            currentFilter.category = 'all';
            if (elements.batchFilter) elements.batchFilter.style.display = 'none';
            
            // Reset category filter buttons
            elements.categoryBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.category === 'all');
            });
        }
        
        // Update filter button states
        elements.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === value);
        });
        // Reapply search/batch filters after type change
        applySearchAndBatchFilters();
        
    } else if (filterType === 'category') {
        currentFilter.category = value;
        
        // Update category button states
        elements.categoryBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === value);
        });
    }
    // Add support for collaborative to ensure grid refreshes
    updateAchievements();
}

// Enhanced toast notification function with grouping context
function showToast(message, type = 'success', duration = 3000) {
    // If toasts are suppressed (during initial load), still show errors and explicitly allowed success toasts
    if (suppressToastsDuringLoad && type !== 'error') {
        // Allow critical success states like save or added during load
        const lower = (message || '').toLowerCase();
        const allowedDuringLoad = lower.includes('save') || lower.includes('saved') || lower.includes('added') || lower.includes('welcome');
        if (!allowedDuringLoad) return;
    }

    // Only allow a small set of toast messages: successful login, successful logout,
    // and adding/saving data to the database. All other toast calls are ignored.
    function isAllowedToast(msg, t) {
        if (!msg || typeof msg !== 'string') return false;
        const m = msg.toLowerCase();
    // Allow explicit successful login messages (welcome)
    if (t === 'success' && m.includes('welcome')) return true;
        // Allow explicit logout success
        if (t === 'success' && m.includes('logged out')) return true;
        // Allow add/save operations (add, added, save, saved)
        if (t === 'success' && (m.includes('add') || m.includes('added') || m.includes('save') || m.includes('saved'))) return true;
        return false;
    }

    if (!isAllowedToast(message, type) && type !== 'error') {
        // suppressed: log to console for debugging but do not show UI toast
        console.debug('Toast suppressed:', { message, type });
        return;
    }

    // Ensure a toast container exists and is above modal overlays
    if (!elements.toastContainer || !document.getElementById('toast-container')) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        elements.toastContainer = container;
    }
    // Ensure high z-index and fixed positioning so toasts are visible over modals
    try {
        const cs = window.getComputedStyle(elements.toastContainer);
        if (!cs || cs.position !== 'fixed') {
            elements.toastContainer.style.position = 'fixed';
            elements.toastContainer.style.top = '20px';
            elements.toastContainer.style.right = '20px';
            elements.toastContainer.style.left = '';
        }
        elements.toastContainer.style.zIndex = '2147483647';
        elements.toastContainer.style.pointerEvents = 'none';
    } catch {}

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    // Fallback inline styles so toast is visible even without CSS
    const bg = type === 'error' ? '#E74C3C' : type === 'warning' ? '#F39C12' : type === 'info' ? '#3498DB' : '#27AE60';
    toast.style.background = bg;
    toast.style.color = '#fff';
    toast.style.padding = '10px 14px';
    toast.style.borderRadius = '6px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    toast.style.fontSize = '14px';
    toast.style.maxWidth = '360px';
    toast.style.pointerEvents = 'auto';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    // Ensure individual toast also has very high z-index and can receive clicks for close button
    toast.style.zIndex = '2147483647';

    // Add close button for error messages (errors are normally suppressed by policy above)
    if (type === 'error') {
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = 'float: right; background: none; border: none; color: white; font-size: 18px; cursor: pointer; margin-left: 10px;';
        closeBtn.onclick = () => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    elements.toastContainer.removeChild(toast);
                }
            }, 300);
        };
        toast.appendChild(closeBtn);
        duration = 8000; // Longer duration for errors
    }

    // Ensure container fallback layout
    try {
        elements.toastContainer.style.display = elements.toastContainer.style.display || 'flex';
        elements.toastContainer.style.flexDirection = elements.toastContainer.style.flexDirection || 'column';
        elements.toastContainer.style.gap = elements.toastContainer.style.gap || '8px';
        elements.toastContainer.style.alignItems = elements.toastContainer.style.alignItems || 'flex-end';
        elements.toastContainer.style.width = elements.toastContainer.style.width || 'auto';
    } catch {}

    elements.toastContainer.appendChild(toast);

    // Show toast (inline transition as fallback)
    setTimeout(() => {
        toast.classList.add('show');
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 50);

    // Hide and remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-6px)';
        setTimeout(() => {
            if (toast.parentNode) {
                elements.toastContainer.removeChild(toast);
            }
        }, 300);
    }, duration);

    // Keep console logs for allowed toasts
    console.log(`Toast [${type.toUpperCase()}]:`, message);
}



// Setup form validation
function setupFormValidation() {
    // Achievement details validation
    elements.achievementDetails?.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        if (value.length === 0) {
            e.target.style.borderColor = '#E74C3C';
        } else {
            e.target.style.borderColor = '#27AE60';
        }
    });
}

// Setup title field validation and character counter
function setupTitleValidation() {
    if (!elements.achievementTitle) return;
    
    // Real-time validation and character counting
    elements.achievementTitle.addEventListener('input', handleTitleInput);
    elements.achievementTitle.addEventListener('blur', validateTitle);
}

function handleTitleInput(e) {
    const value = e.target.value;
    const length = value.length;
    
    // Update character counter
    if (elements.titleCharCount) {
        elements.titleCharCount.textContent = length;
    }
    
    // Update counter color based on length
    if (elements.titleCounter) {
        elements.titleCounter.className = 'character-counter';
        if (length >= 95) {
            elements.titleCounter.classList.add('danger');
        } else if (length >= 80) {
            elements.titleCounter.classList.add('warning');
        }
    }
    
    // Real-time validation feedback
    validateTitle();
}

function validateTitle() {
    if (!elements.achievementTitle) return true;
    
    const value = elements.achievementTitle.value.trim();
    const titleError = elements.titleError;
    
    // Clear previous states
    elements.achievementTitle.classList.remove('error', 'success');
    if (titleError) {
        titleError.style.display = 'none';
        titleError.className = 'validation-message';
    }
    
    // Validation rules
    if (value.length === 0) {
        showTitleError('Achievement title is required');
        return false;
    }
    
    if (value.length < 3) {
        showTitleError('Title must be at least 3 characters long');
        return false;
    }
    
    if (value.length > 100) {
        showTitleError('Title cannot exceed 100 characters');
        return false;
    }
    
    // Check for invalid characters
    const validPattern = /^[a-zA-Z0-9\s\-.,!?()&]+$/;
    if (!validPattern.test(value)) {
        showTitleError('Title contains invalid characters');
        return false;
    }
    
    // Show success state
    elements.achievementTitle.classList.add('success');
    if (titleError) {
        titleError.textContent = 'Valid title';
        titleError.className = 'validation-message success';
        titleError.style.display = 'block';
    }
    
    return true;
}

function showTitleError(message) {
    if (elements.achievementTitle) {
        elements.achievementTitle.classList.add('error');
    }
    
    if (elements.titleError) {
        elements.titleError.textContent = message;
        elements.titleError.className = 'validation-message error';
        elements.titleError.style.display = 'block';
    }
}

// Firestore connection monitoring with enhanced error handling
function monitorFirestoreConnection() {
    console.log('Setting up Firestore connection monitoring...');
    
    try {
        // Test basic connection by attempting to get a collection reference
        const testCollection = collection(db, 'students');
        console.log('Firestore collection reference created successfully');
        
        // Import onSnapshot for monitoring
        import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
            .then(({ onSnapshot }) => {
                // Set up real-time listener for connection monitoring
                onSnapshot(testCollection, 
                    (snapshot) => {
                        console.log('âœ“ Firestore connection active. Collections accessible.');
                        console.log(`Students collection has ${snapshot.docs.length} documents`);
                        showConnectionStatus(true);
                    },
                    (error) => {
                        console.error('âŒ Firestore connection error:', error);
                        
                        let errorMessage = 'Unknown connection error';
                        if (error.code === 'permission-denied') {
                            errorMessage = 'Permission denied - check Firestore rules';
                        } else if (error.code === 'unavailable') {
                            errorMessage = 'Firestore service unavailable';
                        } else if (error.message) {
                            errorMessage = error.message;
                        }
                        
                        showConnectionStatus(false, errorMessage);
                    }
                );
            })
            .catch(error => {
                console.error('Failed to import onSnapshot:', error);
                showConnectionStatus(false, 'Failed to initialize real-time monitoring');
            });
        
    } catch (error) {
        console.error('Failed to set up Firestore connection monitoring:', error);
        showConnectionStatus(false, error.message);
    }
}

function showConnectionStatus(isConnected, errorMessage = '') {
    const statusIndicator = document.getElementById('connection-status');
    
    if (!statusIndicator) {
        // Create status indicator if it doesn't exist
        const indicator = document.createElement('div');
        indicator.id = 'connection-status';
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            z-index: 9999;
            transition: all 0.3s ease;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(indicator);
    }
    
    const indicator = document.getElementById('connection-status');
    
    if (isConnected) {
        indicator.textContent = 'âœ“ Connected to Database';
        indicator.style.backgroundColor = '#27AE60';
        indicator.style.color = 'white';
        // Hide after 3 seconds
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 3000);
    } else {
        indicator.textContent = 'âš  Database Connection Error';
        indicator.style.backgroundColor = '#E74C3C';
        indicator.style.color = 'white';
        indicator.style.opacity = '1';
        
        if (errorMessage.includes('permission-denied')) {
            showToast('Database access denied. Please check admin permissions.', 'error');
        } else if (errorMessage.includes('network')) {
            showToast('Network error. Please check your internet connection.', 'error');
        }
    }
}

// Enhanced data validation for Firestore saves
function validateFirestoreData(data, type) {
    const errors = [];
    
    // Required fields validation based on type
    const requiredFields = {
        students: ['title', 'description', 'type', 'category', 'participants'],
        teachers: ['title', 'description', 'type', 'participants'],
        collaborative: ['title', 'description', 'type', 'participants']
    };
    
    const required = requiredFields[type] || [];
    
    required.forEach(field => {
        if (!data[field] || (Array.isArray(data[field]) && data[field].length === 0)) {
            errors.push(`${field} is required for ${type} achievements`);
        }
    });
    
    // Data type validations
    if (data.participants && !Array.isArray(data.participants)) {
        errors.push('Participants must be an array');
    }
    
    if (data.title && (typeof data.title !== 'string' || data.title.trim().length === 0)) {
        errors.push('Title must be a non-empty string');
    }
    
    if (data.description && (typeof data.description !== 'string' || data.description.trim().length === 0)) {
        errors.push('Description must be a non-empty string');
    }
    
    return errors;
}

// Progress tracking for form submissions
function showProgress(message = 'Processing...') {
    const progressEl = document.createElement('div');
    progressEl.className = 'form-progress active';
    progressEl.innerHTML = `<div class="form-progress-bar"></div>`;
    document.body.appendChild(progressEl);
    
    const progressBar = progressEl.querySelector('.form-progress-bar');
    let width = 0;
    const interval = setInterval(() => {
        width += 10;
        progressBar.style.width = width + '%';
        if (width >= 90) {
            clearInterval(interval);
        }
    }, 100);
    
    showToast(message, 'success', 1500);
    
    return {
        complete: () => {
            clearInterval(interval);
            progressBar.style.width = '100%';
            setTimeout(() => {
                document.body.removeChild(progressEl);
            }, 500);
        }
    };
}

// Debug function to check titles
window.debugAchievementTitles = function() {
    const allAchievements = [...achievements.students, ...achievements.teachers, ...achievements.collaborative];
    console.log('=== ACHIEVEMENT TITLES DEBUG ===');
    allAchievements.forEach((achievement, index) => {
        console.log(`${index + 1}. Title: "${achievement.title}" | Type: ${achievement.type} | Details: "${achievement.achievementDetails?.substring(0, 50)}..."`);
    });
    console.log('=== END DEBUG ===');
    return allAchievements;
};

// Function to validate title display in cards
window.validateTitleDisplay = function() {
    const cards = document.querySelectorAll('.achievement-card');
    console.log('=== TITLE DISPLAY VALIDATION ===');
    cards.forEach((card, index) => {
        const titleElement = card.querySelector('.achievement-title');
        const titleText = titleElement?.textContent || 'NO TITLE FOUND';
        const hasProperStyling = titleElement?.style.fontWeight === '700' || 
                                window.getComputedStyle(titleElement)?.fontWeight === '700';
        
        console.log(`Card ${index + 1}:`, {
            title: titleText,
            hasTitle: !!titleElement,
            isBold: hasProperStyling,
            element: titleElement
        });
    });
    console.log('=== END VALIDATION ===');
};

// Add enhanced sample data function with grouping demonstration
window.addSampleDataWithGrouping = async function() {
    if (!currentUser) {
        showToast('Please log in as admin first', 'error');
        return;
    }
    
    if (!confirm('Add sample data to demonstrate enhanced grouping? This will create test entries that showcase the new grouping logic.')) {
        return;
    }
    
    const progress = showProgress('Adding sample data with grouping examples...');
    
    try {
        // Add multiple students with SAME achievementDetails to demonstrate grouping
        await addDoc(collection(db, 'students'), {
            type: 'student',
            title: 'Programming Competition',
            studentId: 'CSE-2021-001',
            name: 'Ahmed Rahman',
            batch: 'CSE-47',
            category: 'Technology',
            achievementDetails: 'Won first place in national programming competition',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: currentUser.email
        });
        
        await addDoc(collection(db, 'students'), {
            type: 'student',
            title: 'Programming Contest Winner',  // Different title, SAME details
            studentId: 'CSE-2021-015',
            name: 'Fatima Khan',
            batch: 'CSE-47',
            category: 'Technology',
            achievementDetails: 'Won first place in national programming competition', // SAME as above
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: currentUser.email
        });
        
        await addDoc(collection(db, 'students'), {
            type: 'student',
            title: 'ACM ICPC Victory', // Another different title, SAME details
            studentId: 'CSE-2020-042',
            name: 'Mohammad Ali',
            batch: 'CSE-46',
            category: 'Technology',
            achievementDetails: 'Won first place in national programming competition', // SAME as above
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: currentUser.email
        });
        
        // Add unique achievement to show individual display
        await addDoc(collection(db, 'students'), {
            type: 'student',
            title: 'Research Paper Publication',
            studentId: 'CSE-2021-007',
            name: 'Nadia Rahman',
            batch: 'CSE-47',
            category: 'Academic',
            achievementDetails: 'Published research paper in IEEE conference on Machine Learning applications',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: currentUser.email
        });
        
        progress.complete();
        showToast('ðŸ”— Sample data added! Check how 3 students with same achievementDetails are grouped into 1 card', 'success', 5000);
        console.log('ðŸ”— Sample data created to demonstrate enhanced grouping:');
        console.log('  â€¢ 3 students with SAME achievementDetails -> will show as 1 grouped card');
        console.log('  â€¢ 1 student with unique achievementDetails -> will show as individual card');
        console.log('  â€¢ Different titles but same details will use longest title');
        
    } catch (error) {
        progress.complete();
        console.error('Error adding sample data:', error);
        showToast('Error adding sample data: ' + error.message, 'error');
    }
};

// Legacy sample data function
window.addSampleData = async function() {
    if (!currentUser) {
        showToast('Please log in as admin first', 'error');
        return;
    }
    
    if (!confirm('Add sample achievement data? This will create test entries in your database.')) {
        return;
    }
    
    const progress = showProgress('Adding sample data...');
    
    try {
        // Student achievement
        await addDoc(collection(db, 'students'), {
            type: 'student',
            title: 'Programming Competition Victory',
            studentId: 'CSE-2021-001',
            name: 'Ahmed Rahman',
            batch: 'CSE-47',
            category: 'Technology',
            achievementDetails: 'First place victory in ACM ICPC regional programming contest, competing against 50+ universities nationwide.',
            photoBase64: null
        });
        
        // Teacher achievement
        await addDoc(collection(db, 'teachers'), {
            type: 'teacher',
            title: 'Research Publication Award',
            teacherId: 'BAUET-CSE-001',
            name: 'Dr. Sarah Ahmed',
            department: 'Computer Science &amp; Engineering',
            achievementDetails: 'Recognition for outstanding research contributions in Artificial Intelligence and Machine Learning at the IEEE International Conference.',
            photoBase64: null
        });
        
        // Collaborative achievement
        await addDoc(collection(db, 'collaborative'), {
            type: 'collaborative',
            title: 'Industry Partnership Success',
            collaborativeId: 'COLLAB-2024-001',
            name: 'Industry-Academia Collaboration Project',
            description: 'AI-based Healthcare Solutions',
            achievementDetails: 'Successful partnership between BAUET CSE students, faculty, and TechCorp Ltd resulting in innovative AI-based solutions for healthcare.',
            photoBase64: null
        });
        
        progress.complete();
        showToast('Sample data added successfully using reference pattern!', 'success');
    } catch (error) {
        progress.complete();
        console.error('Error adding sample data:', error);
        showToast('Error adding sample data: ' + error.message, 'error');
    }
};

// Contact/messages functionality removed per user request
function openContactModal() { /* removed */ }
function closeContactModal() { /* removed */ }
async function loadMessages() { /* removed */ }
async function syncPendingMessages() { /* removed */ }

// Utility escape helper
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"]+/g, function (s) {
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]);
    });
}

async function handleContactSubmit(e) {
    e.preventDefault();
    
    elements.contactSubmit.classList.add('loading');
    elements.contactSubmit.disabled = true;
    
    try {
        console.log('handleContactSubmit invoked');
        if (!db) {
            console.error('Firestore `db` is not initialized');
            showToast('Internal error: database not initialized', 'error');
            throw new Error('Firestore `db` is not initialized');
        }
        const templateParams = {
            from_name: elements.contactName.value,
            from_email: elements.contactEmail.value,
            subject: elements.contactSubject.value,
            message: elements.contactMessage.value,
            to_email: 'rakat.ashraf.holocast@gmail.com'
        };
        
        // Basic validation
        const name = (elements.contactName.value || '').trim();
        const email = (elements.contactEmail.value || '').trim();
        const subject = (elements.contactSubject.value || '').trim();
        const message = (elements.contactMessage.value || '').trim();

        if (!name || !email || !subject || !message) {
            showToast('Please fill out all required fields', 'error');
            throw new Error('Validation failed: missing fields');
        }

        // Save message to Firestore collection `messages` using serverTimestamp
        try {
            const docRef = await addDoc(collection(db, 'messages'), {
                name,
                email,
                subject,
                message,
                createdAt: serverTimestamp()
            });
            console.log('Firestore addDoc succeeded, id=', docRef.id);
            showToast('Message saved successfully', 'success');
            closeContactModal();
        } catch (writeErr) {
            console.error('Firestore write failed:', writeErr);
            // Fallback: persist to localStorage so user doesn't lose the message
            try {
                const pending = JSON.parse(localStorage.getItem('pending_messages') || '[]');
                pending.push({ name, email, subject, message, createdAt: new Date().toISOString() });
                localStorage.setItem('pending_messages', JSON.stringify(pending));
                showToast('Message saved locally (offline). Admin will see it when rules allow.', 'warning', 6000);
                closeContactModal();
            } catch (lsErr) {
                console.error('Failed to save pending message to localStorage:', lsErr);
                throw writeErr; // rethrow original Firestore error
            }
        }

        // Also attempt to send via EmailJS if configured (non-blocking)
        if (typeof emailjs !== 'undefined') {
            try {
                await emailjs.send(
                    EMAILJS_CONFIG.serviceId,
                    EMAILJS_CONFIG.templateId,
                    templateParams
                );
            } catch (e) {
                console.warn('EmailJS send failed (message stored in Firestore):', e);
            }
        }

        showToast('Message saved successfully', 'success');
        closeContactModal();
        
    } catch (error) {
        console.error('Error sending message:', error, error?.code, error?.message);
        const emsg = (error && (error.message || error.code)) ? `${error.code || ''} ${error.message || ''}`.trim() : 'Unknown error';
        showToast('Failed to save message: ' + emsg, 'error', 7000);
    } finally {
        elements.contactSubmit.classList.remove('loading');
        elements.contactSubmit.disabled = false;
    }
}

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
    // ESC key closes modals
    if (e.key === 'Escape') {
        if (elements.loginModal.classList.contains('active')) {
            closeLoginModal();
        }
        if (elements.achievementModal.classList.contains('active')) {
            closeAchievementModal();
        }
        if (elements.contactModal?.classList.contains('active')) {
            closeContactModal();
        }
    }
});

// File end
}

// Generate base64 data URL with size constraints to avoid Firestore 1MiB document limit
async function generateSafeBase64(file) {
    if (!file) return null;
    // Try progressive downscales/quality until under target length
    const targets = [
        { w: 1200, h: 1200, q: 0.82 },
        { w: 1000, h: 1000, q: 0.78 },
        { w: 800,  h: 800,  q: 0.72 },
        { w: 640,  h: 640,  q: 0.68 }
    ];
    const maxLen = 600_000; // characters in data URL (roughly <600KB)
    for (const t of targets) {
        try {
            const dataUrl = await resizeFileToBase64(file, t.w, t.h, t.q, 'image/jpeg');
            if (!dataUrl || typeof dataUrl !== 'string') continue;
            if (dataUrl.length <= maxLen) return dataUrl;
        } catch (e) { /* try next */ }
    }
    // Fallback to direct base64; may still be large but better than failing silently
    try { return await fileToBase64(file); } catch { return null; }
}

// Remove undefined/null fields to satisfy Firestore data validation
function cleanPayload(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const out = Array.isArray(obj) ? [] : {};
    Object.entries(obj).forEach(([k, v]) => {
        if (v === undefined || v === null || Number.isNaN(v)) return;
        if (typeof v === 'object' && !(v instanceof Date)) {
            const nested = cleanPayload(v);
            if (nested !== undefined) out[k] = nested;
        } else {
            out[k] = v;
        }
    });
    return out;
}