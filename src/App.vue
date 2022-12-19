<template>
  <div id="app">
    <div id="background-holder">
      <div id="wrapper">
        <router-view/>
      </div>
      <Background id="background"></Background>
    </div>
  </div>
</template>

<script>
import Background from './components/Background.vue'

export default {
  name: 'App',
  components: {
    Background,
  },
  async created() {
   await new Promise(r => setTimeout(r, 1000));
   document.body.classList.remove("is-loading");
  },
}

</script>

<style>
@font-face {
  font-family: "Figtree";
  font-weight: 300;
  font-style: normal;
  font-display: auto;
  unicode-range: U+000-5FF;
  src:
    local("Figtree"),
    url(assets/fonts//Figtree/Figtree-Light.woff2) format("woff2");
}
@font-face {
  font-family: "Figtree";
  font-weight: 400;
  font-style: normal;
  font-display: auto;
  unicode-range: U+000-5FF;
  src:
    local("Figtree"),
    url(assets/fonts/Figtree/Figtree-Regular.woff2) format("woff2");
}
@font-face {
  font-family: "Figtree";
  font-weight: 500;
  font-style: normal;
  font-display: auto;
  unicode-range: U+000-5FF;
  src:
    local("Figtree"),
    url(assets/fonts/Figtree/Figtree-Medium.woff2) format("woff2");
}
@font-face {
  font-family: "Figtree";
  font-weight: 700;
  font-style: normal;
  font-display: auto;
  unicode-range: U+000-5FF;
  src:
    local("Figtree"),
    url(assets/fonts/Figtree/Figtree-Bold.woff2) format("woff2");
}
@font-face {
  font-family: "Figtree";
  font-weight: 800;
  font-style: normal;
  font-display: auto;
  unicode-range: U+000-5FF;
  src:
    local("Figtree"),
    url(assets/fonts/Figtree/Figtree-ExtraBold.woff2) format("woff2");
}
@font-face {
  font-family: "Figtree";
  font-weight: 900;
  font-style: normal;
  font-display: auto;
  unicode-range: U+000-5FF;
  src:
    local("Figtree"),
    url(assets/fonts/Figtree/Figtree-Black.woff2) format("woff2");
}

#app {
  font-family: 'Figtree', Arial, sans-serif;
}

#app {
  color: #000000;
  background-color: #FAFAFA;
}

@media (prefers-color-scheme: dark) {
    #app {
      color: #FFFFFF;
      background-color: #0f0f0f;
    }
}

#backgorund-holder {
    position: relative;
}

#background {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 100vw;
  z-index: -100;
  background-attachment: scroll;
  pointer-events: none;
  z-index: 0;
}

#text01 {
  color: #000000;
  font-size: 2em;
  line-height: 1.5;
  font-weight: 500;
}

@media (prefers-color-scheme: dark) {
  #text01 {
    color: #FFFFFF;
  }
}

#text02 {
  font-size: 1em;
  line-height: 1.5;
  font-weight: 300;
}

#text03 {
  font-size: 0.625em;
  line-height: 1.5;
  font-weight: 300;
}

#text04 {
  font-size: 1em;
  line-height: 1.5;
  font-weight: 400;
}

#text05 {
  font-size: 1em;
  line-height: 1.5;
  font-weight: 500;
}

#text06 {
  text-align: justify;
  font-size: 0.625em;
  line-height: 1.5;
  font-weight: 400;
}

#text07 {
  font-size: 0.5em;
  line-height: 1.5;
  font-weight: 300;
}

html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin:0;padding:0;border:0;font-size:100%;font:inherit;vertical-align:baseline;}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block;}body{line-height:1;}ol,ul{list-style:none;}blockquote,q{quotes:none;}blockquote:before,blockquote:after,q:before,q:after{content:'';content:none;}table{border-collapse:collapse;border-spacing:0;}body{-webkit-text-size-adjust:none}mark{background-color:transparent;color:inherit}input::-moz-focus-inner{border:0;padding:0}input[type="text"],input[type="email"],select,textarea{-moz-appearance:none;-webkit-appearance:none;-ms-appearance:none;appearance:none}

*, *:before, *:after {
  box-sizing: border-box;
}

body {
  line-height: 1.0;
  min-height: var(--viewport-height);
  min-width: 320px;
  overflow-x: hidden;
  word-wrap: break-word;
}

