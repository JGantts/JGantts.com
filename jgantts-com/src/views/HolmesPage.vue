<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ tips?: boolean }>()
const sectionOrder = computed(() => props.tips ? ['tips', 'links'] as const : ['links', 'tips'] as const)

const browserIcons = {
  chrome: ['https://cdn.simpleicons.org/googlechrome/ffffff', 'Google Chrome logo'],
  edge: ['https://cdn.simpleicons.org/microsoftedge/ffffff', 'Microsoft Edge logo'],
  firefox: ['https://cdn.simpleicons.org/firefoxbrowser/ffffff', 'Firefox logo'],
  opera: ['https://cdn.simpleicons.org/opera/ffffff', 'Opera logo'],
  safari: ['https://cdn.simpleicons.org/safari/ffffff', 'Safari logo'],
} as const

function browserIcon(userAgent: string) {
  if (/Edg\//.test(userAgent)) return browserIcons.edge
  if (/OPR\//.test(userAgent)) return browserIcons.opera
  if (/Firefox\//.test(userAgent) || /FxiOS\//.test(userAgent)) return browserIcons.firefox
  if (/Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)) return browserIcons.chrome
  if (/Safari\//.test(userAgent)) return browserIcons.safari
  return browserIcons.chrome
}

const activeBrowserIcon = typeof navigator === 'undefined' ? browserIcons.chrome : browserIcon(navigator.userAgent)
const icon = (name: string) => `https://cdn.simpleicons.org/${name}/ffffff`

const socialLinks = computed(() => [
  ['Instagram', '@seniorwhoopy', 'https://www.instagram.com/seniorwhoopy', icon('instagram'), 'instagram featured', ''],
  ['YouTube', '@SeniorWhoopyIRL', 'https://www.youtube.com/@SeniorWhoopyIRL', icon('youtube'), 'youtube featured', ''],
  ['Google Maps', 'Leave a review', 'https://maps.google.com/?q=1647%20Boulder%20City%20Pkwy%20Ste%20A%2C%20Boulder%20City%2C%20NV%2089005', icon('googlemaps'), 'maps featured', ''],
  ['Desert Adventures', 'desert-adventures.com', 'https://www.desert-adventures.com/', activeBrowserIcon[0], 'website wide', activeBrowserIcon[1]],
  ['TikTok', '@seniorwhoopy', 'https://www.tiktok.com/@seniorwhoopy', icon('tiktok'), 'tiktok wide', ''],
  ['Yelp', '', 'https://www.yelp.com/search?find_desc=Desert+Adventures&find_loc=Boulder+City%2C+NV', icon('yelp'), 'yelp compact', ''],
  ['Tripadvisor', '', 'https://www.tripadvisor.com/Search?q=Desert+Adventures+Boulder+City', icon('tripadvisor'), 'tripadvisor compact', ''],
  ['Facebook', '', 'https://www.facebook.com/seniorwhoopy', icon('facebook'), 'facebook compact', ''],
  ['Snapchat', '', 'https://www.snapchat.com/add/seniorwhoopy', icon('snapchat'), 'snapchat compact', ''],
])

const tipLinks = [
  ['Cash App', '$eniorWhoopy', 'https://cash.app/$eniorWhoopy', icon('cashapp'), 'cashapp'],
  ['Venmo', '@SeniorWhoopy', 'https://venmo.com/u/SeniorWhoopy', icon('venmo'), 'venmo'],
  ['PayPal', 'ThriftJesus', 'https://www.paypal.biz/ThriftJesus', icon('paypal'), 'paypal'],
]
</script>

<template>
  <main class="holmes-page">
    <div class="aurora" aria-hidden="true" /><div class="contours" aria-hidden="true" />
    <section class="shell" aria-labelledby="holmes-title">
      <header class="profile">
        <div class="profile-topline">
          <span class="coordinate">COLORADO RIVER · NV</span>
          <span class="available"><i aria-hidden="true" /> ON THE WATER</span>
        </div>
        <div class="identity">
          <p class="eyebrow">Professional tour guide</p>
          <h1 id="holmes-title"><span>Zachary</span> Holmes</h1>
          <p class="intro">Night trails, desert stories, and zero wrong turns.</p>
        </div>
        <a class="company-link" href="https://www.desert-adventures.com/" target="_blank" rel="noopener noreferrer">
          <span><small>Guiding with</small><strong>Desert Adventures</strong></span><span class="arrow" aria-hidden="true">↗</span>
        </a>
        <p class="route-mark" aria-hidden="true">RIVER ROUTE / 01</p>
      </header>

      <div class="directory">
        <template v-for="section in sectionOrder" :key="section">
          <section v-if="section === 'tips'" class="tip-section" aria-labelledby="tips-heading">
            <div class="section-heading"><div><p class="section-kicker">Thank your guide</p><h2 id="tips-heading">Leave a tip</h2></div><span aria-hidden="true">03 OPTIONS</span></div>
            <div class="tip-grid">
              <a v-for="tip in tipLinks" :key="tip[0]" class="tip-link" :class="tip[4]" :href="tip[2]" target="_blank" rel="noopener noreferrer">
                <img :src="tip[3]" alt="" /><span><strong>{{ tip[0] }}</strong><small>{{ tip[1] }}</small></span><span class="arrow" aria-hidden="true">↗</span>
              </a>
            </div>
          </section>

          <nav v-else class="link-section" aria-labelledby="links-heading">
            <div class="section-heading"><div><p class="section-kicker">Find me online</p><h2 id="links-heading">Stay connected</h2></div><span aria-hidden="true">09 LINKS</span></div>
            <div class="link-grid">
              <a v-for="link in socialLinks" :key="link[0]" class="link-card" :class="link[4]" :href="link[2]" target="_blank" rel="noopener noreferrer">
                <span class="icon-wrap"><img :src="link[3]" :alt="link[5]" /></span>
                <span class="link-copy"><strong>{{ link[0] }}</strong><small v-if="link[1]">{{ link[1] }}</small></span>
                <span class="arrow" aria-hidden="true">↗</span>
              </a>
            </div>
          </nav>
        </template>
      </div>
    </section>
  </main>
</template>

<style scoped>
.holmes-page{--ink:#f7f3e8;--muted:#a9b5b7;--line:rgba(226,247,244,.14);position:relative;isolation:isolate;min-height:100svh;overflow:hidden;display:grid;place-items:center;box-sizing:border-box;padding:clamp(1rem,3vw,2.5rem);color:var(--ink);background:radial-gradient(circle at 12% 8%,rgba(25,220,196,.12),transparent 30rem),radial-gradient(circle at 92% 90%,rgba(255,107,55,.18),transparent 34rem),#071113}
.aurora{position:absolute;z-index:-2;inset:-35%;background:conic-gradient(from 205deg at 58% 52%,transparent 0 24%,rgba(21,195,177,.09) 31%,transparent 39% 68%,rgba(232,95,52,.1) 74%,transparent 82%);filter:blur(36px);animation:drift 18s ease-in-out infinite alternate}
.contours{position:absolute;z-index:-1;inset:0;opacity:.45;background:repeating-radial-gradient(ellipse at 10% 115%,transparent 0 30px,rgba(232,114,69,.13) 31px 32px,transparent 33px 49px),linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:auto,40px 40px,40px 40px;mask-image:linear-gradient(to bottom,#000,transparent 85%)}
.shell{width:min(100%,72rem);display:grid;grid-template-columns:minmax(18rem,.72fr) minmax(28rem,1.28fr);overflow:hidden;border:1px solid rgba(218,245,240,.18);border-radius:1.75rem;background:rgba(8,20,22,.78);box-shadow:0 2rem 6rem rgba(0,0,0,.45),inset 0 1px rgba(255,255,255,.05);backdrop-filter:blur(24px)}
.profile{position:relative;min-height:36rem;padding:clamp(1.5rem,4vw,3.5rem);display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;border-right:1px solid var(--line);background:linear-gradient(160deg,rgba(19,87,82,.62),rgba(7,21,23,.45) 56%),radial-gradient(circle at 20% 90%,rgba(255,121,66,.38),transparent 44%)}
.profile:after{content:'';position:absolute;right:-8rem;bottom:5.5rem;width:21rem;height:21rem;border:1px solid rgba(255,183,138,.22);border-radius:50%;box-shadow:0 0 0 2.5rem rgba(255,154,94,.035),0 0 0 5rem rgba(255,154,94,.025);pointer-events:none}
.profile-topline,.section-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem}.coordinate,.available,.section-kicker,.section-heading>span,.route-mark{font-family:'Azeret Mono Variable',monospace;font-size:.75rem;line-height:1.4;letter-spacing:.08em}.coordinate{color:#b5cfcd}.available{display:inline-flex;align-items:center;gap:.45rem;color:#8ff1d8}.available i{width:.45rem;height:.45rem;border-radius:50%;background:currentColor;box-shadow:0 0 0 .25rem rgba(143,241,216,.1),0 0 .75rem currentColor}
.identity{position:relative;z-index:1}.eyebrow{margin-bottom:.8rem;color:#ffb585;font-size:.9rem;font-weight:650;letter-spacing:.02em;text-transform:uppercase}h1{max-width:8ch;font-size:clamp(3.2rem,6vw,5.6rem);line-height:.82;font-weight:740;letter-spacing:-.075em}h1 span{display:block;color:transparent;font-size:.43em;line-height:1.3;letter-spacing:.01em;-webkit-text-stroke:1px rgba(247,243,232,.82)}.intro{max-width:29ch;margin-top:1.5rem;color:#d4ddda;font-size:1rem;line-height:1.65}
.company-link{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 1.1rem;color:var(--ink);text-decoration:none;border:1px solid rgba(255,255,255,.17);border-radius:1rem;background:rgba(7,18,20,.46);transition:border-color 180ms ease,background 180ms ease,transform 180ms ease}.company-link small,.company-link strong{display:block}.company-link small{margin-bottom:.25rem;color:var(--muted);font-size:.75rem}.company-link strong{font-size:1rem}.route-mark{position:absolute;right:1.25rem;bottom:1.25rem;color:rgba(255,255,255,.25);writing-mode:vertical-rl}
.directory{padding:clamp(1.5rem,3.5vw,3rem);display:flex;flex-direction:column;gap:1.75rem}.link-section,.tip-section{display:grid;gap:1rem}.tip-section{order:2}.tip-section:first-child{order:0}.section-kicker{margin-bottom:.2rem;color:#7f9b9b;text-transform:uppercase}h2{font-size:clamp(1.35rem,2.2vw,1.75rem);font-weight:680;letter-spacing:-.03em}.section-heading>span{color:#607778;white-space:nowrap}
.link-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}.link-card,.tip-link{position:relative;display:flex;align-items:center;gap:.8rem;min-width:0;box-sizing:border-box;color:var(--ink);text-decoration:none;border:1px solid var(--line);background:rgba(255,255,255,.035);transition:transform 180ms ease,border-color 180ms ease,background 180ms ease,box-shadow 180ms ease}.link-card{min-height:4.1rem;padding:.75rem .85rem;border-radius:1rem}.featured{grid-column:1/-1;min-height:4.75rem}.wide{min-height:4.3rem}.compact{min-height:3.6rem}
.icon-wrap{width:2.35rem;height:2.35rem;flex:0 0 auto;display:grid;place-items:center;border-radius:.7rem;background:var(--brand,rgba(255,255,255,.09));box-shadow:inset 0 1px rgba(255,255,255,.12)}.icon-wrap img,.tip-link img{width:1.15rem;height:1.15rem;object-fit:contain}.link-copy,.tip-link>span:nth-child(2){min-width:0;flex:1}.link-copy strong,.link-copy small,.tip-link strong,.tip-link small{display:block}.link-copy strong,.tip-link strong{font-size:.95rem;font-weight:650}.link-copy small,.tip-link small{margin-top:.25rem;overflow:hidden;color:var(--muted);font-size:.75rem;text-overflow:ellipsis;white-space:nowrap}.arrow{flex:0 0 auto;color:#769091;font-size:1rem;transition:transform 180ms ease,color 180ms ease}
.instagram{--brand:linear-gradient(145deg,#7457d7,#db3973)}.youtube{--brand:#c92727}.maps{--brand:#23764e}.website{--brand:#9a6a23}.tiktok{--brand:linear-gradient(145deg,#159b9a,#a82e4b)}.yelp{--brand:#a9282e}.tripadvisor{--brand:#277852}.facebook{--brand:#2362a7}.snapchat{--brand:#807d16}
.tip-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem}.tip-link{min-height:4.1rem;padding:.7rem .75rem;border-radius:1rem}.tip-link img{flex:0 0 auto}.tip-link .arrow{display:none}.cashapp{background:linear-gradient(145deg,rgba(19,139,84,.28),rgba(255,255,255,.025))}.venmo{background:linear-gradient(145deg,rgba(42,103,194,.3),rgba(255,255,255,.025))}.paypal{background:linear-gradient(145deg,rgba(25,78,153,.32),rgba(255,255,255,.025))}
.link-card:hover,.link-card:focus-visible,.tip-link:hover,.tip-link:focus-visible,.company-link:hover,.company-link:focus-visible{transform:translateY(-2px);border-color:rgba(154,240,222,.52);background-color:rgba(255,255,255,.075);box-shadow:0 .75rem 1.75rem rgba(0,0,0,.18);outline:none}.link-card:hover .arrow,.link-card:focus-visible .arrow,.company-link:hover .arrow,.company-link:focus-visible .arrow{transform:translate(2px,-2px);color:#9af0de}
@keyframes drift{to{transform:translate3d(3%,-2%,0) rotate(4deg)}}
@media(max-width:860px){.holmes-page{place-items:start center}.shell{grid-template-columns:1fr}.profile{min-height:29rem;border-right:0;border-bottom:1px solid var(--line)}.route-mark{display:none}h1{font-size:clamp(3.5rem,13vw,6rem)}}
@media(max-width:560px){.holmes-page{padding:0}.shell{border-width:0;border-radius:0}.profile{min-height:27rem;padding:1.3rem}.directory{padding:1.3rem}.coordinate,.available{font-size:.68rem}.link-grid,.tip-grid{grid-template-columns:1fr}.featured{grid-column:auto}.compact{min-height:3.8rem}.tip-link .arrow{display:block}}
@media(prefers-reduced-motion:reduce){.aurora{animation:none}.link-card,.tip-link,.company-link,.arrow{transition:none}}
</style>
