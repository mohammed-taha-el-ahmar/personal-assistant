// Motivational content: authentic hadiths (with references) and Quran verses, plus progress badges.
// Hadith translations are meaning-based. Have them reviewed by a qualified person before public release.
// tags: start (daily reminder), struggle (hard session), review (revision), new (new memorization),
//       milestone (badge / juz), parent, kid
export const HADITHS = [
  { id: 'khayrukum', tags: ['start', 'kid', 'parent', 'milestone'],
    ar: 'خَيْرُكُمْ مَنْ تَعَلَّمَ القُرْآنَ وَعَلَّمَهُ',
    fr: 'Le meilleur d’entre vous est celui qui apprend le Coran et l’enseigne.',
    en: 'The best of you are those who learn the Quran and teach it.',
    kid: { fr: 'Le Prophète ﷺ a dit que les meilleurs sont ceux qui apprennent le Coran. C’est toi !', en: 'The Prophet ﷺ said the best people are those who learn the Quran. That’s you!', ar: 'قال النبي ﷺ إن خير الناس من يتعلم القرآن. هذا أنت!' },
    src: { fr: 'Al-Bukhari, 5027', en: 'Al-Bukhari, 5027', ar: 'رواه البخاري (٥٠٢٧)' } },
  { id: 'irqa', tags: ['start', 'milestone', 'new'],
    ar: 'يُقَالُ لِصَاحِبِ القُرْآنِ: اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا، فَإِنَّ مَنْزِلَتَكَ عِنْدَ آخِرِ آيَةٍ تَقْرَؤُهَا',
    fr: 'Il sera dit au compagnon du Coran : « Récite et élève-toi, psalmodie comme tu psalmodiais ici-bas : ta demeure sera au dernier verset que tu réciteras. »',
    en: 'It will be said to the companion of the Quran: “Recite and rise, and recite melodiously as you used to in the world, for your rank is at the last verse you recite.”',
    kid: { fr: 'Chaque verset que tu apprends te fera monter plus haut au Paradis, inch’Allah.', en: 'Every verse you learn will raise you higher in Paradise, in sha Allah.', ar: 'كل آية تحفظها ترفعك درجة في الجنة بإذن الله.' },
    src: { fr: 'Abu Dawud, 1464 ; At-Tirmidhi, 2914', en: 'Abu Dawud, 1464; At-Tirmidhi, 2914', ar: 'رواه أبو داود (١٤٦٤) والترمذي (٢٩١٤)' } },
  { id: 'mahir', tags: ['struggle', 'kid'],
    ar: 'المَاهِرُ بِالقُرْآنِ مَعَ السَّفَرَةِ الكِرَامِ البَرَرَةِ، وَالَّذِي يَقْرَأُ القُرْآنَ وَيَتَتَعْتَعُ فِيهِ وَهُوَ عَلَيْهِ شَاقٌّ لَهُ أَجْرَانِ',
    fr: 'Celui qui maîtrise le Coran sera avec les nobles anges scribes, et celui qui le récite en butant, avec difficulté, aura une double récompense.',
    en: 'The one skilled in the Quran will be with the noble, righteous scribes, and the one who recites it stumbling, finding it difficult, will have a double reward.',
    kid: { fr: 'Quand c’est difficile et que tu continues, Allah te donne une double récompense !', en: 'When it is hard and you keep going, Allah gives you a double reward!', ar: 'عندما يكون صعبًا وتواصل، يعطيك الله أجرين!' },
    src: { fr: 'Al-Bukhari, 4937 ; Muslim, 798', en: 'Al-Bukhari, 4937; Muslim, 798', ar: 'متفق عليه: البخاري (٤٩٣٧) ومسلم (٧٩٨)' } },
  { id: 'taahadu', tags: ['review'],
    ar: 'تَعَاهَدُوا هَذَا القُرْآنَ، فَوَالَّذِي نَفْسُ مُحَمَّدٍ بِيَدِهِ لَهُوَ أَشَدُّ تَفَلُّتًا مِنَ الإِبِلِ فِي عُقُلِهَا',
    fr: 'Entretenez ce Coran : par Celui qui tient l’âme de Muhammad dans Sa main, il s’échappe plus vite que les chameaux de leurs entraves.',
    en: 'Keep revising this Quran, for by Him in whose hand is Muhammad’s soul, it escapes faster than camels from their tethers.',
    kid: { fr: 'Le Prophète ﷺ nous a appris à réviser souvent, pour ne pas oublier.', en: 'The Prophet ﷺ taught us to revise often so we do not forget.', ar: 'علّمنا النبي ﷺ أن نراجع كثيرًا حتى لا ننسى.' },
    src: { fr: 'Al-Bukhari, 5033 ; Muslim, 791', en: 'Al-Bukhari, 5033; Muslim, 791', ar: 'متفق عليه: البخاري (٥٠٣٣) ومسلم (٧٩١)' } },
  { id: 'shafi', tags: ['start', 'review'],
    ar: 'اقْرَءُوا القُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ القِيَامَةِ شَفِيعًا لِأَصْحَابِهِ',
    fr: 'Récitez le Coran, car il viendra le Jour de la Résurrection intercéder en faveur de ses compagnons.',
    en: 'Recite the Quran, for it will come on the Day of Resurrection as an intercessor for its companions.',
    kid: { fr: 'Le Coran que tu apprends intercédera pour toi le Jour dernier.', en: 'The Quran you learn will intercede for you on the Last Day.', ar: 'القرآن الذي تحفظه يشفع لك يوم القيامة.' },
    src: { fr: 'Muslim, 804', en: 'Muslim, 804', ar: 'رواه مسلم (٨٠٤)' } },
  { id: 'harf', tags: ['start', 'new', 'kid'],
    ar: 'مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ، وَالحَسَنَةُ بِعَشْرِ أَمْثَالِهَا',
    fr: 'Quiconque lit une lettre du Livre d’Allah obtient une bonne action, et la bonne action vaut dix fois autant.',
    en: 'Whoever reads a letter from the Book of Allah receives a good deed, and a good deed is multiplied by ten.',
    kid: { fr: 'Chaque lettre que tu lis vaut 10 bonnes actions !', en: 'Every letter you read is worth 10 good deeds!', ar: 'كل حرف تقرؤه بعشر حسنات!' },
    src: { fr: 'At-Tirmidhi, 2910', en: 'At-Tirmidhi, 2910', ar: 'رواه الترمذي (٢٩١٠)' } },
  { id: 'utrujja', tags: ['start'],
    ar: 'مَثَلُ المُؤْمِنِ الَّذِي يَقْرَأُ القُرْآنَ كَمَثَلِ الأُتْرُجَّةِ، رِيحُهَا طَيِّبٌ وَطَعْمُهَا طَيِّبٌ',
    fr: 'Le croyant qui récite le Coran est comme le cédrat : son parfum est agréable et son goût est agréable.',
    en: 'The believer who recites the Quran is like a citron: its fragrance is pleasant and its taste is pleasant.',
    src: { fr: 'Al-Bukhari, 5427 ; Muslim, 797', en: 'Al-Bukhari, 5427; Muslim, 797', ar: 'متفق عليه: البخاري (٥٤٢٧) ومسلم (٧٩٧)' } },
  { id: 'yarfa', tags: ['milestone', 'start'],
    ar: 'إِنَّ اللَّهَ يَرْفَعُ بِهَذَا الكِتَابِ أَقْوَامًا وَيَضَعُ بِهِ آخَرِينَ',
    fr: 'Allah élève certains peuples par ce Livre et en abaisse d’autres.',
    en: 'Allah raises some people by this Book and lowers others by it.',
    src: { fr: 'Muslim, 817', en: 'Muslim, 817', ar: 'رواه مسلم (٨١٧)' } },
  { id: 'hasad', tags: ['milestone', 'start'],
    ar: 'لَا حَسَدَ إِلَّا فِي اثْنَتَيْنِ: رَجُلٌ آتَاهُ اللَّهُ القُرْآنَ فَهُوَ يَقُومُ بِهِ آنَاءَ اللَّيْلِ وَآنَاءَ النَّهَارِ…',
    fr: 'Il n’y a d’envie légitime qu’envers deux personnes : un homme à qui Allah a donné le Coran et qui le récite la nuit et le jour…',
    en: 'There is no envy except in two cases: a man to whom Allah has given the Quran and who recites it night and day…',
    src: { fr: 'Al-Bukhari, 5025 ; Muslim, 815', en: 'Al-Bukhari, 5025; Muslim, 815', ar: 'متفق عليه: البخاري (٥٠٢٥) ومسلم (٨١٥)' } },
  { id: 'walad', tags: ['parent'],
    ar: 'إِذَا مَاتَ الإِنْسَانُ انْقَطَعَ عَنْهُ عَمَلُهُ إِلَّا مِنْ ثَلَاثَةٍ: إِلَّا مِنْ صَدَقَةٍ جَارِيَةٍ، أَوْ عِلْمٍ يُنْتَفَعُ بِهِ، أَوْ وَلَدٍ صَالِحٍ يَدْعُو لَهُ',
    fr: 'Quand l’homme meurt, ses œuvres s’arrêtent sauf trois : une aumône continue, une science utile, ou un enfant vertueux qui invoque pour lui.',
    en: 'When a person dies, their deeds end except for three: an ongoing charity, beneficial knowledge, or a righteous child who prays for them.',
    src: { fr: 'Muslim, 1631', en: 'Muslim, 1631', ar: 'رواه مسلم (١٦٣١)' } },
  { id: 'rai', tags: ['parent'],
    ar: 'كُلُّكُمْ رَاعٍ وَكُلُّكُمْ مَسْئُولٌ عَنْ رَعِيَّتِهِ',
    fr: 'Chacun de vous est un berger, et chacun de vous est responsable de ceux dont il a la charge.',
    en: 'Each of you is a shepherd, and each of you is responsible for his flock.',
    src: { fr: 'Al-Bukhari, 893 ; Muslim, 1829', en: 'Al-Bukhari, 893; Muslim, 1829', ar: 'متفق عليه: البخاري (٨٩٣) ومسلم (١٨٢٩)' } }
];
// Verses: text and translation are read from the app's own data (quran.json + meaning files).
export const VERSES = [
  { key: '54:17', tags: ['start', 'struggle', 'kid'] },
  { key: '29:49', tags: ['milestone', 'start'] },
  { key: '15:9', tags: ['review', 'start'] },
  { key: '73:4', tags: ['new', 'start'] },
  { key: '20:114', tags: ['start', 'kid', 'new'] },
  { key: '17:9', tags: ['start'] },
  { key: '38:29', tags: ['start'] },
  { key: '35:29', tags: ['milestone', 'review'] },
  { key: '66:6', tags: ['parent'] },
  { key: '94:6', tags: ['struggle'] }
];