body.is-loading:after {
  opacity: 1;
  visibility: visible;
}

:root {
  --background-height: 100vh;
  --site-language-alignment: left;
  --site-language-direction: ltr;
  --site-language-flex-alignment: flex-start;
  --site-language-indent-left: 1;
  --site-language-indent-right: 0;
  --viewport-height: 100vh;
}

html {
  font-size: 24pt;
}

u {
  text-decoration: underline;
}

strong {
  color: inherit;
  font-weight: bolder;
}

em {
  font-style: italic;
}

code {
  background-color: rgba(144,144,144,0.25);
  border-radius: 0.25em;
  font-family: 'Lucida Console', 'Courier New', monospace;
  font-size: 0.9em;
  font-weight: normal;
  letter-spacing: 0;
  margin: 0 0.25em;
  padding: 0.25em 0.5em;
  text-indent: 0;
}

mark {
  background-color: rgba(144,144,144,0.25);
}

s {
  text-decoration: line-through;
}

sub {
  font-size: smaller;
  vertical-align: sub;
}

sup {
  font-size: smaller;
  vertical-align: super;
}

a {
  color: inherit;
  text-decoration: underline;
  transition: color 0.25s ease;
}

#wrapper {
  -webkit-overflow-scrolling: touch;
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: var(--viewport-height);
  overflow: hidden;
  position: relative;
  z-index: 2;
  padding: 1.5rem 1.5rem 1.5rem 1.5rem;
}

#main {
  --alignment: center;
  --flex-alignment: center;
  --indent-left: 1;
  --indent-right: 1;
  --border-radius-tl: 3rem;
  --border-radius-tr: 3rem;
  --border-radius-br: 3rem;
  --border-radius-bl: 3rem;
  align-items: center;
  display: flex;
  flex-grow: 0;
  flex-shrink: 0;
  justify-content: center;
  max-width: 100%;
  position: relative;
  text-align: var(--alignment);
  z-index: 1;
  background-color: #EFEFEF;
  border-radius: var(--border-radius-tl) var(--border-radius-tr) var(--border-radius-br) var(--border-radius-bl);
}

@media (prefers-color-scheme: dark) {
  #main {
    background-color: #1F1F1F;
  }
}

#main > .inner {
  --padding-horizontal: 3rem;
  --padding-vertical: 1.625rem;
  --spacing: 0rem;
  --width: 20rem;
  border-radius: var(--border-radius-tl) var(--border-radius-tr) var(--border-radius-br) var(--border-radius-bl);
  max-width: 100%;
  position: relative;
  width: var(--width);
  z-index: 1;
  padding: var(--padding-vertical) var(--padding-horizontal);
}

#main > .inner > * {
  margin-top: var(--spacing);
  margin-bottom: var(--spacing);
}

#main > .inner > :first-child {
  margin-top: 0 !important;
}

#main > .inner > :last-child {
  margin-bottom: 0 !important;
}

#main > .inner > .full {
  margin-left: calc(var(--padding-horizontal) * -1);
  max-width: calc(100% + calc(var(--padding-horizontal) * 2) + 0.4725px);
  width: calc(100% + calc(var(--padding-horizontal) * 2) + 0.4725px);
}

#main > .inner > .full:first-child {
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  margin-top: calc(var(--padding-vertical) * -1) !important;
}

#main > .inner > .full:last-child {
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
  margin-bottom: calc(var(--padding-vertical) * -1) !important;
}

#main > .inner > .full.screen {
  border-radius: 0 !important;
  max-width: 100vw;
  position: relative;
  width: 100vw;
  left: 50%;
  margin-left: -50vw;
  right: auto;
}

body.is-instant #main, body.is-instant #main > .inner > *,body.is-instant #main > .inner > section > *  {
  transition: none !important;
}

body.is-instant:after {
  display: none !important;
  transition: none !important;
}

@keyframes onvisible-slide-left {
  0% {
    visibility: hidden;
    transform: translateX(100vw);
  }

  1% {
    visibility: visible;
  }

  100% {
    transform: translateX(0);
  }
}

@keyframes onvisible-slide-right {
  0% {
    visibility: hidden;
    transform: translateX(-100vw);
  }

  1% {
    visibility: visible;
  }

  100% {
    transform: translateX(0);
  }
}

h1, h2, h3, p {
  direction: var(--site-language-direction);
  position: relative;
}

