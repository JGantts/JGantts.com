<template>
  <ul id="links">
    <li>
      <a href="mailto:contact@jgantts.com">
        <span class="link">
          <i class="fa-solid fa-envelope" />&nbsp;&nbsp;
          <span class="underline">contact@jgantts.com</span>
        </span>
      </a>
    </li>
    <li>
      <a href="https://github.com/JGantts">
        <span class="link">
          <i class="fa-brands fa-github" />&nbsp;&nbsp;
          <span class="underline">github.com/JGantts</span>
        </span>
      </a>
    </li>
    <li>
      <a href="/resume/GanttJ-Resume.pdf">
        <span class="link">
          <i class="fa-solid fa-file-pdf" />&nbsp;&nbsp;
          <span class="underline">GanttJ-Resume.pdf</span>
        </span>
      </a>
    </li>
  </ul>
</template>

<style scoped>
#links {
  display: flex;
  letter-spacing: 0;
  line-height: 1.5;
  padding: 0;
  gap: 0rem;
  flex-direction: column;
  flex-wrap: wrap;
  font-family: 'Figtree', sans-serif;
  font-size: 0.625em;
  font-weight: 400;
}
#links li a {
  text-decoration: none;
}
#links li a .underline {
  text-decoration: underline;
}
#links li a:hover {
  text-decoration: none;
}
#links li a:hover .link {
  color: var(--textAccentOnBaseLowContrast);
}
#links li .link {
  cursor: pointer;
  white-space: nowrap;
}

#links {
  gap: 0rem;
  font-size: 0.625em;
}

@media (min-width: 481px) {
  #links {
    gap: 0rem;
    font-size: 0.875em;
  }
}

@media (min-width: 769px) {
  #links {
    gap: 0rem;
    font-size: 0.75em;
  }
}
</style>
