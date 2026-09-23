const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const publicDir = path.join(__dirname, '..', 'public');
const assets = Object.fromEntries(['index.html', 'app.js', 'styles.css', 'components.css']
  .map(name => [name, fs.readFileSync(path.join(publicDir, name), 'utf8')]));

function blockEnd(source, open) {
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}' && --depth === 0) return index;
  }
  throw new Error('unclosed CSS block');
}

function cssRules(source) {
  const rules = [];
  let cursor = 0;
  while (cursor < source.length) {
    const open = source.indexOf('{', cursor);
    if (open === -1) break;
    const selector = source.slice(cursor, open).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    const close = blockEnd(source, open);
    const body = source.slice(open + 1, close);
    if (selector.startsWith('@media')) rules.push(...cssRules(body));
    else if (!selector.startsWith('@')) rules.push({ selector, body });
    cursor = close + 1;
  }
  return rules;
}

function declarations(body) {
  return body.split(';').reduce((result, declaration) => {
    const separator = declaration.indexOf(':');
    if (separator === -1) return result;
    const property = declaration.slice(0, separator).trim();
    const rawValue = declaration.slice(separator + 1).trim();
    if (!property || !rawValue) return result;
    result[property] = {
      value: rawValue.replace(/\s*!important\s*$/, '').trim(),
      important: /!important\s*$/.test(rawValue)
    };
    return result;
  }, {});
}

function declarationNames(body) {
  return body.split(';').map(declaration => declaration.slice(0, declaration.indexOf(':')).trim());
}

function hexColor(value) {
  const hex = value.replace('#', '');
  assert.match(hex, /^(?:[\da-f]{3}|[\da-f]{6})$/i, `expected an opaque hex color, received ${value}`);
  const expanded = hex.length === 3 ? [...hex].map(char => char.repeat(2)).join('') : hex;
  return [0, 2, 4].map(index => parseInt(expanded.slice(index, index + 2), 16) / 255);
}

function luminance(rgb) {
  return rgb.reduce((sum, channel, index) => {
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return sum + [0.2126, 0.7152, 0.0722][index] * linear;
  }, 0);
}

