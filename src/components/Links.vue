<script setup lang="ts">
  import FilePdfIcon from '../assets/icons/file-pdf.svg'
  import GithubIcon from '../assets/icons/github.svg'
  import EnvelopeIcon from '../assets/icons/envelope.svg'
</script>

<template>
  <ul id="links">
    <li>
      <a href="mailto:contact@jgantts.com">
        <span class="link line">
          <EnvelopeIcon class="fa-icon" />&nbsp;&nbsp;
          <span class="underline">contact@jgantts.com</span>
        </span>
      </a>
    </li>
    <li>
      <a href="https://github.com/JGantts">
        <span class="link line">
          <GithubIcon class="fa-icon" />&nbsp;&nbsp;
          <span class="underline">github.com/JGantts</span>
        </span>
      </a>
    </li>
    <li>
      <a href="/resume/GanttJ-Resume.pdf" target="_blank">
        <span class="link line">
          <FilePdfIcon class="fa-icon" />&nbsp;&nbsp;
          <span class="underline">GanttJ-Resume.pdf</span>
        </span>
      </a>
    </li>
  </ul>
</template>

<style scoped>
.line {
  display: flex;
  justify-content: center;
  align-items: center;
}

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
