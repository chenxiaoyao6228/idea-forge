import { createLowlight, all, common } from "lowlight";
// import { FRONTEND_FREQUENT_USED_LANGUAGES } from '../../constant';

const lowlight = createLowlight(all);

/**
 * Register all languages from FRONTEND_FREQUENT_USED_LANGUAGES
 * This function loads and registers each language module for syntax highlighting
 */
// const registerLanguages = async () => {
//   for (const [lang, displayName] of Object.entries(FRONTEND_FREQUENT_USED_LANGUAGES)) {
//     if (lang !== 'none' && lang !== 'mermaid') {
//       try {
//         const module = await import(`highlight.js/lib/languages/${lang}`);
//         lowlight.register(lang, module.default);
//       } catch (error) {
//         console.warn(`Failed to load language: ${displayName} (${lang})`, error);
//       }
//     }
//   }
// };

// registerLanguages();

export default lowlight;
