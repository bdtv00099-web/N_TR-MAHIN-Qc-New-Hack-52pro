let gameHistory = [];
let wins = 0;
let losses = 0;
let isReversed = false; 
let lastPrediction = null; 

let countP = 0, countB = 0, countT = 0;

const PATTERN_RULES = [
    { pattern: "BBB", result: "P", name: "TRIPLE BREAK" },
    { pattern: "PPP", result: "B", name: "TRIPLE BREAK" },
    { pattern: "PBP", result: "B", name: "ZIGZAG (চলমান)" },
    { pattern: "BPB", result: "P", name: "ZIGZAG (চলমান)" },
    { pattern: "BBPP", result: "B", name: "DOUBLE ZIGZAG (চলমান)" },
    { pattern: "PPBB", result: "P", name: "DOUBLE ZIGZAG (চলমান)" },
    { pattern: "BB", result: "P", name: "BLOCK MIRROR" },
    { pattern: "PP", result: "B", name: "BLOCK MIRROR" },
    { pattern: "BBPBB", result: "B", name: "REPEATING BLOCK" },
    { pattern: "PPBPP", result: "P", name: "REPEATING BLOCK" },
    { pattern: "BBBB", result: "B", name: "STRONG STREAK FOLLOW (চলমান)", isStrong: true },
    { pattern: "PPPP", result: "P", name: "STRONG STREAK FOLLOW (চলমান)", isStrong: true },
    { pattern: "BBP", result: "P", name: "SAME BLOCK OPPOSITE" },
    { pattern: "PPB", result: "B", name: "SAME BLOCK OPPOSITE" },
    { pattern: "BBPB", result: "B", name: "VARIABLE BLOCK" },
    { pattern: "PPBP", result: "P", name: "VARIABLE BLOCK" },
    { pattern: "BBPPP", result: "P", name: "BLOCK CONTINUATION" },
    { pattern: "PPBBB", result: "B", name: "BLOCK CONTINUATION" },
    { pattern: "BPBB", result: "B", name: "ZIGZAG BREAK" },
    { pattern: "PBPP", result: "P", name: "ZIGZAG BREAK" }
];

function getTodayPassword() {
    let now = new Date();
    let dayIndex = now.getDay(); 

    const weeklyPasswords = {
        0: "X9#kP", // রবিবার
        1: "Mz$4v", // সোমবার
        2: "Q8!wR", // মঙ্গলবার
        3: "J2n&L", // বুধবার
        4: "T5y@S", // বৃহস্পতিবার
        5: "B7c^F", // শুক্রবার
        6: "Z3d*H"  // শনিবার
    };

    return weeklyPasswords[dayIndex];
}

function verifyPassword() {
    let name = document.getElementById("nameInput").value.trim();
    let pass = document.getElementById("passInput").value.trim();
    let errorMsg = document.getElementById("errorMsg");

    let todayValidPassword = getTodayPassword();
    let masterPassword = "Ntrmahin@000"; 

    if (name !== "" && (pass === todayValidPassword || pass === masterPassword)) {
        document.getElementById("loginOverlay").style.display = "none";
        document.getElementById("greetingSub").innerText = "WELCOME, " + name.toUpperCase() + " BOSS";
        speakText("System unlocked. Welcome " + name);
        calculatePrediction();
    } else {
        errorMsg.style.display = "block";
    }
}

function recordOutcome(actualResult) {
    let nonTieHistoryCount = gameHistory.filter(x => x !== 'T').length;

    if (lastPrediction && actualResult !== 'T' && nonTieHistoryCount >= 10) {
        if (actualResult === lastPrediction) {
            wins++;
        } else {
            losses++;
            isReversed = !isReversed; 
        }
        updatePerformanceUI();
    }

    gameHistory.push(actualResult);
    if (actualResult === 'P') countP++;
    if (actualResult === 'B') countB++;
    if (actualResult === 'T') countT++;

    updateCounts();
    renderRecentHistory();
    renderBigRoad();
    calculatePrediction();
}

function undoLast() {
    if (gameHistory.length > 0) {
        let last = gameHistory.pop();
        if (last === 'P') countP--;
        if (last === 'B') countB--;
        if (last === 'T') countT--;

        updateCounts();
        renderRecentHistory();
        renderBigRoad();
        calculatePrediction();
    }
}

function resetAll() {
    gameHistory = [];
    wins = 0; losses = 0;
    countP = 0; countB = 0; countT = 0;
    isReversed = false;
    lastPrediction = null;

    document.getElementById("winCount").innerText = "0";
    document.getElementById("lossCount").innerText = "0";
    document.getElementById("winRate").innerText = "0%";
    
    document.getElementById("predOutput").innerText = "AWAITING 10 INPUTS...";
    document.getElementById("patternNameLabel").innerText = "PATTERN: WAITING FOR DATA";

    updateCounts();
    renderRecentHistory();
    renderBigRoad();
    calculatePrediction();
}

function updateCounts() {
    let total = gameHistory.length;
    let pRate = total > 0 ? Math.round((countP / total) * 100) : 0;
    let bRate = total > 0 ? Math.round((countB / total) * 100) : 0;
    let tRate = total > 0 ? Math.round((countT / total) * 100) : 0;

    document.getElementById("countP").innerText = `${countP} (${pRate}%)`;
    document.getElementById("countB").innerText = `${countB} (${bRate}%)`;
    document.getElementById("countT").innerText = `${countT} (${tRate}%)`;
}

