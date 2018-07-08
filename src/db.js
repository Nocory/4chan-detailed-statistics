const sub = require('subleveldown')
const db = require('level')('./database', {
	keyEncoding: require("charwise"),
	valueEncoding: "json",
	cacheSize: 256 * 1024 * 1024
})

const commentsDB = sub(db,"com",{keyEncoding: require("charwise"),valueEncoding: "utf8"})
const metaDataDB = sub(db,"metaData",{keyEncoding: require("charwise"),valueEncoding: "json"})
const textAnalysisResultDB = sub(db,"textAnalysisResult",{keyEncoding: require("charwise"),valueEncoding: "json"})
const metaAnalysisResultDB = sub(db,"metaAnalysisResult",{keyEncoding: require("charwise"),valueEncoding: "json"})
const snapperMetaDB = sub(db,"snapperMeta")

module.exports = {
	commentsDB,
	metaDataDB,
	textAnalysisResultDB,
	metaAnalysisResultDB,
	snapperMetaDB
}