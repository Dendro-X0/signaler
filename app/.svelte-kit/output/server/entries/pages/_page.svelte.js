import { a as attr } from "../../chunks/attributes.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let url = "";
    let folder = "";
    $$renderer2.push(`<h1>Signaler</h1> <p>Start a run.</p> <section style="display: grid; gap: 16px;"><div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px;"><h2>URL mode</h2> <input${attr("value", url)} placeholder="https://example.com" style="width: 100%; padding: 8px;"/> <div style="margin-top: 8px;"><button>Run URL audit</button></div></div> <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px;"><h2>Folder mode</h2> <input${attr("value", folder)} placeholder="C:\\\\path\\\\to\\\\site" style="width: 100%; padding: 8px;"/> <div style="margin-top: 8px;"><button>Run folder audit</button></div></div> <div style="display:flex; gap: 8px;"><a href="/history">History</a></div></section>`);
  });
}
export {
  _page as default
};
