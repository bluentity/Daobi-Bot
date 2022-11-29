require('dotenv').config({ path: require('find-config')('.env') });
const { SlashCommandBuilder } = require('discord.js');

const { ethers } = require("ethers");
const daobiABI = require("../abi/DaobiTokenABI.json");
const voteABI = require("../abi/DaobiVoteABI.json");

//set up ethers provider
const provider = new ethers.providers.WebSocketProvider(process.env.ALCHEMY_POLYGON_WSS_URL);


//addresses
const daobiAddr = '0x5988Bf243ADf1b42a2Ec2e9452D144A90b1FD9A9';
const voteAddr = '0xe8A858B29311652F7e2170118FbEaD34d097e88A';

//contracts
const daobiContract = new ethers.Contract(daobiAddr, daobiABI, provider);
const voteContract = new ethers.Contract(voteAddr, voteABI, provider);


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

module.exports = {
	data: new SlashCommandBuilder()
		.setName('chancellor')
		.setDescription('View the current chancellor'),
	async execute(interaction) {
        //get data
        chancellorAddr = await daobiContract.chancellor();
        chancellorName = await voteContract.getAlias(chancellorAddr);
        votes = await voteContract.assessVotes(chancellorAddr);      

        //reply in channel
        await interaction.reply(`The current chancellor is ${byteToUTF8(chancellorName)} (${chancellorAddr}) with ${votes} supporters.`);
    },
};
