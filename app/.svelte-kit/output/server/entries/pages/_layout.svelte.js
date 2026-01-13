import { U as head, V as slot, W as bind_props } from "../../chunks/index2.js";
function _layout($$renderer, $$props) {
  const prerender = true;
  head("12qhfyh", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>Signaler</title>`);
    });
  });
  $$renderer.push(`<main style="max-width: 960px; margin: 0 auto; padding: 24px; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;"><!--[-->`);
  slot($$renderer, $$props, "default", {});
  $$renderer.push(`<!--]--></main>`);
  bind_props($$props, { prerender });
}
export {
  _layout as default
};
