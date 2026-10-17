// Static Battlefield 3 tables used by the menu.
var BF3M = window.BF3M || (window.BF3M = {});

BF3M.data = {
  // code: [name, pack]
  MAPS: {
    MP_Subway: ['Operation Métro', 'BF3'], MP_017: ['Noshahr Canals', 'BF3'], MP_003: ['Tehran Highway', 'BF3'],
    MP_001: ['Grand Bazaar', 'BF3'], MP_011: ['Seine Crossing', 'BF3'], MP_007: ['Caspian Border', 'BF3'],
    MP_012: ['Operation Firestorm', 'BF3'], MP_013: ['Damavand Peak', 'BF3'], MP_018: ['Kharg Island', 'BF3'],
    XP1_001: ['Strike at Karkand', 'B2K'], XP1_002: ['Gulf of Oman', 'B2K'], XP1_003: ['Sharqi Peninsula', 'B2K'],
    XP1_004: ['Wake Island', 'B2K'], XP2_Palace: ['Donya Fortress', 'CQ'], XP2_Office: ['Operation 925', 'CQ'],
    XP2_Factory: ['Scrapmetal', 'CQ'], XP2_Skybar: ['Ziba Tower', 'CQ'], XP3_Desert: ['Bandar Desert', 'AK'],
    XP3_Alborz: ['Alborz Mountains', 'AK'], XP3_Shield: ['Armored Shield', 'AK'], XP3_Valley: ['Death Valley', 'AK'],
    XP4_Quake: ['Epicenter', 'AM'], XP4_FD: ['Markaz Monolith', 'AM'], XP4_Parl: ['Azadi Palace', 'AM'],
    XP4_Rubble: ['Talah Market', 'AM'], XP5_001: ['Operation Riverside', 'EG'], XP5_002: ['Nebandan Flats', 'EG'],
    XP5_003: ['Kiasar Railroad', 'EG'], XP5_004: ['Sabalan Pipeline', 'EG']
  },
  // bit: [short, long]
  MODES: {
    1: ['CQ', 'Conquest'], 64: ['CQL', 'Conquest Large'], 2: ['RUSH', 'Rush'], 32: ['TDM', 'Team Deathmatch'],
    8: ['SQDM', 'Squad Deathmatch'], 4: ['SQRUSH', 'Squad Rush'], 256: ['CQA', 'Conquest Assault'],
    128: ['CQAL', 'Conquest Assault Large'], 512: ['GM', 'Gun Master'], 1024: ['DOM', 'Conquest Domination'],
    2048: ['TDMCQ', 'TDM Close Quarters'], 131072: ['TS', 'Tank Superiority'], 4194304: ['SCAV', 'Scavenger'],
    8388608: ['AS', 'Air Superiority'], 524288: ['CTF', 'Capture the Flag']
  },
  PRESETS: { 1: 'Normal', 2: 'Hardcore', 4: 'Infantry', 8: 'Custom' },
  REGIONS: { 1: 'N. America', 2: 'S. America', 16: 'Europe', 32: 'Asia', 64: 'Oceania', 8: 'Africa' },
  KITS: [
    { id: 1, name: 'Assault', icon: 'assault' },
    { id: 2, name: 'Engineer', icon: 'engineer' },
    { id: 32, name: 'Support', icon: 'support' },
    { id: 8, name: 'Recon', icon: 'recon' }
  ],
  KIT_SLOTS: [
    ['primary', 'Primary weapon'], ['secondary', 'Side arm'], ['gadget1', 'Gadget 1'],
    ['gadget2', 'Gadget 2'], ['specialization', 'Specialization']
  ],
  ACCESSORY_SLOTS: ['Optic', 'Accessory', 'Barrel', 'Camo'],
  VEHICLE_SLOTS: {
    passive: 'Upgrade', active: 'Gadget', stance: 'Weapon',
    'pilot passive': 'Pilot upgrade', 'pilot active': 'Pilot gadget', 'pilot stance': 'Pilot weapon',
    'gunner passive': 'Gunner upgrade', 'gunner active': 'Gunner gadget', 'gunner stance': 'Gunner weapon'
  },
  RANKS: [
    'Recruit', 'Private First Class', 'Private First Class 1 Star', 'Private First Class 2 Star', 'Private First Class 3 Star',
    'Lance Corporal', 'Lance Corporal 1 Star', 'Lance Corporal 2 Star', 'Lance Corporal 3 Star',
    'Corporal', 'Corporal 1 Star', 'Corporal 2 Star', 'Corporal 3 Star',
    'Sergeant', 'Sergeant 1 Star', 'Sergeant 2 Star', 'Sergeant 3 Star',
    'Staff Sergeant', 'Staff Sergeant 1 Star', 'Staff Sergeant 2 Star',
    'Gunnery Sergeant', 'Gunnery Sergeant 1 Star', 'Gunnery Sergeant 2 Star',
    'Master Sergeant', 'Master Sergeant 1 Star', 'Master Sergeant 2 Star',
    'First Sergeant', 'First Sergeant 1 Star', 'First Sergeant 2 Star',
    'Master Gunnery Sergeant', 'Master Gunnery Sergeant 1 Star', 'Master Gunnery Sergeant 2 Star',
    'Sergeant Major', 'Sergeant Major 1 Star', 'Sergeant Major 2 Star',
    'Warrant Officer One', 'Chief Warrant Officer Two', 'Chief Warrant Officer Three', 'Chief Warrant Officer Four',
    'Chief Warrant Officer Five', 'Second Lieutenant', 'First Lieutenant', 'Captain', 'Major', 'Lieutenant Colonel', 'Colonel'
  ],
  rankName(n) {
    return n <= 45 ? (this.RANKS[n] || 'Rank ' + n) : 'Colonel Service Star ' + (n - 45);
  },
  mapName(code) { return (this.MAPS[code] || [code])[0]; },
  modeShort(bit) { return (this.MODES[bit] || [String(bit)])[0]; },
  modeLong(bit) { return (this.MODES[bit] || [null, 'Mode ' + bit])[1]; }
};
