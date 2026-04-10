// ============================================================
// generate-caller.js — AI TTS音声生成スクリプト
// Microsoft Edge TTS (en-GB-RyanNeural) で感情付きコーラー音声を生成
//
// Usage: node generate-caller.js
// ============================================================

const { MsEdgeTTS } = require('msedge-tts');
const fs = require('fs');
const path = require('path');
const os = require('os');

const OUTPUT_DIR = path.join(__dirname, 'audio', 'caller');
const VOICE = 'en-GB-RyanNeural';

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
  const h = Math.floor(n / 100), r = n % 100;
  const base = h === 1 ? 'One Hundred' : 'Two Hundred';
  return base + (r > 0 ? ' and ' + scoreText(r) : '');
}

// ---- 音声生成 ----
async function generateFile(filename, text) {
  const outPath = path.join(OUTPUT_DIR, filename + '.mp3');

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
  console.log('=== Steel Darts Pro - AI Caller Voice Generator ===');
  console.log(`Voice: ${VOICE}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // バックアップ
  const backupDir = path.join(OUTPUT_DIR, '_backup_google');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('Backing up original Google TTS files...');
    const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.mp3'));
    for (const f of files) {
      fs.copyFileSync(path.join(OUTPUT_DIR, f), path.join(backupDir, f));
    }
    console.log(`  ${files.length} files backed up.\n`);
  }

  let count = 0;
  let errors = 0;

  // ---- 1. スコア音声 (s0 ~ s180) ----
  console.log('--- Score calls (s0-s180) ---');
  for (let i = 0; i <= 180; i++) {
    const text = scoreText(i);
    const ok = await generateFile('s' + i, text);
    if (!ok) errors++;
    count++;
    if (count % 30 === 0) {
      console.log(`  ... ${count} files done, pausing...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // ---- 2. テンション別バリアント (180, 140+) ----
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
    const ok = await generateFile(name, text);
    if (!ok) errors++;
    count++;
  }

  // ---- 3. リクワイア音声 (r2 ~ r170) ----
  console.log('\n--- Require calls (r2-r170) ---');
  for (let i = 2; i <= 170; i++) {
    const text = 'You require ' + scoreText(i);
    const ok = await generateFile('r' + i, text);
    if (!ok) errors++;
    count++;
    if (count % 30 === 0) {
      console.log(`  ... ${count} files done, pausing...`);
      await new Promise(r => setTimeout(r, 2000));
    }
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
    const ok = await generateFile(name, text);
    if (!ok) errors++;
    count++;
  }

  // ---- マニフェスト更新 ----
  console.log('\n--- Updating manifest ---');
  const allFiles = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.mp3') && !f.startsWith('_'))
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

  console.log(`\n=== Done! ${count} files generated (${errors} errors) ===`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
