'use strict';

const puppeteer = require('puppeteer');

async function login(page) {
    try {
        
        page.waitForSelector('#log_in_button > button').then(() => page.click('#log_in_button > button'))
        await page.waitForSelector('#account')
            .then(() => page.waitForTimeout(1000))
            .then(() => page.focus('#account'))
            .then(() => page.type('#account', process.env.EMAIL.split('@')[0], {delay: 100}))
            .then(() => page.focus('#key'))
            .then(() => page.type('#key', process.env.SENHA_OU_POSTINGKEY, {delay: 100}))
            .then(() => page.click('#btn_login'))
            .then(() => page.waitForTimeout(2000)
            .then(() => page.waitForSelector('.modal-close-new')))
            .then(() => page.click('.modal-close-new'))
    } catch (e) {
        console.log(e);
    }
}

async function checkMana(page) {
    var manas = await page.evaluate(() => {
        var manaCap = document.querySelectorAll('div.mana-total > span.mana-cap')[0].innerText;
        var manaUsed = document.querySelectorAll('div.mana-total > span.mana-used')[0].innerText;
        var manaLeft = manaCap - manaUsed
        return {manaCap, manaUsed, manaLeft};
      });
    console.log('manaLimit',manas);
    return manas;
}


async function openSplinter() {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.setViewport({
        width: 1500,
        height: 800,
        deviceScaleFactor: 1,
      });

    await page.goto('https://splinterlands.io/?p=battle_history');
    await page.waitForTimeout(2000);
    await login(page)
    await page.waitForTimeout(2000);
    const [button] = await page.$x("//button[contains(., 'BATTLE LOG')]");
    button ? await button.click() : null;

    var battlesList = await pdocument.querySelectorAll('.history-table > table > tbody > tr');

    battlesList.forEach(x=>console.log(x.querySelector('td:nth-child(8) > img').getAttribute('data-original-title')))
    
      console.log('Battles',battlesList);

  }
  
  openSplinter();