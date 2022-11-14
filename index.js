// Require the necessary discord.js classes
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const { ethers } = require("ethers");
const daobiABI = require("./abi/DaobiTokenABI.json");
const voteABI = require("./abi/DaobiVoteABI.json");
const sealABI = require("./abi/DaobiSealABI.json");

//addresses
const daobiAddr = '0x5988Bf243ADf1b42a2Ec2e9452D144A90b1FD9A9';
const voteAddr = '0xe8A858B29311652F7e2170118FbEaD34d097e88A';


//set up ethers provider
const provider = new ethers.providers.WebSocketProvider(process.env.ALCHEMY_POLYGON_WSS_URL);

//token contract
const daobiContract = new ethers.Contract(daobiAddr, daobiABI, provider);
const voteContract = new ethers.Contract(voteAddr, voteABI, provider);


// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function byteToUTF8(byte32) { //requires Nodejs
	baseCharArray = byte32.split("");
	let resultArray = [];
	for (let i = 2; i < baseCharArray.length; i += 2) {
		
		resultChar = parseInt(baseCharArray[i] + baseCharArray[i+1], 16);
		if (resultChar != 0) {
			resultArray.push(resultChar);
		}		
	}
	
	return  Buffer.from(resultArray).toString("utf-8");
}

async function alias(_name) {
	return await voteContract.getAlias(_name); 
}

// When the client is ready, run this code (only once)
client.once('ready', async () => {
	
	const general_channel = await client.channels.fetch(process.env.TARGET_CHANNEL);	
	
	console.log('Ready!');
	general_channel.send('Ready');

	//daobi token contract events
	daobiContract.on("NewChancellor", async(chanc) => {
		chancName = await alias(chanc);
		general_channel.send(`A new chancellor is proclaimed: ${byteToUTF8(chancName)}`);
		//console.log("New Chancellor");
		//console.log(chanc);
	});

	daobiContract.on("DaobiMinted", (amount) => {
		adjustedAmt = amount / (10 ** 18);
		if (adjustedAmt != 1) {
			general_channel.send(`The chancellor has minted ${adjustedAmt} DAObi tokens`);
		}
		else general_channel.send(`The chancellor has minted ${adjustedAmt} DAObi token`);
		//console.log("Minted: ", adjustedAmt);
	});

	//voting events
	voteContract.on("Voted", async(voter, votee, event) => {
		let info = {
			voter: voter,
			votee: votee,
			data: event,
		};
		voterName = await voteContract.getAlias(voter);
		voteeName = await voteContract.getAlias(votee);
		general_channel.send(`${byteToUTF8(voterName)} voted for ${byteToUTF8(voteeName)} for Chancellor.`);
		//console.log("Voter: ", voterName);
	});

	voteContract.on("NewToken", (newMember) => {
		general_channel.send(`A new voting token has been minted to ${newMember}`);
		//console.log("VoteMint: ", newMember);
	});

	voteContract.on("Registered", async(newMember, nickname, vote) => {
		let info = {
			newMember: newMember,
			nickname: nickname,
			vote: vote,
		};
		voteAlias = await voteContract.getAlias(info.vote);
		general_channel.send(`${info.newMember} has registered as ${byteToUTF8(nickname)}, voting for ${byteToUTF8(voteAlias)}.`);
		//console.log(typeof info.nickname);
	});

	voteContract.on("Reclused", async(recluse) => {
		recluseName = await alias(recluse);		
		general_channel.send(`${byteToUTF8(recluseName)}} has withdrawn from service.`);
		//console.log("Reclused: ", recluse);
	});

	voteContract.on("Burnt", (burnee) => {		
		general_channel.send(`${burnee} has been immolated by the authorities.`);
	});

	voteContract.on("SelfBurnt", (burnee) => {		
		general_channel.send(`${burnee} has destroyed his token of rank!`);
	});

	voteContract.on("NFTRetarget", (newURI) => {		
		general_channel.send(`The approved seal for voting members is now ${newURI}`);
	});

});

// Login to Discord with your client's token
client.login(process.env.DISCORD_BOT_TOKEN);






