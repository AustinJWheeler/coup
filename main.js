// simulate game
// make simple player
// make api

// 4 api queries
//   1. Action
//   2. Challenge
//   3. Counteraction
//   4. Exchange
//   5. Challenge Response

// play log format
// player, move_type, arg
// args:
//   Draw: card
//   Challenge_Response: bool
//   Coup: target_player
//   Assassinate: target_player
//   Steal: target_player
//   Exchange_Discard: two_cards

// moves
//   

const P_ACTION = 200;
const P_CHALLENGE = 201;
const P_COUNTERACTION = 202;
const P_EXCHANGE_DISCARD = 203;
const P_CHALLENGE_RESPONSE = 204;
const P_LOSE_INFLUENCE = 205;

const PROMPTS = [P_ACTION, P_CHALLENGE, P_COUNTERACTION,
    P_EXCHANGE_DISCARD, P_CHALLENGE_RESPONSE, P_LOSE_INFLUENCE];

const DUKE = 100;
const ASSASSIN = 101;
const CAPTAIN = 102;
const AMBASSADOR = 103;
const CONTESSA = 104;

const CHARACTERS = [DUKE, ASSASSIN, CAPTAIN, AMBASSADOR, CONTESSA];

const INIT = 14;

const CHALLENGE = 15;
const CHALLENGE_RESPONSE = 13;

const INCOME = 1;
const FOREIGN_AID = 2;
const COUP = 3;
const LOSE_INFLUENCE = 16;

const TAX = 4;
const ASSASSINATE = 5;
const STEAL = 6;
const EXCHANGE = 7;
const EXCHANGE_DISCARD = 12;

const BLOCK_AID = 8;
const BLOCK_ASSASSINATE = 9;
const BLOCK_STEAL_AMBASSADOR = 10;
const BLOCK_STEAL_CAPTAIN = 11;

const MOVES = [
    INIT,
    CHALLENGE, CHALLENGE_RESPONSE,
    INCOME, FOREIGN_AID, COUP,
    TAX, ASSASSINATE, STEAL, EXCHANGE, EXCHANGE_DISCARD,
    BLOCK_AID, BLOCK_ASSASSINATE,
    BLOCK_STEAL_AMBASSADOR, BLOCK_STEAL_CAPTAIN
];

const ACTIONS = [
    INCOME, FOREIGN_AID, COUP,
    TAX, ASSASSINATE, STEAL, EXCHANGE,
];

const COUNTERABLE_ACTIONS = [
    FOREIGN_AID, ASSASSINATE, STEAL
];

const COUNTERACTIONS = [
    BLOCK_AID, BLOCK_ASSASSINATE,
    BLOCK_STEAL_AMBASSADOR, BLOCK_STEAL_CAPTAIN,
];

const getRequiredCharacter = (move) => {
    switch (move) {
        case CHALLENGE: return null;
        case INCOME: return null;
        case FOREIGN_AID: return null;
        case COUP: return null;
        case TAX: return DUKE;
        case ASSASSINATE: return ASSASSIN;
        case STEAL: return CAPTAIN;
        case EXCHANGE: return AMBASSADOR;
        case BLOCK_AID: return DUKE;
        case BLOCK_ASSASSINATE: return CONTESSA;
        case BLOCK_STEAL_AMBASSADOR: return AMBASSADOR;
        case BLOCK_STEAL_CAPTAIN: return CAPTAIN;
        default: return null;
    }
};

const enumToString = (x) => {
    if (x === null) return 'Null';
    switch (x) {
        case DUKE: return 'Duke';
        case ASSASSIN: return 'Assassin';
        case CAPTAIN: return 'Captain';
        case AMBASSADOR: return 'Ambassador';
        case CONTESSA: return 'Contessa';
        case CHALLENGE: return 'Challenge';
        case INCOME: return 'Income';
        case FOREIGN_AID: return 'Foreign Aid';
        case COUP: return 'Coup';
        case TAX: return 'Tax';
        case ASSASSINATE: return 'Assassinate';
        case STEAL: return 'Steal';
        case EXCHANGE: return 'Exchange';
        case BLOCK_AID: return 'Block Aid';
        case BLOCK_ASSASSINATE: return 'Block Assassinate';
        case BLOCK_STEAL_AMBASSADOR: return 'Block Steal (Ambassador)';
        case BLOCK_STEAL_CAPTAIN: return 'Block Steal (Captain)';
        default: return x;
    }
};

const ets = enumToString;

const generate_deck = () => new Array(3).fill(CHARACTERS.slice()).flat();

const shuffle = (a) => a.map(x => [Math.random(), x])
    .sort((a, b) => a[0] - b[0]).map(x => x[1]);

