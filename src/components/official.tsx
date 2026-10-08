"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import news from "@/lib/official-news.json";
export function OfficialHero({ title, image, subtitle }: { title:string; image:string; subtitle:string }) {
 return <div className="official-hero"><img src={"/images/official/"+image} alt="Data Dreamersの活動風景"/><div><p>{subtitle}</p><h1>{title}</h1></div></div>;
}
export function OfficialIntro() {
 return <><OfficialHero title="Data Dreamers" subtitle="AI・データサイエンスプロジェクト" image="challenge-lab-01.webp"/><div className="official-intro"><h2>Data Science &amp; Analytics Community</h2><p>データ分析を学ぶ仲間と、社会課題の解決へ。金沢工業大学 夢考房の学生プロジェクトです。</p><div className="actions"><Link className="button primary" href="/about">活動について</Link><Link className="button" href="/for-new-dreamers">新入生の方へ</Link><Link className="button" href="/news">お知らせ</Link><Link className="button" href="/contact">お問い合わせ</Link></div></div></>;
}
export default function OfficialPage({page}:{page:string}) {
 const root=useRef<HTMLElement>(null);
 const [activeSection, setActiveSection] = useState('');
 useEffect(() => {
  const sections = Array.from(root.current?.querySelectorAll<HTMLElement>('.official-section[id]') || []);
  if (!sections.length) return;
  let frame = 0;
  const update = () => {
   frame = 0;
   // Keep the current section selected until the next heading reaches the reading line.
   const readingLine = Math.min(160, window.innerHeight * 0.2);
   let current = sections[0];
   for (const section of sections) {
    if (section.getBoundingClientRect().top <= readingLine) current = section;
   }
   if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1];
   setActiveSection(current.id);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const resize = new ResizeObserver(schedule);
  if (root.current) resize.observe(root.current);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  schedule();
  return () => {
   cancelAnimationFrame(frame);
   resize.disconnect();
   window.removeEventListener('scroll', schedule);
   window.removeEventListener('resize', schedule);
  };
 }, [page]);
 useEffect(()=>{const el=root.current;if(!el || matchMedia('(prefers-reduced-motion: reduce)').matches)return;const observer=new IntersectionObserver(items=>items.forEach(item=>{if(item.isIntersecting){item.target.classList.add('revealed');observer.unobserve(item.target);}}),{threshold:.12});el.querySelectorAll('.official-section').forEach(item=>{item.classList.add('reveal-ready');observer.observe(item);});return()=>observer.disconnect();},[page]);
 const about=page==='about', students=page==='for-new-dreamers', updates=page==='news';
 const contents = about ? [['data-dreamers','Data Dreamersとは'],['mission','私たちの使命'],['activities','活動内容'],['daily-activities','日々の活動']] : students ? [['skills','身につくスキル'],['schedule','説明会スケジュール'],['getting-started','参加から活動まで']] : [];
 return <article className="official-page" ref={root} key={page}>
 <OfficialHero title={about?'Data Dreamersについて':students?'新入生の方へ':updates?'お知らせ':'お問い合わせ'} subtitle={about?'ABOUT':students?'FOR NEW DREAMERS':updates?'NEWS':'CONTACT'} image={about?'challenge-lab-02.webp':students?'students-working-on-project.jpg':updates?'writing-stationery.jpg':'taking-notes-and-working-on-laptop.jpg'}/>
 <div className={contents.length ? 'official-layout' : undefined}>
 {contents.length > 0 && <aside className="official-sidebar"><nav aria-label="ページ内目次"><p className="official-sidebar-title">{about ? '活動について' : '新入生の方へ'}</p><ul>{contents.map(([id,label]) => <li key={id}><a href={'#'+id} aria-current={activeSection === id ? 'location' : undefined}><span aria-hidden="true">↓</span>{label}</a></li>)}</ul><Link className="official-sidebar-contact" href="/contact">見学・参加のご相談 <span aria-hidden="true">↗</span></Link></nav></aside>}
 <div className="official-content">
 {about && <>
 <section className="official-section" id="data-dreamers"><h2>Data Dreamersとは</h2><p>正式名称は「金沢工業大学 夢考房 AI・データサイエンスプロジェクト Data Dreamers」。2023年5月に発足した、夢考房所属の課外活動団体です。AIとデータ分析を学び、社会の課題に取り組む人材を育てています。</p></section>
 <section className="official-section" id="mission"><h2>私たちの使命</h2><p>技術を学ぶ機会をつくること、そして公開・非公開の実データを使って課題解決に取り組むこと。この2つを軸に活動しています。</p></section>
 <section className="official-section" id="activities"><h2>活動内容</h2><p>勉強会や実習を通じて分析力を磨き、コンペや外部プログラムで実践します。</p>{[
 ['competition.png','コンペティション','チームでSIGNATEやKaggleなどのデータ分析競技に挑戦します。'],
 ['manabi-dx.png','育成プログラム','経済産業省のマナビDXクエスト、東京大学松尾研のGCIにプロジェクトで参加しています。'],
 ['azure-openai-hackathon.jpg','ハッカソン・外部イベント','普段のグループを越えてメンバーが集まり、外部イベントにも参加します。']
 ].map(([img,title,text])=><div className="official-activity" key={img}><img loading="lazy" src={'/images/official/'+img} alt={title}/><div><h3>{title}</h3><p>{text}</p></div></div>)}</section>
 <section className="official-section" id="daily-activities"><h2>日々の活動</h2><dl><dt>対面のコアタイム</dt><dd>毎週月曜日・木曜日 17:00〜19:00。チームによっては時間外にも活動します。</dd><dt>場所・見学</dt><dd>学内の教室を使用し、場所はDiscordで連絡します。見学・参加は事前の連絡が必要です。</dd></dl><Link className="button" href="/contact">見学について問い合わせる ↗</Link></section></>}
 {students && <>
 <section className="official-section" id="skills"><h2>身につくスキル</h2><p>Pythonとデータ分析の基礎から学び、実際の分析を通して技術を身につけます。コンペやハッカソンでの経験は、キャリアづくりにもつながります。</p><img className="skill-image" loading="lazy" src="/images/official/skill.png" alt="データサイエンティストに求められるスキル"/><dl><dt>データ分析</dt><dd>Python / Pandas / NumPy / Matplotlib / Polars</dd><dt>機械学習</dt><dd>scikit-learn / PyTorch / TensorFlow</dd><dt>BI・環境構築</dt><dd>Tableau / Docker</dd></dl></section>
 <section className="official-section" id="schedule"><h2>説明会スケジュール</h2><p className="source-note"></p><ul><li>4月9日 17:00〜19:00 — 独自説明会／23号館218室</li><li>4月24日 17:15〜18:45 — 情報工学系プロジェクト説明会／23号館1階コラボレーションスタジオ</li><li>4月27日 17:00〜19:00 — 仮加入説明会／23号館330室</li></ul></section>
 <section className="official-section" id="getting-started"><h2>参加から活動まで</h2><ol><li><a href="https://forms.gle/1FjWcv7Zh9aH5AYH7" target="_blank" rel="noopener noreferrer">参加仮登録フォーム ↗</a></li><li>オリエンテーションで活動とスケジュールを確認</li><li>新入生教育でPython・分析の基礎を学習</li><li>希望に応じたグループで実データの分析へ</li></ol><p>授業などと重なる場合は個別対応について事前にご相談ください。</p></section></>}
 {updates && <section className="official-section"><h2>メディア掲載情報</h2>{news.map(n=><a className="official-news" href={n.url} key={n.url} target="_blank" rel="noopener noreferrer">{n.text} ↗</a>)}<Link className="button" href="/articles">メンバーの活動記事も読む →</Link></section>}
 {!about&&!students&&!updates&&<section className="official-section"><h2>参加・見学・活動へのご質問</h2><p>公式サイトで案内されているフォームからお問い合わせください。</p><a className="button primary" href="https://forms.gle/mkyGNmE4JDkCaBQs8" target="_blank" rel="noopener noreferrer">お問い合わせフォーム ↗</a></section>}
 <p className="source-note">掲載情報・画像：<a href={'https://data-dreamers.vercel.app/'+page}>Data Dreamers公式サイト</a>（2026年10月1日確認）</p>
 </div></div>
 </article>;
}
