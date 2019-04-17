const fs = require('fs');
const rl = require("readline");
const spawn = require('child_process').spawnSync;



// outputs a string to the main CSV file
export function benchmark(str: string) {
  let log_location = process.env["YARN_LOG_PATH"] || "/tmp/yarn.csv";
  fs.appendFileSync(log_location, str, function(err){if (err) throw err;});
}

// outputs a string to the debugging log file
export function debug(str: string) {
  let log_location = process.env["YARN_DEBUG_PATH"] || "/tmp/debug.log";
  fs.appendFileSync(log_location, str, function(err){if (err) throw err;});
}

// post processes the debug log information into a more span-like format
export function post_process() {
  let log_location = process.env["YARN_DEBUG_PATH"] || "/tmp/debug.log";

  // run $(column) on data and
  let results = [];
  let child = spawn("column", ["-s", "," , "-t", log_location]);
  results = child.stdout.toString().split("\n");
  if(!results) { console.error("Make sure column is installed and in $PATH !"); }

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
  });

  // change BEGIN and END to new separators
  results.forEach( function(s, index) {
    results[index] = results[index].replace(/ *(BEGIN|END) */,"^"); 
  });

  // run $(column) a second time
  child = spawn("column", ["-s", "^", "-t"], {input: results.join("\n") + "\n"});

  // write output to file
  fs.writeFileSync(log_location, child.stdout.toString(), function(err){if (err) throw err;});

}