function contrast(first, second) {
  const [lighter, darker] = [luminance(hexColor(first)), luminance(hexColor(second))].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function computedRule(source, selector) {
  return cssRules(source).reduce((computed, rule) => {
    if (!rule.selector.split(',').map(item => item.trim()).includes(selector)) return computed;
    for (const [property, candidate] of Object.entries(declarations(rule.body))) {
      if (!computed[property] || candidate.important || !computed[property].important) {
        computed[property] = candidate;
      }
    }
    return computed;
  }, {});
}

function mediaBody(source, condition) {
  const match = condition.exec(source);
  assert.ok(match, `missing ${condition} media query`);
  const open = source.indexOf('{', match.index);
  return source.slice(open + 1, blockEnd(source, open));
}

test('one root token block supplies every shared visual foundation', () => {
  const rootBlocks = [...assets['styles.css'].matchAll(/:root\s*\{[^}]*\}/g)];
  assert.equal(rootBlocks.length, 1, 'global tokens must have one source of truth');
  assert.doesNotMatch(assets['components.css'], /:root\s*\{/, 'components must consume global tokens');

  const tokens = declarations(rootBlocks[0][0].slice(rootBlocks[0][0].indexOf('{') + 1, -1));
  for (const category of ['surface', 'text', 'border', 'font', 'space', 'radius', 'shadow', 'z', 'duration']) {
    assert.ok(Object.keys(tokens).some(token => token.startsWith(`--${category}`)), `missing ${category} foundation tokens`);
  }
});

test('the effective shared button and panel styles inherit their foundation tokens', () => {
  const cascade = `${assets['styles.css']}\n${assets['components.css']}`;
  const button = computedRule(cascade, '.btn');
  const panel = computedRule(cascade, '.panel');

  assert.equal(button['font-family']?.value, 'var(--font-sans)', 'buttons must use the shared interface typeface');
  assert.equal(panel['border-radius']?.value, 'var(--radius-lg)', 'panels must use the shared card radius');
  assert.equal(panel.background?.value, 'var(--surface-raised)', 'panels must use the shared raised surface');
});

test('no CSS rule competes with itself for the active font family', () => {
  const duplicateRules = cssRules(`${assets['styles.css']}\n${assets['components.css']}`)
    .filter(({ body }) => declarationNames(body).filter(name => name === 'font-family').length > 1);

  assert.deepEqual(duplicateRules, [], 'a component must not resolve two font-family declarations in one rule');
});

test('keyboard focus has a high-contrast ring instead of an invisible reset', () => {
  const focus = computedRule(assets['styles.css'], ':focus-visible');
  const root = computedRule(assets['styles.css'], ':root');

  assert.match(focus.outline?.value || '', /(?:^|\s)(?:2|3)px\s+solid\s+var\(--focus-ring\)/i,
    'focus ring must use the shared opaque focus color');
  const ring = root['--focus-ring']?.value;
  assert.ok(ring, 'missing the shared focus ring color');
  for (const surface of ['--surface-canvas', '--surface-sidebar', '--surface-raised']) {
    assert.notEqual(ring, root[surface]?.value, 'focus ring cannot match an adjacent surface');
    assert.ok(contrast(ring, root[surface]?.value) >= 3, `focus ring needs 3:1 contrast against ${surface}`);
  }
});

test('reduced-motion users receive bounded animation, transition, and scroll overrides', () => {
  const body = mediaBody(assets['styles.css'], /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/g);
  const universal = computedRule(body, '*');

  assert.match(universal['animation-duration']?.value || '', /^(?:0|0\.0?1)ms$/, 'animations must resolve immediately');
  assert.match(universal['transition-duration']?.value || '', /^(?:0|0\.0?1)ms$/, 'transitions must resolve immediately');
  assert.equal(universal['scroll-behavior']?.value, 'auto', 'smooth scrolling must be disabled');
});

test('mobile layouts reveal navigation and wide data instead of clipping either', () => {
  const mobile = mediaBody(assets['styles.css'], /@media\s*\(\s*max-width\s*:\s*(?:[0-7]\d\d)px\s*\)/g);
  const content = computedRule(mobile, '.content');
  const sidebar = computedRule(mobile, '.sidebar');
  const tableWrap = computedRule(assets['components.css'], '.table-wrap');

  assert.equal(content.margin?.value, '0', 'mobile content must release the desktop sidebar margin');
  assert.match(sidebar.transform?.value || '', /translateX\(-100%\)/, 'mobile navigation must be intentionally off-canvas');
  assert.equal(tableWrap['overflow-x']?.value, 'auto', 'wide data must remain reachable by horizontal scrolling');
  assert.doesNotMatch(assets['styles.css'], /overflow-x\s*:\s*(?:hidden|clip)/, 'foundations must not hide off-screen controls or data');
});

test('foundation CSS does not generate text glyphs as substitute icons', () => {
  for (const asset of ['styles.css', 'components.css']) {
    for (const { body } of cssRules(assets[asset])) {
      const content = declarations(body).content?.value;
      assert.ok(!content || content === "''" || content === '""', `${asset} must not render a text-symbol icon from CSS`);
    }
  }
});

test('the shared shell uses accessible Phosphor icons instead of text-symbol controls', () => {
  const shell = assets['index.html'];

  assert.doesNotMatch(shell, /[→×]/, 'shared controls must not render text-symbol icons');
  assert.match(shell, /<button[^>]*class="btn primary wide"[^>]*type="submit"[^>]*>[\s\S]*?Sign in\s*<i\s+class="ph-bold ph-arrow-right"\s+aria-hidden="true"><\/i>[\s\S]*?<\/button>/,
    'sign-in action must render a decorative Phosphor arrow');
  assert.match(shell, /<button[^>]*class="modal-close"[^>]*aria-label="Đóng cửa sổ"[^>]*>\s*<i\s+class="ph-bold ph-x"\s+aria-hidden="true"><\/i>\s*<\/button>/,
    'modal close action must retain its accessible name with a decorative Phosphor icon');
});

test('the application shell exposes stable landmarks, labelled controls, and a mobile drawer', () => {
  const shell = assets['index.html'];

  assert.match(shell, /<aside[^>]*id="sidebar"[^>]*aria-label="[^"]+"[^>]*>/,
    'the persistent navigation must remain an explicitly labelled complementary landmark');
  assert.match(shell, /<nav[^>]*id="nav"[^>]*aria-label="[^"]+"[^>]*>/,
    'the primary navigation must retain an accessible name');
  assert.match(shell, /<main[^>]*id="content"[^>]*tabindex="-1"[^>]*aria-live="polite"[^>]*>/,
    'route content must be a programmatic focus target and politely announce replacements');
  assert.match(shell, /<button[^>]*id="mobile-menu"[^>]*aria-label="[^"]+"[^>]*aria-controls="sidebar"[^>]*aria-expanded="false"[^>]*>/,
    'the icon-only mobile menu control must expose its state and target');
  assert.match(shell, /<button[^>]*id="sidebar-overlay"[^>]*aria-label="[^"]+"[^>]*hidden[^>]*>/,
    'mobile navigation needs a labelled, initially hidden dismissal overlay');
  assert.match(shell, /<div[^>]*id="toast"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"[^>]*>/,
    'toast updates must use an atomic polite live region');
});

