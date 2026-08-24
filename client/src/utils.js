//export const API_BASE_URL = 'https://localhost:8443';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.4.14/+esm';
export const API_BASE_URL = 'http://localhost:8080';

export function getApiUrl() {
    return API_BASE_URL;
}

export function sanitizeHtml(input) {
    return DOMPurify.sanitize(input);
}

export function logError(context, error) {
    console.error(`[${context}]`, error);
}

export function setupSecurityHeaders() {

}