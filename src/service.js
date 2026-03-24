async function callAuthEndpoint(path, method, email, password) {
    const response = await fetch(`/api/auth/${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json().catch(() => ({}))
        : {};

    const textBody = payload.msg ? '' : await response.text().catch(() => '');
    if (!response.ok) {
        throw new Error(payload.msg || textBody || `Authentication request failed (${response.status})`);
    }

    return payload;
}

export async function registerUser(email, password) {
    return callAuthEndpoint('create', 'POST', email, password);
}

export async function loginUser(email, password) {
    return callAuthEndpoint('login', 'POST', email, password);
}

export async function logoutUser() {
    const response = await fetch('/api/auth/logout', {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!response.ok && response.status !== 204) {
        throw new Error('Logout failed');
    }
}

export async function searchYouTube(query) {
    const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.msg || `YouTube search failed (${response.status})`);
    }

    return payload.items || [];
}

export async function getQueueSongs() {
    const response = await fetch('/api/queue', {
        credentials: 'include',
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.msg || `Queue fetch failed (${response.status})`);
    }

    return payload.items || [];
}

export async function addQueueSong(song) {
    const response = await fetch('/api/queue', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(song),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.msg || `Queue add failed (${response.status})`);
    }

    return payload.item;
}

export async function deleteQueueSong(songId) {
    const response = await fetch(`/api/queue/${encodeURIComponent(songId)}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.msg || `Queue delete failed (${response.status})`);
    }
}

export async function toggleQueueSongLike(songId) {
    const response = await fetch(`/api/queue/${encodeURIComponent(songId)}/like`, {
        method: 'POST',
        credentials: 'include',
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.msg || `Queue like failed (${response.status})`);
    }

    return payload.item;
}