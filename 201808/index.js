'use strict';

const { Style } = require('./helper.js');
const Fs = require('fs');

// making clones so the bots don't break them
const constantFns = require('./constants.js');

const ALLBOTS = constantFns.ALLBOTS();
const CARDS = constantFns.CARDS();
const DECK = constantFns.DECK();
const ACTIONS = constantFns.ACTIONS();


class COUP {
	constructor() {
		this.HISTORY = [];
		this.DISCARDPILE = [];
		this.BOTS = {};
		this.PLAYERSTATE = {};
		this.GAMEDECK = [].concat(DECK);
		this.TURN = 0;
		this.ROUNDS = 0;
		this.PLAYERNAMES = [];
	}

	Play( availablePlayers ) {
		console.log(
			`\n\n` +
			`   ██████${Style.yellow('╗')}  ██████${Style.yellow('╗')}  ██${Style.yellow('╗')}   ██${Style.yellow('╗')} ██████${Style.yellow('╗')}\n` +
			`  ██${Style.yellow('╔════╝')} ██${Style.yellow('╔═══')}██${Style.yellow('╗')} ██${Style.yellow('║')}   ██${Style.yellow('║')} ██${Style.yellow('╔══')}██${Style.yellow('╗')}\n` +
			`  ██${Style.yellow('║')}      ██${Style.yellow('║')}   ██${Style.yellow('║')} ██${Style.yellow('║')}   ██${Style.yellow('║')} ██████${Style.yellow('╔╝')}\n` +
			`  ██${Style.yellow('║')}      ██${Style.yellow('║')}   ██${Style.yellow('║')} ██${Style.yellow('║')}   ██${Style.yellow('║')} ██${Style.yellow('╔═══╝')}\n` +
			`  ${Style.yellow('╚')}██████${Style.yellow('╗')} ${Style.yellow('╚')}██████${Style.yellow('╔╝')} ${Style.yellow('╚')}██████${Style.yellow('╔╝')} ██${Style.yellow('║')}\n` +
			`   ${Style.yellow('╚═════╝  ╚═════╝   ╚═════╝  ╚═╝')} v0.0.1\n` +
			`\n`
		);

		// Select up to 6 random players from the pool provided
		const selectedPlayers = availablePlayers.filter( item => item !== undefined )
			.map( item => [ Math.random(), item ] )
			.sort( ( a, b ) => a[ 0 ] - b[ 0 ] )
			.map( item => item[ 1 ] )
			.slice( 0, 6 );

		if( selectedPlayers.length < 2 ) {
			console.error(`\n🛑  We need at least two player to play this game!\n`);
			process.exit(1);
		}

		this.PLAYERNAMES = selectedPlayers;

		this.MakeBots();
		this.MakePlayers();
		this.HandOutCards();
		this.ElectStarter();

		// this is the game loop
		return this.Turn();
	}

	MakeBots() {
		console.log('in COUP original MakeBots() function');

		this.PLAYERNAMES.forEach( player => {
			let BotClass;
			let bot;

			try {
				BotClass = require(`./${ player }/index.js`);
				bot = new BotClass();
			}
			catch( error ) {
				console.error(`Error instantiating bot '${ player }'`);
				throw error;
			}

			const requiredMethods = ['OnTurn', 'OnChallengeActionRound', 'OnCounterAction', 'OnCounterActionRound', 'OnSwappingCards', 'OnCardLoss'];
			const missing = requiredMethods.filter( method => typeof bot[method] === 'undefined' );
			if(missing.length > 0) {
				throw new Error(`🚨  ${ Style.red('The bot ') }${ Style.yellow( player ) }${ Style.red(` is missing ${ missing.length > 1 ? 'methods' : 'a method' }: `) }${ Style.yellow( missing.join(', ') ) }!\n`);
			}

			this.BOTS[ player ] = bot;
		});
	}


	MakePlayers() {
		this.PLAYERNAMES.forEach( player => {
			this.PLAYERSTATE[ player ] = {
				card1: undefined,
				card2: undefined,
				coins: 0,
			};
		});
	}

