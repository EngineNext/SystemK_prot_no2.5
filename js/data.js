// --- Data Definitions ---

const conversionTables = {
    englishR:  { max: 100, points: [[100, 68.0], [80, 58.7], [60, 49.4], [40, 40.1], [20, 30.8], [0, 20.0]] },
    englishL:  { max: 100, points: [[100, 77.5], [80, 65.0], [60, 52.4], [40, 39.8], [20, 27.2], [0, 20.0]] },
    math1A:    { max: 100, points: [[100, 78.6], [80, 68.7], [60, 58.7], [40, 48.0], [20, 38.0], [0, 28.0]] },
    math2BC:   { max: 100, points: [[100, 68.5], [80, 59.4], [60, 50.3], [40, 41.1], [20, 32.0], [0, 22.0]] },
    japanese:  { max: 200, points: [[200, 79.9], [150, 63.2], [100, 46.6], [80, 39.9], [50, 29.9], [0, 20.0]] },
    jp_modern: { max: 110, points: [[110, 74.6], [90, 62.7], [70, 50.8], [50, 38.9], [30, 27.0], [10, 15.1]] },
    jp_ancient:{ max: 45, points: [[45, 72.0], [35, 62.3], [25, 52.6], [15, 42.9], [5, 30.0]] },
    jp_kanbun: { max: 45, points: [[45, 71.0], [35, 62.8], [25, 54.7], [15, 46.6], [5, 38.0]] },
    science:   { max: 100, points: [[100, 72.0], [80, 64.0], [60, 56.0], [40, 48.0], [20, 40.0], [0, 30.0]] },
    social:    { max: 100, points: [[100, 73.8], [80, 62.9], [60, 52.1], [40, 41.2], [20, 30.0], [0, 20.0]] },
    info:      { max: 100, points: [[100, 81.2], [80, 67.2], [60, 53.2], [40, 39.2], [20, 25.2], [0, 15.0]] }
};

const subjectMaster = {
    englishR: { name: '英語(R)', max: 100, table: 'englishR' },
    englishL: { name: '英語(L)', max: 100, table: 'englishL' },
    math1A:   { name: '数学I・A', max: 100, table: 'math1A' },
    math2BC:  { name: '数学II・B・C', max: 100, table: 'math2BC' },
    jp_modern: { name: '現代文', max: 110, table: 'jp_modern', isSub: true },
    jp_ancient:{ name: '古文', max: 45, table: 'jp_ancient', isSub: true },
    jp_kanbun: { name: '漢文', max: 45, table: 'jp_kanbun', isSub: true },
    info:     { name: '情報', max: 100, table: 'info' },
    science1: { name: '理科①', max: 100, table: 'science' },
    science2: { name: '理科②', max: 100, table: 'science' },
    social:   { name: '地歴公民', max: 100, table: 'social' },
    social1:  { name: '地歴公民①', max: 100, table: 'social' },
    social2:  { name: '地歴公民②', max: 100, table: 'social' },
    scienceBasic: { name: '理科基礎', max: 100, table: 'science' }
};

