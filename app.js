'use strict';

// ══════════════════════════════════════════════════
//  Storage
// ══════════════════════════════════════════════════
const STORAGE_KEY = 'pmdb_v1';

function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { profiles: [], posts: [] };
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

let appData = loadData();

// ══════════════════════════════════════════════════
//  State
// ══════════════════════════════════════════════════
const state = {
    platformFilter: 'all',
    profileFilter: null,
    viewMode: 'gallery',
    sort: 'newest',
};

// ══════════════════════════════════════════════════
//  URL Parsing
// ══════════════════════════════════════════════════
function parsePostUrl(raw) {
    const url = raw.trim();

    // Instagram: /p/, /reel/, /tv/
    const igMatch = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (igMatch) {
        const type = igMatch[1];
        const code = igMatch[2];
        return {
            platform: 'instagram',
            embedUrl: `https://www.instagram.com/${type}/${code}/embed/`,
            embedHeight: 560,
        };
    }

    // TikTok: /@user/video/ID or /video/ID
    const ttMatch = url.match(/tiktok\.com\/(?:@[^/]+\/video|video)\/(\d+)/);
    if (ttMatch) {
        return {
            platform: 'tiktok',
            embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}`,
            embedHeight: 700,
        };
    }

    return null;
}

// ══════════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════════
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function platformLabel(p) { return p === 'instagram' ? 'Instagram' : 'TikTok'; }

// ══════════════════════════════════════════════════
//  Toast
// ══════════════════════════════════════════════════
function toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => {
        el.classList.add('removing');
        setTimeout(() => el.remove(), 350);
    }, 3200);
}

// ══════════════════════════════════════════════════
//  Modal
// ══════════════════════════════════════════════════
function openModal(id) {
    document.getElementById(id).classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    document.body.style.overflow = '';
}

// ══════════════════════════════════════════════════
//  Sidebar (mobile toggle)
// ══════════════════════════════════════════════════
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const open = sidebar.classList.toggle('open');
    overlay.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
}

function closeSidebarIfMobile() {
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('open');
        document.body.style.overflow = '';
    }
}

// ══════════════════════════════════════════════════
//  Render: Stats Bar
// ══════════════════════════════════════════════════
function renderStats() {
    const { profiles, posts } = appData;
    const igP = profiles.filter(p => p.platform === 'instagram').length;
    const ttP = profiles.filter(p => p.platform === 'tiktok').length;
    const igPosts = posts.filter(p => p.platform === 'instagram').length;
    const ttPosts = posts.filter(p => p.platform === 'tiktok').length;

    document.getElementById('statsBar').innerHTML = `
        <div class="stat-chip">
            <div class="stat-chip-dot all"></div>
            <span class="stat-chip-value">${profiles.length}</span>
            <span class="stat-chip-label">perfis</span>
        </div>
        <div class="stat-chip">
            <div class="stat-chip-dot ig"></div>
            <span class="stat-chip-value">${igP}</span>
            <span class="stat-chip-label">IG</span>
            <span class="stat-chip-label">·</span>
            <span class="stat-chip-value">${igPosts}</span>
            <span class="stat-chip-label">posts</span>
        </div>
        <div class="stat-chip">
            <div class="stat-chip-dot tt"></div>
            <span class="stat-chip-value">${ttP}</span>
            <span class="stat-chip-label">TT</span>
            <span class="stat-chip-label">·</span>
            <span class="stat-chip-value">${ttPosts}</span>
            <span class="stat-chip-label">posts</span>
        </div>
    `;
}

// ══════════════════════════════════════════════════
//  Render: Profiles Sidebar
// ══════════════════════════════════════════════════
function renderProfiles() {
    const { profiles, posts } = appData;
    const list = document.getElementById('profilesList');

    let visible = profiles;
    if (state.platformFilter !== 'all') {
        visible = profiles.filter(p => p.platform === state.platformFilter);
    }

    if (visible.length === 0) {
        list.innerHTML = `
            <div class="sidebar-empty">
                <div class="sidebar-empty-icon">👤</div>
                ${state.platformFilter === 'all'
                    ? 'Nenhum perfil adicionado ainda.<br>Clique em <strong>+ Adicionar Perfil</strong>.'
                    : `Nenhum perfil de ${platformLabel(state.platformFilter)} encontrado.`}
            </div>`;
        return;
    }

    list.innerHTML = visible.map(profile => {
        const count = posts.filter(p => p.profileId === profile.id).length;
        const isActive = state.profileFilter === profile.id;
        const activeClass = isActive
            ? (profile.platform === 'instagram' ? 'active-ig' : 'active-tt')
            : '';

        return `
        <div class="profile-item ${activeClass}" data-profile-id="${profile.id}">
            <div class="profile-avatar ${profile.platform}">${initials(profile.name)}</div>
            <div class="profile-info">
                <div class="profile-name">${escHtml(profile.name)}</div>
                <div class="profile-username">@${escHtml(profile.username)}</div>
                ${profile.party ? `<div class="profile-party">${escHtml(profile.party)}</div>` : ''}
            </div>
            <div class="profile-meta">
                <span class="platform-badge ${profile.platform}">${profile.platform === 'instagram' ? 'IG' : 'TT'}</span>
                <span class="post-count-badge">${count}</span>
            </div>
            <div class="profile-actions">
                <button class="icon-btn" title="Adicionar post" onclick="openAddPost('${profile.id}',event)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <button class="icon-btn danger" title="Remover perfil" onclick="deleteProfile('${profile.id}',event)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
            </div>
        </div>`;
    }).join('');

    // Click to filter
    list.querySelectorAll('.profile-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.dataset.profileId;
            state.profileFilter = state.profileFilter === id ? null : id;
            closeSidebarIfMobile();
            render();
        });
    });
}

// ══════════════════════════════════════════════════
//  Render: Active Filters
// ══════════════════════════════════════════════════
function renderActiveFilters() {
    const container = document.getElementById('activeFilters');
    const chips = [];

    if (state.platformFilter !== 'all') {
        const icon = state.platformFilter === 'instagram' ? '📸' : '🎵';
        chips.push(`
            <div class="filter-chip">
                ${icon} ${platformLabel(state.platformFilter)}
                <button onclick="clearPlatformFilter()" title="Remover filtro">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>`);
    }

    if (state.profileFilter) {
        const profile = appData.profiles.find(p => p.id === state.profileFilter);
        if (profile) {
            chips.push(`
                <div class="filter-chip">
                    👤 ${escHtml(profile.name)}
                    <button onclick="clearProfileFilter()" title="Remover filtro">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>`);
        }
    }

    container.innerHTML = chips.join('');
    container.style.display = chips.length ? 'flex' : 'none';
}

function clearPlatformFilter() {
    state.platformFilter = 'all';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.platform === 'all'));
    render();
}

function clearProfileFilter() {
    state.profileFilter = null;
    render();
}

// ══════════════════════════════════════════════════
//  Render: Gallery
// ══════════════════════════════════════════════════
function renderGallery() {
    const { profiles, posts } = appData;
    const gallery = document.getElementById('postsGallery');
    const emptyState = document.getElementById('emptyState');

    let filtered = [...posts];

    if (state.platformFilter !== 'all') {
        filtered = filtered.filter(p => p.platform === state.platformFilter);
    }
    if (state.profileFilter) {
        filtered = filtered.filter(p => p.profileId === state.profileFilter);
    }

    // Sort
    if (state.sort === 'newest') {
        filtered.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    } else if (state.sort === 'oldest') {
        filtered.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));
    } else if (state.sort === 'profile') {
        filtered.sort((a, b) => {
            const pa = profiles.find(p => p.id === a.profileId)?.name || '';
            const pb = profiles.find(p => p.id === b.profileId)?.name || '';
            return pa.localeCompare(pb, 'pt-BR');
        });
    } else if (state.sort === 'platform') {
        filtered.sort((a, b) => a.platform.localeCompare(b.platform));
    }

    gallery.className = `gallery${state.viewMode === 'list' ? ' list-view' : ''}`;

    if (filtered.length === 0) {
        gallery.innerHTML = '';
        gallery.style.display = 'none';
        emptyState.style.display = 'flex';
        updateEmptyState();
        return;
    }

    gallery.style.display = '';
    emptyState.style.display = 'none';

    gallery.innerHTML = filtered.map(post => {
        const profile = profiles.find(p => p.id === post.profileId);
        if (!profile) return '';
        return buildPostCard(post, profile);
    }).join('');
}

function buildPostCard(post, profile) {
    const loaderId = `loader-${post.id}`;
    return `
    <div class="post-card ${post.platform}" data-post-id="${post.id}">
        <div class="post-card-header">
            <div class="post-profile-left">
                <div class="post-avatar ${post.platform}">${initials(profile.name)}</div>
                <div class="post-profile-info">
                    <div class="post-profile-name">${escHtml(profile.name)}</div>
                    <div class="post-profile-username">@${escHtml(profile.username)}</div>
                </div>
            </div>
            <div class="post-card-controls">
                <a href="${escHtml(post.url)}" target="_blank" rel="noopener noreferrer"
                   class="icon-btn" title="Abrir post original">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
                <button class="icon-btn danger" title="Remover post" onclick="deletePost('${post.id}')">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
            </div>
        </div>
        <div class="post-embed-container" style="min-height:${post.embedHeight}px">
            <div class="embed-loading" id="${loaderId}">
                <div class="embed-loading-spinner"></div>
                <span>Carregando ${platformLabel(post.platform)}...</span>
            </div>
            <iframe
                src="${escHtml(post.embedUrl)}"
                height="${post.embedHeight}"
                loading="lazy"
                scrolling="no"
                frameborder="0"
                allowtransparency="true"
                allow="encrypted-media; autoplay"
                title="Post de ${escHtml(profile.name)}"
                onload="document.getElementById('${loaderId}').style.display='none'"
                style="position:relative;z-index:1"
            ></iframe>
        </div>
        <div class="post-card-footer">
            ${post.notes ? `<div class="post-notes-text">${escHtml(post.notes)}</div>` : ''}
            <div class="post-footer-meta">
                <span class="post-date">Adicionado em ${fmtDate(post.addedAt)}</span>
                <span class="platform-badge ${post.platform}">${platformLabel(post.platform)}</span>
            </div>
        </div>
    </div>`;
}

function updateEmptyState() {
    const { profiles, posts } = appData;
    const icon   = document.getElementById('emptyIcon');
    const title  = document.getElementById('emptyTitle');
    const msg    = document.getElementById('emptyMessage');
    const steps  = document.getElementById('onboardingSteps');
    const addPost = document.getElementById('emptyAddPostBtn');

    if (profiles.length === 0) {
        icon.textContent  = '🏛️';
        title.textContent = 'Bem-vindo ao Political Media Dashboard';
        msg.textContent   = 'Monitore e compare o conteúdo de políticos no Instagram e TikTok para benchmarking.';
        steps.style.display = 'flex';
        addPost.style.display = 'none';
    } else if (posts.length === 0) {
        icon.textContent  = '📎';
        title.textContent = 'Perfis adicionados — agora adicione posts';
        msg.textContent   = 'Cole a URL de posts do Instagram ou TikTok para começar a visualizar o conteúdo.';
        steps.style.display = 'none';
        addPost.style.display = 'flex';
    } else {
        icon.textContent  = '🔍';
        title.textContent = 'Nenhum post neste filtro';
        msg.textContent   = 'Tente remover os filtros ativos ou adicionar posts para os perfis selecionados.';
        steps.style.display = 'none';
        addPost.style.display = 'flex';
    }
}

// ══════════════════════════════════════════════════
//  Render: All
// ══════════════════════════════════════════════════
function render() {
    renderStats();
    renderProfiles();
    renderActiveFilters();
    renderGallery();
}

// ══════════════════════════════════════════════════
//  Actions: Profile
// ══════════════════════════════════════════════════
function deleteProfile(id, event) {
    event.stopPropagation();
    const profile = appData.profiles.find(p => p.id === id);
    if (!profile) return;
    if (!confirm(`Remover o perfil "${profile.name}" e todos os ${appData.posts.filter(p => p.profileId === id).length} posts associados?`)) return;
    appData.profiles = appData.profiles.filter(p => p.id !== id);
    appData.posts    = appData.posts.filter(p => p.profileId !== id);
    if (state.profileFilter === id) state.profileFilter = null;
    saveData();
    render();
    toast(`Perfil "${profile.name}" removido`);
}

// ══════════════════════════════════════════════════
//  Actions: Post
// ══════════════════════════════════════════════════
function openAddPost(profileId, event) {
    if (event) event.stopPropagation();
    populateProfileSelect(profileId);
    openModal('postModal');
}

function deletePost(id) {
    if (!confirm('Remover este post da galeria?')) return;
    appData.posts = appData.posts.filter(p => p.id !== id);
    saveData();
    render();
    toast('Post removido');
}

function populateProfileSelect(selectedId) {
    const select = document.getElementById('postProfile');
    select.innerHTML = appData.profiles.map(p =>
        `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>
            ${p.platform === 'instagram' ? '📸' : '🎵'} ${escHtml(p.name)} (@${escHtml(p.username)})
        </option>`
    ).join('');
}

// ══════════════════════════════════════════════════
//  Escape HTML
// ══════════════════════════════════════════════════
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ══════════════════════════════════════════════════
//  DOMContentLoaded
// ══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

    // ── Platform tab buttons ───────────────────────
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'active-ig', 'active-tt'));
            const p = btn.dataset.platform;
            btn.classList.add('active', p === 'instagram' ? 'active-ig' : p === 'tiktok' ? 'active-tt' : '');
            state.platformFilter = p;
            state.profileFilter = null;
            render();
        });
    });

    // ── View mode ──────────────────────────────────
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.viewMode = btn.dataset.view;
            render();
        });
    });

    // ── Sort ───────────────────────────────────────
    document.getElementById('sortSelect').addEventListener('change', e => {
        state.sort = e.target.value;
        render();
    });

    // ── Header: Add Profile ────────────────────────
    document.getElementById('addProfileBtn').addEventListener('click', () => openModal('profileModal'));
    document.getElementById('sidebarAddProfileBtn').addEventListener('click', () => {
        closeSidebarIfMobile();
        openModal('profileModal');
    });

    // ── Header: Add Post ───────────────────────────
    document.getElementById('addPostBtn').addEventListener('click', () => {
        if (appData.profiles.length === 0) {
            toast('Adicione um perfil primeiro', 'error');
            return;
        }
        populateProfileSelect(appData.profiles[0].id);
        openModal('postModal');
    });

    // ── Empty state buttons ────────────────────────
    document.getElementById('emptyAddProfileBtn').addEventListener('click', () => openModal('profileModal'));
    document.getElementById('emptyAddPostBtn').addEventListener('click', () => {
        if (appData.profiles.length === 0) {
            toast('Adicione um perfil primeiro', 'error');
            return;
        }
        populateProfileSelect(appData.profiles[0].id);
        openModal('postModal');
    });

    // ── Platform option toggle (in modal) ─────────
    document.querySelectorAll('.platform-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.platform-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('selectedPlatform').value = btn.dataset.platform;
        });
    });

    // ── URL live preview ───────────────────────────
    document.getElementById('postUrl').addEventListener('input', e => {
        const preview = document.getElementById('urlPreview');
        const icon    = document.getElementById('urlPreviewIcon');
        const text    = document.getElementById('urlPreviewText');
        const parsed  = parsePostUrl(e.target.value);
        if (parsed) {
            icon.textContent = parsed.platform === 'instagram' ? '📸' : '🎵';
            text.textContent = `URL de ${platformLabel(parsed.platform)} válida ✓`;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    });

    // ── Profile Form Submit ────────────────────────
    document.getElementById('profileForm').addEventListener('submit', e => {
        e.preventDefault();

        let username = document.getElementById('profileUsername').value.trim();
        if (username.startsWith('@')) username = username.slice(1);
        const name     = document.getElementById('profileName').value.trim();
        const platform = document.getElementById('selectedPlatform').value;
        const party    = document.getElementById('profileParty').value.trim();

        if (!name || !username) return;

        // Prevent duplicate same platform+username
        const dup = appData.profiles.find(
            p => p.platform === platform && p.username.toLowerCase() === username.toLowerCase()
        );
        if (dup) {
            toast(`@${username} no ${platformLabel(platform)} já existe`, 'error');
            return;
        }

        appData.profiles.push({
            id: uid(), name, platform, username, party,
            addedAt: new Date().toISOString(),
        });
        saveData();
        closeModal('profileModal');
        e.target.reset();
        resetPlatformOptions();
        render();
        toast(`Perfil "${name}" adicionado!`);
    });

    // ── Post Form Submit ───────────────────────────
    document.getElementById('postForm').addEventListener('submit', e => {
        e.preventDefault();

        const profileId = document.getElementById('postProfile').value;
        const url       = document.getElementById('postUrl').value.trim();
        const notes     = document.getElementById('postNotes').value.trim();

        const parsed = parsePostUrl(url);
        if (!parsed) {
            toast('URL inválida. Use links do Instagram (instagram.com/p/...) ou TikTok.', 'error');
            return;
        }

        // Prevent exact duplicate
        if (appData.posts.some(p => p.embedUrl === parsed.embedUrl)) {
            toast('Este post já foi adicionado à galeria.', 'error');
            return;
        }

        // Validate platform matches profile
        const profile = appData.profiles.find(p => p.id === profileId);
        if (profile && profile.platform !== parsed.platform) {
            toast(`A URL é de ${platformLabel(parsed.platform)}, mas o perfil é de ${platformLabel(profile.platform)}.`, 'error');
            return;
        }

        appData.posts.push({
            id: uid(), profileId, url,
            platform: parsed.platform,
            embedUrl: parsed.embedUrl,
            embedHeight: parsed.embedHeight,
            notes,
            addedAt: new Date().toISOString(),
        });
        saveData();
        closeModal('postModal');
        e.target.reset();
        document.getElementById('urlPreview').style.display = 'none';
        render();
        toast('Post adicionado à galeria!');
    });

    // ── Keyboard: Escape ───────────────────────────
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.open').forEach(m => {
                m.classList.remove('open');
                document.body.style.overflow = '';
            });
            // Also close mobile sidebar
            const sidebar = document.getElementById('sidebar');
            if (sidebar.classList.contains('open')) toggleSidebar();
        }
    });

    // ── Initial render ─────────────────────────────
    render();
});

// ══════════════════════════════════════════════════
//  Helpers (global)
// ══════════════════════════════════════════════════
function resetPlatformOptions() {
    document.querySelectorAll('.platform-option').forEach(b => b.classList.remove('active'));
    const igBtn = document.querySelector('.platform-option[data-platform="instagram"]');
    if (igBtn) igBtn.classList.add('active');
    const field = document.getElementById('selectedPlatform');
    if (field) field.value = 'instagram';
}
