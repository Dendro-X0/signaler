import * as universal from '../entries/pages/_page.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+page.ts";
export const imports = ["_app/immutable/nodes/2.ZPJxX_gS.js","_app/immutable/chunks/sc5tX4ha.js","_app/immutable/chunks/8qVaMlJz.js","_app/immutable/chunks/CY-KoamU.js","_app/immutable/chunks/D6Xv_Zl9.js","_app/immutable/chunks/Cwkaved6.js","_app/immutable/chunks/DbnA_IQn.js","_app/immutable/chunks/Dglfn3Y6.js"];
export const stylesheets = [];
export const fonts = [];
