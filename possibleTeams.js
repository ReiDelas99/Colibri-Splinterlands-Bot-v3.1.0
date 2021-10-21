require('dotenv').config()
const cards = require('./getCards.js');
const card = require('./cards');
const helper = require('./helper');
const battles = require('./battles');
const fetch = require("node-fetch");

const summoners = [{ 224: 'dragon' },
{ 27: 'earth' },
{ 16: 'water' },
{ 156: 'life' },
{ 189: 'earth' },
{ 167: 'fire' },
{ 145: 'death' },
{ 5: 'fire' },
{ 71: 'water' },
{ 114: 'dragon' },
{ 178: 'water' },
{ 110: 'fire' },
{ 49: 'death' },
{ 88: 'dragon' },
{ 38: 'life' },
{ 239: 'life' },
{ 74: 'death' },
{ 78: 'dragon' },
{ 260: 'fire' },
{ 70: 'fire' },
{ 109: 'death' },
{ 111: 'water' },
{ 112: 'earth' },
{ 130: 'dragon' },
{ 72: 'earth' },
{ 235: 'dragon' },
{ 56: 'dragon' },
{ 113: 'life' },
{ 200: 'dragon' },
{ 236: 'fire' },
{ 240: 'dragon' },
{ 254: 'water' },
{ 257: 'water' },
{ 258: 'death' },
{ 259: 'earth' },
{ 261: 'life' },
{ 262: 'dragon' },
{ 278: 'earth' },
{ 73: 'life' }]

const splinters = ['fire', 'life', 'earth', 'water', 'death', 'dragon']

const getSummoners = (myCards) => {
    try {
        const sumArray = summoners.map(x=>Number(Object.keys(x)[0]))
        const mySummoners = myCards.filter(value => sumArray.includes(Number(value)));
        return mySummoners;             
    } catch(e) {
        console.log(e);
        return [];
    }
}

const summonerColor = (id) => {
    const summonerDetails = summoners.find(x => x[id]);
    return summonerDetails ? summonerDetails[id] : '';
}

const historyBackup = require("./data/newHistory.json");
const basicCards = require('./data/basicCards.js');
const { filter } = require('./data/basicCards.js');


let availabilityCheck = (base, toCheck) => toCheck.slice(0, 7).every(v => base.includes(v));

const getBattlesWithRuleset = (ruleset, mana, summoners) => {
    const rulesetEncoded = encodeURIComponent(ruleset);
    const host = process.env.API_URL || 'https://splinterlands-data-service.herokuapp.com/'
    let url = ''
	const useClassicPrivateAPI = JSON.parse(process.env.USAR_API_MELHORES_JOGADORES.toLowerCase());
    if (useClassicPrivateAPI) {
		url = `battlesruleset?ruleset=${rulesetEncoded}&mana=${mana}&player=${process.env.USUARIO}&summoners=${summoners ? JSON.stringify(summoners) : ''}`;
        
	}
    console.log('API Colibri: ', host+url)
    return fetch(host+url)
        .then(x => x && x.json())
        .then(data => data)
        .catch((e) => console.log('fetch ', e))
}

const battlesFilterByManacap = async (mana, ruleset, summoners) => {
	const backupLength = historyBackup && historyBackup.length
	const useClassicPrivateAPI = JSON.parse(process.env.USAR_API_MELHORES_JOGADORES.toLowerCase());
	if (useClassicPrivateAPI) {
		const history = await getBattlesWithRuleset(ruleset, mana, summoners);
		if (history) {
			console.log('Resultados retornados pela API: ', history.length)
			return history.filter(
				battle =>
					battle.mana_cap == mana &&
					(ruleset ? battle.ruleset === ruleset : true)
			)
		}
	}
	
    console.log('Usando Backup ', backupLength)
    
    return historyBackup.filter(
        battle =>
            battle.mana_cap == mana &&
            (ruleset ? battle.ruleset === ruleset : true)
    )
}

function compare(a, b) {
    const totA = a[9];
    const totB = b[9];
  
    let comparison = 0;
    if (totA < totB) {
      comparison = 1;
    } else if (totA > totB) {
      comparison = -1;
    }
    return comparison;
  }

