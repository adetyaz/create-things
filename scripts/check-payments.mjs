// Payments without a wallet (npm run dev running; SUI_AGENT_KEY_TESTNET and SOURCE_TOKEN_KEY set,
// migration 0017 applied):
//   node.exe scripts/check-payments.mjs                prices, your account and its balances
//   node.exe scripts/check-payments.mjs --fund         testnet: free test SUI into your account
//   node.exe scripts/check-payments.mjs --buy <pack>   pay from your account: small, medium,
//                                                      large or pro_answer
//   node.exe scripts/check-payments.mjs --mpp          MPP: ask for a Pro answer without paying
//                                                      → the 402 price challenge (free)
//   node.exe scripts/check-payments.mjs --pro "question"  MPP: the app pays the 402 from your
//                                                      account, Tatum confirms, the answer comes
//                                                      back (1 Pro answer of test SUI; 1 AI call)
// Your account is made by the app (no wallet); the app pays the gas; Tatum confirms each payment.
// Cost: test SUI only on testnet (free); 1 Tatum rate call + a few Tatum reads per purchase.
// No AI (except --pro), no Walrus. Switch to real money with SUI_NETWORK=mainnet (and SUI_AGENT_KEY_MAINNET).
const BASE = 'http://localhost:5173';
async function call(method, path, body) {
	const res = await fetch(BASE + path, {
		method,
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
	return { status: res.status, data: await res.json().catch(() => null) };
}

const [flag, pack] = process.argv.slice(2);
if (flag === '--fund') {
	const { status, data } = await call('POST', '/api/payments/test-funds');
	console.log(
		status === 200
			? 'Asked the faucet: test SUI arrives in a few seconds.'
			: `${status}: ${data?.message}`
	);
} else if (flag === '--mpp') {
	const res = await fetch(BASE + '/api/mpp/pro-answer', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ messages: [{ role: 'user', text: 'What should I do first today?' }] })
	});
	console.log(`${res.status} ${res.statusText}`);
	const challenge = res.headers.get('www-authenticate');
	if (challenge) {
		console.log(`WWW-Authenticate: ${challenge}`);
		const request = /request="([^"]+)"/.exec(challenge)?.[1];
		if (request) console.log('Price:', Buffer.from(request, 'base64url').toString());
	} else console.log(await res.text());
} else if (flag === '--pro') {
	const text = pack ?? 'What should I do first today?';
	const { status, data } = await call('POST', '/api/payments/pro-answer', {
		messages: [{ role: 'user', text }]
	});
	if (status === 200) {
		const p = data.payment;
		console.log(`Paid over ${p.protocol}: ${p.amount} ${p.coin}, confirmed by ${p.confirmedBy}`);
		console.log(`  ${p.explorerUrl}`);
		console.log(`Answer: ${JSON.stringify(data.answer).slice(0, 400)}`);
	} else console.log(`${status}: ${data?.message ?? JSON.stringify(data)}`);
} else if (flag === '--buy') {
	const { status, data } = await call('POST', '/api/payments/buy', { pack });
	console.log(
		status === 200
			? `Paid in ${data.coin.toUpperCase()}: +${data.credits} credits (balance ${data.balance}). ${data.explorerUrl}`
			: `${status}: ${data?.message}`
	);
} else {
	const { data } = await call('GET', '/api/payments');
	console.log(`Network: ${data.network}. ${data.how}`);
	if (data.account) {
		console.log(
			`Your account: ${data.account.balances.sui} SUI, ${data.account.balances.usdc} USDC`
		);
		console.log(`  (details: ${data.account.details.explorerUrl})`);
	}
	console.log(`SUI price: ${data.suiUsd ?? 'unavailable'} USD (Tatum)`);
	for (const p of [...data.packs, data.proAnswer]) {
		console.log(
			`${p.id.padEnd(10)} ${p.label.padEnd(26)} $${p.price.usd} = ${p.price.usdc} USDC${p.price.sui ? ` or ${p.price.sui.toFixed(4)} SUI` : ''}`
		);
	}
	console.log(`Your payments: ${data.yours.length}`);
	for (const p of data.yours) console.log(`  ${p.purpose} in ${p.coin}: ${p.explorerUrl}`);
}
