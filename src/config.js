module.exports = {
	commentsSaveSeconds: 60 * 60 * 24 * 365,
	
	minAnalyzeLimit: 10000,
	maxAnalyzeLimit: 1000000,
	maxAnalyzeSeconds: 60 * 60 * 24 * 365,

	boards: [
		'3',
		'a',
		'aco',
		'adv',
		'an',
		'asp',
		'b',
		'bant',
		'biz',
		'c',
		'cgl',
		'ck',
		'cm',
		'co',
		'd',
		'diy',
		'e',
		'f',
		'fa',
		'fit',
		'g',
		'gd',
		'gif',
		'h',
		'hc',
		'his',
		'hm',
		'hr',
		'i',
		'ic',
		'int',
		'jp',
		'k',
		'lgbt',
		'lit',
		'm',
		'mlp',
		'mu',
		'n',
		'news',
		'o',
		'out',
		'p',
		'po',
		'pol',
		'qa',
		'qst',
		'r',
		'r9k',
		's',
		's4s',
		'sci',
		'soc',
		'sp',
		't',
		'tg',
		'toy',
		'trash',
		'trv',
		'tv',
		'u',
		'v',
		'vg',
		'vip',
		'vp',
		'vr',
		'w',
		'wg',
		'wsg',
		'wsr',
		'x',
		'y' ],
	customWeight: {
		pol: 2,
		v: 2,
		b: 2,
		tv: 2,
	
		vg: 1.5,
		a: 1.5,
		r9k: 1.5,
		mu: 1.5,
	
		int: 1.25,
		biz: 1.25,
			
		wsr: 0.5,
		hc: 0.5,
		p: 0.5,
		hm: 0.5,
		cm: 0.5,
		n: 0.5,
		y: 0.5,
		e: 0.5,
		news: 0.5,
		f: 0.5,
		"3": 0.5,
		t: 0.5,
		w: 0.5,
		i: 0.5,
		gd: 0.5,
		po: 0.5,
		vip: 0.5,
	},
	stopWords: new Set([
		"the",
		"and",
		"you",
		"that",
		"for",
		"thy",
		"but",
		"with",
		"hav",
		"not",
		"lik",
		"just",
		"they",
		"can",
		"what",
		"get",
		"was",
		"your",
		"her",
		"don",
		"about",
		"from",
		"ther",
		"mor",
		"mak",
		"how",
		"out",
		"would",
		"som",
		"want",
		"becaus",
		"them",
		"when",
		"who",
		"why",
		"has",
		"she",
		"than",
		"their",
		"now",
		"oth",
		"thing",
		"too",
		"then",
		"see",
		"also",
		"any",
		"his",
		"stil",
		"being",
		"off",
		"try",
		"much",
		"into",
		"got",
		"tak",
		"most",
		"had",
		"wer",
		"nev",
		"been",
		"did",
		"going",
		"could",
		"should",
		"him",
		"wher",
		"which",
		"",
		"",
		"",
	])
}