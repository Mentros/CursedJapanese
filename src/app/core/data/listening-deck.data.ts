import { ListeningItem } from '../models/learning.models';

export const LISTENING_DECK: ListeningItem[] = [
  {
    id: 'l1',
    japanese: 'こんにちは',
    meaning: 'Hello',
    audioSrc: '/audio/listening/konnichiwa.mp3',
    options: ['Hello', 'Goodbye', 'Thank you', 'Excuse me']
  },
  {
    id: 'l2',
    japanese: 'ありがとう',
    meaning: 'Thank you',
    audioSrc: '/audio/listening/arigatou.mp3',
    options: ['Please', 'Thank you', 'Sorry', 'No']
  },
  {
    id: 'l3',
    japanese: 'すみません',
    meaning: 'Excuse me / Sorry',
    audioSrc: '/audio/listening/sumimasen.mp3',
    options: ['I understand', 'Excuse me / Sorry', 'Good night', 'See you']
  },
  {
    id: 'l4',
    japanese: 'はい',
    meaning: 'Yes',
    audioSrc: '/audio/listening/hai.mp3',
    options: ['Yes', 'No', 'Later', 'Morning']
  },
  {
    id: 'l5',
    japanese: 'いいえ',
    meaning: 'No',
    audioSrc: '/audio/listening/iie.mp3',
    options: ['No', 'Yes', 'Help', 'Water']
  },
  {
    id: 'l6',
    japanese: '水',
    meaning: 'Water',
    audioSrc: '/audio/listening/mizu.mp3',
    options: ['Tea', 'Rice', 'Water', 'Coffee']
  },
  {
    id: 'l7',
    japanese: '学校',
    meaning: 'School',
    audioSrc: '/audio/listening/gakkou.mp3',
    options: ['Teacher', 'Student', 'School', 'Japan']
  },
  {
    id: 'l8',
    japanese: '先生',
    meaning: 'Teacher',
    audioSrc: '/audio/listening/sensei.mp3',
    options: ['Friend', 'Teacher', 'Dog', 'Cat']
  },
  {
    id: 'l9',
    japanese: '学生',
    meaning: 'Student',
    audioSrc: '/audio/listening/gakusei.mp3',
    options: ['Teacher', 'Student', 'School', 'Book']
  },
  {
    id: 'l10',
    japanese: '今日',
    meaning: 'Today',
    audioSrc: '/audio/listening/kyou.mp3',
    options: ['Tomorrow', 'Yesterday', 'Today', 'Morning']
  }
];
