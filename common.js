// Shared helpers. No framework and no build step: the site is a handful of
// static files plus the JSON publish.py writes, which is the whole reason Pages
// can serve it.

const NBSP = " ";

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[ch]);
}

// Class lists used by more than one page. Utilities only (see utilities.css);
// these just save restating the same cell or label in every template.
const LINK = "no-underline text-blue-11 hover:underline";
const EYEBROW = "-tracking-4 font-mono font-normal leading-tight m-0 text-2xs text-gray-11 uppercase";
const SECTION = `${EYEBROW} mb-3 mt-8`;
const EMPTY = "m-0 text-gray-11";
const CODE = "bg-gray-3 font-mono px-0.75 py-1 rounded text-gray-12 text-xs tracking-0";
const PRE = "bg-gray-3 font-mono leading-tight m-0 overflow-x-auto px-4 py-3 rounded-lg text-xs tracking-0";
const NOTE = "m-0 text-2xs text-gray-11";

// Tables share one wrapper, which scrolls a wide table sideways and draws no
// frame, and one set of cells; the header row is set off by an off-blue band.
// Rows are divided by the body (`divide-y`), so the last row needs no override.
const TABLE_WRAP = "bg-background mb-5 overflow-x-auto overscroll-x-contain";
// Header cells are 48px high; their labels are 13 Mono in full-contrast ink,
// trimmed to cap height so they sit centred in the cell.
const TH = "bg-off-blue border-b border-gray-3 box-border box-edge-cap-alphabetic box-trim-both font-mono font-normal h-12 leading-tight p-0 px-4 text-gray-12 text-left text-xs tracking-0 uppercase whitespace-nowrap";
const TH_NUM = "bg-off-blue border-b border-gray-3 box-border box-edge-cap-alphabetic box-trim-both font-mono font-normal h-12 leading-tight p-0 px-4 tabular-nums text-gray-12 text-right text-xs tracking-0 uppercase whitespace-nowrap";
const TBODY = "divide-gray-3 divide-y";
const TD = "px-4 py-3 text-left whitespace-nowrap";
const TD_NUM = "px-4 py-3 tabular-nums text-right whitespace-nowrap";

// Badges are 24px high and centre their label, which sits in its own span
// trimmed to cap height on both sides -- so it is the capitals that are centred,
// not a line box with room for descenders below them.
const BADGE = {
    pass: "-tracking-4 bg-teal-3 box-border font-mono h-6 inline-flex items-center leading-tight px-1.5 rounded text-2xs text-teal-11 uppercase",
    fail: "-tracking-4 bg-red-3 box-border font-mono h-6 inline-flex items-center leading-tight px-1.5 rounded text-2xs text-red-11 uppercase",
    // Outlined rather than filled, so it reads on a grey tile as well as a white table.
    tag: "-tracking-4 border border-gray-5 box-border font-mono h-6 inline-flex items-center leading-tight px-1.5 rounded text-2xs text-gray-11 uppercase",
    // A tag in 11 Mono: the effort sits beside a model name, so it is set smaller.
    effort: "border border-gray-5 box-border font-mono h-6 inline-flex items-center leading-none px-1.5 rounded text-3xs text-gray-11 tracking-0 uppercase",
};

// `text` is plain text; it is escaped here.
function badge(kind, text) {
    return `<span class="${BADGE[kind]}"><span class="box-edge-cap-alphabetic box-trim-both">${
        escapeHtml(text)}</span></span>`;
}

// Icons: Lucide (https://lucide.dev), ISC License, Copyright (c) Lucide Contributors.
// Inner markup only; lucide() adds the attributes every Lucide icon carries.
const ICONS = {
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    "message-square": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    brain: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/>',
    "file-text": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    "square-terminal": '<path d="m7 11 2-2-2-2"/><path d="M11 13h4"/><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>',
    "flask-conical": '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
    bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
    "list-checks": '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    ellipsis: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    "circle-dot": '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>',
    "arrow-up": '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    "arrow-down": '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    "arrow-left": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    circle: '<circle cx="12" cy="12" r="10"/>',
    square: '<rect width="18" height="18" x="3" y="3" rx="2"/>',
    triangle: '<path d="M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>',
    diamond: '<path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/>',
    "square-check": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/>',
    "square-minus": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    "triangle-alert": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    minus: '<path d="M5 12h14"/>',
    "circle-help": '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
};

// `fill` is "currentColor" for a shape drawn solid, such as a configuration
// marker; every other icon is Lucide's outline as published.
function lucide(name, klass = "h-4 shrink-0 w-4", fill = "none") {
    return `<svg class="${klass}" aria-hidden="true" fill="${fill}" stroke="currentColor"
        stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        viewBox="0 0 24 24">${ICONS[name]}</svg>`;
}

