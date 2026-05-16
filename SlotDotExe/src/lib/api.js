const DEFAULT_API_BASE_URL = 'https://slotdotexe.onrender.com';

const normalizeBaseUrl = (value) => {
	const raw = String(value || '').trim();
	if (!raw) return '';
	return raw.endsWith('/') ? raw.slice(0, -1) : raw;
};

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL) || DEFAULT_API_BASE_URL;

export const apiUrl = (path) => {
	const p = String(path || '');
	if (!p) return API_BASE_URL;
	return `${API_BASE_URL}${p.startsWith('/') ? p : `/${p}`}`;
};

export const apiFetch = (path, options) => fetch(apiUrl(path), options);

export const sendChatMessage = async (message, history = []) => {
    try {
        const response = await apiFetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message, history })
        });
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        return await response.json();
    } catch (error) {
        console.error('Error sending chat message:', error);
        throw error;
    }
};
