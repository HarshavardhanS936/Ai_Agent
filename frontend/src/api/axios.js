import axios from 'axios';

// Create an axios instance pointing to PythonAnywhere backend
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://hv9306.pythonanywhere.com',
});

export default api;