const cardsIdsforSelectedBattles = (mana, ruleset, splinters, summoners) => battlesFilterByManacap(mana, ruleset, summoners)
    .then(x => {
        return x.map(
            (x) => {
                return [
                    x.summoner_id ? parseInt(x.summoner_id) : '',
                    x.monster_1_id ? parseInt(x.monster_1_id) : '',
                    x.monster_2_id ? parseInt(x.monster_2_id) : '',
                    x.monster_3_id ? parseInt(x.monster_3_id) : '',
                    x.monster_4_id ? parseInt(x.monster_4_id) : '',
                    x.monster_5_id ? parseInt(x.monster_5_id) : '',
                    x.monster_6_id ? parseInt(x.monster_6_id) : '',
                    summonerColor(x.summoner_id) ? summonerColor(x.summoner_id) : '',
                    x.tot ? parseInt(x.tot) : '',
                    x.ratio ? parseInt(x.ratio) : '',
                ]
            }
        ).filter(
            team => splinters.includes(team[7])
        ).sort(compare)
    })

const askFormation = function (matchDetails) {
    const cards = matchDetails.myCards || basicCards;
    const mySummoners = getSummoners(cards);
    console.log('Entrada: ', matchDetails.mana, matchDetails.rules, matchDetails.splinters, cards.length);
    return cardsIdsforSelectedBattles(matchDetails.mana, matchDetails.rules, matchDetails.splinters, mySummoners)
        .then(x => x.filter(
            x => availabilityCheck(cards, x))
            .map(element => element)
        )
}

const possibleTeams = async (matchDetails) => {
    let possibleTeams = [];
    while (matchDetails.mana > 10) {
        console.log('Calculando batalhas pela quantidade de Mana: '+matchDetails.mana)
        possibleTeams = await askFormation(matchDetails)
        if (possibleTeams.length > 0) {
            return possibleTeams;
        }
        matchDetails.mana--;
    }
    return possibleTeams;
}

const mostWinningSummonerTankCombo = async (possibleTeams, matchDetails) => {
    const bestCombination = await battles.mostWinningSummonerTank(possibleTeams)
    console.log('Melhor invocador e tank', bestCombination)
    if (bestCombination.summonerWins >= 1 && bestCombination.tankWins > 1 && bestCombination.backlineWins > 1 && bestCombination.secondBacklineWins > 1 && bestCombination.thirdBacklineWins > 1 && bestCombination.forthBacklineWins > 1) {
        const bestTeam = await possibleTeams.find(x => x[0] == bestCombination.bestSummoner && x[1] == bestCombination.bestTank && x[2] == bestCombination.bestBackline && x[3] == bestCombination.bestSecondBackline && x[4] == bestCombination.bestThirdBackline && x[5] == bestCombination.bestForthBackline)
        console.log('Melhor seleção', bestTeam)
        const summoner = bestTeam[0].toString();
        return [summoner, bestTeam];
    }
    if (bestCombination.summonerWins >= 1 && bestCombination.tankWins > 1 && bestCombination.backlineWins > 1 && bestCombination.secondBacklineWins > 1 && bestCombination.thirdBacklineWins > 1) {
        const bestTeam = await possibleTeams.find(x => x[0] == bestCombination.bestSummoner && x[1] == bestCombination.bestTank && x[2] == bestCombination.bestBackline && x[3] == bestCombination.bestSecondBackline && x[4] == bestCombination.bestThirdBackline)
        console.log('Melhor seleção', bestTeam)
        const summoner = bestTeam[0].toString();
        return [summoner, bestTeam];
    }
    if (bestCombination.summonerWins >= 1 && bestCombination.tankWins > 1 && bestCombination.backlineWins > 1 && bestCombination.secondBacklineWins > 1) {
        const bestTeam = await possibleTeams.find(x => x[0] == bestCombination.bestSummoner && x[1] == bestCombination.bestTank && x[2] == bestCombination.bestBackline && x[3] == bestCombination.bestSecondBackline)
        console.log('Melhor seleção', bestTeam)
        const summoner = bestTeam[0].toString();
        return [summoner, bestTeam];
    }
    if (bestCombination.summonerWins >= 1 && bestCombination.tankWins > 1 && bestCombination.backlineWins > 1) {
        const bestTeam = await possibleTeams.find(x => x[0] == bestCombination.bestSummoner && x[1] == bestCombination.bestTank && x[2] == bestCombination.bestBackline)
        console.log('Melhor seleção', bestTeam)
        const summoner = bestTeam[0].toString();
        return [summoner, bestTeam];
    }
    if (bestCombination.summonerWins >= 1 && bestCombination.tankWins > 1) {
        const bestTeam = await possibleTeams.find(x => x[0] == bestCombination.bestSummoner && x[1] == bestCombination.bestTank)
        console.log('Melhor seleção', bestTeam)
        const summoner = bestTeam[0].toString();
        return [summoner, bestTeam];
    }
    if (bestCombination.summonerWins >= 1) {
        const bestTeam = await possibleTeams.find(x => x[0] == bestCombination.bestSummoner)
        console.log('Melhor seleção', bestTeam)
        const summoner = bestTeam[0].toString();
        return [summoner, bestTeam];
    }
}

