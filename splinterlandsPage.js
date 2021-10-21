const misc = require('./misc');

async function login(page) {
    try {
        page.waitForSelector('#log_in_button > button').then(() => page.click('#log_in_button > button'))
        await page.waitForSelector('#email')
            .then(() => page.waitForTimeout(3000))
            .then(() => page.focus('#email'))
            .then(() => page.type('#email', process.env.EMAIL))
            .then(() => page.focus('#password'))
            .then(() => page.type('#password', process.env.SENHA_OU_POSTINGKEY))

            .then(() => page.keyboard.press('Enter'))
            .then(() => page.waitForTimeout(8000))
            
            .then(async () => {
                await page.waitForSelector('#log_in_text', {
                        visible: true, timeout: 3000
                    })
                    .then(()=>{
                        misc.writeToLog('Sessão iniciada!')
                    })
                    .catch(()=>{
                        misc.writeToLog('Não foi possível realizar login');
                        throw new Error('Não foi possível iniciar a sessão');
                    })
                })
            .then(() => page.waitForTimeout(500))
            
    } catch (e) {
        throw new Error('Verifique se você está usando corretamente o nome de usuário e Posting Key ou E-mail e Senha');
    }
}

async function checkMana(page) {
    var manas = await page.evaluate(() => {
        var manaCap = document.querySelectorAll('div.mana-total > span.mana-cap')[0].innerText;
        var manaUsed = document.querySelectorAll('div.mana-total > span.mana-used')[0].innerText;
        var manaLeft = manaCap - manaUsed
        return { manaCap, manaUsed, manaLeft };
    });
    misc.writeToLog('manaLimit', manas);
    return manas;
}

async function checkMatchMana(page) {
    const mana = await page.$$eval("div.col-md-12 > div.mana-cap__icon", el => el.map(x => x.getAttribute("data-original-title")));
    const manaValue = parseInt(mana[0].split(':')[1], 10);
    misc.writeToLog(manaValue);
    return manaValue;
}

async function checkMatchRules(page) {
    const rules = await page.$$eval("div.combat__rules > div.row > div>  img", el => el.map(x => x.getAttribute("data-original-title")));
    return rules.map(x => x.split(':')[0]).join('|')
}

async function checkMatchActiveSplinters(page) {
    const splinterUrls = await page.$$eval("div.col-sm-4 > img", el => el.map(x => x.getAttribute("src")));
    return splinterUrls.map(splinter => splinterIsActive(splinter)).filter(x => x);
}

const splinterIsActive = (splinterUrl) => {
    const splinter = splinterUrl.split('/').slice(-1)[0].replace('.svg', '').replace('icon_splinter_', '');
    return splinter.indexOf('inactive') === -1 ? splinter : '';
}

exports.login = login;
exports.checkMana = checkMana;
exports.checkMatchMana = checkMatchMana;
exports.checkMatchRules = checkMatchRules;
exports.checkMatchActiveSplinters = checkMatchActiveSplinters;
exports.splinterIsActive = splinterIsActive;