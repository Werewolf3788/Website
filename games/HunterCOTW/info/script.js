/*
 * ==========================================
 * NYT TIMESTAMP: Thu, June 25, 2026, 3:20 AM EDT
 * PRECISION INTEGRATION: COTW Animal Registry Engine
 * NOTES: Added openImageLightbox and closeImageLightbox logic.
 * Avatars are now clickable to launch the high-res view.
 * ==========================================
 */

const NEED_ZONE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRoJv2R8-Yc8XvRWJWH4CfOPqsuZn2Z2wHmRaXeU6H5x7zWr9Y86SCB0lhz0WayaQYo5fjRfG3L6Plo/pub?output=csv';
const ANIMAL_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRrNDq9lb808GzOBrgu9-Pgjd5ZzxhJY1w9Gx_JVWhK5mXBrsIsZfRa5DGpnqiif-UUmMvCSk_Ou2vd/pub?output=csv';

const animalDatabase = [
    { name: "Coyote", class: 2, diff: "1-9 Legendary", type: "Weight", s: 38.4, g: 48.9, d: 56.8, go: false, weight: "Up to 27kg (60lbs)", fur: "Albino, Dark-Grey, Grey-Brown, Light Grey, Melanistic, Orange, Piebald", maps: "Layton Lake District, Rancho del Arroyo, New England Mountains", image: "" },
    { name: "Red Fox", class: 2, diff: "1-9 Legendary (10 Fabled)", type: "Weight", s: 4.66, g: 10.03, d: 14.05, go: true, weight: "1kg — 15.4kg (2lbs — 34lbs)", fur: "Albino, Dark Red, Melanistic, Orange, Piebald, Red. Fabled: Blood Moon, Candycane, Cherry Blossom, Licorice, Midnight Poppy, Mystic Snowdrop, Peppermint, Rosebud Frost, Scarlet Nightshade", maps: "Hirschfelden Hunting Reserve, Yukon Valley Nature Reserve, New England Mountains, Emerald Coast, Salzwiesen Park, Tòrr nan Sithean", image: "" },
    { name: "Eastern Gray Kangaroo", class: 4, diff: "1-9 Legendary", type: "Length", s: 226, g: 378, d: 492, go: false, weight: "29.25kg — 66.00kg (64lbs — 146lbs)", fur: "Albino, Grey Brown, Grey, Leucistic, Melanistic, Brown", maps: "Emerald Coast", image: "" },
    { name: "Iberian Wolf", class: 6, diff: "1-9 Legendary", type: "Skull", s: 32, g: 36, d: 39, go: false, weight: "30kg — 50kg (66lbs — 110lbs)", fur: "Albino, Grey, Grey-Brown, Melanistic, Olive, Pristine, Winter", maps: "Cuatro Colinas Game Reserve", image: "" },
    { name: "Gray Wolf", class: 6, diff: "1-9 Legendary (10 Fabled)", type: "Skull", s: 32, g: 36, d: 39, go: true, weight: "30kg — 80kg (66lbs — 176lbs)", fur: "Acromelanistic, Albino, Brown, Egg White, Dark Grey, Grey, Melanistic, Melanistic Charcoal, Red Brown. Fabled: Battlethorne, Dawnbreak, Frostbite, Gravehide, Hollow, Razorwind, Scarborne, Twinsoul, Vanguard", maps: "Yukon Valley Nature Reserve, Medved-Taiga National Park, Askiy Ridge Hunting Preserve", image: "" },
    { name: "Grizzly Bear", class: 8, diff: "1-9 Legendary", type: "Skull", s: 52.60, g: 60.80, d: 66.94, go: false, weight: "165kg — 680kg (364lbs — 1499lbs)", fur: "Albino, Brown, Grey Brown, Melanistic", maps: "Yukon Valley Nature Reserve", image: "" },
    { name: "Eurasian Brown Bear", class: 7, diff: "1-9 Legendary", type: "Skull", s: 18.6, g: 23.8, d: 27.7, go: false, weight: "110kg — 482kg (243lbs — 1063lbs)", fur: "Albino, Blond, Cinnamon, Dark Brown, Gold, Grey, Light Brown, Melanistic, Red-Brown, Spirit", maps: "Medved-Taiga National Park, Revontuli Coast", image: "" },
    { name: "Black Bear", class: 7, diff: "1-9 Legendary (10 Fabled)", type: "Skull", s: 14.3, g: 19.2, d: 22.8, go: true, weight: "40kg — 290kg (88lbs — 639lbs)", fur: "Albino, Blonde, Cinnamon, Dark, Melanistic, Piebald", maps: "Layton Lake District, Silver Ridge Peaks, Mississippi Acres Preserve, New England Mountains, Askiy Ridge Hunting Preserve", image: "" },
    { name: "Red Deer", class: 6, diff: "1-9 Legendary (10 Fabled)", type: "Antlers", s: 90.50, g: 182.25, d: 251.07, go: true, weight: "120kg — 240kg (265lbs — 529lbs)", fur: "Albino, Brown, Dark Brown, Erythristic, Leucistic, Light Brown, Melanistic, Piebald. Fabled: Spotted", maps: "Hirschfelden Hunting Reserve, Parque Fernando, Cuatro Colinas Game Reserve, Te Awaroa National Park, Emerald Coast, Tòrr nan Sithean", image: "" },
    { name: "Water Buffalo", class: 9, diff: "1-9 Legendary", type: "Horns", s: 84.27, g: 138.15, d: 167.54, go: false, weight: "Up to 1250kg (2756lbs)", fur: "Albino, Black, Brown, Grey, Orange", maps: "Parque Fernando, Sundarpatan", image: "" },
    { name: "Cape Buffalo", class: 9, diff: "1-9 Legendary", type: "Horns", s: 73.3, g: 117.93, d: 151.35, go: false, weight: "360kg — 950kg (794lbs — 2094lbs)", fur: "Albino, Black, Brown, Grey, Leucistic", maps: "Vurhonga Savanna", image: "" },
    { name: "Canada Goose", class: 1, diff: "1-5 Medium", type: "Weight", s: 4.40, g: 6.80, d: 8.59, go: false, weight: "3.2kg — 9.2kg (7lbs — 20lbs)", fur: "Albino, Brown Hybrid, Grey, Grey Brown, Light Grey Leucistic, Melanistic, White Hybrid", maps: "Hirschfelden Hunting Reserve, Revontuli Coast, Yukon Valley, Askiy Ridge Hunting Preserve", image: "" },
    { name: "Sika Deer", class: 4, diff: "1-5 Medium", type: "Antlers", s: 53.29, g: 136.40, d: 198.74, go: false, weight: "25kg — 75kg (55lbs — 165lbs)", fur: "Albino, Black, Brown, Dark Spotted, Red Spotted, Spotted", maps: "Te Awaroa National Park, Tòrr nan Sithean", image: "" },
    { name: "Feral Pig", class: 5, diff: "1-5 Medium", type: "Tusks", s: 37.50, g: 98.50, d: 144.25, go: false, weight: "32kg — 205kg (71lbs — 452lbs)", fur: "Albino, Blackgold, Black Spots, Black, Brown Hybrid, Dark Brown, Pink", maps: "Te Awaroa National Park, Emerald Coast", image: "" },
    { name: "Feral Goat", class: 3, diff: "1-5 Medium", type: "Horns", s: 89.44, g: 157.60, d: 208.71, go: false, weight: "25kg — 50kg (55lbs — 110lbs)", fur: "Albino, Black, Black Brown, Back White, Blonde, Brown, Dark Brown, Mixed, White, White Brown", maps: "Te Awaroa National Park, Emerald Coast, Tòrr nan Sithean", image: "" },
    { name: "Chamois", class: 3, diff: "2-5 Medium", type: "Horns", s: 30.84, g: 46.36, d: 58, go: false, weight: "35kg — 65kg (77lbs — 143lbs)", fur: "Albino, Brown, Dark-Brown, Grey Brown, Honeytones, Leucistic, Melanistic", maps: "Te Awaroa National Park", image: "" },
    { name: "Blacktail Deer", class: 4, diff: "1-5 Medium", type: "Antlers", s: 76.90, g: 134.40, d: 177.50, go: false, weight: "40kg — 95kg (88lbs — 209lbs)", fur: "Albino, Dark Grey, Grey, Grey-Brown, Melanistic, Piebald, Tan", maps: "Layton Lake District", image: "" },
    { name: "Fallow Deer", class: 4, diff: "1-5 Medium (10 Fabled)", type: "Antlers", s: 104.89, g: 187.81, d: 249.99, go: true, weight: "30kg — 100kg (66lbs — 220lbs)", fur: "Albino, Chocolate, Dark, Dark Spotted, Melanistic, Piebald, Red Spotted, Spotted, White. Fabled: Painted, Golden, Mocha, Hooded, Silver", maps: "Hirschfelden Hunting Reserve, Te Awaroa National Park, Emerald Coast, Tòrr nan Sithean", image: "" },
    { name: "Blackbuck", class: 3, diff: "1-5 Medium", type: "Horns", s: 71.8, g: 106.3, d: 132.2, go: false, weight: "Up to 51kg (112lbs)", fur: "Albino, Beige, Brown, Dark Brown, Leucistic, Melanistic, Piebald", maps: "Parque Fernando, Sundarpatan", image: "" },
    { name: "Mule Deer", class: 5, diff: "1-5 Medium (10 Fabled)", type: "Antlers", s: 98.36, g: 220.54, d: 312.17, go: true, weight: "70kg — 210kg (154lbs — 463lbs)", fur: "Albino, Blonde, Brown, Dilute, Erythristic Isabelline, Erythristic Red, Grey, Leucistic, Melanistic, Mosaic, Piebald. Fabled: Cinnamon Stripes, Cobweb Enigma, Dripple Drizzle, Dusky Drift, Milky Way, Petal Puff", maps: "Parque Fernando, Silver Ridge Peaks, Rancho del Arroyo, Askiy Ridge Hunting Preserve", image: "" },
    { name: "Axis Deer", class: 3, diff: "1-5 Medium", type: "Antlers", s: 72.8, g: 155.3, d: 217.2, go: false, weight: "Up to 75kg (165lbs)", fur: "Albino, Dark, Melanistic, Orange, Piebald, Spotted", maps: "Parque Fernando, Emerald Coast", image: "" },
    { name: "Sambar", class: 7, diff: "1-5 Medium", type: "Antlers", s: 67.92, g: 124.21, d: 166.24, go: false, weight: "180kg — 300kg (397lbs — 661lbs)", fur: "Albino, Brown, Dark Brown, Dusky Gradient, Leucistic, Light Brown, Piebald", maps: "Emerald Coast", image: "" },
    { name: "Javan Rusa", class: 5, diff: "1-5 Medium", type: "Antlers", s: 64.62, g: 112.7, d: 148.78, go: false, weight: "Up to 172kg (379lbs)", fur: "Albino, Brown, Leucistic, Light Brown, Piebald, Two Tones, White Brown", maps: "Emerald Coast", image: "" },
    { name: "Southeastern Spanish Ibex", class: 4, diff: "1-5 Medium", type: "Horns", s: 49.73, g: 72.56, d: 89.68, go: false, weight: "35kg — 90kg (77lbs — 198lbs)", fur: "Albino, Brown Hybrid, Buff, Grey-Brown, Light Brown, Light Grey, Melanistic, Orange", maps: "Cuatro Colinas Game Reserve", image: "" },
    { name: "Gredos Ibex", class: 4, diff: "1-5 Medium", type: "Horns", s: 54.34, g: 80.53, d: 100.17, go: false, weight: "35kg — 102kg (77lbs — 225lbs)", fur: "Albino, Brown Hybrid, Buff, Gray Brown, Grey, Light Brown, Light Grey, Melanistic", maps: "Cuatro Colinas Game Reserve", image: "" },
    { name: "Ronda Ibex", class: 4, diff: "1-5 Medium", type: "Horns", s: 69.29, g: 91.40, d: 107.98, go: false, weight: "35kg — 70kg (77lbs — 154lbs)", fur: "Albino, Brown, Brown Hybrid, Buff, Grey, Grey-Brown, Melanistic", maps: "Cuatro Colinas Game Reserve", image: "" },
    { name: "Beceite Ibex", class: 4, diff: "1-5 Medium", type: "Horns", s: 78.01, g: 142.93, d: 191.63, go: false, weight: "35kg — 110kg (77lbs — 243lbs)", fur: "Albino, Brown Hybrid, Buff, Grey, Grey-Brown, Light Brown, Melanistic, Orange", maps: "Cuatro Colinas Game Reserve", image: "" },
    { name: "Grant Caribou", class: 6, diff: "1-5 Medium", type: "Antlers", s: 152.53, g: 311.2, d: 430.23, go: false, weight: "Up to 190kg (419lbs)", fur: "Albino, Dark Brown, Leucistic, Light Brown, Melanistic, Piebald", maps: "Yukon Valley Nature Reserve", image: "" },
    { name: "Plains Bison", class: 9, diff: "1-5 Medium", type: "Horns", s: 117.73, g: 155.31, d: 183.5, go: false, weight: "350kg — 1200kg (772lbs — 2646lbs)", fur: "Albino, Brown, Dark, Light Brown, Light Grey, Leucistic, Melanistic", maps: "Yukon Valley Nature Reserve, Silver Ridge Peaks", image: "" },
    { name: "Moose", class: 8, diff: "1-5 Medium (10 Fabled)", type: "Antlers", s: 86.22, g: 194.09, d: 274.99, go: true, weight: "320kg — 620kg (705lbs — 1367lbs)", fur: "Acromelanistic, Albino, Brown, Dark-Brown, Light Brown, Melanistic, Mosaic, Piebald, Tan", maps: "Layton Lake District, Medved-Taiga National Park, Yukon Valley Nature Reserve, Te Awaroa National Park, Revontuli Coast, New England Mountains, Askiy Ridge Hunting Preserve", image: "" },
    { name: "Roosevelt Elk", class: 7, diff: "1-5 Medium", type: "Antlers", s: 128.7, g: 272.8, d: 380.8, go: false, weight: "260kg — 500kg (573lbs — 1102lbs)", fur: "Albino, Brown, Melanistic, Orange, Piebald, Tan", maps: "Layton Lake District", image: "" },
    { name: "Blue Wildebeest", class: 6, diff: "1-5 Medium", type: "Horns", s: 21.6, g: 30.8, d: 37.6, go: false, weight: "190kg — 290kg (419lbs — 639lbs)", fur: "Albino, Crowned, Dark Grey, Gold, Grey", maps: "Vurhonga Savanna", image: "" },
    { name: "Mountain Reindeer", class: 6, diff: "1-5 Medium", type: "Antlers", s: 152.53, g: 311.2, d: 430.23, go: false, weight: "80kg — 182kg (176lbs — 401lbs)", fur: "Albino, Brown, Dark-Brown, Leucistic, Light Brown, Melanistic, Piebald, Tan", maps: "Medved-Taiga National Park", image: "" },
    { name: "Wild Boar", class: 5, diff: "1-5 Medium (10 Fabled)", type: "Tusks", s: 37.50, g: 98.50, d: 144.25, go: true, weight: "25kg — 240kg (55lbs — 529lbs)", fur: "Albino, Blackgold, Brown, Dark Brown, Light Brown, Melanistic, Purplegrey", maps: "Hirschfelden Hunting Reserve, Medved-Taiga National Park, Cuatro Colinas Game Reserve, Tòrr nan Sithean", image: "" },
    { name: "Gemsbok", class: 6, diff: "1-5 Medium", type: "Horns", s: 194.8, g: 276.3, d: 337.5, go: false, weight: "100kg — 240kg (220lbs — 529lbs)", fur: "Beige, Dark, Grey, Light Grey, Gold", maps: "Vurhonga Savanna", image: "" },
    { name: "Springbok", class: 3, diff: "1-5 Medium", type: "Horns", s: 36.46, g: 60.51, d: 78.55, go: false, weight: "27kg — 42kg (60lbs — 93lbs)", fur: "Albino, Black Brown, Orange, Tan", maps: "Vurhonga Savanna", image: "" },
    { name: "Lesser Kudu", class: 4, diff: "1-5 Medium", type: "Horns", s: 107.8, g: 132.8, d: 151.6, go: false, weight: "50kg — 105kg (110lbs — 231lbs)", fur: "Albino, Grey, Dark Brown, Dusky, Melanistic, Red Brown", maps: "Vurhonga Savanna", image: "" },
    { name: "Rocky Mountain Elk", class: 7, diff: "1-5 Medium", type: "Antlers", s: 177.86, g: 351.32, d: 481.41, go: false, weight: "200kg — 480kg (441lbs — 1058lbs)", fur: "Albino, Brown, Common, Light Grey, Piebald", maps: "Silver Ridge Peaks", image: "" },
    { name: "Pronghorn", class: 3, diff: "1-5 Medium", type: "Horns", s: 36.65, g: 77.42, d: 108, go: false, weight: "35kg — 65kg (77lbs — 143lbs)", fur: "Albino, Brown, Dark, Leucistic, Melanistic, Piebald, Tan", maps: "Silver Ridge Peaks, Rancho del Arroyo, Askiy Ridge Hunting Preserve", image: "" },
    { name: "Rocky Mountain Bighorn Sheep", class: 5, diff: "1-5 Medium", type: "Horns", s: 84.10, g: 148.57, d: 196.93, go: false, weight: "Unknown", fur: "Albino, Black, Bronze, Brown, Grey, Leucistic, Melanistic, Piebald", maps: "Silver Ridge Peaks, Askiy Ridge Hunting Preserve", image: "" },
    { name: "Desert Bighorn Sheep", class: 5, diff: "1-5 Medium", type: "Horns", s: 84.10, g: 148.57, d: 196.93, go: false, weight: "Unknown", fur: "Albino, Brown, Erythristic, Grey, Leucistic, Light Brown, Light Grey, Piebald, Melanistic, Mosaic", maps: "Rancho del Arroyo", image: "" },
    { name: "Mountain Goat", class: 4, diff: "1-5 Medium", type: "Horns", s: 52.72, g: 84.12, d: 107.67, go: false, weight: "45kg — 145kg (99lbs — 320lbs)", fur: "Albino, Beige, Light Brown, Light Grey, Melanistic, White", maps: "Silver Ridge Peaks, Askiy Ridge Hunting Preserve", image: "" },
    { name: "European Rabbit", class: 1, diff: "1-3 Very Easy", type: "Weight", s: 1.24, g: 1.92, d: 2.42, go: false, weight: "900g — 2.6kg (2lbs — 6lbs)", fur: "Albino, Brown, Dark-Brown, Leucistic, Light Brown, Light Grey, Melanistic, Tan", maps: "Hirschfelden Hunting Reserve, Te Awaroa National Park, Salzwiesen Park", image: "" },
    { name: "Roe Deer", class: 3, diff: "1-3 Very Easy (10 Fabled)", type: "Antlers", s: 41.04, g: 64.37, d: 81.86, go: true, weight: "19kg — 35kg (41lbs — 77lbs)", fur: "Albino, Brown, Dark Brown, Dark Grey, Leucistic, Melanistic, Orange, Piebald, Tan", maps: "Hirschfelden Hunting Reserve, Cuatro Colinas Game Reserve, Tòrr nan Sithean", image: "" },
    { name: "Siberian Musk Deer", class: 2, diff: "1-3 Very Easy", type: "Tusks", s: 60, g: 168, d: 249, go: false, weight: "9kg — 17kg (20lbs — 37lbs)", fur: "Albino, Dark Brown, Grey Brown, Melanistic, Orange, Piebald", maps: "Medved-Taiga National Park", image: "" },
    { name: "European Hare", class: 1, diff: "1-3 Very Easy", type: "Weight", s: 3, g: 5, d: 6.5, go: false, weight: "2kg — 7kg (4lbs — 15lbs)", fur: "Albino, Brown, Dark-Brown, Light Brown, Grey, Melanistic", maps: "Cuatro Colinas Game Reserve", image: "" },
    { name: "White-tailed Jackrabbit", class: 1, diff: "1-3 Very Easy", type: "Weight", s: 2.8, g: 4.8, d: 6.3, go: false, weight: "Up to 6.8kg (15lbs)", fur: "Albino, Beige, Brown, Grey, Light Brown", maps: "Layton Lake District", image: "" },
    { name: "Scrub Hare", class: 1, diff: "1-3 Very Easy", type: "Weight", s: 2.4, g: 4.1, d: 5.3, go: false, weight: "Up to 5.8kg (13lbs)", fur: "Brown, Chestnut, Grey, Light Gray", maps: "Vurhonga Savanna", image: "" },
    { name: "Harlequin Duck", class: 1, diff: "1-3 Very Easy", type: "Weight", s: 5.34, g: 6.42, d: 7.23, go: false, weight: "500g — 750g (1.1lbs — 1.7lbs)", fur: "Albino, Dark, Dark Brown, Dark Grey, Grey, Melanistic, Piebald", maps: "Yukon Valley Nature Reserve", image: "" },
    { name: "Cinnamon Teal", class: 1, diff: "1-3 Very Easy", type: "Weight", s: 3.4, g: 4.1, d: 4.6, go: false, weight: "110g — 482g (0.2lbs — 1.1lbs)", fur: "Beige, Cinnamon, Melanistic, Piebald, Red", maps: "Parque Fernando, Intisuyu", image: "" },
    { name: "Mallard", class: 1, diff: "1-3 Very Easy", type: "Weight", s: 9.96, g: 15.48, d: 19.61, go: false, weight: "0.72kg — 2.1kg (2lbs — 5lbs)", fur: "Black-Brown, Blonde, Brown Hybrid, Leucistic, Melanistic, Piebald", maps: "Layton Lake District, Revontuli Coast, New England Mountains, Te Awaroa National Park, Salzwiesen Park, Askiy Ridge Hunting Preserve", image: "" },
    { name: "Merriam Turkey", class: 1, diff: "1-3 Very Easy", type: "Combined", s: 3.36, g: 4.08, d: 4.62, go: false, weight: "3.6kg — 11kg (8lbs — 24lbs)", fur: "Albino, Brown, Dark-Brown, Leucistic, Light Brown, Melanistic", maps: "Silver Ridge Peaks, Te Awaroa National Park, Layton Lake District", image: "https://static.wikia.nocookie.net/thehuntercotw/images/d/dc/MerriamsTurkey.png/revision/latest/scale-to-width-down/536?cb=20230202224630" }
];

