export type Language = 'dz' | 'en';

export interface Translations {
  appName: string;
  appSubtitle: string;
  lanNotice: string;
  diagnostics: string;
  androidCode: string;
  selectMode: string;
  tvMode: string;
  phoneMode: string;
  dualMode: string;
  createRoom: string;
  stopRoom: string;
  roomCreated: string;
  serverRunning: string;
  port: string;
  playersCount: string;
  waitingForPlayers: string;
  searchingForRooms: string;
  joinRoom: string;
  connected: string;
  disconnected: string;
  sendTest: string;
  hostTest: string;
  disconnect: string;
  startMatch: string;
  cancelCountdown: string;
  countdown: string;
  matchDuration: string;
  minutes: string;
  seconds: string;
  teams: {
    red: string;
    green: string;
    blue: string;
    yellow: string;
  };
  playerCustomization: string;
  playerName: string;
  chooseCharacter: string;
  chooseTeam: string;
  confirmChanges: string;
  ready: string;
  notReady: string;
  shotgun: string;
  rifle: string;
  grenade: string;
  jump: string;
  fire: string;
  switchWeapon: string;
  health: string;
  kills: string;
  deaths: string;
  score: string;
  matchOver: string;
  winnerTeam: string;
  rematch: string;
  backToLobby: string;
  scoreboard: string;
  audioSettings: string;
  musicVolume: string;
  sfxVolume: string;
  voiceVolume: string;
  language: string;
  friendlyFireEnabled: string;
  algerianMonument: string;
}

