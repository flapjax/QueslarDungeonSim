
import { FightersSquad } from "./squads/FightersSquad.js";
import { MobsSquad } from "./squads/MobsSquad.js";
import { Battle } from "./battle/Battle.js";
import { Fighter, FighterClasses } from "./characters/Fighter.js";
import { I18nManager, formatString } from "./utils/i18n.js";
import { ArmoryItem } from "./armory/ArmoryItem.js";
import { calculateFighterCost, millify, calculateTierLevel, MAX_TIER } from "./utils/utils.js";

// --- GLOBAL SHARED ELEMENTS ---
const importConfirmModal = document.getElementById("importConfirmModal");
const confirmImportBtn = document.getElementById("confirmImport");
const cancelImportBtn = document.getElementById("cancelImport");
const dontShowImportWarningEl = document.getElementById(
    "dontShowImportWarning",
);

const fighterModal = document.getElementById("fighterModal");
const closeFighterModal = document.getElementById("closeFighterModal");
const saveFighterBtn = document.getElementById("saveFighter");
const fighterClassSelect = document.getElementById("fighterClass");
const fighterNameInput = document.getElementById("fighterName");
const modifiedFighterCostEl = document.getElementById("modifiedFighterCost");
const staticFighterCostEl = document.getElementById("staticFighterCost");

const itemModal = document.getElementById("itemModal");
const closeItemModal = document.getElementById("closeItemModal");
const saveItemBtn = document.getElementById("saveItem");
const itemNameInput = document.getElementById("itemName");
const itemTabbedContent = document.getElementById("itemTabbedContent");
const itemOriginalFreeValuesForm = document.getElementById("itemOriginalFreeValuesForm");
const itemStatsFreeValuesContainerTab = document.getElementById("itemStatsFreeValuesContainerTab");
const itemStatsOriginalFreeValuesContainer = document.getElementById("itemStatsOriginalFreeValuesContainer");
const itemStatsLevelTiersContainer = document.getElementById("itemStatsLevelTiersContainer");
const itemLevelInput = document.getElementById("itemLevel");
const calculatedStatsDisplay = document.getElementById("calculatedStatsDisplay");
const levelTiersContent = document.getElementById("levelTiersContent");
const freeValuesContent = document.getElementById("freeValuesContent");
const tabButtons = itemModal.querySelectorAll(".tab-button");

const changelogLink = document.getElementById("changelogLink");
const changelogModal = document.getElementById("changelogModal");
const closeChangelog = document.getElementById("closeChangelog");
const lastUpdatedEl = document.getElementById("lastUpdated");

// --- CONSTANTS & GLOBAL HELPERS ---
const FIGHTER_STAT_FIELDS = [
    "fighter_health", "fighter_damage", "fighter_hit", "fighter_defense", "fighter_crit", "fighter_dodge",
    "object_health", "object_damage", "object_hit", "object_defense", "object_crit", "object_dodge",
    "object_lifesteal", "object_crit_chance", "object_multistrike", "object_thorns", "object_regen", "object_healing"
];
const STAT_SERIALIZATION_MAP = {
    fighter_health: "fh", fighter_damage: "fd", fighter_hit: "fi", fighter_defense: "fdef", fighter_crit: "fcr", fighter_dodge: "fdo",
    object_health: "oh", object_damage: "od", object_hit: "oi", object_defense: "odef", object_crit: "ocr", object_dodge: "odo",
    object_lifesteal: "ols", object_crit_chance: "occ", object_multistrike: "oms", object_thorns: "oth", object_regen: "org", object_healing: "oheal",
};
const STAT_DESERIALIZATION_MAP = Object.fromEntries(Object.entries(STAT_SERIALIZATION_MAP).map(([k, v]) => [v, k]));

const ALL_STAT_TYPES = ["health", "damage", "hit", "defense", "critDamage", "dodge", "lifesteal", "critChance", "multistrike", "thorns", "regen", "healing"];

//Create i18n Manager
const I18N = new I18nManager();
let classDescriptions = null;
await I18N.initPromise;

I18N.initPromise.then(() => {
    classDescriptions = I18N.getClassDescription();
});

window.i18nManager = I18N;

