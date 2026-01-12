// --- Logic & UI Functions ---

let currentSubjectKeys = [];
let simulationOffsets = {}; 

function init() {
    loadData();
    updateFormUI(false); 
}

function updateFormUI(clearValues = true) {
    const field = document.getElementById('fieldSelect').value;
    const container = document.getElementById('scoreInputs');
    const badge = document.getElementById('subjectCountBadge');
    
    let tempValues = {};
    if (!clearValues) {
        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => {
            tempValues[input.id] = input.value;
        });
    }

    container.innerHTML = '';
    
    const japaneseSet = ['jp_modern', 'jp_ancient', 'jp_kanbun'];
    let subjects = [];

    if (['humanities', 'social', 'info_arts'].includes(field)) {
        subjects = ['englishR', 'englishL', 'math1A', 'math2BC', ...japaneseSet, 'social1', 'social2', 'scienceBasic', 'info'];
        badge.innerText = "文系型: 入力項目多数";
        badge.className = "text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded";
    } else {
        subjects = ['englishR', 'englishL', 'math1A', 'math2BC', ...japaneseSet, 'science1', 'science2', 'social', 'info'];
        badge.innerText = "理系型: 標準";
        badge.className = "text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded";
    }

    currentSubjectKeys = subjects;

    // Offsets初期化
    currentSubjectKeys.forEach(key => {
        if (simulationOffsets[key] === undefined) simulationOffsets[key] = 0;
    });

    subjects.forEach((key, index) => {
        const sub = subjectMaster[key];
        const div = document.createElement('div');
        const isSub = sub.isSub ? "sub-input-group" : "";
        const indent = sub.isSub ? "pl-4" : "";
        const labelStyle = sub.isSub ? "text-xs text-slate-600" : "text-sm font-medium text-slate-700";

        div.className = `input-group flex items-center justify-between p-2 rounded-lg border-b border-transparent hover:border-slate-100 ${isSub}`;
        div.style.animationDelay = `${index * 0.02}s`;
        div.innerHTML = `
            <label class="${labelStyle} w-1/2 ${indent}">${sub.name}</label>
            <div class="flex items-center w-1/2 space-x-2">
                <input type="number" id="score_${key}" max="${sub.max}" min="0" placeholder="-" 
                    class="score-input w-full bg-white border border-slate-300 rounded px-3 py-2 text-right font-mono text-slate-700"
                    onchange="validateScore(this, ${sub.max}); saveData();">
                <span class="text-xs text-slate-400 w-8">/${sub.max}</span>
            </div>
        `;
        container.appendChild(div);

        if (tempValues[`score_${key}`]) {
            document.getElementById(`score_${key}`).value = tempValues[`score_${key}`];
        } else if (!clearValues) {
            const saved = localStorage.getItem(`score_${key}`);
            if (saved) document.getElementById(`score_${key}`).value = saved;
        }
    });

    renderSimulatorPanel();
}

function validateScore(input, max) {
    let val = parseInt(input.value);
    if (val < 0) input.value = 0;
    if (val > max) input.value = max;
}

function calculateWeightedScore(userScores, examWeights) {
    let totalWeightedScore = 0;
    let maxWeightedScore = 0;

    Object.keys(examWeights).forEach(subject => {
        const weight = examWeights[subject];
        const userScore = userScores[subject] || 0;
        const maxScore = subjectMaster[subject].max;

        totalWeightedScore += userScore * weight;
        maxWeightedScore += maxScore * weight;
    });

    return {
        score: totalWeightedScore,
        max: maxWeightedScore,
        rate: maxWeightedScore > 0 ? totalWeightedScore / maxWeightedScore : 0
    };
}

function getScoresFromUI(applySim = false) {
    let scores = {};
    currentSubjectKeys.forEach(key => {
        const el = document.getElementById(`score_${key}`);
        let val = el.value === "" ? 0 : parseInt(el.value);
        const max = subjectMaster[key].max;
        
        if (applySim && simulationOffsets[key]) {
            val += simulationOffsets[key];
        }
        
        val = Math.min(val, max);
        scores[key] = val;
    });
    return scores;
}