	ShuffleCards() {
		this.GAMEDECK = this.GAMEDECK
			.filter( item => item !== undefined )
			.map( item => [ Math.random(), item ] )
			.sort( ( a, b ) => a[ 0 ] - b[ 0 ] )
			.map( item => item[ 1 ] );
	}

	HandOutCards() {
		this.ShuffleCards();
		this.PLAYERNAMES.forEach( player => {
			this.PLAYERSTATE[ player ].card1 = this.GAMEDECK.pop();
			this.PLAYERSTATE[ player ].card2 = this.GAMEDECK.pop();
		});
	}

	GetCardFromDeck() {
		const newCard = this.GAMEDECK.pop();

		if( !newCard && this.GAMEDECK.length > 0 ) {
			return this.GetCardFromDeck();
		}
		else {
			return newCard;
		}
	}


	ExchangeCard( card ) {
		this.GAMEDECK.push( card );
		this.ShuffleCards();

		return this.GetCardFromDeck();
	}


	SwapCards({ chosenCards = [], newCards, player }) {
		let oldCards = [];
		if( this.PLAYERSTATE[ player ].card1 ) oldCards.push( this.PLAYERSTATE[ player ].card1 );
		if( this.PLAYERSTATE[ player ].card2 ) oldCards.push( this.PLAYERSTATE[ player ].card2 );

		let allCards = oldCards.slice( 0 );
		if( newCards[ 0 ] ) allCards.push( newCards[ 0 ] );
		if( newCards[ 1 ] ) allCards.push( newCards[ 1 ] );

		chosenCards = chosenCards
			.filter( card => allCards.includes( card ) )
			.slice( 0, oldCards.length );

		this.PLAYERSTATE[ player ].card1 = chosenCards[ 0 ];
		this.PLAYERSTATE[ player ].card2 = chosenCards[ 1 ];

		allCards
			.filter( card => {
				if( card && card === chosenCards[ 0 ] ) {
					chosenCards[ 0 ] = undefined;
					return false;
				}
				if( card && card === chosenCards[ 1 ] ) {
					chosenCards[ 1 ] = undefined;
					return false;
				}
				return true;
			})
			.map( card => this.GAMEDECK.push( card ) );
	}


	StillAlive( player ) {
		let cards = 0;
		if( this.PLAYERSTATE[ player ].card1 ) cards ++;
		if( this.PLAYERSTATE[ player ].card2 ) cards ++;

		return cards > 0;
	}


	ElectStarter() {
		this.TURN = Math.floor( Math.random() * this.PLAYERNAMES.length );
	}


	GetWhosNext() {
		this.TURN ++;

		if( this.TURN > this.PLAYERNAMES.length - 1 ) {
			this.TURN = 0;
		}

		if( this.PLAYERSTATE[ this.PLAYERNAMES[ this.TURN ] ].card1 || this.PLAYERSTATE[ this.PLAYERNAMES[ this.TURN ] ].card2 ) {
			return this.TURN;
		}
		else {
			return this.GetWhosNext();
		}
	}


	WhoIsLeft() {
		return this.PLAYERNAMES.filter( player => this.PLAYERSTATE[ player ].card1 || this.PLAYERSTATE[ player ].card2 );
	}


	GetPlayerObjects( players, filter = '' ) {
		return players
			.filter( user => user !== filter )
			.map( player => {
				let cards = 0;
				if( this.PLAYERSTATE[ player ].card1 ) cards ++;
				if( this.PLAYERSTATE[ player ].card2 ) cards ++;

				return {
					name: player,
					coins: this.PLAYERSTATE[ player ].coins,
					cards,
				};
			});
	}


	GetGameState( player ) {
		return {
			history: this.HISTORY.slice( 0 ),
			myCards: this.GetPlayerCards( player ),
			myCoins: this.PLAYERSTATE[ player ].coins,
			otherPlayers: this.GetPlayerObjects( this.WhoIsLeft(), player ),
			discardedCards: this.DISCARDPILE.slice( 0 ),
		}
	}


	Wait( time ) {
		return new Promise( resolve => setTimeout( resolve, time ) );
	}