h1 span.p, h2 span.p, h3 span.p, p span.p {
  display: block;
  position: relative;
}

h1 span[style], h2 span[style], h3 span[style], p span[style], h1 strong, h2 strong, h3 strong, p strong, h1 a, h2 a, h3 a, p a, h1 code, h2 code, h3 code, p code, h1 mark, h2 mark, h3 mark, p mark {
  -webkit-text-fill-color: currentcolor;
}

.container {
  position: relative;
}

.container > .wrapper {
  vertical-align: top;
  position: relative;
  max-width: 100%;
  border-radius: inherit;
}

.container > .wrapper > .inner {
  vertical-align: top;
  position: relative;
  max-width: 100%;
  border-radius: inherit;
  text-align: var(--alignment);
}

#main .container.full:first-child > .wrapper {
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
}

#main .container.full:last-child > .wrapper {
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
}

#main .container.full:first-child > .wrapper > .inner {
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
}

#main .container.full:last-child > .wrapper > .inner {
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
}

#container01 {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  background-color: transparent;
}

#container01 > .wrapper > .inner {
  --gutters: 2rem;
  --padding-vertical: 0.125rem;
  padding: var(--padding-vertical) var(--padding-horizontal);
}

#container01 > .wrapper {
  max-width: var(--width);
  width: 100%;
}

#container01.default > .wrapper > .inner > * {
  margin-bottom: var(--spacing);
  margin-top: var(--spacing);
}

#container01.default > .wrapper > .inner > *:first-child {
  margin-top: 0 !important;
}

#container01.default > .wrapper > .inner > *:last-child {
  margin-bottom: 0 !important;
}

#container01.columns > .wrapper > .inner {
  flex-wrap: wrap;
  display: flex;
  align-items: flex-start;
}

#container01.columns > .wrapper > .inner > * {
  flex-grow: 0;
  flex-shrink: 0;
  max-width: 100%;
  text-align: var(--alignment);
  padding: 0 0 0 var(--gutters);
}

#container01.columns > .wrapper > .inner > * > * {
  margin-bottom: var(--spacing);
  margin-top: var(--spacing);
}

#container01.columns > .wrapper > .inner > * > *:first-child {
  margin-top: 0 !important;
}

#container01.columns > .wrapper > .inner > * > *:last-child {
  margin-bottom: 0 !important;
}

#container01.columns > .wrapper > .inner > *:first-child {
  margin-left: calc(var(--gutters) * -1);
}

#container01.default > .wrapper > .inner > .full {
  margin-left: calc(var(--padding-horizontal) * -1);
  max-width: none !important;
  width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
}

#container01.default > .wrapper > .inner > .full:first-child {
  margin-top: calc(var(--padding-vertical) * -1) !important;
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
}

#container01.default > .wrapper > .inner > .full:last-child {
  margin-bottom: calc(var(--padding-vertical) * -1) !important;
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
}

#container01.columns > .wrapper > .inner > div > .full {
  margin-left: calc(var(--gutters) * -0.5);
  max-width: none !important;
  width: calc(100% + var(--gutters) + 0.4725px);
}

#container01.columns > .wrapper > .inner > div:first-child > .full {
  margin-left: calc(var(--padding-horizontal) * -1);
  width: calc(100% + var(--padding-horizontal) + calc(var(--gutters) * 0.5) + 0.4725px);
}

#container01.columns > .wrapper > .inner > div:last-child > .full {
  width: calc(100% + var(--padding-horizontal) + calc(var(--gutters) * 0.5) + 0.4725px);
}

#container01.columns > .wrapper > .inner > div > .full:first-child {
  margin-top: calc(var(--padding-vertical) * -1) !important;
}

#container01.columns > .wrapper > .inner > div > .full:last-child {
  margin-bottom: calc(var(--padding-vertical) * -1) !important;
}

#container01.columns > .wrapper > .inner > div:first-child, #container01.columns > .wrapper > .inner > div:first-child > .full:first-child {
  border-top-left-radius: inherit;
}

#container01.columns > .wrapper > .inner > div:last-child, #container01.columns > .wrapper > .inner > div:last-child > .full:first-child {
  border-top-right-radius: inherit;
}

#container01.columns > .wrapper > .inner > .full {
  align-self: stretch;
}

#container01.columns > .wrapper > .inner > .full:first-child {
  border-bottom-left-radius: inherit;
  border-top-left-radius: inherit;
}

