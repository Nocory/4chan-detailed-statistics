const ss = require('simple-statistics')

const cor = ss.sampleCorrelation([1,2,3,4,5],[2,3,4,5,6])

console.log(cor)