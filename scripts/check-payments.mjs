// Payments in USDC/SUI on Sui (npm run dev running; SUI_PAYMENT_ADDRESS set, needs-input.md):
//   node.exe scripts/check-payments.mjs                       prices and where to pay
//   node.exe scripts/check-payments.mjs <txDigest> <pack>     confirm a payment you sent
// Packs: small, medium, large, pro_answer. Send the shown USDC (or SUI) to the address from your
// wallet, then run with the transaction digest. Set SUI_NETWORK=testnet to try with test funds.
// Cost: 1 Tatum rate call + 1 Tatum gRPC read per confirm; no AI, no Walrus. The payment itself is
// whatever you send.
const BASE = 'http://localhost:5173';
async function call(method, path, body) {
	const res = await fetch(BASE + path, {
		method,
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
	return { status: res.status, data: await res.json().catch(() => null) };
}

const [txDigest, pack] = process.argv.slice(2);
if (txDigest) {
	const { status, data } = await call('POST', '/api/payments/confirm', { txDigest, pack });
	console.log(
		status === 200
			? `Confirmed: +${data.credits} credits (balance ${data.balance}), paid in ${data.coin}. ${data.explorerUrl}`
			: `${status}: ${data?.message}`
	);
} else {
	const { data } = await call('GET', '/api/payments');
	console.log(`Network: ${data.network}. ${data.how}`);
	if (data.payTo) console.log(`Pay to: ${data.payTo}`);
	console.log(`SUI price: ${data.suiUsd ?? 'unavailable'} USD (Tatum)`);
	for (const p of [...data.packs, data.proAnswer]) {
		console.log(
			`${p.id.padEnd(10)} ${p.label.padEnd(26)} $${p.price.usd} = ${p.price.usdc} USDC${p.price.sui ? ` or ${p.price.sui.toFixed(4)} SUI` : ''}`
		);
	}
	console.log(`Your payments: ${data.yours.length}`);
}
