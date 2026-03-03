<script setup lang="ts">
defineProps<{
  tips?: boolean
}>()

const browserIconMap = {
  chrome: {
    src: 'https://cdn.simpleicons.org/googlechrome/ffffff',
    alt: 'Google Chrome logo',
  },
  edge: {
    src: 'https://cdn.simpleicons.org/microsoftedge/ffffff',
    alt: 'Microsoft Edge logo',
  },
  firefox: {
    src: 'https://cdn.simpleicons.org/firefoxbrowser/ffffff',
    alt: 'Firefox logo',
  },
  opera: {
    src: 'https://cdn.simpleicons.org/opera/ffffff',
    alt: 'Opera logo',
  },
  safari: {
    src: 'https://cdn.simpleicons.org/safari/ffffff',
    alt: 'Safari logo',
  },
} as const

function detectBrowserIcon(userAgent: string) {
  if (/Edg\//.test(userAgent)) {
    return browserIconMap.edge
  }

  if (/OPR\//.test(userAgent)) {
    return browserIconMap.opera
  }

  if (/Firefox\//.test(userAgent) || /FxiOS\//.test(userAgent)) {
    return browserIconMap.firefox
  }

  if (/Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)) {
    return browserIconMap.chrome
  }

  if (/Safari\//.test(userAgent)) {
    return browserIconMap.safari
  }

  return browserIconMap.chrome
}

const websiteBrowserIcon =
  typeof navigator === 'undefined' ? browserIconMap.chrome : detectBrowserIcon(navigator.userAgent)
</script>

