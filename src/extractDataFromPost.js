
const Entities = require('html-entities').Html5Entities
const entities = new Entities()

const natural = require("natural")
const winkPorter2 = require('wink-porter2-stemmer')

const config = require("./config")
const db = require("./db")
const downloadImage = require("./downloadImage")

const repeatingRegExp = new RegExp(/(.)\1{2,}/)
const boardSet = new Set(config.boards.map(x => "/"+x+"/"))

const tokenize = (str,board,post) => {
	const shorterStr = str
		.replace(/magnet:\S+/g," ") // /t/ remove magnet links
		.replace(/#!\S+/g," ") // /t/ some other mega hashes?
		.replace(/(?:https?:\/\/)?(?:www\.)?([\w-\.]+\.[a-z]+)(?:\/\S*)?/g,"$1") // replace chars after tld

	const boardTokens = [] 

	const strWithoutBoards = shorterStr.replace(/\/[a-z34]{1,4}\//g,(match,offset,string) => {
		//if(string[offset-1] == "/" && string[offset + match.length] == "/"){
		if(boardSet.has(match)){
			//console.log("BOARD MATCH",match)
			boardTokens.push(match)
			return " "
		}
		return match
	})

	const tokens = strWithoutBoards.match(/[a-z0-9]{3,}/g) || [] //get tokens
	tokens.push(...boardTokens)

	const uniqueTokens = Array.from(new Set(tokens))
	const stemmedTokens = uniqueTokens.map(x => natural.LancasterStemmer.stem(Buffer.from(x).toString()))// get around sliced string '''optimization''' //TODO: bench buffer vs stringify
	const finalTokens = []
	for(let token of stemmedTokens){
		if(boardSet.has(token)){
			finalTokens.push(token)
			continue
		}

		const charArray = token.match(/[a-z]/g)
		
		if(
			config.stopWords.has(token) ||
			token.length < 3 || token.length > 32 ||
			token.startsWith("urn:") ||
			token.includes("haha") ||
			repeatingRegExp.test(token) ||
			!charArray || charArray.length < token.length * 0.8 ||
			!isNaN(token)
		){
			continue
		}else{
			//if(token.startsWith("it")) console.log(token)
			finalTokens.push(token)
		}
	}

	
	
	//if(stemmedTokens.includes("flipandinvertimag")) console.log("FOUND",board,post.no)
	
	return finalTokens
	/*
	str = str.replace(/(?:https?:\/\/)?(?:www\.)?([\w-\.]+\.[a-z]+)(?:\/\S*)?/g,"$1")
	const tokens = str.match(/[a-z0-9./\-:]{2,}\w/g) || []
	const expandedTokens = tokens.reduce((acc,val) => {
		if(!val.includes(".")){
			acc.push(...val.split(/[\-\/]/))
		}else{
			acc.push(val)
		}
		return acc
	},[])
	const uniqueTokens = Array.from(new Set(expandedTokens))
	return uniqueTokens.map(x => natural.PorterStemmer.stem(Buffer.from(x).toString())) // get around sliced string '''optimization''' //TODO: bench buffer vs stringify
	*/
}

const replaceText = (board,str) => {
	if(!str) return ""

	if(board == "p") str = str.replace(/<span class="abbr">.+<\/table>/gms,"") //removes EXIF text from /p/ posts
	if(board == "sci") str = str.replace(/\[\/?math\]|\[\/?eqn\]/gms,"") //removes special tags from /sci/
	str = str.replace(/<span class="deadlink">(?:&gt;)+(\/[a-z34]+\/)?\d+<\/span>/g,"$1") //remove deadlinks, keep board name
	str = str.replace(/<a href="(\/[a-z34]+\/)?.*?<\/a>/g,"$1") //remove link, keep board name
	str = str.replace(/<br>/gm," ") //replace linebreaks with a space
	str = str.replace(/<.*?>/gm,"") //remove any other HTML tags; greentext-HTML, /g/ [code], etc., but its text-content is kept
	str = entities.decode(str) //convert html entities to actual characters: "&gt;" becomes ">"
	str = str.trim() //remove whitespace from start and end
	str = str.toLowerCase()

	return str
}

const getStatsAndTokens = (board,post) => {
	//if(post.com.includes("ruk2")) console.log("INCLUDES",post.no)
	const replacedText = replaceText(board,post.com)
	const tokens = tokenize(replacedText,board,post)

	return {
		tokens : tokens,
		postLen: replacedText.length
	}
}

const extract = (board,post) => {
	post.com = post.com || ""

	if(post.md5) downloadImage(board,post.md5,post.tim,post.ext)

	const statsAndTokens = getStatsAndTokens(board,post)

	for(let token of statsAndTokens.tokens){
		const tokenBoardsMap = db.invertedPostIndex.get(token) || db.invertedPostIndex.set(token,new Map()).get(token)
		const tokenBoardsPostnumSet = tokenBoardsMap.get(board) || tokenBoardsMap.set(board,new Set()).get(board)
		tokenBoardsPostnumSet.add(post.no)
	}
  
	const toSave = {
		no: post.no,
		com: post.com,
		time: post.time,
		resto: post.resto
	}

	if(post.name && post.name != "Anonymous") toSave.name = post.name
	if(post.filename) toSave.filename = post.filename
	if(post.ext) toSave.ext = post.ext
	if(post.tim) toSave.tim = post.tim
	if(post.md5) toSave.md5 = post.md5
	if(post.capcode) toSave.capcode = post.capcode
	if(post.fsize) toSave.fsize = post.fsize

	if(post.id) toSave.id = post.id
	if(post.country) toSave.country = post.country
	if(post.troll_country) toSave.troll_country = post.troll_country
	if(post.country_name) toSave.country_name = post.country_name
	
	if(post.since4pass) toSave.since4pass = post.since4pass

	//db.postsDB.put([board,post.no],toSave).catch(console.error)
  
	return toSave
}

module.exports = {
	extract,
	getStatsAndTokens
}