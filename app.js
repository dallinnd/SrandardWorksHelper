// --- CONFIGURATION ---
const BOOKS_CONFIG = [
    { 
        id: 'ot', name: 'Old Testament', file: 'standard_works.txt',
        books: new Set(["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi"])
    },
    { 
        id: 'nt', name: 'New Testament', file: 'standard_works.txt',
        books: new Set(["Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"])
    },
    { 
        id: 'bom', name: 'Book of Mormon', file: 'standard_works.txt',
        books: new Set(["1 Nephi", "2 Nephi", "Jacob", "Enos", "Jarom", "Omni", "Words of Mormon", "Mosiah", "Alma", "Helaman", "3 Nephi", "4 Nephi", "Mormon", "Ether", "Moroni"])
    },
    { 
        id: 'dc', name: 'D&C', file: 'standard_works.txt',
        books: new Set(["Doctrine and Covenants", "Section", "D&C"])
    },
    { 
        id: 'pgp', name: 'Pearl of GP', file: 'standard_works.txt',
        books: new Set(["Moses", "Abraham", "Joseph Smith—Matthew", "Joseph Smith—History", "Articles of Faith"])
    }
];

// Global State
let allVerses = [];
let uniqueWords = [];
let chapterList = [];
let activeCategories = new Set(BOOKS_CONFIG.map(b => b.id)); 
let legalTextContent = "Standard Works Data.";
let currentSearchResults = [];
let renderedCount = 0;
const BATCH_SIZE = 50;
let currentChapterIndex = -1;

// --- INITIALIZATION (The Fix) ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Settings & Themes
    initSettings();
    
    // 2. Initialize UI Event Listeners (Search, Filters, Modals)
    initUI();

    // 3. Load Data
    await loadAllBooks();
});

// --- UI SETUP ---
function initSettings() {
    // Load saved theme
    const savedTheme = localStorage.getItem('app_theme') || 'theme-light-blue';
    document.body.className = savedTheme;

    // Attach Theme Button Listeners
    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
        btn.onclick = () => {
            const theme = btn.getAttribute('data-theme');
            document.body.className = theme;
            localStorage.setItem('app_theme', theme);
        };
    });

    // Settings Modal Toggles
    const settingsBtn = document.getElementById('settings-btn');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsCloseBtn = document.querySelector('.settings-close');

    if(settingsBtn) {
        settingsBtn.onclick = () => settingsOverlay.classList.remove('hidden');
    }
    if(settingsCloseBtn) {
        settingsCloseBtn.onclick = () => settingsOverlay.classList.add('hidden');
    }
    if(settingsOverlay) {
        settingsOverlay.onclick = (e) => { 
            if (e.target === settingsOverlay) settingsOverlay.classList.add('hidden'); 
        };
    }
}

function initUI() {
    // Search Inputs
    const input = document.getElementById('search-input');
    const sendBtn = document.getElementById('send-btn');
    
    input.addEventListener('input', handleSuggestions);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(input.value); });
    sendBtn.addEventListener('click', () => performSearch(input.value));

    // Filters
    renderFilters();

    // Main Modal Close Logic
    const modalOverlay = document.getElementById('modal-overlay');
    const mainCloseBtn = document.querySelector('.main-close');
    
    if(mainCloseBtn) {
        mainCloseBtn.onclick = () => modalOverlay.classList.add('hidden');
    }
    if(modalOverlay) {
        modalOverlay.onclick = (e) => { 
            if (e.target === modalOverlay) modalOverlay.classList.add('hidden'); 
        };
    }

    // Swipe Gestures (Attached to Content Card)
    const modalContent = document.querySelector('.modal-content');
    let touchStartX = 0;
    
    if(modalContent) {
        modalContent.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, {passive: true});

        modalContent.addEventListener('touchend', (e) => {
            const nextBtn = document.getElementById('next-chapter-btn');
            // Only swipe if we are in "Chapter View" (arrows visible)
            if (nextBtn && nextBtn.classList.contains('hidden')) return;
            
            const touchEndX = e.changedTouches[0].screenX;
            const dist = touchStartX - touchEndX;
            
            if (dist > 50) navigateChapter(1); // Swipe Left -> Next
            else if (dist < -50) navigateChapter(-1); // Swipe Right -> Prev
        }, {passive: true});
    }

    // Legal Link
    const legalLink = document.getElementById('legal-link');
    if(legalLink) {
        legalLink.onclick = (e) => { 
            e.preventDefault(); 
            openPopup("Legal Disclosure", legalTextContent); 
        };
    }

    // Nav Buttons
    const prevBtn = document.getElementById('prev-chapter-btn');
    const nextBtn = document.getElementById('next-chapter-btn');
    if(prevBtn) prevBtn.onclick = () => navigateChapter(-1);
    if(nextBtn) nextBtn.onclick = () => navigateChapter(1);
}