const generate_game_state = () => {
    const deck = shuffle(generate_deck());
    const players = [
        {
            hand: [deck.pop(), deck.pop()],
            lost_influence: [],
            coins: 1,
        },
        {
            hand: [deck.pop(), deck.pop()],
            lost_influence: [],
            coins: 2,
        }
    ];
    const history = []; // todo init
    return {
        deck,
        history,
        players,
    };
};

const generate_basic_strategy = () => {
    return (game_state, prompt) => {
        const history = game_state.history;
        const player = game_state.players[0];
        const hand = player.hand;
        if (prompt === P_ACTION) {
            if (player.coins >= 7) return [COUP, 1];
            if (player.coins >= 3 &&
                hand.indexOf(ASSASSIN) !== -1)
                return [ASSASSINATE, 1];
            if (hand.indexOf(CAPTAIN) !== -1)
                return [STEAL, 1];
            if (hand.indexOf(DUKE) !== -1)
                return [TAX];
            if (hand.indexOf(AMBASSADOR) !== -1)
                return [EXCHANGE];
            return [Math.random() < 0.5 ? INCOME : FOREIGN_AID];
        }
        if (prompt === P_CHALLENGE) {
            return Math.random() < 0.1 ? hand[0] : 0;
        }
        if (prompt === P_CHALLENGE_RESPONSE) {
            let character = null;
            for (let i = history.length - 1; !character; i--)
                character = getRequiredCharacter(history[i][1]);
            const index = hand.indexOf(character);
            if (index === -1) return hand[Math.floor(Math.random() * 2)];
            return hand[index];
        }
        if (prompt === P_COUNTERACTION) {
            let i = history.length - 1;
            while (ACTIONS.indexOf(history[i][1]) === -1) i--;
            const action = history[i][1];
            switch (action) {
                case FOREIGN_AID:
                    if (hand.indexOf(DUKE) !== -1) return BLOCK_AID;
                    break;
                case ASSASSINATE:
                    if (hand.indexOf(CONTESSA) !== -1) return BLOCK_ASSASSINATE;
                    break;
                case STEAL:
                    if (hand.indexOf(AMBASSADOR)) return BLOCK_STEAL_AMBASSADOR;
                    if (hand.indexOf(CAPTAIN)) return BLOCK_STEAL_CAPTAIN;
                    break;
                default:
                    return null;
            }
        }
        if (prompt === P_EXCHANGE_DISCARD) {
            let index = 0;
            while (index < hand.length && hand[index] === AMBASSADOR) index++;
            if (index === hand.length) return [AMBASSADOR, AMBASSADOR];
            return [AMBASSADOR, hand[index]];
        }
        if (prompt === P_LOSE_INFLUENCE) {
            return hand[0];
        }
    };
};

const shift_game_state = (game_state) => {
    return {
        deck: [...game_state.deck],
        players: [
            {
                hand: [...game_state.players[1].hand],
                lost_influence: [...game_state.players[1].lost_influence],
                coins: game_state.players[1].coins
            },
            {
                hand: [...game_state.players[0].hand],
                lost_influence: [...game_state.players[0].lost_influence],
                coins: game_state.players[0].coins
            }
        ],
        history: game_state.history.map(x => {
            if (x.length === 2)
                return [
                    x[0] === 0 ? 1 : 0,
                    x[1]
                ];
            let arg = x[2];
            if (x[1] === COUP ||
                x[1] === ASSASSINATE ||
                x[1] === STEAL)
                arg = arg === 0 ? 1 : 0;
            return [
                x[0] === 0 ? 1 : 0,
                x[1],
                arg
            ];
        })
    };
};

const getLastAction = (game_state) => {
    let action_move = null;
    let counter_move = null;
    let challenge_action = null;
    let challenge_counter = null;
    let exchange_discard = null;
    for (let i = game_state.history.length - 1; !action_move; i--) {
        if (game_state.history[i][1] === exchange_discard)
            exchange_discard = game_state.history[i];
        if (COUNTERACTIONS.indexOf(game_state.history[i][1]) !== -1) {
            counter_move = game_state.history[i];
            if (i + 1 < game_state.history.length)
                challenge_counter = game_state.history[i + 1];
        }
        if (ACTIONS.indexOf(game_state.history[i][1]) !== -1) {
            action_move = game_state.history[i];
            if (i + 1 < game_state.history.length)
                challenge_action = game_state.history[i + 1];
        }
    }
    return { action_move, challenge_action, counter_move, challenge_counter, exchange_discard };
}

