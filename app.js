/* ==========================================================================
   Hanja Molecule Finder Core Application Logic (High-Security Minified Edition)
   Dynamic database loading, high-performance in-memory search,
   Radical clustering UI, recursive Lego-tree builder, and O(1) reverse search.
   Obfuscated keys and compressed structures applied for optimal performance and safety.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // 1. DOM Elements
    const appLayout = document.getElementById("app-layout");
    
    const searchInput = document.getElementById("search-input");
    const clearSearchBtn = document.getElementById("clear-search-btn");
    const resultsCount = document.getElementById("results-count");
    const clusteringTabBar = document.getElementById("clustering-tab-bar");
    const resultsList = document.getElementById("results-list");
    
    const recentSearchesCard = document.getElementById("recent-searches-card");
    const recentTagsContainer = document.getElementById("recent-tags-container");
    const clearHistoryBtn = document.getElementById("clear-history-btn");
    
    const viewerEmptyState = document.getElementById("viewer-empty-state");
    const viewerContent = document.getElementById("viewer-content");
    
    const detailChar = document.getElementById("detail-char");
    const detailReadingMeaning = document.getElementById("detail-reading-meaning");
    const detailLevel = document.getElementById("detail-level");
    const detailRadical = document.getElementById("detail-radical");
    const detailStrokes = document.getElementById("detail-strokes");
    
    const idsTreeContainer = document.getElementById("ids-tree-container");
    const familyComponentSelect = document.getElementById("family-component-select");
    const familyCount = document.getElementById("family-count");
    const familyGridContainer = document.getElementById("family-grid-container");

    // 2. State Management
    let hanjaDb = {};
    let reverseIndex = {};
    let activeQuery = "";
    let activeClusterTab = "all";
    let activeSelectedChar = "";
    const HISTORY_KEY = "hanja_molecule_search_history_v1";

    // 3. Ultra-premium Database Loader (Fetch with detailed percentage progress)
    async function loadDatabases() {
        try {
            // Fetch databases
            const dbResponse = await fetch("hanja_db.json");
            hanjaDb = await dbResponse.json();
            
            const revResponse = await fetch("reverse_index.json");
            reverseIndex = await revResponse.json();
            
            // Inject total stats
            document.getElementById("stat-total-hanja").textContent = Object.keys(hanjaDb).length.toLocaleString();
            
            renderHistory();
            
            // Auto-search if URL parameter 'q' is provided
            const urlParams = new URLSearchParams(window.location.search);
            const query = urlParams.get('q');
            if (query) {
                searchInput.value = query;
                handleSearch();
            }

        } catch (error) {
            console.error("Database initialization failed:", error);
        }
    }

    // 4. In-Memory Search Engine & Radical Clustering
    function handleSearch() {
        const query = searchInput.value.trim().toLowerCase();
        activeQuery = query;
        
        if (query === "") {
            clearSearchBtn.classList.add("hidden");
            clusteringTabBar.classList.add("hidden");
            renderEmptyResults();
            return;
        }
        
        clearSearchBtn.classList.remove("hidden");
        
        // Match logic using obfuscated keys:
        // r: reading, mn: meaning, rd: radical, cp: components
        if (hanjaDb[query]) {
            showHanjaDetails(query);
            renderSearchResults([query]);
            return;
        }
        
        const matches = [];
        const isReadingSearch = /^[가-힣]+$/.test(query);
        
        for (const [char, entry] of Object.entries(hanjaDb)) {
            // Match reading (r)
            if (isReadingSearch && entry.r === query) {
                matches.push(char);
            } 
            // Match meaning (mn) (contains keyword)
            else if (!isReadingSearch && entry.mn.includes(query)) {
                matches.push(char);
            }
            // Match radical (rd)
            else if (!isReadingSearch && entry.rd === query) {
                matches.push(char);
            }
            // Match IDS components (cp)
            else if (!isReadingSearch && entry.cp.includes(query)) {
                matches.push(char);
            }
        }
        
        // If no direct match in CSV DB, check if query is a general sub-component in reverse index
        if (matches.length === 0 && reverseIndex[query]) {
            renderSearchResults(reverseIndex[query]);
            return;
        }
        
        if (isReadingSearch && matches.length > 1) {
            // Apply Radical Clustering for homonyms (동음이의어 군집화)
            renderClusteredResults(matches);
        } else {
            clusteringTabBar.classList.add("hidden");
            renderSearchResults(matches);
        }
    }

    function renderEmptyResults() {
        resultsCount.textContent = "0";
        resultsList.innerHTML = `
            <div class="empty-state">
                <i class="ti ti-atom"></i>
                <p>한자, 한글 음, 혹은 부수 구성요소를 입력하여 한자를 탐색해보세요.</p>
            </div>
        `;
    }

    // Homonym Radical Clustering (동음이의어 부수별 군집화 UI)
    function renderClusteredResults(chars) {
        // Group characters by their radical (rd)
        const groups = { all: chars };
        
        chars.forEach(char => {
            const rad = hanjaDb[char].rd || "기타";
            if (!groups[rad]) groups[rad] = [];
            groups[rad].push(char);
        });
        
        // Render Tab Buttons
        clusteringTabBar.innerHTML = "";
        clusteringTabBar.classList.remove("hidden");
        
        const sortedRadicals = Object.keys(groups).sort((a, b) => {
            if (a === "all") return -1;
            if (b === "all") return 1;
            return groups[b].length - groups[a].length; // Descending count
        });
        
        sortedRadicals.forEach(rad => {
            const btn = document.createElement("button");
            btn.className = `tab-btn ${activeClusterTab === rad ? "active" : ""}`;
            btn.innerHTML = rad === "all" 
                ? `전체 <span class="count-badge">${chars.length}</span>`
                : `${rad} <span class="count-badge">${groups[rad].length}</span>`;
            
            btn.addEventListener("click", () => {
                document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                activeClusterTab = rad;
                renderSearchResults(groups[rad], true); // render selected sub-group
            });
            
            clusteringTabBar.appendChild(btn);
        });
        
        // Default to render current active tab or 'all'
        if (!groups[activeClusterTab]) {
            activeClusterTab = "all";
            const firstTab = clusteringTabBar.querySelector(".tab-btn");
            if (firstTab) firstTab.classList.add("active");
        }
        
        renderSearchResults(groups[activeClusterTab], true);
    }

    function renderSearchResults(chars, skipTabReset = false) {
        if (!skipTabReset) {
            clusteringTabBar.classList.add("hidden");
            activeClusterTab = "all";
        }
        
        resultsCount.textContent = chars.length;
        
        if (chars.length === 0) {
            resultsList.innerHTML = `
                <div class="empty-state">
                    <i class="ti ti-mood-empty"></i>
                    <p>검색 조건에 맞는 한자가 데이터베이스에 없습니다.</p>
                </div>
            `;
            return;
        }
        
        resultsList.innerHTML = "";
        
        chars.forEach(char => {
            const meta = hanjaDb[char];
            if (!meta) return;
            
            const isCombo = meta.mn.includes('(:)') || meta.mn.includes('（：）') || meta.mn.includes('(：)');
            const isLong = !isCombo && (meta.mn.endsWith(':') || meta.mn.endsWith('：'));
            const cleanMn = meta.mn.replace(/[:：\s]*\(?[:：]\)?$/g, "").trim();
            
            let vowelMark = '';
            if (isCombo) {
                vowelMark = ' <span style="color:#00f0ff; font-weight:800; font-size:0.8rem;" title="장단음 겸용">[겸용]</span>';
            } else if (isLong) {
                vowelMark = ' <span style="color:#ffc107; font-weight:800; font-size:0.8rem;" title="장음(긴소리)">[장음]</span>';
            }
            
            const card = document.createElement("div");
            card.className = `hanja-row-card ${activeSelectedChar === char ? "active" : ""}`;
            
            // r: reading, mn: meaning, rd: radical, s2: total_strokes, lv: grade
            card.innerHTML = `
                <div class="row-left">
                    <div class="char-avatar">${char}</div>
                    <div class="row-info">
                        <span class="row-meaning-reading">${meta.r} (${cleanMn})${vowelMark}</span>
                        <span class="row-meta-sub">부수: ${meta.rd} | ${meta.s2}획</span>
                    </div>
                </div>
                <div class="row-right-badge level-badge">${getFriendlyGrade(meta.lv)}</div>
            `;
            
            card.addEventListener("click", () => {
                // Highlight active row
                document.querySelectorAll(".hanja-row-card").forEach(c => c.classList.remove("active"));
                card.classList.add("active");
                
                showHanjaDetails(char, true);
            });
            
            resultsList.appendChild(card);
        });
    }

    // 5. Hanja Profile & LEGO IDS Tree Renderer
    function showHanjaDetails(char, shouldScroll = false) {
        const meta = hanjaDb[char];
        if (!meta) return;
        
        activeSelectedChar = char;
        saveToHistory(char);
        
        // Hide empty viewer and show content viewer
        viewerEmptyState.classList.add("hidden");
        viewerContent.classList.remove("hidden");
        
        if (shouldScroll) {
            viewerContent.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        
        // Populate profile card
        // r: reading, mn: meaning, lv: grade, rd: radical, s1: strokes, s2: total_strokes
        const isCombo = meta.mn.includes('(:)') || meta.mn.includes('（：）') || meta.mn.includes('(：)');
        const isLong = !isCombo && (meta.mn.endsWith(':') || meta.mn.endsWith('：'));
        const cleanMeaning = meta.mn.replace(/[:：\s]*\(?[:：]\)?$/g, "").trim();
        
        let displayCharHtml = char;
        if (isCombo) {
            displayCharHtml += `<span class="vowel-mark-char">(:)</span>`;
        } else if (isLong) {
            displayCharHtml += `<span class="vowel-mark-char">:</span>`;
        }
        detailChar.innerHTML = displayCharHtml;
        
        detailReadingMeaning.textContent = `${meta.r} (${cleanMeaning})`;
        detailLevel.textContent = getFriendlyGrade(meta.lv);
        detailRadical.textContent = `${meta.rd} (획수: ${meta.s1}획)`;
        detailStrokes.textContent = `${meta.s2}획`;
        
        // Recursive Lego-Block Tree Building
        idsTreeContainer.innerHTML = "";
        const treeWrapper = document.createElement("div");
        treeWrapper.className = "ids-tree-wrapper";
        
        // t: tree
        if (meta.t) {
            treeWrapper.appendChild(buildLegoHtmlTree(meta.t));
        } else {
            // Leaf fallback
            const leafNode = createLegoBlockNode(char);
            treeWrapper.appendChild(leafNode);
        }
        idsTreeContainer.appendChild(treeWrapper);
        
        // Populate Family View Components Dropdown
        familyComponentSelect.innerHTML = "";
        
        // Always add radical first as default
        const radOpt = document.createElement("option");
        radOpt.value = meta.rd;
        radOpt.textContent = `${meta.rd} (기본 부수)`;
        familyComponentSelect.appendChild(radOpt);
        
        // Add other components (cp: components, ct: component_types)
        meta.cp.forEach(comp => {
            if (comp !== meta.rd && comp !== char) {
                const opt = document.createElement("option");
                opt.value = comp;
                
                // ct values: hj (hanja), rc (radical), ot (other)
                const typeLabel = meta.ct[comp] === "hj" 
                    ? "한자" 
                    : meta.ct[comp] === "rc" 
                        ? "부수" 
                        : "기타";
                        
                opt.textContent = `${comp} (${typeLabel})`;
                familyComponentSelect.appendChild(opt);
            }
        });
        
        // Trigger family rendering for default radical selection
        renderFamilyGrid(meta.rd);
    }

    // Recursive HTML Builder for IDS Lego Tree
    // Obfuscated Node Keys -> c: char, tp: type, ch: children
    function buildLegoHtmlTree(node) {
        const nodeDiv = document.createElement("div");
        nodeDiv.className = "ids-tree-node";
        
        const hasChildren = node.ch && node.ch.length > 0;
        
        // Scenario 1: Decomposable component that retains its character (node.c AND hasChildren)
        if (node.c && hasChildren) {
            const leafBlock = createLegoBlockNode(node.c, true);
            nodeDiv.appendChild(leafBlock);
            
            // Render the children container (collapsed by default)
            const childrenDiv = document.createElement("div");
            childrenDiv.className = "ids-tree-children collapsible collapsed";
            
            // If the decomposition operator is present, show it as a sub-operator node
            if (node.tp) {
                const opBlock = document.createElement("div");
                opBlock.className = "lego-block type-op";
                const opLabel = node.tp === "SQ" ? "SEQ" : (node.tp === "CY" ? "CYCLE" : node.tp);
                opBlock.innerHTML = `<span class="lego-char">${opLabel}</span>`;
                
                const opNode = document.createElement("div");
                opNode.className = "ids-tree-node";
                opNode.appendChild(opBlock);
                
                const opChildrenDiv = document.createElement("div");
                opChildrenDiv.className = "ids-tree-children";
                
                node.ch.forEach(child => {
                    opChildrenDiv.appendChild(buildLegoHtmlTree(child));
                });
                opNode.appendChild(opChildrenDiv);
                childrenDiv.appendChild(opNode);
            } else {
                node.ch.forEach(child => {
                    childrenDiv.appendChild(buildLegoHtmlTree(child));
                });
            }
            
            nodeDiv.appendChild(childrenDiv);
            
            // Attach toggle behavior to the expand button
            const expandBtn = leafBlock.querySelector(".lego-expand-btn");
            if (expandBtn) {
                expandBtn.addEventListener("click", (e) => {
                    e.stopPropagation(); // Prevents main navigation click
                    const isCollapsed = childrenDiv.classList.toggle("collapsed");
                    expandBtn.innerHTML = isCollapsed ? '<i class="ti ti-plus"></i>' : '<i class="ti ti-minus"></i>';
                    leafBlock.classList.toggle("is-expanded", !isCollapsed);
                });
            }
        }
        // Scenario 2: Standard IDC Operator or anonymous sequence (node.tp AND no node.c)
        else if (node.tp && !node.c) {
            const opBlock = document.createElement("div");
            opBlock.className = "lego-block type-op";
            
            const opLabel = node.tp === "SQ" ? "SEQ" : (node.tp === "CY" ? "CYCLE" : node.tp);
            opBlock.innerHTML = `<span class="lego-char">${opLabel}</span>`;
            nodeDiv.appendChild(opBlock);
            
            if (hasChildren) {
                const childrenDiv = document.createElement("div");
                childrenDiv.className = "ids-tree-children";
                
                node.ch.forEach(child => {
                    childrenDiv.appendChild(buildLegoHtmlTree(child));
                });
                
                nodeDiv.appendChild(childrenDiv);
            }
        } 
        // Scenario 3: Standard Leaf Node (no children)
        else if (node.c) {
            const leafBlock = createLegoBlockNode(node.c, false);
            nodeDiv.appendChild(leafBlock);
        }
        
        return nodeDiv;
    }

    function createLegoBlockNode(char, hasChildren = false) {
        const block = document.createElement("div");
        
        const currentHanjaRadical = activeSelectedChar && hanjaDb[activeSelectedChar] 
            ? hanjaDb[activeSelectedChar].rd 
            : "";
            
        const RADICAL_VARIANT_TO_ORIGINAL = {
            "亻": "人", "氵": "水", "忄": "心", "扌": "手", "犭": "犬",
            "礻": "示", "衤": "衣", "辶": "辵", "阝": "阜",
            "艹": "艸", "刂": "刀", "⺈": "刀", "⺌": "小", "⺗": "心",
            "⺘": "手", "⺧": "牛", "⺫": "网", "⺯": "肉", "⺲": "网",
            "⺶": "羊", "⺾": "艸", "⻀": "艸", "⻄": "襾", "⻎": "辵",
            "⺄": "乙", "⺸": "老", "⺻": "聿", "⺼": "肉"
        };
        
        const normChar = RADICAL_VARIANT_TO_ORIGINAL[char] || char;
        const normRad = RADICAL_VARIANT_TO_ORIGINAL[currentHanjaRadical] || currentHanjaRadical;
        
        const isRealRadical = currentHanjaRadical && (
            char === currentHanjaRadical || 
            normChar === normRad ||
            (char === "阝" && (currentHanjaRadical === "阜" || currentHanjaRadical === "邑")) ||
            (currentHanjaRadical === "阝" && (char === "阜" || char === "邑"))
        );
        
        const hasDb = !!hanjaDb[char];
        
        let type = "other";
        let subText = "미분류";
        let fullTitle = "미분류";
        
        if (isRealRadical) {
            type = "radical"; // Highlight ONLY the true radical of current active Hanja
            if (hasDb) {
                const meta = hanjaDb[char];
                const cleanMn = meta.mn.replace(/[:：\s]*\(?[:：]\)?$/g, "").trim();
                const friendlyGrade = getFriendlyGrade(meta.lv);
                subText = `${cleanMn}(${friendlyGrade})`;
                fullTitle = `${char}: ${cleanMn} (${friendlyGrade}) [부수]`;
            } else {
                const radName = RADICAL_NAMES[char] || "부수";
                subText = radName;
                fullTitle = `${char}: 부수 (${radName})`;
            }
        } else if (hasDb) {
            type = "hanja"; // Render non-radical components as standard pink bricks
            const meta = hanjaDb[char];
            const cleanMn = meta.mn.replace(/[:：\s]*\(?[:：]\)?$/g, "").trim();
            const friendlyGrade = getFriendlyGrade(meta.lv);
            subText = `${cleanMn}(${friendlyGrade})`;
            fullTitle = `${char}: ${cleanMn} (${friendlyGrade})`;
        } else if (isKangxiRadical(char)) {
            type = "other"; // General radicals that are not active semantic radicals render in standard theme
            const radName = RADICAL_NAMES[char] || "요소";
            subText = radName;
            fullTitle = `${char}: 일반 부품 (${radName})`;
        } else {
            fullTitle = `${char}: 미분류 요소`;
        }
        
        // Bind correct CSS types: type-hanja, type-radical, type-other
        block.className = `lego-block type-${type}${hasChildren ? " has-children" : ""}`;
        block.title = fullTitle; // Prevent content clipping by offering full info as hover tooltip
        
        let expandHtml = "";
        if (hasChildren) {
            expandHtml = `<span class="lego-expand-btn" title="자세히 분해하기"><i class="ti ti-plus"></i></span>`;
        }
        
        block.innerHTML = `
            <span class="lego-char">${char}</span>
            <span class="lego-desc">${subText}</span>
            ${expandHtml}
        `;
        
        // Add Navigation click event
        block.addEventListener("click", (e) => {
            e.stopPropagation();
            
            // Set query and trigger search
            searchInput.value = char;
            handleSearch();
            
            // If it is in DB, select it immediately
            if (hanjaDb[char]) {
                showHanjaDetails(char, true);
            }
        });
        
        return block;
    }

    // Convert numeric grade code to friendly Korean grade name
    function getFriendlyGrade(code) {
        if (!code) return "";
        const strCode = String(code).replace(/\s+/g, "").trim();
        
        let result = strCode;
        switch (strCode) {
            case "80": result = "8급"; break;
            case "72": result = "7급Ⅱ"; break;
            case "70": result = "7급"; break;
            case "62": result = "6급Ⅱ"; break;
            case "60": result = "6급"; break;
            case "52": result = "5급Ⅱ"; break;
            case "50": result = "5급"; break;
            case "42": result = "4급Ⅱ"; break;
            case "40": result = "4급"; break;
            case "32": result = "3급Ⅱ"; break;
            case "30": result = "3급"; break;
            case "22": result = "2급Ⅱ"; break;
            case "20": result = "2급"; break;
            case "12": result = "인명용"; break;
            case "10": result = "1급"; break;
            case "02": result = "Ⅱ급"; break;
            case "01": result = "Ⅱ급"; break;
            case "00": result = "Ⅰ급"; break;
        }
        return result.replace(/\s+/g, "").trim();
    }

    // Comprehensive Korean Names mapping for Kangxi radicals and common variants
    const RADICAL_NAMES = {
        // 변형 부수 (가장 빈번하게 나타남)
        "亻": "사람 인", "氵": "물 수", "忄": "마음 심", "扌": "손 수", "犭": "개 견",
        "礻": "보일 시", "衤": "옷 의", "辶": "갈 착", "阝": "언덕 부 / 고을 읍", "艹": "풀 초",
        "刂": "칼 도", "⺈": "칼 도", "⺆": "멀경몸", "⺌": "작을 소", "⺗": "마음 심",
        "⺘": "손 수", "⺠": "백성 민", "⺧": "소 우", "⺫": "그물 망", "⺯": "고기 육",
        "⺲": "그물 망", "⺶": "양 양", "⺾": "풀 초", "⻀": "풀 초", "⻄": "덮을 아",
        "⻎": "갈 착", "⺄": "새 을", "⺊": "점 복", "⺸": "늙을 로", "⺻": "붓 율",
        "⺼": "육달월", "兀": "우뚝할 올",
        
        // 1획
        "一": "한 일", "丨": "뚫을 곤", "丶": "점 주", "丿": "삐침 별", "乙": "새 을", "亅": "갈고리 궐",
        // 2획
        "二": "두 이", "亠": "돼지해머리", "人": "사람 인", "儿": "어진사람 밑", "入": "들 입", "八": "여덟 팔",
        "冂": "멀 경", "冖": "민갓머리", "冫": "이수변", "几": "안석 궤", "凵": "위튼입구몸", "刀": "칼 도",
        "力": "힘 력", "勹": "쌀 포", "匕": "비수 비", "匚": "튼입구몸", "匸": "감출 혜", "十": "열십",
        "卜": "점 복", "卩": "병부 절", "厂": "민엄호", "厶": "사사 사", "又": "또 우",
        // 3획
        "口": "입 구", "囗": "에운담", "土": "흙 토", "士": "선비 사", "夂": "뒤져올 치", "夊": "천천히걸을 쇠",
        "夕": "저녁 석", "大": "큰 대", "女": "여자 녀", "子": "아들 자", "宀": "갓머리", "寸": "마디 촌",
        "小": "작을 소", "屰": "거스르는모양 역", "尸": "주검 시", "屮": "왼손/풀싹 초", "山": "뫼 산", "巛": "개천 천",
        "工": "장인 공", "己": "몸 기", "巾": "수건 건", "干": "방패 간", "幺": "작을 요", "广": "엄호",
        "廴": "민책받침", "廾": "밑스물 입", "弋": "주살 익", "弓": "활 궁", "彐": "돼지머리 계", "彡": "터럭 삼",
        "彳": "두인변",
        // 4획
        "心": "마음 심", "戈": "창 과", "戶": "지게 호", "手": "손 수", "支": "지탱할 지", "攴": "칠 복",
        "文": "글월 문", "斗": "말 두", "斤": "도끼 근", "方": "모 방", "无": "없을 무", "日": "날 일",
        "曰": "가로 왈", "月": "달 월", "木": "나무 목", "欠": "하품 흠", "止": "발 멈출 지", "歹": "뼈앙상할 알",
        "殳": "갖은등글월 문", "毋": "말 무", "比": "견줄 비", "毛": "털 모", "氏": "각시 씨", "气": "기운 기",
        "水": "물 수", "火": "불 화", "爪": "손톱 조", "父": "아비 부", "爻": "점괘 효", "爿": "장수 장 편",
        "片": "조각 편", "牙": "어금니 아", "牛": "소 우", "犬": "개 견",
        // 5획
        "玄": "검을 현", "玉": "구슬 옥", "瓜": "오이 과", "瓦": "기와 와", "甘": "달 감", "生": "날 생",
        "用": "쓸 용", "田": "밭 전", "疋": "발 소", "疒": "병질 엄", "癶": "필 발", "白": "흰 백",
        "皮": "가죽 피", "皿": "그릇 명", "目": "눈 목", "矛": "창 모", "矢": "화살 시", "石": "돌 석",
        "示": "보일 시", "禸": "짐승발자국 유", "禾": "벼 화", "穴": "구멍 혈", "立": "설 립",
        // 6획
        "竹": "대 죽", "米": "쌀 미", "糸": "실 사", "缶": "장군 부", "网": "그물 망", "羊": "양 양",
        "羽": "깃 우", "老": "늙을 로", "而": "말이을 이", "耒": "쟁기 뢰", "耳": "귀 이", "聿": "붓 율",
        "肉": "고기 육", "臣": "신하 신", "自": "스스로 자", "至": "이를 지", "臼": "절구 구", "舌": "혀 설",
        "舟": "배 주", "艮": "머무를 간", "色": "빛 색", "艸": "풀 초", "虍": "범 호 엄", "虫": "벌레 충",
        "血": "피 혈", "行": "갈 행", "衣": "옷 의", "襾": "덮을 아",
        // 7획
        "見": "볼 견", "角": "뿔 각", "言": "말씀 언", "谷": "골 곡", "豆": "콩 두", "豕": "돼지 시",
        "豸": "갖은돼지 발", "貝": "조개 패", "赤": "붉을 적", "走": "달릴 주", "足": "발 족", "身": "몸 신",
        "車": "수레 거", "辛": "매울 신", "辰": "별 진", "辵": "쉬엄쉬엄갈 착", "邑": "고을 읍", "酉": "닭 유",
        "釆": "분별할 변", "里": "마을 리",
        // 8획
        "金": "쇠 금", "長": "길 장", "門": "문 문", "阜": "언덕 부", "隶": "미칠 이", "隹": "새 추",
        "雨": "비 우", "靑": "푸를 청", "非": "아닐 비",
        // 9획
        "面": "낯 면", "革": "가죽 혁", "韋": "가죽 위", "韭": "부추 구", "音": "소리 음", "頁": "머리 혈",
        "風": "바람 풍", "飛": "날 비", "食": "밥 식", "首": "머리 수", "香": "향기 향",
        // 10획
        "馬": "말 마", "骨": "뼈 골", "高": "높을 고", "髟": "터럭 발", "鬥": "싸울 투", "鬯": "울창주 창",
        "鬲": "솥 력", "鬼": "귀신 귀",
        // 11획
        "魚": "물고기 어", "鳥": "새 조", "鹵": "소금밭 로", "鹿": "사슴 록", "麥": "보리 맥", "麻": "삼 마",
        // 12획
        "黃": "누를 황", "黍": "기장 서", "黑": "검을 흑", "黽": "맹꽁이 맹", "鼎": "솥 정", "鼓": "북 고",
        "鼠": "쥐 서",
        // 13획 이상
        "鼻": "코 비", "齊": "가지런할 제", "齒": "이 치", "龍": "용 용", "龜": "거북 귀", "龠": "피리 약"
    };

    function isKangxiRadical(char) {
        const radicals = "一丨丶丿乙亅二亠인儿入八冂冖冫几凵刀力勹匕匚匸十卜卩厂厶又口囗土士" +
            "夂夊夕대녀宀寸소屰尸屮山巛工己巾干幺广廴廾弋弓彐彡彳心戈戶手支攴" +
            "文斗斤方无日曰月木欠止歹殳毋비毛氏气水火爪父爻爿片야牛犬玄玉瓜瓦甘" +
            "생용田疋疒癶백피皿목矛矢石시禸禾구립竹米糸缶망양우老考이" +
            "耒귀聿肉신자지臼설주艮색艸虍충혈행의襾견각言곡두豕豸貝적주족신" +
            "車신진辵邑유釆리금長門阜체隹우靑비면혁韋구음頁풍비식수향馬골고" +
            "髟투鬯격귀어조鹵록맥마黃서흑黽정고서비齊치용구약" +
            "一丨丶丿乙亅二亠人儿入八冂冖冫几凵刀力勹匕匚匸十卜卩厂厶又口囗土士" +
            "夂夊夕大女子宀寸小屰尸屮山巛工己巾干幺广廴廾弋弓彐彡彳心戈戶手支攴" +
            "文斗斤方无日曰月木欠止歹殳毋比毛氏气水火爪父爻爿片牙牛犬玄玉瓜瓦감" +
            "生用田疋疒癶白皮皿목矛矢石示禸禾穴立竹米糸缶网羊羽老考而耒耳聿육" +
            "臣자지臼설주艮색艸虍충혈행의襾견각言곡두豕豸貝적주족신車辛辰辵" +
            "邑酉釆里金長門阜隶隹雨靑非面革韋韭음頁風飛식首香馬골高髟鬥鬯" +
            "鬲鬼魚鳥鹵鹿麥麻黃黍黑黽鼎鼓鼠鼻齊齒龍龜龠" +
            "亻氵忄扌犭礻衤辶阝艹刂⺈⺆⺌⺗⺘⺠⺧⺫⺯⺲⺶⺾⻀⻄⻎⺄⺆⺊⺌⺸⺻⺼";
        return radicals.includes(char);
    }

    // 6. Reverse Index Family Grid (O(1) search)
    function renderFamilyGrid(component) {
        familyGridContainer.innerHTML = "";
        
        const relativeList = reverseIndex[component] || [];
        
        if (relativeList.length === 0) {
            familyCount.textContent = "0";
            familyGridContainer.innerHTML = `
                <div class="empty-state">
                    <i class="ti ti-dna-2"></i>
                    <p>해당 요소를 포함하는 다른 배정한자가 없습니다.</p>
                </div>
            `;
            return;
        }
        
        // Remove active selected character from relative count if present
        const filteredList = relativeList.filter(c => c !== activeSelectedChar);
        familyCount.textContent = filteredList.length.toLocaleString();
        
        if (filteredList.length === 0) {
            familyGridContainer.innerHTML = `
                <div class="empty-state">
                    <i class="ti ti-dna-2"></i>
                    <p>이 한자만이 유일하게 해당 요소를 포함하고 있습니다.</p>
                </div>
            `;
            return;
        }

        // Group by grade (lv) using friendly Korean grade names
        const gradeGroups = {};
        filteredList.forEach(char => {
            const meta = hanjaDb[char];
            if (!meta) return;
            
            const gr = getFriendlyGrade(meta.lv) || "기타";
            if (!gradeGroups[gr]) gradeGroups[gr] = [];
            gradeGroups[gr].push(char);
        });

        // Sorted display by Korean Hanja Grade hierarchy (8급 to 특급)
        const gradeOrder = [
            "8급", "7급Ⅱ", "7급", "6급Ⅱ", "6급", "5급Ⅱ", "5급", "4급Ⅱ", "4급",
            "3급Ⅱ", "3급", "2급Ⅱ", "2급", "인명용", "1급", "Ⅱ급", "Ⅰ급", "특급"
        ];
        
        // Gather any other grades not listed in typical order
        const actualGrades = Object.keys(gradeGroups).sort((a, b) => {
            const idxA = gradeOrder.indexOf(a);
            const idxB = gradeOrder.indexOf(b);
            if (idxA === -1 && idxB === -1) return a.localeCompare(b);
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });

        actualGrades.forEach(grade => {
            const groupDiv = document.createElement("div");
            groupDiv.className = "family-level-group";
            
            groupDiv.innerHTML = `
                <div class="family-level-title">
                    <i class="ti ti-bookmark-glow"></i> 어문회 배정 한자 - ${grade} (${gradeGroups[grade].length}자)
                </div>
            `;
            
            const cellContainer = document.createElement("div");
            cellContainer.className = "family-grid-cells";
            
            gradeGroups[grade].forEach(char => {
                const meta = hanjaDb[char];
                const cleanMn = meta.mn.replace(/[:：\s]*\(?[:：]\)?$/g, "").trim();
                const cell = document.createElement("div");
                cell.className = "family-cell-card";
                cell.innerHTML = `
                    <span class="family-cell-char">${char}</span>
                    <span class="family-cell-reading">${meta.r} (${cleanMn})</span>
                `;
                
                cell.addEventListener("click", () => {
                    showHanjaDetails(char, true);
                    
                    // Auto-sync search result focus if visible
                    const activeResultCard = Array.from(document.querySelectorAll(".hanja-row-card"))
                        .find(card => card.querySelector(".char-avatar").textContent === char);
                        
                    if (activeResultCard) {
                        document.querySelectorAll(".hanja-row-card").forEach(c => c.classList.remove("active"));
                        activeResultCard.classList.add("active");
                        activeResultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }
                });
                
                cellContainer.appendChild(cell);
            });
            
            groupDiv.appendChild(cellContainer);
            familyGridContainer.appendChild(groupDiv);
        });
    }

    // 7. Recent Search History (LocalStorage Engine)
    // r: reading
    function saveToHistory(char) {
        try {
            let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
            
            // Remove duplication
            history = history.filter(c => c !== char);
            
            // Prepend new search
            history.unshift(char);
            
            // Limit to 8 records
            if (history.length > 8) history.pop();
            
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
            renderHistory();
        } catch (e) {
            console.error("LocalStorage write failed:", e);
        }
    }

    function renderHistory() {
        try {
            const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
            
            if (history.length === 0) {
                recentSearchesCard.classList.add("hidden");
                return;
            }
            
            recentSearchesCard.classList.remove("hidden");
            recentTagsContainer.innerHTML = "";
            
            history.forEach(char => {
                const meta = hanjaDb[char];
                if (!meta) return;
                
                const tag = document.createElement("div");
                tag.className = "recent-tag";
                tag.innerHTML = `<strong>${char}</strong> <span style="opacity: 0.7;">${meta.r}</span>`;
                
                tag.addEventListener("click", () => {
                    showHanjaDetails(char, true);
                });
                
                recentTagsContainer.appendChild(tag);
            });
        } catch (e) {
            console.error("LocalStorage read failed:", e);
        }
    }

    // 8. Event Listeners
    searchInput.addEventListener("input", handleSearch);
    
    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        activeQuery = "";
        handleSearch();
        searchInput.focus();
    });

    clearHistoryBtn.addEventListener("click", () => {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
    });

    familyComponentSelect.addEventListener("change", (e) => {
        renderFamilyGrid(e.target.value);
    });

    // Initialize application loading
    loadDatabases();
});
