import axios from 'axios';

// Create an axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '', // Default to relative path if not set (for local dev)
});

export default api;
