import { X as ensure_array_like } from "../../../chunks/index2.js";
import "@tauri-apps/api/core";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import { e as escape_html } from "../../../chunks/escaping.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let entries = [];
    $$renderer2.push(`<h1>History</h1> <div style="display:flex; gap: 8px; margin-bottom: 12px;"><button>Refresh</button> <a href="/">New run</a></div> `);
    if (entries.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p>No runs yet.</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<ul style="display:grid; gap: 8px; padding-left: 16px;"><!--[-->`);
      const each_array = ensure_array_like(entries);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let e = each_array[$$index];
        $$renderer2.push(`<li><button style="text-align:left;">${escape_html(e.createdAt)} — ${escape_html(e.mode)} — ${escape_html(e.target)}</button></li>`);
      }
      $$renderer2.push(`<!--]--></ul>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