// --- CORE LOGIC ---

function renderFilters() {
    const filtersContainer = document.getElementById('category-filters');
    const input = document.getElementById('search-input');
    
    filtersContainer.innerHTML = '';
    BOOKS_CONFIG.forEach(book => {
        const btn = document.createElement('button');
        btn.className = `filter-chip ${activeCategories.has(book.id) ? 'active' : ''}`;
        btn.innerText = book.name;
        btn.onclick = () => {
            if (activeCategories.has(book.id)) {
                activeCategories.delete(book.id);
                btn.classList.remove('active');
            } else {
                activeCategories.add(book.id);
                btn.classList.add('active');
            }
            if (input.value.length > 2) performSearch(input.value);
        };
        filtersContainer.appendChild(btn);
    });
}

async function loadAllBooks() {
    updateStatus("Loading Library...");
    allVerses = [];
    let tempWords = new Set();
    let tempChapters = new Set();
    const loadedFiles = {}; 

    const uniqueFiles = [...new Set(BOOKS_CONFIG.map(b => b.file))];
    await Promise.all(uniqueFiles.map(async (filename) => {
        try {
            const response = await fetch(filename);
            if (response.ok) loadedFiles[filename] = await response.text();
        } catch (e) { console.warn(`Failed to load ${filename}`, e); }
    }));

    BOOKS_CONFIG.forEach(config => {
        const text = loadedFiles[config.file];
        if (text) parseBookText(text, config, tempWords, tempChapters);
    });

    uniqueWords = Array.from(tempWords).sort();
    chapterList = Array.from(tempChapters);
    
    if (allVerses.length === 0) updateStatus("Error: standard_works.txt not found.");
    else updateStatus("Ready to search.");
}

function parseBookText(fullText, config, wordSet, chapterSet) {
    const allLines = fullText.split(/\r?\n/);
    const lineRegex = /^((?:[1-4]\s)?[A-Za-z\s]+\d+:\d+)\s+(.*)$/;

    allLines.forEach((line) => {
        const cleanLine = line.trim();
        if (!cleanLine) return;
        const match = cleanLine.match(lineRegex);
        
        if (match) {
            const reference = match[1].trim(); 
            const text = match[2].trim();
            
            let shouldInclude = false;
            if (config.books) {
                for (const bookName of config.books) {
                    if (reference.startsWith(bookName + " ")) {
                        shouldInclude = true;
                        break;
                    }
                }
            } else { shouldInclude = true; } 

            if (shouldInclude) {
                const lastColonIndex = reference.lastIndexOf(':');
                const chapterId = reference.substring(0, lastColonIndex).trim();

                allVerses.push({
                    id: allVerses.length, source: config.id,
                    ref: reference, text: text, chapterId: chapterId
                });
                chapterSet.add(chapterId);

                const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g);
                if (words) words.forEach(w => wordSet.add(w));
            }
        }
    });
}

// --- SEARCH & SUGGESTIONS ---

function handleSuggestions(e) {
    const val = e.target.value.toLowerCase();
    const suggestionsArea = document.getElementById('suggestions-area');
    const input = document.getElementById('search-input');
    
    suggestionsArea.innerHTML = '';
    if (val.length < 2) return;

    const matches = uniqueWords.filter(w => w.startsWith(val)).slice(0, 15);
    matches.forEach(word => {
        const pill = document.createElement('div');
        pill.className = 'pill'; pill.innerText = word;
        pill.onclick = () => { input.value = word; suggestionsArea.innerHTML = ''; performSearch(word); };
        suggestionsArea.appendChild(pill);
    });
}

function performSearch(query) {
    const resultsArea = document.getElementById('results-area');
    if (!query) return;
    resultsArea.innerHTML = '';
    const q = query.toLowerCase();
    
    currentSearchResults = allVerses.filter(v => activeCategories.has(v.source) && v.text.toLowerCase().includes(q));

    if (currentSearchResults.length === 0) { 
        resultsArea.innerHTML = '<div class="placeholder-msg">No matches found.</div>'; 
        return; 
    }

    renderedCount = 0;
    renderNextBatch(q);
}

