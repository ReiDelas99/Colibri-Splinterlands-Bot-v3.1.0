const fetch = require('node-fetch');
const fs = require('fs');

async function tempLog(log) {
	fs.appendFile('log.txt', log + '\n', function (err) {
	});
}

async function getPossibleTeams(matchDetails) {
	try {
		const response = await fetch('http://splinterlandsapi.pcjones.de:8080/' + 'get_team/', {
			method: 'post',
			body: JSON.stringify(matchDetails),
			headers: {'Content-Type': 'application/json'}
		});
		
		var dataRaw = await response.text();
		
		if (process.env.DEBUG === 'true') {
			tempLog('--------------------------------------------------------');
			tempLog(JSON.stringify(matchDetails));	
			tempLog('response:');
			tempLog(dataRaw);
			tempLog('--------------------------------------------------------');
		}
		
		const data = JSON.parse(dataRaw);
		
		return data;
	} catch(e) {
        console.log('Erro de API', e);
    }
	
	return false;
}

async function reportLoss(username) {
	fetch('http://splinterlandsapi.pcjones.de:8080/' + 'report_loss/' + username + "/" + process.env.USUARIO.split('@')[0]);
}

exports.getPossibleTeams = getPossibleTeams;
exports.reportLoss = reportLoss;