#container01.columns > .wrapper > .inner > .full:last-child {
  border-bottom-right-radius: inherit;
  border-top-right-radius: inherit;
}

#container01.columns > .wrapper > .inner > .full > .full:first-child:last-child {
  border-radius: inherit;
  height: calc(100% + (var(--padding-vertical) * 2));
}

#container01.columns > .wrapper > .inner > .full > .full:first-child:last-child > * {
  border-radius: inherit;
  height: 100%;
  position: absolute;
  width: 100%;
}

#container02 {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  background-color: transparent;
}

#container02 > .wrapper > .inner {
  --gutters: 1.5rem;
  --padding-horizontal: 0.5rem;
  --padding-vertical: 0.25rem;
  padding: var(--padding-vertical) var(--padding-horizontal);
}

#container02 > .wrapper {
  max-width: var(--width);
  width: 100%;
}

#container02.default > .wrapper > .inner > * {
  margin-bottom: var(--spacing);
  margin-top: var(--spacing);
}

#container02.default > .wrapper > .inner > *:first-child {
  margin-top: 0 !important;
}

#container02.default > .wrapper > .inner > *:last-child {
  margin-bottom: 0 !important;
}

#container02.columns > .wrapper > .inner {
  flex-wrap: wrap;
  display: flex;
  align-items: flex-start;
}

#container02.columns > .wrapper > .inner > * {
  flex-grow: 0;
  flex-shrink: 0;
  max-width: 100%;
  text-align: var(--alignment);
  padding: 0 0 0 var(--gutters);
}

#container02.columns > .wrapper > .inner > * > * {
  margin-bottom: var(--spacing);
  margin-top: var(--spacing);
}

#container02.columns > .wrapper > .inner > * > *:first-child {
  margin-top: 0 !important;
}

#container02.columns > .wrapper > .inner > * > *:last-child {
  margin-bottom: 0 !important;
}

#container02.columns > .wrapper > .inner > *:first-child {
  margin-left: calc(var(--gutters) * -1);
}

#container02.default > .wrapper > .inner > .full {
  margin-left: calc(var(--padding-horizontal) * -1);
  max-width: none !important;
  width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
}

#container02.default > .wrapper > .inner > .full:first-child {
  margin-top: calc(var(--padding-vertical) * -1) !important;
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
}

#container02.default > .wrapper > .inner > .full:last-child {
  margin-bottom: calc(var(--padding-vertical) * -1) !important;
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
}

#container02.columns > .wrapper > .inner > div > .full {
  margin-left: calc(var(--gutters) * -0.5);
  max-width: none !important;
  width: calc(100% + var(--gutters) + 0.4725px);
}

#container02.columns > .wrapper > .inner > div:first-child > .full {
  margin-left: calc(var(--padding-horizontal) * -1);
  width: calc(100% + var(--padding-horizontal) + calc(var(--gutters) * 0.5) + 0.4725px);
}

#container02.columns > .wrapper > .inner > div:last-child > .full {
  width: calc(100% + var(--padding-horizontal) + calc(var(--gutters) * 0.5) + 0.4725px);
}

#container02.columns > .wrapper > .inner > div > .full:first-child {
  margin-top: calc(var(--padding-vertical) * -1) !important;
}

#container02.columns > .wrapper > .inner > div > .full:last-child {
  margin-bottom: calc(var(--padding-vertical) * -1) !important;
}

#container02.columns > .wrapper > .inner > div:first-child, #container02.columns > .wrapper > .inner > div:first-child > .full:first-child {
  border-top-left-radius: inherit;
}

#container02.columns > .wrapper > .inner > div:last-child, #container02.columns > .wrapper > .inner > div:last-child > .full:first-child {
  border-top-right-radius: inherit;
}

#container02.columns > .wrapper > .inner > .full {
  align-self: stretch;
}

#container02.columns > .wrapper > .inner > .full:first-child {
  border-bottom-left-radius: inherit;
  border-top-left-radius: inherit;
}

#container02.columns > .wrapper > .inner > .full:last-child {
  border-bottom-right-radius: inherit;
  border-top-right-radius: inherit;
}

#container02.columns > .wrapper > .inner > .full > .full:first-child:last-child {
  border-radius: inherit;
  height: calc(100% + (var(--padding-vertical) * 2));
}

