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
  let output = "/tmp/span-debug.log";

  console.error("DOING POST-PROCESSING on " + log_location + "\n");
  let depth = 1; 
  let results = fs.readFile(log_location, function() {} ).split("\n");

  console.log(results);

  // write output from array
  let out = fs.createWriteStream(output);
  out.on('error', function(err) { console.error("Oops, output span error !!!\n") });
  results.forEach(s => out.write(s));

  console.error("FINISHED POST-PROCESSING\n");
}