/** Deterministic pick for a context and a day. */
export function pickMotivation(tag, seed) {
  const pool = [...HADITHS.filter(h => h.tags.includes(tag)).map(h => ({ type: 'hadith', item: h })), ...VERSES.filter(v => v.tags.includes(tag)).map(v => ({ type: 'ayah', item: v }))];
  if (!pool.length) return null;
  return pool[((seed % pool.length) + pool.length) % pool.length];
}

// ---------- badges ----------
// Each badge: id, icon, test(stats). Stats are computed by the app from the user's state.
export const BADGES = [
  { id: 'first_page', icon: '🌱', test: s => s.pages >= 1 },
  { id: 'first_surah', icon: '📗', test: s => s.surahs >= 1 },
  { id: 'streak7', icon: '🔥', test: s => s.streak >= 7 },
  { id: 'pages20', icon: '📖', test: s => s.pages >= 20 },
  { id: 'juz1', icon: '⭐', test: s => s.juz >= 1 },
  { id: 'quiz_perfect', icon: '🎯', test: s => s.perfectQuiz },
  { id: 'streak30', icon: '🌙', test: s => s.streak >= 30 },
  { id: 'reviews100', icon: '🔁', test: s => s.reviews >= 100 },
  { id: 'pages100', icon: '📚', test: s => s.pages >= 100 },
  { id: 'juz5', icon: '🌟', test: s => s.juz >= 5 },
  { id: 'streak100', icon: '💎', test: s => s.streak >= 100 },
  { id: 'juz10', icon: '🏅', test: s => s.juz >= 10 },
  { id: 'pages300', icon: '🕌', test: s => s.pages >= 300 },
  { id: 'khatm', icon: '👑', test: s => s.pages >= 604 }
];
export function earnedBadges(stats) { return BADGES.filter(b => b.test(stats)).map(b => b.id); }
export function nextBadge(stats) { return BADGES.find(b => !b.test(stats)) || null; }
