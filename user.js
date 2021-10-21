const fetch = require("node-fetch");
const basicCards = require('./data/basicCards'); 

getPlayerCards = (username, oneDayAgo) => (fetch(`https://game-api.splinterlands.io/cards/collection/${username}`,
  { "credentials": "omit", "headers": { "accept": "application/json, text/javascript, */*; q=0.01" }, "referrer": `https://splinterlands.com/?p=collection&a=${username}`, "referrerPolicy": "no-referrer-when-downgrade", "body": null, "method": "GET", "mode": "cors" })
  .then(x => x && x.json())
  .then(x => x['cards'] ? x['cards'].filter(x=>(x.delegated_to === null || x.delegated_to === username)
  && (x.market_listing_type === null || x.delegated_to === username)
  && (!(x.last_used_player !== username && Date.parse(x.last_used_date) > oneDayAgo))).map(card => card.card_detail_id) : '')
  .then(advanced => basicCards.concat(advanced))
   .catch(e=> {
    console.log('Error: game-api.splinterlands did not respond trying api.slinterlands... ');
    fetch(`https://api.splinterlands.io/cards/collection/${username}`,
      { "credentials": "omit", "headers": { "accept": "application/json, text/javascript, */*; q=0.01" }, "referrer": `https://splinterlands.com/?p=collection&a=${username}`, "referrerPolicy": "no-referrer-when-downgrade", "body": null, "method": "GET", "mode": "cors" })
      .then(x => x && x.json())
      .then(x => x['cards'] ? x['cards'].filter(x=>(x.delegated_to === null || x.delegated_to === username) 
	  && (x.market_listing_type === null || x.delegated_to === username)
	  && (!(x.last_used_player !== username && Date.parse(x.last_used_date) > oneDayAgo))).map(card => card.card_detail_id) : '')
      .then(advanced => basicCards.concat(advanced))
      .catch(e => {
        console.log('Usando somente cartas bássicas / Houve um erro ao obter informações sobre a sua coleção: ',e); 
        return basicCards
      })
  })
)

module.exports.getPlayerCards = getPlayerCards;