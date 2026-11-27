const I={
 ship:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15h18l-2.5 4.5H5.5z" fill="currentColor" fill-opacity=".25"/><path d="M12 3v12"/><path d="M12 4l6 8h-6z" fill="currentColor" fill-opacity=".35"/><path d="M11 6l-5 6h5"/><path d="M2 21.5c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/></svg>',
 star:'<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.8 6.1 6.6.7-5 4.5 1.4 6.6L12 17.2l-5.8 3.3 1.4-6.6-5-4.5 6.6-.7z"/></svg>',
 swords:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 3l11 11M20 3L9 14"/><path d="M13 16l4-4M11 16l-4-4"/><path d="M16.5 15.5l3.5 3.5M7.5 15.5L4 19"/><path d="M4 3h3v3M20 3h-3v3" stroke-width="1.5"/></svg>',
 flag:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22V3"/><path d="M5 4c3-1.6 5 .8 8-.4s4.5-1 6 0v9c-1.5-1-3-1.2-6 0s-5-1.2-8 .4" fill="currentColor" fill-opacity=".3"/></svg>',
 crown:'<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z"/><rect x="5" y="19" width="14" height="2" rx="1"/></svg>',
 leaf:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z" fill="currentColor" fill-opacity=".25"/><path d="M5 19L14 10"/></svg>',
 check:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
 search:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
 lock:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
 plus:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
 minus:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
 fit:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
 target:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>',
 close:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 doc:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
 pin:'<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
 share:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7"/></svg>',
 chev:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
 back:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
 tree:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="3" width="6" height="4" rx="1"/><rect x="3" y="16" width="6" height="4" rx="1"/><rect x="15" y="16" width="6" height="4" rx="1"/><path d="M12 7v4M6 16v-3h12v3"/></svg>',
 book:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5c3-1.5 6-1.5 8 .5 2-2 5-2 8-.5v14c-3-1.5-6-1.5-8 .5-2-2-5-2-8-.5z"/><path d="M12 5.5v14"/></svg>',
 user:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5"/></svg>',
 filter:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/></svg>',
 link:'<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
};
const CREST=`<svg class="crest" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22.5" fill="#1e2d47"/><circle cx="24" cy="24" r="19.5" fill="none" stroke="#dcc58f" stroke-width=".8"/>
<g stroke="#dcc58f" stroke-width="1.5" fill="none" stroke-linecap="round"><path d="M24 37V22"/><path d="M24 26c-3-2-6-2-8.5-5"/><path d="M24 24c3-2 6-2.5 8.5-5.5"/><path d="M24 30c-2.5-1-4.5-.5-7 1.5"/><path d="M24 29c2.5-1 5-.5 7 1"/></g>
<g fill="#b0893c"><circle cx="24" cy="15.5" r="3.2"/><circle cx="15" cy="20" r="2.6"/><circle cx="33" cy="18.5" r="2.6"/><circle cx="16.5" cy="31.5" r="2.2"/><circle cx="31.5" cy="30.5" r="2.2"/></g><path d="M17 37.5h14" stroke="#dcc58f" stroke-width="1.4" stroke-linecap="round"/></svg>`;
function badge(k){const m={ship:['ship',''],star:['star',''],swords:['swords',''],flag:['flag','rev'],crown:['crown','jt']}[k];return `<span class="badge-i ${m[1]}">${I[m[0]]}</span>`}
function topbar(){return `<div class="top"><div class="brand">${CREST}<div><h1>The Chiesa <i>&amp;</i> Grizzard Family</h1><div class="sub">Valmozzola · New York · Tazewell · Southampton · Jamestown</div></div></div>
<div class="search">${I.search}<span>Search people &amp; places…</span><span class="kbd">⌘ K</span></div>
<div class="nav"><b>Explore</b><span>Stories</span><span>Places</span><span>Sources</span></div>
<div class="btn-lock">${I.lock}Family sign-in</div></div>`}
function toolbar(active){const c=(k,ic,t)=>`<div class="chip ${active==k?'on':''}">${ic}${t}${active==k?`<span class="x">${I.close.replace('class="ico"','class="ico" style="width:11px;height:11px"')}</span>`:''}</div>`;
return `<div class="tools"><div class="seg"><div class="on"><span class="dot"></span>Brandon’s line</div><div><span class="dot"></span>Holly’s line</div></div><div class="vsep"></div>
${c('imm',I.ship,'Immigrants')}${c('war',I.swords,'Served in war')}${c('jt',I.crown,'Jamestown line')}${c('pr',I.check,'Proven only')}
<div class="meta">${I.filter.replace('class="ico"','class="ico" style="color:#b0893c"')}<span>Living relatives are hidden on the public site</span></div></div>`}
