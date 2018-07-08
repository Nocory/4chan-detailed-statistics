const summarize = (metaAverage,toAdd) => {
	for(let key in toAdd){
		if(typeof toAdd[key] == "object"){
			if(!metaAverage[key]) metaAverage[key] = {}
			summarize(metaAverage[key],toAdd[key])
		}else{
			metaAverage[key] = (metaAverage[key] || 0) + toAdd[key]
		}
	}
	return metaAverage
}

const average = (metaAverage,length) => {
	for(let key in metaAverage){
		if(typeof metaAverage[key] == "object"){
			average(metaAverage[key],length)
		}else{
			metaAverage[key] /= length
		}
	}
	return metaAverage
}

const a = {
	meep: 2,
	moop: {
		a: 1,
		b: {
			c: 3
		}
	}
}

const b = {
	meep: 4,
	moop: {
		a: 5,
		b: {
			c: 3
		}
	}
}

const c = {
	meep: 4,
	moop: {
		a: 4,
		b: {
			c: 3
		}
	}
}

const objects = [a,b,c]

const metaAverage = {}
for(let obj of objects) summarize(metaAverage,obj)
console.log(metaAverage)
console.log(average(metaAverage,objects.length))