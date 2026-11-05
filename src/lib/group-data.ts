export type GroupProfile = {
  id: string;
  name: string;
  slug: string;
  catchphrase: string;
  image: string;
  overview: string;
  activities: string;
  membersByGrade: number[];
};

export const LEGACY_GROUP_NAMES: Record<string, string> = {
  "AI Platform Group": "AI基盤",
  "AI Product Group": "AIプロダクト",
  "Administration Group": "行政班",
  "Finance Group": "金融班",
  "Sports Group": "スポーツ班",
  "Competition Participation Group": "コンペ班",
};
export const canonicalGroupName = (name: string) => LEGACY_GROUP_NAMES[name] || name;
export const groupNameAliases = (name: string) => [name, ...Object.entries(LEGACY_GROUP_NAMES).filter(([, canonical]) => canonical === name).map(([legacy]) => legacy)];

// Seeded from the project briefing slides. These remain visible until the matching
// CMS records are created; all descriptive fields can then be maintained in Studio.
export const GROUP_SEEDS: GroupProfile[] = [
  { id: "", name: "AI基盤", slug: "ai-platform", catchphrase: "生成AI × 画像処理 × 自動運転", image: "/images/official/azure-openai-hackathon.jpg", overview: "AIを支える基盤技術を学び、生成AI・画像処理などの応用に取り組みます。", activities: "数学分野に特化した大規模言語モデルや、ESGレポートを対象にした検索・質問応答システムを試作しています。", membersByGrade: [0, 0, 0, 0] },
  { id: "", name: "AIプロダクト", slug: "ai-product", catchphrase: "学習支援 × AIエージェント × Web開発", image: "/images/official/manabi-dx.png", overview: "AIを使ったサービスやアプリを企画し、使う人に届く形にします。", activities: "学習支援やAIエージェントをテーマに、LLMを活用したWebアプリを開発しています。", membersByGrade: [0, 0, 0, 0] },
  { id: "", name: "行政班", slug: "administration", catchphrase: "社会課題 × データ活用 × 大規模データ", image: "/images/official/students-working-on-project.jpg", overview: "行政や地域が抱える課題をデータと技術で解決する方法を考えます。", activities: "地域の公共施設を題材にしたクイズアプリを制作し、コンテストで評価されました。", membersByGrade: [0, 0, 0, 0] },
  { id: "", name: "金融班", slug: "finance", catchphrase: "企業分析 × 予測モデル × 株・仮想通貨", image: "/images/official/skill.png", overview: "株式や暗号資産の価格データを分析し、予測モデルや自動取引の可能性を探ります。", activities: "価格履歴を使った予測モデルの作成や、シミュレーションを進めています。", membersByGrade: [0, 0, 0, 0] },
  { id: "", name: "スポーツ班", slug: "sports", catchphrase: "競技データ × 実践収集 × 身体動作分析", image: "/images/official/challenge-lab-02.webp", overview: "スポーツの現場でデータを集め、競技や身体の動きを分析します。", activities: "フットサル中の活動量、心拍数、角速度、映像などをスマートフォンやスマートウォッチで記録しています。", membersByGrade: [0, 0, 0, 0] },
  { id: "", name: "コンペ班", slug: "competition", catchphrase: "外部コンペ × スキルアップ × オールジャンル", image: "/images/official/competition.png", overview: "外部コンペティションへの参加を通じて、幅広いデータサイエンスの実践力を磨きます。", activities: "コンペに参加し、分析や実装の成果を持ち寄って振り返ります。", membersByGrade: [0, 0, 0, 0] },
];

export function slugifyGroup(name: string) {
  const known = GROUP_SEEDS.find((group) => group.name === name);
  return known?.slug || name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "group";
}
