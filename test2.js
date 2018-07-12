/*
const bw = require("bytewise")
const cw = require("charwise")

console.log(bw.encode([Date.now(),85874261]))
console.log(cw.encode([Date.now(),85874261]))
console.log(Date.now()+"!"+85874261)
console.log(Date.now()+"!"+Math.random())
console.log("111" < "5")
console.log(cw.encode(111) < cw.encode(555))
console.log(cw.decode(cw.encode([111,["a"],"b"])))
*/

const db = require("./src/db")

const Entities = require('html-entities').Html5Entities
const entities = new Entities()

const Sentiment = require("sentiment")
const sentiment = new Sentiment()

const boardData = db.getBoardDB("soc").value()

const sentimentRes = {
	posts: 0,
	score: 0,
	comparative: 0
}

for(let thread in boardData.threads){
	for(let post of boardData.threads[thread].posts){
		sentimentRes.posts++
		if(post.com){
			//if(board == "p") post.com = post.com.replace(/<span class="abbr">.+<\/table>/gms,"") //removes EXIF text from /p/ posts
			post.com = post.com.replace(/<a.*?<\/a>|<br>/gm," ") //replace post-links and linebreaks with a space
			post.com = post.com.replace(/<.*?>/gm,"") //remove any other HTML tags; greentext-HTML, /g/ [code], etc., but its text-content is kept
			post.com = entities.decode(post.com) //convert html entities to actual characters: "&gt;" becomes ">"
			post.com = post.com.trim() //remove whitespace from start and end
      
			const res = sentiment.analyze(post.com)
			sentimentRes.score += res.score
			sentimentRes.comparative += res.comparative
			console.log({
				com: post.com,
				score: res.score,
				comparative: res.comparative,
				positive: res.positive,
				negative: res.negative,
			})
			//console.log(sentimentRes.score / sentimentRes.posts,sentimentRes.comparative / sentimentRes.posts)
		}
	}
}



