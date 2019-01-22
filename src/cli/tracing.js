const initJaegerTracer = require("jaeger-client").initTracer;
// returns a Tracer instance that will be given to initGlobalTracer
function initTracer(serviceName: string) {

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
 
  return initJaegerTracer(config, options);
}

let tracer = undefined;
export function getTracer() {

  if(!tracer) {
    //init globalTracer
    tracer = initTracer("yarn");
    //console.error("tracer has been initialized");
  } else {
    console.error("returning already spawned tracer");
  }
      
    return tracer;
}