#container02.columns > .wrapper > .inner > .full > .full:first-child:last-child > * {
  border-radius: inherit;
  height: 100%;
  position: absolute;
  width: 100%;
}

#container02 > .wrapper > .inner > :nth-child(1) {
  width: calc(40% + (var(--gutters) / 2));
}

#container02 > .wrapper > .inner > :nth-child(2) {
  width: calc(60% + (var(--gutters) / 2));
}

#container03 {
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: center;
  background-color: transparent;
}

#container03 > .wrapper > .inner {
  --gutters: 1.5rem;
  --padding-horizontal: 0.125rem;
  --padding-vertical: 0.25rem;
  padding: var(--padding-vertical) var(--padding-horizontal);
}

#container03 > .wrapper {
  max-width: var(--width);
  width: 100%;
}

#container03.default > .wrapper > .inner > * {
  margin-bottom: var(--spacing);
  margin-top: var(--spacing);
}

#container03.default > .wrapper > .inner > *:first-child {
  margin-top: 0 !important;
}

#container03.default > .wrapper > .inner > *:last-child {
  margin-bottom: 0 !important;
}

#container03.columns > .wrapper > .inner {
  flex-wrap: wrap;
  display: flex;
  align-items: flex-start;
}

#container03.columns > .wrapper > .inner > * {
  flex-grow: 0;
  flex-shrink: 0;
  max-width: 100%;
  text-align: var(--alignment);
  padding: 0 0 0 var(--gutters);
}

#container03.columns > .wrapper > .inner > * > * {
  margin-bottom: var(--spacing);
  margin-top: var(--spacing);
}

#container03.columns > .wrapper > .inner > * > *:first-child {
  margin-top: 0 !important;
}

#container03.columns > .wrapper > .inner > * > *:last-child {
  margin-bottom: 0 !important;
}

#container03.columns > .wrapper > .inner > *:first-child {
  margin-left: calc(var(--gutters) * -1);
}

#container03.default > .wrapper > .inner > .full {
  margin-left: calc(var(--padding-horizontal) * -1);
  max-width: none !important;
  width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
}

#container03.default > .wrapper > .inner > .full:first-child {
  margin-top: calc(var(--padding-vertical) * -1) !important;
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
}

#container03.default > .wrapper > .inner > .full:last-child {
  margin-bottom: calc(var(--padding-vertical) * -1) !important;
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
}

#container03.columns > .wrapper > .inner > div > .full {
  margin-left: calc(var(--gutters) * -0.5);
  max-width: none !important;
  width: calc(100% + var(--gutters) + 0.4725px);
}

#container03.columns > .wrapper > .inner > div:first-child > .full {
  margin-left: calc(var(--padding-horizontal) * -1);
  width: calc(100% + var(--padding-horizontal) + calc(var(--gutters) * 0.5) + 0.4725px);
}

#container03.columns > .wrapper > .inner > div:last-child > .full {
  width: calc(100% + var(--padding-horizontal) + calc(var(--gutters) * 0.5) + 0.4725px);
}

#container03.columns > .wrapper > .inner > div > .full:first-child {
  margin-top: calc(var(--padding-vertical) * -1) !important;
}

#container03.columns > .wrapper > .inner > div > .full:last-child {
  margin-bottom: calc(var(--padding-vertical) * -1) !important;
}

#container03.columns > .wrapper > .inner > div:first-child, #container03.columns > .wrapper > .inner > div:first-child > .full:first-child {
  border-top-left-radius: inherit;
}

#container03.columns > .wrapper > .inner > div:last-child, #container03.columns > .wrapper > .inner > div:last-child > .full:first-child {
  border-top-right-radius: inherit;
}

#container03.columns > .wrapper > .inner > .full {
  align-self: stretch;
}

#container03.columns > .wrapper > .inner > .full:first-child {
  border-bottom-left-radius: inherit;
  border-top-left-radius: inherit;
}

#container03.columns > .wrapper > .inner > .full:last-child {
  border-bottom-right-radius: inherit;
  border-top-right-radius: inherit;
}

#container03.columns > .wrapper > .inner > .full > .full:first-child:last-child {
  border-radius: inherit;
  height: calc(100% + (var(--padding-vertical) * 2));
}

#container03.columns > .wrapper > .inner > .full > .full:first-child:last-child > * {
  border-radius: inherit;
  height: 100%;
  position: absolute;
  width: 100%;
}

