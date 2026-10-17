// Vehicle code -> [picture name (profile/bf3/stats/items_147x88/<name>.png), display name].
// Taken from Battlelog's own Vehicles page; the picture names don't follow the slugs.
var BF3M = window.BF3M || (window.BF3M = {});
BF3M.VEHICLES = {
  ifvBTR90: ['btr90', 'BTR-90'], ahMi28: ['mi28', 'MI-28 Havoc'], saaCRAM: ['centurion', 'Centurion C-RAM'],
  jaA10: ['a10', 'A-10 Thunderbolt'], shz11: ['z11', 'Z-11W'], mbtT90: ['t90', 'T-90A'], aaLAV: ['lav-ad', 'LAV-AD'],
  trITV: ['growler', 'Growler ITV'], trVanM: ['xp4_van', 'Rhino'], trhmvnxp5: ['humvee_asrad', 'HMMWV ASRAD'],
  trRIB: ['rhib', 'RHIB Boat'], trQB: ['quadbike', 'Quad Bike'], vmaG: ['gunship', 'Gunship'], saaPant: ['pantsir', 'Pantsir-S1'],
  jfSu35: ['su35', 'SU-35BM Flanker-E'], ahAH1Z: ['ah1z', 'AH-1Z Viper'], ifvBMP: ['bmp2', 'BMP-2M'],
  trVod: ['vodnik', 'GAZ-3937 Vodnik'], sKorn: ['kornet', '9M133 Kornet Launcher'], ifvLAV: ['lav-25', 'LAV-25'],
  trDpv: ['dpv', 'DPV'], jaSU25: ['su39', 'SU-25TM Frogfoot'], jfF18: ['f18', 'F/A-18E Super Hornet'], mtdM1128: ['m1128', 'M1128'],
  jfx1F35JSF: ['f35', 'F-35'], mbtM1A: ['m1a2', 'M1 Abrams'], trVodnM: ['xp4_vodnik', 'Barsuk'], trKA60: ['ka60', 'KA-60 Kasatka'],
  mtdSPRUTSD: ['sprutsd', 'Sprut-SD'], trVodnxp5: ['vodnikaa', 'Vodnik AA'], vmaD: ['dropship', 'Dropship'], martBM23: ['bm23', 'BM-23'],
  atTOW: ['tow', 'M220 TOW Launcher'], martHIM: ['himars', 'M142'], aa9k22: ['tunguska', '9K22 Tunguska-M'], trVDV: ['vdv', 'VDV Buggy'],
  trUH1: ['venom', 'UH-1Y Venom'], trHum: ['humvee', 'M1114 HMMWV'], trAAV: ['aav', 'AAV-7A1 AMTRAC'], shAH6: ['ah6', 'AH-6J Little Bird'],
  trSkid: ['skidloader', 'Skid Loader'], trKLR: ['klr650', 'Dirtbike'], trHmvM: ['xp4_humvee', 'Phoenix']
};
BF3M.vehicleImage = (v) => {
  const e = v && BF3M.VEHICLES[v.code];
  return e ? e[0] : (v && v.slug ? v.slug.replace(/-/g, '') : '');
};
BF3M.vehicleName = (v) => {
  const e = v && BF3M.VEHICLES[v.code];
  return e ? e[1] : String((v && v.name) || '').replace(/^Vehicle /, '');
};

// Vector icon per vehicle category (Battlelog has no category pictures).
BF3M.VEHICLE_TYPE_SVG = {
  tank: '<path d="M2 14h20l-2.5 5h-15z"/><path d="M6.5 10h9l1.6 4H5z"/><path d="M15 10.6h7.5v1.4H15z"/>',
  heli: '<ellipse cx="10" cy="13" rx="6" ry="3.4"/><path d="M15 12.2h7.5v1.6H15z"/><path d="M20.5 9.5h1.6v4.3h-1.6z"/><path d="M2.5 7h16v1.4h-16z"/><path d="M9.8 8.4h1.4v1.8H9.8z"/><path d="M5 18.2h10v1.2H5z"/>',
  jet: '<path d="M12 1.5l1.6 7.3 8 4.2v1.8l-8-1.6-.6 4.9 2.8 2v1.4L12 20.6l-3.8.9v-1.4l2.8-2-.6-4.9-8 1.6V13l8-4.2z"/>',
  transport: '<path d="M2.5 12.5h3.5l2.2-3.5h7.3l3 3.5h3v4h-19z"/><circle cx="7" cy="17.2" r="2.2"/><circle cx="17" cy="17.2" r="2.2"/>',
  boat: '<path d="M2 14h20l-3.2 5H5z"/><path d="M8 9.5h7l1.5 4.5H8z"/>',
  stationary: '<path d="M5.5 9h11v3h-11z"/><path d="M16.5 10h5v1h-5z"/><path d="M10.4 12h2v4.5h-2z"/><path d="M6.5 21l4.9-4.5 4.9 4.5h-2.2l-2.7-2.5-2.7 2.5z"/>'
};
BF3M.vehicleType = (category) => {
  const c = String(category || '');
  if (/Helicopter/i.test(c)) return 'heli';
  if (/Jet|Gunship|Dropship/i.test(c)) return 'jet';
  if (/Boat/i.test(c)) return 'boat';
  if (/Stationary/i.test(c)) return 'stationary';
  if (/Transport|Jeep/i.test(c)) return 'transport';
  return 'tank';
};