	GetAvatar( player ) {
		if( !player ) {
			return player;
		}
		else if( !this.PLAYERNAMES.includes( player ) ) {
			return `[${ Style.yellow(`${ player }`)} -not found-]`;
		}
		else {
			return Style.yellow(`[${ player } `) +
				// `${ this.PLAYERSTATE[ player ].card1 ? `${ Style.red( this.PLAYERSTATE[ player ].card1.substring( 0, 2 ) ) } ` : '' }` +
				// `${ this.PLAYERSTATE[ player ].card2 ? `${ Style.red( this.PLAYERSTATE[ player ].card2.substring( 0, 2 ) ) } ` : '' }` +
				`${ this.PLAYERSTATE[ player ].card1 ? Style.red('♥') : '' }` +
				`${ this.PLAYERSTATE[ player ].card2 ? Style.red('♥') : '' }` +
				` ${ Style.yellow(`💰 ${ this.PLAYERSTATE[ player ].coins }]`) }`;
		}
	}


	GetPlayerCards( player ) {
		const myCards = [];
		if( this.PLAYERSTATE[ player ].card1 ) myCards.push( this.PLAYERSTATE[ player ].card1 );
		if( this.PLAYERSTATE[ player ].card2 ) myCards.push( this.PLAYERSTATE[ player ].card2 );
		return myCards;
	}


	LosePlayerCard( player, card ) {
		let lost = '';

		if( this.PLAYERSTATE[ player ].card1 === card ) {
			lost = this.PLAYERSTATE[ player ].card1;
			this.PLAYERSTATE[ player ].card1 = undefined;
		}
		else if( this.PLAYERSTATE[ player ].card2 === card ) {
			lost = this.PLAYERSTATE[ player ].card2;
			this.PLAYERSTATE[ player ].card2 = undefined;
		}

		this.HISTORY.push({
			type: 'lost-card',
			player,
			lost,
		});

		this.DISCARDPILE.push( lost );

		let lives = 0;
		if( this.PLAYERSTATE[ player ].card1 ) lives ++;
		if( this.PLAYERSTATE[ player ].card2 ) lives ++;

		console.log(`${ lives > 0 ? '💔' : '☠️' }  ${ this.GetAvatar( player ) } has lost the ${ Style.yellow( lost ) }`);
	}


	Penalty( player, reason ) {
		let penalty = '';

		let lostCard;
		try {
			lostCard = this.BOTS[ player ].OnCardLoss({
				...this.GetGameState(player),
			});
		}
		catch( error ) {
			this.PLAYERSTATE[ player ].card1 = undefined;
			this.PLAYERSTATE[ player ].card2 = undefined;
			console.error(`Error in bot ${ player }`);
			console.error( error );
		}

		const _validCard = [ this.PLAYERSTATE[ player ].card1, this.PLAYERSTATE[ player ].card2 ].includes( lostCard ) && lostCard;

		if( _validCard && this.PLAYERSTATE[ player ].card1 === lostCard || !_validCard && this.PLAYERSTATE[ player ].card1 ) {
			penalty = this.PLAYERSTATE[ player ].card1;
		}
		else if( _validCard && this.PLAYERSTATE[ player ].card2 === lostCard || !_validCard && this.PLAYERSTATE[ player ].card2 ) {
			penalty = this.PLAYERSTATE[ player ].card2;
		}

		console.log(`🚨  ${ this.GetAvatar( player ) } was penalised because ${ Style.yellow( reason ) }`);
		this.LosePlayerCard( player, penalty );
	}


	ResolveChallenge({ challenger, byWhom, card, action, type, target, counterer, challengee }) {
		const challengeTypes = {
			'challenge-round': 'OnChallengeActionRound',
			'counter-round': 'OnCounterActionRound',
		};

		let botAnswer;
		try {
			botAnswer = this.BOTS[ challenger ][ challengeTypes[ type ] ]({
				...this.GetGameState(challenger),
				action,
				byWhom,
				toWhom: target,
				counterer,
				card,
			});
		}
		catch( error ) {
			this.Penalty( challenger, `the bot crashed` );
			console.error(`Error in bot ${ challenger }`);
			console.error( error );
		}

		if( botAnswer ) {
			const lying = this.PLAYERSTATE[ challengee ].card1 !== card && this.PLAYERSTATE[ challengee ].card2 !== card;

			this.HISTORY.push({
				type,
				challenger,
				challengee,
				action,
				lying,
			});

			console.log(`❓  ${ this.GetAvatar( challengee ) } was challenged by ${ this.GetAvatar( challenger ) }`);

			if( lying ) {
				this.HISTORY.push({
					type: 'penalty',
					player: challengee,
				});

				this.Penalty( challengee, 'of lying' );

				return true;
			}
			else {
				this.HISTORY.push({
					type: 'penalty',
					from: challenger,
				});

				this.Penalty( challenger, `of challenging ${ this.GetAvatar( challengee ) } unsuccessfully` );
				const newCard = this.ExchangeCard( card );

				if( this.PLAYERSTATE[ challengee ].card1 === card ) this.PLAYERSTATE[ challengee ].card1 = newCard;
				else if( this.PLAYERSTATE[ challengee ].card2 === card ) this.PLAYERSTATE[ challengee ].card2 = newCard;

				this.HISTORY.push({
					type: 'unsuccessful-challenge',
					action: 'swap-1',
					from: challengee,
				});
				console.log(`↬  ${ this.GetAvatar( challengee ) } put the ${ Style.yellow( card ) } back in the deck and drew a new card`);

				return 'done';
			}
		}

		return false;
	}


	ChallengeRound({ player, target, card, action, type, counterer }) {
		let _hasBeenChallenged = false;

		const challengee = type === 'counter-round' ? counterer : player;

		this.PLAYERNAMES
			.filter( challenger => challenger !== challengee && ( this.PLAYERSTATE[ challenger ].card1 || this.PLAYERSTATE[ challenger ].card2 ) )
			.some( challenger => {
				_hasBeenChallenged = this.ResolveChallenge({ challenger, byWhom: player, card, action, type, target, counterer, challengee });
				return _hasBeenChallenged === 'done' ? true : _hasBeenChallenged;
			});

		return _hasBeenChallenged;
	}


	CounterAction({ player, action, target }) {
		const actions = {
			'foreign-aid': ['duke', false],
			'assassination': ['contessa', false],
			'stealing': ['captain', 'ambassador', false],
		};
		const counter = {}
		if( action !== 'foreign-aid' ) {
			try {
				counter.counterAction = this.BOTS[ target ].OnCounterAction({
					...this.GetGameState(target),
					action,
					byWhom: player,
					toWhom: target,
				});
				counter.counterer = target;
			}
			catch( error ) {
				this.Penalty( target, `the bot crashed` );
				console.error(`Error in bot ${ target }`);
				console.error( error );
			}
		}
		else {
			// Foreign aid. everyone gets a go!
			this.PLAYERNAMES
				.filter( counterer => counterer !== player && ( this.PLAYERSTATE[ counterer ].card1 || this.PLAYERSTATE[ counterer ].card2 ) )
				.some( counterer => {
					let _hasBeenChallenged;
					try {
						_hasBeenChallenged = this.BOTS[ counterer ].OnCounterAction({
							...this.GetGameState(counterer),
							action,
							byWhom: player,
							toWhom: undefined,
						});
					}
					catch( error ) {
						this.Penalty( counterer, `the bot crashed` );
						console.error(`Error in bot ${ counterer }`);
						console.error( error );
					}

					if( _hasBeenChallenged ) {
						counter.counterAction = _hasBeenChallenged;
						counter.counterer = counterer;
						return true;
					}
				});
		}

		if( counter.counterAction ) {
			if( !actions[ action ].includes( counter.counterAction ) ) {
				this.Penalty( counter.counterer, `did't give a valid counter action ${ Style.yellow( counter.counterAction ) } for ${ Style.yellow( action ) }` );
				return true;
			}

			this.HISTORY.push({
				type: 'counter-action',
				action,
				from: player,
				to: target,
				counter: counter.counterAction,
				counterer: counter.counterer,
			});
			console.log(`❓  ${ this.GetAvatar( player ) } was counter actioned by ${ this.GetAvatar( counter.counterer ) } with ${ Style.yellow( counter.counterAction ) }`);
			const _hasBeenChallenged = this.ChallengeRound({ player, target, card: counter.counterAction, action, type: 'counter-round', counterer: counter.counterer });
			return _hasBeenChallenged === 'done' ? true : !_hasBeenChallenged;
		}

		return false;
	}


	RunChallenges({ action, player, target }) {
		if( action === 'taking-3' || action === 'assassination' || action === 'stealing' || action === 'swapping' ) {
			const card = {
				'taking-3': 'duke',
				'assassination': 'assassin',
				'stealing': 'captain',
				'swapping': 'ambassador',
			}[action];

			const _hasBeenChallenged = this.ChallengeRound({ player, card, action, type: 'challenge-round', target });
			if( _hasBeenChallenged && _hasBeenChallenged !== 'done' ) {
				return;
			}
		}

		if( action === 'foreign-aid' || action === 'assassination' || action === 'stealing' ) {
			const _hasBeenChallenged = this.CounterAction({ player, action, target });
			if( _hasBeenChallenged && _hasBeenChallenged !== 'done' ) {
				return;
			}
		}

		this.RunActions({ player, action, target });
	}


	RunActions({ player, action, target }) {
		if( !this.PLAYERSTATE[ target ] && !['taking-1', 'taking-3', 'swapping', 'foreign-aid'].includes( action ) ) {
			this.Penalty( player, `did't give a valid (${ target }) player` );
			return true;
		}

		if( !ACTIONS.includes( action ) ) {
			this.Penalty( player, `did't give a valid (${ action }) action` );
			return true;
		}

		if( this.PLAYERSTATE[ player ].coins > 10 && action !== 'couping' ) {
			this.Penalty( player, `had too much coins and needed to coup` );
			return;
		}

		let disgarded;

		switch( action ) {
			case 'taking-1':
				this.PLAYERSTATE[ player ].coins ++;
				break;

			case 'foreign-aid':
				this.PLAYERSTATE[ player ].coins += 2;
				break;

			case 'couping':
				this.PLAYERSTATE[ player ].coins -= 7;
				try {
					disgarded = this.BOTS[ target ].OnCardLoss({
						...this.GetGameState(target),
					});
				}
				catch( error ) {
					this.PLAYERSTATE[ target ].card1 = undefined;
					this.PLAYERSTATE[ target ].card2 = undefined;
					console.error(`Error in bot ${ target }`);
					console.error( error );
				}

				if( this.PLAYERSTATE[ target ].card1 === disgarded && disgarded ) {
					this.LosePlayerCard( target, disgarded );
				}
				else if( this.PLAYERSTATE[ target ].card2 === disgarded && disgarded ) {
					this.LosePlayerCard( target, disgarded );
				}
				else {
					this.Penalty( target, `did't give up a valid card` );
				}
				break;

			case 'taking-3':
				this.PLAYERSTATE[ player ].coins += 3;
				break;

			case 'assassination':
				try {
					disgarded = this.BOTS[ target ].OnCardLoss({
						...this.GetGameState(target),
					});
				}
				catch( error ) {
					this.PLAYERSTATE[ target ].card1 = undefined;
					this.PLAYERSTATE[ target ].card2 = undefined;
					console.error(`Error in bot ${ target }`);
					console.error( error );
				}

				if( this.PLAYERSTATE[ target ].card1 === disgarded && disgarded ) {
					this.LosePlayerCard( target, disgarded );
				}
				else if( this.PLAYERSTATE[ target ].card2 === disgarded && disgarded ) {
					this.LosePlayerCard( target, disgarded );
				}
				else {
					this.Penalty( target, `did't give up a valid card` );
				}
				break;

			case 'stealing':
				if( this.PLAYERSTATE[ target ].coins < 2 ) {
					this.PLAYERSTATE[ player ].coins += this.PLAYERSTATE[ target ].coins;
					this.PLAYERSTATE[ target ].coins = 0;
				}
				else {
					this.PLAYERSTATE[ player ].coins += 2;
					this.PLAYERSTATE[ target ].coins -= 2;
				}
				break;

			case 'swapping':
				const newCards = [ this.GetCardFromDeck(), this.GetCardFromDeck() ];
				let chosenCards;
				try {
					chosenCards = this.BOTS[ player ].OnSwappingCards({
						...this.GetGameState(player),
						newCards: newCards.slice( 0 ),
					});
				}
				catch( error ) {
					this.Penalty( player, `the bot crashed` );
					console.error(`Error in bot ${ player }`);
					console.error( error );
				}

				this.SwapCards({ chosenCards, player, newCards });
				break;
		}
	}


	Turn() {
		const player = this.PLAYERNAMES[ this.GetWhosNext() ];

		let botAnswer;
		try {
			botAnswer = this.BOTS[ player ].OnTurn({
				...this.GetGameState(player),
			});
		}
		catch( error ) {
			this.Penalty( player, `the bot crashed` );
			console.error(`Error in bot ${ player }`);
			console.error( error );
		}

		if( !botAnswer ) {
		}
		else {
			const { action, against } = botAnswer;
			const playerAvatar = this.GetAvatar( player );
			const targetAvatar = this.GetAvatar( against );

			let skipAction = false;

			switch( action ) {
				case 'taking-1':
					this.HISTORY.push({
						type: 'action',
						action: 'taking-1',
						from: player,
					});
					console.log(`🃏  ${ playerAvatar } takes ${ Style.yellow('a coin') }`);
					break;
				case 'foreign-aid':
					this.HISTORY.push({
						type: 'action',
						action: 'foreign-aid',
						from: player,
					});
					console.log(`🃏  ${ playerAvatar } takes 2 coins ${ Style.yellow('foreign aid') }`);
					break;
				case 'couping':
					this.HISTORY.push({
						type: 'action',
						action: 'couping',
						from: player,
						to: against,
					});
					console.log(`🃏  ${ playerAvatar } coups ${ targetAvatar }`);

					if( this.PLAYERSTATE[ player ].coins < 7 ) {
						this.Penalty( player, `did't having enough coins for a coup` );
						skipAction = true;
					}

					if( !this.StillAlive( against ) ) {
						this.Penalty( player, `tried to coup a dead player` );
						skipAction = true;
					}
					break;
				case 'taking-3':
					this.HISTORY.push({
						type: 'action',
						action: 'taking-3',
						from: player,
					});
					console.log(`🃏  ${ playerAvatar } takes 3 coins with the ${ Style.yellow('duke') }`);
					break;
				case 'assassination':
					this.HISTORY.push({
						type: 'action',
						action: 'assassination',
						from: player,
						to: against,
					});
					console.log(`🃏  ${ playerAvatar } assassinates ${ targetAvatar }`);

					if( this.PLAYERSTATE[ player ].coins < 3 ) {
						this.Penalty( player, `did't have enough coins for an assassination` );
						skipAction = true;
					}
					else if( !this.StillAlive( against ) ) {
						this.Penalty( player, `tried to assassinat a dead player` );
						skipAction = true;
					}
					else {
						this.PLAYERSTATE[ player ].coins -= 3;
					}
					break;
				case 'stealing':
					this.HISTORY.push({
						type: 'action',
						action: 'stealing',
						from: player,
						to: against,
					});

					if( !this.StillAlive( against ) ) {
						this.Penalty( player, `tried to steal from a dead player` );
						skipAction = true;
					}

					console.log(`🃏  ${ playerAvatar } steals from ${ targetAvatar }`);
					break;
				case 'swapping':
					this.HISTORY.push({
						type: 'action',
						action: 'swapping',
						from: player,
					});
					console.log(`🃏  ${ playerAvatar } swaps two cards with the ${ Style.yellow('ambassador') }`);
					break;
				default:
					this.HISTORY.push({
						type: 'penalty',
						from: player,
					});
					this.Penalty( player, `of issuing an invalid action: "${ Style.yellow( action ) }", allowed: ${ Style.yellow( ACTIONS.join(', ') ) }` );
					skipAction = true;
			}

			if( !skipAction ) this.RunChallenges({ player, action, target: against });
		}

		if( this.WhoIsLeft().length > 1 && this.ROUNDS < 1000 ) {
			this.ROUNDS ++;
			return this.Turn();
		}
		else if( this.ROUNDS >= 1000 ) {
			console.log('The game was stopped because of an infinite loop');
			return this.WhoIsLeft();
		}
		else {
			const winner = this.WhoIsLeft()[ 0 ];
			console.log(`\nThe winner is ${ this.GetAvatar( winner ) }\n`);
			return [ winner ];
		}
	}
}