.links {
  display: flex;
  justify-content: var(--flex-alignment);
  letter-spacing: 0;
  line-height: 1.5;
  padding: 0;
}

.links li {
  position: relative;
}

.links li a {
  direction: var(--site-language-direction);
  display: block;
}

#links01 {
  gap: 0rem;
  flex-direction: row;
  flex-wrap: wrap;
  font-family: 'Figtree', sans-serif;
  font-size: 0.625em;
  font-weight: 400;
}

#links01 li a {
  color: #000000;
  text-decoration: underline;
}

@media (prefers-color-scheme: dark) {
  #links01 li a {
    color: #FFFFFF;
  }
}

#links01 li a:hover {
  text-decoration: none;
}

@media (max-width: 1920px) {

}

@media (max-width: 1680px) {
  html {
    font-size: 18pt;
  }
}

@media (max-width: 1280px) {
  html {
    font-size: 18pt;
  }
}

@media (max-width: 1024px) {

}

@media (max-width: 980px) {
  html {
    font-size: 15pt;
  }
}

@media (max-width: 736px) {
  html {
    font-size: 15pt;
  }



  #main > .inner {
    --padding-horizontal: 2rem;
    --padding-vertical: 1.625rem;
    --spacing: 0rem;
  }

  #text01 {
    letter-spacing: 0rem;
    width: 100%;
    font-size: 1.875em;
    line-height: 1.5;
  }

  #text02 {
    letter-spacing: 0rem;
    width: 100%;
    font-size: 1em;
    line-height: 1.5;
  }

  #text03 {
    letter-spacing: 0rem;
    width: 100%;
    font-size: 0.625em;
    line-height: 1.5;
  }

  #text04 {
    letter-spacing: 0rem;
    width: 100%;
    font-size: 1.75em;
    line-height: 1.5;
  }

  #text06 {
    letter-spacing: 0rem;
    width: 100%;
    font-size: 0.625em;
    line-height: 1.5;
  }

  #text05 {
    letter-spacing: 0rem;
    width: 100%;
    font-size: 1em;
    line-height: 1.5;
  }

  #text07 {
    letter-spacing: 0rem;
    width: 100%;
    font-size: 0.5em;
    line-height: 1.5;
  }



  #container01 > .wrapper > .inner {
    --gutters: 2rem;
    --padding-vertical: 0.125rem;
  }

  #container01.columns > .wrapper > .inner {
    flex-direction: column !important;
    flex-wrap: nowrap !important;
  }

  #container01.columns > .wrapper > .inner > span {
    height: 0;
    margin-top: calc(var(--gutters) * -1);
    pointer-events: none;
    visibility: hidden;
  }

  #container01.columns > .wrapper > .inner > *:first-child {
    margin-left: 0 !important;
    padding-top: 0 !important;
  }

  #container01.columns > .wrapper > .inner > * {
    padding: calc(var(--gutters) * 0.5) 0 !important;
  }

  #container01.columns > .wrapper > .inner > *:last-child {
    padding-bottom: 0 !important;
  }

  #container01.columns > .wrapper > .inner > div > .full {
    margin-left: calc(var(--padding-horizontal) * -1);
    width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
  }

  #container01.columns > .wrapper > .inner > div:first-of-type > .full {
    margin-left: calc(var(--padding-horizontal) * -1);
    width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
  }

  #container01.columns > .wrapper > .inner > div:last-of-type > .full {
    margin-left: calc(var(--padding-horizontal) * -1);
    width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
  }

  #container01.columns > .wrapper > .inner > div > .full:first-child {
    margin-top: calc(var(--gutters) * -0.5) !important;
  }

  #container01.columns > .wrapper > .inner > div > .full:last-child {
    margin-bottom: calc(var(--gutters) * -0.5) !important;
  }

  #container01.columns > .wrapper > .inner > div:first-of-type > .full:first-child {
    margin-top: calc(var(--padding-vertical) * -1) !important;
  }

  #container01.columns > .wrapper > .inner > div:last-of-type > .full:last-child {
    margin-bottom: calc(var(--padding-vertical) * -1) !important;
  }

  #container01.columns > .wrapper > .inner > div:first-of-type, #container01.columns > .wrapper > .inner > div:first-of-type > .full:first-child {
    border-top-left-radius: inherit;
    border-top-right-radius: inherit;
  }

  #container01.columns > .wrapper > .inner > div:last-of-type, #container01.columns > .wrapper > .inner > div:last-of-type > .full:last-child {
    border-bottom-left-radius: inherit;
    border-bottom-right-radius: inherit;
  }

  #container01.columns > .wrapper > .inner > div:first-of-type, #container01.columns > .wrapper > .inner > div:first-of-type > .full:last-child {
    border-bottom-left-radius: 0 !important;
  }

  #container01.columns > .wrapper > .inner > div:last-of-type, #container01.columns > .wrapper > .inner > div:last-of-type > .full:first-child {
    border-top-right-radius: 0 !important;
  }

  #container01.columns > .wrapper > .inner > .full > .full:first-child:last-child {
    height: auto;
  }

  #container01.columns > .wrapper > .inner > .full > .full:first-child:last-child > * {
    height: auto;
    position: relative;
    width: auto;
  }



  #container02 > .wrapper > .inner {
    --gutters: 1rem;
    --padding-horizontal: 1.625rem;
    --padding-vertical: 0.25rem;
  }

  #container02.columns > .wrapper > .inner {
    flex-direction: column !important;
    flex-wrap: nowrap !important;
  }

  #container02.columns > .wrapper > .inner > span {
    height: 0;
    margin-top: calc(var(--gutters) * -1);
    pointer-events: none;
    visibility: hidden;
  }

  #container02.columns > .wrapper > .inner > *:first-child {
    margin-left: 0 !important;
    padding-top: 0 !important;
  }

  #container02.columns > .wrapper > .inner > * {
    padding: calc(var(--gutters) * 0.5) 0 !important;
  }

  #container02.columns > .wrapper > .inner > *:last-child {
    padding-bottom: 0 !important;
  }

  #container02.columns > .wrapper > .inner > div > .full {
    margin-left: calc(var(--padding-horizontal) * -1);
    width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
  }

  #container02.columns > .wrapper > .inner > div:first-of-type > .full {
    margin-left: calc(var(--padding-horizontal) * -1);
    width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
  }

  #container02.columns > .wrapper > .inner > div:last-of-type > .full {
    margin-left: calc(var(--padding-horizontal) * -1);
    width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
  }

  #container02.columns > .wrapper > .inner > div > .full:first-child {
    margin-top: calc(var(--gutters) * -0.5) !important;
  }

  #container02.columns > .wrapper > .inner > div > .full:last-child {
    margin-bottom: calc(var(--gutters) * -0.5) !important;
  }

  #container02.columns > .wrapper > .inner > div:first-of-type > .full:first-child {
    margin-top: calc(var(--padding-vertical) * -1) !important;
  }

  #container02.columns > .wrapper > .inner > div:last-of-type > .full:last-child {
    margin-bottom: calc(var(--padding-vertical) * -1) !important;
  }

  #container02.columns > .wrapper > .inner > div:first-of-type, #container02.columns > .wrapper > .inner > div:first-of-type > .full:first-child {
    border-top-left-radius: inherit;
    border-top-right-radius: inherit;
  }

  #container02.columns > .wrapper > .inner > div:last-of-type, #container02.columns > .wrapper > .inner > div:last-of-type > .full:last-child {
    border-bottom-left-radius: inherit;
    border-bottom-right-radius: inherit;
  }

  #container02.columns > .wrapper > .inner > div:first-of-type, #container02.columns > .wrapper > .inner > div:first-of-type > .full:last-child {
    border-bottom-left-radius: 0 !important;
  }

  #container02.columns > .wrapper > .inner > div:last-of-type, #container02.columns > .wrapper > .inner > div:last-of-type > .full:first-child {
    border-top-right-radius: 0 !important;
  }

  #container02.columns > .wrapper > .inner > .full > .full:first-child:last-child {
    height: auto;
  }

  #container02.columns > .wrapper > .inner > .full > .full:first-child:last-child > * {
    height: auto;
    position: relative;
    width: auto;
  }

  #container02 > .wrapper > .inner > :nth-child(1) {
    min-height: 100% !important;
    width: 100% !important;
  }

  #container02 > .wrapper > .inner > :nth-child(2) {
    min-height: 100% !important;
    width: 100% !important;
  }



  #container03 > .wrapper > .inner {
    --gutters: 1.5rem;
    --padding-horizontal: 1.625rem;
    --padding-vertical: 0.25rem;
  }

  #container03.columns > .wrapper > .inner {
    flex-direction: column !important;
    flex-wrap: nowrap !important;
  }

  #container03.columns > .wrapper > .inner > span {
    height: 0;
    margin-top: calc(var(--gutters) * -1);
    pointer-events: none;
    visibility: hidden;
  }

  #container03.columns > .wrapper > .inner > *:first-child {
    margin-left: 0 !important;
    padding-top: 0 !important;
  }

  #container03.columns > .wrapper > .inner > * {
    padding: calc(var(--gutters) * 0.5) 0 !important;
  }

  #container03.columns > .wrapper > .inner > *:last-child {
    padding-bottom: 0 !important;
  }

  #container03.columns > .wrapper > .inner > div > .full {
    margin-left: calc(var(--padding-horizontal) * -1);
    width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
  }

  #container03.columns > .wrapper > .inner > div:first-of-type > .full {
    margin-left: calc(var(--padding-horizontal) * -1);
    width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
  }

  #container03.columns > .wrapper > .inner > div:last-of-type > .full {
    margin-left: calc(var(--padding-horizontal) * -1);
    width: calc(100% + (var(--padding-horizontal) * 2) + 0.4725px);
  }

  #container03.columns > .wrapper > .inner > div > .full:first-child {
    margin-top: calc(var(--gutters) * -0.5) !important;
  }

  #container03.columns > .wrapper > .inner > div > .full:last-child {
    margin-bottom: calc(var(--gutters) * -0.5) !important;
  }

  #container03.columns > .wrapper > .inner > div:first-of-type > .full:first-child {
    margin-top: calc(var(--padding-vertical) * -1) !important;
  }

  #container03.columns > .wrapper > .inner > div:last-of-type > .full:last-child {
    margin-bottom: calc(var(--padding-vertical) * -1) !important;
  }

  #container03.columns > .wrapper > .inner > div:first-of-type, #container03.columns > .wrapper > .inner > div:first-of-type > .full:first-child {
    border-top-left-radius: inherit;
    border-top-right-radius: inherit;
  }

  #container03.columns > .wrapper > .inner > div:last-of-type, #container03.columns > .wrapper > .inner > div:last-of-type > .full:last-child {
    border-bottom-left-radius: inherit;
    border-bottom-right-radius: inherit;
  }

  #container03.columns > .wrapper > .inner > div:first-of-type, #container03.columns > .wrapper > .inner > div:first-of-type > .full:last-child {
    border-bottom-left-radius: 0 !important;
  }

  #container03.columns > .wrapper > .inner > div:last-of-type, #container03.columns > .wrapper > .inner > div:last-of-type > .full:first-child {
    border-top-right-radius: 0 !important;
  }

  #container03.columns > .wrapper > .inner > .full > .full:first-child:last-child {
    height: auto;
  }

  #container03.columns > .wrapper > .inner > .full > .full:first-child:last-child > * {
    height: auto;
    position: relative;
    width: auto;
  }

  #links01 {
    gap: 0rem;
    font-size: 1.125em;
  }
}

@media (max-width: 480px) {
  #main > .inner {
    --spacing: 0rem;
  }
}

@media (max-width: 360px) {
  #main > .inner {
    --padding-horizontal: 1.5rem;
    --padding-vertical: 1.21875rem;
    --spacing: 0rem;
  }

  #text01 {
    font-size: 1.875em;
  }

  #text02 {
    font-size: 1em;
  }

  #text03 {
    font-size: 0.625em;
  }

  #text04 {
    font-size: 1.75em;
  }

  #text06 {
    font-size: 0.625em;
  }

  #text05 {
    font-size: 1em;
  }

  #text07 {
    font-size: 0.5em;
  }

  #container01 > .wrapper > .inner {
    --gutters: 1.5rem;
    --padding-vertical: 0.09375rem;
  }

  #container02 > .wrapper > .inner {
    --gutters: 1rem;
    --padding-horizontal: 1.21875rem;
    --padding-vertical: 0.1875rem;
  }

  #container03 > .wrapper > .inner {
    --gutters: 1.125rem;
    --padding-horizontal: 1.21875rem;
    --padding-vertical: 0.1875rem;
  }

  #links01 {
    gap: 0rem;
    font-size: 1.125em;
  }
}

</style>
