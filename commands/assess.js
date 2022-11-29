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
		.setName('assess')
		.setDescription('Assess a user for their participation...or lack thereof')
        .addStringOption(option =>
            option.setName('address')
            .setDescription('The ETH/Polygon address of the user')
            .setRequired(true)
            .setMaxLength(42)
            .setMinLength(42)),

	async execute(interaction) {
        //get data
        target = interaction.options.getString('address');
        
        
        try {if (await voteContract.balanceOf(target) > 0 ) {

                if (await voteContract.checkStatus(target)) {
                    alias = await voteContract.getAlias(target);
                    ballot = await voteContract.seeBallot(target);
                    ballotName = await voteContract.getAlias(ballot);
                    votes = await voteContract.assessVotes(target);    
                    await interaction.reply(`${target} is known by the name ${byteToUTF8(alias)}, with ${votes} supporters, and currently supports ${byteToUTF8(ballotName)}.`);
                }  
                else await interaction.reply('That user has retreated to his country estate.');

            }else await interaction.reply('That address does not hold a voting token.');
    } catch {
        await interaction.reply('Invalid address');
    }

        //reply in channel
        
    },
};