// Tabs are as tall as the header's button, in Regular 16. The selected one is
// told apart by its full-contrast underline as well as its colour. There is one
// underline for the whole bar, placed by settleTabs(), so that it can glide.
const TAB = "-mb-px bg-transparent border-0 box-border cursor-pointer font-normal font-sans h-12 leading-snug p-0 text-base text-gray-11 tracking-1 hover:text-gray-12";
const TAB_SELECTED = "-mb-px bg-transparent border-0 box-border cursor-pointer font-normal font-sans h-12 leading-snug p-0 text-base text-gray-12 tracking-1";

function tabBar(tabs, active) {
    return `<div class="border-b border-gray-3 flex flex-wrap gap-x-6 gap-y-2 mb-6 relative" role="tablist">${
        tabs.map(([id, label]) => `<button class="${id === active ? TAB_SELECTED : TAB}"
            data-tab="${id}" id="tab-${id}" role="tab" aria-selected="${id === active}"
            aria-controls="tab-panel">${label}</button>`).join("")}<span
        class="absolute bg-gray-12 duration-200 h-0.5 left-0 pointer-events-none top-0 transition-all motion-reduce:transition-none"
        aria-hidden="true" data-tab-indicator></span></div>`;
}

function tabPanel(active, html) {
    return `<div aria-labelledby="tab-${active}" id="tab-panel" role="tabpanel">${html}</div>`;
}

// Tab switches are animated. On a click the old panel slides out toward the
// side away from the new tab while the underline starts gliding to it. Once the
// panel is out the page is redrawn: the new panel slides in from the other side,
// and the redrawn underline carries on from wherever the glide had got to, for
// the time it had left. The motion is CSS -- a transition and four animations,
// all off under reduced motion; this only says where each one starts, since the
// page is redrawn in the middle.
const GLIDE_MS = 200; // the underline's duration-200
let tabFrom = null;
let switching = false;
let queued = null; // a tab clicked while another switch was still sliding out

const tabsIn = (bar) => [...bar.querySelectorAll('[role="tab"]')];
const selectedIn = (tabs) => tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
const underlineAt = (tab) => ({
    left: `${tab.offsetLeft}px`,
    top: `${tab.offsetTop + tab.offsetHeight - 2}px`,
    width: `${tab.offsetWidth}px`,
});

// `redraw` makes tab `id` the selected one and redraws the page. A click during
// a switch is kept, the latest one only, and played once the switch is done.
function switchTab(id, redraw) {
    if (switching) {
        queued = [id, redraw];
        return;
    }
    const bar = document.querySelector('[role="tablist"]');
    const indicator = bar?.querySelector("[data-tab-indicator]");
    const tabs = bar ? tabsIn(bar) : [];
    const from = selectedIn(tabs);
    const to = tabs.findIndex((tab) => tab.dataset.tab === id);
    if (!indicator || to < 0 || to === from) {
        redraw();
        return;
    }
    switching = true;
    const started = performance.now();
    Object.assign(indicator.style, underlineAt(tabs[to]));
    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        const now = getComputedStyle(indicator);
        tabFrom = { index: from, left: now.left, top: now.top, width: now.width,
            duration: Math.max(0, GLIDE_MS - (performance.now() - started)) };
        switching = false;
        redraw();
        if (queued) {
            const [next, nextRedraw] = queued;
            queued = null;
            switchTab(next, nextRedraw);
        }
    };
    const panel = document.querySelector('[role="tabpanel"]');
    if (!panel || matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finish();
        return;
    }
    panel.addEventListener("animationend", finish, { once: true });
    setTimeout(finish, 400); // in case the animation never runs
    // Replaces the classes, not adds to them: a panel from the first draw still
    // carries its entrance delay (delay-*), which would hold the exit back too.
    panel.className = to > from ? "animate-slide-out-to-left" : "animate-slide-out-to-right";
}

function settleTabs(from = null) {
    const bar = document.querySelector('[role="tablist"]');
    const indicator = bar?.querySelector("[data-tab-indicator]");
    if (!indicator) return;
    // Start where the old underline had got to and let the transition carry it
    // the rest of the way; with nothing to start from (first draw, resize),
    // arrive without a glide. The start goes in before anything is measured:
    // measuring lays the new underline out at its class default, top left, and
    // from there a later start position would be a change to animate.
    if (from) {
        Object.assign(indicator.style, { left: from.left, top: from.top, width: from.width });
        indicator.style.transitionDuration = `${from.duration}ms`;
        indicator.addEventListener("transitionend", () => {
            indicator.style.transitionDuration = "";
        }, { once: true });
    } else {
        indicator.style.transition = "none";
    }
    const tabs = tabsIn(bar);
    const index = selectedIn(tabs);
    if (index < 0) return;
    indicator.getBoundingClientRect();
    Object.assign(indicator.style, underlineAt(tabs[index]));
    if (!from) {
        indicator.getBoundingClientRect();
        indicator.style.transition = "";
    }
    const panel = document.querySelector('[role="tabpanel"]');
    if (from && panel && from.index !== index) {
        panel.classList.add(index > from.index
            ? "animate-slide-in-from-right" : "animate-slide-in-from-left", "motion-reduce:animate-none");
    }
}

