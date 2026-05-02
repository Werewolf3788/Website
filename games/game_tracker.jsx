import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from 'firebase/auth';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'game-tracker-5b2ef';

// --- CONSOLIDATED SNIPER ELITE DATASET ---
const MISSION_DATA = [
  { 
    id: "behind-enemy-lines", 
    name: "1: Behind Enemy Lines", 
    items: [
        { id: "m1_wb_1", type: "Workbench", name: "Pistol Workbench (House)" }
    ] 
  },
  {
    id: "dead-drop",
    name: "2: Dead Drop",
    items: [
      { id: "m2_pl_1", type: "Letter", name: "A Lost Soul Trembles" },
      { id: "m2_pl_2", type: "Letter", name: "Missing You Dearly" },
      { id: "m2_pl_3", type: "Letter", name: "Surrounded by Idiots" },
      { id: "m2_pl_4", type: "Letter", name: "A Withering Tree" },
      { id: "m2_pl_5", type: "Letter", name: "A Nephew's Concern" },
      { id: "m2_cd_1", type: "Document", name: "Findings Report" },
      { id: "m2_cd_2", type: "Document", name: "Orders to Follow" },
      { id: "m2_cd_3", type: "Document", name: "Use the Library" },
      { id: "m2_cd_4", type: "Document", name: "Tightening Security" },
      { id: "m2_cd_5", type: "Document", name: "Increased Security" },
      { id: "m2_hi_1", type: "Hidden", name: "Police Report #222" },
      { id: "m2_hi_2", type: "Hidden", name: "Police Report #223" },
      { id: "m2_hi_3", type: "Hidden", name: "Police Report #224" },
      { id: "m2_hi_4", type: "Hidden", name: "La Résistance" },
      { id: "m2_se_1", type: "Eagle", name: "Stone Eagle #1 (Library)" },
      { id: "m2_se_2", type: "Eagle", name: "Stone Eagle #2 (Church)" },
      { id: "m2_se_3", type: "Eagle", name: "Stone Eagle #3 (Towers)" },
      { id: "m2_wb_1", type: "Workbench", name: "Rifle Workbench" },
      { id: "m2_wb_2", type: "Workbench", name: "Pistol Workbench" },
      { id: "m2_wb_3", type: "Workbench", name: "SMG Workbench" },
      { id: "m2_tr_1", type: "Trophy", name: "File O' Facts (Recover Evidence)" }
    ]
  },
  {
    id: "sonderzuge-sabotage",
    name: "3: Sonderzüge Sabotage",
    items: [
      { id: "m3_pl_1", type: "Letter", name: "Be Safe, My Dear" },
      { id: "m3_pl_2", type: "Letter", name: "We Are Everywhere" },
      { id: "m3_pl_3", type: "Letter", name: "Cross of Lorraine" },
      { id: "m3_pl_4", type: "Letter", name: "Missing Her Birthday" },
      { id: "m3_pl_5", type: "Letter", name: "The Scars of War" },
      { id: "m3_cd_1", type: "Document", name: "Gestapo Briefing" },
      { id: "m3_cd_2", type: "Document", name: "Hotel Refurbishment" },
      { id: "m3_cd_3", type: "Document", name: "Hotel Storage" },
      { id: "m3_cd_4", type: "Document", name: "Rail Network Control" },
      { id: "m3_cd_5", type: "Document", name: "Cargo Details" },
      { id: "m3_hi_1", type: "Hidden", name: "Resistance Flag" },
      { id: "m3_hi_2", type: "Hidden", name: "Gestapo ID Badge" },
      { id: "m3_hi_3", type: "Hidden", name: "Le Sniper" },
      { id: "m3_se_1", type: "Eagle", name: "Stone Eagle #1 (Gate)" },
      { id: "m3_se_2", type: "Eagle", name: "Stone Eagle #2 (Dome)" },
      { id: "m3_se_3", type: "Eagle", name: "Stone Eagle #3 (Clock)" },
      { id: "m3_wb_1", type: "Workbench", name: "Pistol Workbench" },
      { id: "m3_wb_2", type: "Workbench", name: "Rifle Workbench" },
      { id: "m3_wb_3", type: "Workbench", name: "SMG Workbench" }
    ]
  },
  {
    id: "collision-course",
    name: "4: Collision Course",
    items: [
      { id: "m4_pl_1", type: "Letter", name: "A Gift, and a Name" },
      { id: "m4_pl_2", type: "Letter", name: "I Will Miss You" },
      { id: "m4_pl_3", type: "Letter", name: "What a Discovery" },
      { id: "m4_pl_4", type: "Letter", name: "So Boring!" },
      { id: "m4_pl_5", type: "Letter", name: "I'm So Sorry" },
      { id: "m4_cd_1", type: "Document", name: "Transfer Details" },
      { id: "m4_cd_2", type: "Document", name: "Requisition Orders" },
      { id: "m4_cd_3", type: "Document", name: "Findings Report" },
      { id: "m4_cd_4", type: "Document", name: "Requesting Support" },
      { id: "m4_cd_5", type: "Document", name: "Dam Damage Report" },
      { id: "m4_hi_1", type: "Hidden", name: "Wine Bottle" },
      { id: "m4_hi_2", type: "Hidden", name: "Gas Mask" },
      { id: "m4_hi_3", type: "Hidden", name: "Libération" },
      { id: "m4_se_1", type: "Eagle", name: "Stone Eagle #1 (Cliffs)" },
      { id: "m4_se_2", type: "Eagle", name: "Stone Eagle #2 (Castle)" },
      { id: "m4_se_3", type: "Eagle", name: "Stone Eagle #3 (Broken Dam)" },
      { id: "m4_wb_1", type: "Workbench", name: "SMG Workbench" },
      { id: "m4_wb_2", type: "Workbench", name: "Pistol Workbench" },
      { id: "m4_wb_3", type: "Workbench", name: "Rifle Workbench" },
      { id: "m4_tr_1", type: "Trophy", name: "Sprung a Leak (Sabotage Pump)" },
      { id: "m4_tr_2", type: "Trophy", name: "Lost Its Way Gnome (Photo)" }
    ]
  },
  {
    id: "devils-cauldron",
    name: "5: Devil's Cauldron",
    items: [
      { id: "m5_pl_1", type: "Letter", name: "Location Exposed" },
      { id: "m5_pl_2", type: "Letter", name: "A Childish Party!" },
      { id: "m5_pl_3", type: "Letter", name: "I Miss You So Much" },
      { id: "m5_pl_4", type: "Letter", name: "It Is All in Ruins" },
      { id: "m5_pl_5", type: "Letter", name: "Be a Man, Not a Boy" },
      { id: "m5_cd_1", type: "Document", name: "Scuttle Order" },
      { id: "m5_cd_2", type: "Document", name: "Wilhelm's Folly" },
      { id: "m5_cd_3", type: "Document", name: "Classified Cargo" },
      { id: "m5_cd_4", type: "Document", name: "Intruder Spotted" },
      { id: "m5_cd_5", type: "Document", name: "Scuttle Instructions" },
      { id: "m5_hi_1", type: "Hidden", name: "Playing Cards" },
      { id: "m5_hi_2", type: "Hidden", name: "Laboratory ID" },
      { id: "m5_hi_3", type: "Hidden", name: "Le Maquis Voit Tout!" },
      { id: "m5_se_1", type: "Eagle", name: "Stone Eagle #1 (Lighthouse)" },
      { id: "m5_se_2", type: "Eagle", name: "Stone Eagle #2 (Bridge)" },
      { id: "m5_se_3", type: "Eagle", name: "Stone Eagle #3 (Crane)" },
      { id: "m5_wb_1", type: "Workbench", name: "Rifle Workbench" },
      { id: "m5_wb_2", type: "Workbench", name: "Pistol Workbench" },
      { id: "m5_wb_3", type: "Workbench", name: "SMG Workbench" },
      { id: "m5_tr_1", type: "Trophy", name: "Stopping Traffic (Destroy Trucks)" }
    ]
  },
  {
    id: "assault-on-fort-rouge",
    name: "6: Assault on Fort Rouge",
    items: [
      { id: "m6_pl_1", type: "Letter", name: "Just Do Your Job." },
      { id: "m6_pl_2", type: "Letter", name: "I Am Fed Up" },
      { id: "m6_pl_3", type: "Letter", name: "Something Is Strange" },
      { id: "m6_pl_4", type: "Letter", name: "Beautiful Views" },
      { id: "m6_pl_5", type: "Letter", name: "Fools Everywhere" },
      { id: "m6_cd_1", type: "Document", name: "Roof Weakness Found" },
      { id: "m6_cd_2", type: "Document", name: "Defend Our Skies" },
      { id: "m6_cd_3", type: "Document", name: "Ready on Your Order" },
      { id: "m6_cd_4", type: "Document", name: "No Retreat" },
      { id: "m6_cd_5", type: "Document", name: "Schoene's Notes" },
      { id: "m6_hi_1", type: "Hidden", name: "Todt Uniform Badge" },
      { id: "m6_hi_2", type: "Hidden", name: "Committee C Map" },
      { id: "m6_hi_3", type: "Hidden", name: "Prende Le Maquis" },
      { id: "m6_se_1", type: "Eagle", name: "Stone Eagle #1 (Abbey)" },
      { id: "m6_se_2", type: "Eagle", name: "Stone Eagle #2 (Entrance)" },
      { id: "m6_se_3", type: "Eagle", name: "Stone Eagle #3 (Corner)" },
      { id: "m6_wb_1", type: "Workbench", name: "Rifle Workbench" },
      { id: "m6_wb_2", type: "Workbench", name: "SMG Workbench" },
      { id: "m6_wb_3", type: "Workbench", name: "Pistol Workbench" }
    ]
  },
  {
    id: "lock-stock-barrels",
    name: "7: Lock, Stock and Barrels",
    items: [
      { id: "m7_pl_1", type: "Letter", name: "What Do They Want?" },
      { id: "m7_pl_2", type: "Letter", name: "Everything Is Fine!" },
      { id: "m7_pl_3", type: "Letter", name: "I Feel Uneasy" },
      { id: "m7_pl_4", type: "Letter", name: "Lying Is Necessary" },
      { id: "m7_pl_5", type: "Letter", name: "Do Not Worry, Mother" },
      { id: "m7_cd_1", type: "Document", name: "A Service Hatch" },
      { id: "m7_cd_2", type: "Document", name: "Control Room Key" },
      { id: "m7_cd_3", type: "Document", name: "Rocket Fuse Setup" },
      { id: "m7_cd_4", type: "Document", name: "Hydraulics Concerns" },
      { id: "m7_cd_5", type: "Document", name: "Vulnerability Found" },
      { id: "m7_hi_1", type: "Hidden", name: "Engraved Lighter" },
      { id: "m7_hi_2", type: "Hidden", name: "Gold Pocket Watch" },
      { id: "m7_hi_3", type: "Hidden", name: "La Voux Du Maquis" },
      { id: "m7_se_1", type: "Eagle", name: "Stone Eagle #1 (Windmill)" },
      { id: "m7_se_2", type: "Eagle", name: "Stone Eagle #2 (Nazi Bldg)" },
      { id: "m7_se_3", type: "Eagle", name: "Stone Eagle #3 (Train Bldg)" },
      { id: "m7_wb_1", type: "Workbench", name: "Rifle Workbench" },
      { id: "m7_wb_2", type: "Workbench", name: "SMG Workbench" },
      { id: "m7_wb_3", type: "Workbench", name: "Pistol Workbench" },
      { id: "m7_gn_1", type: "Gnome", name: "Gnome #1 (Slope)" },
      { id: "m7_gn_2", type: "Gnome", name: "Gnome #2 (Mill Wheel)" },
      { id: "m7_gn_3", type: "Gnome", name: "Gnome #3 (Island)" },
      { id: "m7_gn_4", type: "Gnome", name: "Gnome #4 (Pond Rock)" },
      { id: "m7_gn_5", type: "Gnome", name: "Gnome #5 (Wheelbarrows)" },
      { id: "m7_gn_6", type: "Gnome", name: "Gnome #6 (Roof Hole)" },
      { id: "m7_gn_7", type: "Gnome", name: "Gnome #7 (Flowerbed Tree)" },
      { id: "m7_gn_8", type: "Gnome", name: "Gnome #8 (Veg Planter)" },
      { id: "m7_gn_9", type: "Gnome", name: "Gnome #9 (Fruit Barrel)" },
      { id: "m7_gn_10", type: "Gnome", name: "Gnome #10 (Garden Bed)" }
    ]
  },
  {
    id: "end-of-the-line",
    name: "8: End of the Line",
    items: [
      { id: "m8_pl_1", type: "Letter", name: "Victory Is Imminent!" },
      { id: "m8_pl_2", type: "Letter", name: "Home Soon, My Love" },
      { id: "m8_pl_3", type: "Letter", name: "What We've Achieved" },
      { id: "m8_pl_4", type: "Letter", name: "Burn After Reading" },
      { id: "m8_pl_5", type: "Letter", name: "I Think This Is It" },
      { id: "m8_cd_1", type: "Document", name: "Zugwerfer Departure" },
      { id: "m8_cd_2", type: "Document", name: "Prepare to Strike!" },
      { id: "m8_cd_3", type: "Document", name: "Rusty Turntable" },
      { id: "m8_cd_4", type: "Document", name: "Railyard Management" },
      { id: "m8_cd_5", type: "Document", name: "Turret Locations" },
      { id: "m8_hi_1", type: "Hidden", name: "AA Repair Manual" },
      { id: "m8_hi_2", type: "Hidden", name: "New Tank Blueprints" },
      { id: "m8_hi_3", type: "Hidden", name: "Pour Une France Libre" },
      { id: "m8_se_1", type: "Eagle", name: "Stone Eagle #1 (Crane)" },
      { id: "m8_se_2", type: "Eagle", name: "Stone Eagle #2 (Main Bldg)" },
      { id: "m8_se_3", type: "Eagle", name: "Stone Eagle #3 (Hill Tower)" },
      { id: "m8_wb_1", type: "Workbench", name: "Pistol (Trenches Bldg)" },
      { id: "m8_wb_2", type: "Workbench", name: "Rifle (Main Factory)" },
      { id: "m8_wb_3", type: "Workbench", name: "SMG (Warehouse)" },
      { id: "m8_tr_1", type: "Trophy", name: "Tanks for Nothing! (Panzer)" }
    ]
  },
  {
    id: "vercors-vendetta",
    name: "DLC: Vercors Vendetta",
    items: [
      { id: "dv_pl_1", type: "Letter", name: "No Brother of Mine" },
      { id: "dv_pl_2", type: "Letter", name: "The Lord Guides Us" },
      { id: "dv_pl_3", type: "Letter", name: "New Cannons" },
      { id: "dv_pl_4", type: "Letter", name: "Gas Mask Shortage" },
      { id: "dv_pl_5", type: "Letter", name: "Worst Officer Alive" },
      { id: "dv_cd_1", type: "Document", name: "Warhead Storage" },
      { id: "dv_cd_2", type: "Document", name: "Final Warning" },
      { id: "dv_cd_3", type: "Document", name: "Nebelwerfer Maint." },
      { id: "dv_cd_4", type: "Document", name: "Think Before Firing" },
      { id: "dv_cd_5", type: "Document", name: "Nebelwerfer Repaired" },
      { id: "dv_hi_1", type: "Hidden", name: "Radio Tin" },
      { id: "dv_hi_2", type: "Hidden", name: "Lucky Rabbit's Foot" },
      { id: "dv_hi_3", type: "Hidden", name: "Pour Les Francais" },
      { id: "dv_se_1", type: "Eagle", name: "Stone Eagle #1 (Clifftop)" },
      { id: "dv_se_2", type: "Eagle", name: "Stone Eagle #2 (Nazi Bldg)" },
      { id: "dv_se_3", type: "Eagle", name: "Stone Eagle #3 (Kill Bldg)" },
      { id: "dv_wb_1", type: "Workbench", name: "Resistance Hideout" },
      { id: "dv_wb_2", type: "Workbench", name: "Waterfall Lookout" },
      { id: "dv_wb_3", type: "Workbench", name: "Gaswaffen Command" }
    ]
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [currentSection, setCurrentSection] = useState(MISSION_DATA[1].id);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");

  // Rule 3: Auth first
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
          await signInWithCustomToken(auth, __initial_auth_token);
        } catch (e) {
          await signInAnonymously(auth);
        }
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Sync Data
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    // Standard Rule 1 path
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'sniper_missions', currentSection);
    
    const unsubscribe = onSnapshot(docRef, (snap) => {
      setItems(snap.exists() ? snap.data().items || [] : []);
      setLoading(false);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentSection]);

  const toggleStatus = async (itemId, owner) => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'sniper_missions', currentSection);
    
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const currentStatus = item[owner] || 'missing';
        return { ...item, [owner]: currentStatus === 'collected' ? 'missing' : 'collected' };
      }
      return item;
    });

    try {
      await setDoc(docRef, { items: updatedItems }, { merge: true });
    } catch (e) {
      console.error("Update error:", e);
    }
  };

  const seedDatabase = async () => {
    if (!user) return;
    setStatusMsg("Initializing folders...");
    try {
      for (const m of MISSION_DATA) {
        const r = doc(db, 'artifacts', appId, 'public', 'data', 'sniper_missions', m.id);
        await setDoc(r, { 
          name: m.name, 
          items: m.items.map(i => ({ ...i, kevin: 'missing', ray: 'missing' })) 
        }, { merge: true });
      }
      setStatusMsg("Success: SE Folders Ready!");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (e) {
      setStatusMsg("Error: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-2 font-sans overflow-x-hidden">
      
      {/* HEADER: 50px | TEXT: 30px */}
      <header className="flex items-center justify-between px-3 bg-neutral-900 rounded-lg mb-2 h-[50px]">
        <h1 className="font-bold text-red-600 truncate leading-none flex items-center h-full" style={{ fontSize: '30px' }}>
          SNIPER ELITE
        </h1>
        {statusMsg && (
          <div className="text-[10px] bg-red-900/50 text-red-200 px-2 py-1 rounded animate-pulse">
            {statusMsg}
          </div>
        )}
      </header>

      {/* MISSION SELECTOR: 30px */}
      <div className="mb-4 h-[30px]">
        <select 
          value={currentSection}
          onChange={(e) => setCurrentSection(e.target.value)}
          className="w-full h-full bg-neutral-800 border border-neutral-700 rounded px-2 text-[14px] text-neutral-100 outline-none"
        >
          {MISSION_DATA.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* LABELS: 50px */}
      <div className="flex items-center px-4 bg-neutral-800 rounded-t-lg border-b border-neutral-700 h-[50px]">
        <span className="flex-grow font-bold text-neutral-400 uppercase tracking-tighter" style={{ fontSize: '18px' }}>
          Collectibles
        </span>
        <div className="flex gap-4 pr-1">
          <span className="w-12 text-center text-[10px] font-black text-blue-500 uppercase">Kevin</span>
          <span className="w-12 text-center text-[10px] font-black text-red-500 uppercase">Ray</span>
        </div>
      </div>

      {/* ITEM LIST: 30px Rows | 14px Text */}
      <div className="bg-neutral-900 rounded-b-lg overflow-hidden border border-neutral-800 shadow-2xl">
        {!user ? (
          <div className="p-8 text-center text-neutral-600 uppercase text-[12px] font-bold">Authenticating...</div>
        ) : loading ? (
          <div className="p-8 text-center animate-pulse text-neutral-600 uppercase text-[12px] font-bold">Syncing...</div>
        ) : items.length > 0 ? (
          items.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center px-4 border-b border-neutral-800 active:bg-neutral-800 h-[30px] transition-colors"
            >
              <div className="flex-grow truncate pr-2 flex items-center overflow-hidden">
                <span className="text-[8px] bg-neutral-800 px-1 rounded mr-2 text-neutral-500 uppercase font-black w-10 text-center border border-neutral-700 shrink-0">
                  {item.type.substring(0,3)}
                </span>
                <span className="truncate leading-none text-neutral-300" style={{ fontSize: '14px' }}>
                  {item.name}
                </span>
              </div>
              
              <div className="flex gap-4 pr-1 shrink-0">
                {/* Status Toggle for Kevin */}
                <button 
                  onClick={() => toggleStatus(item.id, 'kevin')}
                  className={`w-12 h-[18px] rounded flex items-center justify-center transition-all ${item.kevin === 'collected' ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]' : 'bg-neutral-800 border border-neutral-700'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${item.kevin === 'collected' ? 'bg-white' : 'bg-neutral-600'}`}></div>
                </button>
                {/* Status Toggle for Ray */}
                <button 
                  onClick={() => toggleStatus(item.id, 'ray')}
                  className={`w-12 h-[18px] rounded flex items-center justify-center transition-all ${item.ray === 'collected' ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.4)]' : 'bg-neutral-800 border border-neutral-700'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${item.ray === 'collected' ? 'bg-white' : 'bg-neutral-600'}`}></div>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center">
            <p className="text-neutral-600 text-[12px] uppercase font-bold mb-4 leading-relaxed">Sniper Missions Folder is Empty</p>
            <button 
              onClick={seedDatabase}
              className="px-6 py-2 border border-red-900 text-red-700 text-[10px] font-black rounded uppercase hover:bg-red-950 transition-all"
            >
              Push SE Guide Data
            </button>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="mt-8 px-4 flex justify-between items-end pb-4">
        <div>
           <p className="text-[10px] uppercase font-black text-neutral-700 tracking-widest leading-tight">
            Admin: Kevin
          </p>
          <p className="text-[10px] uppercase font-black text-neutral-700 tracking-widest leading-tight">
            Partner: Ray
          </p>
        </div>
        <div className="text-[9px] text-neutral-800 uppercase font-bold flex flex-col items-end">
           <span>DB ID: game-tracker-5b2ef</span>
           <span>Exp: 06/01/26</span>
        </div>
      </footer>

    </div>
  );
}
