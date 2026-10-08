---
# The home page. Every word, colour, size and camera angle on `/` is read from
# this file at build time. Résumé content itself comes from content/0*-*.

title: "Kaushal Kanakamedala"
eyebrow: "Senior Software Engineer · Applied AI"

# ── Figure ───────────────────────────────────────────────────────────────────
figure:
  src: "/home/figure.png"       # transparent cut-out, standing on the desk
  alt: "Kaushal, smiling, in a black t-shirt and cap"
  height: 1.05                  # scene units (desk top is ~1.6 x 0.8)

# ── 3D scene ─────────────────────────────────────────────────────────────────
scene:
  defaultView: "three-quarter-right"   # pick from views[].id after testing
  autoRotate: false
  autoRotateSpeed: 0.6
  macScale: 1.3                 # MacBook + props size relative to the figure
  framing:
    offsetX: 0.18               # on wide screens, push the desk right (fraction of canvas width)
    minAspect: 1.2              # ...only when canvas width/height exceeds this
  # Camera positions around the desk. azimuth/elevation in degrees, distance in scene units.
  views:
    - { id: front,               label: "Front",        azimuth: 0,    elevation: 12, distance: 3.6 }
    - { id: three-quarter-right, label: "¾ Right",      azimuth: 38,   elevation: 18, distance: 3.6 }
    - { id: right,               label: "Right",        azimuth: 90,   elevation: 14, distance: 3.8 }
    - { id: back-right,          label: "Back right",   azimuth: 140,  elevation: 20, distance: 3.8 }
    - { id: back,                label: "Back",         azimuth: 180,  elevation: 16, distance: 3.8 }
    - { id: back-left,           label: "Back left",    azimuth: -140, elevation: 20, distance: 3.8 }
    - { id: left,                label: "Left",         azimuth: -90,  elevation: 14, distance: 3.8 }
    - { id: three-quarter-left,  label: "¾ Left",       azimuth: -38,  elevation: 18, distance: 3.6 }
    - { id: top,                 label: "Top",          azimuth: 20,   elevation: 62, distance: 3.4 }
    - { id: low,                 label: "Low hero",     azimuth: 24,   elevation: 4,  distance: 3.1 }
  screen:
    # What the MacBook displays (drawn to a texture).
    lines: ["kaush4l.github.io", "Senior Software Engineer", "Applied AI · Durham, NC"]
  colors:
    light:
      background: "#F5F5F7"
      floor: "#E8E8ED"
      desk: "#C8A27A"
      deskLeg: "#2C2C2E"
      aluminum: "#D6D6DB"
      keyboard: "#1D1D1F"
      screen: "#0B0B0F"
      screenText: "#F5F5F7"
      screenAccent: "#2997FF"
      mug: "#FFFFFF"
      plant: "#3A7D44"
      pot: "#E5E1DA"
      lamp: "#1D1D1F"
      lampLight: "#FFE8C2"
      key: "#FFFFFF"
      ambient: "#FFFFFF"
      steam: "#FFFFFF"
      figureBack: "#3A3A3C"
    dark:
      background: "#000000"
      floor: "#0E0E10"
      desk: "#6B4E33"
      deskLeg: "#1C1C1E"
      aluminum: "#8E8E93"
      keyboard: "#0A0A0A"
      screen: "#050507"
      screenText: "#F5F5F7"
      screenAccent: "#2997FF"
      mug: "#D1D1D6"
      plant: "#2E6A38"
      pot: "#3A3A3C"
      lamp: "#2C2C2E"
      lampLight: "#FFD9A0"
      key: "#9DB4FF"
      ambient: "#3A3A5A"
      steam: "#C7C7CC"
      figureBack: "#5A5A60"

# ── Labels for the scene's controls ─────────────────────────────────────────
sceneLabels:
  region: "Interactive 3D desk. Drag to orbit, or choose a view."
  views: "Camera views"
  rotate: "Auto-rotate"
  reset: "Reset view"
  angle: "Angle {az}° · Tilt {el}°"
  copy: "Copy angle"
  copied: "Copied"
  hint: "Drag to look around · Tap the figure"
  loading: "Setting up the desk…"
  fallback: "Kaushal at the desk"
  reactions: ["Hi there!", "Thanks for stopping by.", "Ask the chat anything.", "Scroll for the work."]

# ── Navigation (glass bar) ──────────────────────────────────────────────────
nav:
  brand: "Kaushal"
  items:
    - { id: about,       label: "About" }
    - { id: experience,  label: "Experience" }
    - { id: projects,    label: "Projects" }
    - { id: skills,      label: "Skills" }
    - { id: education,   label: "Education" }
    - { id: experiences, label: "Experiences" }
    - { id: contact,     label: "Contact" }
  resume: "Résumé"
  resumeHref: "/Kaushal-Resume.pdf"
  menu: "Menu"
  close: "Close menu"
  light: "Switch to light appearance"
  dark: "Switch to dark appearance"
  skip: "Skip to content"
  label: "Sections"

# ── Sections ────────────────────────────────────────────────────────────────
hero:
  primary: "See the work"
  primaryHref: "#experience"
  secondary: "Ask the résumé"
  highlights: "Highlights"
sections:
  about:       { eyebrow: "About",       title: "Engineer. Builder. Shipper." }
  experience:  { eyebrow: "Experience",  title: "Ten years, in production.", present: "Present", more: "Show details", less: "Hide details" }
  projects:    { eyebrow: "Projects",    title: "Things built on purpose.", open: "View project" }
  skills:      { eyebrow: "Skills",      title: "The toolbox." }
  education:   { eyebrow: "Education",   title: "Where it started." }
  experiences: { eyebrow: "Experience Center", title: "Read it another way.", open: "Open" }
  contact:     { eyebrow: "Contact",     title: "Let’s build something.", lead: "Open to senior engineering and applied-AI roles. The fastest way in is a short note." }
footer:
  note: "Built with Next.js · the assistant runs on your own device."
  top: "Back to top"

# ── Theme tokens ────────────────────────────────────────────────────────────
tokens:
  max: "1120px"
  radius: "28px"
  radius-sm: "14px"
  nav-h: "52px"
palette:
  light:
    bg: "#FBFBFD"
    bg-alt: "#F5F5F7"
    surface: "#FFFFFF"
    glass: "#FFFFFF"
    text: "#1D1D1F"
    muted: "#6E6E73"
    hairline: "rgba(0,0,0,0.08)"
    accent: "#0066CC"
    accent-text: "#FFFFFF"
    focus: "#0071E3"
    chip: "#F2F2F7"
    glow-a: "rgba(0,113,227,0.12)"
    glow-b: "rgba(191,90,242,0.10)"
  dark:
    bg: "#000000"
    bg-alt: "#0A0A0C"
    surface: "#1C1C1E"
    glass: "#1C1C1E"
    text: "#F5F5F7"
    muted: "#A1A1A6"
    hairline: "rgba(255,255,255,0.10)"
    accent: "#2997FF"
    accent-text: "#000000"
    focus: "#2997FF"
    chip: "#2C2C2E"
    glow-a: "rgba(41,151,255,0.20)"
    glow-b: "rgba(191,90,242,0.16)"
---
