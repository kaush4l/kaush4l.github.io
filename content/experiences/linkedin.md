---
# LinkedIn-style profile. Every word and colour on the page is read from here.
theme: linkedin
order: 2
title: "Network"
card:
  tagline: "The résumé as a professional profile"
  blurb: "Banner, headline, skills and an activity feed — the career read the way recruiters already scan it."
tokens:
  max: "1128px"
  rail: "300px"
  radius: "10px"
  banner-h: "200px"
  avatar: "152px"
palette:
  light:
    bg: "#F4F2EE"
    surface: "#FFFFFF"
    glass: "#FFFFFF"
    text: "#191919"
    muted: "#5E5E5E"
    accent: "#0A66C2"
    accent-text: "#FFFFFF"
    accent-soft: "#E8F1FB"
    focus: "#0A66C2"
    hairline: "rgba(0,0,0,0.12)"
    open: "#E6EEF6"
    like: "#0A66C2"
    banner-a: "#A0B4B7"
    banner-b: "#0A66C2"
    banner-c: "#2E3B4E"
    brand-1: "#0A66C2"
    brand-2: "#057642"
    brand-3: "#915907"
    shadow: "rgba(0,0,0,0.08)"
  dark:
    bg: "#000000"
    surface: "#1B1F23"
    glass: "#1B1F23"
    text: "#E9E9E9"
    muted: "#ADADAD"
    accent: "#71B7FB"
    accent-text: "#000000"
    accent-soft: "#1E2C3A"
    focus: "#71B7FB"
    hairline: "rgba(255,255,255,0.15)"
    open: "#22303D"
    like: "#71B7FB"
    banner-a: "#38434F"
    banner-b: "#1D4F80"
    banner-c: "#0B1A2A"
    brand-1: "#71B7FB"
    brand-2: "#5FBF8A"
    brand-3: "#E7A33E"
    shadow: "rgba(0,0,0,0.5)"
labels:
  wordmark: "in"
  wordmarkLabel: "Profile home"
  back: "Experiences"
  light: "Switch to light appearance"
  dark: "Switch to dark appearance"
  navLabel: "Profile sections"
  tabLabel: "Profile tabs"
  nav:
    - { id: home, label: "Profile", icon: home, href: "#li-top" }
    - { id: experience, label: "Experience", icon: jobs, href: "#li-experience" }
    - { id: skills, label: "Skills", icon: network, href: "#li-skills" }
    - { id: activity, label: "Activity", icon: bell, href: "#li-activity" }
    - { id: contact, label: "Contact", icon: message, href: "#li-contact" }
  search:
    label: "Search this profile"
    placeholder: "Search"
    noMatch: "No section matches “{q}”"
    jump: "Jump to {s}"
    results: "{n} matching sections"
  profile:
    span: "{n}+ years of experience"
    connect: "Connect"
    message: "Message"
    more: "More"
    moreLabel: "More actions"
    contactInfo: "Contact info"
    avatarLabel: "Profile photo of {name}"
    bannerLabel: "Profile banner"
    openTo:
      title: "Open to work"
      body: "Senior full-stack and applied-AI roles"
      cta: "Get in touch"
  sections:
    about: "About"
    featured: "Featured"
    activity: "Activity"
    experience: "Experience"
    education: "Education"
    skills: "Skills"
    interests: "Interests"
    contact: "Contact"
  dot: "·"
  srSep: ": "
  seeMore: "…see more"
  seeLess: "see less"
  showMore: "Show {n} more"
  showLess: "Show less"
  featured:
    prev: "Previous featured item"
    next: "Next featured item"
    region: "Featured projects, scrollable"
    kind: "Project"
    open: "View project"
  activity:
    posted: "posted this"
    like: "Like"
    liked: "Liked"
    send: "Send"
    copied: "Link to post copied"
    shareFailed: "Couldn’t share — copy the address bar instead"
    reactions: "{n} reactions"
    baseReactions: 0
  experience:
    present: ["present", "now", "current"]
    years: "{n} yrs"
    year: "1 yr"
    months: "{n} mos"
    month: "1 mo"
    logoLabel: "{company} logo"
    skills: "Skills:"
    tagSep: " · "
  skills:
    used: "Used in {n} roles"
    usedOnce: "Used in 1 role"
    none: "Listed"
    group: "{title}"
  interests:
    title: "Topics"
    items: ["Applied AI", "On-device inference", "Distributed systems", "Developer tooling"]
  rail:
    languageTitle: "Profile language"
    language: "English"
    urlTitle: "Public profile & URL"
    url: "kaush4l.github.io"
    peopleTitle: "Other ways to read this résumé"
    people:
      - { name: "Search results", headline: "The résumé as a search engine", href: "/experience/google/" }
      - { name: "Repository", headline: "The résumé as a code repository", href: "/experience/github/" }
      - { name: "Channel", headline: "The résumé as a video channel", href: "/experience/youtube/" }
    view: "View"
---
A career read the way recruiters already read one: headline first, then the work, then the skills behind it. No invented numbers: each skill shows how many roles actually used it, career length is computed from the role dates, and reactions start at zero.
