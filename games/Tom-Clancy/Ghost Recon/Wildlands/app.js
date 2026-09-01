/* ============================================================================
   FILE: app.js
   DESCRIPTION: Wildlands Full Skill Slots, Click Handlers, Tree Branches, & Firestore
   TARGET PATH: /users/{userId}/platform/{platform}/progress/T.C.G.R.Wildlands
   TIMESTAMP (24-HR NY TIME): 2026-09-01 05:35 EDT
   ============================================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// --- FIREBASE CONFIGURATION (entertainment-71888) ---
const firebaseConfig = {
    apiKey: "AIzaSyDeuNBGHcwU4rFyOcsfGxLHjmEdpADacmc",
    authDomain: "entertainment-71888.firebaseapp.com",
    projectId: "entertainment-71888",
    storageBucket: "entertainment-71888.firebasestorage.app",
    messagingSenderId: "660524340277",
    appId: "1:660524340277:web:ef8f4ed04fa985a4f88d7c"
};

const GAME_ID = 'T.C.G.R.Wildlands';

// --- WILDLANDS STRUCTURED TREE ---
const WILDLANDS_TREE = {
    "WEAPON": [
        {
            tierName: "BASE SKILLS",
            skills: [
                { id: "w_stable_aim", name: "Stable Aim", reqLevel: 1, maxSlots: 4, desc: "Adds extra stability when using a sniper scope or sighting weapons.", hasMedal: true },
                { id: "w_hip_fire", name: "Hip Fire Spread", reqLevel: 1, maxSlots: 4, desc: "Reduces bullet spray when firing weapons from the hip.", hasMedal: true }
            ]
        },
        {
            tierName: "LEVEL 5",
            skills: [
                { id: "w_grenade_launcher", name: "Grenade Launcher", reqLevel: 5, maxSlots: 1, desc: "An optional underbarrel grenade launcher attachment for specific assault rifles.", hasMedal: false },
                { id: "w_ammo_cap", name: "Ammo Capacity", reqLevel: 5, maxSlots: 4, desc: "Increases maximum reserve ammunition capacity across all weapon classes.", hasMedal: true },
                { id: "w_vhc_destruct", name: "VHC Destruction", reqLevel: 5, maxSlots: 4, desc: "Increases ballistic damage dealt to enemy vehicles and helicopters.", hasMedal: true }
            ]
        },
        {
            tierName: "LEVEL 14",
            skills: [
                { id: "w_adv_suppressor", name: "Adv Suppressor", reqLevel: 14, maxSlots: 1, desc: "Removes the damage reduction penalty from using suppressors with weapons.", hasMedal: false },
                { id: "w_time_to_aim", name: "Time to Aim", reqLevel: 14, maxSlots: 4, desc: "Reduces the time it takes to aim down sights with weapons when using large scopes.", hasMedal: true },
                { id: "w_ammo_retention", name: "Ammo Retention", reqLevel: 14, maxSlots: 1, desc: "Tactical reload retains remaining ammunition in current magazine.", hasMedal: false }
            ]
        },
        {
            tierName: "EPIC SKILL",
            skills: [
                { id: "w_ranged_elite", name: "Ranged Elite", reqLevel: 30, maxSlots: 1, desc: "Significantly increases long-range weapon ballistic accuracy.", isEpic: true, hasMedal: false }
            ]
        }
    ],
    "DRONE": [
        {
            tierName: "BASE SKILLS",
            skills: [
                { id: "d_battery", name: "Battery", reqLevel: 1, maxSlots: 4, desc: "Increases the autonomy and flight duration of the recon drone.", hasMedal: false },
                { id: "d_night_vision", name: "Night Vision", reqLevel: 1, maxSlots: 1, desc: "Enables night vision optics mode on the drone.", hasMedal: false },
                { id: "d_range", name: "Range", reqLevel: 1, maxSlots: 4, desc: "Increases the horizontal radio transmission signal range.", hasMedal: true }
            ]
        },
        {
            tierName: "LEVEL 7",
            skills: [
                { id: "d_speed", name: "Speed", reqLevel: 7, maxSlots: 3, desc: "Increases drone acceleration and top flight velocity.", hasMedal: true },
                { id: "d_mark_area", name: "Mark Area", reqLevel: 7, maxSlots: 3, desc: "Expands the automatic enemy visual marking detection radius.", hasMedal: true },
                { id: "d_stealth", name: "Stealth", reqLevel: 7, maxSlots: 3, desc: "Reduces drone motor noise, decreasing enemy detection range.", hasMedal: false },
                { id: "d_cooldown", name: "Cooldown", reqLevel: 7, maxSlots: 3, desc: "Reduces drone recharge cooldown duration between deployments.", hasMedal: true },
                { id: "d_noisemaker", name: "Noisemaker", reqLevel: 7, maxSlots: 1, desc: "Emits noise pulse to attract hostiles to a specific point.", hasMedal: false }
            ]
        },
        {
            tierName: "LEVEL 15",
            skills: [
                { id: "d_zoom", name: "Zoom", reqLevel: 15, maxSlots: 2, desc: "Increases optical magnification levels for the drone camera.", hasMedal: false },
                { id: "d_explosive", name: "Explosive", reqLevel: 15, maxSlots: 1, desc: "Equips the drone with remote-detonated C4 charges.", hasMedal: false },
                { id: "d_emp", name: "EMP", reqLevel: 15, maxSlots: 1, desc: "Emits electromagnetic pulse disabling lights, vehicles, and generators.", hasMedal: false },
                { id: "d_armor", name: "Armor", reqLevel: 15, maxSlots: 3, desc: "Increases the drone's resistance against small-arms fire.", hasMedal: true },
                { id: "d_thermal", name: "Thermal Vision", reqLevel: 15, maxSlots: 1, desc: "Enables thermal heat-signature imaging mode on the drone.", hasMedal: false }
            ]
        },
        {
            tierName: "EPIC SKILL",
            skills: [
                { id: "d_medic", name: "Medic", reqLevel: 30, maxSlots: 1, desc: "Allows drone to deploy a revive dart on downed squad members.", isEpic: true, hasMedal: false }
            ]
        }
    ],
    "ITEM": [
        {
            tierName: "BASE SKILLS",
            skills: [
                { id: "i_parachute", name: "Parachute", reqLevel: 1, maxSlots: 1, desc: "Enables base jumping and safe parachute drops from aircraft.", hasMedal: false },
                { id: "i_binoc_zoom", name: "Binocular Zoom", reqLevel: 1, maxSlots: 3, desc: "Increases the maximum optical zoom of tactical binoculars.", hasMedal: true },
                { id: "i_mine", name: "Mine", reqLevel: 1, maxSlots: 4, desc: "Unlocks proximity mines and increases inventory carrying capacity.", hasMedal: true },
                { id: "i_diversion_lure", name: "Diversion Lure", reqLevel: 1, maxSlots: 4, desc: "Unlocks noise lures to distract enemies to targeted spots.", hasMedal: true }
            ]
        },
        {
            tierName: "LEVEL 4",
            skills: [
                { id: "i_frag_grenade", name: "Frag Grenade", reqLevel: 4, maxSlots: 4, desc: "Increases fragmentation grenade maximum inventory quantity.", hasMedal: true },
                { id: "i_c4", name: "C4", reqLevel: 4, maxSlots: 4, desc: "Enables deployment of remote-detonated C4 explosives.", hasMedal: true },
                { id: "i_binoc_recon", name: "Binocular Recon", reqLevel: 4, maxSlots: 3, desc: "Increases the target identification speed and range of binoculars.", hasMedal: true },
                { id: "i_thermal_vis", name: "Thermal Vision", reqLevel: 4, maxSlots: 1, desc: "Unlocks personal infantry helmet thermal vision goggles.", hasMedal: false }
            ]
        },
        {
            tierName: "LEVEL 10",
            skills: [
                { id: "i_flashbang", name: "Flashbang", reqLevel: 10, maxSlots: 4, desc: "Increases carrying capacity of tactical flashbang grenades.", hasMedal: false },
                { id: "i_flare_gun", name: "Flare Gun", reqLevel: 10, maxSlots: 4, desc: "Unlocks distress flare gun to draw enemy or rebel attention.", hasMedal: true }
            ]
        },
        {
            tierName: "EPIC SKILL",
            skills: [
                { id: "i_explosion_radius", name: "Explosion Radius", reqLevel: 30, maxSlots: 1, desc: "Expands the blast lethality radius of all explosive ordnance.", isEpic: true, hasMedal: false }
            ]
        }
    ],
    "PHYSICAL": [
        {
            tierName: "BASE SKILLS",
            skills: [
                { id: "p_stamina", name: "Stamina", reqLevel: 1, maxSlots: 4, desc: "Extends sprint duration before tactical fatigue.", hasMedal: false },
                { id: "p_no_pain", name: "No Pain", reqLevel: 1, maxSlots: 4, desc: "Increases duration of damage resistance after being revived.", hasMedal: true }
            ]
        },
        {
            tierName: "LEVEL 6",
            skills: [
                { id: "p_car_shield", name: "Car Shield", reqLevel: 6, maxSlots: 4, desc: "Reduces damage sustained while seated inside motor vehicles.", hasMedal: true },
                { id: "p_quiet_running", name: "Quiet Running", reqLevel: 6, maxSlots: 4, desc: "Reduces footstep noise generated while sprinting.", hasMedal: true },
                { id: "p_bullet_resist", name: "Bullet Resistance", reqLevel: 6, maxSlots: 4, desc: "Increases direct ballistic damage absorption.", hasMedal: true }
            ]
        },
        {
            tierName: "LEVEL 17",
            skills: [
                { id: "p_detection", name: "Detection", reqLevel: 17, maxSlots: 4, desc: "Slows enemy visual awareness and detection speed.", hasMedal: true },
                { id: "p_explosion_resist", name: "Explosion Resistance", reqLevel: 17, maxSlots: 4, desc: "Reduces explosive splash damage taken.", hasMedal: true },
                { id: "p_aircraft_shield", name: "Aircraft Shield", reqLevel: 17, maxSlots: 4, desc: "Reduces damage taken while pilot or passenger in aircraft.", hasMedal: true }
            ]
        },
        {
            tierName: "EPIC SKILL",
            skills: [
                { id: "p_faster_regen", name: "Faster Regen", reqLevel: 30, maxSlots: 1, desc: "Accelerates natural health recovery cooldown.", isEpic: true, hasMedal: false }
            ]
        }
    ],
    "SQUAD": [
        {
            tierName: "BASE SKILLS",
            skills: [
                { id: "s_revive_speed", name: "Revive Speed", reqLevel: 1, maxSlots: 4, desc: "Reduces time required to revive downed squad members.", hasMedal: true },
                { id: "s_extra_sync", name: "Extra Sync Shot", reqLevel: 1, maxSlots: 3, desc: "Unlocks simultaneous targeted sync shots with squadmates.", hasMedal: false }
            ]
        },
        {
            tierName: "LEVEL 8",
            skills: [
                { id: "s_trained_rebels", name: "Trained Rebels", reqLevel: 8, maxSlots: 4, desc: "Boosts combat damage efficiency of allied Kataris 26 rebels.", hasMedal: true },
                { id: "s_squad_resilience", name: "Squad Resilience", reqLevel: 8, maxSlots: 4, desc: "Increases health resistance for AI teammates.", hasMedal: true }
            ]
        },
        {
            tierName: "LEVEL 16",
            skills: [
                { id: "s_bleed_out", name: "Bleed Out Time", reqLevel: 16, maxSlots: 4, desc: "Extends bleedout timer before operator death.", hasMedal: false },
                { id: "s_born_leader", name: "Born Leader", reqLevel: 16, maxSlots: 4, desc: "Improves overall damage dealt by squad members.", hasMedal: true }
            ]
        },
        {
            tierName: "EPIC SKILL",
            skills: [
                { id: "s_last_chance", name: "Last Chance", reqLevel: 30, maxSlots: 1, desc: "Grants an additional self-revive attempt per engagement.", isEpic: true, hasMedal: false }
            ]
        }
    ],
    "REBEL": [
        {
            tierName: "REBEL OPERATIONS",
            skills: [
                { id: "r_vehicle_drop", name: "Vehicle Drop-off", reqLevel: 1, maxSlots: 3, desc: "Rebel vehicle delivery: Rank 1 SUV, Rank 2 Armored Vehicle, Rank 3 Helicopter.", hasMedal: false },
                { id: "r_guns_hire", name: "Guns For Hire", reqLevel: 1, maxSlots: 3, desc: "Summons Kataris 26 rebel squad to reinforce your position.", hasMedal: false },
                { id: "r_mortar", name: "Mortar", reqLevel: 1, maxSlots: 3, desc: "Orders high-explosive rebel mortar artillery strike on target coordinates.", hasMedal: false },
                { id: "r_diversion", name: "Diversion", reqLevel: 1, maxSlots: 3, desc: "Commands rebel forces to attack nearby enemy posts as a decoy.", hasMedal: false },
                { id: "r_spotting", name: "Spotting", reqLevel: 1, maxSlots: 3, desc: "Rebel recon teams scan and highlight all hostiles in designated zone.", hasMedal: false }
            ]
        }
    ]
};

const WEAPONS_CATALOG = {
    "Assault Rifles": ["P416", "M4A1", "ACR", "AK-47", "AK-12", "556xi", "TAR-21", "AUG A3", "805 Bren A2", "G2"],
    "Sniper Rifles": ["M40A5", "HTI", "SR-25", "L115A3", "MK14", "G28", "MSR", "Dragunov (SVD)", "SR-1"],
    "Submachine Guns": ["MP5", "Vector .45 ACP", "P90", "MPX", "PP-19", "SR-635", "Scorpion EVO 3", "PSG"],
    "Light Machine Guns": ["MG121", "MK48", "Stoner LMG A1", "Type 95", "6P41", "MK249"],
    "Shotguns": ["Super Shorty", "SASG-12", "SPAS-12", "ITA 12S"],
    "Handguns": ["P226", "M1911", "5.7 USG", "D-50", "P12", "P45T", "Skorpion"]
};

const BLANK_STATS = {
    playerLevel: 1,
    tierActive: "off",
    tierLevel: 50,
    playstyle: "--",
    avgDist: "--",
    tactical: "0%",
    stealth: "0%",
    lifetime: "--",
    longestShot: "--",
    precision: "0%",
    favWeapon: "--",
    favWeapon2: "--",
    revives: "--",
    explosiveKills: "--",
    droneTime: "--",
    airTravel: "--",
    groundTravel: "--",
    paraTravel: "--",
    mapDisc: "--"
};

const appState = {
    activeHunter: localStorage.getItem('active_gaming_nickname') || 'Werewolf3788',
    activePlatform: localStorage.getItem('active_gaming_platform') || 'pc',
    activeCategory: 'WEAPON',
    selectedSkillId: 'w_stable_aim',
    hunterSkillsData: {},
    statsData: JSON.parse(JSON.stringify(BLANK_STATS)),
    auth: null,
    db: null,
    masterUnsub: null,

    init: async function() {
        this.initializeBlankSkills();
        this.setupMobileMenu();
        this.setupControlDropdowns();
        this.setupFormControls();
        this.populateWeaponSelects();
        this.buildCategoryTabs();
        this.renderTree();

        try {
            const app = initializeApp(firebaseConfig, 'Wildlands-HUD-Engine');
            this.auth = getAuth(app);
            this.db = getFirestore(app);

            await signInAnonymously(this.auth);

            onAuthStateChanged(this.auth, (user) => {
                if (user) {
                    this.setStatus(`✓ Online [${this.activeHunter} - ${this.activePlatform.toUpperCase()}]`, "#10b981");
                    this.loadOperator(this.activeHunter, this.activePlatform);
                } else {
                    this.setStatus("❌ Auth Failed", "#ef4444");
                }
            });
        } catch (err) {
            console.error("Firestore Init Error:", err);
            this.setStatus(`❌ Error: ${err.message}`, "#ef4444");
        }
    },

    initializeBlankSkills: function() {
        this.hunterSkillsData = {};
        Object.keys(WILDLANDS_TREE).forEach(cat => {
            this.hunterSkillsData[cat] = {};
            WILDLANDS_TREE[cat].forEach(tier => {
                tier.skills.forEach(skill => {
                    this.hunterSkillsData[cat][skill.id] = {
                        current: 0,
                        medalEarned: false
                    };
                });
            });
        });
    },

    setupMobileMenu: function() {
        const toggleBtn = document.getElementById("mobileNavToggle");
        const menuWrapper = document.getElementById("navMenuWrapper");
        if (toggleBtn && menuWrapper) {
            toggleBtn.onclick = () => {
                menuWrapper.classList.toggle("active");
            };
        }
    },

    setStatus: function(msg, color) {
        const el = document.getElementById("syncStatus");
        if (el) {
            el.innerText = msg;
            if (color) el.style.borderColor = color;
        }
    },

    setupControlDropdowns: function() {
        const userSelect = document.getElementById("userSelect");
        if (userSelect) {
            userSelect.value = this.activeHunter;
            userSelect.onchange = (e) => {
                this.loadOperator(e.target.value, this.activePlatform);
            };
        }

        const platformSelect = document.getElementById("platformSelect");
        if (platformSelect) {
            platformSelect.value = this.activePlatform;
            platformSelect.onchange = (e) => {
                this.loadOperator(this.activeHunter, e.target.value);
            };
        }
    },

    populateWeaponSelects: function() {
        const fav1 = document.getElementById("editFav1");
        const fav2 = document.getElementById("editFav2");
        if (!fav1 || !fav2) return;

        fav1.innerHTML = '<option value="--">Select Weapon</option>';
        fav2.innerHTML = '<option value="--">Select Weapon</option>';

        Object.keys(WEAPONS_CATALOG).forEach(cat => {
            const grp1 = document.createElement("optgroup");
            grp1.label = cat;
            const grp2 = document.createElement("optgroup");
            grp2.label = cat;

            WEAPONS_CATALOG[cat].forEach(wpn => {
                grp1.appendChild(new Option(wpn, wpn));
                grp2.appendChild(new Option(wpn, wpn));
            });

            fav1.appendChild(grp1);
            fav2.appendChild(grp2);
        });
    },

    buildCategoryTabs: function() {
        const container = document.getElementById("skillsCategoryTabs");
        if (!container) return;

        container.innerHTML = "";
        Object.keys(WILDLANDS_TREE).forEach(cat => {
            const btn = document.createElement("button");
            btn.className = `tab-link ${cat === this.activeCategory ? 'active' : ''}`;
            btn.innerText = cat;
            btn.onclick = () => {
                this.activeCategory = cat;
                const firstSkill = WILDLANDS_TREE[cat][0].skills[0];
                if (firstSkill) this.selectedSkillId = firstSkill.id;

                document.querySelectorAll(".tab-link").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.renderTree();
            };
            container.appendChild(btn);
        });
    },

    setupFormControls: function() {
        const toggleBtn = document.getElementById("toggleEditStats");
        const editPanel = document.getElementById("editStatsPanel");
        const tierSel = document.getElementById("editTierActive");
        const tierGroup = document.getElementById("tierLevelGroup");

        if (tierSel && tierGroup) {
            tierSel.onchange = (e) => {
                tierGroup.style.display = (e.target.value === "on") ? "flex" : "none";
            };
        }

        if (toggleBtn && editPanel) {
            toggleBtn.onclick = () => {
                editPanel.classList.toggle("hidden");
                if (!editPanel.classList.contains("hidden")) {
                    this.populateForm();
                }
            };
        }

        const saveBtn = document.getElementById("saveStatsBtn");
        if (saveBtn) {
            saveBtn.onclick = () => {
                const getVal = (id, suffix = "") => {
                    const el = document.getElementById(id);
                    if (!el || el.value.trim() === "") return "--";
                    let val = el.value.trim();
                    if (suffix && !val.includes(suffix) && val !== "--") val = `${val}${suffix}`;
                    return val;
                };

                const pLevel = parseInt(document.getElementById("editPlayerLevel").value, 10) || 1;
                const tierMode = document.getElementById("editTierActive").value;
                const tLevel = parseInt(document.getElementById("editTierLevel").value, 10) || 50;

                this.statsData = {
                    playerLevel: Math.min(Math.max(pLevel, 1), 30),
                    tierActive: (pLevel >= 30 && tierMode === "on") ? "on" : "off",
                    tierLevel: Math.min(Math.max(tLevel, 1), 50),
                    playstyle: getVal("editPlaystyle"),
                    avgDist: getVal("editAvgDist"),
                    tactical: getVal("editTactical", "%"),
                    stealth: getVal("editStealth", "%"),
                    lifetime: getVal("editLifetime"),
                    longestShot: getVal("editLongest"),
                    precision: getVal("editPrecision", "%"),
                    favWeapon: getVal("editFav1"),
                    favWeapon2: getVal("editFav2"),
                    revives: getVal("editRevives"),
                    explosiveKills: getVal("editExplosiveKills"),
                    droneTime: getVal("editDroneTime"),
                    airTravel: getVal("editAir"),
                    groundTravel: getVal("editGround"),
                    paraTravel: getVal("editPara"),
                    mapDisc: getVal("editMap", "%")
                };

                this.sync();
                if (editPanel) editPanel.classList.add("hidden");
            };
        }

        const clearBtn = document.getElementById("clearStatsBtn");
        if (clearBtn) {
            clearBtn.onclick = () => {
                this.statsData = JSON.parse(JSON.stringify(BLANK_STATS));
                this.initializeBlankSkills();
                this.sync();
                if (editPanel) editPanel.classList.add("hidden");
            };
        }
    },

    populateForm: function() {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = (val !== undefined && val !== null && val !== "--") ? val : "";
        };

        setVal("editPlayerLevel", this.statsData.playerLevel || 1);
        const tierSel = document.getElementById("editTierActive");
        if (tierSel) tierSel.value = this.statsData.tierActive || "off";

        setVal("editTierLevel", this.statsData.tierLevel || 50);
        setVal("editPlaystyle", this.statsData.playstyle);
        setVal("editAvgDist", this.statsData.avgDist);
        setVal("editTactical", this.statsData.tactical);
        setVal("editStealth", this.statsData.stealth);
        setVal("editLifetime", this.statsData.lifetime);
        setVal("editLongest", this.statsData.longestShot);
        setVal("editPrecision", this.statsData.precision);
        setVal("editFav1", this.statsData.favWeapon);
        setVal("editFav2", this.statsData.favWeapon2);
        setVal("editRevives", this.statsData.revives);
        setVal("editExplosiveKills", this.statsData.explosiveKills);
        setVal("editDroneTime", this.statsData.droneTime);
        setVal("editAir", this.statsData.airTravel);
        setVal("editGround", this.statsData.groundTravel);
        setVal("editPara", this.statsData.paraTravel);
        setVal("editMap", this.statsData.mapDisc);

        const tierGroup = document.getElementById("tierLevelGroup");
        if (tierGroup) {
            tierGroup.style.display = (this.statsData.tierActive === "on") ? "flex" : "none";
        }
    },

    loadOperator: function(userName, platform) {
        this.activeHunter = userName;
        this.activePlatform = platform.toLowerCase();

        localStorage.setItem('active_gaming_nickname', this.activeHunter);
        localStorage.setItem('active_gaming_platform', this.activePlatform);

        if (this.masterUnsub) this.masterUnsub();

        const docRef = doc(this.db, 'users', this.activeHunter, 'platform', this.activePlatform, 'progress', GAME_ID);

        this.masterUnsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.stats) this.statsData = { ...BLANK_STATS, ...data.stats };
                if (data.skills) {
                    this.mergeLoadedSkills(data.skills);
                } else {
                    this.initializeBlankSkills();
                }
                this.setStatus(`✓ Sync Active [${this.activeHunter} - ${this.activePlatform.toUpperCase()}]`, "#10b981");
            } else {
                this.initializeBlankSkills();
                this.statsData = JSON.parse(JSON.stringify(BLANK_STATS));
                this.setStatus(`⚠️ No Saved Cloud Data for ${this.activeHunter} [${this.activePlatform.toUpperCase()}]`, "#ff8800");
            }
            this.updateStatsUI();
            this.renderTree();
        }, (err) => {
            console.error("Firestore Listen Error:", err);
            this.setStatus(`❌ Read Error: ${err.message}`, "#ef4444");
        });
    },

    mergeLoadedSkills: function(incomingSkills) {
        Object.keys(WILDLANDS_TREE).forEach(cat => {
            if (!this.hunterSkillsData[cat]) this.hunterSkillsData[cat] = {};
            const savedCat = incomingSkills[cat] || {};

            WILDLANDS_TREE[cat].forEach(tier => {
                tier.skills.forEach(skill => {
                    const saved = savedCat[skill.id];
                    this.hunterSkillsData[cat][skill.id] = {
                        current: saved ? (saved.current || 0) : 0,
                        medalEarned: saved ? !!saved.medalEarned : false
                    };
                });
            });
        });
    },

    updateStatsUI: function() {
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = (val !== undefined && val !== null && val !== "") ? val : "--";
        };

        const d = this.statsData;
        const pLevel = d.playerLevel || 1;
        setTxt("operatorName", this.activeHunter);
        setTxt("playerLevelDisplay", `LEVEL ${pLevel < 10 ? '0' + pLevel : pLevel}`);

        const tierValEl = document.getElementById("tierLevel");
        const tierBadgeContainer = document.getElementById("tierContainer");

        if (tierValEl && tierBadgeContainer) {
            if (d.tierActive === "on" && pLevel >= 30) {
                tierValEl.innerText = `${d.tierLevel || 50}`;
                tierBadgeContainer.style.backgroundColor = "#ff8800";
                tierBadgeContainer.style.opacity = "1";
            } else {
                tierValEl.innerText = "--";
                tierBadgeContainer.style.backgroundColor = "#233144";
                tierBadgeContainer.style.opacity = "0.7";
            }
        }

        setTxt("playstyleType", d.playstyle);
        setTxt("avgKillDist", d.avgDist);
        setTxt("tacticalValue", d.tactical);
        setTxt("stealthValue", d.stealth);
        setTxt("statLifetime", d.lifetime);
        setTxt("longestShot", d.longestShot);
        setTxt("precisionValue", d.precision);
        setTxt("favWeapon", d.favWeapon);
        setTxt("favWeapon2", d.favWeapon2);
        setTxt("statRevives", d.revives);
        setTxt("statExplosiveKills", d.explosiveKills);
        setTxt("statDroneTime", d.droneTime);
        setTxt("statAir", d.airTravel);
        setTxt("statGround", d.groundTravel);
        setTxt("statPara", d.paraTravel);
        setTxt("statMap", d.mapDisc);
    },

    renderTree: function() {
        const container = document.getElementById('treeContainer');
        if (!container) return;
        container.innerHTML = '';

        const tiers = WILDLANDS_TREE[this.activeCategory] || [];
        const currentLevel = this.statsData.playerLevel || 1;

        let activeSelectedSkillObj = null;
        let activeSelectedSkillMeta = null;

        tiers.forEach(tier => {
            const col = document.createElement("div");
            col.className = "tree-column";

            const colHeader = document.createElement("div");
            colHeader.className = "tree-column-header";
            colHeader.innerText = tier.tierName;
            col.appendChild(colHeader);

            tier.skills.forEach(skill => {
                const saved = (this.hunterSkillsData[this.activeCategory] && this.hunterSkillsData[this.activeCategory][skill.id]) || { current: 0, medalEarned: false };
                const currentRank = saved.current || 0;
                const maxRank = skill.maxSlots || 1;
                const isMaxed = currentRank >= maxRank;
                const isLocked = currentLevel < skill.reqLevel;
                const isSelected = this.selectedSkillId === skill.id;

                if (isSelected) {
                    activeSelectedSkillObj = skill;
                    activeSelectedSkillMeta = saved;
                }

                const block = document.createElement("div");
                block.className = `wildlands-skill-block ${isLocked ? 'is-locked' : 'is-unlocked'} ${isMaxed ? 'is-maxed' : ''} ${skill.isEpic ? 'is-epic' : ''} ${isSelected ? 'is-selected' : ''}`;

                const titleRow = document.createElement("div");
                titleRow.className = "skill-title-row";
                titleRow.innerHTML = `
                    <span class="skill-title-text">${skill.name}</span>
                    ${skill.hasMedal ? `<button type="button" class="medal-toggle-btn ${saved.medalEarned ? 'earned' : ''}" title="Toggle Bonus Medal">★</button>` : ''}
                `;

                if (skill.hasMedal) {
                    const starBtn = titleRow.querySelector(".medal-toggle-btn");
                    starBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.selectedSkillId = skill.id;
                        this.toggleBonusMedal(skill.id);
                    };
                }

                block.onclick = () => {
                    this.selectedSkillId = skill.id;
                    this.renderTree();
                };

                block.appendChild(titleRow);

                const slotsRow = document.createElement("div");
                slotsRow.className = "skill-slots-row";

                for (let i = 0; i < maxRank; i++) {
                    const dash = document.createElement("div");
                    const isFilled = i < currentRank;
                    dash.className = `skill-slot-dash ${isFilled ? (isMaxed ? 'max-filled' : 'filled') : ''}`;
                    dash.title = `Slot ${i + 1} of ${maxRank}`;
                    
                    dash.onclick = (e) => {
                        e.stopPropagation();
                        this.selectedSkillId = skill.id;
                        if (currentRank === i + 1) {
                            this.setExplicitRank(skill.id, skill.reqLevel, i);
                        } else {
                            this.setExplicitRank(skill.id, skill.reqLevel, i + 1);
                        }
                    };

                    slotsRow.appendChild(dash);
                }

                block.appendChild(slotsRow);
                col.appendChild(block);
            });

            container.appendChild(col);
        });

        this.renderInspectBox(activeSelectedSkillObj, activeSelectedSkillMeta);
    },

    renderInspectBox: function(skill, meta) {
        const inspectPanel = document.getElementById("inspectPanel");
        if (!inspectPanel) return;

        if (!skill) {
            inspectPanel.innerHTML = `<p class="inspect-desc">Select any skill block or slot to inspect details, rank slots, or toggle bonus medals.</p>`;
            return;
        }

        const currentRank = meta ? meta.current : 0;
        const maxRank = skill.maxSlots || 1;
        const isMaxed = currentRank >= maxRank;
        const isLocked = (this.statsData.playerLevel || 1) < skill.reqLevel;
        const medalEarned = meta ? !!meta.medalEarned : false;

        inspectPanel.innerHTML = `
            <div class="inspect-top-row">
                <h3 class="inspect-title">${skill.name}</h3>
                <span class="inspect-req">${isLocked ? `🔒 LOCKED (REQUIRED LEVEL ${skill.reqLevel})` : `UNLOCKED (RANK ${currentRank}/${maxRank})`}</span>
            </div>
            <p class="inspect-desc">${skill.desc}</p>

            <div class="inspect-action-bar">
                <button type="button" class="inspect-btn inspect-btn-rank ${isMaxed ? 'is-max' : ''}" id="btnRankUp">
                    ${isLocked ? `🔒 Locked (Lvl ${skill.reqLevel})` : (isMaxed ? '✓ Max Rank (Click to Reset)' : `⭐ Upgrade Rank Slot (${currentRank + 1}/${maxRank})`)}
                </button>

                ${skill.hasMedal ? `
                    <button type="button" class="inspect-btn inspect-btn-medal ${medalEarned ? 'active-medal' : ''}" id="btnToggleMedal">
                        ${medalEarned ? '★ Bonus Medal Found' : '☆ Claim Bonus Medal'}
                    </button>
                ` : ''}
            </div>
        `;

        const rankBtn = document.getElementById("btnRankUp");
        if (rankBtn && !isLocked) {
            rankBtn.onclick = () => {
                this.cycleRank(skill.id, skill.reqLevel, maxRank);
            };
        }

        const medalBtn = document.getElementById("btnToggleMedal");
        if (medalBtn) {
            medalBtn.onclick = () => {
                this.toggleBonusMedal(skill.id);
            };
        }
    },

    setExplicitRank: function(skillId, reqLevel, targetRank) {
        const currentLevel = this.statsData.playerLevel || 1;
        if (currentLevel < reqLevel) {
            alert(`This skill unlocks at Character Level ${reqLevel}. Update your level in 'Edit Tactical Profile' first.`);
            return;
        }

        const cat = this.activeCategory;
        if (!this.hunterSkillsData[cat]) this.hunterSkillsData[cat] = {};
        if (!this.hunterSkillsData[cat][skillId]) this.hunterSkillsData[cat][skillId] = { current: 0, medalEarned: false };

        this.hunterSkillsData[cat][skillId].current = targetRank;
        this.sync();
    },

    cycleRank: function(skillId, reqLevel, maxSlots) {
        const currentLevel = this.statsData.playerLevel || 1;
        if (currentLevel < reqLevel) {
            alert(`This skill unlocks at Character Level ${reqLevel}. Update your level in 'Edit Tactical Profile' first.`);
            return;
        }

        const cat = this.activeCategory;
        if (!this.hunterSkillsData[cat]) this.hunterSkillsData[cat] = {};
        if (!this.hunterSkillsData[cat][skillId]) this.hunterSkillsData[cat][skillId] = { current: 0, medalEarned: false };

        let nextRank = this.hunterSkillsData[cat][skillId].current + 1;
        if (nextRank > maxSlots) nextRank = 0;

        this.hunterSkillsData[cat][skillId].current = nextRank;
        this.sync();
    },

    toggleBonusMedal: function(skillId) {
        const cat = this.activeCategory;
        if (!this.hunterSkillsData[cat]) this.hunterSkillsData[cat] = {};
        if (!this.hunterSkillsData[cat][skillId]) this.hunterSkillsData[cat][skillId] = { current: 0, medalEarned: false };

        const current = !!this.hunterSkillsData[cat][skillId].medalEarned;
        this.hunterSkillsData[cat][skillId].medalEarned = !current;
        this.sync();
    },

    sync: async function() {
        this.renderTree();
        this.updateStatsUI();

        if (!this.db || !this.auth || !this.auth.currentUser) return;

        this.setStatus("⏳ Saving to Cloud Firestore...", "#ff8800");

        try {
            const ref = doc(this.db, 'users', this.activeHunter, 'platform', this.activePlatform, 'progress', GAME_ID);
            const payload = {
                user: this.activeHunter,
                platform: this.activePlatform,
                gameId: GAME_ID,
                skills: this.hunterSkillsData,
                stats: this.statsData,
                lastUpdated: new Date().toISOString()
            };

            await setDoc(ref, payload, { merge: true });
            const nyTime = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false });
            this.setStatus(`✓ Saved to Firestore [${nyTime} NY]`, "#10b981");
        } catch (err) {
            console.error("Firestore Save Error:", err);
            this.setStatus(`❌ Save Error: ${err.message}`, "#ef4444");
        }
    }
};

window.appState = appState;
appState.init();