class LOOP {
	constructor() {
		this.DEBUG = false;
		this.WINNERS = {};
		this.LOG = '';
		this.ERROR = false;
		this.SCORE = {};
		this.ROUND = 0;
		this.ROUNDS = this.GetRounds();

		ALLBOTS.forEach( player => {
			this.WINNERS[ player ] = 0;
			this.SCORE[ player ] = 0;
		});
	}

	GetScore( winners, allPlayer ) {
		const winnerCount = winners.length;
		const loserCount = allPlayer.length - winnerCount;
		const loserScore = -1 / ( allPlayer.length - 1 );
		const winnerScore = ( loserScore * loserCount ) / winnerCount * -1;

		allPlayer.forEach( player => {
			if( winners.includes( player ) ) {
				this.SCORE[ player ] += winnerScore;
			}
			else {
				this.SCORE[ player ] += loserScore;
			}
		});

		winners.forEach( player => {
			this.WINNERS[ player ] ++;
		});
	}

	DisplayScore( clear = false ) {
		if( clear ) process.stdout.write(`\u001b[${ Object.keys( this.SCORE ).length + 1 }A\u001b[2K`);

		const done = String( Math.floor( this.ROUND/this.ROUNDS * 100 ) + 1 );
		process.stdout.write(`\u001b[2K${ done.padEnd(3) }% done\n`);

		Object
			.keys( this.SCORE )
			.sort( ( a, b ) => this.SCORE[b] - this.SCORE[a] )
			.forEach( player => {
				const percentage = ( this.ROUND > 0 ) ? `${ ( ( this.WINNERS[ player ] * 100 ) / this.ROUND ).toFixed( 3 ) }%` : '-';
				process.stdout.write(
					`\u001b[2K${ Style.gray( percentage.padEnd(7) ) } ` +
					`${ Style.red( String( this.SCORE[ player ].toFixed( 2 ) ).padEnd( Math.round( Math.log10( this.ROUNDS ) + 6 ) ) ) } ` +
					`${ Style.yellow( player ) } got ${ Style.red( this.WINNERS[ player ] ) } wins\n`
				);
			});
	}