addEventListener("resize", () => settleTabs());
document.fonts?.ready.then(() => settleTabs());

// Pages serves everything with `max-age=600` and no way to override it, so a
// reader who saw an earlier publish gets that copy back from disk without the
// browser asking us anything -- the reason synthetic numbers outlived the run
// that replaced them. `no-cache` forces a revalidation on every load.
function fetchJson(path) {
    return fetch(path, { cache: "no-cache" }).then((response) => {
        if (!response.ok) {
            throw new Error(`${path}: ${response.status}`);
        }
        return response.json();
    });
}

// Which benchmark this page is showing. A benchmark is a folder under `data/`
// with its own index and trials, and `?benchmark=<slug>` is how every page says
// which one it is on. The default is the one the site opens on, and it is left
// out of the query string entirely -- so the URLs that existed before there was
// more than one benchmark still resolve to it.
const DEFAULT_BENCHMARK = "release-20261021";
const benchmark = new URLSearchParams(location.search).get("benchmark")
    || DEFAULT_BENCHMARK;

function dataUrl(path) {
    return `data/${encodeURIComponent(benchmark)}/${path}`;
}

// Every internal link has to carry the benchmark, or one click lands back in the
// default with the same model and configuration -- which would look like data
// changing under the reader rather than a different benchmark.
function pageUrl(page, params = {}) {
    const query = new URLSearchParams(params);
    if (benchmark !== DEFAULT_BENCHMARK) query.set("benchmark", benchmark);
    const search = query.toString();
    return search ? `${page}?${search}` : page;
}

// A model id is `provider/name`; the provider is noise in a table where every
// row carries one, and the dated Haiku suffix is noise everywhere.
function shortModel(model) {
    const name = String(model ?? "unknown").split("/").pop();
    return name.replace(/-\d{8}$/, "");
}

// Model names as a reader says them: the vendor's mark, then the model.
// `anthropic/claude-haiku-5-5` is <Claude> Haiku 5.5 and `openai/gpt-6.1-sol` is
// <OpenAI> GPT-6.1 Sol. An id neither rule recognises keeps its short id and no
// mark, so a model added later can never arrive with a mangled name.
const capitalise = (word) => word.charAt(0).toUpperCase() + word.slice(1);

const MODEL_NAMES = [
    { pattern: /^claude-([a-z]+)-(\d+)(?:-(\d+))?$/, vendor: "Claude", spoken: "Claude",
        name: (m) => `${capitalise(m[1])} ${m[2]}${m[3] ? `.${m[3]}` : ""}` },
    { pattern: /^gpt-(\d+(?:\.\d+)?)-([a-z]+)$/, vendor: "OpenAI", spoken: "",
        name: (m) => `GPT-${m[1]} ${capitalise(m[2])}` },
];

function modelParts(model) {
    const id = shortModel(model);
    for (const rule of MODEL_NAMES) {
        const match = id.match(rule.pattern);
        if (match) return { vendor: rule.vendor, spoken: rule.spoken, name: rule.name(match) };
    }
    return { vendor: null, spoken: "", name: id };
}

// The name in words, for anywhere a mark cannot go: page titles, tooltips,
// messages. "Haiku 5.5" needs its vendor said; "GPT-6.1 Sol" already says it.
function modelText(model) {
    const { spoken, name } = modelParts(model);
    return spoken ? `${spoken} ${name}` : name;
}

// Each vendor in its own brand colour (--claude, --openai): its mark, and the
// score bars of its models. A model from neither vendor gets a grey bar. Paths
// from @lobehub/icons-static-svg 1.101.0 (MIT); the marks themselves are
// Anthropic's and OpenAI's trademarks.
const VENDOR_FILLS = { Claude: "fill-claude", OpenAI: "fill-openai" };
const VENDOR_BARS = { Claude: "bg-claude", OpenAI: "bg-openai" };
const VENDOR_TEXT = { Claude: "text-claude", OpenAI: "text-openai" };

// A chart point in its vendor's colour; anything else in full-contrast ink.
function vendorText(model) {
    return VENDOR_TEXT[modelParts(model).vendor] ?? "text-gray-12";
}

function vendorBar(model) {
    return VENDOR_BARS[modelParts(model).vendor] ?? "bg-gray-11";
}

const VENDOR_MARKS = {
    Claude: 'M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z',
    OpenAI: 'M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z',
};

// A model's vendor mark, labelled so the name reads "Claude Haiku 5.5" aloud as
// well as on screen. Empty for a model from neither vendor.
function modelMark(model, size) {
    const { vendor } = modelParts(model);
    return vendor && VENDOR_MARKS[vendor]
        ? `<svg class="${VENDOR_FILLS[vendor]} ${size}" fill-rule="evenodd" role="img"
            aria-label="${vendor}" viewBox="0 0 24 24"><path d="${VENDOR_MARKS[vendor]}"/></svg>`
        : "";
}

