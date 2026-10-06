(() => {
  const overlay = document.getElementById('loading');
  const title = document.getElementById('loading-title');
  const detail = document.getElementById('loading-detail');
  const progress = document.getElementById('loading-progress');
  const fill = document.getElementById('loading-fill');
  const percent = document.getElementById('loading-percent');
  const retry = document.getElementById('loading-retry');
  const scene = document.getElementById('scene');
  // Two engine steps, sixteen resources and four scene preparation steps.
  // These are completed work units, not a download byte percentage or a timer.
  const totalSteps = 22;
  let completed = 0;
  let stopped = false;
  const paint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  function update(step, heading, description) {
    if (stopped) return;
    completed = Math.max(completed, Math.min(step, totalSteps));
    const value = Math.floor(completed / totalSteps * 100);
    title.textContent = heading;
    detail.textContent = description;
    percent.textContent = `${value}%`;
    fill.style.width = `${value}%`;
    progress.setAttribute('aria-valuenow', String(value));
    progress.setAttribute('aria-valuetext', `${value}%，${heading}，${description}`);
  }

  const loading = Object.freeze({
    async stage(step, heading, description) {
      update(step, heading, description);
      await paint();
    },
    resources(done, total) {
      update(2 + 16 * done / total, '正在加载庭院材质', `材质与环境资源 ${done} / ${total} · 石材、木纹、绿植与天空`);
    },
    async finish() {
      if (stopped) return;
      // The caller has rendered the first frame. Let the browser present it first.
      await paint();
      if (stopped) return;
      update(totalSteps, '庭院已准备就绪', '即将进入 · 鼠标拖动旋转，滚轮缩放');
      stopped = true;
      scene.setAttribute('aria-busy', 'false');
      document.documentElement.dataset.sceneReady = 'true';
      await new Promise(resolve => setTimeout(resolve, 350));
      overlay.classList.add('is-complete');
      setTimeout(() => overlay.remove(), 400);
    },
    fail(message = '网络连接中断或场景未能启动，请检查网络后重试。') {
      if (stopped) return;
      stopped = true;
      overlay.classList.add('has-error');
      title.textContent = '加载暂时中断';
      detail.textContent = message;
      progress.setAttribute('aria-valuetext', `${percent.textContent}，加载失败`);
      retry.hidden = false;
      scene.setAttribute('aria-busy', 'false');
      retry.focus();
    }
  });

  window.courtyardLoading = loading;
  scene.setAttribute('aria-busy', 'true');
  import('./main.js?v=a6-pond-pavilion').catch(error => {
    console.error('Courtyard initialization failed:', error);
    loading.fail();
  });
})();
