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
                <p>한자, 한글 음, 혹은 부수 구성요소를 입력하여 분자 지도를 탐색해보세요.</p>
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
                    <p>분자 결합에 매치되는 한자가 데이터베이스에 없습니다.</p>
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
                <div class="row-right-badge level-badge">${meta.lv}</div>
            `;
            
            card.addEventListener("click", () => {
                // Highlight active row
                document.querySelectorAll(".hanja-row-card").forEach(c => c.classList.remove("active"));
                card.classList.add("active");
                
                showHanjaDetails(char);
            });
            
            resultsList.appendChild(card);
        });
    }

    // 5. Hanja Profile & LEGO IDS Tree Renderer
    function showHanjaDetails(char) {
        const meta = hanjaDb[char];
        if (!meta) return;
        
        activeSelectedChar = char;
        saveToHistory(char);
        
        // Hide empty viewer and show content viewer
        viewerEmptyState.classList.add("hidden");
        viewerContent.classList.remove("hidden");
        
        // Populate profile card
        // r: reading, mn: meaning, lv: grade, rd: radical, s1: strokes, s2: total_strokes
        const isCombo = meta.mn.includes('(:)') || meta.mn.includes('（：）') || meta.mn.includes('(：)');
        const isLong = !isCombo && (meta.mn.endsWith(':') || meta.mn.endsWith('：'));
        const cleanMeaning = meta.mn.replace(/[:：\s]*\(?[:：]\)?$/g, "").trim();
        
        // Render character with vowel mark if applicable
        let displayCharHtml = char;
        if (isCombo) {
            displayCharHtml += `<span class="vowel-mark-char">(:)</span>`;
        } else if (isLong) {
            displayCharHtml += `<span class="vowel-mark-char">:</span>`;
        }
        detailChar.innerHTML = displayCharHtml;
        
        detailReadingMeaning.textContent = `${meta.r} (${cleanMeaning})`;
        detailLevel.textContent = meta.lv;
        detailRadical.textContent = `${meta.rd} (획수: ${meta.s1}획)`;
        detailStrokes.textContent = `${meta.s2}획`;
        
        // Dynamic Vowel Length Badge styling
        const vowelItem = document.getElementById("detail-vowel-item");
        const vowelEl = document.getElementById("detail-vowel");
        if (vowelItem && vowelEl) {
            vowelItem.className = "badge-item"; // Reset class
            if (isCombo) {
                vowelItem.classList.add("vowel-long");
                vowelEl.innerHTML = `<strong>장단음 겸용 [(:)]</strong>`;
                vowelItem.querySelector("i").className = "ti ti-volume"; // volume icon
            } else if (isLong) {
                vowelItem.classList.add("vowel-long");
                vowelEl.innerHTML = `<strong>장음 [ː]</strong>`;
                vowelItem.querySelector("i").className = "ti ti-volume"; // volume icon
            } else {
                vowelItem.classList.add("vowel-short");
                vowelEl.innerHTML = `단음`; // Cleaned output
                vowelItem.querySelector("i").className = "ti ti-volume-3"; // volume-3 icon
            }
        }
        
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
        
        // If it represents an IDC Operator or anonymous sequence
        if (node.tp && !node.c) {
            const opBlock = document.createElement("div");
            opBlock.className = "lego-block type-op";
            
            // Map common IDC tags to friendly labels or keep the symbol
            const opLabel = node.tp === "SQ" ? "SEQ" : (node.tp === "CY" ? "CYCLE" : node.tp);
            opBlock.innerHTML = `<span class="lego-char">${opLabel}</span>`;
            nodeDiv.appendChild(opBlock);
            
            // Recurse children
            if (node.ch && node.ch.length > 0) {
                const childrenDiv = document.createElement("div");
                childrenDiv.className = "ids-tree-children";
                
                node.ch.forEach(child => {
                    childrenDiv.appendChild(buildLegoHtmlTree(child));
                });
                
                nodeDiv.appendChild(childrenDiv);
            }
        } 
        // Leaf Node
        else if (node.c) {
            const leafBlock = createLegoBlockNode(node.c);
            nodeDiv.appendChild(leafBlock);
        }
        
        return nodeDiv;
    }

    function createLegoBlockNode(char) {
        const block = document.createElement("div");
        
        // Find classification using obfuscated types (hj, rc, ot)
        let type = "other";
        let subText = "미분류";
        
        if (hanjaDb[char]) {
            type = "hanja";
            subText = `${hanjaDb[char].r} (${hanjaDb[char].lv})`;
        } else if (isKangxiRadical(char)) {
            type = "radical";
            subText = "부수";
        }
        
        // Bind correct CSS types: type-hanja, type-radical, type-other
        block.className = `lego-block type-${type}`;
        block.innerHTML = `
            <span class="lego-char">${char}</span>
            <span class="lego-desc">${subText}</span>
        `;
        
        // Add Navigation click event
        block.addEventListener("click", (e) => {
            e.stopPropagation();
            
            // Set query and trigger search
            searchInput.value = char;
            handleSearch();
            
            // If it is in DB, select it immediately
            if (hanjaDb[char]) {
                showHanjaDetails(char);
            }
        });
        
        return block;
    }

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
                    <p>해당 요소를 유전자로 공유하는 다른 배정한자가 없습니다.</p>
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
                    <p>이 한자가 해당 유전자를 독점적으로 품고 있습니다.</p>
                </div>
            `;
            return;
        }

        // Group by grade (lv)
        const gradeGroups = {};
        filteredList.forEach(char => {
            const meta = hanjaDb[char];
            if (!meta) return;
            
            const gr = meta.lv || "기타";
            if (!gradeGroups[gr]) gradeGroups[gr] = [];
            gradeGroups[gr].push(char);
        });

        // Sorted display by Korean Hanja Grade hierarchy (8급 to 특급)
        const gradeOrder = [
            "8급", "준7급", "7급", "준6급", "6급", "준5급", "5급", "준4급", "4급",
            "준3급", "3급", "준2급", "2급", "준1급", "1급", "II급", "I급", "특급"
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
                const cell = document.createElement("div");
                cell.className = "family-cell-card";
                cell.innerHTML = `
                    <span class="family-cell-char">${char}</span>
                    <span class="family-cell-reading">${hanjaDb[char].r}</span>
                `;
                
                cell.addEventListener("click", () => {
                    showHanjaDetails(char);
                    
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
                    showHanjaDetails(char);
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
