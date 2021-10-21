
const cardsDetails = require("./data/cardsDetails.json");
const card = require("./cards")

const validDecks = ['Red', 'Blue', 'White', 'Black', 'Green']
const colorToDeck = { 'Red': 'Fire', 'Blue': 'Water', 'White': 'Life', 'Black': 'Death', 'Green': 'Earth' }

const deckValidColor = (accumulator, currentValue) => validDecks.includes(card.color(currentValue)) ? colorToDeck[card.color(currentValue)] : accumulator;

const teamActualSplinterToPlay = (teamIdsArray) => teamIdsArray.reduce(deckValidColor, '')

module.exports.teamActualSplinterToPlay = teamActualSplinterToPlay;