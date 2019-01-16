//const TRACE_KEY = Symbol("trace");
const initJaegerTracer = require("jaeger-client").initTracer;
var lib = require('jaeger-client');

//global[TRACE_KEY] =  {}; //set to empty object for now

// this is the singleton Object instance to be return acorss all require's
//var main_trace = {};

//var main_tracer;

// basic logging Tracer
export function initTracer(serviceName: string) {

  const config = {
    serviceName: serviceName,
    sampler: {
      type: "const",
      param: 1,
    },
    reporter: {
      logSpans: true,
    },
  };
  const options = {
    logger: {
      info(msg) {
        console.error(`INFO ${msg} [${serviceName}] [${process.pid}]`);
      },
      error(msg) {
        console.error("ERROR", msg);
      },
    },
  };
  
  var temp = initJaegerTracer(config, options);
  console.error(temp instanceof lib.Tracer);
  return temp;
  //main_tracer = initJaegerTracer(config, options);
}
/*
export function closeTracer() {
  console.error("CLOSING TRACER");
  main_tracer.close();
}

export function statusTracer() {
  console.error(main_tracer);
}

*/

