/** Inline, blocking theme resolver to avoid a flash of wrong theme. Reads localStorage("dp:theme") = light|dark|sepia|system. */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('dp:theme')||'system';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(d?'dark':'light'):t;document.documentElement.setAttribute('data-theme',r);var p=JSON.parse(localStorage.getItem('dp:reading')||'{}');var s=document.documentElement.style;if(p.size)s.setProperty('--read-size',p.size+'rem');if(p.leading)s.setProperty('--read-leading',p.leading);if(p.width)s.setProperty('--read-width',p.width+'rem');}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
