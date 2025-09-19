const TOKEN_PATTERN = /[A-Za-z']+|\d+|[.,!?]/g;
const GIBBERISH_SYLLABLES = [
  'za',
  'gru',
  'plo',
  'fen',
  'zib',
  'vor',
  'quar',
  'nib',
  'mal',
  'tre',
];

export class MarkovLearner {
  constructor(rng = Math.random) {
    this.rng = rng;
  }

  nextReply(messages) {
    const tokens = messages.flatMap((message) => tokenize(message.text));
    if (tokens.length < 16) {
      return gibberish(this.rng);
    }
    const chain = buildChain(tokens);
    return composeSentence(chain, tokens, this.rng);
  }
}

export function tokenize(text) {
  if (!text) {
    return [];
  }
  return (text.toLowerCase().match(TOKEN_PATTERN) ?? []);
}

function buildChain(tokens) {
  const transitions = new Map();
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const current = tokens[i];
    const next = tokens[i + 1];
    if (!transitions.has(current)) {
      transitions.set(current, []);
    }
    transitions.get(current).push(next);
  }
  return transitions;
}

function composeSentence(chain, corpusTokens, rng) {
  if (!corpusTokens.length) {
    return gibberish(rng);
  }
  const start = corpusTokens[Math.floor(rng() * corpusTokens.length)];
  const length = Math.floor(rng() * 15) + 6; // 6 to 20 words
  const words = [start];
  for (let i = 1; i < length; i += 1) {
    const options = chain.get(words[words.length - 1]);
    if (!options || options.length === 0) {
      break;
    }
    const choice = options[Math.floor(rng() * options.length)];
    words.push(choice);
  }
  let sentence = formatSentence(words);
  if (!sentence.endsWith('.') && !sentence.endsWith('!') && !sentence.endsWith('?')) {
    sentence += '.';
  }
  return sentence;
}

function gibberish(rng) {
  const wordCount = Math.floor(rng() * 5) + 3; // 3 to 7 words
  const words = [];
  for (let i = 0; i < wordCount; i += 1) {
    const syllables = Math.floor(rng() * 3) + 2; // 2 to 4 syllables
    let word = '';
    for (let s = 0; s < syllables; s += 1) {
      const choice = GIBBERISH_SYLLABLES[Math.floor(rng() * GIBBERISH_SYLLABLES.length)];
      word += choice;
    }
    words.push(word);
  }
  let sentence = words.join(' ');
  sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  const endings = ['?', '!', '...'];
  sentence += endings[Math.floor(rng() * endings.length)];
  return sentence;
}

function formatSentence(tokens) {
  if (!tokens.length) {
    return '';
  }
  let sentence = tokens[0];
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (['.', ',', '!', '?'].includes(token)) {
      sentence += token;
    } else {
      sentence += ` ${token}`;
    }
  }
  sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  return sentence;
}
