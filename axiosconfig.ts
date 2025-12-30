import axios from "axios";

// Use environment variable for API base URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                     import.meta.env.VITE_APP_BASE_URL || 
                     "https://9rx.mahitechnocrafts.in";

const instance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 30000, // 30 second timeout
});

// Add response interceptor for better error handling
instance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ECONNABORTED') {
            console.error('Request timeout');
        }
        return Promise.reject(error);
    }
);

export default instance;

