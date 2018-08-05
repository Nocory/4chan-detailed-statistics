const natural = require("natural")

const cnr_tokenize = str => {
	str = str.replace(/(?:https?:\/\/)?(?:www\.)?([\w-\.]+\.[a-z]+)(?:\/\S*)?/g,"$1")
	const tokens = (str.match(/[a-z0-9./\-:]{2,}\w/g) || []).map(natural.PorterStemmer.stem)
	const uniqueTokens = Array.from(new Set(tokens)).map(x => Buffer.from(x).toString())
	return uniqueTokens
}

const main = async () => {
	natural.PorterStemmer.attach()
	
	const str3 = `I have data covering almost a year now
	Looks Like this: https://api.4stats.io/history/day/biz
	http://www.reddit-memes.com/fdgdfsg/gfdsg?word=124
	[start-time as unix ms, duration in ms, posts during duration, posts/minute during duration]
	
	But no metadata generated from that yet.`.toLowerCase()
	
	console.log(str3.tokenizeAndStem())
	console.log(cnr_tokenize(str3))
}

main()