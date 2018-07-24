const Path = require('path');
const Fs = require('fs');
const BotPath = __dirname;


const cards = [
	'duke',
	'assassin',
	'captain',
	'ambassador',
	'contessa',
];

const actions = [
	'taking-1',
	'foreign-aid',
	'couping',
	'taking-3',
	'assassination',
	'stealing',
	'swapping',
];

const bots = Fs
	.readdirSync(BotPath)
	.filter( file => !file.startsWith('.') )
	.filter( file => Fs.lstatSync( file ).isDirectory() );


module.exports = exports = {
	ALLBOTS: () => bots,
	CARDS: () => cards,
	DECK: () => [].concat(cards, cards, cards),
	ACTIONS: () => actions,
};
