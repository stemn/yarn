const fs = require('fs');
const rl = require("readline");

// outputs a string to the main CSV file
export function benchmark(str: string) {
  let log_location = process.env["YARN_LOG_PATH"] || "/tmp/yarn.csv";
  // let log_location = "/stemn/yarn/yarn.csv"
  fs.appendFileSync(log_location, str, function(err){if (err) throw err;});
}

// outputs a string to the debugging log file
export function debug(str: string) {
  let log_location = process.env["YARN_DEBUG_PATH"] || "/tmp/debug.log";
  // let log_location = "/stemn/yarn/debug.log"
  fs.appendFileSync(log_location, str, function(err){if (err) throw err;});
}

// post processes the debug log information into a more span-like format
export function post_process() {
  let log_location = process.env["YARN_DEBUG_PATH"] || "/tmp/debug.log";

  let results = fs.readFileSync(log_location, 'utf8').split("\n");
  results = results.filter(String);   // remove empty string


  let depth = 1; 
  results.forEach( function(s, index) {

    // change the indenting (conditional)
    let indent_depth = depth;

    // BEGIN and END of same process should be on same indent
    if(results[index].match("END") && results[index-1].match("BEGIN")) {
      indent_depth = depth - 1;
      depth--;
    }

    if(results[index].match("BEGIN") && index > 0 && results[index-1].match("END")) {
      indent_depth = depth + 1;
      depth++;
    }

    results[index] = `(${indent_depth-1})\t` + "    ".repeat(indent_depth-1) + s;
    results[index] = results[index].replace(/\]\t/, "]\t\t");

    // increase/decrease indent for next line
    if(s.match("BEGIN")) {
      depth++;
    } else if (s.match("END")) {
      depth--;
    } else { throw new Error('Regex mismatch !'); }
    
    //results[index] = results[index].replace(/\|BEGIN\|\t/, "");
    //results[index] = results[index].replace(/\>END\<\t/, '');
    console.error(results[index]);

  });

  // write output from array
  let out = fs.createWriteStream(log_location);
  out.on('error', function(err) { console.error("Oops, output span error !!!\n") });
  results.forEach(s => out.write(s + "\n"));
}
