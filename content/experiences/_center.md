---
# The Experience Center page itself. Every word and colour here is read at build time.
title: "Experience Center"
eyebrow: "One résumé · four familiar interfaces"
navLabel: "Experiences"
backLabel: "Résumé"
openLabel: "Open"
lightLabel: "Switch to light appearance"
darkLabel: "Switch to dark appearance"
hint: "Read this résumé as Google, LinkedIn, GitHub or YouTube"
# Which content/ folder (number prefix dropped) feeds each part of the résumé.
sources:
  profile: about
  experience: experience
  projects: projects
  skills: skills
  education: education
  contact: contact
tokens:
  max: "1180px"
  radius: "28px"
palette:
  light:
    bg: "#F5F5F7"
    surface: "#FFFFFF"
    glass: "#FFFFFF"
    text: "#1D1D1F"
    muted: "#6E6E73"
    accent: "#0066CC"
    focus: "#0071E3"
    glow-a: "rgba(0,113,227,0.10)"
    glow-b: "rgba(191,90,242,0.10)"
  dark:
    bg: "#000000"
    surface: "#1C1C1E"
    glass: "#1C1C1E"
    text: "#F5F5F7"
    muted: "#A1A1A6"
    accent: "#2997FF"
    focus: "#2997FF"
    glow-a: "rgba(41,151,255,0.18)"
    glow-b: "rgba(191,90,242,0.16)"
---
The same career, read through the interfaces you already know by heart. Pick one — every page is generated from the résumé's markdown, so nothing here is written twice.

To add an experience, drop a new `.md` file in `content/experiences/` and rebuild.