function renderSimulatorPanel() {
    const container = document.getElementById('simulatorGrid');
    container.innerHTML = '';
    
    const baseScores = getScoresFromUI(false);

    currentSubjectKeys.forEach(key => {
        const sub = subjectMaster[key];
        const currentVal = baseScores[key] || 0;
        const boost = simulationOffsets[key] || 0;
        const total = Math.min(sub.max, currentVal + boost);
        const isMax = total >= sub.max;
        const displayClass = isMax ? 'text-rose-600 font-bold' : 'text-purple-600 font-bold';
        const maxLabel = isMax ? '<span class="text-[10px] bg-rose-100 text-rose-600 px-1 rounded ml-1">MAX</span>' : '';

        const div = document.createElement('div');
        div.innerHTML = `
            <div class="flex justify-between text-sm mb-1">
                <span class="font-bold text-slate-700 text-xs">${sub.name}</span>
                <span class="${displayClass}" id="simVal_${key}">+${boost} <span class="text-slate-400 text-xs font-normal">(計${total})${maxLabel}</span></span>
            </div>
            <input type="range" id="simRange_${key}" min="0" max="50" value="${boost}" step="1" 
                class="w-full"
                oninput="updateSimVal('${key}', this.value); runAnalysis(true);">
        `;
        container.appendChild(div);
    });
}

function generateRivalScores(exam) {
    let rivalScores = {};
    let rivalDevs = {};
    
    const baseRate = exam.borderScoreRate;

    currentSubjectKeys.forEach(key => {
        const sub = subjectMaster[key];
        let weight = 1.0;
        
        if (exam.weights && exam.weights[key] !== undefined) {
            if (exam.weights[key] > 1.0) weight = 1.1; 
            if (exam.weights[key] < 1.0) weight = 0.9; 
        } else if (exam.weights && !Object.keys(exam.weights).includes(key)) {
            weight = 0.8;
        }

        let score = sub.max * baseRate * weight;
        score = Math.min(score, sub.max); 
        score = Math.floor(score); 

        rivalScores[key] = score;
        rivalDevs[sub.name] = calculateDeviation(sub.table, score);
    });

    return { scores: rivalScores, devs: rivalDevs };
}

function runAnalysis(isSim = false) {
    const resultSection = document.getElementById('resultSection');
    resultSection.style.opacity = "1";
    resultSection.style.pointerEvents = "auto";
    if(!isSim) {
        document.getElementById('simulatorPanel').classList.remove('hidden');
        renderSimulatorPanel(); 
    }

    const scores = getScoresFromUI(isSim);

    let totalDevSum = 0;
    let count = 0;
    let subjectDevs = {};
    let jpScoreSum = 0;
    let totalRawScore = 0;

    Object.keys(scores).forEach(key => {
        totalRawScore += scores[key];
        if (['jp_modern', 'jp_ancient', 'jp_kanbun'].includes(key)) {
            jpScoreSum += scores[key];
            subjectDevs[subjectMaster[key].name] = calculateDeviation(subjectMaster[key].table, scores[key]);
        } else {
            const dev = calculateDeviation(subjectMaster[key].table, scores[key]);
            subjectDevs[subjectMaster[key].name] = dev;
            totalDevSum += dev;
            count++;
        }
    });
    
    if (scores['jp_modern'] !== undefined) {
        totalDevSum += calculateDeviation('japanese', jpScoreSum);
        count++;
    }

    const avgDev = count > 0 ? totalDevSum / count : 0;

    document.getElementById('totalScore').innerText = `素点: ${totalRawScore}`;
    document.getElementById('totalDev').innerText = avgDev.toFixed(1);

    const sortedDevs = Object.entries(subjectDevs).sort((a,b) => b[1] - a[1]);
    document.getElementById('dominantSubject').innerText = sortedDevs[0][0];
    document.getElementById('weakSubject').innerText = sortedDevs[sortedDevs.length-1][0];

    const bestUniData = renderRecommendations(scores, avgDev);
    
    if(bestUniData) {
        const rivalData = generateRivalScores(bestUniData.exam);
        document.getElementById('targetUniName').innerText = bestUniData.uni.name + " (" + bestUniData.exam.type + ")";
        renderRadarChart(subjectDevs, rivalData.devs);
        renderRivalComparison(scores, rivalData.scores);
    } else {
        renderRadarChart(subjectDevs, null);
    }

    if (!isSim) renderStrategy(avgDev, sortedDevs);
}

