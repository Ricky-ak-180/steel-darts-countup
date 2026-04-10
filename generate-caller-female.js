// ============================================================
// generate-caller-female.js — 女性コーラー音声生成スクリプト
// Microsoft Edge TTS (en-GB-SoniaNeural) で女性音声を生成
//
// Usage: node generate-caller-female.js
// ============================================================

const { MsEdgeTTS } = require('msedge-tts');
const fs = require('fs');
const path = require('path');
const os = require('os');

const OUTPUT_DIR = path.join(__dirname, 'audio', 'caller', 'female');
const VOICE = 'en-GB-SoniaNeural';

// ---- スコアテキスト変換 ----
function scoreText(n) {
  const SPECIAL = {
    0: 'No score.',
    180: 'One Hundred and Eighty!',
    177: 'One Hundred and Seventy Seven',
    174: 'One Hundred and Seventy Four',
    171: 'One Hundred and Seventy One',
    170: 'One Hundred and Seventy',
    160: 'One Hundred and Sixty',
    158: 'One Hundred and Fifty Eight',
    157: 'One Hundred and Fifty Seven',
    150: 'One Hundred and Fifty',
    140: 'One Hundred and Forty',
    130: 'One Hundred and Thirty',
    120: 'One Hundred and Twenty',
    110: 'One Hundred and Ten',
    100: 'One Hundred',
  };
  if (SPECIAL[n] !== undefined) return SPECIAL[n];

  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
    'Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  if (n < 20) return ones[n];
  if (n < 100) {
    const t = Math.floor(n / 10), o = n % 10;
    return tens[t] + (o ? ' ' + ones[o] : '');
  }
  if (n < 1000) {
    const h = Math.floor(n / 100), r = n % 100;
    return ones[h] + ' Hundred' + (r > 0 ? ' and ' + scoreText(r) : '');
  }
  // 1000+
  const th = Math.floor(n / 1000), rem = n % 1000;
  return ones[th] + ' Thousand' + (rem > 0 ? (rem < 100 ? ' and ' : ' ') + scoreText(rem) : '');
}

// ---- 音声生成 ----
async function generateFile(filename, text, skip) {
  const outPath = path.join(OUTPUT_DIR, filename + '.mp3');
  if (skip && fs.existsSync(outPath)) {
    console.log(`  [SKIP] ${filename} (already exists)`);
    return true;
  }
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(VOICE, 'audio-24khz-48kbitrate-mono-mp3');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'));
    const result = await tts.toFile(tmpDir, text);
    fs.copyFileSync(result.audioFilePath, outPath);
    fs.rmSync(tmpDir, { recursive: true });
    const size = fs.statSync(outPath).size;
    console.log(`  [OK] ${filename} (${(size/1024).toFixed(1)}KB)`);
    return true;
  } catch (e) {
    console.error(`  [ERR] ${filename}: ${e.message}`);
    return false;
  }
}

// ---- メイン ----
async function main() {
  console.log('=== Steel Darts Pro - Female Caller Voice Generator ===');
  console.log(`Voice: ${VOICE}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // 出力ディレクトリ作成
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 既存ファイルをスキップするか？ (再実行時に便利)
  const SKIP_EXISTING = process.argv.includes('--skip-existing');
  if (SKIP_EXISTING) console.log('Mode: skip existing files\n');

  let count = 0, errors = 0;

  // ---- 1. スコア音声 (s0 ~ s180) ----
  console.log('--- Score calls (s0-s180) ---');
  for (let i = 0; i <= 180; i++) {
    const ok = await generateFile('s' + i, scoreText(i), SKIP_EXISTING);
    if (!ok) errors++;
    count++;
    if (count % 20 === 0) await new Promise(r => setTimeout(r, 1000));
  }

  // ---- 2. テンション別バリアント ----
  console.log('\n--- Tension variants ---');
  const tensionFiles = [
    ['s180_high', 'ONE HUNDRED AND EIGHTY!'],
    ['s140_high', 'One Hundred and Forty!'],
    ['s150_high', 'One Fifty!'],
    ['s160_high', 'One Sixty!'],
    ['s170_high', 'One Seventy!'],
    ['s100_high', 'One Hundred!'],
  ];
  for (const [name, text] of tensionFiles) {
    const ok = await generateFile(name, text, SKIP_EXISTING);
    if (!ok) errors++;
    count++;
  }

  // ---- 3. リクワイア音声 (r2 ~ r170) ----
  console.log('\n--- Require calls (r2-r170) ---');
  for (let i = 2; i <= 170; i++) {
    const ok = await generateFile('r' + i, 'You require ' + scoreText(i), SKIP_EXISTING);
    if (!ok) errors++;
    count++;
    if (count % 20 === 0) await new Promise(r => setTimeout(r, 1000));
  }

  // ---- 4. 特殊音声 ----
  console.log('\n--- Special calls ---');
  const specials = [
    ['gameshot_match', 'Game shot! And the match!'],
    ['gameshot_leg', 'Game shot, and the leg.'],
    ['bust', 'Bust.'],
    ['checkout', 'Checkout! Well done!'],
    ['cpu_checkout', 'CPU checks out.'],
    ['gameover', 'Game over.'],
    ['total_score', 'Total score,'],
    ['caller_on', 'Caller on.'],
  ];
  for (const [name, text] of specials) {
    const ok = await generateFile(name, text, SKIP_EXISTING);
    if (!ok) errors++;
    count++;
  }

  // ---- 5. CountUp合計スコア (s181 ~ s1440) ----
  console.log('\n--- CountUp totals (s181-s1440) ---');
  for (let i = 181; i <= 1440; i++) {
    const ok = await generateFile('s' + i, scoreText(i), SKIP_EXISTING);
    if (!ok) errors++;
    count++;
    if (count % 30 === 0) {
      console.log(`  ... ${count} files done`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // ---- マニフェスト生成 ----
  console.log('\n--- Generating manifest ---');
  const allFiles = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.mp3'))
    .map(f => f.replace('.mp3', ''))
    .sort();
  const manifest = {
    engine: 'edge-tts',
    voice: VOICE,
    tension_variants: true,
    files: allFiles,
    generated: new Date().toISOString()
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`  manifest.json: ${allFiles.length} files listed`);

  console.log(`\n=== Done! ${count} files generated (${errors} errors) ===`);
  if (errors > 0) console.log(`Tip: re-run with --skip-existing to retry only failed files`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
