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