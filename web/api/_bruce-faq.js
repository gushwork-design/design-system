/* ============================================================================
   _bruce-faq.js — what Bruce knows about design.gushwork.ai, as plain answers.

   Every answer here is taken from the repo (ONBOARDING.md, INSTALL.md, foundation/voice.md, the site's own pages and
   the access rules in _access.js), not from memory. When one of those changes, change the answer here and the test
   will tell you which line still says the old thing. No model is involved: a question is matched on its words and gets
   the same answer every time.

   `words` are what a question contains (already lower case, after the stop words are dropped in _concierge.js).
   `strong` words count double. An answer needs a score of 2 to be given.
   An answer is a function of `L(path, label)`, which makes a Slack link to the site, so the base URL lives in one place.
   ========================================================================= */

export const FAQ = [
  {
    id: 'about',
    words: ['design', 'hub', 'site', 'website', 'gushwork', 'what', 'about', 'purpose', 'for', 'used'],
    strong: ['hub', 'website', 'site'],
    answer: (L) => [
      'design.gushwork.ai is the Gushwork design hub, a subdomain just for design. It is not the Gushwork website, which is gushwork.ai.',
      'It is where the team gets the official brand files, the Style Guide, templates, a few small tools, and the Claude plugin that builds on-brand work.',
      'Everything on it comes from one design system, so what you download here matches what Claude builds.',
      `Ask me “what is on the site” for the map, or start at the ${L('/', 'Overview')}.`,
    ],
  },
  {
    id: 'homepage',
    words: ['homepage', 'home', 'main', 'company', 'real', 'actual', 'public', 'website', 'site', 'gushwork', 'pricing', 'product', 'customers', 'demo', 'book', 'marketing', 'blog', 'careers'],
    strong: ['homepage', 'pricing', 'careers', 'marketing', 'blog'],
    answer: () => [
      'This is the design hub, not the Gushwork website. The company website is at <https://gushwork.ai|gushwork.ai>.',
      'design.gushwork.ai is only for the team’s design work: brand files, the Style Guide, templates, tools and the Claude plugin.',
    ],
  },
  {
    id: 'map',
    words: ['sections', 'pages', 'menu', 'sidebar', 'navigate', 'map', 'where', 'everything', 'site', 'hub', 'what', 'list', 'contains', 'have'],
    strong: ['sections', 'sidebar', 'menu', 'map', 'pages'],
    answer: (L) => [
      '*Open to anyone:* ' + [L('/', 'Overview'), L('/style-guide', 'Style Guide'), L('/downloads', 'Downloads')].join(', ') + '.',
      '*With your Gushwork Google sign-in:* ' + [L('/internal/claude-plugin', 'Claude Plugin'), L('/internal/tools', 'Tools'), L('/internal/templates', 'Templates'), L('/internal/changelog', 'Change Log')].join(', ') + ', and ' + L('/internal/staging', 'Staging') + ' for the GTM team.',
      '*Admins only:* Design System and Access Control. *Owner only:* Analytics.',
    ],
  },
  {
    id: 'signin',
    words: ['sign', 'signin', 'login', 'log', 'access', 'password', 'permission', 'permissions', 'denied', 'open', 'cant', 'locked', 'google', 'account', 'who', 'allowed', 'gushwork', 'signup'],
    strong: ['signin', 'login', 'access', 'denied', 'permission', 'permissions', 'password', 'locked', 'signup'],
    answer: (L) => [
      'Sign in with your @gushwork.ai Google account. There is no separate password.',
      `The ${L('/', 'Overview')}, ${L('/style-guide', 'Style Guide')} and ${L('/downloads', 'Downloads')} are open to anyone. The rest needs a Gushwork sign-in. Design System and Access Control are for admins, and Analytics is for the owner only.`,
      'Signed in and still locked out of something? Tell Utsav which page and which email, and he can open it up.',
    ],
  },
  {
    id: 'plugin-install',
    words: ['install', 'plugin', 'setup', 'set', 'claude', 'code', 'add', 'marketplace', 'start', 'started', 'begin', 'getting', 'use', 'using'],
    strong: ['install', 'plugin', 'marketplace', 'setup'],
    answer: (L) => [
      'The plugin makes Claude Code build Gushwork work from the real tokens and components. It needs Claude Code (the terminal tool, not the website) and access to the design-system repo on GitHub.',
      'Then run this in any terminal:',
      '```curl -fsSL https://raw.githubusercontent.com/gushwork-design/design-system/main/scripts/install.sh | bash```',
      'Restart Claude Code afterwards. Running it again is also the fix when you are not sure what state you are in.',
      `Step by step: the ${L('/internal/claude-plugin', 'Claude Plugin page')}. No GitHub access yet? Ask Utsav to add you.`,
    ],
  },
  {
    id: 'plugin-update',
    words: ['update', 'updates', 'updating', 'latest', 'version', 'outdated', 'behind', 'upgrade', 'plugin', 'old', 'stale', 'current'],
    strong: ['update', 'updates', 'upgrade', 'outdated', 'behind', 'version'],
    answer: (L) => [
      'The plugin updates itself. If your Claude Code session has fallen behind, it says so at the start and names what changed. Silence means you are current.',
      'To update by hand, run `claude plugin marketplace update gushwork` and restart Claude Code.',
      `What changed in each release is on the ${L('/internal/changelog', 'Change Log')}.`,
    ],
  },
  {
    id: 'plugin-fix',
    words: ['not', 'working', 'broken', 'fired', 'firing', 'ignore', 'ignoring', 'ignored', 'skill', 'doesnt', 'didnt', 'wrong', 'off', 'brand', 'plugin', 'claude', 'fix', 'problem', 'issue', 'error'],
    strong: ['firing', 'fired', 'ignoring', 'ignored', 'skill', 'wrong'],
    answer: (L) => [
      'When the plugin is working, Claude’s reply opens with “Using the Gushwork … skill.” If that line is missing, it did not fire.',
      'Restart Claude Code, then run `claude plugin list` to check it is installed. If you are unsure of the state, run the install command again; it is safe to repeat.',
      `Still off? Tell Utsav what you asked for and what came back. The ${L('/internal/claude-plugin', 'Claude Plugin page')} has the details.`,
    ],
  },
  {
    id: 'how-to-use',
    words: ['how', 'use', 'using', 'ask', 'prompt', 'prompts', 'build', 'example', 'examples', 'tips', 'work', 'works', 'claude'],
    strong: ['prompt', 'prompts', 'example', 'examples', 'tips'],
    answer: () => [
      'Ask Claude for the work, not for the skill. For example: “Build a dashboard for the sales team to see show-ups over the week.” You never name the skills; they fire on the work.',
      'Expect two or three questions first. That is on purpose, because guessing produces a screen that looks right and answers nothing.',
      'Before you ship it, look for a raw hex code, a blue filled button on a dashboard, and a “Sample data” badge. Any of those means something needs another pass.',
    ],
  },
  {
    id: 'missing-component',
    words: ['missing', 'component', 'components', 'new', 'need', 'request', 'add', 'library', 'gap', 'built', 'builds', 'four', 'block', 'slack'],
    strong: ['missing', 'component', 'components', 'gap'],
    answer: () => [
      'When a screen needs something the library does not have, Claude builds it and hands you a short four-line block for Slack.',
      'Please send that block to Utsav. He replies Add (draw it in Figma), Replace (something already covers it), Promote (the build was right) or Revert. A decision that stays in a chat gets made again next month.',
    ],
  },
  {
    id: 'privacy',
    words: ['track', 'tracking', 'tracked', 'log', 'logs', 'logged', 'logging', 'privacy', 'private', 'data', 'record', 'records', 'spy', 'monitor', 'monitored', 'collect', 'collected', 'prompts', 'plugin', 'see'],
    strong: ['track', 'tracking', 'tracked', 'privacy', 'logged', 'logging', 'collect', 'collected', 'monitored'],
    answer: () => [
      'The plugin records who you are (your Claude or git email), which version you run, when a session starts, which Gushwork skill ran, and the names of the files it wrote. Only names, never the folder.',
      'It never records your prompts. It exists so we can see whether the design system is being used and who is on an old version.',
      'To switch it off, set `GW_NO_USAGE_PING=1` in your shell. The site itself notes which work email signs in and which pages it opens; only the owner can see that.',
    ],
  },
  {
    id: 'contact',
    words: ['who', 'owns', 'owner', 'contact', 'ask', 'help', 'support', 'talk', 'person', 'responsible', 'runs', 'built', 'made', 'maintains', 'reach', 'report', 'bug', 'bugs', 'feedback', 'issue', 'suggestion', 'suggest', 'idea'],
    strong: ['owns', 'owner', 'contact', 'support', 'responsible', 'maintains', 'bug', 'bugs', 'feedback', 'suggestion', 'report'],
    answer: () => [
      'Utsav Singh owns the design system and this site. For access, questions, bugs or ideas, message him on Slack.',
      'For a bug, say which page you were on and what you saw. A screenshot helps.',
    ],
  },
  {
    id: 'brand-basics',
    words: ['brand', 'fonts', 'font', 'typeface', 'blue', 'primary', 'colour', 'color', 'colors', 'which', 'use', 'basics', 'guidelines', 'rules'],
    strong: ['basics', 'guidelines'],
    answer: (L) => [
      'Headings are set in Vert Grotesk Display and everything else in Inter. The brand blue is #0070FF.',
      `The full colors, type and spacing are in the ${L('/style-guide', 'Style Guide')}. I can send the color sheet or the fonts if you ask for them.`,
    ],
  },
  {
    id: 'voice',
    words: ['voice', 'tone', 'writing', 'write', 'copy', 'wording', 'words', 'capitalise', 'capitalize', 'casing', 'case', 'sentence', 'style', 'emoji', 'exclamation', 'punctuation', 'cta', 'button'],
    strong: ['voice', 'tone', 'copy', 'casing', 'emoji', 'exclamation', 'punctuation', 'sentence', 'cta'],
    answer: (L) => [
      'We write plainspoken and direct, like a senior strategist talking to a busy founder. Lead with the outcome and the number.',
      'Sentence case everywhere: headings, buttons, labels. No exclamation marks and no emoji. The one fixed exception is the primary button, which always reads “Book a Demo”.',
      `More in the ${L('/style-guide', 'Style Guide')}.`,
    ],
  },
  {
    id: 'logo-rules',
    words: ['redraw', 'recreate', 'edit', 'change', 'modify', 'stretch', 'recolour', 'recolor', 'clear', 'space', 'logo', 'rules', 'allowed', 'can'],
    strong: ['redraw', 'recreate', 'stretch', 'recolour', 'recolor', 'modify'],
    answer: (L) => [
      'Please use the logo files as they are and do not redraw or re-export them. A mark rebuilt by hand drifts.',
      `Clear space and what not to do are in the ${L('/style-guide#logo', 'Style Guide')}. I can send the files if you tell me which one.`,
    ],
  },
  {
    id: 'ai-tools',
    words: ['chatgpt', 'gpt', 'gemini', 'canva', 'ai', 'other', 'tool', 'tools', 'copilot', 'midjourney', 'figma', 'llm'],
    strong: ['chatgpt', 'gpt', 'gemini', 'copilot', 'midjourney', 'llm'],
    answer: (L) => [
      `Using ChatGPT or another AI tool? Copy the page from the ${L('/style-guide', 'Style Guide')} and attach the zip from “Download all” on the ${L('/downloads', 'Downloads page')}.`,
      'Those tools cannot fetch the files themselves, and without them they redraw the logo and pick their own fonts.',
    ],
  },
  {
    id: 'staging',
    words: ['staging', 'stage', 'preview', 'draft', 'drafts', 'unreleased', 'internal', 'live', 'launch', 'launched', 'project', 'projects'],
    strong: ['staging', 'stage', 'unreleased'],
    answer: (L) => [
      `${L('/internal/staging', 'Staging')} is where new projects go live first, at design.gushwork.ai/internal/staging/<name>. It stays there until someone decides to make it public.`,
      'It is open to the GTM team.',
    ],
  },
  {
    id: 'changelog',
    words: ['changed', 'changes', 'change', 'changelog', 'release', 'releases', 'notes', 'whats', 'recent', 'recently', 'news', 'history', 'versions'],
    strong: ['changelog', 'release', 'releases', 'changes', 'history', 'recently'],
    answer: (L) => [`Every release, with what changed, is on the ${L('/internal/changelog', 'Change Log')}. It needs your Gushwork sign-in.`],
  },
  {
    id: 'design-system',
    words: ['library', 'review', 'approved', 'approve', 'approval', 'gate', 'passed', 'foundations', 'catalogue', 'catalog', 'system', 'status', 'design'],
    strong: ['library', 'review', 'approved', 'approval', 'foundations', 'catalogue'],
    answer: () => [
      'The Design System page (admins only) has three tabs. Library shows only what has been approved: foundations like color and type, and the components built on them. Review is where Utsav approves, sends back or rejects what is waiting. Workflow explains how design requests move.',
      'Nothing reaches the plugin until it has been approved there.',
    ],
  },
  {
    id: 'download-all',
    words: ['zip', 'everything', 'all', 'bundle', 'package', 'together', 'once', 'download', 'downloads', 'kit'],
    strong: ['zip', 'bundle', 'package', 'kit'],
    answer: (L) => [`The ${L('/downloads', 'Downloads page')} has a “Download all” button that gives you everything in one zip: the logos, color sheet, fonts and tokens.`],
  },
  {
    id: 'utsav',
    words: ['utsav', 'singh', 'creator', 'created', 'made', 'maker', 'built', 'builder', 'owner', 'owns', 'who', 'design', 'head', 'boss', 'behind', 'person'],
    strong: ['utsav', 'creator', 'created', 'maker', 'builder'],
    answer: (_L, who = 'Utsav') => [
      `${who} is my creator, and he built me.`,
      'He runs the design hub (design.gushwork.ai), where the team gets the brand files, templates and tools, and he owns the design system behind it. He reviews and approves everything before it reaches the Claude plugin, which is how Claude builds on-brand work.',
      'For access, questions or ideas about design, he is the person to ask.',
    ],
  },
  {
    id: 'why-bruce',
    words: ['why', 'purpose', 'exist', 'exists', 'point', 'reason', 'bruce', 'needed', 'useful', 'for', 'goal', 'idea', 'behind'],
    strong: ['purpose', 'exist', 'exists', 'reason', 'goal'],
    answer: () => [
      'Design should not be the bottleneck. Utsav built me so the team can get brand files, templates and answers straight away, without waiting on the design desk.',
      'Over time I’ll take on small, well-defined design jobs too, always inside the design system so the work stays on brand. Right now I hand over files and point you to the right template.',
    ],
  },
  {
    id: 'bruce',
    words: ['bruce', 'you', 'bot', 'assistant', 'who', 'are', 'yourself', 'name', 'about', 'what', 'do', 'can', 'built', 'capable'],
    strong: ['bot', 'assistant', 'yourself'],
    answer: () => [
      'I’m Bruce, the design agent for Gushwork. I send the brand files, point you to the right template or tool, and answer basic questions about the hub. I also build things: DM me a brief for a landing page, one-pager, deck or banner and you get a link and a screenshot back.',
      'Utsav built me, and designing is the next thing I’ll learn.',
    ],
  },
];