	GetRounds() {
		const rIdx = process.argv.indexOf('-r');
		if( rIdx > 0 && process.argv.length > rIdx && Number.parseInt( process.argv[rIdx + 1] ) > 0 ) {
			return Number.parseInt( process.argv[rIdx + 1] );
		}
		return 1000;
	}

	Play() {
		this.DisplayScore( true );

		let game = new COUP();
		const winners = game.Play(ALLBOTS);

		if( !winners || this.ERROR ) {
			console.info( this.LOG );
			// console.info( JSON.stringify( game.HISTORY, null, 2 ) );
			this.ROUND = this.ROUNDS;
		}

		this.GetScore( winners, game.PLAYERNAMES );

		this.ROUND ++;
		this.LOG = '';

		if( this.ROUND < this.ROUNDS ) {
			// We run on next tick so the GC can get to work.
			// Otherwise it will work up a large memory footprint
			// when running over 100,000 games
			// (cause loops won't let the GC run efficiently)
			process.nextTick( () => this.Play() );
		}
		else {
			console.info();
		}
	}

	Run( debug = false ) {
		this.DEBUG = debug;

		console.log = text => { this.LOG += `${ text }\n` };
		console.error = text => {
			if( this.DEBUG ) {
				this.ERROR = true;
				this.LOG += Style.red(`🛑  ${ text }\n`);
			}
		};
		console.info(`\nGame round started`);
		console.info('\n🎉   WINNERS  🎉\n');

		this.DisplayScore( false );

		this.Play();
	}
};

if( process.argv.includes('play') ) {
	new COUP().Play(ALLBOTS);
}

if( process.argv.includes('loop') ) {
	const loop = new LOOP();
	const debug = process.argv.includes('-d');

	loop.Run( debug );
}


module.exports = exports = {
	COUP,
	LOOP,
};
