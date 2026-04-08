/* ============================================================
   i18n.js - Multi-language support (Japanese / English)
   ============================================================
   Usage:
     - Static HTML: add data-i18n="key" to elements
     - Dynamic JS:  use t('key') to get translated string
     - Switch lang: setLang('en') or setLang('ja')
     - Get current: getLang()
   ============================================================ */

var _i18n = {
  ja: {
    /* ---- Tabs ---- */
    'tab.countup': 'CountUp',
    'tab.01': '01',
    'tab.sim': 'シム',
    'tab.cricket': 'Cricket',

    /* ---- CountUp subtabs ---- */
    'cu.sub.game': 'ゲーム',
    'cu.sub.hist': '履歴',

    /* ---- CountUp game ---- */
    'cu.game_start': 'GAME START',
    'cu.round': 'ラウンド',
    'cu.total_score': 'トータルスコア',
    'cu.finish': 'FINISH!',
    'cu.new_game': 'もう一度',
    'cu.history': '履歴を見る',
    'cu.share': 'シェア',
    'cu.share_x': '𝕏 シェア',
    'cu.share_img': 'シェア',
    'cu.undo': '↩ 取消',
    'cu.reset': '↺ リセット',
    'cu.customize': '⚙ カスタマイズ',
    'cu.input_hint': 'ショートカットまたはテンキーで入力',
    'cu.input_total': '合計点を入力してください',
    'cu.game_over': 'ゲーム終了',
    'cu.next_game_ask': '次のゲームを始めますか？',
    'cu.stay': 'そのまま',
    'cu.next_game': '次のゲームへ',
    'cu.pb': '自己ベスト更新！',
    'cu.db': '本日のベスト更新！',
    'cu.three_dart_avg': '3ダーツ平均',
    'cu.best_round': '最高R',
    'cu.rank': 'ランク',

    /* ---- History / Stats ---- */
    'hist.goal_label': 'カウントアップ 目標スコア',
    'hist.no_goal': '設定なし',
    'hist.score_chart': 'スコア推移',
    'hist.avg_chart': '平均推移',
    'hist.time_chart': '日別プレイ時間',
    'hist.dist_title': 'スコア分布',
    'hist.last30g': '直近30G',
    'hist.today': '当日',
    'hist.last30d': '直近30DAY',
    'hist.total': 'TOTAL',
    'hist.period': '期間別成績',
    'hist.export': '📤 エクスポート',
    'hist.import': '📥 インポート',
    'hist.game_hist': 'ゲーム履歴',
    'hist.clear_all': '全件削除',

    /* ---- Confirm dialogs ---- */
    'cfm.clear_title': '全件削除の確認',
    'cfm.clear_msg': '全ての履歴を削除します。<br>この操作は元に戻せません。',
    'cfm.cancel': 'キャンセル',
    'cfm.clear_ok': '全件削除',
    'cfm.undo_title': '前のラウンドを修正',
    'cfm.undo_ok': '修正する',
    'cfm.reset_title': 'リセット確認',
    'cfm.reset_msg': '入力中のゲームをリセットします。<br>この操作は元に戻せません。',
    'cfm.reset_ok': 'リセット',

    /* ---- 01 Game ---- */
    'z01.sub.game': '01',
    'z01.sub.hist': '履歴',
    'z01.sub.arr': 'アレンジ',
    'z01.setup': '設定',
    'z01.players': 'プレイヤー',
    'z01.legs': 'レッグ数',
    'z01.start': 'GAME START',
    'z01.finish': 'Finish',
    'z01.exit': 'Exit',
    'z01.undo': '↩ 取消',
    'z01.hint_on': 'ヒント ON',
    'z01.hint_off': 'ヒント OFF',
    'z01.stats': 'Stats',
    'z01.game_over': 'ゲームを終了しますか？',
    'z01.game_over_sub': '現在のゲームデータは保存されません',
    'z01.continue': '続ける',
    'z01.end': '終了する',
    'z01.leg_win': 'LEG WIN!',
    'z01.match_win': 'MATCH WIN!',
    'z01.next_leg': '続ける →',
    'z01.show_result': '結果を見る →',
    'z01.again': 'もう一度',
    'z01.share': '📤 シェア',
    'z01.back_setup': '設定に戻る',
    'z01.custom': 'カスタム',
    'z01.custom_start': '点スタート',
    'z01.straight_in': 'ストレートイン',
    'z01.double_in': 'ダブルイン',
    'z01.double_out': 'ダブルアウト',
    'z01.single_out': 'シングルアウト',
    'z01.solo': '1P ソロ',
    'z01.two_player': '2P 対戦',
    'z01.vs_cpu': 'vs CPU',
    'z01.name_placeholder': 'タップして名前を入力',
    'z01.finish_title': '何本目で上がりましたか？',
    'z01.finish_1': '1本目で上がり',
    'z01.finish_2': '2本目で上がり',
    'z01.finish_3': '3本目で上がり',
    'z01.undo_confirm': '直前のスコアを取り消しますか？',
    'z01.undo_cancel': 'キャンセル',
    'z01.undo_yes': '取り消す',
    'z01.edit_title': 'スコア修正',
    'z01.edit_cancel': 'キャンセル',
    'z01.legs_1': '1G先取',
    'z01.legs_3': '2G先取',
    'z01.legs_5': '3G先取',
    'z01.legs_custom': 'カスタム',
    'z01.midstats_back': '← 戻る',

    /* ---- CPU labels ---- */
    'cpu.beginner': '初心者',
    'cpu.amateur': 'アマチュア',
    'cpu.mid_upper': '中級〜上級',
    'cpu.pro': 'プロ',
    'cpu.lv1': 'LV1 入門',
    'cpu.lv2': 'LV2 初心者',
    'cpu.lv3': 'LV3 初級',
    'cpu.lv4': 'LV4 中初級',
    'cpu.lv5': 'LV5 アマチュア',
    'cpu.lv6': 'LV6 中級',
    'cpu.lv7': 'LV7 中級+',
    'cpu.lv8': 'LV8 上級',
    'cpu.lv9': 'LV9 上級+',
    'cpu.lv10': 'LV10 準プロ',
    'cpu.lv11': 'LV11 プロ',
    'cpu.lv12': 'LV12 エリート',

    /* ---- Simulator ---- */
    'sim.title': '501 シミュレーター',
    'sim.mode': 'モード',
    'sim.solo': 'ソロ',
    'sim.vs_cpu': 'vs CPU',
    'sim.player': 'プレイヤー',
    'sim.cpu': 'CPU',
    'sim.legs': 'レグ数',
    'sim.first': '先行',
    'sim.first_player': 'プレイヤー',
    'sim.first_cpu': 'CPU',
    'sim.first_coin': 'コイン',
    'sim.first_cork': 'コーク',
    'sim.start': 'ゲームスタート',
    'sim.cork_title': 'コーク — ブルを狙え',
    'sim.cork_sub': 'ボードをタップして投げる',
    'sim.cork_go': 'スタート！',
    'sim.next_leg': '次のレグへ →',
    'sim.share': '📤 シェア',
    'sim.again': 'もう一度',
    'sim.beginner': '初心者',
    'sim.ama': 'アマ',
    'sim.house': 'ハウス',
    'sim.semipro': 'セミプロ',
    'sim.pro': 'プロ',
    'sim.elite': 'エリート',
    'sim.1leg': '1 レグ',
    'sim.3leg': '3 レグ (Bo3)',
    'sim.5leg': '5 レグ (Bo5)',
    'sim.7leg': '7 レグ (Bo7)',

    /* ---- Cricket ---- */
    'ckt.sub.game': 'Cricket',
    'ckt.sub.hist': '履歴',
    'ckt.vs_cpu': 'vs CPU',
    'ckt.two_player': '2P 対戦',
    'ckt.start': 'GAME START',
    'ckt.undo': '↩ 取消',
    'ckt.exit': 'Exit',
    'ckt.again': 'もう一度',
    'ckt.share': '📤 シェア',
    'ckt.back_setup': '設定に戻る',
    'ckt.game_over': 'ゲームを終了しますか？',
    'ckt.game_over_sub': '現在のゲームデータは保存されません',
    'ckt.continue': '続ける',
    'ckt.end': '終了する',

    /* ---- Arrange ---- */
    'arr.roadmap': 'アレンジ習得ロードマップ',
    'arr.roadmap_sub': '削り = 残り点数を上がり目（170以下）に収めるための打ち方',
    'arr.step1': 'STEP 1',
    'arr.step1_title': 'アレンジ表',
    'arr.step1_sub': 'まずは表を眺めて基礎知識を学ぼう。削り戦術・ボギー回避も確認できる。',
    'arr.step1_btn': '表を開く →',
    'arr.step2': 'STEP 2',
    'arr.step2_title': 'アレンジクイズ',
    'arr.step2_sub': 'クイズ形式でアレンジを素早く判断する力を養う。速さ × 正確さでスコア算出。',
    'arr.beginner': '初級',
    'arr.intermediate': '中級',
    'arr.advanced': '上級',
    'arr.q_count': '問題数',
    'arr.q10': '10問',
    'arr.q20': '20問',
    'arr.q30': '30問',
    'arr.quiz_start': 'クイズ開始 →',
    'arr.step3': 'STEP 3',
    'arr.step3_title': 'アレンジトレーニング',
    'arr.step3_sub': '実際にダーツを投げて身体に覚えさせよう。2 → 170 順番に制覇。',
    'arr.step3_btn': 'トレーニングを始める →',
    'arr.step4': 'STEP 4',
    'arr.step4_title': 'クエスト',
    'arr.step4_sub': 'ストーリー形式でチェックアウトを攻略。フルルート＋ミス対応で実戦に近い練習ができる。',
    'arr.step4_btn': 'クエストへ →',
    'arr.training_title': 'アレンジトレーニング',
    'arr.back': '← 戻る',
    'arr.continue': '続きから →',
    'arr.random': '🎲 ランダム練習',
    'arr.weak_mode': '🎯 苦手集中',
    'arr.to_list': '← 一覧へ',
    'arr.hint_btn': '👁 ヒントを見る',
    'arr.instruction': '実際にダーツを投げて結果を入力',
    'arr.ok': '✓ できた',
    'arr.ng': '✗ できなかった',
    'arr.retry': '↩ もう一度',
    'arr.next_score': '次のスコアへ →',
    'arr.prev_score': '← 前のスコア',
    'arr.list': '📋 一覧',
    'arr.quest': 'クエスト',
    'arr.quest_sim': '🎲 シミュ',
    'arr.quest_real': '🎯 実投',
    'arr.quest_weakness': '📊 弱点',
    'arr.quest_weakness_title': '📊 弱点分析',
    'arr.quit': '← 中断',
    'arr.remaining': '残り',
    'arr.success_next': '成功！ 次へ →',
    'arr.next_q': '次の問題 →',
    'arr.quiz_again': 'もう一度',
    'arr.quiz_weak_retry': '苦手だけもう1回',
    'arr.quiz_back': '設定に戻る',
    'arr.teiseki_170': '170〜99',
    'arr.teiseki_100': '100〜3',
    'arr.teiseki_kezuri': '削り戦術',

    /* ---- Shortcut editor ---- */
    'sc.title': '⚙ ショートカット編集',
    'sc.desc': '各ボタンの数値を入力してください（0〜180）',
    'sc.cancel': 'キャンセル',
    'sc.save': '保存',

    /* ---- PWA ---- */
    'pwa.msg': '📱 ホーム画面に追加するとオフラインでも使えます',
    'pwa.install': '追加する',

    /* ---- Onboarding ---- */
    'ob.next': '次へ',
    'ob.start': '始めよう!',
    'ob.skip': 'スキップ',

    /* ---- Common ---- */
    'common.score': '点数',
    'common.remaining': '残り',
    'common.avg': '平均',
    'common.best': 'ベスト',
    'common.date': '日付',
    'common.game': 'ゲーム',
    'common.history': '履歴'
  },

  en: {
    /* ---- Tabs ---- */
    'tab.countup': 'CountUp',
    'tab.01': '01',
    'tab.sim': 'Sim',
    'tab.cricket': 'Cricket',

    /* ---- CountUp subtabs ---- */
    'cu.sub.game': 'Game',
    'cu.sub.hist': 'History',

    /* ---- CountUp game ---- */
    'cu.game_start': 'GAME START',
    'cu.round': 'Round',
    'cu.total_score': 'Total Score',
    'cu.finish': 'FINISH!',
    'cu.new_game': 'Play Again',
    'cu.history': 'View History',
    'cu.share': 'Share',
    'cu.share_x': '𝕏 Share',
    'cu.share_img': 'Share',
    'cu.undo': '↩ Undo',
    'cu.reset': '↺ Reset',
    'cu.customize': '⚙ Customize',
    'cu.input_hint': 'Enter score via shortcuts or numpad',
    'cu.input_total': 'Enter your total score',
    'cu.game_over': 'Game Over',
    'cu.next_game_ask': 'Start next game?',
    'cu.stay': 'Stay',
    'cu.next_game': 'Next Game',
    'cu.pb': 'New Personal Best!',
    'cu.db': "Today's Best!",
    'cu.three_dart_avg': '3-Dart Avg',
    'cu.best_round': 'Best Rd',
    'cu.rank': 'Rank',

    /* ---- History / Stats ---- */
    'hist.goal_label': 'CountUp Target Score',
    'hist.no_goal': 'No Target',
    'hist.score_chart': 'Score Trend',
    'hist.avg_chart': 'Average Trend',
    'hist.time_chart': 'Daily Play Time',
    'hist.dist_title': 'Score Distribution',
    'hist.last30g': 'Last 30G',
    'hist.today': 'Today',
    'hist.last30d': 'Last 30 Days',
    'hist.total': 'TOTAL',
    'hist.period': 'Period Stats',
    'hist.export': '📤 Export',
    'hist.import': '📥 Import',
    'hist.game_hist': 'Game History',
    'hist.clear_all': 'Delete All',

    /* ---- Confirm dialogs ---- */
    'cfm.clear_title': 'Confirm Delete All',
    'cfm.clear_msg': 'All history will be deleted.<br>This cannot be undone.',
    'cfm.cancel': 'Cancel',
    'cfm.clear_ok': 'Delete All',
    'cfm.undo_title': 'Modify Previous Round',
    'cfm.undo_ok': 'Modify',
    'cfm.reset_title': 'Confirm Reset',
    'cfm.reset_msg': 'Reset the current game.<br>This cannot be undone.',
    'cfm.reset_ok': 'Reset',

    /* ---- 01 Game ---- */
    'z01.sub.game': '01',
    'z01.sub.hist': 'History',
    'z01.sub.arr': 'Arrange',
    'z01.setup': 'Settings',
    'z01.players': 'Players',
    'z01.legs': 'Legs',
    'z01.start': 'GAME START',
    'z01.finish': 'Finish',
    'z01.exit': 'Exit',
    'z01.undo': '↩ Undo',
    'z01.hint_on': 'Hint ON',
    'z01.hint_off': 'Hint OFF',
    'z01.stats': 'Stats',
    'z01.game_over': 'End the game?',
    'z01.game_over_sub': 'Current game data will not be saved',
    'z01.continue': 'Continue',
    'z01.end': 'End Game',
    'z01.leg_win': 'LEG WIN!',
    'z01.match_win': 'MATCH WIN!',
    'z01.next_leg': 'Continue →',
    'z01.show_result': 'View Result →',
    'z01.again': 'Play Again',
    'z01.share': '📤 Share',
    'z01.back_setup': 'Back to Setup',
    'z01.custom': 'Custom',
    'z01.custom_start': 'pt start',
    'z01.straight_in': 'Straight In',
    'z01.double_in': 'Double In',
    'z01.double_out': 'Double Out',
    'z01.single_out': 'Single Out',
    'z01.solo': '1P Solo',
    'z01.two_player': '2P Match',
    'z01.vs_cpu': 'vs CPU',
    'z01.name_placeholder': 'Tap to enter name',
    'z01.finish_title': 'Which dart finished?',
    'z01.finish_1': 'Finished on 1st dart',
    'z01.finish_2': 'Finished on 2nd dart',
    'z01.finish_3': 'Finished on 3rd dart',
    'z01.undo_confirm': 'Undo the last score?',
    'z01.undo_cancel': 'Cancel',
    'z01.undo_yes': 'Undo',
    'z01.edit_title': 'Edit Score',
    'z01.edit_cancel': 'Cancel',
    'z01.legs_1': 'First to 1',
    'z01.legs_3': 'First to 2',
    'z01.legs_5': 'First to 3',
    'z01.legs_custom': 'Custom',
    'z01.midstats_back': '← Back',

    /* ---- CPU labels ---- */
    'cpu.beginner': 'Beginner',
    'cpu.amateur': 'Amateur',
    'cpu.mid_upper': 'Intermediate-Advanced',
    'cpu.pro': 'Pro',
    'cpu.lv1': 'LV1 Novice',
    'cpu.lv2': 'LV2 Beginner',
    'cpu.lv3': 'LV3 Basic',
    'cpu.lv4': 'LV4 Low-Mid',
    'cpu.lv5': 'LV5 Amateur',
    'cpu.lv6': 'LV6 Intermediate',
    'cpu.lv7': 'LV7 Intermediate+',
    'cpu.lv8': 'LV8 Advanced',
    'cpu.lv9': 'LV9 Advanced+',
    'cpu.lv10': 'LV10 Semi-Pro',
    'cpu.lv11': 'LV11 Pro',
    'cpu.lv12': 'LV12 Elite',

    /* ---- Simulator ---- */
    'sim.title': '501 Simulator',
    'sim.mode': 'Mode',
    'sim.solo': 'Solo',
    'sim.vs_cpu': 'vs CPU',
    'sim.player': 'Player',
    'sim.cpu': 'CPU',
    'sim.legs': 'Legs',
    'sim.first': 'First Throw',
    'sim.first_player': 'Player',
    'sim.first_cpu': 'CPU',
    'sim.first_coin': 'Coin',
    'sim.first_cork': 'Cork',
    'sim.start': 'Start Game',
    'sim.cork_title': 'Cork — Aim for Bull',
    'sim.cork_sub': 'Tap the board to throw',
    'sim.cork_go': 'Start!',
    'sim.next_leg': 'Next Leg →',
    'sim.share': '📤 Share',
    'sim.again': 'Play Again',
    'sim.beginner': 'Beginner',
    'sim.ama': 'Amateur',
    'sim.house': 'House',
    'sim.semipro': 'Semi-Pro',
    'sim.pro': 'Pro',
    'sim.elite': 'Elite',
    'sim.1leg': '1 Leg',
    'sim.3leg': '3 Legs (Bo3)',
    'sim.5leg': '5 Legs (Bo5)',
    'sim.7leg': '7 Legs (Bo7)',

    /* ---- Cricket ---- */
    'ckt.sub.game': 'Cricket',
    'ckt.sub.hist': 'History',
    'ckt.vs_cpu': 'vs CPU',
    'ckt.two_player': '2P Match',
    'ckt.start': 'GAME START',
    'ckt.undo': '↩ Undo',
    'ckt.exit': 'Exit',
    'ckt.again': 'Play Again',
    'ckt.share': '📤 Share',
    'ckt.back_setup': 'Back to Setup',
    'ckt.game_over': 'End the game?',
    'ckt.game_over_sub': 'Current game data will not be saved',
    'ckt.continue': 'Continue',
    'ckt.end': 'End Game',

    /* ---- Arrange ---- */
    'arr.roadmap': 'Arrange Mastery Roadmap',
    'arr.roadmap_sub': 'Kezuri = strategic scoring to bring remaining points within checkout range (170 or less)',
    'arr.step1': 'STEP 1',
    'arr.step1_title': 'Arrange Table',
    'arr.step1_sub': 'Start by studying the table to learn the basics. Includes kezuri tactics and bogey avoidance.',
    'arr.step1_btn': 'Open Table →',
    'arr.step2': 'STEP 2',
    'arr.step2_title': 'Arrange Quiz',
    'arr.step2_sub': 'Build quick decision-making skills in quiz format. Score based on speed and accuracy.',
    'arr.beginner': 'Beginner',
    'arr.intermediate': 'Intermediate',
    'arr.advanced': 'Advanced',
    'arr.q_count': 'Questions',
    'arr.q10': '10 Q',
    'arr.q20': '20 Q',
    'arr.q30': '30 Q',
    'arr.quiz_start': 'Start Quiz →',
    'arr.step3': 'STEP 3',
    'arr.step3_title': 'Arrange Training',
    'arr.step3_sub': 'Throw real darts to build muscle memory. Conquer scores from 2 to 170 in order.',
    'arr.step3_btn': 'Start Training →',
    'arr.step4': 'STEP 4',
    'arr.step4_title': 'Quest',
    'arr.step4_sub': 'Story-driven checkout challenges. Full routes and miss handling for match-like practice.',
    'arr.step4_btn': 'Go to Quest →',
    'arr.training_title': 'Arrange Training',
    'arr.back': '← Back',
    'arr.continue': 'Continue →',
    'arr.random': '🎲 Random Practice',
    'arr.weak_mode': '🎯 Weak Spots',
    'arr.to_list': '← To List',
    'arr.hint_btn': '👁 Show Hint',
    'arr.instruction': 'Throw darts and enter your result',
    'arr.ok': '✓ Success',
    'arr.ng': '✗ Failed',
    'arr.retry': '↩ Retry',
    'arr.next_score': 'Next Score →',
    'arr.prev_score': '← Prev Score',
    'arr.list': '📋 List',
    'arr.quest': 'Quest',
    'arr.quest_sim': '🎲 Sim',
    'arr.quest_real': '🎯 Real',
    'arr.quest_weakness': '📊 Weakness',
    'arr.quest_weakness_title': '📊 Weakness Analysis',
    'arr.quit': '← Quit',
    'arr.remaining': 'Remaining',
    'arr.success_next': 'Success! Next →',
    'arr.next_q': 'Next Question →',
    'arr.quiz_again': 'Play Again',
    'arr.quiz_weak_retry': 'Retry Weak Only',
    'arr.quiz_back': 'Back to Setup',
    'arr.teiseki_170': '170-99',
    'arr.teiseki_100': '100-3',
    'arr.teiseki_kezuri': 'Kezuri Tactics',

    /* ---- Shortcut editor ---- */
    'sc.title': '⚙ Edit Shortcuts',
    'sc.desc': 'Enter values for each button (0-180)',
    'sc.cancel': 'Cancel',
    'sc.save': 'Save',

    /* ---- PWA ---- */
    'pwa.msg': '📱 Add to home screen for offline use',
    'pwa.install': 'Add',

    /* ---- Onboarding ---- */
    'ob.next': 'Next',
    'ob.start': "Let's Go!",
    'ob.skip': 'Skip',

    /* ---- Common ---- */
    'common.score': 'Score',
    'common.remaining': 'Remaining',
    'common.avg': 'Average',
    'common.best': 'Best',
    'common.date': 'Date',
    'common.game': 'Game',
    'common.history': 'History'
  }
};