// The mark then the name, as running text. The mark is sized in em, so it
// scales with whatever text it sits in -- a table row, a page title. The
// reasoning effort, when there is one, follows as a badge.
function modelLabel(model, effort = "") {
    const mark = modelMark(model, "align-[-0.125em] h-[1em] w-[1em]");
    const label = `${mark}${mark ? " " : ""}${escapeHtml(modelParts(model).name)}`;
    return effort
        ? `<span class="gap-2 inline-flex items-center"><span>${label}</span>${effortBadge(effort)}</span>`
        : label;
}

function effortBadge(effort) {
    return effort ? badge("effort", effort) : "";
}

function shortTask(task) {
    return String(task ?? "").split("/").pop();
}

// Surefire names a suite by its fully qualified class, and the package is the
// same for every suite VaadinBench grades. The full name stays in a tooltip.
function shortSuite(name) {
    return String(name ?? "").split(".").pop();
}

// A job directory is named `<configuration>-<date>-<time>`. The timestamp makes
// each run unique; the prefix is the thing being compared -- which skills and
// tools the agent was given. The leaderboard groups by that prefix, so two runs
// of one configuration on different days land in the same row. Suite prefixes
// identify a batch of jobs, not the configuration supplied to Codex.
function configOf(job) {
    const agentConfig = String(job ?? "").match(/(?:^|-)(vaadin-skills-mcp|vaadin-mcp|vaadin-skills|vanilla)-(?:codex|claude-code)(?:-\d{8}-\d{6})?$/);
    if (agentConfig) return agentConfig[1];
    return String(job ?? "").replace(/-\d{8}-\d{6}$/, "") || "unknown";
}

function effortOf(trial) {
    return trial.reasoning_effort || "";
}

function modelWithEffort(model, effort) {
    return `${modelText(model)}${effort ? ` · ${effort}` : ""}`;
}

// Round to whole seconds first, then split. Rounding the remainder instead let
// 719.6s print as `11m 60s`: the minutes were floored off the unrounded value
// and the seconds rounded up to a full minute on their own.
function duration(seconds) {
    if (seconds === null || seconds === undefined) return "—";
    const total = Math.round(seconds);
    if (total < 60) return `${total}s`;
    const minutes = Math.floor(total / 60);
    return `${minutes}m${NBSP}${String(total % 60).padStart(2, "0")}s`;
}

function tokens(count) {
    if (count === null || count === undefined) return "—";
    if (count < 1000) return String(count);
    return `${(count / 1000).toFixed(1)}k`;
}

function money(amount) {
    return amount === null || amount === undefined ? "—" : `$${amount.toFixed(2)}`;
}

function percent(rate) {
    return rate === null || rate === undefined ? "—" : `${Math.round(rate * 100)}%`;
}

// The verifier decides the result. An error in the agent loop is worth flagging
// beside that verdict but never in place of it: a run can lose its API
// connection on the last step and still leave behind a project that grades
// clean, and calling that `error` both hides a real pass and disagrees with the
// leaderboard, which counts the reward. The error stands alone only when there
// is no grade to report.
function outcome(trial) {
    if (trial.reward === null || trial.reward === undefined) {
        return trial.error
            ? badge("fail", "error")
            : badge("tag", "no reward");
    }
    const verdict = trial.reward >= 1
        ? badge("pass", "pass")
        : badge("fail", "fail");
    if (!trial.error) return verdict;
    return `${verdict} <span class="text-2xs text-gray-11 whitespace-nowrap"
        title="${escapeHtml(trial.error)}">error</span>`;
}

// The same verdict as icon badges, for a table column: as wide as the column,
// as tall as the text badges and coloured as they are, each named by aria-label
// and, for the pointer, a tooltip. An agent error beside a grade is its own
// badge, sharing the width, whose tooltip carries the error itself.
const ICON_BADGE = "box-border flex flex-1 h-6 items-center justify-center rounded";
function outcomeIcons(trial) {
    const icon = (name, colours, label, tip = label) => `<span class="${ICON_BADGE} ${colours}" role="img"
        aria-label="${escapeHtml(label)}" title="${escapeHtml(tip)}">${lucide(name)}</span>`;
    if (trial.reward === null || trial.reward === undefined) {
        return trial.error
            ? icon("triangle-alert", "bg-red-3 text-red-11", "Error", `Error: ${trial.error}`)
            : icon("minus", "bg-gray-3 text-gray-11", "No reward");
    }
    const verdict = trial.reward >= 1
        ? icon("check", "bg-teal-3 text-teal-11", "Pass")
        : icon("x", "bg-red-3 text-red-11", "Fail");
    if (!trial.error) return verdict;
    return `<span class="flex gap-1 items-center">${verdict}${
        icon("triangle-alert", "bg-gray-3 text-gray-11", "Agent error", `Agent error: ${trial.error}`)}</span>`;
}

