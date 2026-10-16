// Сонгосон горимыг (цайвар/бараан) CSS зурахаас өмнө тавина: side panel нээхэд өнгө анивчихгүй.
// Сонголтгүй бол цайвар (системийн тохиргооноос үл хамаарна). Товчийг sidepanel.js-ийн toggleTheme() удирдана.
try {
  const theme = localStorage.getItem("theme");
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
} catch {}