test('shared render primitives and new-tab links preserve safe, reusable contracts', () => {
  const app = assets['app.js'];

  for (const name of ['icon', 'pageHeader', 'loadingState', 'emptyState', 'errorState', 'notice']) {
    assert.match(app, new RegExp(`(?:const|function)\\s+${name}\\s*(?:=|\\()`),
      `missing shared ${name} renderer`);
  }
  assert.match(app, /const icon\s*=\s*\(name,options=\{\}\)/,
    'icons need options for accessible icon-only and decorative use cases');
  assert.match(app, /const loadingState\s*=\s*\(message=/,
    'loading output must be parameterized instead of route-local markup');
  assert.match(app, /const errorState\s*=\s*\(options=\{\}\)/,
    'error output must accept safely escaped title and detail options');
  assert.match(app, /\$\('#content'\)\.innerHTML=loadingState\(t\('Loading…'\)\)/,
    'route transitions must use the shared loading renderer');
  assert.match(app, /\$\('#content'\)\.innerHTML=errorState\(\{title:t\('Unable to load this page'\),detail:t\(e\.message\)\}\)/,
    'route failures must use the shared error renderer');

  assert.match(app, /const secureExternalLinks=.*a\[target="_blank"\].*setAttribute\('rel','noopener noreferrer'\)/,
    'all new-tab links must block opener access and omit referrer data at the shared rendering boundary');
  assert.match(app, /secureExternalLinks\(document\)/,
    'the initial shell must apply new-tab link hardening before users interact with it');
});

test('authentication and onboarding provide accessible form states, live errors, and dialog semantics', () => {
  const html = assets['index.html'];
  const app = assets['app.js'];

  assert.match(html, /<form[^>]*id="login-form"[^>]*>/,
    'login form must exist as a semantic form');
  assert.match(html, /<input[^>]*name="email"[^>]*type="email"[^>]*autocomplete="email"[^>]*required[^>]*>/,
    'login email input must include email type, autocomplete, and required attributes');
  assert.match(html, /<input[^>]*name="password"[^>]*type="password"[^>]*autocomplete="current-password"[^>]*required[^>]*>/,
    'login password input must include password type, autocomplete, and required attributes');
  assert.match(html, /<div[^>]*id="login-error"[^>]*role="alert"[^>]*aria-live="assertive"[^>]*>/,
    'login form must provide a dedicated assertive alert live region for errors');
  assert.match(html, /<dialog[^>]*id="modal"[^>]*aria-modal="true"[^>]*aria-label="[^"]+"[^>]*>/,
    'the global modal dialog must have an accessible name or label');
  assert.match(html, /<dialog[^>]*id="onboarding-modal"[^>]*aria-modal="true"[^>]*aria-labelledby="onboarding-title"[^>]*>/,
    'the onboarding dialog must reference its accessible title');

  assert.match(app, /aria-busy/,
    'login submission must manage an accessible busy state during in-flight requests');
  assert.match(app, /login-error/,
    'login submission failures must render to the dedicated form alert region');
  assert.match(app, /modalPointerStartedOutside|isModalBackdropClick/,
    'modal dialog must only dismiss when the user clicks directly on the backdrop outside the dialog');
});