const teamSelection = async (possibleTeams, matchDetails, quest) => {

	const useClassicPrivateAPI = JSON.parse(process.env.USAR_API_MELHORES_JOGADORES.toLowerCase());
    if (useClassicPrivateAPI && possibleTeams[0][8]) {
        console.log('Escolha da melhor seleção: ', possibleTeams[0])
        return { summoner: possibleTeams[0][0], cards: possibleTeams[0] };
    }
    
    console.log('Opção personalizada da missão diária definida como:', process.env.JOGAR_MISSAO_DIARIA, typeof process.env.JOGAR_MISSAO_DIARIA)
    let priorityToTheQuest = JSON.parse(process.env.JOGAR_MISSAO_DIARIA.toLowerCase());
    if(priorityToTheQuest && possibleTeams.length > 25 && quest && quest.total) {
        const left = quest.total - quest.completed;
        const questCheck = matchDetails.splinters.includes(quest.splinter) && left > 0;
        const filteredTeams = possibleTeams.filter(team=>team[7]===quest.splinter)
        console.log(left + ' batalhas restantes para completar a missão '+quest.splinter)
        console.log('Jogar missão ',quest.splinter,'? ',questCheck)
        if(left > 0 && filteredTeams && filteredTeams.length > 10 && splinters.includes(quest.splinter)) {
            console.log('Jogando missão com a seleção: ',filteredTeams.length , filteredTeams)
            const res = await mostWinningSummonerTankCombo(filteredTeams, matchDetails);
            console.log('Jogando esta seleção para missão:', res)
            if (res[0] && res[1]) {
                return { summoner: res[0], cards: res[1] };
            }
        }
    }

    const res = await mostWinningSummonerTankCombo(possibleTeams, matchDetails);
    console.log('Não jogar a missão, jogando esta seleção:', res)
    if (res[0] && res[1]) {
        return { summoner: res[0], cards: res[1] };
    }

    let i = 0;
    for (i = 0; i <= possibleTeams.length - 1; i++) {
        if (matchDetails.splinters.includes(possibleTeams[i][7]) && helper.teamActualSplinterToPlay(possibleTeams[i]) !== '' && matchDetails.splinters.includes(helper.teamActualSplinterToPlay(possibleTeams[i]).toLowerCase())) {
            console.log('Menos de 25 seleções disponíveis / Selecionado: ', possibleTeams[i]);
            const summoner = card.makeCardId(possibleTeams[i][0].toString());
            return { summoner: summoner, cards: possibleTeams[i] };
        }
        console.log('Descartado: ', possibleTeams[i])
    }
    throw new Error('Não há seleção disponível para esta batalha');
}

module.exports.possibleTeams = possibleTeams;
module.exports.teamSelection = teamSelection;