// The job rides along so the trial page can check that the file it loaded is
// the run that was clicked. Ids used to omit the job, which let three trials
// share one, and the page had no way to notice it was showing another run.
function trialUrl(id, job) {
    return pageUrl("trial.html", job ? { id, job } : { id });
}

function runUrl(model, config, effort = "") {
    return pageUrl("run.html", { model, config, ...(effort ? { effort } : {}) });
}

function leaderboardUrl() {
    return pageUrl("index.html");
}

// Configurations are the other axis of comparison, and they get a shape. Nine points labelled in text collide with each
// other and with the dots; two legends and a tooltip do not.
const SHAPES = ["circle", "square", "triangle", "diamond"];

function shapeMap(configs) {
    const sorted = [...new Set(configs)].sort();
    return new Map(sorted.map((config, i) => [config, SHAPES[i % SHAPES.length]]));
}

// A configuration's Lucide shape, drawn solid in the text colour around it, so
// it carries the same mark in a chip, a table row and a legend as on the chart.
function shapeGlyph(shape, size = "h-3 w-3") {
    return lucide(SHAPES.includes(shape) ? shape : "circle", `${size} shrink-0`, "currentColor");
}

// The same shape as a point on the chart: a nested SVG, `size` chart units
// across, centred on (x, y). `data-dot` marks it as an obstacle for
// layoutChartLabels(), which reads its box from x, y, width and height.
function marker(shape, x, y, klass, size = 14) {
    return `<svg class="${klass}" data-dot x="${x - size / 2}" y="${y - size / 2}"
        width="${size}" height="${size}" fill="currentColor" stroke="currentColor"
        stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        viewBox="0 0 24 24">${ICONS[SHAPES.includes(shape) ? shape : "circle"]}</svg>`;
}

// Candidate positions for a label, in preference order: beside the point first,
// then above and below, then progressively further out. Both horizontal anchors
// are offered at every vertical step, because a point near an edge may only have
// one side available -- and a long label beside a crowded point needs to be able
// to move vertically while staying on the side that fits.
const LABEL_SLOTS = (() => {
    const slots = [[11, 4, "start"], [-11, 4, "end"], [0, -11, "middle"], [0, 16, "middle"]];
    for (const dy of [-13, 19, -25, 31, -37, 43, -49, 55]) {
        slots.push([11, dy, "start"], [-11, dy, "end"], [0, dy, "middle"]);
    }
    return slots;
})();

function layoutChartLabels(svg) {
    if (!svg) return;
    const labels = [...svg.querySelectorAll("[data-label]")];
    if (!labels.length) return;
    const width = svg.viewBox.baseVal.width;
    const pad = 2;
    const grow = (box) => ({
        x: box.x - pad, y: box.y - pad,
        w: box.width + pad * 2, h: box.height + pad * 2,
    });
    // Markers and the axis text are obstacles from the start; each label becomes
    // one as it lands. Including the ticks is what keeps a label from settling on
    // top of "100%" or "$2.00".
    // A marker is a nested SVG, whose getBBox() answers in its own viewBox units
    // rather than the chart's, so its box is read from its position and size.
    const box = (node) => node.hasAttribute("data-dot")
        ? { x: Number(node.getAttribute("x")), y: Number(node.getAttribute("y")),
            width: Number(node.getAttribute("width")), height: Number(node.getAttribute("height")) }
        : node.getBBox();
    const taken = [...svg.querySelectorAll("[data-dot], [data-tick]")]
        .map((node) => grow(box(node)));

    // Overlap by area, not yes/no: when a point is boxed in on every side, the
    // least bad slot is a real answer and "keep the default" is not.
    const overlap = (a, b) =>
        Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
        * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

    for (const label of labels) {
        const cx = Number(label.dataset.cx), cy = Number(label.dataset.cy);
        const { width: w, height: h } = label.getBBox();
        let best = null;
        for (const [dx, dy, anchor] of LABEL_SLOTS) {
            const x = cx + dx, y = cy + dy;
            const left = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
            const box = { x: left - pad, y: y - h * 0.8 - pad, w: w + pad * 2, h: h + pad * 2 };
            if (box.x < 0 || box.x + box.w > width) continue;
            const cost = taken.reduce((sum, other) => sum + overlap(box, other), 0);
            if (!best || cost < best.cost) best = { x, y, anchor, box, cost };
            if (cost === 0) break;
        }
        if (!best) continue;
        label.setAttribute("x", best.x);
        label.setAttribute("y", best.y);
        label.setAttribute("text-anchor", best.anchor);
        taken.push(best.box);
    }
}

// The details card for a chart point. It follows the pointer rather than SVG's
// own <title>, which waits about a second and then lands wherever the window
// manager puts it; it also opens on keyboard focus, and on a touch screen a tap
// opens it until the next tap elsewhere. It sits above the point, or below
// where there is no room above. `content` gives a point's card as markup. The
// listeners go on once: the chart is redrawn into the same root, and only what
// a card shows changes.
let tipContent = null;
let tipsBound = false;

