---
# Google-style results page. Every word, colour and key size below is read at build time.
theme: google
order: 1
title: "Search"
card:
  tagline: "As if you searched the name"
  blurb: "A results page for one query: organic results for every role and project, a knowledge panel, and people-also-ask built from the résumé."
tokens:
  results-max: "652px"
  panel-max: "368px"
  gutter: "180px"
  radius: "24px"
  radius-sm: "12px"
  search-height: "48px"
  target: "44px"
palette:
  light:
    bg: "#FFFFFF"
    surface: "#FFFFFF"
    surface-2: "#F1F3F4"
    glass: "#FFFFFF"
    text: "#202124"
    muted: "#4D5156"
    link: "#1A0DAB"
    url: "#202124"
    accent: "#1A73E8"
    focus: "#1A73E8"
    hairline: "#DADCE0"
    chip: "#F1F3F4"
    shadow: "rgba(32,33,36,0.18)"
    brand-1: "#4285F4"
    brand-2: "#EA4335"
    brand-3: "#FBBC05"
    brand-4: "#34A853"
  dark:
    bg: "#202124"
    surface: "#303134"
    surface-2: "#303134"
    glass: "#202124"
    text: "#E8EAED"
    muted: "#BDC1C6"
    link: "#8AB4F8"
    url: "#DADCE0"
    accent: "#8AB4F8"
    focus: "#8AB4F8"
    hairline: "#3C4043"
    chip: "#303134"
    shadow: "rgba(0,0,0,0.5)"
    brand-1: "#8AB4F8"
    brand-2: "#F28B82"
    brand-3: "#FDD663"
    brand-4: "#81C995"
labels:
  wordmark: "Kaushal"
  back: "Experience Center"
  light: "Switch to light appearance"
  dark: "Switch to dark appearance"
  search:
    query: "Kaushal Kanakamedala"
    placeholder: "Search the résumé"
    label: "Search"
    submit: "Search"
    clear: "Clear search"
    form: "Search the résumé"
  tabs:
    label: "Result type"
    items:
      - { id: all, label: "All" }
      - { id: experience, label: "Experience" }
      - { id: projects, label: "Projects" }
      - { id: skills, label: "Skills" }
      - { id: education, label: "Education" }
  stats: "About {n} results ({s} seconds)"
  empty: "Your search — {q} — did not match any results."
  emptyHint: "Try different keywords, or clear the search."
  results: "Search results"
  host: "kaush4l.github.io"
  crumbs:
    experience: "experience"
    projects: "projects"
    skills: "skills"
    education: "education"
  sitelinks: "Highlights"
  sep:
    crumb: " › "
    title: " — "
    meta: " · "
    date: " — "
    fact: ": "
  panel:
    label: "About this person"
    facts: "Quick facts"
    born: "Based in"
    role: "Role"
    current: "Current"
    proof: "Track record"
    highlights: "Known for"
    profiles: "Profiles"
    more: "More about {name}"
    less: "Show less"
  paa:
    title: "People also ask"
    questions:
      - { q: "What does {name} do?", source: profile }
      - { q: "Where has {name} worked?", source: experience }
      - { q: "What has {name} built?", source: projects }
      - { q: "Where did {name} study?", source: education }
  related:
    title: "Related searches"
    label: "Search for {q}"
  pager:
    label: "Pages"
    head: "G"
    vowel: "o"
    tail: "gle"
    next: "Next"
    current: "Page {n}, {tab}, current"
    page: "Page {n}, {tab}"
  footer:
    region: "United States"
    note: "Every result is generated from the résumé's markdown."
---
Kaushal's résumé as a search results page. Type in the bar to filter results live.
