// Require the necessary discord.js classes
require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');

const fs = require('node:fs');
const path = require('node:path');
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

//requirements for command handling
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

//load commands from directory specified above (commands)
for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

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
	
	console.log('Bot Activated');

	//command listener
	client.on(Events.InteractionCreate, async interaction => {
		if (!interaction.isChatInputCommand()) return;
	
		const command = interaction.client.commands.get(interaction.commandName);
	
		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}
	
		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	});

	//daobi token contract events
	daobiContract.on("NewChancellor", async(chanc) => {
		chancName = await alias(chanc);
		general_channel.send(`A new chancellor is proclaimed: ${byteToUTF8(chancName)}`);
		console.log("New Chancellor: ", chanc);
	});

	daobiContract.on("DaobiMinted", (amount) => {
		adjustedAmt = amount / (10 ** 18);
		if (adjustedAmt != 1) {
			general_channel.send(`The chancellor has minted ${adjustedAmt} DAObi tokens`);
		}
		else general_channel.send(`The chancellor has minted ${adjustedAmt} DAObi token`);
		console.log("Minted: ", adjustedAmt);
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
		console.log(`${byteToUTF8(voterName)} voted for ${byteToUTF8(voteeName)} for Chancellor.`);
	});

	voteContract.on("NewToken", (newMember) => {
		general_channel.send(`A new voting token has been minted to ${newMember}`);
		console.log("VoteMint: ", newMember);
	});

	voteContract.on("Registered", async(newMember, nickname, vote) => {
		let info = {
			newMember: newMember,
			nickname: nickname,
			vote: vote,
		};
		voteAlias = await voteContract.getAlias(info.vote);
		general_channel.send(`${info.newMember} has registered as ${byteToUTF8(nickname)}, voting for ${byteToUTF8(voteAlias)}.`);
		console.log(`${info.newMember} has registered as ${byteToUTF8(nickname)}, voting for ${byteToUTF8(voteAlias)}.`);
	});

	voteContract.on("Reclused", async(recluse) => {
		recluseName = await alias(recluse);		
		general_channel.send(`${byteToUTF8(recluseName)} has withdrawn from service.`);
		console.log("Reclused: ", recluse);
	});

	voteContract.on("Burnt", (burnee) => {		
		general_channel.send(`${burnee} has been immolated by the authorities.`);
		console.log("AdminBurn: ", burnee);
	});

	voteContract.on("SelfBurnt", (burnee) => {		
		general_channel.send(`${burnee} has destroyed his token of rank!`);
		console.log("SelfBurnt: ", burnee);
	});

	voteContract.on("NFTRetarget", (newURI) => {		
		general_channel.send(`The approved seal for voting members is now ${newURI}`);
		console.log("NFTRetarget: ", newURI);
	});

});

// Login to Discord with your client's token
client.login(process.env.DISCORD_BOT_TOKEN);