function bindTips(root, content) {
    tipContent = content;
    if (tipsBound) return;
    tipsBound = true;
    const tip = () => root.querySelector("[data-tooltip]");
    const show = (target) => {
        const card = tip();
        if (!card) return;
        card.innerHTML = tipContent(target);
        card.hidden = false;
        // Measured once the card is filled, so its size is the real one, and
        // placed against the marker rather than the point's label.
        const box = (target.querySelector("[data-dot]") ?? target).getBoundingClientRect();
        const frame = card.parentElement.getBoundingClientRect();
        const left = box.left - frame.left + box.width / 2 - card.offsetWidth / 2;
        card.style.left = `${Math.max(0, Math.min(left, frame.width - card.offsetWidth))}px`;
        const roomAbove = box.top - card.offsetHeight - 8 >= 0;
        card.style.top = roomAbove
            ? `${box.top - frame.top - card.offsetHeight - 8}px`
            : `${box.bottom - frame.top + 8}px`;
    };
    const hide = () => {
        const card = tip();
        if (card) card.hidden = true;
    };
    const point = (event) => event.target.closest?.("[data-tip]");
    root.addEventListener("pointerover", (event) => {
        if (event.pointerType !== "touch" && point(event)) show(point(event));
    });
    root.addEventListener("pointerout", (event) => {
        if (event.pointerType !== "touch" && point(event)) hide();
    });
    root.addEventListener("focusin", (event) => {
        if (point(event)) show(point(event));
    });
    root.addEventListener("focusout", (event) => {
        if (point(event)) hide();
    });
    root.addEventListener("click", (event) => {
        if (point(event)) show(point(event));
        else hide();
    });
}

// ------------------------------------------------------------------ markdown

// Task prompts and agent messages are written in Markdown, and reading them as
// raw text means reading the punctuation instead of the prose.
//
// This is a deliberate subset -- headings, paragraphs, lists, code, emphasis,
// links, quotes, rules -- not a CommonMark implementation, because the input is
// the narrow dialect these agents actually emit and a real parser is a
// dependency this site does not have a way to carry.
//
// SECURITY: the text is agent output, so it is escaped *first* and every tag
// below is one this function wrote. Nothing from the input is ever interpolated
// as markup, and link targets are checked against a scheme allowlist, so a
// `javascript:` href renders as plain text rather than a link.