function createDuplicateIcon() {
    const div = document.createElement('div');
    div.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M15 3H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"></path>
    <path d="M19 7h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2"></path>
  </svg>`.trim();
    return div.firstChild;
}

function duplicateItem(originalItem) {
    if (!originalItem) return null;
    const duplicateData = JSON.parse(JSON.stringify(originalItem));
    duplicateData._id = `copy_${Date.now()}`;
    duplicateData.name = `Copy of ${originalItem.name}`;
    return new ArmoryItem(duplicateData);
}

const classTooltip = document.createElement("div");
classTooltip.id = "classTooltip";
document.body.appendChild(classTooltip);

for (const value of Object.values(FighterClasses)) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = I18N.getFighterName(value.replace(" ", "_"));
    fighterClassSelect.appendChild(opt);
}

fighterClassSelect.style.display = "none";
const customDropdown = document.createElement("div");
customDropdown.className = "custom-dropdown";
const dropdownButton = document.createElement("button");
dropdownButton.type = "button";
dropdownButton.className = "custom-dropdown-button";
dropdownButton.innerHTML = `${I18N.getFighterName(FighterClasses.NONE)} <span>▼</span>`;
const dropdownOptions = document.createElement("div");
dropdownOptions.className = "custom-dropdown-options";

Object.values(FighterClasses).forEach((className) => {
    const option = document.createElement("div");
    option.className = "custom-dropdown-option";
    option.textContent = I18N.getFighterName(className.replace(" ", "_").toUpperCase());
    option.dataset.i18n = `FighterName.${className.replace(" ", "_").toUpperCase()}`;
    option.dataset.value = className;
    option.addEventListener("mouseenter", (e) => {
        const description = classDescriptions[className];
        if (description) {
            classTooltip.textContent = description;
            classTooltip.style.left = `${e.pageX + 10}px`;
            classTooltip.style.top = `${e.pageY - 30}px`;
            classTooltip.classList.add("visible");
        }
    });
    option.addEventListener("mousemove", (e) => {
        if (classTooltip.classList.contains("visible")) {
            classTooltip.style.left = `${e.pageX + 10}px`;
            classTooltip.style.top = `${e.pageY - 30}px`;
        }
    });
    option.addEventListener("mouseleave", () => { classTooltip.classList.remove("visible"); });
    option.addEventListener("click", () => {
        fighterClassSelect.value = className;
        dropdownButton.innerHTML = `${I18N.getFighterName(className)} <span>▼</span>`;
        dropdownOptions.classList.remove("open");
        dropdownButton.classList.remove("open");
        classTooltip.classList.remove("visible");
        fighterClassSelect.dispatchEvent(new Event("change"));
    });
    dropdownOptions.appendChild(option);
});

dropdownButton.addEventListener("click", () => {
    dropdownOptions.classList.toggle("open");
    dropdownButton.classList.toggle("open");
});
document.addEventListener("click", (e) => {
    if (!customDropdown.contains(e.target)) {
        dropdownOptions.classList.remove("open");
        dropdownButton.classList.remove("open");
        classTooltip.classList.remove("visible");
    }
});
customDropdown.appendChild(dropdownButton);
customDropdown.appendChild(dropdownOptions);
fighterClassSelect.parentNode.insertBefore(customDropdown, fighterClassSelect.nextSibling);

function duplicateFighter(originalFighter) {
    if (!originalFighter) return null;
    const originalRawData = originalFighter.__raw || {};
    const newRawData = { ...originalRawData };
    newRawData.isDuplicate = true;
    newRawData.base = {
        name: originalFighter.name,
        fighter_class: originalFighter.fighter_class,
    };
    newRawData.name = formatString(I18N.getUIElement("DUPLICATE_NAME"), originalFighter.name);
    const duplicate = new Fighter(originalFighter.fighter_class, newRawData);
    duplicate.__raw = { ...newRawData };
    return duplicate;
}

function serializeFighter(f) {
    if (!f) return null;
    const raw = f.__raw || {};
    const serialized = { fc: f.fighter_class, name: f.name };
    for (const [key, shortKey] of Object.entries(STAT_SERIALIZATION_MAP)) {
        if (raw[key]) serialized[shortKey] = raw[key];
    }
    if (f.isDuplicate) serialized.d = true;
    if (f.base) serialized.base = f.base;
    if (f.equippedItemId) serialized.eId = f.equippedItemId;
    return serialized;
}

function deserializeFighter(obj) {
    if (!obj || !obj.fc) return null;
    const data = { name: obj.name };
    for (const [shortKey, longKey] of Object.entries(STAT_DESERIALIZATION_MAP)) {
        data[longKey] = Math.max(0, obj[shortKey] || 0);
    }
    data.isDuplicate = obj.d || false;
    data.base = obj.base || null;
    data.equippedItemId = obj.eId || null;
    try {
        const fighter = new Fighter(obj.fc, data);
        fighter.__raw = { ...data };
        fighter.name = data.name;
        return fighter;
    } catch (error) {
        console.warn("Failed to deserialize fighter:", obj, error);
        return null;
    }
}

function serializeItem(item) {
    if (!item) return null;
    return { id: item.id, name: item.name, r: item.rarity, s: item.stats, lvl: item.level, tiers: item.tiers };
}

function deserializeItem(obj) {
    if (!obj) return null;
    try {
        const itemData = { _id: obj.id, name: obj.name, rarity: obj.r, stats: obj.s, level: obj.lvl, tiers: obj.tiers };
        return new ArmoryItem(itemData);
    } catch (error) {
        console.warn(I18N.getConsoleMsg("ERR_FAIL_LOAD_ITEM"), obj, error);
        return null;
    }
}

class DungeonSim {
    constructor(tabName) {
        this.tabName = tabName;
        const getElementId = (baseId) => (tabName === 'dungeon' ? baseId : `${baseId}-caves`);

        this.fightersGridEl = document.getElementById(getElementId("fightersGrid"));
        this.verboseEl = document.getElementById(getElementId("verbose"));
        this.mobLevelEl = document.getElementById(getElementId("mobLevel"));
        this.dungeonsPerMinuteEl = document.getElementById(getElementId("dungeonsPerMinute"));
        this.numBattlesEl = document.getElementById(getElementId("numBattles"));
        this.outputEl = document.getElementById(getElementId("output"));
        this.fightBtn = document.getElementById(getElementId("fightBtn"));
        this.clearLogBtn = document.getElementById(getElementId("clearLogBtn"));
        this.createSnapshotBtn = document.getElementById(getElementId("createSnapshotBtn"));
        this.snapshotOutputField = document.getElementById(getElementId("snapshotOutputField"));
        this.loadSnapshotBtn = document.getElementById(getElementId("loadSnapshotBtn"));
        this.totalFightersCostEl = document.getElementById(getElementId("totalFightersCost"));
        this.apiKeyEl = document.getElementById(getElementId("apiKey"));
        this.importBtn = document.getElementById(getElementId("importBtn"));
        this.benchGridEl = document.getElementById(getElementId("benchGrid"));
        this.addToBenchBtn = document.getElementById(getElementId("addToBench"));
        this.armoryGridEl = document.getElementById(getElementId("armoryGrid"));
        this.addToArmoryBtn = document.getElementById(getElementId("addToArmory"));

        this.LS_KEYS = {
            grid: `${tabName}:gridState:v1`,
            bench: `${tabName}:benchState:v1`,
            armory: `${tabName}:armoryState:v1`,
            mobLevel: `${tabName}:mobLevel`,
            dungeonsPerMinute: `${tabName}:dungeonsPerMinute`,
            numBattles: `${tabName}:numBattles`,
            verbose: `${tabName}:verbose`,
            apiKey: `${tabName}:apiKey`,
            dontShowImportWarning: "dungeon:dontShowImportWarning", // This can be shared
        };

        this.gridState = Array.from({ length: 3 }, () => Array.from({ length: 2 }, () => null));
        this.benchState = [];
        this.armoryState = [];
        this.editingCell = { i: 0, j: 0 };
        this.editingBench = { index: -1, isAddNew: false };
        this.editingArmory = { index: -1 };

        this.draggedElement = null;
        this.draggedData = null;
    }

    init() {
        this.loadState();
        this.renderGrid();
        this.renderBench();
        this.renderArmory();
        this.attachEventListeners();
        this.setupItemTabListeners(); // New call

        I18N.on("languageChanged", () => {
            this.renderGrid();
            this.renderBench();
            this.renderArmory();
        });
    }

    attachEventListeners() {
        this.fightBtn.addEventListener("click", () => this.runBattles());
        this.clearLogBtn.addEventListener("click", () => { this.outputEl.innerHTML = ""; });
        this.createSnapshotBtn.addEventListener("click", () => this.createSnapshot());
        this.loadSnapshotBtn.addEventListener("click", () => this.loadSnapshot());
        this.importBtn.addEventListener("click", () => this.handleImportClick());
        this.addToBenchBtn.addEventListener("click", () => this.openAddToBenchEditor());
        this.addToArmoryBtn.addEventListener("click", () => this.openAddToArmoryEditor());

        this.mobLevelEl.addEventListener("input", () => this.saveState());
        if (this.dungeonsPerMinuteEl) this.dungeonsPerMinuteEl.addEventListener("input", () => this.saveState());
        this.numBattlesEl.addEventListener("input", () => this.saveState());
        if (this.verboseEl) this.verboseEl.addEventListener("input", () => this.saveState());
        this.apiKeyEl.addEventListener("input", () => this.saveState());
        dontShowImportWarningEl.addEventListener("change", () => this.saveState());
    }

    setupItemTabListeners() {
        tabButtons.forEach(button => {
            button.addEventListener("click", () => this.handleItemTabClick(button));
        });
    }

    saveState() {
        const raw = this.gridState.map((row) => row.map(serializeFighter));
        const benchRaw = this.benchState.map(serializeFighter);
        const armoryRaw = this.armoryState.map(serializeItem);
        localStorage.setItem(this.LS_KEYS.grid, JSON.stringify(raw));
        localStorage.setItem(this.LS_KEYS.bench, JSON.stringify(benchRaw));
        localStorage.setItem(this.LS_KEYS.armory, JSON.stringify(armoryRaw));
        localStorage.setItem(this.LS_KEYS.mobLevel, String(this.mobLevelEl.value || ""));
        if (this.dungeonsPerMinuteEl) {
            localStorage.setItem(this.LS_KEYS.dungeonsPerMinute, String(this.dungeonsPerMinuteEl.value || ""));
        }
        localStorage.setItem(this.LS_KEYS.numBattles, String(this.numBattlesEl.value || ""));
        if (this.verboseEl) localStorage.setItem(this.LS_KEYS.verbose, this.verboseEl.checked ? "1" : "0");
        localStorage.setItem(this.LS_KEYS.apiKey, String(this.apiKeyEl.value || ""));
        localStorage.setItem(
            this.LS_KEYS.dontShowImportWarning,
            dontShowImportWarningEl.checked ? "1" : "0",
        );
    }

    loadState() {
        try {
            const raw = JSON.parse(localStorage.getItem(this.LS_KEYS.grid) || "null");
            if (Array.isArray(raw) && raw.length === 3) {
                for (let i = 0; i < 3; i++) {
                    if (Array.isArray(raw[i]) && raw[i].length === 2) {
                        for (let j = 0; j < 2; j++) {
                            this.gridState[i][j] = deserializeFighter(raw[i][j]);
                        }
                    }
                }
            }
        } catch (error) {
            console.warn(`Failed to load grid state for ${this.tabName}:`, error);
            localStorage.removeItem(this.LS_KEYS.grid);
        }

        try {
            const benchRaw = JSON.parse(localStorage.getItem(this.LS_KEYS.bench) || "[]");
            if (Array.isArray(benchRaw)) {
                this.benchState.length = 0;
                benchRaw.forEach((data) => {
                    const fighter = deserializeFighter(data);
                    if (fighter) this.benchState.push(fighter);
                });
            }
        } catch (error) {
            console.warn(`Failed to load bench state for ${this.tabName}:`, error);
            localStorage.removeItem(this.LS_KEYS.bench);
        }

        try {
            const armoryRaw = JSON.parse(localStorage.getItem(this.LS_KEYS.armory) || "[]");
            if (Array.isArray(armoryRaw)) {
                this.armoryState.length = 0;
                armoryRaw.forEach((data) => {
                    const item = deserializeItem(data);
                    if (item) this.armoryState.push(item);
                });
                this.renderArmory();
            }
        } catch (error) {
            console.warn(`Failed to load armory state for ${this.tabName}:`, error);
            localStorage.removeItem(this.LS_KEYS.armory);
        }

        const mob = localStorage.getItem(this.LS_KEYS.mobLevel);
        const dung = localStorage.getItem(this.LS_KEYS.dungeonsPerMinute);
        const num = localStorage.getItem(this.LS_KEYS.numBattles);
        const ver = localStorage.getItem(this.LS_KEYS.verbose);
        const api = localStorage.getItem(this.LS_KEYS.apiKey);

        if (mob) this.mobLevelEl.value = Math.max(1, parseInt(mob) || 1);
        if (dung && this.dungeonsPerMinuteEl) this.dungeonsPerMinuteEl.value = Math.max(1, parseFloat(dung) || 1);
        if (num) this.numBattlesEl.value = Math.max(1, parseInt(num) || 1);
        if (ver && this.verboseEl) this.verboseEl.checked = ver === "1";
        if (api) this.apiKeyEl.value = api;

        const dontShow = localStorage.getItem(this.LS_KEYS.dontShowImportWarning);
        if (dontShow) dontShowImportWarningEl.checked = dontShow === "1";
    }

    ensureActiveTabVisibility() {
        const activeTabContent = document.getElementById(`${this.tabName}-content`);
        if (activeTabContent) {
            activeTabContent.classList.add('active'); // Re-add active class to ensure display: block
        }
    }

    getBonusesFromItem(item) {
        const bonuses = {
            object_health: 0,
            object_damage: 0,
            object_hit: 0,
            object_defense: 0,
            object_crit: 0,
            object_dodge: 0,
            object_lifesteal: 0,
            object_crit_chance: 0,
            object_multistrike: 0,
            object_thorns: 0,
            object_regen: 0,
            object_healing: 0,
        };
        if (!item || !item.stats) return bonuses;

        item.stats.forEach((stat) => {
            const statType = stat.type.toLowerCase();
            const value = stat.value || 0;

            if (statType.includes("health")) bonuses.object_health += value;
            else if (statType.includes("damage") && !statType.includes("crit"))
                bonuses.object_damage += value;
            else if (statType.includes("hit")) bonuses.object_hit += value;
            else if (statType.includes("defense")) bonuses.object_defense += value;
            else if (
                statType === "critdamage" ||
                statType === "crit_damage" ||
                statType === "critical_damage"
            ) {
                bonuses.object_crit += value;
            }
            else if (statType.includes("dodge")) bonuses.object_dodge += value;
            else if (statType.includes("lifesteal")) bonuses.object_lifesteal += value;
            else if (
                statType === "critchance" ||
                statType === "crit_chance" ||
                statType === "critical_chance"
            ) {
                bonuses.object_crit_chance += value;
            }
            else if (statType.includes("multistrike")) bonuses.object_multistrike += value;
            else if (statType.includes("thorns")) bonuses.object_thorns += value;
            else if (statType.includes("regen")) bonuses.object_regen += value;
            else if (statType.includes("healing")) bonuses.object_healing += value;
        });
        console.log(bonuses.object_crit_chance)
        return bonuses;
    }

    updateTotalFightersCost() {

        let totalCost = 0;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                const fighter = this.gridState[i][j];
                if (fighter) {
                    const fighterStats = {
                        fighter_health: fighter.__raw.fighter_health || 0,
                        fighter_damage: fighter.__raw.fighter_damage || 0,
                        fighter_hit: fighter.__raw.fighter_hit || 0,
                        fighter_defense: fighter.__raw.fighter_defense || 0,
                        fighter_crit: fighter.__raw.fighter_crit || 0,
                        fighter_dodge: fighter.__raw.fighter_dodge || 0,
                    };
                    totalCost += calculateFighterCost(fighterStats);
                }
            }
        }
        this.totalFightersCostEl.textContent = `${I18N.getUIElement("TOTAL_FIGHTERS_COST")}${millify(totalCost)}`;
    }

    createFighterInfoElement(fighter) {
        const infoContainer = document.createElement("div");
        infoContainer.className = "fighter-info";

        if (fighter) {
            const classDetails = document.createElement("div");
            classDetails.className = "fighter-class-details";
            classDetails.textContent = I18N.getFighterName(fighter.fighter_class);

            const fighterName = document.createElement("div");
            fighterName.className = "fighter-name-details";
            fighterName.textContent = fighter.name;

            const itemDetails = document.createElement("div");
            itemDetails.className = "fighter-item-details";
            const equippedItem = this.armoryState.find(item => item.id === fighter.equippedItemId);
            const itemName = equippedItem ? equippedItem.name : I18N.getUIElement("NO_ITEM");
            itemDetails.textContent = itemName.substring(0, 25) + (itemName.length > 25 ? "..." : "");

            infoContainer.append(classDetails, fighterName, itemDetails);
        } else {
            infoContainer.textContent = I18N.getFighterName("Empty");
        }
        return infoContainer;
    }

    renderGrid() {
        this.fightersGridEl.innerHTML = "";
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                const cell = document.createElement("div");
                const fighter = this.gridState[i][j];

                cell.className = fighter ? "fighter-cell" : "fighter-cell empty";
                cell.draggable = !!fighter;
                cell.dataset.gridPosition = `${i},${j}`;
                cell.dataset.tab = this.tabName;

                cell.addEventListener("click", (e) => {
                    if (e.target.tagName !== "BUTTON") this.openFighterEditor(i, j);
                });

                cell.addEventListener("dragenter", (e) => {
                    e.preventDefault();
                    if (activeSim.draggedData && cell !== activeSim.draggedElement) cell.classList.add("drag-over");
                });
                cell.addEventListener("dragleave", (e) => {
                    if (!cell.contains(e.relatedTarget)) cell.classList.remove("drag-over");
                });

                if (fighter) {
                    cell.addEventListener("dragstart", (e) => this.handleDragStart(e));
                    cell.addEventListener("dragend", (e) => this.handleDragEnd(e));
                }
                cell.addEventListener("dragover", (e) => this.handleDragOver(e));
                cell.addEventListener("drop", (e) => this.handleDrop(e));

                const name = document.createElement("span");
                name.className = "name";
                name.appendChild(this.createFighterInfoElement(fighter));
                cell.appendChild(name);

                if (fighter) {
                    const buttonContainer = document.createElement("div");
                    buttonContainer.className = "fighter-buttons";

                    const del = document.createElement("button");
                    del.className = "btn small delete";
                    del.textContent = I18N.getUIElement("Delete");
                    del.style.width = "55px";
                    del.style.height = "25px";
                    del.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.gridState[i][j] = null;
                        this.saveState();
                        this.renderGrid();
                        this.updateTotalFightersCost();
                    });

                    const duplicate = document.createElement("button");
                    duplicate.className = "btn small duplicate";
                    duplicate.title = I18N.getUIElement("Duplicate");
                    duplicate.style.width = "55px";
                    duplicate.style.height = "25px";
                    duplicate.appendChild(createDuplicateIcon());
                    duplicate.addEventListener("click", (e) => {
                        e.stopPropagation();
                        const duplicatedFighter = duplicateFighter(fighter);
                        if (duplicatedFighter) {
                            this.benchState.push(duplicatedFighter);
                            this.saveState();
                            this.renderBench();
                        }
                    });
                    buttonContainer.append(del, duplicate);
                    cell.appendChild(buttonContainer);
                } else {
                    const add = document.createElement("button");
                    add.className = "btn small add";
                    add.textContent = I18N.getUIElement("Add");
                    add.style.width = "55px";
                    add.style.height = "30px";
                    add.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.openFighterEditor(i, j);
                    });
                    cell.appendChild(add);
                }
                this.fightersGridEl.appendChild(cell);
            }
        }
        this.updateTotalFightersCost();
    }

    renderBench() {
        this.benchGridEl.innerHTML = "";
        if (this.benchState.length === 0) {
            const placeholder = document.createElement("div");
            placeholder.className = "bench-fighter";
            placeholder.dataset.tab = this.tabName;
            placeholder.style.cssText = "opacity: 0.3; border: 2px dashed #36405a; background: transparent; text-align: center; color: #8892b0; font-size: 0.9em; min-height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 10px; padding: 0 0.66em; width: 100%;";
            placeholder.textContent = I18N.getUIElement("DROP_FIGHTER_HERE");
            placeholder.addEventListener("dragover", (e) => this.handleDragOver(e));
            placeholder.addEventListener("drop", (e) => this.handleDrop(e));
            this.benchGridEl.appendChild(placeholder);
            return;
        }

        this.benchState.forEach((fighter, index) => {
            const benchItem = document.createElement("div");
            benchItem.className = "bench-fighter";
            benchItem.draggable = true;
            benchItem.dataset.benchIndex = index;
            benchItem.dataset.tab = this.tabName;
            benchItem.style.width = "100%";

            benchItem.addEventListener("dragstart", (e) => this.handleDragStart(e));
            benchItem.addEventListener("dragend", (e) => this.handleDragEnd(e));
            benchItem.addEventListener("dragover", (e) => this.handleDragOver(e));
            benchItem.addEventListener("drop", (e) => this.handleDrop(e));

            benchItem.addEventListener("click", (e) => {
                if (e.target.tagName !== "BUTTON") this.openBenchFighterEditor(index);
            });

            const nameContainer = document.createElement("div");
            nameContainer.style.cssText = "flex: 1; display: flex; align-items: center; justify-content: center; min-width: 0; width: 100%;";

            const name = document.createElement("span");
            name.className = "name";
            name.style.cssText = "text-align: center; width: 100%;";
            name.appendChild(this.createFighterInfoElement(fighter));

            nameContainer.appendChild(name);
            benchItem.appendChild(nameContainer);

            const actions = document.createElement("div");
            actions.style.cssText = "display: flex; flex-direction: column; align-items: center; gap: 0.1em; flex-shrink: 0;";

            const del = document.createElement("button");
            del.className = "btn small delete";
            del.textContent = "×";
            del.style.cssText = "font-size: 0.8em; padding: 0.2em; width: 40px; height: 20px; display: flex; align-items: center; justify-content: center;";
            del.addEventListener("click", (e) => {
                e.stopPropagation();
                this.benchState.splice(index, 1);
                this.saveState();
                this.renderBench();
            });

            const duplicate = document.createElement("button");
            duplicate.className = "btn small duplicate";
            duplicate.title = I18N.getUIElement("Duplicate");
            duplicate.style.cssText = "padding: 0.2em; width: 40px; height: 20px; display: flex; align-items: center; justify-content: center;";
            duplicate.appendChild(createDuplicateIcon());
            duplicate.addEventListener("click", (e) => {
                e.stopPropagation();
                const duplicatedFighter = duplicateFighter(fighter);
                if (duplicatedFighter) {
                    this.benchState.push(duplicatedFighter);
                    this.saveState();
                    this.renderBench();
                }
            });
            actions.append(del, duplicate);
            benchItem.appendChild(actions);
            this.benchGridEl.appendChild(benchItem);
        });
    }

    renderArmory() {
        this.armoryGridEl.innerHTML = "";
        this.armoryState.forEach((item, index) => {
            const itemEl = document.createElement("div");
            itemEl.className = "armory-item";
            itemEl.draggable = true;
            itemEl.dataset.armoryIndex = index;
            itemEl.dataset.tab = this.tabName;

            const mainContent = document.createElement("div");
            mainContent.style.flex = "1";
            mainContent.addEventListener("click", () => this.openItemEditor(index));

            const nameEl = document.createElement("div");
            nameEl.className = "name";
            nameEl.textContent = item.name.substring(0, 30) + (item.name.length > 30 ? "..." : "");
            mainContent.appendChild(nameEl);

            const rarityEl = document.createElement("div");
            rarityEl.className = "rarity";
            rarityEl.textContent = item.rarity;

            const customRarityText = I18N.getTranslation("ITEM_RARITY_CUSTOM");

            const isCustomFreeValueItem = (item.rarity === customRarityText && Object.keys(item.tiers).length === 0);

            if (item.level && item.level > 0 && !isCustomFreeValueItem) {
                rarityEl.textContent += ` - Level ${item.level}`;
            }
            mainContent.appendChild(rarityEl);

            itemEl.appendChild(mainContent);

            const actions = document.createElement("div");
            actions.style.display = "flex";
            actions.style.flexDirection = "column";
            actions.style.alignItems = "center";
            actions.style.gap = "0.1em";
            actions.style.flexShrink = "0";
            actions.style.width = "40px";

            const del = document.createElement("button");
            del.className = "btn small delete";
            del.textContent = "×";
            del.title = I18N.getUIElement("DELETE");
            del.style.width = "100%";
            del.style.padding = "0.1em 0.2em";
            del.addEventListener("click", (e) => {
                e.stopPropagation();
                this.armoryState.splice(index, 1);
                this.saveState();
                this.renderArmory();
            });

            const duplicate = document.createElement("button");
            duplicate.className = "btn small duplicate";
            duplicate.title = I18N.getUIElement("DUPLICATE");
            duplicate.style.width = "100%";
            duplicate.style.padding = "0.1em 0.2em";
            const duplicateIcon = createDuplicateIcon();
            duplicateIcon.style.width = "16px";
            duplicateIcon.style.height = "16px";
            duplicate.appendChild(duplicateIcon);
            duplicate.addEventListener("click", (e) => {
                e.stopPropagation();
                const newItem = duplicateItem(item);
                if (newItem) {
                    this.armoryState.push(newItem);
                    this.saveState();
                    this.renderArmory();
                }
            });

            actions.appendChild(del);
            actions.appendChild(duplicate);
            itemEl.appendChild(actions);

            itemEl.addEventListener("dragstart", (e) => this.handleDragStart(e));
            itemEl.addEventListener("dragend", (e) => this.handleDragEnd(e));
            this.armoryGridEl.appendChild(itemEl);
        });
    }

    renderLevelTiersInputs(item) {
        itemStatsLevelTiersContainer.innerHTML = ""; // Clear previous inputs

        ALL_STAT_TYPES.forEach(statType => {
            const tierValue = item.tiers ? (item.tiers[statType] || 0) : 0;

            const statRow = document.createElement("div");
            statRow.style.display = "grid";
            statRow.style.gridTemplateColumns = "1fr auto 1fr"; // Label, "T", input
            statRow.style.gap = "0.8em";
            statRow.style.alignItems = "center";

            const label = document.createElement("label");
            label.textContent = I18N.getTranslation(
                "stat_" + statType.replace(/([A-Z])/g, "_$1").toLowerCase(),
            );
            statRow.appendChild(label);

            const tSpan = document.createElement("span");
            tSpan.textContent = "T";
            tSpan.style.marginRight = "0.2em"; // Small space between "T" and input
            statRow.appendChild(tSpan);

            const input = document.createElement("input");
            input.type = "number";
            input.dataset.statType = statType;
            input.min = "0";
            input.max = MAX_TIER;
            input.value = tierValue;
            input.addEventListener("input", () => this.calculateAndDisplayTieredStats());
            statRow.appendChild(input);

            itemStatsLevelTiersContainer.appendChild(statRow);
        });

        itemLevelInput.addEventListener("input", () => this.calculateAndDisplayTieredStats());
    }

    calculateAndDisplayTieredStats() {
        const level = parseInt(itemLevelInput.value) || 1;
        const stats = {};
        let displayText = "";

        ALL_STAT_TYPES.forEach(statType => {
            const input = itemStatsLevelTiersContainer.querySelector(`input[data-stat-type="${statType}"]`);
            const tier = parseInt(input.value) || 0;

            if (tier > 0) {
                const calculatedValue = calculateTierLevel(statType, level, tier);
                stats[statType] = calculatedValue;
                if (["critDamage", "lifesteal", "critChance", "multistrike", "thorns", "regen"].includes(statType)) {
                    const displayValue = calculatedValue * 100; // Multiply by 100 for display
                    displayText += `${I18N.getTranslation("stat_" + statType.toLowerCase())}: ${displayValue.toFixed(2)}% (T${tier})\n`;
                } else {
                    displayText += `${I18N.getTranslation("stat_" + statType.toLowerCase())}: ${Math.round(calculatedValue)} (T${tier})\n`;
                }
            } else {
                stats[statType] = 0; // Ensure stats not present have a value of 0
            }
        });
        calculatedStatsDisplay.textContent = displayText || I18N.getTranslation("NO_TIERED_STATS_SELECTED");
        return stats;
    }

    renderOriginalFreeValuesInputs(item) {
        itemStatsOriginalFreeValuesContainer.innerHTML = ""; // Clear previous inputs

        ALL_STAT_TYPES.forEach((statType) => {
            const existingStat = item.stats.find((s) => s.type === statType);
            let value = existingStat ? existingStat.value : 0;

            const statRow = document.createElement("div");
            statRow.style.display = "grid";
            statRow.style.gridTemplateColumns = "1fr 1fr 30px";
            statRow.style.gap = "0.8em";
            statRow.style.alignItems = "center";

            const label = document.createElement("label");
            let labelText = I18N.getTranslation(
                "stat_" + statType.replace(/([A-Z])/g, "_$1").toLowerCase(),
            );
            const tier = item.tiers ? (item.tiers[statType] || 0) : 0;
            if (tier > 0) {
                labelText += ` (T${tier})`;
            }
            label.textContent = labelText;
            statRow.appendChild(label);

            const input = document.createElement("input");
            input.type = "number";
            input.dataset.statType = statType;
            input.value = (["critDamage", "lifesteal", "critChance", "multistrike", "thorns", "regen"].includes(statType)) ? value.toFixed(2) : Math.round(value);
            statRow.appendChild(input);

            const percentSign = document.createElement("span");
            percentSign.textContent = (["critDamage", "lifesteal", "critChance", "multistrike", "thorns", "regen"].includes(statType)) ? "%" : "";
            statRow.appendChild(percentSign);

            itemStatsOriginalFreeValuesContainer.appendChild(statRow);
        });
    }

    openFighterEditor(i, j) {
        this.editingCell = { i, j };
        this.editingBench = { index: -1, isAddNew: false };
        const fighter = this.gridState[i][j];
        this.populateFighterModal(fighter);
        fighterModal.style.display = "flex";
    }

    openBenchFighterEditor(index) {
        this.editingBench = { index, isAddNew: false };
        this.editingCell = { i: -1, j: -1 };
        const fighter = this.benchState[index];
        this.populateFighterModal(fighter);
        fighterModal.style.display = "flex";
    }

    openAddToBenchEditor() {
        this.editingBench = { index: -1, isAddNew: true };
        this.editingCell = { i: -1, j: -1 };
        this.populateFighterModal(null);
        fighterModal.style.display = "flex";
    }

    closeFighterEditor() {
        fighterClassSelect.onchange = null;
        this.editingCell = { i: -1, j: -1 };
        this.editingBench = { index: -1, isAddNew: false };
        fighterModal.style.display = "none";
        this.ensureActiveTabVisibility(); // Ensure the active tab is visible
    }

    populateFighterModal(fighter) {
        const selectedClass = fighter ? fighter.fighter_class : FighterClasses.NONE;
        fighterClassSelect.value = selectedClass;
        fighterNameInput.value = fighter ? fighter.name : "";
        const dropdownButton = customDropdown.querySelector("button");
        if (dropdownButton) {
            dropdownButton.innerHTML = `${I18N.getFighterName(selectedClass.replace(" ", "_"))} <span>▼</span>`;
        }

        FIGHTER_STAT_FIELDS.filter(id => id.startsWith("object_")).forEach(id => {
            const labelEl = document.querySelector(`label[for="${id}"]`);
            if (labelEl && labelEl.dataset.originalText) {
                labelEl.textContent = labelEl.dataset.originalText;
                delete labelEl.dataset.originalText;
            }
        });

        for (const id of FIGHTER_STAT_FIELDS) {
            const el = document.getElementById(id);
            if (!el) continue;
            let value = (fighter && fighter.__raw && typeof fighter.__raw[id] === "number") ? fighter.__raw[id] : 0;
            if (["object_crit", "object_crit_chance", "object_multistrike", "object_thorns", "object_regen", "object_lifesteal"].includes(id)) {
                el.value = value.toFixed(2);
                const labelEl = document.querySelector(`label[for="${id}"]`);
                if (labelEl) {
                    if (!labelEl.dataset.originalText) labelEl.dataset.originalText = labelEl.textContent;
                    labelEl.textContent = `${labelEl.dataset.originalText} (-%)`;
                }
            } else {
                el.value = Math.round(value);
            }
        }

        const initialFighterStats = {
            fighter_health: (fighter && fighter.__raw && typeof fighter.__raw.fighter_health === "number") ? fighter.__raw.fighter_health : 0,
            fighter_damage: (fighter && fighter.__raw && typeof fighter.__raw.fighter_damage === "number") ? fighter.__raw.fighter_damage : 0,
            fighter_hit: (fighter && fighter.__raw && typeof fighter.__raw.fighter_hit === "number") ? fighter.__raw.fighter_hit : 0,
            fighter_defense: (fighter && fighter.__raw && typeof fighter.__raw.fighter_defense === "number") ? fighter.__raw.fighter_defense : 0,
            fighter_crit: (fighter && fighter.__raw && typeof fighter.__raw.fighter_crit === "number") ? fighter.__raw.fighter_crit : 0,
            fighter_dodge: (fighter && fighter.__raw && typeof fighter.__raw.fighter_dodge === "number") ? fighter.__raw.fighter_dodge : 0,
        };
        const initialCost = calculateFighterCost(initialFighterStats);
        staticFighterCostEl.textContent = `${I18N.getUIElement("FIGHTER_GOLD")}: ${millify(initialCost)}`;
        this.updateModifiedFighterCost();
        fighterClassSelect.onchange = () => {
            const currentName = fighterNameInput.value.trim();
            const newClass = fighterClassSelect.value;
            if (fighter && fighter.isDuplicate && fighter.fighter_class !== newClass) {
                fighter.isDuplicate = false;
                fighter.base = null;
            }
            if (!currentName || (fighter && (currentName === fighter.fighter_class || (fighter.isDuplicate && currentName === fighter.base.name))) || (!fighter && (!currentName || Object.values(FighterClasses).includes(currentName)))) {
                fighterNameInput.value = I18N.getFighterName(newClass.replace(" ", "_"));
            }
        };
    }

    updateModifiedFighterCost() {
        const fighterStats = {
            fighter_health: Number(document.getElementById("fighter_health").value) || 0,
            fighter_damage: Number(document.getElementById("fighter_damage").value) || 0,
            fighter_hit: Number(document.getElementById("fighter_hit").value) || 0,
            fighter_defense: Number(document.getElementById("fighter_defense").value) || 0,
            fighter_crit: Number(document.getElementById("fighter_crit").value) || 0,
            fighter_dodge: Number(document.getElementById("fighter_dodge").value) || 0,
        };
        const totalCost = calculateFighterCost(fighterStats);
        modifiedFighterCostEl.textContent = `${I18N.getUIElement("MODIFIED_FIGHTER_GOLD")}: ${millify(totalCost)}`;
    }

    saveFighter() {
        const fc = fighterClassSelect.value;
        const fighterName = fighterNameInput.value.trim();
        const data = { name: fighterName || I18N.getFighterName(fc.replace(" ", "_")) };

        FIGHTER_STAT_FIELDS.forEach((field) => {
            const input = document.getElementById(field);
            if (input) {
                let value = Math.max(0, parseFloat(input.value) || 0);
                data[field] = (["object_crit", "object_crit_chance", "object_multistrike", "object_thorns", "object_regen", "object_lifesteal"].includes(field)) ? Math.round(value * 100) / 100 : Math.round(value);
            }
        });

        const originalFighter = (this.editingCell.i >= 0 && this.editingCell.j >= 0)
            ? this.gridState[this.editingCell.i][this.editingCell.j]
            : (this.editingBench.index >= 0 ? this.benchState[this.editingBench.index] : null);

        if (originalFighter && originalFighter.equippedItemId) {
            data.equippedItemId = originalFighter.equippedItemId;
        }

        try {
            const f = new Fighter(fc, data);
            f.__raw = { ...data };
            f.name = data.name;

            if (this.editingCell.i >= 0 && this.editingCell.j >= 0) {
                this.gridState[this.editingCell.i][this.editingCell.j] = f;
                this.renderGrid();
            } else if (this.editingBench.isAddNew) {
                this.benchState.push(f);
                this.renderBench();
            } else if (this.editingBench.index >= 0) {
                this.benchState[this.editingBench.index] = f;
                this.renderBench();
            }
        } catch (error) {
            console.error(I18N.getConsoleMsg("ERR_FAIL_CREA_FIGHTER"), error);
            alert(I18N.getAlertMsg("ERR_FAIL_CREA_FIGHTER"));
            return;
        }
        this.saveState();
        this.closeFighterEditor();
    }

    openAddToArmoryEditor() {
        this.editingArmory = { index: -1, isAddNew: true };
        this.openItemEditor(-1);
    }

    openItemEditor(index) {
        if (index !== -1) {
            this.editingArmory = { index: index, isAddNew: false };
        } else {
            this.editingArmory = { index: -1, isAddNew: true };
        }

        const item =
            index !== -1 ? this.armoryState[index] : { name: "", rarity: "", stats: [], level: 1, tiers: {} };

        // Clear all containers that might be populated
        itemStatsFreeValuesContainerTab.innerHTML = "";
        itemStatsLevelTiersContainer.innerHTML = "";
        itemStatsOriginalFreeValuesContainer.innerHTML = "";
        calculatedStatsDisplay.textContent = "";

        // Reset tab active states
        tabButtons.forEach(button => button.classList.remove("active"));

        // Populate universal item name input
        itemNameInput.value = item.name;

        if (this.editingArmory.isAddNew) {
            // Show tabbed content, hide original free values form
            itemTabbedContent.style.display = "block";
            itemOriginalFreeValuesForm.style.display = "none";

            // For new items, activate "Level/Tiers" tab by default
            const defaultTabButton = itemModal.querySelector('.tab-button[data-tab="levelTiers"]');
            const defaultTabContent = document.getElementById("levelTiersContent");
            if (defaultTabButton) defaultTabButton.classList.add("active");
            if (defaultTabContent) defaultTabContent.classList.add("active");

            // Populate item level input
            itemLevelInput.value = item.level || 1;

            // Render Level/Tiers tab content
            this.renderLevelTiersInputs(item);
            this.calculateAndDisplayTieredStats(); // Initial calculation

            // Prepare Free Values tab content (it will be populated if user switches to it)
            ALL_STAT_TYPES.forEach((statType) => {
                const existingStat = item.stats.find((s) => s.type === statType);
                let value = existingStat ? existingStat.value : 0;

                const statRow = document.createElement("div");
                statRow.style.display = "grid";
                statRow.style.gridTemplateColumns = "1fr 1fr 30px";
                statRow.style.gap = "0.8em";
                statRow.style.alignItems = "center";

                const label = document.createElement("label");
                let labelText = I18N.getTranslation(
                    "stat_" + statType.replace(/([A-Z])/g, "_$1").toLowerCase(),
                );
                const tier = item.tiers ? (item.tiers[statType] || 0) : 0;
                if (tier > 0) {
                    labelText += ` (T${tier})`;
                }
                label.textContent = labelText;
                statRow.appendChild(label);

                const input = document.createElement("input");
                input.type = "number";
                input.dataset.statType = statType;
                input.value = (["critDamage", "lifesteal", "critChance", "multistrike", "thorns", "regen"].includes(statType)) ? value.toFixed(2) : value;
                statRow.appendChild(input);

                const percentSign = document.createElement("span");
                percentSign.textContent = (["critDamage", "lifesteal", "critChance", "multistrike", "thorns", "regen"].includes(statType)) ? "%" : "";
                statRow.appendChild(percentSign);

                itemStatsFreeValuesContainerTab.appendChild(statRow);
            });

        } else {
            // Hide tabbed content, show original free values form
            itemTabbedContent.style.display = "none";
            itemOriginalFreeValuesForm.style.display = "block";

            // Render original free values form content
            this.renderOriginalFreeValuesInputs(item);
        }

        itemModal.style.display = "flex";
    }

    closeItemEditor() {
        this.editingArmory = { index: -1, isAddNew: false };
        itemModal.style.display = "none";
        this.ensureActiveTabVisibility(); // Ensure the active tab is visible
    }

    saveItem() {
        if (this.editingArmory.index === -1 && !this.editingArmory.isAddNew) return;

        let itemToSave;
        if (this.editingArmory.isAddNew) {
            itemToSave = {
                _id: `new_item_${Date.now()}`, // Generate a unique ID for new items
                name: itemNameInput.value,
                rarity: I18N.getTranslation("ITEM_RARITY_CUSTOM"), // Default rarity for new items
                stats: [],
                level: 1,
                tiers: {}
            };
        } else {
            itemToSave = this.armoryState[this.editingArmory.index];
            itemToSave.name = itemNameInput.value;
            itemToSave.stats = []; // Clear existing stats to rebuild from form
            itemToSave.tiers = {};
            itemToSave.level = 1;
        }

        // Determine which form is active
        if (itemTabbedContent.style.display === "block") {
            const activeTab = itemModal.querySelector(".tab-button.active").dataset.tab;

            if (activeTab === "freeValues") {
                const statInputs = itemStatsFreeValuesContainerTab.querySelectorAll(
                    "input[data-stat-type]",
                );
                statInputs.forEach((input) => {
                    const statType = input.dataset.statType;
                    let value = parseFloat(input.value) || 0;

                    if (value !== 0) {
                        itemToSave.stats.push({ type: statType, value: value });
                    }
                });
            } else if (activeTab === "levelTiers") {
                const level = parseInt(itemLevelInput.value) || 1;
                const calculatedStats = this.calculateAndDisplayTieredStats(); // This function returns the calculated stats object

                itemToSave.level = level;
                ALL_STAT_TYPES.forEach(statType => {
                    const input = itemStatsLevelTiersContainer.querySelector(`input[data-stat-type="${statType}"]`);
                    const tier = parseInt(input.value) || 0;
                    if (tier > 0) {
                        let valueToSave = calculatedStats[statType];
                        if (["critDamage", "lifesteal", "critChance", "multistrike", "thorns", "regen"].includes(statType)) {
                            valueToSave *= 100; // Multiply by 100 for percentages
                        }
                        itemToSave.stats.push({ type: statType, value: valueToSave, tier: tier });
                        itemToSave.tiers[statType] = tier; // Save the tier value
                    }
                });
            }
        } else { // itemOriginalFreeValuesForm is active
            const statInputs = itemStatsOriginalFreeValuesContainer.querySelectorAll(
                "input[data-stat-type]",
            );
            statInputs.forEach((input) => {
                const statType = input.dataset.statType;
                let value = parseFloat(input.value) || 0;

                if (value !== 0) {
                    itemToSave.stats.push({ type: statType, value: value });
                }
            });
        }


        if (this.editingArmory.isAddNew) {
            this.armoryState.push(new ArmoryItem(itemToSave));
        }

        this.saveState();
        this.renderArmory();
        this.closeItemEditor();
    }

    handleItemTabClick(clickedButton) { // Changed 'e' to 'clickedButton'
        tabButtons.forEach(button => button.classList.remove("active"));
        clickedButton.classList.add("active"); // Use clickedButton

        itemTabbedContent.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active")); // Changed selector
        const targetTabContent = document.getElementById(clickedButton.dataset.tab + "Content"); // Use clickedButton.dataset.tab
        if (targetTabContent) targetTabContent.classList.add("active");

        const activeTab = clickedButton.dataset.tab; // Use clickedButton.dataset.tab

        if (activeTab === "freeValues" && this.editingArmory.isAddNew) {
            itemStatsFreeValuesContainerTab.innerHTML = ""; // Clear existing
            const item = { name: "", rarity: "", stats: [], level: 1, tiers: {} }; // Placeholder for new item

            ALL_STAT_TYPES.forEach((statType) => {
                const existingStat = item.stats.find((s) => s.type === statType);
                let value = existingStat ? existingStat.value : 0;

                const statRow = document.createElement("div");
                statRow.style.display = "grid";
                statRow.style.gridTemplateColumns = "1fr 1fr 30px";
                statRow.style.gap = "0.8em";
                statRow.style.alignItems = "center";

                const label = document.createElement("label");
                let labelText = I18N.getTranslation(
                    "stat_" + statType.replace(/([A-Z])/g, "_$1").toLowerCase(),
                );
                const tier = item.tiers ? (item.tiers[statType] || 0) : 0;
                if (tier > 0) {
                    labelText += ` (T${tier})`;
                }
                label.textContent = labelText;
                statRow.appendChild(label);

                const input = document.createElement("input");
                input.type = "number";
                input.dataset.statType = statType;
                input.value = (["critDamage", "lifesteal", "critChance", "multistrike", "thorns", "regen"].includes(statType)) ? value.toFixed(2) : value;
                statRow.appendChild(input);

                const percentSign = document.createElement("span");
                percentSign.textContent = (["critDamage", "lifesteal", "critChance", "multistrike", "thorns", "regen"].includes(statType)) ? "%" : "";
                statRow.appendChild(percentSign);

                itemStatsFreeValuesContainerTab.appendChild(statRow);
            });
        }
    }

    buildFightersSquad() {
        const createFreshFighter = (fighter) => {
            if (!fighter) return null;
            const rawData = fighter.__raw || {};
            rawData.name = fighter.name;
            return new Fighter(fighter.fighter_class, rawData);
        };
        return new FightersSquad(
            createFreshFighter(this.gridState[0][0]), createFreshFighter(this.gridState[1][0]), createFreshFighter(this.gridState[2][0]),
            createFreshFighter(this.gridState[0][1]), createFreshFighter(this.gridState[1][1]), createFreshFighter(this.gridState[2][1])
        );
    }

    runBattles() {
        this.outputEl.innerHTML = "";
        let level = Math.max(1, parseInt(this.mobLevelEl.value) || 1);
        let n = Math.max(1, parseInt(this.numBattlesEl.value) || 1);
        if (n > 1000000) n = 1000000;
        this.mobLevelEl.value = level;
        this.numBattlesEl.value = n;
        this.saveState();

        if (this.tabName === 'caves') {
            const fighters = this.buildFightersSquad();
            let encountersWon = 0;
            let totalEncounters = 0;

            for (let k = 0; k < n; k++) {
                if (fighters.fighters.every(f => !f || f.current_health <= 0)) {
                    break; // Stop if all fighters are dead
                }
                totalEncounters++;

                const mobs = new MobsSquad(level);
                const battle = new Battle(fighters, mobs, 0); // Verbose for caves can be handled later if needed.
                const [winner, , ,] = battle.battle();

                if (winner === "fighters") {
                    encountersWon++;
                }
            }

            this.outputEl.innerHTML = formatString(I18N.getTranslation("CAVES_WON_ENCOUNTERS"), encountersWon, n);
            const remainingFighters = fighters.fighters.filter(f => f && f.current_health > 0);
            this.outputEl.innerHTML += `<br>${formatString(I18N.getTranslation("CAVES_SURVIVED_FIGHTERS"), remainingFighters.length)}`;
            remainingFighters.forEach(f => {
                const className = I18N.getFighterName(f.fighter_class.replace(" ", "_").toUpperCase());
                this.outputEl.innerHTML += `<br>${formatString(I18N.getTranslation("CAVES_FIGHTER_HP_REMAINING"), className, f.current_health, f.total_health)}`;
            });

        } else { // Dungeon logic (existing logic)
            let fighterWins = 0, totalMobsHealth = 0, battlesWithSurvivors = 0;
            let lastBattleLog = [];
            const originalConsoleLog = console.log;
            const shouldLogVerbose = this.verboseEl ? this.verboseEl.checked : false;
            const actualBattlesToRun = shouldLogVerbose ? 1 : n;

            try {
                if (shouldLogVerbose) console.log = (...args) => lastBattleLog.push(args.join(" "));
                for (let k = 0; k < actualBattlesToRun; k++) {
                    const fighters = this.buildFightersSquad();
                    const mobs = new MobsSquad(level);
                    const battle = new Battle(fighters, mobs, shouldLogVerbose ? 1 : 0);
                    const [winner, , , mobHealth] = battle.battle();
                    if (winner === "fighters") fighterWins++;
                    if (winner === "mobs") {
                        totalMobsHealth += mobHealth;
                        battlesWithSurvivors++;
                    }
                }
            } finally {
                console.log = originalConsoleLog;
            }

            if (shouldLogVerbose) {
                this.outputEl.innerHTML = lastBattleLog.join("\n");
            }
            else {
                const victoryChance = (fighterWins / actualBattlesToRun) * 100;
                const avgHealthSurvivors = battlesWithSurvivors > 0 ? Math.round(totalMobsHealth / battlesWithSurvivors) : 0;
                const dungeonsPerMinute = this.dungeonsPerMinuteEl.value;
                const attempts10Minutes = Math.round(dungeonsPerMinute * 10);
                const attempts30Minutes = Math.round(dungeonsPerMinute * 20);
                const attempts60Minutes = Math.round(dungeonsPerMinute * 60);
                this.outputEl.innerHTML = `${formatString(I18N.getUIElement("VICTORY_CHANCE"), victoryChance.toFixed(2))}<br>
                                         ${formatString(I18N.getUIElement("AVG_SURVIVOR_HEALTH"), avgHealthSurvivors)}<br>
                                         ${formatString(I18N.getUIElement("CHANCE_10_MIN"), ((1.0 - (1.0 - victoryChance / 100.0) ** attempts10Minutes) * 100.0).toFixed(2))}<br>
                                         ${formatString(I18N.getUIElement("CHANCE_30_MIN"), ((1.0 - (1.0 - victoryChance / 100.0) ** attempts30Minutes) * 100.0).toFixed(2))}<br>
                                         ${formatString(I18N.getUIElement("CHANCE_60_MIN"), ((1.0 - (1.0 - victoryChance / 100.0) ** attempts60Minutes) * 100.0).toFixed(2))}`;
            }
        }
    }

    createSnapshot() {
        const snapshotData = {
            grid: this.gridState.map((row) => row.map(serializeFighter)),
            armory: this.armoryState.map(serializeItem),
        };
        try {
            const jsonString = JSON.stringify(snapshotData);
            const compressedUint8 = pako.deflate(new TextEncoder().encode(jsonString));
            this.snapshotOutputField.value = btoa(String.fromCharCode.apply(null, compressedUint8));
        } catch (error) {
            console.error("Error compressing snapshot data:", error);
            this.snapshotOutputField.value = btoa(JSON.stringify(snapshotData));
        }
        this.snapshotOutputField.select();
    }

    loadSnapshot() {
        const base64String = this.snapshotOutputField.value.trim();
        if (!base64String) return;
        try {
            const decodedBinaryString = atob(base64String);
            let jsonString;
            try {
                const decodedUint8 = new Uint8Array(decodedBinaryString.split('').map(char => char.charCodeAt(0)));
                jsonString = pako.inflate(decodedUint8, { to: 'string' });
            } catch (e) { jsonString = decodedBinaryString; }
            const snapshotData = JSON.parse(jsonString);
            if (snapshotData.grid) {
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 2; j++) {
                        this.gridState[i][j] = deserializeFighter(snapshotData.grid[i][j]);
                    }
                }
            }
            if (snapshotData.armory) {
                snapshotData.armory.forEach((itemData) => {
                    const newItem = deserializeItem(itemData);
                    if (newItem && !this.armoryState.some((existingItem) => existingItem.id === newItem.id)) {
                        this.armoryState.push(newItem);
                    }
                });
            }
            this.renderGrid();
            this.renderArmory();
            this.saveState();
        } catch (error) {
            console.error("Failed to load snapshot:", error);
            alert(I18N.getAlertMsg("ERR_SNAPSHOT_LOAD_FAIL"));
        }
    }

    handleImportClick() {
        const apiKey = this.apiKeyEl.value.trim();
        if (!apiKey) {
            alert(I18N.getAlertMsg("ERR_NULL_API"));
            return;
        }
        if (localStorage.getItem(this.LS_KEYS.dontShowImportWarning) === "1") {
            this.performImport(apiKey);
        } else {
            importConfirmModal.style.display = "flex";
        }
    }

    async performImport(apiKey) {
        try {
            this.importBtn.disabled = true;
            this.importBtn.textContent = I18N.getUIElement("IMPORTING");

            const response = await fetch(
                "https://http.v2.queslar.com/api/character/fighter/presets",
                { headers: { "QUESLAR-API-KEY": apiKey } },
            );

            if (!response.ok) {
                throw new Error(formatString(I18N.getAlertMsg("ERR_HTTP_ERROR"), response.status));
            }
            const data = await response.json();
            const result = this.processImportedData(data);
            if (!result.success) {
                console.warn(I18N.getConsoleMsg("ERR_IMPORT_FAIL"), result.message);
                alert(result.message);
            }
        } catch (error) {
            console.error(I18N.getConsoleMsg("ERR_IMPORT_FAIL"), error);
            alert(formatString(I18N.getAlertMsg("ERR_IMPORT_FAIL"), error.message));
        } finally {
            this.importBtn.disabled = false;
            this.importBtn.textContent = I18N.getTranslation("import_button");
        }
    }

    processImportedData(apiData) {
        try {
            if (!apiData.output || !Array.isArray(apiData.output)) {
                return { success: false, message: I18N.getConsoleMsg("IVLD_API_FORMAT") };
            }

            const presetAssignment = this.tabName === 'dungeon' ? 'dungeon' : 'cave';
            const preset = apiData.output.find(p => p.preset?.assignment === presetAssignment);

            // fallback attempt - use the active preset if the correct assignment does not exist
            if (!preset) {
                preset = apiData.output.find(p => p.preset?.isActive === true);
            }

            if (!preset) {
                return { success: false, message: formatString(I18N.getConsoleMsg("INFO_NO_AVIL_PRESET"), presetAssignment) };
            }

            this.gridState.forEach(row => row.fill(null));

            let importedCount = 0;
            (preset.fighters || []).forEach((fighterData) => {
                try {
                    const fighter = createFighterFromApiData(fighterData);
                    if (!fighter) return;

                    const { row, column } = fighterData.placement || {};
                    let placed = false;
                    if (row !== undefined && column !== undefined && column >= 0 && column < 3 && row >= 0 && row < 2 && !this.gridState[column][row]) {
                        this.gridState[column][row] = fighter;
                        placed = true;
                    } else {
                        for (let i = 0; i < 3 && !placed; i++) {
                            for (let j = 0; j < 2 && !placed; j++) {
                                if (!this.gridState[i][j]) {
                                    this.gridState[i][j] = fighter;
                                    placed = true;
                                }
                            }
                        }
                    }
                    if (placed) importedCount++;
                    else console.warn(I18N.getConsoleMsg("ERR_GRID_FULL"), fighterData.name);

                } catch (error) {
                    console.warn("Failed to import fighter:", fighterData.name, error.message);
                }
            });

            const apiItemsToProcess = new Map();
            (preset.fighters || []).forEach(f => {
                if (f.equipment?._id) apiItemsToProcess.set(f.equipment._id, f.equipment);
            });

            apiItemsToProcess.forEach((apiItemData) => {
                const tiersFromApi = {};
                const calculatedStats = Array.isArray(apiItemData.stats) ? apiItemData.stats.map(stat => {
                    const statObject = { ...stat };
                    if (stat.type && stat.tier !== undefined) {
                        tiersFromApi[stat.type] = stat.tier;
                        statObject.tier = stat.tier;
                    }
                    return { ...statObject, value: calculateStatValue(stat) };
                }) : [];

                const existingItemIndex = this.armoryState.findIndex(item => item.id === apiItemData._id);

                if (existingItemIndex !== -1) {
                    Object.assign(this.armoryState[existingItemIndex], {
                        id: apiItemData._id,
                        name: apiItemData.customName ?? apiItemData.name,
                        rarity: apiItemData.rarity,
                        stats: calculatedStats,
                        level: apiItemData.level || 1,
                        tiers: tiersFromApi,
                    });
                } else {
                    this.armoryState.push(new ArmoryItem({
                        ...apiItemData,
                        stats: calculatedStats,
                        level: apiItemData.level || 1,
                        tiers: tiersFromApi,
                    }));
                }
            });

            this.saveState();
            this.renderGrid();
            this.renderBench();
            this.renderArmory();

            return { success: true, fightersCount: importedCount };
        } catch (error) {
            console.error("Error processing imported data:", error);
            return { success: false, message: formatString(I18N.getConsoleMsg("ERR_PROC_IMPORT_DATA"), error.message) };
        }
    }

    handleDragStart(e) {
        activeSim.draggedElement = e.target;
        e.target.classList.add("dragging");

        if (e.target.dataset.gridPosition) {
            const [i, j] = e.target.dataset.gridPosition.split(",").map(Number);
            activeSim.draggedData = { type: "grid", position: { i, j }, fighter: this.gridState[i][j], tab: this.tabName };
        } else if (e.target.dataset.benchIndex !== undefined) {
            const index = parseInt(e.target.dataset.benchIndex);
            activeSim.draggedData = { type: "bench", index, fighter: this.benchState[index], tab: this.tabName };
        } else if (e.target.dataset.armoryIndex !== undefined) {
            const index = parseInt(e.target.dataset.armoryIndex);
            activeSim.draggedData = { type: "armory", index, item: this.armoryState[index], tab: this.tabName };
        }
        e.dataTransfer.effectAllowed = "move";
    }

    handleDragEnd(e) {
        if (e.target) e.target.classList.remove("dragging");
        document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
        activeSim.draggedElement = null;
        activeSim.draggedData = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }

    handleDrop(e) {
        e.preventDefault();
        if (!activeSim.draggedData || activeSim.draggedData.tab !== this.tabName) {
            e.currentTarget.classList.remove("drag-over");
            return;
        }

        const dropTarget = e.currentTarget;
        dropTarget.classList.remove("drag-over");

        const dragged = activeSim.draggedData;
        let targetType = null;
        let targetData = null;

        if (dropTarget.dataset.gridPosition) {
            const [i, j] = dropTarget.dataset.gridPosition.split(",").map(Number);
            targetType = "grid";
            targetData = { i, j, fighter: this.gridState[i][j] };
        } else if (dropTarget.dataset.benchIndex !== undefined) {
            const index = parseInt(dropTarget.dataset.benchIndex);
            targetType = "bench";
            targetData = { index, fighter: this.benchState[index] };
        } else if (dropTarget.dataset.armoryIndex !== undefined) {
            const index = parseInt(dropTarget.dataset.armoryIndex);
            targetType = "armory";
            targetData = { index, item: this.armoryState[index] };
        } else if (dropTarget.classList.contains('bench-grid') || dropTarget.textContent === I18N.getUIElement("DROP_FIGHTER_HERE")) {
            targetType = "benchEmpty";
        }

        if (dragged.type === "grid" && targetType === "grid") {
            const sourceFighter = this.gridState[dragged.position.i][dragged.position.j];
            const targetFighter = this.gridState[targetData.i][targetData.j];
            this.gridState[dragged.position.i][dragged.position.j] = targetFighter;
            this.gridState[targetData.i][targetData.j] = sourceFighter;
            this.renderGrid();
        } else if (dragged.type === "grid" && (targetType === "bench" || targetType === "benchEmpty")) {
            const sourceFighter = this.gridState[dragged.position.i][dragged.position.j];
            this.gridState[dragged.position.i][dragged.position.j] = null;
            if (targetType === "bench") {
                this.benchState.splice(targetData.index, 0, sourceFighter);
            } else {
                this.benchState.push(sourceFighter);
            }
            this.renderGrid();
            this.renderBench();
        } else if (dragged.type === "bench" && targetType === "grid") {
            const sourceFighter = this.benchState[dragged.index];
            const targetFighter = targetData.fighter;
            this.benchState.splice(dragged.index, 1);
            if (targetFighter) {
                this.benchState.splice(dragged.index, 0, targetFighter);
            }
            this.gridState[targetData.i][targetData.j] = sourceFighter;
            this.renderGrid();
            this.renderBench();
        } else if (dragged.type === "bench" && targetType === "bench") {
            if (dragged.index !== targetData.index) {
                const sourceFighter = this.benchState[dragged.index];
                this.benchState.splice(dragged.index, 1);
                this.benchState.splice(targetData.index, 0, sourceFighter);
                this.renderBench();
            }
        } else if (dragged.type === "armory" && targetType === "armory") {
            if (dragged.index !== targetData.index) {
                const sourceItem = this.armoryState[dragged.index];
                this.armoryState.splice(dragged.index, 1);
                this.armoryState.splice(targetData.index, 0, sourceItem);
                this.renderArmory();
            }
        } else if (
            dragged.type === "armory" &&
            (targetType === "grid" || targetType === "bench")
        ) {
            // Equip item onto a fighter
            const draggedItem = dragged.item;
            let originalFighter = null;
            if (targetType === "grid") {
                originalFighter = this.gridState[targetData.i][targetData.j];
            } else {
                // bench
                originalFighter = this.benchState[targetData.index];
            }

            if (originalFighter) {
                const itemBonuses = this.getBonusesFromItem(draggedItem); // Changed to this.getBonusesFromItem

                const newFighterData = { ...originalFighter.__raw };
                Object.assign(newFighterData, itemBonuses);
                newFighterData.equippedItemId = draggedItem.id;

                const newFighter = new Fighter(
                    originalFighter.fighter_class,
                    newFighterData,
                );
                newFighter.__raw = newFighterData;

                // Replace the old fighter
                if (targetType === "grid") {
                    this.gridState[targetData.i][targetData.j] = newFighter;
                    this.renderGrid();
                } else {
                    this.benchState[targetData.index] = newFighter;
                    this.renderBench();
                }
            }
        }
        this.saveState();
    }
}

function calculateStatValue(stat) {
    const tierMultipliers = { 1: 1.1, 2: 1.2, 3: 1.3, 4: 1.4, 5: 1.5, 6: 1.75, 7: 2, 8: 2.25, 9: 2.5, 10: 2.75, 11: 3, 12: 3.5, 13: 3.75, 14: 4, 15: 4.25, 16: 4.5};
    if (!stat?.type) return 0;

    const tier = Math.max(1, parseInt(stat.tier) || 1);
    const multiplier = tierMultipliers[tier] || 1.0;
    if (tier > MAX_TIER) console.warn(formatString(I18N.getConsoleMsg("WARN_EQUIP_TIER_EXCEEDS_MAX"), tier, MAX_TIER));

    const baseValue = Math.max(0, parseFloat(stat.value) || 0);

    return ["critdamage", "lifesteal", "critchance", "multistrike", "thorns", "regen"].includes(stat.type.toLowerCase()) ? baseValue * multiplier * 100 : Math.round(baseValue * multiplier);
}

function createFighterFromApiData(apiData) {
    try {
        if (!apiData?.class) throw new Error(I18N.getConsoleMsg("ERR_IVLD_FIGHTER_CLS"));

        const classMapping = { assassin: "Assassin", brawler: "Brawler", hunter: "Hunter", mage: "Mage", priest: "Priest", shadow_dancer: "Shadow Dancer", shadowdancer: "Shadow Dancer", berserker: "Berserker", paladin: "Paladin", crusader: "Crusader", sentinel: "Sentinel", bastion: "Bastion" };
        const fighterClass = classMapping[apiData.class.toLowerCase()] || "No Class";
        const stats = apiData.stats || {};

        const equipment = apiData.equipment || {};
        const equipmentStats = Array.isArray(equipment.stats) ? equipment.stats : [];

        const equipmentBonuses = { health: 0, damage: 0, hit: 0, defense: 0, critDamage: 0, dodge: 0, lifesteal: 0, critChance: 0, multistrike: 0, thorns: 0, regen: 0, healing: 0 };
        equipmentStats.forEach((stat) => {
            if (stat.type === "fighterLifesteal") { stat.type = "lifesteal"; }
            if (stat.type === "fighterRegen") { stat.type = "regen"; }
            if (stat.type === "fighterHealing") { stat.type = "healing"; }
            if (stat.type === "fighterMultistrike") { stat.type = "multistrike"; }
            if (stat.type === "fighterThorns") { stat.type = "thorns"; }
            if (stat.type === "fighterCritChance") { stat.type = "critChance"; }

            const value = calculateStatValue(stat);
            const type = stat.type.toLowerCase();

            if (type.includes("critdamage") || type.includes("crit_damage") || type.includes("critical_damage")) {
                equipmentBonuses.critDamage += value;
            } else if (type.includes("health")) {
                equipmentBonuses.health += value;
            } else if (type.includes("damage")) {
                equipmentBonuses.damage += value;
            } else if (type.includes("hit")) {
                equipmentBonuses.hit += value;
            } else if (type.includes("defense") || type.includes("defence")) {
                equipmentBonuses.defense += value;
            } else if (type.includes("dodge")) {
                equipmentBonuses.dodge += value;
            } else if (type.includes("lifesteal")) {
                equipmentBonuses.lifesteal += value;
            } else if (type.includes("critchance") || type.includes("crit_chance") || type.includes("critical_chance")) {
                equipmentBonuses.critChance += value;
            } else if (type.includes("multistrike")) {
                equipmentBonuses.multistrike += value;
            } else if (type.includes("thorns")) {
                equipmentBonuses.thorns += value;
            } else if (type.includes("regen")) {
                equipmentBonuses.regen += value;
            } else if (type.includes("healing")) {
                equipmentBonuses.healing += value;
            }
        });

        const fighterData = {
            name: (apiData.name || fighterClass).trim(),
            fighter_health: Math.max(0, parseInt(stats.health || 0)),
            fighter_damage: Math.max(0, parseInt(stats.damage || 0)),
            fighter_hit: Math.max(0, parseInt(stats.hit || 0)),
            fighter_defense: Math.max(0, parseInt(stats.defense || 0)),
            fighter_crit: Math.max(0, parseInt(stats.critDamage || 0)),
            fighter_dodge: Math.max(0, parseInt(stats.dodge || 0)),
            object_health: Math.max(0, equipmentBonuses.health),
            object_damage: Math.max(0, equipmentBonuses.damage),
            object_hit: Math.max(0, equipmentBonuses.hit),
            object_defense: Math.max(0, equipmentBonuses.defense),
            object_crit: Math.max(0, equipmentBonuses.critDamage),
            object_dodge: Math.max(0, equipmentBonuses.dodge),
            object_lifesteal: Math.max(0, equipmentBonuses.lifesteal),
            object_crit_chance: Math.max(0, equipmentBonuses.critChance),
            object_multistrike: Math.max(0, equipmentBonuses.multistrike),
            object_thorns: Math.max(0, equipmentBonuses.thorns),
            object_regen: Math.max(0, equipmentBonuses.regen),
            object_healing: Math.max(0, equipmentBonuses.healing),
            equippedItemId: equipment ? equipment._id : null,
        };

        const fighter = new Fighter(fighterClass, fighterData);
        fighter.__raw = { ...fighterData };
        return fighter;
    } catch (error) {
        console.error("Error creating fighter from API data:", error, apiData);
        throw error;
    }
}

// --- INITIALIZATION ---
let dungeonSim, cavesSim, activeSim;

function initializeApp() {
    const mainTabs = document.querySelector('.main-tabs');
    const tabContents = document.querySelectorAll('.tab-content');

    mainTabs.addEventListener('click', (e) => {
        if (e.target.matches('.main-tab-button')) {
            mainTabs.querySelectorAll('.main-tab-button').forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            e.target.classList.add('active');
            const tabId = e.target.dataset.tab;
            document.getElementById(`${tabId}-content`).classList.add('active');
            localStorage.setItem('activeTab', tabId);

            activeSim = (tabId === 'dungeon') ? dungeonSim : cavesSim;
            activeSim.renderGrid();
            activeSim.renderBench();
            activeSim.renderArmory();
        }
    });

    dungeonSim = new DungeonSim('dungeon');
    cavesSim = new DungeonSim('caves');

    const savedTabId = localStorage.getItem('activeTab') || 'dungeon';
    activeSim = (savedTabId === 'dungeon') ? dungeonSim : cavesSim;

    mainTabs.querySelectorAll('.main-tab-button').forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    mainTabs.querySelector(`[data-tab="${savedTabId}"]`).classList.add('active');
    document.getElementById(`${savedTabId}-content`).classList.add('active');

    dungeonSim.init();
    cavesSim.init();

    // Explicitly re-render the active sim's content to ensure it's displayed correctly on load
    activeSim.renderGrid();
    activeSim.renderBench();
    activeSim.renderArmory();

    saveFighterBtn.addEventListener("click", () => activeSim.saveFighter());
    closeFighterModal.addEventListener("click", () => activeSim.closeFighterEditor());
    setupModalBackdropClose(fighterModal, () => activeSim.closeFighterEditor());

    saveItemBtn.addEventListener("click", () => activeSim.saveItem());
    closeItemModal.addEventListener("click", () => activeSim.closeItemEditor());
    setupModalBackdropClose(itemModal, () => activeSim.closeItemEditor());



    confirmImportBtn.addEventListener("click", () => {
        if (dontShowImportWarningEl.checked) {
            localStorage.setItem(activeSim.LS_KEYS.dontShowImportWarning, "1");
        }
        importConfirmModal.style.display = "none";
        activeSim.performImport(activeSim.apiKeyEl.value.trim());
        activeSim.ensureActiveTabVisibility(); // Ensure the active tab is visible
    });
    cancelImportBtn.addEventListener("click", () => {
        importConfirmModal.style.display = "none";
        activeSim.ensureActiveTabVisibility(); // Ensure the active tab is visible
    });
    setupModalBackdropClose(importConfirmModal, () => {
        importConfirmModal.style.display = "none";
        activeSim.ensureActiveTabVisibility(); // Ensure the active tab is visible
    });

    loadChangelog();
    changelogLink.addEventListener("click", () => { changelogModal.style.display = "flex"; });
    closeChangelog.addEventListener("click", () => {
        changelogModal.style.display = "none";
        activeSim.ensureActiveTabVisibility(); // Ensure the active tab is visible
    });
    setupModalBackdropClose(changelogModal, () => {
        changelogModal.style.display = "none";
        activeSim.ensureActiveTabVisibility(); // Ensure the active tab is visible
    });

    const statInputs = ["fighter_health", "fighter_damage", "fighter_hit", "fighter_defense", "fighter_crit", "fighter_dodge"];
    for (const id of statInputs) {
        document.getElementById(id).addEventListener("input", () => activeSim.updateModifiedFighterCost());
    }
}

function setupModalBackdropClose(modalElement, closeFunction) {
    modalElement.addEventListener("click", (e) => {
        if (e.target === modalElement) closeFunction();
    });
    modalElement.querySelector(".modal").addEventListener("click", (e) => e.stopPropagation());
}

async function loadChangelog() {
    try {
        const response = await fetch("./changelog.txt");
        const content = await response.text();
        const lines = content.trim().split("\n").filter(line => line.trim());
        let html = "";
        let latestDate = "";

        lines.forEach(line => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(line.trim())) {
                const currentDate = line.trim();
                if (!latestDate) latestDate = currentDate;
                html += `<h4>${currentDate}</h4>`;
            } else {
                html += `<div>• ${line.replace(/^-/, '').trim()}</div>`;
            }
        });

        changelogModal.querySelector(".modal div:last-child").innerHTML = html || "No changelog entries.";
        if (latestDate && lastUpdatedEl) lastUpdatedEl.textContent = `Last updated: ${latestDate}`;

    } catch (error) {
        console.warn("Failed to load changelog:", error);
        changelogModal.querySelector(".modal div:last-child").innerHTML = "Unable to load changelog.";
    }
}

// Ensure the browser has fully populated DOM and restored states before our JS kicks in.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initializeApp, 50));
} else {
    setTimeout(initializeApp, 50);
}

// --- APRIL FOOLS PRANK ---
const checkAprilFools = () => {
    const now = new Date();
    // Check if it's April 1st in UTC
    if (now.getUTCMonth() === 3 && now.getUTCDate() === 1) {
        // if (true) {
        document.getElementById('prankText1').innerHTML = `Hello,<br><br>
        I need just a moment of your attention.<br><br>
        Please understand that maintaining this Simulator requires a significant amount of effort:<br>
        I have to read the patch notes, update the logic, fix bugs, and pester Blah to give me all the missing details he was too lazy to provide.<br><br>
        After reviewing recent activity, your username has been flagged for <b>heavy usage</b> and consequently your access has been <b>suspended</b> until you pay a small fee.<br><br>
        To restore full access, please send <b>100 credits to anfneub</b>.<br>
        Thank you for supporting essential infrastructure.`;

        document.getElementById('prankBackdrop').style.display = 'flex';
        document.getElementById('prankModal1').style.display = 'block';
        document.getElementById('prankModal2').style.display = 'none';

        document.getElementById('prankBtn1').addEventListener('click', () => {
            document.getElementById('prankModal1').style.display = 'none';
            document.getElementById('prankModal2').style.display = 'block';
        });

        document.getElementById('prankBtn2').addEventListener('click', () => {
            document.getElementById('prankBackdrop').style.display = 'none';
        });
    }
};

checkAprilFools();