function calculateDeviation(tableKey, score) {
    const table = conversionTables[tableKey];
    if (!table) return 50.0;
    if (score >= table.points[0][0]) return table.points[0][1];
    if (score <= table.points[table.points.length-1][0]) return table.points[table.points.length-1][1];
    for (let i = 0; i < table.points.length - 1; i++) {
        const high = table.points[i];
        const low = table.points[i+1];
        if (score <= high[0] && score >= low[0]) {
            const ratio = (score - low[0]) / (high[0] - low[0]);
            return low[1] + ratio * (high[1] - low[1]);
        }
    }
    return 50.0;
}

function renderRecommendations(userScores, userAvgDev) {
    const field = document.getElementById('fieldSelect').value;
    const targetName = document.getElementById('targetUni').value;
    const recContainer = document.getElementById('uniRecommendations');
    const haganContainer = document.getElementById('haganPort');
    
    recContainer.innerHTML = "";
    haganContainer.innerHTML = "";

    let relevantUnis = universities.filter(u => u.field.includes(field));
    let targetUniObj = null;

    if(targetName) {
        const customMatches = universities.filter(u => u.name.includes(targetName));
        customMatches.forEach(cm => {
            if (!relevantUnis.includes(cm)) relevantUnis.unshift(cm);
            if (!targetUniObj) targetUniObj = cm; 
        });
    }

    let hasSafety = false;
    let topRecommendation = null;

    relevantUnis.forEach(uni => {
        const examResults = uni.exams.map(exam => {
            const result = calculateWeightedScore(userScores, exam.weights);
            const diffRate = result.rate - exam.borderScoreRate;
            
            let judgment, colorClass, sortOrder;
            if (diffRate >= 0.05) { judgment = "A"; colorClass = "text-emerald-600 bg-emerald-50"; sortOrder = 5; }
            else if (diffRate >= 0.02) { judgment = "B"; colorClass = "text-indigo-600 bg-indigo-50"; sortOrder = 4; }
            else if (diffRate >= -0.02) { judgment = "C"; colorClass = "text-amber-600 bg-amber-50"; sortOrder = 3; }
            else if (diffRate >= -0.08) { judgment = "D"; colorClass = "text-orange-600 bg-orange-50"; sortOrder = 2; }
            else { judgment = "E"; colorClass = "text-rose-600 bg-rose-50"; sortOrder = 1; }
            
            return { exam, result, judgment, colorClass, sortOrder };
        });

        examResults.sort((a,b) => b.sortOrder - a.sortOrder);
        const bestResult = examResults[0];

        if (!topRecommendation || bestResult.sortOrder > topRecommendation.sortOrder) {
            if (!targetUniObj) { 
                topRecommendation = { uni: uni, exam: bestResult.exam };
            }
        }

        recContainer.innerHTML += createUniCardWithList(uni, examResults);

        if (bestResult.sortOrder >= 5) { 
            haganContainer.innerHTML += createHaganCard(uni, bestResult);
            hasSafety = true;
        }
    });

    if (!hasSafety) {
        haganContainer.innerHTML = `<div class="text-sm text-rose-500 bg-rose-50 p-3 rounded border border-rose-100">
            <i class="fa-solid fa-triangle-exclamation mr-1"></i>
            安全圏の大学が見つかりません。独自日程の私大併願を検討してください。
        </div>`;
    }

    if (targetUniObj) {
        return { uni: targetUniObj, exam: targetUniObj.exams[0] };
    } else {
        return topRecommendation;
    }
}

function renderRivalComparison(userScores, rivalScores) {
    const container = document.getElementById('rivalComparisonList');
    container.innerHTML = "";

    currentSubjectKeys.forEach(key => {
        const sub = subjectMaster[key];
        const myScore = userScores[key] || 0;
        const rivScore = rivalScores[key] || 0;
        const diff = myScore - rivScore;
        
        let diffHtml = "";
        if (diff > 0) {
            diffHtml = `<span class="text-emerald-600 font-bold">+${diff}点</span> <span class="text-xs text-slate-400">リード</span>`;
        } else if (diff < 0) {
            diffHtml = `<span class="text-rose-500 font-bold">${diff}点</span> <span class="text-xs text-slate-400">ビハインド</span>`;
        } else {
            diffHtml = `<span class="text-slate-400">±0点</span>`;
        }

        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-2 border-b border-slate-50 last:border-0 hover:bg-slate-50";
        div.innerHTML = `
            <div class="text-xs font-medium text-slate-700 w-1/3">${sub.name}</div>
            <div class="text-xs text-center w-1/3">
                <span class="font-mono">${myScore}</span> <span class="text-slate-300">/</span> <span class="font-mono text-slate-500">${rivScore}</span>
            </div>
            <div class="text-xs text-right w-1/3">${diffHtml}</div>
        `;
        container.appendChild(div);
    });
}

