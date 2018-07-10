const {metaAnalysisResultDB} = require("./db")

const summarize = (metaSum,toAdd,weight) => {
	for(let key in toAdd){
		toAdd[key] = toAdd[key] || 0 //fox for /vip/ not listing unique_ips in the thread json //TODO: remove in a week or so
		if(typeof toAdd[key] == "object"){
			if(!metaSum[key]) metaSum[key] = {}
			summarize(metaSum[key],toAdd[key])
		}else{
			metaSum[key] = (metaSum[key] || 0) + toAdd[key] * weight
		}
	}
	return metaSum
}

const average = (metaSum,totalWeight) => {
	const metaAvg = {}
	for(let key in metaSum){
		//console.log("key",key)
		if(typeof metaSum[key] == "object"){
			metaAvg[key] = average(metaSum[key],totalWeight)
		}else{
			metaAvg[key] = metaSum[key] / totalWeight
		}
	}
	return metaAvg
}

const main = async (board,snapTime) => {
	const allResults = []

	return new Promise((resolve,reject)=>{
		metaAnalysisResultDB.createReadStream({
			gt: [board,snapTime - 1000 * 60 * 60 * 24],
			lte: [board,snapTime]
		})
			.on('data', function (data) {
				allResults.push(data.value)
				//console.log(data.value)
			})
			.on('error', function (err) {
				reject(err)
			})
			.on('end', function () {
				allResults.reverse()
				const metaDurationHours = allResults.reduce((acc,val) => acc + val.duration,0) / (1000 * 60 * 60)
				console.log(`⏳   /${board}/ Processing ${allResults.length} meta analysis results, covering the last ${metaDurationHours} hours`)
				let metaSum = {}
				let totalHoursCovered = 0
				for(let obj of allResults){
					//console.log(obj.result)
					let thisHoursCovered = Math.min(obj.duration / (1000 * 60 * 60),24 - totalHoursCovered)
					totalHoursCovered += thisHoursCovered
					//console.log(board,"thisHoursCovered",obj.duration / (1000 * 60 * 60),thisHoursCovered,totalHoursCovered)
					metaSum = summarize(metaSum,obj.result,thisHoursCovered)
				}
				//console.log("metaSum",metaSum)
				//console.log(`⏳   /${board}/ averaging for the last ${totalHoursCovered} hours`)
				const metaAvg = average(metaSum,totalHoursCovered)
				console.log(`✅   /${board}/ meta analysis average done`)
				//console.log("metaAvg",metaAvg)
				resolve(metaAvg)
			})
	})
}

module.exports = main