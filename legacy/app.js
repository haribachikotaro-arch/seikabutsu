const $ = (sel) => document.querySelector(sel);

// フォーム入力参照
const $title = $('#titleInput');
const $slug = $('#slugInput');
const $desc = $('#descInput');
const $content = $('#contentInput');
const $appUrl = $('#appUrlInput');
const $repoUrl = $('#repoUrlInput');
const $eyecatch = $('#eyecatchInput');
const $author = $('#authorInput');
const $tech = $('#techInput');
const $backend = $('#backendSelect');
const $displayMode = $('#displayModeSelect');

// プレビュー表示参照
const $prevTitle = $('#prevTitle');
const $prevSlugPath = $('#previewSlugPath');
const $prevDesc = $('#prevDesc');
const $prevContent = $('#prevContent');
const $prevAuthor = $('#prevAuthor');
const $prevAvatar = $('#prevAvatar');
const $prevBackend = $('#prevBackend');
const $prevEyecatch = $('#prevEyecatch');
const $prevTechTags = $('#prevTechTags');
const $openTabBtn = $('#openTabBtn');
const $repoWrapper = $('#repoWrapper');
const $repoLink = $('#repoLink');
const $notice = $('#errorNotice');

// iframe操作用参照
const $launchBtn = $('#launchBtn');
const $frameStage = $('#frameStage');
const $frameContainer = $('#frameContainer');
const $frameStatus = $('#frameStatus');

// スラグ自動生成
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

$('#genSlugBtn').addEventListener('click', () => {
  if ($title.value) {
    $slug.value = generateSlug($title.value) || 'my-work';
  }
});

// 入力データ取得
const getFormData = () => ({
  title: $title.value.trim(),
  slug: $slug.value.trim(),
  desc: $desc.value.trim(),
  content: $content.value.trim(),
  appUrl: $appUrl.value.trim(),
  repoUrl: $repoUrl.value.trim(),
  eyecatch: $eyecatch.value.trim(),
  author: $author.value.trim(),
  tech: $tech.value.split(',').map(s => s.trim()).filter(Boolean),
  backend: $backend.value,
  displayMode: $displayMode.value
});

// 入力検証（仕様書に完全準拠）
const validate = (data) => {
  const errors = [];

  if (!data.title || !data.slug || !data.desc || !data.content || !data.appUrl || !data.eyecatch || !data.author || data.tech.length === 0) {
    errors.push('必須項目をすべて入力してください。');
  }

  if (data.appUrl) {
    if (!data.appUrl.startsWith('https://')) {
      errors.push('公開URLはhttps://から始まるURLを入力してください。');
    }
    if (data.appUrl.includes('localhost') || data.appUrl.includes('127.0.0.1')) {
      errors.push('localhostのURLは公開できません。');
    }
  }

  return errors;
};

// エラーメッセージの表示
const renderErrors = (errors) => {
  if (errors.length === 0) {
    $notice.classList.add('hidden');
    $notice.innerHTML = '';
    return;
  }
  $notice.innerHTML = errors.map(err => `<p>・${err}</p>`).join('');
  $notice.classList.remove('hidden');
  window.scrollTo({ top: $notice.offsetTop - 20, behavior: 'smooth' });
};

// プレビューの更新処理
const updatePreview = () => {
  const data = getFormData();
  const errors = validate(data);

  renderErrors(errors);
  if (errors.length > 0) return false;

  $prevTitle.textContent = data.title;
  $prevSlugPath.textContent = data.slug;
  $prevDesc.textContent = data.desc;
  $prevContent.textContent = data.content;
  $prevAuthor.textContent = data.author;
  $prevAvatar.textContent = data.author ? data.author.charAt(0) : '山';
  $prevBackend.textContent = data.backend;
  $prevEyecatch.src = data.eyecatch;
  $openTabBtn.href = data.appUrl;

  // リポジトリリンクの切り替え
  if (data.repoUrl) {
    $repoLink.href = data.repoUrl;
    $repoWrapper.classList.remove('hidden');
  } else {
    $repoWrapper.classList.add('hidden');
  }

  // 技術スタックタグの更新
  $prevTechTags.innerHTML = data.tech.map(tag => 
    `<span class="px-2 py-0.5 bg-stone-100 text-stone-700 rounded border border-stone-200">${tag}</span>`
  ).join('');

  // 表示モードに応じたボタン切り替え
  if (data.displayMode === 'linkOnly') {
    $launchBtn.classList.add('hidden');
    closeIframe();
  } else {
    $launchBtn.classList.remove('hidden');
  }

  return true;
};

// 安全なiframeの動的ロード（仕様書のセキュリティ要件を満たす）
const mountIframe = () => {
  if (!updatePreview()) return;
  const data = getFormData();

  $frameContainer.innerHTML = '';
  $frameStatus.textContent = 'ステータス: 読み込み中...';
  $frameStage.classList.remove('hidden');

  const iframe = document.createElement('iframe');
  iframe.src = data.appUrl;
  iframe.title = `${data.title}のデモ`;
  iframe.className = 'w-full h-full border-0';
  
  // セキュリティ属性設定
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-downloads');
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('referrerpolicy', 'no-referrer');

  iframe.onload = () => {
    $frameStatus.textContent = 'ステータス: 接続完了';
  };

  iframe.onerror = () => {
    $frameStatus.textContent = 'ステータス: 読み込みに失敗しました';
  };

  $frameContainer.appendChild(iframe);
  $frameStage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

const closeIframe = () => {
  $frameContainer.innerHTML = '';
  $frameStage.classList.add('hidden');
};

// イベント登録
$('#previewBtn').addEventListener('click', updatePreview);
$launchBtn.addEventListener('click', mountIframe);
$('#closeFrameBtn').addEventListener('click', closeIframe);

$('#draftBtn').addEventListener('click', () => {
  const data = getFormData();
  const errors = validate(data);
  renderErrors(errors);
  if (errors.length === 0) {
    alert('下書きとして保存しました。');
  }
});

$('#submitBtn').addEventListener('click', () => {
  const data = getFormData();
  const errors = validate(data);
  renderErrors(errors);
  if (errors.length === 0) {
    alert('管理者に公開申請を送信しました。確認後に公開されます。');
  }
});

// 初期状態同期
updatePreview();