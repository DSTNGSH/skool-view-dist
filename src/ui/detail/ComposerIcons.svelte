<script>
  // Decorative attachment/link/video/emoji/GIF icon row shown inside a comment/reply composer.
  // Purely visual (look-and-feel match to Skool's own composer) — none of these are wired to a
  // write action; Skool's upload endpoints haven't been reverse-engineered yet.
</script>

<div class="composer-icons" aria-hidden="true">
  <span class="cicon" title="Attachment">
    <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 11.5 12.5 20a4.5 4.5 0 0 1-6.36-6.36L14.6 5.18a3 3 0 0 1 4.24 4.24l-8.49 8.49a1.5 1.5 0 0 1-2.12-2.12l7.07-7.07" />
    </svg>
  </span>
  <span class="cicon" title="Link">
    <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 15l6-6" />
      <path d="M10.5 6.5 12 5a3.54 3.54 0 0 1 5 5l-1.5 1.5" />
      <path d="M13.5 17.5 12 19a3.54 3.54 0 0 1-5-5l1.5-1.5" />
    </svg>
  </span>
  <span class="cicon" title="Video">
    <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3" />
    </svg>
  </span>
  <span class="cicon" title="Emoji">
    <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14s1.2 2 3.5 2 3.5-2 3.5-2" />
      <path d="M9 9h.01M15 9h.01" />
    </svg>
  </span>
  <span class="cicon cicon-gif" title="GIF">GIF</span>
</div>