function createUniCardWithList(uni, results) {
    let listRows = results.map(r => {
        const rate = (r.result.rate * 100).toFixed(1);
        const border = (r.exam.borderScoreRate * 100).toFixed(1);
        const isBest = r === results[0]; 
        const rowStyle = isBest ? "bg-slate-50 font-medium" : "";
        const checkMark = isBest ? `<i class="fa-solid fa-check text-indigo-500 ml-1"></i>` : "";

        return `
        <div class="exam-row grid grid-cols-12 gap-2 py-2 border-b border-slate-100 text-sm items-center ${rowStyle}">
            <div class="col-span-4 flex items-center">
                <span class="text-slate-700">${r.exam.type}</span>
                ${checkMark}
            </div>
            <div class="col-span-2 text-center">
                <span class="font-bold px-2 py-0.5 rounded ${r.colorClass}">${r.judgment}判定</span>
            </div>
            <div class="col-span-3 text-right font-mono text-xs">
                ${rate}% <span class="text-slate-400">/ ${border}%</span>
            </div>
            <div class="col-span-3 text-xs text-slate-500 pl-2 truncate" title="${r.exam.desc}">
                ${r.exam.desc}
            </div>
        </div>`;
    }).join('');

    return `
        <div class="flex flex-col p-4 bg-white border border-slate-100 shadow-sm rounded-lg mb-4 hover:shadow-md transition">
            <div class="flex justify-between items-center mb-3">
                <div>
                    <h4 class="font-bold text-slate-800 text-md">${uni.name}</h4>
                    <div class="text-xs text-slate-500">${uni.faculty}</div>
                </div>
            </div>
            <div class="w-full">
                ${listRows}
            </div>
        </div>
    `;
}

function createHaganCard(uni, r) {
    return `
        <div class="p-3 bg-emerald-50 border border-emerald-100 rounded-lg mb-2">
            <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-emerald-800 text-sm">${uni.name}</span>
                <span class="bg-white text-emerald-600 px-2 py-0.5 rounded text-xs font-bold border border-emerald-200">A判定</span>
            </div>
            <div class="text-xs text-emerald-700">
                <i class="fa-solid fa-check-circle mr-1"></i>${r.exam.type}方式で安全圏
            </div>
        </div>
    `;
}

function renderStrategy(userDev, sortedDevs) {
    let html = "";
    const weak = sortedDevs[sortedDevs.length-1];
    const strong = sortedDevs[0];
    const weakName = weak[0];
    
    html += `<div class="mb-4">あなたの武器は<strong class="text-indigo-600">${strong[0]} (偏差値${strong[1].toFixed(1)})</strong>です。これを維持しつつ、<strong class="text-rose-600">${weakName}</strong>の底上げを図ることで総合偏差値を大きく伸ばせます。</div>`;

    let phase1Title = "直近2週間：基礎徹底";
    let phase1Content = "";
    let phase2Title = "来月：実戦演習";
    let phase2Content = "";
    let phase3Title = "直前期：時間配分";
    let phase3Content = "";

    if (userDev < 45) {
        phase1Content = `${weakName}の教科書・基本例題に戻りましょう。応用問題には手を付けず、公式や用語の定義を完璧に言えるようにしてください。`;
        phase2Content = `「大問1・2」など、基礎点の配点が高い分野だけをマーク模試の過去問で繰り返し解きます。難問は捨ててOK。`;
        phase3Content = `全科目の基礎問題だけで6割取る練習をします。得意の${strong[0]}だけは8割を狙いましょう。`;
    } else if (userDev < 60) {
        phase1Content = `${weakName}の苦手分野（例：ベクトルの計算、古文単語）を特定し、その単元だけを薄い問題集で集中特訓します。`;
        phase2Content = `共通テスト形式の問題集（緑本や黒本）で、時間を計って解きます。間違えた問題の「解説」を熟読し、なぜ間違えたかを言語化します。`;
        phase3Content = `本番と同じ時間割で予想問題を解きます。${strong[0]}で時間を稼ぎ、${weakName}に回す戦略を立てましょう。`;
    } else {
        phase1Title = "直近2週間：穴埋めと速度";
        phase1Content = `${weakName}でも偏差値60を切る単元がないかチェック。${strong[0]}は満点を狙うため、ケアレスミス防止のチェックリストを作成します。`;
        phase2Title = "来月：難問攻略";
        phase2Content = `Z会の予想問題など、少し難易度の高いセットで負荷をかけます。8割ではなく9割安定を目指すための「捨て問の見極め」を練習します。`;
        phase3Content = `体調管理を最優先しつつ、毎日全科目に触れて感覚を鈍らせないようにします。`;
    }

    html += `
    <div class="timeline">
        <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="font-bold text-slate-700 text-sm mb-1">${phase1Title}</div>
            <p class="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">${phase1Content}</p>
        </div>
        <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="font-bold text-slate-700 text-sm mb-1">${phase2Title}</div>
            <p class="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">${phase2Content}</p>
        </div>
        <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="font-bold text-slate-700 text-sm mb-1">${phase3Title}</div>
            <p class="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">${phase3Content}</p>
        </div>
    </div>`;

    document.getElementById('strategyContent').innerHTML = html;
}

