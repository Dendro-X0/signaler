import { Y as store_get, Z as unsubscribe_stores } from "../../../chunks/index2.js";
import { g as getContext } from "../../../chunks/context.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import "@tauri-apps/api/core";
import { e as escape_html } from "../../../chunks/escaping.js";
import { a as attr } from "../../../chunks/attributes.js";
const getStores = () => {
  const stores$1 = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores$1.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores$1.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores$1.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let outputDir = "";
    {
      outputDir = store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("outputDir") ?? "";
    }
    $$renderer2.push(`<h1>Results</h1> <p><strong>Output:</strong> ${escape_html(outputDir)}</p> <div style="display:flex; gap: 8px;"><button${attr("disabled", outputDir.length === 0, true)}>Open report.html</button> <button${attr("disabled", outputDir.length === 0, true)}>Open output directory</button> <a href="/history">History</a> <a href="/">New run</a></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
