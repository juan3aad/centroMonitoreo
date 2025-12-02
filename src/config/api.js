const useMock = import.meta.env.VITE_USE_MOCK_API === 'true';
const mockApi = '/mock';

console.log('DEBUG: VITE_USE_MOCK_API from .env:', import.meta.env.VITE_USE_MOCK_API);
console.log('DEBUG: useMock (evaluated):', useMock);

export const API = useMock ? mockApi : import.meta.env.VITE_API;

console.log('DEBUG: Final API base URL:', API);