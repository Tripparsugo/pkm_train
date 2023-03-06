const fs = require("fs")
const  readline  = require ("readline")

async function processLineByLine() {
    const fileStream = fs.createReadStream('./tmp/ts.csv');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.
    let tl = 0
    for await (const line of rl) {
        tl++
        // Each line in input.txt will be successively available here as `line`.
        console.log(line.split(",")[1].split(" ").length);
    }
    console.log("lines:" +tl)
}

processLineByLine();