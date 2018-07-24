// making clones so the bots don't break them
const constantFns = require('./constants.js');
const ALLBOTS = constantFns.ALLBOTS();

const COUP = require('./Coup.js');
const LOOP = require('./Loop.js');


const GetRounds = () => {
	const rIdx = process.argv.indexOf('-r');
	if( rIdx > 0 && process.argv.length > rIdx && Number.parseInt( process.argv[rIdx + 1] ) > 0 ) {
		return Number.parseInt( process.argv[rIdx + 1] );
	}
}


if( process.argv.includes('play') ) {
	new COUP().Play(ALLBOTS);
}

if( process.argv.includes('loop') ) {
	const rounds = GetRounds();
	const debug = process.argv.includes('-d');

	const loop = new LOOP(debug, rounds, ALLBOTS);
	loop.Run();
}