const MD_SAFE_URL = /^(https?:\/\/|mailto:|#|\/)[^\s]*$/i;

function mdUrl(url) {
    // Already HTML-escaped, so quotes cannot terminate the attribute.
    return MD_SAFE_URL.test(url.trim()) ? url.trim() : "";
}

// Inline spans, on already-escaped text. Code first, so emphasis markers inside
// a code span are left alone; the placeholder can never appear in the input,
// because U+0000 does not survive escaping.
function mdInline(text) {
    const code = [];
    let out = text.replace(/`([^`]+)`/g, (_, body) => {
        code.push(body);
        return `\u0000${code.length - 1}\u0000`;
    });

    out = out
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label, href) => {
            const url = mdUrl(href);
            return url ? `<a class="text-blue-11 underline" href="${url}">${label}</a>` : label;
        })
        // Regular weight only, so strong text is set apart by full-contrast ink.
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-normal text-gray-12">$1</strong>')
        .replace(/__([^_]+)__/g, '<strong class="font-normal text-gray-12">$1</strong>')
        .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
        .replace(/(^|[\s(])_([^_\n]+)_/g, "$1<em>$2</em>")
        .replace(/~~([^~]+)~~/g, "<del>$1</del>");

    return out.replace(/\u0000(\d+)\u0000/g,
        (_, i) => `<code class="${CODE}">${code[Number(i)]}</code>`);
}

// Rendered blocks sit in a `flex flex-col gap-3` container, which spaces them,
// so each one clears its own margins. Headings take extra room above, and step
// down in size because they cannot step down in weight.
const MD_HEADING = {
    1: "font-normal leading-snug m-0 mt-3 text-xl tracking-1",
    2: "font-normal leading-snug m-0 mt-3 text-lg tracking-1",
    3: "font-normal leading-snug m-0 mt-3 text-base tracking-1",
};
const MD_HEADING_MINOR = "-tracking-4 font-mono font-normal leading-tight m-0 mt-3 text-2xs text-gray-11 uppercase";
const MD_BLOCK = "flex flex-col gap-3 leading-snug text-gray-12 wrap-anywhere";

// Lists nest by indent, so they are built depth-first: an item deeper than the
// level being built starts a sublist inside the item before it.
function mdList(items, start, indent) {
    const tag = items[start].ordered ? "ol" : "ul";
    let html = `<${tag} class="m-0 pl-5">`;
    let i = start;
    while (i < items.length && items[i].indent >= indent) {
        if (items[i].indent > indent) {
            const [sub, next] = mdList(items, i, items[i].indent);
            html += sub;
            i = next;
            continue;
        }
        html += `<li class="mt-1">${mdInline(items[i].text)}`;
        if (i + 1 < items.length && items[i + 1].indent > indent) {
            const [sub, next] = mdList(items, i + 1, items[i + 1].indent);
            html += sub;
            i = next;
        } else {
            i += 1;
        }
        html += "</li>";
    }
    return [`${html}</${tag}>`, i];
}

const MD_ITEM = /^(\s*)(?:([-*+])|(\d+)[.)])\s+(.*)$/;

function renderMarkdown(text) {
    const lines = escapeHtml(text ?? "").split("\n");
    const out = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Fenced code. An unterminated fence runs to the end rather than
        // swallowing the rest of the document into a paragraph.
        const fence = line.match(/^\s*```+\s*([\w+-]*)\s*$/);
        if (fence) {
            const body = [];
            i += 1;
            while (i < lines.length && !/^\s*```+\s*$/.test(lines[i])) {
                body.push(lines[i]);
                i += 1;
            }
            i += 1;
            out.push(`<pre class="${PRE}"><code class="font-mono">${body.join("\n")}</code></pre>`);
            continue;
        }

        if (!line.trim()) { i += 1; continue; }

        if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
            out.push('<hr class="border-0 border-gray-3 border-t m-0 w-full">');
            i += 1;
            continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
            // Styled by the source's level, but tagged two below it: the page
            // already has its h1 and h2s, and rendered text sits under them.
            const level = heading[1].length;
            const tag = `h${Math.min(level + 2, 6)}`;
            out.push(`<${tag} class="${MD_HEADING[level] ?? MD_HEADING_MINOR}">${
                mdInline(heading[2].trim())}</${tag}>`);
            i += 1;
            continue;
        }

        if (/^\s*&gt;\s?/.test(line)) {
            const body = [];
            while (i < lines.length && /^\s*&gt;\s?/.test(lines[i])) {
                body.push(lines[i].replace(/^\s*&gt;\s?/, ""));
                i += 1;
            }
            out.push(`<blockquote class="border-0 border-gray-5 border-l-2 flex flex-col gap-3 m-0 pl-4 text-gray-11">${
                renderMarkdown(unescapeHtml(body.join("\n")))}</blockquote>`);
            continue;
        }

        if (MD_ITEM.test(line)) {
            const items = [];
            while (i < lines.length) {
                const match = lines[i].match(MD_ITEM);
                if (match) {
                    items.push({
                        indent: match[1].length,
                        ordered: Boolean(match[3]),
                        text: match[4],
                    });
                    i += 1;
                } else if (lines[i].trim() && /^\s+/.test(lines[i]) && items.length) {
                    // A wrapped continuation line belongs to the item above it.
                    items[items.length - 1].text += ` ${lines[i].trim()}`;
                    i += 1;
                } else {
                    break;
                }
            }
            out.push(mdList(items, 0, items[0].indent)[0]);
            continue;
        }

        const paragraph = [];
        while (i < lines.length && lines[i].trim()
            && !MD_ITEM.test(lines[i])
            && !/^(#{1,6})\s/.test(lines[i])
            && !/^\s*```/.test(lines[i])
            && !/^\s*&gt;\s?/.test(lines[i])) {
            paragraph.push(lines[i]);
            i += 1;
        }
        out.push(`<p class="m-0">${mdInline(paragraph.join("\n"))}</p>`);
    }

    return out.join("");
}

// Blockquote bodies are re-parsed, and the parser escapes what it is given, so
// one round has to be undone to avoid escaping the escapes.
function unescapeHtml(value) {
    return String(value)
        .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
}

// A section of a page, laid out as mcp.vaadin.com lays its sections out: a
// rule above, 32px to a heading in 32 Regular and, 6px under it, its one-line
// description in 18 Regular grey, 32px to the content, and 40px below. `edges` names the rules
// (a top one by default; a section followed by something unruled takes both).
const SECTION_TITLE = "font-normal leading-tight m-0 text-2xl tracking-0";
const SECTION_LEAD = "font-normal leading-snug m-0 mt-1.5 text-gray-11 text-lg tracking-1";
function section(title, lead, body, edges = "border-t") {
    return `<section class="border-gray-3 ${edges} pb-10 pt-8"><h2 class="${SECTION_TITLE}">${title}</h2>
        <p class="${SECTION_LEAD}">${lead}</p><div class="mt-8">${body}</div></section>`;
}

