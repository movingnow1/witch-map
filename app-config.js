(function(){
  const host=location.hostname;
  const production=host==='witch-map.vercel.app'||host==='www.witch-map.vercel.app';
  window.MASIL_CONFIG=Object.freeze({
    env:production?'prd':'dev',
    apiBase:production?'https://api.witch-map.example':'http://localhost:8787',
    authBase:production?'https://api.witch-map.example/api/auth':'http://localhost:8787/api/auth'
  });
  document.documentElement.dataset.environment=window.MASIL_CONFIG.env;
})();