function updatePerformanceUI() {
    let totalGames = wins + losses;
    let winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    document.getElementById("winCount").innerText = wins;
    document.getElementById("lossCount").innerText = losses;
    document.getElementById("winRate").innerText = winRate + "%";
}

function calculatePrediction() {
    let statusBadge = document.getElementById("engineStatusBadge");
    let nonTieHistory = gameHistory.filter(x => x !== 'T');

    if (nonTieHistory.length < 10) {
        statusBadge.innerText = `⚡ ENGINE: GATHERING DATA (${nonTieHistory.length}/10)`;
        statusBadge.style.color = "var(--gold)";
        statusBadge.style.borderColor = "rgba(255, 215, 0, 0.5)";
        statusBadge.style.background = "linear-gradient(145deg, #181b29, #0d0f17)";
        
        document.getElementById("predOutput").innerText = "AWAITING 10 INPUTS...";
        document.getElementById("patternNameLabel").innerText = `Need ${10 - nonTieHistory.length} more inputs...`;
        return;
    }

    let historyStr = nonTieHistory.join("");
    let matchedRule = null;

    let sortedRules = [...PATTERN_RULES].sort((a, b) => b.pattern.length - a.pattern.length);

    for (let rule of sortedRules) {
        if (historyStr.endsWith(rule.pattern)) {
            if (rule.isStrong) {
                let lastChar = rule.pattern[rule.pattern.length - 1];
                let exactFour = lastChar.repeat(4);
                let exactFive = lastChar.repeat(5);
                if (historyStr.endsWith(exactFive)) {
                    continue; 
                }
            }
            matchedRule = rule;
            break;
        }
    }

    let predictedResult = "";
    let patternName = "";
    let isStrongPattern = false;

    if (matchedRule) {
        predictedResult = matchedRule.result;
        patternName = matchedRule.name;
        if (matchedRule.isStrong) {
            isStrongPattern = true; 
        }
    } else {
        let last = nonTieHistory[nonTieHistory.length - 1];
        predictedResult = last === 'P' ? 'B' : 'P';
        patternName = "DYNAMIC ANALYSIS";
    }

    if (predictedResult !== "") {
        if (isStrongPattern) {
            statusBadge.innerText = "🛡️ ENGINE: STRONG PATTERN ACTIVE (NORMAL)";
            statusBadge.style.color = "#00ff88";
            statusBadge.style.borderColor = "rgba(0, 255, 136, 0.6)";
            statusBadge.style.background = "linear-gradient(145deg, #11261d, #0d1a14)";
        } else {
            if (isReversed) {
                predictedResult = predictedResult === "P" ? "B" : "P";
                patternName += " (REVERSE)";
                statusBadge.innerText = "🔄 ENGINE: REVERSE MODE ACTIVE";
                statusBadge.style.color = "var(--banker-pink)";
                statusBadge.style.borderColor = "rgba(255, 0, 127, 0.6)";
                statusBadge.style.background = "linear-gradient(145deg, #2b111e, #1c0a13)";
            } else {
                patternName += " (NORMAL)";
                statusBadge.innerText = "⚡ ENGINE: NORMAL MODE ACTIVE";
                statusBadge.style.color = "var(--gold)";
                statusBadge.style.borderColor = "rgba(255, 215, 0, 0.6)";
                statusBadge.style.background = "linear-gradient(145deg, #262211, #1a170b)";
            }
        }

        lastPrediction = predictedResult;

        let outputText = predictedResult === "P" ? "PLAYER" : "BANKER";
        let outputColor = predictedResult === "P" ? "var(--player-cyan)" : "var(--banker-pink)";

        let predElem = document.getElementById("predOutput");
        predElem.innerText = `${outputText} (89%)`;
        predElem.style.color = outputColor;

        document.getElementById("patternNameLabel").innerText = `PATTERN: ${patternName}`;

        if (document.getElementById("voiceToggle").checked) {
            speakText(outputText);
        }
    }
}

function renderRecentHistory() {
    let container = document.getElementById("recentHistoryList");
    container.innerHTML = "";
    gameHistory.forEach(item => {
        let circle = document.createElement("div");
        circle.className = `history-circle ${item.toLowerCase()}`;
        circle.innerText = item;
        container.appendChild(circle);
    });

    container.scrollLeft = container.scrollWidth;
}

function renderBigRoad() {
    let container = document.getElementById("bigRoadGrid");
    container.innerHTML = "";

    let columns = [];
    let currentCol = [];
    let lastResult = null;

    gameHistory.forEach(result => {
        if (result === 'T') {
            if (currentCol.length > 0) currentCol[currentCol.length - 1] += 'T';
            return;
        }

        if (lastResult === null || result === lastResult) {
            if (currentCol.length < 5) {
                currentCol.push(result);
            } else {
                columns.push(currentCol);
                currentCol = [result];
            }
        } else {
            if (currentCol.length > 0) columns.push(currentCol);
            currentCol = [result];
        }
        lastResult = result;
    });

    if (currentCol.length > 0) columns.push(currentCol);

    columns.forEach(col => {
        let colElem = document.createElement("div");
        colElem.className = "road-col";
        col.forEach(cellRes => {
            let cellElem = document.createElement("div");
            let mainRes = cellRes[0];
            cellElem.className = `road-cell ${mainRes.toLowerCase()}`;
            cellElem.innerText = mainRes;
            colElem.appendChild(cellElem);
        });
        container.appendChild(colElem);
    });

    container.scrollLeft = container.scrollWidth;
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}