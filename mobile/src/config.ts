// In production these come from a build-time env (react-native-config) per
// flavor (dev/staging/prod) — hardcoded here for clarity since this app has
// no build pipeline configured yet.
//
// Points at the Render deployment (see render.yaml) so a built APK works off
// your LAN — confirm this matches the URL Render actually assigned the
// "easysociety-backend" service before building, and update if it differs.
//
// For local development against `npm run dev` in backend/, swap these back
// to your machine's LAN IP (e.g. 'http://192.168.0.147:4000') before
// running `expo start`.
export const API_BASE_URL = 'https://easysociety-backend.onrender.com';
export const SOCKET_BASE_URL = 'https://easysociety-backend.onrender.com';
