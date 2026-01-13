import { a as attr } from "../../../chunks/attributes.js";
import { e as escape_html } from "../../../chunks/escaping.js";
import { b as ssr_context } from "../../../chunks/context.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import "@tauri-apps/api/core";
import "@tauri-apps/api/event";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let mode = "url";
    let value = "";
    let logLines = [];
    let completed = 0;
    let total = 0;
    let currentPath = "";
    let currentDevice = "";
    onDestroy(() => {
    });
    $$renderer2.push(`<h1>Run</h1> <p><strong>Mode:</strong> ${escape_html(mode)}</p> <p><strong>Target:</strong> ${escape_html(value)}</p> <h2>Status</h2> <p><strong>Started:</strong> ${escape_html("no")}</p> <p><strong>Finished:</strong> ${escape_html("no")}</p> <h2>Progress</h2> <p><strong>Completed:</strong> ${escape_html(completed)}/${escape_html(total)}</p> <p><strong>Current:</strong> ${escape_html(currentPath)} [${escape_html(currentDevice)}]</p> <p><strong>ETA:</strong> ${escape_html("—")}</p> <div style="display:flex; gap: 8px; margin: 12px 0;"><button${attr("disabled", true, true)}>Cancel</button> <button${attr("disabled", true, true)}>View results</button> <a href="/">Back</a></div> <h2>Log</h2> <pre style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; max-height: 420px; overflow: auto;">${escape_html(logLines.join("\n"))}</pre>`);
  });
}
export {
  _page as default
};