const printGameState = (game_state) => {
    const human_readable = {
        deck: [...game_state.deck],
        players: [
            {
                hand: [...game_state.players[0].hand.map(ets)],
                lost_influence: [...game_state.players[0].lost_influence.map(ets)],
                coins: game_state.players[0].coins
            },
            {
                hand: [...game_state.players[1].hand.map(ets)],
                lost_influence: [...game_state.players[1].lost_influence.map(ets)],
                coins: game_state.players[1].coins
            }
        ],
        history: game_state.history.map(x => {
            if (x.length === 2)
                return [x[0], ets(x[1])];
            let arg = x[2];
            if (x[1] !== COUP &&
              x[1] !== ASSASSINATE &&
              x[1] !== STEAL)
                arg = ets(arg);
            return [x[0], ets(x[1]), arg];
        })
    };
    console.log(JSON.stringify(human_readable, null, '  '));
}

const play_turn = (game_state, stratagy) => {
    let s = game_state;

    // Action
    let action = stratagy(s, P_ACTION);
    s.history.push([0, ...action]);

    // Challenge
    if (getRequiredCharacter(action[0])) {
        const challenge = stratagy(shift_game_state(s), P_CHALLENGE);
        s.history.push([1, CHALLENGE, challenge]);
        if (challenge) {
            const response = stratagy(s, P_CHALLENGE_RESPONSE);
            s.history.push([0, CHALLENGE_RESPONSE, response]);
            s.players[0].hand.splice(s.players[0].hand.indexOf(response), 1);
            if (response === getRequiredCharacter(action[0])) {
                s.deck.push(response);
                s.deck = shuffle(s.deck);
                s.players[0].hand.push(s.deck.pop());

                s.players[1].hand.splice(s.players[1].hand.indexOf(challenge), 1);
                s.players[1].lost_influence.push(challenge);
            } else {
                s.players[0].lost_influence.push(response);

                return s;
            }
        }
    }

    // Pay Assassin
    if (action[0] === ASSASSINATE) s.players[0].coins -= 3;

    // Counteraction
    let counter = null;
    if (COUNTERABLE_ACTIONS.indexOf(action[0]) !== -1 &&
        s.players[1].lost_influence.length < 2) {
        counter = stratagy(shift_game_state(s), P_COUNTERACTION);
        // todo validate counteration
    }

    // Challenge
    if (counter) {
        s.history.push([1, counter]);
        const challenge = stratagy(s, P_CHALLENGE);
        s.history.push([0, CHALLENGE, challenge]);
        if (challenge) {
            const response = stratagy(shift_game_state(s), P_CHALLENGE_RESPONSE);
            s.history.push([1, CHALLENGE_RESPONSE, response]);
            s.players[1].hand.splice(s.players[1].hand.indexOf(response), 1);
            if (response === getRequiredCharacter(counter)) {
                s.deck.push(response);
                s.deck = shuffle(s.deck);
                s.players[1].hand.push(s.deck.pop());

                s.players[0].hand.splice(s.players[0].hand.indexOf(challenge), 1);
                s.players[0].lost_influence.push(challenge);

                return s;
            } else {
                s.players[1].lost_influence.push(response);
            }
        } else {
            return s;
        }
    }

    // Apply Action
    // noinspection FallThroughInSwitchStatementJS
    switch (action[0]) {
        case INCOME:
            s.players[0].coins += 1;
            break;
        case FOREIGN_AID:
            s.players[0].coins += 2;
            break;
        case COUP:
            s.players[0].coins -= 7;
        case ASSASSINATE:
            if (s.players[1].lost_influence === 2) return s;
            const loss = stratagy(shift_game_state(s), P_LOSE_INFLUENCE);
            s.history.push([1, LOSE_INFLUENCE, loss]);
            s.players[1].hand.splice(s.players[1].hand.indexOf(loss), 1);
            s.players[1].lost_influence.push(loss);
            break;
        case TAX:
            s.players[0].coins += 3;
            break;
        case STEAL:
            const steal = Math.min(2, s.players[1].coins);
            s.players[0].coins += steal;
            s.players[1].coins -= steal;
            break;
        case EXCHANGE:
            s.players[0].hand.push(s.deck.pop());
            s.players[0].hand.push(s.deck.pop());
            const discards = stratagy(s, P_EXCHANGE_DISCARD);
            s.history.push([0, EXCHANGE_DISCARD, discards]);
            const indexes = discards.map(x => s.players[0].hand.indexOf(x));
            indexes.forEach(x => s.players[0].hand.splice(x, 1));
            s.deck.push(...discards);
            s.deck = shuffle(s.deck);
            break;
    }

    return s;
};

const play_game = () => {
    const strat = generate_basic_strategy();
    let s = generate_game_state();
    printGameState(s);
    while (true) {
        s = play_turn(s, strat);
        if (s.players[0].lost_influence.length >= 2 ||
            s.players[1].lost_influence.length >= 2) break;
        s = shift_game_state(play_turn(shift_game_state(s), strat));
        if (s.players[0].lost_influence.length >= 2 ||
            s.players[1].lost_influence.length >= 2) break;
    }
    printGameState(s);
}

play_game();
