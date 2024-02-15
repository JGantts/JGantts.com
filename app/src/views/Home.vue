<script setup lang="ts">

</script>

<template>
  <div id="main02" class="main">
    <div class="inner">
      <div id="container02" class="container columns full">
        <div class="wrapper">
          <div class="inner">
            <div>
              <p id="text03">Contact me about software:</p>
              <p id="text04">Jacob Gantt</p>
              <ul id="links01" class="links">
                <li class="n01">
                  <a href="mailto:contact@jgantts.com"><span class="link"><i class="fa-solid fa-envelope" />&nbsp;&nbsp;<span class="underline">contact@jgantts.com</span><span></span></span></a>
                </li><li class="n02">
                  <a href="https://github.com/JGantts"><span class="link"><i class="fa-brands fa-github" />&nbsp;&nbsp;<span class="underline">github.com/JGantts</span></span></a>
                </li><li class="n03">
                  <a href="/resume/GanttJ-Resume.pdf"><span class="link"><i class="fa-solid fa-file-pdf" />&nbsp;&nbsp;<span class="underline">GanttJ-Resume.pdf</span></span></a>
                </li>
              </ul>
            </div>
            <div>
              <p id="text06"><span class="p">
                Looking for clients and collaborators.<br />
                I&#039;m a developer with years of professional and personal experience;
                from improving enterprise solutions to fuzz testing code parsers;
                game mods, websites;
                APIs and UX;
                C#, JavaScript;
                Swift, Node;
                I love it all!
              </span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#main02 {
  --alignment: center;
  --flex-alignment: center;
  --indent-left: 1;
  --indent-right: 1;
  --border-radius-tl: 1.5rem;
  --border-radius-tr: 1.5rem;
  --border-radius-br: 1.5rem;
  --border-radius-bl: 1.5rem;
  align-items: center;
  display: flex;
  flex-grow: 0;
  flex-shrink: 0;
  justify-content: center;
  max-width: 100%;
  position: relative;
  text-align: var(--alignment);
  z-index: 1;
  border-radius: var(--border-radius-tl) var(--border-radius-tr) var(--border-radius-br) var(--border-radius-bl);
}

#main02 > .inner {
  border-radius: var(--border-radius-tl) var(--border-radius-tr) var(--border-radius-br) var(--border-radius-bl);
  max-width: 100%;
  position: relative;
  width: calc(var(--width) + va(--padding-horizontal));
  z-index: 1;
  padding: var(--padding-vertical) var(--padding-horizontal);
}

#main02 > .inner > * {
  margin-top: var(--spacing);
  margin-bottom: var(--spacing);
}

#main02 > .inner > :first-child {
  margin-top: 0 !important;
}

#main02 > .inner > :last-child {
  margin-bottom: 0 !important;
}

#main02 > .inner > .full {
  margin-left: calc(var(--padding-horizontal) * -1);
  max-width: calc(100% + calc(var(--padding-horizontal) * 2) + 0.4725px);
  width: calc(100% + calc(var(--padding-horizontal) * 2) + 0.4725px);
}

#main02 > .inner > .full:first-child {
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
}

#main02 > .inner > .full:last-child {
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
}

#main02 > .inner > .full.screen {
  border-radius: 0 !important;
  max-width: 100vw;
  position: relative;
  width: 100vw;
  left: 50%;
  margin-left: -50vw;
  right: auto;
}

#main02 > .inner {
  --padding-horizontal: 0.75rem;
  --padding-vertical: 0.75rem;
  --spacing: 0rem;
  --width: 20rem;
}

@media (max-width: 736px) {
  #main02 > .inner {
    --padding-horizontal: 0.75rem;
    --padding-vertical: 0.75rem;
    --spacing: 0rem;
  }
}

@media (max-width: 480px) {
  #main02 > .inner {
    --spacing: 0rem;
  }
}

@media (max-width: 360px) {
  #main02 > .inner {
    --padding-horizontal: 0.75rem;
    --padding-vertical: 0.75rem;
    --spacing: 0rem;
  }
}
</style>