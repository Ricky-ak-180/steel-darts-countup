// s181 ~ s1440 の合計スコア音声を生成
const { MsEdgeTTS } = require('msedge-tts');
const fs = require('fs');
const path = require('path');
const os = require('os');

const OUTPUT_DIR = path.join(__dirname, 'audio', 'caller');
const VOICE = 'en-GB-RyanNeural';

function scoreText(n) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
    'Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  if (n === 0) return 'Zero';
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

async function generateFile(filename, text) {
  const outPath = path.join(OUTPUT_DIR, filename + '.mp3');
  if (fs.existsSync(outPath)) return true; // skip existing

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

async function main() {
  console.log('=== Generating total score files (s181-s1440) ===\n');
  let count = 0, errors = 0;

  for (let i = 181; i <= 1440; i++) {
    const text = scoreText(i);
    const ok = await generateFile('s' + i, text);
    if (!ok) errors++;
    count++;
    if (count % 30 === 0) {
      console.log(`  ... ${count}/1260 done, pausing...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // マニフェスト更新
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

  console.log(`\n=== Done! ${count} files (${errors} errors) ===`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
