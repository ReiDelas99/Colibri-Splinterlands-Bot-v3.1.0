const cardsDetails = require("./data/cardsDetails.json");

const makeCardId = (id) => id;

const color = (id) => {
	 const card = cardsDetails.find(o => parseInt(o.id) === parseInt(id));
    const color = card && card.color ? card.color : '';
    return color;
}

exports.makeCardId = makeCardId;
exports.color = color;