export const translations: Record<Language, Translations> = {
  dz: {
    appName: 'نيوسترايك',
    appSubtitle: 'لعبة حربية متعددة اللاعبين على الشبكة المحلية (Local LAN / Offline)',
    lanNotice: 'اتصال محلي بدون إنترنت عبر Wi-Fi أو Hotspot',
    diagnostics: 'فحص الشبكة',
    androidCode: 'كود أندرويد',
    selectMode: 'اختر وضع التشغيل',
    tvMode: 'شاشة التلفاز (TV / Host)',
    phoneMode: 'هاتف التحكم (Phone / Controller)',
    dualMode: 'المحاكي المزدوج (TV + Phone)',
    createRoom: 'إنشاء غرفة',
    stopRoom: 'إيقاف الغرفة',
    roomCreated: 'تم إنشاء الغرفة بنجاح',
    serverRunning: 'الخادم: يشتغل',
    port: 'المنفذ',
    playersCount: 'عدد اللاعبين',
    waitingForPlayers: 'في انتظار دخول اللاعبين...',
    searchingForRooms: 'جاري البحث عن غرف نيوسترايك القريبة...',
    joinRoom: 'انضمام للغرفة',
    connected: 'متصل',
    disconnected: 'غير متصل',
    sendTest: 'إرسال اختبار',
    hostTest: 'اختبار الخادم',
    disconnect: 'فصل الاتصال',
    startMatch: 'بدء المباراة',
    cancelCountdown: 'إلغاء العد التنازلي',
    countdown: 'الاستعداد للبدء',
    matchDuration: 'مدة المباراة',
    minutes: 'دقائق',
    seconds: 'ثانية',
    teams: {
      red: 'الفريق الأحمر',
      green: 'الفريق الأخضر',
      blue: 'الفريق الأزرق',
      yellow: 'الفريق الأصفر',
    },
    playerCustomization: 'تخصيص اللاعب',
    playerName: 'اسم اللاعب',
    chooseCharacter: 'اختر الشخصية',
    chooseTeam: 'اختر الفريق',
    confirmChanges: 'تأكيد التعديلات',
    ready: 'جاهز',
    notReady: 'غير جاهز',
    shotgun: 'شوتغان (Shotgun)',
    rifle: 'سلاح رشاش (Rifle)',
    grenade: 'قنبلة يدوية',
    jump: 'قفز',
    fire: 'إطلاق نار',
    switchWeapon: 'تبديل السلاح',
    health: 'الصحة',
    kills: 'القتلى',
    deaths: 'الموتات',
    score: 'النقاط',
    matchOver: 'نهاية المعركة',
    winnerTeam: 'الفريق الفائز',
    rematch: 'مباراة جديدة',
    backToLobby: 'العودة للغرفة',
    scoreboard: 'جدول نتائج اللاعبين',
    audioSettings: 'إعدادات الصوت',
    musicVolume: 'صوت الموسيقى',
    sfxVolume: 'صوت المؤثرات (SFX)',
    voiceVolume: 'صوت الشخصيات',
    language: 'اللغة',
    friendlyFireEnabled: 'النيران الصديقة مفعلة',
    algerianMonument: 'ساحة مقام الشهيد',
  },
  en: {
    appName: 'NeoStrike',
    appSubtitle: 'Offline Local LAN Multiplayer Action Game',
    lanNotice: 'Offline LAN connection via Wi-Fi or Hotspot',
    diagnostics: 'Diagnostics',
    androidCode: 'Android Project',
    selectMode: 'Select Mode',
    tvMode: 'TV / Host Screen',
    phoneMode: 'Phone / Controller',
    dualMode: 'Dual Simulator (TV + Phone)',
    createRoom: 'Create Room',
    stopRoom: 'Stop Room',
    roomCreated: 'Room Created Successfully',
    serverRunning: 'SERVER: RUNNING',
    port: 'Port',
    playersCount: 'Players',
    waitingForPlayers: 'Waiting for players to join...',
    searchingForRooms: 'Searching for nearby NeoStrike rooms...',
    joinRoom: 'Join Room',
    connected: 'CONNECTED',
    disconnected: 'DISCONNECTED',
    sendTest: 'Send Test',
    hostTest: 'Host Test',
    disconnect: 'Disconnect',
    startMatch: 'Start Match',
    cancelCountdown: 'Cancel Countdown',
    countdown: 'Match Starting In',
    matchDuration: 'Match Duration',
    minutes: 'min',
    seconds: 'sec',
    teams: {
      red: 'RED TEAM',
      green: 'GREEN TEAM',
      blue: 'BLUE TEAM',
      yellow: 'YELLOW TEAM',
    },
    playerCustomization: 'Player Customization',
    playerName: 'Player Name',
    chooseCharacter: 'Select Character',
    chooseTeam: 'Select Team',
    confirmChanges: 'Confirm Changes',
    ready: 'Ready',
    notReady: 'Not Ready',
    shotgun: 'Shotgun',
    rifle: 'Assault Rifle',
    grenade: 'Grenade',
    jump: 'Jump',
    fire: 'Fire',
    switchWeapon: 'Switch Weapon',
    health: 'Health',
    kills: 'Kills',
    deaths: 'Deaths',
    score: 'Score',
    matchOver: 'Match Over',
    winnerTeam: 'Winning Team',
    rematch: 'Rematch',
    backToLobby: 'Back to Lobby',
    scoreboard: 'Match Scoreboard',
    audioSettings: 'Audio Settings',
    musicVolume: 'Music Volume',
    sfxVolume: 'SFX Volume',
    voiceVolume: 'Voice Volume',
    language: 'Language',
    friendlyFireEnabled: 'Friendly Fire Enabled',
    algerianMonument: 'Martyrs Memorial Square',
  },
};

export const CHARACTERS: { id: string; nameDz: string; nameEn: string; roleDz: string; roleEn: string; color: string; speed: number }[] = [
  { id: 'commando', nameDz: 'الكوماندوز', nameEn: 'Commando', roleDz: 'هجوم سريع وتوازن', roleEn: 'Assault & Balanced', color: '#38bdf8', speed: 280 },
  { id: 'scout', nameDz: 'الطليعة', nameEn: 'Scout', roleDz: 'خفة ورشاقة عالية', roleEn: 'Agile & High Mobility', color: '#34d399', speed: 330 },
  { id: 'heavy', nameDz: 'المدرّع', nameEn: 'Heavy', roleDz: 'دفاع قوي وصمود', roleEn: 'Armor & High Resilience', color: '#f59e0b', speed: 250 },
  { id: 'sniper', nameDz: 'القناص', nameEn: 'Sniper', roleDz: 'دقة عالية وتصويب', roleEn: 'Sharpshooter & Focus', color: '#a78bfa', speed: 290 },
];
