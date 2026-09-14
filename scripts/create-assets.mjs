import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("public/images", { recursive: true });
mkdirSync("public/demos", { recursive: true });
const svg = (bg, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="720" viewBox="0 0 1000 720"><rect width="1000" height="720" fill="${bg}"/><style>text{font-family:'Yu Gothic',Meiryo,sans-serif}</style>${body}</svg>`;
const line = (x, y, w, c = "#d8d9cb") =>
  `<path d="M${x} ${y}h${w}" stroke="${c}"/>`;
writeFileSync(
  "public/images/campus-map.svg",
  svg(
    "#d8ded0",
    `<path d="M0 85H1000M0 635H1000M82 0V720M918 0V720" stroke="#c4ccba"/><text x="55" y="52" font-size="15" fill="#66755c" letter-spacing="3">DataDreamers / 学内施設マップ</text><text x="839" y="680" font-size="14" fill="#66755c">制作サンプル</text><g transform="translate(100 122) rotate(-2 400 245)"><rect x="7" y="10" width="800" height="480" fill="#bec8b3"/><rect width="800" height="480" rx="4" fill="#fcfcf8"/><path d="M0 55H800" stroke="#dedfd5"/><rect x="23" y="20" width="15" height="15" fill="#617451"/><text x="49" y="34" font-size="16" font-weight="700" fill="#38432f">空き場所マップ</text><text x="550" y="33" font-size="11" fill="#7a7f73">施設一覧</text><text x="640" y="33" font-size="11" fill="#7a7f73">このマップについて</text><rect y="56" width="202" height="424" fill="#f4f5ee"/><text x="25" y="95" font-size="12" fill="#7c8274">作業する場所を探す</text><rect x="18" y="113" width="168" height="39" rx="3" fill="#e0e6d8"/><text x="34" y="138" font-size="13" font-weight="700" fill="#566849">すべての施設</text><text x="34" y="179" font-size="12" fill="#767b6e">自習スペース</text><text x="34" y="217" font-size="12" fill="#767b6e">教室</text><text x="34" y="255" font-size="12" fill="#767b6e">図書室</text><text x="25" y="391" font-size="10" fill="#83887a">混雑状況</text><circle cx="31" cy="416" r="4" fill="#718858"/><text x="44" y="420" font-size="10" fill="#626d58">空いています</text><circle cx="31" cy="440" r="4" fill="#c4a65f"/><text x="44" y="444" font-size="10" fill="#626d58">少し混んでいます</text><text x="232" y="102" font-size="21" font-weight="700" fill="#34422e">いま、どこで作業する？</text><text x="234" y="126" font-size="11" fill="#828977">校内の空き状況を、ひと目で。</text><rect x="233" y="149" width="535" height="298" fill="#eef0e5"/><path d="M233 280H768M458 149V447M650 149V447" stroke="#fff" stroke-width="16"/><path d="M233 220H768M560 149V447" stroke="#dde1d2" stroke-dasharray="4 5"/><rect x="271" y="186" width="150" height="74" rx="3" fill="#d3dcc5" stroke="#99ad83"/><text x="300" y="219" font-size="13" fill="#4b6140">図書室</text><text x="300" y="238" font-size="10" fill="#647d51">● 空いています</text><rect x="487" y="186" width="125" height="74" rx="3" fill="#e9dfbf" stroke="#c5b880"/><text x="507" y="219" font-size="13" fill="#6a613e">自習室 A</text><text x="507" y="238" font-size="10" fill="#8c7d43">● やや混雑</text><rect x="276" y="313" width="146" height="92" rx="3" fill="#d3dcc5" stroke="#99ad83"/><text x="300" y="350" font-size="13" fill="#4b6140">ラウンジ</text><text x="300" y="371" font-size="10" fill="#647d51">● 空いています</text><rect x="487" y="313" width="126" height="92" rx="3" fill="#e0e2d6" stroke="#c6ccba"/><text x="507" y="355" font-size="13" fill="#7c8570">第2教室</text><rect x="679" y="195" width="60" height="60" fill="#dce4d0"/><rect x="679" y="317" width="60" height="85" fill="#dce4d0"/><circle cx="644" cy="287" r="12" fill="#b34c33" stroke="white" stroke-width="4"/><text x="673" y="290" font-size="10" fill="#9c533e">現在地</text></g>`,
  ),
);
writeFileSync(
  "public/images/study-timer.svg",
  svg(
    "#e9d9c7",
    `<text x="57" y="65" font-size="17" fill="#8d7860" letter-spacing="2">ひと区切りタイマー</text><circle cx="816" cy="601" r="210" fill="#e1cdb5"/><g transform="translate(175 130) rotate(2 325 220)"><rect x="8" y="10" width="650" height="435" fill="#cbb9a4"/><rect width="650" height="435" rx="3" fill="#fffaf0"/><text x="36" y="45" font-size="15" fill="#645743" font-weight="700">ひと区切り。</text><text x="475" y="44" font-size="11" fill="#988b75">集中する時間</text><text x="325" y="112" text-anchor="middle" font-size="13" fill="#988b75">目の前のことを、ひとつずつ。</text><circle cx="325" cy="240" r="99" fill="none" stroke="#e9dfcf" stroke-width="4"/><path d="M325 141a99 99 0 1 1-94 69" fill="none" stroke="#b35d3d" stroke-width="4"/><text x="325" y="247" text-anchor="middle" font-family="monospace" font-size="57" fill="#69533c">25:00</text><text x="325" y="278" text-anchor="middle" font-size="10" fill="#a28b70">集中する</text><rect x="256" y="360" width="138" height="36" rx="2" fill="#ad5b3d"/><text x="325" y="384" text-anchor="middle" font-size="12" fill="#fff9ee">はじめる →</text></g><text x="810" y="672" font-size="13" fill="#9a856b">制作サンプル</text>`,
  ),
);
writeFileSync(
  "public/images/class-vote.svg",
  svg(
    "#d8dfe4",
    `<text x="57" y="65" font-size="17" fill="#697c88" letter-spacing="2">みんなで決める投票箱</text><path d="M65 115v510h870" fill="none" stroke="#becbd4"/><g transform="translate(174 132) rotate(-2 325 220)"><rect x="7" y="10" width="650" height="435" fill="#b7c5ce"/><rect width="650" height="435" rx="3" fill="#fafcfb"/><text x="32" y="42" font-size="15" fill="#455d6b" font-weight="700">みんなの投票箱</text><text x="501" y="42" font-size="11" fill="#8295a0">回答受付中</text>${line(0, 62, 650)}<text x="56" y="120" font-size="22" font-weight="700" fill="#364e5d">次の勉強会、何をやってみたい？</text><text x="56" y="152" font-size="12" fill="#8495a0">気になるテーマをひとつ選んでください。</text>${[
      ["Webサイトをつくる", 204, true],
      ["ゲームをつくる", 262, false],
      ["データを見てみる", 320, false],
    ]
      .map(
        ([t, y, sel]) =>
          `<rect x="54" y="${Number(y) - 27}" width="540" height="45" rx="2" fill="${sel ? "#e5eef2" : "#fff"}" stroke="${sel ? "#7f9ead" : "#dae2e5"}"/><circle cx="77" cy="${Number(y) - 5}" r="7" fill="${sel ? "#5b8092" : "#fff"}" stroke="#a2b4bd"/><text x="99" y="${y}" font-size="13" fill="#536d7b">${t}</text>`,
      )
      .join(
        "",
      )}<rect x="442" y="364" width="151" height="35" rx="2" fill="#577888"/><text x="518" y="387" text-anchor="middle" font-size="12" fill="white">このテーマに投票 →</text></g><text x="810" y="672" font-size="13" fill="#798e9b">制作サンプル</text>`,
  ),
);
writeFileSync(
  "public/images/field-notes.svg",
  svg(
    "#ddd9cc",
    `<rect x="0" y="0" width="1000" height="720" fill="#d3cebf"/><g transform="translate(160 60) rotate(-9 340 290)"><rect x="15" y="18" width="650" height="570" fill="#c0b9a9"/><rect width="650" height="570" fill="#f7f3e7"/>${Array.from({ length: 15 }, (_, i) => line(35, 65 + i * 31, 580, "#dce0d3")).join("")}<path d="M76 0V570" stroke="#d8b5a4"/><text x="105" y="109" font-size="28" fill="#595b4f">教室を歩いて、マップをつくる。</text><text x="107" y="161" font-size="17" fill="#7a7b6d">まずは、使う人の目線で。</text><path d="M148 223h185v108H148zM363 222h131v108H363zM148 359h129v102H148zM309 359h185v102H309z" fill="none" stroke="#828b75" stroke-width="3"/><path d="M127 343h414M346 212v263" stroke="#aeb69e" stroke-width="2" stroke-dasharray="7 6"/><text x="170" y="283" font-size="20" fill="#69745f">図書室</text><text x="380" y="283" font-size="19" fill="#69745f">自習室</text><text x="331" y="420" font-size="19" fill="#69745f">ラウンジ</text><circle cx="289" cy="346" r="22" fill="none" stroke="#b6674b" stroke-width="3"/><path d="M313 360l68 46" stroke="#b6674b" stroke-width="2"/><text x="106" y="522" font-size="17" fill="#987b65">気づいたことを、持ち帰る。</text></g><path d="M789 104l-94 490" stroke="#67695e" stroke-width="16"/><path d="M696 594l-2 28 12-25" fill="#d6b58c"/>`,
  ),
);
writeFileSync(
  "public/images/summer-review.svg",
  svg(
    "#dad6cc",
    `<rect x="80" y="110" width="840" height="510" fill="#c4bdae"/><g transform="translate(150 160) rotate(-5)"><rect width="410" height="275" rx="5" fill="#606a64"/><rect x="17" y="17" width="376" height="239" fill="#ecefe6"/><path d="M40 55h320M40 85h180M40 115h260M40 145h220M40 175h280" stroke="#abb8a0" stroke-width="8"/><path d="M-25 275h460l35 42H-60z" fill="#909991"/></g><g transform="translate(610 310) rotate(9)"><rect width="240" height="260" fill="#f7efdb"/><text x="24" y="55" font-size="22" fill="#766c54">つくったものを</text><text x="24" y="89" font-size="22" fill="#766c54">持ち寄ろう。</text><path d="M25 130h187M25 160h145M25 190h172" stroke="#c3b89c" stroke-width="3"/></g><circle cx="744" cy="205" r="53" fill="#f2eee3"/><circle cx="744" cy="205" r="39" fill="#7b6953"/>`,
  ),
);
writeFileSync(
  "public/images/git-notes.svg",
  svg(
    "#e0e3d9",
    `<text x="80" y="110" font-size="28" fill="#52634b">はじめての共同開発</text><text x="80" y="153" font-size="15" fill="#7b8975">小さなブランチから、はじめよう。</text><path d="M160 270h640M290 270q70 0 70 100v110h280q70 0 70-100V270" fill="none" stroke="#849775" stroke-width="9"/>${[
      [160, 270],
      [290, 270],
      [470, 270],
      [650, 270],
      [800, 270],
      [430, 480],
      [590, 480],
    ]
      .map(
        ([x, y], i) =>
          `<circle cx="${x}" cy="${y}" r="20" fill="${i > 4 ? "#b36746" : "#f6f7ef"}" stroke="${i > 4 ? "#b36746" : "#7d9270"}" stroke-width="6"/>`,
      )
      .join(
        "",
      )}<text x="145" y="332" font-size="17" fill="#647b55">main</text><text x="399" y="550" font-size="17" fill="#a3654d">feature / はじめての機能</text>`,
  ),
);
const demo = (title, body, script) =>
  `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | DataDreamers サンプル</title><style>body{font-family:Meiryo,sans-serif;background:#f8f7ef;color:#3c4336;padding:25px;margin:0}h1{font-size:21px}p{font-size:12px;color:#747b6d;line-height:1.9}button,select{font:inherit;padding:11px 18px;background:#637653;color:white;border:0;cursor:pointer;margin:5px}button:focus-visible{outline:3px solid #b75e36}button:disabled{opacity:.5}.note{font-size:10px;border-top:1px solid #daddcc;padding-top:15px;margin-top:30px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.room{border:1px solid #cad3bc;padding:18px;background:#e5ebdc;font-size:13px}.room span{display:block;font-size:11px;margin-top:12px;color:#647651}</style><h1>${title}</h1>${body}<p class="note">DataDreamers / 動作確認用サンプル。実際の施設情報や投票結果ではありません。</p><script>${script}</script></html>`;
writeFileSync(
  "public/demos/campus.html",
  demo(
    "いま、どこで作業する？",
    '<p>施設の種類で絞り込めます。</p><label>表示する施設 <select id="filter"><option value="all">すべて</option><option value="study">自習スペース</option><option value="room">教室</option></select></label><div class="grid"><div class="room" data-kind="study">図書室<span>○ 空いています</span></div><div class="room" data-kind="study">自習室 A<span>△ やや混雑</span></div><div class="room" data-kind="study">ラウンジ<span>○ 空いています</span></div><div class="room" data-kind="room">第2教室<span>― 情報なし</span></div></div>',
    'document.querySelector("#filter").onchange=e=>document.querySelectorAll(".room").forEach(r=>r.hidden=e.target.value!=="all"&&r.dataset.kind!==e.target.value);',
  ),
);
writeFileSync(
  "public/demos/timer.html",
  demo(
    "ひと区切り。",
    '<p>25分だけ、目の前のことに集中しよう。</p><div id="time" role="timer" style="font-size:70px;text-align:center;padding:25px;font-variant-numeric:tabular-nums">25:00</div><div style="text-align:center"><button id="start">はじめる</button><button id="reset">リセット</button></div>',
    'let left=1500,timer=null;const s=document.querySelector("#start"),t=document.querySelector("#time");function paint(){t.textContent=Math.floor(left/60).toString().padStart(2,"0")+":"+(left%60).toString().padStart(2,"0")}s.onclick=()=>{if(timer){clearInterval(timer);timer=null;s.textContent="再開する"}else{s.textContent="一時停止";timer=setInterval(()=>{left--;paint();if(left<=0){clearInterval(timer);timer=null;s.textContent="完了";s.disabled=true}},1000)}};document.querySelector("#reset").onclick=()=>{clearInterval(timer);timer=null;left=1500;paint();s.disabled=false;s.textContent="はじめる"};',
  ),
);
writeFileSync(
  "public/demos/vote.html",
  demo(
    "次の勉強会、何をやってみたい？",
    '<p>気になるテーマをひとつ選んでください。</p><form id="vote">' +
      ["Webサイトをつくる", "ゲームをつくる", "データを見てみる"]
        .map(
          (t, i) =>
            `<p><label><input type="radio" name="theme" value="${t}" required> ${t}</label></p>`,
        )
        .join("") +
      '<button>このテーマに投票 →</button></form><p id="result" role="status"></p>',
    'document.querySelector("#vote").onsubmit=e=>{e.preventDefault();document.querySelector("#result").textContent="「"+new FormData(e.target).get("theme")+"」を選びました。このサンプルでは回答は送信されません。"};',
  ),
);