test('personal workflows (#my-tasks-today, #my-tasks, task detail) use shared primitives, accessible controls, and no raw emoji', () => {
  const app = assets['app.js'];

  assert.match(app, /pageHeader\(\{\s*title:\s*(?:t\('My tasks today'\)|'My tasks today')/,
    '#my-tasks-today must use the shared pageHeader primitive');
  assert.match(app, /pageHeader\(\{\s*title:\s*(?:t\('My tasks'\)|'My tasks')/,
    '#my-tasks must use the shared pageHeader primitive');
  assert.doesNotMatch(app, /⚡\s*\$\{t?k?\.weight\}đ/,
    'weight badges must use Phosphor lightning icon instead of raw emoji');
  assert.doesNotMatch(app, /['"]▧['"]/,
    'attachment icons must not use text glyph ▧');
  assert.doesNotMatch(app, /['"]▤['"]/,
    'attachment icons must not use text glyph ▤');
});

test('activity and calendar workflows (#calendar, #activities, Kanban) use accessible controls, Phosphor icons, and shared headers', () => {
  const app = assets['app.js'];

  assert.match(app, /pageHeader\(\{\s*title:\s*(?:t\('Calendar'\)|'Calendar')/,
    '#calendar must use shared pageHeader');
  assert.match(app, /pageHeader\(\{\s*title:\s*(?:t\('Activities'\)|'Activities')/,
    '#activities must use shared pageHeader');
  assert.doesNotMatch(app, /['"]📅\s*/,
    'calendar agenda must use Phosphor calendar icon instead of raw emoji');
  assert.doesNotMatch(app, /<button[^>]*id="cal-prev"[^>]*>‹<\/button>/,
    'calendar previous month button must use accessible Phosphor icon');
  assert.doesNotMatch(app, /<button[^>]*id="cal-next"[^>]*>›<\/button>/,
    'calendar next month button must use accessible Phosphor icon');
  assert.doesNotMatch(app, /<span class="task-icon">✓<\/span>/,
    'calendar task pills must use Phosphor check icon instead of text glyph');
});

test('organization workflows (#teams, #people, #team/:id) use shared headers and accessible modal confirmations instead of native confirm', () => {
  const app = assets['app.js'];

  assert.match(app, /pageHeader\(\{\s*title:\s*(?:translate\('Teams'\)|'Teams')/,
    '#teams must use the shared pageHeader primitive');
  assert.match(app, /pageHeader\(\{\s*title:\s*(?:t\('People'\)|'People')/,
    '#people must use the shared pageHeader primitive');
  assert.match(app, /function confirmModal\s*\(/,
    'a shared confirmModal helper must replace native confirm dialogs');
  assert.doesNotMatch(app, /if\s*\(!confirm\(/,
    'destructive actions must not depend on native browser confirm() dialog');
});

test('knowledge, reporting and notification surfaces (#documents, #reports, #archive, notifications) use shared primitives and Phosphor icons', () => {
  const app = assets['app.js'];
  const notifications = fs.readFileSync(path.join(publicDir, 'notifications.js'), 'utf8');

  assert.match(app, /pageHeader\(\{\s*title:\s*(?:t\('Documents'\)|'Documents')/,
    '#documents must use the shared pageHeader primitive');
  assert.match(app, /pageHeader\(\{\s*title:\s*(?:t\('Reports'\)|'Reports')/,
    '#reports must use the shared pageHeader primitive');
  assert.match(app, /pageHeader\(\{\s*title:\s*(?:t\('Activity archive'\)|'Activity archive')/,
    '#archive must use the shared pageHeader primitive');
  assert.doesNotMatch(app, /['"]⇩\s*Export Excel report['"]/,
    '#reports export button must use Phosphor download icon instead of text glyph ⇩');
  assert.doesNotMatch(notifications, /<span class="notification-symbol">!<\/span>/,
    'notifications must use Phosphor icons instead of text symbol !');
});

test('translation function t is never shadowed by local variables or parameters in app.js', () => {
  const app = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf8');

  // Global translate assignment is allowed: const t = translate;
  const matches = [...app.matchAll(/(?:const|let|var|,)\s*t\s*=/g)];
  assert.equal(matches.length, 1, 'only the global t = translate should declare variable t');
  assert.match(app.slice(matches[0].index, matches[0].index + 25), /const\s*t\s*=\s*translate/, 'the sole t declaration must be const t = translate');

  // taskDetailModal must not declare t=d.task or invoke t on non-function
  assert.doesNotMatch(app, /,\s*t\s*=\s*d\.task/, 'taskDetailModal must not shadow t with d.task');
});

