// Fixed scenes for the entry's screenshots, driven by the query string so every shot is reproducible:
//   ?shot=cover&size=1920x1080&layout=mural&grade=neon&fill=mix&caption=Neon%20Shores&sub=One%20Last%20Ride
//   ?shot=editor&layout=mural&grade=sunset&fill=mix&panel=0&caption=Neon%20Shores
// `fill` is beach (every panel the beach sample), strip (every panel the strip sample) or mix (hero panel the
// beach sample, the rest alternating). window.__shotReady is set once the scene has painted.
export async function runShot(params, api) {
  const shot = params.get('shot');
  api.setScene({
    layout: params.get('layout') ?? 'mural',
    grade: params.get('grade') ?? 'sunset',
    title: params.get('caption') ?? 'Neon Shores',
    subtitle: params.get('sub') ?? 'One Last Ride',
  });
  const beach = await api.loadSample('samples/neon-beach.jpg');
  const strip = await api.loadSample('samples/palm-strip.jpg');
  const fill = params.get('fill') ?? 'mix';
  if (fill === 'beach') api.fillWith(beach);
  else if (fill === 'strip') api.fillWith(strip);
  else api.mixFill(beach, strip);
  if (shot === 'cover') {
    const [w, h] = (params.get('size') ?? '1920x1080').split('x').map(Number);
    api.showCover(w, h);
  } else {
    api.selectPanel(Number(params.get('panel') ?? 0));
    api.renderEditor();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