// Summary figures as KPI cards: one card per figure, its name small above its
// value, which is set larger since it is what the card is for: 12 Mono
// over 22 Bold. A description
// list, so each value is announced with its name.
function metricCards(pairs) {
    const cells = pairs.filter(([, value]) => value !== null && value !== undefined);
    if (!cells.length) return "";
    return `<dl class="gap-4 grid grid-cols-2 m-0 md:grid-cols-4">${cells.map(([label, value]) =>
        `<div class="bg-gray-2 box-border flex flex-col gap-2 min-w-0 p-5 rounded-lg"><dt
            class="-tracking-4 font-mono leading-tight text-2xs text-gray-11 uppercase">${
            escapeHtml(label)}</dt><dd class="font-bold leading-snug m-0 tabular-nums text-xl tracking-1 whitespace-nowrap">${
            value}</dd></div>`).join("")}</dl>`;
}

// A warning that has to survive a glance: a red edge on a tile.
function banner(title, body) {
    return `<div class="bg-gray-3 border-0 border-l-4 border-red-9 mb-5 px-4 py-3 rounded text-gray-11"><strong
        class="font-normal text-gray-12">${title}</strong> ${body}</div>`;
}

// Invented data must never be mistaken for a measurement, so it is called out on
// every page that shows any, not only where it was generated.
function syntheticBanner(isSynthetic) {
    if (!isSynthetic) return "";
    return banner("Synthetic data.", `These numbers were invented to develop this
        site, not measured. They disappear the first time real results are
        published.`);
}

function renderFooter(generatedAt) {
    const footer = document.getElementById("footer");
    if (!footer) return;
    // A trial page has no generation stamp of its own; it shows just the links
    // rather than an empty date.
    const stamp = generatedAt
        ? `Generated ${escapeHtml(new Date(generatedAt).toISOString().slice(0, 16).replace("T", " "))} UTC · `
        : "";
    footer.innerHTML = `${stamp}
        <a class="${LINK}" href="https://github.com/vaadin/vaadinbench-results">source</a> ·
        <a class="${LINK}" href="https://github.com/vaadin/vaadinbench">tasks</a>`;
}

// The way to the other benchmarks. Just the way there: which benchmark this is
// belongs to the page below, which says it in its own rows, and repeating it in
// the header only competes with the wordmark.
//
// Rendered from the registry rather than written into each page, so it appears
// on its own once a second benchmark is published -- with one, it would be a
// link to a list of the page you are already on.
// The pages carry `index.html` in their own markup -- the wordmark, run.html's
// crumb. Inside a benchmark that has to mean this benchmark's leaderboard, or
// the way home is a silent jump back to the default with no sign it happened.
function localiseHomeLinks() {
    if (benchmark === DEFAULT_BENCHMARK) return;
    document.querySelectorAll('a[href="index.html"]').forEach((link) => {
        link.setAttribute("href", leaderboardUrl());
    });
}

function renderBenchmarkBar() {
    const slot = document.getElementById("benchmark");
    if (!slot) return;
    fetchJson("data/benchmarks.json").then((registry) => {
        if ((registry.benchmarks ?? []).length < 2) return;
        slot.innerHTML = `<a class="border border-gray-3 box-border flex font-mono h-12
            items-center leading-tight no-underline px-8 rounded text-gray-12 text-xs
            tracking-0 uppercase whitespace-nowrap hover:bg-gray-3"
            href="benchmarks.html"><span class="box-edge-cap-alphabetic box-trim-both">All
            benchmarks</span></a>`;
    }).catch(() => {
        // No registry is the state this site was in before benchmarks existed.
        // The page below it works either way, so it says nothing.
    });
}

// Every write to #content goes through here. Content lands after a fetch, so it
// fades in as it arrives: each top-level block one 40ms step after the one
// before, following the header (0) and the breadcrumb (40), as on the Vaadin MCP
// landing page, and the footer one step after the last block (it stays hidden
// until then, or its rule would show over an empty page). Only the first
// write: a filter or tab click redraws the view, and replaying the entrance on
// every click would read as lag. The steps are listed whole so the
// unused-utility check can see them; anything past the last shares it.
const ENTER_STEPS = ["delay-80", "delay-120", "delay-160", "delay-200", "delay-240", "delay-280"];
let entered = false;

function showContent(html) {
    const content = document.getElementById("content");
    content.innerHTML = html;
    settleTabs(tabFrom);
    tabFrom = null;
    if (entered) return;
    entered = true;
    const footer = document.querySelector("footer");
    if (footer) footer.hidden = false;
    [...content.children, footer].filter(Boolean).forEach((block, i) => block.classList.add("animate-fade-in",
        ENTER_STEPS[Math.min(i, ENTER_STEPS.length - 1)], "motion-reduce:animate-none"));
}

function showError(error) {
    // A benchmark in the URL that has no folder fails here, as a 404 on a path
    // nobody typed. Offer the list rather than leaving the reader to guess a
    // slug back.
    const elsewhere = benchmark === DEFAULT_BENCHMARK ? ""
        : ` <a class="${LINK}" href="benchmarks.html">See the benchmarks that are published.</a>`;
    showContent(
        `<p class="${EMPTY}">Could not load the data: ${escapeHtml(error.message)}.${elsewhere}</p>`);
}

localiseHomeLinks();
renderBenchmarkBar();
