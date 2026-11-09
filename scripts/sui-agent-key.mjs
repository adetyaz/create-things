// Makes the app's own Sui account (it pays users' gas and receives their payments):
//   node.exe scripts/sui-agent-key.mjs            testnet (and asks the faucet for free test SUI)
//   node.exe scripts/sui-agent-key.mjs mainnet    mainnet (fund it yourself with a little SUI)
// Prints one line for .env. That line is a secret key: paste it into .env and nowhere else.
// Cost: nothing (the testnet faucet is free; it may rate-limit, then try again later).
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';

const network = process.argv[2] === 'mainnet' ? 'mainnet' : 'testnet';
const keypair = new Ed25519Keypair();
const address = keypair.toSuiAddress();

console.log(`Add this line to .env (secret, never share it):\n`);
console.log(`SUI_AGENT_KEY_${network.toUpperCase()}=${keypair.getSecretKey()}\n`);
console.log(`The app's ${network} address (public): ${address}`);
console.log(`See it: https://suiscan.xyz/${network}/account/${address}`);

if (network === 'testnet') {
	try {
		await requestSuiFromFaucetV2({ host: getFaucetHost('testnet'), recipient: address });
		console.log("Asked the faucet for test SUI (arrives in a few seconds; it pays users' gas).");
	} catch (e) {
		console.log(
			`The faucet said no (${e instanceof Error ? e.message : e}); try faucet.sui.io with the address above.`
		);
	}
} else {
	console.log(
		"Send a little SUI (e.g. 2 SUI) to this address: it pays the gas for users' payments."
	);
}