<template>
  <main class="holmes-page">
    <div class="sky-glow" />
    <div class="sun" />
    <div class="dam-touch" />
    <div class="river" />
    <div class="dune dune-back" />
    <div class="dune dune-front" />

    <section class="panel-stack">
      <article class="profile-card">
        <p class="eyebrow">Down the Colorado River</p>
        <p v-if="tips" class="route-chip">Tips</p>
        <h1>
          <span class="name-holmes">HOLMES</span>, <span class="name-zachary">ZACHARY</span>
        </h1>
        <p class="tagline">Professional Tour Guide</p>
        <p class="copy">
          Night trails. Neon horizons. Zero wrong turns.
        </p>
      </article>

      <section class="tips" aria-label="Tip me">
        <p class="tips-heading">Tip Me</p>
        <div class="tips-grid">
          <a class="link-card tip-card" href="https://cash.app/$eniorWhoopy" target="_blank" rel="noopener noreferrer">
            <span class="link-title">
              <img class="brand-logo" src="https://cdn.simpleicons.org/cashapp/ffffff" alt="Cash App logo" />
              Cash App
            </span>
            <span class="link-meta">$eniorWhoopy</span>
          </a>
          <a class="link-card tip-card venmo" href="https://venmo.com/u/SeniorWhoopy" target="_blank" rel="noopener noreferrer">
            <span class="link-title">
              <img class="brand-logo" src="https://cdn.simpleicons.org/venmo/ffffff" alt="Venmo logo" />
              Venmo
            </span>
            <span class="link-meta">@SeniorWhoopy</span>
          </a>
          <a class="link-card tip-card paypal" href="https://www.paypal.biz/ThriftJesus" target="_blank" rel="noopener noreferrer">
            <span class="link-title">
              <img class="brand-logo" src="https://cdn.simpleicons.org/paypal/ffffff" alt="PayPal logo" />
              PayPal
            </span>
            <span class="link-meta">ThriftJesus</span>
          </a>
          <!--<a class="link-card primary-tip tip-card zelle" href="https://www.zellepay.com/" target="_blank" rel="noopener noreferrer">
            <span class="link-title">
              <img class="brand-logo" src="https://cdn.simpleicons.org/zelle/ffffff" alt="Zelle logo" />
              Zelle
            </span>
            <span class="link-meta">ZACHARY • xxx-xxx-7534</span>
          </a>-->
        </div>
      </section>

      <nav class="links" aria-label="Zach Holmes links">
        <a class="link-card primary instagram" href="https://www.instagram.com/seniorwhoopy" target="_blank" rel="noopener noreferrer">
          <span class="link-title">
            <img class="brand-logo" src="https://cdn.simpleicons.org/instagram/ffffff" alt="Instagram logo" />
            Instagram
          </span>
          <span class="link-meta">@seniorwhoopy</span>
        </a>
        <a class="link-card primary youtube" href="https://www.youtube.com/@SeniorWhoopyIRL" target="_blank" rel="noopener noreferrer">
          <span class="link-title">
            <img class="brand-logo" src="https://cdn.simpleicons.org/youtube/ffffff" alt="YouTube logo" />
            YouTube
          </span>
          <span class="link-meta">@SeniorWhoopyIRL</span>
        </a>
        <a class="link-card primary maps" href="https://maps.google.com/?q=1647%20Boulder%20City%20Pkwy%20Ste%20A%2C%20Boulder%20City%2C%20NV%2089005" target="_blank" rel="noopener noreferrer">
          <span class="link-title">
            <img class="brand-logo" src="https://cdn.simpleicons.org/googlemaps/ffffff" alt="Google Maps logo" />
            Google Maps
          </span>
          <span class="link-meta">Reviews</span>
        </a>
        <a class="link-card secondary website" href="https://www.desert-adventures.com/" target="_blank" rel="noopener noreferrer">
          <span class="link-title">
            <img class="brand-logo" :src="websiteBrowserIcon.src" :alt="websiteBrowserIcon.alt" />
            Desert Adventures
          </span>
          <span class="link-meta">desert-adventures.com</span>
        </a>
        <a class="link-card secondary tiktok" href="https://www.tiktok.com/@seniorwhoopy" target="_blank" rel="noopener noreferrer">
          <span class="link-title">
            <img class="brand-logo" src="https://cdn.simpleicons.org/tiktok/ffffff" alt="TikTok logo" />
            TikTok
          </span>
          <span class="link-meta">@seniorwhoopy</span>
        </a>
        <a class="link-card tertiary yelp" href="https://www.yelp.com/search?find_desc=Desert+Adventures&find_loc=Boulder+City%2C+NV" target="_blank" rel="noopener noreferrer">
          <span class="link-title">
            <img class="brand-logo" src="https://cdn.simpleicons.org/yelp/ffffff" alt="Yelp logo" />
            Yelp
          </span>
        </a>
        <a class="link-card tertiary tripadvisor" href="https://www.tripadvisor.com/Search?q=Desert+Adventures+Boulder+City" target="_blank" rel="noopener noreferrer">
          <span class="link-title">
            <img class="brand-logo" src="https://cdn.simpleicons.org/tripadvisor/ffffff" alt="TripAdvisor logo" />
            TripAdvisor
          </span>
        </a>
        <a class="link-card tertiary facebook" href="https://www.facebook.com/seniorwhoopy" target="_blank" rel="noopener noreferrer">
          <span class="link-title">
            <img class="brand-logo" src="https://cdn.simpleicons.org/facebook/ffffff" alt="Facebook logo" />
            Facebook
          </span>
        </a>
        <a class="link-card tertiary snapchat" href="https://www.snapchat.com/add/seniorwhoopy" target="_blank" rel="noopener noreferrer">
          <span class="link-title">
            <img class="brand-logo" src="https://cdn.simpleicons.org/snapchat/ffffff" alt="Snapchat logo" />
            Snapchat
          </span>
        </a>
      </nav>
    </section>
  </main>
</template>

<style scoped>
.holmes-page {
  position: relative;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: clamp(1.25rem, 4vw, 3rem);
  background:
    radial-gradient(circle at 22% 22%, rgba(0, 245, 255, 0.18), transparent 45%),
    radial-gradient(circle at 75% 30%, rgba(255, 74, 210, 0.2), transparent 50%),
    linear-gradient(180deg, #120219 0%, #2c1243 45%, #591a4f 72%, #ff7a36 100%);
}

.sky-glow {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    -12deg,
    rgba(255, 255, 255, 0.03) 0,
    rgba(255, 255, 255, 0.03) 2px,
    transparent 2px,
    transparent 18px
  );
  opacity: 0.35;
  pointer-events: none;
}