/* Phrases that say it better than single words do. A hit is worth 3, enough to answer on its own. */
const PATTERNS = {
  homepage: [/(?:main|company|real|actual|public|marketing|corporate)\s+(?:site|website|homepage|home\s*page)/, /where\s+is\s+(?:the\s+)?(?:gushwork\s+)?(?:website|homepage|home\s*page)/, /(?<!design\.)gushwork\.ai/, /is\s+this\s+(?:the\s+)?gushwork\s+(?:website|homepage|site)/, /is\s+this\s+the\s+(?:main|real|actual|company)\s/],
  map: [/what(?:'s| is)?\s+(?:on|in)\s+(?:the\s+)?(?:site|hub|website)/, /what\s+pages/, /\b(?:site|hub)\s+map\b/],
  signin: [/\bsign[\s-]?in\b/, /\blog[\s-]?in\b/, /\bsign[\s-]?up\b(?!\s+(?:ad|page|template))/],
  privacy: [/plugin\s+(?:log|track|record|collect)/, /(?:log|track|record|collect)\w*\s+(?:me|my|what)/, /what\s+(?:does|do)\s+(?:the\s+)?plugin\s+(?:log|track|record)/],
  voice: [/book\s+a\s+(?:demo|call)/, /tone\s+of\s+voice/, /sentence\s+case/],
  'design-system': [/(?:admin|design[\s-]system)\s+page/, /library\s+page/, /review\s+and\s+approval/],
  utsav: [/who\s+is\s+utsav/, /about\s+utsav/, /who\s+(?:made|built|created|owns|runs|designed)\s+(?:you|bruce|this|the\s+(?:hub|site|design\s+system))/, /who\s+is\s+(?:your|the)\s+(?:creator|owner|maker)/, /design\s+owner/],
  'why-bruce': [/why\s+(?:do|did)\s+you\s+exist/, /why\s+(?:was|were)\s+(?:you|bruce)\s+(?:made|built|created)/, /what\s+(?:are\s+you|is\s+bruce)\s+for/, /your\s+purpose/, /why\s+(?:do\s+we\s+have\s+)?bruce/, /why\s+are\s+you\s+here/],
  bruce: [/will\s+you\s+(?:design|make)/, /who\s+are\s+you/, /what\s+are\s+you(?!\s+for)/, /are\s+you\s+(?:a\s+)?(?:bot|robot|ai)/, /your\s+name/],
  contact: [/who\s+(?:owns|runs|maintains)/, /who\s+(?:do|should)\s+i\s+(?:ask|contact|talk)/],
};

/** The best answer for a list of normalised words (and the raw text, for phrases), or null. */
export function matchFaq(words, raw = '') {
  let best = null;
  for (const f of FAQ) {
    let score = 0;
    for (const w of new Set(words)) {
      if (f.strong.includes(w)) score += 2;
      else if (f.words.includes(w)) score += 1;
    }
    if ((PATTERNS[f.id] || []).some((re) => re.test(raw))) score += 3;
    if (score >= 2 && (!best || score > best.score)) best = { faq: f, score };
  }
  return best;
}

/** Real ways people ask each one. The test checks every one of these gets its answer, and they are what you see in the list. */
export const EXAMPLES = {
  about: ['what is design.gushwork.ai', 'what is the design hub', 'what is this website for'],
  map: ['what is on the site', 'what pages are there', 'show me the sidebar sections'],
  signin: ['how do I sign in', 'I cant log in', 'access denied on a page', 'who can access the site'],
  'plugin-install': ['how do I install the claude plugin', 'set up the plugin', 'how do I get started with claude code'],
  'plugin-update': ['how do I update the plugin', 'is my plugin outdated', 'am I on the latest version'],
  'plugin-fix': ['the plugin is not working', 'claude ignored the design system', 'the skill did not fire'],
  'how-to-use': ['how do I use the design system', 'give me an example prompt', 'any tips for prompting claude'],
  'missing-component': ['the library is missing a component', 'I need a new component', 'what is the four line slack block'],
  privacy: ['does the plugin track me', 'what does the plugin log', 'is my data collected'],
  contact: ['who owns the design system', 'who do I ask for help', 'where do I report a bug', 'I have a suggestion'],
  'brand-basics': ['what are the brand basics', 'where are the brand guidelines'],
  voice: ['what is our tone of voice', 'how should we write copy', 'do we use emoji or exclamation marks', 'is it Book a Demo or Book a demo'],
  'logo-rules': ['can I redraw the logo', 'can I stretch or recolor the logo', 'logo clear space rules'],
  'ai-tools': ['can I use chatgpt for this', 'what about gemini or other ai tools'],
  staging: ['what is staging', 'where do unreleased projects go'],
  changelog: ['what changed recently', 'where are the release notes', 'show me the changelog'],
  'design-system': ['what is the library page', 'how does review and approval work', 'what is the design system admin page'],
  'download-all': ['can I get everything in one zip', 'is there a download all bundle'],
  bruce: ['who are you', 'what are you', 'are you a bot', 'will you design things'],
  utsav: ['who is utsav', 'who made you', 'who built bruce', 'tell me about utsav', 'who is the design owner'],
  'why-bruce': ['why do you exist', 'why was bruce made', 'what are you for', 'what is your purpose'],
  homepage: ['where is the gushwork homepage', 'is this the gushwork website', 'where is the main gushwork.ai site', 'where can I see pricing'],
};
