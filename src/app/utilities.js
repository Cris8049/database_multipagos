const fs = require("fs");
const { networkInterfaces } = require('os');

const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

// const getIPs = () => {
// 	const nets = networkInterfaces();
// 	const results = {}; // Or just '{}', an empty object
// 
// 	for (const name of Object.keys(nets)) {
// 		for (const net of nets[name]) {
// 			// Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
// 			if (net.family === 'IPv4' && !net.internal) {
// 				if (!results[name])
// 					results[name] = [];
// 				results[name].push(net.address);
// 			}
// 		}
// 	}
// 	return results
// }
const getIPs = () => {
	const nets = networkInterfaces();

	for (const name of Object.keys(nets))
		for (const net of nets[name])
			if (net.family === 'IPv4' && !net.internal)
				return net.address;
	return "Not Know"
}

const readCSV = (pathToFil, columnSeparator = ",", rowSeparator = "\r\n") => {
	let outData = []
	try {
		const data = fs.readFileSync(pathToFile, "utf8");
		const tempRows = data.split(rowSeparator);
		const cols = tempRows[0].split(columnSeparator)
		const rows = tempRows.slice(1, tempRows.length);

		for (let r in rows){
			let tmpObj = {}
			const rData = r.split(columnSeparator)
			for (let i = 0; i < cols.length; i++) {
				tmpObj[cols[i]] = rData[i]
			}
			outData.push(tmpObj)
		}
	} catch (err) {
		console.error(err);
	}
	return outData
};

module.exports = {
    sleep,
	readCSV,
	getIPs
};
