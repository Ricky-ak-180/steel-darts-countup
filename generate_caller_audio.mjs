/**
 * generate_caller_audio.mjs
 * Google Translate TTS (非公式エンドポイント) で音声ファイルを生成
 * 外部パッケージ不要 — Node.js 組み込み https モジュールを使用
 *
 * 使い方:
 *   node generate_caller_audio.mjs
 *
 * 生成先: ./audio/caller/
 */

import https from 'https';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'audio', 'caller');
const LANG = 'en-GB';
const PAUSE_MS = 150; // リクエスト間隔

// ---- Google TTS ----
function fetchTTS(text) {
  return new Promise((resolve, reject) => {
    const enc = encodeURIComponent(text);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${enc}&tl=${LANG}&client=tw-ob&total=1&idx=0&textlen=${text.length}&tk=0`;
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
        'Accept': '*/*',
      }
    };
    https.get(url, opts, (res) => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

// ---- スコアテキスト変換 ----
const SCORE_MAP = {
  180:'One Hundred and Eighty!', 177:'One Hundred and Seventy Seven',
  174:'One Hundred and Seventy Four', 171:'One Hundred and Seventy One',
  170:'One Hundred and Seventy', 167:'One Hundred and Sixty Seven',
  164:'One Hundred and Sixty Four', 161:'One Hundred and Sixty One',
  160:'One Hundred and Sixty', 158:'One Hundred and Fifty Eight',
  157:'One Hundred and Fifty Seven', 156:'One Hundred and Fifty Six',
  155:'One Hundred and Fifty Five', 154:'One Hundred and Fifty Four',
  153:'One Hundred and Fifty Three', 152:'One Hundred and Fifty Two',
  151:'One Hundred and Fifty One', 150:'One Hundred and Fifty',
  140:'One Hundred and Forty', 139:'One Hundred and Thirty Nine',
  138:'One Hundred and Thirty Eight', 137:'One Hundred and Thirty Seven',
  136:'One Hundred and Thirty Six', 135:'One Hundred and Thirty Five',
  134:'One Hundred and Thirty Four', 133:'One Hundred and Thirty Three',
  132:'One Hundred and Thirty Two', 131:'One Hundred and Thirty One',
  130:'One Hundred and Thirty', 129:'One Hundred and Twenty Nine',
  128:'One Hundred and Twenty Eight', 127:'One Hundred and Twenty Seven',
  126:'One Hundred and Twenty Six', 125:'One Hundred and Twenty Five',
  124:'One Hundred and Twenty Four', 123:'One Hundred and Twenty Three',
  122:'One Hundred and Twenty Two', 121:'One Hundred and Twenty One',
  120:'One Hundred and Twenty', 119:'One Hundred and Nineteen',
  118:'One Hundred and Eighteen', 117:'One Hundred and Seventeen',
  116:'One Hundred and Sixteen', 115:'One Hundred and Fifteen',
  114:'One Hundred and Fourteen', 113:'One Hundred and Thirteen',
  112:'One Hundred and Twelve', 111:'One Hundred and Eleven',
  110:'One Hundred and Ten', 109:'One Hundred and Nine',
  108:'One Hundred and Eight', 107:'One Hundred and Seven',
  106:'One Hundred and Six', 105:'One Hundred and Five',
  104:'One Hundred and Four', 103:'One Hundred and Three',
  102:'One Hundred and Two', 101:'One Hundred and One',
  100:'One Hundred',
};
const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function smallNum(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n/10), o = n%10;
  return TENS[t] + (o ? ' ' + ONES[o] : '');
}
function scoreText(s) {
  if (s === 0) return 'No score.';
  if (SCORE_MAP[s]) return SCORE_MAP[s];
  if (s >= 100) {
    const h = Math.floor(s/100), r = s%100;
    return (h===1?'One Hundred':'Two Hundred') + (r ? ' and ' + smallNum(r) : '');
  }
  return smallNum(s);
}

// ---- フレーズ一覧 ----
function buildPhrases() {
  const p = {};
  for (let s = 0; s <= 180; s++) p[`s${s}`] = scoreText(s);
  for (let r = 2; r <= 170; r++) p[`r${r}`] = `You require ${scoreText(r)}.`;
  p['gameshot_match'] = 'Game Shot! And the match!';
  p['gameshot_leg']   = 'Game Shot! And the leg.';
  p['bust']           = 'Bust.';
  p['checkout']       = 'Checkout! Well done!';
  p['cpu_checkout']   = 'C P U checks out.';
  p['gameover']       = 'Game over.';
  p['total_score']    = 'Total score,';
  p['caller_on']      = 'Caller on.';
  return p;
}

// ---- メイン ----
async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const phrases = buildPhrases();
  const entries = Object.entries(phrases);
  const pending = entries.filter(([name]) => !existsSync(path.join(OUTPUT_DIR, `${name}.mp3`)));
  const skipped = entries.length - pending.length;

  console.log(`\n🎙️  ダーツコーラー音声生成`);
  console.log(`   エンジン: Google TTS (en-GB)`);
  console.log(`   合計: ${entries.length} フレーズ  スキップ: ${skipped}  生成: ${pending.length}\n`);

  if (pending.length === 0) {
    console.log('✅ 全ファイル生成済みです'); return;
  }

  let done = 0, errors = 0;

  for (const [name, text] of pending) {
    try {
      const buf = await fetchTTS(text);
      if (buf.length < 500) throw new Error('too small: ' + buf.length + 'bytes');
      await writeFile(path.join(OUTPUT_DIR, `${name}.mp3`), buf);
      done++;
      process.stdout.write(`\r   進捗: ${done + skipped}/${entries.length} (${Math.round((done+skipped)/entries.length*100)}%)  `);
    } catch (e) {
      errors++;
      process.stderr.write(`\nERROR [${name}] "${text}": ${e.message}\n`);
    }
    await new Promise(r => setTimeout(r, PAUSE_MS));
  }

  // マニフェスト保存
  await writeFile(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify({ engine: 'google-tts', lang: LANG, files: Object.keys(phrases), generated: new Date().toISOString() }, null, 2)
  );

  console.log(`\n\n✅ 完了! 生成: ${done}, エラー: ${errors}`);
  console.log(`   出力先: ${OUTPUT_DIR}`);
  if (errors > 0) console.log('   ヒント: エラーが出たファイルは再実行でスキップされ再試行されます');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