.sun {
  position: absolute;
  top: 16%;
  right: 12%;
  width: clamp(6.5rem, 20vw, 11rem);
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.85), rgba(255, 190, 68, 0.95) 45%, rgba(255, 88, 20, 0.88) 85%);
  box-shadow:
    0 0 30px rgba(255, 140, 66, 0.8),
    0 0 80px rgba(255, 72, 210, 0.45);
}

.dam-touch {
  position: absolute;
  left: 50%;
  bottom: 28%;
  transform: translateX(-50%);
  width: min(820px, 120%);
  height: 16vh;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  background: linear-gradient(180deg, rgba(222, 221, 216, 0.24), rgba(103, 108, 120, 0.3));
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  opacity: 0.5;
  filter: blur(0.3px);
}

.river {
  position: absolute;
  left: -8%;
  right: -8%;
  bottom: 11%;
  height: 9vh;
  border-radius: 999px;
  background:
    linear-gradient(90deg, rgba(53, 225, 255, 0.18), rgba(41, 188, 255, 0.45), rgba(77, 240, 255, 0.2)),
    repeating-linear-gradient(
      92deg,
      rgba(255, 255, 255, 0.18) 0,
      rgba(255, 255, 255, 0.18) 1px,
      transparent 1px,
      transparent 10px
    );
  box-shadow:
    0 0 14px rgba(66, 219, 255, 0.35),
    inset 0 0 10px rgba(255, 255, 255, 0.14);
  transform: rotate(-1.5deg);
}

.dune {
  position: absolute;
  left: -10%;
  right: -10%;
  border-radius: 50% 50% 0 0;
}

.dune-back {
  bottom: 12%;
  height: 34vh;
  background: linear-gradient(100deg, rgba(255, 117, 58, 0.9), rgba(255, 38, 180, 0.85));
  transform: rotate(-2deg);
}

.dune-front {
  bottom: -6%;
  height: 36vh;
  background: linear-gradient(95deg, rgba(255, 197, 70, 0.95), rgba(255, 119, 44, 0.92));
  transform: rotate(3deg);
}

.panel-stack {
  position: relative;
  z-index: 2;
  width: min(450px, 100%);
  display: grid;
  gap: 0.75rem;
}

.profile-card {
  position: relative;
  padding: clamp(1.5rem, 5vw, 3rem);
  border-radius: 1.5rem;
  color: #fffdf7;
  text-align: center;
  backdrop-filter: blur(9px);
  background: linear-gradient(145deg, rgba(10, 6, 32, 0.9), rgba(34, 8, 49, 0.88));
  border: 1px solid rgba(130, 250, 255, 0.62);
  box-shadow:
    0 0 22px rgba(0, 245, 255, 0.4),
    0 0 45px rgba(255, 45, 156, 0.34),
    inset 0 0 24px rgba(255, 255, 255, 0.12);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: 0.5rem;
  margin-bottom: 0.8rem;
  color: #a9feff;
}

h1 {
  font-size: clamp(1.15rem, 4.4vw, 2.25rem);
  line-height: 1.08;
  font-weight: 700;
}

.name-holmes {
  display: inline-block;
  color: #2dffff;
  text-shadow:
    0 0 8px rgba(45, 255, 255, 0.95),
    0 0 16px rgba(45, 255, 255, 0.75),
    0 0 30px rgba(255, 45, 156, 0.5);
  letter-spacing: 0.03em;
}

.name-zachary {
  font-size: 0.88em;
}

.tagline {
  margin-top: 0.9rem;
  font-size: clamp(0.75rem, 3vw, 1.05rem);
  font-weight: 600;
  color: #ffe79d;
}

