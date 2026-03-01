// Turkish translations (default)
const tr = {
    // ─── Common ───
    send: 'GÖNDER',
    cancel: 'İptal',
    close: 'Kapat',
    save: 'Kaydet',
    yes: 'Evet',
    no: 'Hayır',
    loading: 'Yükleniyor...',
    unknown: 'Bilinmeyen',

    // ─── Sidebar ───
    online: 'ÇEVRİMİÇİ',
    people: 'Kişi',
    siteOwner: 'Site Sahibi',
    changeStatus: 'Durumunu Değiştir',
    statusOnline: 'Çevrimiçi',
    statusAway: 'Uzakta',
    statusBusy: 'Meşgul',
    statusInvisible: 'Görünmez',
    statusWillReturn: 'Dönecek',
    statusOutside: 'Dışarıda',
    statusOnPhone: 'Telefonda',
    statusPrefix: 'Durum',

    // Moderation states
    muted: 'Susturuldu',
    gagged: 'Yazı Yasağı',
    bannedUser: 'Yasaklı',

    // Role labels
    roleSiteOwner: 'Site Sahibi',
    roleSuperAdmin: 'Süper Admin',
    roleAdmin: 'Yönetici',
    roleModerator: 'Moderatör',
    roleOperator: 'Operatör',
    roleVip: 'VIP',
    roleMember: 'Üye',
    roleGuest: 'Misafir',
    roleUser: 'Kullanıcı',

    // ─── Chat ───
    chatStart: 'Sohbet Başlangıcı',
    today: 'Bugün',
    typeMessage: 'Mesajınızı buraya yazın...',
    chatLocked: 'Sohbet yönetici tarafından kilitlendi.',
    gagWarning: '🤐 Yazma yasağınız var.',

    // ─── Bottom Toolbar ───
    leaveRoom: 'Odadan Ayrıl',
    leaveConfirm: 'Odadan ayrılmak istediğinize emin misiniz?',
    yesLeave: 'Evet, Ayrıl',
    leaveQueue: 'Sıradan Çık',
    joinQueue: 'Sıra Al (El Kaldır)',
    camera: 'Kamera',
    guestCameraDisabled: 'Misafirler kamera kullanamaz.',
    settings: 'Ayarlar',
    exit: 'Çıkış',
    volumeLevel: 'Ses Seviyesi',
    unmute: 'Sesi Aç',
    mute: 'Sessize Al',
    soundOff: 'SES KAPALI',
    soundOn: 'SES AÇIK',
    volumeSettings: 'Ses Ayarı',
    selectEmoji: 'İfade Seç',
    sendSticker: 'Sticker Gönder',
    searchGif: 'GIF Ara ve Gönder',

    // ─── Right Live Panel ───
    liveStream: 'CANLI YAYIN',
    noSignal: 'SİNYAL YOK',
    onAir: 'YAYINDA',
    broadcasting: 'yayında',
    waitingStream: 'Yayın akışı bekleniyor.',
    liveConnectionActive: 'Canlı bağlantı aktif.',
    closePanel: 'Paneli Kapat',
    openPanel: 'Canlı Yayın Panelini Aç',
    broadcast: 'YAYIN',
    pinToTv: "TV'ye Sabitle",

    // ─── Settings Modal ───
    cameraDevice: 'Kamera',
    microphone: 'Mikrofon',
    speaker: 'Hoparlör',
    noDevice: 'Cihaz bulunamadı',
    micTest: 'Mikrofon Testi',

    // ─── Rooms ───
    vip: 'VIP',

    // ─── Profile / User ───
    profile: 'Profil',
    changeName: 'İsim Değiştir',
    joined: 'Katılım',
    role: 'Rol',

    // ─── Welcome ───
    welcomeMessage: 'SEVGİLİ DOSTLAR HOŞ GELDİNİZ',

    // ─── Ban ───
    banned: 'Banlandınız',
    banExpiry: 'Bitiş',
    banPermanent: 'Kalıcı',
    banReason: 'Sebep',
} as const;

export type TranslationKeys = keyof typeof tr;
export type Translations = Record<TranslationKeys, string>;
export default tr;