/* ---- Current language ---- */
var _currentLang = localStorage.getItem('app_lang') || 'ja';

/**
 * Get translation for a key
 * @param {string} key - Translation key (e.g. 'cu.game_start')
 * @returns {string} Translated string, or the key itself if not found
 */
function t(key) {
  var dict = _i18n[_currentLang];
  if (dict && dict[key] !== undefined) return dict[key];
  /* fallback to Japanese */
  var ja = _i18n.ja;
  if (ja && ja[key] !== undefined) return ja[key];
  return key;
}

/**
 * Get current language code
 * @returns {string} 'ja' or 'en'
 */
function getLang() {
  return _currentLang;
}

/**
 * Set the language and update all data-i18n elements
 * @param {string} lang - 'ja' or 'en'
 */
function setLang(lang) {
  if (!_i18n[lang]) return;
  _currentLang = lang;
  localStorage.setItem('app_lang', lang);
  _applyI18n();
  _updateLangToggle();
}

/**
 * Toggle between ja and en
 */
function toggleLang() {
  setLang(_currentLang === 'ja' ? 'en' : 'ja');
}

/**
 * Apply translations to all elements with data-i18n attribute
 */
function _applyI18n() {
  var els = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    var key = el.getAttribute('data-i18n');
    if (!key) continue;

    /* Check for attribute-specific translations: data-i18n-attr="placeholder" etc. */
    var attr = el.getAttribute('data-i18n-attr');
    if (attr) {
      el.setAttribute(attr, t(key));
    } else {
      /* Preserve leading emoji if present */
      var text = t(key);
      var currentText = el.textContent || '';
      var emojiMatch = currentText.match(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]\s*/u);
      if (el.hasAttribute('data-i18n-emoji')) {
        el.innerHTML = el.getAttribute('data-i18n-emoji') + ' ' + text;
      } else {
        el.textContent = text;
      }
    }
  }
}

/**
 * Update the language toggle button display
 */
function _updateLangToggle() {
  var btn = document.getElementById('btn-lang');
  if (btn) {
    btn.textContent = _currentLang === 'ja' ? 'EN' : 'JA';
    btn.title = _currentLang === 'ja' ? 'Switch to English' : '日本語に切り替え';
  }
}

/* ---- Initialize on load ---- */
document.addEventListener('DOMContentLoaded', function() {
  _applyI18n();
  _updateLangToggle();
});