// この配列を将来Pythonで自動生成して書き換える
const universities = [
    { 
        name: "北海道大学", faculty: "総合理系", field: ["science", "medical", "info_sci"], 
        exams: [
            { 
                type: "前期", 
                borderScoreRate: 0.76, 
                desc: "標準的な5教科7科目。理系科目の配点がやや重い傾斜あり。",
                weights: { englishR:1, englishL:1, math1A:1.2, math2BC:1.2, science1:1.2, science2:1.2, social:1, info:1, jp_modern:1, jp_ancient:1, jp_kanbun:1 }
            },
            { 
                type: "後期", 
                borderScoreRate: 0.82, 
                desc: "理科重視。理科強者に圧倒的有利な配点。",
                weights: { englishR:1, englishL:1, math1A:1, math2BC:1, science1:2.0, science2:2.0, social:1, info:0, jp_modern:0.5, jp_ancient:0.5, jp_kanbun:0.5 }
            }
        ]
    },
    { 
        name: "小樽商科大学", faculty: "商学部", field: ["social", "info_arts"], 
        exams: [
            { 
                type: "前期", 
                borderScoreRate: 0.65, 
                desc: "<span class='font-bold text-indigo-600'>英語重視</span>。英語が2倍計算されるため逆転が起きやすい。",
                weights: { englishR:2.0, englishL:2.0, math1A:1, math2BC:1, social1:1, social2:1, scienceBasic:1, info:1, jp_modern:1, jp_ancient:1, jp_kanbun:1 }
            },
            { 
                type: "後期", 
                borderScoreRate: 0.70, 
                desc: "激戦区。全科目の高得点が求められる。",
                weights: { englishR:1.5, englishL:1.5, math1A:1, math2BC:1, social1:1, social2:1, scienceBasic:1, info:1, jp_modern:1, jp_ancient:1, jp_kanbun:1 }
            }
        ]
    },
    { 
        name: "室蘭工業大学", faculty: "理工学部", field: ["science", "info_sci"], 
        exams: [
            { 
                type: "前期", 
                borderScoreRate: 0.58, 
                desc: "数学・理科重視。英語が苦手でも理数でカバー可能。",
                weights: { englishR:0.8, englishL:0.8, math1A:1.5, math2BC:1.5, science1:1.5, science2:1.5, social:0.5, info:1, jp_modern:0.5, jp_ancient:0.5, jp_kanbun:0.5 }
            },
              { 
                type: "後期", 
                borderScoreRate: 0.62, 
                desc: "前期不合格組が流れてくるためボーダーは高め。",
                weights: { englishR:1, englishL:1, math1A:1.5, math2BC:1.5, science1:1.5, science2:1.5, social:0.5, info:1, jp_modern:0.5, jp_ancient:0.5, jp_kanbun:0.5 }
            }
        ]
    },
    { 
        name: "北海学園大学", faculty: "工学部", field: ["science", "info_sci"], 
        exams: [
            { 
                type: "共テ利用I期", 
                borderScoreRate: 0.60, 
                desc: "3教科3科目（英・数・理）。<span class='font-bold text-emerald-600'>ここを「港」として確保</span>推奨。",
                weights: { englishR:1, englishL:1, math1A:1, math2BC:1, science1:1, science2:1 } 
            },
            { 
                type: "一般入試", 
                borderScoreRate: 0.55, 
                desc: "2月入試。共テが悪くてもここでリベンジ可能。",
                weights: { englishR:1, englishL:1, math1A:1, math2BC:1, science1:1, science2:1 } 
            }
        ]
    },
    { 
        name: "明治大学", faculty: "理工学部", field: ["science", "info_sci"], 
        exams: [
            { 
                type: "共テ利用(4教科)", 
                borderScoreRate: 0.78, 
                desc: "理科1科目でOK。高得点勝負。",
                weights: { englishR:1, englishL:1, math1A:1, math2BC:1, science1:1 } 
            },
            { 
                type: "共テ利用(3教科)", 
                borderScoreRate: 0.82, 
                desc: "科目負担が軽いがボーダーは跳ね上がる。",
                weights: { englishR:1, englishL:1, math1A:1, math2BC:1, science1:1 } 
            }
        ]
    },
     { 
        name: "北海学園大学", faculty: "経済学部", field: ["social", "info_arts"], 
        exams: [
            { type: "共テ利用I期", borderScoreRate: 0.62, desc: "3科目型（英・国・地歴公民）。", weights: {englishR:1, englishL:1, jp_modern:1, jp_ancient:1, jp_kanbun:1, social1:1} },
            { type: "共テ利用II期", borderScoreRate: 0.65, desc: "募集人数が少ないため難化する。", weights: {englishR:1, englishL:1, jp_modern:1, jp_ancient:1, jp_kanbun:1, social1:1} }
        ]
    },
    { 
        name: "東北大学", faculty: "工学部", field: ["science", "info_sci"], 
        exams: [
            { type: "前期", borderScoreRate: 0.79, desc: "数学・理科の比重が大きい。", weights: {englishR:1, englishL:1, math1A:1.5, math2BC:1.5, science1:1.5, science2:1.5, social:1, info:1, jp_modern:1, jp_ancient:1, jp_kanbun:1} }
        ]
    },
    { 
        name: "東京理科大学", faculty: "工学部", field: ["science", "info_sci"], 
        exams: [
            { type: "A方式", borderScoreRate: 0.75, desc: "科目選択の自由度が高い。", weights: {englishR:1, englishL:1, math1A:1, math2BC:1, science1:1} },
            { type: "C方式", borderScoreRate: 0.72, desc: "共テ＋独自試験。独自の配点比率が高い。", weights: {englishR:1, englishL:1, math1A:1, math2BC:1, science1:1} }
        ]
    }
];