const registryApp = {
    allMaps: new Set(),
    activeAnimal: null,
    needZones: [],
    syncCompleted: 0,

    parseCSV: function(str) {
        const arr = [];
        let quote = false;
        for (let row = 0, col = 0, c = 0; c < str.length; c++) {
            let cc = str[c], nc = str[c+1];
            arr[row] = arr[row] || [];
            arr[row][col] = arr[row][col] || '';
            if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
            if (cc == '"') { quote = !quote; continue; }
            if (cc == ',' && !quote) { ++col; continue; }
            if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
            if (cc == '\n' && !quote) { ++row; col = 0; continue; }
            if (cc == '\r' && !quote) { ++row; col = 0; continue; }
            arr[row][col] += cc;
        }
        return arr;
    },

    init: async function() {
        const mapFilter = document.getElementById('map-filter');
        
        animalDatabase.forEach(a => {
            a.maps.split(',').forEach(m => {
                const mapClean = m.trim();
                if (mapClean) this.allMaps.add(mapClean);
            });
        });

        Array.from(this.allMaps).sort().forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.innerText = m;
            mapFilter.appendChild(opt);
        });

        this.renderCards(animalDatabase);
        await this.syncGoogleSheets();
    },

    syncGoogleSheets: async function() {
        try {
            const animalRes = await fetch(ANIMAL_SHEET_URL);
            if (animalRes.ok) {
                const animalText = await animalRes.text();
                const animalRows = this.parseCSV(animalText);
                animalRows.shift();
                
                animalRows.forEach(row => {
                    if (row.length < 2) return;
                    const sheetName = row[0]?.trim();
                    if (!sheetName) return;

                    const matchIndex = animalDatabase.findIndex(a => a.name.toLowerCase() === sheetName.toLowerCase());
                    
                    const mappedData = {
                        name: sheetName,
                        class: row[1]?.trim() || "",
                        diff: row[2]?.trim() || "",
                        type: row[3]?.trim() || "",
                        s: row[4]?.trim() || "0",
                        g: row[5]?.trim() || "0",
                        d: row[6]?.trim() || "0",
                        go: (row[7]?.trim().toLowerCase() === 'yes' || row[7]?.trim().toLowerCase() === 'n/a' ? false : true),
                        weight: row[8]?.trim() || "",
                        fur: row[9]?.trim() || "",
                        maps: row[10]?.trim() || "",
                        image: row[11]?.trim() || ""
                    };

                    if (matchIndex !== -1) {
                        if (mappedData.image && mappedData.image.startsWith('http')) {
                            animalDatabase[matchIndex].image = mappedData.image;
                        }
                    } else {
                        animalDatabase.push(mappedData);
                    }
                });
                this.syncCompleted++;
            }

            const nzRes = await fetch(NEED_ZONE_SHEET_URL);
            if (nzRes.ok) {
                const nzText = await nzRes.text();
                const nzRows = this.parseCSV(nzText);
                nzRows.shift();
                
                this.needZones = nzRows.map(r => ({
                    animal: r[0]?.trim(),
                    type: r[1]?.trim(),
                    long: r[2]?.trim(),
                    lat: r[3]?.trim(),
                    start: r[4]?.trim(),
                    end: r[5]?.trim(),
                    map: r[6]?.trim(),
                    region: r[7]?.trim(),
                    landmark: r[8]?.trim()
                })).filter(z => z.animal && z.map);
                this.syncCompleted++;
            }

            this.filterCards();
            document.getElementById('sync-status').innerText = `LIVE SYNC COMPLETE (Pipelines: ${this.syncCompleted}/2) ✓`;
            document.getElementById('sync-status').style.color = '#22c55e';

        } catch (e) {
            console.error("Google Sheet Sync Error:", e);
            document.getElementById('sync-status').innerText = `SYNC ERROR: Using fallback local database.`;
            document.getElementById('sync-status').style.color = '#ef4444';
        }
    },

    filterCards: function() {
        const val = document.getElementById('map-filter').value;
        if (val === "All") {
            this.renderCards(animalDatabase);
        } else {
            const filtered = animalDatabase.filter(a => a.maps.includes(val));
            this.renderCards(filtered);
        }
    },

    renderCards: function(data) {
        const grid = document.getElementById('animal-grid');
        grid.innerHTML = '';

        data.forEach((animal, index) => {
            const card = document.createElement('div');
            card.className = `animal-card`;
            
            // Map the global array index for the specific animal so the image click always pulls the right data
            const globalIndex = animalDatabase.findIndex(a => a.name === animal.name);
            
            const imgHtml = animal.image 
                ? `<img src="${animal.image}" class="animal-avatar clickable" alt="Avatar" referrerpolicy="no-referrer" onclick="window.registryApp.openImageLightbox(${globalIndex})" title="Click to enlarge">` 
                : `<div class="animal-avatar"><span>No<br>Image</span></div>`;

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title-group">
                        ${imgHtml}
                        <h2>${animal.name}</h2>
                    </div>
                    <span class="class-badge">Class ${animal.class}</span>
                </div>
                <div class="card-stats">
                    <div class="stat-row"><strong>Difficulty:</strong> <span>${animal.diff}</span></div>
                    <div class="stat-row"><strong>Trophy Type:</strong> <span>${animal.type}</span></div>
                    <div class="stat-row"><strong>Weight:</strong> <span>${animal.weight}</span></div>
                    ${animal.go ? '<div class="stat-row" style="color:#ef4444; font-weight:bold; margin-top:5px; justify-content:center;">★ Great One Available ★</div>' : ''}
                </div>
                <div class="medal-row">
                    <span class="s">S: ${animal.s}</span>
                    <span class="g">G: ${animal.g}</span>
                    <span class="d">D: ${animal.d}</span>
                </div>
                <button class="btn-zones" onclick="window.registryApp.openNeedZone(${globalIndex})">VIEW NEED ZONES</button>
            `;
            grid.appendChild(card);
        });
    },

    openImageLightbox: function(index) {
        const animal = animalDatabase[index];
        if (!animal || !animal.image) return;
        
        document.getElementById('lb-zoomed-image').src = animal.image;
        document.getElementById('lb-zoomed-title').innerText = animal.name;
        document.getElementById('img-lightbox').style.display = 'flex';
    },

    closeImageLightbox: function(e, force = false) {
        if (force || e.target.id === 'img-lightbox') {
            document.getElementById('img-lightbox').style.display = 'none';
            document.getElementById('lb-zoomed-image').src = ''; 
        }
    },

    openNeedZone: function(index) {
        this.activeAnimal = animalDatabase[index];
        const lb = document.getElementById('nz-lightbox');
        
        document.getElementById('lb-animal-name').innerText = `${this.activeAnimal.name} ▾`;
        document.getElementById('lb-fur').innerText = this.activeAnimal.fur;
        
        if (this.activeAnimal.go) {
            document.getElementById('lb-go-maps').innerHTML = `<span style="color:#ef4444; font-weight:bold;">${this.activeAnimal.maps}</span>`;
        } else {
            document.getElementById('lb-go-maps').innerText = "None (Species does not have a Great One)";
        }

        document.getElementById('lb-details').classList.remove('show');

        const mapSelect = document.getElementById('lb-map-select');
        mapSelect.innerHTML = '';
        
        const animalMaps = this.activeAnimal.maps.split(',').map(m => m.trim());
        animalMaps.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.innerText = m;
            mapSelect.appendChild(opt);
        });

        this.updateMapImage();
        lb.style.display = 'flex';
    },

    toggleDetails: function() {
        document.getElementById('lb-details').classList.toggle('show');
    },

    updateMapImage: function() {
        const mapName = document.getElementById('lb-map-select').value;
        const imgEl = document.getElementById('lb-map-image');
        const dataBox = document.getElementById('lb-sheet-data');
        
        const encodedMapName = encodeURIComponent(`${this.activeAnimal.name} - ${mapName}`);
        imgEl.src = `https://placehold.co/1920x1080/1e293b/475569?text=${encodedMapName}+Need+Zones`;
        
        const matchedZones = this.needZones.filter(z => 
            z.animal.toLowerCase() === this.activeAnimal.name.toLowerCase() && 
            z.map.toLowerCase() === mapName.toLowerCase()
        );
        
        if (matchedZones.length > 0) {
            let html = `<table class="zone-table"><tr><th>Zone Type</th><th>Time Window</th><th>Coordinates</th><th>Location / Region</th></tr>`;
            matchedZones.forEach(z => {
                const geoString = (z.long && z.lat) ? `[${z.long}, ${z.lat}]` : 'N/A';
                const regionString = z.region || z.landmark || 'Unknown';
                html += `<tr>
                    <td style="text-transform: capitalize;">${z.type}</td>
                    <td>${z.start} - ${z.end}</td>
                    <td><span style="font-family:monospace; color:#38bdf8;">${geoString}</span></td>
                    <td>${regionString}</td>
                </tr>`;
            });
            html += `</table>`;
            dataBox.innerHTML = html;
        } else {
            dataBox.innerHTML = `<em>No need zones logged in the Google Sheet for <strong>${this.activeAnimal.name}</strong> on <strong>${mapName}</strong> yet. Log them in the sheet to populate this table.</em>`;
        }
    },

    closeLightbox: function(e, force = false) {
        if (force || e.target.id === 'nz-lightbox') {
            document.getElementById('nz-lightbox').style.display = 'none';
            this.activeAnimal = null;
        }
    }
};

window.registryApp = registryApp;
registryApp.init();
