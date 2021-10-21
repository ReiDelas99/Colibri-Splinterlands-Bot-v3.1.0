require('dotenv').config()
const puppeteer = require('puppeteer');
const fetch = require("node-fetch");
const chalk = require('chalk');

const splinterlandsPage = require('./splinterlandsPage');
const user = require('./user');
const card = require('./cards');
const helper = require('./helper');
const quests = require('./quests');
const ask = require('./possibleTeams');
const api = require('./api');
const misc = require('./misc');
const version = 0.42;
let resultAll = [];
let captureRateAll = [];
let questRewardAll = [];
let finalRateAll = [];

async function checkForMissingConfigs() {
    if (!process.env.LOGIN_VIA_EMAIL) {
        misc.writeToLogNoUsername("Você esqueceu de configurar o parâmetro LOGIN_VIA_EMAIL");
        await sleep(60000);
    }
    if (!process.env.OCULTAR_NAVEGADOR) {
        misc.writeToLogNoUsername("Você esqueceu de configurar o parâmetro OCULTAR_NAVEGADOR");
        await sleep(60000);
    }
    if (!process.env.MANTER_NAVEGADOR_LOGADO) {
        misc.writeToLogNoUsername("Você esqueceu de configurar o parâmetro MANTER_NAVEGADOR_LOGADO parameter");
        await sleep(60000);
    }
    if (!process.env.COLHER_RECOMPENSA_DIARIA) {
        misc.writeToLogNoUsername("Você esqueceu de configurar o parâmetro COLHER_RECOMPENSA_DIARIA");
        await sleep(60000);
    }
    if (!process.env.LIMITE_ERC_PORCENTO) {
        misc.writeToLogNoUsername("Você esqueceu de configurar o parâmetro LIMITE_ERC_PORCENTO");
        await sleep(60000);
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function closePopups(page) {
    if (await clickOnElement(page, '.close', 4000))
        return;
    await clickOnElement(page, '.modal-close-new', 1000);
}

async function waitUntilLoaded(page) {
    try {
        await page.waitForSelector('.loading', {
            timeout: 6000
        })
        .then(() => {
            misc.writeToLog('Aguardando o carregamento do jogo');
        });
    } catch (e) {
        misc.writeToLog('Sem carregamentos em círculos')
        return;
    }

    await page.waitForFunction(() => !document.querySelector('.loading'), {
        timeout: 120000
    });
}

async function clickMenuFightButton(page) {
    try {
        await page.waitForSelector('#menu_item_battle', {
            timeout: 6000
        })
        .then(button => button.click());
    } catch (e) {
        misc.writeToLog('Botão de batalha não encontrado')
    }

}

async function getCards() {
    const myCards = await user.getPlayerCards(process.env.USUARIO, new Date(Date.now() - 86400000))
        return myCards;
}

async function getQuest() {
    return quests.getPlayerQuest(process.env.USUARIO.split('@')[0])
    .then(x => x)
    .catch(e => misc.writeToLog('Sem dados de busca / API do Splinterlands não responde ou você está usando incorretamente o e-mail e a senha em vez do nome de usuário e Posting Key'))
}

async function createBrowsers(count, headless) {
    let browsers = [];
    for (let i = 0; i < count; i++) {
        const browser = await puppeteer.launch({
                headless: headless,
                args: process.env.CHROME_NO_SANDBOX === 'true' ? ["--no-sandbox"] : ['--disable-web-security',
                    '--disable-features=IsolateOrigins',
                    ' --disable-site-isolation-trials'],
            });
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(500000);
        await page.on('dialog', async dialog => {
            await dialog.accept();
        });

        browsers[i] = browser;
    }

    return browsers;
}

async function getElementText(page, selector, timeout = 20000) {
    const element = await page.waitForSelector(selector, {
            timeout: timeout
        });
    const text = await element.evaluate(el => el.textContent);
    return text;
}

async function getElementTextByXpath(page, selector, timeout = 20000) {
    const element = await page.waitForXPath(selector, {
            timeout: timeout
        });
    const text = await element.evaluate(el => el.textContent);
    return text;
}

async function clickOnElement(page, selector, timeout = 20000, delayBeforeClicking = 0) {
    try {
        const elem = await page.waitForSelector(selector, {
                timeout: timeout
            });
        if (elem) {
            await sleep(delayBeforeClicking);
            misc.writeToLog('Clicando no elemento ' + selector);
            await elem.click();
            return true;
        }
    } catch (e) {}
    misc.writeToLog('Não foi possível encontrar o elemento  ' + selector);
    return false;
}

async function selectCorrectBattleType(page) {
    try {
        await page.waitForSelector("#battle_category_type", {
            timeout: 20000
        })
        let battleType = (await page.$eval('#battle_category_type', el => el.innerText)).trim();
        while (battleType !== "RANKED") {
            misc.writeToLog("O tipo de batalha está errado / " + battleType + " - Tentando alterar para o correto");
            try {
                await page.waitForSelector('#right_slider_btn', {
                    timeout: 500
                })
                .then(button => button.click());
            } catch (e) {
                misc.writeToLog('Botão de troca não encontrado ', e)
            }
            await page.waitForTimeout(1000);
            battleType = (await page.$eval('#battle_category_type', el => el.innerText)).trim();
        }
    } catch (error) {
        misc.writeToLog("Não foi possível alterar o tipo de batalha ", error);
    }
}

async function startBotPlayMatch(page, myCards, quest, claimQuestReward, prioritizeQuest, useAPI) {

    const ercThreshold = process.env.LIMITE_ERC_PORCENTO;

    if (myCards) {
        misc.writeToLog('Cartas disponíveis para batalha: ' + myCards.length)
    } else {
        misc.writeToLog('Jogando somente com cartas básicas')
    }
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
    await page.setViewport({
        width: 1800,
        height: 1500,
        deviceScaleFactor: 1,
    });

    await page.goto('https://splinterlands.com/?p=battle_history');
    await page.waitForTimeout(4000);

    let username = await getElementText(page, '.dropdown-toggle .bio__name__display', 10000);

    if (username == process.env.USUARIO) {
        misc.writeToLog('Você já está logado');
    } else {
        misc.writeToLog('Realizando login')
        await splinterlandsPage.login(page).catch(e => {
            misc.writeToLog(e);
            throw new Error('Não foi possível realizar login');
        });
    }
    await waitUntilLoaded(page);
    const erc = parseInt((await getElementTextByXpath(page, "//div[@class='dec-options'][1]/div[@class='value'][2]/div", 100)).split('.')[0]);
    if (erc >= 50) {
        misc.writeToLog('Taxa de Captura de Energia (ERC): ' + chalk.green(erc + "%"));
        captureRateAll.push(process.env.USUARIO + chalk.green(' ERC: ' + erc + "%"));
    } else {
        misc.writeToLog('Taxa de Captura de Energia (ERC): ' + chalk.red(erc + "%"));
        captureRateAll.push(process.env.USUARIO + chalk.red(' ERC: ' + erc + "%"));
    }

    if (erc < ercThreshold) {
        misc.writeToLog('O limite de ERC configurado foi atingido: ' + ercThreshold + '% - Ignorando esta conta');
        return;
    }
    await page.waitForTimeout(1000);
    await closePopups(page);
    await page.waitForTimeout(2000);
    if (!page.url().includes("battle_history")) {
        await clickMenuFightButton(page);
        await page.waitForTimeout(3000);
    }

        if (process.env.COLHER_RECOMPENSA_TEMPORADA === 'true') {
        try {
            misc.writeToLog('Verificação de recompensa da temporada: ');
            await page.waitForSelector('#claim-btn', {
                visible: true,
                timeout: 3000
            })
            .then(async(button) => {
                button.click();
                misc.writeToLog(`Colhendo a recompensa da temporada. Você pode verificá-las depois aqui https://peakmonsters.com/@${process.env.USUARIO}/explorer`);
                await page.waitForTimeout(20000);
            })
            .catch(() => misc.writeToLog('Nenhuma recompensa da temporada a ser colhida, mas você ainda pode verificar suas informações aqui https://peakmonsters.com/@${process.env.USUARIO}/explorer'));
        } catch (e) {
            misc.writeToLog('Nenhuma recompensa da temporada a ser colhida');
        }
    }
    let curRating = await getElementText(page, 'span.number_text', 2000);
    await misc.writeToLog('Sua pontuação atual é ' + chalk.yellow(curRating));

    misc.writeToLog('Detalhes da missão diária: ' + chalk.yellow(JSON.stringify(quest)));
    try {
        const claimButton = await page.waitForSelector('#quest_claim_btn', {
                timeout: 2500,
                visible: true
            });
        if (claimButton) {
            misc.writeToLog(chalk.green('A recompensa da missão diária pode ser colhida'));
            questRewardAll.push(process.env.USUARIO + " Missão: " + chalk.yellow(Object.values(quest)[3].toString() + "/" + Object.values(quest)[2].toString()) + chalk.yellow(' A recompensa da missão diária pode ser colhida'))
            if (claimQuestReward) {
                await claimButton.click();
                await page.waitForTimeout(60000);
                await page.reload();
                await page.waitForTimeout(10000);
            }
        }
    } catch (e) {
        misc.writeToLog('Nenhuma recompensa de missão a ser colhida / Aguardando batalha')
        questRewardAll.push(process.env.USUARIO + " Missão: " + chalk.yellow(Object.values(quest)[3].toString() + "/" + Object.values(quest)[2].toString()) + chalk.red(' Sem recompensa de missão'));
    }

    if (!page.url().includes("battle_history")) {
        misc.writeToLog("Aparentemente, o botão de batalha no menu não foi clicado corretamente / tente novamente");
        misc.writeToLog('Clicando no menu de batalha novamente');
        await clickMenuFightButton(page);
        await page.waitForTimeout(5000);
    }

    try {
        misc.writeToLog('Aguardando o botão de batalha')
        await selectCorrectBattleType(page);

        await page.waitForXPath("//button[contains(., 'BATTLE')]", {
            timeout: 3000
        })
        .then(button => {
            misc.writeToLog('Botão de batalha clicado');
            button.click()
        })
        .catch(e => misc.writeErrorToLog('Aguardando o botão de batalha. Splinterlands está em manutenção?'));
        await page.waitForTimeout(5000);

        misc.writeToLog('Aguardando por um openente digno...')
        await page.waitForSelector('.btn--create-team', {
            timeout: 25000
        })
        .then(() => misc.writeToLog('Iniciando a batalha'))
        .catch(async(e) => {
            misc.writeErrorToLog('Erro enquanto aguardava a batalha');
            misc.writeToLog('Clicando no botão de luta novamente');
            await clickMenuFightButton(page);
            misc.writeToLog('Clicando no botão de batalha novamente');
            await page.waitForXPath("//button[contains(., 'BATTLE')]", {
                timeout: 3000
            })
            .then(button => {
                misc.writeToLog('Botão de batalha clicado');
                button.click()
            })
            .catch(e => misc.writeErrorToLog('Aguardando o botão de batalha. Splinterlands está em manutenção?'));

            misc.writeErrorToLog('Atualizando a página e tentando recuperar a batalha');
            await page.waitForTimeout(5000);
            await page.reload();
            await page.waitForTimeout(5000);
            await page.waitForSelector('.btn--create-team', {
                timeout: 50000
            })
            .then(() => misc.writeToLog('Iniciando a batalha'))
            .catch(async() => {
                misc.writeToLog('Falha na segunda tentativa de recarregar da página inicial');
                await page.goto('https://splinterlands.io/');
                await page.waitForTimeout(5000);
                await page.waitForXPath("//button[contains(., 'BATTLE')]", {
                    timeout: 20000
                })
                .then(button => button.click())
                .catch(e => misc.writeErrorToLog('Aguardando o botão de batalha pela segunda vez'));
                await page.waitForTimeout(5000);
                await page.waitForSelector('.btn--create-team', {
                    timeout: 25000
                })
                .then(() => misc.writeToLog('Iniciando a batalha'))
                .catch((e) => {
                    misc.writeToLog('Falha na terceira tentativa');
                    throw new Error(e);
                })
            })
        })
    } catch (e) {
        misc.writeErrorToLog('A batalha não pôde ser iniciada:', e)
        throw new Error('A batalha não pôde ser iniciada');

    }
    await page.waitForTimeout(10000);
    let[mana, rules, splinters] = await Promise.all([
                splinterlandsPage.checkMatchMana(page).then((mana) => mana).catch(() => 'no mana'),
                splinterlandsPage.checkMatchRules(page).then((rulesArray) => rulesArray).catch(() => 'no rules'),
                splinterlandsPage.checkMatchActiveSplinters(page).then((splinters) => splinters).catch(() => 'no splinters')
            ]);

    const matchDetails = {
        mana: mana,
        rules: rules,
        splinters: splinters,
        myCards: myCards,
        quest: (prioritizeQuest && quest && (quest.total != quest.completed)) ? quest : '',
    }

    await page.waitForTimeout(1000);
    
    let teamToPlay;
    misc.writeToLog(chalk.green('Iniciando a seleção de cartas'));
    if (useAPI) {
        const apiResponse = await api.getPossibleTeams(matchDetails);
        if (apiResponse && !JSON.stringify(apiResponse).includes('A API Colibri está sendo atualizada')) {
            misc.writeToLog(chalk.magenta('Calculando melhores combinações'));

            teamToPlay = {
                summoner: Object.values(apiResponse)[1],
                cards: [Object.values(apiResponse)[1], Object.values(apiResponse)[3], Object.values(apiResponse)[5], Object.values(apiResponse)[7], Object.values(apiResponse)[9],
                    Object.values(apiResponse)[11], Object.values(apiResponse)[13], Object.values(apiResponse)[15]]
            };

            misc.writeToLog(chalk.cyan('Cartas escolhidas pela API Colibri: ' + JSON.stringify(teamToPlay)));
            
            if (Object.values(apiResponse)[1] == '') {
                misc.writeToLog('API Colibri ainda não encontrou nenhuma equipe possível - Analisando oponente');
                const possibleTeams = await ask.possibleTeams(matchDetails).catch(e => misc.writeToLog('Nova possibilidade encontrada pela API Colibri: ', e));
                teamToPlay = await ask.teamSelection(possibleTeams, matchDetails, quest);
            }
        } else {
            if (apiResponse && JSON.stringify(apiResponse).includes('A API Colibri está sendo atualizada')) {
                misc.writeToLog('Aprimoramento de escolhas realizado com sucesso');
            } else {
                misc.writeToLog('Realizando download das melhores táticas de batalha');
            }
            const possibleTeams = await ask.possibleTeams(matchDetails).catch(e => misc.writeToLog('Dúvida sobre possível escolha da API Colibri: ', e));

            if (possibleTeams && possibleTeams.length) {
                misc.writeToLog('Possíveis escolhas baseadas em suas cartas disponíveis para batalha: ' + possibleTeams.length);
            } else {
                misc.writeToLog('Dúvida: ', JSON.stringify(matchDetails), JSON.stringify(possibleTeams))
                throw new Error('2 possibilidades de escolha de cartas disponíveis');
            }
            teamToPlay = await ask.teamSelection(possibleTeams, matchDetails, quest);
            useAPI = false;
        }
    } else {
        const possibleTeams = await ask.possibleTeams(matchDetails).catch(e => misc.writeToLog('Dúvida sobre possível escolha da API Colibri: ', e));

        if (possibleTeams && possibleTeams.length) {
            misc.writeToLog('Possíveis escolhas baseadas em suas cartas disponíveis para batalha: ', possibleTeams.length);
        } else {
            misc.writeToLog('Dúvida: ', JSON.stringify(matchDetails), JSON.stringify(possibleTeams))
            throw new Error('2 possibilidades de escolha de cartas disponíveis');
        }
        teamToPlay = await ask.teamSelection(possibleTeams, matchDetails, quest);
        useAPI = false;
    }

    if (teamToPlay) {
        page.click('.btn--create-team')[0];
    } else {
        throw new Error('Team Selection error');
    }
    await page.waitForTimeout(5000);
    try {
        await page.waitForXPath(`//div[@card_detail_id="${teamToPlay.summoner}"]`, {
            timeout: 15000
        }).then(summonerButton => summonerButton.click());
        if (card.color(teamToPlay.cards[0]) === 'Gold') {
            misc.writeToLog('Dragon foi combinado à ' + helper.teamActualSplinterToPlay(teamToPlay.cards.slice(0, 6)))
            await page.waitForXPath(`//div[@data-original-title="${helper.teamActualSplinterToPlay(teamToPlay.cards.slice(0, 6))}"]`, {
                timeout: 8000
            })
            .then(selector => selector.click())
        }
        await page.waitForTimeout(5000);
        for (i = 1; i <= 6; i++) {
            misc.writeToLog('Carta escolhida: ' + teamToPlay.cards[i].toString())
            await teamToPlay.cards[i] ? page.waitForXPath(`//div[@card_detail_id="${teamToPlay.cards[i].toString()}"]`, {
                timeout: 10000
            })
            .then(selector => selector.click()) : misc.writeToLog('Slot vazio ' + i);
            await page.waitForTimeout(1000);
        }

        await page.waitForTimeout(5000);
        try {
            await page.click('.btn-green')[0];
        } catch {
            misc.writeToLog('Não foi possível iniciar a luta, aguardando 5 segundos para tentar novamente');
            await page.waitForTimeout(5000);
            await page.click('.btn-green')[0];
        }
        await page.waitForTimeout(5000);
        await page.waitForSelector('#btnRumble', {
            timeout: 160000
        }).then(() => misc.writeToLog('Botão Rumble visível')).catch(() => misc.writeToLog('Botão Rumble indisponível'));
        await page.waitForTimeout(5000);
        await page.$eval('#btnRumble', elem => elem.click()).then(() => misc.writeToLog('Botão Rumble clicado')).catch(() => misc.writeToLog('Não foi possível clicar no botão Rumble'));
        await page.waitForSelector('#btnSkip', {
            timeout: 10000
        }).then(() => misc.writeToLog('Botão Skip visível')).catch(() => misc.writeToLog('botão Skip indisponível'));
        await page.$eval('#btnSkip', elem => elem.click()).then(() => misc.writeToLog('Botão Skip clicado')).catch(() => misc.writeToLog('Não foi possível clicar no botão Skip'));
        try {
            const winner = await getElementText(page, 'section.player.winner .bio__name__display', 15000);
            if (winner.trim() == process.env.USUARIO.trim()) {
                const decWon = await getElementText(page, '.player.winner span.dec-reward span', 100);
                resultAll.push(process.env.USUARIO + chalk.green(' Vitória ;) / Recompensa: ' + decWon + ' DEC'));
            } else {
                resultAll.push(process.env.USUARIO + chalk.red(' Derrota :('));
                if (useAPI) {
                    api.reportLoss(winner);
                }
            }
        } catch (e) {
            misc.writeToLog(e);
            misc.writeToLog(chalk.blueBright('Ganhardor não confirmado / Empate?'));
            resultAll.push(process.env.USUARIO + chalk.blueBright('Ganhador não confirmado / Empate?'));
        }
        await clickOnElement(page, '.btn--done', 1000, 2500);

        try {
            let curRating = await getElementText(page, 'span.number_text', 2000);
            misc.writeToLog('Pontuação atualizada depois da batalha: ' + chalk.yellow(curRating));
            finalRateAll.push(process.env.USUARIO + (' Nova pontuação: ' + chalk.yellow(curRating)));
        } catch (e) {
            misc.writeToLog(e);
            misc.writeToLog(chalk.blueBright('Impossível verificar nova pontuação'));
            finalRateAll.push(process.env.USUARIO + chalk.red(' Impossível verificar nova pontuação'));
        }

    } catch (e) {
        throw new Error(e);
    }

}

const sleepingTimeInMinutes = process.env.MINUTOS_INTERVALO_BATALHA || 30;
const sleepingTime = sleepingTimeInMinutes * 60000;

(async() => {
    try {
        await checkForMissingConfigs();
        const loginViaEmail = JSON.parse(process.env.LOGIN_VIA_EMAIL.toLowerCase());
        const accountusers = process.env.USUARIO.split(',');
        const accounts = loginViaEmail ? process.env.EMAIL.split(',') : accountusers;
        const passwords = process.env.SENHA_OU_POSTINGKEY.split(',');
        const headless = JSON.parse(process.env.OCULTAR_NAVEGADOR.toLowerCase());
        const useAPI = JSON.parse(process.env.USAR_API_COLIBRI.toLowerCase());
        const keepBrowserOpen = JSON.parse(process.env.MANTER_NAVEGADOR_LOGADO.toLowerCase());
        const claimQuestReward = JSON.parse(process.env.COLHER_RECOMPENSA_DIARIA.toLowerCase());
        const prioritizeQuest = JSON.parse(process.env.JOGAR_MISSAO_DIARIA.toLowerCase());

        let browsers = [];
        misc.writeToLogNoUsername('Ocultar navegador: ' + headless);
        misc.writeToLogNoUsername('Manter navegador logado: ' + keepBrowserOpen);
        misc.writeToLogNoUsername('Login via e-mail: ' + loginViaEmail);
        misc.writeToLogNoUsername('Colher recompensas diárias: ' + claimQuestReward);
        misc.writeToLogNoUsername('Completar missões diárias: ' + prioritizeQuest);
        misc.writeToLogNoUsername('Usar API Colibri: ' + useAPI);
        misc.writeToLogNoUsername(chalk.yellow(accounts.length) + ' contas carregadas')
        misc.writeToLogNoUsername('Contas identificadas: ' + chalk.greenBright(accounts))

        while (true) {
            for (let i = 0; i < accounts.length; i++) {
                process.env['EMAIL'] = accounts[i];
                process.env['SENHA_OU_POSTINGKEY'] = passwords[i];
                process.env['USUARIO'] = accountusers[i];

                if (keepBrowserOpen && browsers.length == 0) {
                    misc.writeToLog('Opening browsers');
                    browsers = await createBrowsers(accounts.length, headless);
                } else if (!keepBrowserOpen && browsers.length == 0) {
                    misc.writeToLog('Opening browser');
                    browsers = await createBrowsers(1, headless);
                }

                const page = (await(keepBrowserOpen ? browsers[i] : browsers[0]).pages())[1];

                misc.writeToLog('Calculando melhores possíbilidades com baseado em suas cartas disponíveis')
                const myCards = await getCards()
                    .then((x) => {
                        misc.writeToLog('Combinações calculadas');
                        return x
                    })
                    .catch(() => misc.writeToLog('A API do Splinterlands não respondeu / Você usou nome de usuário? / Evite o uso de e-mail para login'));
                misc.writeToLog('Obtendo informações sobre as suas missões diárias');
                const quest = await getQuest();
                if (!quest) {
                    misc.writeToLog('Erro ao buscar os detalhes da missão / A API do Splinterlands está em manutenção ou você usou um nome de usuário incorreto');
                }
                await startBotPlayMatch(page, myCards, quest, claimQuestReward, prioritizeQuest, useAPI)
                .then(() => {
                    misc.writeToLog('Finalizando batalha');
                })
                .catch((e) => {
                    misc.writeToLog(e)
                })

                await page.waitForTimeout(5000);
                if (keepBrowserOpen) {
                    await page.goto('about:blank');
                } else {
                    await page.evaluate(function () {
                        SM.Logout();
                    });
                }
            }

            console.log('--------------------- Resumo dos resultados das batalhas: ---------------------');
            for (let i = 0; i < resultAll.length; i++) {
                console.log(resultAll[i]);
            }
            for (let i = 0; i < finalRateAll.length; i++) {
                console.log(finalRateAll[i]);
            }
            for (let i = 0; i < captureRateAll.length; i++) {
                console.log(captureRateAll[i]);
            }
            for (let i = 0; i < questRewardAll.length; i++) {
                console.log(questRewardAll[i]);
            }
            console.log('-------------------------------------------------------------------------------');
            console.log('Aguardando pela próxima batalha em', sleepingTime / 1000 / 60, ' minutos / ', new Date(Date.now() + sleepingTime).toLocaleString());
            console.log(chalk.green('Bot desenvolvido por Luiz Fernando Sousa / Se lhe ajudei considere doar para @colibri.fernando e me ajude à manter este projeto vivo e atualizado'));
            console.log(chalk.green('Entre em contato comigo via Telegram https://t.me/colibri_fernando e faça sugestões, dê feedbacks'));
            console.log('----------------------- Colibri Splinterlands Bot v3.1.0 ----------------------');
            await new Promise(r => setTimeout(r, sleepingTime));
            resultAll = [];
            captureRateAll = [];
            questRewardAll = [];
            finalRateAll = [];
        }
    } catch (e) {
        console.log('Erro na rotina em: ', new Date().toLocaleString(), e)
    }

})();