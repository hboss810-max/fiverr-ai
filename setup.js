const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

const GREEN = '\x1b[32m'; const YELLOW = '\x1b[33m'; const RED = '\x1b[31m';
const CYAN = '\x1b[36m'; const BOLD = '\x1b[1m'; const RESET = '\x1b[0m';

const log  = (m) => console.log(GREEN + 'OK  ' + m + RESET);
const warn = (m) => console.log(YELLOW + 'WARN ' + m + RESET);
const err  = (m) => console.log(RED + 'ERR  ' + m + RESET);
const info = (m) => console.log(CYAN + 'INFO ' + m + RESET);
const head = (m) => console.log('\n' + BOLD + m + RESET + '\n' + '-'.repeat(50));

function run(cmd, cwd) {
  try { return execSync(cmd, { cwd: cwd || process.cwd(), stdio: 'pipe' }).toString().trim(); }
  catch(e) { return null; }
}

function checkTool(name) {
  const found = run('where ' + name);
  if (!found) { err(name + ' not found'); process.exit(1); }
}

async function main() {
  head('Step 1: Checking tools');
  checkTool('git');
  checkTool('node');
  checkTool('npm');
  log('git: ' + run('git --version'));
  log('node: ' + run('node --version'));
  log('npm: ' + run('npm --version'));

  info('Installing Railway CLI...');
  run('npm install -g @railway/cli');
  log('Railway CLI ready');

  info('Installing Vercel CLI...');
  run('npm install -g vercel');
  log('Vercel CLI ready');

  head('Step 2: API Keys');
  console.log('Keys are saved to your local .env file only - never shared.\n');

  const anthropicKey = await ask(CYAN + 'Paste your Anthropic API key\n> ' + RESET);
  if (!anthropicKey.startsWith('sk-ant-')) {
    err('Invalid Anthropic key - should start with sk-ant-');
    process.exit(1);
  }

  const addStripe = await ask('\nAdd Stripe for payments? (y/n): ');
  let stripeKey = '';
  if (addStripe.toLowerCase() === 'y') {
    stripeKey = await ask(CYAN + 'Paste your Stripe Secret Key\n> ' + RESET);
  }

  head('Step 3: Writing config files');
  const envLines = [
    'ANTHROPIC_API_KEY=' + anthropicKey,
    stripeKey ? 'STRIPE_SECRET_KEY=' + stripeKey : '# STRIPE_SECRET_KEY=add_later',
    '# STRIPE_WEBHOOK_SECRET=add_later',
    'CLIENT_URL=http://localhost:5173',
    'PORT=3001'
  ];
  fs.writeFileSync(path.join(__dirname, 'server', '.env'), envLines.join('\n'));
  log('server/.env written');
  fs.writeFileSync(path.join(__dirname, 'client', '.env'), '# VITE_API_URL=add_after_railway_deploy\n');
  log('client/.env written');

  head('Step 4: Testing Anthropic key');
  const test = run('node -e "require(\'dotenv\').config({path:\'./server/.env\'});const A=require(\'@anthropic-ai/sdk\');new A({apiKey:process.env.ANTHROPIC_API_KEY}).messages.create({model:\'claude-haiku-4-5-20251001\',max_tokens:5,messages:[{role:\'user\',content:\'hi\'}]}).then(()=>{console.log(\'OK\');process.exit(0)}).catch(e=>{console.log(\'FAIL:\'+e.message);process.exit(1)})"', __dirname);
  if (test && test.includes('OK')) {
    log('Anthropic key works!');
  } else {
    err('Anthropic key failed: ' + test);
    process.exit(1);
  }

  head('Step 5: GitHub setup');
  if (!run('git status', __dirname)) {
    run('git init', __dirname);
    run('git add .', __dirname);
    run('git commit -m "Fiverr AI Platform"', __dirname);
  }
  const ghUser = await ask(CYAN + 'Your GitHub username: ' + RESET);
  const ghRepo = await ask(CYAN + 'New repo name (e.g. fiverr-ai): ' + RESET);
  console.log('\nRun these 3 commands now (open a NEW PowerShell window):');
  console.log('  git remote add origin https://github.com/' + ghUser + '/' + ghRepo + '.git');
  console.log('  git branch -M main');
  console.log('  git push -u origin main');
  console.log('\nFirst create the repo at: https://github.com/new');
  await ask('\nPress Enter when your code is on GitHub...');

  head('Step 6: Deploy to Railway');
  console.log('A browser window will open - log in with GitHub\n');
  execSync('railway login', { cwd: path.join(__dirname, 'server'), stdio: 'inherit' });
  execSync('railway init', { cwd: path.join(__dirname, 'server'), stdio: 'inherit' });
  run('railway variables set ANTHROPIC_API_KEY="' + anthropicKey + '"', path.join(__dirname, 'server'));
  if (stripeKey) run('railway variables set STRIPE_SECRET_KEY="' + stripeKey + '"', path.join(__dirname, 'server'));
  run('railway variables set PORT=3001', path.join(__dirname, 'server'));
  execSync('railway up', { cwd: path.join(__dirname, 'server'), stdio: 'inherit' });
  const serverUrl = await ask(CYAN + '\nPaste your Railway URL (from Railway dashboard): ' + RESET);
  run('railway variables set CLIENT_URL=https://placeholder.vercel.app', path.join(__dirname, 'server'));

  head('Step 7: Deploy to Vercel');
  fs.writeFileSync(path.join(__dirname, 'client', '.env'), 'VITE_API_URL=' + serverUrl + '\n');
  console.log('A browser window will open - log in with GitHub\n');
  execSync('vercel login', { cwd: path.join(__dirname, 'client'), stdio: 'inherit' });
  execSync('vercel --prod --yes', { cwd: path.join(__dirname, 'client'), stdio: 'inherit' });
  const frontendUrl = await ask(CYAN + '\nPaste your Vercel URL (from Vercel dashboard): ' + RESET);

  head('Step 8: Wiring together');
  run('railway variables set CLIENT_URL="' + frontendUrl + '"', path.join(__dirname, 'server'));
  run('railway up --detach', path.join(__dirname, 'server'));

  rl.close();
  console.log('\n' + '='.repeat(55));
  console.log(BOLD + GREEN + '  YOUR FIVERR AI PLATFORM IS LIVE!' + RESET);
  console.log('='.repeat(55));
  console.log('  Frontend: ' + CYAN + frontendUrl + RESET);
  console.log('  Backend:  ' + CYAN + serverUrl + RESET);
  console.log('  Health:   ' + CYAN + serverUrl + '/api/health' + RESET);
  console.log('='.repeat(55) + '\n');
}

main().catch(e => { console.log(RED + 'Error: ' + e.message + RESET); process.exit(1); });