.route-chip {
  display: inline-flex;
  align-items: center;
  margin: 0 0 0.85rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff5d5;
  font-size: 0.8rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.copy {
  margin: 0.9rem auto 0;
  max-width: 34ch;
  font-size: clamp(0.62rem, 2.8vw, 0.9rem);
  line-height: 1.4;
  color: rgba(255, 247, 232, 1);
}

.links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.tips {
  margin-top: 0.35rem;
  border-radius: 1.1rem;
  padding: 0.65rem;
  backdrop-filter: blur(8px);
  background: linear-gradient(145deg, rgba(10, 20, 24, 0.72), rgba(20, 8, 38, 0.72));
  border: 1px solid rgba(153, 241, 255, 0.38);
  box-shadow:
    0 0 14px rgba(0, 245, 255, 0.18),
    inset 0 0 18px rgba(255, 255, 255, 0.06);
}

.tips-heading {
  margin: 0 0 0.45rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: clamp(0.5rem, 2vw, 0.64rem);
  color: #c8fbff;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.link-card {
  --logo-size: 1.55rem;
  --logo-left: 0.75rem;
  text-decoration: none;
  border-radius: 0.9rem;
  border: 1px solid var(--chip-border, rgba(77, 240, 255, 0.5));
  background: var(--chip-bg, rgba(18, 14, 44, 0.58));
  color: var(--chip-text, #f3fdff);
  min-height: 2.9rem;
  padding: 0.6rem 0.75rem 0.6rem calc(var(--logo-left) + var(--logo-size) + 0.45rem);
  font-size: clamp(0.52rem, 2.2vw, 0.72rem);
  line-height: 1.2;
  text-align: left;
  display: flex;
  position: relative;
  flex-direction: column;
  justify-content: center;
  gap: 0.18rem;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.primary-tip {
  grid-column: span 3;
}

.primary {
  min-height: 3.5rem;
  border-width: 2px;
  grid-column: span 2;
}

.secondary {
  min-height: 3.1rem;
}

.tertiary {
  min-height: 2.7rem;
  opacity: 0.96;
}

.link-card:hover {
  transform: translateY(-1px);
  border-color: var(--chip-border-hover, rgba(255, 132, 224, 0.8));
  box-shadow: 0 0 12px var(--chip-glow, rgba(77, 240, 255, 0.28)), 0 0 16px rgba(255, 132, 224, 0.2);
}

.tip-card {
  --chip-bg: linear-gradient(135deg, rgba(0, 210, 120, 0.72), rgba(8, 88, 56, 0.82));
  --chip-border: rgba(147, 255, 204, 0.8);
  --chip-border-hover: rgba(198, 255, 227, 1);
  --chip-glow: rgba(147, 255, 204, 0.45);
  --logo-size: 1.2rem;
  --logo-left: 0.5rem;
  min-height: 2.6rem;
  padding: 0.45rem 0.5rem 0.45rem calc(var(--logo-left) + var(--logo-size) + 0.35rem);
}

.venmo {
  --chip-bg: linear-gradient(135deg, rgba(45, 136, 255, 0.74), rgba(16, 72, 148, 0.84));
  --chip-border: rgba(167, 213, 255, 0.86);
  --chip-border-hover: rgba(210, 236, 255, 1);
  --chip-glow: rgba(167, 213, 255, 0.48);
}

.paypal {
  --chip-bg: linear-gradient(135deg, rgba(0, 96, 204, 0.76), rgba(0, 47, 135, 0.86));
  --chip-border: rgba(144, 193, 255, 0.84);
  --chip-border-hover: rgba(198, 224, 255, 1);
  --chip-glow: rgba(144, 193, 255, 0.48);
}

.zelle {
  --chip-bg: linear-gradient(135deg, rgba(123, 53, 255, 0.76), rgba(76, 25, 171, 0.88));
  --chip-border: rgba(211, 177, 255, 0.86);
  --chip-border-hover: rgba(232, 214, 255, 1);
  --chip-glow: rgba(211, 177, 255, 0.48);
}

.tip-card .link-title {
  font-size: clamp(0.5rem, 1.7vw, 0.68rem);
}

.tip-card .link-meta {
  font-size: clamp(0.4rem, 1.4vw, 0.54rem);
}

.placeholder {
  opacity: 0.78;
  pointer-events: none;
  --chip-bg: linear-gradient(135deg, rgba(93, 104, 118, 0.55), rgba(45, 55, 68, 0.68));
  --chip-border: rgba(182, 196, 212, 0.5);
  --chip-glow: rgba(182, 196, 212, 0.2);
}

.link-title {
  display: block;
  font-size: clamp(0.62rem, 2.4vw, 0.8rem);
  font-weight: 700;
}

.brand-logo {
  position: absolute;
  left: var(--logo-left);
  top: 50%;
  width: var(--logo-size);
  height: var(--logo-size);
  transform: translateY(-50%);
  object-fit: contain;
  flex: 0 0 auto;
}

.link-meta {
  font-size: clamp(0.45rem, 1.9vw, 0.62rem);
  opacity: 0.96;
}

.primary .link-title {
  font-size: clamp(0.72rem, 2.8vw, 0.95rem);
}

.primary .link-meta {
  font-size: clamp(0.52rem, 2vw, 0.7rem);
}

.tertiary .link-title {
  font-size: clamp(0.56rem, 2.2vw, 0.72rem);
}

.tertiary .link-meta {
  font-size: clamp(0.42rem, 1.8vw, 0.56rem);
}

.instagram {
  --chip-bg: linear-gradient(135deg, rgba(88, 81, 216, 0.66), rgba(225, 48, 108, 0.64));
  --chip-border: rgba(236, 136, 200, 0.65);
  --chip-border-hover: rgba(255, 196, 232, 0.95);
  --chip-glow: rgba(236, 136, 200, 0.45);
}

.youtube {
  --chip-bg: linear-gradient(135deg, rgba(255, 0, 0, 0.58), rgba(42, 12, 12, 0.72));
  --chip-border: rgba(255, 115, 115, 0.7);
  --chip-border-hover: rgba(255, 160, 160, 1);
  --chip-glow: rgba(255, 90, 90, 0.42);
}

.tiktok {
  --chip-bg: linear-gradient(135deg, rgba(37, 244, 238, 0.6), rgba(254, 44, 85, 0.56));
  --chip-border: rgba(132, 244, 240, 0.7);
  --chip-border-hover: rgba(180, 255, 251, 1);
  --chip-glow: rgba(132, 244, 240, 0.4);
}

.website {
  --chip-bg: linear-gradient(135deg, rgba(255, 184, 77, 0.68), rgba(103, 68, 22, 0.72));
  --chip-border: rgba(255, 206, 123, 0.72);
  --chip-border-hover: rgba(255, 225, 170, 1);
  --chip-glow: rgba(255, 206, 123, 0.4);
}

.maps {
  --chip-bg: linear-gradient(135deg, rgba(66, 193, 113, 0.7), rgba(27, 102, 74, 0.78));
  --chip-border: rgba(145, 239, 176, 0.78);
  --chip-border-hover: rgba(188, 252, 209, 1);
  --chip-glow: rgba(145, 239, 176, 0.45);
}

.yelp {
  --chip-bg: linear-gradient(135deg, rgba(215, 50, 56, 0.7), rgba(100, 18, 20, 0.78));
  --chip-border: rgba(255, 140, 140, 0.8);
  --chip-border-hover: rgba(255, 188, 188, 1);
  --chip-glow: rgba(255, 140, 140, 0.44);
}

.tripadvisor {
  --chip-bg: linear-gradient(135deg, rgba(52, 170, 111, 0.72), rgba(24, 88, 66, 0.82));
  --chip-border: rgba(153, 237, 195, 0.8);
  --chip-border-hover: rgba(207, 255, 233, 1);
  --chip-glow: rgba(153, 237, 195, 0.45);
}

.facebook {
  --chip-bg: linear-gradient(135deg, rgba(24, 119, 242, 0.62), rgba(16, 38, 71, 0.76));
  --chip-border: rgba(126, 182, 255, 0.72);
  --chip-border-hover: rgba(176, 213, 255, 1);
  --chip-glow: rgba(126, 182, 255, 0.4);
}

.snapchat {
  --chip-bg: linear-gradient(135deg, rgba(255, 252, 0, 0.74), rgba(97, 92, 9, 0.8));
  --chip-text: #fffef2;
  --chip-border: rgba(255, 247, 130, 0.78);
  --chip-border-hover: rgba(255, 250, 175, 1);
  --chip-glow: rgba(255, 247, 130, 0.43);
}

@media (max-width: 700px) {
  .sun {
    right: 5%;
    top: 10%;
  }

  .river {
    bottom: 14%;
    height: 7vh;
  }

  .profile-card {
    text-align: left;
  }

  .links {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

}
</style>
