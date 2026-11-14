// App-wide settings shared by the web app, the Node relay and the Cloudflare Worker.

export const APP_NAME = 'Veyra';

/** Port of the local relay (`npm run dev`, `npm start`). The Vite dev server runs on 5273. */
export const RELAY_PORT = 8788;

/** Prefix of everything the web app keeps in localStorage (public/theme-init.js repeats it). */
export const STORAGE_PREFIX = 'veyra.';

/** Contact codes look like `veyra:<handle>:<public key>`. */
export const CONTACT_CODE_PREFIX = 'veyra';
