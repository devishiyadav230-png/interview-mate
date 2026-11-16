// Backend URL. Served by FastAPI on port 8000 -> same origin (empty string).
// Opened separately (Live Server etc.) -> local backend.
// After deploying the backend, set this to its https URL, e.g. 'https://your-api.onrender.com'
window.API_BASE = location.port === '8000' ? '' : 'http://127.0.0.1:8000';
