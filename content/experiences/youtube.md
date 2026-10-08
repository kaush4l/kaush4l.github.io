---
# YouTube-style channel + watch page. Every word, colour and key size below is read at build time.
theme: youtube
order: 4
title: "Channel"
card:
  tagline: "Subscribe to the career"
  blurb: "A video channel where every role and project is an episode: generated thumbnails, a watch page with chapters for each achievement, and skills as Shorts."
tokens:
  sidebar: "240px"
  rail: "72px"
  topbar: "56px"
  tabbar: "64px"
  grid-min: "320px"
  radius: "12px"
  radius-lg: "16px"
  target: "44px"
  max: "2200px"
palette:
  light:
    bg: "#FFFFFF"
    surface: "#F2F2F2"
    surface-2: "#E5E5E5"
    glass: "#FFFFFF"
    text: "#0F0F0F"
    muted: "#606060"
    accent: "#CC0000"
    accent-text: "#FFFFFF"
    focus: "#065FD4"
    link: "#065FD4"
    hairline: "#E5E5E5"
    chip: "#F2F2F2"
    chip-active: "#0F0F0F"
    chip-active-text: "#FFFFFF"
    subscribe: "#0F0F0F"
    subscribe-text: "#FFFFFF"
    badge: "rgba(0,0,0,0.8)"
    badge-text: "#FFFFFF"
    scrim: "rgba(0,0,0,0.55)"
    toast: "#0F0F0F"
    toast-text: "#FFFFFF"
    progress: "#FF0000"
    brand-1: "#FF0033"
    brand-2: "#7B1FA2"
    brand-3: "#1A237E"
    thumb-text: "#FFFFFF"
    thumb-1: "#B71C1C"
    thumb-2: "#4A148C"
    thumb-3: "#0D47A1"
    thumb-4: "#004D40"
    thumb-5: "#BF360C"
    thumb-6: "#263238"
  dark:
    bg: "#0F0F0F"
    surface: "#272727"
    surface-2: "#3F3F3F"
    glass: "#0F0F0F"
    text: "#F1F1F1"
    muted: "#AAAAAA"
    accent: "#FF4E45"
    accent-text: "#0F0F0F"
    focus: "#3EA6FF"
    link: "#3EA6FF"
    hairline: "#3F3F3F"
    chip: "#272727"
    chip-active: "#F1F1F1"
    chip-active-text: "#0F0F0F"
    subscribe: "#F1F1F1"
    subscribe-text: "#0F0F0F"
    badge: "rgba(0,0,0,0.8)"
    badge-text: "#FFFFFF"
    scrim: "rgba(0,0,0,0.6)"
    toast: "#F1F1F1"
    toast-text: "#0F0F0F"
    progress: "#FF0000"
    brand-1: "#B3001F"
    brand-2: "#4A148C"
    brand-3: "#0D1440"
labels:
  wordmark: "KaushTube"
  back: "Experience Center"
  light: "Switch to light appearance"
  dark: "Switch to dark appearance"
  # Reference month for "age" and "Present" — keeps static export deterministic.
  now: "2026-10"
  handle: "@kaush4l"
  initials: "KK"
  # Banner art: {name}, {headline} (headline falls back to role, then name).
  banner: "{headline}"
  sep: " · "
  hashtag: "#{tag}"
  aria:
    guide: "Toggle guide"
    homeLink: "Channel home"
    search: "Search videos"
    searchButton: "Search"
    tabs: "Channel sections"
    chips: "Filter videos by skill"
    bottomNav: "Primary"
    guideNav: "Guide"
    play: "Play"
    pause: "Pause"
    closeWatch: "Back to channel"
    like: "Like this video"
    dislike: "Dislike this video"
    bell: "Notify me about new uploads"
    upNext: "Up next"
    chapters: "Chapters"
  search:
    placeholder: "Search this channel"
    empty: "No videos match “{q}”. Try another skill or clear the search."
    results: "{n} results for “{q}”"
  guide:
    - { id: home, label: "Home", icon: home }
    - { id: videos, label: "Videos", icon: subs }
    - { id: shorts, label: "Shorts", icon: shorts }
    - { id: about, label: "About", icon: you }
  guideSection: "Explore"
  tabs:
    - { id: home, label: "Home" }
    - { id: videos, label: "Videos" }
    - { id: shorts, label: "Shorts" }
    - { id: playlists, label: "Playlists" }
    - { id: about, label: "About" }
  # Bottom-bar / guide id → channel tab id it opens.
  guideTarget:
    home: home
    videos: videos
    shorts: shorts
    about: about
  chipAll: "All"
  channel:
    videoCount: "{n} videos"
    more: "…more"
    less: "Show less"
    subscribe: "Subscribe"
    subscribed: "Subscribed"
  shelves:
    featured: "Now playing"
    roles: "Roles"
    projects: "Projects"
    shorts: "Shorts"
    playlists: "Playlists"
  video:
    meta: "{age}"
    duration: "{y}:{mm}:00"
    live: "LIVE"
    liveAge: "Streaming now"
    ageYears: "{n} years ago"
    ageYear: "1 year ago"
    ageMonths: "{n} months ago"
    ageNew: "This month"
  watch:
    back: "Back to channel"
    share: "Share"
    copied: "Link copied"
    copyFailed: "Copy failed — use the address bar"
    like: "Like"
    more: "…more"
    less: "Show less"
    chapters: "Chapters"
    chapter: "Chapter {n}"
    chapterOf: "Chapter {n} / {total}"
    upNext: "Up next"
    location: "Filmed in {place}"
    open: "Visit link"
    playHint: "Play to step through each chapter"
  shorts:
    count: "{n} skills"
  playlists:
    education: "Education"
    contact: "Contact"
    educationCount: "{n} lessons"
    contactCount: "{n} links"
  about:
    heading: "About"
    description: "Description"
    links: "Links"
    details: "Channel details"
    stats: "Stats"
    statsVideos: "{n} videos"
    statsShorts: "{n} shorts"
    statsYears: "Active since {year}"
    highlights: "Highlights"
---
Engineering work, uploaded one role at a time. Every video below is a job or project from the résumé — open one to watch its chapters.
