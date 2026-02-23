export interface KanjiExplanation {
  meaning: string;
  note: string;
}

export const KANJI_EXPLANATIONS: Record<string, KanjiExplanation> = {
  '水': { meaning: 'water', note: 'Commonly read as mizu in standalone words.' },
  '飯': { meaning: 'meal/rice', note: 'Used in words about cooked rice and meals, like gohan.' },
  '猫': { meaning: 'cat', note: 'Common reading in words is neko.' },
  '犬': { meaning: 'dog', note: 'Common reading in words is inu.' },
  '学': { meaning: 'study/learning', note: 'Appears in school and student words.' },
  '校': { meaning: 'school', note: 'Often paired with 学 to form 学校 (school).' },
  '先': { meaning: 'ahead/previous', note: 'In 先生 it points to someone ahead in learning.' },
  '生': { meaning: 'life/birth', note: 'Very common kanji with many readings, including sei and i(kiru).' },
  '今': { meaning: 'now', note: 'Appears in time words like 今日 (today).' },
  '日': { meaning: 'day/sun', note: 'Core kanji for dates and time words.' },
  '明': { meaning: 'bright/clear', note: 'In 明日 it contributes to the word for tomorrow.' },
  '本': { meaning: 'origin/base', note: 'In 日本 it helps form the name Japan.' },
  '友': { meaning: 'friend', note: 'Appears in friendship words like 友達.' },
  '達': { meaning: 'plural/reach', note: 'In 友達 it marks a person/group sense.' },
  '食': { meaning: 'eat/food', note: 'Base kanji in eating-related words and verbs.' },
  '飲': { meaning: 'drink', note: 'Base kanji in drinking-related words and verbs.' },
  '行': { meaning: 'go', note: 'Used in movement/action words such as 行く.' },
  '見': { meaning: 'see/look', note: 'Used in sight/observation words such as 見る.' }
};