function renderNextBatch(highlightQuery) {
    const resultsArea = document.getElementById('results-area');
    const start = renderedCount;
    const end = Math.min(renderedCount + BATCH_SIZE, currentSearchResults.length);
    const batch = currentSearchResults.slice(start, end);

    const existingBtn = document.getElementById('load-more-btn');
    if (existingBtn) existingBtn.remove();

    batch.forEach(verse => {
        const box = document.createElement('div'); box.className = 'verse-box';
        const snippet = verse.text.replace(new RegExp(`(${highlightQuery})`, 'gi'), '<b style="color:var(--primary);">$1</b>');
        const sourceBadge = BOOKS_CONFIG.find(b => b.id === verse.source).name;

        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="verse-ref">${verse.ref}</span>
                <span style="font-size:0.7rem; color:var(--text-light); border:1px solid var(--border); padding:2px 6px; border-radius:4px;">${sourceBadge}</span>
            </div>
            <div class="verse-snippet">${snippet}</div>`;
        box.onclick = () => openPopup(verse);
        resultsArea.appendChild(box);
    });

    renderedCount = end;

    if (renderedCount < currentSearchResults.length) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'load-more-btn';
        loadMoreBtn.innerText = `Load More (${currentSearchResults.length - renderedCount} remaining)`;
        loadMoreBtn.style.cssText = "width:100%; padding:15px; margin-top:10px; background:var(--bg); border:1px solid var(--border); border-radius:12px; color:var(--primary); font-weight:600; cursor:pointer;";
        loadMoreBtn.onclick = () => renderNextBatch(highlightQuery);
        resultsArea.appendChild(loadMoreBtn);
    }
}

function updateStatus(msg) {
    const el = document.querySelector('.placeholder-msg');
    if(el) el.innerText = msg;
}

// --- MODAL & NAV ---

function openPopup(verseOrTitle, textIfRef) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalRef = document.querySelector('.modal-ref');
    const modalText = document.getElementById('modal-text');
    const prevBtn = document.getElementById('prev-chapter-btn');
    const nextBtn = document.getElementById('next-chapter-btn');
    const modalFooter = document.querySelector('.modal-footer') || createModalFooter();

    modalOverlay.classList.remove('hidden'); 
    modalFooter.innerHTML = '';
    
    // Hide arrows by default (Search View)
    if(prevBtn) prevBtn.classList.add('hidden');
    if(nextBtn) nextBtn.classList.add('hidden');
    
    if (typeof verseOrTitle === 'string') { 
        // Simple Text (Legal)
        modalRef.innerText = verseOrTitle; 
        modalText.innerText = textIfRef; 
        return; 
    }

    // Verse Object
    const verse = verseOrTitle; 
    modalRef.innerText = verse.ref; 
    modalText.innerText = verse.text; 
    modalText.scrollTop = 0;
    
    // Create Chapter Button
    const chapterBtn = document.createElement('button'); 
    chapterBtn.className = 'action-btn';
    chapterBtn.innerText = `View Chapter (${verse.chapterId})`; 
    chapterBtn.onclick = () => viewChapter(verse.chapterId);
    modalFooter.appendChild(chapterBtn);
}

function viewChapter(chapterId) {
    currentChapterIndex = chapterList.indexOf(chapterId); 
    if (currentChapterIndex === -1) return;
    
    loadChapterContent(chapterId);
    
    // Show arrows
    document.getElementById('prev-chapter-btn').classList.remove('hidden');
    document.getElementById('next-chapter-btn').classList.remove('hidden');
    
    updateNavButtons();
    document.querySelector('.modal-footer').innerHTML = '';
}

function loadChapterContent(chapterId) {
    const modalRef = document.querySelector('.modal-ref');
    const modalText = document.getElementById('modal-text');
    
    const chapterVerses = allVerses.filter(v => v.chapterId === chapterId);
    const fullText = chapterVerses.map(v => {
        const parts = v.ref.split(':'); const num = parts.length > 1 ? parts[1].trim() : '';
        return num ? `<b>${num}</b> ${v.text}` : v.text;
    }).join('\n\n');
    
    modalRef.innerText = chapterId; 
    modalText.innerHTML = fullText; 
    modalText.scrollTop = 0;
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prev-chapter-btn');
    const nextBtn = document.getElementById('next-chapter-btn');
    prevBtn.style.opacity = currentChapterIndex <= 0 ? '0.3' : '1';
    nextBtn.style.opacity = currentChapterIndex >= chapterList.length - 1 ? '0.3' : '1';
}

function navigateChapter(d) {
    const newIdx = currentChapterIndex + d;
    if (newIdx >= 0 && newIdx < chapterList.length) {
        currentChapterIndex = newIdx;
        const modalText = document.getElementById('modal-text');
        modalText.style.opacity = 0;
        setTimeout(() => { 
            loadChapterContent(chapterList[newIdx]); 
            updateNavButtons(); 
            modalText.style.opacity = 1; 
        }, 150);
    }
}