let chartInstance = null;
function renderRadarChart(myDataObj, rivalDataObj) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    const labels = Object.keys(myDataObj);
    const myData = Object.values(myDataObj);
    
    let datasets = [{
        label: 'あなた',
        data: myData,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: '#6366f1',
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        borderWidth: 2,
    }];

    if (rivalDataObj) {
        const rivalData = labels.map(label => rivalDataObj[label] || 50); 
        datasets.push({
            label: 'ライバル(仮想)',
            data: rivalData,
            backgroundColor: 'rgba(203, 213, 225, 0.1)', 
            borderColor: '#94a3b8',
            borderDash: [5, 5],
            pointBackgroundColor: '#cbd5e1',
            pointBorderColor: '#fff',
            borderWidth: 2,
        });
    }

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            scales: {
                r: {
                    angleLines: { color: '#e2e8f0' },
                    grid: { color: '#e2e8f0' },
                    pointLabels: { 
                        font: { size: 10, family: "'Noto Sans JP', sans-serif" },
                        color: '#64748b'
                    },
                    suggestedMin: 30,
                    suggestedMax: 70,
                    ticks: { display: false }
                }
            },
            plugins: { legend: { display: true, position: 'bottom' } },
            maintainAspectRatio: false
        }
    });
}

function updateSimVal(key, val) {
    simulationOffsets[key] = parseInt(val);
    
    const currentScore = parseInt(document.getElementById(`score_${key}`).value) || 0;
    const sub = subjectMaster[key];
    const total = currentScore + parseInt(val);
    const isMax = total >= sub.max;
    
    const displayEl = document.getElementById(`simVal_${key}`);
    displayEl.innerHTML = `+${val} <span class="text-slate-400 text-xs font-normal">(計${Math.min(sub.max, total)})${isMax ? '<span class="text-[10px] bg-rose-100 text-rose-600 px-1 rounded ml-1">MAX</span>' : ''}</span>`;
    
    if (isMax) {
        displayEl.className = 'text-rose-600 font-bold';
    } else {
        displayEl.className = 'text-purple-600 font-bold';
    }
}

function resetSimulation() {
    Object.keys(simulationOffsets).forEach(key => {
        simulationOffsets[key] = 0;
        const range = document.getElementById(`simRange_${key}`);
        if(range) range.value = 0;
        updateSimVal(key, 0);
    });
    runAnalysis(true);
}

function saveData() {
    const field = document.getElementById('fieldSelect').value;
    const targetUni = document.getElementById('targetUni').value;
    localStorage.setItem('user_field', field);
    localStorage.setItem('user_target', targetUni);
    
    const inputs = document.getElementById('scoreInputs').querySelectorAll('input');
    inputs.forEach(input => {
        localStorage.setItem(input.id, input.value);
    });
}

function loadData() {
    const field = localStorage.getItem('user_field');
    if (field) document.getElementById('fieldSelect').value = field;
    
    const targetUni = localStorage.getItem('user_target');
    if (targetUni) document.getElementById('targetUni').value = targetUni;
}

function resetData() {
    if(confirm('保存されたデータをすべて削除しますか？')) {
        localStorage.clear();
        location.reload();
    }
}

init();
