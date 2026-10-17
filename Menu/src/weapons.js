// Weapon code -> picture name (profile/bf3/stats/items_147x88/<name>.png), read from Battlelog's own
// Weapons page; DLC weapons use names like xp1_qbb95 that can't be derived from the slug.
var BF3M = window.BF3M || (window.BF3M = {});
BF3M.WEAPON_IMAGES = {
  wLATJAV: 'fgm148', srSKS: 'sks', srM39: 'm39', mgPech: 'pecheneg', arM416: 'm416', caG36: 'g36c', pM412: 'mp412rex',
  srSV98: 'sv98', caAKS: 'aks74u', wLATRPG: 'rpg7', wasXBK: 'xp4_crossbowkobra', pG17: 'glock17', arAN94: 'an94', mgM60: 'm60',
  mgM27: 'm27', pM1911L: 'm1911flashlight_fancy', caSCAR: 'scarh', srMK11: 'mk11', pg18S: 'glock18_silenced', smUMP: 'ump',
  smPDR: 'magpul', srM98: 'm98b', pM9S: 'm9_silenced', mgL86A1: 'xp2_l86', srM40: 'm40a5', sgUSAS: 'usas12', mgLSAT: 'xp2_lsat',
  mgQBB95: 'xp1_qbb95', caHK53: 'xp1_hk53', pM1911: 'm1911', srQBU88: 'xp1_qbu88', arM16: 'm16a4', arAUG: 'xp2_steyraug',
  sgM1014: 'm1014', arAEK: 'aek971', arG3: 'g3', pTaur: 'taurus44', pG17S: 'glock17_silenced', wahUGL: 'm320', pg18: 'glock18',
  arF2: 'f2000', pM1911S: 'm1911silenced_fancy', wasK: 'combatknife', pMP443L: 'mp443_flashlight', pTaurS: 'taurus_scope',
  srL96: 'xp1_l96', mgRPK: 'rpk', arFAMAS: 'xp1_famas', mgM249: 'm249', caA91: 'a91', smVAL: 'asval', smP90: 'p90', pM93R: 'm93r',
  smPP19: 'xp1_pp19', sg870: 'remington870', srHK417: 'xp2_hk417', pMP443S: 'mp443_silenced', pM9F: 'm9_flashlight',
  smPP2000: 'pp2000', sgSPAS12: 'xp2_spas12', smMP7: 'mp7', arAK74: 'ak74m', wahUSG: 'm26mass', pMP443: 'mp443_grach',
  wasXBS: 'xp4_crossbowriflescope', sgSaiga: 'saiga12', arL85A2: 'xp1_l85a2', sgDAO: 'dao12', caSG553: 'sg553lb', mgT88: 'type88',
  wLAAIGL: 'sa18igla', mgM240: 'm240', caMTAR21: 'xp2_mtar', srSVD: 'svd', arKH: 'kh2002', sgJackH: 'xp1_jackhammer',
  arSCARL: 'xp2_scarl', pM1911T: 'm1911tactical_fancy', smM5K: 'xp2_mp5k', wLAAFIM: 'fim92a_stinger', pM9: 'm9', caACR: 'xp2_acr',
  caM4: 'm4a1', srJNG90: 'xp2_jng90', caQBZ95B: 'xp1_qbz95b', mgMG36: 'xp1_mg36', wLATSMAW: 'smaw'
};
BF3M.weaponImage = (w) => (w && BF3M.WEAPON_IMAGES[w.code]) || (w && w.slug ? w.slug.replace(/-/g, '') : '');
